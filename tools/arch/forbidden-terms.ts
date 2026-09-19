import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

/**
 * NFR-013 architecture test support: the semantic layers must not embed methodology or vendor names.
 * Methodology vocabulary belongs in profile data; vendor names belong in adapters.
 */
export const FORBIDDEN_TERMS = [
  // methodologies / standards vocabulary that must stay in profiles or mapping data
  "arcadia", "capella", "sysml", "reqif", "mbse-method",
  // infrastructure and vendors that must stay in adapters
  "sqlite", "postgres", "ollama", "openai", "anthropic", "fastify", "react", "cytoscape", "elk", "vite",
] as const;

export interface TermHit {
  file: string;
  line: number;
  term: string;
  text: string;
}

const RE = new RegExp(`\\b(${FORBIDDEN_TERMS.join("|")})\\b`, "i");

export function scanText(file: string, text: string): TermHit[] {
  const hits: TermHit[] = [];
  text.split(/\r?\n/).forEach((l, i) => {
    const m = RE.exec(l);
    if (m) hits.push({ file, line: i + 1, term: m[1]!.toLowerCase(), text: l.trim() });
  });
  return hits;
}

export function scanDir(dir: string): TermHit[] {
  const hits: TermHit[] = [];
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (name === "node_modules" || name === "dist") continue;
    if (statSync(p).isDirectory()) hits.push(...scanDir(p));
    else if (/\.(ts|tsx|json|ya?ml|md)$/.test(name) && name !== "package.json") hits.push(...scanText(p, readFileSync(p, "utf8")));
  }
  return hits;
}
