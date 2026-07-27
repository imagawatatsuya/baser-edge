import test from "node:test";
import assert from "node:assert/strict";
import { DomainError } from "@baser-edge/core-types";
import {
  applyOperations,
  createBlock,
  createDefaultComponentRegistry,
  createEmptyDocument,
  diffDocuments,
  validateDocument,
} from "@baser-edge/structured-document";

const registry = createDefaultComponentRegistry();

test("typed block operations preserve stable ids and validate props", () => {
  const document = createEmptyDocument();
  const heading = createBlock("heading", { level: 2, text: "旧見出し" });
  const body = createBlock("richText", { paragraphs: ["本文"] });
  const next = applyOperations(document, [
    { kind: "insert", parentId: "root", slot: "body", index: 0, block: heading },
    { kind: "insert", parentId: "root", slot: "body", index: 1, block: body },
    { kind: "updateProps", blockId: heading.id, patch: { text: "新見出し" } },
  ], registry);

  assert.equal(next.root.slots.body?.[0]?.id, heading.id);
  assert.equal(next.root.slots.body?.[0]?.props.text, "新見出し");
  assert.equal(validateDocument(next, registry).valid, true);

  const diff = diffDocuments(document, next);
  assert.deepEqual(new Set(diff.added), new Set([heading.id, body.id]));
});

test("unknown components are preserved without being treated as validation errors", () => {
  const document = createEmptyDocument();
  const legacy = createBlock("legacyBurgerBlock", { burgerType: "image-text2", rawHtml: "<div>legacy</div>" });
  const next = applyOperations(document, [{ kind: "insert", parentId: "root", slot: "body", index: 0, block: legacy }], registry);
  const validation = validateDocument(next, registry);
  assert.equal(validation.valid, true);
  assert.equal(validation.unknownComponents[0]?.id, legacy.id);
});

test("moving a block into its descendant is rejected", () => {
  const document = createEmptyDocument();
  const container = createBlock("legacyContainer", {}, { body: [] });
  const child = createBlock("heading", { level: 2, text: "child" });
  container.slots.body.push(child);
  const withContainer = applyOperations(document, [{ kind: "insert", parentId: "root", slot: "body", index: 0, block: container }], registry);
  assert.throws(() => applyOperations(withContainer, [{ kind: "move", blockId: container.id, parentId: child.id, slot: "body", index: 0 }], registry), /descendant/);
});

test("image v2 rejects non-decorative image without alt", () => {
  const document = createEmptyDocument();
  const image = createBlock("image", { assetId: "asset-1", decorative: false, alt: "" });
  assert.throws(
    () => applyOperations(document, [{ kind: "insert", parentId: "root", slot: "body", index: 0, block: image }], registry),
    (error) => error instanceof DomainError && error.code === "INVALID_DOCUMENT",
  );
});

test("image v2 accepts decorative image with empty alt", () => {
  const document = createEmptyDocument();
  const image = createBlock("image", { assetId: "asset-1", decorative: true, alt: "" });
  const next = applyOperations(document, [{ kind: "insert", parentId: "root", slot: "body", index: 0, block: image }], registry);
  assert.equal(validateDocument(next, registry).valid, true);
});

test("safeEmbed v2 requires iframe title", () => {
  const document = createEmptyDocument();
  const embed = createBlock("safeEmbed", { provider: "youtube", url: "https://www.youtube.com/embed/dQw4w9WgXcQ" });
  assert.throws(
    () => applyOperations(document, [{ kind: "insert", parentId: "root", slot: "body", index: 0, block: embed }], registry),
    (error) => error instanceof DomainError && error.code === "INVALID_DOCUMENT",
  );
});

test("safeEmbed v2 accepts titled embed", () => {
  const document = createEmptyDocument();
  const embed = createBlock("safeEmbed", {
    provider: "youtube",
    url: "https://www.youtube.com/embed/dQw4w9WgXcQ",
    title: "Sample video",
  });
  const next = applyOperations(document, [{ kind: "insert", parentId: "root", slot: "body", index: 0, block: embed }], registry);
  assert.equal(validateDocument(next, registry).valid, true);
});

test("v1 image blocks remain valid", () => {
  const document = createEmptyDocument();
  const image = createBlock("image", { assetId: "asset-1", alt: "" }, {}, 1);
  const next = applyOperations(document, [{ kind: "insert", parentId: "root", slot: "body", index: 0, block: image }], registry);
  assert.equal(validateDocument(next, registry).valid, true);
});
