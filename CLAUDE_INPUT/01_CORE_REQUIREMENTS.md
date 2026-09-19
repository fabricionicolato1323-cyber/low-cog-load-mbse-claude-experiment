# Core Functional Requirements

## 1. Conversation-first engineering

REQ-CF-001 — Normal Mode shall expose one dominant conversational interaction surface.

REQ-CF-002 — At any point, one primary next engineering action or question shall be visually obvious.

REQ-CF-003 — Internal capabilities such as evidence planning, impact analysis, optimization, reconciliation or execution planning shall normally be inferred/orchestrated rather than presented as mandatory module choices.

REQ-CF-004 — The user shall be able to inspect a compact "what I understand" summary and correct it without using internal IDs or debug views.

REQ-CF-005 — Conversation history shall preserve enough context to explain why the current question is being asked and what changed after prior answers.

REQ-CF-006 — Progressive disclosure shall be used for advanced semantics, provenance, traceability, execution details, formal-model details and diagnostics.

REQ-CF-007 — New capabilities shall not automatically create permanent competing panels in Normal Mode.

## 2. Greenfield engineering

REQ-GR-001 — A new project shall be startable with a natural-language description of the engineering challenge.

REQ-GR-002 — The system shall progressively capture relevant engineering concepts rather than force completion of a universal fixed questionnaire.

REQ-GR-003 — Derived requirements, functions, architectures, allocations, alternatives or cross-abstraction relations proposed by probabilistic reasoning shall remain candidates until confirmed or accepted by an approved deterministic rule.

REQ-GR-004 — Repeatable engineering concepts are multi-instance by default unless a profile explicitly declares a cardinality constraint.

## 3. Brownfield engineering

REQ-BR-001 — The user shall be able to begin from existing models, requirements, documents, databases or supported external representations.

REQ-BR-002 — Imported information shall first be interpreted into canonical candidates before authoritative reconciliation.

REQ-BR-003 — The application shall explain what it believes imported elements and relations mean in canonical engineering terms.

REQ-BR-004 — The application shall identify missing, ambiguous, conflicting, unsupported or non-conforming information.

REQ-BR-005 — The user shall be able to confirm, reject, refine, merge, keep separate or correct interpreted candidates without manipulating internal graph IDs.

REQ-BR-006 — External systems may retain declared authority. Import or synchronization shall not silently overwrite external or canonical authoritative state.

REQ-BR-007 — Canonical engineering gaps and methodology-specific gaps shall be distinguishable.

## 4. Engineering intent and capability planning

REQ-IN-001 — The system shall infer candidate engineering intent from language and current project state.

REQ-IN-002 — If intent is sufficiently clear, the user shall not be required to choose an internal software mode.

REQ-IN-003 — If intent is genuinely ambiguous, the system shall ask one concise clarification or offer a small number of plain-language choices.

REQ-IN-004 — The planning sequence shall distinguish the engineering question, required evidence, analysis type, required engineering capability and eventual provider/tool.

REQ-IN-005 — Provider/tool identity shall not be encoded as canonical engineering meaning.

## 5. Candidate and authority boundaries

REQ-AU-001 — LLM-generated or heuristically inferred engineering facts shall be advisory until validated and promoted through an explicit authority boundary.

REQ-AU-002 — Deterministic semantic rules, validation and provenance shall govern authoritative mutation where applicable.

REQ-AU-003 — Duplicate detection is advisory by default. Similar labels or embedding similarity shall not automatically merge authoritative entities.

REQ-AU-004 — Semantic identity and semantic equivalence are separate concepts.

REQ-AU-005 — Consequential changes shall support preview, explanation, impact inspection and confirmation.

## 6. Engineering Delivery

REQ-ED-001 — Engineering Task, Work Package, responsibility, required engineering capability, provider/tool, artifact/deliverable, milestone/time window, release/baseline and dependencies shall be representable and traceable to engineering semantics.

REQ-ED-002 — WBS/EWBS-style structures shall be projections over connected work semantics rather than an independent project truth.

REQ-ED-003 — Responsibility allocation and tool allocation are different concepts: people/roles/teams/suppliers perform or own work, while tools/providers satisfy capabilities.

## 7. Dynamic engineering context

REQ-DY-001 — States, modes, situations and configurations shall be first-class engineering concepts where relevant rather than hidden free-text attributes.

REQ-DY-002 — These concepts shall be introduced only when they reduce uncertainty or are required by the active methodology/problem.

## 8. Explanation and usability

REQ-EX-001 — The user should be able to ask why an element exists, what realizes it, what it affects, what evidence supports it and where it came from.

REQ-EX-002 — Ordinary progress shall not require advanced semantic IDs, raw graph structures, tool APIs or methodology jargon.

REQ-EX-003 — Expert information remains available but is not mandatory for normal progression.
