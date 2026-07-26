import {
  asContentItemId,
  asContentNodeId,
  asPrincipalId,
  asSiteId,
  DomainError,
  assertDomain,
  newId,
  sha256,
  stableStringify,
  systemClock,
  type ActorContext,
  type ApprovalId,
  type Clock,
  type ContentItemId,
  type ContentNodeId,
  type PrincipalId,
  type RevisionId,
  type SiteId,
  type WorkspaceId,
} from "@baser-edge/core-types";
import {
  Capabilities,
  evaluateAuthorization,
  type Capability,
  type CapabilityScope,
  type AuthorizationResource,
} from "@baser-edge/authorization";
import { childPath, normalizePath, normalizeSiteHostname, normalizeSlug } from "@baser-edge/baser-domain";
import {
  createDefaultComponentRegistry,
  createEmptyDocument,
  validateDocument,
  type ComponentRegistry,
  type StructuredDocument,
} from "@baser-edge/structured-document";
import type {
  ApprovalRequest,
  AuditEvent,
  ContentCopyResult,
  ContentManagerEntry,
  ContentRevision,
  ContentSnapshot,
  ContentTrashResult,
  PublicPathResolution,
  RelocationImpactReport,
  Principal,
  StoredCapabilityGrant,
  StoredDelegationGrant,
} from "./entities.js";
import type { CmsSecurityHooks } from "./security-hooks.js";
import type { CmsStore } from "./store.js";

export interface BootstrapInput {
  workspaceName: string;
  siteName: string;
  hostname: string;
  ownerName: string;
  locale?: string;
}

export interface BootstrapResult {
  workspaceId: WorkspaceId;
  siteId: SiteId;
  ownerPrincipalId: PrincipalId;
}

export interface CreatePageInput {
  siteId: SiteId;
  parentId: ContentNodeId | null;
  slug: string;
  title: string;
  document: StructuredDocument;
}

export interface CreateArticleInput {
  blogContentItemId: ContentItemId;
  slug: string;
  title: string;
  document: StructuredDocument;
}

export interface CmsLifecyclePublishEvent {
  actor: ActorContext;
  workspaceId: WorkspaceId;
  siteId: SiteId;
  contentItemId: ContentItemId;
  revisionId: RevisionId;
  approvalId: ApprovalId;
  contentType: string;
  path: string;
}

export interface CmsLifecycleHooks {
  beforePublish?(event: CmsLifecyclePublishEvent): Promise<void>;
  afterPublish?(event: CmsLifecyclePublishEvent): Promise<void>;
}

export interface CommitRevisionInput {
  contentItemId: ContentItemId;
  baseRevisionId: RevisionId;
  expectedLockVersion: number;
  fields: Record<string, unknown>;
  document: StructuredDocument;
  changeSummary: string;
  agentRunId?: string;
}

export class CmsService {
  readonly #store: CmsStore;
  readonly #clock: Clock;
  readonly #registry: ComponentRegistry;
  #lifecycleHooks: CmsLifecycleHooks | undefined;
  #securityHooks: CmsSecurityHooks | undefined;

  constructor(store: CmsStore, options: { clock?: Clock; registry?: ComponentRegistry; lifecycleHooks?: CmsLifecycleHooks; securityHooks?: CmsSecurityHooks } = {}) {
    this.#store = store;
    this.#clock = options.clock ?? systemClock;
    this.#registry = options.registry ?? createDefaultComponentRegistry();
    this.#lifecycleHooks = options.lifecycleHooks;
    this.#securityHooks = options.securityHooks;
  }

  get store(): CmsStore { return this.#store; }
  attachLifecycleHooks(hooks: CmsLifecycleHooks | undefined): void { this.#lifecycleHooks = hooks; }
  attachSecurityHooks(hooks: CmsSecurityHooks | undefined): void { this.#securityHooks = hooks; }
  get registry(): ComponentRegistry { return this.#registry; }

  async authorizeOperation(
    actor: ActorContext,
    capability: Capability,
    resource: AuthorizationResource,
    action: string,
    resourceType: string,
    resourceId: string,
  ): Promise<void> {
    return this.#authorize(actor, capability, resource, action, resourceType, resourceId);
  }

  async recordSuccessfulOperation(
    actor: ActorContext,
    input: {
      workspaceId: WorkspaceId;
      siteId?: SiteId | null;
      action: string;
      resourceType: string;
      resourceId: string;
      revisionId?: RevisionId | null;
      capability: string;
      details?: Record<string, unknown>;
    },
  ): Promise<void> {
    return this.#successAudit(
      actor,
      input.workspaceId,
      input.siteId ?? null,
      input.action,
      input.resourceType,
      input.resourceId,
      input.revisionId ?? null,
      input.capability,
      input.details ?? {},
    );
  }

  async getRevisionForPreview(actor: ActorContext, contentItemId: ContentItemId, revisionId: RevisionId): Promise<ContentRevision> {
    const snapshot = await this.#requireSnapshot(contentItemId);
    await this.#authorize(actor, Capabilities.ContentRead, this.#resource(snapshot, "low"), "preview.revision-read", "content-item", contentItemId);
    const revision = await this.#requireRevision(revisionId);
    assertDomain(revision.contentItemId === contentItemId, "REVISION_CONTENT_MISMATCH", "Revision belongs to another content item", 422);
    return revision;
  }

  async bootstrap(input: BootstrapInput): Promise<BootstrapResult> {
    const now = this.#clock.now();
    const workspaceId = newId("workspace") as WorkspaceId;
    const siteId = asSiteId(newId("site"));
    const ownerId = asPrincipalId(newId("principal"));
    const owner: Principal = {
      id: ownerId,
      workspaceId,
      type: "human",
      displayName: input.ownerName,
      state: "active",
      createdAt: now,
    };
    const ownerGrant: StoredCapabilityGrant = {
      id: newId("grant") as StoredCapabilityGrant["id"],
      principalId: ownerId,
      capability: Capabilities.All,
      scope: { workspaceId },
    };
    await this.#store.bootstrap({
      workspace: { id: workspaceId, name: input.workspaceName, createdAt: now },
      owner,
      site: {
        id: siteId,
        workspaceId,
        name: input.siteName,
        hostname: normalizeSiteHostname(input.hostname),
        locale: input.locale ?? "ja-JP",
        state: "active",
        createdAt: now,
        updatedAt: now,
      },
      ownerGrant,
    });
    return { workspaceId, siteId, ownerPrincipalId: ownerId };
  }

  async createPrincipal(actor: ActorContext, input: { workspaceId: WorkspaceId; type: Principal["type"]; displayName: string }): Promise<Principal> {
    await this.#authorize(actor, Capabilities.PrincipalManage, { workspaceId: input.workspaceId, risk: "high" }, "principal.create", "workspace", input.workspaceId);
    const principal: Principal = {
      id: asPrincipalId(newId("principal")),
      workspaceId: input.workspaceId,
      type: input.type,
      displayName: input.displayName,
      state: "active",
      createdAt: this.#clock.now(),
    };
    await this.#store.createPrincipal(principal);
    await this.#successAudit(actor, input.workspaceId, null, "principal.create", "principal", principal.id, null, Capabilities.PrincipalManage, {});
    return principal;
  }

  async grantCapability(actor: ActorContext, input: { principalId: PrincipalId; capability: Capability; scope?: CapabilityScope; validUntil?: number }): Promise<StoredCapabilityGrant> {
    const principal = await this.#requirePrincipal(input.principalId);
    await this.#authorize(actor, Capabilities.GrantManage, { workspaceId: principal.workspaceId, risk: "high" }, "grant.create", "principal", principal.id);
    const grant: StoredCapabilityGrant = {
      id: newId("grant") as StoredCapabilityGrant["id"],
      principalId: principal.id,
      capability: input.capability,
      scope: input.scope ?? { workspaceId: principal.workspaceId },
    };
    if (input.validUntil !== undefined) grant.validUntil = input.validUntil;
    await this.#store.createCapabilityGrant(grant);
    await this.#successAudit(actor, principal.workspaceId, null, "grant.create", "principal", principal.id, null, Capabilities.GrantManage, { grantedCapability: input.capability });
    return grant;
  }

  async createDelegation(actor: ActorContext, input: {
    humanPrincipalId: PrincipalId;
    agentPrincipalId: PrincipalId;
    capabilities: Capability[];
    scope?: CapabilityScope;
    maximumRisk?: StoredDelegationGrant["maximumRisk"];
    expiresAt: number;
  }): Promise<StoredDelegationGrant> {
    const human = await this.#requirePrincipal(input.humanPrincipalId);
    const agent = await this.#requirePrincipal(input.agentPrincipalId);
    assertDomain(actor.actorId === human.id, "DELEGATION_OWNER_REQUIRED", "Only the delegating human can create this delegation", 403);
    assertDomain(agent.type === "agent", "AGENT_REQUIRED", "Delegation target must be an agent", 422);
    const delegation: StoredDelegationGrant = {
      id: newId("delegation") as StoredDelegationGrant["id"],
      humanPrincipalId: human.id,
      agentPrincipalId: agent.id,
      capabilities: [...input.capabilities],
      scope: input.scope ?? { workspaceId: human.workspaceId },
      maximumRisk: input.maximumRisk ?? "medium",
      expiresAt: input.expiresAt,
    };
    await this.#store.createDelegationGrant(delegation);
    await this.#successAudit(actor, human.workspaceId, null, "delegation.create", "agent", agent.id, null, "delegation.create", { capabilities: input.capabilities });
    return delegation;
  }

  async createPage(actor: ActorContext, input: CreatePageInput): Promise<ContentSnapshot> {
    const prepared = await this.#prepareCreate(actor, input.siteId, input.parentId, input.slug, "page", input.document, input.title);
    return this.#store.createPage({ ...prepared, actor, title: input.title, document: input.document, now: this.#clock.now() });
  }

  async createFolder(actor: ActorContext, input: Omit<CreatePageInput, "document">): Promise<ContentSnapshot> {
    const document = createEmptyDocument();
    const prepared = await this.#prepareCreate(actor, input.siteId, input.parentId, input.slug, "folder", document, input.title);
    return this.#store.createFolder({ ...prepared, actor, title: input.title, document, now: this.#clock.now() });
  }

  async createCustomContent(actor: ActorContext, input: CreatePageInput): Promise<ContentSnapshot> {
    const prepared = await this.#prepareCreate(actor, input.siteId, input.parentId, input.slug, "custom-content", input.document, input.title, Capabilities.CustomContentCreate);
    return this.#store.createCustomContent({ ...prepared, actor, title: input.title, document: input.document, now: this.#clock.now() });
  }

  async createMailForm(actor: ActorContext, input: CreatePageInput): Promise<ContentSnapshot> {
    const prepared = await this.#prepareCreate(actor, input.siteId, input.parentId, input.slug, "mail-form", input.document, input.title, Capabilities.MailFormCreate);
    return this.#store.createMailForm({ ...prepared, actor, title: input.title, document: input.document, now: this.#clock.now() });
  }

  async createBlog(actor: ActorContext, input: CreatePageInput): Promise<ContentSnapshot> {
    const prepared = await this.#prepareCreate(actor, input.siteId, input.parentId, input.slug, "blog", input.document, input.title, Capabilities.BlogCreate);
    return this.#store.createBlog({ ...prepared, actor, title: input.title, document: input.document, now: this.#clock.now() });
  }

  async createArticle(actor: ActorContext, input: CreateArticleInput): Promise<ContentSnapshot> {
    const blog = await this.#requireSnapshot(input.blogContentItemId);
    assertDomain(blog.item.contentTypeKey === "blog", "BLOG_REQUIRED", "Article parent must be a blog", 422);
    const prepared = await this.#prepareCreate(actor, blog.item.siteId, blog.node.id, input.slug, "article", input.document, input.title, Capabilities.ArticleCreate);
    return this.#store.createArticle({ ...prepared, actor, title: input.title, document: input.document, now: this.#clock.now() });
  }

  async createAlias(actor: ActorContext, input: Omit<CreatePageInput, "document"> & { targetContentItemId: ContentItemId }): Promise<ContentSnapshot> {
    const target = await this.#requireSnapshot(input.targetContentItemId);
    assertDomain(target.item.siteId === input.siteId, "CROSS_SITE_ALIAS", "Alias target belongs to another site", 422);
    assertDomain(target.item.state === "active", "ALIAS_TARGET_INACTIVE", "Alias target is not active", 409);
    assertDomain(target.item.contentTypeKey !== "folder" && target.item.contentTypeKey !== "alias", "INVALID_ALIAS_TARGET", "Aliases can target publishable content only", 422);
    const document = createEmptyDocument();
    const prepared = await this.#prepareCreate(actor, input.siteId, input.parentId, input.slug, "alias", document, input.title, Capabilities.AliasCreate);
    return this.#store.createAlias({ ...prepared, actor, title: input.title, document, targetContentItemId: input.targetContentItemId, now: this.#clock.now() });
  }

  async getContent(actor: ActorContext, contentItemId: ContentItemId): Promise<ContentSnapshot> {
    const snapshot = await this.#requireSnapshot(contentItemId);
    await this.#authorize(actor, Capabilities.ContentRead, this.#resource(snapshot, "low"), "content.read", "content-item", contentItemId);
    return snapshot;
  }

  async commitRevision(actor: ActorContext, input: CommitRevisionInput): Promise<ContentRevision> {
    const snapshot = await this.#requireSnapshot(input.contentItemId);
    await this.#authorize(actor, Capabilities.ContentRevise, this.#resource(snapshot, "low"), "content.revise", "content-item", input.contentItemId);
    this.#validateDocument(input.document);
    const contentHash = await this.#contentHash(input.fields, input.document);
    return this.#store.commitRevision({
      actor,
      contentItemId: input.contentItemId,
      baseRevisionId: input.baseRevisionId,
      expectedLockVersion: input.expectedLockVersion,
      fields: input.fields,
      document: input.document,
      contentHash,
      changeSummary: input.changeSummary,
      agentRunId: input.agentRunId ?? null,
      now: this.#clock.now(),
    });
  }

  async analyzeRelocation(actor: ActorContext, input: { contentItemId: ContentItemId; targetParentId: ContentNodeId | null; newSlug: string }): Promise<RelocationImpactReport> {
    const snapshot = await this.#requireSnapshot(input.contentItemId);
    await this.#authorize(actor, Capabilities.ContentMove, this.#resource(snapshot, "high"), "content.move-impact", "content-item", input.contentItemId);
    const parent = input.targetParentId ? await this.#requireParentNode(input.targetParentId, snapshot.item.siteId, snapshot.item.contentTypeKey) : null;
    const newRootPath = childPath(parent?.cachedPath ?? null, normalizeSlug(input.newSlug));
    const tree = await this.#store.listContentTree(snapshot.item.siteId);
    const affected = tree
      .filter((entry) => entry.snapshot.node.cachedPath === snapshot.node.cachedPath || entry.snapshot.node.cachedPath.startsWith(`${snapshot.node.cachedPath}/`))
      .map((entry) => ({
        contentItemId: entry.snapshot.item.id,
        oldPath: entry.snapshot.node.cachedPath,
        newPath: normalizePath(`${newRootPath}${entry.snapshot.node.cachedPath.slice(snapshot.node.cachedPath.length)}`),
      }));
    const riskLevel = affected.length > 100 ? "critical" : affected.length > 1 ? "high" : "medium";
    return { contentItemId: snapshot.item.id, oldRootPath: snapshot.node.cachedPath, newRootPath, affected, redirectCount: affected.length, riskLevel };
  }

  async relocateContent(actor: ActorContext, input: { contentItemId: ContentItemId; targetParentId: ContentNodeId | null; newSlug: string; expectedTreeVersion: number }): Promise<ContentSnapshot> {
    const snapshot = await this.#requireSnapshot(input.contentItemId);
    await this.#authorize(actor, Capabilities.ContentMove, this.#resource(snapshot, "high"), "content.move", "content-item", input.contentItemId);
    if (snapshot.item.contentTypeKey === "article" && input.targetParentId !== snapshot.node.parentId) {
      throw new DomainError("ARTICLE_CROSS_BLOG_MOVE_NOT_IMPLEMENTED", "Moving an article to another blog requires the Blog module migration path", 409);
    }
    return this.#store.relocateContent({
      actor,
      contentItemId: input.contentItemId,
      targetParentId: input.targetParentId,
      newSlug: normalizeSlug(input.newSlug),
      expectedTreeVersion: input.expectedTreeVersion,
      now: this.#clock.now(),
    });
  }

  async reorderContent(actor: ActorContext, input: {
    contentItemId: ContentItemId;
    targetParentId: ContentNodeId | null;
    insertAfterContentItemId: ContentItemId | null;
    expectedTreeVersion: number;
  }): Promise<ContentSnapshot> {
    const snapshot = await this.#requireSnapshot(input.contentItemId);
    await this.#authorize(actor, Capabilities.ContentMove, this.#resource(snapshot, "medium"), "content.reorder", "content-item", input.contentItemId);
    if (snapshot.item.contentTypeKey === "article" && input.targetParentId !== snapshot.node.parentId) {
      throw new DomainError("ARTICLE_CROSS_BLOG_MOVE_NOT_IMPLEMENTED", "Moving an article to another blog requires the Blog module migration path", 409);
    }
    return this.#store.reorderContent({
      actor,
      contentItemId: input.contentItemId,
      targetParentId: input.targetParentId,
      insertAfterContentItemId: input.insertAfterContentItemId,
      expectedTreeVersion: input.expectedTreeVersion,
      now: this.#clock.now(),
    });
  }


  async copyContent(actor: ActorContext, input: {
    contentItemId: ContentItemId;
    targetParentId: ContentNodeId | null;
    newSlug: string;
    expectedTreeVersion: number;
    includeDescendants?: boolean;
  }): Promise<ContentCopyResult> {
    const snapshot = await this.#requireSnapshot(input.contentItemId);
    await this.#authorize(actor, Capabilities.ContentCopy, this.#resource(snapshot, "medium"), "content.copy", "content-item", input.contentItemId);
    const tree = await this.#store.listContentTree(snapshot.item.siteId);
    const subtree = tree.filter((entry) => entry.snapshot.node.cachedPath === snapshot.node.cachedPath || entry.snapshot.node.cachedPath.startsWith(`${snapshot.node.cachedPath}/`));
    if (subtree.some((entry) => entry.snapshot.item.contentTypeKey === "blog" || entry.snapshot.item.contentTypeKey === "article")) {
      throw new DomainError("BLOG_COPY_NOT_IMPLEMENTED", "Copying Blog or Article content requires module-aware metadata duplication", 409);
    }
    if (subtree.some((entry) => entry.snapshot.item.contentTypeKey === "custom-content")) {
      throw new DomainError("CUSTOM_CONTENT_COPY_NOT_IMPLEMENTED", "Copying Custom Content requires schema and entry-aware duplication", 409);
    }
    if (subtree.some((entry) => entry.snapshot.item.contentTypeKey === "mail-form")) {
      throw new DomainError("MAIL_FORM_COPY_NOT_IMPLEMENTED", "Copying Mail Form requires field policy and notification-aware duplication", 409);
    }
    if (input.targetParentId) await this.#requireParentNode(input.targetParentId, snapshot.item.siteId, snapshot.item.contentTypeKey);
    return this.#store.copyContent({
      actor,
      contentItemId: input.contentItemId,
      targetParentId: input.targetParentId,
      newSlug: normalizeSlug(input.newSlug),
      expectedTreeVersion: input.expectedTreeVersion,
      includeDescendants: input.includeDescendants ?? (snapshot.item.contentTypeKey === "folder" || snapshot.item.contentTypeKey === "blog"),
      now: this.#clock.now(),
    });
  }

  async trashContent(actor: ActorContext, input: { contentItemId: ContentItemId; expectedTreeVersion: number }): Promise<ContentTrashResult> {
    const snapshot = await this.#requireSnapshot(input.contentItemId);
    await this.#authorize(actor, Capabilities.ContentTrash, this.#resource(snapshot, "high"), "content.trash", "content-item", input.contentItemId);
    return this.#store.trashContent({ actor, contentItemId: input.contentItemId, expectedTreeVersion: input.expectedTreeVersion, now: this.#clock.now() });
  }

  async restoreContent(actor: ActorContext, input: {
    contentItemId: ContentItemId;
    targetParentId?: ContentNodeId | null;
    newSlug?: string;
    expectedTreeVersion: number;
  }): Promise<ContentSnapshot> {
    const snapshot = await this.#requireSnapshot(input.contentItemId);
    await this.#authorize(actor, Capabilities.ContentRestore, this.#resource(snapshot, "high"), "content.restore", "content-item", input.contentItemId);
    if (snapshot.item.contentTypeKey === "article" && input.targetParentId !== undefined) {
      throw new DomainError("ARTICLE_REPARENT_ON_RESTORE_NOT_IMPLEMENTED", "Restore articles to their original blog before moving them", 409);
    }
    if (input.targetParentId) await this.#requireParentNode(input.targetParentId, snapshot.item.siteId, snapshot.item.contentTypeKey);
    return this.#store.restoreContent({
      actor,
      contentItemId: input.contentItemId,
      targetParentId: input.targetParentId ?? null,
      newSlug: input.newSlug ? normalizeSlug(input.newSlug) : null,
      expectedTreeVersion: input.expectedTreeVersion,
      now: this.#clock.now(),
    });
  }

  async listContentTree(actor: ActorContext, siteId: SiteId): Promise<ContentManagerEntry[]> {
    const site = await this.#requireSite(siteId);
    await this.#authorize(actor, Capabilities.ContentRead, { workspaceId: site.workspaceId, siteId, risk: "low" }, "content-tree.read", "site", siteId);
    return this.#store.listContentTree(siteId);
  }

  async listTrash(actor: ActorContext, siteId: SiteId): Promise<ContentManagerEntry[]> {
    const site = await this.#requireSite(siteId);
    await this.#authorize(actor, Capabilities.ContentRead, { workspaceId: site.workspaceId, siteId, risk: "low" }, "trash.read", "site", siteId);
    return this.#store.listTrash(siteId);
  }

  async listPendingApprovals(actor: ActorContext, siteId: SiteId): Promise<ApprovalRequest[]> {
    const site = await this.#requireSite(siteId);
    await this.#authorize(actor, Capabilities.ContentApprove, { workspaceId: site.workspaceId, siteId, risk: "medium" }, "approvals.list", "site", siteId);
    return this.#store.listPendingApprovalsBySite(siteId);
  }

  async listContentApprovalInbox(actor: ActorContext, siteId: SiteId): Promise<import("./entities.js").ContentApprovalInboxItem[]> {
    const pending = await this.listPendingApprovals(actor, siteId);
    const items: import("./entities.js").ContentApprovalInboxItem[] = [];
    for (const approval of pending) {
      const snapshot = await this.#requireSnapshot(approval.contentItemId);
      const revision = snapshot.workingRevision?.id === approval.revisionId
        ? snapshot.workingRevision
        : await this.#requireRevision(approval.revisionId);
      const titleField = revision.fields.title;
      items.push({
        approval,
        path: snapshot.route.path,
        title: typeof titleField === "string" && titleField ? titleField : snapshot.node.slug,
        fromAgent: Boolean(revision.agentRunId),
        agentRunId: revision.agentRunId,
      });
    }
    return items;
  }

  async requestApproval(actor: ActorContext, input: { contentItemId: ContentItemId; revisionId: RevisionId; riskLevel?: ApprovalRequest["riskLevel"] }): Promise<ApprovalRequest> {
    const snapshot = await this.#requireSnapshot(input.contentItemId);
    await this.#authorize(actor, Capabilities.ContentRequestPublish, this.#resource(snapshot, input.riskLevel ?? "medium"), "content.request-publish", "content-item", input.contentItemId);
    const revision = await this.#requireRevision(input.revisionId);
    assertDomain(revision.contentItemId === input.contentItemId, "REVISION_CONTENT_MISMATCH", "Revision belongs to another content item", 422);
    assertDomain(snapshot.item.workingRevisionId === revision.id, "STALE_APPROVAL_REQUEST", "Only the current working revision can be requested", 409);
    return this.#store.createApproval({
      actor,
      contentItemId: input.contentItemId,
      revisionId: revision.id,
      revisionHash: revision.contentHash,
      riskLevel: input.riskLevel ?? "medium",
      now: this.#clock.now(),
    });
  }

  async decideApproval(actor: ActorContext, input: { approvalId: ApprovalId; decision: "approved" | "rejected"; comment?: string }): Promise<ApprovalRequest> {
    const approval = await this.#requireApproval(input.approvalId);
    const snapshot = await this.#requireSnapshot(approval.contentItemId);
    await this.#authorize(actor, Capabilities.ContentApprove, this.#resource(snapshot, approval.riskLevel), `content.${input.decision}`, "approval", approval.id);
    return this.#store.decideApproval({
      actor,
      approvalId: approval.id,
      decision: input.decision,
      comment: input.comment ?? "",
      now: this.#clock.now(),
    });
  }

  async publish(actor: ActorContext, input: { contentItemId: ContentItemId; revisionId: RevisionId; approvalId: ApprovalId }): Promise<ContentSnapshot> {
    const snapshot = await this.#requireSnapshot(input.contentItemId);
    await this.#authorize(actor, Capabilities.ContentPublish, this.#resource(snapshot, "high"), "content.publish", "content-item", input.contentItemId);
    const event: CmsLifecyclePublishEvent = {
      actor, workspaceId: snapshot.item.workspaceId, siteId: snapshot.item.siteId, contentItemId: input.contentItemId,
      revisionId: input.revisionId, approvalId: input.approvalId, contentType: snapshot.item.contentTypeKey, path: snapshot.node.cachedPath,
    };
    await this.#lifecycleHooks?.beforePublish?.(event);
    const published = await this.#store.publish({
      actor,
      contentItemId: input.contentItemId,
      revisionId: input.revisionId,
      approvalId: input.approvalId,
      now: this.#clock.now(),
    });
    await this.#lifecycleHooks?.afterPublish?.(event);
    return published;
  }

  async unpublish(actor: ActorContext, input: { contentItemId: ContentItemId }): Promise<ContentSnapshot> {
    const snapshot = await this.#requireSnapshot(input.contentItemId);
    await this.#authorize(actor, Capabilities.ContentUnpublish, this.#resource(snapshot, "high"), "content.unpublish", "content-item", input.contentItemId);
    assertDomain(snapshot.item.publishedRevisionId !== null, "CONTENT_NOT_PUBLISHED", "Content is not published", 409);
    return this.#store.unpublish({
      actor,
      contentItemId: input.contentItemId,
      now: this.#clock.now(),
    });
  }

  async resolvePublicPath(siteId: SiteId, path: string): Promise<PublicPathResolution | null> {
    return this.#store.resolvePublicPath(siteId, path);
  }

  async findPublicByPath(siteId: SiteId, path: string): Promise<ContentSnapshot | null> {
    return this.#store.findPublicByPath(siteId, path);
  }

  async listAudit(actor: ActorContext, workspaceId: WorkspaceId): Promise<AuditEvent[]> {
    await this.#authorize(actor, Capabilities.ContentRead, { workspaceId, risk: "low" }, "audit.read", "workspace", workspaceId);
    return this.#store.listAudit(workspaceId);
  }

  async #prepareCreate(
    actor: ActorContext,
    siteId: SiteId,
    parentId: ContentNodeId | null,
    slugInput: string,
    contentType: string,
    document: StructuredDocument,
    title: string,
    capability: Capability = Capabilities.ContentCreate,
  ) {
    const site = await this.#requireSite(siteId);
    const parent = parentId ? await this.#requireParentNode(parentId, siteId, contentType) : null;
    if (!parent && contentType === "article") throw new DomainError("ARTICLE_PARENT_REQUIRED", "Articles must belong to a blog", 422);
    const slug = normalizeSlug(slugInput);
    const path = childPath(parent?.cachedPath ?? null, slug);
    await this.#authorize(actor, capability, { workspaceId: site.workspaceId, siteId: site.id, contentType, path, risk: "low" }, `${contentType}.create`, "site", site.id);
    this.#validateDocument(document);
    const contentHash = await this.#contentHash({ title }, document);
    return { workspaceId: site.workspaceId, siteId: site.id, parentId, slug, path, contentHash };
  }

  async #requireFolderNode(nodeId: ContentNodeId, siteId: SiteId) {
    return this.#requireParentNode(nodeId, siteId, "page");
  }

  async #requireParentNode(nodeId: ContentNodeId, siteId: SiteId, childType: string) {
    const node = await this.#store.getNode(nodeId);
    assertDomain(node, "PARENT_NOT_FOUND", "Parent node not found", 404);
    assertDomain(node.siteId === siteId, "CROSS_SITE_PARENT", "Parent belongs to another site", 422);
    const parent = await this.#requireSnapshot(node.contentItemId);
    assertDomain(parent.item.state === "active", "PARENT_TRASHED", "Parent is in trash", 409);
    const required = childType === "article" ? "blog" : "folder";
    const code = required === "blog" ? "PARENT_MUST_BE_BLOG" : "PARENT_MUST_BE_FOLDER";
    const message = required === "blog" ? "Articles can only belong to a blog" : "Only folders can contain this content type";
    assertDomain(parent.item.contentTypeKey === required, code, message, 422);
    return node;
  }

  #validateDocument(document: StructuredDocument): void {
    const result = validateDocument(document, this.#registry);
    assertDomain(result.valid, "INVALID_DOCUMENT", "Structured document is invalid", 422, { errors: result.errors });
  }

  async #contentHash(fields: Record<string, unknown>, document: StructuredDocument): Promise<string> {
    return sha256(stableStringify({ fields, document }));
  }

  async #requireSnapshot(contentItemId: ContentItemId): Promise<ContentSnapshot> {
    const snapshot = await this.#store.getContentSnapshot(contentItemId);
    assertDomain(snapshot, "CONTENT_NOT_FOUND", "Content item not found", 404);
    return snapshot;
  }

  async #requireRevision(revisionId: RevisionId): Promise<ContentRevision> {
    const revision = await this.#store.getRevision(revisionId);
    assertDomain(revision, "REVISION_NOT_FOUND", "Revision not found", 404);
    return revision;
  }

  async #requireApproval(approvalId: ApprovalId): Promise<ApprovalRequest> {
    const approval = await this.#store.getApproval(approvalId);
    assertDomain(approval, "APPROVAL_NOT_FOUND", "Approval not found", 404);
    return approval;
  }

  async #requirePrincipal(id: PrincipalId): Promise<Principal> {
    const principal = await this.#store.getPrincipal(id);
    assertDomain(principal, "PRINCIPAL_NOT_FOUND", "Principal not found", 404);
    assertDomain(principal.state === "active", "PRINCIPAL_DISABLED", "Principal is disabled", 403);
    return principal;
  }

  async #requireSite(id: SiteId) {
    const site = await this.#store.getSite(id);
    assertDomain(site, "SITE_NOT_FOUND", "Site not found", 404);
    return site;
  }

  #resource(snapshot: ContentSnapshot, risk: AuthorizationResource["risk"]): AuthorizationResource {
    return {
      workspaceId: snapshot.item.workspaceId,
      siteId: snapshot.item.siteId,
      contentType: snapshot.item.contentTypeKey,
      path: snapshot.route.path,
      risk,
    };
  }

  async #authorize(
    actor: ActorContext,
    capability: Capability,
    resource: AuthorizationResource,
    action: string,
    resourceType: string,
    resourceId: string,
  ): Promise<void> {
    const principal = await this.#requirePrincipal(actor.actorId);
    assertDomain(principal.workspaceId === resource.workspaceId, "WORKSPACE_MISMATCH", "Principal belongs to another workspace", 403);
    const grants = await this.#store.listCapabilityGrants(actor.actorId);
    const delegation = actor.delegationId ? await this.#store.getDelegationGrant(actor.delegationId) : null;
    const input = {
      actor,
      capability,
      resource,
      grants,
      now: this.#clock.now(),
      ...(delegation ? { delegation } : {}),
    };
    const decision = evaluateAuthorization(input);
    if (!decision.allowed) {
      const siteId = resource.siteId ?? null;
      await this.#store.appendAudit({
        id: newId("audit") as AuditEvent["id"],
        workspaceId: resource.workspaceId,
        siteId,
        occurredAt: this.#clock.now(),
        actorPrincipalId: actor.actorId,
        actorType: actor.actorType,
        onBehalfOfPrincipalId: actor.onBehalfOf ?? null,
        delegationId: actor.delegationId ?? null,
        action,
        resourceType,
        resourceId,
        revisionId: null,
        capability,
        result: "denied",
        reason: decision.reason,
        requestId: actor.requestId,
        details: {},
      });
      throw new DomainError("FORBIDDEN", `Operation denied: ${decision.reason}`, 403, { capability, reason: decision.reason });
    }
    if (this.#securityHooks?.assertStepUp) {
      await this.#securityHooks.assertStepUp(actor, { action, capability, risk: resource.risk });
    }
  }

  async #successAudit(
    actor: ActorContext,
    workspaceId: WorkspaceId,
    siteId: SiteId | null,
    action: string,
    resourceType: string,
    resourceId: string,
    revisionId: RevisionId | null,
    capability: string,
    details: Record<string, unknown>,
  ): Promise<void> {
    await this.#store.appendAudit({
      id: newId("audit") as AuditEvent["id"],
      workspaceId,
      siteId,
      occurredAt: this.#clock.now(),
      actorPrincipalId: actor.actorId,
      actorType: actor.actorType,
      onBehalfOfPrincipalId: actor.onBehalfOf ?? null,
      delegationId: actor.delegationId ?? null,
      action,
      resourceType,
      resourceId,
      revisionId,
      capability,
      result: "success",
      reason: null,
      requestId: actor.requestId,
      details,
    });
  }
}

export function actor(principalId: PrincipalId, actorType: ActorContext["actorType"], options: {
  onBehalfOf?: PrincipalId;
  delegationId?: ActorContext["delegationId"];
  requestId?: string;
  authSessionId?: ActorContext["authSessionId"];
  authenticationMethod?: ActorContext["authenticationMethod"];
} = {}): ActorContext {
  const context: ActorContext = {
    actorId: principalId,
    actorType,
    requestId: options.requestId ?? crypto.randomUUID(),
  };
  if (options.onBehalfOf !== undefined) context.onBehalfOf = options.onBehalfOf;
  if (options.delegationId !== undefined) context.delegationId = options.delegationId;
  if (options.authSessionId !== undefined) context.authSessionId = options.authSessionId;
  if (options.authenticationMethod !== undefined) context.authenticationMethod = options.authenticationMethod;
  return context;
}
