import { readdir, rm } from "node:fs/promises";
import { join } from "node:path";

for (const root of ["packages", "apps"]) await visit(root);

async function visit(path) {
  let entries;
  try { entries = await readdir(path, { withFileTypes: true }); }
  catch { return; }
  for (const entry of entries) {
    const child = join(path, entry.name);
    if (entry.isDirectory() && entry.name === "dist") {
      await rm(child, { recursive: true, force: true });
    } else if (entry.isDirectory()) {
      await visit(child);
    } else if (entry.name.endsWith(".tsbuildinfo")) {
      await rm(child, { force: true });
    }
  }
}
