#!/usr/bin/env node
import { writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { diagnoseBaserPlugin, renderPluginDiagnosticMarkdown } from "./index.mjs";
const args=process.argv.slice(2);const root=args[0];if(!root){console.error("Usage: npm run diagnose:plugin -- /path/to/plugin [--json report.json] [--markdown report.md]");process.exit(2);}const option=(name)=>{const i=args.indexOf(name);return i>=0?args[i+1]:null;};
const report=await diagnoseBaserPlugin(resolve(root));const json=JSON.stringify(report,null,2);const jsonOut=option("--json"),mdOut=option("--markdown");if(jsonOut)await writeFile(resolve(jsonOut),json+"\n");if(mdOut)await writeFile(resolve(mdOut),renderPluginDiagnosticMarkdown(report)+"\n");if(!jsonOut&&!mdOut)console.log(json);
