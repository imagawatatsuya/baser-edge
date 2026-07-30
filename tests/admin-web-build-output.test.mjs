import { test } from "node:test";
import assert from "node:assert/strict";
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { publishAdminBuild } from "../apps/admin-web/build-output.mjs";

function fixture() {
  const root = mkdtempSync(join(tmpdir(), "baser-edge-admin-build-"));
  const stagingDir = join(root, "staging");
  const distDir = join(root, "dist");
  mkdirSync(join(stagingDir, "assets"), { recursive: true });
  writeFileSync(
    join(stagingDir, "index.html"),
    '<script type="module" src="/console/assets/current.js"></script>',
  );
  writeFileSync(join(stagingDir, "assets", "current.js"), "console.log('current');");
  return { root, stagingDir, distDir };
}

test("publishAdminBuild writes the Workers Static Assets layout without replacing dist/console", () => {
  const { root, stagingDir, distDir } = fixture();
  const copied = [];
  try {
    mkdirSync(join(distDir, "console", "assets"), { recursive: true });
    writeFileSync(join(distDir, "console", "assets", "stale.js"), "stale");

    const result = publishAdminBuild({
      stagingDir,
      distDir,
      copyFile(source, destination) {
        copied.push(destination);
        writeFileSync(destination, readFileSync(source));
      },
    });

    assert.equal(
      readFileSync(join(distDir, "index.html"), "utf8"),
      '<script type="module" src="/console/assets/current.js"></script>',
    );
    assert.equal(
      readFileSync(join(distDir, "console", "assets", "current.js"), "utf8"),
      "console.log('current');",
    );
    assert.equal(existsSync(join(distDir, "console", "assets", "stale.js")), false);
    assert.equal(result.stagedAssetCount, 1);
    assert.deepEqual(copied, [
      join(distDir, "console", "assets", "current.js"),
      join(distDir, "index.html"),
    ]);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("publishAdminBuild tolerates EPERM while removing a stale Windows asset", () => {
  const { root, stagingDir, distDir } = fixture();
  const warnings = [];
  try {
    const stale = join(distDir, "console", "assets", "stale.js");
    mkdirSync(join(distDir, "console", "assets"), { recursive: true });
    writeFileSync(stale, "locked");

    assert.doesNotThrow(() => publishAdminBuild({
      stagingDir,
      distDir,
      removeFile(path) {
        const error = new Error(`locked: ${path}`);
        error.code = "EPERM";
        throw error;
      },
      logger: { warn(message) { warnings.push(message); } },
    }));

    assert.equal(existsSync(stale), true);
    assert.equal(existsSync(join(distDir, "console", "assets", "current.js")), true);
    assert.match(warnings[0], /temporarily locked/);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("publishAdminBuild rejects an incomplete staging build", () => {
  const root = mkdtempSync(join(tmpdir(), "baser-edge-admin-build-missing-"));
  try {
    assert.throws(
      () => publishAdminBuild({
        stagingDir: join(root, "staging"),
        distDir: join(root, "dist"),
      }),
      /missing index\.html/,
    );
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});
