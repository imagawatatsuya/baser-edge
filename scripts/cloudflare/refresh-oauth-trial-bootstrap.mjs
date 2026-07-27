#!/usr/bin/env node
/** Sets OAuth trial stack id before loading worker refresh (ESM import order). */
process.env.BASER_CF_STACK = "trial";
await import("./refresh-oauth-trial-workers.mjs");
