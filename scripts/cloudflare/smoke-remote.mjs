#!/usr/bin/env node
/** Re-run authenticated smoke against an existing prove:cloudflare deployment. */
import { loadState } from "./shared.mjs";
import { smokeLoginAndPublish } from "./remote-demo.mjs";

const state = loadState();
if (!state?.demoHint || !state.publicUrl) {
  throw new Error("Run npm run prove:cloudflare first (needs deploy/cloudflare-state.json with demoHint).");
}

const health = await fetch(`${state.apiUrl.replace(/\/$/, "")}/health`);
if (!health.ok) throw new Error(`/health ${health.status}`);

const published = await smokeLoginAndPublish(state.demoHint, state.publicUrl);
console.log("smoke:cloudflare OK", published.publicUrl);
