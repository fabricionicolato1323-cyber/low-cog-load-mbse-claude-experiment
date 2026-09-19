# Conversation and Cognitive-Load Requirements

## Interaction objective

The application should reduce unnecessary mental effort while preserving rigorous engineering semantics.

Low cognitive load is a measurable design objective, not a reason to remove technical depth.

## Conversation-first Normal Mode

UX-001 — Conversation is the primary surface for ordinary engineering work.

UX-002 — One visually dominant next action should exist at a time.

UX-003 — The product should ask for engineering intent, facts and decisions rather than tool selection or internal software-module selection.

UX-004 — Large multi-field forms should be avoided in Normal Mode unless the user explicitly requests an advanced view.

UX-005 — The user should continuously understand:
- what the system believes;
- what changed;
- why the current question matters;
- what to do next.

## Progressive disclosure

UX-010 — Detailed ontology terminology, provenance, graph IDs, tool interfaces, execution configuration, diagnostics and formal-model details shall be hidden until relevant or requested.

UX-011 — Advanced and expert modes may expose full technical detail without changing authoritative model semantics.

UX-012 — Methodology terminology may be shown on demand or in expert mode while default interaction remains understandable in plain engineering language.

## Recognition over recall

UX-020 — Where valid known options exist, the product should prefer selection/recognition over forcing users to remember exact terminology, APIs or profile vocabulary.

UX-021 — Suggestions should be contextual and small in number.

## Context continuity

UX-030 — The evolving engineering model shall remain inspectable so the user does not need to mentally remember the full state.

UX-031 — Opening a model view, matrix, impact view or expert view shall preserve conversational context.

UX-032 — Returning from a secondary view shall restore a clear next conversational action.

## Compact understanding summary

UX-040 — The user shall be able to inspect and correct a compact summary of interpreted engineering state.

UX-041 — Corrections shall not require editing raw JSON, semantic IDs or internal graph structures.

## LLM interaction

UX-050 — Large free-form text and documents may be accepted.

UX-051 — An LLM may decompose natural language into typed candidate engineering statements.

UX-052 — Ambiguity shall be surfaced rather than silently guessed when materially consequential.

UX-053 — LLM proposals require deterministic validation/provenance and confirmation or an approved deterministic acceptance rule before authoritative mutation.

## Planned versus real execution

UX-060 — Planned, simulated/mock and real external execution must be clearly distinguishable.

UX-061 — The UI must not imply that an external engineering tool executed when only a plan or mock was produced.

UX-062 — Consequential external execution should present the proposed action/workflow for review before launch, unless a trusted policy explicitly allows otherwise.

## Cognitive-load validation

UX-070 — Human validation should measure at least:
- ability of a new engineer to identify where to start;
- ability to identify the next action;
- ability to understand what the system currently believes;
- ability to detect what changed;
- unnecessary context switching;
- perceived mental effort;
- navigation burden.

UX-071 — Major new visible capability should not simply accumulate additional persistent Normal Mode surfaces.

UX-072 — The design should prefer orchestration behind the conversation over exposing the application's internal architecture to the user.
