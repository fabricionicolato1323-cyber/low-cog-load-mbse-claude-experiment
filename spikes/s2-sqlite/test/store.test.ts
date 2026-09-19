import { spawn } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import fc from "fast-check";
import { afterAll, describe, expect, it } from "vitest";
import { RULES, generate, makeChangeSet, rng, type Op } from "@lcl/spike-s1-graph";
import { Graph } from "@lcl/spike-s1-graph";
import { openDb, type DriverName } from "../src/driver.ts";
import { StaleBaseError, Store, rebuildFromLog, type StoredChangeSet } from "../src/store.ts";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "../../..");
const tmpRoot = join(root, ".tmp");
mkdirSync(tmpRoot, { recursive: true });
const base = mkdtempSync(join(tmpRoot, "s2-"));
const opened: { close(): void }[] = [];
// Windows cannot delete files that still have an open handle (EPERM/EBUSY), so every connection is closed first.
afterAll(() => {
  for (const d of opened) try { d.close(); } catch { /* already closed */ }
  rmSync(base, { recursive: true, force: true, maxRetries: 5 });
});
let n = 0;
const fresh = (driver: DriverName, name = "db.sqlite", opts?: Parameters<typeof openDb>[2]) => {
  const dir = join(base, `${driver.replace(":", "_")}-${n++}`);
  mkdirSync(dir, { recursive: true });
  const path = join(dir, name);
  const db = openDb(driver, path, opts);
  opened.push(db);
  return { path, dir, store: new Store(db) };
};
const mkCs = (store: Store, ops: Op[], key: string): StoredChangeSet => ({ id: `cs-${key}`, idempotencyKey: key, baseRevision: store.head(), ops, provenance: { origin: "user", actor: "t" }, createdAt: "2026-09-20T00:00:00Z" });
const el = (id: string, props = {}) => ({ op: "add-element", element: { id, kind: "function", props } }) as Op;
const rel = (id: string, s: string, t: string) => ({ op: "add-relation", relation: { id, kind: "depends", source: s, target: t } }) as Op;

describe.each(["better-sqlite3", "node:sqlite"] as DriverName[])("S2 store on %s", (driver) => {
  it("commits, reloads the current state into the S1 graph, and reports WAL mode", () => {
    const { store } = fresh(driver);
    store.commit(mkCs(store, [el("a"), el("b"), rel("r1", "a", "b")], "k1"));
    store.commit(mkCs(store, [{ op: "update-element", id: "a", set: { status: "approved" } }], "k2"));
    expect(store.head()).toBe(2);
    const g = Graph.fromRows(RULES, store.currentElements(), store.currentRelations());
    expect(g.elements.get("a")!.props).toMatchObject({ status: "approved" });
    expect(g.relations.size).toBe(1);
    expect((store.db.prepare("PRAGMA journal_mode").get() as { journal_mode: string }).journal_mode).toBe("wal");
    expect((store.db.prepare("PRAGMA synchronous").get() as { synchronous: number }).synchronous).toBe(2); // FULL, never weakened
  });

  it("idempotent retry returns the original revision and writes nothing (COL-008)", () => {
    const { store } = fresh(driver);
    const first = store.commit(mkCs(store, [el("a")], "same-key"));
    const h = store.stateHash();
    const again = store.commit({ ...mkCs(store, [el("zzz")], "same-key"), baseRevision: 0 });
    expect(first).toEqual({ rev: 1, replay: false });
    expect(again).toEqual({ rev: 1, replay: true });
    expect(store.head()).toBe(1);
    expect(store.stateHash()).toBe(h);
  });

  it("rejects a stale base revision and leaves state untouched (NFR-031)", () => {
    const { store } = fresh(driver);
    store.commit(mkCs(store, [el("a")], "k1"));
    const h = store.stateHash();
    expect(() => store.commit({ ...mkCs(store, [el("b")], "k2"), baseRevision: 0 })).toThrow(StaleBaseError);
    expect(store.stateHash()).toBe(h);
    expect(store.head()).toBe(1);
  });

  it("a failure in the middle of a change set rolls back the log row and every earlier op", () => {
    const { store } = fresh(driver);
    store.commit(mkCs(store, [el("a")], "k1"));
    const h = store.stateHash();
    // third op collides with existing current element "a"
    expect(() => store.commit(mkCs(store, [el("x"), el("y"), el("a")], "k2"))).toThrow();
    expect(store.stateHash()).toBe(h);
    expect(store.head()).toBe(1);
    // the failed key was not burned: the same key can be used for a corrected change set
    expect(store.commit(mkCs(store, [el("x")], "k2")).replay).toBe(false);
  });

  it("as-of queries see history: removed relations and old property values at past revisions", () => {
    const { store } = fresh(driver);
    store.commit(mkCs(store, [el("a", { v: 1 }), el("b"), rel("r1", "a", "b")], "k1")); // rev 1
    store.commit(mkCs(store, [{ op: "update-element", id: "a", set: { v: 2 } }], "k2")); // rev 2
    store.commit(mkCs(store, [{ op: "remove-relation", id: "r1" }], "k3")); // rev 3
    const at = (rev: number) => store.neighboursAsOf("a", rev);
    expect(at(1).relations.map((r) => r.id)).toEqual(["r1"]);
    expect(at(2).relations.map((r) => r.id)).toEqual(["r1"]);
    expect(at(3).relations).toEqual([]);
    expect(JSON.parse((at(1).element as { props: string }).props).v).toBe(1);
    expect(JSON.parse((at(2).element as { props: string }).props).v).toBe(2);
    expect(at(0).element).toBeUndefined();
  });

  it("S2-e property: rebuilding from the log reproduces the versioned state exactly (incl. history)", () => {
    const ds = generate(120, 400, 3);
    fc.assert(
      fc.property(fc.integer({ min: 1, max: 6 }), fc.integer({ min: 1, max: 1_000_000 }), (nCommits, seed) => {
        const a = fresh(driver, "live.sqlite").store;
        const r = rng(seed);
        // seed data through the commit path, then random realistic change sets incl. updates
        const chunk = (xs: Op[], k: number) => Array.from({ length: Math.ceil(xs.length / k) }, (_, i) => xs.slice(i * k, i * k + k));
        const load: Op[] = [...ds.elements.map((element) => ({ op: "add-element", element }) as Op), ...ds.relations.map((relation) => ({ op: "add-relation", relation }) as Op)];
        chunk(load, 50).forEach((ops, i) => a.commit(mkCs(a, ops, `load-${i}`)));
        for (let i = 0; i < nCommits; i++) a.commit(mkCs(a, makeChangeSet(ds, r, 30), `c-${seed}-${i}`));
        const b = fresh(driver, "rebuilt.sqlite").store;
        rebuildFromLog(a, b, 7);
        expect(b.stateHash()).toBe(a.stateHash());
        expect(b.head()).toBe(a.head());
        a.db.close();
        b.db.close();
        return true;
      }),
      { numRuns: 8, seed: 5 },
    );
  }, 60_000);

  it("S2-g WAL: a reader is not blocked by an open write transaction and sees only committed state; a second writer gets SQLITE_BUSY", () => {
    const { path, store } = fresh(driver);
    store.commit(mkCs(store, [el("a")], "k1"));
    const reader = new Store(openDb(driver, path));
    opened.push(reader.db);
    store.db.exec("BEGIN IMMEDIATE");
    store.applyOps(2, [el("uncommitted")]);
    const t0 = performance.now();
    const count = (reader.db.prepare("SELECT COUNT(*) AS c FROM element").get() as { c: number }).c;
    const dt = performance.now() - t0;
    expect(count).toBe(1);
    expect(dt).toBeLessThan(200);
    const writer2 = openDb(driver, path, { busyTimeoutMs: 0 });
    opened.push(writer2);
    expect(() => writer2.exec("BEGIN IMMEDIATE")).toThrow(/locked|busy/i);
    store.db.exec("ROLLBACK");
    reader.db.close();
    writer2.close();
  });

  it("I-8 Windows/Linux paths: spaces, unicode and long-ish nesting open, persist and delete cleanly after close", () => {
    const dir = join(base, `p-${driver.replace(":", "_")}`, "my project ü é 项目", "a".repeat(40), "b".repeat(40));
    mkdirSync(dir, { recursive: true });
    const path = join(dir, "modèle 1.sqlite");
    const s = new Store(openDb(driver, path));
    s.commit(mkCs(s, [el("a")], "k1"));
    s.db.close();
    const s2 = new Store(openDb(driver, path));
    expect(s2.head()).toBe(1);
    s2.db.close();
    for (const suffix of ["", "-wal", "-shm"]) rmSync(path + suffix, { force: true, maxRetries: 3 });
    expect(existsSync(path)).toBe(false);
  });

  const child = (mode: "loop" | "in-txn", path: string, ack: string, n = 5) =>
    spawn(process.execPath, ["--import", "tsx", join(root, "spikes/s2-sqlite/src/crash-writer.ts"), driver, path, ack, mode, String(n)], { cwd: root, stdio: "ignore" });
  const waitFor = async (pred: () => boolean, ms: number) => {
    const t = Date.now();
    while (!pred()) {
      if (Date.now() - t > ms) throw new Error("timeout waiting for child");
      await new Promise((r) => setTimeout(r, 20));
    }
  };
  const acks = (f: string) => (existsSync(f) ? readFileSync(f, "utf8").split("\n").filter(Boolean) : []);
  const verifyAfterCrash = (path: string, lastAck: number) => {
    const s = new Store(openDb(driver, path));
    opened.push(s.db);
    expect(s.integrityCheck()).toBe("ok");
    expect(s.head()).toBeGreaterThanOrEqual(lastAck);
    const revs = s.db.prepare("SELECT rev FROM change_log ORDER BY rev").all().map((r: { rev: number }) => r.rev);
    expect(revs).toEqual(Array.from({ length: revs.length }, (_, i) => i + 1)); // contiguous, no gaps
    const maxRow = s.db.prepare("SELECT MAX(rev_from) AS m FROM (SELECT rev_from FROM element UNION ALL SELECT rev_from FROM relation)").get() as { m: number | null };
    expect(maxRow.m ?? 0).toBeLessThanOrEqual(s.head()); // no rows from a never-committed revision
    const rebuilt = fresh(driver, "rebuilt.sqlite").store;
    rebuildFromLog(s, rebuilt);
    expect(rebuilt.stateHash()).toBe(s.stateHash()); // materialised state == replay of the log after the crash
    s.db.close();
    rebuilt.db.close();
  };

  it("S2-f crash safety: SIGKILL while a transaction is open leaves exactly the committed state", async () => {
    const { path, dir } = fresh(driver);
    const ack = join(dir, "ack.txt");
    const p = child("in-txn", path, ack, 5);
    await waitFor(() => acks(ack).includes("IN_TXN"), 30_000);
    p.kill("SIGKILL");
    await new Promise((r) => p.once("exit", r));
    const lastAck = Number(acks(ack).filter((x) => x !== "IN_TXN").pop());
    expect(lastAck).toBe(5);
    verifyAfterCrash(path, lastAck);
    const s = new Store(openDb(driver, path));
    opened.push(s.db);
    expect(s.head()).toBe(5); // the hung transaction's revision 6 must not exist
    s.db.close();
  }, 60_000);

  it("S2-f crash safety: SIGKILL at 3 random moments during a stream of commits never loses an acknowledged commit or leaves a partial one", async () => {
    for (let round = 0; round < 3; round++) {
      const { path, dir } = fresh(driver);
      const ack = join(dir, "ack.txt");
      const p = child("loop", path, ack);
      await waitFor(() => acks(ack).length >= 3, 30_000);
      await new Promise((r) => setTimeout(r, 30 + Math.floor(Math.random() * 250)));
      p.kill("SIGKILL");
      await new Promise((r) => p.once("exit", r));
      const lastAck = Number(acks(ack).pop());
      verifyAfterCrash(path, lastAck);
    }
  }, 120_000);
});
