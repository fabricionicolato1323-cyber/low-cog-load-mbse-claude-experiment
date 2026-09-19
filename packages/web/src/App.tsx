import { ChangeSetProbe } from "@lcl/contracts";

/** SLICE 0 SKELETON: proves React + Vite + the shared contract package work end to end in the browser. No product UI. */
export function App() {
  const sample = { id: "018f1c2e-7a00-7000-8000-000000000001", baseRevision: 0, ops: [], provenance: { origin: "user", actor: "x" }, idempotencyKey: "k-12345678", createdAt: "2026-09-20T10:00:00Z" };
  const parsed = ChangeSetProbe.safeParse(sample); // empty ops => invalid: the contract is live in the client
  return (
    <main>
      <h1>Low Cognitive Load MBSE</h1>
      <p data-testid="contract-check">{parsed.success ? "contract accepts empty change set (unexpected)" : "contract rejects empty change set"}</p>
    </main>
  );
}
