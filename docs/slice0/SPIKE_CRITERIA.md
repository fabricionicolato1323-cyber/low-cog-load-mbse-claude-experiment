# Slice 0 - Pre-registered spike criteria

Written **before any spike was run**. Criteria are not edited after results exist; if a criterion turns out to have been badly chosen, the evidence report says so and the *result stays as measured against the original criterion*. Targets marked **[§7]** are copied from `REQUIREMENTS_ANALYSIS.md` §7 (themselves working assumptions). Targets marked **[NEW]** are introduced here because §7 is silent; they are also judgment calls and are labelled as such.

Machine of record: Windows 11, AMD Ryzen 5 7430U (6C/12T), 15 GB RAM, integrated GPU only, Node 24.19, NVMe/SSD local disk. Numbers are for this machine; they say nothing about faster or slower hardware.

Verdict vocabulary: **PASS** (all criteria met), **FAIL** (a criterion is missed and no in-design mitigation is already claimed), **INCONCLUSIVE** (cannot be decided with the evidence gathered, reason stated), **PASS-WITH-CAVEAT** is *not* used: a caveat that matters is a FAIL or INCONCLUSIVE on a narrower assumption.

## S1 - In-process typed graph (R2)

Synthetic engineering-shaped graph (layered abstraction levels, hierarchy, a few hubs, several relation kinds, string UUID ids), deterministic seed. Sizes: Tier 1 = 10^4 elements / 5x10^4 relations; Tier 2 = 10^5 elements / 10^6 relations (plus a 10^4-relation point).

| ID | Criterion | Tier 1 | Tier 2 |
|---|---|---|---|
| S1-a | Bounded query (<= 3 hops, kind-filtered, paged result) p95 over 200 random start nodes **[§7]** | < 100 ms | < 500 ms |
| S1-a2 | Same query started at the highest-degree hub (worst case), single run **[NEW]** | < 500 ms | < 2 s |
| S1-b | Impact analysis (depth <= 4, witness paths kept) p95 **[§7]** | < 300 ms | < 2 s |
| S1-c | In-memory apply+validate of a 50-op ChangeSet, p95 (SQLite persistence is added in S2; the *sum* is judged there) **[§7 partial]** | < 100 ms | < 300 ms |
| S1-d | Graph build from rows (excludes SQLite read; sum judged in S2) **[NEW]** | report only | report only |
| S1-e | Correctness: kernel graph agrees with a naive oracle on random queries; forward/inverse navigation equal; a failed apply leaves the graph unchanged **[NEW]** | must hold | must hold |
| S1-f | Heap after load at Tier 2 fits in default Node heap (no `--max-old-space-size` tuning) **[NEW]** | - | must hold |

Verdict rule: R2 PASS iff every "must"/"<" cell holds at Tier 1 **and** Tier 2. If Tier 1 holds and Tier 2 misses, R2 is FAIL for Tier 2 with the measured factor recorded; the design claim "Tier 2 has a seam" (§7) then becomes a *required* work item, not an option. If Tier 1 misses by > 10x the stack decision's own flip condition (a) is triggered.

## S2 - SQLite on Windows (R3)

| ID | Criterion |
|---|---|
| S2-a | `better-sqlite3` installs on the dev machine with **no C/C++ toolchain present** using only `npm install` (note also npm's install-script policy). **[NEW]** |
| S2-b | `node:sqlite` is usable without flags on the engines floor stated in `package.json`; report its stability status. |
| S2-c | Durable commit latency, `journal_mode=WAL`, **`synchronous=FULL`** (no weakening), 50-op ChangeSet incl. log append + materialised-row update, p95, at DB sizes matching Tier 1 / Tier 2 **[§7]**: < 100 ms / < 300 ms. |
| S2-d | Cold open = SQLite read of current rows + S1 graph build **[§7]**: < 2 s at Tier 1, < 10 s at Tier 2. |
| S2-e | Rebuild-from-log: replaying the log into empty materialised tables produces a state **identical** (hash) to the incrementally built state **[NEW]**; time: < 10 s Tier 1, < 120 s Tier 2 (recovery operation, not per-open) **[NEW]**. |
| S2-f | Crash safety: a writer process killed mid-transaction leaves no partial state on reopen, and the same `idempotencyKey` retry semantics work (unique constraint) **[NEW]**. |
| S2-g | A concurrent reader connection is not blocked by an open write transaction in WAL mode (UI reads during commit) **[NEW]**. |
| S2-h | As-of point query: 1-hop neighbourhood of one element at a past revision from `rev_from/rev_to` rows, p95 < 100 ms at Tier 2 **[NEW]**. |
| S2-i | Both bindings run the same fast test suite on Linux (Docker) **[§ NFR-042]**. |

Verdict rule: SQLite feasible iff a-c, e-h hold for at least one binding and d holds. If `better-sqlite3` fails S2-a but `node:sqlite` passes, the stack changes to `node:sqlite` via ADR.

## S3 - Local LLM structured extraction (R1)

Corpus: 20 engineering paragraphs written in this repo (`spikes/s3-llm/src/corpus.ts`), gold = verbatim quotes with kind. Every output item must carry a **verbatim source quote**; scoring is deterministic (no LLM judge).

Match rule for prediction vs gold quote (whitespace/case-insensitive token sets): gold-token coverage >= 0.8 **and** prediction-token precision >= 0.4; one-to-one greedy. Typed = kind equals gold kind or is in its `alt` list.

Model is "usable as an advisory candidate proposer" iff **all** hold **[NEW; judgment - a wrong candidate costs the user attention, so precision is weighted over recall]**:

| ID | Criterion |
|---|---|
| S3-a | Schema-valid response rate (constrained output) >= 98% of calls, no truncation |
| S3-b | Grounded rate (quote is a verbatim substring of the paragraph) >= 95% of predicted items |
| S3-c | Typed precision >= 0.70 |
| S3-d | Typed recall >= 0.60 |
| S3-e | Kind accuracy among quote-matched items >= 0.80 |
| S3-f | Negative control (P13, no engineering content): <= 1 predicted item |
| S3-g | p95 latency per paragraph <= 30 s (interactive-ish; large-document ingestion is streamed/queued and is out of scope for this bar) |

R1 verdict: PASS iff at least one *locally available* model meets all of S3-a..g; the smallest such model class is recorded. If none does, R1 is FAIL **for local-only free-text decomposition**: the recorded architectural consequence is that free-text decomposition requires an opt-in cloud provider or a bigger local model, while guided capture stays the no-LLM path (already the design, A7). Ambiguity flagging recall (planted phrases) is reported but is not a gate. Constrained vs prompt-only mode is compared to decide whether the port must implement the fallback parse path.

Known limits of this spike: 20 paragraphs / ~130 gold items is a feasibility probe, not a benchmark; the gold is one author's judgment, so "precision" is a lower bound (plausible extras not in gold count as errors); one machine, CPU-only inference.

## S4 - Render feasibility (R6)

Browser: Chromium-based (Microsoft Edge, driven by Playwright), headless; software/CPU raster. Cytoscape.js canvas renderer, ELK layered layout. Synthetic hierarchical architecture-like graphs, deterministic seed.

| ID | Criterion |
|---|---|
| S4-a | 500 nodes (~750 edges): ELK layered layout + first render <= 2 s, layout run off the main thread (worker) **[NEW]** |
| S4-b | 500 nodes: pan/zoom step (programmatic, includes redraw) p95 <= 50 ms; select node + highlight 3-hop neighbourhood <= 100 ms **[NEW]** |
| S4-c | 5,000 nodes **raw** (whole model): measured and reported. Expected to miss interactive bars; the design does *not* claim it passes ([§7]: "never whole model") **[§7]** |
| S4-d | 5,000-node model shown as a **bounded, collapsed view** (<= 500 visible nodes via hierarchy collapse + aggregated edges): compute view + layout + render <= 2 s; expand one cluster <= 1.5 s **[NEW]** |
| S4-e | Main thread not blocked > 200 ms during worker layout at 500 nodes (longest task) **[NEW]** |
| S4-f | Virtualised grid 500 x 500 **[§7]**: initial render <= 500 ms; scroll step p95 <= 50 ms; DOM cell count bounded (< 3,000) |
| S4-g | Virtualised grid 5,000 x 5,000 (windowed data source, never materialised) **[§7]**: same bars as S4-f |

R6 verdict: PASS iff S4-a, b, d, e, f, g hold (S4-c is informational). If S4-a/b fail, Cytoscape+ELK is falsified for the Tier 1 lens and an ADR must select another renderer/layout.

## Infrastructure assumptions (no numbers)

| ID | Assumption | PASS when |
|---|---|---|
| I-1 | npm workspaces + TS project references + strict config build on Windows | `tsc -b` clean from scratch |
| I-2 | Boundary rules **detect** violations (not just pass on clean code) | violation fixtures make the rule check fail; clean tree passes |
| I-3 | Kernel purity is enforced by the compiler (no Node/DOM globals in `kernel`) | a kernel file using `process` fails to type-check |
| I-4 | zod -> JSON Schema generation is deterministic and the committed schemas are consumable by a non-zod validator | regenerate == committed; Ajv and zod agree on a valid/invalid corpus incl. discriminated unions and a recursive type |
| I-5 | One command runs the fast suite locally in a reasonable time | `npm run test:fast` green; time reported |
| I-6 | Linux run of the fast suite via local Docker | container run green, from a clean `npm ci` |
| I-7 | Vite + React + Playwright(Edge channel) toolchain works on Windows | built page loads and a Playwright test passes |
| I-8 | Windows-specific hazards identified and covered by tests where testable: path with spaces/unicode, CRLF, file locking on delete, case-insensitivity, process-kill semantics, loopback bind | listed with result |
