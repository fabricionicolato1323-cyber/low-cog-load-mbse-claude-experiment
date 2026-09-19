# Semantic Model and Ontology Requirements

## Canonical semantic authority

SEM-001 — The product shall maintain one methodology-neutral canonical engineering representation for authoritative project semantics.

SEM-002 — Methodology/profile semantics, industrial-domain semantics and technical representation formats are orthogonal concerns.

SEM-003 — A methodology/profile may shape terminology, validation rules, information needs, viewpoints and questioning strategy, but shall not create a second authoritative project model.

SEM-004 — Representation formats such as SysML, graph exchange, JSON or tool-native models are projections/reconciliation surfaces and are not automatically the global semantic authority.

## Semantic families

The canonical model must be capable of representing, as needed:

- purpose, engineering challenge, mission and objectives;
- capabilities and desired outcomes;
- participants, stakeholders, entities, systems, organizations and roles;
- activities, functions, responsibilities and system behavior;
- requirements, constraints, measures, targets and acceptance criteria;
- information, material, energy, service and other exchanges;
- processes, chains, scenarios and occurrences;
- state, mode, situation and configuration;
- environment, context, assumptions and operating conditions;
- functional architecture;
- logical architecture;
- realization/physical architecture, including hardware, software, human, service and other realization forms;
- interfaces, ports/endpoints and exchanges;
- allocations and realization relationships;
- alternatives and variants;
- analysis needs, evidence, results and decisions;
- engineering tasks, work packages, responsibilities, artifacts, milestones and releases/baselines.

## Cross-abstraction semantics

SEM-010 — Relationships across abstraction levels are first-class, bidirectional and provenance-bearing.

SEM-011 — The system shall support questions such as "why does this exist?", "what realizes this?", "what requirement constrains this?", "what work implements this?", and "what evidence supports this?".

SEM-012 — Cross-abstraction meaning shall not be inferred solely from conversation order, screen order or document hierarchy.

## Identity and provenance

SEM-020 — Every authoritative semantic element and relation shall have stable identity independent of display labels.

SEM-021 — Multiple distinct entities with similar or identical names shall be representable.

SEM-022 — Automatic similarity may suggest duplicates or equivalence but shall not silently merge authoritative identities.

SEM-030 — Confirmed facts and relations shall preserve provenance sufficient to distinguish user input, deterministic rule, imported artifact, external source, tool result, LLM/advisory proposal and administrative/migration operations where applicable.

SEM-031 — Provenance shall support navigation from results and decisions back to source models, assumptions, requirements and evidence.

## Methodology profiles

SEM-040 — The generic core shall remain usable without a specialized methodology profile.

SEM-041 — Profiles may provide vocabulary, mappings, cardinalities, validation rules, information needs and recommended viewpoints.

SEM-042 — Switching profiles shall not silently rewrite confirmed canonical engineering truth.

SEM-043 — A profile change may expose new gaps or alternate interpretations; such changes must preserve provenance and normal confirmation boundaries.

## Arcadia coverage

Arcadia should be used as a coverage reference for engineering meaning, not as universal terminology.

The generic model should be capable of representing the families needed for operational analysis, system need analysis, functional and logical architecture, realization/physical architecture, scenarios, exchanges, states/modes, allocations and lifecycle context.

Arcadia-specific names and assumptions belong in a profile/mapping layer.

## Ontology versus UI

SEM-050 — The ontology shall describe engineering meaning, not page names, buttons, panel names or fixed dialog flows.

SEM-051 — Questions and presentation aliases should be derived from information needs and profiles rather than hardcoded domain branches.

## Deterministic reasoning boundary

SEM-060 — Typed traversal, traceability, completeness checks, validation, dependency reasoning and impact propagation should be deterministic wherever canonical semantics and profile rules are sufficient.

SEM-061 — Retrieval-augmented or LLM-generated explanations may assist users but do not become engineering truth without the normal authority boundary.

SEM-062 — The product should remain useful with deterministic fallbacks when an LLM is unavailable.
