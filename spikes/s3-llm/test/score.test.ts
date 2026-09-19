import { describe, expect, it } from "vitest";
import type { Paragraph } from "../src/corpus.ts";
import { isGrounded, quoteMatch, scoreParagraph } from "../src/score.ts";

const P: Paragraph = {
  id: "T",
  text: "The pump shall deliver 5 ml/h. Nurses program it at the bedside.",
  gold: [
    { kind: "requirement", quote: "The pump shall deliver 5 ml/h", alt: ["function"] },
    { kind: "stakeholder", quote: "Nurses" },
  ],
  ambiguous: ["at the bedside"],
};

describe("S3 scorer", () => {
  it("quoteMatch accepts near-verbatim and rejects verbose or unrelated quotes", () => {
    expect(quoteMatch("The pump shall deliver 5 ml/h.", "The pump shall deliver 5 ml/h")).toBe(true);
    expect(quoteMatch("Nurses", "Nurses")).toBe(true);
    // a whole sentence for a 1-token gold is too verbose (prediction precision < 0.4)
    expect(quoteMatch("Nurses program it at the bedside", "Nurses")).toBe(false);
    expect(quoteMatch("valve pressure", "The pump shall deliver 5 ml/h")).toBe(false);
  });
  it("grounding is whitespace/case-insensitive but requires a real substring", () => {
    expect(isGrounded("the pump  SHALL deliver", P.text)).toBe(true);
    expect(isGrounded("the pump shall deliver 6 ml/h", P.text)).toBe(false);
    expect(isGrounded("", P.text)).toBe(false);
  });
  it("scores perfect, wrong-kind, hallucinated and duplicate predictions", () => {
    const s = scoreParagraph(
      P,
      [
        { kind: "requirement", quote: "The pump shall deliver 5 ml/h" },
        { kind: "requirement", quote: "Nurses" }, // right text, wrong kind
        { kind: "requirement", quote: "The pump shall deliver 5 ml/h." }, // duplicate of first
        { kind: "function", quote: "the pump explodes" }, // ungrounded
      ],
      ["at the bedside", "something else"],
    );
    expect(s).toMatchObject({ predicted: 4, gold: 2, grounded: 3, matched: 2, typedMatched: 1, ambiguityHit: 1, ambiguityFlagged: 2 });
  });
  it("prefers the kind-correct match when two predictions compete for one gold item", () => {
    const s = scoreParagraph(
      { ...P, gold: [P.gold[0]!], ambiguous: [] },
      [
        { kind: "stakeholder", quote: "The pump shall deliver 5 ml/h" },
        { kind: "requirement", quote: "The pump shall deliver 5 ml/h" },
      ],
      [],
    );
    expect(s.matched).toBe(1);
    expect(s.typedMatched).toBe(1);
  });
  it("empty prediction on empty gold is a clean negative control", () => {
    const s = scoreParagraph({ ...P, gold: [], ambiguous: [] }, [], []);
    expect(s).toMatchObject({ predicted: 0, gold: 0, matched: 0 });
  });
});
