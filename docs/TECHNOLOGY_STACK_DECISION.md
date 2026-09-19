# Technology Stack Decision

Status: **Proposed - recommended for adoption**, subject to the Slice 0 falsification spikes (roadmap). Date: 2026-09-19.
Depends on: `REQUIREMENTS_ANALYSIS.md` (drivers D1-D12), `ARCHITECTURE_OPTIONS.md` (Option A chosen).

Version numbers are deliberately not pinned here; pin exact versions in Slice 0 after checking current releases. Statements about third-party product status are as I understand them and must be verified at adoption.

## 1. Decision summary

| Layer | Choice | Decided because (requirement-driven) | Exit ramp if wrong |
|---|---|---|---|
| Architecture | Hexagonal modular monolith; pure semantic kernel; ChangeSet ledger | D1-D5, D12 | Ports isolate every infrastructure choice |
| Implementation language | **TypeScript (strict)** end-to-end | One typed contract from kernel to interactive UI (see §4); best-in-class graph/grid rendering ecosystem is JS-only; schema-first LLM tooling; no server admin to run locally | Kernel is pure and contract-first (JSON Schema); can be ported/extracted (§4 "What would flip this") |
| Runtime | **Node.js LTS** | Boring, ubiquitous on Windows/Linux, prebuilt native modules, already present on the dev machine (tie-breaker only) | Bun/Deno are drop-in candidates later; kernel has no Node APIs |
| Canonical store | **SQLite (WAL)** per project: append-only ChangeSet log + materialised as-of tables + candidate tables, behind `ProjectStore` port | F1 embedded/offline; ACID single-writer commits; portable single-file project (I6) | Postgres adapter for shared mode; graph/RDF read-model behind read port |
| In-memory read graph | Own indexed typed-graph structure in the kernel | D4/D5: witnesses, multiplicity, bounded traversal without a DB round trip | Read-port reimplemented over SQL CTEs / graph DB |
| Ontology & profiles | **YAML data packages** validated by JSON Schema; compiled into an immutable runtime | D3, NFR-012/013; human-authorable and diffable | Additional loaders (JSON, SHACL import) |
| Rules | **Generic rule kinds** implemented in the engine (cardinality, required-relation/coverage, endpoint constraint, property constraint, derivation, impact-propagation) | D3/D4; profile data selects rules, never code | Add a small expression language (e.g., CEL-class) only when a real rule needs it |
| Query | **Own structured Query IR (JSON)**; NL is a front-end producing IR | QUERY-*, A6; one IR feeds NL, expert, matrices, views | Compile IR to SQL/Cypher/SPARQL for a scale/interchange adapter |
| API / transport | **Fastify** HTTP + JSON, schema-first (zod -> JSON Schema/OpenAPI); **SSE** for streaming/notifications | NFR-010 transport is an adapter; streaming LLM/imports (I8) | WebSocket added for presence/collab; framework swappable |
| Client | **React + TypeScript + Vite**; TanStack Query (server state) + small store (UI state) | Widest ecosystem for graph/grid/editor widgets the lenses need; near-zero cost to change because UI is an API client | Any framework can replace it; kernel unaffected |
| Graph lens | **Cytoscape.js** + **ELK** layered layout (client-side) | VIEW/IFACE/IMPACT interactive exploration, path highlighting, bounded subgraphs | Alternative renderers behind a `GraphViewModel` |
| Matrices / N² | Custom **virtualised grid** over `MatrixViewModel` (evaluate a headless table lib in Slice 4) | MATRIX-002/003: cells carry canonical IDs and drill-down; N² can be large | Swap grid lib |
| Scenario lens | Custom SVG renderer (sequence/lifeline-style), decision at Slice 11 | SCEN-001; no library is a clear fit | Evaluate diagram libs then |
| LLM integration | Thin own **`LanguageModelProvider` port**; adapters: local **Ollama-class HTTP**, one cloud provider; **scripted fake** for tests | NFR-043/044, UX-050..053, ACC-004; frameworks add orchestration semantics we must not import (INT-023) | Add providers without touching kernel |
| Tool/provider integration | `CapabilityContract` data + `ProviderAdapter` port; out-of-process transport (JSON-RPC over stdio or HTTP; MCP-compatible transports admissible) | INT-020..023 | Any transport |
| Formal interop | Data-driven **mapping engine** in TS; SysML v2 JSON first; textual notation via optional **JVM sidecar** later | INT-010..015 | Sidecar or native parser |
| Testing | **Vitest** (unit/property with **fast-check**), **Playwright** (UI + screenshots), scripted LLM, golden files, boundary lint (`dependency-cruiser` or ESLint boundaries) | ACC-001..006, NFR-011 | — |
| Monorepo tooling | **npm workspaces** + TypeScript project references (no extra tool to install) | Minimal moving parts; strict boundaries enforced by lint | pnpm later if needed |
| Packaging v1 | Portable folder: bundled Node runtime + app + launcher script opening browser on `127.0.0.1` | Fastest, identical code path to server mode; no shell dependency | Desktop shell (Tauri/Electron) decided in Slice 13 with criteria (§6) |
| Cross-platform check | Windows primary; **Linux via local Docker** test run | NFR-042 without remote CI (ACC-010) | — |

## 2. Layering and dependency rules

```
web/            React client; depends only on contracts/
api/            Fastify routes, auth hooks, SSE; depends on app/, contracts/
app/            Conversation orchestrator, NextActionPlanner, ImportPipeline, ReconciliationService,
                ExecutionPlanner. Depends on kernel/ and ports/
kernel/         PURE. Ontology runtime, graph, ChangeSet+validation, rule engine, query IR/executor,
                reasoning (completeness, traceability, impact), projections. Depends on nothing but stdlib+schema lib
ports/          Interfaces: ProjectStore, LanguageModelProvider, Importer, RepresentationMapper, ProviderAdapter, Clock, Ids
adapters/       store-sqlite, llm-ollama, llm-cloud-x, llm-scripted, import-reqif/csv/sysmlv2json, provider-mock...
contracts/      JSON Schema (generated from zod, committed): ChangeSet, Query IR, ViewModels, Ontology package, API DTOs
profiles/       Ontology packages (YAML): core.neutral, profile.* (data only)
```

Enforced by automated boundary rules: `kernel` imports nothing from `app|api|adapters|web`; `web` imports only `contracts`; adapters import ports, never each other; no file under `kernel/` references methodology names, vendor names or UI strings (NFR-013 test: a grep-style architecture test over `kernel/`).

## 3. Key design decisions

### 3.1 Semantic model and history
- **Element**: `{ id, kind, props, applicability? , sourceRefs? }`. **Relation**: `{ id, kind, source, target, props, applicability? }`. IDs are opaque time-ordered UUIDs generated by the actor (no central sequence: friendly to offline and multi-user, COL-020). Labels are ordinary properties, never identity (SEM-020/021).
- Relations are stored once; inverse labels give bidirectional navigation (A3). N-ary exchanges (information/material/energy/service flows) are modeled as elements connected by relations, so they have identity and provenance.
- **Applicability** (state/mode/situation/configuration scoping, REQ-DY) is an optional link set from an element/relation to context elements; used as a query/view filter. Introduced structurally now, populated in a later slice.
- **History**: a monotonically increasing `revision`; every version row holds `rev_from/rev_to`; `baseline` markers pin revisions (A8); queries take `asOf`. The ChangeSet log is the source of truth: **materialised tables must be rebuildable from the log** - a standing property-based test.

### 3.2 ChangeSet and candidate lifecycle (D1)
```
draft -> proposed(candidate) -> validated -> [approved] -> committed
                       \-> rejected            \-> stale -> rebased -> validated ...
```
- `ChangeSet{ id, baseRevision, ops[], origin, actor, rationale, idempotencyKey, validationReport, impactPreview }`. Ops: add/update/remove element/relation, alias/merge, set-authority, confirm/reject candidate.
- Provenance origin (per op) is one of: `user | deterministic-rule | import | external-source | tool-result | llm-advisory | admin-migration` (SEM-030) plus references (source artifact, rule id, model id/prompt hash for LLM).
- **Structural enforcement.** The `CommitService` is the only caller of the store's `appendCommitted(...)`, which requires a `ValidatedChangeSet` value that only the kernel validator can construct (branded/opaque type + runtime check). Candidates live in separate tables; authoritative queries exclude them unless explicitly requested and clearly marked. A test suite (ACC-004) tries every LLM/import/graphical path and asserts authoritative state is unchanged until an explicit confirm.
- **Commit protocol:** `BEGIN IMMEDIATE` -> if `base != head`, run *semantic rebase* (touched-set overlap; same-property conflict; delete-vs-edit; cardinality/endpoint re-validation on merged state) -> validate -> append log + update materialised rows -> `COMMIT`. Failure at any point rolls back, leaving state untouched (NFR-031, COL-007). Retries with the same `idempotencyKey` return the original result (COL-008). Single-writer SQLite serialises commits; Postgres later provides equivalent isolation.
- **Undo** = compensating ChangeSet (I2). **Merge** = explicit ChangeSet with permanent alias (A3b).
- **Auto-accept** exists only as a profile-declared rule that the project has explicitly enabled (A2); default off.

### 3.3 Ontology, profiles, rules
- `core.neutral` package: small type set derived from the semantic families (purpose/challenge, objective, capability, stakeholder/entity/system/organisation/role, activity/function/behavior, requirement/constraint/measure/acceptance criterion, exchange/interface/port, scenario/occurrence, state/mode/situation/configuration, environment/assumption, functional/logical/realization structures, allocation, alternative/variant, analysis need/evidence/result/decision, task/work package/artifact/milestone/baseline). Grows by ADR only.
- Profile packages add: vocabulary aliases (per disclosure level), cardinalities, additional subtypes, rules, information needs, questioning strategy, viewpoints, representation mappings. Profiles can be activated/deactivated per project; deactivation changes *presentation and gap reporting only* (SEM-042/043).
- **Information needs** drive questions (SEM-051): `{ pattern, priority, applicability, questionTemplate, choiceSource }`.
- **Rule kinds v1** (generic, engine-implemented): `cardinality`, `required-relation` (coverage), `endpoint-constraint`, `property-constraint`, `derivation` (candidate producer; `autoAccept` flag gated by A2), `impact-propagation` (which relation types propagate change, in which direction, with `direct|potential` classification).
- All rules produce a **finding with a witness** (elements/relations/rule id/profile), reused by UI, planner and LLM prompts.

### 3.4 Query, reasoning, projections
- **Query IR** (JSON): `from{kinds,filters}`, ordered `steps[{traverse:relKinds, dir, depth, filters}]`, predicates including `absent(relation)` / `present`, `groupBy`, `project`, scope filters (level, concept type, relation type, profile, provenance origin, state/mode/config, verification status), `asOf{revision|baseline}`, paging. Result rows keep canonical IDs and never collapse multiplicity (QUERY-004).
- **NL front-end**: LLM (schema-constrained) or intent-catalog fallback -> IR -> shown as "I understood: ..." -> deterministic execution. Results labelled deterministic; any LLM narration labelled advisory (NFR-021).
- **Impact**: bounded breadth-first propagation along `impact-propagation` relation types returning *witness paths*; distinguishes directly modified from potentially impacted (IMPACT-002/003); read-only (IMPACT-004). Also runs on *proposed* ChangeSets for preview (REQ-AU-005).
- **Projections**: `project(graph@rev, ViewSpec) -> ViewModel` for `GraphViewModel`, `MatrixViewModel`, `TextViewModel`, `TraceViewModel`, `ScenarioViewModel`, `WbsViewModel`. ViewSpecs are data (profile viewpoints + user filters). No view stores truth; layout is a UI preference table, explicitly non-authoritative (ACC-002 test: any two projections of the same revision agree on identities and relations).

### 3.5 LLM services (advisory) 
- Port operations: `interpret(text, boundedContext) -> CandidateStatements[]` (JSON-schema constrained), `translateQuery(text, boundedContext) -> QueryIR`, `phrase(plannedQuestion)`, `explain(subgraph) -> narrative with cited element IDs`.
- **Bounded context packer** (deterministic): selects the relevant subgraph by focus + hop budget + token budget; never sends the whole model (NFR-051).
- **Capability probing**: does the provider support schema-constrained output, tool calling, context size? Falls back to prompt+parse+validate.
- **All output** passes the same `CandidateNormalizer` -> kernel validator -> candidate store. Prompt/model/params hashes recorded as `llm-advisory` provenance.
- **Data-egress policy** (I1): per-project setting `local-only | cloud-allowed(provider list)`, explicit consent, request log; default `local-only`.
- **Deterministic planner (no LLM needed)**: `NextActionPlanner` ranks pending candidates, blocking findings and open information needs, and emits exactly one `PrimaryAction` (+ <= 3 alternates) with a `why` traceable to the need/rule (REQ-CF-002/005, UX-005).

### 3.6 Federation, formal interop, execution
- **Import pipeline**: `Importer` -> raw items with `sourceRef{system,id,version,authority}` -> interpretation -> candidates -> reconciliation UI (confirm/reject/refine/merge/keep separate) -> ChangeSet. Missing connector = explicit **integration gap** backlog item (INT-003).
- **Mapping engine**: mapping data pairs canonical types/relations with representation constructs and a **fidelity class** (`exact | partial | lossy | unsupported | application-only`). Projection and import report classes per item; no silent flattening (INT-012); non-representable app metadata stays app-only (INT-015). Representation elements keep `mappingProvenance` linking to canonical IDs (INT-013).
- **Execution**: `CapabilityContract` (semantic preconditions, inputs, outputs) resolved to providers separately (INT-020/021). `ExecutionRecord.mode ∈ {planned, simulated, real}` is a *type*, and UI copy derives from it (UX-060/061). Consequential runs need review before launch unless a trusted policy says otherwise (UX-062). Results become evidence candidates linked to model revision, assumptions, provider and configuration (INT-022).

### 3.7 Collaboration path (design constraints, not v1 scope)
Everything mutable goes through `commit(baseRevision, changeSet)`; revisions and IDs are collision-free; conflicts are semantic (A14). Later: Postgres store adapter, authN/Z with roles (viewer/contributor/reviewer/approver/admin/integration actor), revision-change notifications (SSE now; broker later), presence/stale-view banners, CRDT (e.g., Yjs-class) only for transient text/layout. External sync jobs use the same commit path (COL-012).

## 4. Language decision (the part most exposed to "familiar/popular" bias)

Evaluated for the **kernel + application layer** with the UI being web technology in all cases (justified in §5.1).

| Criterion (weight) | TypeScript / Node | Kotlin / JVM | C# / .NET | Rust | Python |
|---|---|---|---|---|---|
| One typed contract kernel <-> UI (3) | **5** (same language, shared schema types) | 2 (codegen, two toolchains) | 2 (same; Blazor helps only partially with rich JS libs) | 2 | 1 |
| Domain-model expressiveness / type safety (3) | 4 (strict TS, discriminated unions, branded types; weaker runtime guarantees) | 5 | 5 | 5 | 2 |
| Graph/grid/canvas UI ecosystem access (3) | **5** | 2 | 2 | 2 | 1 |
| Kernel performance headroom (2) | 3 | 4 | 4 | 5 | 2 |
| MBSE / formal-model ecosystem (SysML v2, EMF, Arcadia files) (2) | 2 | **5** | 3 | 1 | 3 |
| LLM tooling, schema-constrained output, local runtimes (2) | 5 | 4 | 4 | 3 | 5 |
| Windows-local install, no admin, offline (3) | 4 | 3 (bundled JRE needed) | 5 | 5 | 3 (packaging friction) |
| Linux (1) | 5 | 5 | 4 | 5 | 5 |
| Iteration speed for a novel, evolving domain (3) | 5 | 3 | 3 | 2 | 5 |
| Testability incl. property-based (3) | 4 | 4 | 4 | 4 | 4 |
| Multi-user server later (2) | 4 | 5 | 5 | 4 | 4 |
| Available locally now (tie-breaker only, 1) | 5 (Node) | 1 | 1 | 1 | 4 |
| **Weighted mean (1-5)** | **4.25** | 3.54 | 3.57 | 3.29 | 3.04 |

Weights sum to 28 (rows as listed); means computed by script. Scores are judgments; the decision does not hinge on the availability row (removing it: TS 4.22 vs Kotlin 3.63, C# 3.67, Rust 3.37, Python 3.00). The margin over the JVM/.NET options (~0.6-0.7) is real but modest, and is driven mostly by the three "one typed contract to a rich web UI / iteration speed" rows - which is exactly the argument in the next paragraph, so it should be challenged there rather than trusted as arithmetic.

**Honest reading.** TypeScript wins because the product's complexity is *distributed across kernel, API and a rich interactive client*, and the cost of keeping one typed contract across them is the dominant integration risk - not because it is popular. Python is scored on its merits (strong LLM ecosystem) and loses on typed-contract sharing, Windows packaging friction and weaker static guarantees for a domain model this invariant-heavy. Kotlin/JVM and C#/.NET are genuinely strong and would be the safe alternative if the *kernel alone* were the product.

**Known weaknesses and mitigations.**
- *Runtime type safety:* validate at every boundary with schemas (zod -> JSON Schema); `strict` TS, `noUncheckedIndexedAccess`, exhaustive `switch` on discriminated unions; branded IDs; branded `ValidatedChangeSet`.
- *Single-threaded CPU-bound graph work:* bounded queries by design; heavy analyses run in worker threads; benchmark in Slice 0.
- *Scale ceiling:* Tier-2 seam (read port -> SQL/graph DB), plus possible Rust/WASM extraction of a hot traversal core if benchmarks demand.
- *Ecosystem for SysML v2 textual notation:* out-of-process JVM sidecar adapter; JSON form handled natively.

**What would flip this decision** (any of): (a) Slice 0 shows the in-process graph misses Tier-1 targets by more than an order of magnitude; (b) native EMF/Capella model import becomes a first-milestone requirement; (c) an organisational mandate for a managed JVM/.NET platform; (d) the UI is required to be a native desktop application rather than web technology. In cases (b)-(c) the recommended move is Kotlin or C# for the kernel *behind the same JSON-Schema contracts*, which is why contracts are language-neutral artifacts.

## 5. Other layer decisions with alternatives considered

### 5.1 UI technology class: web client (in a local browser now; optionally desktop shell later)
The lenses required (interactive graph, N² matrices, scenario diagrams, provenance/impact navigation) are exactly where JS libraries are strongest; a web client is also the same artifact that a shared server later serves (D8), and a browser is zero-install for reviewers. Native toolkits (WPF/Avalonia/Qt/JavaFX) offer weaker graph/grid ecosystems and no route to multi-user without a second client. Cost accepted: some desktop niceties (native dialogs) wait for the optional shell.

### 5.2 Store
| Option | Assessment |
|---|---|
| **SQLite (WAL)** | Embedded, transactional, single-file project (I6), no admin, Windows/Linux, easy deterministic tests; single writer is fine (commits are short). Recursive CTEs available for a read seam. **Chosen.** |
| Embedded graph DBs | Attractive for traversal, but ecosystem/continuity uncertain and the hard parts (constraints, history, candidates) still live in our code. Keep as read-model option. |
| Server graph DB (Neo4j-class) | Violates F1 (server administration on Windows), licensing considerations for shared deployment. |
| RDF store | Edge-provenance friction, sameAs semantics (see ARCHITECTURE_OPTIONS). Export projection only. |
| PostgreSQL | Best shared-mode store; unnecessary for local single-user; **planned second adapter**. |
| Document/KV stores | No cross-entity transactions / constraints of comparable strength; weaker for history queries. |
SQLite binding: `better-sqlite3` (synchronous API suits a serialised commit path) with the built-in `node:sqlite` as a fallback if native-module friction appears; the spike verifies Windows install without a compiler toolchain.

### 5.3 API and contract
Fastify with schema validation; contracts authored as zod schemas and *emitted as committed JSON Schema/OpenAPI* so non-TS adapters/tools can consume them. tRPC rejected as the primary API because it binds consumers to TS; adapters and external tools need a language-neutral contract (INT-023). Express rejected for weaker schema story; Hono is a viable equivalent (low-stakes).

### 5.4 Client libraries
- *Framework:* React chosen for widget ecosystem breadth (graph/grid/editor wrappers), not for fashion. Svelte/Solid are credible and would be selected if the widget ecosystem gap closes; since the client is an API consumer this is a cheap reversal.
- *Graph:* Cytoscape.js (graph-theory oriented: selection, path highlighting, compound nodes for hierarchy, canvas rendering) + ELK for layered layout (good for architecture/interface diagrams). React Flow is stronger for node-editor style editing - **re-evaluate at Slice 11** for staged graphical editing. Force-directed-only stacks lack layered layouts needed for architecture views.
- *Matrices:* virtualised grid is essential for N² at Tier-2; a headless table library may help but cells must carry canonical IDs and drill-down, so the view model, not the library, is the contract.
- *Scenario:* custom SVG; Mermaid-class renderers are non-interactive and cannot carry canonical identity.
- *Styling/accessibility:* CSS variables + a small design-token set; keyboard operability and contrast as baseline (A17).

### 5.4a LLM runtimes
Local operation via an Ollama-class HTTP runtime (present on the dev machine; supports JSON-schema-constrained output as I understand it - verify) or any OpenAI-compatible local server; cloud via provider HTTP APIs. **No LLM orchestration framework in the core**: the orchestrator is a deterministic state machine; LLM steps are ports. An SDK may be used *inside* an adapter if it saves effort. Model selection (size/quantisation) is a Slice 0/2 spike outcome, not a decision made here.

### 5.5 Packaging and deployment
- **v1:** portable folder (bundled Node runtime + built app + launcher that binds `127.0.0.1` with a per-launch token and opens the default browser). Cheap, robust, and identical to the future server code path.
- **Later (Slice 13):** wrap in a desktop shell if native integration is needed. Criteria: installer size, auto-update, code signing burden on Windows, file-association, tray/notifications. Candidates: Tauri-class (small, needs a bundled Node sidecar) vs Electron-class (bundles Node, larger). Not chosen now because it is reversible and premature.
- **Linux:** same Node build; verified locally via Docker, not remote CI.
- **Server mode (later):** container image + Postgres adapter + reverse proxy + OIDC (Slice 14).

### 5.6 Testing and quality gates (local-first, ACC-010..012)
Layers: (1) kernel unit + property tests (identity stability, atomic rollback, rebuild-from-log equality, inverse-navigation equality, no silent merge, profile switch idempotence); (2) contract tests on JSON Schemas; (3) adapter tests with recorded fixtures; (4) projection-agreement integration tests (ACC-002); (5) scripted-LLM tests proving advisory proposals never become authoritative (ACC-004); (6) simulated two-actor concurrency tests (ACC-005); (7) Playwright flows with screenshots for human cognitive-load review; (8) architecture-boundary lint. One command runs the fast suite locally; a broader command adds Linux-in-Docker. No remote CI is started by this work.

## 6. Risks, spikes and reversibility

| Risk | Impact | Mitigation / spike (Slice 0) |
|---|---|---|
| R1 Local LLM under-performs on structured decomposition | Degrades greenfield experience without cloud | Spike: schema-constrained extraction on 20 representative engineering paragraphs with locally available models; measure validity and precision; keep guided-capture path first-class (A7) |
| R2 In-process graph misses Tier-1/2 targets | Redesign of read path | Synthetic 10^4/10^5/10^6-relation benchmark for load, traversal, impact, commit; decide seam use |
| R3 SQLite native binding friction on Windows | Setup pain | Verify `better-sqlite3` prebuilt install and `node:sqlite` fallback |
| R4 Neutral core vocabulary too thin/thick | Rework of ontology | Slice 7 Arcadia coverage table; ADR discipline; profile-only additions where possible |
| R5 Bespoke rule/query engine underdelivers | Delay | Keep rule kinds few; property tests; reserve CEL-class expressions and SQL/Cypher/SPARQL compilation as escape hatches |
| R6 Cytoscape/ELK limits at thousands of nodes | UI performance | Bounded subgraph + collapse/cluster design; render benchmark at 500 / 5,000 nodes |
| R7 UX does not test well for new engineers | Product-level | Human-validation checkpoints M1/M2 with instrumentation (I4) *before* adding lenses |
| R8 Cloud LLM data-egress incident | Trust/compliance | Default `local-only`; consent + logging + allow-list (I1) |

**Reversibility summary.** Cheap to change: UI framework, HTTP framework, packaging shell, monorepo tool, LLM provider. Moderate: store adapter, graph renderer. **Expensive (get right early):** ChangeSet/provenance/identity model, ontology package format, Query IR, contract schemas. Effort in Slices 1-3 is concentrated on the expensive-to-change decisions.

## 7. Explicitly not chosen (and why)

- **Python / Flask-class stack** - not assumed; evaluated in §4 on merit and not selected.
- **RDF/OWL as canonical form** - edge-provenance friction; `sameAs` semantics contradict identity requirements; used only as possible export projection.
- **Graph DBMS as system of record** - hard parts (constraints, candidates, history) are ours anyway; adds server deployment burden on Windows.
- **EMF/Ecore-first core** - pulls the core toward a methodology metamodel; retained as interop *sidecar* option.
- **LLM orchestration frameworks in the core** - would import orchestration semantics that must remain plumbing (INT-023).
- **Microservices** - no requirement demands it; a modular monolith with ports achieves NFR-010/011 at far lower cost.
- **Event sourcing frameworks / CQRS platforms** - the ledger is a table plus a discipline; adopting a framework would add coupling for no requirement.
