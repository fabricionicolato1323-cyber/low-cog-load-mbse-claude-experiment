/**
 * Contract pipeline: zod (source of truth) -> committed JSON Schema (language-neutral artifact, INT-023).
 *   tsx tools/contracts-gen.ts          write packages/contracts/schemas/*.schema.json
 *   tsx tools/contracts-gen.ts --check  fail (exit 1) if committed files differ from regenerated output
 */
import { existsSync, mkdirSync, readFileSync, readdirSync, unlinkSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { z } from "zod";
import { SCHEMAS } from "@lcl/contracts";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
export const schemaDir = join(root, "packages/contracts/schemas");

export function generate(): Map<string, string> {
  const out = new Map<string, string>();
  for (const [name, schema] of Object.entries(SCHEMAS)) {
    const js = z.toJSONSchema(schema, { target: "draft-2020-12", io: "input" }) as Record<string, unknown>;
    const doc = { $comment: "GENERATED from @lcl/contracts (zod). Do not edit; run `npm run contracts`.", $id: `urn:lcl:contract:${name}`, ...js };
    out.set(`${name}.schema.json`, JSON.stringify(doc, null, 2) + "\n");
  }
  return out;
}

export function diff(): string[] {
  const gen = generate();
  const problems: string[] = [];
  for (const [file, text] of gen) {
    const p = join(schemaDir, file);
    if (!existsSync(p)) problems.push(`missing: ${file}`);
    else if (readFileSync(p, "utf8") !== text) problems.push(`stale: ${file}`);
  }
  if (existsSync(schemaDir)) for (const f of readdirSync(schemaDir)) if (!gen.has(f)) problems.push(`orphan: ${f}`);
  return problems;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  if (process.argv.includes("--check")) {
    const problems = diff();
    if (problems.length) {
      console.error("contracts out of date:\n  " + problems.join("\n  ") + "\nrun: npm run contracts");
      process.exit(1);
    }
    console.log("contracts up to date");
  } else {
    mkdirSync(schemaDir, { recursive: true });
    for (const f of existsSync(schemaDir) ? readdirSync(schemaDir) : []) unlinkSync(join(schemaDir, f));
    for (const [file, text] of generate()) writeFileSync(join(schemaDir, file), text);
    console.log(`wrote ${generate().size} schemas to ${schemaDir}`);
  }
}
