#!/usr/bin/env node
/**
 * Open the CMS login page in the default browser (no secrets read from disk).
 * Optional: BASER_API_URL or deploy/cloudflare-state.json apiUrl.
 */
import { ensureLoggedInWithBrowser, loadState, openInBrowser } from "./shared.mjs";

const apiUrl = (loadState()?.apiUrl ?? process.env.BASER_API_URL ?? "").replace(/\/$/, "");
if (!apiUrl) {
  throw new Error("Missing apiUrl in deploy/cloudflare-state.json or BASER_API_URL");
}

ensureLoggedInWithBrowser();
const loginUrl = `${apiUrl}/console/login`;
console.log(`Opening ${loginUrl}`);
openInBrowser(loginUrl);
