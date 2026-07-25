import { Capabilities } from "@baser-edge/authorization";
import { CmsService, MemoryCmsStore, actor } from "@baser-edge/content-kernel";
import { createBlock, createEmptyDocument } from "@baser-edge/structured-document";
import { AgentOperations } from "@baser-edge/agent-tools";
import { renderPage } from "@baser-edge/renderer";
import { BlogService, MemoryBlogStore } from "@baser-edge/blog-kernel";
import { CustomContentService, MemoryCustomContentStore } from "@baser-edge/custom-content-kernel";
import { MailFormService, MemoryMailFormStore, MemoryMailSender } from "@baser-edge/mail-form-kernel";
import { MemoryThemeStore, ThemeService } from "@baser-edge/theme-kernel";
import { MemoryPluginStore, MemoryTrustedPluginRuntime, PluginCapabilities, PluginHooks, PluginService, UnavailablePluginRuntime } from "@baser-edge/plugin-kernel";

const store = new MemoryCmsStore();
const cms = new CmsService(store);
const pluginStore = new MemoryPluginStore();
const pluginRuntime = new MemoryTrustedPluginRuntime();
const plugins = new PluginService({ store: pluginStore, cms, security: { authorize: cms.authorizeOperation.bind(cms), success: cms.recordSuccessfulOperation.bind(cms) }, trustedRuntime: pluginRuntime, sandboxRuntime: new UnavailablePluginRuntime() });
cms.attachLifecycleHooks(plugins);
const blog = new BlogService(new MemoryBlogStore(), cms);
const customContent = new CustomContentService(new MemoryCustomContentStore(), cms);
const mailSender = new MemoryMailSender();
const mailForms = new MailFormService({ store: new MemoryMailFormStore(), cms, customContent, signingSecret: "demo-mail-secret", sender: mailSender });
const themes = new ThemeService({
  store: new MemoryThemeStore(),
  cms,
  security: { authorize: cms.authorizeOperation.bind(cms), success: cms.recordSuccessfulOperation.bind(cms) },
});
const boot = await cms.bootstrap({ workspaceName: "baserCMS Cloud Migration", siteName: "デモサイト", hostname: "demo.local", ownerName: "Owner" });
const owner = actor(boot.ownerPrincipalId, "human");
const demoPlugin = await plugins.createPlugin(owner, { workspaceId: boot.workspaceId, key: "publish-observer", name: "公開監査Plugin", trust: "trusted" });
const demoPluginRelease = await plugins.createRelease(owner, {
  pluginId: demoPlugin.id, version: "1.0.0",
  manifest: { manifestVersion:1,key:demoPlugin.key,name:demoPlugin.name,description:"公開後Hookのデモ",capabilities:[PluginCapabilities.ContentRead],hooks:[{name:PluginHooks.ContentAfterPublish,handler:"observe",failureMode:"continue"}],routes:[],admin:{pages:[],widgets:[]},network:{allowedHosts:[]},storage:{kvNamespaces:[],collections:[]},source:{kind:"native"} },
  bundle: { format:"host-module",entrypoint:"builtin:publish-observer",sizeBytes:128,sha256:"c".repeat(64) },
});
pluginRuntime.register(demoPluginRelease.id,"observe",()=>({ok:true,output:{observed:true}}));
await plugins.activate(owner,{workspaceId:boot.workspaceId,siteId:boot.siteId,pluginReleaseId:demoPluginRelease.id,grantedCapabilities:[PluginCapabilities.ContentRead]});
const demoTheme = await themes.createTheme(owner, {
  workspaceId: boot.workspaceId,
  key: "basercms-migrated",
  name: "baserCMS移植デモテーマ",
  description: "不変ThemeReleaseとDesign Tokenを確認するデモテーマ",
});
const demoTokens = await themes.createTokenRevision(owner, {
  themeId: demoTheme.id,
  name: "和文サイト基本トークン",
  tokens: {
    colorBackground: "#f7f4ed",
    colorSurface: "#ffffff",
    colorText: "#24211d",
    colorMuted: "#6a6258",
    colorAccent: "#315b47",
    colorBorder: "#d8d0c4",
    fontFamily: 'system-ui,-apple-system,"Noto Sans JP",sans-serif',
    baseFontSize: 17,
    lineHeight: 1.8,
    contentMaxWidth: 1040,
    spacingScale: 1,
    radius: 8,
  },
});
const demoLayout = await themes.createLayoutRevision(owner, {
  themeId: demoTheme.id,
  name: "baserCMS型基本レイアウト",
  layout: {
    header: "brand",
    navigation: "none",
    footer: "simple",
    showSiteName: true,
    footerText: "baserCMS Cloud Native Port",
    mainClass: "bc-page basercms-migrated-page",
  },
});
const demoRelease = await themes.createRelease(owner, {
  themeId: demoTheme.id,
  version: "1.0.0",
  designTokenRevisionId: demoTokens.id,
  layoutRevisionId: demoLayout.id,
  manifest: {
    rendererApiVersion: 1,
    variant: "light",
    supportedContentTypes: ["page", "blog", "article", "custom-content", "mail-form"],
    cssText: ".basercms-migrated-page{box-shadow:0 18px 60px rgba(36,33,29,.08)}",
    source: { kind: "basercms-migration", reference: "demo/theme" },
  },
});
const activeTheme = await themes.activate(owner, { siteId: boot.siteId, themeReleaseId: demoRelease.id });
const agentPrincipal = await cms.createPrincipal(owner, { workspaceId: boot.workspaceId, type: "agent", displayName: "Editorial Agent" });
for (const capability of [Capabilities.ContentRead, Capabilities.ContentRevise, Capabilities.ContentRequestPublish]) {
  await cms.grantCapability(owner, { principalId: agentPrincipal.id, capability, scope: { workspaceId: boot.workspaceId, siteId: boot.siteId } });
}
const delegation = await cms.createDelegation(owner, {
  humanPrincipalId: boot.ownerPrincipalId,
  agentPrincipalId: agentPrincipal.id,
  capabilities: [Capabilities.ContentRead, Capabilities.ContentRevise, Capabilities.ContentRequestPublish],
  scope: { workspaceId: boot.workspaceId, siteId: boot.siteId },
  expiresAt: Date.now() + 3_600_000,
});
const agentActor = actor(agentPrincipal.id, "agent", { onBehalfOf: boot.ownerPrincipalId, delegationId: delegation.id });

const document = createEmptyDocument();
const heading = createBlock("heading", { level: 1, text: "baserCMS移植デモ" });
document.root.slots.body.push(heading, createBlock("richText", { paragraphs: ["これは公開前の本文です。"] }));
const page = await cms.createPage(owner, { siteId: boot.siteId, parentId: null, slug: "demo", title: "デモ", document });

const proposal = await new AgentOperations(cms).proposeDocumentChange(agentActor, {
  contentItemId: page.item.id,
  baseRevisionId: page.workingRevision.id,
  expectedLockVersion: page.item.lockVersion,
  operations: [{ kind: "updateProps", blockId: heading.id, patch: { text: "AI提案を人間が承認したページ" } }],
  instructionSummary: "見出しを更新",
  modelProvider: "demo",
  modelName: "typed-operations",
});
const approval = await cms.requestApproval(agentActor, { contentItemId: page.item.id, revisionId: proposal.revision.id });
await cms.decideApproval(owner, { approvalId: approval.id, decision: "approved", comment: "モバイル確認済み" });
const published = await cms.publish(owner, { contentItemId: page.item.id, revisionId: proposal.revision.id, approvalId: approval.id });

const blogDocument = createEmptyDocument();
blogDocument.root.slots.body.push(createBlock("heading", { level: 1, text: "開発日誌" }));
const createdBlog = await blog.createBlog(owner, { siteId: boot.siteId, parentId: null, slug: "journal", title: "開発日誌", document: blogDocument });
const tagTaxonomy = (await blog.listTaxonomies(createdBlog.collection.id)).find((entry) => entry.taxonomy.key === "tag").taxonomy;
const cloudflareTag = await blog.createTerm(owner, { taxonomyId: tagTaxonomy.id, slug: "cloudflare", title: "Cloudflare" });
const articleDocument = createEmptyDocument();
articleDocument.root.slots.body.push(createBlock("heading", { level: 1, text: "Cloudflare Native CMS開発開始" }), createBlock("richText", { paragraphs: ["baserCMSのサイトツリーをCloudflareへ移植しています。"] }));
const article = await blog.createArticle(owner, { collectionId: createdBlog.collection.id, slug: "start", title: "Cloudflare Native CMS開発開始", document: articleDocument, termIds: [cloudflareTag.id] });
for (const content of [createdBlog.snapshot, article]) {
  const itemApproval = await cms.requestApproval(owner, { contentItemId: content.item.id, revisionId: content.workingRevision.id });
  await cms.decideApproval(owner, { approvalId: itemApproval.id, decision: "approved" });
  await cms.publish(owner, { contentItemId: content.item.id, revisionId: content.workingRevision.id, approvalId: itemApproval.id });
}
const articleList = await blog.listPublishedArticles(createdBlog.collection.id);

const nameField = await customContent.createField(owner, { workspaceId: boot.workspaceId, key: "name", name: "名称", type: "text" });
const priceField = await customContent.createField(owner, { workspaceId: boot.workspaceId, key: "price", name: "価格", type: "integer" });
const productTable = await customContent.createTable(owner, { workspaceId: boot.workspaceId, key: "products", name: "商品", kind: "content", displayFieldKey: "name" });
await customContent.attachField(owner, { tableId: productTable.id, fieldId: nameField.id, required: true, searchable: true, unique: true, sortOrder: 10 });
await customContent.attachField(owner, { tableId: productTable.id, fieldId: priceField.id, required: true, sortOrder: 20 });
const productDocument = createEmptyDocument();
productDocument.root.slots.body.push(createBlock("heading", { level: 1, text: "商品一覧" }));
const products = await customContent.createCustomContent(owner, { siteId: boot.siteId, parentId: null, slug: "products", title: "商品一覧", tableId: productTable.id, document: productDocument, listOrderFieldKey: "price" });
const productRootApproval = await cms.requestApproval(owner, { contentItemId: products.snapshot.item.id, revisionId: products.snapshot.workingRevision.id });
await cms.decideApproval(owner, { approvalId: productRootApproval.id, decision: "approved" });
await cms.publish(owner, { contentItemId: products.snapshot.item.id, revisionId: products.snapshot.workingRevision.id, approvalId: productRootApproval.id });
const product = await customContent.createEntry(owner, { customContentId: products.definition.id, slug: "starter", values: { name: "スターター", price: 1200 } });
const productApproval = await customContent.requestApproval(owner, { entryId: product.entry.id, revisionId: product.workingRevision.id });
await customContent.decideApproval(owner, { approvalId: productApproval.id, decision: "approved" });
await customContent.publishEntry(owner, { entryId: product.entry.id, revisionId: product.workingRevision.id, approvalId: productApproval.id });
const productList = await customContent.listPublished(products.definition.id);

const emailField = await customContent.createField(owner, { workspaceId: boot.workspaceId, key: "email", name: "メール", type: "email" });
const messageField = await customContent.createField(owner, { workspaceId: boot.workspaceId, key: "message", name: "お問い合わせ内容", type: "textarea" });
const contactTable = await customContent.createTable(owner, { workspaceId: boot.workspaceId, key: "contact_form", name: "お問い合わせ", kind: "content" });
await customContent.attachField(owner, { tableId: contactTable.id, fieldId: emailField.id, required: true, sortOrder: 10 });
await customContent.attachField(owner, { tableId: contactTable.id, fieldId: messageField.id, required: true, sortOrder: 20 });
const contact = await mailForms.createMailForm(owner, { siteId: boot.siteId, parentId: null, slug: "contact", title: "お問い合わせ", tableId: contactTable.id, recipientEmails: ["owner@example.com"], senderAddress: "noreply@example.com", autoReplyEnabled: true, autoReplyEmailFieldKey: "email", turnstileRequired: false });
const contactApproval = await cms.requestApproval(owner, { contentItemId: contact.snapshot.item.id, revisionId: contact.snapshot.workingRevision.id });
await cms.decideApproval(owner, { approvalId: contactApproval.id, decision: "approved" });
await cms.publish(owner, { contentItemId: contact.snapshot.item.id, revisionId: contact.snapshot.workingRevision.id, approvalId: contactApproval.id });
const confirmation = await mailForms.prepareConfirmation({ mailFormId: contact.definition.id, values: { email: "visitor@example.com", message: "デモ送信" } });
await mailForms.submitConfirmation({ confirmationId: confirmation.session.id, token: confirmation.token });
await mailForms.deliverPending(owner);

console.log(JSON.stringify({
  contentId: published.item.id,
  path: published.route.path,
  workingRevision: published.item.workingRevisionId,
  publishedRevision: published.item.publishedRevisionId,
  auditEvents: (await cms.listAudit(owner, boot.workspaceId)).length,
  outboxEvents: (await store.listOutbox()).length,
  blogPath: createdBlog.snapshot.route.path,
  articlePath: article.route.path,
  publishedArticles: articleList.total,
  customContentPath: products.snapshot.route.path,
  publishedCustomEntries: productList.total,
  mailFormPath: contact.snapshot.route.path,
  deliveredMailMessages: mailSender.sent.length,
  themeRelease: activeTheme.release.id,
  themeReleaseHash: activeTheme.release.releaseHash,
  activePluginRelease: demoPluginRelease.id,
  pluginInvocations: (await pluginStore.listInvocations(demoPluginRelease.id)).length,
}, null, 2));
console.log("\n--- rendered HTML ---\n");
console.log(renderPage(published.publishedRevision.document, undefined, { title: "デモ", siteName: "デモサイト", revision: published.publishedRevision, theme: activeTheme }));
