#!/usr/bin/env node
/**
 * Local Linux verification (NFR-042, ACC-010): runs the fast suite inside a Linux container from a CLEAN copy of the
 * working tree (no host node_modules, so native prebuilds are resolved for Linux) after `npm ci`.
 * No remote CI. Usage: node scripts/test-linux.mjs [--node 24] [--cmd "npm run test:fast"]
 */
import { spawnSync } from "node:child_process";
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

// tar copy excludes host-only state; GIT_DIR-free, so `git` is not needed inside the container.
const script = [
  "set -e",
  "mkdir /work",
  "cd /src",
  "tar --exclude=./node_modules --exclude=./.git --exclude=./.tmp --exclude=./CLAUDE_INPUT --exclude='*/dist' --exclude='*/dist-ts' --exclude=./test-results -cf - . | tar -xf - -C /work",
  "cd /work",
  "echo \"node $(node -v) / npm $(npm -v) / $(uname -sm)\"",
  "npm ci --no-audit --no-fund",
  cmd,
].join(" && ");

console.log(`[test-linux] ${image}: ${cmd}`);
const r = spawnSync("docker", ["run", "--rm", "-v", `${root}:/src:ro`, image, "sh", "-c", script], { stdio: "inherit" });
process.exit(r.status ?? 1);
