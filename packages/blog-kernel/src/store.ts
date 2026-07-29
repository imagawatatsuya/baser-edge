import type { CollectionId, ContentItemId, RevisionId, TaxonomyId, TermId } from "@baser-edge/core-types";
import type {
  ArticleListResult,
  BlogArticleRecord,
  BlogCollection,
  RevisionTaxonomyValue,
  Taxonomy,
  Term,
} from "./entities.js";

export interface BlogStore {
  createCollection(collection: BlogCollection): Promise<void>;
  /** Optional transactional creation path for the collection and its default taxonomies. */
  createCollectionWithTaxonomies?(collection: BlogCollection, taxonomies: Taxonomy[]): Promise<void>;
  getCollection(id: CollectionId): Promise<BlogCollection | null>;
  getCollectionByContentItem(contentItemId: ContentItemId): Promise<BlogCollection | null>;
  listCollections(siteId: import("@baser-edge/core-types").SiteId): Promise<BlogCollection[]>;
  updateCollection(collection: BlogCollection): Promise<void>;

  addArticle(record: BlogArticleRecord): Promise<void>;
  getArticle(contentItemId: ContentItemId): Promise<BlogArticleRecord | null>;
  listArticles(collectionId: CollectionId): Promise<BlogArticleRecord[]>;

  updateArticlePostedAt(contentItemId: ContentItemId, postedAt: number): Promise<BlogArticleRecord>;

  createTaxonomy(taxonomy: Taxonomy): Promise<void>;
  getTaxonomy(id: TaxonomyId): Promise<Taxonomy | null>;
  listTaxonomies(collectionId: CollectionId): Promise<Taxonomy[]>;

  createTerm(term: Term): Promise<void>;
  getTerm(id: TermId): Promise<Term | null>;
  /** Optional bounded lookup used by article classification. */
  getTerms?(ids: TermId[]): Promise<Term[]>;
  listTerms(taxonomyId: TaxonomyId): Promise<Term[]>;

  setRevisionTaxonomyValue(value: RevisionTaxonomyValue): Promise<void>;
  /** Optional transactional write path for all taxonomy values of one revision. */
  setRevisionTaxonomyValues?(values: RevisionTaxonomyValue[]): Promise<void>;
  getRevisionTaxonomyValue(revisionId: RevisionId, taxonomyId: TaxonomyId): Promise<RevisionTaxonomyValue | null>;

  /** Optional bounded read projection for D1/public rendering. */
  listPublishedArticles?(
    collection: BlogCollection,
    options: { limit: number; offset: number; termIds: TermId[] },
  ): Promise<ArticleListResult>;
}
