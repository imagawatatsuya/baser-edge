import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { buildContext, stableJson } from "./lib/context.mjs";

const root = process.cwd();
const write = process.argv.includes("--write");
const reasonIndex = process.argv.indexOf("--reason");
const reason = reasonIndex >= 0 ? process.argv[reasonIndex + 1] : null;
const snapshotFile = path.join(root, ".agents/context/baseredge-context.snapshot.json");

try {
  const context = buildContext(root);
  if (reason) context.reviewReason = reason;
  if (write) {
    fs.mkdirSync(path.dirname(snapshotFile), { recursive: true });
    fs.writeFileSync(snapshotFile, stableJson(context));
    console.log(`Wrote ${path.relative(root, snapshotFile)}`);
    console.log(`Resolved roles: ${context.roles.filter((r) => r.resolved).length}/${context.roles.length}`);
  } else {
    process.stdout.write(stableJson(context));
  }
} catch (error) {
  console.error(`ERROR: ${error.message}`);
  process.exitCode = 1;
}
