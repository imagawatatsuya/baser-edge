/**
 * Workers.dev can serve a previous script revision briefly after deploy.
 */
export async function waitForInstantLogin(apiUrl, { attempts = 15, delayMs = 2000, log } = {}) {
  const base = apiUrl.replace(/\/$/, "");
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    const entry = await fetch(`${base}/v1/auth/instant-entry`);
    const entryBody = await entry.json().catch(() => ({}));
    if (entryBody?.available === true) {
      return true;
    }
    const response = await fetch(`${base}/v1/auth/instant-login`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: "{}",
    });
    if (response.status !== 404) {
      return true;
    }
    const body = await response.json().catch(() => ({}));
    if (body?.error?.code === "INSTANT_LOGIN_DISABLED") {
      return false;
    }
    if (attempt < attempts) {
      log?.(`Instant login not ready (404); retry ${attempt}/${attempts}…`);
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
  }
  return false;
}
