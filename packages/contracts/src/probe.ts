import { z } from "zod";

/**
 * SLICE 0 PROBE CONTRACTS. They exist to exercise the schema pipeline on the constructs the real contracts
 * will need (discriminated unions, recursion, brands, optionals, records, enums, ranges) - NOT to fix the
 * final ChangeSet or Query IR shape, which is decided in Slice 1/3 (ADR-0002 is only a proposal).
 *
 * Contract rules learned while building the probes (see docs/slice0/EVIDENCE.md):
 *  - objects are `strictObject` so zod and the emitted JSON Schema agree (zod's default strips unknown keys);
 *  - no `.refine()/.superRefine()` in contract schemas: custom predicates vanish from JSON Schema, so semantic
 *    validation lives in the kernel validator, not in the wire contract.
 */

export const ElementId = z.uuid().brand<"ElementId">();
export type ElementId = z.infer<typeof ElementId>;

export const Origin = z.enum(["user", "deterministic-rule", "import", "external-source", "tool-result", "llm-advisory", "admin-migration"]);

export type JsonValue = string | number | boolean | null | JsonValue[] | { [k: string]: JsonValue };
export const JsonValue: z.ZodType<JsonValue> = z.lazy(() =>
  z.union([z.string(), z.number(), z.boolean(), z.null(), z.array(JsonValue), z.record(z.string(), JsonValue)]),
);
const Props = z.record(z.string(), JsonValue);

export const Provenance = z.strictObject({
  origin: Origin,
  actor: z.string().min(1),
  sourceRef: z.strictObject({ system: z.string().min(1), id: z.string().min(1), version: z.string().optional() }).optional(),
  ruleId: z.string().optional(),
  model: z.strictObject({ id: z.string().min(1), promptHash: z.string().min(8), paramsHash: z.string().min(8) }).optional(),
});

export const Op = z.discriminatedUnion("op", [
  z.strictObject({ op: z.literal("add-element"), id: ElementId, kind: z.string().min(1), props: Props }),
  z.strictObject({ op: z.literal("update-element"), id: ElementId, set: Props, unset: z.array(z.string()).optional() }),
  z.strictObject({ op: z.literal("remove-element"), id: ElementId }),
  z.strictObject({ op: z.literal("add-relation"), id: ElementId, kind: z.string().min(1), source: ElementId, target: ElementId, props: Props }),
  z.strictObject({ op: z.literal("remove-relation"), id: ElementId }),
  z.strictObject({ op: z.literal("confirm-candidate"), candidateId: ElementId }),
  z.strictObject({ op: z.literal("reject-candidate"), candidateId: ElementId, reason: z.string().optional() }),
]);

export const ChangeSetProbe = z.strictObject({
  id: ElementId,
  baseRevision: z.number().int().min(0),
  ops: z.array(Op).min(1).max(5000),
  provenance: Provenance,
  rationale: z.string().optional(),
  idempotencyKey: z.string().min(8).max(128),
  createdAt: z.iso.datetime(),
});
export type ChangeSetProbe = z.infer<typeof ChangeSetProbe>;

/** Recursive boolean predicate: the shape of a Query IR filter. */
export type PredicateProbe =
  | { op: "and"; args: PredicateProbe[] }
  | { op: "or"; args: PredicateProbe[] }
  | { op: "not"; arg: PredicateProbe }
  | { op: "eq"; prop: string; value: string | number | boolean }
  | { op: "present" | "absent"; relation: string; direction?: "out" | "in" };
export const PredicateProbe: z.ZodType<PredicateProbe> = z.lazy(() =>
  z.discriminatedUnion("op", [
    z.strictObject({ op: z.literal("and"), args: z.array(PredicateProbe).min(1) }),
    z.strictObject({ op: z.literal("or"), args: z.array(PredicateProbe).min(1) }),
    z.strictObject({ op: z.literal("not"), arg: PredicateProbe }),
    z.strictObject({ op: z.literal("eq"), prop: z.string().min(1), value: z.union([z.string(), z.number(), z.boolean()]) }),
    z.strictObject({ op: z.enum(["present", "absent"]), relation: z.string().min(1), direction: z.enum(["out", "in"]).optional() }),
  ]),
);

/** Deliberately uses a refinement to document that it is lost in JSON Schema (see contracts test). */
export const RefinedProbe = z.strictObject({ from: z.number(), to: z.number() }).refine((v) => v.from <= v.to, "from must be <= to");

export const SCHEMAS = {
  ChangeSetProbe,
  PredicateProbe,
  Provenance,
} as const;
export type SchemaName = keyof typeof SCHEMAS;
