# Query, View, Matrix and Traceability Requirements

## One model, multiple projections

VIEW-001 — Semantic query, textual views, graphical views, matrices and representation-specific views shall operate over one canonical project semantic state or deterministic projections of it.

VIEW-002 — Changing filters or viewpoints shall never mutate engineering truth.

VIEW-003 — Projections shall preserve stable canonical identity so users can navigate between conversation, query, graphs, matrices and provenance.

## Semantic query

QUERY-001 — Users shall be able to ask engineering questions in natural language.

QUERY-002 — Expert/structured query mechanisms may also be provided where useful.

QUERY-003 — Queries should support filtering by relevant engineering level, concept type, relation type, methodology/profile, source/provenance, baseline/version, state/mode/situation/configuration and verification status.

QUERY-004 — Query services shall preserve multiplicity and shall not silently collapse distinct canonical identities.

QUERY-005 — Users shall be able to move from a query result to an appropriate graphical/textual/matrix context and back.

Representative questions include:
- What realizes this requirement?
- Which functions are unallocated?
- Which requirements are not verified?
- What changed downstream if this element changes?
- Which interfaces cross this subsystem boundary?
- What evidence supports this decision?
- Which work packages implement this architecture element?
- Which external source is authoritative for this fact?

## Viewpoints

VIEW-010 — The evolving model shall be continuously inspectable but secondary to the primary conversation.

VIEW-011 — The product should support relevant viewpoints including:
- mission/operational;
- requirements;
- functional/system behavior;
- logical architecture;
- realization/physical architecture;
- scenarios;
- interfaces/interconnections;
- Engineering Delivery / work breakdown;
- capability/provider/tool/execution;
- evidence;
- decisions/provenance;
- traceability;
- change impact.

VIEW-012 — Views should be composable and filterable without creating competing semantic state.

## Matrices

MATRIX-001 — Relational engineering information shall be available in matrix/table form where that representation reduces cognitive load.

Important matrix families include:
- requirements traceability;
- coverage/allocation;
- responsibility;
- source mapping;
- interfaces/interconnections;
- N²-style matrices.

MATRIX-002 — Rows, columns and cells shall preserve links to canonical semantic identities.

MATRIX-003 — Matrix cells should support drill-down to relevant graph, query, provenance and impact context.

## Interface/interconnection views

IFACE-001 — The product shall provide graph/network and N²-style projections over canonical interface/exchange semantics.

IFACE-002 — Interface views should preserve direction, endpoints, type and exchanged information/material/energy/service semantics where available.

IFACE-003 — Interface views shall support hierarchy/abstraction-level and context filtering.

## Scenario visualization

SCEN-001 — The product shall support interactive graphical scenario/model projections, especially for operational and system scenarios.

SCEN-002 — Graphical editing, if provided, shall stage semantic candidates/changes rather than silently mutate authoritative truth.

SCEN-003 — A graphical interaction grammar may be methodology-aware but the generic rendering/editing mechanism shall not hardcode a single methodology.

## Traceability

TRACE-001 — Traceability shall cover both vertical abstraction transitions and horizontal relationships such as allocation, interface, dependency, responsibility and evidence.

TRACE-002 — The user shall be able to navigate upstream and downstream.

TRACE-003 — Traceability relationships shall preserve provenance and stable identity.

TRACE-004 — Requirements matrices and architecture views are projections of the same traceability semantics, not separate manually synchronized datasets.

## Change impact

IMPACT-001 — Proposed changes shall support impact analysis over typed semantic dependencies.

IMPACT-002 — The system should distinguish directly modified elements from potentially impacted elements.

IMPACT-003 — Impact results shall be explainable by showing paths/relations responsible for the propagation.

IMPACT-004 — Impact analysis itself shall not mutate authoritative state.
