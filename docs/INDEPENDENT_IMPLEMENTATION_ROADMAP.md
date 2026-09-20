# Independent Implementation Roadmap

Depends on: `REQUIREMENTS_ANALYSIS.md`, `ARCHITECTURE_OPTIONS.md` (Option A), `TECHNOLOGY_STACK_DECISION.md` (TypeScript/Node, SQLite, React). Date: 2026-09-19.
Nothing in this roadmap is implemented yet. Sizes are relative (S/M/L), not calendar estimates.

## 1. Sequencing principles

1. **Vertical slices.** Each slice ends with something a person can *use through the UI* and that is covered by tests: kernel -> store -> API -> UI. No horizontal "build all of the kernel first" phase.
2. **Expensive-to-change decisions first.** Slices 1-3 harden identity, ChangeSet/provenance, ontology package format, Query IR and contracts (the items rated "expensive" in the stack decision §6).
3. **The no-LLM path is built first**, then the LLM is added as an advisory front-end. This makes NFR-044 true by construction and gives a testable baseline for ACC-004.
4. **Falsify before committing.** Slice 0 contains timeboxed spikes for the risks R1, R2, R3, R6. If a spike fails, we update the stack decision (ADR) before Slice 1 proceeds.
5. **Human validation gates the UI surface area** (UX-071): before adding more lenses, check that the conversation surface works for a new engineer (M1, M2).
6. **New capability must not add permanent Normal Mode panels.** Each lens opens on demand, one at a time; slice acceptance includes "closing it restores the pending primary action" (UX-032).
7. **Contracts are language-neutral artifacts** (JSON Schema committed); every slice that changes a contract updates them.

## 2. Working practices (experiment rules, ACC-010..012, ACC-020)

- Local-only verification: fast suite on every change (`kernel` + contract tests), broader suite per slice increment, Linux check via local Docker before a slice is closed. **No remote CI.**
- Commit at coherent increments (roughly one to a few per slice); no micro-commits for feedback.
- One ADR (short markdown in `docs/adr/`) per decision that is expensive to reverse, or per changed assumption (A1-A17).
- No use of, or search for, the original project's code.
- Keep `docs/` authoritative for decisions; update `REQUIREMENTS_ANALYSIS.md` assumptions table when an assumption is confirmed or replaced.
- Definition of done for a slice: acceptance scenarios pass; requirement IDs listed in the slice are traceable to tests; disclosure-level behavior checked; contracts regenerated; docs/ADR updated; slice demo script recorded.

## 3. Slice overview

| Slice | Name | Size | Primary drivers | Validation milestone |
|---|---|---|---|---|
| 0 | Foundations & falsification spikes | S-M | R1-R3, R6, D11 | Spike report + ADRs |
| 1 | Walking skeleton: no-LLM guided capture with authority boundary | L | D1, D2, D3, D6, D12 | |
| 2 | LLM-assisted candidate decomposition (advisory) | M | D7, D1 | **M1** human check |
| 3 | Query & explain | M | D4, D5, QUERY-* | |
| 4 | Cross-abstraction traceability, completeness, matrices | L | D4, D5 | |
| 5 | Graph lens, impact analysis, change preview, stale/rebase | L | IMPACT-*, COL-005 | **M2** human check |
| 6 | Interfaces, exchanges, N², dynamic context filters | M | IFACE-*, DY | |
| 7 | Profiles: coverage profile(s), profile switching, gap types | M | D3, SEM-04x | |
| 8 | Brownfield import & reconciliation with authority | L | D9, REQ-BR-* | **M3** human check |
| 9 | Formal-model projection & controlled round trip | L | INT-01x | |
| 10 | Engineering Delivery & provider-neutral execution | L | REQ-ED-*, INT-02x, UX-06x | |
| 11 | Scenario visualization & staged graphical editing | M-L | SCEN-* | |
| 12 | Cross-abstraction synthesis, alternatives, trade-space | L | 07 horizon | |
| 13 | Packaging, hardening, performance, Windows/Linux release | M | NFR-04x/05x | **M4** human check |
| 14 | Multi-user/server mode (future) | L | COL-* | |

Slices 9-12 are order-flexible after Slice 8; Slice 7 may swap with Slice 6.

## 4. Slice detail

### Slice 0 - Foundations & falsification spikes
**Status (2026-09-20): executed; report in `slice0/EVIDENCE.md`, decisions in `adr/0001`, `adr/0002`. Slice 1 is NOT started and awaits explicit authorisation and acceptance of ADR-0001.**
**Goal:** a buildable, test-running repo and evidence that the stack's riskiest assumptions hold.
**Scope:** npm workspace + TS project references; package skeletons (`kernel`, `app`, `api`, `web`, `adapters/*`, `contracts`, `profiles`); boundary lint rules (kernel purity, no methodology/vendor strings under `kernel/`); zod->JSON Schema generation pipeline; one-command local test; Linux-in-Docker test script; ADR template.
**Spikes (timeboxed):**
- S1 graph benchmark: synthetic 10^4/10^5/10^6-relation graphs; load, 3-hop query, impact BFS, commit (targets in Requirements §7).
- S2 SQLite bindings on Windows without compiler toolchain (`better-sqlite3` vs `node:sqlite`); WAL commit latency; rebuild-from-log time.
- S3 LLM feasibility: schema-constrained extraction on ~20 representative engineering paragraphs using locally available models; record validity rate and precision; identify the smallest usable model class (R1).
- S4 render benchmark: Cytoscape+ELK at 500 / 5,000 nodes; virtualised grid at 500x500 and 5,000x5,000.
**Exit:** benchmark table committed; ADRs for any changed stack decision; Windows and Linux both run the empty test suite.
**Requirements touched:** NFR-011, 042, 050..052, ACC-010..012.

### Slice 1 - Walking skeleton: guided capture with the authority boundary (no LLM)
**User story:** *I start a new project by stating my engineering challenge; the system tells me what it understands, asks the single most useful next question, and I can confirm/correct answers; everything persists and can be explained.*
**Scope (thin but end-to-end):**
- Kernel: element/relation model, UUID-style IDs, provenance origins, revisions, `ChangeSet` lifecycle, validator, `CommitService`, candidate store, idempotent retry, rebuild-from-log.
- Ontology runtime + `core.neutral` v0 (small: challenge/purpose, objective, stakeholder/entity, requirement, constraint, assumption, function, system element - grown only as needed) with 3 rule kinds (`cardinality`, `required-relation`, `endpoint-constraint`), information needs + question templates + aliases from data.
- App: `NextActionPlanner` (deterministic, one primary action + <= 3 alternates + `why`), conversation history with "what changed"; compact **Understanding summary** with confirm / reject / refine on candidates (no IDs shown).
- Store: SQLite adapter (log + materialised + candidates + conversation).
- API + UI: Normal Mode conversation column, understanding summary, pending-candidate confirmation, disclosure-level switch (Normal/Advanced/Expert; Expert shows IDs/provenance as read-only).
- Free text handling without LLM: *guided capture* (the system asks; the user answers by typing a short statement or selecting suggested options); a simple structured quick-add.
**Acceptance scenarios:** (1) start project, answer 5 questions, close and reopen -> identical state; (2) failed validation leaves state untouched; (3) two elements with identical names remain distinct; (4) correcting a statement produces a new ChangeSet, history preserved; (5) "why are you asking this?" returns a rule/need-based explanation.
**Tests:** unit + property (identity stability, atomic rollback, rebuild-from-log equality, idempotent retry), Playwright happy path, boundary lint.
**Requirements:** REQ-CF-001..007, GR-001, 002, 004, AU-001..005 (base), EX-001..003, SEM-001, 020..022, 030, 040, 050, 051, UX-001..005, 010, 011, 030, 040, 041, NFR-010..013, 030..032, 044, ACC-001.
**Risks:** over-designing the core vocabulary (A4) - mitigate with ADR per type; question quality without an LLM feels robotic - accept; measure in M1.

### Slice 2 - LLM-assisted candidate decomposition (advisory)
**User story:** *I paste a paragraph or a document; the system proposes typed candidate statements, flags ambiguities, and nothing becomes authoritative until I confirm.*
**Scope:** `LanguageModelProvider` port; adapters: local (Ollama-class), one cloud provider, scripted fake; data-egress policy and consent (I1); bounded context packer; `CandidateNormalizer`; ambiguity surfacing; intent inference with concise clarification (REQ-IN-001..003); LLM phrasing of planned questions (planner remains deterministic); provenance `llm-advisory` with model/prompt hashes; large-text ingestion (chunking, streaming progress via SSE).
**Acceptance:** with LLM off, all Slice 1 flows still pass; with the scripted LLM, every proposal appears as a candidate and authoritative state is unchanged until confirmed; ambiguous statements produce a single concise clarification.
**Tests:** ACC-004 suite; contract tests on candidate schemas; recorded-fixture adapter tests; egress-policy tests.
**Requirements:** UX-050..053, REQ-IN-001..004, AU-001, GR-003, SEM-061, 062, NFR-021, 043, 044, 051, ACC-004.
**M1 - human validation checkpoint** (after Slice 2): 3-5 new engineers perform start/next-action/what-does-it-believe/what-changed tasks; collect the UX-070 measures (see §6). Findings feed backlog before Slice 3.

### Slice 3 - Query & explain
**User story:** *I ask "what realizes this requirement?" or "why does this exist?" and get an answer I can trace.*
**Scope:** Query IR v1 + executor over the in-memory graph (filters, typed traversal, absence predicates, as-of, paging); provenance navigation ("where did this come from"); NL front-end (LLM -> IR with "I understood ..." echo; intent-catalog fallback for the representative questions); selected-element contextual query; textual result view with move-to-lens and return; multiplicity preserved.
**Tests:** IR semantics golden tests; multiplicity/no-collapse property tests; NL->IR fixtures with scripted LLM; fallback catalog coverage of the representative questions in 04.
**Requirements:** QUERY-001..005, VIEW-002, 003, REQ-EX-001, SEM-011, 031, UX-031, 032, NFR-022, 052.

### Slice 4 - Cross-abstraction traceability, completeness, matrices
**User story:** *I can see which functions are unallocated, which requirements are unverified, and open a traceability/coverage matrix, then drill into any cell.*
**Scope:** relation types for vertical transitions (operational -> requirements -> functions -> logical -> realization) and horizontal (allocation, dependency, responsibility, evidence, verification); `required-relation` completeness rules and findings with witnesses; upstream/downstream traversal; `MatrixViewModel` and grid lens (traceability, coverage/allocation, responsibility); cell -> drill-down to query/provenance; virtualisation; canonical vs methodology gap classification stub.
**Tests:** projection agreement (matrix == query results == trace view, ACC-002); drill-down preserves IDs; performance at 500x500.
**Requirements:** MATRIX-001..003, TRACE-001..004, SEM-010, 012, 060, REQ-BR-007 (canonical gaps), NFR-020, ACC-002.

### Slice 5 - Graph lens, impact analysis, change preview, stale candidates
**User story:** *Before I confirm a change I can see what it would affect and why; if the model moved on while I was deciding, the system tells me and helps me rebase.*
**Scope:** `impact-propagation` rules; impact engine with witness paths, `direct` vs `potential`; ChangeSet preview (validation report + impact); graph lens (Cytoscape + ELK, bounded subgraph, hierarchy collapse, path highlighting, viewpoint filters); semantic rebase/conflict detection (same-property, delete-vs-edit, cardinality), stale banners; idempotent retry under conflict; simulated two-actor tests.
**Tests:** impact golden paths; read-only guarantee (impact never mutates); ACC-005 cases (single-user analogues + two simulated actors); graph lens render benchmark within targets.
**Requirements:** IMPACT-001..004, REQ-AU-005, VIEW-010..012, COL-002..008 (single-user semantics), COL-010 (stale-view basis), NFR-033, ACC-005 (partial).
**M2 - human validation checkpoint:** re-test the four core comprehension tasks with lenses present; measure context switching/navigation burden; adjust before adding more surfaces.

### Slice 6 - Interfaces, exchanges, N², dynamic context filters
**Scope:** exchange/interface/port semantics (direction, endpoints, type, exchanged information/material/energy/service); interface network view; N² projection; hierarchy/abstraction filtering; applicability (state/mode/situation/configuration) as first-class filter with just-in-time introduction (REQ-DY-002).
**Tests:** N² agrees with network and query results; direction preserved; filter never mutates state (VIEW-002).
**Requirements:** IFACE-001..003, REQ-DY-001, 002, QUERY-003 (state/mode filter), MATRIX-001 (N²).

### Slice 7 - Profiles and gap types
**Scope:** profile package format hardened; **two profiles** (a generic MBSE-style profile and an Arcadia-coverage profile) delivered purely as data; profile (de)activation with confirmation; vocabulary aliases by disclosure level; questioning strategies; methodology-gap vs canonical-gap reporting; **coverage table against Arcadia-class layers to test the neutral core (R4)**; property test: activating/deactivating profiles never changes confirmed elements/relations (SEM-042).
**Requirements:** SEM-002, 003, 040..043, 050, 051, REQ-BR-007, NFR-012..014, UX-012.

### Slice 8 - Brownfield import & reconciliation
**Scope:** import pipeline (source items -> interpretation -> candidates); first importers: requirements interchange (ReqIF-class), spreadsheet/CSV, plain/markdown documents (reusing Slice 2 decomposition), structured JSON; `sourceRef` and scope-level authority metadata; reconcile UI (confirm/reject/refine/merge/keep separate) with alias-preserving merge; advisory duplicate suggestions (lexical first); integration-gap backlog; loss/unsupported reporting on import; outbound proposals for externally-authoritative scopes.
**Tests:** ACC-003 (authority preserved, no silent overwrite, unsupported mappings reported); no auto-merge on similarity (AU-003).
**Requirements:** REQ-BR-001..007, INT-001..004, REQ-AU-003, 004, SEM-021, 022, 030, COL-012 (design).
**M3 - human validation checkpoint:** brownfield onboarding tasks with a sample legacy artifact set.

### Slice 9 - Formal-model projection & controlled round trip
**Scope:** representation-mapping data + generic projector/reconciler; SysML v2 JSON export projection, then import-to-candidates; fidelity classes (`exact/partial/lossy/unsupported/application-only`); representation-aware inspection lens; conflict handling under declared external authority; optional JVM sidecar decision for textual notation (ADR after a small feasibility spike).
**Tests:** round-trip suites with explicit loss expectations; app-only metadata not forced into constructs (INT-015); no methodology-specific exporters (INT-011).
**Requirements:** INT-010..015, SEM-004, REQ-BR-006.

### Slice 10 - Engineering Delivery & provider-neutral execution
**Scope:** task, work package, responsibility, artifact, milestone, baseline semantics; WBS as projection; capability contracts; provider registry; `planned/simulated/real` execution mode types; review-before-launch; **mock provider** and one real out-of-process adapter (choice by ADR); results -> evidence candidates with provenance (model version, assumptions, constraints, provider, configuration).
**Tests:** UI/text never claims real execution for planned/mock (UX-061); responsibility vs tool allocation are distinct types (REQ-ED-003); WBS agrees with underlying semantics (REQ-ED-002).
**Requirements:** REQ-ED-001..003, REQ-IN-004, 005, INT-020..023, UX-060..062.

### Slice 11 - Scenario visualization & staged graphical editing
**Scope:** scenario lens (custom SVG); interaction grammar as data (methodology-neutral renderer, SCEN-003); graphical edits stage candidates, never mutate (SCEN-002); re-evaluate React Flow vs custom for editing (ADR).
**Requirements:** SCEN-001..003, VIEW-011 (scenarios).

### Slice 12 - Cross-abstraction synthesis, alternatives, trade-space
**Scope:** propose candidate transitions across abstractions (LLM + deterministic derivation rules with the A2 approval policy); alternative candidate architectures; compare/select/confirm as decision elements with evidence; upstream feedback when downstream evidence invalidates assumptions (traversal on `assumption` links); optional trade-space intent inference and provider-neutral optimisation hookup (formulation from confirmed semantics).
**Requirements:** REQ-GR-003, SEM-010, 012, 07 "cross-abstraction synthesis" and "trade-space" groups.

### Slice 13 - Packaging, hardening, performance, release
**Scope:** portable Windows distribution; launcher; per-launch token/loopback binding; project export/import (change-log format); desktop-shell decision (ADR with criteria); performance pass vs Requirements §7 on Tier 1 and Tier 2; accessibility pass; Linux build verified; backup/restore; crash-safe recovery tests.
**M4:** final human validation and effort measurement.
**Requirements:** NFR-040..042, 050..052, 060..062, ACC-006.

### Slice 14 - Multi-user/server mode (future; contracts reserved from Slice 1)
**Scope:** server deployment, Postgres store adapter, authentication/roles, review/approval policy on ChangeSets, presence and stale-view notifications, transient-text CRDT, external-sync actors under the same commit protocol, full ACC-005 suite.
**Requirements:** COL-001..020, NFR-041.

## 5. Requirement-group coverage map

| Requirement group | Slices where it becomes real |
|---|---|
| REQ-CF, UX-0xx conversation | 1, 2, then guarded by M1-M4 |
| REQ-GR, IN | 1, 2, 12 |
| REQ-BR, INT-001..004 | 8 |
| REQ-AU, SEM-020..031, NFR-030..033 | 1 (core), 5 (preview/rebase), 8 (merge) |
| REQ-ED | 10 |
| REQ-DY | 6 |
| SEM-04x profiles, NFR-012..014 | 1 (mechanism), 7 (proof with two profiles) |
| QUERY, REQ-EX | 3 |
| MATRIX, TRACE | 4 |
| IMPACT, VIEW-01x | 5 |
| IFACE | 6 |
| SCEN | 11 |
| INT-010..015 | 9 |
| INT-020..023, UX-06x | 10 |
| COL-* | 1/5 (semantics), 14 (multi-user) |
| NFR-04x/05x deployment/perf | 0 (spikes), 13 |
| ACC-001..006 | every slice (kit built in 1); ACC-005 5 & 14; ACC-006 M1-M4 |

## 6. Human validation protocol (UX-070, ACC-006, I4)

Local, opt-in interaction event log (view opened/closed, conversation turns, corrections, time to first action; no content leaves the machine). Each checkpoint: short task script with 3-5 new engineers - (1) where would you start, (2) what is the next action, (3) what does the system believe about your project, (4) what changed after your last answer, (5) find why an element exists. Record completion, errors, time, self-reported effort (a short standard scale), and observed context switches/navigation steps. Results recorded in `docs/validation/` and used to gate the next slice group.

## 7. Cross-slice risk register

| Risk | First checked | Response |
|---|---|---|
| Core vocabulary drift/bloat (A4/R4) | Slice 1, tested in 7 | ADR per new type; profile-first additions |
| Local LLM too weak (R1) | Spike S3, Slice 2 | Guided capture stays first-class; cloud optional behind consent |
| Scale seam needed (R2) | Spike S1, Slice 13 | Implement read port over SQL/graph DB only if benchmark demands |
| UI clutter accumulation (UX-071) | M1, M2 | One-lens rule; disclosure levels; gate new lenses on validation |
| Bespoke engines underdeliver (R5) | Slices 1, 4, 5 | Small rule-kind set; property tests; escape-hatch expressions later |
| Interop scope creep (A13) | Slice 9 | Fidelity classes and explicit non-goals; sidecar behind adapter |

## 8. Immediate next steps (first implementation session, when authorised)

1. Confirm/adjust the stack ADR after reviewing these four documents.
2. Execute Slice 0: scaffold, boundary lint, contract pipeline, spikes S1-S4, write ADR-0001 (stack) and ADR-0002 (ChangeSet/identity model).
3. Begin Slice 1 with the kernel-first test suite (identity, atomicity, rebuild-from-log) before any UI.
