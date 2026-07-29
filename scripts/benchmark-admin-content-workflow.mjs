import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { chromium } from "playwright";

const chromePath = process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH
  ?? "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const stack = spawn(process.execPath, ["scripts/serve-stack.mjs"], {
  cwd: process.cwd(),
  stdio: ["ignore", "pipe", "pipe"],
});

function waitForStack() {
  return new Promise((resolve, reject) => {
    let output = "";
    const timer = setTimeout(() => reject(new Error(`local stack readiness timed out\n${output}`)), 20_000);
    stack.stdout.setEncoding("utf8");
    stack.stderr.setEncoding("utf8");
    stack.stdout.on("data", (chunk) => {
      output += chunk;
      const match = output.match(/BASER_STACK_READY api=(\d+) public=(\d+)/);
      if (!match) return;
      clearTimeout(timer);
      resolve({ apiPort: Number(match[1]), publicPort: Number(match[2]) });
    });
    stack.stderr.on("data", (chunk) => { output += chunk; });
    stack.once("exit", (code) => {
      clearTimeout(timer);
      reject(new Error(`local stack exited before readiness (${code})\n${output}`));
    });
  });
}

function createApiTracker(page) {
  const tracker = { pending: 0, lastActivity: Date.now(), requests: [] };
  const onRequest = (request) => {
    if (!request.url().includes("/v1/")) return;
    tracker.pending += 1;
    tracker.lastActivity = Date.now();
  };
  const onResponse = async (response) => {
    if (!response.url().includes("/v1/")) return;
    tracker.pending = Math.max(0, tracker.pending - 1);
    tracker.lastActivity = Date.now();
    const timing = (await response.allHeaders())["server-timing"] ?? "";
    tracker.requests.push({
      path: new URL(response.url()).pathname,
      status: response.status(),
      serverTiming: timing,
    });
  };
  const onFailed = (request) => {
    if (!request.url().includes("/v1/")) return;
    tracker.pending = Math.max(0, tracker.pending - 1);
    tracker.lastActivity = Date.now();
  };
  page.on("request", onRequest);
  page.on("response", onResponse);
  page.on("requestfailed", onFailed);
  return {
    tracker,
    dispose() {
      page.off("request", onRequest);
      page.off("response", onResponse);
      page.off("requestfailed", onFailed);
    },
  };
}

async function waitForApiQuiet(tracker) {
  const deadline = Date.now() + 10_000;
  while (Date.now() < deadline) {
    if (tracker.pending === 0 && Date.now() - tracker.lastActivity >= 80) return;
    await new Promise((resolve) => setTimeout(resolve, 10));
  }
  throw new Error(`API did not become quiet (${tracker.pending} pending)`);
}

async function measure(page, action, settled) {
  const { tracker, dispose } = createApiTracker(page);
  const startedAt = performance.now();
  try {
    await action();
    const interactiveMs = performance.now() - startedAt;
    await settled();
    await waitForApiQuiet(tracker);
    return {
      interactiveMs: Number(interactiveMs.toFixed(1)),
      settledMs: Number((performance.now() - startedAt).toFixed(1)),
      apiRequests: tracker.requests,
    };
  } finally {
    dispose();
  }
}

let browser;
try {
  const { apiPort } = await waitForStack();
  const origin = `http://localhost:${apiPort}`;
  browser = await chromium.launch({
    headless: true,
    ...(existsSync(chromePath) ? { executablePath: chromePath } : {}),
  });
  const context = await browser.newContext();
  const page = await context.newPage();
  await page.goto(`${origin}/console/`, { waitUntil: "networkidle" });
  await page.getByRole("button", { name: "管理をはじめる", exact: true }).click();
  await page.waitForURL("**/console/content");

  const suffix = Date.now().toString(36);
  await page.getByRole("button", { name: "ブログを追加", exact: true }).click();
  const blogModal = page.locator("form.modal").filter({ has: page.getByRole("heading", { name: "ブログを追加" }) });
  await blogModal.getByLabel("タイトル").fill(`速度計測ブログ ${suffix}`);
  await blogModal.getByLabel("URLスラッグ").fill(`perf-${suffix}`);
  await blogModal.getByRole("button", { name: "作成", exact: true }).click();
  await blogModal.waitFor({ state: "hidden" });

  const articleButton = page.getByRole("button", { name: "記事を追加", exact: true });
  const articleModalOpen = await measure(
    page,
    () => articleButton.hover(),
    async () => {
      await articleButton.click();
      await page.getByRole("heading", { name: "記事の下書き" }).waitFor();
    },
  );
  const articleModal = page.locator("form.modal").filter({ has: page.getByRole("heading", { name: "記事の下書き" }) });
  await articleModal.getByLabel("ブログ").selectOption({ label: `速度計測ブログ ${suffix}` });
  await articleModal.getByLabel("タイトル").fill(`速度計測記事 ${suffix}`);
  await articleModal.getByLabel("URLスラッグ").fill(`entry-${suffix}`);
  const articleCreate = await measure(
    page,
    () => articleModal.getByRole("button", { name: "下書きを作成", exact: true }).click(),
    async () => {
      await page.waitForURL(/\/console\/content\/(?:content|cnt)_/);
      await page.getByLabel("タイトル").waitFor();
    },
  );

  const title = page.getByLabel("タイトル");
  await title.fill(`${await title.inputValue()} 更新`);
  const popupPromise = page.waitForEvent("popup");
  const previewStartedAt = performance.now();
  await page.getByRole("button", { name: "下書きを確認", exact: true }).click();
  const previewPage = await popupPromise;
  const immediateFeedbackMs = performance.now() - previewStartedAt;
  const previewResponsePromise = previewPage.waitForResponse((response) =>
    new URL(response.url()).pathname.startsWith("/_preview/"),
  );
  const previewResponse = await previewResponsePromise;
  await previewPage.waitForLoadState("domcontentloaded");
  const draftPreview = {
    immediateFeedbackMs: Number(immediateFeedbackMs.toFixed(1)),
    loadedMs: Number((performance.now() - previewStartedAt).toFixed(1)),
    status: previewResponse.status(),
    serverTiming: (await previewResponse.allHeaders())["server-timing"] ?? "",
  };

  process.stdout.write(`${JSON.stringify({
    environment: { origin, browser: existsSync(chromePath) ? chromePath : "playwright bundled" },
    articleModalOpen,
    articleCreate,
    draftPreview,
  }, null, 2)}\n`);
} finally {
  if (browser) await browser.close();
  stack.kill();
}
