import { spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { basename, dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { ESLint } from "eslint";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { scanDir, scanText } from "./forbidden-terms.ts";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const depcruiseBin = join(root, "node_modules/dependency-cruiser/bin/dependency-cruiser.mjs");
const tscBin = join(root, "node_modules/typescript/bin/tsc");
const tmpRoot = join(root, ".tmp");
mkdirSync(tmpRoot, { recursive: true });

interface Violation { from: string; to: string; rule: { name: string } }
/** Exit code of the exact reporter that `npm run arch` uses (the gate). */
function gateExit(cwd: string, dirs: string[]): number {
  return spawnSync(process.execPath, [depcruiseBin, ...dirs, "--config", join(root, ".dependency-cruiser.cjs"), "--output-type", "err", "--no-cache"], { cwd, encoding: "utf8" }).status ?? -1;
}
function cruise(cwd: string, dirs: string[]): { status: number; violations: Violation[] } {
  const r = spawnSync(process.execPath, [depcruiseBin, ...dirs, "--config", join(root, ".dependency-cruiser.cjs"), "--output-type", "json", "--no-cache"], { cwd, encoding: "utf8", maxBuffer: 64 * 1024 * 1024 });
  if (!r.stdout) throw new Error(`depcruise produced no output: ${r.stderr}`);
  const json = JSON.parse(r.stdout) as { summary: { violations: Violation[] } };
  return { status: r.status ?? -1, violations: json.summary.violations };
}

describe("I-2 boundary rules on the real tree", () => {
  it("packages/ and adapters/ have zero boundary violations", () => {
    const { violations } = cruise(root, ["packages", "adapters"]);
    expect(violations.map((v) => `${v.rule.name}: ${v.from} -> ${v.to}`)).toEqual([]);
    expect(gateExit(root, ["packages", "adapters"])).toBe(0);
  });
});

describe("I-2 boundary rules FIRE on violating fixtures (guards against vacuous green)", () => {
  let dir: string;
  beforeAll(() => {
    dir = mkdtempSync(join(tmpRoot, "arch-"));
    const f = (p: string, body: string) => {
      const full = join(dir, p);
      mkdirSync(dirname(full), { recursive: true });
      writeFileSync(full, body);
    };
    f("tsconfig.json", JSON.stringify({ compilerOptions: { module: "NodeNext", moduleResolution: "NodeNext", allowImportingTsExtensions: true, noEmit: true } }));
    for (const p of ["kernel", "contracts", "ports", "app", "api", "web", "profiles"]) f(`packages/${p}/src/index.ts`, "export const x = 1;\n");
    f("adapters/a/src/index.ts", "export const x = 1;\n");
    f("adapters/b/src/index.ts", "export const x = 1;\n");
    // ---- violations
    f("packages/kernel/src/v-app.ts", 'import "../../app/src/index.ts";\n');
    f("packages/kernel/src/v-core.ts", 'import { readFileSync } from "node:fs";\nexport const r = readFileSync;\n');
    f("packages/kernel/src/v-npm.ts", 'import { describe } from "vitest";\nexport const d = describe;\n');
    f("packages/contracts/src/v-kernel.ts", 'import "../../kernel/src/index.ts";\n');
    f("packages/web/src/v-kernel.ts", 'import "../../kernel/src/index.ts";\n');
    f("packages/api/src/v-adapter.ts", 'import "../../../adapters/a/src/index.ts";\n');
    f("packages/app/src/v-adapter.ts", 'import "../../../adapters/a/src/index.ts";\n');
    f("adapters/a/src/v-b.ts", 'import "../../b/src/index.ts";\n');
    f("packages/ports/src/v-app.ts", 'import "../../app/src/index.ts";\n');
    f("packages/kernel/src/cyc1.ts", 'import "./cyc2.ts";\nexport const a = 1;\n');
    f("packages/kernel/src/cyc2.ts", 'import "./cyc1.ts";\nexport const b = 1;\n');
    f("packages/profiles/src/v-kernel.ts", 'import "../../kernel/src/index.ts";\n');
    // ---- allowed edges (must stay clean)
    f("packages/kernel/src/ok-contracts.ts", 'import "../../contracts/src/index.ts";\nimport { z } from "zod";\nexport const s = z.string();\n');
    f("packages/web/src/ok.ts", 'import "../../contracts/src/index.ts";\n');
    f("packages/app/src/ok.ts", 'import "../../kernel/src/index.ts";\nimport "../../ports/src/index.ts";\nimport "../../contracts/src/index.ts";\n');
    f("packages/api/src/ok.ts", 'import "../../app/src/index.ts";\nimport "../../contracts/src/index.ts";\n');
    f("adapters/a/src/ok.ts", 'import "../../../packages/ports/src/index.ts";\nimport "./index.ts";\n');
  });
  afterAll(() => rmSync(dir, { recursive: true, force: true }));

  it("reports exactly the expected rule for each violation and nothing for allowed edges", () => {
    const { violations } = cruise(dir, ["packages", "adapters"]);
    const got = new Set(violations.map((v) => `${v.rule.name} <= ${v.from}`));
    const expected = [
      ["kernel-is-pure-internal", "packages/kernel/src/v-app.ts"],
      ["kernel-no-node-or-vendor-libs", "packages/kernel/src/v-core.ts"],
      ["kernel-only-schema-lib", "packages/kernel/src/v-npm.ts"],
      ["contracts-is-a-leaf", "packages/contracts/src/v-kernel.ts"],
      ["web-imports-contracts-only", "packages/web/src/v-kernel.ts"],
      ["api-uses-app-and-contracts-only", "packages/api/src/v-adapter.ts"],
      ["app-depends-on-kernel-ports-contracts-only", "packages/app/src/v-adapter.ts"],
      ["adapters-use-ports-only", "adapters/a/src/v-b.ts"],
      ["ports-depend-on-kernel-and-contracts-only", "packages/ports/src/v-app.ts"],
      ["no-circular", "packages/kernel/src/cyc1.ts"],
      ["profiles-are-data-only", "packages/profiles/src/v-kernel.ts"],
    ].map(([r, f]) => `${r} <= ${f}`);
    for (const e of expected) expect(got.has(e), `missing violation: ${e}`).toBe(true);
    const offenders = [...got].filter((g) => /\/ok(-contracts)?\.ts$/.test(g));
    expect(offenders, "allowed edges must not be flagged").toEqual([]);
    expect(gateExit(dir, ["packages", "adapters"]), "the CLI gate must fail on violations").not.toBe(0);
  });
});

describe("NFR-013 no methodology/vendor names in semantic layers", () => {
  it("kernel, contracts, ports and app sources are clean", () => {
    const hits = ["kernel", "contracts", "ports", "app"].flatMap((p) => scanDir(join(root, "packages", p)));
    expect(hits.map((h) => `${h.file}:${h.line} ${h.term}`)).toEqual([]);
  });
  it("the scanner detects real violations and ignores lookalike words", () => {
    expect(scanText("x.ts", "// exports to SysML v2").map((h) => h.term)).toEqual(["sysml"]);
    expect(scanText("x.ts", "const db = new SQLite()").map((h) => h.term)).toEqual(["sqlite"]);
    expect(scanText("x.ts", "import React from 'react'").map((h) => h.term)).toEqual(["react"]);
    expect(scanText("x.ts", "reactive whelk relkin").length).toBe(0);
    expect(scanText("x.ts", "the ELK layout").map((h) => h.term)).toEqual(["elk"]);
  });
});

describe("I-3 kernel purity is enforced by the compiler", () => {
  let dir: string;
  beforeAll(() => {
    dir = mkdtempSync(join(tmpRoot, "purity-"));
    writeFileSync(
      join(dir, "tsconfig.json"),
      JSON.stringify({
        extends: join(root, "packages/kernel/tsconfig.json").replace(/\\/g, "/"),
        compilerOptions: { composite: false, declaration: false, emitDeclarationOnly: false, noEmit: true, rootDir: ".", tsBuildInfoFile: null },
        include: ["*.ts"],
        references: [],
      }),
    );
  });
  afterAll(() => rmSync(dir, { recursive: true, force: true }));
  const tsc = () => spawnSync(process.execPath, [tscBin, "-p", dir], { encoding: "utf8" });

  it("accepts a pure kernel file", () => {
    writeFileSync(join(dir, "pure.ts"), "export const v: number = [1, 2, 3].map((n) => n * 2).length;\n");
    const r = tsc();
    expect(r.stdout).toBe("");
    expect(r.status).toBe(0);
    rmSync(join(dir, "pure.ts"));
  });
  it("rejects process, Buffer, console, DOM globals and node: imports in kernel code", () => {
    writeFileSync(
      join(dir, "impure.ts"),
      [
        'import { readFileSync } from "node:fs";',
        "export const a = process.env;",
        'export const b = Buffer.from("x");',
        "export const c = console.log;",
        "export const d = document.title;",
        "export const e = readFileSync;",
      ].join("\n"),
    );
    const r = tsc();
    expect(r.status).not.toBe(0);
    for (const sym of ["process", "Buffer", "console", "document", "node:fs"]) expect(r.stdout, sym).toContain(sym);
  });
});

describe("I-3b kernel determinism lint rules FIRE (ambient time/randomness/globals are banned in kernel)", () => {
  let dir: string;
  beforeAll(() => {
    dir = mkdtempSync(join(tmpRoot, "lint-"));
    mkdirSync(join(dir, "packages/kernel/src"), { recursive: true });
    mkdirSync(join(dir, "packages/app/src"), { recursive: true });
    const NL = String.fromCharCode(10);
    const lines = ["export const a = Date.now();", "export const b = Math.random();", "export const c = new Date();", "export const d = process.env;", "export const e = setTimeout;"];
    writeFileSync(join(dir, "packages/kernel/src/impure.ts"), lines.join(NL) + NL);
    writeFileSync(join(dir, "packages/kernel/src/pure.ts"), "export const a = (n: number): number => n + 1;" + NL);
    writeFileSync(join(dir, "packages/app/src/uses-clock.ts"), "export const a = Date.now();" + NL); // allowed outside kernel
  });
  afterAll(() => rmSync(dir, { recursive: true, force: true }));
  it("flags Date.now, Math.random, new Date(), process and setTimeout in kernel only", async () => {
    const eslint = new ESLint({ cwd: dir, overrideConfigFile: join(root, "eslint.config.js") });
    const results = await eslint.lintFiles(["packages/kernel/src/impure.ts", "packages/kernel/src/pure.ts", "packages/app/src/uses-clock.ts"]);
    const by = (f: string) => results.find((r) => basename(r.filePath) === f)!.messages.map((m) => m.ruleId);
    const impure = by("impure.ts");
    expect(impure.filter((r) => r === "no-restricted-properties")).toHaveLength(2);
    expect(impure).toContain("no-restricted-syntax");
    expect(impure.filter((r) => r === "no-restricted-globals").length).toBeGreaterThanOrEqual(2);
    expect(by("pure.ts")).toEqual([]);
    expect(by("uses-clock.ts")).toEqual([]);
  });
});
