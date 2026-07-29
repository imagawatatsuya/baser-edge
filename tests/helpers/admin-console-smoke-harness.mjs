/**
 * Shared Playwright harness for built admin-web smoke tests.
 */
import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { createAdminDistServer, listenAdminDistServer } from "../../scripts/serve-admin-dist.mjs";
import {
  SMOKE_CONTENT_ID,
  SMOKE_DEFINITION_ID,
  SMOKE_ENTRY_ID,
  smokeCapabilities,
  smokeContentTree,
  smokeCustomContentsList,
  smokeCustomEntriesList,
  smokeCustomEntrySnapshot,
  smokeSession,
  smokeSnapshot,
  SMOKE_SITE_ID,
} from "../fixtures/admin-console-smoke-fixtures.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const adminDistIndex = join(root, "apps", "admin-web", "dist", "index.html");
const systemChrome = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";

export function assertAdminWebBuilt() {
  assert.ok(
    existsSync(adminDistIndex),
    "admin-web dist missing — npm test runs build:admin-web first",
  );
}

export async function loadPlaywrightChromium() {
  try {
    const { chromium } = await import("playwright");
    return chromium;
  } catch {
    assert.fail("playwright is required — npm install && npx playwright install chromium");
  }
}

export async function runAdminConsoleSmoke({ consolePath, assertLoaded }) {
  assertAdminWebBuilt();
  const chromium = await loadPlaywrightChromium();

  const { server } = createAdminDistServer();
  const baseUrl = await listenAdminDistServer(server);
  let browser;
  const pageErrors = [];

  try {
    const executablePath = process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH
      ?? (existsSync(systemChrome) ? systemChrome : undefined);
    browser = await chromium.launch({
      headless: true,
      ...(executablePath ? { executablePath } : {}),
    });
    const page = await browser.newPage();
    page.on("pageerror", (err) => pageErrors.push(String(err)));

    await page.route("**/v1/**", async (route) => {
      const path = new URL(route.request().url()).pathname;
      const json = (body, status = 200) =>
        route.fulfill({
          status,
          contentType: "application/json",
          body: JSON.stringify(body),
        });

      if (path === "/v1/auth/session") return json({});
      if (path === "/v1/console/capabilities") return json(smokeCapabilities);
      if (path === `/v1/sites/${SMOKE_SITE_ID}/content-tree`) return json(smokeContentTree);
      if (path === `/v1/content/${SMOKE_CONTENT_ID}`) return json(smokeSnapshot);
      if (path === `/v1/content/${SMOKE_CONTENT_ID}/editor`) {
        return json({ snapshot: smokeSnapshot, articleMeta: null });
      }
      if (path === `/v1/custom-contents/${SMOKE_DEFINITION_ID}/entries`) {
        return json(smokeCustomEntriesList);
      }
      if (path === `/v1/custom-entries/${SMOKE_ENTRY_ID}`) return json(smokeCustomEntrySnapshot);
      if (path === `/v1/sites/${SMOKE_SITE_ID}/custom-contents`) return json(smokeCustomContentsList);
      if (path.endsWith("/article-meta")) return json({ error: { code: "NOT_FOUND" } }, 404);
      return json({});
    });

    await page.addInitScript((session) => {
      localStorage.setItem("baser-admin-session", JSON.stringify(session));
      localStorage.setItem("baser_csrf", "smoke-csrf");
      document.cookie = "baser_csrf=smoke-csrf; path=/";
    }, smokeSession);

    await page.goto(`${baseUrl}${consolePath}`, { waitUntil: "networkidle" });

    assert.equal(pageErrors.length, 0, `page errors:\n${pageErrors.join("\n")}`);
    assert.equal(await page.getByTestId("console-fatal-error").count(), 0, "error boundary visible");

    await assertLoaded(page);
  } finally {
    if (browser) await browser.close();
    await new Promise((resolve, reject) => server.close((err) => (err ? reject(err) : resolve())));
  }
}
