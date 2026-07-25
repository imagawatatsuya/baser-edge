import { createServer } from "node:http";
import { createApiWorker } from "../apps/api-worker/dist/index.js";
import { CmsService, MemoryCmsStore } from "@baser-edge/content-kernel";

const cms = new CmsService(new MemoryCmsStore());
const worker = createApiWorker(() => cms);
const port = Number(process.env.PORT ?? 8787);

createServer(async (incoming, outgoing) => {
  const chunks = [];
  for await (const chunk of incoming) chunks.push(chunk);
  const body = chunks.length ? Buffer.concat(chunks) : undefined;
  const request = new Request(`http://${incoming.headers.host ?? `localhost:${port}`}${incoming.url ?? "/"}`, {
    method: incoming.method,
    headers: incoming.headers,
    ...(body ? { body, duplex: "half" } : {}),
  });
  const response = await worker.fetch(request, {});
  outgoing.statusCode = response.status;
  const setCookies = typeof response.headers.getSetCookie === "function" ? response.headers.getSetCookie() : [];
  for (const cookie of setCookies) outgoing.appendHeader("set-cookie", cookie);
  response.headers.forEach((value, key) => {
    if (key.toLowerCase() === "set-cookie") return;
    outgoing.setHeader(key, value);
  });
  outgoing.end(Buffer.from(await response.arrayBuffer()));
}).listen(port, () => console.log(`baserEdge API: http://localhost:${port}`));
