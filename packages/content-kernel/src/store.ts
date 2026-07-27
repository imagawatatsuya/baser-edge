import type {
  ActorContext,
  ApprovalId,
  AssetId,
  ContentItemId,
  ContentNodeId,
  PrincipalId,
  RevisionId,
  SiteId,
  WorkspaceId,
} from "@baser-edge/core-types";
import type { Capability, CapabilityScope } from "@baser-edge/authorization";
import type { StructuredDocument } from "@baser-edge/structured-document";
import type {
  AgentRun,
  ApprovalRequest,
  AuditEvent,
  ChangeSet,
  ContentCopyResult,
  ContentManagerEntry,
  ContentRevision,
  ContentSnapshot,
  ContentTrashResult,
  Principal,
  StoredCapabilityGrant,
  StoredDelegationGrant,
  Workspace,
  Site,
  PublishedAssetReference,
} from "./entities.js";

export interface BootstrapRecordInput {
  workspace: Workspace;
  owner: Principal;
  site: Site;
  ownerGrant: StoredCapabilityGrant;
}

interface CreateRoutableContentRecordInput {
  actor: ActorContext;
  workspaceId: WorkspaceId;
  siteId: SiteId;
  parentId: ContentNodeId | null;
  slug: string;
  path: string;
  title: string;
  document: StructuredDocument;
  contentHash: string;
  now: number;
}

export interface CreatePageRecordInput extends CreateRoutableContentRecordInput {}
export interface CreateFolderRecordInput extends CreateRoutableContentRecordInput {}
export interface CreateBlogRecordInput extends CreateRoutableContentRecordInput {}
export interface CreateCustomContentRecordInput extends CreateRoutableContentRecordInput {}
export interface CreateMailFormRecordInput extends CreateRoutableContentRecordInput {}
export interface CreateArticleRecordInput extends CreateRoutableContentRecordInput {}
export interface CreateAliasRecordInput extends CreateRoutableContentRecordInput {
  targetContentItemId: ContentItemId;
}

export interface CommitRevisionRecordInput {
  actor: ActorContext;
  contentItemId: ContentItemId;
  baseRevisionId: RevisionId;
  expectedLockVersion: number;
  fields: Record<string, unknown>;
  document: StructuredDocument;
  contentHash: string;
  changeSummary: string;
  agentRunId: string | null;
  now: number;
}

export interface RelocateContentRecordInput {
  actor: ActorContext;
  contentItemId: ContentItemId;
  targetParentId: ContentNodeId | null;
  newSlug: string;
  expectedTreeVersion: number;
  now: number;
}

export interface ReorderContentRecordInput {
  actor: ActorContext;
  contentItemId: ContentItemId;
  targetParentId: ContentNodeId | null;
  /** Place immediately after this sibling (same parent). `null` = first among siblings. */
  insertAfterContentItemId: ContentItemId | null;
  expectedTreeVersion: number;
  now: number;
}

export interface CopyContentRecordInput {
  actor: ActorContext;
  contentItemId: ContentItemId;
  targetParentId: ContentNodeId | null;
  newSlug: string;
  expectedTreeVersion: number;
  includeDescendants: boolean;
  now: number;
}

export interface TrashContentRecordInput {
  actor: ActorContext;
  contentItemId: ContentItemId;
  expectedTreeVersion: number;
  now: number;
}

export interface RestoreContentRecordInput {
  actor: ActorContext;
  contentItemId: ContentItemId;
  targetParentId: ContentNodeId | null;
  newSlug: string | null;
  expectedTreeVersion: number;
  now: number;
}

export interface CreateApprovalRecordInput {
  actor: ActorContext;
  contentItemId: ContentItemId;
  revisionId: RevisionId;
  revisionHash: string;
  riskLevel: "low" | "medium" | "high" | "critical";
  now: number;
}

export interface DecideApprovalRecordInput {
  actor: ActorContext;
  approvalId: ApprovalId;
  decision: "approved" | "rejected";
  comment: string;
  now: number;
}

export interface PublishRecordInput {
  actor: ActorContext;
  contentItemId: ContentItemId;
  revisionId: RevisionId;
  approvalId: ApprovalId;
  now: number;
}

export interface UnpublishRecordInput {
  actor: ActorContext;
  contentItemId: ContentItemId;
  now: number;
}

export interface CmsStore {
  bootstrap(input: BootstrapRecordInput): Promise<void>;
  createPrincipal(principal: Principal): Promise<void>;
  getPrincipal(id: PrincipalId): Promise<Principal | null>;
  createCapabilityGrant(grant: StoredCapabilityGrant): Promise<void>;
  createDelegationGrant(grant: StoredDelegationGrant): Promise<void>;
  listCapabilityGrants(principalId: PrincipalId): Promise<StoredCapabilityGrant[]>;
  getDelegationGrant(id: string): Promise<StoredDelegationGrant | null>;
  createPage(input: CreatePageRecordInput): Promise<ContentSnapshot>;
  createFolder(input: CreateFolderRecordInput): Promise<ContentSnapshot>;
  createBlog(input: CreateBlogRecordInput): Promise<ContentSnapshot>;
  createCustomContent(input: CreateCustomContentRecordInput): Promise<ContentSnapshot>;
  createMailForm(input: CreateMailFormRecordInput): Promise<ContentSnapshot>;
  createArticle(input: CreateArticleRecordInput): Promise<ContentSnapshot>;
  createAlias(input: CreateAliasRecordInput): Promise<ContentSnapshot>;
  getContentSnapshot(contentItemId: ContentItemId): Promise<ContentSnapshot | null>;
  getNode(id: ContentNodeId): Promise<import("./entities.js").StoredContentNode | null>;
  getRevision(revisionId: RevisionId): Promise<ContentRevision | null>;
  commitRevision(input: CommitRevisionRecordInput): Promise<ContentRevision>;
  relocateContent(input: RelocateContentRecordInput): Promise<ContentSnapshot>;
  reorderContent(input: ReorderContentRecordInput): Promise<ContentSnapshot>;
  copyContent(input: CopyContentRecordInput): Promise<ContentCopyResult>;
  trashContent(input: TrashContentRecordInput): Promise<ContentTrashResult>;
  restoreContent(input: RestoreContentRecordInput): Promise<ContentSnapshot>;
  listContentTree(siteId: SiteId): Promise<ContentManagerEntry[]>;
  listTrash(siteId: SiteId): Promise<ContentManagerEntry[]>;
  createApproval(input: CreateApprovalRecordInput): Promise<ApprovalRequest>;
  getApproval(id: ApprovalId): Promise<ApprovalRequest | null>;
  listPendingApprovalsBySite(siteId: SiteId): Promise<ApprovalRequest[]>;
  decideApproval(input: DecideApprovalRecordInput): Promise<ApprovalRequest>;
  publish(input: PublishRecordInput): Promise<ContentSnapshot>;
  unpublish(input: UnpublishRecordInput): Promise<ContentSnapshot>;
  resolvePublicPath(siteId: SiteId, path: string): Promise<import("./entities.js").PublicPathResolution | null>;
  findPublicByPath(siteId: SiteId, path: string): Promise<ContentSnapshot | null>;
  saveAgentRun(run: AgentRun): Promise<void>;
  updateAgentRun(run: AgentRun): Promise<void>;
  saveChangeSet(changeSet: ChangeSet): Promise<void>;
  getChangeSet(id: string): Promise<ChangeSet | null>;
  appendAudit(event: AuditEvent): Promise<void>;
  listAudit(workspaceId: WorkspaceId): Promise<AuditEvent[]>;
  getWorkspace(id: WorkspaceId): Promise<Workspace | null>;
  getSite(id: SiteId): Promise<Site | null>;
  findCloudflareLoginTarget(accountId: string, ownerEmail: string): Promise<import("./entities.js").CloudflareLoginTarget | null>;
  findCloudflareLoginTargetByEmail(ownerEmail: string): Promise<import("./entities.js").CloudflareLoginTarget | null>;
  bindCloudflareOwner(input: { cloudflareAccountId: string; cloudflareOwnerEmail: string }): Promise<import("./entities.js").CloudflareLoginTarget>;
  hasCloudflareOwnerBinding(): Promise<boolean>;
  listOutbox(): Promise<import("./entities.js").OutboxEvent[]>;
  listPublishedAssetReferences(assetId: AssetId): Promise<PublishedAssetReference[]>;
  revisionReferencesAsset(revisionId: RevisionId, assetId: AssetId): Promise<boolean>;
  isAssetDeliverableOnPublicSite?(siteId: SiteId, assetId: AssetId, now: number): Promise<boolean>;
}

export interface CreatePrincipalInput {
  workspaceId: WorkspaceId;
  type: Principal["type"];
  displayName: string;
}

export interface GrantCapabilityInput {
  principalId: PrincipalId;
  capability: Capability;
  scope?: CapabilityScope;
  validUntil?: number;
}
