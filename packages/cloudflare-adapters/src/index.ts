import {
  asApprovalId,
  asCollectionId,
  asTaxonomyId,
  asTermId,
  asAssetId,
  asPreviewSessionId,
  asUploadSessionId,
  asContentItemId,
  asContentNodeId,
  asPrincipalId,
  asRevisionId,
  asSiteId,
  DomainError,
  assertDomain,
  newId,
  type ActorContext,
  type AssetId,
  type PreviewSessionId,
  type UploadSessionId,
  type ApprovalId,
  type CollectionId,
  type TaxonomyId,
  type TermId,
  type ContentItemId,
  type ContentNodeId,
  type PrincipalId,
  type RevisionId,
  type SiteId,
  type WorkspaceId,
} from "@baser-edge/core-types";
import type {
  AgentRun,
  ApprovalRequest,
  AuditEvent,
  ChangeSet,
  CmsStore,
  ContentCopyResult,
  ContentItem,
  ContentManagerEntry,
  ContentRevision,
  ContentSnapshot,
  ContentTrashResult,
  OutboxEvent,
  PublicPathResolution,
  Principal,
  PublishedAssetReference,
  Site,
  StoredCapabilityGrant,
  StoredContentNode,
  StoredDelegationGrant,
  StoredRoute,
  TrashEntry,
  Workspace,
  CloudflareLoginTarget,
  BootstrapRecordInput,
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
} from "@baser-edge/content-kernel";
import { buildSortKey, childPath, compareSortKeys, normalizePath } from "@baser-edge/baser-domain";
import type {
  BlogArticleRecord,
  BlogCollection,
  BlogStore,
  RevisionTaxonomyValue,
  Taxonomy,
  Term,
} from "@baser-edge/blog-kernel";
import { collectAssetReferences, createEmptyDocument, type StructuredDocument } from "@baser-edge/structured-document";
import type {
  Asset,
  AssetMetadataStore,
  AssetObject,
  AssetObjectBody,
  AssetObjectMetadata,
  AssetObjectStore,
  UploadSession,
} from "@baser-edge/asset-kernel";
import {
  MemoryAssetMetadataStore,
  MemoryAssetObjectStore,
  TRIAL_INLINE_MEDIA_POLICY,
  type TrialInlineMediaPolicy,
} from "@baser-edge/asset-kernel";
import type { PreviewSession, PreviewStore } from "@baser-edge/preview-kernel";
import { D1AssetObjectStore, isD1InlineAssetStorageEnabled } from "./d1-asset-object-store.js";

const memoryMetadataSingleton = new MemoryAssetMetadataStore();
const memoryObjectsSingleton = new MemoryAssetObjectStore();

export interface D1PreparedStatementLike {
  bind(...values: unknown[]): D1PreparedStatementLike;
  first<T = Record<string, unknown>>(): Promise<T | null>;
  all<T = Record<string, unknown>>(): Promise<{ results: T[] }>;
  run(): Promise<unknown>;
}

export interface D1DatabaseLike {
  prepare(sql: string): D1PreparedStatementLike;
  batch(statements: D1PreparedStatementLike[]): Promise<unknown[]>;
}

type RoutableCreateInput = CreatePageRecordInput | CreateFolderRecordInput | CreateBlogRecordInput | CreateCustomContentRecordInput | CreateMailFormRecordInput | CreateArticleRecordInput | CreateAliasRecordInput;

export class D1CmsStore implements CmsStore {
  readonly #db: D1DatabaseLike;

  constructor(db: D1DatabaseLike) { this.#db = db; }

  async bootstrap(input: BootstrapRecordInput): Promise<void> {
    await this.#batch([
      this.#db.prepare("INSERT INTO workspaces(id,name,created_at,cloudflare_account_id,cloudflare_owner_email) VALUES(?,?,?,?,?)")
        .bind(
          input.workspace.id,
          input.workspace.name,
          input.workspace.createdAt,
          input.workspace.cloudflareAccountId ?? null,
          input.workspace.cloudflareOwnerEmail ?? null,
        ),
      this.#db.prepare("INSERT INTO principals(id,workspace_id,principal_type,display_name,state,created_at) VALUES(?,?,?,?,?,?)").bind(input.owner.id, input.owner.workspaceId, input.owner.type, input.owner.displayName, input.owner.state, input.owner.createdAt),
      this.#db.prepare("INSERT INTO sites(id,workspace_id,name,hostname,locale,state,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?)").bind(input.site.id, input.site.workspaceId, input.site.name, input.site.hostname, input.site.locale, input.site.state, input.site.createdAt, input.site.updatedAt),
      this.#grantStatement(input.ownerGrant, input.workspace.createdAt),
      this.#db.prepare("INSERT INTO content_types(id,workspace_id,type_key,title,capabilities_json,state,created_at) VALUES(?,?,?,?,?,?,?)").bind(`ctype_${crypto.randomUUID()}`, input.workspace.id, "folder", "フォルダ", JSON.stringify(["routable","container"]), "active", input.workspace.createdAt),
      this.#db.prepare("INSERT INTO content_types(id,workspace_id,type_key,title,capabilities_json,state,created_at) VALUES(?,?,?,?,?,?,?)").bind(`ctype_${crypto.randomUUID()}`, input.workspace.id, "page", "固定ページ", JSON.stringify(["routable","documentEditable","searchable","schedulable"]), "active", input.workspace.createdAt),
      this.#db.prepare("INSERT INTO content_types(id,workspace_id,type_key,title,capabilities_json,state,created_at) VALUES(?,?,?,?,?,?,?)").bind(`ctype_${crypto.randomUUID()}`, input.workspace.id, "alias", "エイリアス", JSON.stringify(["routable","reference"]), "active", input.workspace.createdAt),
      this.#db.prepare("INSERT INTO content_types(id,workspace_id,type_key,title,capabilities_json,state,created_at) VALUES(?,?,?,?,?,?,?)").bind(`ctype_${crypto.randomUUID()}`, input.workspace.id, "blog", "ブログ", JSON.stringify(["routable","container","documentEditable","collectable","feedable"]), "active", input.workspace.createdAt),
      this.#db.prepare("INSERT INTO content_types(id,workspace_id,type_key,title,capabilities_json,state,created_at) VALUES(?,?,?,?,?,?,?)").bind(`ctype_${crypto.randomUUID()}`, input.workspace.id, "article", "記事", JSON.stringify(["routable","documentEditable","collectable","taxonomizable","searchable","schedulable","feedable"]), "active", input.workspace.createdAt),
      this.#db.prepare("INSERT INTO content_types(id,workspace_id,type_key,title,capabilities_json,state,created_at) VALUES(?,?,?,?,?,?,?)").bind(`ctype_${crypto.randomUUID()}`, input.workspace.id, "mail-form", "メールフォーム", JSON.stringify(["routable","documentEditable","submittable"]), "active", input.workspace.createdAt),
    ]);
  }

  async createPrincipal(principal: Principal): Promise<void> {
    await this.#db.prepare("INSERT INTO principals(id,workspace_id,principal_type,display_name,state,created_at) VALUES(?,?,?,?,?,?)")
      .bind(principal.id, principal.workspaceId, principal.type, principal.displayName, principal.state, principal.createdAt).run();
  }
  async getPrincipal(id: PrincipalId): Promise<Principal | null> {
    const row = await this.#db.prepare("SELECT * FROM principals WHERE id=?").bind(id).first<PrincipalRow>();
    return row ? mapPrincipal(row) : null;
  }
  async createCapabilityGrant(grant: StoredCapabilityGrant): Promise<void> { await this.#grantStatement(grant, Date.now()).run(); }
  async createDelegationGrant(grant: StoredDelegationGrant): Promise<void> {
    await this.#db.prepare("INSERT INTO delegation_grants(id,human_principal_id,agent_principal_id,capabilities_json,scope_json,maximum_risk,expires_at,revoked_at,created_at) VALUES(?,?,?,?,?,?,?,?,?)")
      .bind(grant.id, grant.humanPrincipalId, grant.agentPrincipalId, JSON.stringify(grant.capabilities), JSON.stringify(grant.scope), grant.maximumRisk, grant.expiresAt, grant.revokedAt ?? null, Date.now()).run();
  }
  async listCapabilityGrants(principalId: PrincipalId): Promise<StoredCapabilityGrant[]> {
    return (await this.#db.prepare("SELECT * FROM capability_grants WHERE principal_id=?").bind(principalId).all<GrantRow>()).results.map(mapGrant);
  }
  async getDelegationGrant(id: string): Promise<StoredDelegationGrant | null> {
    const row = await this.#db.prepare("SELECT * FROM delegation_grants WHERE id=?").bind(id).first<DelegationRow>();
    return row ? mapDelegation(row) : null;
  }

  async createPage(input: CreatePageRecordInput): Promise<ContentSnapshot> { return this.#createRoutable(input, "page", "canonical"); }
  async createFolder(input: CreateFolderRecordInput): Promise<ContentSnapshot> { return this.#createRoutable(input, "folder", "canonical"); }
  async createBlog(input: CreateBlogRecordInput): Promise<ContentSnapshot> { return this.#createRoutable(input, "blog", "canonical"); }
  async createCustomContent(input: CreateCustomContentRecordInput): Promise<ContentSnapshot> { return this.#createRoutable(input, "custom-content", "canonical"); }
  async createMailForm(input: CreateMailFormRecordInput): Promise<ContentSnapshot> { return this.#createRoutable(input, "mail-form", "canonical"); }
  async createArticle(input: CreateArticleRecordInput): Promise<ContentSnapshot> { return this.#createRoutable(input, "article", "canonical"); }
  async createAlias(input: CreateAliasRecordInput): Promise<ContentSnapshot> {
    const target = await this.#requireSnapshot(input.targetContentItemId);
    assertDomain(target.item.siteId === input.siteId, "CROSS_SITE_ALIAS", "Alias target belongs to another site", 422);
    assertDomain(target.item.state === "active", "ALIAS_TARGET_INACTIVE", "Alias target is not active", 409);
    assertDomain(target.item.contentTypeKey !== "folder" && target.item.contentTypeKey !== "alias", "INVALID_ALIAS_TARGET", "Aliases can target publishable content only", 422);
    return this.#createRoutable(input, "alias", "alias", input.targetContentItemId);
  }

  async getNode(id: ContentNodeId): Promise<StoredContentNode | null> {
    const row = await this.#db.prepare("SELECT * FROM content_nodes WHERE id=?").bind(id).first<NodeRow>();
    return row ? mapNode(row) : null;
  }

  async getContentSnapshot(contentItemId: ContentItemId): Promise<ContentSnapshot | null> {
    const itemRow = await this.#db.prepare("SELECT * FROM content_items WHERE id=?").bind(contentItemId).first<ItemRow>();
    if (!itemRow) return null;
    const nodeRow = await this.#db.prepare("SELECT * FROM content_nodes WHERE content_item_id=?").bind(contentItemId).first<NodeRow>();
    const routeRow = await this.#db.prepare("SELECT * FROM routes WHERE content_item_id=? AND active=1 AND is_canonical=1 ORDER BY activated_at DESC LIMIT 1").bind(contentItemId).first<RouteRow>();
    assertDomain(nodeRow && routeRow, "CONTENT_PROJECTION_MISSING", "Content node or route is missing", 500);
    const item = mapItem(itemRow);
    let workingRevisionId = item.workingRevisionId;
    if (!workingRevisionId) {
      workingRevisionId = await this.#resolveLatestRevisionId(contentItemId);
      if (workingRevisionId) {
        await this.#reconcileWorkingRevisionPointer(contentItemId, workingRevisionId);
        item.workingRevisionId = workingRevisionId;
        const refreshed = await this.#db.prepare("SELECT lock_version FROM content_items WHERE id=?").bind(contentItemId).first<{ lock_version: number }>();
        if (refreshed) item.lockVersion = refreshed.lock_version;
      }
    }
    return {
      item,
      node: mapNode(nodeRow),
      route: mapRoute(routeRow),
      workingRevision: workingRevisionId ? await this.getRevision(workingRevisionId) : null,
      publishedRevision: item.publishedRevisionId ? await this.getRevision(item.publishedRevisionId) : null,
    };
  }

  async #resolveLatestRevisionId(contentItemId: ContentItemId): Promise<RevisionId | null> {
    const row = await this.#db.prepare(
      "SELECT id FROM content_revisions WHERE content_item_id=? ORDER BY revision_number DESC LIMIT 1",
    ).bind(contentItemId).first<{ id: string }>();
    return row ? asRevisionId(row.id) : null;
  }

  async #reconcileWorkingRevisionPointer(contentItemId: ContentItemId, revisionId: RevisionId): Promise<void> {
    const now = Date.now();
    await this.#db.prepare(
      `UPDATE content_items
       SET working_revision_id=?,
           lock_version=(SELECT MAX(revision_number) FROM content_revisions WHERE content_item_id=?),
           updated_at=?
       WHERE id=? AND working_revision_id IS NULL`,
    ).bind(revisionId, contentItemId, now, contentItemId).run();
  }

  async getRevision(revisionId: RevisionId): Promise<ContentRevision | null> {
    const row = await this.#db.prepare("SELECT r.*,d.document_json FROM content_revisions r JOIN revision_documents d ON d.revision_id=r.id WHERE r.id=?").bind(revisionId).first<RevisionRow>();
    return row ? mapRevision(row) : null;
  }

  async commitRevision(input: CommitRevisionRecordInput): Promise<ContentRevision> {
    const snapshot = await this.#requireSnapshot(input.contentItemId);
    assertDomain(snapshot.item.state === "active", "CONTENT_TRASHED", "Trashed content cannot be revised", 409);
    assertDomain(snapshot.item.contentTypeKey !== "folder" && snapshot.item.contentTypeKey !== "alias", "CONTENT_NOT_EDITABLE", "This content type does not accept document revisions", 422);
    const previous = await this.getRevision(input.baseRevisionId);
    assertDomain(previous, "REVISION_NOT_FOUND", "Base revision not found", 404);
    const revisionId = asRevisionId(newId("revision"));
    const documentJson = JSON.stringify(input.document);
    await this.#batch([
      this.#db.prepare("INSERT INTO content_revisions(id,content_item_id,revision_number,based_on_revision_id,expected_lock_version,fields_json,content_hash,created_by,agent_run_id,change_summary,created_at) VALUES(?,?,?,?,?,?,?,?,?,?,?)")
        .bind(revisionId, input.contentItemId, previous.revisionNumber + 1, input.baseRevisionId, input.expectedLockVersion, JSON.stringify(input.fields), input.contentHash, input.actor.actorId, input.agentRunId, input.changeSummary, input.now),
      this.#db.prepare("INSERT INTO revision_documents(revision_id,format_version,document_json,byte_size,document_hash) VALUES(?,?,?,?,?)")
        .bind(revisionId, input.document.formatVersion, documentJson, new TextEncoder().encode(documentJson).byteLength, input.contentHash),
      ...this.#assetReferenceStatements(revisionId, input.document),
      this.#db.prepare(
        "UPDATE content_items SET working_revision_id=?, lock_version=lock_version+1, updated_at=? WHERE id=? AND (working_revision_id IS NULL OR working_revision_id=?)",
      ).bind(revisionId, input.now, input.contentItemId, input.baseRevisionId),
      this.#auditStatement(createAudit(input.actor, snapshot.item.workspaceId, snapshot.item.siteId, "content.revise", "content-item", input.contentItemId, revisionId, input.now, "content.revise", { basedOnRevisionId: input.baseRevisionId })),
    ]);
    const revision = await this.getRevision(revisionId);
    assertDomain(revision, "REVISION_WRITE_FAILED", "Revision could not be read after commit", 500);
    return revision;
  }

  async relocateContent(input: RelocateContentRecordInput): Promise<ContentSnapshot> {
    const snapshot = await this.#requireSnapshot(input.contentItemId);
    assertDomain(snapshot.item.state === "active", "CONTENT_TRASHED", "Trashed content cannot be moved", 409);
    const parent = input.targetParentId ? await this.#requireParentForType(input.targetParentId, snapshot.item.siteId, snapshot.item.contentTypeKey) : null;
    assertDomain(!parent || !parent.cachedPath.startsWith(`${snapshot.node.cachedPath}/`), "TREE_CYCLE", "Content cannot be moved below itself", 422);
    const site = await this.#requireSite(snapshot.item.siteId);
    const oldRoot = snapshot.node.cachedPath;
    const newRoot = childPath(parent?.cachedPath ?? null, input.newSlug);
    await this.#assertRouteAvailable(snapshot.item.siteId, site.hostname, newRoot, snapshot.item.id);
    const rows = (await this.#db.prepare("SELECT * FROM content_nodes WHERE site_id=? AND (cached_path=? OR cached_path LIKE ?) ORDER BY length(cached_path)")
      .bind(snapshot.item.siteId, oldRoot, `${oldRoot}/%`).all<NodeRow>()).results;
    const statements: D1PreparedStatementLike[] = [this.#treeGuard(snapshot.node.id, input.expectedTreeVersion, input.now)];
    for (const row of rows) {
      const node = mapNode(row);
      const suffix = node.cachedPath.slice(oldRoot.length);
      const newPath = normalizePath(`${newRoot}${suffix}`);
      await this.#assertRouteAvailable(snapshot.item.siteId, site.hostname, newPath, node.contentItemId);
      const routeRow = await this.#activeRouteRow(node.contentItemId);
      const itemRow = await this.#requireItemRow(node.contentItemId);
      const replacementId = newId("route");
      if (node.id === snapshot.node.id) {
        statements.push(this.#db.prepare("UPDATE content_nodes SET parent_id=?,slug=?,cached_path=?,tree_version=tree_version+1,updated_at=? WHERE id=?")
          .bind(input.targetParentId, input.newSlug, newPath, input.now, node.id));
      } else {
        statements.push(this.#db.prepare("UPDATE content_nodes SET cached_path=?,tree_version=tree_version+1,updated_at=? WHERE id=?")
          .bind(newPath, input.now, node.id));
      }
      statements.push(this.#db.prepare("UPDATE routes SET active=0,deactivated_at=? WHERE id=?").bind(input.now, routeRow.id));
      statements.push(this.#retireRedirectStatement(snapshot.item.siteId, site.hostname, newPath));
      statements.push(this.#routeInsert(replacementId, snapshot.item.siteId, node.contentItemId, site.hostname, newPath, itemRow.content_type_key === "alias" ? "alias" : "canonical", input.now));
      statements.push(this.#db.prepare("INSERT INTO redirects(id,site_id,source_hostname,source_path,target_route_id,status_code,active,created_at) VALUES(?,?,?,?,?,301,1,?)")
        .bind(newId("redirect"), snapshot.item.siteId, site.hostname, routeRow.path, replacementId, input.now));
    }
    statements.push(this.#db.prepare("DELETE FROM tree_move_guards WHERE node_id=?").bind(snapshot.node.id));
    statements.push(this.#auditStatement(createAudit(input.actor, snapshot.item.workspaceId, snapshot.item.siteId, "content.move", "content-item", input.contentItemId, snapshot.item.workingRevisionId, input.now, "content.move", { oldPath: oldRoot, newPath: newRoot, affectedCount: rows.length })));
    await this.#batch(statements);
    return this.#requireSnapshot(input.contentItemId);
  }

  async reorderContent(input: ReorderContentRecordInput): Promise<ContentSnapshot> {
    const snapshot = await this.#requireSnapshot(input.contentItemId);
    assertDomain(snapshot.item.state === "active", "CONTENT_TRASHED", "Trashed content cannot be reordered", 409);
    if (snapshot.node.parentId !== input.targetParentId) {
      await this.relocateContent({
        actor: input.actor,
        contentItemId: input.contentItemId,
        targetParentId: input.targetParentId,
        newSlug: snapshot.node.slug,
        expectedTreeVersion: input.expectedTreeVersion,
        now: input.now,
      });
    } else {
      await this.#batch([this.#treeGuard(snapshot.node.id, input.expectedTreeVersion, input.now)]);
    }
    const fresh = await this.#requireSnapshot(input.contentItemId);
    const parentClause = input.targetParentId === null
      ? "parent_id IS NULL"
      : "parent_id = ?";
    const siblingRows = (await this.#db.prepare(
      `SELECT * FROM content_nodes WHERE site_id=? AND ${parentClause} AND content_item_id != ?`,
    ).bind(
      ...(input.targetParentId === null
        ? [fresh.item.siteId, fresh.item.id]
        : [fresh.item.siteId, input.targetParentId, fresh.item.id]),
    ).all<NodeRow>()).results.map(mapNode).sort((a, b) => compareSortKeys(a.sortKey, b.sortKey));

    if (input.insertAfterContentItemId) {
      assertDomain(siblingRows.some((row) => row.contentItemId === input.insertAfterContentItemId), "INSERT_AFTER_NOT_FOUND", "insertAfterContentItemId is not a sibling under the target parent", 422);
    }

    const ordered: typeof siblingRows = [];
    const moving = fresh.node;
    if (!input.insertAfterContentItemId) {
      ordered.push(moving, ...siblingRows);
    } else {
      let placed = false;
      for (const sibling of siblingRows) {
        ordered.push(sibling);
        if (sibling.contentItemId === input.insertAfterContentItemId) {
          ordered.push(moving);
          placed = true;
        }
      }
      assertDomain(placed, "INSERT_AFTER_NOT_FOUND", "insertAfterContentItemId is not a sibling under the target parent", 422);
    }

    const statements: D1PreparedStatementLike[] = [
      this.#db.prepare("DELETE FROM tree_move_guards WHERE node_id=?").bind(moving.id),
    ];
    for (const [index, node] of ordered.entries()) {
      const sortKey = buildSortKey(index + 1, node.contentItemId);
      if (node.id === moving.id) {
        statements.push(this.#db.prepare("UPDATE content_nodes SET sort_key=?,tree_version=tree_version+1,updated_at=? WHERE id=?").bind(sortKey, input.now, node.id));
      } else {
        statements.push(this.#db.prepare("UPDATE content_nodes SET sort_key=?,updated_at=? WHERE id=?").bind(sortKey, input.now, node.id));
      }
    }
    statements.push(this.#auditStatement(createAudit(input.actor, fresh.item.workspaceId, fresh.item.siteId, "content.reorder", "content-item", fresh.item.id, fresh.item.workingRevisionId, input.now, "content.reorder", {
      targetParentId: input.targetParentId,
      insertAfterContentItemId: input.insertAfterContentItemId,
    })));
    await this.#batch(statements);
    return this.#requireSnapshot(input.contentItemId);
  }

  async copyContent(input: CopyContentRecordInput): Promise<ContentCopyResult> {
    const source = await this.#requireSnapshot(input.contentItemId);
    assertDomain(source.item.state === "active", "CONTENT_TRASHED", "Trashed content cannot be copied", 409);
    const parent = input.targetParentId ? await this.#requireParentForType(input.targetParentId, source.item.siteId, source.item.contentTypeKey) : null;
    const site = await this.#requireSite(source.item.siteId);
    const newRootPath = childPath(parent?.cachedPath ?? null, input.newSlug);
    await this.#assertRouteAvailable(source.item.siteId, site.hostname, newRootPath);
    const nodes = input.includeDescendants
      ? (await this.#db.prepare("SELECT * FROM content_nodes WHERE site_id=? AND (cached_path=? OR cached_path LIKE ?) ORDER BY length(cached_path)")
          .bind(source.item.siteId, source.node.cachedPath, `${source.node.cachedPath}/%`).all<NodeRow>()).results
      : [await this.#requireNodeRow(source.node.id)];

    const itemIds = new Map<string, ContentItemId>();
    const nodeIds = new Map<string, ContentNodeId>();
    for (const node of nodes) {
      itemIds.set(node.content_item_id, asContentItemId(newId("content")));
      nodeIds.set(node.id, asContentNodeId(newId("node")));
    }

    const statements: D1PreparedStatementLike[] = [this.#treeGuard(source.node.id, input.expectedTreeVersion, input.now)];
    const copiedIds: ContentItemId[] = [];
    for (const nodeRow of nodes) {
      const oldItem = await this.#requireItemRow(asContentItemId(nodeRow.content_item_id));
      const newItemId = itemIds.get(oldItem.id)!;
      const newNodeId = nodeIds.get(nodeRow.id)!;
      copiedIds.push(newItemId);
      const suffix = nodeRow.cached_path.slice(source.node.cachedPath.length);
      const newPath = normalizePath(`${newRootPath}${suffix}`);
      await this.#assertRouteAvailable(source.item.siteId, site.hostname, newPath);
      const revision = oldItem.working_revision_id ? await this.#requireRevisionRow(asRevisionId(oldItem.working_revision_id)) : null;
      statements.push(this.#db.prepare("INSERT INTO content_items(id,workspace_id,site_id,content_type_key,working_revision_id,published_revision_id,lock_version,state,created_by,created_at,updated_at) VALUES(?,?,?,?,NULL,NULL,0,'active',?,?,?)")
        .bind(newItemId, oldItem.workspace_id, oldItem.site_id, oldItem.content_type_key, input.actor.actorId, input.now, input.now));
      if (revision) {
        const newRevisionId = asRevisionId(newId("revision"));
        statements.push(this.#db.prepare("INSERT INTO content_revisions(id,content_item_id,revision_number,based_on_revision_id,expected_lock_version,fields_json,content_hash,created_by,agent_run_id,change_summary,created_at) VALUES(?,?,1,NULL,0,?,?,?,?,?,?)")
          .bind(newRevisionId, newItemId, revision.fields_json, revision.content_hash, input.actor.actorId, null, `Copied from ${oldItem.id}`, input.now));
        statements.push(this.#db.prepare("INSERT INTO revision_documents(revision_id,format_version,document_json,byte_size,document_hash) VALUES(?,?,?,?,?)")
          .bind(newRevisionId, revision.format_version, revision.document_json, revision.byte_size, revision.document_hash));
        statements.push(...this.#assetReferenceStatements(newRevisionId, JSON.parse(revision.document_json) as StructuredDocument));
      }
      const parentId = nodeRow.id === source.node.id
        ? input.targetParentId
        : nodeIds.get(nodeRow.parent_id ?? "") ?? null;
      statements.push(this.#db.prepare("INSERT INTO content_nodes(id,site_id,content_item_id,parent_id,slug,sort_key,cached_path,tree_version,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?,?,?)")
        .bind(newNodeId, source.item.siteId, newItemId, parentId, nodeRow.id === source.node.id ? input.newSlug : nodeRow.slug, `${input.now}:${newItemId}`, newPath, 1, input.now, input.now));
      statements.push(this.#retireRedirectStatement(source.item.siteId, site.hostname, newPath));
      statements.push(this.#routeInsert(newId("route"), source.item.siteId, newItemId, site.hostname, newPath, oldItem.content_type_key === "alias" ? "alias" : "canonical", input.now));
      const alias = await this.#db.prepare("SELECT * FROM content_aliases WHERE alias_content_item_id=?").bind(oldItem.id).first<AliasRow>();
      if (alias) {
        statements.push(this.#db.prepare("INSERT INTO content_aliases(alias_content_item_id,target_content_item_id,created_at) VALUES(?,?,?)")
          .bind(newItemId, itemIds.get(alias.target_content_item_id) ?? alias.target_content_item_id, input.now));
      }
    }
    statements.push(this.#db.prepare("DELETE FROM tree_move_guards WHERE node_id=?").bind(source.node.id));
    const rootId = itemIds.get(source.item.id)!;
    statements.push(this.#auditStatement(createAudit(input.actor, source.item.workspaceId, source.item.siteId, "content.copy", "content-item", source.item.id, source.item.workingRevisionId, input.now, "content.copy", { copiedRootId: rootId, copiedCount: copiedIds.length, includeDescendants: input.includeDescendants })));
    await this.#batch(statements);
    return { root: await this.#requireSnapshot(rootId), copiedContentIds: copiedIds };
  }

  async trashContent(input: TrashContentRecordInput): Promise<ContentTrashResult> {
    const source = await this.#requireSnapshot(input.contentItemId);
    assertDomain(source.item.state === "active", "ALREADY_TRASHED", "Content is already in trash", 409);
    const site = await this.#requireSite(source.item.siteId);
    const rows = (await this.#db.prepare("SELECT n.*,i.content_type_key FROM content_nodes n JOIN content_items i ON i.id=n.content_item_id WHERE n.site_id=? AND (n.cached_path=? OR n.cached_path LIKE ?) ORDER BY length(n.cached_path)")
      .bind(source.item.siteId, source.node.cachedPath, `${source.node.cachedPath}/%`).all<NodeWithTypeRow>()).results;
    const hiddenRoot = `/_baser/trash/${source.item.id}`;
    const statements: D1PreparedStatementLike[] = [this.#treeGuard(source.node.id, input.expectedTreeVersion, input.now)];
    for (const row of rows) {
      const suffix = row.cached_path.slice(source.node.cachedPath.length);
      const hiddenPath = normalizePath(`${hiddenRoot}${suffix}`);
      statements.push(this.#db.prepare("INSERT INTO trash_entries(content_item_id,root_content_item_id,previous_parent_id,previous_slug,previous_path,trashed_by,trashed_at) VALUES(?,?,?,?,?,?,?)")
        .bind(row.content_item_id, source.item.id, row.parent_id, row.slug, row.cached_path, input.actor.actorId, input.now));
      statements.push(this.#db.prepare("UPDATE content_items SET state='trashed',updated_at=? WHERE id=?").bind(input.now, row.content_item_id));
      if (row.id === source.node.id) {
        statements.push(this.#db.prepare("UPDATE content_nodes SET parent_id=NULL,slug=?,cached_path=?,tree_version=tree_version+1,updated_at=? WHERE id=?")
          .bind(`trash-${source.item.id}`, hiddenPath, input.now, row.id));
      } else {
        statements.push(this.#db.prepare("UPDATE content_nodes SET cached_path=?,tree_version=tree_version+1,updated_at=? WHERE id=?")
          .bind(hiddenPath, input.now, row.id));
      }
      statements.push(this.#db.prepare("UPDATE routes SET active=0,deactivated_at=? WHERE content_item_id=? AND active=1").bind(input.now, row.content_item_id));
      statements.push(this.#routeInsert(newId("route"), source.item.siteId, asContentItemId(row.content_item_id), site.hostname, hiddenPath, row.content_type_key === "alias" ? "alias" : "canonical", input.now));
    }
    const affectedContentIds = rows.map((row) => asContentItemId(row.content_item_id));
    const outboxId = newId("outbox");
    statements.push(this.#outboxStatement(outboxId, "content.trashed", source.item.id, { siteId: source.item.siteId, affectedContentIds }, input.now));
    statements.push(this.#db.prepare("DELETE FROM tree_move_guards WHERE node_id=?").bind(source.node.id));
    statements.push(this.#auditStatement(createAudit(input.actor, source.item.workspaceId, source.item.siteId, "content.trash", "content-item", source.item.id, source.item.workingRevisionId, input.now, "content.trash", { affectedCount: affectedContentIds.length, outboxEventId: outboxId })));
    await this.#batch(statements);
    return { rootContentItemId: source.item.id, affectedContentIds };
  }

  async restoreContent(input: RestoreContentRecordInput): Promise<ContentSnapshot> {
    const source = await this.#requireSnapshot(input.contentItemId);
    assertDomain(source.item.state === "trashed", "CONTENT_NOT_TRASHED", "Content is not in trash", 409);
    const rootTrash = await this.#db.prepare("SELECT * FROM trash_entries WHERE content_item_id=?").bind(input.contentItemId).first<TrashRow>();
    assertDomain(rootTrash, "TRASH_RECORD_NOT_FOUND", "Trash metadata not found", 404);
    assertDomain(rootTrash.root_content_item_id === input.contentItemId, "RESTORE_ROOT_REQUIRED", "Restore the root of the trashed subtree", 409);
    let parent: StoredContentNode | null = null;
    const parentId = input.targetParentId ?? (rootTrash.previous_parent_id ? asContentNodeId(rootTrash.previous_parent_id) : null);
    if (parentId) {
      try { parent = await this.#requireParentForType(parentId, source.item.siteId, source.item.contentTypeKey); }
      catch (error) {
        if (input.targetParentId) throw error;
        parent = null;
      }
    }
    const site = await this.#requireSite(source.item.siteId);
    const restoredSlug = input.newSlug ?? rootTrash.previous_slug;
    const newRootPath = childPath(parent?.cachedPath ?? null, restoredSlug);
    const trashRows = (await this.#db.prepare("SELECT t.*,i.content_type_key,n.id AS node_id FROM trash_entries t JOIN content_items i ON i.id=t.content_item_id JOIN content_nodes n ON n.content_item_id=t.content_item_id WHERE t.root_content_item_id=? ORDER BY length(t.previous_path)")
      .bind(input.contentItemId).all<TrashWithTypeRow>()).results;
    for (const row of trashRows) {
      const suffix = row.previous_path.slice(rootTrash.previous_path.length);
      await this.#assertRouteAvailable(source.item.siteId, site.hostname, normalizePath(`${newRootPath}${suffix}`));
    }
    const statements: D1PreparedStatementLike[] = [this.#treeGuard(source.node.id, input.expectedTreeVersion, input.now)];
    for (const row of trashRows) {
      const suffix = row.previous_path.slice(rootTrash.previous_path.length);
      const newPath = normalizePath(`${newRootPath}${suffix}`);
      statements.push(this.#db.prepare("UPDATE routes SET active=0,deactivated_at=? WHERE content_item_id=? AND active=1").bind(input.now, row.content_item_id));
      statements.push(this.#db.prepare("UPDATE content_items SET state='active',updated_at=? WHERE id=?").bind(input.now, row.content_item_id));
      if (row.content_item_id === input.contentItemId) {
        statements.push(this.#db.prepare("UPDATE content_nodes SET parent_id=?,slug=?,cached_path=?,tree_version=tree_version+1,updated_at=? WHERE id=?")
          .bind(parent?.id ?? null, restoredSlug, newPath, input.now, row.node_id));
      } else {
        statements.push(this.#db.prepare("UPDATE content_nodes SET slug=?,cached_path=?,tree_version=tree_version+1,updated_at=? WHERE id=?")
          .bind(row.previous_slug, newPath, input.now, row.node_id));
      }
      statements.push(this.#retireRedirectStatement(source.item.siteId, site.hostname, newPath));
      statements.push(this.#routeInsert(newId("route"), source.item.siteId, asContentItemId(row.content_item_id), site.hostname, newPath, row.content_type_key === "alias" ? "alias" : "canonical", input.now));
      statements.push(this.#db.prepare("DELETE FROM trash_entries WHERE content_item_id=?").bind(row.content_item_id));
    }
    const outboxId = newId("outbox");
    statements.push(this.#outboxStatement(outboxId, "content.restored", source.item.id, { siteId: source.item.siteId, restoredPath: newRootPath }, input.now));
    statements.push(this.#db.prepare("DELETE FROM tree_move_guards WHERE node_id=?").bind(source.node.id));
    statements.push(this.#auditStatement(createAudit(input.actor, source.item.workspaceId, source.item.siteId, "content.restore", "content-item", source.item.id, source.item.workingRevisionId, input.now, "content.restore", { restoredPath: newRootPath, affectedCount: trashRows.length, outboxEventId: outboxId })));
    await this.#batch(statements);
    return this.#requireSnapshot(source.item.id);
  }

  async listContentTree(siteId: SiteId): Promise<ContentManagerEntry[]> {
    const itemRows = (await this.#db.prepare("SELECT * FROM content_items WHERE site_id=? AND state='active'").bind(siteId).all<ItemRow>()).results;
    if (!itemRows.length) return [];
    const entries = await this.#contentManagerEntriesForItemRows(siteId, itemRows, false);
    return entries.sort((a, b) => compareSortKeys(a.snapshot.node.sortKey, b.snapshot.node.sortKey)
      || a.snapshot.node.cachedPath.localeCompare(b.snapshot.node.cachedPath));
  }

  async listTrash(siteId: SiteId): Promise<ContentManagerEntry[]> {
    const itemRows = (await this.#db.prepare("SELECT * FROM content_items WHERE site_id=? AND state='trashed'").bind(siteId).all<ItemRow>()).results;
    if (!itemRows.length) return [];
    const entries = await this.#contentManagerEntriesForItemRows(siteId, itemRows, true);
    return entries.sort((a, b) => (a.trash?.previousPath ?? "").localeCompare(b.trash?.previousPath ?? ""));
  }

  async createApproval(input: CreateApprovalRecordInput): Promise<ApprovalRequest> {
    const snapshot = await this.#requireSnapshot(input.contentItemId);
    assertDomain(snapshot.item.state === "active", "CONTENT_TRASHED", "Trashed content cannot be approved", 409);
    const id = asApprovalId(newId("approval"));
    await this.#batch([
      this.#db.prepare("INSERT INTO approval_requests(id,content_item_id,revision_id,revision_hash,state,risk_level,requested_by,requested_at,decided_by,decided_at,decision_comment) VALUES(?,?,?,?,?,?,?,?,NULL,NULL,NULL)")
        .bind(id, input.contentItemId, input.revisionId, input.revisionHash, "pending", input.riskLevel, input.actor.actorId, input.now),
      this.#auditStatement(createAudit(input.actor, snapshot.item.workspaceId, snapshot.item.siteId, "content.request-publish", "approval", id, input.revisionId, input.now, "content.request-publish", {})),
    ]);
    return this.#requireApproval(id);
  }
  async getApproval(id: ApprovalId): Promise<ApprovalRequest | null> {
    const row = await this.#db.prepare("SELECT * FROM approval_requests WHERE id=?").bind(id).first<ApprovalRow>();
    return row ? mapApproval(row) : null;
  }

  async listPendingApprovalsBySite(siteId: SiteId): Promise<ApprovalRequest[]> {
    const rows = (await this.#db.prepare(
      "SELECT ar.* FROM approval_requests ar INNER JOIN content_items ci ON ci.id = ar.content_item_id WHERE ci.site_id = ? AND ar.state = 'pending' ORDER BY ar.requested_at DESC",
    ).bind(siteId).all<ApprovalRow>()).results;
    return rows.map(mapApproval);
  }

  async decideApproval(input: DecideApprovalRecordInput): Promise<ApprovalRequest> {
    const approval = await this.#requireApproval(input.approvalId);
    assertDomain(approval.state === "pending", "APPROVAL_ALREADY_DECIDED", "Approval was already decided", 409);
    const snapshot = await this.#requireSnapshot(approval.contentItemId);
    await this.#batch([
      this.#db.prepare("UPDATE approval_requests SET state=?,decided_by=?,decided_at=?,decision_comment=? WHERE id=? AND state='pending'")
        .bind(input.decision, input.actor.actorId, input.now, input.comment, input.approvalId),
      this.#auditStatement(createAudit(input.actor, snapshot.item.workspaceId, snapshot.item.siteId, `content.${input.decision}`, "approval", input.approvalId, approval.revisionId, input.now, `content.${input.decision}`, {})),
    ]);
    return this.#requireApproval(input.approvalId);
  }

  async publish(input: PublishRecordInput): Promise<ContentSnapshot> {
    const snapshot = await this.#requireSnapshot(input.contentItemId);
    assertDomain(snapshot.item.state === "active", "CONTENT_TRASHED", "Trashed content cannot be published", 409);
    assertDomain(snapshot.item.contentTypeKey !== "folder" && snapshot.item.contentTypeKey !== "alias", "CONTENT_NOT_PUBLISHABLE", "This content type cannot be published", 422);
    const publicationId = `pub_${crypto.randomUUID()}`;
    const outboxId = newId("outbox");
    await this.#batch([
      this.#db.prepare("INSERT INTO publication_events(id,content_item_id,previous_revision_id,published_revision_id,approval_id,actor_principal_id,committed_at,verification_state) VALUES(?,?,?,?,?,?,?,'pending')")
        .bind(publicationId, input.contentItemId, snapshot.item.publishedRevisionId, input.revisionId, input.approvalId, input.actor.actorId, input.now),
      this.#db.prepare(
        "UPDATE content_items SET published_revision_id=?, updated_at=? WHERE id=? AND (published_revision_id IS NULL OR published_revision_id=?)",
      ).bind(input.revisionId, input.now, input.contentItemId, snapshot.item.publishedRevisionId),
      this.#outboxStatement(outboxId, "content.published", input.contentItemId, { publicationId, revisionId: input.revisionId, siteId: snapshot.item.siteId }, input.now),
      this.#auditStatement(createAudit(input.actor, snapshot.item.workspaceId, snapshot.item.siteId, "content.publish", "content-item", input.contentItemId, input.revisionId, input.now, "content.publish", { publicationId, outboxEventId: outboxId })),
    ]);
    return this.#requireSnapshot(input.contentItemId);
  }

  async unpublish(input: UnpublishRecordInput): Promise<ContentSnapshot> {
    const snapshot = await this.#requireSnapshot(input.contentItemId);
    assertDomain(snapshot.item.state === "active", "CONTENT_TRASHED", "Trashed content cannot be unpublished", 409);
    assertDomain(snapshot.item.contentTypeKey !== "folder" && snapshot.item.contentTypeKey !== "alias", "CONTENT_NOT_PUBLISHABLE", "This content type cannot be unpublished", 422);
    assertDomain(snapshot.item.publishedRevisionId, "CONTENT_NOT_PUBLISHED", "Content is not published", 409);
    const previousRevisionId = snapshot.item.publishedRevisionId;
    const outboxId = newId("outbox");
    await this.#batch([
      this.#db.prepare("UPDATE content_items SET published_revision_id=NULL, updated_at=? WHERE id=? AND published_revision_id IS NOT NULL")
        .bind(input.now, input.contentItemId),
      this.#outboxStatement(outboxId, "content.unpublished", input.contentItemId, { previousRevisionId, siteId: snapshot.item.siteId }, input.now),
      this.#auditStatement(createAudit(input.actor, snapshot.item.workspaceId, snapshot.item.siteId, "content.unpublish", "content-item", input.contentItemId, previousRevisionId, input.now, "content.unpublish", { previousRevisionId, outboxEventId: outboxId })),
    ]);
    return this.#requireSnapshot(input.contentItemId);
  }

  async resolvePublicPath(siteId: SiteId, path: string): Promise<PublicPathResolution | null> {
    const normalized = normalizePath(path);
    const route = await this.#db.prepare("SELECT * FROM routes WHERE site_id=? AND path=? AND active=1 LIMIT 1")
      .bind(siteId, normalized).first<RouteRow>();
    if (route) {
      const snapshot = await this.#resolvePublishableSnapshot(asContentItemId(route.content_item_id));
      return snapshot ? { kind: "content", snapshot } : null;
    }
    const redirect = await this.#db.prepare("SELECT * FROM redirects WHERE site_id=? AND source_path=? AND active=1 LIMIT 1")
      .bind(siteId, normalized).first<RedirectRow>();
    if (!redirect) return null;
    const targetRoute = await this.#db.prepare("SELECT * FROM routes WHERE id=?").bind(redirect.target_route_id).first<RouteRow>();
    if (!targetRoute) return null;
    const currentRoute = await this.#db.prepare("SELECT * FROM routes WHERE content_item_id=? AND active=1 AND is_canonical=1 ORDER BY activated_at DESC LIMIT 1")
      .bind(targetRoute.content_item_id).first<RouteRow>();
    if (!currentRoute) return null;
    return { kind: "redirect", location: currentRoute.path, statusCode: redirect.status_code };
  }

  async findPublicByPath(siteId: SiteId, path: string): Promise<ContentSnapshot | null> {
    const resolution = await this.resolvePublicPath(siteId, path);
    return resolution?.kind === "content" ? resolution.snapshot : null;
  }

  async saveAgentRun(run: AgentRun): Promise<void> {
    await this.#db.prepare("INSERT INTO agent_runs(id,workspace_id,agent_principal_id,instructed_by,model_provider,model_name,base_revision_id,produced_revision_id,state,started_at,completed_at) VALUES(?,?,?,?,?,?,?,?,?,?,?)")
      .bind(run.id, run.workspaceId, run.agentPrincipalId, run.instructedBy, run.modelProvider, run.modelName, run.baseRevisionId, run.producedRevisionId, run.state, run.startedAt, run.completedAt).run();
  }
  async updateAgentRun(run: AgentRun): Promise<void> {
    await this.#db.prepare("UPDATE agent_runs SET produced_revision_id=?,state=?,completed_at=? WHERE id=?").bind(run.producedRevisionId, run.state, run.completedAt, run.id).run();
  }
  async saveChangeSet(changeSet: ChangeSet): Promise<void> {
    await this.#db.prepare("INSERT INTO change_sets(id,content_item_id,base_revision_id,result_revision_id,operations_json,diff_json,risk_level,state,created_by,agent_run_id,created_at) VALUES(?,?,?,?,?,?,?,?,?,?,?) ON CONFLICT(id) DO UPDATE SET result_revision_id=excluded.result_revision_id,diff_json=excluded.diff_json,state=excluded.state")
      .bind(changeSet.id, changeSet.contentItemId, changeSet.baseRevisionId, changeSet.resultRevisionId, JSON.stringify(changeSet.operations), changeSet.diff ? JSON.stringify(changeSet.diff) : null, changeSet.riskLevel, changeSet.state, changeSet.createdBy, changeSet.agentRunId, changeSet.createdAt).run();
  }
  async getChangeSet(id: string): Promise<ChangeSet | null> {
    const row = await this.#db.prepare("SELECT * FROM change_sets WHERE id=?").bind(id).first<ChangeSetRow>();
    return row ? mapChangeSet(row) : null;
  }
  async appendAudit(event: AuditEvent): Promise<void> { await this.#auditStatement(event).run(); }
  async listAudit(workspaceId: WorkspaceId): Promise<AuditEvent[]> {
    return (await this.#db.prepare("SELECT * FROM audit_events WHERE workspace_id=? ORDER BY occurred_at").bind(workspaceId).all<AuditRow>()).results.map(mapAudit);
  }
  async getWorkspace(id: WorkspaceId): Promise<Workspace | null> {
    const row = await this.#db.prepare("SELECT * FROM workspaces WHERE id=?").bind(id).first<WorkspaceRow>();
    return row ? mapWorkspace(row) : null;
  }
  async findCloudflareLoginTarget(accountId: string, ownerEmail: string): Promise<CloudflareLoginTarget | null> {
    const row = await this.#db.prepare(
      `SELECT w.id AS workspace_id, w.name AS workspace_name, p.id AS owner_principal_id, s.id AS site_id, s.name AS site_name
       FROM workspaces w
       JOIN principals p ON p.workspace_id = w.id AND p.principal_type = 'human'
       JOIN sites s ON s.workspace_id = w.id
       WHERE w.cloudflare_account_id = ? AND w.cloudflare_owner_email = ?
       LIMIT 1`,
    ).bind(accountId, ownerEmail).first<CloudflareLoginRow>();
    return row ? {
      workspaceId: row.workspace_id as WorkspaceId,
      ownerPrincipalId: asPrincipalId(row.owner_principal_id),
      siteId: asSiteId(row.site_id),
      siteName: row.site_name,
    } : null;
  }
  async findCloudflareLoginTargetByEmail(ownerEmail: string): Promise<CloudflareLoginTarget | null> {
    const rows = await this.#db.prepare(
      `SELECT w.id AS workspace_id, w.name AS workspace_name, p.id AS owner_principal_id, s.id AS site_id, s.name AS site_name
       FROM workspaces w
       JOIN principals p ON p.workspace_id = w.id AND p.principal_type = 'human'
       JOIN sites s ON s.workspace_id = w.id
       WHERE w.cloudflare_owner_email = ?`,
    ).bind(ownerEmail).all<CloudflareLoginRow>();
    if (rows.results.length === 0) return null;
    if (rows.results.length > 1) {
      throw new DomainError("CLOUDFLARE_OWNER_AMBIGUOUS", "Multiple workspaces match this Cloudflare email", 409);
    }
    const row = rows.results[0]!;
    return {
      workspaceId: row.workspace_id as WorkspaceId,
      ownerPrincipalId: asPrincipalId(row.owner_principal_id),
      siteId: asSiteId(row.site_id),
      siteName: row.site_name,
    };
  }
  async bindCloudflareOwner(input: { cloudflareAccountId: string; cloudflareOwnerEmail: string }): Promise<CloudflareLoginTarget> {
    const workspaces = await this.#db.prepare("SELECT id, cloudflare_account_id FROM workspaces").all<{ id: string; cloudflare_account_id: string | null }>();
    assertDomain(workspaces.results.length === 1, "WORKSPACE_COUNT_INVALID", "Exactly one workspace is required to bind Cloudflare owner", 422);
    const workspace = workspaces.results[0]!;
    assertDomain(!workspace.cloudflare_account_id, "CLOUDFLARE_OWNER_ALREADY_BOUND", "Cloudflare owner is already bound", 409);
    await this.#db.prepare("UPDATE workspaces SET cloudflare_account_id=?, cloudflare_owner_email=? WHERE id=?")
      .bind(input.cloudflareAccountId, input.cloudflareOwnerEmail, workspace.id).run();
    const target = await this.findCloudflareLoginTarget(input.cloudflareAccountId, input.cloudflareOwnerEmail);
    assertDomain(target, "CLOUDFLARE_OWNER_BIND_FAILED", "Failed to bind Cloudflare owner", 500);
    return target;
  }
  async hasCloudflareOwnerBinding(): Promise<boolean> {
    const row = await this.#db.prepare(
      "SELECT 1 AS ok FROM workspaces WHERE cloudflare_account_id IS NOT NULL AND cloudflare_owner_email IS NOT NULL LIMIT 1",
    ).first<{ ok: number }>();
    return Boolean(row);
  }
  async getSite(id: SiteId): Promise<Site | null> {
    const row = await this.#db.prepare("SELECT * FROM sites WHERE id=?").bind(id).first<SiteRow>();
    return row ? mapSite(row) : null;
  }
  async listOutbox(): Promise<OutboxEvent[]> {
    return (await this.#db.prepare("SELECT * FROM outbox_events ORDER BY created_at").all<OutboxRow>()).results.map(mapOutbox);
  }
  async listPublishedAssetReferences(assetId: AssetId): Promise<PublishedAssetReference[]> {
    const rows = await this.#db.prepare(`SELECT r.revision_id,r.asset_id,r.block_id,r.field_path,r.usage,c.id AS content_item_id,c.site_id,n.cached_path
      FROM revision_asset_references r
      JOIN content_revisions v ON v.id=r.revision_id
      JOIN content_items c ON c.id=v.content_item_id AND c.published_revision_id=v.id AND c.state='active'
      JOIN content_nodes n ON n.content_item_id=c.id
      WHERE r.asset_id=?`).bind(assetId).all<PublishedAssetReferenceRow>();
    return rows.results.map((row) => ({ revisionId: asRevisionId(row.revision_id), assetId: asAssetId(row.asset_id), blockId: row.block_id, fieldPath: row.field_path, usage: row.usage, contentItemId: asContentItemId(row.content_item_id), siteId: asSiteId(row.site_id), path: row.cached_path }));
  }

  async revisionReferencesAsset(revisionId: RevisionId, assetId: AssetId): Promise<boolean> {
    const row = await this.#db.prepare(
      "SELECT 1 AS ok FROM revision_asset_references WHERE revision_id=? AND asset_id=? LIMIT 1",
    ).bind(revisionId, assetId).first<{ ok: number }>();
    return Boolean(row);
  }

  async isAssetDeliverableOnPublicSite(siteId: SiteId, assetId: AssetId, now: number): Promise<boolean> {
    const row = await this.#db.prepare(
      `SELECT 1 AS ok WHERE EXISTS (
        SELECT 1 FROM revision_asset_references r
        JOIN content_revisions v ON v.id = r.revision_id
        JOIN content_items c ON c.id = v.content_item_id AND c.published_revision_id = v.id AND c.state = 'active' AND c.site_id = ?
        WHERE r.asset_id = ?
      ) OR EXISTS (
        SELECT 1 FROM revision_asset_references r
        JOIN preview_sessions p ON p.revision_id = r.revision_id AND p.site_id = ? AND p.revoked_at IS NULL AND p.expires_at > ?
        WHERE r.asset_id = ?
      )`,
    ).bind(siteId, assetId, siteId, now, assetId).first<{ ok: number }>();
    return Boolean(row);
  }

  async #createRoutable(input: RoutableCreateInput, contentType: "page" | "folder" | "blog" | "article" | "custom-content" | "mail-form" | "alias", routeType: StoredRoute["routeType"], aliasTarget?: ContentItemId): Promise<ContentSnapshot> {
    const site = await this.#requireSite(input.siteId);
    if (input.parentId) await this.#requireParentForType(input.parentId, input.siteId, contentType);
    else if (contentType === "article") throw new DomainError("ARTICLE_PARENT_REQUIRED", "Articles must belong to a blog", 422);
    await this.#assertRouteAvailable(input.siteId, site.hostname, input.path);
    const contentId = asContentItemId(newId("content"));
    const revisionId = asRevisionId(newId("revision"));
    const nodeId = asContentNodeId(newId("node"));
    const routeId = newId("route");
    const documentJson = JSON.stringify(input.document);
    const statements: D1PreparedStatementLike[] = [
      this.#db.prepare("INSERT INTO content_items(id,workspace_id,site_id,content_type_key,working_revision_id,published_revision_id,lock_version,state,created_by,created_at,updated_at) VALUES(?,?,?,?,NULL,NULL,0,'active',?,?,?)")
        .bind(contentId, input.workspaceId, input.siteId, contentType, input.actor.actorId, input.now, input.now),
      this.#db.prepare("INSERT INTO content_revisions(id,content_item_id,revision_number,based_on_revision_id,expected_lock_version,fields_json,content_hash,created_by,agent_run_id,change_summary,created_at) VALUES(?,?,1,NULL,0,?,?,?,?,?,?)")
        .bind(revisionId, contentId, JSON.stringify({ title: input.title }), input.contentHash, input.actor.actorId, null, `Initial ${contentType}`, input.now),
      this.#db.prepare("INSERT INTO revision_documents(revision_id,format_version,document_json,byte_size,document_hash) VALUES(?,?,?,?,?)")
        .bind(revisionId, input.document.formatVersion, documentJson, new TextEncoder().encode(documentJson).byteLength, input.contentHash),
      ...this.#assetReferenceStatements(revisionId, input.document),
      this.#db.prepare("INSERT INTO content_nodes(id,site_id,content_item_id,parent_id,slug,sort_key,cached_path,tree_version,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?,?,?)")
        .bind(nodeId, input.siteId, contentId, input.parentId, input.slug, `${input.now}:${contentId}`, input.path, 1, input.now, input.now),
      this.#retireRedirectStatement(input.siteId, site.hostname, input.path),
      this.#routeInsert(routeId, input.siteId, contentId, site.hostname, input.path, routeType, input.now),
    ];
    if (aliasTarget) statements.push(this.#db.prepare("INSERT INTO content_aliases(alias_content_item_id,target_content_item_id,created_at) VALUES(?,?,?)").bind(contentId, aliasTarget, input.now));
    statements.push(
      this.#db.prepare(
        "UPDATE content_items SET working_revision_id=?, lock_version=1, updated_at=? WHERE id=? AND working_revision_id IS NULL",
      ).bind(revisionId, input.now, contentId),
    );
    statements.push(this.#auditStatement(createAudit(input.actor, input.workspaceId, input.siteId, `${contentType}.create`, "content-item", contentId, revisionId, input.now, `${contentType}.create`, { path: input.path, aliasTarget: aliasTarget ?? null })));
    await this.#batch(statements);
    return this.#requireSnapshot(contentId);
  }

  async #resolvePublishableSnapshot(contentItemId: ContentItemId): Promise<ContentSnapshot | null> {
    let item: ItemRow | null = await this.#db.prepare("SELECT * FROM content_items WHERE id=?").bind(contentItemId).first<ItemRow>();
    const visited = new Set<string>();
    while (item?.content_type_key === "alias") {
      if (visited.has(item.id)) throw new DomainError("ALIAS_CYCLE", "Alias cycle detected", 500);
      visited.add(item.id);
      const relation: AliasRow | null = await this.#db.prepare("SELECT * FROM content_aliases WHERE alias_content_item_id=?").bind(item.id).first<AliasRow>();
      if (!relation) return null;
      item = await this.#db.prepare("SELECT * FROM content_items WHERE id=?").bind(relation.target_content_item_id).first<ItemRow>();
    }
    if (!item || item.state !== "active" || !item.published_revision_id) return null;
    return this.getContentSnapshot(asContentItemId(item.id));
  }

  async #managerEntry(contentItemId: ContentItemId): Promise<ContentManagerEntry> {
    const snapshot = await this.#requireSnapshot(contentItemId);
    const alias = await this.#db.prepare("SELECT * FROM content_aliases WHERE alias_content_item_id=?").bind(contentItemId).first<AliasRow>();
    const trash = await this.#db.prepare("SELECT * FROM trash_entries WHERE content_item_id=?").bind(contentItemId).first<TrashRow>();
    return { snapshot, aliasTargetContentItemId: alias ? asContentItemId(alias.target_content_item_id) : null, trash: trash ? mapTrash(trash) : null };
  }

  async #contentManagerEntriesForItemRows(siteId: SiteId, itemRows: ItemRow[], includeTrash: boolean): Promise<ContentManagerEntry[]> {
    const [nodeResult, routeResult, aliasResult, trashResult] = await Promise.all([
      this.#db.prepare("SELECT * FROM content_nodes WHERE site_id=?").bind(siteId).all<NodeRow>(),
      this.#db.prepare("SELECT * FROM routes WHERE site_id=? AND active=1 AND is_canonical=1").bind(siteId).all<RouteRow>(),
      this.#db.prepare(
        "SELECT ca.* FROM content_aliases ca INNER JOIN content_items ci ON ci.id=ca.alias_content_item_id WHERE ci.site_id=?",
      ).bind(siteId).all<AliasRow>(),
      includeTrash
        ? this.#db.prepare(
          "SELECT te.* FROM trash_entries te INNER JOIN content_items ci ON ci.id=te.content_item_id WHERE ci.site_id=? AND ci.state='trashed'",
        ).bind(siteId).all<TrashRow>()
        : Promise.resolve({ results: [] as TrashRow[] }),
    ]);
    const nodeRows = nodeResult.results;
    const routeRows = routeResult.results;
    const aliasRows = aliasResult.results;
    const trashRows = trashResult.results;

    const revisionIds: RevisionId[] = [];
    for (const row of itemRows) {
      if (row.working_revision_id) revisionIds.push(asRevisionId(row.working_revision_id));
      if (row.published_revision_id) revisionIds.push(asRevisionId(row.published_revision_id));
    }
    const revisions = await this.#loadRevisionSummariesForTree(revisionIds);

    const nodeByContentId = new Map(nodeRows.map((row) => [row.content_item_id, row]));
    const routeByContentId = pickLatestCanonicalRouteByContentItem(routeRows);
    const aliasByContentId = new Map(aliasRows.map((row) => [row.alias_content_item_id, row]));
    const trashByContentId = new Map(trashRows.map((row) => [row.content_item_id, row]));

    const entries: ContentManagerEntry[] = [];
    for (const itemRow of itemRows) {
      const nodeRow = nodeByContentId.get(itemRow.id);
      const routeRow = routeByContentId.get(itemRow.id);
      assertDomain(nodeRow && routeRow, "CONTENT_PROJECTION_MISSING", "Content node or route is missing", 500);
      const item = mapItem(itemRow);
      entries.push({
        snapshot: {
          item,
          node: mapNode(nodeRow),
          route: mapRoute(routeRow),
          workingRevision: item.workingRevisionId ? revisions.get(item.workingRevisionId) ?? null : null,
          publishedRevision: item.publishedRevisionId ? revisions.get(item.publishedRevisionId) ?? null : null,
        },
        aliasTargetContentItemId: aliasByContentId.has(itemRow.id)
          ? asContentItemId(aliasByContentId.get(itemRow.id)!.target_content_item_id)
          : null,
        trash: trashByContentId.has(itemRow.id) ? mapTrash(trashByContentId.get(itemRow.id)!) : null,
      });
    }
    return entries;
  }

  async #loadRevisionSummariesForTree(ids: RevisionId[]): Promise<Map<RevisionId, ContentRevision>> {
    const map = new Map<RevisionId, ContentRevision>();
    const unique = [...new Set(ids)];
    if (!unique.length) return map;
    const chunkSize = 80;
    for (let offset = 0; offset < unique.length; offset += chunkSize) {
      const chunk = unique.slice(offset, offset + chunkSize);
      const placeholders = chunk.map(() => "?").join(",");
      const rows = (await this.#db.prepare(
        `SELECT id,content_item_id,revision_number,based_on_revision_id,fields_json,content_hash,created_by,agent_run_id,change_summary,created_at FROM content_revisions WHERE id IN (${placeholders})`,
      ).bind(...chunk).all<RevisionFieldsRow>()).results;
      for (const row of rows) {
        map.set(asRevisionId(row.id), mapRevisionFieldsOnly(row));
      }
    }
    return map;
  }

  async #requireFolderParent(id: ContentNodeId, siteId: SiteId): Promise<StoredContentNode> {
    return this.#requireParentForType(id, siteId, "page");
  }

  async #requireParentForType(id: ContentNodeId, siteId: SiteId, childType: string): Promise<StoredContentNode> {
    const node = await this.getNode(id);
    assertDomain(node, "PARENT_NOT_FOUND", "Parent not found", 404);
    assertDomain(node.siteId === siteId, "CROSS_SITE_PARENT", "Parent belongs to another site", 422);
    const item = await this.#requireItemRow(node.contentItemId);
    assertDomain(item.state === "active", "PARENT_TRASHED", "Parent is in trash", 409);
    const required = childType === "article" ? "blog" : "folder";
    const code = required === "blog" ? "PARENT_MUST_BE_BLOG" : "PARENT_MUST_BE_FOLDER";
    const message = required === "blog" ? "Articles can only belong to a blog" : "Only folders can contain this content type";
    assertDomain(item.content_type_key === required, code, message, 422);
    return node;
  }

  async #assertRouteAvailable(siteId: SiteId, hostname: string, path: string, exceptContentId?: ContentItemId): Promise<void> {
    const row = await this.#db.prepare("SELECT content_item_id FROM routes WHERE site_id=? AND hostname=? AND path=? AND active=1 LIMIT 1")
      .bind(siteId, hostname, normalizePath(path)).first<{content_item_id:string}>();
    if (row && row.content_item_id !== exceptContentId) throw new DomainError("ROUTE_COLLISION", `Route ${path} already exists`, 409);
  }

  #retireRedirectStatement(siteId: SiteId, hostname: string, path: string): D1PreparedStatementLike {
    return this.#db.prepare("UPDATE redirects SET active=0 WHERE site_id=? AND source_hostname=? AND source_path=? AND active=1")
      .bind(siteId, hostname, normalizePath(path));
  }
  #routeInsert(id: string, siteId: SiteId, contentItemId: ContentItemId, hostname: string, path: string, routeType: StoredRoute["routeType"], now: number): D1PreparedStatementLike {
    return this.#db.prepare("INSERT INTO routes(id,site_id,content_item_id,hostname,path,route_type,is_canonical,active,activated_at,deactivated_at) VALUES(?,?,?,?,?,?,1,1,?,NULL)")
      .bind(id, siteId, contentItemId, hostname, normalizePath(path), routeType, now);
  }
  #treeGuard(nodeId: ContentNodeId, expectedTreeVersion: number, now: number): D1PreparedStatementLike {
    return this.#db.prepare("INSERT INTO tree_move_guards(id,node_id,expected_tree_version,created_at) VALUES(?,?,?,?)").bind(`guard_${crypto.randomUUID()}`, nodeId, expectedTreeVersion, now);
  }
  #outboxStatement(id: string, eventType: string, aggregateId: string, payload: Record<string, unknown>, now: number): D1PreparedStatementLike {
    return this.#db.prepare("INSERT INTO outbox_events(id,event_type,aggregate_type,aggregate_id,payload_json,state,attempts,available_at,created_at) VALUES(?,?,?,?,?,'pending',0,?,?)")
      .bind(id, eventType, "content-item", aggregateId, JSON.stringify(payload), now, now);
  }
  async #activeRouteRow(contentItemId: ContentItemId): Promise<RouteRow> {
    const row = await this.#db.prepare("SELECT * FROM routes WHERE content_item_id=? AND active=1 AND is_canonical=1 LIMIT 1").bind(contentItemId).first<RouteRow>();
    assertDomain(row, "ROUTE_NOT_FOUND", "Canonical route not found", 500);
    return row;
  }
  async #requireItemRow(contentItemId: ContentItemId): Promise<ItemRow> {
    const row = await this.#db.prepare("SELECT * FROM content_items WHERE id=?").bind(contentItemId).first<ItemRow>();
    assertDomain(row, "CONTENT_NOT_FOUND", "Content not found", 404);
    return row;
  }
  async #requireNodeRow(nodeId: ContentNodeId): Promise<NodeRow> {
    const row = await this.#db.prepare("SELECT * FROM content_nodes WHERE id=?").bind(nodeId).first<NodeRow>();
    assertDomain(row, "NODE_NOT_FOUND", "Content node not found", 404);
    return row;
  }
  async #requireRevisionRow(revisionId: RevisionId): Promise<RevisionWithDocumentRow> {
    const row = await this.#db.prepare("SELECT r.*,d.format_version,d.document_json,d.byte_size,d.document_hash FROM content_revisions r JOIN revision_documents d ON d.revision_id=r.id WHERE r.id=?")
      .bind(revisionId).first<RevisionWithDocumentRow>();
    assertDomain(row, "REVISION_NOT_FOUND", "Revision not found", 404);
    return row;
  }
  async #requireSnapshot(id: ContentItemId): Promise<ContentSnapshot> {
    const snapshot = await this.getContentSnapshot(id);
    assertDomain(snapshot, "CONTENT_NOT_FOUND", "Content not found", 404);
    return snapshot;
  }
  async #requireApproval(id: ApprovalId): Promise<ApprovalRequest> {
    const approval = await this.getApproval(id);
    assertDomain(approval, "APPROVAL_NOT_FOUND", "Approval not found", 404);
    return approval;
  }
  async #requireSite(id: SiteId): Promise<Site> {
    const site = await this.getSite(id);
    assertDomain(site, "SITE_NOT_FOUND", "Site not found", 404);
    return site;
  }

  #assetReferenceStatements(revisionId: RevisionId, document: StructuredDocument): D1PreparedStatementLike[] {
    return collectAssetReferences(document).map((reference) => this.#db.prepare("INSERT INTO revision_asset_references(revision_id,asset_id,block_id,field_path,usage) VALUES(?,?,?,?,?)")
      .bind(revisionId, reference.assetId, reference.blockId, reference.fieldPath, reference.usage));
  }

  async #batch(statements: D1PreparedStatementLike[]): Promise<unknown[]> {
    try { return await this.#db.batch(statements); }
    catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      if (message.includes("REVISION_CONFLICT")) throw new DomainError("REVISION_CONFLICT", "The content changed after the requested base revision", 409);
      if (message.includes("REVISION_NOT_APPROVED")) throw new DomainError("REVISION_NOT_APPROVED", "The exact revision has not been approved", 409);
      if (message.includes("TREE_CONFLICT")) throw new DomainError("TREE_CONFLICT", "Content tree changed", 409);
      if (message.includes("UNIQUE constraint failed") || message.includes("constraint failed")) throw new DomainError("DATABASE_CONSTRAINT", "A unique or relational constraint was violated", 409, { databaseMessage: message });
      throw error;
    }
  }
  #grantStatement(grant: StoredCapabilityGrant, createdAt: number): D1PreparedStatementLike {
    return this.#db.prepare("INSERT INTO capability_grants(id,principal_id,capability,scope_json,valid_from,valid_until,revoked_at,created_at) VALUES(?,?,?,?,?,?,?,?)")
      .bind(grant.id, grant.principalId, grant.capability, JSON.stringify(grant.scope), grant.validFrom ?? null, grant.validUntil ?? null, grant.revokedAt ?? null, createdAt);
  }
  #auditStatement(event: AuditEvent): D1PreparedStatementLike {
    return this.#db.prepare("INSERT INTO audit_events(id,workspace_id,site_id,occurred_at,actor_principal_id,actor_type,on_behalf_of_principal_id,delegation_id,action,resource_type,resource_id,revision_id,capability,result,reason,request_id,details_json) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)")
      .bind(event.id, event.workspaceId, event.siteId, event.occurredAt, event.actorPrincipalId, event.actorType, event.onBehalfOfPrincipalId, event.delegationId, event.action, event.resourceType, event.resourceId, event.revisionId, event.capability, event.result, event.reason, event.requestId, JSON.stringify(event.details));
  }
}

function createAudit(actor: ActorContext, workspaceId: WorkspaceId, siteId: SiteId | null, action: string, resourceType: string, resourceId: string, revisionId: RevisionId | null, now: number, capability: string, details: Record<string, unknown>): AuditEvent {
  return { id: newId("audit") as AuditEvent["id"], workspaceId, siteId, occurredAt: now, actorPrincipalId: actor.actorId, actorType: actor.actorType, onBehalfOfPrincipalId: actor.onBehalfOf ?? null, delegationId: actor.delegationId ?? null, action, resourceType, resourceId, revisionId, capability, result: "success", reason: null, requestId: actor.requestId, details };
}
function json<T>(value: string): T { return JSON.parse(value) as T; }

/** Matches getContentSnapshot: newest active canonical route per content item. */
function pickLatestCanonicalRouteByContentItem(routeRows: RouteRow[]): Map<string, RouteRow> {
  const map = new Map<string, RouteRow>();
  for (const row of routeRows) {
    const existing = map.get(row.content_item_id);
    if (!existing || row.activated_at > existing.activated_at) {
      map.set(row.content_item_id, row);
    }
  }
  return map;
}

type WorkspaceRow={id:string;name:string;created_at:number;cloudflare_account_id:string|null;cloudflare_owner_email:string|null};
type CloudflareLoginRow={workspace_id:string;workspace_name:string;owner_principal_id:string;site_id:string;site_name:string};
function mapWorkspace(row: WorkspaceRow): Workspace {
  return {
    id: row.id as WorkspaceId,
    name: row.name,
    createdAt: row.created_at,
    cloudflareAccountId: row.cloudflare_account_id,
    cloudflareOwnerEmail: row.cloudflare_owner_email,
  };
}
type SiteRow={id:string;workspace_id:string;name:string;hostname:string;locale:string;state:Site["state"];created_at:number;updated_at:number};
type PrincipalRow={id:string;workspace_id:string;principal_type:Principal["type"];display_name:string;state:Principal["state"];created_at:number};
type GrantRow={id:string;principal_id:string;capability:string;scope_json:string;valid_from:number|null;valid_until:number|null;revoked_at:number|null};
type DelegationRow={id:string;human_principal_id:string;agent_principal_id:string;capabilities_json:string;scope_json:string;maximum_risk:StoredDelegationGrant["maximumRisk"];expires_at:number;revoked_at:number|null};
type ItemRow={id:string;workspace_id:string;site_id:string;content_type_key:string;working_revision_id:string|null;published_revision_id:string|null;lock_version:number;state:ContentItem["state"];created_by:string;created_at:number;updated_at:number};
type RevisionRow={id:string;content_item_id:string;revision_number:number;based_on_revision_id:string|null;fields_json:string;content_hash:string;created_by:string;agent_run_id:string|null;change_summary:string;created_at:number;document_json:string};
type RevisionFieldsRow={id:string;content_item_id:string;revision_number:number;based_on_revision_id:string|null;fields_json:string;content_hash:string;created_by:string;agent_run_id:string|null;change_summary:string;created_at:number};
type RevisionWithDocumentRow=RevisionRow&{format_version:number;byte_size:number;document_hash:string};
type NodeRow={id:string;site_id:string;content_item_id:string;parent_id:string|null;slug:string;sort_key:string;cached_path:string;tree_version:number;created_at:number;updated_at:number};
type NodeWithTypeRow=NodeRow&{content_type_key:string};
type RouteRow={id:string;site_id:string;content_item_id:string;hostname:string;path:string;route_type:StoredRoute["routeType"];is_canonical:number;active:number;activated_at:number;deactivated_at:number|null};
type AliasRow={alias_content_item_id:string;target_content_item_id:string;created_at:number};
type RedirectRow={id:string;site_id:string;source_hostname:string;source_path:string;target_route_id:string;status_code:301|302|307|308;active:number;created_at:number};
type TrashRow={content_item_id:string;root_content_item_id:string;previous_parent_id:string|null;previous_slug:string;previous_path:string;trashed_by:string;trashed_at:number};
type TrashWithTypeRow=TrashRow&{content_type_key:string;node_id:string};
type ApprovalRow={id:string;content_item_id:string;revision_id:string;revision_hash:string;state:ApprovalRequest["state"];risk_level:ApprovalRequest["riskLevel"];requested_by:string;requested_at:number;decided_by:string|null;decided_at:number|null;decision_comment:string|null};
type ChangeSetRow={id:string;content_item_id:string;base_revision_id:string;result_revision_id:string|null;operations_json:string;diff_json:string|null;risk_level:ChangeSet["riskLevel"];state:ChangeSet["state"];created_by:string;agent_run_id:string|null;created_at:number};
type AuditRow={id:string;workspace_id:string;site_id:string|null;occurred_at:number;actor_principal_id:string;actor_type:AuditEvent["actorType"];on_behalf_of_principal_id:string|null;delegation_id:string|null;action:string;resource_type:string;resource_id:string;revision_id:string|null;capability:string;result:AuditEvent["result"];reason:string|null;request_id:string;details_json:string};
type OutboxRow={id:string;event_type:string;aggregate_type:string;aggregate_id:string;payload_json:string;state:OutboxEvent["state"];attempts:number;available_at:number;created_at:number};

function mapSite(r:SiteRow):Site{return{id:asSiteId(r.id),workspaceId:r.workspace_id as WorkspaceId,name:r.name,hostname:r.hostname,locale:r.locale,state:r.state,createdAt:r.created_at,updatedAt:r.updated_at};}
function mapPrincipal(r:PrincipalRow):Principal{return{id:asPrincipalId(r.id),workspaceId:r.workspace_id as WorkspaceId,type:r.principal_type,displayName:r.display_name,state:r.state,createdAt:r.created_at};}
function mapGrant(r:GrantRow):StoredCapabilityGrant{const g:StoredCapabilityGrant={id:r.id as StoredCapabilityGrant["id"],principalId:asPrincipalId(r.principal_id),capability:r.capability,scope:json(r.scope_json)};if(r.valid_from!==null)g.validFrom=r.valid_from;if(r.valid_until!==null)g.validUntil=r.valid_until;if(r.revoked_at!==null)g.revokedAt=r.revoked_at;return g;}
function mapDelegation(r:DelegationRow):StoredDelegationGrant{const g:StoredDelegationGrant={id:r.id as StoredDelegationGrant["id"],humanPrincipalId:asPrincipalId(r.human_principal_id),agentPrincipalId:asPrincipalId(r.agent_principal_id),capabilities:json(r.capabilities_json),scope:json(r.scope_json),maximumRisk:r.maximum_risk,expiresAt:r.expires_at};if(r.revoked_at!==null)g.revokedAt=r.revoked_at;return g;}
function mapItem(r:ItemRow):ContentItem{return{id:asContentItemId(r.id),workspaceId:r.workspace_id as WorkspaceId,siteId:asSiteId(r.site_id),contentTypeKey:r.content_type_key,workingRevisionId:r.working_revision_id?asRevisionId(r.working_revision_id):null,publishedRevisionId:r.published_revision_id?asRevisionId(r.published_revision_id):null,lockVersion:r.lock_version,state:r.state,createdBy:asPrincipalId(r.created_by),createdAt:r.created_at,updatedAt:r.updated_at};}
function mapRevision(r:RevisionRow):ContentRevision{return{id:asRevisionId(r.id),contentItemId:asContentItemId(r.content_item_id),revisionNumber:r.revision_number,basedOnRevisionId:r.based_on_revision_id?asRevisionId(r.based_on_revision_id):null,fields:json(r.fields_json),document:json(r.document_json),contentHash:r.content_hash,createdBy:asPrincipalId(r.created_by),agentRunId:r.agent_run_id as ContentRevision["agentRunId"],changeSummary:r.change_summary,createdAt:r.created_at};}
function mapRevisionFieldsOnly(r: RevisionFieldsRow): ContentRevision {
  return {
    id: asRevisionId(r.id),
    contentItemId: asContentItemId(r.content_item_id),
    revisionNumber: r.revision_number,
    basedOnRevisionId: r.based_on_revision_id ? asRevisionId(r.based_on_revision_id) : null,
    fields: json(r.fields_json),
    document: createEmptyDocument(),
    contentHash: r.content_hash,
    createdBy: asPrincipalId(r.created_by),
    agentRunId: r.agent_run_id as ContentRevision["agentRunId"],
    changeSummary: r.change_summary,
    createdAt: r.created_at,
  };
}
function mapNode(r:NodeRow):StoredContentNode{return{id:asContentNodeId(r.id),siteId:asSiteId(r.site_id),contentItemId:asContentItemId(r.content_item_id),parentId:r.parent_id?asContentNodeId(r.parent_id):null,slug:r.slug,sortKey:r.sort_key,cachedPath:r.cached_path,treeVersion:r.tree_version,createdAt:r.created_at,updatedAt:r.updated_at};}
function mapRoute(r:RouteRow):StoredRoute{return{id:r.id as StoredRoute["id"],siteId:asSiteId(r.site_id),contentItemId:asContentItemId(r.content_item_id),hostname:r.hostname,path:r.path,routeType:r.route_type,isCanonical:r.is_canonical===1,active:r.active===1,activatedAt:r.activated_at,deactivatedAt:r.deactivated_at};}
function mapTrash(r:TrashRow):TrashEntry{return{contentItemId:asContentItemId(r.content_item_id),rootContentItemId:asContentItemId(r.root_content_item_id),previousParentId:r.previous_parent_id?asContentNodeId(r.previous_parent_id):null,previousSlug:r.previous_slug,previousPath:r.previous_path,trashedBy:asPrincipalId(r.trashed_by),trashedAt:r.trashed_at};}
function mapApproval(r:ApprovalRow):ApprovalRequest{return{id:asApprovalId(r.id),contentItemId:asContentItemId(r.content_item_id),revisionId:asRevisionId(r.revision_id),revisionHash:r.revision_hash,state:r.state,riskLevel:r.risk_level,requestedBy:asPrincipalId(r.requested_by),requestedAt:r.requested_at,decidedBy:r.decided_by?asPrincipalId(r.decided_by):null,decidedAt:r.decided_at,decisionComment:r.decision_comment};}
function mapChangeSet(r:ChangeSetRow):ChangeSet{return{id:r.id as ChangeSet["id"],contentItemId:asContentItemId(r.content_item_id),baseRevisionId:asRevisionId(r.base_revision_id),resultRevisionId:r.result_revision_id?asRevisionId(r.result_revision_id):null,operations:json(r.operations_json),diff:r.diff_json?json(r.diff_json):null,riskLevel:r.risk_level,state:r.state,createdBy:asPrincipalId(r.created_by),agentRunId:r.agent_run_id as ChangeSet["agentRunId"],createdAt:r.created_at};}
function mapAudit(r:AuditRow):AuditEvent{return{id:r.id as AuditEvent["id"],workspaceId:r.workspace_id as WorkspaceId,siteId:r.site_id?asSiteId(r.site_id):null,occurredAt:r.occurred_at,actorPrincipalId:asPrincipalId(r.actor_principal_id),actorType:r.actor_type,onBehalfOfPrincipalId:r.on_behalf_of_principal_id?asPrincipalId(r.on_behalf_of_principal_id):null,delegationId:r.delegation_id as AuditEvent["delegationId"],action:r.action,resourceType:r.resource_type,resourceId:r.resource_id,revisionId:r.revision_id?asRevisionId(r.revision_id):null,capability:r.capability,result:r.result,reason:r.reason,requestId:r.request_id,details:json(r.details_json)};}
function mapOutbox(r:OutboxRow):OutboxEvent{return{id:r.id as OutboxEvent["id"],eventType:r.event_type,aggregateType:r.aggregate_type,aggregateId:r.aggregate_id,payload:json(r.payload_json),state:r.state,attempts:r.attempts,availableAt:r.available_at,createdAt:r.created_at};}

export class D1BlogStore implements BlogStore {
  readonly #db: D1DatabaseLike;
  constructor(db: D1DatabaseLike) { this.#db = db; }

  async createCollection(collection: BlogCollection): Promise<void> {
    await this.#db.prepare("INSERT INTO blog_collections(id,workspace_id,site_id,content_item_id,page_size,feed_size,sort_direction,state,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?,?,?)")
      .bind(collection.id, collection.workspaceId, collection.siteId, collection.contentItemId, collection.pageSize, collection.feedSize, collection.sortDirection, collection.state, collection.createdAt, collection.updatedAt).run();
  }
  async getCollection(id: CollectionId): Promise<BlogCollection | null> {
    const row = await this.#db.prepare("SELECT * FROM blog_collections WHERE id=?").bind(id).first<BlogCollectionRow>();
    return row ? mapBlogCollection(row) : null;
  }
  async getCollectionByContentItem(contentItemId: ContentItemId): Promise<BlogCollection | null> {
    const row = await this.#db.prepare("SELECT * FROM blog_collections WHERE content_item_id=?").bind(contentItemId).first<BlogCollectionRow>();
    return row ? mapBlogCollection(row) : null;
  }
  async listCollections(siteId: SiteId): Promise<BlogCollection[]> {
    const rows = await this.#db.prepare("SELECT * FROM blog_collections WHERE site_id=? ORDER BY created_at").bind(siteId).all<BlogCollectionRow>();
    return rows.results.map(mapBlogCollection);
  }
  async updateCollection(collection: BlogCollection): Promise<void> {
    await this.#db.prepare("UPDATE blog_collections SET page_size=?,feed_size=?,sort_direction=?,state=?,updated_at=? WHERE id=?")
      .bind(collection.pageSize, collection.feedSize, collection.sortDirection, collection.state, collection.updatedAt, collection.id).run();
  }

  async addArticle(record: BlogArticleRecord): Promise<void> {
    await this.#db.prepare("INSERT INTO blog_articles(collection_id,content_item_id,posted_at,author_principal_id,created_at) VALUES(?,?,?,?,?)")
      .bind(record.collectionId, record.contentItemId, record.postedAt, record.authorPrincipalId, record.createdAt).run();
  }
  async getArticle(contentItemId: ContentItemId): Promise<BlogArticleRecord | null> {
    const row = await this.#db.prepare("SELECT * FROM blog_articles WHERE content_item_id=?").bind(contentItemId).first<BlogArticleRow>();
    return row ? mapBlogArticle(row) : null;
  }
  async listArticles(collectionId: CollectionId): Promise<BlogArticleRecord[]> {
    const rows = await this.#db.prepare("SELECT * FROM blog_articles WHERE collection_id=? ORDER BY posted_at DESC").bind(collectionId).all<BlogArticleRow>();
    return rows.results.map(mapBlogArticle);
  }
  async updateArticlePostedAt(contentItemId: ContentItemId, postedAt: number): Promise<BlogArticleRecord> {
    const existing = await this.getArticle(contentItemId);
    assertDomain(existing, "ARTICLE_NOT_FOUND", "Article is not registered in a blog", 404);
    await this.#db.prepare("UPDATE blog_articles SET posted_at=? WHERE content_item_id=?").bind(postedAt, contentItemId).run();
    return (await this.getArticle(contentItemId))!;
  }

  async createTaxonomy(taxonomy: Taxonomy): Promise<void> {
    await this.#db.prepare("INSERT INTO taxonomies(id,collection_id,taxonomy_key,title,kind,hierarchical,state,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?,?)")
      .bind(taxonomy.id, taxonomy.collectionId, taxonomy.key, taxonomy.title, taxonomy.kind, taxonomy.hierarchical ? 1 : 0, taxonomy.state, taxonomy.createdAt, taxonomy.updatedAt).run();
  }
  async getTaxonomy(id: TaxonomyId): Promise<Taxonomy | null> {
    const row = await this.#db.prepare("SELECT * FROM taxonomies WHERE id=?").bind(id).first<TaxonomyRow>();
    return row ? mapTaxonomy(row) : null;
  }
  async listTaxonomies(collectionId: CollectionId): Promise<Taxonomy[]> {
    const rows = await this.#db.prepare("SELECT * FROM taxonomies WHERE collection_id=? ORDER BY kind,taxonomy_key").bind(collectionId).all<TaxonomyRow>();
    return rows.results.map(mapTaxonomy);
  }

  async createTerm(term: Term): Promise<void> {
    await this.#db.prepare("INSERT INTO taxonomy_terms(id,taxonomy_id,parent_id,slug,title,state,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?)")
      .bind(term.id, term.taxonomyId, term.parentId, term.slug, term.title, term.state, term.createdAt, term.updatedAt).run();
  }
  async getTerm(id: TermId): Promise<Term | null> {
    const row = await this.#db.prepare("SELECT * FROM taxonomy_terms WHERE id=?").bind(id).first<TermRow>();
    return row ? mapTerm(row) : null;
  }
  async listTerms(taxonomyId: TaxonomyId): Promise<Term[]> {
    const rows = await this.#db.prepare("SELECT * FROM taxonomy_terms WHERE taxonomy_id=? ORDER BY title").bind(taxonomyId).all<TermRow>();
    return rows.results.map(mapTerm);
  }

  async setRevisionTaxonomyValue(value: RevisionTaxonomyValue): Promise<void> {
    await this.#db.prepare("INSERT INTO revision_taxonomy_values(revision_id,taxonomy_id,term_ids_json) VALUES(?,?,?) ON CONFLICT(revision_id,taxonomy_id) DO UPDATE SET term_ids_json=excluded.term_ids_json")
      .bind(value.revisionId, value.taxonomyId, JSON.stringify(value.termIds)).run();
  }
  async getRevisionTaxonomyValue(revisionId: RevisionId, taxonomyId: TaxonomyId): Promise<RevisionTaxonomyValue | null> {
    const row = await this.#db.prepare("SELECT * FROM revision_taxonomy_values WHERE revision_id=? AND taxonomy_id=?").bind(revisionId, taxonomyId).first<RevisionTaxonomyValueRow>();
    return row ? { revisionId: asRevisionId(row.revision_id), taxonomyId: asTaxonomyId(row.taxonomy_id), termIds: (JSON.parse(row.term_ids_json) as string[]).map(asTermId) } : null;
  }
}

export class D1AssetMetadataStore implements AssetMetadataStore {
  readonly #db: D1DatabaseLike;
  constructor(db: D1DatabaseLike) { this.#db = db; }

  async createPendingAsset(asset: Asset, session: UploadSession): Promise<void> {
    await this.#db.batch([
      this.#db.prepare("INSERT INTO assets(id,workspace_id,object_key,original_filename,media_type,byte_size,checksum,width,height,state,owner_principal_id,created_at,updated_at,deleted_at) VALUES(?,?,?,?,?,NULL,NULL,NULL,NULL,?,?,?,?,NULL)")
        .bind(asset.id, asset.workspaceId, asset.objectKey, asset.originalFilename, asset.mediaType, asset.state, asset.ownerPrincipalId, asset.createdAt, asset.updatedAt),
      this.#db.prepare("INSERT INTO upload_sessions(id,asset_id,workspace_id,object_key,media_type,maximum_bytes,state,created_by,created_at,expires_at,completed_at,failure_reason) VALUES(?,?,?,?,?,?,?,?,?,?,NULL,NULL)")
        .bind(session.id, session.assetId, session.workspaceId, session.objectKey, session.mediaType, session.maximumBytes, session.state, session.createdBy, session.createdAt, session.expiresAt),
    ]);
  }
  async getAsset(id: AssetId): Promise<Asset | null> {
    const row = await this.#db.prepare("SELECT * FROM assets WHERE id=?").bind(id).first<AssetRow>();
    return row ? mapAsset(row) : null;
  }
  async getUploadSession(id: UploadSessionId): Promise<UploadSession | null> {
    const row = await this.#db.prepare("SELECT * FROM upload_sessions WHERE id=?").bind(id).first<UploadSessionRow>();
    return row ? mapUploadSession(row) : null;
  }
  async completeUpload(input: { sessionId: UploadSessionId; byteSize: number; checksum: string; now: number }): Promise<Asset> {
    const session = await this.getUploadSession(input.sessionId);
    assertDomain(session, "UPLOAD_SESSION_NOT_FOUND", "Upload session not found", 404);
    assertDomain(session.state === "pending", "UPLOAD_SESSION_CLOSED", "Upload session is not pending", 409);
    await this.#db.batch([
      this.#db.prepare("UPDATE upload_sessions SET state='completed',completed_at=?,failure_reason=NULL WHERE id=? AND state='pending'").bind(input.now, input.sessionId),
      this.#db.prepare("UPDATE assets SET state='ready',byte_size=?,checksum=?,updated_at=? WHERE id=? AND state='pending'").bind(input.byteSize, input.checksum, input.now, session.assetId),
    ]);
    const asset = await this.getAsset(session.assetId);
    assertDomain(asset, "ASSET_NOT_FOUND", "Asset not found after upload", 500);
    return asset;
  }
  async failUpload(input: { sessionId: UploadSessionId; reason: string; now: number }): Promise<void> {
    const session = await this.getUploadSession(input.sessionId);
    if (!session || session.state !== "pending") return;
    await this.#db.batch([
      this.#db.prepare("UPDATE upload_sessions SET state='failed',completed_at=?,failure_reason=? WHERE id=? AND state='pending'").bind(input.now, input.reason, input.sessionId),
      this.#db.prepare("UPDATE assets SET state='quarantined',updated_at=? WHERE id=? AND state='pending'").bind(input.now, session.assetId),
    ]);
  }
  async listAssets(workspaceId: WorkspaceId): Promise<Asset[]> {
    const rows = await this.#db.prepare("SELECT * FROM assets WHERE workspace_id=? AND deleted_at IS NULL ORDER BY created_at DESC").bind(workspaceId).all<AssetRow>();
    return rows.results.map(mapAsset);
  }
  async softDeleteAsset(input: { assetId: AssetId; now: number }): Promise<Asset> {
    await this.#db.prepare("UPDATE assets SET state='deleted',deleted_at=?,updated_at=? WHERE id=? AND deleted_at IS NULL").bind(input.now, input.now, input.assetId).run();
    const asset = await this.getAsset(input.assetId);
    assertDomain(asset, "ASSET_NOT_FOUND", "Asset not found", 404);
    return asset;
  }
  async countActiveAssets(workspaceId: WorkspaceId, now: number): Promise<number> {
    const row = await this.#db.prepare(
      `SELECT COUNT(*) AS count FROM assets a
       WHERE a.workspace_id = ?
         AND a.deleted_at IS NULL
         AND (
           a.state = 'ready'
           OR (
             a.state = 'pending'
             AND EXISTS (
               SELECT 1 FROM upload_sessions s
               WHERE s.asset_id = a.id AND s.state = 'pending' AND s.expires_at > ?
             )
           )
         )`,
    ).bind(workspaceId, now).first<{ count: number }>();
    return row?.count ?? 0;
  }
  async expireStalePendingUploads(workspaceId: WorkspaceId, now: number): Promise<void> {
    const stale = await this.#db.prepare(
      `SELECT id, asset_id FROM upload_sessions
       WHERE workspace_id = ? AND state = 'pending' AND expires_at <= ?`,
    ).bind(workspaceId, now).all<{ id: string; asset_id: string }>();
    if (!stale.results.length) return;
    const statements = [];
    for (const session of stale.results) {
      statements.push(
        this.#db.prepare(
          "UPDATE upload_sessions SET state='expired', completed_at=?, failure_reason='expired' WHERE id=? AND state='pending'",
        ).bind(now, session.id),
      );
      statements.push(
        this.#db.prepare(
          "UPDATE assets SET state='quarantined', updated_at=? WHERE id=? AND state='pending'",
        ).bind(now, session.asset_id),
      );
    }
    await this.#db.batch(statements);
  }
}

export class D1PreviewStore implements PreviewStore {
  readonly #db: D1DatabaseLike;
  constructor(db: D1DatabaseLike) { this.#db = db; }
  async create(session: PreviewSession): Promise<void> {
    await this.#db.prepare("INSERT INTO preview_sessions(id,workspace_id,site_id,content_item_id,revision_id,revision_hash,theme_release,token_version,created_by,created_at,expires_at,revoked_at,last_accessed_at) VALUES(?,?,?,?,?,?,?,?,?,?,?,NULL,NULL)")
      .bind(session.id, session.workspaceId, session.siteId, session.contentItemId, session.revisionId, session.revisionHash, session.themeRelease, session.tokenVersion, session.createdBy, session.createdAt, session.expiresAt).run();
  }
  async get(id: PreviewSessionId): Promise<PreviewSession | null> {
    const row = await this.#db.prepare("SELECT * FROM preview_sessions WHERE id=?").bind(id).first<PreviewRow>();
    return row ? mapPreview(row) : null;
  }
  async revoke(id: PreviewSessionId, now: number): Promise<PreviewSession> {
    await this.#db.prepare("UPDATE preview_sessions SET revoked_at=? WHERE id=? AND revoked_at IS NULL").bind(now, id).run();
    const session = await this.get(id);
    assertDomain(session, "PREVIEW_NOT_FOUND", "Preview session not found", 404);
    return session;
  }
  async touch(id: PreviewSessionId, now: number): Promise<void> { await this.#db.prepare("UPDATE preview_sessions SET last_accessed_at=? WHERE id=?").bind(now, id).run(); }
  async listActiveSessionsForSite(siteId: SiteId, now: number): Promise<PreviewSession[]> {
    const rows = await this.#db.prepare(
      "SELECT * FROM preview_sessions WHERE site_id=? AND revoked_at IS NULL AND expires_at > ?",
    ).bind(siteId, now).all<PreviewRow>();
    return rows.results.map(mapPreview);
  }
}

export interface R2ObjectLike {
  key: string;
  size: number;
  etag: string;
  httpEtag?: string;
  uploaded: Date;
  body?: ReadableStream<Uint8Array>;
  httpMetadata?: { contentType?: string };
}
export interface R2BucketLike {
  put(key: string, body: AssetObjectBody, options?: { httpMetadata?: { contentType?: string }; customMetadata?: Record<string, string> }): Promise<R2ObjectLike | null>;
  head(key: string): Promise<R2ObjectLike | null>;
  get(key: string): Promise<R2ObjectLike | null>;
  delete(key: string): Promise<void>;
}

export class R2AssetObjectStore implements AssetObjectStore {
  readonly #bucket: R2BucketLike;
  constructor(bucket: R2BucketLike) { this.#bucket = bucket; }
  async put(key: string, body: AssetObjectBody, options: { mediaType: string; customMetadata?: Record<string, string> }): Promise<AssetObjectMetadata> {
    const putOptions: { httpMetadata: { contentType: string }; customMetadata?: Record<string, string> } = {
      httpMetadata: { contentType: options.mediaType },
    };
    if (options.customMetadata) putOptions.customMetadata = options.customMetadata;
    const object = await this.#bucket.put(key, body, putOptions);
    assertDomain(object, "R2_PUT_FAILED", "R2 rejected the object write", 502);
    return mapR2Metadata(object);
  }
  async head(key: string): Promise<AssetObjectMetadata | null> { const object = await this.#bucket.head(key); return object ? mapR2Metadata(object) : null; }
  async get(key: string): Promise<AssetObject | null> {
    const object = await this.#bucket.get(key);
    if (!object) return null;
    return { ...mapR2Metadata(object), body: object.body ?? null, ...(object.httpEtag ? { httpEtag: object.httpEtag } : {}) };
  }
  async delete(key: string): Promise<void> { await this.#bucket.delete(key); }
}

function mapR2Metadata(object: R2ObjectLike): AssetObjectMetadata {
  const result: AssetObjectMetadata = { key: object.key, size: object.size, etag: object.etag, uploadedAt: object.uploaded.getTime() };
  if (object.httpMetadata?.contentType) result.mediaType = object.httpMetadata.contentType;
  return result;
}

type AssetRow = {id:string;workspace_id:string;object_key:string;original_filename:string;media_type:string;byte_size:number|null;checksum:string|null;width:number|null;height:number|null;state:Asset["state"];owner_principal_id:string;created_at:number;updated_at:number;deleted_at:number|null};
type UploadSessionRow = {id:string;asset_id:string;workspace_id:string;object_key:string;media_type:string;maximum_bytes:number;state:UploadSession["state"];created_by:string;created_at:number;expires_at:number;completed_at:number|null;failure_reason:string|null};
type PublishedAssetReferenceRow={revision_id:string;asset_id:string;block_id:string|null;field_path:string;usage:"image"|"gallery"|"download";content_item_id:string;site_id:string;cached_path:string};
type PreviewRow = {id:string;workspace_id:string;site_id:string;content_item_id:string;revision_id:string;revision_hash:string;theme_release:string;token_version:number;created_by:string;created_at:number;expires_at:number;revoked_at:number|null;last_accessed_at:number|null};
function mapAsset(r:AssetRow):Asset{return{id:asAssetId(r.id),workspaceId:r.workspace_id as WorkspaceId,objectKey:r.object_key,originalFilename:r.original_filename,mediaType:r.media_type,byteSize:r.byte_size,checksum:r.checksum,width:r.width,height:r.height,state:r.state,ownerPrincipalId:asPrincipalId(r.owner_principal_id),createdAt:r.created_at,updatedAt:r.updated_at,deletedAt:r.deleted_at};}
function mapUploadSession(r:UploadSessionRow):UploadSession{return{id:asUploadSessionId(r.id),assetId:asAssetId(r.asset_id),workspaceId:r.workspace_id as WorkspaceId,objectKey:r.object_key,mediaType:r.media_type,maximumBytes:r.maximum_bytes,state:r.state,createdBy:asPrincipalId(r.created_by),createdAt:r.created_at,expiresAt:r.expires_at,completedAt:r.completed_at,failureReason:r.failure_reason};}
function mapPreview(r:PreviewRow):PreviewSession{return{id:asPreviewSessionId(r.id),workspaceId:r.workspace_id as WorkspaceId,siteId:asSiteId(r.site_id),contentItemId:asContentItemId(r.content_item_id),revisionId:asRevisionId(r.revision_id),revisionHash:r.revision_hash,themeRelease:r.theme_release,tokenVersion:r.token_version,createdBy:asPrincipalId(r.created_by),createdAt:r.created_at,expiresAt:r.expires_at,revokedAt:r.revoked_at,lastAccessedAt:r.last_accessed_at};}


interface BlogCollectionRow { id:string; workspace_id:string; site_id:string; content_item_id:string; page_size:number; feed_size:number; sort_direction:"asc"|"desc"; state:"active"|"disabled"; created_at:number; updated_at:number; }
interface BlogArticleRow { collection_id:string; content_item_id:string; posted_at:number; author_principal_id:string; created_at:number; }
interface TaxonomyRow { id:string; collection_id:string; taxonomy_key:string; title:string; kind:"category"|"tag"; hierarchical:number; state:"active"|"disabled"; created_at:number; updated_at:number; }
interface TermRow { id:string; taxonomy_id:string; parent_id:string|null; slug:string; title:string; state:"active"|"disabled"; created_at:number; updated_at:number; }
interface RevisionTaxonomyValueRow { revision_id:string; taxonomy_id:string; term_ids_json:string; }
function mapBlogCollection(row: BlogCollectionRow): BlogCollection { return { id:asCollectionId(row.id), workspaceId:row.workspace_id as WorkspaceId, siteId:asSiteId(row.site_id), contentItemId:asContentItemId(row.content_item_id), pageSize:row.page_size, feedSize:row.feed_size, sortDirection:row.sort_direction, state:row.state, createdAt:row.created_at, updatedAt:row.updated_at }; }
function mapBlogArticle(row: BlogArticleRow): BlogArticleRecord { return { collectionId:asCollectionId(row.collection_id), contentItemId:asContentItemId(row.content_item_id), postedAt:row.posted_at, authorPrincipalId:asPrincipalId(row.author_principal_id), createdAt:row.created_at }; }
function mapTaxonomy(row: TaxonomyRow): Taxonomy { return { id:asTaxonomyId(row.id), collectionId:asCollectionId(row.collection_id), key:row.taxonomy_key, title:row.title, kind:row.kind, hierarchical:Boolean(row.hierarchical), state:row.state, createdAt:row.created_at, updatedAt:row.updated_at }; }
function mapTerm(row: TermRow): Term { return { id:asTermId(row.id), taxonomyId:asTaxonomyId(row.taxonomy_id), parentId:row.parent_id ? asTermId(row.parent_id) : null, slug:row.slug, title:row.title, state:row.state, createdAt:row.created_at, updatedAt:row.updated_at }; }

export * from "./custom-content.js";

export * from "./mail-form.js";

export * from "./theme.js";

export * from "./plugin.js";
export * from "./auth.js";
export * from "./cf-oauth-challenges.js";

export { D1AssetObjectStore, isD1InlineAssetStorageEnabled } from "./d1-asset-object-store.js";

export type AssetBindingEnv = {
  DB?: D1DatabaseLike;
  R2?: R2BucketLike;
  BASER_ASSET_STORAGE?: string;
};

export function resolveAssetBindings(env: AssetBindingEnv): {
  metadata: D1AssetMetadataStore | MemoryAssetMetadataStore;
  objects: AssetObjectStore;
  trialInline: TrialInlineMediaPolicy | undefined;
} {
  const metadata = env.DB ? new D1AssetMetadataStore(env.DB) : memoryMetadataSingleton;
  if (env.R2) {
    return { metadata, objects: new R2AssetObjectStore(env.R2), trialInline: undefined };
  }
  if (isD1InlineAssetStorageEnabled(env) && env.DB) {
    return {
      metadata,
      objects: new D1AssetObjectStore(env.DB, TRIAL_INLINE_MEDIA_POLICY),
      trialInline: TRIAL_INLINE_MEDIA_POLICY,
    };
  }
  return { metadata, objects: memoryObjectsSingleton, trialInline: undefined };
}
