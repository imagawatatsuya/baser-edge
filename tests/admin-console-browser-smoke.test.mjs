/**
 * Browser smoke: built admin SPA must mount editor routes without runtime throws
 * (regression for useBlocker + BrowserRouter white screen).
 */
import test from "node:test";
import assert from "node:assert/strict";
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

test(
  "content tree keeps titles readable and supports overview, search, collapse, and keyboard menus",
  { timeout: 60_000 },
  async () => {
    await runAdminConsoleSmoke({
      consolePath: "/console/content",
      assertLoaded: async (page) => {
        const folder = page.getByRole("button", { name: "Smoke folder、フォルダ、下書き" });
        await folder.waitFor({ timeout: 15_000 });

        const treeWidth = await page.locator(".content-tree-panel").evaluate((node) => node.getBoundingClientRect().width);
        const titleWidth = await page.locator(".tree-link-title", { hasText: "Smoke folder" }).evaluate((node) => node.getBoundingClientRect().width);
        assert.ok(treeWidth >= 360, `tree panel should be at least 360px, got ${treeWidth}`);
        assert.ok(titleWidth >= 120, `tree title should retain readable width, got ${titleWidth}`);

        await folder.click();
        await page.getByRole("heading", { name: "Smoke folder" }).waitFor();
        assert.equal(await folder.getAttribute("aria-current"), "page");
        await page.getByText("/folder", { exact: true }).waitFor();

        const search = page.getByRole("searchbox", { name: "ツリーを検索" });
        await search.fill("Smoke page");
        await page.getByRole("button", { name: "Smoke page、ページ、本番未反映" }).waitFor();
        assert.equal(await page.getByRole("button", { name: "Smoke blog、ブログ、本番未反映" }).count(), 0);
        await page.getByRole("button", { name: "ツリー検索をクリア" }).click();

        await page.getByRole("button", { name: "Smoke folderを折りたたむ" }).click();
        assert.equal(await page.getByRole("button", { name: "Smoke page、ページ、本番未反映" }).count(), 0);
        await page.getByRole("button", { name: "Smoke folderを展開" }).click();

        await page.getByRole("button", { name: "Smoke folderの操作" }).click();
        const menu = page.getByRole("menu", { name: "Smoke folderの操作" });
        await menu.waitFor();
        await page.keyboard.press("End");
        await page.getByRole("menuitem", { name: "削除（ゴミ箱へ）" }).evaluate((node) => {
          if (document.activeElement !== node) throw new Error("End should focus the final menu item");
        });

        await page.setViewportSize({ width: 390, height: 844 });
        const mobileTreeWidth = await page.locator(".content-tree-panel").evaluate((node) => node.getBoundingClientRect().width);
        assert.ok(mobileTreeWidth <= 358, `tree panel should fit the mobile content width, got ${mobileTreeWidth}`);
      },
    });
  },
);
