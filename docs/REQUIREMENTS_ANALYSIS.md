# Requirements Analysis

Status: analysis baseline for the independent implementation experiment. Date: 2026-09-19.
Sole input: `CLAUDE_INPUT/` (the compact numbered requirement baseline plus the normative Arcadia canonical-seed clarification in `08_ARCADIA_CANONICAL_SEED.md`). No source code of the original project was consulted.

Conventions used below: **[REQ]** = stated in the input. **[INF]** = my inference from the input, not stated. **[ASM]** = a working assumption I adopt until validated. Requirement IDs (e.g. `SEM-030`) point back to the input files.

---

## 1. Product understanding in one page

The product is a **conversation-first engineering workspace** whose value is a **methodology-neutral semantic layer**, not a chatbot, diagram editor, workflow engine or connector catalog (vision). Engineers describe a challenge in plain language or bring existing artifacts; the system keeps track of what it knows, what is missing and what to ask next, while progressively building a rigorous model behind the conversation.

Five ideas carry the whole product:

1. **One authoritative canonical semantic state** (SEM-001, vision "Authority principle"). Everything else - diagrams, matrices, SysML, methodology views, NL explanations, imported-source views, execution views - is a *projection* or *reconciled representation* of it (VIEW-001, TRACE-004, SEM-004).
2. **A hard authority boundary.** Anything from an LLM, heuristic, import or graphical edit is a *candidate* (REQ-GR-003, REQ-AU-001, REQ-BR-002, UX-053, SCEN-002) until validated by deterministic rules and confirmed by a person or an *approved* deterministic rule. Authoritative writes are atomic, auditable, provenance-carrying transactions (ChangeSets: COL-002, COL-006, NFR-030).
3. **Meaning is data, not code.** The canonical core remains methodology-neutral, but **Arcadia is the primary semantic seed and coverage backbone for the initial canonical model**. Arcadia concepts are generalized into neutral engineering semantics rather than copied one-to-one or exposed as mandatory product vocabulary. Other methodologies/domains/representations remain orthogonal profiles or mappings, and switching profiles never rewrites confirmed truth.
4. **Deterministic first, LLM as assistant.** Validation, typed traversal, completeness, traceability, dependency and impact are deterministic and explainable (SEM-060, NFR-020, NFR-022). The product must stay useful with no LLM (SEM-062, NFR-044).
5. **Low cognitive load is a measurable design objective** (UX-070, NFR-060..062): one dominant conversation, one obvious next action, compact "what I understand", progressive disclosure, secondary inspectable views that never steal the conversational thread (UX-031, UX-032).

### Working glossary (canonical terms used in the four docs)

| Term | Meaning in this project |
|---|---|
| Element | Authoritative semantic entity with stable identity (SEM-020). |
| Relation | First-class typed, directed, provenance-bearing link between elements; navigable both ways (SEM-010). |
| Concept/Relation type | Entry in an ontology package; describes engineering meaning, not UI (SEM-050). |
| Profile | Data package adding vocabulary, mappings, cardinalities, rules, information needs, viewpoints (SEM-041). |
| Candidate | Proposed, non-authoritative change set with provenance. |
| ChangeSet | Atomic, validated, auditable unit of authoritative mutation with a base revision (COL-002). |
| Projection / Lens | Deterministic read-only function over the canonical state at a revision (VIEW-001/002). |
| Provider / Capability | Provider = tool/engine; Capability = contract it satisfies. Never conflated (REQ-IN-004/005, INT-020). |

---

## 2. Architectural drivers (ranked)

Ranking reflects how strongly each driver constrains structure and how expensive it is to retrofit.

| # | Driver | Source requirements | Architectural consequence |
|---|---|---|---|
| D1 | **Authority boundary + transactional ChangeSets + provenance** | REQ-AU-*, REQ-GR-003, SEM-030/031, COL-002..008, NFR-030..032, ACC-004 | A single write path (commit service) that is the *only* thing able to mutate authoritative state; candidates stored structurally apart; revisioned, append-only history; idempotent commits; audit for free. **Retrofitting this later is the most expensive mistake available.** |
| D2 | **Stable identity, multiplicity, similarity ≠ identity** | SEM-020..022, REQ-AU-003/004, QUERY-004, REQ-GR-004 | Opaque, label-independent IDs; duplicate detection as advisory service; merge only as explicit ChangeSet that preserves aliases; cardinality only from profiles. |
| D3 | **Arcadia-seeded canonical ontology; profiles as data; core remains neutral** | SEM-002/003/040..043, SEM-050/051, NFR-012..014, `08_ARCADIA_CANONICAL_SEED.md` | The initial canonical ontology is systematically generalized from Arcadia semantic coverage, while executable logic and user-facing Normal Mode remain methodology-neutral. Declarative profile packages provide vocabulary, mappings, cardinalities, rules, information needs and viewpoints without methodology-specific branches. |
| D4 | **Deterministic reasoning with explainable paths** | SEM-060, NFR-020/022, TRACE-*, IMPACT-*, REQ-EX-001 | Reasoning implemented as pure functions over an indexed typed graph; every result carries a witness (path/rule/provenance). |
| D5 | **One model, many projections** | VIEW-001..012, MATRIX-*, IFACE-*, TRACE-004, ACC-002 | Views are `(graph@revision, ViewSpec) -> ViewModel`; ViewSpecs are data; identity preserved in every cell/node; no view has its own persisted truth (layout is UI preference only). |
| D6 | **Conversation-first, low-load UI with a secondary lens** | REQ-CF-*, UX-* | Deterministic *next-action planner* separate from the LLM; single conversation column + one secondary lens at a time; session context preserved across lens open/close. UI level (Normal/Advanced/Expert) is presentation only. |
| D7 | **LLM optional, provider-neutral, local-capable** | SEM-062, NFR-043/044/051, UX-050..053, INT-023 | An LLM *port* producing typed candidate statements via schema-constrained output; bounded, deterministic context packing (no whole-model prompts); full deterministic degraded mode. |
| D8 | **Local-first, Windows-first, server-ready** | NFR-040..042, COL-001, COL-020, NFR-041 | Embedded transactional store behind a port; same core deployable later behind a network API and shared DB; no assumptions that break multi-user. |
| D9 | **Federation & formal-model interop with authority metadata** | INT-001..015, REQ-BR-006/007 | Import = interpret → candidates → reconcile. Every federated item keeps source identity/version/authority. Mapping engine driven by data; explicit loss classification (exact/partial/lossy/unsupported/application-only). |
| D10 | **Provider-neutral execution with honest labelling** | INT-020..023, UX-060..062 | Capability contracts + provider adapters out-of-process; execution records typed `planned / simulated / real`; review-before-launch. |
| D11 | **Bounded retrieval/scale** | NFR-050..052 | Never render or prompt with the whole model; bounded subgraph queries; paginated/virtualised views. |
| D12 | **Testability as acceptance** | ACC-001..006 | Pure kernel with deterministic fakes; property-based tests for identity/atomicity; a scripted LLM double proves advisory output cannot become authoritative. |

## 3. Non-functional constraints

### Stated [REQ]

- No prescribed language/framework/store/UI/LLM/cloud/topology (NFR-001); choice must be documented with alternatives first (NFR-002); avoid irreversible infrastructure coupling (NFR-003).
- Domain semantics separated from UI, storage, tools, LLMs, transport (NFR-010); dependency inversion (NFR-011); no hardcoded methodology/vendor semantics in generic orchestration (NFR-013).
- Atomic mutations; failed validation leaves no partial state (NFR-030/031); stable identity and revision info (NFR-032); preview/confirm for consequential ops (NFR-033).
- Local single-user acceptable initially; must not block multi-user later (NFR-040/041); Windows important, Linux desirable (NFR-042); local LLM feasible, cloud may coexist (NFR-043); core works without LLM (NFR-044).
- Responsive for realistic models; bounded retrieval (NFR-050..052).
- Usability is a requirement; first-use comprehension and mental-effort indicators are measured (NFR-060..062).
- Local analysis and targeted tests before broad verification; remote CI is not a debugging loop (ACC-010..012).

### Inferred [INF] - not stated but implied by the stated set

| ID | Constraint | Why I infer it |
|---|---|---|
| I1 | **Data egress control for cloud LLMs** (per-project policy, explicit consent, per-provider allow-list, request logging) | Target domains include aerospace/defense, medical, semiconductor - engineering data is commonly export-controlled or IP-sensitive. Cloud LLM "may coexist" (NFR-043) only safely with gating. |
| I2 | **Undo = compensating ChangeSet**, never history deletion | Audit (COL-006) + append-only history; undo is not mentioned but users will expect it. |
| I3 | **ChangeSet lifecycle states** (draft → proposed → approved → committed / rejected / stale) exist from day one | Roles "reviewer/approver" (COL-009) and preview/confirm (REQ-AU-005) imply a lifecycle; single-user = same person approves. |
| I4 | **Local, opt-in UX instrumentation** to support UX-070 measures | "Human validation should measure ... unnecessary context switching, navigation burden" needs interaction event capture; must be private and local. |
| I5 | **Model-as-of-revision queries and named baselines** | QUERY-003 filters by "baseline/version"; ED-001 has release/baseline; audit needs history. |
| I6 | **Project portability**: a project is a self-contained artifact (single file + attachments) with lossless export/import of its change history | Local-first, backup/sync, deterministic golden tests, future offline branches (COL-020). |
| I7 | **Internationalisation-ready text handling** (labels/aliases from profiles, no user-facing strings in kernel) | SEM-051 (aliases from data) naturally supports it; language not specified. |
| I8 | **Long-running/streaming interaction** (LLM tokens, imports, executions) without blocking the UI | UX responsiveness (NFR-050) with LLM latency. |

## 4. Capability map (requirements clustered by what must be built)

| Capability cluster | Requirements | Notes |
|---|---|---|
| **Semantic kernel** (elements, relations, identity, provenance, revisions) | SEM-001, 010..012, 020..022, 030..031; NFR-030..032 | Foundation of everything. |
| **ChangeSet & authority services** (candidate staging, validation, preview, commit, rebase/conflict) | REQ-AU-*, GR-003, BR-002/005/006, COL-002..008, 012, UX-053 | Includes semantic conflict detection (COL-005) - useful even single-user because staged candidates go stale. |
| **Ontology & profile engine** | SEM-002..003, 040..043, 050..051; NFR-012..014 | Loader, schema validation, rule-kind engine, info-needs, aliases, viewpoints, mappings. |
| **Conversation orchestration** (intent, clarification, next action, "what I understand", history/why) | REQ-CF-*, IN-*, EX-*, UX-001..005, 030..041 | Deterministic planner + optional LLM phrasing/interpretation. |
| **LLM services** (interpret, phrase, NL->query, explain) | UX-050..053, SEM-061, NFR-043/044/051, ACC-004 | Advisory only; provider-neutral. |
| **Query engine** (structured IR, NL front-end, filters, multiplicity, as-of) | QUERY-*, SEM-011, REQ-EX-001 | One IR serves NL, expert, matrix and view back-ends. |
| **Reasoning** (completeness, coverage, traceability, impact, dependency) | SEM-060, TRACE-*, IMPACT-*, NFR-020/022 | Deterministic with witnesses. |
| **Projections & lenses** (graph, textual, matrices incl. N², interfaces, scenario, WBS, evidence/decision) | VIEW-*, MATRIX-*, IFACE-*, SCEN-*, ED-002 | Read-only; identity-preserving; drill-down. |
| **Brownfield federation** (import, interpret, reconcile, authority, integration gaps) | REQ-BR-*, INT-001..004 | Candidates first. |
| **Formal interop** (SysML v2-class projection/import, mapping classification) | INT-010..015 | Data-driven mappings; explicit loss. |
| **Engineering delivery** (tasks, WPs, artifacts, milestones, baselines; responsibility vs tool) | REQ-ED-* | Semantics in the core; WBS is a projection. |
| **Execution/provider layer** (capability contracts, adapters, planned/simulated/real, evidence capture) | INT-020..023, UX-060..062, REQ-IN-004/005 | Later slice; contracts early. |
| **Dynamic context** (states/modes/situations/configurations as first-class) | REQ-DY-*, QUERY-003 | Applicability scoping on elements/relations. |
| **Collaboration path** | COL-001..020 | Not built initially; contracts and write path shaped for it. |
| **Validation & quality** | ACC-*, UX-070, NFR-060..062 | Test kit + human-validation protocol + local instrumentation. |

## 5. Ambiguities and contradictions that materially affect architecture

Each item states the tension, the architectural stake, my **working assumption** (chosen so work can proceed; reversible), and how it will be validated or resolved.

| # | Issue | Why it matters | Working assumption [ASM] | Resolution / validation |
|---|---|---|---|---|
| A1 | **"One authoritative canonical state" vs "external systems may retain declared authority" (REQ-BR-006, INT-001, INT-014).** | Determines whether external content is *copied* or *referenced live*; whether sync can ever write. | The canonical store holds a **federated image**: local elements carrying `sourceRef{system,id,version}` and a scope-level `authority` declaration. Authority is metadata *about scopes*, not a second model. Writes into an externally-authoritative scope become *outbound proposals*, never silent overwrites. Inbound changes pass identity/mapping/reconciliation/conflict rules like any candidate (INT-014, COL-012). | Slice 8 tests (ACC-003). Revisit if live-reference semantics are required by a real integration. |
| A2 | **"Approved deterministic rule" may accept probabilistic proposals (REQ-GR-003, UX-053)** - who approves a rule? | Governs whether *any* auto-acceptance exists and how it is audited. | Default is **no auto-accept**. A rule may declare `autoAccept` only in a profile and only when the *project* has explicitly enabled that rule (recorded as a ChangeSet). Purely mechanical derivations (e.g., inverse-relation navigation, projections) are not "acceptance" at all. | Slice 1 policy model; test ACC-004. |
| A3 | **"Bidirectional" cross-abstraction relations (SEM-010)** - one edge or two? | Storage shape, cardinality checks, conflict granularity. | **One stored relation**, both directions navigable via per-type inverse labels. Two stored edges would create drift. | Property tests: inverse traversal equals forward traversal. |
| A3b | **Merge (REQ-BR-005) vs "no silent merge" (AU-003, SEM-022).** | Identity resolution semantics. | Merge is permitted only as an explicit, confirmed ChangeSet that tombstones the loser with a permanent `mergedInto` alias; old IDs continue to resolve and provenance of both is kept. Equivalence (`equivalentTo`) is a separate confirmed relation for "same meaning, distinct identity" (AU-004). | Slice 8. |
| A4 | **How should the initial neutral core vocabulary be seeded?** | Risk of either an under-specified generic ontology or an accidental Arcadia-specific core. | **Resolved by normative clarification:** Arcadia is the primary semantic seed and coverage backbone. Slice 1 must establish a systematic Arcadia-to-generalized-canonical coverage baseline first. Canonical names/semantics remain methodology-neutral; Arcadia-specific vocabulary stays in mappings/profile data. Additional methods may extend the canonical model where Arcadia coverage is insufficient. | ADR-0003 + Slice 1 coverage baseline; Slice 7 validates the Arcadia profile/mappings against that baseline rather than discovering the core for the first time. |
| A5 | **"Ontology" wording suggests OWL** but SEM-050 says it describes engineering meaning, not UI. | Choosing OWL/RDF reasoning imports open-world semantics that clash with closed-world engineering completeness checks. | Ontology = a **conceptual schema in data** (types, relation types, constraints, rules), not necessarily OWL. RDF/SHACL remain an *export projection* option. | Option comparison (ARCHITECTURE_OPTIONS). |
| A6 | **NL query vs "deterministic wherever sufficient" (QUERY-001, SEM-060).** | NL understanding is inherently probabilistic. | NL is a *front-end that produces a structured query IR*; the IR is shown to the user ("I understood this as ...") and executed deterministically. Without an LLM, a catalog of representative intents + a guided query builder is the fallback. | Slice 3. |
| A7 | **"Remain useful without LLM" (SEM-062, NFR-044) vs "large text decomposition" (UX-050/051).** | Decomposition has no true deterministic equivalent. | Accept **graceful degradation**: without an LLM, capture is guided (questions with selectable options, structured quick-add, importers). Free-text decomposition is LLM-only. This is a documented, tested degraded mode. | Slice 1 (no-LLM baseline) then Slice 2. | **Slice 0 (2026-09-20): partly falsified.** Local models on this CPU-only machine miss the advisory-proposer bar (precision 0.51-0.55 vs 0.70; p95 40-136 s vs 30 s); graceful degradation therefore applies to *interactive* free-text decomposition on this hardware class. See ADR-0001 §7. |
| A8 | **Two meanings of "baseline"** - engineering `Release/Baseline` (ED-001) vs system revision baselines (QUERY-003, audit). | Versioning design. | Store-level: monotonically increasing **revision** + named **baseline markers** that pin a revision. Domain-level `Baseline` element may *reference* a store baseline marker, but is a semantic element like any other. | Slice 4/10. |
| A9 | **"Approach to modes"**: Normal / Advanced / Expert are all named but never distinguished (UX-011, UX-012, vision). | UI structure. | Three **disclosure levels** as a per-user presentation setting; they change what is shown, never semantics (UX-011). Default Normal. | Human validation. |
| A10 | **"Continuously inspectable" (VIEW-010) vs "no accumulating permanent panels" (REQ-CF-007, UX-071)** | UI layout. | Persistent: conversation + compact understanding summary. Everything else opens as **one on-demand lens at a time**; closing it restores the pending primary action (UX-032). | Human validation (UX-070). |
| A11 | **Graphical editing "if provided" (SCEN-002)** - required or optional? | Whether the viz layer needs an interaction grammar early. | Optional and late. Design constraint only: any graphical edit produces a *candidate ChangeSet*. | Slice 11. |
| A12 | **"Realistic engineering models" (NFR-050) is unquantified.** | Drives store, graph and rendering choices. | See §7 targets. | Benchmark spike (Slice 0). | **Slice 0 (2026-09-20): confirmed for Tier 1 and Tier 2** (§7 targets met on graph/store; render Tier 2 requires an edge budget). See slice0/EVIDENCE.md. |
| A13 | **Round-trip fidelity for formal models (INT-010..015) is unquantified** and SysML v2 is named only as an example. | Determines whether the mapping engine must be lossless. | Target order: (1) export projection, (2) import to candidates, (3) controlled round trip with lossy/partial classification. Application-specific metadata is *not* forced into SysML constructs (INT-015). | Slice 9. |
| A14 | **Multi-user "eventually" vs "local is fine now."** | Risk that single-user shortcuts (global mutable state, no base revision) block later collaboration (NFR-041). | Build the **base-revision commit protocol from the start**, even with one user. Staged candidates already need stale-detection, so this is not speculative work. | ACC-005-style tests using two simulated actors. |
| A15 | **Human validation (UX-070) is a requirement but has no defined protocol or instrumentation.** | Needs data capture design. | Local, opt-in event log + a lightweight task-based protocol (first-use tasks, self-reported effort). | Milestones M1/M2 (see roadmap). |
| A16 | **"Semantic identity vs semantic equivalence" (REQ-AU-004) is unspecified.** | Merge/dedupe/reconcile rules. | Identity = canonical element ID. Equivalence = explicit relation between distinct identities (confirmed or advisory). | Slice 8. |
| A17 | **Undo, security, authN/Z, i18n, accessibility** are not mentioned (except enterprise auth "longer-term"). | Missing cross-cutting concerns show up late and expensively. | I2, I1, I7 above; WCAG-oriented UI practice (keyboard, contrast) as a default quality bar. | ADRs when first needed. |

## 6. Product requirements vs implementation suggestions that leaked into wording

The input is intentionally technology-neutral but some terms carry implementation flavour. I treat them as follows.

| Wording (source) | Verdict | Treatment |
|---|---|---|
| "graph IDs", "raw graph structures", "graph exchange" (REQ-BR-005, REQ-EX-002, SEM-004) | Leak, but mild | Requirement is *typed, identity-bearing relations*. A "graph" is the logical model; no graph database is implied (NFR-001, 07 explicitly says no particular graph DB). |
| "ontology" (SEM-*) | Ambiguous leak (implies OWL) | Conceptual schema as data; OWL not required (A5). |
| "ChangeSet" (COL-002) | Allowed - "or an equivalent" | Used as the concept; concrete design mine. |
| "CRDT/OT" (COL-011) | Optional suggestion ("may") | Only for transient text/layout; deferred. |
| "embedding similarity" (REQ-AU-003), "retrieval-augmented" (SEM-061) | Suggestions | Advisory features; not required for initial slices. Lexical similarity suffices first. |
| "event distribution", "shared transactional persistence" (07) | Mechanisms, future horizon | Requirement is *consistent shared state and change notification*; mechanism free. |
| "Query services", "external tool agents/adapters" (04, 07) | Architecture hints | Not requiring a service split or agent framework (INT-023 calls agentic plumbing non-canonical). |
| "Normal Mode / Advanced / Expert mode" | UX requirement; the word "mode" hints at toggles | Implemented as disclosure levels (A9). |
| "SysML v2" (INT-010, 07) | Genuine interoperability target, named as *example* ("such as") | First formal target, but through a generic mapping layer. |
| "Arcadia", "Mission Engineering" (vision, 02) | Profile examples / coverage reference | Profile packages, never the core vocabulary (SEM-002/§Arcadia coverage). |
| "N²-style matrices", "WBS/EWBS" | Genuine domain-standard representations | Required as projections. |
| "Provider/tool", "agents" | Vocabulary hint | Capability/provider separation is a real requirement (INT-020); "agents" is not. |

Genuine product constraints that *look* like implementation but are not negotiable: atomic commits (NFR-030), stable IDs (SEM-020), provenance categories (SEM-030), planned/simulated/real distinction (UX-060/061), profile switching without rewriting truth (SEM-042), no silent last-write-wins (COL-003).

## 7. Working quantitative targets [ASM]

Not in the input; needed to make performance decisions falsifiable. Validate in the Slice 0 benchmark; revise if wrong.

| Dimension | Tier 1 (must be comfortable) | Tier 2 (must degrade gracefully / have a seam) |
|---|---|---|
| Elements / relations per project | 10^4 / 5x10^4 (typical system-level model) | 10^5 / 10^6 (large system-of-systems, imported artifacts) |
| Bounded query (<= 3 hops, filtered) p95 | < 100 ms | < 500 ms |
| Impact analysis (depth-bounded) | < 300 ms | < 2 s |
| Small ChangeSet commit (<= 50 ops) | < 100 ms | < 300 ms |
| Matrix (rows x cols) | 500 x 500 rendered virtualised | 5,000 x 5,000 aggregated / windowed |
| Graph lens | <= 500 visible nodes interactive | <= 5,000 with clustering/collapse; never "whole model" |
| LLM prompt context | bounded subgraph, deterministically packed (NFR-051) | same |
| Cold project open | < 2 s at Tier 1 | < 10 s at Tier 2 |

## 8. Explicit non-goals for initial implementation (07 "Deliberate non-requirements")

Not implementing: all external connectors, all methodologies, commercial-grade optimisation platforms, production multi-user scale, a particular graph DB/LLM, every future viewpoint. The architecture must nevertheless keep the *contracts* for them.

## 9. Things I need to keep honest about

- The four architecture options in `ARCHITECTURE_OPTIONS.md` were designed by me; scoring is judgment, not measurement, and is therefore stress-tested there.
- The largest unvalidated risks are **(R1)** local-LLM quality for candidate decomposition, **(R2)** whether an in-process graph meets Tier-2 scale, **(R3)** the neutral core vocabulary being good enough for Arcadia-class coverage, **(R4)** whether the low-cognitive-load UX actually tests well with new engineers. Each has a spike or milestone in the roadmap.
