import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, mkdir, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { diagnoseBaserTheme, formatThemeDiagnostic } from "../tools/basercms-theme-diagnostics/index.mjs";

test("baserCMS theme diagnostics inventories helpers, assets, tokens, and executable risks", async () => {
  const root=await mkdtemp(join(tmpdir(),"baser-theme-"));
  await mkdir(join(root,"Layout"));await mkdir(join(root,"webroot","css"),{recursive:true});await mkdir(join(root,"webroot","img"),{recursive:true});
  await writeFile(join(root,"Layout","default.php"),`<html><body><?= $this->BcBaser->content() ?><?php if (Configure::read('debug')) { echo 'x'; } ?></body></html>`);
  await writeFile(join(root,"webroot","css","style.css"),`:root{--brand:#123456} body{color:#222;background:#fff}`);
  await writeFile(join(root,"webroot","img","logo.png"),new Uint8Array([1,2,3]));
  const report=await diagnoseBaserTheme(root);
  assert.equal(report.inventory.phpTemplates.length,1);assert.equal(report.inventory.assets.length,1);assert.equal(report.helpers.BcBaser,1);assert.equal(report.helpers.Configure,1);
  assert.ok(report.migration.suggestedDesignTokens.some((value)=>value.name==="--brand"));assert.equal(report.migration.compatibility,"medium");
  assert.match(formatThemeDiagnostic(report),/ThemeRelease用Renderer/);
  await rm(root,{recursive:true,force:true});
});
