# Claude Input Package

This directory is the compact requirements baseline for an independent implementation experiment.

## Source provenance

The requirements were consolidated from the read-only source repository:

`fabricionicolato1323-cyber/low-cog-load-digital-eng`

Source branch: `main`

Source commit used for this baseline:

`74a72f190eb218211b5f0d1d1aeeb14b61656980`

Date of consolidation: 2026-09-19.

The original repository must not be modified by this experiment.

## Purpose of consolidation

The source project contains extensive implementation history, plans, tests and architecture evolution. Feeding all of that to a second coding agent would:

1. consume excessive context/tokens;
2. bias the independent implementation toward the existing solution;
3. make it difficult to distinguish product requirements from historical implementation choices.

This package therefore extracts the product-level and architecture-driving **WHAT** while deliberately avoiding source code and most implementation-specific **HOW**.

## Files

- `00_PRODUCT_VISION.md` — product thesis, scope and authority principles
- `01_CORE_REQUIREMENTS.md` — main functional requirements
- `02_SEMANTIC_MODEL_AND_ONTOLOGY.md` — canonical semantics, profiles, identity and provenance
- `03_CONVERSATION_AND_COGNITIVE_LOAD.md` — interaction and usability requirements
- `04_QUERY_VIEWS_TRACEABILITY.md` — query, graph, matrix, interfaces, traceability and impact
- `05_INTEROPERABILITY_COLLABORATION.md` — brownfield, formal models, provider neutrality and future collaboration
- `06_NON_FUNCTIONAL_AND_ACCEPTANCE.md` — technology neutrality, quality attributes and acceptance principles
- `07_FUTURE_CAPABILITIES.md` — future direction that should influence but not inflate initial implementation

## Critical experiment rule

Do not locate, inspect, clone or reuse the implementation code of the source project.

Use this package to independently derive:

1. requirements interpretation;
2. architecture options;
3. technology-stack options;
4. an implementation roadmap;
5. only then, implementation.

There is intentionally no mandatory development stack.
