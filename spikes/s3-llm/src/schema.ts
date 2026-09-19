import { z } from "zod";
import { KINDS } from "./corpus.ts";

/** The candidate-extraction contract used in the spike. Deliberately tiny: each extra output token costs seconds on CPU. */
export const ExtractionSchema = z.object({
  items: z.array(z.object({ kind: z.enum(KINDS), quote: z.string().min(1) })),
  ambiguities: z.array(z.object({ quote: z.string().min(1) })),
});
export type Extraction = z.infer<typeof ExtractionSchema>;

export const extractionJsonSchema = (): Record<string, unknown> => {
  const s = z.toJSONSchema(ExtractionSchema, { target: "draft-7" }) as Record<string, unknown>;
  delete s["$schema"]; // Ollama's grammar compiler does not need it
  return s;
};

export const SYSTEM_PROMPT = `You extract candidate engineering statements from a paragraph.
Return JSON with two arrays.
"items": each item has "kind" and "quote". "quote" MUST be copied verbatim from the paragraph (the shortest span that carries the statement). Do not paraphrase. Do not invent anything not in the text.
Kinds:
- stakeholder: a person, role or organisation involved with or affected by the system
- objective: a goal or need the system/project should achieve
- requirement: what the system shall do, or how well (including measurable limits)
- constraint: an imposed restriction (regulation, budget, schedule, technology, environment) on the solution
- assumption: something taken as true but not guaranteed
- function: an activity or behaviour performed by the system or an element
- system_element: a component, subsystem, or external system
- interface: an exchange between two elements, with what is exchanged if stated
"ambiguities": quotes (verbatim) of vague or unmeasurable wording that an engineer should clarify, such as "fast", "adequate", "soon".
If the paragraph contains no engineering content, return {"items":[],"ambiguities":[]}.
Example paragraph: "The clinic wants patients to book online. The booking service must confirm within 2 seconds. Payment is handled by the bank gateway."
Example output: {"items":[{"kind":"stakeholder","quote":"The clinic"},{"kind":"objective","quote":"patients to book online"},{"kind":"requirement","quote":"The booking service must confirm within 2 seconds"},{"kind":"system_element","quote":"the bank gateway"}],"ambiguities":[]}`;
