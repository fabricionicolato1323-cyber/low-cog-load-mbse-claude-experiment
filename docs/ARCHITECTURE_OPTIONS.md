# Architecture Options

Companion to `REQUIREMENTS_ANALYSIS.md` (drivers D1-D12, assumptions A1-A17, targets in §7). Date: 2026-09-19.

## 1. What is actually being decided

Language and framework choices come *after* a more fundamental question, which the requirements force:

> **Where do authority rules (candidate boundary, ChangeSet validation, provenance, profile rules, reasoning) live - in application code we own, or inside a storage/model platform?** And what is the canonical representation of the state?

The four options differ mainly on that axis. Programming language is treated separately in `TECHNOLOGY_STACK_DECISION.md`.

### Hard filters (an option that fails one is not credible)

| Filter | Source |
|---|---|
| F1 Runs locally on Windows with no server administration; offline | NFR-040, NFR-042 |
| F2 Every authoritative relation can carry identity + provenance; atomic commit with validation | SEM-020/030, NFR-030 |
| F3 Profiles/mappings expressible as data without per-methodology code branches | NFR-012/013 |
| F4 Fully functional deterministic core with no LLM | NFR-044 |
| F5 Path to shared multi-user state without rewriting the semantic core | NFR-041, COL-* |

## 2. Options

### Option A - Governed Semantic Kernel (native typed property graph + ChangeSet ledger)

**Shape.** A modular monolith with hexagonal boundaries. A *pure* domain kernel (no I/O) owns: ontology runtime, typed graph model, ChangeSet lifecycle/validation, rule engine, query IR + executor, reasoning (completeness, traceability, impact), projection functions. Persistence is a port implemented by an embedded transactional relational store holding (a) an append-only ChangeSet log = source of truth and audit trail, (b) materialised current + as-of-revision element/relation tables, (c) a *separate* candidate store. Current state is served from an indexed in-memory graph loaded on open. LLM, importers, formal-model mappers, tool providers are adapters. A web client talks to the core over a typed local HTTP API; the same API becomes the server API later.

```
 UI (conversation + one lens) --typed API--> Application services (orchestrator, planner)
                                                 |
                       +-------------------------+--------------------------+
                       v                         v                          v
              Semantic Kernel (pure)     Ports: LLM / Store / Importers / Providers
      ontology|graph|changeset|rules|query|impact|projections        |
                                                                     v
                                                     Adapters (SQLite, Ollama, cloud LLM, SysML, ...)
```

**How it meets the drivers.**
- D1: the commit service is the only holder of a write capability; a validated ChangeSet is an unforgeable value; candidates live in different tables. Boundary is *structural*, testable (ACC-004).
- D2/D3: IDs and ontology are ours; profiles are data validated against a schema; rule *kinds* are engine features.
- D4/D5: reasoning and projections are pure functions returning witnesses, so every result is explainable and testable.
- D8: embedded store, one project file; swapping the store adapter for a shared RDBMS under the same commit protocol is the path to multi-user.
- D9/D10: importers, mappers, providers are out-of-process-capable adapters over the same candidate/ChangeSet contract.

**Strengths.** Authority rules are explicit code we can test exhaustively; no impedance between "what the store enforces" and "what the domain means"; lowest coupling to any third-party platform; extraction paths exist for every component (store, reasoner, executor).

**Weaknesses / risks.**
- We must *build* the graph model, rule engine and query IR (no off-the-shelf reasoner). Risk of reinventing poorly; mitigated by keeping v1 rule kinds few and generic.
- In-memory graph bounds scale (Tier 2 ~10^5-10^6 relations is the stress zone). Seam: read-port can be re-implemented over SQL/graph DB without changing callers.
- No free ecosystem for formal-model interop; must build mapping engine (but Options B-D also need substantial glue).
- Custom query IR is not something LLMs have seen; mitigated with schema-constrained output and a small IR.

### Option B - Semantic-Web Native (RDF / OWL / SHACL / SPARQL)

**Shape.** Canonical state as RDF (with RDF-star or named-graph reification for edge provenance) in an embeddable triple store; ontology as RDFS/OWL; validation as SHACL shapes; queries as SPARQL; candidates in separate named graphs; impact via SPARQL property paths; profiles as additional ontology/shape modules. Application layer mediates.

**Strengths.** Ontology/profile-as-data is the native paradigm (SHACL/OWL modules are literally that). Standards-based exchange (Turtle, JSON-LD) and a mature validation language. Strong for federation and vocabulary alignment. Some JVM (Jena) and Rust/embeddable (Oxigraph) engines exist; maturity varies - verify at adoption.

**Weaknesses / risks.**
- Edge-with-identity/provenance is second-class in triples (reification or RDF-star; tooling support is uneven) - stresses SEM-010/030 (every relation carries provenance).
- Open-world OWL semantics conflict with closed-world engineering completeness ("which functions are unallocated?"); SHACL/SPARQL solve it but reasoning is no longer "OWL reasoning".
- Multiplicity-preserving, identity-stable queries are easy to violate when reasoners infer `sameAs`; `owl:sameAs` semantics are the *opposite* of REQ-AU-003/SEM-022.
- Atomic validate-then-commit with candidate isolation must still be built in the application; the store does not enforce authority boundaries.
- Path explanations (witness paths) for impact are awkward in SPARQL.
- Highest skills barrier for contributors; friction for the rest of the app (conversation state, UI DTOs) which lives outside RDF anyway.

### Option C - Property-Graph-Database-Centric

**Shape.** A graph DBMS (Cypher/GQL-family) as system of record; ontology in application config; Cypher for traversal, coverage checks and impact; app services are thin; candidates flagged/labelled or held in a separate DB/graph.

**Strengths.** Natural fit for typed relations *with properties*; best traversal performance at scale; LLMs handle Cypher reasonably well (helps NL->query); good graph tooling.

**Weaknesses / risks.**
- Deployment: most credible engines are server processes (JVM or Linux-centric); local Windows single-user without administration is the weakest fit (F1). Embedded options exist but continuity/maturity of individual projects varies - verify at adoption. Licensing (community vs enterprise clustering) needs review for a future shared deployment.
- Schema/constraints are weak: cardinality, endpoint typing, profile rules, provenance obligations and candidate isolation all end up in app code anyway - so the DB adds a second system without owning the hard parts (D1, D3).
- Temporal/as-of-revision history, append-only audit and multi-object atomic commits with validation are not native; must be layered on.
- Two systems to test and deploy; hard to run deterministic tests without a DB process.

### Option D - MDE Workbench (EMF/Ecore-style model repository on the JVM)

**Shape.** Canonical model as a typed model repository: metamodel (Ecore-style), OCL/Java validation, model-transformation-based projections, JVM ecosystem for SysML v2 (reference libraries) and Arcadia tooling; UI via web-diagram frameworks or IDE-style workbench.

**Strengths.** Strongest **native interoperability** with SysML v2 / EMF-based MBSE tools; mature diagram and validation tooling; model comparison/merge tooling for collaboration; well-understood in the target community.

**Weaknesses / risks.**
- Metamodel-first design pulls the *core* toward one methodological structure and static typing of concepts; runtime, data-defined profiles (F3, SEM-041/NFR-012) fight the paradigm. This is the option most likely to violate "no methodology defines the universal vocabulary."
- Cross-references are not first-class edge entities with their own identity/provenance unless modeled as reified objects (complexity).
- Conversation-first UX, LLM candidate flow and deterministic planner are outside the framework's grain; most of the product is application code anyway.
- Heavy runtime and distribution (JVM, bundled runtimes) and slower iteration; no JVM currently on the development machine (weak, tie-breaker-only factor).
- Interop advantage is real but *localised*: it can be obtained as an out-of-process adapter under Option A.

## 3. Comparison

Scores 1 (poor) to 5 (strong) for **how well the option, as characterised in §2, serves the criterion**. Weights 1-3 reflect my judgment of importance (authority boundary, reasoning, profiles, Windows-local, testability and maintainability weigh most). Criteria list the prompt's required trade-offs plus two I added (rows 21-22).

| # | Criterion | w | A Kernel | B RDF | C Graph DB | D MDE |
|---|---|---|---|---|---|---|
| 1 | Conversation-first UI support | 2 | 5 | 3 | 3 | 2 |
| 2 | Graph/semantic representation (identity, edge provenance, multiplicity) | 3 | 4 | 3 | 4 | 3 |
| 3 | Ontology & profile handling as data | 3 | 4 | 5 | 2 | 3 |
| 4 | Deterministic reasoning (validation, traversal, completeness) | 3 | 4 | 4 | 3 | 4 |
| 5 | NL and structured queries | 2 | 4 | 3 | 4 | 2 |
| 6 | Graphical model visualization | 2 | 4 | 4 | 4 | 4 |
| 7 | Matrices & traceability | 2 | 4 | 3 | 4 | 3 |
| 8 | Impact analysis (explainable paths) | 2 | 5 | 3 | 4 | 3 |
| 9 | Local / offline operation | 3 | 5 | 4 | 2 | 4 |
| 10 | Local LLM integration | 2 | 5 | 3 | 4 | 3 |
| 11 | Future cloud LLM support | 1 | 4 | 4 | 4 | 4 |
| 12 | SysML / formal-model interoperability | 2 | 3 | 3 | 2 | 5 |
| 13 | External engineering-tool integration | 2 | 4 | 3 | 3 | 3 |
| 14 | Packaging / deployment | 2 | 4 | 3 | 2 | 3 |
| 15 | Windows support | 3 | 5 | 4 | 3 | 4 |
| 16 | Possible Linux support | 1 | 5 | 5 | 5 | 5 |
| 17 | Maintainability | 3 | 4 | 3 | 3 | 3 |
| 18 | Testability | 3 | 5 | 3 | 3 | 3 |
| 19 | Performance at scale | 2 | 3 | 3 | 5 | 3 |
| 20 | Future multi-user collaboration | 2 | 4 | 3 | 3 | 3 |
| 21 | Enforceability of authority boundary / ChangeSets | 3 | 5 | 3 | 3 | 3 |
| 22 | Delivery risk & velocity in this experiment | 2 | 4 | 3 | 3 | 2 |
| | **Weighted total (max 250)** | | **215** | **170** | **160** | **162** |
| | **Weighted mean** | | **4.30** | **3.40** | **3.20** | **3.24** |

Rationale for the non-obvious cells:
- Rows 6, 11 are close to orthogonal (a web client can serve any store), hence near-equal.
- A scores 3 on row 12 and 19 deliberately: those are where B/C/D genuinely win (D on interop, C on raw traversal scale).
- B scores 5 on row 3: SHACL/OWL modules are the best native fit for ontology/profile-as-data.
- C scores 2 on rows 3 and 9: constraints/profiles are weak in the store; local Windows deployment is the awkward case.

### Sensitivity and honesty checks

Recomputed by script (weights on rows 12 = interoperability and 19 = scale multiplied):

| Scenario | A | B | C | D |
|---|---|---|---|---|
| Baseline | 4.30 | 3.40 | 3.20 | 3.24 |
| Interop weight x2 | 4.25 | 3.38 | 3.15 | 3.31 |
| Scale weight x2 | 4.25 | 3.38 | 3.27 | 3.23 |
| Both x2 | 4.20 | 3.37 | 3.22 | 3.30 |
| Both x3 | 4.12 | 3.34 | 3.24 | 3.34 |

**The ranking is insensitive to those two weights.** That is not the same as trustworthy, because:

1. I designed the options; A is the one I could specify to the requirements' grain, while B/C/D are described as "store-centric" variants. A is favoured by construction where it *owns* the semantics (rows 1, 18, 21).
2. To lose to Option B, A would have to be over-scored by about 0.9 points on *every* criterion on average (margin 45 of 250 / 50 total weight). That is a large error, but not an impossible one if the bespoke build turns out harder than expected - which is why Slice 0 contains falsifying spikes for the bespoke pieces.
3. **B, C, D collapse into A once their store is placed behind a port.** In "hybrid" form each is a *technology adapter under A's authority core*: RDF/SHACL as an export/validation projection; a graph DB or Postgres as the read-scale seam; the JVM MBSE ecosystem as an out-of-process interop sidecar. That is the more useful reading of the comparison: the differences point at *adapters to keep possible*, not at a different core.

### Hybrid possibilities worth preserving (not commitments)

| Hybrid | Trigger to adopt |
|---|---|
| A + RDF/SHACL projection (export and external validation) | A customer needs semantic-web exchange, or SHACL shapes from a profile author |
| A + graph DB as read-model behind the read port | Tier-2 benchmarks miss latency targets |
| A + JVM sidecar (SysML v2 reference libs, EMF/Capella import) | Interop slices need formats the TypeScript/native mapping cannot parse cheaply |
| A + shared RDBMS adapter | First multi-user deployment |

## 4. Recommendation

**Adopt Option A - Governed Semantic Kernel**, keeping B/C/D-style capabilities as pre-shaped adapter seams.

Reasons, in order of weight:
1. The requirements' hardest, least-retrofittable constraints (D1 authority boundary, D2 identity, D3 profiles-as-data, D12 testability) are *application-semantic*, so they belong in code we can test, not in a platform we would then have to work around.
2. It is the only option satisfying all hard filters F1-F5 without qualification, including a friction-free Windows-local, offline, LLM-optional deployment.
3. Every place where another option wins is reachable through a port without contaminating the core.

Concrete technology selection and its own alternatives analysis: `TECHNOLOGY_STACK_DECISION.md`. Sequencing: `INDEPENDENT_IMPLEMENTATION_ROADMAP.md`.
