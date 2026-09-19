import { timingSafeEqual } from "node:crypto";
import changeSetSchema from "@lcl/contracts/schemas/ChangeSetProbe.schema.json" with { type: "json" };
import Ajv2020 from "ajv/dist/2020.js";
import _addFormats from "ajv-formats";
// ajv-formats is CJS: under NodeNext the callable is on .default
const addFormats = _addFormats as unknown as typeof _addFormats.default;
import Fastify, { type FastifyInstance } from "fastify";

/**
 * SLICE 0 SKELETON: proves the transport assumptions only (loopback bind, per-launch token, committed JSON Schema
 * used for request validation, SSE). No product routes.
 */
export interface ServerOptions {
  /** per-launch secret; every request must present it (stack decision §5.5) */
  token: string;
}

const safeEqual = (a: string, b: string): boolean => {
  const x = Buffer.from(a);
  const y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
};

export function buildServer({ token }: ServerOptions): FastifyInstance {
  const app = Fastify({ logger: false });
  // Fastify ships a draft-07 Ajv; contracts are JSON Schema 2020-12 (the OpenAPI 3.1 dialect), so route validation needs an explicit compiler.
  const ajv = addFormats(new Ajv2020.default({ strict: true, allowUnionTypes: true }));
  app.setValidatorCompiler(({ schema }) => ajv.compile(schema as object));

  app.addHook("onRequest", async (req, reply) => {
    const presented = req.headers["x-lcl-token"];
    if (typeof presented !== "string" || !safeEqual(presented, token)) return reply.code(401).send({ error: "unauthorized" });
    return undefined;
  });

  app.get("/health", async () => ({ ok: true }));

  app.post("/probe/changesets", { schema: { body: changeSetSchema } }, async () => ({ accepted: true }));

  app.get("/events", (_req, reply) => {
    reply.hijack();
    const res = reply.raw;
    res.writeHead(200, { "content-type": "text/event-stream", "cache-control": "no-cache", connection: "keep-alive" });
    let n = 0;
    const t = setInterval(() => {
      res.write(`id: ${n}\nevent: tick\ndata: ${JSON.stringify({ n })}\n\n`);
      if (++n === 3) {
        clearInterval(t);
        res.end();
      }
    }, 20);
    res.on("close", () => clearInterval(t));
  });

  return app;
}
