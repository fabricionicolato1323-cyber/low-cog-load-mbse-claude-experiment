# First prompt for Claude Code

Read only the requirements under `CLAUDE_INPUT/`.

This repository is an independent implementation experiment.

Do not search for, clone, inspect, or attempt to infer the source code of the original project.

Do not assume any programming language, framework, database, UI framework, graph technology, LLM framework, or deployment architecture.

In particular, do not assume Python or Flask.

Do not implement application code yet.

## Objective for this session

1. Consolidate your understanding of the product.
2. Identify architectural drivers and non-functional constraints.
3. Identify ambiguities or contradictions that materially affect architecture.
4. Separate product requirements from implementation suggestions that may have leaked into wording.
5. Propose 2–4 technically credible architecture/technology alternatives.
6. Compare them against the requirements.
7. Recommend one architecture and technology stack with justification.
8. Define a staged implementation roadmap using coherent vertical slices.

Create:

- `docs/REQUIREMENTS_ANALYSIS.md`
- `docs/ARCHITECTURE_OPTIONS.md`
- `docs/TECHNOLOGY_STACK_DECISION.md`
- `docs/INDEPENDENT_IMPLEMENTATION_ROADMAP.md`

## Technology-selection rule

Technology choices must emerge from the requirements.

Evaluate relevant tradeoffs including:

- conversation-first UI;
- graph/semantic representation;
- ontology and profile handling;
- deterministic reasoning;
- natural-language and structured queries;
- graphical model visualization;
- matrices and traceability;
- interface/interconnection views;
- impact analysis;
- local/offline operation;
- local LLM integration;
- future cloud LLM support;
- SysML/formal-model interoperability;
- external engineering-tool integration;
- packaging/deployment;
- Windows support;
- possible Linux support;
- maintainability;
- testability;
- performance;
- future multi-user collaboration.

Do not select a stack merely because it is familiar or popular.

## Autonomy and token discipline

Work autonomously when a safe, reversible engineering decision can be made.

Do not ask me to choose among normal implementation technologies. Make and justify your own recommendation.

Do not repeatedly reread all input files if a compact working summary is sufficient.

Do not implement the application in this session.

Do not start remote CI.

Stop after producing the four analysis/decision documents and a concise summary.
