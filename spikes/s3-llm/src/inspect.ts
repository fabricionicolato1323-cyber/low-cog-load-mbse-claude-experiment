/** Qualitative error analysis: node --import tsx src/inspect.ts <file-stem e.g. qwen3.5_4b-constrained> [paragraphId ...] */
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { CORPUS } from "./corpus.ts";
import { kindOk, quoteMatch } from "./score.ts";

const dataDir = resolve(dirname(fileURLToPath(import.meta.url)), "../../../docs/slice0/data");
const [stem, ...only] = process.argv.slice(2);
const recs = readFileSync(resolve(dataDir, `s3-${stem}.jsonl`), "utf8").split("\n").filter(Boolean).map((l) => JSON.parse(l));
const tally = { fpUngold: 0, fpWrongKind: 0, fpDup: 0, missed: 0 };
for (const r of recs) {
  if (only.length && !only.some((o) => r.id.startsWith(o))) continue;
  const p = CORPUS.find((c) => c.id === r.id)!;
  const items: { kind: string; quote: string }[] = r.parsed?.items ?? [];
  const used = new Set<number>();
  const lines: string[] = [];
  for (const it of items) {
    const gi = p.gold.findIndex((g, i) => !used.has(i) && quoteMatch(it.quote, g.quote));
    if (gi < 0) {
      const dup = p.gold.some((g) => quoteMatch(it.quote, g.quote));
      lines.push(`  FP ${dup ? "(duplicate of matched gold)" : "(not in gold)"}: [${it.kind}] "${it.quote}"`);
      if (dup) tally.fpDup++;
      else tally.fpUngold++;
      continue;
    }
    used.add(gi);
    if (!kindOk(it.kind, p.gold[gi]!)) {
      lines.push(`  WRONG KIND: [${it.kind}] "${it.quote}" (gold ${p.gold[gi]!.kind})`);
      tally.fpWrongKind++;
    }
  }
  p.gold.forEach((g, i) => {
    if (!used.has(i)) {
      lines.push(`  MISSED: [${g.kind}] "${g.quote}"`);
      tally.missed++;
    }
  });
  if (lines.length) console.log(`${p.id} (pred ${items.length}, gold ${p.gold.length})\n${lines.join("\n")}`);
}
console.log("\nTALLY", JSON.stringify(tally));
