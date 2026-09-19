import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { buildServer } from "../src/server.ts";

const TOKEN = "per-launch-token-0123456789";
const uuid = (n: number) => `018f1c2e-7a00-7000-8000-${n.toString(16).padStart(12, "0")}`;
const validBody = {
  id: uuid(1),
  baseRevision: 0,
  ops: [{ op: "add-element", id: uuid(2), kind: "requirement", props: { name: "R1" } }],
  provenance: { origin: "user", actor: "me" },
  idempotencyKey: "key-12345678",
  createdAt: "2026-09-20T10:00:00Z",
};
const auth = { "x-lcl-token": TOKEN };

describe("API skeleton: transport assumptions", () => {
  const app = buildServer({ token: TOKEN });
  let base = "";
  beforeAll(async () => {
    await app.listen({ host: "127.0.0.1", port: 0 });
    const addr = app.server.address();
    base = typeof addr === "object" && addr ? `http://127.0.0.1:${addr.port}` : "";
  });
  afterAll(async () => {
    await app.close();
  });

  it("binds to loopback only (never 0.0.0.0) on an OS-assigned port", () => {
    const addr = app.server.address();
    expect(addr).toMatchObject({ address: "127.0.0.1" });
    expect((addr as { port: number }).port).toBeGreaterThan(0);
  });

  it("rejects requests without or with a wrong per-launch token, over a real socket", async () => {
    expect((await fetch(`${base}/health`)).status).toBe(401);
    expect((await fetch(`${base}/health`, { headers: { "x-lcl-token": "nope" } })).status).toBe(401);
    expect((await fetch(`${base}/health`, { headers: { "x-lcl-token": TOKEN + "x" } })).status).toBe(401);
    const ok = await fetch(`${base}/health`, { headers: auth });
    expect(ok.status).toBe(200);
    expect(await ok.json()).toEqual({ ok: true });
  });

  it("validates request bodies with the COMMITTED 2020-12 JSON Schema (accepts valid, rejects invalid)", async () => {
    const post = (body: unknown) => app.inject({ method: "POST", url: "/probe/changesets", headers: auth, payload: body as object });
    expect((await post(validBody)).statusCode).toBe(200);
    expect((await post({ ...validBody, baseRevision: -1 })).statusCode).toBe(400);
    expect((await post({ ...validBody, ops: [{ op: "explode" }] })).statusCode).toBe(400);
    expect((await post({ ...validBody, surprise: true })).statusCode).toBe(400);
  });

  it("streams server-sent events incrementally and ends cleanly", async () => {
    const res = await fetch(`${base}/events`, { headers: auth });
    expect(res.headers.get("content-type")).toContain("text/event-stream");
    const reader = res.body!.getReader();
    const dec = new TextDecoder();
    const chunks: number[] = [];
    let text = "";
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      chunks.push(Date.now());
      text += dec.decode(value);
    }
    expect([...text.matchAll(/event: tick/g)]).toHaveLength(3);
    expect(text).toContain('data: {"n":2}');
    expect(chunks.length).toBeGreaterThanOrEqual(2); // arrived as separate chunks, i.e. actually streamed
  });
});
