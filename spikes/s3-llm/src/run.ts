/**
 * S3 runner: node --import tsx src/run.ts --model phi4-mini --mode constrained|unconstrained
 * Appends one JSON line per paragraph to docs/slice0/data/s3-<model>-<mode>.jsonl (resumable).
 */
import { appendFileSync, existsSync, mkdirSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { CORPUS } from "./corpus.ts";
import { ExtractionSchema, SYSTEM_PROMPT, extractionJsonSchema } from "./schema.ts";

const args = new Map<string, string>();
for (let i = 2; i < process.argv.length; i += 2) args.set(process.argv[i]!.replace(/^--/, ""), process.argv[i + 1]!);
const model = args.get("model") ?? "phi4-mini";
const mode = (args.get("mode") ?? "constrained") as "constrained" | "unconstrained";
const host = args.get("host") ?? "http://127.0.0.1:11434";
const here = dirname(fileURLToPath(import.meta.url));
const outFile = resolve(here, `../../../docs/slice0/data/s3-${model.replace(/[:/]/g, "_")}-${mode}.jsonl`);
mkdirSync(dirname(outFile), { recursive: true });

const done = new Set<string>();
if (existsSync(outFile))
  for (const l of readFileSync(outFile, "utf8").split("\n").filter(Boolean)) done.add(JSON.parse(l).id as string);

function extractJsonObject(s: string): unknown {
  const start = s.indexOf("{");
  const end = s.lastIndexOf("}");
  if (start < 0 || end <= start) throw new Error("no JSON object found");
  return JSON.parse(s.slice(start, end + 1));
}

for (const p of CORPUS) {
  if (done.has(p.id)) continue;
  const body: Record<string, unknown> = {
    model,
    stream: false,
    think: false,
    messages: [
      {
        role: "system",
        content: mode === "unconstrained" ? SYSTEM_PROMPT + "\nRespond with the JSON object only, no other text." : SYSTEM_PROMPT,
      },
      { role: "user", content: `Paragraph:\n"""\n${p.text}\n"""` },
    ],
    options: { temperature: 0, seed: 42, num_ctx: 4096, num_predict: 1024 },
  };
  if (mode === "constrained") body["format"] = extractionJsonSchema();
  const t0 = performance.now();
  let rec: Record<string, unknown>;
  try {
    const res = await fetch(`${host}/api/chat`, { method: "POST", body: JSON.stringify(body), signal: AbortSignal.timeout(900_000) });
    const j = (await res.json()) as {
      message?: { content: string };
      done_reason?: string;
      eval_count?: number;
      eval_duration?: number;
      prompt_eval_count?: number;
      total_duration?: number;
      load_duration?: number;
      error?: string;
    };
    const wall = performance.now() - t0;
    const content = j.message?.content ?? "";
    let valid = false;
    let parsed: unknown = null;
    let error: string | undefined = j.error;
    try {
      parsed = ExtractionSchema.parse(extractJsonObject(content));
      valid = j.done_reason !== "length";
    } catch (e) {
      error ??= String(e instanceof Error ? e.message : e).slice(0, 200);
    }
    rec = {
      id: p.id, model, mode, valid, truncated: j.done_reason === "length", error, parsed, raw: content,
      wallMs: Math.round(wall), evalCount: j.eval_count, evalMs: Math.round((j.eval_duration ?? 0) / 1e6),
      promptTokens: j.prompt_eval_count, loadMs: Math.round((j.load_duration ?? 0) / 1e6),
    };
  } catch (e) {
    rec = { id: p.id, model, mode, valid: false, truncated: false, error: String(e), parsed: null, raw: "", wallMs: Math.round(performance.now() - t0) };
  }
  appendFileSync(outFile, JSON.stringify(rec) + "\n");
  console.log(`${model} ${mode} ${p.id} valid=${rec["valid"]} wall=${rec["wallMs"]}ms tokens=${rec["evalCount"] ?? "-"}`);
}
console.log("done", outFile);
