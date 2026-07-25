import {
  DomainError,
  asApprovalId,
  asContentItemId,
  asContentNodeId,
  asRevisionId,
  asAssetId,
  newId,
  type ActorContext,
  type AssetId,
  type ApprovalId,
  type ContentItemId,
  type ContentNodeId,
  type PrincipalId,
  type RevisionId,
  type SiteId,
  type WorkspaceId,
} from "@baser-edge/core-types";
import { buildSortKey, childPath, compareSortKeys, normalizePath, normalizeSlug } from "@baser-edge/baser-domain";
import { collectAssetReferences } from "@baser-edge/structured-document";
import type {
  AgentRun,
  ApprovalRequest,
  AuditEvent,
  ChangeSet,
  ContentCopyResult,
  ContentItem,
  ContentManagerEntry,
  ContentRevision,
  ContentSnapshot,
  ContentTrashResult,
  OutboxEvent,
  Principal,
  PublishedAssetReference,
  StoredRevisionAssetReference,
  PublicationEvent,
  PublicPathResolution,
  Site,
  StoredCapabilityGrant,
  StoredContentAlias,
  StoredContentNode,
  StoredDelegationGrant,
  StoredRedirect,
  StoredRoute,
  TrashEntry,
  Workspace,
} from "./entities.js";
import type {
  BootstrapRecordInput,
  CmsStore,
  CommitRevisionRecordInput,
  CopyContentRecordInput,
  CreateAliasRecordInput,
  CreateApprovalRecordInput,
  CreateFolderRecordInput,
  CreatePageRecordInput,
  CreateBlogRecordInput,
  CreateCustomContentRecordInput,
  CreateMailFormRecordInput,
  CreateArticleRecordInput,
  DecideApprovalRecordInput,
  PublishRecordInput,
  UnpublishRecordInput,
  RelocateContentRecordInput,
  ReorderContentRecordInput,
  RestoreContentRecordInput,
  TrashContentRecordInput,
} from "./store.js";

export class MemoryCmsStore implements CmsStore {
  readonly workspaces = new Map<WorkspaceId, Workspace>();
  readonly sites = new Map<SiteId, Site>();
  readonly principals = new Map<PrincipalId, Principal>();
  readonly grants = new Map<string, StoredCapabilityGrant>();
  readonly delegations = new Map<string, StoredDelegationGrant>();
  readonly items = new Map<ContentItemId, ContentItem>();
  readonly revisions = new Map<RevisionId, ContentRevision>();
  readonly revisionAssetReferences: StoredRevisionAssetReference[] = [];
  readonly nodes = new Map<string, StoredContentNode>();
  readonly routes = new Map<string, StoredRoute>();
  readonly redirects = new Map<string, StoredRedirect>();
  readonly aliases = new Map<ContentItemId, StoredContentAlias>();
  readonly trashEntries = new Map<ContentItemId, TrashEntry>();
  readonly approvals = new Map<ApprovalId, ApprovalRequest>();
  readonly agentRuns = new Map<string, AgentRun>();
  readonly changeSets = new Map<string, ChangeSet>();
  readonly publicationEvents = new Map<string, PublicationEvent>();
  readonly audits = new Map<string, AuditEvent>();
  readonly outbox = new Map<string, OutboxEvent>();

  async bootstrap(input: BootstrapRecordInput): Promise<void> {
    if (this.workspaces.has(input.workspace.id)) throw new DomainError("WORKSPACE_EXISTS", "Workspace already exists", 409);
    this.workspaces.set(input.workspace.id, structuredClone(input.workspace));
    this.principals.set(input.owner.id, structuredClone(input.owner));
    this.sites.set(input.site.id, structuredClone(input.site));
    this.grants.set(input.ownerGrant.id, structuredClone(input.ownerGrant));
  }

  async createPrincipal(principal: Principal): Promise<void> {
    if (this.principals.has(principal.id)) throw new DomainError("PRINCIPAL_EXISTS", "Principal already exists", 409);
    this.principals.set(principal.id, structuredClone(principal));
  }

  async getPrincipal(id: PrincipalId): Promise<Principal | null> { return clone(this.principals.get(id) ?? null); }
  async createCapabilityGrant(grant: StoredCapabilityGrant): Promise<void> { this.grants.set(grant.id, structuredClone(grant)); }
  async createDelegationGrant(grant: StoredDelegationGrant): Promise<void> { this.delegations.set(grant.id, structuredClone(grant)); }
  async listCapabilityGrants(principalId: PrincipalId): Promise<StoredCapabilityGrant[]> {
    return [...this.grants.values()].filter((grant) => grant.principalId === principalId).map((grant) => structuredClone(grant));
  }
  async getDelegationGrant(id: string): Promise<StoredDelegationGrant | null> { return clone(this.delegations.get(id) ?? null); }

  async createPage(input: CreatePageRecordInput): Promise<ContentSnapshot> {
    return this.createRoutableContent(input, "page", "canonical");
  }

  async createFolder(input: CreateFolderRecordInput): Promise<ContentSnapshot> {
    return this.createRoutableContent(input, "folder", "canonical");
  }

  async createBlog(input: CreateBlogRecordInput): Promise<ContentSnapshot> {
    return this.createRoutableContent(input, "blog", "canonical");
  }

  async createCustomContent(input: CreateCustomContentRecordInput): Promise<ContentSnapshot> {
    return this.createRoutableContent(input, "custom-content", "canonical");
  }
  async createMailForm(input: CreateMailFormRecordInput): Promise<ContentSnapshot> {
    return this.createRoutableContent(input, "mail-form", "canonical");
  }

  async createArticle(input: CreateArticleRecordInput): Promise<ContentSnapshot> {
    return this.createRoutableContent(input, "article", "canonical");
  }

  async createAlias(input: CreateAliasRecordInput): Promise<ContentSnapshot> {
    const target = requireValue(this.items.get(input.targetContentItemId), "ALIAS_TARGET_NOT_FOUND", "Alias target not found");
    if (target.state !== "active") throw new DomainError("ALIAS_TARGET_INACTIVE", "Alias target is not active", 409);
    if (target.siteId !== input.siteId) throw new DomainError("CROSS_SITE_ALIAS", "Alias target belongs to another site", 422);
    if (target.contentTypeKey === "folder" || target.contentTypeKey === "alias") {
      throw new DomainError("INVALID_ALIAS_TARGET", "Aliases can target publishable content only", 422);
    }
    const snapshot = await this.createRoutableContent(input, "alias", "alias");
    this.aliases.set(snapshot.item.id, {
      aliasContentItemId: snapshot.item.id,
      targetContentItemId: target.id,
      createdAt: input.now,
    });
    return snapshot;
  }

  async getNode(id: ContentNodeId): Promise<StoredContentNode | null> { return clone(this.nodes.get(id) ?? null); }
  async getContentSnapshot(contentItemId: ContentItemId): Promise<ContentSnapshot | null> {
    if (!this.items.has(contentItemId)) return null;
    return this.snapshot(contentItemId);
  }
  async getRevision(revisionId: RevisionId): Promise<ContentRevision | null> { return clone(this.revisions.get(revisionId) ?? null); }

  async commitRevision(input: CommitRevisionRecordInput): Promise<ContentRevision> {
    const item = requireValue(this.items.get(input.contentItemId), "CONTENT_NOT_FOUND", "Content not found");
    if (item.state !== "active") throw new DomainError("CONTENT_TRASHED", "Trashed content cannot be revised", 409);
    if (item.contentTypeKey === "folder" || item.contentTypeKey === "alias") {
      throw new DomainError("CONTENT_NOT_EDITABLE", "This content type does not accept document revisions", 422);
    }
    if (item.workingRevisionId !== input.baseRevisionId || item.lockVersion !== input.expectedLockVersion) {
      throw new DomainError("REVISION_CONFLICT", "The content changed after the requested base revision", 409, {
        currentRevisionId: item.workingRevisionId,
        currentLockVersion: item.lockVersion,
      });
    }
    const previous = requireValue(this.revisions.get(input.baseRevisionId), "REVISION_NOT_FOUND", "Base revision not found");
    const revisionId = asRevisionId(newId("revision"));
    const revision: ContentRevision = {
      id: revisionId,
      contentItemId: item.id,
      revisionNumber: previous.revisionNumber + 1,
      basedOnRevisionId: input.baseRevisionId,
      fields: structuredClone(input.fields),
      document: structuredClone(input.document),
      contentHash: input.contentHash,
      createdBy: input.actor.actorId,
      agentRunId: input.agentRunId as ContentRevision["agentRunId"],
      changeSummary: input.changeSummary,
      createdAt: input.now,
    };
    this.revisions.set(revision.id, revision);
    this.recordAssetReferences(revision.id, revision.document);
    item.workingRevisionId = revision.id;
    item.lockVersion += 1;
    item.updatedAt = input.now;
    this.recordSuccess(input.actor, item.workspaceId, item.siteId, "content.revise", "content-item", item.id, revision.id, input.now, {
      basedOnRevisionId: input.baseRevisionId,
    });
    return structuredClone(revision);
  }

  async relocateContent(input: RelocateContentRecordInput): Promise<ContentSnapshot> {
    const item = requireValue(this.items.get(input.contentItemId), "CONTENT_NOT_FOUND", "Content not found");
    if (item.state !== "active") throw new DomainError("CONTENT_TRASHED", "Trashed content cannot be moved", 409);
    const node = this.nodeForContent(item.id);
    if (node.treeVersion !== input.expectedTreeVersion) throw new DomainError("TREE_CONFLICT", "Content tree changed", 409);
    const parent = input.targetParentId ? this.requireParentForType(input.targetParentId, item.siteId, item.contentTypeKey) : null;
    if (parent && (parent.id === node.id || parent.cachedPath.startsWith(`${node.cachedPath}/`))) {
      throw new DomainError("TREE_CYCLE", "Content cannot be moved below itself", 422);
    }
    const newPath = childPath(parent?.cachedPath ?? null, input.newSlug);
    const site = requireValue(this.sites.get(item.siteId), "SITE_NOT_FOUND", "Site not found");
    this.assertRouteAvailable(item.siteId, site.hostname, newPath, item.id);
    const oldRoot = node.cachedPath;
    const affected = this.subtree(node);

    for (const affectedNode of affected) {
      const suffix = affectedNode.cachedPath.slice(oldRoot.length);
      const oldPath = affectedNode.cachedPath;
      affectedNode.cachedPath = normalizePath(`${newPath}${suffix}`);
      affectedNode.treeVersion += 1;
      affectedNode.updatedAt = input.now;
      if (affectedNode.id === node.id) {
        affectedNode.parentId = input.targetParentId;
        affectedNode.slug = normalizeSlug(input.newSlug);
      }
      const route = this.routeForContent(affectedNode.contentItemId);
      route.active = false;
      route.deactivatedAt = input.now;
      const affectedItem = requireValue(this.items.get(affectedNode.contentItemId), "CONTENT_NOT_FOUND", "Content not found");
      this.retireRedirectAt(item.siteId, site.hostname, affectedNode.cachedPath);
      const replacement: StoredRoute = {
        ...route,
        id: newId("route") as StoredRoute["id"],
        path: affectedNode.cachedPath,
        routeType: affectedItem.contentTypeKey === "alias" ? "alias" : "canonical",
        active: true,
        activatedAt: input.now,
        deactivatedAt: null,
      };
      this.routes.set(replacement.id, replacement);
      const redirectId = newId("redirect");
      this.redirects.set(redirectId, {
        id: redirectId,
        siteId: item.siteId,
        sourceHostname: site.hostname,
        sourcePath: oldPath,
        targetRouteId: replacement.id,
        statusCode: 301,
        active: true,
        createdAt: input.now,
      });
    }
    this.recordSuccess(input.actor, item.workspaceId, item.siteId, "content.move", "content-item", item.id, item.workingRevisionId, input.now, {
      oldPath: oldRoot,
      newPath,
      affectedCount: affected.length,
    });
    return this.snapshot(item.id);
  }

  async reorderContent(input: ReorderContentRecordInput): Promise<ContentSnapshot> {
    const item = requireValue(this.items.get(input.contentItemId), "CONTENT_NOT_FOUND", "Content not found");
    if (item.state !== "active") throw new DomainError("CONTENT_TRASHED", "Trashed content cannot be reordered", 409);
    let node = this.nodeForContent(item.id);
    if (node.treeVersion !== input.expectedTreeVersion) throw new DomainError("TREE_CONFLICT", "Content tree changed", 409);

    if (node.parentId !== input.targetParentId) {
      await this.relocateContent({
        actor: input.actor,
        contentItemId: input.contentItemId,
        targetParentId: input.targetParentId,
        newSlug: node.slug,
        expectedTreeVersion: node.treeVersion,
        now: input.now,
      });
      node = this.nodeForContent(item.id);
    }

    const siblings = [...this.nodes.values()]
      .filter((candidate) => candidate.siteId === item.siteId && candidate.parentId === input.targetParentId && candidate.contentItemId !== item.id)
      .sort((a, b) => compareSortKeys(a.sortKey, b.sortKey));

    if (input.insertAfterContentItemId) {
      const anchor = siblings.find((sibling) => sibling.contentItemId === input.insertAfterContentItemId);
      if (!anchor) throw new DomainError("INSERT_AFTER_NOT_FOUND", "insertAfterContentItemId is not a sibling under the target parent", 422);
    }

    const ordered: StoredContentNode[] = [];
    if (!input.insertAfterContentItemId) {
      ordered.push(node, ...siblings);
    } else {
      let placed = false;
      for (const sibling of siblings) {
        ordered.push(sibling);
        if (sibling.contentItemId === input.insertAfterContentItemId) {
          ordered.push(node);
          placed = true;
        }
      }
      if (!placed) throw new DomainError("INSERT_AFTER_NOT_FOUND", "insertAfterContentItemId is not a sibling under the target parent", 422);
    }

    for (const [index, sibling] of ordered.entries()) {
      sibling.sortKey = buildSortKey(index + 1, sibling.contentItemId);
      sibling.updatedAt = input.now;
      if (sibling.id === node.id) sibling.treeVersion += 1;
    }

    this.recordSuccess(input.actor, item.workspaceId, item.siteId, "content.reorder", "content-item", item.id, item.workingRevisionId, input.now, {
      targetParentId: input.targetParentId,
      insertAfterContentItemId: input.insertAfterContentItemId,
    });
    return this.snapshot(item.id);
  }

  async copyContent(input: CopyContentRecordInput): Promise<ContentCopyResult> {
    const sourceItem = requireValue(this.items.get(input.contentItemId), "CONTENT_NOT_FOUND", "Content not found");
    if (sourceItem.state !== "active") throw new DomainError("CONTENT_TRASHED", "Trashed content cannot be copied", 409);
    const sourceNode = this.nodeForContent(sourceItem.id);
    if (sourceNode.treeVersion !== input.expectedTreeVersion) throw new DomainError("TREE_CONFLICT", "Content tree changed", 409);
    const parent = input.targetParentId ? this.requireParentForType(input.targetParentId, sourceItem.siteId, sourceItem.contentTypeKey) : null;
    const site = requireValue(this.sites.get(sourceItem.siteId), "SITE_NOT_FOUND", "Site not found");
    const newRootPath = childPath(parent?.cachedPath ?? null, input.newSlug);
    this.assertRouteAvailable(sourceItem.siteId, site.hostname, newRootPath);

    const sourceNodes = input.includeDescendants ? this.subtree(sourceNode) : [sourceNode];
    const nodeMap = new Map<ContentNodeId, ContentNodeId>();
    const itemMap = new Map<ContentItemId, ContentItemId>();
    const copiedIds: ContentItemId[] = [];

    for (const oldNode of sourceNodes) {
      const oldItem = requireValue(this.items.get(oldNode.contentItemId), "CONTENT_NOT_FOUND", "Content not found");
      const newItemId = asContentItemId(newId("content"));
      const newNodeId = asContentNodeId(newId("node"));
      itemMap.set(oldItem.id, newItemId);
      nodeMap.set(oldNode.id, newNodeId);
      copiedIds.push(newItemId);

      const suffix = oldNode.cachedPath.slice(sourceNode.cachedPath.length);
      const newPath = normalizePath(`${newRootPath}${suffix}`);
      this.assertRouteAvailable(sourceItem.siteId, site.hostname, newPath);
      const oldRevision = oldItem.workingRevisionId ? requireValue(this.revisions.get(oldItem.workingRevisionId), "REVISION_NOT_FOUND", "Working revision not found") : null;
      const newRevisionId = oldRevision ? asRevisionId(newId("revision")) : null;
      const newItem: ContentItem = {
        ...structuredClone(oldItem),
        id: newItemId,
        workingRevisionId: newRevisionId,
        publishedRevisionId: null,
        lockVersion: oldRevision ? 1 : 0,
        state: "active",
        createdBy: input.actor.actorId,
        createdAt: input.now,
        updatedAt: input.now,
      };
      this.items.set(newItem.id, newItem);
      if (oldRevision && newRevisionId) {
        const copiedRevision: ContentRevision = {
          ...structuredClone(oldRevision),
          id: newRevisionId,
          contentItemId: newItemId,
          revisionNumber: 1,
          basedOnRevisionId: null,
          createdBy: input.actor.actorId,
          agentRunId: null,
          changeSummary: `Copied from ${oldItem.id}`,
          createdAt: input.now,
        };
        this.revisions.set(newRevisionId, copiedRevision);
        this.recordAssetReferences(newRevisionId, copiedRevision.document);
      }

      const parentId = oldNode.id === sourceNode.id
        ? input.targetParentId
        : nodeMap.get(oldNode.parentId as ContentNodeId) ?? null;
      const newNode: StoredContentNode = {
        ...structuredClone(oldNode),
        id: newNodeId,
        contentItemId: newItemId,
        parentId,
        slug: oldNode.id === sourceNode.id ? normalizeSlug(input.newSlug) : oldNode.slug,
        cachedPath: newPath,
        treeVersion: 1,
        sortKey: `${input.now}:${newItemId}`,
        createdAt: input.now,
        updatedAt: input.now,
      };
      this.nodes.set(newNode.id, newNode);
      const routeId = newId("route") as StoredRoute["id"];
      this.retireRedirectAt(sourceItem.siteId, site.hostname, newPath);
      this.routes.set(routeId, {
        id: routeId,
        siteId: sourceItem.siteId,
        contentItemId: newItemId,
        hostname: site.hostname,
        path: newPath,
        routeType: oldItem.contentTypeKey === "alias" ? "alias" : "canonical",
        isCanonical: true,
        active: true,
        activatedAt: input.now,
        deactivatedAt: null,
      });
      const oldAlias = this.aliases.get(oldItem.id);
      if (oldAlias) {
        this.aliases.set(newItemId, {
          aliasContentItemId: newItemId,
          targetContentItemId: itemMap.get(oldAlias.targetContentItemId) ?? oldAlias.targetContentItemId,
          createdAt: input.now,
        });
      }
    }

    const rootId = requireValue(itemMap.get(sourceItem.id), "COPY_FAILED", "Copy root was not created");
    this.recordSuccess(input.actor, sourceItem.workspaceId, sourceItem.siteId, "content.copy", "content-item", sourceItem.id, sourceItem.workingRevisionId, input.now, {
      copiedRootId: rootId,
      copiedCount: copiedIds.length,
      includeDescendants: input.includeDescendants,
    });
    return { root: this.snapshot(rootId), copiedContentIds: copiedIds };
  }

  async trashContent(input: TrashContentRecordInput): Promise<ContentTrashResult> {
    const rootItem = requireValue(this.items.get(input.contentItemId), "CONTENT_NOT_FOUND", "Content not found");
    if (rootItem.state === "trashed") throw new DomainError("ALREADY_TRASHED", "Content is already in trash", 409);
    const rootNode = this.nodeForContent(rootItem.id);
    if (rootNode.treeVersion !== input.expectedTreeVersion) throw new DomainError("TREE_CONFLICT", "Content tree changed", 409);
    const affected = this.subtree(rootNode);
    const hiddenRoot = `/_baser/trash/${rootItem.id}`;

    for (const node of affected) {
      const item = requireValue(this.items.get(node.contentItemId), "CONTENT_NOT_FOUND", "Content not found");
      const previousPath = node.cachedPath;
      this.trashEntries.set(item.id, {
        contentItemId: item.id,
        rootContentItemId: rootItem.id,
        previousParentId: node.parentId,
        previousSlug: node.slug,
        previousPath,
        trashedBy: input.actor.actorId,
        trashedAt: input.now,
      });
      const suffix = previousPath.slice(rootNode.cachedPath.length);
      node.cachedPath = normalizePath(`${hiddenRoot}${suffix}`);
      node.treeVersion += 1;
      node.updatedAt = input.now;
      if (node.id === rootNode.id) {
        node.parentId = null;
        node.slug = `trash-${rootItem.id}`;
      }
      item.state = "trashed";
      item.updatedAt = input.now;
      for (const route of this.activeRoutesForContent(item.id)) {
        route.active = false;
        route.deactivatedAt = input.now;
      }
      const routeId = newId("route") as StoredRoute["id"];
      this.routes.set(routeId, {
        id: routeId,
        siteId: item.siteId,
        contentItemId: item.id,
        hostname: requireValue(this.sites.get(item.siteId), "SITE_NOT_FOUND", "Site not found").hostname,
        path: node.cachedPath,
        routeType: item.contentTypeKey === "alias" ? "alias" : "canonical",
        isCanonical: true,
        active: true,
        activatedAt: input.now,
        deactivatedAt: null,
      });
    }
    const affectedContentIds = affected.map((node) => node.contentItemId);
    this.addOutbox("content.trashed", rootItem.id, { siteId: rootItem.siteId, affectedContentIds }, input.now);
    this.recordSuccess(input.actor, rootItem.workspaceId, rootItem.siteId, "content.trash", "content-item", rootItem.id, rootItem.workingRevisionId, input.now, {
      affectedCount: affectedContentIds.length,
    });
    return { rootContentItemId: rootItem.id, affectedContentIds };
  }

  async restoreContent(input: RestoreContentRecordInput): Promise<ContentSnapshot> {
    const rootItem = requireValue(this.items.get(input.contentItemId), "CONTENT_NOT_FOUND", "Content not found");
    if (rootItem.state !== "trashed") throw new DomainError("CONTENT_NOT_TRASHED", "Content is not in trash", 409);
    const rootTrash = requireValue(this.trashEntries.get(rootItem.id), "TRASH_RECORD_NOT_FOUND", "Trash metadata not found");
    if (rootTrash.rootContentItemId !== rootItem.id) throw new DomainError("RESTORE_ROOT_REQUIRED", "Restore the root of the trashed subtree", 409);
    const rootNode = this.nodeForContent(rootItem.id);
    if (rootNode.treeVersion !== input.expectedTreeVersion) throw new DomainError("TREE_CONFLICT", "Content tree changed", 409);

    let parent: StoredContentNode | null = null;
    const requestedParentId = input.targetParentId ?? rootTrash.previousParentId;
    if (requestedParentId) {
      const candidate = this.nodes.get(requestedParentId);
      if (candidate && this.items.get(candidate.contentItemId)?.state === "active") parent = this.requireParentForType(requestedParentId, rootItem.siteId, rootItem.contentTypeKey);
      else if (input.targetParentId) throw new DomainError("PARENT_NOT_FOUND", "Restore parent not found", 404);
    }
    const restoredSlug = normalizeSlug(input.newSlug ?? rootTrash.previousSlug);
    const newRootPath = childPath(parent?.cachedPath ?? null, restoredSlug);
    const site = requireValue(this.sites.get(rootItem.siteId), "SITE_NOT_FOUND", "Site not found");
    const entries = [...this.trashEntries.values()]
      .filter((entry) => entry.rootContentItemId === rootItem.id)
      .sort((a, b) => a.previousPath.length - b.previousPath.length);

    for (const entry of entries) {
      const suffix = entry.previousPath.slice(rootTrash.previousPath.length);
      const newPath = normalizePath(`${newRootPath}${suffix}`);
      this.assertRouteAvailable(rootItem.siteId, site.hostname, newPath);
    }

    for (const entry of entries) {
      const item = requireValue(this.items.get(entry.contentItemId), "CONTENT_NOT_FOUND", "Content not found");
      const node = this.nodeForContent(item.id);
      const suffix = entry.previousPath.slice(rootTrash.previousPath.length);
      const newPath = normalizePath(`${newRootPath}${suffix}`);
      for (const route of this.activeRoutesForContent(item.id)) {
        route.active = false;
        route.deactivatedAt = input.now;
      }
      node.cachedPath = newPath;
      node.treeVersion += 1;
      node.updatedAt = input.now;
      if (item.id === rootItem.id) {
        node.parentId = parent?.id ?? null;
        node.slug = restoredSlug;
      } else {
        node.slug = entry.previousSlug;
      }
      item.state = "active";
      item.updatedAt = input.now;
      const routeId = newId("route") as StoredRoute["id"];
      this.retireRedirectAt(item.siteId, site.hostname, newPath);
      this.routes.set(routeId, {
        id: routeId,
        siteId: item.siteId,
        contentItemId: item.id,
        hostname: site.hostname,
        path: newPath,
        routeType: item.contentTypeKey === "alias" ? "alias" : "canonical",
        isCanonical: true,
        active: true,
        activatedAt: input.now,
        deactivatedAt: null,
      });
      this.trashEntries.delete(item.id);
    }
    this.addOutbox("content.restored", rootItem.id, { siteId: rootItem.siteId, restoredPath: newRootPath }, input.now);
    this.recordSuccess(input.actor, rootItem.workspaceId, rootItem.siteId, "content.restore", "content-item", rootItem.id, rootItem.workingRevisionId, input.now, {
      restoredPath: newRootPath,
      affectedCount: entries.length,
    });
    return this.snapshot(rootItem.id);
  }

  async listContentTree(siteId: SiteId): Promise<ContentManagerEntry[]> {
    return [...this.items.values()]
      .filter((item) => item.siteId === siteId && item.state === "active")
      .map((item) => this.managerEntry(item.id))
      .sort((a, b) => compareSortKeys(a.snapshot.node.sortKey, b.snapshot.node.sortKey)
        || a.snapshot.node.cachedPath.localeCompare(b.snapshot.node.cachedPath));
  }

  async listTrash(siteId: SiteId): Promise<ContentManagerEntry[]> {
    return [...this.items.values()]
      .filter((item) => item.siteId === siteId && item.state === "trashed")
      .map((item) => this.managerEntry(item.id))
      .sort((a, b) => (a.trash?.previousPath ?? "").localeCompare(b.trash?.previousPath ?? ""));
  }

  async createApproval(input: CreateApprovalRecordInput): Promise<ApprovalRequest> {
    const item = requireValue(this.items.get(input.contentItemId), "CONTENT_NOT_FOUND", "Content not found");
    if (item.state !== "active") throw new DomainError("CONTENT_TRASHED", "Trashed content cannot be approved", 409);
    const approval: ApprovalRequest = {
      id: asApprovalId(newId("approval")),
      contentItemId: item.id,
      revisionId: input.revisionId,
      revisionHash: input.revisionHash,
      state: "pending",
      riskLevel: input.riskLevel,
      requestedBy: input.actor.actorId,
      requestedAt: input.now,
      decidedBy: null,
      decidedAt: null,
      decisionComment: null,
    };
    this.approvals.set(approval.id, approval);
    this.recordSuccess(input.actor, item.workspaceId, item.siteId, "content.request-publish", "approval", approval.id, input.revisionId, input.now, {});
    return structuredClone(approval);
  }

  async getApproval(id: ApprovalId): Promise<ApprovalRequest | null> { return clone(this.approvals.get(id) ?? null); }

  async listPendingApprovalsBySite(siteId: SiteId): Promise<ApprovalRequest[]> {
    return [...this.approvals.values()]
      .filter((approval) => approval.state === "pending")
      .filter((approval) => this.items.get(approval.contentItemId)?.siteId === siteId)
      .map((approval) => structuredClone(approval))
      .sort((a, b) => b.requestedAt - a.requestedAt);
  }

  async decideApproval(input: DecideApprovalRecordInput): Promise<ApprovalRequest> {
    const approval = requireValue(this.approvals.get(input.approvalId), "APPROVAL_NOT_FOUND", "Approval not found");
    if (approval.state !== "pending") throw new DomainError("APPROVAL_ALREADY_DECIDED", "Approval was already decided", 409);
    approval.state = input.decision;
    approval.decidedBy = input.actor.actorId;
    approval.decidedAt = input.now;
    approval.decisionComment = input.comment;
    const item = requireValue(this.items.get(approval.contentItemId), "CONTENT_NOT_FOUND", "Content not found");
    this.recordSuccess(input.actor, item.workspaceId, item.siteId, `content.${input.decision}`, "approval", approval.id, approval.revisionId, input.now, {});
    return structuredClone(approval);
  }

  async publish(input: PublishRecordInput): Promise<ContentSnapshot> {
    const item = requireValue(this.items.get(input.contentItemId), "CONTENT_NOT_FOUND", "Content not found");
    if (item.state !== "active") throw new DomainError("CONTENT_TRASHED", "Trashed content cannot be published", 409);
    if (item.contentTypeKey === "folder" || item.contentTypeKey === "alias") throw new DomainError("CONTENT_NOT_PUBLISHABLE", "This content type cannot be published", 422);
    const approval = requireValue(this.approvals.get(input.approvalId), "APPROVAL_NOT_FOUND", "Approval not found");
    const revision = requireValue(this.revisions.get(input.revisionId), "REVISION_NOT_FOUND", "Revision not found");
    if (approval.state !== "approved" || approval.revisionId !== revision.id || approval.revisionHash !== revision.contentHash) {
      throw new DomainError("REVISION_NOT_APPROVED", "The exact revision has not been approved", 409);
    }
    const previous = item.publishedRevisionId;
    item.publishedRevisionId = revision.id;
    item.updatedAt = input.now;
    const publication: PublicationEvent = {
      id: `pub_${crypto.randomUUID()}`,
      contentItemId: item.id,
      previousRevisionId: previous,
      publishedRevisionId: revision.id,
      actorPrincipalId: input.actor.actorId,
      committedAt: input.now,
      verificationState: "pending",
    };
    this.publicationEvents.set(publication.id, publication);
    const outboxId = this.addOutbox("content.published", item.id, { publicationId: publication.id, revisionId: revision.id, siteId: item.siteId }, input.now);
    this.recordSuccess(input.actor, item.workspaceId, item.siteId, "content.publish", "content-item", item.id, revision.id, input.now, {
      publicationId: publication.id,
      outboxEventId: outboxId,
    });
    return this.snapshot(item.id);
  }

  async unpublish(input: UnpublishRecordInput): Promise<ContentSnapshot> {
    const item = requireValue(this.items.get(input.contentItemId), "CONTENT_NOT_FOUND", "Content not found");
    if (item.state !== "active") throw new DomainError("CONTENT_TRASHED", "Trashed content cannot be unpublished", 409);
    if (item.contentTypeKey === "folder" || item.contentTypeKey === "alias") {
      throw new DomainError("CONTENT_NOT_PUBLISHABLE", "This content type cannot be unpublished", 422);
    }
    if (!item.publishedRevisionId) throw new DomainError("CONTENT_NOT_PUBLISHED", "Content is not published", 409);
    const previousRevisionId = item.publishedRevisionId;
    item.publishedRevisionId = null;
    item.updatedAt = input.now;
    const outboxId = this.addOutbox("content.unpublished", item.id, {
      previousRevisionId,
      siteId: item.siteId,
    }, input.now);
    this.recordSuccess(input.actor, item.workspaceId, item.siteId, "content.unpublish", "content-item", item.id, previousRevisionId, input.now, {
      previousRevisionId,
      outboxEventId: outboxId,
    });
    return this.snapshot(item.id);
  }

  async resolvePublicPath(siteId: SiteId, path: string): Promise<PublicPathResolution | null> {
    const normalized = normalizePath(path);
    const route = [...this.routes.values()].find((candidate) => candidate.siteId === siteId && candidate.path === normalized && candidate.active);
    if (route) {
      const snapshot = this.resolvePublishableSnapshot(route.contentItemId);
      return snapshot ? { kind: "content", snapshot } : null;
    }
    const redirect = [...this.redirects.values()].find((candidate) => candidate.siteId === siteId && candidate.sourcePath === normalized && candidate.active);
    if (!redirect) return null;
    const targetRoute = this.routes.get(redirect.targetRouteId);
    if (!targetRoute) return null;
    const currentRoute = [...this.routes.values()].find((candidate) => candidate.contentItemId === targetRoute.contentItemId && candidate.active && candidate.isCanonical);
    if (!currentRoute) return null;
    return { kind: "redirect", location: currentRoute.path, statusCode: redirect.statusCode };
  }

  async findPublicByPath(siteId: SiteId, path: string): Promise<ContentSnapshot | null> {
    const resolution = await this.resolvePublicPath(siteId, path);
    return resolution?.kind === "content" ? resolution.snapshot : null;
  }

  async saveAgentRun(run: AgentRun): Promise<void> { this.agentRuns.set(run.id, structuredClone(run)); }
  async updateAgentRun(run: AgentRun): Promise<void> { this.agentRuns.set(run.id, structuredClone(run)); }
  async saveChangeSet(changeSet: ChangeSet): Promise<void> { this.changeSets.set(changeSet.id, structuredClone(changeSet)); }
  async getChangeSet(id: string): Promise<ChangeSet | null> { return clone(this.changeSets.get(id) ?? null); }
  async appendAudit(event: AuditEvent): Promise<void> { this.audits.set(event.id, structuredClone(event)); }
  async listAudit(workspaceId: WorkspaceId): Promise<AuditEvent[]> {
    return [...this.audits.values()].filter((event) => event.workspaceId === workspaceId).sort((a, b) => a.occurredAt - b.occurredAt).map((event) => structuredClone(event));
  }
  async getWorkspace(id: WorkspaceId): Promise<Workspace | null> { return clone(this.workspaces.get(id) ?? null); }
  async getSite(id: SiteId): Promise<Site | null> { return clone(this.sites.get(id) ?? null); }
  async listOutbox(): Promise<OutboxEvent[]> { return [...this.outbox.values()].map((event) => structuredClone(event)); }
  async listPublishedAssetReferences(assetId: AssetId): Promise<PublishedAssetReference[]> {
    const result: PublishedAssetReference[] = [];
    for (const reference of this.revisionAssetReferences) {
      if (reference.assetId !== assetId) continue;
      const revision = this.revisions.get(reference.revisionId);
      if (!revision) continue;
      const item = this.items.get(revision.contentItemId);
      if (!item || item.state !== "active" || item.publishedRevisionId !== revision.id) continue;
      const node = this.nodeForContent(item.id);
      result.push({ ...structuredClone(reference), contentItemId: item.id, siteId: item.siteId, path: node.cachedPath });
    }
    return result;
  }

  private async createRoutableContent(
    input: CreatePageRecordInput | CreateFolderRecordInput | CreateBlogRecordInput | CreateCustomContentRecordInput | CreateMailFormRecordInput | CreateArticleRecordInput | CreateAliasRecordInput,
    contentTypeKey: "page" | "folder" | "blog" | "custom-content" | "mail-form" | "article" | "alias",
    routeType: StoredRoute["routeType"],
  ): Promise<ContentSnapshot> {
    const site = requireValue(this.sites.get(input.siteId), "SITE_NOT_FOUND", "Site not found");
    if (input.parentId) this.requireParentForType(input.parentId, input.siteId, contentTypeKey);
    else if (contentTypeKey === "article") throw new DomainError("ARTICLE_PARENT_REQUIRED", "Articles must belong to a blog", 422);
    const path = normalizePath(input.path);
    this.assertRouteAvailable(input.siteId, site.hostname, path);

    const contentId = asContentItemId(newId("content"));
    const revisionId = asRevisionId(newId("revision"));
    const nodeId = asContentNodeId(newId("node"));
    const routeId = newId("route") as StoredRoute["id"];
    const revision: ContentRevision = {
      id: revisionId,
      contentItemId: contentId,
      revisionNumber: 1,
      basedOnRevisionId: null,
      fields: { title: input.title },
      document: structuredClone(input.document),
      contentHash: input.contentHash,
      createdBy: input.actor.actorId,
      agentRunId: null,
      changeSummary: `Initial ${contentTypeKey}`,
      createdAt: input.now,
    };
    const item: ContentItem = {
      id: contentId,
      workspaceId: input.workspaceId,
      siteId: input.siteId,
      contentTypeKey,
      workingRevisionId: revisionId,
      publishedRevisionId: null,
      lockVersion: 1,
      state: "active",
      createdBy: input.actor.actorId,
      createdAt: input.now,
      updatedAt: input.now,
    };
    const node: StoredContentNode = {
      id: nodeId,
      siteId: input.siteId,
      contentItemId: contentId,
      parentId: input.parentId,
      slug: normalizeSlug(input.slug),
      sortKey: `${input.now}:${contentId}`,
      cachedPath: path,
      treeVersion: 1,
      createdAt: input.now,
      updatedAt: input.now,
    };
    const route: StoredRoute = {
      id: routeId,
      siteId: input.siteId,
      contentItemId: contentId,
      hostname: site.hostname,
      path,
      routeType,
      isCanonical: true,
      active: true,
      activatedAt: input.now,
      deactivatedAt: null,
    };
    this.items.set(item.id, item);
    this.revisions.set(revision.id, revision);
    this.recordAssetReferences(revision.id, revision.document);
    this.nodes.set(node.id, node);
    this.retireRedirectAt(input.siteId, site.hostname, path);
    this.routes.set(route.id, route);
    this.recordSuccess(input.actor, input.workspaceId, input.siteId, `${contentTypeKey}.create`, "content-item", item.id, revision.id, input.now, { path });
    return this.snapshot(item.id);
  }

  private recordAssetReferences(revisionId: RevisionId, document: ContentRevision["document"]): void {
    this.revisionAssetReferences.splice(0, this.revisionAssetReferences.length, ...this.revisionAssetReferences.filter((reference) => reference.revisionId !== revisionId));
    for (const reference of collectAssetReferences(document)) {
      this.revisionAssetReferences.push({
        revisionId,
        assetId: asAssetId(reference.assetId),
        blockId: reference.blockId,
        fieldPath: reference.fieldPath,
        usage: reference.usage,
      });
    }
  }

  private snapshot(contentItemId: ContentItemId): ContentSnapshot {
    const item = requireValue(this.items.get(contentItemId), "CONTENT_NOT_FOUND", "Content not found");
    const node = this.nodeForContent(contentItemId);
    const route = this.routeForContent(contentItemId);
    return {
      item: structuredClone(item),
      node: structuredClone(node),
      route: structuredClone(route),
      workingRevision: item.workingRevisionId ? structuredClone(requireValue(this.revisions.get(item.workingRevisionId), "REVISION_NOT_FOUND", "Working revision not found")) : null,
      publishedRevision: item.publishedRevisionId ? structuredClone(requireValue(this.revisions.get(item.publishedRevisionId), "REVISION_NOT_FOUND", "Published revision not found")) : null,
    };
  }

  private managerEntry(contentItemId: ContentItemId): ContentManagerEntry {
    return {
      snapshot: this.snapshot(contentItemId),
      aliasTargetContentItemId: this.aliases.get(contentItemId)?.targetContentItemId ?? null,
      trash: clone(this.trashEntries.get(contentItemId) ?? null),
    };
  }

  private nodeForContent(contentItemId: ContentItemId): StoredContentNode {
    return requireValue([...this.nodes.values()].find((node) => node.contentItemId === contentItemId), "NODE_NOT_FOUND", "Content node not found");
  }

  private routeForContent(contentItemId: ContentItemId): StoredRoute {
    return requireValue([...this.routes.values()].find((route) => route.contentItemId === contentItemId && route.active && route.isCanonical), "ROUTE_NOT_FOUND", "Canonical route not found");
  }

  private activeRoutesForContent(contentItemId: ContentItemId): StoredRoute[] {
    return [...this.routes.values()].filter((route) => route.contentItemId === contentItemId && route.active);
  }

  private subtree(root: StoredContentNode): StoredContentNode[] {
    return [...this.nodes.values()]
      .filter((candidate) => candidate.siteId === root.siteId && (candidate.id === root.id || candidate.cachedPath.startsWith(`${root.cachedPath}/`)))
      .sort((a, b) => a.cachedPath.length - b.cachedPath.length);
  }

  private requireFolderParent(nodeId: ContentNodeId, siteId: SiteId): StoredContentNode {
    return this.requireParentForType(nodeId, siteId, "page");
  }

  private requireParentForType(nodeId: ContentNodeId, siteId: SiteId, childType: string): StoredContentNode {
    const parent = requireValue(this.nodes.get(nodeId), "PARENT_NOT_FOUND", "Parent node not found");
    if (parent.siteId !== siteId) throw new DomainError("CROSS_SITE_PARENT", "Parent belongs to another site", 422);
    const parentItem = requireValue(this.items.get(parent.contentItemId), "CONTENT_NOT_FOUND", "Parent content not found");
    if (parentItem.state !== "active") throw new DomainError("PARENT_TRASHED", "Parent is in trash", 409);
    const required = childType === "article" ? "blog" : "folder";
    if (parentItem.contentTypeKey !== required) {
      const code = required === "blog" ? "PARENT_MUST_BE_BLOG" : "PARENT_MUST_BE_FOLDER";
      const message = required === "blog" ? "Articles can only belong to a blog" : "Only folders can contain this content type";
      throw new DomainError(code, message, 422);
    }
    return parent;
  }

  private resolvePublishableSnapshot(contentItemId: ContentItemId): ContentSnapshot | null {
    let item = this.items.get(contentItemId);
    const visited = new Set<ContentItemId>();
    while (item?.contentTypeKey === "alias") {
      if (visited.has(item.id)) throw new DomainError("ALIAS_CYCLE", "Alias cycle detected", 500);
      visited.add(item.id);
      const relation = this.aliases.get(item.id);
      if (!relation) return null;
      item = this.items.get(relation.targetContentItemId);
    }
    if (!item || item.state !== "active" || !item.publishedRevisionId) return null;
    return this.snapshot(item.id);
  }

  private retireRedirectAt(siteId: SiteId, hostname: string, path: string): void {
    const normalized = normalizePath(path);
    for (const redirect of this.redirects.values()) {
      if (redirect.siteId === siteId && redirect.sourceHostname === hostname && redirect.sourcePath === normalized && redirect.active) redirect.active = false;
    }
  }

  private assertRouteAvailable(siteId: SiteId, hostname: string, path: string, exceptContentId?: ContentItemId): void {
    const collision = [...this.routes.values()].find((route) => route.siteId === siteId && route.hostname === hostname && route.path === path && route.active && route.contentItemId !== exceptContentId);
    if (collision) throw new DomainError("ROUTE_COLLISION", `Route ${path} already exists`, 409);
  }

  private addOutbox(eventType: string, aggregateId: string, payload: Record<string, unknown>, now: number): string {
    const id = newId("outbox") as OutboxEvent["id"];
    this.outbox.set(id, { id, eventType, aggregateType: "content-item", aggregateId, payload, state: "pending", attempts: 0, availableAt: now, createdAt: now });
    return id;
  }

  private recordSuccess(
    actor: ActorContext,
    workspaceId: WorkspaceId,
    siteId: SiteId,
    action: string,
    resourceType: string,
    resourceId: string,
    revisionId: RevisionId | null,
    now: number,
    details: Record<string, unknown>,
  ): void {
    const event: AuditEvent = {
      id: newId("audit") as AuditEvent["id"],
      workspaceId,
      siteId,
      occurredAt: now,
      actorPrincipalId: actor.actorId,
      actorType: actor.actorType,
      onBehalfOfPrincipalId: actor.onBehalfOf ?? null,
      delegationId: actor.delegationId ?? null,
      action,
      resourceType,
      resourceId,
      revisionId,
      capability: action,
      result: "success",
      reason: null,
      requestId: actor.requestId,
      details,
    };
    this.audits.set(event.id, event);
  }
}

function requireValue<T>(value: T | undefined, code: string, message: string): T {
  if (value === undefined) throw new DomainError(code, message, 404);
  return value;
}

function clone<T>(value: T): T { return structuredClone(value); }
