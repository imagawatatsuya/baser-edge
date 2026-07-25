import { createServer } from "node:http";

const port = Number(process.env.PORT ?? 4173);
const stackConsole = process.env.BASER_STACK_CONSOLE_URL ?? "http://localhost:8787/console/";

createServer((_request, response) => {
  response.writeHead(302, { location: stackConsole });
  response.end(`Redirecting to ${stackConsole}\n`);
}).listen(port, () => {
  console.log(`apps/admin は廃止済みです。リダイレクト先: ${stackConsole}`);
  console.log(`（フルスタックは npm run dev:stack → http://localhost:8787/console/）`);
});
