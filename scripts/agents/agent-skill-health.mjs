import { spawnSync } from "node:child_process";
import process from "node:process";

const commands = [
  ["node", ["scripts/validate-agent-skills.mjs"]],
  ["node", ["scripts/agents/verify-cms-knowledge-registry.mjs"]],
  ["node", ["scripts/agents/check-context-drift.mjs", "--strict=blocking"]]
];

for (const [command, args] of commands) {
  console.log(`\n> ${command} ${args.join(" ")}`);
  const result = spawnSync(command, args, { stdio: "inherit", shell: false });
  if (result.status !== 0) process.exit(result.status ?? 1);
}
console.log("\nAgent skill health checks passed.");
