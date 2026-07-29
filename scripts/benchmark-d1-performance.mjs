import { readFileSync, readdirSync } from "node:fs";
import { DatabaseSync } from "node:sqlite";
import { actor, CmsService } from "@baser-edge/content-kernel";
import { BlogService } from "@baser-edge/blog-kernel";
import {
  D1AssetMetadataStore,
  D1AssetObjectStore,
  D1BlogStore,
  D1CmsStore,
  D1PreviewStore,
} from "@baser-edge/cloudflare-adapters";
import { AssetService, TRIAL_INLINE_MEDIA_POLICY } from "@baser-edge/asset-kernel";
import { PreviewService } from "@baser-edge/preview-kernel";
import { createBlock, createEmptyDocument } from "@baser-edge/structured-document";

class Statement {
  constructor(shim, sql, values = []) {
    this.shim = shim;
    this.sql = sql;
    this.values = values;
  }
  bind(...values) { return new Statement(this.shim, this.sql, values); }
  async first() {
    this.shim.recordExecution();
    return this.shim.db.prepare(this.sql).get(...this.values) ?? null;
  }
  async all() {
    this.shim.recordExecution();
    return { results: this.shim.db.prepare(this.sql).all(...this.values) };
  }
  async run() {
    this.shim.recordExecution();
    return this.shim.db.prepare(this.sql).run(...this.values);
  }
}

class CountingD1 {
  constructor(db) {
    this.db = db;
    this.preparedStatements = 0;
    this.roundTrips = 0;
    this.inBatch = false;
  }
  prepare(sql) {
    this.preparedStatements += 1;
    return new Statement(this, sql);
  }
  recordExecution() {
    if (!this.inBatch) this.roundTrips += 1;
  }
  async batch(statements) {
    this.roundTrips += 1;
    this.inBatch = true;
    this.db.exec("BEGIN");
    try {
      const results = [];
      for (const statement of statements) results.push(await statement.run());
      this.db.exec("COMMIT");
      return results;
    } catch (error) {
      this.db.exec("ROLLBACK");
      throw error;
    } finally {
      this.inBatch = false;
    }
  }
  reset() {
    this.preparedStatements = 0;
    this.roundTrips = 0;
  }
  result() {
    return {
      preparedStatements: this.preparedStatements,
      d1RoundTrips: this.roundTrips,
    };
  }
}

function migrate(db) {
  const dir = new URL("../migrations/", import.meta.url);
  for (const file of readdirSync(dir).filter((name) => name.endsWith(".sql")).sort()) {
    db.exec(readFileSync(new URL(file, dir), "utf8"));
  }
}

function documentWith(text) {
  const document = createEmptyDocument();
  document.root.slots.body.push(createBlock("heading", { level: 1, text }));
  document.root.slots.body.push(createBlock("richText", { paragraphs: [`${text} 本文`] }));
  return document;
}

async function publish(cms, owner, snapshot) {
  const approval = await cms.requestApproval(owner, {
    contentItemId: snapshot.item.id,
    revisionId: snapshot.workingRevision.id,
  });
  await cms.decideApproval(owner, { approvalId: approval.id, decision: "approved" });
  return cms.publish(owner, {
    contentItemId: snapshot.item.id,
    revisionId: snapshot.workingRevision.id,
    approvalId: approval.id,
  });
}

async function measured(shim, operation) {
  shim.reset();
  const startedAt = performance.now();
  const value = await operation();
  return {
    ...shim.result(),
    localElapsedMs: Number((performance.now() - startedAt).toFixed(1)),
    value,
  };
}

const db = new DatabaseSync(":memory:");
try {
  migrate(db);
  const d1 = new CountingD1(db);
  const cmsStore = new D1CmsStore(d1);
  const cms = new CmsService(cmsStore);
  const blog = new BlogService(new D1BlogStore(d1), cms);
  const boot = await cms.bootstrap({
    workspaceName: "Performance",
    siteName: "Performance",
    hostname: "performance.test",
    ownerName: "Owner",
  });
  const owner = actor(boot.ownerPrincipalId, "human");
  const folderA = await cms.createFolder(owner, { siteId: boot.siteId, parentId: null, slug: "a", title: "A" });
  const folderB = await cms.createFolder(owner, { siteId: boot.siteId, parentId: null, slug: "b", title: "B" });
  const page = await cms.createPage(owner, {
    siteId: boot.siteId,
    parentId: folderA.node.id,
    slug: "page",
    title: "Page",
    document: documentWith("Page"),
  });
  const sibling = await cms.createPage(owner, {
    siteId: boot.siteId,
    parentId: folderA.node.id,
    slug: "sibling",
    title: "Sibling",
    document: documentWith("Sibling"),
  });
  const createdBlog = await blog.createBlog(owner, {
    siteId: boot.siteId,
    parentId: null,
    slug: "news",
    title: "News",
    document: documentWith("News"),
  });
  await publish(cms, owner, createdBlog.snapshot);
  let article;
  for (let index = 1; index <= 30; index += 1) {
    const created = await blog.createArticle(owner, {
      collectionId: createdBlog.collection.id,
      slug: `entry-${index}`,
      title: `Entry ${index}`,
      document: documentWith(`Entry ${index}`),
      postedAt: index,
    });
    const published = await publish(cms, owner, created);
    if (index === 1) article = published;
  }

  const pageEditor = await measured(d1, () => cms.getContent(owner, page.item.id));
  const articleEditor = await measured(d1, async () => {
    const snapshot = await cms.getContent(owner, article.item.id);
    await blog.getArticleMetadata(owner, article.item.id, snapshot);
  });
  const blogIndex = await measured(d1, async () => {
    await cms.listContentTree(owner, boot.siteId);
    await blog.listCollections(boot.siteId);
  });
  const publishedArticles = await measured(d1, () =>
    blog.listPublishedArticles(createdBlog.collection.id, { limit: 10 }));
  const sameParentReorder = await measured(d1, () => cms.reorderContent(owner, {
    contentItemId: page.item.id,
    targetParentId: folderA.node.id,
    insertAfterContentItemId: sibling.item.id,
    expectedTreeVersion: page.node.treeVersion,
  }));
  const crossParentReorder = await measured(d1, () => cms.reorderContent(owner, {
    contentItemId: page.item.id,
    targetParentId: folderB.node.id,
    insertAfterContentItemId: null,
    expectedTreeVersion: sameParentReorder.value.node.treeVersion,
  }));
  const gateway = {
    authorize: cms.authorizeOperation.bind(cms),
    success: cms.recordSuccessfulOperation.bind(cms),
  };
  const previews = new PreviewService({
    store: new D1PreviewStore(d1),
    cms,
    security: gateway,
    signingSecret: "performance-preview-secret",
  });
  const previewCreate = await measured(d1, () => previews.create(owner, {
    contentItemId: article.item.id,
    revisionId: article.workingRevision.id,
    previewBaseUrl: "https://performance.test",
    snapshot: article,
  }));
  const token = decodeURIComponent(new URL(previewCreate.value.previewUrl).pathname.replace("/_preview/", ""));
  const previewResolve = await measured(d1, () => previews.resolve(token));
  const assetObjects = new D1AssetObjectStore(d1, TRIAL_INLINE_MEDIA_POLICY);
  const assets = new AssetService({
    metadata: new D1AssetMetadataStore(d1),
    objects: assetObjects,
    security: gateway,
    signingSecret: "performance-asset-secret",
    trialInline: TRIAL_INLINE_MEDIA_POLICY,
  });
  const upload = await assets.createUploadSession(owner, {
    workspaceId: boot.workspaceId,
    filename: "large.png",
    mediaType: "image/png",
    uploadBaseUrl: "https://performance.test",
  });
  const uploadToken = new URL(upload.uploadUrl).searchParams.get("token");
  const originalBytes = new Uint8Array(1024 * 1024);
  originalBytes.set([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  const readyAsset = await assets.uploadWithToken({
    sessionId: upload.session.id,
    token: uploadToken,
    mediaType: "image/png",
    body: originalBytes,
  });
  const thumbnailBytes = new Uint8Array(24 * 1024);
  thumbnailBytes.set([0x52, 0x49, 0x46, 0x46, 0, 0, 0, 0, 0x57, 0x45, 0x42, 0x50]);
  await assets.putAuthenticatedAssetThumbnail(owner, readyAsset.id, {
    mediaType: "image/webp",
    body: thumbnailBytes,
  });
  const originalAssetRead = await measured(d1, () => assets.getAuthenticatedAssetContent(owner, readyAsset.id));
  const thumbnailAssetRead = await measured(d1, () => assets.getAuthenticatedAssetThumbnail(owner, readyAsset.id));

  const stripValue = ({ value, ...measurement }) => measurement;
  process.stdout.write(`${JSON.stringify({
    pageEditor: stripValue(pageEditor),
    articleEditor: stripValue(articleEditor),
    blogPickerProjection: stripValue(blogIndex),
    publishedArticleList30Limit10: stripValue(publishedArticles),
    sameParentReorderWithoutTreeReload: stripValue(sameParentReorder),
    crossParentReorderWithoutTreeReload: stripValue(crossParentReorder),
    previewCreateWithKnownSnapshot: stripValue(previewCreate),
    previewResolve: stripValue(previewResolve),
    assetOriginalRead: {
      ...stripValue(originalAssetRead),
      responseBytes: originalAssetRead.value.object.size,
    },
    assetThumbnailRead: {
      ...stripValue(thumbnailAssetRead),
      responseBytes: thumbnailAssetRead.value.object.size,
      source: thumbnailAssetRead.value.source,
    },
  }, null, 2)}\n`);
} finally {
  db.close();
}
