#!/usr/bin/env node
import { readFile, writeFile } from "node:fs/promises";
import { importBurgerEditorHtml } from "./index.mjs";

const [input, output] = process.argv.slice(2);
if (!input || !output) {
  console.error("Usage: node tools/burger-editor-importer/cli.mjs input.html output.json");
  process.exit(2);
}
const result = importBurgerEditorHtml(await readFile(input, "utf8"));
await writeFile(output, `${JSON.stringify(result, null, 2)}\n`, "utf8");
console.log(`Imported ${result.report.sourceBlockCount} BurgerEditor blocks with ${result.report.warnings.length} warnings.`);
