import type {
  AgentRunId,
  AssetId,
  ApprovalId,
  AuditEventId,
  CapabilityGrantId,
  ChangeSetId,
  ContentItemId,
  ContentNodeId,
  DelegationId,
  OutboxEventId,
  PrincipalId,
  PrincipalType,
  RevisionId,
  RouteId,
  SiteId,
  WorkspaceId,
} from "@baser-edge/core-types";
import type { Capability, CapabilityScope } from "@baser-edge/authorization";
import type { StructuredDocument, BlockOperation, DocumentDiff } from "@baser-edge/structured-document";


export interface StoredRevisionAssetReference {
  revisionId: RevisionId;
  assetId: AssetId;
  blockId: string | null;
  fieldPath: string;
  usage: "image" | "gallery" | "download";
}

export interface PublishedAssetReference extends StoredRevisionAssetReference {
  contentItemId: ContentItemId;
  siteId: SiteId;
  path: string;
}

export interface Workspace {
  id: WorkspaceId;
  name: string;
  createdAt: number;
}

export interface Site {
  id: SiteId;
  workspaceId: WorkspaceId;
  name: string;
  hostname: string;
  locale: string;
  state: "active" | "disabled";
  createdAt: number;
  updatedAt: number;
}

export interface Principal {
  id: PrincipalId;
  workspaceId: WorkspaceId;
  type: PrincipalType;
  displayName: string;
  state: "active" | "disabled";
  createdAt: number;
}

export interface StoredCapabilityGrant {
  id: CapabilityGrantId;
  principalId: PrincipalId;
  capability: Capability;
  scope: CapabilityScope;
  validFrom?: number;
  validUntil?: number;
  revokedAt?: number;
}

export interface StoredDelegationGrant {
  id: DelegationId;
  humanPrincipalId: PrincipalId;
  agentPrincipalId: PrincipalId;
  capabilities: Capability[];
  scope: CapabilityScope;
  maximumRisk: "low" | "medium" | "high" | "critical";
  expiresAt: number;
  revokedAt?: number;
}

export interface ContentItem {
  id: ContentItemId;
  workspaceId: WorkspaceId;
  siteId: SiteId;
  contentTypeKey: string;
  workingRevisionId: RevisionId | null;
  publishedRevisionId: RevisionId | null;
  lockVersion: number;
  state: "active" | "trashed";
  createdBy: PrincipalId;
  createdAt: number;
  updatedAt: number;
}

export interface ContentRevision {
  id: RevisionId;
  contentItemId: ContentItemId;
  revisionNumber: number;
  basedOnRevisionId: RevisionId | null;
  fields: Record<string, unknown>;
  document: StructuredDocument;
  contentHash: string;
  createdBy: PrincipalId;
  agentRunId: AgentRunId | null;
  changeSummary: string;
  createdAt: number;
}

export interface StoredContentNode {
  id: ContentNodeId;
  siteId: SiteId;
  contentItemId: ContentItemId;
  parentId: ContentNodeId | null;
  slug: string;
  sortKey: string;
  cachedPath: string;
  treeVersion: number;
  createdAt: number;
  updatedAt: number;
}

export interface StoredRoute {
  id: RouteId;
  siteId: SiteId;
  contentItemId: ContentItemId;
  hostname: string;
  path: string;
  routeType: "canonical" | "alias";
  isCanonical: boolean;
  active: boolean;
  activatedAt: number;
  deactivatedAt: number | null;
}

export interface StoredRedirect {
  id: string;
  siteId: SiteId;
  sourceHostname: string;
  sourcePath: string;
  targetRouteId: RouteId;
  statusCode: 301 | 302 | 307 | 308;
  active: boolean;
  createdAt: number;
}

export interface ApprovalRequest {
  id: ApprovalId;
  contentItemId: ContentItemId;
  revisionId: RevisionId;
  revisionHash: string;
  state: "pending" | "approved" | "rejected";
  riskLevel: "low" | "medium" | "high" | "critical";
  requestedBy: PrincipalId;
  requestedAt: number;
  decidedBy: PrincipalId | null;
  decidedAt: number | null;
  decisionComment: string | null;
}

export interface ContentApprovalInboxItem {
  approval: ApprovalRequest;
  path: string;
  title: string;
  fromAgent: boolean;
  agentRunId: AgentRunId | null;
}

export interface AgentRun {
  id: AgentRunId;
  workspaceId: WorkspaceId;
  agentPrincipalId: PrincipalId;
  instructedBy: PrincipalId;
  modelProvider: string;
  modelName: string;
  baseRevisionId: RevisionId;
  producedRevisionId: RevisionId | null;
  state: "running" | "completed" | "failed";
  startedAt: number;
  completedAt: number | null;
}

export interface ChangeSet {
  id: ChangeSetId;
  contentItemId: ContentItemId;
  baseRevisionId: RevisionId;
  resultRevisionId: RevisionId | null;
  operations: BlockOperation[];
  diff: DocumentDiff | null;
  riskLevel: "low" | "medium" | "high" | "critical";
  state: "proposed" | "committed" | "rejected";
  createdBy: PrincipalId;
  agentRunId: AgentRunId | null;
  createdAt: number;
}

export interface PublicationEvent {
  id: string;
  contentItemId: ContentItemId;
  previousRevisionId: RevisionId | null;
  publishedRevisionId: RevisionId;
  actorPrincipalId: PrincipalId;
  committedAt: number;
  verificationState: "pending" | "verified" | "failed";
}

export interface AuditEvent {
  id: AuditEventId;
  workspaceId: WorkspaceId;
  siteId: SiteId | null;
  occurredAt: number;
  actorPrincipalId: PrincipalId;
  actorType: PrincipalType;
  onBehalfOfPrincipalId: PrincipalId | null;
  delegationId: DelegationId | null;
  action: string;
  resourceType: string;
  resourceId: string;
  revisionId: RevisionId | null;
  capability: string;
  result: "success" | "denied" | "failure";
  reason: string | null;
  requestId: string;
  details: Record<string, unknown>;
}

export interface OutboxEvent {
  id: OutboxEventId;
  eventType: string;
  aggregateType: string;
  aggregateId: string;
  payload: Record<string, unknown>;
  state: "pending" | "dispatched" | "failed";
  attempts: number;
  availableAt: number;
  createdAt: number;
}


export interface StoredContentAlias {
  aliasContentItemId: ContentItemId;
  targetContentItemId: ContentItemId;
  createdAt: number;
}

export interface TrashEntry {
  contentItemId: ContentItemId;
  rootContentItemId: ContentItemId;
  previousParentId: ContentNodeId | null;
  previousSlug: string;
  previousPath: string;
  trashedBy: PrincipalId;
  trashedAt: number;
}

export interface ContentManagerEntry {
  snapshot: ContentSnapshot;
  aliasTargetContentItemId: ContentItemId | null;
  trash: TrashEntry | null;
}

export interface ContentCopyResult {
  root: ContentSnapshot;
  copiedContentIds: ContentItemId[];
}

export type PublicPathResolution =
  | { kind: "content"; snapshot: ContentSnapshot }
  | { kind: "redirect"; location: string; statusCode: 301 | 302 | 307 | 308 };

export interface RelocationImpactReport {
  contentItemId: ContentItemId;
  oldRootPath: string;
  newRootPath: string;
  affected: Array<{ contentItemId: ContentItemId; oldPath: string; newPath: string }>;
  redirectCount: number;
  riskLevel: "medium" | "high" | "critical";
}

export interface ContentTrashResult {
  rootContentItemId: ContentItemId;
  affectedContentIds: ContentItemId[];
}

export interface ContentSnapshot {
  item: ContentItem;
  node: StoredContentNode;
  route: StoredRoute;
  workingRevision: ContentRevision | null;
  publishedRevision: ContentRevision | null;
}
