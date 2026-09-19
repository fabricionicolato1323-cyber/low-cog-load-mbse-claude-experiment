# Interoperability, Federation and Collaboration Requirements

## Brownfield federation

INT-001 — Existing external engineering systems may remain authoritative; the product shall be able to build a federated semantic representation without forcing migration.

INT-002 — Every imported/federated item should preserve source identity, source version where available, authority metadata and provenance.

INT-003 — Missing connectors shall not block engineering definition. A missing integration becomes an explicit integration gap/backlog item.

INT-004 — Connectivity providers are replaceable. No connector vendor or integration platform is a universal default.

## Formal representation round trip

INT-010 — Formal representations such as SysML v2 shall be handled through a generic semantic projection/reconciliation layer.

INT-011 — Projection from the canonical model shall not require a separate methodology-specific exporter for every methodology/representation combination when canonical mappings are sufficient.

INT-012 — Import/reconciliation shall classify unsupported, partial or lossy mappings explicitly. Silent flattening is prohibited.

INT-013 — Representation-specific elements shall remain linked to canonical identities and mapping provenance.

INT-014 — If a project declares a formal external model authoritative for some scope, external changes shall still pass through identity, mapping, provenance, reconciliation and conflict rules before canonical authority changes.

INT-015 — Application-specific metadata with no natural representation in a formal modeling language shall not be forced into artificial modeling constructs merely to claim complete round trip.

## Provider-neutral execution

INT-020 — Engineering capability shall be resolved separately from provider/tool.

INT-021 — Multiple providers may satisfy one capability contract.

INT-022 — Execution results shall preserve provenance linking model version, assumptions, requirements/constraints, provider/tool, execution configuration and resulting evidence.

INT-023 — Agentic orchestration and integration mechanisms are implementation plumbing rather than canonical engineering meaning.

## Collaboration target architecture

COL-001 — The professional product shall support multiple users working against one authoritative project semantic state.

COL-002 — Authoritative mutations shall be represented as transactional ChangeSets or an equivalent explicit transaction concept.

COL-003 — Silent last-write-wins is prohibited for conflicting authoritative engineering changes.

COL-004 — Independent concurrent edits should be mergeable without project-wide locking.

COL-005 — Conflicts must be detected semantically, not only as text/JSON differences.

COL-006 — Successful authoritative commits shall be atomic and auditable.

COL-007 — Failed validation/conflict resolution shall leave authoritative state unchanged.

COL-008 — Retries should be idempotent where practical.

COL-009 — Collaboration architecture should eventually support authorization roles such as viewer, contributor/editor, reviewer, approver, administrator and integration actor.

COL-010 — Presence, stale-view warnings and conflict/reconciliation explanations should reduce collisions without relying on global locks.

COL-011 — CRDT/OT-style mechanisms may be used for transient text/layout collaboration, but authoritative semantic mutation still passes through semantic validation and commit boundaries.

COL-012 — External synchronization participates in the same concurrency/authority model and may not bypass it.

## Offline future

COL-020 — If disconnected work is supported in the future, local changes should be represented against a known base revision and reconciled through the same semantic merge rules rather than creating an untraceable second source of truth.
