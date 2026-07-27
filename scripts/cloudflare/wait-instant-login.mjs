/**
 * Workers.dev can serve a previous script revision briefly after deploy.
 */
export async function waitForInstantLogin(apiUrl, { attempts = 15, delayMs = 2000, log } = {}) {
  const base = apiUrl.replace(/\/$/, "");
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    const response = await fetch(`${base}/v1/auth/instant-login`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: "{}",
    });
    if (response.status !== 404) {
      return true;
    }
    if (attempt < attempts) {
      log?.(`Instant login not ready (404); retry ${attempt}/${attempts}…`);
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
  }
  return false;
}
