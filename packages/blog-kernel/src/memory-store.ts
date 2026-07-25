import { DomainError, type CollectionId, type ContentItemId, type RevisionId, type TaxonomyId, type TermId } from "@baser-edge/core-types";
import type { BlogArticleRecord, BlogCollection, RevisionTaxonomyValue, Taxonomy, Term } from "./entities.js";
import type { BlogStore } from "./store.js";

export class MemoryBlogStore implements BlogStore {
  readonly collections = new Map<CollectionId, BlogCollection>();
  readonly collectionByContent = new Map<ContentItemId, CollectionId>();
  readonly articles = new Map<ContentItemId, BlogArticleRecord>();
  readonly taxonomies = new Map<TaxonomyId, Taxonomy>();
  readonly terms = new Map<TermId, Term>();
  readonly revisionValues = new Map<string, RevisionTaxonomyValue>();

  async createCollection(collection: BlogCollection): Promise<void> {
    if (this.collections.has(collection.id) || this.collectionByContent.has(collection.contentItemId)) throw new DomainError("BLOG_EXISTS", "Blog collection already exists", 409);
    this.collections.set(collection.id, structuredClone(collection));
    this.collectionByContent.set(collection.contentItemId, collection.id);
  }
  async getCollection(id: CollectionId): Promise<BlogCollection | null> { return clone(this.collections.get(id) ?? null); }
  async getCollectionByContentItem(contentItemId: ContentItemId): Promise<BlogCollection | null> {
    const id = this.collectionByContent.get(contentItemId);
    return id ? this.getCollection(id) : null;
  }
  async listCollections(siteId: import("@baser-edge/core-types").SiteId): Promise<BlogCollection[]> {
    return [...this.collections.values()].filter((item) => item.siteId === siteId).map((item) => structuredClone(item));
  }
  async updateCollection(collection: BlogCollection): Promise<void> {
    if (!this.collections.has(collection.id)) throw new DomainError("BLOG_NOT_FOUND", "Blog collection not found", 404);
    this.collections.set(collection.id, structuredClone(collection));
  }

  async addArticle(record: BlogArticleRecord): Promise<void> {
    if (this.articles.has(record.contentItemId)) throw new DomainError("ARTICLE_EXISTS", "Article is already registered", 409);
    this.articles.set(record.contentItemId, structuredClone(record));
  }
  async getArticle(contentItemId: ContentItemId): Promise<BlogArticleRecord | null> { return clone(this.articles.get(contentItemId) ?? null); }
  async listArticles(collectionId: CollectionId): Promise<BlogArticleRecord[]> {
    return [...this.articles.values()].filter((article) => article.collectionId === collectionId).map((article) => structuredClone(article));
  }

  async updateArticlePostedAt(contentItemId: ContentItemId, postedAt: number): Promise<BlogArticleRecord> {
    const article = this.articles.get(contentItemId);
    if (!article) throw new DomainError("ARTICLE_NOT_FOUND", "Article is not registered in a blog", 404);
    const next = { ...article, postedAt };
    this.articles.set(contentItemId, structuredClone(next));
    return structuredClone(next);
  }

  async createTaxonomy(taxonomy: Taxonomy): Promise<void> {
    if ([...this.taxonomies.values()].some((item) => item.collectionId === taxonomy.collectionId && item.key === taxonomy.key)) throw new DomainError("TAXONOMY_KEY_EXISTS", "Taxonomy key already exists", 409);
    this.taxonomies.set(taxonomy.id, structuredClone(taxonomy));
  }
  async getTaxonomy(id: TaxonomyId): Promise<Taxonomy | null> { return clone(this.taxonomies.get(id) ?? null); }
  async listTaxonomies(collectionId: CollectionId): Promise<Taxonomy[]> {
    return [...this.taxonomies.values()].filter((item) => item.collectionId === collectionId).map((item) => structuredClone(item));
  }

  async createTerm(term: Term): Promise<void> {
    if ([...this.terms.values()].some((item) => item.taxonomyId === term.taxonomyId && item.slug === term.slug)) throw new DomainError("TERM_SLUG_EXISTS", "Term slug already exists", 409);
    this.terms.set(term.id, structuredClone(term));
  }
  async getTerm(id: TermId): Promise<Term | null> { return clone(this.terms.get(id) ?? null); }
  async listTerms(taxonomyId: TaxonomyId): Promise<Term[]> {
    return [...this.terms.values()].filter((item) => item.taxonomyId === taxonomyId).map((item) => structuredClone(item));
  }

  async setRevisionTaxonomyValue(value: RevisionTaxonomyValue): Promise<void> {
    this.revisionValues.set(key(value.revisionId, value.taxonomyId), structuredClone(value));
  }
  async getRevisionTaxonomyValue(revisionId: RevisionId, taxonomyId: TaxonomyId): Promise<RevisionTaxonomyValue | null> {
    return clone(this.revisionValues.get(key(revisionId, taxonomyId)) ?? null);
  }
}

function key(revisionId: RevisionId, taxonomyId: TaxonomyId): string { return `${revisionId}:${taxonomyId}`; }
function clone<T>(value: T | null): T | null { return value === null ? null : structuredClone(value); }
