import { readFileSync, writeFileSync } from "node:fs";
import { wranglerApiPath } from "./shared.mjs";
import { wranglerApiConfigRel } from "./stack.mjs";

export function patchWranglerApiUrls(apiUrl, publicUrl) {
  const file = wranglerApiPath();
  const api = apiUrl.replace(/\/$/, "");
  const pub = publicUrl.replace(/\/$/, "");
  const host = new URL(api).hostname;
  let text = readFileSync(file, "utf8");
  text = setVar(text, "PUBLIC_BASE_URL", api);
  text = setVar(text, "PREVIEW_BASE_URL", pub);
  if (/"BASER_AUTH_ORIGIN"/.test(text)) {
    text = setVar(text, "BASER_AUTH_ORIGIN", api);
  }
  if (/"BASER_AUTH_RP_ID"/.test(text)) {
    text = setVar(text, "BASER_AUTH_RP_ID", host);
  } else {
    text = text.replace(
      `"PLUGIN_OUTBOUND_POLICY_ENFORCED": "false"`,
      `"PLUGIN_OUTBOUND_POLICY_ENFORCED": "false",\n    "BASER_AUTH_RP_ID": "${host}",\n    "BASER_AUTH_ORIGIN": "${api}"`,
    );
  }
  writeFileSync(file, text, "utf8");
}

export function patchInstantLogin(ownerHint) {
  const file = wranglerApiPath();
  let text = readFileSync(file, "utf8");
  text = setVar(text, "BASER_INSTANT_LOGIN", "true");
  const json = JSON.stringify(ownerHint).replace(/\\/g, "\\\\").replace(/"/g, '\\"');
  text = setVar(text, "BASER_INSTANT_OWNER_HINT", json);
  writeFileSync(file, text, "utf8");
}

export function extractWorkerUrl(output, workerName) {
  const urls = [...output.matchAll(/https:\/\/[a-z0-9-]+(?:\.[a-z0-9-]+)*\.workers\.dev/gi)].map((m) => m[0]);
  return urls.find((u) => u.includes(workerName)) ?? urls[0] ?? null;
}

function setVar(text, key, value) {
  const escaped = value.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
  const re = new RegExp(`"${key}":\\s*"[^"]*"`);
  if (!re.test(text)) throw new Error(`${wranglerApiConfigRel()} missing var "${key}"`);
  return text.replace(re, `"${key}": "${escaped}"`);
}
