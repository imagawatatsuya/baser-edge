import test from "node:test";
import assert from "node:assert/strict";
import { importBurgerEditorHtml } from "../tools/burger-editor-importer/index.mjs";

test("BurgerEditor importer maps known blocks and preserves unknown blocks", () => {
  const html = `
    <div data-bgb="title-h2"><div data-bgt="title-h2"><h2>会社案内</h2></div></div>
    <div data-bgb="custom-company"><p>固有ブロック</p></div>`;
  const result = importBurgerEditorHtml(html);
  const body = result.document.root.slots.body;
  assert.equal(body[0].type, "heading");
  assert.equal(body[0].props.text, "会社案内");
  assert.equal(body[1].type, "legacyBurgerBlock");
  assert.match(body[1].props.rawHtml, /固有ブロック/);
  assert.equal(result.report.warnings[0].code, "UNMAPPED_BURGER_BLOCK");
});
