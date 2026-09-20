#!/usr/bin/env node
/**
 * Local Linux verification (NFR-042, ACC-010): runs the fast suite inside a Linux container from a CLEAN copy of the
 * working tree (no host node_modules, so native prebuilds are resolved for Linux) after `npm ci`.
 * No remote CI. Usage: node scripts/test-linux.mjs [--node 24] [--cmd "npm run test:fast"]
 */
import { spawn, spawnSync } from "node:child_process";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const args = process.argv.slice(2);
const opt = (name, dflt) => {
  const i = args.indexOf(name);
  return i >= 0 ? args[i + 1] : dflt;
};
const node = opt("--node", "24");
const cmd = opt("--cmd", "npm run test:fast");
const image = `node:${node}-bookworm-slim`;
const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");

const info = spawnSync("docker", ["version", "--format", "{{.Server.Version}}"], { encoding: "utf8" });
if (info.status !== 0) {
  console.error("Docker daemon is not reachable. Start Docker Desktop and retry.\n" + (info.stderr || ""));
  process.exit(2);
}

// The tree is streamed in as a tar over stdin (a bind mount of a Windows drive can hang in Docker Desktop, and cross-filesystem
// reads are slow). Host-only state is excluded, so native prebuilds are resolved for Linux by `npm ci`.
const script = [
  "set -e",
  "mkdir /work",
  "tar -xf - -C /work",
  "cd /work",
  "echo \"node $(node -v) / npm $(npm -v) / $(uname -sm)\"",
  "npm ci --no-audit --no-fund",
  cmd,
].join(" && ");

console.log(`[test-linux] ${image}: ${cmd}`);
const excludes = ["node_modules", ".git", ".tmp", "CLAUDE_INPUT", "dist", "dist-ts", "test-results", "playwright-report", "docs/slice0/data"].flatMap((e) => ["--exclude", e]);
const tar = spawn("tar", [...excludes, "-cf", "-", "-C", root, "."], { stdio: ["ignore", "pipe", "inherit"] });
const docker = spawn("docker", ["run", "--rm", "-i", image, "sh", "-c", script], { stdio: ["pipe", "inherit", "inherit"] });
tar.stdout.pipe(docker.stdin);
docker.on("exit", (code) => process.exit(code ?? 1));
