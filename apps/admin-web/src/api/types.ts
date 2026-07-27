export type ConsoleCapabilities = {
  assetPublicDelivery: boolean;
  assetStorage: "r2" | "memory" | "d1-inline";
  environment: "production" | "preview";
  instantLogin: boolean;
  cloudflareLogin: boolean;
  publicSiteUrl: string | null;
  trialInlineMedia?: {
    maxAssets: number;
    maxBytesPerObject: number;
  };
};

export type LocalLoginHint = {
  apiUrl: string;
  publicUrl: string;
  workspaceId: string;
  siteId: string;
  ownerPrincipalId: string;
  passkeyLabel?: string;
  credentialId?: string;
  instantDemo?: boolean;
  siteName?: string;
};

export type SessionState = LocalLoginHint;

export type ContentTreeEntry = {
  snapshot: ContentSnapshot;
  aliasTargetContentItemId?: string | null;
};

export type ContentSnapshot = {
  item: {
    id: string;
    contentTypeKey: string;
    siteId: string;
    lockVersion: number;
    state?: string;
    createdAt: number;
    updatedAt: number;
  };
  node: {
    id: string;
    parentId: string | null;
    slug: string;
    sortKey: string;
    treeVersion: number;
    cachedPath?: string;
    createdAt?: number;
    updatedAt?: number;
  };
  route: { path: string };
  workingRevision: Revision | null;
  publishedRevision: Revision | null;
};

export type Revision = {
  id: string;
  fields: Record<string, unknown>;
  document: StructuredDocument;
  createdAt?: number;
  changeSummary?: string;
};

export type ArticleMeta = {
  postedAt: number;
  createdAt: number;
};

export type StructuredDocument = {
  formatVersion: number;
  root: {
    id: string;
    type: string;
    componentVersion: number;
    props: Record<string, unknown>;
    slots: { body: DocumentBlock[] };
  };
};

export type DocumentBlock = {
  id: string;
  type: string;
  componentVersion: number;
  props: Record<string, unknown>;
  slots: Record<string, unknown>;
};

export type BlogListEntry = {
  collection: { id: string };
  snapshot: ContentSnapshot;
};

export type ApiError = { error?: { message?: string; code?: string } };
