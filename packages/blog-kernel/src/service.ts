import {
  asCollectionId,
  asTaxonomyId,
  asTermId,
  assertDomain,
  newId,
  systemClock,
  type ActorContext,
  type Clock,
  type CollectionId,
  type ContentItemId,
  type PrincipalId,
  type RevisionId,
  type TaxonomyId,
  type TermId,
} from "@baser-edge/core-types";
import { Capabilities } from "@baser-edge/authorization";
import { normalizeSlug } from "@baser-edge/baser-domain";
import { CmsService, type CommitRevisionInput, type ContentRevision, type ContentSnapshot } from "@baser-edge/content-kernel";
import type { StructuredDocument } from "@baser-edge/structured-document";
import type {
  ArticleListOptions,
  ArticleListResult,
  BlogArticleRecord,
  BlogCollection,
  PublishedArticle,
  RevisionTaxonomyValue,
  Taxonomy,
  Term,
} from "./entities.js";
import type { BlogStore } from "./store.js";

export interface CreateBlogInput {
  siteId: Parameters<CmsService["createBlog"]>[1]["siteId"];
  parentId: Parameters<CmsService["createBlog"]>[1]["parentId"];
  slug: string;
  title: string;
  document: StructuredDocument;
  pageSize?: number;
  feedSize?: number;
  sortDirection?: "asc" | "desc";
}

export interface CreateArticleInput {
  collectionId: CollectionId;
  slug: string;
  title: string;
  document: StructuredDocument;
  postedAt?: number;
  termIds?: TermId[];
}

export class BlogService {
  readonly #store: BlogStore;
  readonly #cms: CmsService;
  readonly #clock: Clock;

  constructor(store: BlogStore, cms: CmsService, options: { clock?: Clock } = {}) {
    this.#store = store;
    this.#cms = cms;
    this.#clock = options.clock ?? systemClock;
  }

  get store(): BlogStore { return this.#store; }

  async createBlog(actor: ActorContext, input: CreateBlogInput): Promise<{ collection: BlogCollection; snapshot: ContentSnapshot; taxonomies: Taxonomy[] }> {
    const snapshot = await this.#cms.createBlog(actor, input);
    const now = this.#clock.now();
    const collection: BlogCollection = {
      id: asCollectionId(newId("collection")),
      workspaceId: snapshot.item.workspaceId,
      siteId: snapshot.item.siteId,
      contentItemId: snapshot.item.id,
      pageSize: clamp(input.pageSize ?? 10, 1, 100),
      feedSize: clamp(input.feedSize ?? 20, 1, 100),
      sortDirection: input.sortDirection ?? "desc",
      state: "active",
      createdAt: now,
      updatedAt: now,
    };
    const category = this.#buildTaxonomyRecord(collection, { key: "category", title: "カテゴリ", kind: "category", hierarchical: true }, now);
    const tag = this.#buildTaxonomyRecord(collection, { key: "tag", title: "タグ", kind: "tag", hierarchical: false }, now);
    if (this.#store.createCollectionWithTaxonomies) {
      await this.#store.createCollectionWithTaxonomies(collection, [category, tag]);
    } else {
      await this.#store.createCollection(collection);
      await Promise.all([this.#store.createTaxonomy(category), this.#store.createTaxonomy(tag)]);
    }
    await this.#cms.recordSuccessfulOperation(actor, {
      workspaceId: collection.workspaceId,
      siteId: collection.siteId,
      action: "blog.configure",
      resourceType: "blog-collection",
      resourceId: collection.id,
      revisionId: snapshot.workingRevision?.id ?? null,
      capability: Capabilities.BlogCreate,
      details: { contentItemId: collection.contentItemId, pageSize: collection.pageSize, feedSize: collection.feedSize },
    });
    return { collection, snapshot, taxonomies: [category, tag] };
  }

  async createArticle(actor: ActorContext, input: CreateArticleInput): Promise<ContentSnapshot> {
    const collection = await this.#requireCollection(input.collectionId);
    const blog = await this.#cms.getContent(actor, collection.contentItemId);
    assertDomain(blog.item.contentTypeKey === "blog", "BLOG_CONTENT_MISMATCH", "Collection content is not a blog", 500);
    const snapshot = await this.#cms.createArticle(actor, {
      blogContentItemId: blog.item.id,
      slug: input.slug,
      title: input.title,
      document: input.document,
    });
    const now = this.#clock.now();
    const article: BlogArticleRecord = {
      collectionId: collection.id,
      contentItemId: snapshot.item.id,
      postedAt: input.postedAt ?? now,
      authorPrincipalId: actor.onBehalfOf ?? actor.actorId,
      createdAt: now,
    };
    await this.#store.addArticle(article);
    if (input.termIds) {
      await this.#classifyRevision(actor, article, snapshot.workingRevision!, input.termIds);
    }
    await this.#cms.recordSuccessfulOperation(actor, {
      workspaceId: collection.workspaceId,
      siteId: collection.siteId,
      action: "article.register",
      resourceType: "article",
      resourceId: snapshot.item.id,
      revisionId: snapshot.workingRevision?.id ?? null,
      capability: Capabilities.ArticleCreate,
      details: { collectionId: collection.id, postedAt: input.postedAt ?? now },
    });
    return snapshot;
  }

  async getArticleMetadata(actor: ActorContext, contentItemId: ContentItemId, knownSnapshot?: ContentSnapshot) {
    const snapshot = knownSnapshot ?? await this.#cms.getContent(actor, contentItemId);
    assertDomain(snapshot.item.id === contentItemId, "ARTICLE_CONTENT_MISMATCH", "Content is not the requested article", 422);
    assertDomain(snapshot.item.contentTypeKey === "article", "ARTICLE_CONTENT_MISMATCH", "Content is not an article", 422);
    const article = await this.#requireArticle(contentItemId);
    return { article, snapshot };
  }

  async updateArticlePostedAt(actor: ActorContext, input: { contentItemId: ContentItemId; postedAt: number }) {
    const snapshot = await this.#cms.getContent(actor, input.contentItemId);
    assertDomain(snapshot.item.contentTypeKey === "article", "ARTICLE_CONTENT_MISMATCH", "Content is not an article", 422);
    await this.#cms.authorizeOperation(actor, Capabilities.ContentRevise, {
      workspaceId: snapshot.item.workspaceId,
      siteId: snapshot.item.siteId,
      contentType: "article",
      risk: "medium",
    }, "article.update-posted-at", "article", input.contentItemId);
    const article = await this.#store.updateArticlePostedAt(input.contentItemId, input.postedAt);
    await this.#cms.recordSuccessfulOperation(actor, {
      workspaceId: snapshot.item.workspaceId,
      siteId: snapshot.item.siteId,
      action: "article.update-posted-at",
      resourceType: "article",
      resourceId: input.contentItemId,
      revisionId: snapshot.workingRevision?.id ?? null,
      capability: Capabilities.ContentRevise,
      details: { postedAt: input.postedAt },
    });
    return article;
  }

  async reviseArticle(actor: ActorContext, input: CommitRevisionInput & { termIdsByTaxonomy?: Record<string, TermId[]> }): Promise<ContentRevision> {
    const article = await this.#requireArticle(input.contentItemId);
    const revision = await this.#cms.commitRevision(actor, input);
    if (input.termIdsByTaxonomy) {
      const requested = new Map(
        Object.entries(input.termIdsByTaxonomy).map(([taxonomyId, termIds]) => [asTaxonomyId(taxonomyId), unique(termIds)]),
      );
      await this.#setTaxonomyValues(actor, article, revision, requested, false);
    }
    return revision;
  }

  async createTaxonomy(actor: ActorContext, input: { collectionId: CollectionId; key: string; title: string; kind: "category" | "tag"; hierarchical?: boolean }): Promise<Taxonomy> {
    const collection = await this.#requireCollection(input.collectionId);
    await this.#cms.authorizeOperation(actor, Capabilities.TaxonomyManage, { workspaceId: collection.workspaceId, siteId: collection.siteId, contentType: "blog", risk: "medium" }, "taxonomy.create", "blog-collection", collection.id);
    const taxonomy = await this.#createTaxonomyRecord(collection, {
      key: normalizeTaxonomyKey(input.key),
      title: input.title.trim(),
      kind: input.kind,
      hierarchical: input.kind === "category" ? (input.hierarchical ?? true) : false,
    }, this.#clock.now());
    await this.#cms.recordSuccessfulOperation(actor, { workspaceId: collection.workspaceId, siteId: collection.siteId, action: "taxonomy.create", resourceType: "taxonomy", resourceId: taxonomy.id, capability: Capabilities.TaxonomyManage, details: { collectionId: collection.id, key: taxonomy.key } });
    return taxonomy;
  }

  async createTerm(actor: ActorContext, input: { taxonomyId: TaxonomyId; slug: string; title: string; parentId?: TermId | null }): Promise<Term> {
    const taxonomy = await this.#requireTaxonomy(input.taxonomyId);
    const collection = await this.#requireCollection(taxonomy.collectionId);
    await this.#cms.authorizeOperation(actor, Capabilities.TaxonomyManage, { workspaceId: collection.workspaceId, siteId: collection.siteId, contentType: "blog", risk: "medium" }, "term.create", "taxonomy", taxonomy.id);
    let parentId = input.parentId ?? null;
    if (parentId) {
      assertDomain(taxonomy.hierarchical, "TAXONOMY_NOT_HIERARCHICAL", "This taxonomy does not allow parent terms", 422);
      const parent = await this.#store.getTerm(parentId);
      assertDomain(parent && parent.taxonomyId === taxonomy.id && parent.state === "active", "INVALID_TERM_PARENT", "Parent term is invalid", 422);
    }
    const now = this.#clock.now();
    const term: Term = {
      id: asTermId(newId("term")),
      taxonomyId: taxonomy.id,
      parentId,
      slug: normalizeSlug(input.slug),
      title: input.title.trim(),
      state: "active",
      createdAt: now,
      updatedAt: now,
    };
    assertDomain(term.title.length > 0, "TERM_TITLE_REQUIRED", "Term title is required", 422);
    await this.#store.createTerm(term);
    await this.#cms.recordSuccessfulOperation(actor, { workspaceId: collection.workspaceId, siteId: collection.siteId, action: "term.create", resourceType: "term", resourceId: term.id, capability: Capabilities.TaxonomyManage, details: { taxonomyId: taxonomy.id, slug: term.slug } });
    return term;
  }

  async classifyRevision(actor: ActorContext, articleContentItemId: ContentItemId, revisionId: RevisionId, termIds: TermId[]): Promise<void> {
    const article = await this.#requireArticle(articleContentItemId);
    const revision = await this.#cms.store.getRevision(revisionId);
    assertDomain(revision, "REVISION_NOT_FOUND", "Revision not found", 404);
    await this.#classifyRevision(actor, article, revision, termIds);
  }

  async listTaxonomies(collectionId: CollectionId): Promise<Array<{ taxonomy: Taxonomy; terms: Term[] }>> {
    const taxonomies = await this.#store.listTaxonomies(collectionId);
    return Promise.all(taxonomies.map(async (taxonomy) => ({ taxonomy, terms: await this.#store.listTerms(taxonomy.id) })));
  }

  async findTerm(collectionId: CollectionId, taxonomyKey: string, slug: string): Promise<Term | null> {
    const taxonomies = await this.#store.listTaxonomies(collectionId);
    const taxonomy = taxonomies.find((item) => item.key === taxonomyKey && item.state === "active");
    if (!taxonomy) return null;
    const normalized = normalizeSlug(slug);
    return (await this.#store.listTerms(taxonomy.id)).find((term) => term.slug === normalized && term.state === "active") ?? null;
  }

  async listPublishedArticles(collectionId: CollectionId, options: ArticleListOptions = {}): Promise<ArticleListResult> {
    const collection = await this.#requireCollection(collectionId);
    const requiredTermIds = unique(options.termIds ?? []);
    const limit = clamp(options.limit ?? collection.pageSize, 1, 100);
    const offset = Math.max(0, options.offset ?? 0);
    if (this.#store.listPublishedArticles) {
      return this.#store.listPublishedArticles(collection, { limit, offset, termIds: requiredTermIds });
    }
    const records = await this.#store.listArticles(collection.id);
    const published: PublishedArticle[] = [];
    for (const record of records) {
      const snapshot = await this.#cms.store.getContentSnapshot(record.contentItemId);
      if (!snapshot || snapshot.item.state !== "active" || !snapshot.publishedRevision) continue;
      const terms = await this.#resolveTerms(collection.id, snapshot.publishedRevision.id);
      if (requiredTermIds.length && !requiredTermIds.every((id) => terms.some((term) => term.id === id))) continue;
      published.push({ snapshot, collectionId: collection.id, postedAt: record.postedAt, authorPrincipalId: record.authorPrincipalId, terms });
    }
    published.sort((a, b) => collection.sortDirection === "desc" ? b.postedAt - a.postedAt : a.postedAt - b.postedAt);
    return { items: published.slice(offset, offset + limit), total: published.length, limit, offset };
  }

  async getCollectionByContentItem(contentItemId: ContentItemId): Promise<BlogCollection | null> { return this.#store.getCollectionByContentItem(contentItemId); }
  async listCollections(siteId: import("@baser-edge/core-types").SiteId): Promise<BlogCollection[]> { return this.#store.listCollections(siteId); }

  async renderRss(collectionId: CollectionId, options: { siteUrl: string; title?: string; description?: string } ): Promise<string> {
    const collection = await this.#requireCollection(collectionId);
    const blog = await this.#cms.store.getContentSnapshot(collection.contentItemId);
    assertDomain(blog?.publishedRevision, "BLOG_NOT_PUBLISHED", "Blog is not published", 409);
    const list = await this.listPublishedArticles(collection.id, { limit: collection.feedSize });
    const title = options.title ?? String(blog.publishedRevision.fields.title ?? "Blog");
    const description = options.description ?? excerpt(blog.publishedRevision.document, 240);
    const base = options.siteUrl.replace(/\/$/, "");
    const items = list.items.map((article) => {
      const revision = article.snapshot.publishedRevision!;
      const link = `${base}${article.snapshot.route.path}`;
      const articleTitle = String(revision.fields.title ?? "");
      return `<item><title>${xml(articleTitle)}</title><link>${xml(link)}</link><guid isPermaLink="true">${xml(link)}</guid><pubDate>${new Date(article.postedAt).toUTCString()}</pubDate><description>${xml(excerpt(revision.document, 400))}</description>${article.terms.map((term) => `<category>${xml(term.title)}</category>`).join("")}</item>`;
    }).join("");
    return `<?xml version="1.0" encoding="UTF-8"?><rss version="2.0"><channel><title>${xml(title)}</title><link>${xml(`${base}${blog.route.path}`)}</link><description>${xml(description)}</description><lastBuildDate>${new Date(this.#clock.now()).toUTCString()}</lastBuildDate>${items}</channel></rss>`;
  }

  async #createTaxonomyRecord(collection: BlogCollection, input: { key: string; title: string; kind: "category" | "tag"; hierarchical: boolean }, now: number): Promise<Taxonomy> {
    const taxonomy = this.#buildTaxonomyRecord(collection, input, now);
    await this.#store.createTaxonomy(taxonomy);
    return taxonomy;
  }

  #buildTaxonomyRecord(collection: BlogCollection, input: { key: string; title: string; kind: "category" | "tag"; hierarchical: boolean }, now: number): Taxonomy {
    return {
      id: asTaxonomyId(newId("taxonomy")),
      collectionId: collection.id,
      key: input.key,
      title: input.title,
      kind: input.kind,
      hierarchical: input.hierarchical,
      state: "active",
      createdAt: now,
      updatedAt: now,
    };
  }

  async #classifyRevision(
    actor: ActorContext,
    article: BlogArticleRecord,
    revision: ContentRevision,
    termIds: TermId[],
  ): Promise<void> {
    const taxonomies = await this.#store.listTaxonomies(article.collectionId);
    const taxonomyIds = new Set(taxonomies.map((taxonomy) => taxonomy.id));
    const terms = await this.#loadTerms(unique(termIds));
    const grouped = new Map<TaxonomyId, TermId[]>();
    for (const term of terms) {
      assertDomain(taxonomyIds.has(term.taxonomyId), "TERM_COLLECTION_MISMATCH", "Term belongs to another blog", 422);
      grouped.set(term.taxonomyId, [...(grouped.get(term.taxonomyId) ?? []), term.id]);
    }
    for (const taxonomy of taxonomies) grouped.set(taxonomy.id, grouped.get(taxonomy.id) ?? []);
    await this.#setTaxonomyValues(actor, article, revision, grouped, true, taxonomies, terms);
  }

  async #setTaxonomyValues(
    actor: ActorContext,
    article: BlogArticleRecord,
    revision: ContentRevision,
    requested: Map<TaxonomyId, TermId[]>,
    clearMissing: boolean,
    knownTaxonomies?: Taxonomy[],
    knownTerms?: Term[],
  ): Promise<void> {
    const collection = await this.#requireCollection(article.collectionId);
    const taxonomies = knownTaxonomies ?? await this.#store.listTaxonomies(collection.id);
    const taxonomyById = new Map(taxonomies.map((taxonomy) => [taxonomy.id, taxonomy]));
    for (const taxonomyId of requested.keys()) {
      assertDomain(taxonomyById.has(taxonomyId), "TAXONOMY_COLLECTION_MISMATCH", "Taxonomy belongs to another blog", 422);
    }
    assertDomain(revision.contentItemId === article.contentItemId, "ARTICLE_COLLECTION_MISMATCH", "Revision belongs to another article", 422);
    await this.#cms.authorizeOperation(actor, Capabilities.ArticleClassify, { workspaceId: collection.workspaceId, siteId: collection.siteId, contentType: "article", risk: "low" }, "article.classify", "revision", revision.id);
    const requestedTaxonomies = clearMissing ? taxonomies : [...requested.keys()].map((id) => taxonomyById.get(id)!);
    const allTermIds = unique(requestedTaxonomies.flatMap((taxonomy) => requested.get(taxonomy.id) ?? []));
    const terms = knownTerms ?? await this.#loadTerms(allTermIds);
    const termById = new Map(terms.map((term) => [term.id, term]));
    const values = requestedTaxonomies.map((taxonomy): RevisionTaxonomyValue => {
      const valid = unique(requested.get(taxonomy.id) ?? []);
      for (const termId of valid) {
        const term = termById.get(termId);
        assertDomain(term?.taxonomyId === taxonomy.id, "INVALID_TERM", "Term is invalid for taxonomy", 422);
      }
      return { revisionId: revision.id, taxonomyId: taxonomy.id, termIds: valid };
    });
    if (this.#store.setRevisionTaxonomyValues) {
      await this.#store.setRevisionTaxonomyValues(values);
    } else {
      await Promise.all(values.map((value) => this.#store.setRevisionTaxonomyValue(value)));
    }
    await this.#cms.recordSuccessfulOperation(actor, {
      workspaceId: collection.workspaceId,
      siteId: collection.siteId,
      action: "article.classify",
      resourceType: "revision",
      resourceId: revision.id,
      revisionId: revision.id,
      capability: Capabilities.ArticleClassify,
      details: { values: values.map(({ taxonomyId, termIds }) => ({ taxonomyId, termIds })) },
    });
  }

  async #loadTerms(ids: TermId[]): Promise<Term[]> {
    if (!ids.length) return [];
    const terms = this.#store.getTerms
      ? await this.#store.getTerms(ids)
      : (await Promise.all(ids.map((id) => this.#store.getTerm(id)))).filter((term): term is Term => Boolean(term));
    const active = new Map(terms.filter((term) => term.state === "active").map((term) => [term.id, term]));
    for (const id of ids) assertDomain(active.has(id), "TERM_NOT_FOUND", "Term not found", 404);
    return ids.map((id) => active.get(id)!);
  }

  async #resolveTerms(collectionId: CollectionId, revisionId: RevisionId): Promise<Term[]> {
    const taxonomies = await this.#store.listTaxonomies(collectionId);
    const result: Term[] = [];
    for (const taxonomy of taxonomies) {
      const value = await this.#resolveTaxonomyValue(revisionId, taxonomy.id, new Set());
      for (const termId of value) {
        const term = await this.#store.getTerm(termId);
        if (term?.state === "active") result.push(term);
      }
    }
    return result;
  }

  async #resolveTaxonomyValue(revisionId: RevisionId, taxonomyId: TaxonomyId, visited: Set<RevisionId>): Promise<TermId[]> {
    if (visited.has(revisionId)) return [];
    visited.add(revisionId);
    const direct = await this.#store.getRevisionTaxonomyValue(revisionId, taxonomyId);
    if (direct) return direct.termIds;
    const revision = await this.#cms.store.getRevision(revisionId);
    return revision?.basedOnRevisionId ? this.#resolveTaxonomyValue(revision.basedOnRevisionId, taxonomyId, visited) : [];
  }

  async #requireCollection(id: CollectionId): Promise<BlogCollection> {
    const collection = await this.#store.getCollection(id);
    assertDomain(collection && collection.state === "active", "BLOG_NOT_FOUND", "Blog collection not found", 404);
    return collection;
  }
  async #requireTaxonomy(id: TaxonomyId): Promise<Taxonomy> {
    const taxonomy = await this.#store.getTaxonomy(id);
    assertDomain(taxonomy && taxonomy.state === "active", "TAXONOMY_NOT_FOUND", "Taxonomy not found", 404);
    return taxonomy;
  }
  async #requireArticle(contentItemId: ContentItemId) {
    const article = await this.#store.getArticle(contentItemId);
    assertDomain(article, "ARTICLE_NOT_FOUND", "Article is not registered in a blog", 404);
    return article;
  }
}

function clamp(value: number, min: number, max: number): number { return Math.min(max, Math.max(min, Math.trunc(value))); }
function unique<T>(values: T[]): T[] { return [...new Set(values)]; }
function normalizeTaxonomyKey(value: string): string {
  const key = value.trim().toLowerCase().replace(/[^a-z0-9_-]+/g, "-").replace(/^-+|-+$/g, "");
  assertDomain(key.length > 0, "TAXONOMY_KEY_REQUIRED", "Taxonomy key is required", 422);
  return key;
}
function excerpt(document: StructuredDocument, max: number): string {
  const text: string[] = [];
  const visit = (block: { props: Record<string, unknown>; slots: Record<string, any[]> }) => {
    for (const value of Object.values(block.props)) {
      if (typeof value === "string" && !value.startsWith("ast_")) text.push(value);
    }
    for (const children of Object.values(block.slots)) for (const child of children) visit(child);
  };
  for (const children of Object.values(document.root.slots)) for (const child of children) visit(child);
  const normalized = text.join(" ").replace(/\s+/g, " ").trim();
  return normalized.length > max ? `${normalized.slice(0, max - 1)}…` : normalized;
}
function xml(value: string): string { return value.replace(/[<>&"']/g, (ch) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;", "'": "&apos;" }[ch]!)); }
