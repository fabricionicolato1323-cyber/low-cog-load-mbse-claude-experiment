/**
 * Child process for the crash-safety test. Usage: node --import tsx crash-writer.ts <driver> <db> <ackFile> <mode> [n]
 *  mode "loop":   commit forever, appending each acknowledged revision to <ackFile> (parent SIGKILLs at a random time)
 *  mode "in-txn": commit n change sets, then open a transaction, write rows, signal "IN_TXN" in <ackFile> and hang
 */
import { appendFileSync } from "node:fs";
import type { Op } from "@lcl/spike-s1-graph";
import { openDb, type DriverName } from "./driver.ts";
import { Store } from "./store.ts";

const [driver, path, ack, mode, nArg] = process.argv.slice(2) as [DriverName, string, string, string, string?];
const store = new Store(openDb(driver, path, { synchronous: "FULL" }));
let counter = Date.now() % 1_000_000;
const mkId = () => `child-${process.pid}-${counter++}`;
const mkOps = (n: number): Op[] => {
  const ops: Op[] = [];
  const ids: string[] = [];
  for (let i = 0; i < n; i++) {
    if (i % 2 === 0 || ids.length < 2) {
      const id = mkId();
      ids.push(id);
      ops.push({ op: "add-element", element: { id, kind: "function", props: { name: id, status: "draft" } } });
    } else ops.push({ op: "add-relation", relation: { id: mkId(), kind: "depends", source: ids[ids.length - 1]!, target: ids[ids.length - 2]! } });
  }
  return ops;
};
const commitOne = (): number => {
  const head = store.head();
  return store.commit({ id: mkId(), idempotencyKey: `k-${mkId()}`, baseRevision: head, ops: mkOps(50), provenance: { origin: "user", actor: "child" }, createdAt: new Date().toISOString() }).rev;
};

if (mode === "loop") {
  for (;;) appendFileSync(ack, commitOne() + "\n");
} else {
  for (let i = 0; i < Number(nArg ?? 5); i++) appendFileSync(ack, commitOne() + "\n");
  store.db.exec("BEGIN IMMEDIATE");
  store.applyOps(store.head() + 1, mkOps(50));
  store.db.prepare("INSERT INTO change_log (rev, changeset_id, idempotency_key, ops, provenance, created_at) VALUES (?,?,?,?,?,?)").run(store.head() + 1, mkId(), mkId(), "[]", "{}", "x");
  appendFileSync(ack, "IN_TXN\n");
  const until = Date.now() + 60_000;
  while (Date.now() < until); // hang inside the open transaction until killed
}
