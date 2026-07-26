import { ensureSecretsFile } from "./secrets-store.mjs";
import { run } from "./shared.mjs";
import { apiWorkerName, publicWorkerName, wranglerApiConfigRel, wranglerPublicConfigRel } from "./stack.mjs";

const SECRET_KEYS = [
  "ASSET_UPLOAD_SECRET",
  "PREVIEW_SECRET",
  "MAIL_FORM_SECRET",
  "MAIL_PRIVACY_SALT",
  "BASER_BOOTSTRAP_SECRET",
];

const OPTIONAL_SECRET_KEYS = [
  "BASER_CF_OAUTH_CLIENT_ID",
  "BASER_CF_OAUTH_CLIENT_SECRET",
];

export function pushApiSecrets() {
  const secrets = ensureSecretsFile();
  for (const key of [...SECRET_KEYS, ...OPTIONAL_SECRET_KEYS]) {
    const value = secrets[key];
    if (!value) continue;
    console.log(`wrangler secret put ${key} (api)…`);
    run("npx", ["wrangler", "secret", "put", key, "--config", wranglerApiConfigRel(), "--name", apiWorkerName()], {
      silent: true,
      stdin: `${value}\n`,
    });
  }
}

export function pushPublicSecrets() {
  const secrets = ensureSecretsFile();
  const publicKeys = ["PREVIEW_SECRET", "MAIL_FORM_SECRET", "MAIL_PRIVACY_SALT"];
  for (const key of publicKeys) {
    const value = secrets[key];
    if (!value) continue;
    console.log(`wrangler secret put ${key} (public)…`);
    run(
      "npx",
      ["wrangler", "secret", "put", key, "--config", wranglerPublicConfigRel(), "--name", publicWorkerName()],
      {
        silent: true,
        stdin: `${value}\n`,
      },
    );
  }
}
