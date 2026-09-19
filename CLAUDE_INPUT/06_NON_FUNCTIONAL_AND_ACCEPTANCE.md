# Non-Functional Requirements and Acceptance Principles

## Technology neutrality

NFR-001 — No language, framework, graph store, database, frontend framework, LLM vendor, cloud provider or deployment topology is prescribed.

NFR-002 — Architecture and stack shall be selected from the product requirements and documented with alternatives and tradeoffs before substantial implementation.

NFR-003 — The design should avoid irreversible coupling to infrastructure when a clean boundary can preserve replaceability.

## Maintainability and architecture

NFR-010 — Separate domain semantics from UI, storage, external tools, LLMs and transport concerns.

NFR-011 — Prefer dependency inversion or equivalent architectural boundaries so core engineering meaning does not depend on vendor-specific infrastructure.

NFR-012 — Configuration/profile data should contain methodology/domain vocabulary and mappings rather than executable domain-specific conditional branches where practical.

NFR-013 — Hardcoded methodology or vendor semantics in generic orchestration are prohibited.

NFR-014 — The architecture must remain extensible to additional methodologies, domains, representations, providers and viewpoints.

## Determinism and explainability

NFR-020 — Deterministic rules should handle semantic validation, typed traversal, completeness, traceability and impact where sufficient information exists.

NFR-021 — LLM/AI assistance must be distinguishable from deterministic engineering authority.

NFR-022 — Important automated conclusions and change-impact results should be explainable through provenance, rules or relation paths.

## Reliability and safety of engineering state

NFR-030 — Authoritative mutations shall be atomic from the perspective of users/readers.

NFR-031 — Failed validation shall not leave partial authoritative state.

NFR-032 — Stable identities, provenance and version/revision information shall support audit and future concurrency.

NFR-033 — Destructive or consequential operations should support preview/confirmation or explicit trusted policies.

## Local/offline and deployment

NFR-040 — A practical local/single-user deployment is acceptable for an initial implementation.

NFR-041 — Initial architectural decisions must not permanently prevent later shared/multi-user deployment.

NFR-042 — Windows is an important deployment environment. Linux compatibility is desirable where technically reasonable.

NFR-043 — Local LLM operation should be possible or at least architecturally feasible; cloud LLM support may coexist.

NFR-044 — Core deterministic functionality should remain usable when no LLM is available.

## Performance

NFR-050 — Normal interaction should feel responsive for realistic engineering models.

NFR-051 — The architecture should support larger graphs/models without requiring the entire model to be visually rendered or inserted into every LLM prompt.

NFR-052 — Queries and projections should retrieve bounded relevant subsets where possible.

## Cognitive-load quality

NFR-060 — Usability is a product requirement, not cosmetic polish.

NFR-061 — The system should minimize simultaneous competing controls, unnecessary prompts, context switches and memory burden.

NFR-062 — Human validation shall include first-use comprehension and perceived mental-effort indicators.

## Testing

ACC-001 — Automated tests shall cover deterministic semantic rules, identity, provenance, validation, queries, projections and authoritative mutation boundaries.

ACC-002 — Integration tests shall verify that different projections do not create divergent truth.

ACC-003 — Brownfield tests shall verify authority preservation, loss/unsupported mapping reporting and reconciliation behavior.

ACC-004 — LLM-assisted tests shall verify that advisory proposals cannot silently become authoritative state.

ACC-005 — Future concurrency tests shall cover independent concurrent edits, same-property conflicts, delete-versus-edit, stale clients, cardinality conflicts, external-source conflicts, idempotent retry and traceable conflict resolution.

ACC-006 — Human validation shall verify that a new engineer can identify where to start, what the system understands, what changed and what to do next.

## CI discipline for the experiment

ACC-010 — Do not use remote CI as a high-frequency debugging loop.

ACC-011 — Prefer local analysis and targeted tests before broader local verification, commit and remote CI.

ACC-012 — Avoid excessive micro-commits purely to trigger remote feedback.

## Experiment rule

ACC-020 — This repository is an independent implementation experiment. Do not seek, inspect or copy source code from the original implementation.

ACC-021 — Requirements describe WHAT the product should accomplish. Historical implementation choices embedded in reference language should not be treated as mandatory unless they are genuine product constraints.
