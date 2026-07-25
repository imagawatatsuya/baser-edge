import { test } from "node:test";
import assert from "node:assert/strict";
import {
  d1DatabaseIdFromListJson,
  parseD1DatabaseIdFromOutput,
} from "../scripts/cloudflare/parse-d1-id.mjs";

const sampleId = "6972d2f2-909e-4c76-b163-51a37087e3cd";

test("parseD1DatabaseIdFromOutput accepts wrangler 4 JSON snippet", () => {
  const out = `
{
  "database_name": "baser-edge",
  "database_id": "${sampleId}"
}
`;
  assert.equal(parseD1DatabaseIdFromOutput(out), sampleId);
});

test("parseD1DatabaseIdFromOutput accepts legacy database_id=", () => {
  assert.equal(parseD1DatabaseIdFromOutput(`database_id = ${sampleId}`), sampleId);
});

test("d1DatabaseIdFromListJson finds by name", () => {
  const rows = [{ uuid: sampleId, name: "baser-edge" }];
  assert.equal(d1DatabaseIdFromListJson(rows, "baser-edge"), sampleId);
  assert.equal(d1DatabaseIdFromListJson(rows, "other"), null);
});
