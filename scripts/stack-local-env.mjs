import { existsSync, readFileSync } from "node:fs";
import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = join(fileURLToPath(new URL("..", import.meta.url)));

export function stackLocalEnvPath() {
  return join(repoRoot, ".baser", "stack-local-env.json");
}

/**
 * @param {{ apiPort: number; publicPort: number }} ports
 */
export async function writeStackLocalEnv({ apiPort, publicPort }) {
  const dir = join(repoRoot, ".baser");
  await mkdir(dir, { recursive: true });
  const payload = {
    apiPort,
    publicPort,
    apiOrigin: `http://localhost:${apiPort}`,
    publicOrigin: `http://localhost:${publicPort}`,
  };
  await writeFile(stackLocalEnvPath(), `${JSON.stringify(payload, null, 2)}\n`, "utf8");
}

export function readStackLocalEnv() {
  try {
    const path = stackLocalEnvPath();
    if (!existsSync(path)) return null;
    return JSON.parse(readFileSync(path, "utf8"));
  } catch {
    return null;
  }
}
