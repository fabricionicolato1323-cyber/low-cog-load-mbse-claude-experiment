import { readFileSync } from "node:fs";
import { join } from "node:path";
import Ajv2020 from "ajv/dist/2020.js";
import _addFormats from "ajv-formats";
// ajv-formats is CJS: under NodeNext the callable is on .default
const addFormats = _addFormats as unknown as typeof _addFormats.default;
import fc from "fast-check";
import { describe, expect, expectTypeOf, it } from "vitest";
import { z } from "zod";
import { ChangeSetProbe, ElementId, PredicateProbe, Provenance, RefinedProbe, SCHEMAS, type SchemaName } from "@lcl/contracts";
import { diff, generate, schemaDir } from "./contracts-gen.ts";

const ajv = addFormats(new Ajv2020.default({ strict: true, allowUnionTypes: true, allErrors: false }));
const validators = new Map<SchemaName, ReturnType<typeof ajv.compile>>();
for (const name of Object.keys(SCHEMAS) as SchemaName[]) {
  validators.set(name, ajv.compile(JSON.parse(readFileSync(join(schemaDir, `${name}.schema.json`), "utf8"))));
}
const both = (name: SchemaName, v: unknown) => ({ zod: SCHEMAS[name].safeParse(v).success, ajv: validators.get(name)!(v) as boolean });

const uuid = (n: number) => `018f1c2e-7a00-7000-8000-${n.toString(16).padStart(12, "0")}`;
const validChangeSet = () => ({
  id: uuid(1),
  baseRevision: 7,
  ops: [
    { op: "add-element", id: uuid(2), kind: "requirement", props: { name: "R1", tags: ["a", "b"], nested: { x: [1, 2, { y: null }] } } },
    { op: "add-relation", id: uuid(3), kind: "satisfies", source: uuid(2), target: uuid(4), props: {} },
    { op: "update-element", id: uuid(2), set: { name: "R1b" }, unset: ["old"] },
    { op: "confirm-candidate", candidateId: uuid(5) },
  ],
  provenance: { origin: "llm-advisory", actor: "u1", model: { id: "m", promptHash: "abcdef012", paramsHash: "abcdef012" } },
  idempotencyKey: "key-12345678",
  createdAt: "2026-09-20T10:00:00Z",
});

describe("I-4 contract pipeline", () => {
  it("regeneration is deterministic and equals the committed schemas", () => {
    expect([...generate()]).toEqual([...generate()]);
    expect(diff()).toEqual([]);
  });

  it("every committed schema compiles under Ajv 2020-12 in strict mode (a non-zod consumer)", () => {
    expect(validators.size).toBe(Object.keys(SCHEMAS).length);
  });

  it("zod and Ajv agree on hand-picked valid and invalid documents", () => {
    const ok = validChangeSet();
    expect(both("ChangeSetProbe", ok)).toEqual({ zod: true, ajv: true });
    const bad: [string, unknown][] = [
      ["unknown op", { ...ok, ops: [{ op: "explode", id: uuid(2) }] }],
      ["empty ops", { ...ok, ops: [] }],
      ["negative revision", { ...ok, baseRevision: -1 }],
      ["fractional revision", { ...ok, baseRevision: 1.5 }],
      ["bad origin", { ...ok, provenance: { ...ok.provenance, origin: "magic" } }],
      ["unknown top-level key", { ...ok, surprise: 1 }],
      ["unknown key inside op (discriminated member)", { ...ok, ops: [{ op: "remove-element", id: uuid(2), extra: true }] }],
      ["non-uuid id", { ...ok, id: "not-a-uuid" }],
      ["short idempotency key", { ...ok, idempotencyKey: "x" }],
      ["date without Z", { ...ok, createdAt: "2026-09-20 10:00" }],
      ["non-JSON prop value (undefined-free but function-like string ok)", { ...ok, ops: [{ op: "add-element", id: uuid(2), kind: "k", props: { a: { b: { c: [{ d: {} }] } } } }] }], // this one is VALID
    ];
    for (const [label, v] of bad) {
      const r = both("ChangeSetProbe", v);
      expect(r.zod, `zod/ajv disagree on: ${label}`).toBe(r.ajv);
    }
    expect(both("ChangeSetProbe", bad[bad.length - 1]![1])).toEqual({ zod: true, ajv: true });
    expect(bad.slice(0, -1).every(([, v]) => !both("ChangeSetProbe", v).ajv)).toBe(true);
  });

  it("recursion round-trips: 60-deep predicate validates identically in zod and Ajv", () => {
    let p: unknown = { op: "eq", prop: "kind", value: "requirement" };
    for (let i = 0; i < 60; i++) p = i % 2 ? { op: "not", arg: p } : { op: "and", args: [p, { op: "absent", relation: "satisfies", direction: "in" }] };
    expect(both("PredicateProbe", p)).toEqual({ zod: true, ajv: true });
    const broken = structuredClone(p) as Record<string, unknown>;
    let cur = broken;
    while ("arg" in cur || "args" in cur) cur = ("arg" in cur ? cur["arg"] : (cur["args"] as unknown[])[0]) as Record<string, unknown>;
    cur["value"] = { not: "scalar" };
    expect(both("PredicateProbe", broken)).toEqual({ zod: false, ajv: false });
  });

  it("differential fuzz: 3000 structure-aware mutations of valid documents never make zod and Ajv disagree", () => {
    const weird: unknown[] = [null, 0, -1, 1.5, "", " ", "x", [], {}, true, "2026-09-20T10:00:00+02:00", "0000", { op: "and" }, [null]];
    const mutate = (doc: unknown, seed: number[]): unknown => {
      const clone = structuredClone(doc);
      let node: any = clone;
      const path: (string | number)[] = [];
      for (let depth = 0; depth < 8; depth++) {
        const keys = Array.isArray(node) ? node.map((_: unknown, i: number) => i) : node && typeof node === "object" ? Object.keys(node) : [];
        if (keys.length === 0 || seed[depth * 2]! % 3 === 0) break;
        const k = keys[seed[depth * 2 + 1]! % keys.length]!;
        path.push(k);
        if (node[k] === null || typeof node[k] !== "object") break;
        node = node[k];
      }
      const last = path[path.length - 1];
      const parent = path.slice(0, -1).reduce((n: any, k) => n[k], clone as any);
      const kind = seed[16]! % 4;
      if (last === undefined) return weird[seed[17]! % weird.length];
      if (kind === 0) {
        if (Array.isArray(parent)) parent.splice(last as number, 1);
        else delete parent[last];
      } else if (kind === 1) parent[last] = weird[seed[17]! % weird.length];
      else if (kind === 2) parent["__extra"] = weird[seed[17]! % weird.length];
      else parent[last] = typeof parent[last] === "string" ? parent[last] + "!" : weird[seed[17]! % weird.length];
      return clone;
    };
    const pred = { op: "and", args: [{ op: "eq", prop: "k", value: 1 }, { op: "not", arg: { op: "present", relation: "r" } }] };
    const docs: [SchemaName, unknown][] = [["ChangeSetProbe", validChangeSet()], ["PredicateProbe", pred], ["Provenance", validChangeSet().provenance]];
    const disagreements: string[] = [];
    let rejected = 0;
    let accepted = 0;
    fc.assert(
      fc.property(fc.integer({ min: 0, max: 2 }), fc.array(fc.nat(1000), { minLength: 18, maxLength: 18 }), (i, seed) => {
        const [name, doc] = docs[i]!;
        const m = mutate(doc, seed);
        const r = both(name, m);
        if (r.zod !== r.ajv) disagreements.push(`${name}: ${JSON.stringify(m).slice(0, 200)} zod=${r.zod} ajv=${r.ajv}`);
        if (r.zod) accepted++;
        else rejected++;
        return true;
      }),
      { numRuns: 3000, seed: 20260920 },
    );
    expect(disagreements.slice(0, 5)).toEqual([]);
    // the fuzz must actually exercise both outcomes, otherwise agreement is trivial
    expect(rejected).toBeGreaterThan(300);
    expect(accepted).toBeGreaterThan(30);
  });

  it("KNOWN LIMIT: refinements are silently absent from JSON Schema (hence: no refine() in contracts)", () => {
    const js = z.toJSONSchema(RefinedProbe, { target: "draft-2020-12", io: "input" });
    const v = ajv.compile(js);
    const inverted = { from: 5, to: 1 };
    expect(RefinedProbe.safeParse(inverted).success).toBe(false);
    expect(v(inverted)).toBe(true); // Ajv accepts what zod rejects: the divergence the contract rule prevents
  });

  it("brands are compile-time only and do not leak into the wire schema", () => {
    expectTypeOf<ElementId>().toMatchTypeOf<string>();
    expectTypeOf<string>().not.toMatchTypeOf<ElementId>();
    expect(JSON.stringify(z.toJSONSchema(ElementId))).not.toContain("ElementId");
    expect(ChangeSetProbe.safeParse(validChangeSet()).success).toBe(true);
    expect(Provenance.safeParse({ origin: "user", actor: "" }).success).toBe(false);
    expect(PredicateProbe.safeParse({ op: "and", args: [] }).success).toBe(false);
  });
});
