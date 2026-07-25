#!/usr/bin/env node
import { writeFile } from "node:fs/promises";
import { diagnoseBaserTheme, formatThemeDiagnostic } from "./index.mjs";

const args=process.argv.slice(2);const directory=args.find((value)=>!value.startsWith("--"));
if(!directory){console.error("Usage: node cli.mjs <extracted-baser-theme-directory> [--json file] [--markdown file]");process.exit(1);}
const jsonIndex=args.indexOf("--json");const markdownIndex=args.indexOf("--markdown");
const report=await diagnoseBaserTheme(directory);const markdown=formatThemeDiagnostic(report);
if(jsonIndex>=0&&args[jsonIndex+1])await writeFile(args[jsonIndex+1],JSON.stringify(report,null,2)+"\n");
if(markdownIndex>=0&&args[markdownIndex+1])await writeFile(args[markdownIndex+1],markdown+"\n");
if(jsonIndex<0&&markdownIndex<0)console.log(markdown);
