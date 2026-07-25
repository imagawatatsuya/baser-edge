import type { CollectionId, ContentItemId, RevisionId, TaxonomyId, TermId } from "@baser-edge/core-types";
import type {
  BlogArticleRecord,
  BlogCollection,
  RevisionTaxonomyValue,
  Taxonomy,
  Term,
} from "./entities.js";

export interface BlogStore {
  createCollection(collection: BlogCollection): Promise<void>;
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
  listTerms(taxonomyId: TaxonomyId): Promise<Term[]>;

  setRevisionTaxonomyValue(value: RevisionTaxonomyValue): Promise<void>;
  getRevisionTaxonomyValue(revisionId: RevisionId, taxonomyId: TaxonomyId): Promise<RevisionTaxonomyValue | null>;
}
