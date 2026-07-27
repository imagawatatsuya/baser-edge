/**
 * Browser smoke: built admin SPA must mount editor routes without runtime throws
 * (regression for useBlocker + BrowserRouter white screen).
 */
import test from "node:test";
import {
  SMOKE_CONTENT_ID,
  SMOKE_DEFINITION_ID,
  SMOKE_ENTRY_ID,
} from "./fixtures/admin-console-smoke-fixtures.mjs";
import { runAdminConsoleSmoke } from "./helpers/admin-console-smoke-harness.mjs";

test(
  "built admin console mounts content editor route without page errors",
  { timeout: 60_000 },
  async () => {
    await runAdminConsoleSmoke({
      consolePath: `/console/content/${SMOKE_CONTENT_ID}`,
      assertLoaded: async (page) => {
        await page.getByRole("button", { name: "サイトに反映" }).waitFor({ timeout: 15_000 });
      },
    });
  },
);

test(
  "built admin console mounts custom entry editor route without page errors",
  { timeout: 60_000 },
  async () => {
    await runAdminConsoleSmoke({
      consolePath: `/console/custom/${SMOKE_DEFINITION_ID}/entries/${SMOKE_ENTRY_ID}`,
      assertLoaded: async (page) => {
        await page.getByRole("button", { name: "サイトに反映" }).waitFor({ timeout: 15_000 });
        await page.getByRole("heading", { name: "smoke-entry" }).waitFor({ timeout: 15_000 });
      },
    });
  },
);
