# Conversation-Like Minimal UI and Any-Abstraction Entry

## Normative clarification

The default product experience shall be visually and behaviorally similar to a modern conversational assistant: calm, minimal, conversation-dominant, and progressively disclosed.

This is a product interaction requirement, not a requirement to copy branding, proprietary styling, or implementation details from any specific product.

## 1. Conversation-dominant layout

Normal Mode shall minimize visible controls and simultaneous information.

The primary surface is a conversation in which the system asks one useful engineering question at a time and the user answers in natural language or with compact contextual choices.

The interface shall avoid permanent dashboards, dense toolbars, large forms, and multiple peer panels in Normal Mode.

A compact project/model context may remain visible, but it must not compete with the conversation.

## 2. Canonical model as a secondary contextual surface

The evolving canonical model / Project Knowledge Graph shall be inspectable alongside the conversation, preferably as a compact secondary surface that can be:

- collapsed;
- expanded;
- undocked/opened in a larger view;
- filtered to the current context;
- focused on the currently discussed semantic elements.

The model surface is not a second workflow.

It is a projection of the same authoritative canonical state.

## 3. Contextual disclosure from model elements

When the user interacts with a model element, additional information shall be available without permanently increasing screen complexity.

Supported interaction patterns may include:

- hover for a short summary;
- click/select for focused context;
- right-click/context menu for actions;
- popover, drawer, dialog or temporary detail window for deeper information;
- contextual actions such as:
  - explain this element;
  - why does this exist?;
  - what does this realize?;
  - what realizes this?;
  - show traceability;
  - show provenance;
  - show requirements/constraints;
  - show interfaces/exchanges;
  - show impact;
  - show evidence/decisions;
  - ask a question about this element.

The exact UI primitive is an implementation decision. The invariant is **contextual, on-demand disclosure rather than persistent clutter**.

## 4. Entry from any engineering abstraction level

The application shall not assume that a project starts from mission intent, operational analysis, requirements, or any fixed top-down sequence.

A user may start with information at any supported abstraction level, including for example:

- an engineering challenge or mission;
- operational actors/activities/scenarios;
- requirements or constraints;
- functions/behavior;
- logical architecture;
- a physical/realization architecture;
- an existing solution/product/subsystem;
- interfaces/interconnections;
- a work package or engineering delivery artifact;
- imported model/document data.

The system shall infer the likely semantic meaning and abstraction/context of the supplied information, stage candidates, and then evaluate what is missing around it.

## 5. Gap-driven questioning around the known starting point

After establishing a candidate/confirmed starting point, the system shall perform canonical completeness and active-methodology gap analysis in all relevant directions.

The system may therefore ask questions:

- upstream: why does this exist, which need/requirement/capability justifies it?;
- downstream: how is it realized, verified, executed or delivered?;
- laterally: what interfaces, exchanges, dependencies, states, modes or allocations are missing?;
- contextually: under which scenario/situation/configuration does it apply?;
- evidentially: what supports or verifies the statement?;
- methodologically: what information required by the active methodology is still absent?

Question order is driven by current knowledge, active profile, uncertainty, impact and information needs, not by a fixed lifecycle wizard.

## 6. Example: starting from a physical solution

If the user begins with something like:

> "The solution consists of two redundant compute modules connected to a sensor bus and a separate safety controller."

the product should be able to:

1. infer candidate realization/physical elements and interfaces;
2. show the interpreted structure compactly;
3. ask for confirmation/correction;
4. detect missing upstream semantics such as:
   - purpose/engineering challenge;
   - requirements/constraints;
   - functions/responsibilities;
   - logical rationale;
   - operational context/scenarios;
5. detect lateral/downstream gaps such as:
   - interface payloads;
   - failure/degraded modes;
   - allocation;
   - verification/evidence;
6. ask the most useful next question rather than forcing the user to restart at the beginning.

## 7. Methodology-neutral canonical semantics with Arcadia minimum coverage

The generalized canonical methodology/ontology shall cover at least the engineering meaning represented by the Arcadia semantic backbone established in ADR-0003.

Arcadia remains the primary initial semantic seed, but the canonical vocabulary is generalized.

Other methodologies, including MEG/MASG, UAF and customer methods, shall be represented through explicit concept/relation mappings and extensions where needed.

## 8. Methodology naming / concept projection

A methodology profile may map a generalized canonical concept to methodology-specific terminology.

For example, the same canonical semantic element may be presented using:

- generic engineering terminology in Normal Mode;
- Arcadia terminology when the Arcadia profile is active;
- another methodology's terminology when that profile is active.

Methodology-specific names are presentation/profile mappings over canonical identity. They do not create a duplicate authoritative element.

The user should be able to inspect the methodology mapping when useful, especially in Advanced/Expert contexts.

## 9. Acceptance implications

A Normal Mode implementation is not accepted if:

- the screen resembles a multi-panel engineering dashboard more than a conversation;
- the user must select a lifecycle phase to begin;
- the user must start from mission/requirements when they already possess downstream architecture;
- model details are permanently exposed instead of available contextually;
- methodology-specific names become canonical identity;
- switching methodology duplicates or rewrites confirmed engineering truth;
- gap questions follow a fixed top-down sequence regardless of known project state.
