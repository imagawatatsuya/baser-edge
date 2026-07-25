import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  preparePublicSnapshot,
  scrubPublicMarkdown,
  verifyPublicSnapshot,
} from "../scripts/release/prepare-public-snapshot.mjs";

const root = join(fileURLToPath(new URL(".", import.meta.url)), "..");
const snapshotDir = join(root, "release", "public-snapshot-test");

test("scrubPublicMarkdown removes internal links and sections", () => {
  const sample = `## 正本

[checklist](../internal/release-checklist.md)

## 内部メモ（製品仕様ではない）

secret stuff

## ADR

ok
`;
  const out = scrubPublicMarkdown("docs/README.md", sample);
  assert.doesNotMatch(out, /internal/);
  assert.match(out, /## ADR/);
});

test("preparePublicSnapshot excludes internal docs and passes verification", async () => {
  await preparePublicSnapshot({ outDir: snapshotDir, initGit: false });
  const problems = await verifyPublicSnapshot(snapshotDir);
  assert.deepEqual(problems, []);
  assert.equal(existsSync(join(snapshotDir, "docs", "internal")), false);
  assert.equal(
    existsSync(join(snapshotDir, "docs", "deployment", "private-repo-until-launch.md")),
    false,
  );
  const readme = readFileSync(join(snapshotDir, "README.md"), "utf8");
  assert.doesNotMatch(readme, /docs\/internal/);
  const docsReadme = readFileSync(join(snapshotDir, "docs", "README.md"), "utf8");
  assert.doesNotMatch(docsReadme, /internal\/README/);
});
