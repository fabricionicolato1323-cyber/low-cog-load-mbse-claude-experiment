import { createHash } from "node:crypto";
import type { Element, Relation, Op } from "@lcl/spike-s1-graph";
import type { Db, Stmt } from "./driver.ts";

/**
 * S2 prototype of the SQLite ProjectStore: append-only change log (source of truth) + versioned materialised rows
 * (rev_from / rev_to) for as-of queries. THROWAWAY: measured, then re-implemented behind the ProjectStore port in Slice 1.
 */
export interface StoredChangeSet {
  id: string;
  idempotencyKey: string;
  baseRevision: number;
  ops: Op[];
  provenance: { origin: string; actor: string };
  createdAt: string;
}

export class StaleBaseError extends Error {
  constructor(public readonly base: number, public readonly head: number) {
    super(`base revision ${base} != head ${head}`);
  }
}

const SCHEMA = `
CREATE TABLE IF NOT EXISTS change_log (
  rev INTEGER PRIMARY KEY,
  changeset_id TEXT NOT NULL UNIQUE,
  idempotency_key TEXT NOT NULL UNIQUE,
  ops TEXT NOT NULL,
  provenance TEXT NOT NULL,
  created_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS element (
  id TEXT NOT NULL, rev_from INTEGER NOT NULL, rev_to INTEGER,
  kind TEXT NOT NULL, props TEXT NOT NULL,
  PRIMARY KEY (id, rev_from)
) WITHOUT ROWID;
CREATE UNIQUE INDEX IF NOT EXISTS element_current ON element(id) WHERE rev_to IS NULL;
CREATE TABLE IF NOT EXISTS relation (
  id TEXT NOT NULL, rev_from INTEGER NOT NULL, rev_to INTEGER,
  kind TEXT NOT NULL, source TEXT NOT NULL, target TEXT NOT NULL,
  PRIMARY KEY (id, rev_from)
) WITHOUT ROWID;
CREATE UNIQUE INDEX IF NOT EXISTS relation_current ON relation(id) WHERE rev_to IS NULL;
CREATE INDEX IF NOT EXISTS relation_by_source ON relation(source, rev_from);
CREATE INDEX IF NOT EXISTS relation_by_target ON relation(target, rev_from);
`;

export class Store {
  private readonly s: Record<string, Stmt>;
  constructor(readonly db: Db) {
    db.exec(SCHEMA);
    const p = (k: string, sql: string): [string, Stmt] => [k, db.prepare(sql)];
    this.s = Object.fromEntries([
      p("head", "SELECT COALESCE(MAX(rev), 0) AS h FROM change_log"),
      p("byKey", "SELECT rev FROM change_log WHERE idempotency_key = ?"),
      p("log", "INSERT INTO change_log (rev, changeset_id, idempotency_key, ops, provenance, created_at) VALUES (?,?,?,?,?,?)"),
      p("addEl", "INSERT INTO element (id, rev_from, rev_to, kind, props) VALUES (?,?,NULL,?,?)"),
      p("curEl", "SELECT kind, props, rev_from FROM element WHERE id = ? AND rev_to IS NULL"),
      p("patchEl", "UPDATE element SET props = ? WHERE id = ? AND rev_from = ? AND rev_to IS NULL"),
      p("closeEl", "UPDATE element SET rev_to = ? WHERE id = ? AND rev_to IS NULL"),
      p("addRel", "INSERT INTO relation (id, rev_from, rev_to, kind, source, target) VALUES (?,?,NULL,?,?,?)"),
      p("closeRel", "UPDATE relation SET rev_to = ? WHERE id = ? AND rev_to IS NULL"),
      p("curElAll", "SELECT id, kind, props FROM element WHERE rev_to IS NULL"),
      p("curRelAll", "SELECT id, kind, source, target FROM relation WHERE rev_to IS NULL"),
      p("relAsOfSrc", "SELECT id, kind, source, target FROM relation WHERE source = ? AND rev_from <= ? AND (rev_to IS NULL OR rev_to > ?)"),
      p("relAsOfTgt", "SELECT id, kind, source, target FROM relation WHERE target = ? AND rev_from <= ? AND (rev_to IS NULL OR rev_to > ?)"),
      p("elAsOf", "SELECT id, kind, props FROM element WHERE id = ? AND rev_from <= ? AND (rev_to IS NULL OR rev_to > ?)"),
      p("logAll", "SELECT rev, changeset_id, idempotency_key, ops, provenance, created_at FROM change_log ORDER BY rev"),
    ]);
  }

  head(): number {
    return (this.s["head"]!.get() as { h: number }).h;
  }

  /**
   * One durable, atomic commit. Idempotent on `idempotencyKey`; rejects a stale `baseRevision`
   * (semantic rebase is a kernel concern, exercised in Slice 5).
   */
  commit(cs: StoredChangeSet): { rev: number; replay: boolean } {
    this.db.exec("BEGIN IMMEDIATE");
    try {
      const prior = this.s["byKey"]!.get(cs.idempotencyKey) as { rev: number } | undefined;
      if (prior) {
        this.db.exec("ROLLBACK");
        return { rev: prior.rev, replay: true };
      }
      const head = this.head();
      if (cs.baseRevision !== head) throw new StaleBaseError(cs.baseRevision, head);
      const rev = head + 1;
      this.s["log"]!.run(rev, cs.id, cs.idempotencyKey, JSON.stringify(cs.ops), JSON.stringify(cs.provenance), cs.createdAt);
      this.applyOps(rev, cs.ops);
      this.db.exec("COMMIT");
      return { rev, replay: false };
    } catch (e) {
      try {
        this.db.exec("ROLLBACK");
      } catch {
        /* already rolled back by SQLite */
      }
      throw e;
    }
  }

  applyOps(rev: number, ops: readonly Op[]): void {
    const s = this.s;
    for (const op of ops) {
      switch (op.op) {
        case "add-element":
          s["addEl"]!.run(op.element.id, rev, op.element.kind, JSON.stringify(op.element.props));
          break;
        case "update-element": {
          const cur = s["curEl"]!.get(op.id) as { kind: string; props: string; rev_from: number } | undefined;
          if (!cur) throw new Error(`missing element ${op.id}`);
          const merged = JSON.stringify({ ...JSON.parse(cur.props), ...op.set });
          if (cur.rev_from === rev) {
            // already versioned by an earlier op of THIS change set: coalesce, else (id, rev_from) would collide
            s["patchEl"]!.run(merged, op.id, rev);
          } else {
            s["closeEl"]!.run(rev, op.id);
            s["addEl"]!.run(op.id, rev, cur.kind, merged);
          }
          break;
        }
        case "remove-element":
          if (Number((s["closeEl"]!.run(rev, op.id) as { changes: number | bigint }).changes) !== 1) throw new Error(`missing element ${op.id}`);
          break;
        case "add-relation":
          s["addRel"]!.run(op.relation.id, rev, op.relation.kind, op.relation.source, op.relation.target);
          break;
        case "remove-relation":
          if (Number((s["closeRel"]!.run(rev, op.id) as { changes: number | bigint }).changes) !== 1) throw new Error(`missing relation ${op.id}`);
          break;
      }
    }
  }

  /** Streaming read of the current state (cold open). */
  *currentElements(): Generator<Element> {
    for (const r of this.s["curElAll"]!.iterate() as Iterable<{ id: string; kind: string; props: string }>) yield { id: r.id, kind: r.kind, props: JSON.parse(r.props) };
  }
  *currentRelations(): Generator<Relation> {
    for (const r of this.s["curRelAll"]!.iterate() as Iterable<Relation>) yield { id: r.id, kind: r.kind, source: r.source, target: r.target };
  }

  /** 1-hop neighbourhood of `id` as of `rev`. */
  neighboursAsOf(id: string, rev: number): { element: unknown; relations: Relation[] } {
    return {
      element: this.s["elAsOf"]!.get(id, rev, rev),
      relations: [...(this.s["relAsOfSrc"]!.all(id, rev, rev) as Relation[]), ...(this.s["relAsOfTgt"]!.all(id, rev, rev) as Relation[])],
    };
  }

  /** Order-independent digest of all versioned materialised rows (the thing rebuild-from-log must reproduce). */
  stateHash(): string {
    const h = createHash("sha256");
    for (const r of this.db.prepare("SELECT id, rev_from, rev_to, kind, props FROM element ORDER BY id, rev_from").iterate() as Iterable<Record<string, unknown>>) h.update(`e|${r["id"]}|${r["rev_from"]}|${r["rev_to"]}|${r["kind"]}|${r["props"]}\n`);
    for (const r of this.db.prepare("SELECT id, rev_from, rev_to, kind, source, target FROM relation ORDER BY id, rev_from").iterate() as Iterable<Record<string, unknown>>) h.update(`r|${r["id"]}|${r["rev_from"]}|${r["rev_to"]}|${r["kind"]}|${r["source"]}|${r["target"]}\n`);
    return h.digest("hex");
  }

  logRows(): IterableIterator<{ rev: number; changeset_id: string; idempotency_key: string; ops: string; provenance: string; created_at: string }> {
    return this.s["logAll"]!.iterate();
  }

  integrityCheck(): string {
    return (this.db.prepare("PRAGMA integrity_check").get() as { integrity_check: string }).integrity_check;
  }
}

/** Replay a store's change log into an empty store. The log is the truth; materialised rows must be reproducible. */
export function rebuildFromLog(src: Store, dst: Store, batchCommits = 500): void {
  let inTx = false;
  let n = 0;
  const ins = dst.db.prepare("INSERT INTO change_log (rev, changeset_id, idempotency_key, ops, provenance, created_at) VALUES (?,?,?,?,?,?)");
  for (const row of src.logRows()) {
    if (!inTx) {
      dst.db.exec("BEGIN IMMEDIATE");
      inTx = true;
    }
    ins.run(row.rev, row.changeset_id, row.idempotency_key, row.ops, row.provenance, row.created_at);
    dst.applyOps(row.rev, JSON.parse(row.ops) as Op[]);
    if (++n % batchCommits === 0) {
      dst.db.exec("COMMIT");
      inTx = false;
    }
  }
  if (inTx) dst.db.exec("COMMIT");
}
