import { createServer } from "node:http";

/**
 * @param {number} port
 * @returns {Promise<boolean>}
 */
export function isPortAvailable(port) {
  return new Promise((resolve) => {
    const server = createServer();
    server.once("error", () => resolve(false));
    server.listen(port, () => server.close(() => resolve(true)));
  });
}

/**
 * @param {number} preferred
 * @param {{ exclude?: Set<number>; maxScan?: number }} [options]
 * @returns {Promise<number>}
 */
export async function findAvailablePort(preferred, options = {}) {
  const exclude = options.exclude ?? new Set();
  const maxScan = options.maxScan ?? 200;
  for (let offset = 0; offset < maxScan; offset += 1) {
    const port = preferred + offset;
    if (exclude.has(port)) continue;
    if (await isPortAvailable(port)) return port;
  }
  throw new Error(`No free TCP port found near ${preferred} (scanned ${maxScan} ports)`);
}

const DEFAULT_API_PORT = 8787;
const DEFAULT_PUBLIC_PORT = 8788;

/**
 * Resolves API + public ports. Honors BASER_STACK_API_PORT / BASER_STACK_PUBLIC_PORT as
 * preferred starts; scans upward when busy.
 * @returns {Promise<{ apiPort: number; publicPort: number; apiPreferred: number; publicPreferred: number }>}
 */
export async function resolveStackPorts() {
  const apiPreferred = Number(process.env.BASER_STACK_API_PORT ?? DEFAULT_API_PORT);
  const publicPreferred = Number(process.env.BASER_STACK_PUBLIC_PORT ?? DEFAULT_PUBLIC_PORT);
  if (!Number.isInteger(apiPreferred) || apiPreferred < 1 || apiPreferred > 65535) {
    throw new Error("BASER_STACK_API_PORT must be a valid port number");
  }
  if (!Number.isInteger(publicPreferred) || publicPreferred < 1 || publicPreferred > 65535) {
    throw new Error("BASER_STACK_PUBLIC_PORT must be a valid port number");
  }
  const apiPort = await findAvailablePort(apiPreferred);
  const publicPort = await findAvailablePort(publicPreferred, { exclude: new Set([apiPort]) });
  return { apiPort, publicPort, apiPreferred, publicPreferred };
}

export const STACK_DEFAULT_API_PORT = DEFAULT_API_PORT;
export const STACK_DEFAULT_PUBLIC_PORT = DEFAULT_PUBLIC_PORT;
