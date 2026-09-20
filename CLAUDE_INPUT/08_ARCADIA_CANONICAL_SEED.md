# Arcadia as Primary Semantic Seed for the Canonical Engineering Model

## Normative clarification

Arcadia shall be the **primary semantic seed and coverage backbone** for the initial Canonical Engineering Model.

This does NOT mean that:

- the Canonical Engineering Model is an Arcadia model;
- Arcadia terminology must be exposed to users;
- Arcadia classes must be copied one-to-one;
- the executable core may depend on Arcadia-specific code;
- Arcadia becomes the product identity;
- other methodologies become subordinate to Arcadia.

Instead, Arcadia is used as the first comprehensive reference metamodel from which the canonical engineering semantics are generalized.

## Generalization rule

For each relevant Arcadia concept, determine the underlying methodology-neutral engineering meaning.

The canonical concept should use generalized engineering semantics rather than Arcadia-specific naming where practical.

Examples:

Arcadia Operational Actor
-> canonical Participant / Operational Entity / Role semantics

Arcadia Operational Activity
-> canonical Activity semantics

Arcadia System Function / Logical Function / Physical Function
-> canonical Function semantics with abstraction/context information

Arcadia Logical Component
-> canonical Logical Realization / Logical Responsibility semantics

Arcadia Physical Component
-> canonical Realization Element semantics

Arcadia Operational Interaction / Functional Exchange / Component Exchange
-> canonical Exchange / Interaction semantics

Arcadia Operational Scenario
-> canonical Scenario semantics

Arcadia Operational State / Mode / Situation
-> canonical State / Mode / Situation semantics

## Coverage objective

The initial canonical semantic model shall be capable of representing the engineering meaning required across the Arcadia lifecycle, including at least:

- Operational Analysis
- System Need Analysis
- Functional analysis
- Logical Architecture
- Physical / Realization Architecture
- Scenarios
- Activities and functions
- Actors, entities and systems
- Capabilities
- Missions / objectives / outcomes
- Interactions and exchanges
- Exchange items / payloads
- Interfaces / ports / endpoints
- Functional chains and processes
- States
- Modes
- Situations
- Configurations
- Requirements
- Constraints
- Measures / metrics
- Allocations
- Realization relationships
- Decomposition / containment
- Dynamic behavior
- Environment and context
- Alternatives / variants
- Traceability across abstraction levels

Arcadia coverage may be extended beyond these categories when relevant concepts are discovered.

## Mapping policy

Every supported Arcadia concept shall eventually be classified as one of:

1. direct canonical equivalent;
2. composition of multiple canonical concepts;
3. Arcadia-profile-only semantic;
4. representation/tool-specific concept;
5. unsupported or deferred, with explicit rationale.

Silent omission is not permitted.

## Canonical independence

Although Arcadia is the primary seed, the resulting canonical model must remain methodology-neutral.

A canonical concept is accepted because it represents useful engineering meaning, not because Arcadia happens to contain a class with that name.

The architecture must allow additional semantic coverage from:

- MEG / MASG
- UAF
- SysML-related semantic needs
- customer-specific methodologies
- industrial-domain profiles
- future engineering methods

without requiring a rewrite of the canonical core.

## Extension rule

If another methodology introduces meaningful engineering semantics not sufficiently represented by the Arcadia-seeded canonical model, the canonical model may be extended.

Such extensions must preserve:

- methodology neutrality;
- stable identity;
- provenance;
- compatibility with existing project knowledge;
- explicit mappings;
- no methodology-specific branching in generic executable logic.

## User-experience rule

Arcadia terminology shall not be mandatory in Normal Mode.

The normal interaction remains plain-language and conversation-first.

Arcadia terminology may appear when:

- the Arcadia profile is active;
- the user requests methodology-specific terminology;
- Expert Mode is enabled;
- an imported Capella/Arcadia model is being interpreted;
- a methodology-specific gap or mapping needs explanation.

## Project Knowledge Graph relationship

The Project Knowledge Graph remains the authoritative project-instance semantic state.

Arcadia provides semantic coverage guidance and methodology mappings.

The relationship is:

Arcadia semantic coverage
-> generalized Canonical Engineering Model
-> authoritative Project Knowledge Graph

not:

Arcadia model
-> separate Arcadia project truth

## Architectural consequence

The first canonical ontology should therefore be designed by systematically reviewing Arcadia semantic coverage and generalizing it, rather than inventing a minimal ontology independently and only later checking Arcadia compatibility.

This is a deliberate product requirement.
