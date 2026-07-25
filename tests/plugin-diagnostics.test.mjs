import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, mkdir, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { diagnoseBaserPlugin, renderPluginDiagnosticMarkdown } from "../tools/basercms-plugin-diagnostics/index.mjs";

test("baserCMS plugin diagnostics identifies capabilities and migration blockers without executing PHP",async()=>{
  const root=await mkdtemp(join(tmpdir(),"baser-plugin-"));try{
    await mkdir(join(root,"src","Controller","Admin"),{recursive:true});await mkdir(join(root,"config","Migrations"),{recursive:true});await mkdir(join(root,"BurgerAddon","block","hero"),{recursive:true});
    await writeFile(join(root,"composer.json"),JSON.stringify({name:"example/bc-notifier",description:"通知Plugin"}));
    await writeFile(join(root,"src","Controller","Admin","NotifyController.php"),`<?php class NotifyController { public function send(){ file_put_contents('/tmp/x','x'); mail('a@b.test','x','y'); } }`);
    await writeFile(join(root,"config","Migrations","001.php"),`<?php $connection->execute('CREATE TABLE notices(id INT)');`);
    await writeFile(join(root,"BurgerAddon","block","hero","index.php"),`<div data-bgb="hero"><script>alert(1)</script></div>`);
    const report=await diagnoseBaserPlugin(root);assert.equal(report.identity.key,"notifier");assert.ok(report.recommendedManifest.capabilities.includes("email:send"));assert.ok(report.recommendedManifest.capabilities.includes("storage:write"));assert.ok(report.recommendedManifest.capabilities.includes("block:register"));assert.equal(report.summary.trustRecommendation,"trusted-adapter-required");assert.match(renderPluginDiagnosticMarkdown(report),/任意HTMLまたはScript注入/);
  }finally{await rm(root,{recursive:true,force:true});}
});
