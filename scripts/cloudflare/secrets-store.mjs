import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { randomSecret, root } from "./shared.mjs";

export const secretsPath = join(root, "deploy", "cloudflare-secrets.json");

const SECRET_KEYS = [
  "ASSET_UPLOAD_SECRET",
  "PREVIEW_SECRET",
  "MAIL_FORM_SECRET",
  "MAIL_PRIVACY_SALT",
  "BASER_BOOTSTRAP_SECRET",
];

export function ensureSecretsFile() {
  if (existsSync(secretsPath)) return JSON.parse(readFileSync(secretsPath, "utf8"));
  const secrets = Object.fromEntries(SECRET_KEYS.map((k) => [k, randomSecret()]));
  writeFileSync(secretsPath, `${JSON.stringify(secrets, null, 2)}\n`, "utf8");
  console.log("Generated deploy/cloudflare-secrets.json");
  return secrets;
}

export function getBootstrapSecret() {
  return ensureSecretsFile().BASER_BOOTSTRAP_SECRET;
}
