#!/usr/bin/env node
/**
 * Bind the sole workspace owner to your Cloudflare account (one-time).
 * Authenticates via browser (wrangler login); optional env overrides account/email.
 */
import { getBootstrapSecret } from "./secrets-store.mjs";
import {
  ensureLoggedInWithBrowser,
  loadState,
  openInBrowser,
  readWranglerWhoami,
} from "./shared.mjs";

const apiUrl = (loadState()?.apiUrl ?? process.env.BASER_API_URL ?? "").replace(/\/$/, "");
if (!apiUrl) throw new Error("Missing apiUrl in deploy/cloudflare-state.json or BASER_API_URL");

ensureLoggedInWithBrowser();
const whoami = readWranglerWhoami();
if (!whoami?.loggedIn) {
  throw new Error("Cloudflare CLI login failed. Run: npx wrangler login");
}

const accountId = (process.env.BASER_CF_ACCOUNT_ID?.trim() ?? whoami.accounts?.[0]?.id ?? "").replace(/-/g, "");
const email = (process.env.BASER_CF_OWNER_EMAIL?.trim() ?? whoami.email ?? "").trim().toLowerCase();
if (!accountId || !email) {
  throw new Error("Could not resolve Cloudflare account id and email from wrangler whoami");
}

console.log("Binding Cloudflare owner to workspace (account id + email from your CLI session)…");

const res = await fetch(`${apiUrl}/v1/bootstrap/cloudflare-owner`, {
  method: "POST",
  headers: {
    "content-type": "application/json",
    "x-baser-bootstrap-secret": getBootstrapSecret(),
  },
  body: JSON.stringify({ cloudflareAccountId: accountId, cloudflareOwnerEmail: email }),
});
const body = await res.json();
if (!res.ok) throw new Error(JSON.stringify(body));

console.log("Cloudflare owner bound.");
const loginUrl = `${apiUrl}/console/login`;
console.log(`Open CMS login: ${loginUrl}`);
openInBrowser(loginUrl);
