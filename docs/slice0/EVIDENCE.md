# Slice 0 - Evidence report

Date: 2026-09-20. Criteria: `SPIKE_CRITERIA.md` (written and committed *before* any result; not edited afterwards). Raw data: `data/`. Decisions: `../adr/0001-stack-after-slice0.md`, `../adr/0002-identity-and-changeset-model.md`.
Machine: Windows 11, Ryzen 5 7430U (6C/12T), 15 GB RAM, integrated GPU only, Node 24.19 (Linux runs: Node 22.23.2 and 24.21.0 in Docker). One machine, one run per configuration: numbers show orders of magnitude and margins, not statistics across hardware.

## 0. Verdicts at a glance

| # | Assumption | Verdict | Deciding evidence |
|---|---|---|---|
| 1 | TS/Node workspace with strict, *enforced and detectable* architectural boundaries | **PASS** | 14 projects build; 14 boundary rules, each proven to fire by a fixture (found and fixed 2 config holes) |
| 2 | Kernel purity enforceable by tooling | **PASS** | compiler (`types: []`) + lint rules, both with firing tests |
| 3 | R2: in-process typed graph meets Tier 1 and Tier 2 | **PASS** | Tier 2 query p95 29 ms (bar 500), impact p95 12 ms (bar 2 s), commit p95 0.19 ms, heap 650 MB; 50k-degree hub stress 0.55 s |
| 4 | R3: SQLite binding installs on Windows without a compiler | **PASS** (Windows) | `better-sqlite3` 13 ships prebuilds; **Linux needed a repo `.npmrc`** (finding) |
| 5 | SQLite store meets §7 commit / open / as-of targets | **PASS** | Tier 2: commit p95 53 ms (bar 300), cold open 3.9 s (bar 10), as-of p95 0.3 ms |
| 6a | Rebuild-from-log is *correct* | **PASS** | bit-identical state hash incl. history, Tier 1/2, both drivers, and after SIGKILL crashes |
| 6b | Rebuild-from-log within the pre-registered time budget | **FAIL** | Tier 2: 127 s / 136 s vs 120 s (Tier 1: 2.1 s / 4.0 s vs 10 s passes) |
| 7 | Atomic commit, idempotent retry, crash safety (process kill) | **PASS** | 20 tests x 2 drivers x 2 OSs |
| 7b | Durability under power loss with `synchronous=FULL` | **INCONCLUSIVE** | not testable locally; process-kill does not exercise fsync |
| 8 | R1: local LLM can emit schema-valid, grounded structured output | **PASS** | 100% valid, 98-100% verbatim-grounded, all 4 models |
| 9 | R1: local LLM decomposition is good/fast enough to be an interactive advisory proposer | **FAIL** | typed precision 0.51-0.55 (bar 0.70); p95 latency 39-136 s (bar 30 s); no model passes all gates |
| 10 | R6: Cytoscape+ELK for a 500-node lens | **PASS** | 1.17 s layout+render; pan/zoom p95 36.5 ms; main thread never blocked |
| 11 | R6: collapsed 5,000-node bounded view *as specified* | **FAIL** | 5.5 s initial, 7.0 s expand-one (bars 2 s / 1.5 s): ELK cost follows edge density |
| 11b | ... with an edge budget (post-hoc mitigation) | **INCONCLUSIVE** | 0.37 / 0.25 / 1.03 s, but found after the failure on synthetic edges; must be re-verified in Slice 5 |
| 12 | Virtualised grids 500x500 and 5,000x5,000 | **PASS** | initial ~15 ms; scroll p95 ~27 ms (measurement floor); 539 DOM nodes |
| 13 | zod -> JSON Schema contract pipeline | **PASS** | deterministic; 3,000-mutation zod/Ajv differential fuzz: 0 disagreements |
| 14 | Local test infrastructure | **PASS** | one command, 54 tests, 16 s quiet / 49 s under load (Windows); Playwright/Edge smoke |
| 15 | Windows/Linux portability | **PASS with findings** | Linux green on Node 22 and 24; case-insensitive collisions **untested** (INCONCLUSIVE for that sub-item) |

**Stack changes required:** none of the core technologies is replaced. Amendments are in ADR-0001 (TypeScript 6.0 not 7, compiler flags, `contracts` as a leaf, `.npmrc ignore-scripts`, edge-budgeted graph views, asynchronous local LLM decomposition, query traversal budget, rebuild follow-up).
**Ready for Slice 1:** yes, conditional on human acceptance of ADR-0001 (Slice 1 is the no-LLM path, so verdicts 9 and 11 do not block it; they constrain Slices 2 and 5).

## 1. S1 - in-process graph (R2)

Synthetic layered engineering-shaped graph (6 layers, containment forest, 8 relation kinds, ~8% of cross-layer targets drawn from a small hub set, string UUID ids), seeded. Timings in ms.

| Size (elements / relations) | Build | Query p50 / **p95** / max | Hub query (worst of 3) | Impact p95 | Commit(50 ops, in-mem) p95 | Heap |
|---|---|---|---|---|---|---|
| 2k / 10k | 6 | 0.35 / **0.63** / 0.92 | 1.3 | 0.28 | 0.10 | 14 MB |
| **10k / 50k (Tier 1)** | 39 | 0.82 / **2.02** / 2.83 | 6.6 | 0.38 | 0.08 | 57 MB |
| 20k / 100k | 113 | 0.92 / **2.35** / 3.70 | 10.2 | 0.49 | 0.09 | 116 MB |
| **100k / 1M (Tier 2)** | 1,886 | 18.2 / **29.0** / 46.4 | 114.5 | 12.2 | 0.19 | 650 MB (limit 2,240) |

Bars: query p95 < 100 / < 500; hub < 500 / < 2,000; impact < 300 / < 2,000; commit < 100 / < 300 (Tier 1 / Tier 2). Query: <= 3 hops, both directions, 6 relation kinds, target-kind and property filter, 100-row page, 200 random starts (median result set 891 at Tier 1, 8,718 at Tier 2). **All pass with 17x to 500x margin.**

Hub stress (`data/s1-hub-stress.json`, Tier 2 graph + one extra hub): degree 1k / 5k / 20k / 50k -> query 0.23 / 0.50 / 0.52 / 0.55 s, impact 0.07 / 0.12 / 0.21 / 0.43 s. Passes S1-a2 (2 s) even at 50k, **but the query still returned ~36,000 reached elements** because paging does not bound traversal. This is the origin of the traversal-budget rule (ADR-0002 rule 7).

Correctness (S1-e): 7 tests against an independent edge-scan oracle (60 random queries, exact hop distance and reached-set equality), witness-path validity, multiplicity (`arrivals`), forward/inverse agreement, read-only impact, and a 200-run property test that failed change sets leave the graph fingerprint unchanged. **Mutation-checked:** disabling rollback and off-by-one hop counting each made tests fail.
Not measured: as-of queries on the in-memory graph (served from SQLite, §2); worker-thread offload; concurrent readers during a commit.

## 2. S2 - SQLite (R3)

| | `better-sqlite3` 13.0.3 | `node:sqlite` (Node 24.19) |
|---|---|---|
| Install on Windows, no C/C++ toolchain (`where gcc cl` empty) | works; no install script, no download (prebuilds in tarball) | built in, no flag, **no ExperimentalWarning** observed |
| SQLite version | 3.53.4 | 3.53.3 |
| Tier 1 commit p95 / cold open / rebuild | 47.8 ms / 146 ms / 2.1 s | 42.7 ms / 180 ms / 4.0 s |
| **Tier 2** commit p95 (`synchronous=FULL`) | **52.6 ms** (bar 300) | 50.7 ms |
| Tier 2 cold open (conn + read/parse + graph) | **3.9 s** (2.2 + 1.8) (bar 10) | 4.4 s |
| Tier 2 as-of 1-hop p95 | **0.30 ms** (bar 100) | 0.33 ms |
| Tier 2 rebuild-from-log | **127.5 s** (budget 120) | **136.2 s** |
| Tier 2 state hash identical after rebuild | yes | yes |
| Tier 2 DB size / bulk load (22,000 durable commits) | 606 MB / 478 s | 606 MB / 449 s |

Commit p50 is ~6.7 ms but p95 ~50 ms, **identical under `synchronous=NORMAL`** (53 ms): so the tail is not fsync cost; WAL checkpointing is the likely cause but was not isolated. Well inside budget; noted so nobody "fixes" it by weakening durability.
Cold open was measured with a warm OS file cache (a cold-cache run was not attempted); treat 3.9 s as a lower bound.

Functional tests (20 per driver, all pass on Windows and Linux): commit + reload into the S1 graph; idempotent retry; stale-base rejection; mid-changeset failure rolls back the log row and earlier ops (and does not burn the key); as-of history; rebuild-equality property test; reader not blocked by an open write transaction and a second writer gets `SQLITE_BUSY`; paths with spaces/unicode/deep nesting; **SIGKILL with an open transaction** leaves exactly the committed state; **SIGKILL at 3 random moments in a commit stream** never loses an acknowledged commit or leaves a partial one, and replaying the log after each crash reproduces the materialised state.

Defects found by the spike (all fixed and now covered): (1) two updates to one element inside one ChangeSet violated the `(id, rev_from)` key (found by the property test) -> ADR-0002 rule 4; (2) Windows cannot delete a directory holding an open database (EPERM) -> tests close all handles.

## 3. S3 - local LLM structured extraction (R1)

Corpus: 20 paragraphs written in this repo (125 gold items and 13 planted ambiguities across 8 kinds; one no-content control; ambiguity, negation, numeric, bulleted, informal and passive-regulatory styles), scored deterministically by verbatim-quote matching (no LLM judge; scorer unit-tested). Ollama 0.34.2, CPU-only (`size_vram: 0`), temperature 0, seed 42, ctx 4096, schema from zod.

| Model | Valid | Grounded | Typed P | Typed R | Kind acc | Neg. control items | Ambig. recall | p50 / **p95** latency | tok/s |
|---|---|---|---|---|---|---|---|---|---|
| phi4-mini (3.8B) | 1.00 | 0.99 | 0.51 | 0.42 | 0.71 | 6 | 0.38 | 28 / **40 s** | 6.1 |
| gemma3:4b | 1.00 | 1.00 | 0.53 | 0.51 | 0.79 | 2 | 0.00 | 25 / **40 s** | 6.0 |
| qwen3.5:4b | 1.00 | 1.00 | 0.52 | 0.64 | 0.82 | 0 | 0.23 | 35 / **49 s** | 4.9 |
| qwen3.5:9b | 1.00 | 1.00 | 0.55 | 0.72 | 0.87 | 7 | 0.62 | 106 / **136 s** | 2.9 |
| phi4-mini, prompt-only (no schema constraint) | 1.00 | 0.98 | 0.53 | 0.46 | 0.70 | 0 | 0.31 | 25 / **39 s** | 6.6 |
| *Bars* | >= .98 | >= .95 | >= .70 | >= .60 | >= .80 | <= 1 | - | <= 30 s | |

Gates passed per model: phi4-mini a,b; gemma3:4b a,b; qwen3.5:4b a,b,d,e,f; qwen3.5:9b a,b,d,e; **none passes c (precision) or g (latency); no model passes all seven.** Verdict per the pre-registered rule: **R1 FAIL for local-only interactive decomposition on this hardware.** The technical half of R1 (structured output) **passes** everywhere, and prompt-only decoding was equally valid here, so the port needs the fallback parse path but constrained decoding is not strictly required.

Error analysis (`spikes/s3-llm/src/inspect.ts`, honest reading of the precision shortfall):
- Many "false positives" are plausible extractions my gold did not label (system elements and stakeholders are under-labelled: e.g. "the on-board unit", "The energy management system", "Each turbine"): precision is a **lower bound**.
- Many "misses" are granularity splits (the model returned "IEC 60601-2-24" where gold has the whole clause) - a real usability cost, since fragments lose meaning.
- Genuine errors remain: wrong kinds (stakeholder vs system element, requirement vs objective, function vs interface), and over-extraction on the no-content paragraph (phi4-mini: "The annual family picnic" as a system element).
- **Diagnostic only (post-hoc, not a gate):** restricted to requirement/constraint/assumption, where gold was near-exhaustive, typed precision/recall were 0.58/0.60 (gemma), 0.59/0.42 (phi4), 0.62/0.63 (qwen 4B), **0.73/0.71 (qwen 9B)** (`data/s3-diagnostic-restricted-kinds.json`). The verdict stands as measured; this shows where a Slice 2 retry should start.
- Latency is dominated by CPU token generation (3-7 tok/s). Idle-machine throughput (6.6 tok/s) matched runs made while other work ran (6.1), so contention did not change any verdict; every p95 misses by 33% or more.
Limits: 20 paragraphs is a probe, not a benchmark; gold is a single author's; one machine; no GPU.

## 4. S4 - render feasibility (R6)

Headless Microsoft Edge (Chromium 153.0.4234.32, Playwright `channel: msedge`), software raster, Cytoscape 3.34 canvas, ELK 0.12 layered in a Web Worker, synthetic graphs; grid is DOM-virtualised with a lazy data source (25M virtual cells never materialised). The two-`requestAnimationFrame` measurement floor is ~26.7 ms, so "~27 ms" means *at or below one frame of work*.

| Scenario | Result | Bar | Verdict |
|---|---|---|---|
| S4-a 500 nodes / 742 edges, layout + render | 939 + 226 = **1,165 ms** | <= 2 s | PASS |
| S4-b pan/zoom step p95; select + 3-hop highlight p95 | **36.5 ms**; **50.5 ms** | <= 50; <= 100 | PASS |
| S4-e main-thread blockage during layout | long task 0 ms; heartbeat lag **1.7 ms** | <= 200 ms | PASS |
| S4-c 5,000 nodes / 7,495 edges raw | layout 12.8 s + render 1.9 s = **14.6 s** | informational | (not interactive; not claimed) |
| S4-d collapsed 5k model, 100 groups / 1,378 edges | **5,528 ms** (layout 5,219) | <= 2 s | **FAIL** |
| S4-d expand one group (149 nodes / 1,449 edges) | **7,002 ms** | <= 1.5 s | **FAIL** |
| S4-d 8 groups expanded (492 nodes / 1,937 edges) | **6,897 ms**; interactions p95 pan 44 / select 102 ms | <= 2 s | **FAIL** |
| S4-f grid 500x500: initial; scroll p95; DOM | 16 ms; 26.9 ms; 539 nodes | <= 500 ms; <= 50 ms; < 3,000 | PASS |
| S4-g grid 5,000x5,000: initial; scroll p95; DOM | 15 ms; 26.8 ms; 539 nodes | same | PASS |

Diagnosis of S4-d: layout cost tracks edges (100 nodes + 1,378 edges = 5.2 s; 500 nodes + 742 edges = 0.9 s). **Post-hoc mitigations** (`data/s4-results-collapsed5000_*.json`, clearly outside the pre-registered result): ELK `thoroughness=1` alone: 3.0 / 2.6 / 2.9 s (still fails); **edge budget of 3 strongest aggregated edges per node**: 0.37 / 0.25 / 1.03 s, interactions p95 pan 27 / select 54 ms; both together 0.33 / 0.19 / 0.61 s. All pass, but the edge structure is random, the cap hides relations (a count badge / drill-down must show what was cut, or it violates the "never silently drop" principle), and the mitigation was chosen after seeing the failure. Hence verdict 11b INCONCLUSIVE until Slice 5.
Bundle: ELK worker asset 1.6 MB; app chunk 450 KB (144 KB gzip) including Cytoscape. Not measured: headed/GPU rendering, high-DPI, real model shapes, labels at zoom, edit interactions.

## 5. Infrastructure and portability

| ID | Result |
|---|---|
| I-1 project references | `tsc -b` clean over 14 projects (TypeScript 6.0.3). TS 7.0.2 could not be installed with typescript-eslint 8.70 (`ERESOLVE`, peer `<6.1`). |
| I-2 rules detect violations | all 14 rules detected on a violating fixture with the exact rule name; allowed edges not flagged; the CLI gate exits non-zero on violations. **The test found a hole:** excluding `*.d.ts`/`dist` let npm imports (`vitest`, `fast-check`) escape the kernel rule; fixed. Also fixed a false positive (`/test/` matched `node_modules/@playwright/test/`). The real tree currently has only 17 cruised dependencies: green is meaningful because the fixtures fire, not because the tree is big. |
| I-3 kernel purity | `process`, `Buffer`, `console`, DOM globals and `node:` imports fail to compile in kernel; `Date.now`, `Math.random`, `new Date()`, ambient timers fail lint (kernel only). |
| I-4 contracts | committed schemas == regenerated; Ajv 2020 strict compiles all; differential fuzz 0 disagreements over 3,000 mutations (>300 rejected and >30 accepted, so agreement is non-trivial). Findings: Ajv needs `allowUnionTypes`; `refine()` is silently dropped from JSON Schema (test documents it); brands do not appear on the wire; Fastify's default Ajv rejects 2020-12. |
| I-5 one command | `npm run test:fast` (tsc -b, ESLint, boundary rules, contract check, 54 vitest tests): 15.6 s on a quiet Windows machine (incremental `tsc`), 49 s while a benchmark ran in the background. `npm run test:e2e`: Playwright + Edge, 1 test, ~6 s. |
| I-6 Linux | `node scripts/test-linux.mjs [--node N]` from a clean `npm ci`: **54/54 pass on Node 22.23.2 and 24.21.0**, including both SQLite drivers, SIGKILL crash tests and API transport tests. |
| I-7 web toolchain | Vite 8 + React 19 + plugin-react 6 build; Playwright drives system Edge with no browser download. |
| I-8 hazards | Covered: spaces/unicode/deep paths (both drivers, both OSs); LF line endings (`.gitattributes`; generated schemas byte-equal on Linux from a Windows tree); file locking on delete (found, fixed); process-kill semantics; loopback-only bind, per-launch token, SSE streaming (both OSs). **Findings:** (a) implicit `node-gyp rebuild` for `better-sqlite3` on npm >= 11.19 / Linux without a compiler -> `.npmrc ignore-scripts=true` (failing log reproduced; passes after); (b) Docker Desktop bind-mounting a `D:` path hung -> the Linux runner streams a tar over stdin instead; (c) a fresh `docker run` hung until the image was pulled explicitly. **Not covered:** case-insensitive filename collisions, long-path (> 260) limits, antivirus/locking interference, musl (Alpine) runtime - `better-sqlite3` ships a musl prebuild but it was not run. |

## 6. What was not established (read before relying on this)
- All performance numbers come from one laptop, one run each, synthetic data shaped by me; real models have different structure (deep hierarchies, huge fan-in, long property strings).
- Power-loss durability, cold-cache open, multi-process contention, and worker-thread behaviour were not measured.
- LLM quality was measured on 20 paragraphs against one author's gold, on CPU only; a GPU or a cloud model was not tested and may pass.
- The render results are headless software-raster numbers; a real GPU browser will differ (likely faster for canvas, unknown for layout, which is CPU-bound JS either way).
- No human validation was in scope for Slice 0.
