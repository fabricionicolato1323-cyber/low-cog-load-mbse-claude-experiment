# ADR-0001: Technology stack after the Slice 0 falsification spikes

Status: **Proposed** - evidence complete, awaiting human acceptance before Slice 1.
Date: 2026-09-20
Amends: `TECHNOLOGY_STACK_DECISION.md` (status "Proposed, subject to Slice 0"), `REQUIREMENTS_ANALYSIS.md` A7/A12/§7.
Evidence: `docs/slice0/EVIDENCE.md` (criteria pre-registered in `docs/slice0/SPIKE_CRITERIA.md` and committed before any result); raw data `docs/slice0/data/`.

## Context
The proposed stack (TypeScript/Node, in-process graph, SQLite, Ollama-class local LLM, Cytoscape+ELK, React) was deliberately left falsifiable. Slice 0 ran the spikes against criteria fixed in advance. Result summary: **no flip condition of the stack decision (§4) was triggered; no core technology was replaced. Three assumptions did not survive as written and are amended below** (local LLM decomposition, dense bounded graph views, rebuild time budget), and several concrete version/config constraints were discovered.

## Decision

### Unchanged (assumption held)
TypeScript end-to-end; Node LTS runtime; in-process typed graph in the kernel; SQLite (WAL, `synchronous=FULL`) behind the `ProjectStore` port; zod as contract source with committed JSON Schema; Fastify + SSE; React + Vite; Vitest/fast-check/Playwright; npm workspaces + project references; Linux verified locally via Docker.

### Amended or constrained
1. **TypeScript pinned to 6.0.x, not 7.** `typescript-eslint` 8.70 declares peer `typescript <6.1`; TS 7.0.2 makes `npm install` fail (`ERESOLVE`). Revisit when typescript-eslint supports 7.
2. **Compiler flags:** `exactOptionalPropertyTypes` is **off** (zod-inferred optional fields in recursive schemas are incompatible with it). Vite-built packages (`web`, render spike) use `moduleResolution: Bundler` (ELK's CJS typings do not type-check under NodeNext); Node-run packages use `NodeNext`.
3. **Layering clarification:** `contracts` is a pure leaf *below* `kernel` (kernel and web both import it; it imports only zod). This resolves the wire-schema ownership question that the stack decision §2 left implicit. Enforced by 14 dependency-cruiser rules, each proven to fire by a violating fixture (`tools/arch/arch.test.ts`).
4. **SQLite binding:** `better-sqlite3` **13.0.3 (locked in `package-lock.json`)** (ships prebuilt binaries for win32/linux/linuxmusl/darwin x64+arm64 inside the tarball; engines `node >=22`; no compile step, no download). `node:sqlite` is a *verified* fallback (identical results, no experimental warning on Node 24.19, both drivers pass the same 20-test suite on Linux Node 22.23 and 24.21). **Repo `.npmrc` sets `ignore-scripts=true`**: without it, npm >= 11.19 on a compiler-less Linux implicitly runs `node-gyp rebuild` for `better-sqlite3` and `npm ci` fails (reproduced in Docker; log excerpt in EVIDENCE).
5. **Contract dialect and rules:** JSON Schema 2020-12 from zod's native `z.toJSONSchema`; `strictObject` only; no `.refine()` in wire schemas; Ajv consumers need `allowUnionTypes`; **Fastify's default Ajv is draft-07 and rejects 2020-12**, so the API installs an Ajv2020 validator compiler (a few lines, tested).
6. **Graph lens (R6) - conditional adoption.** Cytoscape + ELK (ELK in a Web Worker) is retained for bounded views, **but the pre-registered criterion for the collapsed 5,000-node view failed** (5.5 s initial, 7.0 s to expand one group, against 2 s / 1.5 s). Cause: ELK layered cost follows *edge density*, not node count (100 nodes/1,378 aggregated edges: 5.2 s; 500 nodes/742 edges: 0.9 s). Post-hoc mitigation (visible aggregated edges capped at the 3 strongest per node, remainder shown as a count) brought every state inside budget (0.37 s / 0.25 s / 1.03 s at 492 visible nodes). Decision: **bounded graph views must carry an explicit edge budget; the whole-model graph is not a supported view at any tier.** The mitigation was found *after* the failure and on synthetic edges, so it is a design constraint to be re-verified against the pre-registered criteria in Slice 5, not a pass.
7. **LLM assumption (R1) amended.** Schema-constrained decoding with a zod-derived schema is technically solid (100% schema-valid, ~100% verbatim-grounded across 4 local models x 20 paragraphs). **Extraction quality and latency on a CPU-only laptop do not meet the advisory-proposer bar:** typed precision 0.51-0.55 (bar 0.70), p95 latency 40-136 s per paragraph (bar 30 s), negative-control over-extraction in 3 of 4 models. Consequences, all for Slice 2:
   - local free-text decomposition is a **background/asynchronous job with visible progress**, never an in-turn step in the conversation;
   - guided capture remains first-class *and* the only interactive path on this hardware class;
   - Slice 2 starts with its own pre-registered evaluation on an exhaustive gold (this spike's gold is one author's and under-labels system elements/stakeholders; see EVIDENCE §S3 diagnostic), restricted first to the kinds where the 9B model reached P 0.73 / R 0.71 (requirement, constraint, assumption);
   - a cloud provider stays opt-in behind consent; no change to the port design.
8. **Rebuild-from-log budget missed.** Correctness held (bit-identical, including after SIGKILL). Time at Tier 2: 127 s (`better-sqlite3`) and 136 s (`node:sqlite`) against the pre-registered 120 s. It is a recovery operation, not on the open path, so **SQLite stays**; a faster replay path (larger batches, prepared statement reuse, parallel JSON parse) is a tracked follow-up before Slice 13. The budget is not retroactively relaxed.
9. **Query IR must carry a traversal budget** (see ADR-0002 rule 7).

### Pinned versions verified together (Windows 11, Node 24.19; Linux Node 22.23 and 24.21)
typescript 6.0.3, vitest 5.0.1, vite 8.3.0, eslint 10.11.0, typescript-eslint 8.70.0, dependency-cruiser 18.3.1, fast-check 4.10.2, zod 4.6.5, ajv 8.20.0 (+ajv-formats 3), fastify 5.12.5, better-sqlite3 13.0.3, cytoscape 3.34.3, elkjs 0.12.0, react 19.3.0, @vitejs/plugin-react 6.1.1, @playwright/test 1.63.0 (system Edge channel; no browser download).

## Consequences
- Slice 1 may proceed on this stack *if this ADR is accepted*; Slice 1's plan must include: rebuild-equality and crash tests as a standing store suite; boundary/purity tests kept green; ADR-0002 rules 4-5.
- Slice 2 scope and its M1 human checkpoint must not assume interactive local LLM decomposition.
- Slice 5 must re-run the graph criteria with the edge budget and realistic (not random) edge structure.
- Human decision needed: accept the amended R1 consequence (asynchronous local decomposition) or fund a stronger-hardware / cloud-first path for Slice 2.

## Revisit when
typescript-eslint supports TS 7; a Slice 5 render benchmark fails with the edge budget; a local model meets all S3 gates on the target hardware; Tier 3 (> 10^6 relations) becomes a target.
