import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { chromium } from "playwright";

const chromePath =
  process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH ??
  "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";

const routes = [
  { label: "コンテンツ", path: "/console/content" },
  { label: "メディア", path: "/console/media" },
  { label: "承認", path: "/console/approvals" },
  { label: "本番未反映", path: "/console/out-of-sync" },
  { label: "ゴミ箱", path: "/console/trash" },
  { label: "カスタム", path: "/console/custom" },
  { label: "メール", path: "/console/mail" },
  { label: "テーマ", path: "/console/themes" },
  { label: "プラグイン", path: "/console/plugins" },
];

const stack = spawn(process.execPath, ["scripts/serve-stack.mjs"], {
  cwd: process.cwd(),
  stdio: ["ignore", "pipe", "pipe"],
});

let stderr = "";
stack.stderr.setEncoding("utf8");
stack.stderr.on("data", (chunk) => {
  stderr += chunk;
});

function waitForStack() {
  return new Promise((resolve, reject) => {
    let stdout = "";
    const timeout = setTimeout(() => {
      reject(new Error(`local stack readiness timed out\n${stdout}\n${stderr}`));
    }, 20_000);

    stack.once("exit", (code) => {
      clearTimeout(timeout);
      reject(new Error(`local stack exited before readiness (${code})\n${stdout}\n${stderr}`));
    });
    stack.stdout.setEncoding("utf8");
    stack.stdout.on("data", (chunk) => {
      stdout += chunk;
      const match = stdout.match(/BASER_STACK_READY api=(\d+) public=(\d+)/);
      if (!match) return;
      clearTimeout(timeout);
      resolve({
        apiPort: Number(match[1]),
        publicPort: Number(match[2]),
      });
    });
  });
}

function summarize(values) {
  const sorted = [...values].sort((a, b) => a - b);
  return {
    minMs: Number(sorted[0].toFixed(1)),
    medianMs: Number(sorted[Math.floor(sorted.length / 2)].toFixed(1)),
    maxMs: Number(sorted.at(-1).toFixed(1)),
  };
}

async function resourceTimings(page) {
  return page.evaluate(() =>
    performance
      .getEntriesByType("resource")
      .filter((entry) => entry.name.includes("/v1/"))
      .map((entry) => ({
        path: new URL(entry.name).pathname,
        durationMs: Number(entry.duration.toFixed(1)),
        transferSize: entry.transferSize,
      })),
  );
}

async function waitForApiQuiet(page, tracker) {
  const timeoutAt = Date.now() + 5_000;
  while (Date.now() < timeoutAt) {
    if (tracker.pending === 0 && Date.now() - tracker.lastActivity >= 50) break;
    await new Promise((resolve) => setTimeout(resolve, 10));
  }
  await page.evaluate(
    () => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))),
  );
}

async function waitForPaint(page) {
  await page.evaluate(
    () => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))),
  );
}

async function measureRoute(page, route, pass) {
  await page.evaluate(() => performance.clearResourceTimings());
  const link = page.getByRole("link", { name: route.label, exact: true });
  if ((await link.count()) !== 1) {
    throw new Error(`sidebar link not unique: ${route.label}`);
  }
  const tracker = { pending: 0, lastActivity: Date.now() };
  const onRequest = (request) => {
    if (!request.url().includes("/v1/")) return;
    tracker.pending += 1;
    tracker.lastActivity = Date.now();
  };
  const onRequestDone = (request) => {
    if (!request.url().includes("/v1/")) return;
    tracker.pending = Math.max(0, tracker.pending - 1);
    tracker.lastActivity = Date.now();
  };
  page.on("request", onRequest);
  page.on("requestfinished", onRequestDone);
  page.on("requestfailed", onRequestDone);
  const started = performance.now();
  try {
    await link.click();
    await page.waitForURL(`**${route.path}`);
    await waitForPaint(page);
    const interactiveMs = performance.now() - started;
    await waitForApiQuiet(page, tracker);
    const settledMs = performance.now() - started;
    return {
      pass,
      label: route.label,
      path: route.path,
      interactiveMs: Number(interactiveMs.toFixed(1)),
      settledMs: Number(settledMs.toFixed(1)),
      api: await resourceTimings(page),
    };
  } finally {
    page.off("request", onRequest);
    page.off("requestfinished", onRequestDone);
    page.off("requestfailed", onRequestDone);
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

  const navigationStarted = performance.now();
  await page.goto(`${origin}/console/`, { waitUntil: "networkidle" });
  const shellLoadMs = performance.now() - navigationStarted;

  const startButton = page.getByRole("button", { name: "管理をはじめる", exact: true });
  await startButton.waitFor({ timeout: 15_000 });
  const loginStarted = performance.now();
  await startButton.click();
  await page.waitForURL("**/console/content");
  await page.waitForLoadState("networkidle");
  const loginToContentMs = performance.now() - loginStarted;

  const measurements = [];
  for (const pass of [1, 2, 3, 4, 5]) {
    for (const route of routes) {
      measurements.push(await measureRoute(page, route, pass));
    }
  }

  const byRoute = routes.map((route) => {
    const rows = measurements.filter((row) => row.path === route.path);
    const first = rows[0];
    const repeat = rows.slice(1);
    return {
      label: route.label,
      path: route.path,
      first: {
        interactiveMs: first.interactiveMs,
        settledMs: first.settledMs,
      },
      repeat: {
        interactive: summarize(repeat.map((row) => row.interactiveMs)),
        settled: summarize(repeat.map((row) => row.settledMs)),
      },
      apiRequests: rows.map((row) => ({
        pass: row.pass,
        count: row.api.length,
        totalDurationMs: Number(row.api.reduce((sum, item) => sum + item.durationMs, 0).toFixed(1)),
        requests: row.api,
      })),
    };
  });

  process.stdout.write(`${JSON.stringify({
    environment: { origin, browser: existsSync(chromePath) ? chromePath : "playwright bundled" },
    shellLoadMs: Number(shellLoadMs.toFixed(1)),
    loginToContentMs: Number(loginToContentMs.toFixed(1)),
    routes: byRoute,
  }, null, 2)}\n`);
} finally {
  if (browser) await browser.close();
  stack.kill();
}
