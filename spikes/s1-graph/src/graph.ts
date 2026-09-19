/**
 * S1 prototype of the kernel's in-memory typed graph. THROWAWAY: it exists to be measured. If it passes, Slice 1
 * re-implements what it needs inside packages/kernel under the kernel's purity rules; nothing here is imported by product code.
 *
 * Shape follows TECHNOLOGY_STACK_DECISION §3: opaque string ids, relations stored once with forward + inverse adjacency,
 * data-driven rules (endpoint-constraint, cardinality), atomic apply with rollback, witness-bearing traversals.
 */
export type Id = string;
export interface Element { id: Id; kind: string; props: Record<string, string | number | boolean> }
export interface Relation { id: Id; kind: string; source: Id; target: Id }

export type Op =
  | { op: "add-element"; element: Element }
  | { op: "update-element"; id: Id; set: Record<string, string | number | boolean> }
  | { op: "remove-element"; id: Id }
  | { op: "add-relation"; relation: Relation }
  | { op: "remove-relation"; id: Id };

export interface RuleSet {
  /** relation kind -> allowed endpoint element kinds */
  endpoints: Record<string, { source: readonly string[]; target: readonly string[] }>;
  /** relation kind -> max outgoing relations of that kind per source element */
  maxOut: Record<string, number>;
}

export class ValidationError extends Error {
  constructor(public readonly code: string, message: string) {
    super(message);
  }
}

export interface Reached {
  id: Id;
  hops: number;
  /** relation ids of one shortest witness path from the start */
  via: Id[];
  /** number of distinct incoming relations at the shortest level (multiplicity is never collapsed away) */
  arrivals: number;
}

export interface Propagation { kind: string; dir: "out" | "in"; cls: "direct" | "potential" }
export interface Impacted { id: Id; depth: number; cls: "direct" | "potential"; via: Id[] }

export class Graph {
  readonly elements = new Map<Id, Element>();
  readonly relations = new Map<Id, Relation>();
  readonly out = new Map<Id, Relation[]>();
  readonly inn = new Map<Id, Relation[]>();

  constructor(private readonly rules: RuleSet) {}

  /** Trusted bulk load from the store (already validated when committed). */
  static fromRows(rules: RuleSet, elements: Iterable<Element>, relations: Iterable<Relation>): Graph {
    const g = new Graph(rules);
    for (const e of elements) g.elements.set(e.id, e);
    for (const r of relations) {
      g.relations.set(r.id, r);
      g.link(r);
    }
    return g;
  }

  private link(r: Relation): void {
    let o = this.out.get(r.source);
    if (!o) this.out.set(r.source, (o = []));
    o.push(r);
    let i = this.inn.get(r.target);
    if (!i) this.inn.set(r.target, (i = []));
    i.push(r);
  }
  private unlink(r: Relation): void {
    const o = this.out.get(r.source)!;
    o.splice(o.indexOf(r), 1);
    const i = this.inn.get(r.target)!;
    i.splice(i.indexOf(r), 1);
  }

  /**
   * Atomic apply: validates each op against the *evolving* state, keeps an undo log, and restores the exact
   * previous state on any failure (NFR-031). Cost is proportional to the ops and the degrees they touch.
   */
  apply(ops: readonly Op[]): void {
    const undo: (() => void)[] = [];
    try {
      for (const op of ops) this.applyOne(op, undo);
    } catch (e) {
      for (let i = undo.length - 1; i >= 0; i--) undo[i]!();
      throw e;
    }
  }

  private applyOne(op: Op, undo: (() => void)[]): void {
    switch (op.op) {
      case "add-element": {
        if (this.elements.has(op.element.id)) throw new ValidationError("duplicate-id", op.element.id);
        this.elements.set(op.element.id, op.element);
        undo.push(() => void this.elements.delete(op.element.id));
        return;
      }
      case "update-element": {
        const e = this.elements.get(op.id);
        if (!e) throw new ValidationError("missing-element", op.id);
        const prev = e.props;
        this.elements.set(op.id, { ...e, props: { ...prev, ...op.set } }); // copy-on-write keeps readers of the old object consistent
        undo.push(() => void this.elements.set(op.id, e));
        return;
      }
      case "remove-element": {
        const e = this.elements.get(op.id);
        if (!e) throw new ValidationError("missing-element", op.id);
        if ((this.out.get(op.id)?.length ?? 0) + (this.inn.get(op.id)?.length ?? 0) > 0) throw new ValidationError("has-relations", op.id);
        this.elements.delete(op.id);
        undo.push(() => void this.elements.set(op.id, e));
        return;
      }
      case "add-relation": {
        const r = op.relation;
        if (this.relations.has(r.id)) throw new ValidationError("duplicate-id", r.id);
        const s = this.elements.get(r.source);
        const t = this.elements.get(r.target);
        if (!s || !t) throw new ValidationError("dangling-endpoint", r.id);
        const ep = this.rules.endpoints[r.kind];
        if (!ep) throw new ValidationError("unknown-relation-kind", r.kind);
        if (!ep.source.includes(s.kind) || !ep.target.includes(t.kind)) throw new ValidationError("endpoint-constraint", `${r.kind}: ${s.kind}->${t.kind}`);
        const max = this.rules.maxOut[r.kind];
        if (max !== undefined) {
          let n = 0;
          for (const x of this.out.get(r.source) ?? []) if (x.kind === r.kind) n++;
          if (n + 1 > max) throw new ValidationError("cardinality", `${r.kind} from ${r.source}`);
        }
        this.relations.set(r.id, r);
        this.link(r);
        undo.push(() => {
          this.relations.delete(r.id);
          this.unlink(r);
        });
        return;
      }
      case "remove-relation": {
        const r = this.relations.get(op.id);
        if (!r) throw new ValidationError("missing-relation", op.id);
        this.relations.delete(op.id);
        this.unlink(r);
        undo.push(() => {
          this.relations.set(r.id, r);
          this.link(r);
        });
        return;
      }
    }
  }

  /**
   * Bounded typed traversal. Level-synchronous BFS following only `relKinds` in `dir`; `targetKinds` and `where`
   * filter which reached elements are *reported* (traversal continues through all reached elements).
   * Returns the full result count and one page. Multiplicity is kept as `arrivals`.
   */
  query(
    start: Id,
    q: { relKinds: readonly string[]; dir: "out" | "in" | "both"; maxHops: number; targetKinds?: readonly string[]; where?: (e: Element) => boolean; offset?: number; limit?: number },
  ): { total: number; page: Reached[] } {
    const seen = new Map<Id, Reached>();
    seen.set(start, { id: start, hops: 0, via: [], arrivals: 1 });
    let frontier: Id[] = [start];
    const kinds = new Set(q.relKinds);
    for (let hop = 1; hop <= q.maxHops && frontier.length; hop++) {
      const next: Id[] = [];
      for (const id of frontier) {
        const base = seen.get(id)!;
        const edges: [Relation[] | undefined, "t" | "s"][] = [];
        if (q.dir !== "in") edges.push([this.out.get(id), "t"]);
        if (q.dir !== "out") edges.push([this.inn.get(id), "s"]);
        for (const [list, side] of edges) {
          if (!list) continue;
          for (const r of list) {
            if (!kinds.has(r.kind)) continue;
            const other = side === "t" ? r.target : r.source;
            const prior = seen.get(other);
            if (!prior) {
              seen.set(other, { id: other, hops: hop, via: [...base.via, r.id], arrivals: 1 });
              next.push(other);
            } else if (prior.hops === hop) prior.arrivals++;
          }
        }
      }
      frontier = next;
    }
    seen.delete(start);
    const all: Reached[] = [];
    for (const r of seen.values()) {
      const e = this.elements.get(r.id);
      if (!e) continue;
      if (q.targetKinds && !q.targetKinds.includes(e.kind)) continue;
      if (q.where && !q.where(e)) continue;
      all.push(r);
    }
    const off = q.offset ?? 0;
    return { total: all.length, page: all.slice(off, off + (q.limit ?? 100)) };
  }

  /** Read-only impact propagation with witness paths; directly changed elements are the seeds (IMPACT-002..004). */
  impact(seeds: readonly Id[], rules: readonly Propagation[], maxDepth: number): Map<Id, Impacted> {
    const res = new Map<Id, Impacted>();
    let frontier: Id[] = [];
    for (const s of seeds) {
      res.set(s, { id: s, depth: 0, cls: "direct", via: [] });
      frontier.push(s);
    }
    for (let d = 1; d <= maxDepth && frontier.length; d++) {
      const next: Id[] = [];
      for (const id of frontier) {
        const base = res.get(id)!;
        for (const rule of rules) {
          const list = (rule.dir === "out" ? this.out : this.inn).get(id);
          if (!list) continue;
          for (const r of list) {
            if (r.kind !== rule.kind) continue;
            const other = rule.dir === "out" ? r.target : r.source;
            if (res.has(other)) continue;
            const cls = base.cls === "potential" || rule.cls === "potential" ? "potential" : "direct";
            res.set(other, { id: other, depth: d, cls, via: [...base.via, r.id] });
            next.push(other);
          }
        }
      }
      frontier = next;
    }
    return res;
  }

  /** Order-independent structural fingerprint: tests use it to prove a failed apply changed nothing. */
  fingerprint(): string {
    const hash = (str: string) => {
      let h = 2166136261;
      for (let i = 0; i < str.length; i++) h = Math.imul(h ^ str.charCodeAt(i), 16777619);
      return h >>> 0;
    };
    let sum = 0;
    for (const [id, e] of this.elements) sum = (sum + hash(id + "|" + e.kind + "|" + JSON.stringify(Object.entries(e.props).sort()))) >>> 0;
    for (const [id, r] of this.relations) sum = (sum + hash(id + "|" + r.kind + "|" + r.source + "|" + r.target)) >>> 0;
    let adj = 0;
    for (const l of this.out.values()) for (const r of l) adj = (adj + hash("o" + r.id)) >>> 0;
    for (const l of this.inn.values()) for (const r of l) adj = (adj + hash("i" + r.id)) >>> 0;
    return `${this.elements.size}/${this.relations.size}/${sum}/${adj}`;
  }
}
