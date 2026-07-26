import { createServer } from "node:http";
import { readStackLocalEnv } from "./stack-local-env.mjs";
import { STACK_DEFAULT_API_PORT } from "./stack-port-utils.mjs";

const port = Number(process.env.PORT ?? 4173);
const stack = readStackLocalEnv();
const stackConsole =
  process.env.BASER_STACK_CONSOLE_URL
  ?? (stack?.apiOrigin ? `${stack.apiOrigin}/console/` : `http://localhost:${STACK_DEFAULT_API_PORT}/console/`);

createServer((_request, response) => {
  response.writeHead(302, { location: stackConsole });
  response.end(`Redirecting to ${stackConsole}\n`);
}).listen(port, () => {
  console.log(`apps/admin は廃止済みです。リダイレクト先: ${stackConsole}`);
  console.log(`（フルスタックは npm run dev:stack。ポートは起動ログの管理画面 URL を参照）`);
});
