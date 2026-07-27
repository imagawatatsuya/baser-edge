import test from "node:test";
import assert from "node:assert/strict";
import {
  resolvePreviewBaseUrl,
  resolveUploadBaseUrl,
} from "../apps/api-worker/dist/platform-capabilities.js";

const placeholderEnv = {
  PUBLIC_BASE_URL: "https://api.example.invalid",
  PREVIEW_BASE_URL: "https://preview.example.invalid",
};

test("resolveUploadBaseUrl ignores example.invalid and uses request origin", () => {
  const url = new URL("https://baser-edge-api-trial.example.workers.dev/v1/assets/upload-sessions");
  assert.equal(resolveUploadBaseUrl(placeholderEnv, url), "https://baser-edge-api-trial.example.workers.dev");
});

test("resolvePreviewBaseUrl uses real PREVIEW_BASE_URL when set", () => {
  const url = new URL("https://api.test/v1/foo");
  const env = {
    PUBLIC_BASE_URL: "https://api.test",
    PREVIEW_BASE_URL: "https://public-trial.test",
  };
  assert.equal(resolvePreviewBaseUrl(env, url), "https://public-trial.test");
});

test("resolvePreviewBaseUrl falls back to request origin when placeholders only", () => {
  const url = new URL("https://api.test/v1/foo");
  assert.equal(resolvePreviewBaseUrl(placeholderEnv, url), "https://api.test");
});
