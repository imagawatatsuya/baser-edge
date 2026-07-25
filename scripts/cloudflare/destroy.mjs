#!/usr/bin/env node
/**
 * Remove baserEdge proof resources for the current BASER_CF_STACK.
 * Requires: BASER_CF_DESTROY=1 or --yes
 */
import { describeStack, requireDestroyConsent } from "./stack.mjs";
import { runDestroy } from "./run-destroy.mjs";

requireDestroyConsent();

const s = describeStack();
console.log("Destroying stack:", s.stackId);

const { anyRemoved } = await runDestroy();
if (!anyRemoved) {
  console.log("\nNo baserEdge resources were removed (they may already have been deleted).");
} else {
  console.log("\nOther Cloudflare resources were not modified.");
}
