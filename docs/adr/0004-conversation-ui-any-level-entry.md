# ADR-0004: Conversation-like minimal UI and any-abstraction entry

Status: **Accepted**
Date: 2026-09-20
Source: `CLAUDE_INPUT/09_CONVERSATION_UI_ANY_LEVEL_ENTRY.md`

## Context

The product's low-cognitive-load thesis requires more than "conversation first" as a general statement. The interaction architecture must explicitly prevent the interface from becoming a conventional MBSE dashboard as features accumulate.

The engineering workflow also cannot assume greenfield top-down progression. Real projects frequently begin from an existing solution, subsystem, architecture, interface set, requirement set, or imported model.

## Decision

### 1. Normal Mode visual architecture

Normal Mode shall use a **modern conversational-assistant interaction pattern**:

- conversation is visually dominant;
- one primary question/action at a time;
- minimal persistent chrome and controls;
- no permanent accumulation of capability panels;
- compact project/model context only where it helps orientation.

This describes an interaction pattern, not branding or pixel-level imitation of any proprietary product.

### 2. Model workspace

The Canonical Engineering Model / Project KG shall be continuously available as a **secondary contextual projection**, not a second workflow.

The UI architecture shall support a compact model surface that may be expanded/undocked. Selecting a model element preserves canonical identity and conversational context.

Detailed information is disclosed on demand using contextual interactions such as hover, click, context menu, popover, drawer or temporary detail window.

### 3. Any-level entry

The application shall support entry from **any supported engineering abstraction level**.

No lifecycle phase is a mandatory start point.

Starting information may represent mission/operational semantics, requirements, functions, logical structure, realization/physical architecture, interfaces, delivery artifacts, evidence, or imported legacy state.

The system interprets the supplied state as candidates, confirms/corrects meaning, then computes missing information around it.

### 4. Gap-driven orchestration

The next-question engine operates over:

- confirmed Project KG state;
- staged candidates;
- canonical completeness rules;
- active methodology/profile requirements;
- uncertainty/ambiguity;
- traceability gaps;
- context/state/mode/configuration;
- evidence/verification gaps.

Questions may move upstream, downstream or laterally. There is no mandatory top-down wizard.

### 5. Methodology naming

Canonical identity is methodology-neutral.

Arcadia is the minimum semantic coverage backbone per ADR-0003. Methodology profiles map canonical concepts/relations to method-specific names, rules and viewpoints.

Changing the displayed methodology name never duplicates or rewrites authoritative semantic identity.

## Consequences

- Slice 1 must not hardcode a mission-first/start-from-challenge-only conversation even if the walking skeleton uses a simple challenge scenario for testing.
- Slice 1's orchestration contracts must allow a known starting element at arbitrary abstraction/context and compute information needs around it.
- The first UI shell should already enforce the visual hierarchy: conversation primary, compact understanding/model context secondary.
- Rich graph lenses may remain later slices, but model-element contextual-detail contracts should not be blocked by Slice 1 decisions.
- Human validation must explicitly test starting from a downstream/physical solution as well as a conventional greenfield challenge.
- Slice 7 methodology/profile work must support terminology projection over stable canonical identity.

## Non-goals

- pixel-level cloning of ChatGPT or any branded product;
- implementing every contextual model action in Slice 1;
- requiring graphical editing in Slice 1;
- implementing every methodology in the first release.

## Validation examples

At minimum, later acceptance should include:

1. start from a natural-language engineering challenge;
2. start from an existing requirement set;
3. start from a physical/realization architecture fragment;
4. verify the system asks different next questions appropriate to each known state;
5. switch terminology/profile and confirm canonical identities remain unchanged.
