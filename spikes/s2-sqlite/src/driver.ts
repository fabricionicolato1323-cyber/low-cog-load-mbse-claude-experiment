import { createRequire } from "node:module";

/** Minimal synchronous SQLite surface shared by `better-sqlite3` and the built-in `node:sqlite`. */
export interface Stmt {
  run(...p: unknown[]): unknown;
  get(...p: unknown[]): any;
  all(...p: unknown[]): any[];
  iterate(...p: unknown[]): IterableIterator<any>;
}
export interface Db {
  readonly driver: "better-sqlite3" | "node:sqlite";
  exec(sql: string): void;
  prepare(sql: string): Stmt;
  close(): void;
}
export type DriverName = Db["driver"];

const require = createRequire(import.meta.url);

export function openDb(driver: DriverName, path: string, opts: { synchronous?: "FULL" | "NORMAL" | "OFF"; busyTimeoutMs?: number } = {}): Db {
  let db: Db;
  if (driver === "better-sqlite3") {
    const Database = require("better-sqlite3");
    const raw = new Database(path);
    db = { driver, exec: (s) => raw.exec(s), prepare: (s) => raw.prepare(s), close: () => raw.close() };
  } else {
    const { DatabaseSync } = require("node:sqlite");
    const raw = new DatabaseSync(path);
    db = { driver, exec: (s) => raw.exec(s), prepare: (s) => raw.prepare(s), close: () => raw.close() };
  }
  db.exec("PRAGMA journal_mode = WAL");
  db.exec(`PRAGMA synchronous = ${opts.synchronous ?? "FULL"}`);
  db.exec(`PRAGMA busy_timeout = ${opts.busyTimeoutMs ?? 0}`);
  db.exec("PRAGMA foreign_keys = ON");
  return db;
}
