import type {
  CollectionId,
  ContentItemId,
  PrincipalId,
  RevisionId,
  SiteId,
  TaxonomyId,
  TermId,
  WorkspaceId,
} from "@baser-edge/core-types";
import type { ContentSnapshot } from "@baser-edge/content-kernel";

export interface BlogCollection {
  id: CollectionId;
  workspaceId: WorkspaceId;
  siteId: SiteId;
  contentItemId: ContentItemId;
  pageSize: number;
  feedSize: number;
  sortDirection: "asc" | "desc";
  state: "active" | "disabled";
  createdAt: number;
  updatedAt: number;
}

export interface BlogArticleRecord {
  collectionId: CollectionId;
  contentItemId: ContentItemId;
  postedAt: number;
  authorPrincipalId: PrincipalId;
  createdAt: number;
}

export interface Taxonomy {
  id: TaxonomyId;
  collectionId: CollectionId;
  key: string;
  title: string;
  kind: "category" | "tag";
  hierarchical: boolean;
  state: "active" | "disabled";
  createdAt: number;
  updatedAt: number;
}

export interface Term {
  id: TermId;
  taxonomyId: TaxonomyId;
  parentId: TermId | null;
  slug: string;
  title: string;
  state: "active" | "disabled";
  createdAt: number;
  updatedAt: number;
}

export interface RevisionTaxonomyValue {
  revisionId: RevisionId;
  taxonomyId: TaxonomyId;
  termIds: TermId[];
}

export interface PublishedArticle {
  snapshot: ContentSnapshot;
  collectionId: CollectionId;
  postedAt: number;
  authorPrincipalId: PrincipalId;
  terms: Term[];
}

export interface ArticleListOptions {
  limit?: number;
  offset?: number;
  termIds?: TermId[];
}

export interface ArticleListResult {
  items: PublishedArticle[];
  total: number;
  limit: number;
  offset: number;
}
