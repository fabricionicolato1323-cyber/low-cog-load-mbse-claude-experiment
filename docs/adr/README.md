# Architecture Decision Records

One short markdown file per decision that is expensive to reverse, or per changed assumption (roadmap §2). Numbered, immutable once **Accepted**; a later ADR *supersedes* rather than edits.

## Template

```markdown
# ADR-NNNN: <decision in a few words>

Status: Proposed | Accepted | Superseded by ADR-MMMM
Date: YYYY-MM-DD
Supersedes / amends: <doc or ADR, section>

## Context
What forces, requirements (IDs) and evidence led here. Link to measurements, never to memory.

## Decision
What we will do, stated so that it can be tested.

## Evidence
Pointers to spike results / tests (file paths). What would have falsified this and did not.

## Consequences
Positive, negative, follow-up work. Assumptions changed (A-numbers). What we deliberately did not decide.

## Revisit when
The observable condition that reopens this decision.
```

## Index

| ADR | Title | Status |
|---|---|---|
| [0001](0001-stack-after-slice0.md) | Technology stack after the Slice 0 falsification spikes | Proposed (Slice 0 evidence; awaits human acceptance) |
| [0002](0002-identity-and-changeset-model.md) | Identity and ChangeSet model - what Slice 0 constrains | Proposed (partial; final shape is a Slice 1 decision) |
