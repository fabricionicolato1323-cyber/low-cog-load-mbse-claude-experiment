# ADR-0003: Arcadia as the primary semantic seed for the canonical model

Status: **Accepted**
Date: 2026-09-20
Source: `CLAUDE_INPUT/08_ARCADIA_CANONICAL_SEED.md`

## Context

The canonical engineering model must be methodology-neutral, but a neutral model still needs a disciplined initial semantic backbone. Treating Arcadia merely as a late coverage check risks inventing a shallow or inconsistent core and then retrofitting important engineering semantics later.

## Decision

Arcadia is the **primary semantic seed and coverage backbone** for the initial Canonical Engineering Model.

This does **not** make the canonical model an Arcadia model and does not make Arcadia terminology mandatory in the product UI.

The implementation shall:

1. systematically review relevant Arcadia semantic coverage from the beginning;
2. generalize the underlying engineering meaning into methodology-neutral canonical concepts;
3. keep Arcadia-specific vocabulary, completeness rules and viewpoints in profile/mapping data;
4. classify every supported Arcadia concept as:
   - direct canonical equivalent;
   - composition of canonical concepts;
   - Arcadia-profile-only semantic;
   - representation/tool-specific concept;
   - unsupported/deferred with rationale;
5. prohibit silent omission;
6. allow MEG/MASG, UAF, SysML-related semantic needs, customer methods and domain profiles to extend coverage without subordinating them to Arcadia.

The authoritative project-instance state remains the Project Knowledge Graph interpreted through the Canonical Engineering Model.

## Consequences

- Slice 1 must create the first Arcadia-to-generalized-canonical coverage catalogue before hardening the initial ontology subset.
- Slice 1 may implement only the types needed for its walking skeleton, but those types must be selected from the coverage baseline rather than invented independently.
- Slice 7 no longer introduces Arcadia coverage for the first time; it validates and hardens the Arcadia profile/mappings against the baseline.
- Normal Mode remains plain-language and conversation-first.
- No Arcadia-specific branch is permitted in generic executable orchestration.
- The technology stack selected in ADR-0001 is unchanged.

## Non-goals

- one-to-one duplication of the Arcadia metamodel;
- exposing Arcadia terminology to every user;
- making Capella/Arcadia a global source of project truth;
- preventing future canonical extensions from other engineering methods.

## Revisit when

A major methodology or domain introduces engineering meaning that cannot be represented cleanly by the Arcadia-seeded generalized canonical model, or when a supported Arcadia concept cannot be classified under the mapping policy above.
