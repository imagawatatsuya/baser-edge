const systemClock = {
  now: () => Date.now()
};
const PREFIXES = {
  workspace: "ws",
  site: "site",
  principal: "prn",
  content: "cnt",
  revision: "rev",
  node: "node",
  route: "route",
  redirect: "redir",
  approval: "apr",
  agentRun: "arun",
  changeSet: "chg",
  audit: "aud",
  outbox: "out",
  delegation: "del",
  grant: "grant",
  asset: "ast",
  upload: "upl",
  preview: "prv",
  collection: "col",
  taxonomy: "tax",
  term: "term",
  customField: "cfield",
  customTable: "ctbl",
  customContent: "cc",
  customEntry: "centry",
  customEntryRevision: "cerev",
  customEntryApproval: "ceapr",
  mailForm: "mform",
  mailConfirmation: "mconf",
  mailSubmission: "msub",
  mailNotification: "mnote",
  theme: "theme",
  themeRelease: "threl",
  designTokenRevision: "dtok",
  layoutRevision: "layout",
  themeActivation: "thact",
  plugin: "plug",
  pluginRelease: "plrel",
  pluginActivation: "plact",
  pluginInvocation: "plinv",
  authIdentity: "authid",
  passkey: "pkey",
  authSession: "sess",
  webauthnChallenge: "wchal",
  sessionStepUp: "stup"
};
function newId(kind) {
  return `${PREFIXES[kind]}_${crypto.randomUUID()}`;
}
class DomainError extends Error {
  code;
  status;
  details;
  constructor(code, message, status = 400, details) {
    super(message);
    this.name = "DomainError";
    this.code = code;
    this.status = status;
    if (details)
      this.details = details;
  }
}
function assertDomain(condition, code, message, status = 400, details) {
  if (!condition)
    throw new DomainError(code, message, status, details);
}
function stableStringify(value) {
  return JSON.stringify(sortValue(value));
}
function sortValue(value) {
  if (Array.isArray(value))
    return value.map(sortValue);
  if (value && typeof value === "object") {
    return Object.fromEntries(Object.entries(value).sort(([a], [b]) => a.localeCompare(b)).map(([key2, child]) => [key2, sortValue(child)]));
  }
  return value;
}
async function sha256(value) {
  const data = new TextEncoder().encode(value);
  const digest2 = await crypto.subtle.digest("SHA-256", data);
  return [...new Uint8Array(digest2)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}
function asSiteId(value) {
  return value;
}
function asPrincipalId(value) {
  return value;
}
function asContentItemId(value) {
  return value;
}
function asRevisionId(value) {
  return value;
}
function asContentNodeId(value) {
  return value;
}
function asApprovalId(value) {
  return value;
}
function asAssetId(value) {
  return value;
}
function asUploadSessionId(value) {
  return value;
}
function asPreviewSessionId(value) {
  return value;
}
function asCollectionId(value) {
  return value;
}
function asTaxonomyId(value) {
  return value;
}
function asTermId(value) {
  return value;
}
function asCustomFieldId(value) {
  return value;
}
function asCustomTableId(value) {
  return value;
}
function asCustomContentId(value) {
  return value;
}
function asCustomEntryId(value) {
  return value;
}
function asCustomEntryRevisionId(value) {
  return value;
}
function asCustomEntryApprovalId(value) {
  return value;
}
function asMailFormId(value) {
  return value;
}
function asMailConfirmationId(value) {
  return value;
}
function asMailSubmissionId(value) {
  return value;
}
function asMailNotificationId(value) {
  return value;
}
function asThemeId(value) {
  return value;
}
function asThemeReleaseId(value) {
  return value;
}
function asDesignTokenRevisionId(value) {
  return value;
}
function asLayoutRevisionId(value) {
  return value;
}
function asThemeActivationId(value) {
  return value;
}
async function signCompactToken(payload, secret) {
  const encoded = base64UrlEncode(new TextEncoder().encode(stableStringify(payload)));
  const key2 = await crypto.subtle.importKey("raw", new TextEncoder().encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const signature = await crypto.subtle.sign("HMAC", key2, new TextEncoder().encode(encoded));
  return `${encoded}.${base64UrlEncode(new Uint8Array(signature))}`;
}
async function verifyCompactToken(token, secret) {
  const [encoded, signature] = token.split(".");
  if (!encoded || !signature || token.split(".").length !== 2)
    return null;
  try {
    if (!isCanonicalBase64Url(encoded) || !isCanonicalBase64Url(signature))
      return null;
    const key2 = await crypto.subtle.importKey("raw", new TextEncoder().encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["verify"]);
    const valid = await crypto.subtle.verify("HMAC", key2, base64UrlDecode(signature), new TextEncoder().encode(encoded));
    if (!valid)
      return null;
    const parsed = JSON.parse(new TextDecoder().decode(base64UrlDecode(encoded)));
    return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : null;
  } catch {
    return null;
  }
}
function base64UrlEncode(value) {
  let binary = "";
  for (const byte of value)
    binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}
function base64UrlDecode(value) {
  if (!/^[A-Za-z0-9_-]*$/.test(value) || value.length % 4 === 1)
    throw new Error("Invalid base64url value");
  const padded = value.replace(/-/g, "+").replace(/_/g, "/") + "=".repeat((4 - value.length % 4) % 4);
  const binary = atob(padded);
  return Uint8Array.from(binary, (character) => character.charCodeAt(0));
}
function isCanonicalBase64Url(value) {
  if (!value || !/^[A-Za-z0-9_-]+$/.test(value) || value.length % 4 === 1)
    return false;
  try {
    return base64UrlEncode(base64UrlDecode(value)) === value;
  } catch {
    return false;
  }
}
function normalizeSlug(input) {
  const normalized = input.normalize("NFC").trim().replace(/^\/+|\/+$/g, "").replace(/[\s\u3000]+/g, "-").replace(/-+/g, "-").replace(/^-+|-+$/g, "");
  assertDomain(normalized.length > 0, "EMPTY_SLUG", "Slug cannot be empty", 422);
  assertDomain(normalized.length <= 160, "SLUG_TOO_LONG", "Slug must be 160 characters or fewer", 422);
  assertDomain(![".", ".."].includes(normalized), "INVALID_SLUG", "Slug cannot be . or ..", 422);
  assertDomain(!/[?#\\]/u.test(normalized), "INVALID_SLUG", "Slug contains a reserved character", 422);
  const ascii = normalized.toLowerCase();
  assertDomain(/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(ascii), "INVALID_SLUG", "Slug must use ASCII letters, numbers, and hyphens only (e.g. news, my-post)", 422);
  return ascii;
}
function normalizePath(path) {
  const normalized = `/${path}`.replace(/\/{2,}/g, "/");
  if (normalized === "/")
    return "/";
  return normalized.endsWith("/") ? normalized.slice(0, -1) : normalized;
}
function childPath(parentPath, slug) {
  const safeSlug = normalizeSlug(slug);
  const parent = parentPath ? normalizePath(parentPath) : "/";
  return normalizePath(parent === "/" ? `/${safeSlug}` : `${parent}/${safeSlug}`);
}
function compareSortKeys(a, b) {
  return a.localeCompare(b, void 0, { numeric: true, sensitivity: "base" });
}
function buildSortKey(order, contentItemId) {
  return `${String(order).padStart(8, "0")}:${contentItemId}`;
}
class ComponentRegistry {
  #definitions = /* @__PURE__ */ new Map();
  register(definition2) {
    this.#definitions.set(key$1(definition2.type, definition2.version), definition2);
  }
  get(type, version) {
    return this.#definitions.get(key$1(type, version));
  }
  has(type, version) {
    return this.#definitions.has(key$1(type, version));
  }
  list() {
    return [...this.#definitions.values()];
  }
}
function key$1(type, version) {
  return `${type}@${version}`;
}
function validateDocument(document, registry) {
  const errors = [];
  const unknownComponents = [];
  const ids = /* @__PURE__ */ new Set();
  if (document.formatVersion !== 1)
    errors.push(`Unsupported document format: ${document.formatVersion}`);
  walk(document.root, void 0, void 0, (block, parent, slot) => {
    if (ids.has(block.id))
      errors.push(`Duplicate block id: ${block.id}`);
    ids.add(block.id);
    if (!block.id.trim())
      errors.push("Block id is empty");
    if (!Number.isInteger(block.componentVersion) || block.componentVersion < 1) {
      errors.push(`Invalid component version on ${block.id}`);
    }
    const definition2 = registry.get(block.type, block.componentVersion);
    if (!definition2) {
      unknownComponents.push({ id: block.id, type: block.type, version: block.componentVersion });
      return;
    }
    errors.push(...definition2.validateProps(block.props).map((message) => `${block.id}: ${message}`));
    if (parent && slot) {
      const parentDefinition = registry.get(parent.type, parent.componentVersion);
      const allowed = parentDefinition?.allowedSlots[slot];
      if (allowed && allowed !== "*" && !allowed.includes(block.type)) {
        errors.push(`${block.id}: component ${block.type} is not allowed in ${parent.type}.${slot}`);
      }
    }
  });
  return { valid: errors.length === 0, errors, unknownComponents };
}
function walk(block, parent, slot, callback) {
  callback(block, parent, slot);
  for (const [slotName, children] of Object.entries(block.slots)) {
    for (const child of children)
      walk(child, block, slotName, callback);
  }
}
function createEmptyDocument() {
  return {
    formatVersion: 1,
    root: {
      id: "root",
      type: "page",
      componentVersion: 1,
      props: {},
      slots: { body: [] }
    }
  };
}
function requireString(props, keyName) {
  return typeof props[keyName] === "string" ? [] : [`${keyName} must be a string`];
}
function optionalString(props, keyName) {
  const value = props[keyName];
  return value === void 0 || typeof value === "string" ? [] : [`${keyName} must be a string`];
}
function definition(type, title, validator, allowedSlots = {}) {
  return { type, version: 1, title, allowedSlots, validateProps: validator };
}
function createDefaultComponentRegistry() {
  const registry = new ComponentRegistry();
  registry.register(definition("page", "Page", () => [], { body: "*" }));
  registry.register(definition("heading", "Heading", (props) => {
    const errors = requireString(props, "text");
    const level = props.level;
    if (![1, 2, 3, 4, 5, 6].includes(level))
      errors.push("level must be between 1 and 6");
    return errors;
  }));
  registry.register(definition("richText", "Rich Text", (props) => Array.isArray(props.paragraphs) && props.paragraphs.every((v) => typeof v === "string") ? [] : ["paragraphs must be an array of strings"]));
  registry.register(definition("image", "Image", (props) => [...requireString(props, "assetId"), ...optionalString(props, "alt")]));
  registry.register(definition("imageText", "Image and Text", (props) => [...requireString(props, "assetId"), ...requireString(props, "text"), ...optionalString(props, "alt")]));
  registry.register(definition("gallery", "Gallery", (props) => Array.isArray(props.assetIds) && props.assetIds.every((v) => typeof v === "string") ? [] : ["assetIds must be an array of strings"]));
  registry.register(definition("callToAction", "Call to Action", (props) => [...requireString(props, "label"), ...requireString(props, "targetContentId")]));
  registry.register(definition("table", "Table", (props) => Array.isArray(props.rows) ? [] : ["rows must be an array"]));
  registry.register(definition("fileDownload", "File Download", (props) => [...requireString(props, "assetId"), ...requireString(props, "label")]));
  registry.register(definition("safeEmbed", "Safe Embed", (props) => [...requireString(props, "provider"), ...requireString(props, "url")]));
  registry.register(definition("divider", "Divider", () => []));
  return registry;
}
function collectAssetReferences(document) {
  const references = [];
  walk(document.root, void 0, void 0, (block) => {
    if (block.type === "image" || block.type === "imageText") {
      const assetId = block.props.assetId;
      if (typeof assetId === "string" && assetId.length > 0)
        references.push({ assetId, blockId: block.id, fieldPath: "props.assetId", usage: "image" });
    } else if (block.type === "gallery") {
      const assetIds = block.props.assetIds;
      if (Array.isArray(assetIds))
        assetIds.forEach((assetId, index2) => {
          if (typeof assetId === "string" && assetId.length > 0)
            references.push({ assetId, blockId: block.id, fieldPath: `props.assetIds[${index2}]`, usage: "gallery" });
        });
    } else if (block.type === "fileDownload") {
      const assetId = block.props.assetId;
      if (typeof assetId === "string" && assetId.length > 0)
        references.push({ assetId, blockId: block.id, fieldPath: "props.assetId", usage: "download" });
    }
  });
  return references;
}
class MemoryCmsStore {
  workspaces = /* @__PURE__ */ new Map();
  sites = /* @__PURE__ */ new Map();
  principals = /* @__PURE__ */ new Map();
  grants = /* @__PURE__ */ new Map();
  delegations = /* @__PURE__ */ new Map();
  items = /* @__PURE__ */ new Map();
  revisions = /* @__PURE__ */ new Map();
  revisionAssetReferences = [];
  nodes = /* @__PURE__ */ new Map();
  routes = /* @__PURE__ */ new Map();
  redirects = /* @__PURE__ */ new Map();
  aliases = /* @__PURE__ */ new Map();
  trashEntries = /* @__PURE__ */ new Map();
  approvals = /* @__PURE__ */ new Map();
  agentRuns = /* @__PURE__ */ new Map();
  changeSets = /* @__PURE__ */ new Map();
  publicationEvents = /* @__PURE__ */ new Map();
  audits = /* @__PURE__ */ new Map();
  outbox = /* @__PURE__ */ new Map();
  async bootstrap(input) {
    if (this.workspaces.has(input.workspace.id))
      throw new DomainError("WORKSPACE_EXISTS", "Workspace already exists", 409);
    this.workspaces.set(input.workspace.id, structuredClone(input.workspace));
    this.principals.set(input.owner.id, structuredClone(input.owner));
    this.sites.set(input.site.id, structuredClone(input.site));
    this.grants.set(input.ownerGrant.id, structuredClone(input.ownerGrant));
  }
  async createPrincipal(principal) {
    if (this.principals.has(principal.id))
      throw new DomainError("PRINCIPAL_EXISTS", "Principal already exists", 409);
    this.principals.set(principal.id, structuredClone(principal));
  }
  async getPrincipal(id) {
    return clone$5(this.principals.get(id) ?? null);
  }
  async createCapabilityGrant(grant) {
    this.grants.set(grant.id, structuredClone(grant));
  }
  async createDelegationGrant(grant) {
    this.delegations.set(grant.id, structuredClone(grant));
  }
  async listCapabilityGrants(principalId) {
    return [...this.grants.values()].filter((grant) => grant.principalId === principalId).map((grant) => structuredClone(grant));
  }
  async getDelegationGrant(id) {
    return clone$5(this.delegations.get(id) ?? null);
  }
  async createPage(input) {
    return this.createRoutableContent(input, "page", "canonical");
  }
  async createFolder(input) {
    return this.createRoutableContent(input, "folder", "canonical");
  }
  async createBlog(input) {
    return this.createRoutableContent(input, "blog", "canonical");
  }
  async createCustomContent(input) {
    return this.createRoutableContent(input, "custom-content", "canonical");
  }
  async createMailForm(input) {
    return this.createRoutableContent(input, "mail-form", "canonical");
  }
  async createArticle(input) {
    return this.createRoutableContent(input, "article", "canonical");
  }
  async createAlias(input) {
    const target = requireValue$1(this.items.get(input.targetContentItemId), "ALIAS_TARGET_NOT_FOUND", "Alias target not found");
    if (target.state !== "active")
      throw new DomainError("ALIAS_TARGET_INACTIVE", "Alias target is not active", 409);
    if (target.siteId !== input.siteId)
      throw new DomainError("CROSS_SITE_ALIAS", "Alias target belongs to another site", 422);
    if (target.contentTypeKey === "folder" || target.contentTypeKey === "alias") {
      throw new DomainError("INVALID_ALIAS_TARGET", "Aliases can target publishable content only", 422);
    }
    const snapshot = await this.createRoutableContent(input, "alias", "alias");
    this.aliases.set(snapshot.item.id, {
      aliasContentItemId: snapshot.item.id,
      targetContentItemId: target.id,
      createdAt: input.now
    });
    return snapshot;
  }
  async getNode(id) {
    return clone$5(this.nodes.get(id) ?? null);
  }
  async getContentSnapshot(contentItemId) {
    if (!this.items.has(contentItemId))
      return null;
    return this.snapshot(contentItemId);
  }
  async getRevision(revisionId) {
    return clone$5(this.revisions.get(revisionId) ?? null);
  }
  async commitRevision(input) {
    const item = requireValue$1(this.items.get(input.contentItemId), "CONTENT_NOT_FOUND", "Content not found");
    if (item.state !== "active")
      throw new DomainError("CONTENT_TRASHED", "Trashed content cannot be revised", 409);
    if (item.contentTypeKey === "folder" || item.contentTypeKey === "alias") {
      throw new DomainError("CONTENT_NOT_EDITABLE", "This content type does not accept document revisions", 422);
    }
    if (item.workingRevisionId !== input.baseRevisionId || item.lockVersion !== input.expectedLockVersion) {
      throw new DomainError("REVISION_CONFLICT", "The content changed after the requested base revision", 409, {
        currentRevisionId: item.workingRevisionId,
        currentLockVersion: item.lockVersion
      });
    }
    const previous = requireValue$1(this.revisions.get(input.baseRevisionId), "REVISION_NOT_FOUND", "Base revision not found");
    const revisionId = asRevisionId(newId("revision"));
    const revision = {
      id: revisionId,
      contentItemId: item.id,
      revisionNumber: previous.revisionNumber + 1,
      basedOnRevisionId: input.baseRevisionId,
      fields: structuredClone(input.fields),
      document: structuredClone(input.document),
      contentHash: input.contentHash,
      createdBy: input.actor.actorId,
      agentRunId: input.agentRunId,
      changeSummary: input.changeSummary,
      createdAt: input.now
    };
    this.revisions.set(revision.id, revision);
    this.recordAssetReferences(revision.id, revision.document);
    item.workingRevisionId = revision.id;
    item.lockVersion += 1;
    item.updatedAt = input.now;
    this.recordSuccess(input.actor, item.workspaceId, item.siteId, "content.revise", "content-item", item.id, revision.id, input.now, {
      basedOnRevisionId: input.baseRevisionId
    });
    return structuredClone(revision);
  }
  async relocateContent(input) {
    const item = requireValue$1(this.items.get(input.contentItemId), "CONTENT_NOT_FOUND", "Content not found");
    if (item.state !== "active")
      throw new DomainError("CONTENT_TRASHED", "Trashed content cannot be moved", 409);
    const node = this.nodeForContent(item.id);
    if (node.treeVersion !== input.expectedTreeVersion)
      throw new DomainError("TREE_CONFLICT", "Content tree changed", 409);
    const parent = input.targetParentId ? this.requireParentForType(input.targetParentId, item.siteId, item.contentTypeKey) : null;
    if (parent && (parent.id === node.id || parent.cachedPath.startsWith(`${node.cachedPath}/`))) {
      throw new DomainError("TREE_CYCLE", "Content cannot be moved below itself", 422);
    }
    const newPath = childPath(parent?.cachedPath ?? null, input.newSlug);
    const site = requireValue$1(this.sites.get(item.siteId), "SITE_NOT_FOUND", "Site not found");
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
      const affectedItem = requireValue$1(this.items.get(affectedNode.contentItemId), "CONTENT_NOT_FOUND", "Content not found");
      this.retireRedirectAt(item.siteId, site.hostname, affectedNode.cachedPath);
      const replacement = {
        ...route,
        id: newId("route"),
        path: affectedNode.cachedPath,
        routeType: affectedItem.contentTypeKey === "alias" ? "alias" : "canonical",
        active: true,
        activatedAt: input.now,
        deactivatedAt: null
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
        createdAt: input.now
      });
    }
    this.recordSuccess(input.actor, item.workspaceId, item.siteId, "content.move", "content-item", item.id, item.workingRevisionId, input.now, {
      oldPath: oldRoot,
      newPath,
      affectedCount: affected.length
    });
    return this.snapshot(item.id);
  }
  async reorderContent(input) {
    const item = requireValue$1(this.items.get(input.contentItemId), "CONTENT_NOT_FOUND", "Content not found");
    if (item.state !== "active")
      throw new DomainError("CONTENT_TRASHED", "Trashed content cannot be reordered", 409);
    let node = this.nodeForContent(item.id);
    if (node.treeVersion !== input.expectedTreeVersion)
      throw new DomainError("TREE_CONFLICT", "Content tree changed", 409);
    if (node.parentId !== input.targetParentId) {
      await this.relocateContent({
        actor: input.actor,
        contentItemId: input.contentItemId,
        targetParentId: input.targetParentId,
        newSlug: node.slug,
        expectedTreeVersion: node.treeVersion,
        now: input.now
      });
      node = this.nodeForContent(item.id);
    }
    const siblings = [...this.nodes.values()].filter((candidate) => candidate.siteId === item.siteId && candidate.parentId === input.targetParentId && candidate.contentItemId !== item.id).sort((a, b) => compareSortKeys(a.sortKey, b.sortKey));
    if (input.insertAfterContentItemId) {
      const anchor = siblings.find((sibling) => sibling.contentItemId === input.insertAfterContentItemId);
      if (!anchor)
        throw new DomainError("INSERT_AFTER_NOT_FOUND", "insertAfterContentItemId is not a sibling under the target parent", 422);
    }
    const ordered = [];
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
      if (!placed)
        throw new DomainError("INSERT_AFTER_NOT_FOUND", "insertAfterContentItemId is not a sibling under the target parent", 422);
    }
    for (const [index2, sibling] of ordered.entries()) {
      sibling.sortKey = buildSortKey(index2 + 1, sibling.contentItemId);
      sibling.updatedAt = input.now;
      if (sibling.id === node.id)
        sibling.treeVersion += 1;
    }
    this.recordSuccess(input.actor, item.workspaceId, item.siteId, "content.reorder", "content-item", item.id, item.workingRevisionId, input.now, {
      targetParentId: input.targetParentId,
      insertAfterContentItemId: input.insertAfterContentItemId
    });
    return this.snapshot(item.id);
  }
  async copyContent(input) {
    const sourceItem = requireValue$1(this.items.get(input.contentItemId), "CONTENT_NOT_FOUND", "Content not found");
    if (sourceItem.state !== "active")
      throw new DomainError("CONTENT_TRASHED", "Trashed content cannot be copied", 409);
    const sourceNode = this.nodeForContent(sourceItem.id);
    if (sourceNode.treeVersion !== input.expectedTreeVersion)
      throw new DomainError("TREE_CONFLICT", "Content tree changed", 409);
    const parent = input.targetParentId ? this.requireParentForType(input.targetParentId, sourceItem.siteId, sourceItem.contentTypeKey) : null;
    const site = requireValue$1(this.sites.get(sourceItem.siteId), "SITE_NOT_FOUND", "Site not found");
    const newRootPath = childPath(parent?.cachedPath ?? null, input.newSlug);
    this.assertRouteAvailable(sourceItem.siteId, site.hostname, newRootPath);
    const sourceNodes = input.includeDescendants ? this.subtree(sourceNode) : [sourceNode];
    const nodeMap = /* @__PURE__ */ new Map();
    const itemMap = /* @__PURE__ */ new Map();
    const copiedIds = [];
    for (const oldNode of sourceNodes) {
      const oldItem = requireValue$1(this.items.get(oldNode.contentItemId), "CONTENT_NOT_FOUND", "Content not found");
      const newItemId = asContentItemId(newId("content"));
      const newNodeId = asContentNodeId(newId("node"));
      itemMap.set(oldItem.id, newItemId);
      nodeMap.set(oldNode.id, newNodeId);
      copiedIds.push(newItemId);
      const suffix = oldNode.cachedPath.slice(sourceNode.cachedPath.length);
      const newPath = normalizePath(`${newRootPath}${suffix}`);
      this.assertRouteAvailable(sourceItem.siteId, site.hostname, newPath);
      const oldRevision = oldItem.workingRevisionId ? requireValue$1(this.revisions.get(oldItem.workingRevisionId), "REVISION_NOT_FOUND", "Working revision not found") : null;
      const newRevisionId = oldRevision ? asRevisionId(newId("revision")) : null;
      const newItem = {
        ...structuredClone(oldItem),
        id: newItemId,
        workingRevisionId: newRevisionId,
        publishedRevisionId: null,
        lockVersion: oldRevision ? 1 : 0,
        state: "active",
        createdBy: input.actor.actorId,
        createdAt: input.now,
        updatedAt: input.now
      };
      this.items.set(newItem.id, newItem);
      if (oldRevision && newRevisionId) {
        const copiedRevision = {
          ...structuredClone(oldRevision),
          id: newRevisionId,
          contentItemId: newItemId,
          revisionNumber: 1,
          basedOnRevisionId: null,
          createdBy: input.actor.actorId,
          agentRunId: null,
          changeSummary: `Copied from ${oldItem.id}`,
          createdAt: input.now
        };
        this.revisions.set(newRevisionId, copiedRevision);
        this.recordAssetReferences(newRevisionId, copiedRevision.document);
      }
      const parentId = oldNode.id === sourceNode.id ? input.targetParentId : nodeMap.get(oldNode.parentId) ?? null;
      const newNode = {
        ...structuredClone(oldNode),
        id: newNodeId,
        contentItemId: newItemId,
        parentId,
        slug: oldNode.id === sourceNode.id ? normalizeSlug(input.newSlug) : oldNode.slug,
        cachedPath: newPath,
        treeVersion: 1,
        sortKey: `${input.now}:${newItemId}`,
        createdAt: input.now,
        updatedAt: input.now
      };
      this.nodes.set(newNode.id, newNode);
      const routeId = newId("route");
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
        deactivatedAt: null
      });
      const oldAlias = this.aliases.get(oldItem.id);
      if (oldAlias) {
        this.aliases.set(newItemId, {
          aliasContentItemId: newItemId,
          targetContentItemId: itemMap.get(oldAlias.targetContentItemId) ?? oldAlias.targetContentItemId,
          createdAt: input.now
        });
      }
    }
    const rootId = requireValue$1(itemMap.get(sourceItem.id), "COPY_FAILED", "Copy root was not created");
    this.recordSuccess(input.actor, sourceItem.workspaceId, sourceItem.siteId, "content.copy", "content-item", sourceItem.id, sourceItem.workingRevisionId, input.now, {
      copiedRootId: rootId,
      copiedCount: copiedIds.length,
      includeDescendants: input.includeDescendants
    });
    return { root: this.snapshot(rootId), copiedContentIds: copiedIds };
  }
  async trashContent(input) {
    const rootItem = requireValue$1(this.items.get(input.contentItemId), "CONTENT_NOT_FOUND", "Content not found");
    if (rootItem.state === "trashed")
      throw new DomainError("ALREADY_TRASHED", "Content is already in trash", 409);
    const rootNode = this.nodeForContent(rootItem.id);
    if (rootNode.treeVersion !== input.expectedTreeVersion)
      throw new DomainError("TREE_CONFLICT", "Content tree changed", 409);
    const affected = this.subtree(rootNode);
    const hiddenRoot = `/_baser/trash/${rootItem.id}`;
    for (const node of affected) {
      const item = requireValue$1(this.items.get(node.contentItemId), "CONTENT_NOT_FOUND", "Content not found");
      const previousPath = node.cachedPath;
      this.trashEntries.set(item.id, {
        contentItemId: item.id,
        rootContentItemId: rootItem.id,
        previousParentId: node.parentId,
        previousSlug: node.slug,
        previousPath,
        trashedBy: input.actor.actorId,
        trashedAt: input.now
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
      const routeId = newId("route");
      this.routes.set(routeId, {
        id: routeId,
        siteId: item.siteId,
        contentItemId: item.id,
        hostname: requireValue$1(this.sites.get(item.siteId), "SITE_NOT_FOUND", "Site not found").hostname,
        path: node.cachedPath,
        routeType: item.contentTypeKey === "alias" ? "alias" : "canonical",
        isCanonical: true,
        active: true,
        activatedAt: input.now,
        deactivatedAt: null
      });
    }
    const affectedContentIds = affected.map((node) => node.contentItemId);
    this.addOutbox("content.trashed", rootItem.id, { siteId: rootItem.siteId, affectedContentIds }, input.now);
    this.recordSuccess(input.actor, rootItem.workspaceId, rootItem.siteId, "content.trash", "content-item", rootItem.id, rootItem.workingRevisionId, input.now, {
      affectedCount: affectedContentIds.length
    });
    return { rootContentItemId: rootItem.id, affectedContentIds };
  }
  async restoreContent(input) {
    const rootItem = requireValue$1(this.items.get(input.contentItemId), "CONTENT_NOT_FOUND", "Content not found");
    if (rootItem.state !== "trashed")
      throw new DomainError("CONTENT_NOT_TRASHED", "Content is not in trash", 409);
    const rootTrash = requireValue$1(this.trashEntries.get(rootItem.id), "TRASH_RECORD_NOT_FOUND", "Trash metadata not found");
    if (rootTrash.rootContentItemId !== rootItem.id)
      throw new DomainError("RESTORE_ROOT_REQUIRED", "Restore the root of the trashed subtree", 409);
    const rootNode = this.nodeForContent(rootItem.id);
    if (rootNode.treeVersion !== input.expectedTreeVersion)
      throw new DomainError("TREE_CONFLICT", "Content tree changed", 409);
    let parent = null;
    const requestedParentId = input.targetParentId ?? rootTrash.previousParentId;
    if (requestedParentId) {
      const candidate = this.nodes.get(requestedParentId);
      if (candidate && this.items.get(candidate.contentItemId)?.state === "active")
        parent = this.requireParentForType(requestedParentId, rootItem.siteId, rootItem.contentTypeKey);
      else if (input.targetParentId)
        throw new DomainError("PARENT_NOT_FOUND", "Restore parent not found", 404);
    }
    const restoredSlug = normalizeSlug(input.newSlug ?? rootTrash.previousSlug);
    const newRootPath = childPath(parent?.cachedPath ?? null, restoredSlug);
    const site = requireValue$1(this.sites.get(rootItem.siteId), "SITE_NOT_FOUND", "Site not found");
    const entries = [...this.trashEntries.values()].filter((entry) => entry.rootContentItemId === rootItem.id).sort((a, b) => a.previousPath.length - b.previousPath.length);
    for (const entry of entries) {
      const suffix = entry.previousPath.slice(rootTrash.previousPath.length);
      const newPath = normalizePath(`${newRootPath}${suffix}`);
      this.assertRouteAvailable(rootItem.siteId, site.hostname, newPath);
    }
    for (const entry of entries) {
      const item = requireValue$1(this.items.get(entry.contentItemId), "CONTENT_NOT_FOUND", "Content not found");
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
      const routeId = newId("route");
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
        deactivatedAt: null
      });
      this.trashEntries.delete(item.id);
    }
    this.addOutbox("content.restored", rootItem.id, { siteId: rootItem.siteId, restoredPath: newRootPath }, input.now);
    this.recordSuccess(input.actor, rootItem.workspaceId, rootItem.siteId, "content.restore", "content-item", rootItem.id, rootItem.workingRevisionId, input.now, {
      restoredPath: newRootPath,
      affectedCount: entries.length
    });
    return this.snapshot(rootItem.id);
  }
  async listContentTree(siteId) {
    return [...this.items.values()].filter((item) => item.siteId === siteId && item.state === "active").map((item) => this.managerEntry(item.id)).sort((a, b) => compareSortKeys(a.snapshot.node.sortKey, b.snapshot.node.sortKey) || a.snapshot.node.cachedPath.localeCompare(b.snapshot.node.cachedPath));
  }
  async listTrash(siteId) {
    return [...this.items.values()].filter((item) => item.siteId === siteId && item.state === "trashed").map((item) => this.managerEntry(item.id)).sort((a, b) => (a.trash?.previousPath ?? "").localeCompare(b.trash?.previousPath ?? ""));
  }
  async createApproval(input) {
    const item = requireValue$1(this.items.get(input.contentItemId), "CONTENT_NOT_FOUND", "Content not found");
    if (item.state !== "active")
      throw new DomainError("CONTENT_TRASHED", "Trashed content cannot be approved", 409);
    const approval = {
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
      decisionComment: null
    };
    this.approvals.set(approval.id, approval);
    this.recordSuccess(input.actor, item.workspaceId, item.siteId, "content.request-publish", "approval", approval.id, input.revisionId, input.now, {});
    return structuredClone(approval);
  }
  async getApproval(id) {
    return clone$5(this.approvals.get(id) ?? null);
  }
  async listPendingApprovalsBySite(siteId) {
    return [...this.approvals.values()].filter((approval) => approval.state === "pending").filter((approval) => this.items.get(approval.contentItemId)?.siteId === siteId).map((approval) => structuredClone(approval)).sort((a, b) => b.requestedAt - a.requestedAt);
  }
  async decideApproval(input) {
    const approval = requireValue$1(this.approvals.get(input.approvalId), "APPROVAL_NOT_FOUND", "Approval not found");
    if (approval.state !== "pending")
      throw new DomainError("APPROVAL_ALREADY_DECIDED", "Approval was already decided", 409);
    approval.state = input.decision;
    approval.decidedBy = input.actor.actorId;
    approval.decidedAt = input.now;
    approval.decisionComment = input.comment;
    const item = requireValue$1(this.items.get(approval.contentItemId), "CONTENT_NOT_FOUND", "Content not found");
    this.recordSuccess(input.actor, item.workspaceId, item.siteId, `content.${input.decision}`, "approval", approval.id, approval.revisionId, input.now, {});
    return structuredClone(approval);
  }
  async publish(input) {
    const item = requireValue$1(this.items.get(input.contentItemId), "CONTENT_NOT_FOUND", "Content not found");
    if (item.state !== "active")
      throw new DomainError("CONTENT_TRASHED", "Trashed content cannot be published", 409);
    if (item.contentTypeKey === "folder" || item.contentTypeKey === "alias")
      throw new DomainError("CONTENT_NOT_PUBLISHABLE", "This content type cannot be published", 422);
    const approval = requireValue$1(this.approvals.get(input.approvalId), "APPROVAL_NOT_FOUND", "Approval not found");
    const revision = requireValue$1(this.revisions.get(input.revisionId), "REVISION_NOT_FOUND", "Revision not found");
    if (approval.state !== "approved" || approval.revisionId !== revision.id || approval.revisionHash !== revision.contentHash) {
      throw new DomainError("REVISION_NOT_APPROVED", "The exact revision has not been approved", 409);
    }
    const previous = item.publishedRevisionId;
    item.publishedRevisionId = revision.id;
    item.updatedAt = input.now;
    const publication = {
      id: `pub_${crypto.randomUUID()}`,
      contentItemId: item.id,
      previousRevisionId: previous,
      publishedRevisionId: revision.id,
      actorPrincipalId: input.actor.actorId,
      committedAt: input.now,
      verificationState: "pending"
    };
    this.publicationEvents.set(publication.id, publication);
    const outboxId = this.addOutbox("content.published", item.id, { publicationId: publication.id, revisionId: revision.id, siteId: item.siteId }, input.now);
    this.recordSuccess(input.actor, item.workspaceId, item.siteId, "content.publish", "content-item", item.id, revision.id, input.now, {
      publicationId: publication.id,
      outboxEventId: outboxId
    });
    return this.snapshot(item.id);
  }
  async unpublish(input) {
    const item = requireValue$1(this.items.get(input.contentItemId), "CONTENT_NOT_FOUND", "Content not found");
    if (item.state !== "active")
      throw new DomainError("CONTENT_TRASHED", "Trashed content cannot be unpublished", 409);
    if (item.contentTypeKey === "folder" || item.contentTypeKey === "alias") {
      throw new DomainError("CONTENT_NOT_PUBLISHABLE", "This content type cannot be unpublished", 422);
    }
    if (!item.publishedRevisionId)
      throw new DomainError("CONTENT_NOT_PUBLISHED", "Content is not published", 409);
    const previousRevisionId = item.publishedRevisionId;
    item.publishedRevisionId = null;
    item.updatedAt = input.now;
    const outboxId = this.addOutbox("content.unpublished", item.id, {
      previousRevisionId,
      siteId: item.siteId
    }, input.now);
    this.recordSuccess(input.actor, item.workspaceId, item.siteId, "content.unpublish", "content-item", item.id, previousRevisionId, input.now, {
      previousRevisionId,
      outboxEventId: outboxId
    });
    return this.snapshot(item.id);
  }
  async resolvePublicPath(siteId, path) {
    const normalized = normalizePath(path);
    const route = [...this.routes.values()].find((candidate) => candidate.siteId === siteId && candidate.path === normalized && candidate.active);
    if (route) {
      const snapshot = this.resolvePublishableSnapshot(route.contentItemId);
      return snapshot ? { kind: "content", snapshot } : null;
    }
    const redirect = [...this.redirects.values()].find((candidate) => candidate.siteId === siteId && candidate.sourcePath === normalized && candidate.active);
    if (!redirect)
      return null;
    const targetRoute = this.routes.get(redirect.targetRouteId);
    if (!targetRoute)
      return null;
    const currentRoute = [...this.routes.values()].find((candidate) => candidate.contentItemId === targetRoute.contentItemId && candidate.active && candidate.isCanonical);
    if (!currentRoute)
      return null;
    return { kind: "redirect", location: currentRoute.path, statusCode: redirect.statusCode };
  }
  async findPublicByPath(siteId, path) {
    const resolution = await this.resolvePublicPath(siteId, path);
    return resolution?.kind === "content" ? resolution.snapshot : null;
  }
  async saveAgentRun(run) {
    this.agentRuns.set(run.id, structuredClone(run));
  }
  async updateAgentRun(run) {
    this.agentRuns.set(run.id, structuredClone(run));
  }
  async saveChangeSet(changeSet) {
    this.changeSets.set(changeSet.id, structuredClone(changeSet));
  }
  async getChangeSet(id) {
    return clone$5(this.changeSets.get(id) ?? null);
  }
  async appendAudit(event) {
    this.audits.set(event.id, structuredClone(event));
  }
  async listAudit(workspaceId) {
    return [...this.audits.values()].filter((event) => event.workspaceId === workspaceId).sort((a, b) => a.occurredAt - b.occurredAt).map((event) => structuredClone(event));
  }
  async getWorkspace(id) {
    return clone$5(this.workspaces.get(id) ?? null);
  }
  async getSite(id) {
    return clone$5(this.sites.get(id) ?? null);
  }
  async listOutbox() {
    return [...this.outbox.values()].map((event) => structuredClone(event));
  }
  async listPublishedAssetReferences(assetId) {
    const result = [];
    for (const reference of this.revisionAssetReferences) {
      if (reference.assetId !== assetId)
        continue;
      const revision = this.revisions.get(reference.revisionId);
      if (!revision)
        continue;
      const item = this.items.get(revision.contentItemId);
      if (!item || item.state !== "active" || item.publishedRevisionId !== revision.id)
        continue;
      const node = this.nodeForContent(item.id);
      result.push({ ...structuredClone(reference), contentItemId: item.id, siteId: item.siteId, path: node.cachedPath });
    }
    return result;
  }
  async createRoutableContent(input, contentTypeKey, routeType) {
    const site = requireValue$1(this.sites.get(input.siteId), "SITE_NOT_FOUND", "Site not found");
    if (input.parentId)
      this.requireParentForType(input.parentId, input.siteId, contentTypeKey);
    else if (contentTypeKey === "article")
      throw new DomainError("ARTICLE_PARENT_REQUIRED", "Articles must belong to a blog", 422);
    const path = normalizePath(input.path);
    this.assertRouteAvailable(input.siteId, site.hostname, path);
    const contentId = asContentItemId(newId("content"));
    const revisionId = asRevisionId(newId("revision"));
    const nodeId = asContentNodeId(newId("node"));
    const routeId = newId("route");
    const revision = {
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
      createdAt: input.now
    };
    const item = {
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
      updatedAt: input.now
    };
    const node = {
      id: nodeId,
      siteId: input.siteId,
      contentItemId: contentId,
      parentId: input.parentId,
      slug: normalizeSlug(input.slug),
      sortKey: `${input.now}:${contentId}`,
      cachedPath: path,
      treeVersion: 1,
      createdAt: input.now,
      updatedAt: input.now
    };
    const route = {
      id: routeId,
      siteId: input.siteId,
      contentItemId: contentId,
      hostname: site.hostname,
      path,
      routeType,
      isCanonical: true,
      active: true,
      activatedAt: input.now,
      deactivatedAt: null
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
  recordAssetReferences(revisionId, document) {
    this.revisionAssetReferences.splice(0, this.revisionAssetReferences.length, ...this.revisionAssetReferences.filter((reference) => reference.revisionId !== revisionId));
    for (const reference of collectAssetReferences(document)) {
      this.revisionAssetReferences.push({
        revisionId,
        assetId: asAssetId(reference.assetId),
        blockId: reference.blockId,
        fieldPath: reference.fieldPath,
        usage: reference.usage
      });
    }
  }
  snapshot(contentItemId) {
    const item = requireValue$1(this.items.get(contentItemId), "CONTENT_NOT_FOUND", "Content not found");
    const node = this.nodeForContent(contentItemId);
    const route = this.routeForContent(contentItemId);
    return {
      item: structuredClone(item),
      node: structuredClone(node),
      route: structuredClone(route),
      workingRevision: item.workingRevisionId ? structuredClone(requireValue$1(this.revisions.get(item.workingRevisionId), "REVISION_NOT_FOUND", "Working revision not found")) : null,
      publishedRevision: item.publishedRevisionId ? structuredClone(requireValue$1(this.revisions.get(item.publishedRevisionId), "REVISION_NOT_FOUND", "Published revision not found")) : null
    };
  }
  managerEntry(contentItemId) {
    return {
      snapshot: this.snapshot(contentItemId),
      aliasTargetContentItemId: this.aliases.get(contentItemId)?.targetContentItemId ?? null,
      trash: clone$5(this.trashEntries.get(contentItemId) ?? null)
    };
  }
  nodeForContent(contentItemId) {
    return requireValue$1([...this.nodes.values()].find((node) => node.contentItemId === contentItemId), "NODE_NOT_FOUND", "Content node not found");
  }
  routeForContent(contentItemId) {
    return requireValue$1([...this.routes.values()].find((route) => route.contentItemId === contentItemId && route.active && route.isCanonical), "ROUTE_NOT_FOUND", "Canonical route not found");
  }
  activeRoutesForContent(contentItemId) {
    return [...this.routes.values()].filter((route) => route.contentItemId === contentItemId && route.active);
  }
  subtree(root) {
    return [...this.nodes.values()].filter((candidate) => candidate.siteId === root.siteId && (candidate.id === root.id || candidate.cachedPath.startsWith(`${root.cachedPath}/`))).sort((a, b) => a.cachedPath.length - b.cachedPath.length);
  }
  requireFolderParent(nodeId, siteId) {
    return this.requireParentForType(nodeId, siteId, "page");
  }
  requireParentForType(nodeId, siteId, childType) {
    const parent = requireValue$1(this.nodes.get(nodeId), "PARENT_NOT_FOUND", "Parent node not found");
    if (parent.siteId !== siteId)
      throw new DomainError("CROSS_SITE_PARENT", "Parent belongs to another site", 422);
    const parentItem = requireValue$1(this.items.get(parent.contentItemId), "CONTENT_NOT_FOUND", "Parent content not found");
    if (parentItem.state !== "active")
      throw new DomainError("PARENT_TRASHED", "Parent is in trash", 409);
    const required = childType === "article" ? "blog" : "folder";
    if (parentItem.contentTypeKey !== required) {
      const code = required === "blog" ? "PARENT_MUST_BE_BLOG" : "PARENT_MUST_BE_FOLDER";
      const message = required === "blog" ? "Articles can only belong to a blog" : "Only folders can contain this content type";
      throw new DomainError(code, message, 422);
    }
    return parent;
  }
  resolvePublishableSnapshot(contentItemId) {
    let item = this.items.get(contentItemId);
    const visited = /* @__PURE__ */ new Set();
    while (item?.contentTypeKey === "alias") {
      if (visited.has(item.id))
        throw new DomainError("ALIAS_CYCLE", "Alias cycle detected", 500);
      visited.add(item.id);
      const relation = this.aliases.get(item.id);
      if (!relation)
        return null;
      item = this.items.get(relation.targetContentItemId);
    }
    if (!item || item.state !== "active" || !item.publishedRevisionId)
      return null;
    return this.snapshot(item.id);
  }
  retireRedirectAt(siteId, hostname, path) {
    const normalized = normalizePath(path);
    for (const redirect of this.redirects.values()) {
      if (redirect.siteId === siteId && redirect.sourceHostname === hostname && redirect.sourcePath === normalized && redirect.active)
        redirect.active = false;
    }
  }
  assertRouteAvailable(siteId, hostname, path, exceptContentId) {
    const collision = [...this.routes.values()].find((route) => route.siteId === siteId && route.hostname === hostname && route.path === path && route.active && route.contentItemId !== exceptContentId);
    if (collision)
      throw new DomainError("ROUTE_COLLISION", `Route ${path} already exists`, 409);
  }
  addOutbox(eventType, aggregateId, payload, now) {
    const id = newId("outbox");
    this.outbox.set(id, { id, eventType, aggregateType: "content-item", aggregateId, payload, state: "pending", attempts: 0, availableAt: now, createdAt: now });
    return id;
  }
  recordSuccess(actor, workspaceId, siteId, action, resourceType, resourceId, revisionId, now, details) {
    const event = {
      id: newId("audit"),
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
      details
    };
    this.audits.set(event.id, event);
  }
}
function requireValue$1(value, code, message) {
  if (value === void 0)
    throw new DomainError(code, message, 404);
  return value;
}
function clone$5(value) {
  return structuredClone(value);
}
const Capabilities = {
  All: "*",
  ContentRead: "content.read",
  ContentCreate: "content.create",
  ContentRevise: "content.revise",
  ContentMove: "content.move",
  ContentCopy: "content.copy",
  ContentTrash: "content.trash",
  ContentRestore: "content.restore",
  AliasCreate: "alias.create",
  ContentRequestPublish: "content.request-publish",
  ContentApprove: "content.approve",
  ContentPublish: "content.publish",
  ContentUnpublish: "content.unpublish",
  PrincipalManage: "principal.manage",
  GrantManage: "grant.manage",
  AssetRead: "asset.read",
  AssetUpload: "asset.upload",
  AssetDelete: "asset.delete",
  PreviewCreate: "preview.create",
  PreviewRevoke: "preview.revoke",
  BlogCreate: "blog.create",
  ArticleCreate: "article.create",
  TaxonomyManage: "taxonomy.manage",
  ArticleClassify: "article.classify",
  CustomFieldManage: "custom-field.manage",
  CustomTableManage: "custom-table.manage",
  CustomContentCreate: "custom-content.create",
  CustomEntryRead: "custom-entry.read",
  CustomEntryCreate: "custom-entry.create",
  CustomEntryRevise: "custom-entry.revise",
  CustomEntryRequestPublish: "custom-entry.request-publish",
  CustomEntryApprove: "custom-entry.approve",
  CustomEntryPublish: "custom-entry.publish",
  CustomEntryUnpublish: "custom-entry.unpublish",
  MailFormCreate: "mail-form.create",
  MailFormManage: "mail-form.manage",
  MailSubmissionRead: "mail-submission.read",
  MailSubmissionReadSensitive: "mail-submission.read-sensitive",
  MailSubmissionPurge: "mail-submission.purge",
  MailNotificationDeliver: "mail-notification.deliver",
  ThemeRead: "theme.read",
  ThemeManage: "theme.manage",
  ThemeActivate: "theme.activate"
};
const riskOrder = { low: 0, medium: 1, high: 2, critical: 3 };
function evaluateAuthorization(input) {
  if (input.actor.actorType === "agent" && (input.capability === Capabilities.ContentPublish || input.capability === Capabilities.ContentUnpublish || input.capability === Capabilities.CustomEntryPublish || input.capability === Capabilities.CustomEntryUnpublish)) {
    return { allowed: false, reason: "default_agent_publish_policy" };
  }
  const usableGrant = input.grants.find((grant) => grant.principalId === input.actor.actorId && grant.revokedAt === void 0 && (grant.validFrom === void 0 || grant.validFrom <= input.now) && (grant.validUntil === void 0 || grant.validUntil > input.now) && capabilityMatches(grant.capability, input.capability) && scopeMatches(grant.scope, input.resource));
  if (!usableGrant)
    return { allowed: false, reason: "capability_not_granted" };
  if (input.actor.actorType !== "agent") {
    return { allowed: true, reason: "grant", grantId: usableGrant.id };
  }
  const delegation = input.delegation;
  if (!delegation)
    return { allowed: false, reason: "agent_delegation_required" };
  if (delegation.agentPrincipalId !== input.actor.actorId)
    return { allowed: false, reason: "delegation_agent_mismatch" };
  if (input.actor.onBehalfOf !== delegation.humanPrincipalId)
    return { allowed: false, reason: "delegation_human_mismatch" };
  if (delegation.revokedAt !== void 0 || delegation.expiresAt <= input.now)
    return { allowed: false, reason: "delegation_expired" };
  if (!delegation.capabilities.some((capability) => capabilityMatches(capability, input.capability))) {
    return { allowed: false, reason: "capability_not_delegated" };
  }
  if (!scopeMatches(delegation.scope, input.resource))
    return { allowed: false, reason: "delegation_scope_mismatch" };
  if (riskOrder[input.resource.risk] > riskOrder[delegation.maximumRisk]) {
    return { allowed: false, reason: "delegation_risk_exceeded" };
  }
  return {
    allowed: true,
    reason: "grant_and_delegation",
    grantId: usableGrant.id,
    delegationId: delegation.id
  };
}
function capabilityMatches(granted, requested) {
  return granted === Capabilities.All || granted === requested;
}
function scopeMatches(scope, resource) {
  if (scope.workspaceId !== void 0 && scope.workspaceId !== resource.workspaceId)
    return false;
  if (scope.siteId !== void 0 && scope.siteId !== resource.siteId)
    return false;
  if (scope.contentType !== void 0 && scope.contentType !== resource.contentType)
    return false;
  if (scope.pathPrefix !== void 0 && (resource.path === void 0 || !resource.path.startsWith(scope.pathPrefix)))
    return false;
  if (scope.maximumRisk !== void 0 && riskOrder[resource.risk] > riskOrder[scope.maximumRisk])
    return false;
  return true;
}
class CmsService {
  #store;
  #clock;
  #registry;
  #lifecycleHooks;
  #securityHooks;
  constructor(store, options = {}) {
    this.#store = store;
    this.#clock = options.clock ?? systemClock;
    this.#registry = options.registry ?? createDefaultComponentRegistry();
    this.#lifecycleHooks = options.lifecycleHooks;
    this.#securityHooks = options.securityHooks;
  }
  get store() {
    return this.#store;
  }
  attachLifecycleHooks(hooks) {
    this.#lifecycleHooks = hooks;
  }
  attachSecurityHooks(hooks) {
    this.#securityHooks = hooks;
  }
  get registry() {
    return this.#registry;
  }
  async authorizeOperation(actor, capability, resource, action, resourceType, resourceId) {
    return this.#authorize(actor, capability, resource, action, resourceType, resourceId);
  }
  async recordSuccessfulOperation(actor, input) {
    return this.#successAudit(actor, input.workspaceId, input.siteId ?? null, input.action, input.resourceType, input.resourceId, input.revisionId ?? null, input.capability, input.details ?? {});
  }
  async getRevisionForPreview(actor, contentItemId, revisionId) {
    const snapshot = await this.#requireSnapshot(contentItemId);
    await this.#authorize(actor, Capabilities.ContentRead, this.#resource(snapshot, "low"), "preview.revision-read", "content-item", contentItemId);
    const revision = await this.#requireRevision(revisionId);
    assertDomain(revision.contentItemId === contentItemId, "REVISION_CONTENT_MISMATCH", "Revision belongs to another content item", 422);
    return revision;
  }
  async bootstrap(input) {
    const now = this.#clock.now();
    const workspaceId = newId("workspace");
    const siteId = asSiteId(newId("site"));
    const ownerId = asPrincipalId(newId("principal"));
    const owner = {
      id: ownerId,
      workspaceId,
      type: "human",
      displayName: input.ownerName,
      state: "active",
      createdAt: now
    };
    const ownerGrant = {
      id: newId("grant"),
      principalId: ownerId,
      capability: Capabilities.All,
      scope: { workspaceId }
    };
    await this.#store.bootstrap({
      workspace: { id: workspaceId, name: input.workspaceName, createdAt: now },
      owner,
      site: {
        id: siteId,
        workspaceId,
        name: input.siteName,
        hostname: input.hostname.toLowerCase(),
        locale: input.locale ?? "ja-JP",
        state: "active",
        createdAt: now,
        updatedAt: now
      },
      ownerGrant
    });
    return { workspaceId, siteId, ownerPrincipalId: ownerId };
  }
  async createPrincipal(actor, input) {
    await this.#authorize(actor, Capabilities.PrincipalManage, { workspaceId: input.workspaceId, risk: "high" }, "principal.create", "workspace", input.workspaceId);
    const principal = {
      id: asPrincipalId(newId("principal")),
      workspaceId: input.workspaceId,
      type: input.type,
      displayName: input.displayName,
      state: "active",
      createdAt: this.#clock.now()
    };
    await this.#store.createPrincipal(principal);
    await this.#successAudit(actor, input.workspaceId, null, "principal.create", "principal", principal.id, null, Capabilities.PrincipalManage, {});
    return principal;
  }
  async grantCapability(actor, input) {
    const principal = await this.#requirePrincipal(input.principalId);
    await this.#authorize(actor, Capabilities.GrantManage, { workspaceId: principal.workspaceId, risk: "high" }, "grant.create", "principal", principal.id);
    const grant = {
      id: newId("grant"),
      principalId: principal.id,
      capability: input.capability,
      scope: input.scope ?? { workspaceId: principal.workspaceId }
    };
    if (input.validUntil !== void 0)
      grant.validUntil = input.validUntil;
    await this.#store.createCapabilityGrant(grant);
    await this.#successAudit(actor, principal.workspaceId, null, "grant.create", "principal", principal.id, null, Capabilities.GrantManage, { grantedCapability: input.capability });
    return grant;
  }
  async createDelegation(actor, input) {
    const human = await this.#requirePrincipal(input.humanPrincipalId);
    const agent = await this.#requirePrincipal(input.agentPrincipalId);
    assertDomain(actor.actorId === human.id, "DELEGATION_OWNER_REQUIRED", "Only the delegating human can create this delegation", 403);
    assertDomain(agent.type === "agent", "AGENT_REQUIRED", "Delegation target must be an agent", 422);
    const delegation = {
      id: newId("delegation"),
      humanPrincipalId: human.id,
      agentPrincipalId: agent.id,
      capabilities: [...input.capabilities],
      scope: input.scope ?? { workspaceId: human.workspaceId },
      maximumRisk: input.maximumRisk ?? "medium",
      expiresAt: input.expiresAt
    };
    await this.#store.createDelegationGrant(delegation);
    await this.#successAudit(actor, human.workspaceId, null, "delegation.create", "agent", agent.id, null, "delegation.create", { capabilities: input.capabilities });
    return delegation;
  }
  async createPage(actor, input) {
    const prepared = await this.#prepareCreate(actor, input.siteId, input.parentId, input.slug, "page", input.document, input.title);
    return this.#store.createPage({ ...prepared, actor, title: input.title, document: input.document, now: this.#clock.now() });
  }
  async createFolder(actor, input) {
    const document = createEmptyDocument();
    const prepared = await this.#prepareCreate(actor, input.siteId, input.parentId, input.slug, "folder", document, input.title);
    return this.#store.createFolder({ ...prepared, actor, title: input.title, document, now: this.#clock.now() });
  }
  async createCustomContent(actor, input) {
    const prepared = await this.#prepareCreate(actor, input.siteId, input.parentId, input.slug, "custom-content", input.document, input.title, Capabilities.CustomContentCreate);
    return this.#store.createCustomContent({ ...prepared, actor, title: input.title, document: input.document, now: this.#clock.now() });
  }
  async createMailForm(actor, input) {
    const prepared = await this.#prepareCreate(actor, input.siteId, input.parentId, input.slug, "mail-form", input.document, input.title, Capabilities.MailFormCreate);
    return this.#store.createMailForm({ ...prepared, actor, title: input.title, document: input.document, now: this.#clock.now() });
  }
  async createBlog(actor, input) {
    const prepared = await this.#prepareCreate(actor, input.siteId, input.parentId, input.slug, "blog", input.document, input.title, Capabilities.BlogCreate);
    return this.#store.createBlog({ ...prepared, actor, title: input.title, document: input.document, now: this.#clock.now() });
  }
  async createArticle(actor, input) {
    const blog = await this.#requireSnapshot(input.blogContentItemId);
    assertDomain(blog.item.contentTypeKey === "blog", "BLOG_REQUIRED", "Article parent must be a blog", 422);
    const prepared = await this.#prepareCreate(actor, blog.item.siteId, blog.node.id, input.slug, "article", input.document, input.title, Capabilities.ArticleCreate);
    return this.#store.createArticle({ ...prepared, actor, title: input.title, document: input.document, now: this.#clock.now() });
  }
  async createAlias(actor, input) {
    const target = await this.#requireSnapshot(input.targetContentItemId);
    assertDomain(target.item.siteId === input.siteId, "CROSS_SITE_ALIAS", "Alias target belongs to another site", 422);
    assertDomain(target.item.state === "active", "ALIAS_TARGET_INACTIVE", "Alias target is not active", 409);
    assertDomain(target.item.contentTypeKey !== "folder" && target.item.contentTypeKey !== "alias", "INVALID_ALIAS_TARGET", "Aliases can target publishable content only", 422);
    const document = createEmptyDocument();
    const prepared = await this.#prepareCreate(actor, input.siteId, input.parentId, input.slug, "alias", document, input.title, Capabilities.AliasCreate);
    return this.#store.createAlias({ ...prepared, actor, title: input.title, document, targetContentItemId: input.targetContentItemId, now: this.#clock.now() });
  }
  async getContent(actor, contentItemId) {
    const snapshot = await this.#requireSnapshot(contentItemId);
    await this.#authorize(actor, Capabilities.ContentRead, this.#resource(snapshot, "low"), "content.read", "content-item", contentItemId);
    return snapshot;
  }
  async commitRevision(actor, input) {
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
      now: this.#clock.now()
    });
  }
  async analyzeRelocation(actor, input) {
    const snapshot = await this.#requireSnapshot(input.contentItemId);
    await this.#authorize(actor, Capabilities.ContentMove, this.#resource(snapshot, "high"), "content.move-impact", "content-item", input.contentItemId);
    const parent = input.targetParentId ? await this.#requireParentNode(input.targetParentId, snapshot.item.siteId, snapshot.item.contentTypeKey) : null;
    const newRootPath = childPath(parent?.cachedPath ?? null, normalizeSlug(input.newSlug));
    const tree = await this.#store.listContentTree(snapshot.item.siteId);
    const affected = tree.filter((entry) => entry.snapshot.node.cachedPath === snapshot.node.cachedPath || entry.snapshot.node.cachedPath.startsWith(`${snapshot.node.cachedPath}/`)).map((entry) => ({
      contentItemId: entry.snapshot.item.id,
      oldPath: entry.snapshot.node.cachedPath,
      newPath: normalizePath(`${newRootPath}${entry.snapshot.node.cachedPath.slice(snapshot.node.cachedPath.length)}`)
    }));
    const riskLevel = affected.length > 100 ? "critical" : affected.length > 1 ? "high" : "medium";
    return { contentItemId: snapshot.item.id, oldRootPath: snapshot.node.cachedPath, newRootPath, affected, redirectCount: affected.length, riskLevel };
  }
  async relocateContent(actor, input) {
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
      now: this.#clock.now()
    });
  }
  async reorderContent(actor, input) {
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
      now: this.#clock.now()
    });
  }
  async copyContent(actor, input) {
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
    if (input.targetParentId)
      await this.#requireParentNode(input.targetParentId, snapshot.item.siteId, snapshot.item.contentTypeKey);
    return this.#store.copyContent({
      actor,
      contentItemId: input.contentItemId,
      targetParentId: input.targetParentId,
      newSlug: normalizeSlug(input.newSlug),
      expectedTreeVersion: input.expectedTreeVersion,
      includeDescendants: input.includeDescendants ?? (snapshot.item.contentTypeKey === "folder" || snapshot.item.contentTypeKey === "blog"),
      now: this.#clock.now()
    });
  }
  async trashContent(actor, input) {
    const snapshot = await this.#requireSnapshot(input.contentItemId);
    await this.#authorize(actor, Capabilities.ContentTrash, this.#resource(snapshot, "high"), "content.trash", "content-item", input.contentItemId);
    return this.#store.trashContent({ actor, contentItemId: input.contentItemId, expectedTreeVersion: input.expectedTreeVersion, now: this.#clock.now() });
  }
  async restoreContent(actor, input) {
    const snapshot = await this.#requireSnapshot(input.contentItemId);
    await this.#authorize(actor, Capabilities.ContentRestore, this.#resource(snapshot, "high"), "content.restore", "content-item", input.contentItemId);
    if (snapshot.item.contentTypeKey === "article" && input.targetParentId !== void 0) {
      throw new DomainError("ARTICLE_REPARENT_ON_RESTORE_NOT_IMPLEMENTED", "Restore articles to their original blog before moving them", 409);
    }
    if (input.targetParentId)
      await this.#requireParentNode(input.targetParentId, snapshot.item.siteId, snapshot.item.contentTypeKey);
    return this.#store.restoreContent({
      actor,
      contentItemId: input.contentItemId,
      targetParentId: input.targetParentId ?? null,
      newSlug: input.newSlug ? normalizeSlug(input.newSlug) : null,
      expectedTreeVersion: input.expectedTreeVersion,
      now: this.#clock.now()
    });
  }
  async listContentTree(actor, siteId) {
    const site = await this.#requireSite(siteId);
    await this.#authorize(actor, Capabilities.ContentRead, { workspaceId: site.workspaceId, siteId, risk: "low" }, "content-tree.read", "site", siteId);
    return this.#store.listContentTree(siteId);
  }
  async listTrash(actor, siteId) {
    const site = await this.#requireSite(siteId);
    await this.#authorize(actor, Capabilities.ContentRead, { workspaceId: site.workspaceId, siteId, risk: "low" }, "trash.read", "site", siteId);
    return this.#store.listTrash(siteId);
  }
  async listPendingApprovals(actor, siteId) {
    const site = await this.#requireSite(siteId);
    await this.#authorize(actor, Capabilities.ContentApprove, { workspaceId: site.workspaceId, siteId, risk: "medium" }, "approvals.list", "site", siteId);
    return this.#store.listPendingApprovalsBySite(siteId);
  }
  async listContentApprovalInbox(actor, siteId) {
    const pending = await this.listPendingApprovals(actor, siteId);
    const items = [];
    for (const approval of pending) {
      const snapshot = await this.#requireSnapshot(approval.contentItemId);
      const revision = snapshot.workingRevision?.id === approval.revisionId ? snapshot.workingRevision : await this.#requireRevision(approval.revisionId);
      const titleField = revision.fields.title;
      items.push({
        approval,
        path: snapshot.route.path,
        title: typeof titleField === "string" && titleField ? titleField : snapshot.node.slug,
        fromAgent: Boolean(revision.agentRunId),
        agentRunId: revision.agentRunId
      });
    }
    return items;
  }
  async requestApproval(actor, input) {
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
      now: this.#clock.now()
    });
  }
  async decideApproval(actor, input) {
    const approval = await this.#requireApproval(input.approvalId);
    const snapshot = await this.#requireSnapshot(approval.contentItemId);
    await this.#authorize(actor, Capabilities.ContentApprove, this.#resource(snapshot, approval.riskLevel), `content.${input.decision}`, "approval", approval.id);
    return this.#store.decideApproval({
      actor,
      approvalId: approval.id,
      decision: input.decision,
      comment: input.comment ?? "",
      now: this.#clock.now()
    });
  }
  async publish(actor, input) {
    const snapshot = await this.#requireSnapshot(input.contentItemId);
    await this.#authorize(actor, Capabilities.ContentPublish, this.#resource(snapshot, "high"), "content.publish", "content-item", input.contentItemId);
    const event = {
      actor,
      workspaceId: snapshot.item.workspaceId,
      siteId: snapshot.item.siteId,
      contentItemId: input.contentItemId,
      revisionId: input.revisionId,
      approvalId: input.approvalId,
      contentType: snapshot.item.contentTypeKey,
      path: snapshot.node.cachedPath
    };
    await this.#lifecycleHooks?.beforePublish?.(event);
    const published = await this.#store.publish({
      actor,
      contentItemId: input.contentItemId,
      revisionId: input.revisionId,
      approvalId: input.approvalId,
      now: this.#clock.now()
    });
    await this.#lifecycleHooks?.afterPublish?.(event);
    return published;
  }
  async unpublish(actor, input) {
    const snapshot = await this.#requireSnapshot(input.contentItemId);
    await this.#authorize(actor, Capabilities.ContentUnpublish, this.#resource(snapshot, "high"), "content.unpublish", "content-item", input.contentItemId);
    assertDomain(snapshot.item.publishedRevisionId !== null, "CONTENT_NOT_PUBLISHED", "Content is not published", 409);
    return this.#store.unpublish({
      actor,
      contentItemId: input.contentItemId,
      now: this.#clock.now()
    });
  }
  async resolvePublicPath(siteId, path) {
    return this.#store.resolvePublicPath(siteId, path);
  }
  async findPublicByPath(siteId, path) {
    return this.#store.findPublicByPath(siteId, path);
  }
  async listAudit(actor, workspaceId) {
    await this.#authorize(actor, Capabilities.ContentRead, { workspaceId, risk: "low" }, "audit.read", "workspace", workspaceId);
    return this.#store.listAudit(workspaceId);
  }
  async #prepareCreate(actor, siteId, parentId, slugInput, contentType, document, title, capability = Capabilities.ContentCreate) {
    const site = await this.#requireSite(siteId);
    const parent = parentId ? await this.#requireParentNode(parentId, siteId, contentType) : null;
    if (!parent && contentType === "article")
      throw new DomainError("ARTICLE_PARENT_REQUIRED", "Articles must belong to a blog", 422);
    const slug = normalizeSlug(slugInput);
    const path = childPath(parent?.cachedPath ?? null, slug);
    await this.#authorize(actor, capability, { workspaceId: site.workspaceId, siteId: site.id, contentType, path, risk: "low" }, `${contentType}.create`, "site", site.id);
    this.#validateDocument(document);
    const contentHash = await this.#contentHash({ title }, document);
    return { workspaceId: site.workspaceId, siteId: site.id, parentId, slug, path, contentHash };
  }
  async #requireFolderNode(nodeId, siteId) {
    return this.#requireParentNode(nodeId, siteId, "page");
  }
  async #requireParentNode(nodeId, siteId, childType) {
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
  #validateDocument(document) {
    const result = validateDocument(document, this.#registry);
    assertDomain(result.valid, "INVALID_DOCUMENT", "Structured document is invalid", 422, { errors: result.errors });
  }
  async #contentHash(fields, document) {
    return sha256(stableStringify({ fields, document }));
  }
  async #requireSnapshot(contentItemId) {
    const snapshot = await this.#store.getContentSnapshot(contentItemId);
    assertDomain(snapshot, "CONTENT_NOT_FOUND", "Content item not found", 404);
    return snapshot;
  }
  async #requireRevision(revisionId) {
    const revision = await this.#store.getRevision(revisionId);
    assertDomain(revision, "REVISION_NOT_FOUND", "Revision not found", 404);
    return revision;
  }
  async #requireApproval(approvalId) {
    const approval = await this.#store.getApproval(approvalId);
    assertDomain(approval, "APPROVAL_NOT_FOUND", "Approval not found", 404);
    return approval;
  }
  async #requirePrincipal(id) {
    const principal = await this.#store.getPrincipal(id);
    assertDomain(principal, "PRINCIPAL_NOT_FOUND", "Principal not found", 404);
    assertDomain(principal.state === "active", "PRINCIPAL_DISABLED", "Principal is disabled", 403);
    return principal;
  }
  async #requireSite(id) {
    const site = await this.#store.getSite(id);
    assertDomain(site, "SITE_NOT_FOUND", "Site not found", 404);
    return site;
  }
  #resource(snapshot, risk) {
    return {
      workspaceId: snapshot.item.workspaceId,
      siteId: snapshot.item.siteId,
      contentType: snapshot.item.contentTypeKey,
      path: snapshot.route.path,
      risk
    };
  }
  async #authorize(actor, capability, resource, action, resourceType, resourceId) {
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
      ...delegation ? { delegation } : {}
    };
    const decision = evaluateAuthorization(input);
    if (!decision.allowed) {
      const siteId = resource.siteId ?? null;
      await this.#store.appendAudit({
        id: newId("audit"),
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
        details: {}
      });
      throw new DomainError("FORBIDDEN", `Operation denied: ${decision.reason}`, 403, { capability, reason: decision.reason });
    }
    if (this.#securityHooks?.assertStepUp) {
      await this.#securityHooks.assertStepUp(actor, { action, capability, risk: resource.risk });
    }
  }
  async #successAudit(actor, workspaceId, siteId, action, resourceType, resourceId, revisionId, capability, details) {
    await this.#store.appendAudit({
      id: newId("audit"),
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
      details
    });
  }
}
class D1CustomContentStore {
  #db;
  constructor(db) {
    this.#db = db;
  }
  async createField(field) {
    try {
      await this.#db.prepare("INSERT INTO custom_fields(id,workspace_id,field_key,name,field_type,description,options_json,state,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?,?,?)").bind(field.id, field.workspaceId, field.key, field.name, field.type, field.description, JSON.stringify(field.options), field.state, field.createdAt, field.updatedAt).run();
    } catch (error) {
      throw translate$1(error);
    }
  }
  async getField(id) {
    const row = await this.#db.prepare("SELECT * FROM custom_fields WHERE id=?").bind(id).first();
    return row ? mapField(row) : null;
  }
  async listFields(workspaceId) {
    return (await this.#db.prepare("SELECT * FROM custom_fields WHERE workspace_id=? ORDER BY created_at,id").bind(workspaceId).all()).results.map(mapField);
  }
  async createTable(table) {
    try {
      await this.#db.prepare("INSERT INTO custom_tables(id,workspace_id,table_key,name,table_kind,hierarchical,display_field_key,schema_version,state,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?,?,?,?)").bind(table.id, table.workspaceId, table.key, table.name, table.kind, table.hierarchical ? 1 : 0, table.displayFieldKey, table.schemaVersion, table.state, table.createdAt, table.updatedAt).run();
    } catch (error) {
      throw translate$1(error);
    }
  }
  async getTable(id) {
    const row = await this.#db.prepare("SELECT * FROM custom_tables WHERE id=?").bind(id).first();
    return row ? mapTable(row) : null;
  }
  async listTables(workspaceId) {
    return (await this.#db.prepare("SELECT * FROM custom_tables WHERE workspace_id=? ORDER BY created_at,id").bind(workspaceId).all()).results.map(mapTable);
  }
  async updateTable(table) {
    await this.#db.prepare("UPDATE custom_tables SET name=?,table_kind=?,hierarchical=?,display_field_key=?,schema_version=?,state=?,updated_at=? WHERE id=?").bind(table.name, table.kind, table.hierarchical ? 1 : 0, table.displayFieldKey, table.schemaVersion, table.state, table.updatedAt, table.id).run();
  }
  async attachField(relation) {
    try {
      await this.#db.prepare("INSERT INTO custom_table_fields(table_id,field_id,required,searchable,is_unique,sort_order,label_override,created_at) VALUES(?,?,?,?,?,?,?,?)").bind(relation.tableId, relation.fieldId, relation.required ? 1 : 0, relation.searchable ? 1 : 0, relation.unique ? 1 : 0, relation.sortOrder, relation.labelOverride, relation.createdAt).run();
    } catch (error) {
      throw translate$1(error);
    }
  }
  async listTableFields(tableId) {
    return (await this.#db.prepare("SELECT * FROM custom_table_fields WHERE table_id=? ORDER BY sort_order,field_id").bind(tableId).all()).results.map(mapTableField);
  }
  async createCustomContent(definition2) {
    try {
      await this.#db.prepare("INSERT INTO custom_contents(id,workspace_id,site_id,content_item_id,table_id,list_count,list_order_field_key,list_direction,template_key,state,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?,?,?,?,?)").bind(definition2.id, definition2.workspaceId, definition2.siteId, definition2.contentItemId, definition2.tableId, definition2.listCount, definition2.listOrderFieldKey, definition2.listDirection, definition2.templateKey, definition2.state, definition2.createdAt, definition2.updatedAt).run();
    } catch (error) {
      throw translate$1(error);
    }
  }
  async getCustomContent(id) {
    const row = await this.#db.prepare("SELECT * FROM custom_contents WHERE id=?").bind(id).first();
    return row ? mapContent(row) : null;
  }
  async getCustomContentByContentItem(contentItemId) {
    const row = await this.#db.prepare("SELECT * FROM custom_contents WHERE content_item_id=?").bind(contentItemId).first();
    return row ? mapContent(row) : null;
  }
  async listCustomContents(siteId) {
    return (await this.#db.prepare("SELECT * FROM custom_contents WHERE site_id=? ORDER BY created_at,id").bind(siteId).all()).results.map(mapContent);
  }
  async createEntry(entry, revision) {
    const statements = [
      this.#db.prepare("INSERT INTO custom_entries(id,custom_content_id,table_id,slug,parent_entry_id,working_revision_id,published_revision_id,lock_version,state,created_by,created_at,updated_at) VALUES(?,?,?,?,?,?,NULL,0,?,?,?,?)").bind(entry.id, entry.customContentId, entry.tableId, entry.slug, entry.parentEntryId, entry.workingRevisionId, entry.state, entry.createdBy, entry.createdAt, entry.updatedAt),
      this.#revisionInsert(revision, 0),
      ...await this.#projectionStatements(entry.tableId, revision)
    ];
    try {
      await this.#db.batch(statements);
    } catch (error) {
      throw translate$1(error);
    }
    return await this.getEntry(entry.id);
  }
  async getEntry(id) {
    const row = await this.#db.prepare("SELECT * FROM custom_entries WHERE id=?").bind(id).first();
    if (!row)
      return null;
    const working = await this.#getRevision(asCustomEntryRevisionId(row.working_revision_id));
    if (!working)
      throw new DomainError("CUSTOM_ENTRY_REVISION_MISSING", "Working revision missing", 500);
    const published = row.published_revision_id ? await this.#getRevision(asCustomEntryRevisionId(row.published_revision_id)) : null;
    return { entry: mapEntry(row), workingRevision: working, publishedRevision: published };
  }
  async getEntryByPublicKey(customContentId, key2) {
    const row = await this.#db.prepare("SELECT id FROM custom_entries WHERE custom_content_id=? AND (slug=? OR id=?) LIMIT 1").bind(customContentId, key2, key2).first();
    return row ? this.getEntry(asCustomEntryId(row.id)) : null;
  }
  async listEntries(customContentId) {
    const rows = (await this.#db.prepare("SELECT id FROM custom_entries WHERE custom_content_id=? ORDER BY created_at,id").bind(customContentId).all()).results;
    const result = [];
    for (const row of rows) {
      const item = await this.getEntry(asCustomEntryId(row.id));
      if (item)
        result.push(item);
    }
    return result;
  }
  async commitEntryRevision(input) {
    const entry = await this.#db.prepare("SELECT table_id FROM custom_entries WHERE id=?").bind(input.entryId).first();
    if (!entry)
      throw new DomainError("CUSTOM_ENTRY_NOT_FOUND", "Custom entry not found", 404);
    const statements = [this.#revisionInsert(input.revision, input.expectedLockVersion), ...await this.#projectionStatements(asCustomTableId(entry.table_id), input.revision), this.#db.prepare("UPDATE custom_entries SET working_revision_id=?,lock_version=lock_version+1,updated_at=? WHERE id=? AND working_revision_id=? AND lock_version=?").bind(input.revision.id, input.revision.createdAt, input.entryId, input.baseRevisionId, input.expectedLockVersion)];
    try {
      await this.#db.batch(statements);
    } catch (error) {
      throw translate$1(error);
    }
    const saved = await this.#getRevision(input.revision.id);
    if (!saved)
      throw new DomainError("CUSTOM_ENTRY_REVISION_MISSING", "Revision was not saved", 500);
    return saved;
  }
  async createApproval(approval) {
    await this.#db.prepare("INSERT INTO custom_entry_approvals(id,entry_id,revision_id,revision_hash,state,requested_by,requested_at,decided_by,decided_at,decision_comment) VALUES(?,?,?,?,?,?,?,?,?,?)").bind(approval.id, approval.entryId, approval.revisionId, approval.revisionHash, approval.state, approval.requestedBy, approval.requestedAt, approval.decidedBy, approval.decidedAt, approval.decisionComment).run();
  }
  async getApproval(id) {
    const row = await this.#db.prepare("SELECT * FROM custom_entry_approvals WHERE id=?").bind(id).first();
    return row ? mapApproval$1(row) : null;
  }
  async listPendingApprovalsBySite(siteId) {
    const rows = (await this.#db.prepare("SELECT a.* FROM custom_entry_approvals a INNER JOIN custom_entries e ON e.id=a.entry_id INNER JOIN custom_contents c ON c.id=e.custom_content_id WHERE c.site_id=? AND a.state='pending' ORDER BY a.requested_at DESC").bind(siteId).all()).results;
    return rows.map(mapApproval$1);
  }
  async updateApproval(approval) {
    await this.#db.prepare("UPDATE custom_entry_approvals SET state=?,decided_by=?,decided_at=?,decision_comment=? WHERE id=?").bind(approval.state, approval.decidedBy, approval.decidedAt, approval.decisionComment, approval.id).run();
  }
  async publishEntry(input) {
    const approval = await this.getApproval(input.approvalId);
    if (!approval || approval.entryId !== input.entryId || approval.revisionId !== input.revisionId || approval.state !== "approved")
      throw new DomainError("CUSTOM_ENTRY_APPROVAL_REQUIRED", "Matching approved revision is required", 409);
    try {
      await this.#db.prepare("UPDATE custom_entries SET published_revision_id=?,updated_at=? WHERE id=?").bind(input.revisionId, input.now, input.entryId).run();
    } catch (error) {
      throw translate$1(error);
    }
    const snapshot = await this.getEntry(input.entryId);
    if (!snapshot)
      throw new DomainError("CUSTOM_ENTRY_NOT_FOUND", "Custom entry not found", 404);
    return snapshot;
  }
  async unpublishEntry(input) {
    const snapshot = await this.getEntry(input.entryId);
    if (!snapshot)
      throw new DomainError("CUSTOM_ENTRY_NOT_FOUND", "Custom entry not found", 404);
    if (snapshot.entry.state !== "active")
      throw new DomainError("CUSTOM_ENTRY_TRASHED", "Trashed custom entry cannot be unpublished", 409);
    if (!snapshot.entry.publishedRevisionId)
      throw new DomainError("CUSTOM_ENTRY_NOT_PUBLISHED", "Custom entry is not published", 409);
    try {
      await this.#db.prepare("UPDATE custom_entries SET published_revision_id=NULL,updated_at=? WHERE id=?").bind(input.now, input.entryId).run();
    } catch (error) {
      throw translate$1(error);
    }
    const next = await this.getEntry(input.entryId);
    if (!next)
      throw new DomainError("CUSTOM_ENTRY_NOT_FOUND", "Custom entry not found", 404);
    return next;
  }
  #revisionInsert(revision, expectedLockVersion) {
    return this.#db.prepare("INSERT INTO custom_entry_revisions(id,entry_id,revision_number,based_on_revision_id,schema_version,expected_lock_version,values_json,content_hash,created_by,change_summary,created_at) VALUES(?,?,?,?,?,?,?,?,?,?,?)").bind(revision.id, revision.entryId, revision.revisionNumber, revision.basedOnRevisionId, revision.schemaVersion, expectedLockVersion, JSON.stringify(revision.values), revision.contentHash, revision.createdBy, revision.changeSummary, revision.createdAt);
  }
  async #getRevision(id) {
    const row = await this.#db.prepare("SELECT * FROM custom_entry_revisions WHERE id=?").bind(id).first();
    return row ? mapRevision$1(row) : null;
  }
  async #projectionStatements(tableId, revision) {
    const rows = (await this.#db.prepare("SELECT f.id,f.field_key,f.field_type FROM custom_table_fields tf JOIN custom_fields f ON f.id=tf.field_id WHERE tf.table_id=? ORDER BY tf.sort_order").bind(tableId).all()).results;
    return rows.filter((row) => revision.values[row.field_key] !== null && revision.values[row.field_key] !== void 0).map((row) => {
      const v = revision.values[row.field_key];
      let text = null, number = null, integer = null, bool = null, timestamp = null, json2 = null;
      switch (row.field_type) {
        case "text":
        case "textarea":
        case "email":
        case "tel":
        case "select":
        case "asset":
          text = String(v);
          break;
        case "integer":
          integer = Number(v);
          break;
        case "decimal":
          number = Number(v);
          break;
        case "boolean":
          bool = v ? 1 : 0;
          break;
        case "date":
          timestamp = Date.parse(`${v}T00:00:00Z`);
          break;
        case "datetime":
          timestamp = Date.parse(String(v));
          break;
        default:
          json2 = JSON.stringify(v);
      }
      return this.#db.prepare("INSERT INTO custom_entry_values(revision_id,field_id,value_text,value_number,value_integer,value_boolean,value_timestamp,value_json) VALUES(?,?,?,?,?,?,?,?)").bind(revision.id, row.id, text, number, integer, bool, timestamp, json2);
    });
  }
}
function mapField(r) {
  return { id: asCustomFieldId(r.id), workspaceId: r.workspace_id, key: r.field_key, name: r.name, type: r.field_type, description: r.description, options: JSON.parse(r.options_json), state: r.state, createdAt: r.created_at, updatedAt: r.updated_at };
}
function mapTable(r) {
  return { id: asCustomTableId(r.id), workspaceId: r.workspace_id, key: r.table_key, name: r.name, kind: r.table_kind, hierarchical: Boolean(r.hierarchical), displayFieldKey: r.display_field_key, schemaVersion: r.schema_version, state: r.state, createdAt: r.created_at, updatedAt: r.updated_at };
}
function mapTableField(r) {
  return { tableId: asCustomTableId(r.table_id), fieldId: asCustomFieldId(r.field_id), required: Boolean(r.required), searchable: Boolean(r.searchable), unique: Boolean(r.is_unique), sortOrder: r.sort_order, labelOverride: r.label_override, createdAt: r.created_at };
}
function mapContent(r) {
  return { id: asCustomContentId(r.id), workspaceId: r.workspace_id, siteId: asSiteId(r.site_id), contentItemId: asContentItemId(r.content_item_id), tableId: asCustomTableId(r.table_id), listCount: r.list_count, listOrderFieldKey: r.list_order_field_key, listDirection: r.list_direction, templateKey: r.template_key, state: r.state, createdAt: r.created_at, updatedAt: r.updated_at };
}
function mapEntry(r) {
  return { id: asCustomEntryId(r.id), customContentId: asCustomContentId(r.custom_content_id), tableId: asCustomTableId(r.table_id), slug: r.slug, parentEntryId: r.parent_entry_id ? asCustomEntryId(r.parent_entry_id) : null, workingRevisionId: asCustomEntryRevisionId(r.working_revision_id), publishedRevisionId: r.published_revision_id ? asCustomEntryRevisionId(r.published_revision_id) : null, lockVersion: r.lock_version, state: r.state, createdBy: asPrincipalId(r.created_by), createdAt: r.created_at, updatedAt: r.updated_at };
}
function mapRevision$1(r) {
  return { id: asCustomEntryRevisionId(r.id), entryId: asCustomEntryId(r.entry_id), revisionNumber: r.revision_number, basedOnRevisionId: r.based_on_revision_id ? asCustomEntryRevisionId(r.based_on_revision_id) : null, schemaVersion: r.schema_version, values: JSON.parse(r.values_json), contentHash: r.content_hash, createdBy: asPrincipalId(r.created_by), changeSummary: r.change_summary, createdAt: r.created_at };
}
function mapApproval$1(r) {
  return { id: asCustomEntryApprovalId(r.id), entryId: asCustomEntryId(r.entry_id), revisionId: asCustomEntryRevisionId(r.revision_id), revisionHash: r.revision_hash, state: r.state, requestedBy: asPrincipalId(r.requested_by), requestedAt: r.requested_at, decidedBy: r.decided_by ? asPrincipalId(r.decided_by) : null, decidedAt: r.decided_at, decisionComment: r.decision_comment };
}
function translate$1(error) {
  const message = error instanceof Error ? error.message : String(error);
  if (message.includes("CUSTOM_ENTRY_REVISION_CONFLICT"))
    return new DomainError("CUSTOM_ENTRY_REVISION_CONFLICT", "Custom entry changed since it was read", 409);
  if (message.includes("CUSTOM_ENTRY_APPROVAL_REQUIRED"))
    return new DomainError("CUSTOM_ENTRY_APPROVAL_REQUIRED", "Matching approved revision is required", 409);
  if (message.includes("UNIQUE constraint failed: custom_fields"))
    return new DomainError("CUSTOM_FIELD_KEY_EXISTS", "Custom field key already exists", 409);
  if (message.includes("UNIQUE constraint failed: custom_tables"))
    return new DomainError("CUSTOM_TABLE_KEY_EXISTS", "Custom table key already exists", 409);
  if (message.includes("UNIQUE constraint failed: custom_entries.custom_content_id, custom_entries.slug"))
    return new DomainError("CUSTOM_ENTRY_SLUG_EXISTS", "Custom entry slug already exists", 409);
  return new DomainError("D1_CUSTOM_CONTENT_ERROR", message, 500);
}
class D1MailFormStore {
  #db;
  constructor(db) {
    this.#db = db;
  }
  async createForm(form, policies) {
    const statements = [this.#db.prepare("INSERT INTO mail_forms(id,workspace_id,site_id,content_item_id,table_id,recipient_emails_json,sender_address,subject_template,auto_reply_enabled,auto_reply_email_field_key,auto_reply_subject,confirmation_ttl_seconds,retention_days,turnstile_required,state,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)").bind(form.id, form.workspaceId, form.siteId, form.contentItemId, form.tableId, JSON.stringify(form.recipientEmails), form.senderAddress, form.subjectTemplate, form.autoReplyEnabled ? 1 : 0, form.autoReplyEmailFieldKey, form.autoReplySubject, form.confirmationTtlSeconds, form.retentionDays, form.turnstileRequired ? 1 : 0, form.state, form.createdAt, form.updatedAt)];
    for (const p of policies)
      statements.push(this.#db.prepare("INSERT INTO mail_form_field_policies(mail_form_id,field_id,privacy_class,include_owner_notification,include_auto_reply,created_at) VALUES(?,?,?,?,?,?)").bind(p.mailFormId, p.fieldId, p.privacyClass, p.includeInOwnerNotification ? 1 : 0, p.includeInAutoReply ? 1 : 0, p.createdAt));
    try {
      await this.#db.batch(statements);
    } catch (error) {
      throw translate(error);
    }
  }
  async getForm(id) {
    const row = await this.#db.prepare("SELECT * FROM mail_forms WHERE id=?").bind(id).first();
    return row ? mapForm(row) : null;
  }
  async getFormByContentItem(id) {
    const row = await this.#db.prepare("SELECT * FROM mail_forms WHERE content_item_id=?").bind(id).first();
    return row ? mapForm(row) : null;
  }
  async listForms(siteId) {
    return (await this.#db.prepare("SELECT * FROM mail_forms WHERE site_id=? ORDER BY created_at").bind(siteId).all()).results.map(mapForm);
  }
  async listFieldPolicies(id) {
    return (await this.#db.prepare("SELECT * FROM mail_form_field_policies WHERE mail_form_id=?").bind(id).all()).results.map(mapPolicy);
  }
  async createConfirmation(s) {
    await this.#db.prepare("INSERT INTO mail_confirmation_sessions(id,mail_form_id,schema_version,values_json,values_hash,client_fingerprint_hash,expires_at,used_at,created_at) VALUES(?,?,?,?,?,?,?,?,?)").bind(s.id, s.mailFormId, s.schemaVersion, JSON.stringify(s.values), s.valuesHash, s.clientFingerprintHash, s.expiresAt, s.usedAt, s.createdAt).run();
  }
  async getConfirmation(id) {
    const row = await this.#db.prepare("SELECT * FROM mail_confirmation_sessions WHERE id=?").bind(id).first();
    return row ? mapConfirmation(row) : null;
  }
  async acceptSubmission(input) {
    const s = input.submission;
    const statements = [this.#db.prepare("INSERT INTO mail_submissions(id,mail_form_id,confirmation_id,schema_version,payload_hash,payload_state,client_fingerprint_hash,received_at,purge_at,state) VALUES(?,?,?,?,?,?,?,?,?,?)").bind(s.id, s.mailFormId, s.confirmationId, s.schemaVersion, s.payloadHash, s.payloadState, s.clientFingerprintHash, s.receivedAt, s.purgeAt, s.state), this.#db.prepare("INSERT INTO mail_submission_payloads(submission_id,values_json,created_at) VALUES(?,?,?)").bind(input.payload.submissionId, JSON.stringify(input.payload.values), input.payload.createdAt)];
    for (const n of input.notifications)
      statements.push(this.#db.prepare("INSERT INTO mail_notification_outbox(id,submission_id,notification_kind,recipient,subject,state,attempts,available_at,sent_at,last_error) VALUES(?,?,?,?,?,?,?,?,?,?)").bind(n.id, n.submissionId, n.kind, n.recipient, n.subject, n.state, n.attempts, n.availableAt, n.sentAt, n.lastError));
    try {
      await this.#db.batch(statements);
    } catch (error) {
      throw translate(error);
    }
    return s;
  }
  async getSubmission(id) {
    const row = await this.#db.prepare("SELECT s.*,p.values_json FROM mail_submissions s LEFT JOIN mail_submission_payloads p ON p.submission_id=s.id WHERE s.id=?").bind(id).first();
    return row ? mapSubmissionView(row) : null;
  }
  async listSubmissions(id) {
    return (await this.#db.prepare("SELECT s.*,p.values_json FROM mail_submissions s LEFT JOIN mail_submission_payloads p ON p.submission_id=s.id WHERE s.mail_form_id=? ORDER BY s.received_at DESC").bind(id).all()).results.map(mapSubmissionView);
  }
  async purgeSubmission(id, now) {
    try {
      await this.#db.batch([this.#db.prepare("DELETE FROM mail_submission_payloads WHERE submission_id=?").bind(id), this.#db.prepare("UPDATE mail_submissions SET payload_state='purged' WHERE id=?").bind(id)]);
    } catch (error) {
      throw translate(error);
    }
    const view = await this.getSubmission(id);
    if (!view)
      throw new DomainError("MAIL_SUBMISSION_NOT_FOUND", "Submission not found", 404);
    return view.submission;
  }
  async listPendingNotifications(limit, now) {
    return (await this.#db.prepare("SELECT * FROM mail_notification_outbox WHERE state='pending' AND available_at<=? ORDER BY available_at LIMIT ?").bind(now, limit).all()).results.map(mapNotification);
  }
  async getNotification(id) {
    const row = await this.#db.prepare("SELECT * FROM mail_notification_outbox WHERE id=?").bind(id).first();
    return row ? mapNotification(row) : null;
  }
  async listNotificationsForSubmission(id) {
    return (await this.#db.prepare("SELECT * FROM mail_notification_outbox WHERE submission_id=? ORDER BY id").bind(id).all()).results.map(mapNotification);
  }
  async updateNotification(n) {
    await this.#db.prepare("UPDATE mail_notification_outbox SET state=?,attempts=?,available_at=?,sent_at=?,last_error=? WHERE id=?").bind(n.state, n.attempts, n.availableAt, n.sentAt, n.lastError, n.id).run();
  }
  async updateSubmissionState(id, state) {
    await this.#db.prepare("UPDATE mail_submissions SET state=? WHERE id=?").bind(state, id).run();
  }
}
function mapForm(r) {
  return { id: asMailFormId(r.id), workspaceId: r.workspace_id, siteId: asSiteId(r.site_id), contentItemId: asContentItemId(r.content_item_id), tableId: asCustomTableId(r.table_id), recipientEmails: JSON.parse(r.recipient_emails_json), senderAddress: r.sender_address, subjectTemplate: r.subject_template, autoReplyEnabled: Boolean(r.auto_reply_enabled), autoReplyEmailFieldKey: r.auto_reply_email_field_key, autoReplySubject: r.auto_reply_subject, confirmationTtlSeconds: r.confirmation_ttl_seconds, retentionDays: r.retention_days, turnstileRequired: Boolean(r.turnstile_required), state: r.state, createdAt: r.created_at, updatedAt: r.updated_at };
}
function mapPolicy(r) {
  return { mailFormId: asMailFormId(r.mail_form_id), fieldId: asCustomFieldId(r.field_id), privacyClass: r.privacy_class, includeInOwnerNotification: Boolean(r.include_owner_notification), includeInAutoReply: Boolean(r.include_auto_reply), createdAt: r.created_at };
}
function mapConfirmation(r) {
  return { id: asMailConfirmationId(r.id), mailFormId: asMailFormId(r.mail_form_id), schemaVersion: r.schema_version, values: JSON.parse(r.values_json), valuesHash: r.values_hash, clientFingerprintHash: r.client_fingerprint_hash, expiresAt: r.expires_at, usedAt: r.used_at, createdAt: r.created_at };
}
function mapSubmissionView(r) {
  return { submission: { id: asMailSubmissionId(r.id), mailFormId: asMailFormId(r.mail_form_id), confirmationId: asMailConfirmationId(r.confirmation_id), schemaVersion: r.schema_version, payloadHash: r.payload_hash, payloadState: r.payload_state, clientFingerprintHash: r.client_fingerprint_hash, receivedAt: r.received_at, purgeAt: r.purge_at, state: r.state }, values: r.values_json ? JSON.parse(r.values_json) : null, redacted: false };
}
function mapNotification(r) {
  return { id: asMailNotificationId(r.id), submissionId: asMailSubmissionId(r.submission_id), kind: r.notification_kind, recipient: r.recipient, subject: r.subject, state: r.state, attempts: r.attempts, availableAt: r.available_at, sentAt: r.sent_at, lastError: r.last_error };
}
function translate(error) {
  const m = error instanceof Error ? error.message : String(error);
  if (m.includes("MAIL_CONFIRMATION_INVALID_OR_USED"))
    return new DomainError("MAIL_CONFIRMATION_USED", "Confirmation is invalid, expired, or already used", 409);
  if (m.includes("MAIL_FORM_INVALID_BINDING"))
    return new DomainError("MAIL_FORM_INVALID_BINDING", "Mail form binding is invalid", 422);
  return new DomainError("D1_MAIL_FORM_ERROR", m, 500);
}
class D1ThemeStore {
  #db;
  constructor(db) {
    this.#db = db;
  }
  async createTheme(theme) {
    await this.#db.prepare("INSERT INTO themes(id,workspace_id,theme_key,name,description,state,created_by,created_at) VALUES(?,?,?,?,?,?,?,?)").bind(theme.id, theme.workspaceId, theme.key, theme.name, theme.description, theme.state, theme.createdBy, theme.createdAt).run();
  }
  async getTheme(id) {
    const row = await this.#db.prepare("SELECT * FROM themes WHERE id=?").bind(id).first();
    return row ? mapTheme(row) : null;
  }
  async listThemes(workspaceId) {
    return (await this.#db.prepare("SELECT * FROM themes WHERE workspace_id=? ORDER BY created_at DESC").bind(workspaceId).all()).results.map(mapTheme);
  }
  async createTokenRevision(revision) {
    await this.#db.prepare("INSERT INTO design_token_revisions(id,theme_id,revision_number,name,tokens_json,content_hash,created_by,created_at) VALUES(?,?,?,?,?,?,?,?)").bind(revision.id, revision.themeId, revision.revisionNumber, revision.name, JSON.stringify(revision.tokens), revision.contentHash, revision.createdBy, revision.createdAt).run();
  }
  async getTokenRevision(id) {
    const row = await this.#db.prepare("SELECT * FROM design_token_revisions WHERE id=?").bind(id).first();
    return row ? mapToken(row) : null;
  }
  async countTokenRevisions(themeId) {
    const row = await this.#db.prepare("SELECT COUNT(*) AS count FROM design_token_revisions WHERE theme_id=?").bind(themeId).first();
    return Number(row?.count ?? 0);
  }
  async createLayoutRevision(revision) {
    await this.#db.prepare("INSERT INTO layout_revisions(id,theme_id,revision_number,name,layout_json,content_hash,created_by,created_at) VALUES(?,?,?,?,?,?,?,?)").bind(revision.id, revision.themeId, revision.revisionNumber, revision.name, JSON.stringify(revision.layout), revision.contentHash, revision.createdBy, revision.createdAt).run();
  }
  async getLayoutRevision(id) {
    const row = await this.#db.prepare("SELECT * FROM layout_revisions WHERE id=?").bind(id).first();
    return row ? mapLayout(row) : null;
  }
  async countLayoutRevisions(themeId) {
    const row = await this.#db.prepare("SELECT COUNT(*) AS count FROM layout_revisions WHERE theme_id=?").bind(themeId).first();
    return Number(row?.count ?? 0);
  }
  async createRelease(release) {
    await this.#db.prepare("INSERT INTO theme_releases(id,theme_id,version,design_token_revision_id,layout_revision_id,manifest_json,release_hash,state,created_by,created_at) VALUES(?,?,?,?,?,?,?,?,?,?)").bind(release.id, release.themeId, release.version, release.designTokenRevisionId, release.layoutRevisionId, JSON.stringify(release.manifest), release.releaseHash, release.state, release.createdBy, release.createdAt).run();
  }
  async getRelease(id) {
    const row = await this.#db.prepare("SELECT * FROM theme_releases WHERE id=?").bind(id).first();
    return row ? mapRelease(row) : null;
  }
  async listReleases(themeId) {
    return (await this.#db.prepare("SELECT * FROM theme_releases WHERE theme_id=? ORDER BY created_at DESC").bind(themeId).all()).results.map(mapRelease);
  }
  async activate(activation) {
    await this.#db.batch([
      this.#db.prepare("UPDATE site_theme_activations SET deactivated_at=? WHERE site_id=? AND deactivated_at IS NULL").bind(activation.activatedAt, activation.siteId),
      this.#db.prepare("INSERT INTO site_theme_activations(id,site_id,theme_release_id,activated_by,activated_at,deactivated_at) VALUES(?,?,?,?,?,NULL)").bind(activation.id, activation.siteId, activation.themeReleaseId, activation.activatedBy, activation.activatedAt)
    ]);
  }
  async getActiveActivation(siteId) {
    const row = await this.#db.prepare("SELECT * FROM site_theme_activations WHERE site_id=? AND deactivated_at IS NULL ORDER BY activated_at DESC LIMIT 1").bind(siteId).first();
    return row ? mapActivation(row) : null;
  }
}
function mapTheme(r) {
  return { id: asThemeId(r.id), workspaceId: r.workspace_id, key: r.theme_key, name: r.name, description: r.description, state: r.state, createdBy: asPrincipalId(r.created_by), createdAt: r.created_at };
}
function mapToken(r) {
  return { id: asDesignTokenRevisionId(r.id), themeId: asThemeId(r.theme_id), revisionNumber: r.revision_number, name: r.name, tokens: JSON.parse(r.tokens_json), contentHash: r.content_hash, createdBy: asPrincipalId(r.created_by), createdAt: r.created_at };
}
function mapLayout(r) {
  return { id: asLayoutRevisionId(r.id), themeId: asThemeId(r.theme_id), revisionNumber: r.revision_number, name: r.name, layout: JSON.parse(r.layout_json), contentHash: r.content_hash, createdBy: asPrincipalId(r.created_by), createdAt: r.created_at };
}
function mapRelease(r) {
  return { id: asThemeReleaseId(r.id), themeId: asThemeId(r.theme_id), version: r.version, designTokenRevisionId: asDesignTokenRevisionId(r.design_token_revision_id), layoutRevisionId: asLayoutRevisionId(r.layout_revision_id), manifest: JSON.parse(r.manifest_json), releaseHash: r.release_hash, state: r.state, createdBy: asPrincipalId(r.created_by), createdAt: r.created_at };
}
function mapActivation(r) {
  return { id: asThemeActivationId(r.id), siteId: asSiteId(r.site_id), themeReleaseId: asThemeReleaseId(r.theme_release_id), activatedBy: asPrincipalId(r.activated_by), activatedAt: r.activated_at, deactivatedAt: r.deactivated_at };
}
class D1CmsStore {
  #db;
  constructor(db) {
    this.#db = db;
  }
  async bootstrap(input) {
    await this.#batch([
      this.#db.prepare("INSERT INTO workspaces(id,name,created_at) VALUES(?,?,?)").bind(input.workspace.id, input.workspace.name, input.workspace.createdAt),
      this.#db.prepare("INSERT INTO principals(id,workspace_id,principal_type,display_name,state,created_at) VALUES(?,?,?,?,?,?)").bind(input.owner.id, input.owner.workspaceId, input.owner.type, input.owner.displayName, input.owner.state, input.owner.createdAt),
      this.#db.prepare("INSERT INTO sites(id,workspace_id,name,hostname,locale,state,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?)").bind(input.site.id, input.site.workspaceId, input.site.name, input.site.hostname, input.site.locale, input.site.state, input.site.createdAt, input.site.updatedAt),
      this.#grantStatement(input.ownerGrant, input.workspace.createdAt),
      this.#db.prepare("INSERT INTO content_types(id,workspace_id,type_key,title,capabilities_json,state,created_at) VALUES(?,?,?,?,?,?,?)").bind(`ctype_${crypto.randomUUID()}`, input.workspace.id, "folder", "フォルダ", JSON.stringify(["routable", "container"]), "active", input.workspace.createdAt),
      this.#db.prepare("INSERT INTO content_types(id,workspace_id,type_key,title,capabilities_json,state,created_at) VALUES(?,?,?,?,?,?,?)").bind(`ctype_${crypto.randomUUID()}`, input.workspace.id, "page", "固定ページ", JSON.stringify(["routable", "documentEditable", "searchable", "schedulable"]), "active", input.workspace.createdAt),
      this.#db.prepare("INSERT INTO content_types(id,workspace_id,type_key,title,capabilities_json,state,created_at) VALUES(?,?,?,?,?,?,?)").bind(`ctype_${crypto.randomUUID()}`, input.workspace.id, "alias", "エイリアス", JSON.stringify(["routable", "reference"]), "active", input.workspace.createdAt),
      this.#db.prepare("INSERT INTO content_types(id,workspace_id,type_key,title,capabilities_json,state,created_at) VALUES(?,?,?,?,?,?,?)").bind(`ctype_${crypto.randomUUID()}`, input.workspace.id, "blog", "ブログ", JSON.stringify(["routable", "container", "documentEditable", "collectable", "feedable"]), "active", input.workspace.createdAt),
      this.#db.prepare("INSERT INTO content_types(id,workspace_id,type_key,title,capabilities_json,state,created_at) VALUES(?,?,?,?,?,?,?)").bind(`ctype_${crypto.randomUUID()}`, input.workspace.id, "article", "記事", JSON.stringify(["routable", "documentEditable", "collectable", "taxonomizable", "searchable", "schedulable", "feedable"]), "active", input.workspace.createdAt),
      this.#db.prepare("INSERT INTO content_types(id,workspace_id,type_key,title,capabilities_json,state,created_at) VALUES(?,?,?,?,?,?,?)").bind(`ctype_${crypto.randomUUID()}`, input.workspace.id, "mail-form", "メールフォーム", JSON.stringify(["routable", "documentEditable", "submittable"]), "active", input.workspace.createdAt)
    ]);
  }
  async createPrincipal(principal) {
    await this.#db.prepare("INSERT INTO principals(id,workspace_id,principal_type,display_name,state,created_at) VALUES(?,?,?,?,?,?)").bind(principal.id, principal.workspaceId, principal.type, principal.displayName, principal.state, principal.createdAt).run();
  }
  async getPrincipal(id) {
    const row = await this.#db.prepare("SELECT * FROM principals WHERE id=?").bind(id).first();
    return row ? mapPrincipal(row) : null;
  }
  async createCapabilityGrant(grant) {
    await this.#grantStatement(grant, Date.now()).run();
  }
  async createDelegationGrant(grant) {
    await this.#db.prepare("INSERT INTO delegation_grants(id,human_principal_id,agent_principal_id,capabilities_json,scope_json,maximum_risk,expires_at,revoked_at,created_at) VALUES(?,?,?,?,?,?,?,?,?)").bind(grant.id, grant.humanPrincipalId, grant.agentPrincipalId, JSON.stringify(grant.capabilities), JSON.stringify(grant.scope), grant.maximumRisk, grant.expiresAt, grant.revokedAt ?? null, Date.now()).run();
  }
  async listCapabilityGrants(principalId) {
    return (await this.#db.prepare("SELECT * FROM capability_grants WHERE principal_id=?").bind(principalId).all()).results.map(mapGrant);
  }
  async getDelegationGrant(id) {
    const row = await this.#db.prepare("SELECT * FROM delegation_grants WHERE id=?").bind(id).first();
    return row ? mapDelegation(row) : null;
  }
  async createPage(input) {
    return this.#createRoutable(input, "page", "canonical");
  }
  async createFolder(input) {
    return this.#createRoutable(input, "folder", "canonical");
  }
  async createBlog(input) {
    return this.#createRoutable(input, "blog", "canonical");
  }
  async createCustomContent(input) {
    return this.#createRoutable(input, "custom-content", "canonical");
  }
  async createMailForm(input) {
    return this.#createRoutable(input, "mail-form", "canonical");
  }
  async createArticle(input) {
    return this.#createRoutable(input, "article", "canonical");
  }
  async createAlias(input) {
    const target = await this.#requireSnapshot(input.targetContentItemId);
    assertDomain(target.item.siteId === input.siteId, "CROSS_SITE_ALIAS", "Alias target belongs to another site", 422);
    assertDomain(target.item.state === "active", "ALIAS_TARGET_INACTIVE", "Alias target is not active", 409);
    assertDomain(target.item.contentTypeKey !== "folder" && target.item.contentTypeKey !== "alias", "INVALID_ALIAS_TARGET", "Aliases can target publishable content only", 422);
    return this.#createRoutable(input, "alias", "alias", input.targetContentItemId);
  }
  async getNode(id) {
    const row = await this.#db.prepare("SELECT * FROM content_nodes WHERE id=?").bind(id).first();
    return row ? mapNode(row) : null;
  }
  async getContentSnapshot(contentItemId) {
    const itemRow = await this.#db.prepare("SELECT * FROM content_items WHERE id=?").bind(contentItemId).first();
    if (!itemRow)
      return null;
    const nodeRow = await this.#db.prepare("SELECT * FROM content_nodes WHERE content_item_id=?").bind(contentItemId).first();
    const routeRow = await this.#db.prepare("SELECT * FROM routes WHERE content_item_id=? AND active=1 AND is_canonical=1 ORDER BY activated_at DESC LIMIT 1").bind(contentItemId).first();
    assertDomain(nodeRow && routeRow, "CONTENT_PROJECTION_MISSING", "Content node or route is missing", 500);
    const item = mapItem(itemRow);
    return {
      item,
      node: mapNode(nodeRow),
      route: mapRoute(routeRow),
      workingRevision: item.workingRevisionId ? await this.getRevision(item.workingRevisionId) : null,
      publishedRevision: item.publishedRevisionId ? await this.getRevision(item.publishedRevisionId) : null
    };
  }
  async getRevision(revisionId) {
    const row = await this.#db.prepare("SELECT r.*,d.document_json FROM content_revisions r JOIN revision_documents d ON d.revision_id=r.id WHERE r.id=?").bind(revisionId).first();
    return row ? mapRevision(row) : null;
  }
  async commitRevision(input) {
    const snapshot = await this.#requireSnapshot(input.contentItemId);
    assertDomain(snapshot.item.state === "active", "CONTENT_TRASHED", "Trashed content cannot be revised", 409);
    assertDomain(snapshot.item.contentTypeKey !== "folder" && snapshot.item.contentTypeKey !== "alias", "CONTENT_NOT_EDITABLE", "This content type does not accept document revisions", 422);
    const previous = await this.getRevision(input.baseRevisionId);
    assertDomain(previous, "REVISION_NOT_FOUND", "Base revision not found", 404);
    const revisionId = asRevisionId(newId("revision"));
    const documentJson = JSON.stringify(input.document);
    await this.#batch([
      this.#db.prepare("INSERT INTO content_revisions(id,content_item_id,revision_number,based_on_revision_id,expected_lock_version,fields_json,content_hash,created_by,agent_run_id,change_summary,created_at) VALUES(?,?,?,?,?,?,?,?,?,?,?)").bind(revisionId, input.contentItemId, previous.revisionNumber + 1, input.baseRevisionId, input.expectedLockVersion, JSON.stringify(input.fields), input.contentHash, input.actor.actorId, input.agentRunId, input.changeSummary, input.now),
      this.#db.prepare("INSERT INTO revision_documents(revision_id,format_version,document_json,byte_size,document_hash) VALUES(?,?,?,?,?)").bind(revisionId, input.document.formatVersion, documentJson, new TextEncoder().encode(documentJson).byteLength, input.contentHash),
      ...this.#assetReferenceStatements(revisionId, input.document),
      this.#auditStatement(createAudit(input.actor, snapshot.item.workspaceId, snapshot.item.siteId, "content.revise", "content-item", input.contentItemId, revisionId, input.now, "content.revise", { basedOnRevisionId: input.baseRevisionId }))
    ]);
    const revision = await this.getRevision(revisionId);
    assertDomain(revision, "REVISION_WRITE_FAILED", "Revision could not be read after commit", 500);
    return revision;
  }
  async relocateContent(input) {
    const snapshot = await this.#requireSnapshot(input.contentItemId);
    assertDomain(snapshot.item.state === "active", "CONTENT_TRASHED", "Trashed content cannot be moved", 409);
    const parent = input.targetParentId ? await this.#requireParentForType(input.targetParentId, snapshot.item.siteId, snapshot.item.contentTypeKey) : null;
    assertDomain(!parent || !parent.cachedPath.startsWith(`${snapshot.node.cachedPath}/`), "TREE_CYCLE", "Content cannot be moved below itself", 422);
    const site = await this.#requireSite(snapshot.item.siteId);
    const oldRoot = snapshot.node.cachedPath;
    const newRoot = childPath(parent?.cachedPath ?? null, input.newSlug);
    await this.#assertRouteAvailable(snapshot.item.siteId, site.hostname, newRoot, snapshot.item.id);
    const rows = (await this.#db.prepare("SELECT * FROM content_nodes WHERE site_id=? AND (cached_path=? OR cached_path LIKE ?) ORDER BY length(cached_path)").bind(snapshot.item.siteId, oldRoot, `${oldRoot}/%`).all()).results;
    const statements = [this.#treeGuard(snapshot.node.id, input.expectedTreeVersion, input.now)];
    for (const row of rows) {
      const node = mapNode(row);
      const suffix = node.cachedPath.slice(oldRoot.length);
      const newPath = normalizePath(`${newRoot}${suffix}`);
      await this.#assertRouteAvailable(snapshot.item.siteId, site.hostname, newPath, node.contentItemId);
      const routeRow = await this.#activeRouteRow(node.contentItemId);
      const itemRow = await this.#requireItemRow(node.contentItemId);
      const replacementId = newId("route");
      if (node.id === snapshot.node.id) {
        statements.push(this.#db.prepare("UPDATE content_nodes SET parent_id=?,slug=?,cached_path=?,tree_version=tree_version+1,updated_at=? WHERE id=?").bind(input.targetParentId, input.newSlug, newPath, input.now, node.id));
      } else {
        statements.push(this.#db.prepare("UPDATE content_nodes SET cached_path=?,tree_version=tree_version+1,updated_at=? WHERE id=?").bind(newPath, input.now, node.id));
      }
      statements.push(this.#db.prepare("UPDATE routes SET active=0,deactivated_at=? WHERE id=?").bind(input.now, routeRow.id));
      statements.push(this.#retireRedirectStatement(snapshot.item.siteId, site.hostname, newPath));
      statements.push(this.#routeInsert(replacementId, snapshot.item.siteId, node.contentItemId, site.hostname, newPath, itemRow.content_type_key === "alias" ? "alias" : "canonical", input.now));
      statements.push(this.#db.prepare("INSERT INTO redirects(id,site_id,source_hostname,source_path,target_route_id,status_code,active,created_at) VALUES(?,?,?,?,?,301,1,?)").bind(newId("redirect"), snapshot.item.siteId, site.hostname, routeRow.path, replacementId, input.now));
    }
    statements.push(this.#db.prepare("DELETE FROM tree_move_guards WHERE node_id=?").bind(snapshot.node.id));
    statements.push(this.#auditStatement(createAudit(input.actor, snapshot.item.workspaceId, snapshot.item.siteId, "content.move", "content-item", input.contentItemId, snapshot.item.workingRevisionId, input.now, "content.move", { oldPath: oldRoot, newPath: newRoot, affectedCount: rows.length })));
    await this.#batch(statements);
    return this.#requireSnapshot(input.contentItemId);
  }
  async reorderContent(input) {
    const snapshot = await this.#requireSnapshot(input.contentItemId);
    assertDomain(snapshot.item.state === "active", "CONTENT_TRASHED", "Trashed content cannot be reordered", 409);
    if (snapshot.node.parentId !== input.targetParentId) {
      await this.relocateContent({
        actor: input.actor,
        contentItemId: input.contentItemId,
        targetParentId: input.targetParentId,
        newSlug: snapshot.node.slug,
        expectedTreeVersion: input.expectedTreeVersion,
        now: input.now
      });
    } else {
      await this.#batch([this.#treeGuard(snapshot.node.id, input.expectedTreeVersion, input.now)]);
    }
    const fresh = await this.#requireSnapshot(input.contentItemId);
    const parentClause = input.targetParentId === null ? "parent_id IS NULL" : "parent_id = ?";
    const siblingRows = (await this.#db.prepare(`SELECT * FROM content_nodes WHERE site_id=? AND ${parentClause} AND content_item_id != ?`).bind(...input.targetParentId === null ? [fresh.item.siteId, fresh.item.id] : [fresh.item.siteId, input.targetParentId, fresh.item.id]).all()).results.map(mapNode).sort((a, b) => compareSortKeys(a.sortKey, b.sortKey));
    if (input.insertAfterContentItemId) {
      assertDomain(siblingRows.some((row) => row.contentItemId === input.insertAfterContentItemId), "INSERT_AFTER_NOT_FOUND", "insertAfterContentItemId is not a sibling under the target parent", 422);
    }
    const ordered = [];
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
    const statements = [
      this.#db.prepare("DELETE FROM tree_move_guards WHERE node_id=?").bind(moving.id)
    ];
    for (const [index2, node] of ordered.entries()) {
      const sortKey = buildSortKey(index2 + 1, node.contentItemId);
      if (node.id === moving.id) {
        statements.push(this.#db.prepare("UPDATE content_nodes SET sort_key=?,tree_version=tree_version+1,updated_at=? WHERE id=?").bind(sortKey, input.now, node.id));
      } else {
        statements.push(this.#db.prepare("UPDATE content_nodes SET sort_key=?,updated_at=? WHERE id=?").bind(sortKey, input.now, node.id));
      }
    }
    statements.push(this.#auditStatement(createAudit(input.actor, fresh.item.workspaceId, fresh.item.siteId, "content.reorder", "content-item", fresh.item.id, fresh.item.workingRevisionId, input.now, "content.reorder", {
      targetParentId: input.targetParentId,
      insertAfterContentItemId: input.insertAfterContentItemId
    })));
    await this.#batch(statements);
    return this.#requireSnapshot(input.contentItemId);
  }
  async copyContent(input) {
    const source = await this.#requireSnapshot(input.contentItemId);
    assertDomain(source.item.state === "active", "CONTENT_TRASHED", "Trashed content cannot be copied", 409);
    const parent = input.targetParentId ? await this.#requireParentForType(input.targetParentId, source.item.siteId, source.item.contentTypeKey) : null;
    const site = await this.#requireSite(source.item.siteId);
    const newRootPath = childPath(parent?.cachedPath ?? null, input.newSlug);
    await this.#assertRouteAvailable(source.item.siteId, site.hostname, newRootPath);
    const nodes = input.includeDescendants ? (await this.#db.prepare("SELECT * FROM content_nodes WHERE site_id=? AND (cached_path=? OR cached_path LIKE ?) ORDER BY length(cached_path)").bind(source.item.siteId, source.node.cachedPath, `${source.node.cachedPath}/%`).all()).results : [await this.#requireNodeRow(source.node.id)];
    const itemIds = /* @__PURE__ */ new Map();
    const nodeIds = /* @__PURE__ */ new Map();
    for (const node of nodes) {
      itemIds.set(node.content_item_id, asContentItemId(newId("content")));
      nodeIds.set(node.id, asContentNodeId(newId("node")));
    }
    const statements = [this.#treeGuard(source.node.id, input.expectedTreeVersion, input.now)];
    const copiedIds = [];
    for (const nodeRow of nodes) {
      const oldItem = await this.#requireItemRow(asContentItemId(nodeRow.content_item_id));
      const newItemId = itemIds.get(oldItem.id);
      const newNodeId = nodeIds.get(nodeRow.id);
      copiedIds.push(newItemId);
      const suffix = nodeRow.cached_path.slice(source.node.cachedPath.length);
      const newPath = normalizePath(`${newRootPath}${suffix}`);
      await this.#assertRouteAvailable(source.item.siteId, site.hostname, newPath);
      const revision = oldItem.working_revision_id ? await this.#requireRevisionRow(asRevisionId(oldItem.working_revision_id)) : null;
      statements.push(this.#db.prepare("INSERT INTO content_items(id,workspace_id,site_id,content_type_key,working_revision_id,published_revision_id,lock_version,state,created_by,created_at,updated_at) VALUES(?,?,?,?,NULL,NULL,0,'active',?,?,?)").bind(newItemId, oldItem.workspace_id, oldItem.site_id, oldItem.content_type_key, input.actor.actorId, input.now, input.now));
      if (revision) {
        const newRevisionId = asRevisionId(newId("revision"));
        statements.push(this.#db.prepare("INSERT INTO content_revisions(id,content_item_id,revision_number,based_on_revision_id,expected_lock_version,fields_json,content_hash,created_by,agent_run_id,change_summary,created_at) VALUES(?,?,1,NULL,0,?,?,?,?,?,?)").bind(newRevisionId, newItemId, revision.fields_json, revision.content_hash, input.actor.actorId, null, `Copied from ${oldItem.id}`, input.now));
        statements.push(this.#db.prepare("INSERT INTO revision_documents(revision_id,format_version,document_json,byte_size,document_hash) VALUES(?,?,?,?,?)").bind(newRevisionId, revision.format_version, revision.document_json, revision.byte_size, revision.document_hash));
        statements.push(...this.#assetReferenceStatements(newRevisionId, JSON.parse(revision.document_json)));
      }
      const parentId = nodeRow.id === source.node.id ? input.targetParentId : nodeIds.get(nodeRow.parent_id ?? "") ?? null;
      statements.push(this.#db.prepare("INSERT INTO content_nodes(id,site_id,content_item_id,parent_id,slug,sort_key,cached_path,tree_version,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?,?,?)").bind(newNodeId, source.item.siteId, newItemId, parentId, nodeRow.id === source.node.id ? input.newSlug : nodeRow.slug, `${input.now}:${newItemId}`, newPath, 1, input.now, input.now));
      statements.push(this.#retireRedirectStatement(source.item.siteId, site.hostname, newPath));
      statements.push(this.#routeInsert(newId("route"), source.item.siteId, newItemId, site.hostname, newPath, oldItem.content_type_key === "alias" ? "alias" : "canonical", input.now));
      const alias = await this.#db.prepare("SELECT * FROM content_aliases WHERE alias_content_item_id=?").bind(oldItem.id).first();
      if (alias) {
        statements.push(this.#db.prepare("INSERT INTO content_aliases(alias_content_item_id,target_content_item_id,created_at) VALUES(?,?,?)").bind(newItemId, itemIds.get(alias.target_content_item_id) ?? alias.target_content_item_id, input.now));
      }
    }
    statements.push(this.#db.prepare("DELETE FROM tree_move_guards WHERE node_id=?").bind(source.node.id));
    const rootId = itemIds.get(source.item.id);
    statements.push(this.#auditStatement(createAudit(input.actor, source.item.workspaceId, source.item.siteId, "content.copy", "content-item", source.item.id, source.item.workingRevisionId, input.now, "content.copy", { copiedRootId: rootId, copiedCount: copiedIds.length, includeDescendants: input.includeDescendants })));
    await this.#batch(statements);
    return { root: await this.#requireSnapshot(rootId), copiedContentIds: copiedIds };
  }
  async trashContent(input) {
    const source = await this.#requireSnapshot(input.contentItemId);
    assertDomain(source.item.state === "active", "ALREADY_TRASHED", "Content is already in trash", 409);
    const site = await this.#requireSite(source.item.siteId);
    const rows = (await this.#db.prepare("SELECT n.*,i.content_type_key FROM content_nodes n JOIN content_items i ON i.id=n.content_item_id WHERE n.site_id=? AND (n.cached_path=? OR n.cached_path LIKE ?) ORDER BY length(n.cached_path)").bind(source.item.siteId, source.node.cachedPath, `${source.node.cachedPath}/%`).all()).results;
    const hiddenRoot = `/_baser/trash/${source.item.id}`;
    const statements = [this.#treeGuard(source.node.id, input.expectedTreeVersion, input.now)];
    for (const row of rows) {
      const suffix = row.cached_path.slice(source.node.cachedPath.length);
      const hiddenPath = normalizePath(`${hiddenRoot}${suffix}`);
      statements.push(this.#db.prepare("INSERT INTO trash_entries(content_item_id,root_content_item_id,previous_parent_id,previous_slug,previous_path,trashed_by,trashed_at) VALUES(?,?,?,?,?,?,?)").bind(row.content_item_id, source.item.id, row.parent_id, row.slug, row.cached_path, input.actor.actorId, input.now));
      statements.push(this.#db.prepare("UPDATE content_items SET state='trashed',updated_at=? WHERE id=?").bind(input.now, row.content_item_id));
      if (row.id === source.node.id) {
        statements.push(this.#db.prepare("UPDATE content_nodes SET parent_id=NULL,slug=?,cached_path=?,tree_version=tree_version+1,updated_at=? WHERE id=?").bind(`trash-${source.item.id}`, hiddenPath, input.now, row.id));
      } else {
        statements.push(this.#db.prepare("UPDATE content_nodes SET cached_path=?,tree_version=tree_version+1,updated_at=? WHERE id=?").bind(hiddenPath, input.now, row.id));
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
  async restoreContent(input) {
    const source = await this.#requireSnapshot(input.contentItemId);
    assertDomain(source.item.state === "trashed", "CONTENT_NOT_TRASHED", "Content is not in trash", 409);
    const rootTrash = await this.#db.prepare("SELECT * FROM trash_entries WHERE content_item_id=?").bind(input.contentItemId).first();
    assertDomain(rootTrash, "TRASH_RECORD_NOT_FOUND", "Trash metadata not found", 404);
    assertDomain(rootTrash.root_content_item_id === input.contentItemId, "RESTORE_ROOT_REQUIRED", "Restore the root of the trashed subtree", 409);
    let parent = null;
    const parentId = input.targetParentId ?? (rootTrash.previous_parent_id ? asContentNodeId(rootTrash.previous_parent_id) : null);
    if (parentId) {
      try {
        parent = await this.#requireParentForType(parentId, source.item.siteId, source.item.contentTypeKey);
      } catch (error) {
        if (input.targetParentId)
          throw error;
        parent = null;
      }
    }
    const site = await this.#requireSite(source.item.siteId);
    const restoredSlug = input.newSlug ?? rootTrash.previous_slug;
    const newRootPath = childPath(parent?.cachedPath ?? null, restoredSlug);
    const trashRows = (await this.#db.prepare("SELECT t.*,i.content_type_key,n.id AS node_id FROM trash_entries t JOIN content_items i ON i.id=t.content_item_id JOIN content_nodes n ON n.content_item_id=t.content_item_id WHERE t.root_content_item_id=? ORDER BY length(t.previous_path)").bind(input.contentItemId).all()).results;
    for (const row of trashRows) {
      const suffix = row.previous_path.slice(rootTrash.previous_path.length);
      await this.#assertRouteAvailable(source.item.siteId, site.hostname, normalizePath(`${newRootPath}${suffix}`));
    }
    const statements = [this.#treeGuard(source.node.id, input.expectedTreeVersion, input.now)];
    for (const row of trashRows) {
      const suffix = row.previous_path.slice(rootTrash.previous_path.length);
      const newPath = normalizePath(`${newRootPath}${suffix}`);
      statements.push(this.#db.prepare("UPDATE routes SET active=0,deactivated_at=? WHERE content_item_id=? AND active=1").bind(input.now, row.content_item_id));
      statements.push(this.#db.prepare("UPDATE content_items SET state='active',updated_at=? WHERE id=?").bind(input.now, row.content_item_id));
      if (row.content_item_id === input.contentItemId) {
        statements.push(this.#db.prepare("UPDATE content_nodes SET parent_id=?,slug=?,cached_path=?,tree_version=tree_version+1,updated_at=? WHERE id=?").bind(parent?.id ?? null, restoredSlug, newPath, input.now, row.node_id));
      } else {
        statements.push(this.#db.prepare("UPDATE content_nodes SET slug=?,cached_path=?,tree_version=tree_version+1,updated_at=? WHERE id=?").bind(row.previous_slug, newPath, input.now, row.node_id));
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
  async listContentTree(siteId) {
    const ids = (await this.#db.prepare("SELECT id FROM content_items WHERE site_id=? AND state='active'").bind(siteId).all()).results;
    const entries = await Promise.all(ids.map((row) => this.#managerEntry(asContentItemId(row.id))));
    return entries.sort((a, b) => compareSortKeys(a.snapshot.node.sortKey, b.snapshot.node.sortKey) || a.snapshot.node.cachedPath.localeCompare(b.snapshot.node.cachedPath));
  }
  async listTrash(siteId) {
    const ids = (await this.#db.prepare("SELECT id FROM content_items WHERE site_id=? AND state='trashed'").bind(siteId).all()).results;
    const entries = await Promise.all(ids.map((row) => this.#managerEntry(asContentItemId(row.id))));
    return entries.sort((a, b) => (a.trash?.previousPath ?? "").localeCompare(b.trash?.previousPath ?? ""));
  }
  async createApproval(input) {
    const snapshot = await this.#requireSnapshot(input.contentItemId);
    assertDomain(snapshot.item.state === "active", "CONTENT_TRASHED", "Trashed content cannot be approved", 409);
    const id = asApprovalId(newId("approval"));
    await this.#batch([
      this.#db.prepare("INSERT INTO approval_requests(id,content_item_id,revision_id,revision_hash,state,risk_level,requested_by,requested_at,decided_by,decided_at,decision_comment) VALUES(?,?,?,?,?,?,?,?,NULL,NULL,NULL)").bind(id, input.contentItemId, input.revisionId, input.revisionHash, "pending", input.riskLevel, input.actor.actorId, input.now),
      this.#auditStatement(createAudit(input.actor, snapshot.item.workspaceId, snapshot.item.siteId, "content.request-publish", "approval", id, input.revisionId, input.now, "content.request-publish", {}))
    ]);
    return this.#requireApproval(id);
  }
  async getApproval(id) {
    const row = await this.#db.prepare("SELECT * FROM approval_requests WHERE id=?").bind(id).first();
    return row ? mapApproval(row) : null;
  }
  async listPendingApprovalsBySite(siteId) {
    const rows = (await this.#db.prepare("SELECT ar.* FROM approval_requests ar INNER JOIN content_items ci ON ci.id = ar.content_item_id WHERE ci.site_id = ? AND ar.state = 'pending' ORDER BY ar.requested_at DESC").bind(siteId).all()).results;
    return rows.map(mapApproval);
  }
  async decideApproval(input) {
    const approval = await this.#requireApproval(input.approvalId);
    assertDomain(approval.state === "pending", "APPROVAL_ALREADY_DECIDED", "Approval was already decided", 409);
    const snapshot = await this.#requireSnapshot(approval.contentItemId);
    await this.#batch([
      this.#db.prepare("UPDATE approval_requests SET state=?,decided_by=?,decided_at=?,decision_comment=? WHERE id=? AND state='pending'").bind(input.decision, input.actor.actorId, input.now, input.comment, input.approvalId),
      this.#auditStatement(createAudit(input.actor, snapshot.item.workspaceId, snapshot.item.siteId, `content.${input.decision}`, "approval", input.approvalId, approval.revisionId, input.now, `content.${input.decision}`, {}))
    ]);
    return this.#requireApproval(input.approvalId);
  }
  async publish(input) {
    const snapshot = await this.#requireSnapshot(input.contentItemId);
    assertDomain(snapshot.item.state === "active", "CONTENT_TRASHED", "Trashed content cannot be published", 409);
    assertDomain(snapshot.item.contentTypeKey !== "folder" && snapshot.item.contentTypeKey !== "alias", "CONTENT_NOT_PUBLISHABLE", "This content type cannot be published", 422);
    const publicationId = `pub_${crypto.randomUUID()}`;
    const outboxId = newId("outbox");
    await this.#batch([
      this.#db.prepare("INSERT INTO publication_events(id,content_item_id,previous_revision_id,published_revision_id,approval_id,actor_principal_id,committed_at,verification_state) VALUES(?,?,?,?,?,?,?,'pending')").bind(publicationId, input.contentItemId, snapshot.item.publishedRevisionId, input.revisionId, input.approvalId, input.actor.actorId, input.now),
      this.#outboxStatement(outboxId, "content.published", input.contentItemId, { publicationId, revisionId: input.revisionId, siteId: snapshot.item.siteId }, input.now),
      this.#auditStatement(createAudit(input.actor, snapshot.item.workspaceId, snapshot.item.siteId, "content.publish", "content-item", input.contentItemId, input.revisionId, input.now, "content.publish", { publicationId, outboxEventId: outboxId }))
    ]);
    return this.#requireSnapshot(input.contentItemId);
  }
  async unpublish(input) {
    const snapshot = await this.#requireSnapshot(input.contentItemId);
    assertDomain(snapshot.item.state === "active", "CONTENT_TRASHED", "Trashed content cannot be unpublished", 409);
    assertDomain(snapshot.item.contentTypeKey !== "folder" && snapshot.item.contentTypeKey !== "alias", "CONTENT_NOT_PUBLISHABLE", "This content type cannot be unpublished", 422);
    assertDomain(snapshot.item.publishedRevisionId, "CONTENT_NOT_PUBLISHED", "Content is not published", 409);
    const previousRevisionId = snapshot.item.publishedRevisionId;
    const outboxId = newId("outbox");
    await this.#batch([
      this.#db.prepare("UPDATE content_items SET published_revision_id=NULL, updated_at=? WHERE id=? AND published_revision_id IS NOT NULL").bind(input.now, input.contentItemId),
      this.#outboxStatement(outboxId, "content.unpublished", input.contentItemId, { previousRevisionId, siteId: snapshot.item.siteId }, input.now),
      this.#auditStatement(createAudit(input.actor, snapshot.item.workspaceId, snapshot.item.siteId, "content.unpublish", "content-item", input.contentItemId, previousRevisionId, input.now, "content.unpublish", { previousRevisionId, outboxEventId: outboxId }))
    ]);
    return this.#requireSnapshot(input.contentItemId);
  }
  async resolvePublicPath(siteId, path) {
    const normalized = normalizePath(path);
    const route = await this.#db.prepare("SELECT * FROM routes WHERE site_id=? AND path=? AND active=1 LIMIT 1").bind(siteId, normalized).first();
    if (route) {
      const snapshot = await this.#resolvePublishableSnapshot(asContentItemId(route.content_item_id));
      return snapshot ? { kind: "content", snapshot } : null;
    }
    const redirect = await this.#db.prepare("SELECT * FROM redirects WHERE site_id=? AND source_path=? AND active=1 LIMIT 1").bind(siteId, normalized).first();
    if (!redirect)
      return null;
    const targetRoute = await this.#db.prepare("SELECT * FROM routes WHERE id=?").bind(redirect.target_route_id).first();
    if (!targetRoute)
      return null;
    const currentRoute = await this.#db.prepare("SELECT * FROM routes WHERE content_item_id=? AND active=1 AND is_canonical=1 ORDER BY activated_at DESC LIMIT 1").bind(targetRoute.content_item_id).first();
    if (!currentRoute)
      return null;
    return { kind: "redirect", location: currentRoute.path, statusCode: redirect.status_code };
  }
  async findPublicByPath(siteId, path) {
    const resolution = await this.resolvePublicPath(siteId, path);
    return resolution?.kind === "content" ? resolution.snapshot : null;
  }
  async saveAgentRun(run) {
    await this.#db.prepare("INSERT INTO agent_runs(id,workspace_id,agent_principal_id,instructed_by,model_provider,model_name,base_revision_id,produced_revision_id,state,started_at,completed_at) VALUES(?,?,?,?,?,?,?,?,?,?,?)").bind(run.id, run.workspaceId, run.agentPrincipalId, run.instructedBy, run.modelProvider, run.modelName, run.baseRevisionId, run.producedRevisionId, run.state, run.startedAt, run.completedAt).run();
  }
  async updateAgentRun(run) {
    await this.#db.prepare("UPDATE agent_runs SET produced_revision_id=?,state=?,completed_at=? WHERE id=?").bind(run.producedRevisionId, run.state, run.completedAt, run.id).run();
  }
  async saveChangeSet(changeSet) {
    await this.#db.prepare("INSERT INTO change_sets(id,content_item_id,base_revision_id,result_revision_id,operations_json,diff_json,risk_level,state,created_by,agent_run_id,created_at) VALUES(?,?,?,?,?,?,?,?,?,?,?) ON CONFLICT(id) DO UPDATE SET result_revision_id=excluded.result_revision_id,diff_json=excluded.diff_json,state=excluded.state").bind(changeSet.id, changeSet.contentItemId, changeSet.baseRevisionId, changeSet.resultRevisionId, JSON.stringify(changeSet.operations), changeSet.diff ? JSON.stringify(changeSet.diff) : null, changeSet.riskLevel, changeSet.state, changeSet.createdBy, changeSet.agentRunId, changeSet.createdAt).run();
  }
  async getChangeSet(id) {
    const row = await this.#db.prepare("SELECT * FROM change_sets WHERE id=?").bind(id).first();
    return row ? mapChangeSet(row) : null;
  }
  async appendAudit(event) {
    await this.#auditStatement(event).run();
  }
  async listAudit(workspaceId) {
    return (await this.#db.prepare("SELECT * FROM audit_events WHERE workspace_id=? ORDER BY occurred_at").bind(workspaceId).all()).results.map(mapAudit);
  }
  async getWorkspace(id) {
    const row = await this.#db.prepare("SELECT * FROM workspaces WHERE id=?").bind(id).first();
    return row ? { id: row.id, name: row.name, createdAt: row.created_at } : null;
  }
  async getSite(id) {
    const row = await this.#db.prepare("SELECT * FROM sites WHERE id=?").bind(id).first();
    return row ? mapSite(row) : null;
  }
  async listOutbox() {
    return (await this.#db.prepare("SELECT * FROM outbox_events ORDER BY created_at").all()).results.map(mapOutbox);
  }
  async listPublishedAssetReferences(assetId) {
    const rows = await this.#db.prepare(`SELECT r.revision_id,r.asset_id,r.block_id,r.field_path,r.usage,c.id AS content_item_id,c.site_id,n.cached_path
      FROM revision_asset_references r
      JOIN content_revisions v ON v.id=r.revision_id
      JOIN content_items c ON c.id=v.content_item_id AND c.published_revision_id=v.id AND c.state='active'
      JOIN content_nodes n ON n.content_item_id=c.id
      WHERE r.asset_id=?`).bind(assetId).all();
    return rows.results.map((row) => ({ revisionId: asRevisionId(row.revision_id), assetId: asAssetId(row.asset_id), blockId: row.block_id, fieldPath: row.field_path, usage: row.usage, contentItemId: asContentItemId(row.content_item_id), siteId: asSiteId(row.site_id), path: row.cached_path }));
  }
  async #createRoutable(input, contentType, routeType, aliasTarget) {
    const site = await this.#requireSite(input.siteId);
    if (input.parentId)
      await this.#requireParentForType(input.parentId, input.siteId, contentType);
    else if (contentType === "article")
      throw new DomainError("ARTICLE_PARENT_REQUIRED", "Articles must belong to a blog", 422);
    await this.#assertRouteAvailable(input.siteId, site.hostname, input.path);
    const contentId = asContentItemId(newId("content"));
    const revisionId = asRevisionId(newId("revision"));
    const nodeId = asContentNodeId(newId("node"));
    const routeId = newId("route");
    const documentJson = JSON.stringify(input.document);
    const statements = [
      this.#db.prepare("INSERT INTO content_items(id,workspace_id,site_id,content_type_key,working_revision_id,published_revision_id,lock_version,state,created_by,created_at,updated_at) VALUES(?,?,?,?,NULL,NULL,0,'active',?,?,?)").bind(contentId, input.workspaceId, input.siteId, contentType, input.actor.actorId, input.now, input.now),
      this.#db.prepare("INSERT INTO content_revisions(id,content_item_id,revision_number,based_on_revision_id,expected_lock_version,fields_json,content_hash,created_by,agent_run_id,change_summary,created_at) VALUES(?,?,1,NULL,0,?,?,?,?,?,?)").bind(revisionId, contentId, JSON.stringify({ title: input.title }), input.contentHash, input.actor.actorId, null, `Initial ${contentType}`, input.now),
      this.#db.prepare("INSERT INTO revision_documents(revision_id,format_version,document_json,byte_size,document_hash) VALUES(?,?,?,?,?)").bind(revisionId, input.document.formatVersion, documentJson, new TextEncoder().encode(documentJson).byteLength, input.contentHash),
      ...this.#assetReferenceStatements(revisionId, input.document),
      this.#db.prepare("INSERT INTO content_nodes(id,site_id,content_item_id,parent_id,slug,sort_key,cached_path,tree_version,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?,?,?)").bind(nodeId, input.siteId, contentId, input.parentId, input.slug, `${input.now}:${contentId}`, input.path, 1, input.now, input.now),
      this.#retireRedirectStatement(input.siteId, site.hostname, input.path),
      this.#routeInsert(routeId, input.siteId, contentId, site.hostname, input.path, routeType, input.now)
    ];
    if (aliasTarget)
      statements.push(this.#db.prepare("INSERT INTO content_aliases(alias_content_item_id,target_content_item_id,created_at) VALUES(?,?,?)").bind(contentId, aliasTarget, input.now));
    statements.push(this.#auditStatement(createAudit(input.actor, input.workspaceId, input.siteId, `${contentType}.create`, "content-item", contentId, revisionId, input.now, `${contentType}.create`, { path: input.path, aliasTarget: aliasTarget ?? null })));
    await this.#batch(statements);
    return this.#requireSnapshot(contentId);
  }
  async #resolvePublishableSnapshot(contentItemId) {
    let item = await this.#db.prepare("SELECT * FROM content_items WHERE id=?").bind(contentItemId).first();
    const visited = /* @__PURE__ */ new Set();
    while (item?.content_type_key === "alias") {
      if (visited.has(item.id))
        throw new DomainError("ALIAS_CYCLE", "Alias cycle detected", 500);
      visited.add(item.id);
      const relation = await this.#db.prepare("SELECT * FROM content_aliases WHERE alias_content_item_id=?").bind(item.id).first();
      if (!relation)
        return null;
      item = await this.#db.prepare("SELECT * FROM content_items WHERE id=?").bind(relation.target_content_item_id).first();
    }
    if (!item || item.state !== "active" || !item.published_revision_id)
      return null;
    return this.getContentSnapshot(asContentItemId(item.id));
  }
  async #managerEntry(contentItemId) {
    const snapshot = await this.#requireSnapshot(contentItemId);
    const alias = await this.#db.prepare("SELECT * FROM content_aliases WHERE alias_content_item_id=?").bind(contentItemId).first();
    const trash = await this.#db.prepare("SELECT * FROM trash_entries WHERE content_item_id=?").bind(contentItemId).first();
    return { snapshot, aliasTargetContentItemId: alias ? asContentItemId(alias.target_content_item_id) : null, trash: trash ? mapTrash(trash) : null };
  }
  async #requireFolderParent(id, siteId) {
    return this.#requireParentForType(id, siteId, "page");
  }
  async #requireParentForType(id, siteId, childType) {
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
  async #assertRouteAvailable(siteId, hostname, path, exceptContentId) {
    const row = await this.#db.prepare("SELECT content_item_id FROM routes WHERE site_id=? AND hostname=? AND path=? AND active=1 LIMIT 1").bind(siteId, hostname, normalizePath(path)).first();
    if (row && row.content_item_id !== exceptContentId)
      throw new DomainError("ROUTE_COLLISION", `Route ${path} already exists`, 409);
  }
  #retireRedirectStatement(siteId, hostname, path) {
    return this.#db.prepare("UPDATE redirects SET active=0 WHERE site_id=? AND source_hostname=? AND source_path=? AND active=1").bind(siteId, hostname, normalizePath(path));
  }
  #routeInsert(id, siteId, contentItemId, hostname, path, routeType, now) {
    return this.#db.prepare("INSERT INTO routes(id,site_id,content_item_id,hostname,path,route_type,is_canonical,active,activated_at,deactivated_at) VALUES(?,?,?,?,?,?,1,1,?,NULL)").bind(id, siteId, contentItemId, hostname, normalizePath(path), routeType, now);
  }
  #treeGuard(nodeId, expectedTreeVersion, now) {
    return this.#db.prepare("INSERT INTO tree_move_guards(id,node_id,expected_tree_version,created_at) VALUES(?,?,?,?)").bind(`guard_${crypto.randomUUID()}`, nodeId, expectedTreeVersion, now);
  }
  #outboxStatement(id, eventType, aggregateId, payload, now) {
    return this.#db.prepare("INSERT INTO outbox_events(id,event_type,aggregate_type,aggregate_id,payload_json,state,attempts,available_at,created_at) VALUES(?,?,?,?,?,'pending',0,?,?)").bind(id, eventType, "content-item", aggregateId, JSON.stringify(payload), now, now);
  }
  async #activeRouteRow(contentItemId) {
    const row = await this.#db.prepare("SELECT * FROM routes WHERE content_item_id=? AND active=1 AND is_canonical=1 LIMIT 1").bind(contentItemId).first();
    assertDomain(row, "ROUTE_NOT_FOUND", "Canonical route not found", 500);
    return row;
  }
  async #requireItemRow(contentItemId) {
    const row = await this.#db.prepare("SELECT * FROM content_items WHERE id=?").bind(contentItemId).first();
    assertDomain(row, "CONTENT_NOT_FOUND", "Content not found", 404);
    return row;
  }
  async #requireNodeRow(nodeId) {
    const row = await this.#db.prepare("SELECT * FROM content_nodes WHERE id=?").bind(nodeId).first();
    assertDomain(row, "NODE_NOT_FOUND", "Content node not found", 404);
    return row;
  }
  async #requireRevisionRow(revisionId) {
    const row = await this.#db.prepare("SELECT r.*,d.format_version,d.document_json,d.byte_size,d.document_hash FROM content_revisions r JOIN revision_documents d ON d.revision_id=r.id WHERE r.id=?").bind(revisionId).first();
    assertDomain(row, "REVISION_NOT_FOUND", "Revision not found", 404);
    return row;
  }
  async #requireSnapshot(id) {
    const snapshot = await this.getContentSnapshot(id);
    assertDomain(snapshot, "CONTENT_NOT_FOUND", "Content not found", 404);
    return snapshot;
  }
  async #requireApproval(id) {
    const approval = await this.getApproval(id);
    assertDomain(approval, "APPROVAL_NOT_FOUND", "Approval not found", 404);
    return approval;
  }
  async #requireSite(id) {
    const site = await this.getSite(id);
    assertDomain(site, "SITE_NOT_FOUND", "Site not found", 404);
    return site;
  }
  #assetReferenceStatements(revisionId, document) {
    return collectAssetReferences(document).map((reference) => this.#db.prepare("INSERT INTO revision_asset_references(revision_id,asset_id,block_id,field_path,usage) VALUES(?,?,?,?,?)").bind(revisionId, reference.assetId, reference.blockId, reference.fieldPath, reference.usage));
  }
  async #batch(statements) {
    try {
      return await this.#db.batch(statements);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      if (message.includes("REVISION_CONFLICT"))
        throw new DomainError("REVISION_CONFLICT", "The content changed after the requested base revision", 409);
      if (message.includes("REVISION_NOT_APPROVED"))
        throw new DomainError("REVISION_NOT_APPROVED", "The exact revision has not been approved", 409);
      if (message.includes("TREE_CONFLICT"))
        throw new DomainError("TREE_CONFLICT", "Content tree changed", 409);
      if (message.includes("UNIQUE constraint failed") || message.includes("constraint failed"))
        throw new DomainError("DATABASE_CONSTRAINT", "A unique or relational constraint was violated", 409, { databaseMessage: message });
      throw error;
    }
  }
  #grantStatement(grant, createdAt) {
    return this.#db.prepare("INSERT INTO capability_grants(id,principal_id,capability,scope_json,valid_from,valid_until,revoked_at,created_at) VALUES(?,?,?,?,?,?,?,?)").bind(grant.id, grant.principalId, grant.capability, JSON.stringify(grant.scope), grant.validFrom ?? null, grant.validUntil ?? null, grant.revokedAt ?? null, createdAt);
  }
  #auditStatement(event) {
    return this.#db.prepare("INSERT INTO audit_events(id,workspace_id,site_id,occurred_at,actor_principal_id,actor_type,on_behalf_of_principal_id,delegation_id,action,resource_type,resource_id,revision_id,capability,result,reason,request_id,details_json) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)").bind(event.id, event.workspaceId, event.siteId, event.occurredAt, event.actorPrincipalId, event.actorType, event.onBehalfOfPrincipalId, event.delegationId, event.action, event.resourceType, event.resourceId, event.revisionId, event.capability, event.result, event.reason, event.requestId, JSON.stringify(event.details));
  }
}
function createAudit(actor, workspaceId, siteId, action, resourceType, resourceId, revisionId, now, capability, details) {
  return { id: newId("audit"), workspaceId, siteId, occurredAt: now, actorPrincipalId: actor.actorId, actorType: actor.actorType, onBehalfOfPrincipalId: actor.onBehalfOf ?? null, delegationId: actor.delegationId ?? null, action, resourceType, resourceId, revisionId, capability, result: "success", reason: null, requestId: actor.requestId, details };
}
function json(value) {
  return JSON.parse(value);
}
function mapSite(r) {
  return { id: asSiteId(r.id), workspaceId: r.workspace_id, name: r.name, hostname: r.hostname, locale: r.locale, state: r.state, createdAt: r.created_at, updatedAt: r.updated_at };
}
function mapPrincipal(r) {
  return { id: asPrincipalId(r.id), workspaceId: r.workspace_id, type: r.principal_type, displayName: r.display_name, state: r.state, createdAt: r.created_at };
}
function mapGrant(r) {
  const g = { id: r.id, principalId: asPrincipalId(r.principal_id), capability: r.capability, scope: json(r.scope_json) };
  if (r.valid_from !== null)
    g.validFrom = r.valid_from;
  if (r.valid_until !== null)
    g.validUntil = r.valid_until;
  if (r.revoked_at !== null)
    g.revokedAt = r.revoked_at;
  return g;
}
function mapDelegation(r) {
  const g = { id: r.id, humanPrincipalId: asPrincipalId(r.human_principal_id), agentPrincipalId: asPrincipalId(r.agent_principal_id), capabilities: json(r.capabilities_json), scope: json(r.scope_json), maximumRisk: r.maximum_risk, expiresAt: r.expires_at };
  if (r.revoked_at !== null)
    g.revokedAt = r.revoked_at;
  return g;
}
function mapItem(r) {
  return { id: asContentItemId(r.id), workspaceId: r.workspace_id, siteId: asSiteId(r.site_id), contentTypeKey: r.content_type_key, workingRevisionId: r.working_revision_id ? asRevisionId(r.working_revision_id) : null, publishedRevisionId: r.published_revision_id ? asRevisionId(r.published_revision_id) : null, lockVersion: r.lock_version, state: r.state, createdBy: asPrincipalId(r.created_by), createdAt: r.created_at, updatedAt: r.updated_at };
}
function mapRevision(r) {
  return { id: asRevisionId(r.id), contentItemId: asContentItemId(r.content_item_id), revisionNumber: r.revision_number, basedOnRevisionId: r.based_on_revision_id ? asRevisionId(r.based_on_revision_id) : null, fields: json(r.fields_json), document: json(r.document_json), contentHash: r.content_hash, createdBy: asPrincipalId(r.created_by), agentRunId: r.agent_run_id, changeSummary: r.change_summary, createdAt: r.created_at };
}
function mapNode(r) {
  return { id: asContentNodeId(r.id), siteId: asSiteId(r.site_id), contentItemId: asContentItemId(r.content_item_id), parentId: r.parent_id ? asContentNodeId(r.parent_id) : null, slug: r.slug, sortKey: r.sort_key, cachedPath: r.cached_path, treeVersion: r.tree_version, createdAt: r.created_at, updatedAt: r.updated_at };
}
function mapRoute(r) {
  return { id: r.id, siteId: asSiteId(r.site_id), contentItemId: asContentItemId(r.content_item_id), hostname: r.hostname, path: r.path, routeType: r.route_type, isCanonical: r.is_canonical === 1, active: r.active === 1, activatedAt: r.activated_at, deactivatedAt: r.deactivated_at };
}
function mapTrash(r) {
  return { contentItemId: asContentItemId(r.content_item_id), rootContentItemId: asContentItemId(r.root_content_item_id), previousParentId: r.previous_parent_id ? asContentNodeId(r.previous_parent_id) : null, previousSlug: r.previous_slug, previousPath: r.previous_path, trashedBy: asPrincipalId(r.trashed_by), trashedAt: r.trashed_at };
}
function mapApproval(r) {
  return { id: asApprovalId(r.id), contentItemId: asContentItemId(r.content_item_id), revisionId: asRevisionId(r.revision_id), revisionHash: r.revision_hash, state: r.state, riskLevel: r.risk_level, requestedBy: asPrincipalId(r.requested_by), requestedAt: r.requested_at, decidedBy: r.decided_by ? asPrincipalId(r.decided_by) : null, decidedAt: r.decided_at, decisionComment: r.decision_comment };
}
function mapChangeSet(r) {
  return { id: r.id, contentItemId: asContentItemId(r.content_item_id), baseRevisionId: asRevisionId(r.base_revision_id), resultRevisionId: r.result_revision_id ? asRevisionId(r.result_revision_id) : null, operations: json(r.operations_json), diff: r.diff_json ? json(r.diff_json) : null, riskLevel: r.risk_level, state: r.state, createdBy: asPrincipalId(r.created_by), agentRunId: r.agent_run_id, createdAt: r.created_at };
}
function mapAudit(r) {
  return { id: r.id, workspaceId: r.workspace_id, siteId: r.site_id ? asSiteId(r.site_id) : null, occurredAt: r.occurred_at, actorPrincipalId: asPrincipalId(r.actor_principal_id), actorType: r.actor_type, onBehalfOfPrincipalId: r.on_behalf_of_principal_id ? asPrincipalId(r.on_behalf_of_principal_id) : null, delegationId: r.delegation_id, action: r.action, resourceType: r.resource_type, resourceId: r.resource_id, revisionId: r.revision_id ? asRevisionId(r.revision_id) : null, capability: r.capability, result: r.result, reason: r.reason, requestId: r.request_id, details: json(r.details_json) };
}
function mapOutbox(r) {
  return { id: r.id, eventType: r.event_type, aggregateType: r.aggregate_type, aggregateId: r.aggregate_id, payload: json(r.payload_json), state: r.state, attempts: r.attempts, availableAt: r.available_at, createdAt: r.created_at };
}
class D1BlogStore {
  #db;
  constructor(db) {
    this.#db = db;
  }
  async createCollection(collection) {
    await this.#db.prepare("INSERT INTO blog_collections(id,workspace_id,site_id,content_item_id,page_size,feed_size,sort_direction,state,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?,?,?)").bind(collection.id, collection.workspaceId, collection.siteId, collection.contentItemId, collection.pageSize, collection.feedSize, collection.sortDirection, collection.state, collection.createdAt, collection.updatedAt).run();
  }
  async getCollection(id) {
    const row = await this.#db.prepare("SELECT * FROM blog_collections WHERE id=?").bind(id).first();
    return row ? mapBlogCollection(row) : null;
  }
  async getCollectionByContentItem(contentItemId) {
    const row = await this.#db.prepare("SELECT * FROM blog_collections WHERE content_item_id=?").bind(contentItemId).first();
    return row ? mapBlogCollection(row) : null;
  }
  async listCollections(siteId) {
    const rows = await this.#db.prepare("SELECT * FROM blog_collections WHERE site_id=? ORDER BY created_at").bind(siteId).all();
    return rows.results.map(mapBlogCollection);
  }
  async updateCollection(collection) {
    await this.#db.prepare("UPDATE blog_collections SET page_size=?,feed_size=?,sort_direction=?,state=?,updated_at=? WHERE id=?").bind(collection.pageSize, collection.feedSize, collection.sortDirection, collection.state, collection.updatedAt, collection.id).run();
  }
  async addArticle(record) {
    await this.#db.prepare("INSERT INTO blog_articles(collection_id,content_item_id,posted_at,author_principal_id,created_at) VALUES(?,?,?,?,?)").bind(record.collectionId, record.contentItemId, record.postedAt, record.authorPrincipalId, record.createdAt).run();
  }
  async getArticle(contentItemId) {
    const row = await this.#db.prepare("SELECT * FROM blog_articles WHERE content_item_id=?").bind(contentItemId).first();
    return row ? mapBlogArticle(row) : null;
  }
  async listArticles(collectionId) {
    const rows = await this.#db.prepare("SELECT * FROM blog_articles WHERE collection_id=? ORDER BY posted_at DESC").bind(collectionId).all();
    return rows.results.map(mapBlogArticle);
  }
  async updateArticlePostedAt(contentItemId, postedAt) {
    const existing = await this.getArticle(contentItemId);
    assertDomain(existing, "ARTICLE_NOT_FOUND", "Article is not registered in a blog", 404);
    await this.#db.prepare("UPDATE blog_articles SET posted_at=? WHERE content_item_id=?").bind(postedAt, contentItemId).run();
    return await this.getArticle(contentItemId);
  }
  async createTaxonomy(taxonomy) {
    await this.#db.prepare("INSERT INTO taxonomies(id,collection_id,taxonomy_key,title,kind,hierarchical,state,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?,?)").bind(taxonomy.id, taxonomy.collectionId, taxonomy.key, taxonomy.title, taxonomy.kind, taxonomy.hierarchical ? 1 : 0, taxonomy.state, taxonomy.createdAt, taxonomy.updatedAt).run();
  }
  async getTaxonomy(id) {
    const row = await this.#db.prepare("SELECT * FROM taxonomies WHERE id=?").bind(id).first();
    return row ? mapTaxonomy(row) : null;
  }
  async listTaxonomies(collectionId) {
    const rows = await this.#db.prepare("SELECT * FROM taxonomies WHERE collection_id=? ORDER BY kind,taxonomy_key").bind(collectionId).all();
    return rows.results.map(mapTaxonomy);
  }
  async createTerm(term) {
    await this.#db.prepare("INSERT INTO taxonomy_terms(id,taxonomy_id,parent_id,slug,title,state,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?)").bind(term.id, term.taxonomyId, term.parentId, term.slug, term.title, term.state, term.createdAt, term.updatedAt).run();
  }
  async getTerm(id) {
    const row = await this.#db.prepare("SELECT * FROM taxonomy_terms WHERE id=?").bind(id).first();
    return row ? mapTerm(row) : null;
  }
  async listTerms(taxonomyId) {
    const rows = await this.#db.prepare("SELECT * FROM taxonomy_terms WHERE taxonomy_id=? ORDER BY title").bind(taxonomyId).all();
    return rows.results.map(mapTerm);
  }
  async setRevisionTaxonomyValue(value) {
    await this.#db.prepare("INSERT INTO revision_taxonomy_values(revision_id,taxonomy_id,term_ids_json) VALUES(?,?,?) ON CONFLICT(revision_id,taxonomy_id) DO UPDATE SET term_ids_json=excluded.term_ids_json").bind(value.revisionId, value.taxonomyId, JSON.stringify(value.termIds)).run();
  }
  async getRevisionTaxonomyValue(revisionId, taxonomyId) {
    const row = await this.#db.prepare("SELECT * FROM revision_taxonomy_values WHERE revision_id=? AND taxonomy_id=?").bind(revisionId, taxonomyId).first();
    return row ? { revisionId: asRevisionId(row.revision_id), taxonomyId: asTaxonomyId(row.taxonomy_id), termIds: JSON.parse(row.term_ids_json).map(asTermId) } : null;
  }
}
class D1AssetMetadataStore {
  #db;
  constructor(db) {
    this.#db = db;
  }
  async createPendingAsset(asset, session) {
    await this.#db.batch([
      this.#db.prepare("INSERT INTO assets(id,workspace_id,object_key,original_filename,media_type,byte_size,checksum,width,height,state,owner_principal_id,created_at,updated_at,deleted_at) VALUES(?,?,?,?,?,NULL,NULL,NULL,NULL,?,?,?,?,NULL)").bind(asset.id, asset.workspaceId, asset.objectKey, asset.originalFilename, asset.mediaType, asset.state, asset.ownerPrincipalId, asset.createdAt, asset.updatedAt),
      this.#db.prepare("INSERT INTO upload_sessions(id,asset_id,workspace_id,object_key,media_type,maximum_bytes,state,created_by,created_at,expires_at,completed_at,failure_reason) VALUES(?,?,?,?,?,?,?,?,?,?,NULL,NULL)").bind(session.id, session.assetId, session.workspaceId, session.objectKey, session.mediaType, session.maximumBytes, session.state, session.createdBy, session.createdAt, session.expiresAt)
    ]);
  }
  async getAsset(id) {
    const row = await this.#db.prepare("SELECT * FROM assets WHERE id=?").bind(id).first();
    return row ? mapAsset(row) : null;
  }
  async getUploadSession(id) {
    const row = await this.#db.prepare("SELECT * FROM upload_sessions WHERE id=?").bind(id).first();
    return row ? mapUploadSession(row) : null;
  }
  async completeUpload(input) {
    const session = await this.getUploadSession(input.sessionId);
    assertDomain(session, "UPLOAD_SESSION_NOT_FOUND", "Upload session not found", 404);
    assertDomain(session.state === "pending", "UPLOAD_SESSION_CLOSED", "Upload session is not pending", 409);
    await this.#db.batch([
      this.#db.prepare("UPDATE upload_sessions SET state='completed',completed_at=?,failure_reason=NULL WHERE id=? AND state='pending'").bind(input.now, input.sessionId),
      this.#db.prepare("UPDATE assets SET state='ready',byte_size=?,checksum=?,updated_at=? WHERE id=? AND state='pending'").bind(input.byteSize, input.checksum, input.now, session.assetId)
    ]);
    const asset = await this.getAsset(session.assetId);
    assertDomain(asset, "ASSET_NOT_FOUND", "Asset not found after upload", 500);
    return asset;
  }
  async failUpload(input) {
    const session = await this.getUploadSession(input.sessionId);
    if (!session || session.state !== "pending")
      return;
    await this.#db.batch([
      this.#db.prepare("UPDATE upload_sessions SET state='failed',completed_at=?,failure_reason=? WHERE id=? AND state='pending'").bind(input.now, input.reason, input.sessionId),
      this.#db.prepare("UPDATE assets SET state='quarantined',updated_at=? WHERE id=? AND state='pending'").bind(input.now, session.assetId)
    ]);
  }
  async listAssets(workspaceId) {
    const rows = await this.#db.prepare("SELECT * FROM assets WHERE workspace_id=? AND deleted_at IS NULL ORDER BY created_at DESC").bind(workspaceId).all();
    return rows.results.map(mapAsset);
  }
  async softDeleteAsset(input) {
    await this.#db.prepare("UPDATE assets SET state='deleted',deleted_at=?,updated_at=? WHERE id=? AND deleted_at IS NULL").bind(input.now, input.now, input.assetId).run();
    const asset = await this.getAsset(input.assetId);
    assertDomain(asset, "ASSET_NOT_FOUND", "Asset not found", 404);
    return asset;
  }
}
class D1PreviewStore {
  #db;
  constructor(db) {
    this.#db = db;
  }
  async create(session) {
    await this.#db.prepare("INSERT INTO preview_sessions(id,workspace_id,site_id,content_item_id,revision_id,revision_hash,theme_release,token_version,created_by,created_at,expires_at,revoked_at,last_accessed_at) VALUES(?,?,?,?,?,?,?,?,?,?,?,NULL,NULL)").bind(session.id, session.workspaceId, session.siteId, session.contentItemId, session.revisionId, session.revisionHash, session.themeRelease, session.tokenVersion, session.createdBy, session.createdAt, session.expiresAt).run();
  }
  async get(id) {
    const row = await this.#db.prepare("SELECT * FROM preview_sessions WHERE id=?").bind(id).first();
    return row ? mapPreview(row) : null;
  }
  async revoke(id, now) {
    await this.#db.prepare("UPDATE preview_sessions SET revoked_at=? WHERE id=? AND revoked_at IS NULL").bind(now, id).run();
    const session = await this.get(id);
    assertDomain(session, "PREVIEW_NOT_FOUND", "Preview session not found", 404);
    return session;
  }
  async touch(id, now) {
    await this.#db.prepare("UPDATE preview_sessions SET last_accessed_at=? WHERE id=?").bind(now, id).run();
  }
}
class R2AssetObjectStore {
  #bucket;
  constructor(bucket) {
    this.#bucket = bucket;
  }
  async put(key2, body, options) {
    const putOptions = {
      httpMetadata: { contentType: options.mediaType }
    };
    if (options.customMetadata)
      putOptions.customMetadata = options.customMetadata;
    const object = await this.#bucket.put(key2, body, putOptions);
    assertDomain(object, "R2_PUT_FAILED", "R2 rejected the object write", 502);
    return mapR2Metadata(object);
  }
  async head(key2) {
    const object = await this.#bucket.head(key2);
    return object ? mapR2Metadata(object) : null;
  }
  async get(key2) {
    const object = await this.#bucket.get(key2);
    if (!object)
      return null;
    return { ...mapR2Metadata(object), body: object.body ?? null, ...object.httpEtag ? { httpEtag: object.httpEtag } : {} };
  }
  async delete(key2) {
    await this.#bucket.delete(key2);
  }
}
function mapR2Metadata(object) {
  const result = { key: object.key, size: object.size, etag: object.etag, uploadedAt: object.uploaded.getTime() };
  if (object.httpMetadata?.contentType)
    result.mediaType = object.httpMetadata.contentType;
  return result;
}
function mapAsset(r) {
  return { id: asAssetId(r.id), workspaceId: r.workspace_id, objectKey: r.object_key, originalFilename: r.original_filename, mediaType: r.media_type, byteSize: r.byte_size, checksum: r.checksum, width: r.width, height: r.height, state: r.state, ownerPrincipalId: asPrincipalId(r.owner_principal_id), createdAt: r.created_at, updatedAt: r.updated_at, deletedAt: r.deleted_at };
}
function mapUploadSession(r) {
  return { id: asUploadSessionId(r.id), assetId: asAssetId(r.asset_id), workspaceId: r.workspace_id, objectKey: r.object_key, mediaType: r.media_type, maximumBytes: r.maximum_bytes, state: r.state, createdBy: asPrincipalId(r.created_by), createdAt: r.created_at, expiresAt: r.expires_at, completedAt: r.completed_at, failureReason: r.failure_reason };
}
function mapPreview(r) {
  return { id: asPreviewSessionId(r.id), workspaceId: r.workspace_id, siteId: asSiteId(r.site_id), contentItemId: asContentItemId(r.content_item_id), revisionId: asRevisionId(r.revision_id), revisionHash: r.revision_hash, themeRelease: r.theme_release, tokenVersion: r.token_version, createdBy: asPrincipalId(r.created_by), createdAt: r.created_at, expiresAt: r.expires_at, revokedAt: r.revoked_at, lastAccessedAt: r.last_accessed_at };
}
function mapBlogCollection(row) {
  return { id: asCollectionId(row.id), workspaceId: row.workspace_id, siteId: asSiteId(row.site_id), contentItemId: asContentItemId(row.content_item_id), pageSize: row.page_size, feedSize: row.feed_size, sortDirection: row.sort_direction, state: row.state, createdAt: row.created_at, updatedAt: row.updated_at };
}
function mapBlogArticle(row) {
  return { collectionId: asCollectionId(row.collection_id), contentItemId: asContentItemId(row.content_item_id), postedAt: row.posted_at, authorPrincipalId: asPrincipalId(row.author_principal_id), createdAt: row.created_at };
}
function mapTaxonomy(row) {
  return { id: asTaxonomyId(row.id), collectionId: asCollectionId(row.collection_id), key: row.taxonomy_key, title: row.title, kind: row.kind, hierarchical: Boolean(row.hierarchical), state: row.state, createdAt: row.created_at, updatedAt: row.updated_at };
}
function mapTerm(row) {
  return { id: asTermId(row.id), taxonomyId: asTaxonomyId(row.taxonomy_id), parentId: row.parent_id ? asTermId(row.parent_id) : null, slug: row.slug, title: row.title, state: row.state, createdAt: row.created_at, updatedAt: row.updated_at };
}
const defaultAllowedMediaTypes = /* @__PURE__ */ new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "application/pdf",
  "text/plain",
  "text/csv",
  "application/zip"
]);
class AssetService {
  #metadata;
  #objects;
  #security;
  #secret;
  #clock;
  #allowedMediaTypes;
  #defaultMaximumBytes;
  #usageInspector;
  constructor(input) {
    assertDomain(input.signingSecret.length >= 16, "WEAK_UPLOAD_SECRET", "Upload signing secret must be at least 16 characters", 500);
    this.#metadata = input.metadata;
    this.#objects = input.objects;
    this.#security = input.security;
    this.#secret = input.signingSecret;
    this.#clock = input.clock ?? systemClock;
    this.#allowedMediaTypes = input.allowedMediaTypes ?? defaultAllowedMediaTypes;
    this.#defaultMaximumBytes = input.defaultMaximumBytes ?? 25 * 1024 * 1024;
    this.#usageInspector = input.usageInspector;
  }
  async createUploadSession(actor, input) {
    const filename = sanitizeFilename(input.filename);
    const mediaType = normalizeMediaType(input.mediaType);
    assertDomain(this.#allowedMediaTypes.has(mediaType), "MEDIA_TYPE_NOT_ALLOWED", `Media type ${mediaType} is not allowed`, 422);
    const maximumBytes = input.maximumBytes ?? this.#defaultMaximumBytes;
    assertDomain(Number.isInteger(maximumBytes) && maximumBytes > 0 && maximumBytes <= 5 * 1024 * 1024 * 1024, "INVALID_MAXIMUM_BYTES", "Invalid upload size limit", 422);
    await this.#security.authorize(actor, Capabilities.AssetUpload, { workspaceId: input.workspaceId, risk: "medium" }, "asset.upload-session.create", "workspace", input.workspaceId);
    const now = this.#clock.now();
    const assetId = asAssetId(newId("asset"));
    const sessionId = asUploadSessionId(newId("upload"));
    const expiresAt = now + Math.max(60, Math.min(input.expiresInSeconds ?? 900, 3600)) * 1e3;
    const objectKey = `workspaces/${input.workspaceId}/assets/${assetId}/${filename}`;
    const asset = {
      id: assetId,
      workspaceId: input.workspaceId,
      objectKey,
      originalFilename: filename,
      mediaType,
      byteSize: null,
      checksum: null,
      width: null,
      height: null,
      state: "pending",
      ownerPrincipalId: actor.actorId,
      createdAt: now,
      updatedAt: now,
      deletedAt: null
    };
    const session = {
      id: sessionId,
      assetId,
      workspaceId: input.workspaceId,
      objectKey,
      mediaType,
      maximumBytes,
      state: "pending",
      createdBy: actor.actorId,
      createdAt: now,
      expiresAt,
      completedAt: null,
      failureReason: null
    };
    await this.#metadata.createPendingAsset(asset, session);
    const token = await signCompactToken({
      typ: "asset-upload",
      sessionId,
      assetId,
      objectKey,
      mediaType,
      maximumBytes,
      expiresAt
    }, this.#secret);
    const base = input.uploadBaseUrl.replace(/\/$/, "");
    const uploadUrl = `${base}/v1/assets/uploads/${encodeURIComponent(sessionId)}?token=${encodeURIComponent(token)}`;
    await this.#security.success(actor, {
      workspaceId: input.workspaceId,
      action: "asset.upload-session.create",
      resourceType: "asset",
      resourceId: assetId,
      capability: Capabilities.AssetUpload,
      details: { mediaType, maximumBytes, expiresAt }
    });
    return { asset, session, uploadUrl, method: "PUT", requiredHeaders: { "content-type": mediaType } };
  }
  async uploadWithToken(input) {
    const payload = await verifyCompactToken(input.token, this.#secret);
    assertDomain(payload?.typ === "asset-upload", "INVALID_UPLOAD_TOKEN", "Upload token is invalid", 403);
    assertDomain(payload.sessionId === input.sessionId, "UPLOAD_SESSION_MISMATCH", "Upload token does not match session", 403);
    const now = this.#clock.now();
    assertDomain(typeof payload.expiresAt === "number" && payload.expiresAt > now, "UPLOAD_TOKEN_EXPIRED", "Upload token has expired", 410);
    const session = await this.#metadata.getUploadSession(input.sessionId);
    assertDomain(session, "UPLOAD_SESSION_NOT_FOUND", "Upload session not found", 404);
    assertDomain(session.state === "pending", "UPLOAD_SESSION_CLOSED", "Upload session is not pending", 409);
    assertDomain(session.expiresAt > now, "UPLOAD_SESSION_EXPIRED", "Upload session has expired", 410);
    const mediaType = normalizeMediaType(input.mediaType);
    assertDomain(mediaType === session.mediaType && mediaType === payload.mediaType, "UPLOAD_MEDIA_TYPE_MISMATCH", "Content-Type does not match signed upload", 422);
    if (input.contentLength !== void 0) {
      assertDomain(input.contentLength >= 0 && input.contentLength <= session.maximumBytes, "UPLOAD_TOO_LARGE", "Upload exceeds the signed size limit", 413);
    }
    try {
      const object = await this.#objects.put(session.objectKey, input.body, {
        mediaType,
        customMetadata: { assetId: session.assetId, uploadSessionId: session.id }
      });
      if (object.size > session.maximumBytes) {
        await this.#objects.delete(session.objectKey);
        await this.#metadata.failUpload({ sessionId: session.id, reason: "size_limit_exceeded", now });
        throw new DomainError("UPLOAD_TOO_LARGE", "Upload exceeds the signed size limit", 413);
      }
      return this.#metadata.completeUpload({ sessionId: session.id, byteSize: object.size, checksum: object.etag, now });
    } catch (error) {
      if (!(error instanceof DomainError))
        await this.#metadata.failUpload({ sessionId: session.id, reason: "object_store_failure", now });
      throw error;
    }
  }
  async getAsset(actor, assetId) {
    const asset = await this.#requireAsset(assetId);
    await this.#security.authorize(actor, Capabilities.AssetRead, { workspaceId: asset.workspaceId, risk: "low" }, "asset.read", "asset", asset.id);
    return asset;
  }
  async listAssets(actor, workspaceId) {
    await this.#security.authorize(actor, Capabilities.AssetRead, { workspaceId, risk: "low" }, "asset.list", "workspace", workspaceId);
    return this.#metadata.listAssets(workspaceId);
  }
  async getPublicAsset(assetId) {
    const asset = await this.#metadata.getAsset(assetId);
    if (!asset || asset.state !== "ready" || asset.deletedAt !== null)
      return null;
    const object = await this.#objects.get(asset.objectKey);
    return object ? { asset, object } : null;
  }
  async deleteAsset(actor, assetId) {
    const asset = await this.#requireAsset(assetId);
    await this.#security.authorize(actor, Capabilities.AssetDelete, { workspaceId: asset.workspaceId, risk: "high" }, "asset.delete", "asset", asset.id);
    const references = this.#usageInspector ? await this.#usageInspector.listPublishedReferences(asset.id) : [];
    assertDomain(references.length === 0, "ASSET_IN_USE", "Asset is used by published content", 409, { references });
    const deleted = await this.#metadata.softDeleteAsset({ assetId, now: this.#clock.now() });
    await this.#security.success(actor, {
      workspaceId: asset.workspaceId,
      action: "asset.delete",
      resourceType: "asset",
      resourceId: asset.id,
      capability: Capabilities.AssetDelete
    });
    return deleted;
  }
  async #requireAsset(id) {
    const asset = await this.#metadata.getAsset(id);
    assertDomain(asset, "ASSET_NOT_FOUND", "Asset not found", 404);
    return asset;
  }
}
class MemoryAssetMetadataStore {
  assets = /* @__PURE__ */ new Map();
  sessions = /* @__PURE__ */ new Map();
  async createPendingAsset(asset, session) {
    if (this.assets.has(asset.id) || this.sessions.has(session.id))
      throw new DomainError("ASSET_EXISTS", "Asset or upload session already exists", 409);
    this.assets.set(asset.id, structuredClone(asset));
    this.sessions.set(session.id, structuredClone(session));
  }
  async getAsset(id) {
    return clone$4(this.assets.get(id) ?? null);
  }
  async getUploadSession(id) {
    return clone$4(this.sessions.get(id) ?? null);
  }
  async completeUpload(input) {
    const session = requireValue(this.sessions.get(input.sessionId), "UPLOAD_SESSION_NOT_FOUND", "Upload session not found");
    assertDomain(session.state === "pending", "UPLOAD_SESSION_CLOSED", "Upload session is not pending", 409);
    session.state = "completed";
    session.completedAt = input.now;
    const asset = requireValue(this.assets.get(session.assetId), "ASSET_NOT_FOUND", "Asset not found");
    asset.byteSize = input.byteSize;
    asset.checksum = input.checksum;
    asset.state = "ready";
    asset.updatedAt = input.now;
    return structuredClone(asset);
  }
  async failUpload(input) {
    const session = this.sessions.get(input.sessionId);
    if (!session || session.state !== "pending")
      return;
    session.state = "failed";
    session.failureReason = input.reason;
    session.completedAt = input.now;
    const asset = this.assets.get(session.assetId);
    if (asset) {
      asset.state = "quarantined";
      asset.updatedAt = input.now;
    }
  }
  async listAssets(workspaceId) {
    return [...this.assets.values()].filter((asset) => asset.workspaceId === workspaceId && asset.deletedAt === null).map((asset) => structuredClone(asset));
  }
  async softDeleteAsset(input) {
    const asset = requireValue(this.assets.get(input.assetId), "ASSET_NOT_FOUND", "Asset not found");
    asset.state = "deleted";
    asset.deletedAt = input.now;
    asset.updatedAt = input.now;
    return structuredClone(asset);
  }
}
class MemoryAssetObjectStore {
  objects = /* @__PURE__ */ new Map();
  async put(key2, body, options) {
    const bytes = await toBytes(body);
    const etag = await digest(bytes);
    const metadata = { key: key2, size: bytes.byteLength, etag, uploadedAt: Date.now(), mediaType: options.mediaType };
    this.objects.set(key2, { bytes, metadata, mediaType: options.mediaType });
    return structuredClone(metadata);
  }
  async head(key2) {
    return clone$4(this.objects.get(key2)?.metadata ?? null);
  }
  async get(key2) {
    const entry = this.objects.get(key2);
    if (!entry)
      return null;
    const bytes = entry.bytes.slice();
    return { ...structuredClone(entry.metadata), body: new Blob([bytes]).stream() };
  }
  async delete(key2) {
    this.objects.delete(key2);
  }
}
function sanitizeFilename(value) {
  const normalized = value.normalize("NFKC").trim().replace(/[\\/\0]/g, "-").replace(/\s+/g, "-");
  const safe = normalized.replace(/[^\p{L}\p{N}._-]+/gu, "-").replace(/-+/g, "-").replace(/^[-.]+|[-.]+$/g, "");
  assertDomain(safe.length > 0 && safe.length <= 180, "INVALID_FILENAME", "Filename is invalid", 422);
  return safe;
}
function normalizeMediaType(value) {
  return value.split(";", 1)[0]?.trim().toLowerCase() ?? "";
}
function clone$4(value) {
  return value === null || value === void 0 ? value : structuredClone(value);
}
function requireValue(value, code, message) {
  if (value === void 0)
    throw new DomainError(code, message, 404);
  return value;
}
async function toBytes(body) {
  if (typeof body === "string")
    return new TextEncoder().encode(body);
  if (body instanceof Blob)
    return new Uint8Array(await body.arrayBuffer());
  if (body instanceof ArrayBuffer)
    return new Uint8Array(body);
  if (ArrayBuffer.isView(body))
    return new Uint8Array(body.buffer.slice(body.byteOffset, body.byteOffset + body.byteLength));
  return new Uint8Array(await new Response(body).arrayBuffer());
}
async function digest(bytes) {
  const hash = await crypto.subtle.digest("SHA-256", bytes);
  return [...new Uint8Array(hash)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}
class PreviewService {
  #store;
  #cms;
  #security;
  #secret;
  #clock;
  constructor(input) {
    assertDomain(input.signingSecret.length >= 16, "WEAK_PREVIEW_SECRET", "Preview signing secret must be at least 16 characters", 500);
    this.#store = input.store;
    this.#cms = input.cms;
    this.#security = input.security;
    this.#secret = input.signingSecret;
    this.#clock = input.clock ?? systemClock;
  }
  async create(actor, input) {
    const snapshot = await this.#cms.getContent(actor, input.contentItemId);
    await this.#security.authorize(actor, Capabilities.PreviewCreate, {
      workspaceId: snapshot.item.workspaceId,
      siteId: snapshot.item.siteId,
      contentType: snapshot.item.contentTypeKey,
      path: snapshot.route.path,
      risk: "low"
    }, "preview.create", "content-item", snapshot.item.id);
    const revision = await this.#cms.getRevisionForPreview(actor, input.contentItemId, input.revisionId);
    const now = this.#clock.now();
    const expiresAt = now + Math.max(60, Math.min(input.expiresInSeconds ?? 1800, 24 * 60 * 60)) * 1e3;
    const session = {
      id: asPreviewSessionId(newId("preview")),
      workspaceId: snapshot.item.workspaceId,
      siteId: snapshot.item.siteId,
      contentItemId: snapshot.item.id,
      revisionId: revision.id,
      revisionHash: revision.contentHash,
      themeRelease: input.themeRelease ?? "default@1",
      tokenVersion: 1,
      createdBy: actor.actorId,
      createdAt: now,
      expiresAt,
      revokedAt: null,
      lastAccessedAt: null
    };
    await this.#store.create(session);
    const token = await signCompactToken({
      typ: "content-preview",
      sessionId: session.id,
      contentItemId: session.contentItemId,
      revisionId: session.revisionId,
      siteId: session.siteId,
      revisionHash: session.revisionHash,
      themeRelease: session.themeRelease,
      expiresAt: session.expiresAt,
      tokenVersion: session.tokenVersion
    }, this.#secret);
    const previewUrl = `${input.previewBaseUrl.replace(/\/$/, "")}/_preview/${encodeURIComponent(token)}`;
    await this.#security.success(actor, {
      workspaceId: session.workspaceId,
      siteId: session.siteId,
      action: "preview.create",
      resourceType: "preview-session",
      resourceId: session.id,
      revisionId: session.revisionId,
      capability: Capabilities.PreviewCreate,
      details: { expiresAt, themeRelease: session.themeRelease }
    });
    return { session, previewUrl };
  }
  async resolve(token) {
    const payload = await verifyCompactToken(token, this.#secret);
    assertDomain(payload?.typ === "content-preview", "INVALID_PREVIEW_TOKEN", "Preview token is invalid", 403);
    const now = this.#clock.now();
    assertDomain(typeof payload.expiresAt === "number" && payload.expiresAt > now, "PREVIEW_EXPIRED", "Preview has expired", 410);
    const session = await this.#store.get(asPreviewSessionId(String(payload.sessionId)));
    assertDomain(session, "PREVIEW_NOT_FOUND", "Preview session not found", 404);
    assertDomain(session.revokedAt === null, "PREVIEW_REVOKED", "Preview session has been revoked", 410);
    assertDomain(session.expiresAt > now, "PREVIEW_EXPIRED", "Preview has expired", 410);
    assertDomain(session.contentItemId === payload.contentItemId && session.revisionId === payload.revisionId && session.siteId === payload.siteId && session.revisionHash === payload.revisionHash && session.themeRelease === payload.themeRelease && session.tokenVersion === payload.tokenVersion, "PREVIEW_TOKEN_MISMATCH", "Preview token no longer matches the stored session", 403);
    const snapshot = await this.#cms.store.getContentSnapshot(asContentItemId(String(payload.contentItemId)));
    assertDomain(snapshot && snapshot.item.siteId === asSiteId(String(payload.siteId)), "PREVIEW_CONTENT_NOT_FOUND", "Preview content was not found", 404);
    const revision = await this.#cms.store.getRevision(asRevisionId(String(payload.revisionId)));
    assertDomain(revision && revision.contentItemId === snapshot.item.id, "PREVIEW_REVISION_NOT_FOUND", "Preview revision was not found", 404);
    assertDomain(revision.contentHash === session.revisionHash, "PREVIEW_REVISION_CHANGED", "Preview revision integrity check failed", 409);
    await this.#store.touch(session.id, now);
    return { session, snapshot, revision };
  }
  async revoke(actor, previewId) {
    const session = await this.#store.get(previewId);
    assertDomain(session, "PREVIEW_NOT_FOUND", "Preview session not found", 404);
    await this.#security.authorize(actor, Capabilities.PreviewRevoke, {
      workspaceId: session.workspaceId,
      siteId: session.siteId,
      risk: "medium"
    }, "preview.revoke", "preview-session", session.id);
    const revoked = await this.#store.revoke(session.id, this.#clock.now());
    await this.#security.success(actor, {
      workspaceId: session.workspaceId,
      siteId: session.siteId,
      action: "preview.revoke",
      resourceType: "preview-session",
      resourceId: session.id,
      revisionId: session.revisionId,
      capability: Capabilities.PreviewRevoke
    });
    return revoked;
  }
}
class MemoryPreviewStore {
  sessions = /* @__PURE__ */ new Map();
  async create(session) {
    this.sessions.set(session.id, structuredClone(session));
  }
  async get(id) {
    return this.sessions.has(id) ? structuredClone(this.sessions.get(id)) : null;
  }
  async revoke(id, now) {
    const session = this.sessions.get(id);
    assertDomain(session, "PREVIEW_NOT_FOUND", "Preview session not found", 404);
    session.revokedAt = now;
    return structuredClone(session);
  }
  async touch(id, now) {
    const session = this.sessions.get(id);
    if (session)
      session.lastAccessedAt = now;
  }
}
class ThemeService {
  store;
  #cms;
  #security;
  #clock;
  constructor(input) {
    this.store = input.store;
    this.#cms = input.cms;
    this.#security = input.security;
    this.#clock = input.clock ?? systemClock;
  }
  async createTheme(actor, input) {
    const key2 = normalizeKey$1(input.key);
    await this.#authorize(actor, Capabilities.ThemeManage, { workspaceId: input.workspaceId, risk: "medium" }, "theme.create", "theme", key2);
    const theme = {
      id: asThemeId(newId("theme")),
      workspaceId: input.workspaceId,
      key: key2,
      name: requiredText(input.name, 120),
      description: optionalText(input.description ?? "", 1e3),
      state: "active",
      createdBy: actor.actorId,
      createdAt: this.#clock.now()
    };
    await this.store.createTheme(theme);
    await this.#success(actor, theme.workspaceId, null, "theme.create", "theme", theme.id, Capabilities.ThemeManage, { key: theme.key });
    return theme;
  }
  async listThemes(actor, workspaceId) {
    await this.#authorize(actor, Capabilities.ThemeRead, { workspaceId, risk: "low" }, "theme.list", "workspace", workspaceId);
    return this.store.listThemes(workspaceId);
  }
  async createTokenRevision(actor, input) {
    const theme = await this.#requireTheme(input.themeId);
    await this.#authorize(actor, Capabilities.ThemeManage, { workspaceId: theme.workspaceId, risk: "medium" }, "theme.tokens.create", "theme", theme.id);
    const tokens = validateTokens(input.tokens);
    const revision = {
      id: asDesignTokenRevisionId(newId("designTokenRevision")),
      themeId: theme.id,
      revisionNumber: await this.store.countTokenRevisions(theme.id) + 1,
      name: requiredText(input.name, 120),
      tokens,
      contentHash: await sha256(stableStringify(tokens)),
      createdBy: actor.actorId,
      createdAt: this.#clock.now()
    };
    await this.store.createTokenRevision(revision);
    await this.#success(actor, theme.workspaceId, null, "theme.tokens.create", "design-token-revision", revision.id, Capabilities.ThemeManage, { revisionNumber: revision.revisionNumber });
    return revision;
  }
  async createLayoutRevision(actor, input) {
    const theme = await this.#requireTheme(input.themeId);
    await this.#authorize(actor, Capabilities.ThemeManage, { workspaceId: theme.workspaceId, risk: "medium" }, "theme.layout.create", "theme", theme.id);
    const layout = validateLayout(input.layout);
    const revision = {
      id: asLayoutRevisionId(newId("layoutRevision")),
      themeId: theme.id,
      revisionNumber: await this.store.countLayoutRevisions(theme.id) + 1,
      name: requiredText(input.name, 120),
      layout,
      contentHash: await sha256(stableStringify(layout)),
      createdBy: actor.actorId,
      createdAt: this.#clock.now()
    };
    await this.store.createLayoutRevision(revision);
    await this.#success(actor, theme.workspaceId, null, "theme.layout.create", "layout-revision", revision.id, Capabilities.ThemeManage, { revisionNumber: revision.revisionNumber });
    return revision;
  }
  async createRelease(actor, input) {
    const theme = await this.#requireTheme(input.themeId);
    await this.#authorize(actor, Capabilities.ThemeManage, { workspaceId: theme.workspaceId, risk: "high" }, "theme.release.create", "theme", theme.id);
    const tokens = await this.store.getTokenRevision(input.designTokenRevisionId);
    const layout = await this.store.getLayoutRevision(input.layoutRevisionId);
    assertDomain(tokens?.themeId === theme.id, "THEME_TOKEN_MISMATCH", "Design token revision belongs to another theme", 422);
    assertDomain(layout?.themeId === theme.id, "THEME_LAYOUT_MISMATCH", "Layout revision belongs to another theme", 422);
    const manifest = validateManifest(input.manifest);
    const version = validateVersion(input.version);
    const releaseMaterial = { themeId: theme.id, version, designTokenRevisionId: tokens.id, layoutRevisionId: layout.id, manifest };
    const release = {
      id: asThemeReleaseId(newId("themeRelease")),
      themeId: theme.id,
      version,
      designTokenRevisionId: tokens.id,
      layoutRevisionId: layout.id,
      manifest,
      releaseHash: await sha256(stableStringify(releaseMaterial)),
      state: "ready",
      createdBy: actor.actorId,
      createdAt: this.#clock.now()
    };
    await this.store.createRelease(release);
    await this.#success(actor, theme.workspaceId, null, "theme.release.create", "theme-release", release.id, Capabilities.ThemeManage, { version, releaseHash: release.releaseHash });
    return release;
  }
  async listReleases(actor, themeId) {
    const theme = await this.#requireTheme(themeId);
    await this.#authorize(actor, Capabilities.ThemeRead, { workspaceId: theme.workspaceId, risk: "low" }, "theme.release.list", "theme", theme.id);
    return this.store.listReleases(theme.id);
  }
  async activate(actor, input) {
    assertDomain(actor.actorType === "human", "HUMAN_THEME_ACTIVATION_REQUIRED", "Theme activation requires a human principal", 403);
    const site = await this.#cms.store.getSite(input.siteId);
    assertDomain(site, "SITE_NOT_FOUND", "Site not found", 404);
    const release = await this.#requireRelease(input.themeReleaseId);
    const theme = await this.#requireTheme(release.themeId);
    assertDomain(theme.workspaceId === site.workspaceId, "CROSS_WORKSPACE_THEME", "Theme belongs to another workspace", 422);
    assertDomain(release.state === "ready", "THEME_RELEASE_NOT_READY", "Theme release is not ready", 409);
    await this.#authorize(actor, Capabilities.ThemeActivate, { workspaceId: site.workspaceId, siteId: site.id, risk: "high" }, "theme.activate", "site", site.id);
    const activation = {
      id: asThemeActivationId(newId("themeActivation")),
      siteId: site.id,
      themeReleaseId: release.id,
      activatedBy: actor.actorId,
      activatedAt: this.#clock.now(),
      deactivatedAt: null
    };
    await this.store.activate(activation);
    await this.#success(actor, site.workspaceId, site.id, "theme.activate", "theme-release", release.id, Capabilities.ThemeActivate, { releaseHash: release.releaseHash });
    return this.resolveRelease(release.id, site.id, activation);
  }
  async getActive(actor, siteId) {
    const site = await this.#cms.store.getSite(siteId);
    assertDomain(site, "SITE_NOT_FOUND", "Site not found", 404);
    await this.#authorize(actor, Capabilities.ThemeRead, { workspaceId: site.workspaceId, siteId, risk: "low" }, "theme.active.read", "site", site.id);
    return this.resolveActive(siteId);
  }
  async resolveActive(siteId) {
    const activation = await this.store.getActiveActivation(siteId);
    if (!activation)
      return builtinTheme();
    return this.resolveRelease(activation.themeReleaseId, siteId, activation);
  }
  async resolveRelease(releaseId, siteId, knownActivation) {
    if (String(releaseId) === BUILTIN_RELEASE_ID || String(releaseId) === "default@1")
      return builtinTheme();
    const release = await this.#requireRelease(asThemeReleaseId(String(releaseId)));
    const theme = await this.#requireTheme(release.themeId);
    const tokenRevision = await this.store.getTokenRevision(release.designTokenRevisionId);
    const layoutRevision = await this.store.getLayoutRevision(release.layoutRevisionId);
    assertDomain(tokenRevision && layoutRevision, "THEME_RELEASE_INCOMPLETE", "Theme release references missing immutable artifacts", 500);
    const activation = knownActivation ?? (siteId ? await this.store.getActiveActivation(siteId) : null);
    return { theme, release, tokenRevision, layoutRevision, activation: activation?.themeReleaseId === release.id ? activation : null, builtin: false };
  }
  async #requireTheme(id) {
    const value = await this.store.getTheme(id);
    assertDomain(value, "THEME_NOT_FOUND", "Theme not found", 404);
    return value;
  }
  async #requireRelease(id) {
    const value = await this.store.getRelease(id);
    assertDomain(value, "THEME_RELEASE_NOT_FOUND", "Theme release not found", 404);
    return value;
  }
  #authorize(actor, capability, resource, action, resourceType, resourceId) {
    return this.#security.authorize(actor, capability, resource, action, resourceType, resourceId);
  }
  #success(actor, workspaceId, siteId, action, resourceType, resourceId, capability, details) {
    return this.#security.success(actor, { workspaceId, siteId, action, resourceType, resourceId, capability, details });
  }
}
class MemoryThemeStore {
  themes = /* @__PURE__ */ new Map();
  tokenRevisions = /* @__PURE__ */ new Map();
  layoutRevisions = /* @__PURE__ */ new Map();
  releases = /* @__PURE__ */ new Map();
  activations = /* @__PURE__ */ new Map();
  async createTheme(theme) {
    assertDomain(![...this.themes.values()].some((value) => value.workspaceId === theme.workspaceId && value.key === theme.key), "THEME_KEY_EXISTS", "Theme key already exists", 409);
    this.themes.set(theme.id, structuredClone(theme));
  }
  async getTheme(id) {
    return clone$3(this.themes.get(id));
  }
  async listThemes(workspaceId) {
    return [...this.themes.values()].filter((value) => value.workspaceId === workspaceId).map((value) => structuredClone(value));
  }
  async createTokenRevision(revision) {
    this.tokenRevisions.set(revision.id, structuredClone(revision));
  }
  async getTokenRevision(id) {
    return clone$3(this.tokenRevisions.get(id));
  }
  async countTokenRevisions(themeId) {
    return [...this.tokenRevisions.values()].filter((value) => value.themeId === themeId).length;
  }
  async createLayoutRevision(revision) {
    this.layoutRevisions.set(revision.id, structuredClone(revision));
  }
  async getLayoutRevision(id) {
    return clone$3(this.layoutRevisions.get(id));
  }
  async countLayoutRevisions(themeId) {
    return [...this.layoutRevisions.values()].filter((value) => value.themeId === themeId).length;
  }
  async createRelease(release) {
    assertDomain(![...this.releases.values()].some((value) => value.themeId === release.themeId && value.version === release.version), "THEME_VERSION_EXISTS", "Theme release version already exists", 409);
    this.releases.set(release.id, structuredClone(release));
  }
  async getRelease(id) {
    return clone$3(this.releases.get(id));
  }
  async listReleases(themeId) {
    return [...this.releases.values()].filter((value) => value.themeId === themeId).sort((a, b) => b.createdAt - a.createdAt).map((value) => structuredClone(value));
  }
  async activate(activation) {
    for (const value of this.activations.values())
      if (value.siteId === activation.siteId && value.deactivatedAt === null)
        value.deactivatedAt = activation.activatedAt;
    this.activations.set(activation.id, structuredClone(activation));
  }
  async getActiveActivation(siteId) {
    const active = [...this.activations.values()].filter((value) => value.siteId === siteId && value.deactivatedAt === null).sort((a, b) => b.activatedAt - a.activatedAt)[0];
    return active ? structuredClone(active) : null;
  }
}
const BUILTIN_RELEASE_ID = "builtin-default@1";
function builtinTheme() {
  const now = 0;
  const theme = { id: asThemeId("theme_builtin"), workspaceId: "ws_builtin", key: "builtin-default", name: "baserEdge Default", description: "Built-in safe fallback theme", state: "active", createdBy: "prn_system", createdAt: now };
  const tokens = { colorBackground: "#ffffff", colorSurface: "#ffffff", colorText: "#1d1d1f", colorMuted: "#5f6368", colorAccent: "#145a35", colorBorder: "#d9e0db", fontFamily: 'system-ui,-apple-system,"Noto Sans JP",sans-serif', baseFontSize: 16, lineHeight: 1.7, contentMaxWidth: 1152, spacingScale: 1, radius: 10 };
  const tokenRevision = { id: asDesignTokenRevisionId("dtok_builtin"), themeId: theme.id, revisionNumber: 1, name: "Default", tokens, contentHash: "builtin", createdBy: theme.createdBy, createdAt: now };
  const layout = { header: "simple", navigation: "none", footer: "simple", showSiteName: true, footerText: "", mainClass: "bc-page" };
  const layoutRevision = { id: asLayoutRevisionId("layout_builtin"), themeId: theme.id, revisionNumber: 1, name: "Default", layout, contentHash: "builtin", createdBy: theme.createdBy, createdAt: now };
  const release = { id: asThemeReleaseId(BUILTIN_RELEASE_ID), themeId: theme.id, version: "1.0.0", designTokenRevisionId: tokenRevision.id, layoutRevisionId: layoutRevision.id, manifest: { rendererApiVersion: 1, variant: "light", supportedContentTypes: ["*"], cssText: "", source: { kind: "native" } }, releaseHash: "builtin", state: "ready", createdBy: theme.createdBy, createdAt: now };
  return { theme, release, tokenRevision, layoutRevision, activation: null, builtin: true };
}
function compileThemeCss(presentation) {
  const t = presentation.tokenRevision.tokens;
  return `:root{--bc-bg:${t.colorBackground};--bc-surface:${t.colorSurface};--bc-text:${t.colorText};--bc-muted:${t.colorMuted};--bc-accent:${t.colorAccent};--bc-border:${t.colorBorder};--bc-font:${t.fontFamily};--bc-font-size:${t.baseFontSize}px;--bc-line-height:${t.lineHeight};--bc-content-max:${t.contentMaxWidth}px;--bc-space-scale:${t.spacingScale};--bc-radius:${t.radius}px;color-scheme:${presentation.release.manifest.variant === "dark" ? "dark" : presentation.release.manifest.variant === "auto" ? "light dark" : "light"}}
${presentation.release.manifest.cssText}`;
}
function validateTokens(input) {
  const colors = [input.colorBackground, input.colorSurface, input.colorText, input.colorMuted, input.colorAccent, input.colorBorder];
  assertDomain(colors.every(isSafeColor), "INVALID_THEME_COLOR", "Theme colors must use hexadecimal CSS notation", 422);
  assertDomain(typeof input.fontFamily === "string" && input.fontFamily.length > 0 && input.fontFamily.length <= 240 && !/[{};<>]/.test(input.fontFamily), "INVALID_THEME_FONT", "Font family is invalid", 422);
  assertRange(input.baseFontSize, 12, 24, "baseFontSize");
  assertRange(input.lineHeight, 1, 2.4, "lineHeight");
  assertRange(input.contentMaxWidth, 480, 1920, "contentMaxWidth");
  assertRange(input.spacingScale, 0.5, 2, "spacingScale");
  assertRange(input.radius, 0, 40, "radius");
  return structuredClone(input);
}
function validateLayout(input) {
  assertDomain(["none", "simple", "brand"].includes(input.header), "INVALID_THEME_LAYOUT", "Invalid header layout", 422);
  assertDomain(["none", "top"].includes(input.navigation), "INVALID_THEME_LAYOUT", "Invalid navigation layout", 422);
  assertDomain(["none", "simple"].includes(input.footer), "INVALID_THEME_LAYOUT", "Invalid footer layout", 422);
  assertDomain(typeof input.showSiteName === "boolean", "INVALID_THEME_LAYOUT", "showSiteName must be boolean", 422);
  const footerText = optionalText(input.footerText, 240);
  const mainClass = validateClassName(input.mainClass || "bc-page");
  return { ...input, footerText, mainClass };
}
function validateManifest(input) {
  assertDomain(input.rendererApiVersion === 1, "UNSUPPORTED_THEME_RENDERER", "Unsupported theme renderer API version", 422);
  assertDomain(["light", "dark", "auto"].includes(input.variant), "INVALID_THEME_VARIANT", "Invalid theme variant", 422);
  assertDomain(Array.isArray(input.supportedContentTypes) && input.supportedContentTypes.length > 0 && input.supportedContentTypes.length <= 64, "INVALID_THEME_CONTENT_TYPES", "supportedContentTypes is invalid", 422);
  const cssText = input.cssText ?? "";
  assertDomain(cssText.length <= 65536, "THEME_CSS_TOO_LARGE", "Theme CSS exceeds 64 KiB", 413);
  const lowered = cssText.toLowerCase();
  assertDomain(!lowered.includes("@import") && !lowered.includes("expression(") && !lowered.includes("javascript:") && !lowered.includes("</style") && !/url\s*\(\s*["']?https?:/i.test(cssText), "UNSAFE_THEME_CSS", "Theme CSS contains a forbidden external or executable construct", 422);
  assertDomain(["native", "basercms-migration", "emdash-derived"].includes(input.source.kind), "INVALID_THEME_SOURCE", "Invalid theme source", 422);
  return { rendererApiVersion: 1, variant: input.variant, supportedContentTypes: [...new Set(input.supportedContentTypes.map((value) => requiredText(String(value), 80)))], cssText, source: { kind: input.source.kind, ...input.source.reference ? { reference: optionalText(input.source.reference, 500) } : {} } };
}
function normalizeKey$1(value) {
  const key2 = value.trim().toLowerCase();
  assertDomain(/^[a-z][a-z0-9-]{1,62}$/.test(key2), "INVALID_THEME_KEY", "Theme key must be lowercase ASCII with hyphens", 422);
  return key2;
}
function validateVersion(value) {
  const version = value.trim();
  assertDomain(/^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?$/.test(version), "INVALID_THEME_VERSION", "Theme release version must be semantic versioning", 422);
  return version;
}
function validateClassName(value) {
  assertDomain(/^[a-zA-Z][a-zA-Z0-9 _-]{0,120}$/.test(value), "INVALID_THEME_CLASS", "Theme layout class is invalid", 422);
  return value;
}
function requiredText(value, max) {
  const result = value.trim();
  assertDomain(result.length > 0 && result.length <= max, "INVALID_TEXT", "Required text is empty or too long", 422);
  return result;
}
function optionalText(value, max) {
  const result = value.trim();
  assertDomain(result.length <= max, "TEXT_TOO_LONG", "Text is too long", 422);
  return result;
}
function assertRange(value, min, max, name) {
  assertDomain(Number.isFinite(value) && value >= min && value <= max, "INVALID_THEME_TOKEN", `${name} is outside the allowed range`, 422);
}
function isSafeColor(value) {
  return typeof value === "string" && /^#[0-9a-fA-F]{3,8}$/.test(value);
}
function clone$3(value) {
  return value === void 0 ? null : structuredClone(value);
}
const defaultResolver = {
  assetUrl: (assetId) => `/assets/${encodeURIComponent(assetId)}`,
  contentUrl: (contentId) => `/content/${encodeURIComponent(contentId)}`
};
function renderDocument(document, resolver = defaultResolver, options = {}) {
  const now = options.now ?? /* @__PURE__ */ new Date();
  return Object.values(document.root.slots).flat().map((block) => renderBlock(block, resolver, now, options.preview ?? false)).join("\n");
}
function renderPage(document, resolver = defaultResolver, options = {}) {
  const revision = options.revision?.id ?? "unknown";
  const theme = options.theme ?? builtinTheme();
  const mainClass = theme.layoutRevision.layout.mainClass;
  const body = `<main class="${escapeAttribute(mainClass)}">${renderDocument(document, resolver, options)}</main>`;
  const bodyAttributes = { "data-content-revision": revision, "data-theme-release": theme.release.id, ...options.bodyAttributes ?? {} };
  return renderShell({
    title: options.title ?? "",
    bodyHtml: body,
    theme,
    ...options.siteName !== void 0 ? { siteName: options.siteName } : {},
    ...options.lang !== void 0 ? { lang: options.lang } : {},
    ...options.headHtml !== void 0 ? { headHtml: options.headHtml } : {},
    bodyAttributes
  });
}
function renderShell(options) {
  const theme = options.theme ?? builtinTheme();
  const layout = theme.layoutRevision.layout;
  const siteName = options.siteName ?? "";
  const title = escapeHtml$2(options.title);
  const pageTitle = siteName && options.title && siteName !== options.title ? `${title} | ${escapeHtml$2(siteName)}` : title || escapeHtml$2(siteName);
  const header = layout.header === "none" ? "" : `<header class="bc-site-header"><div class="bc-shell">${layout.showSiteName && siteName ? `<a class="bc-site-brand" href="/">${escapeHtml$2(siteName)}</a>` : ""}</div></header>`;
  const footerText = layout.footerText || siteName;
  const footer = layout.footer === "none" ? "" : `<footer class="bc-site-footer"><div class="bc-shell">${escapeHtml$2(footerText)}</div></footer>`;
  const attrs = Object.entries(options.bodyAttributes ?? {}).map(([key2, value]) => ` ${escapeAttributeName(key2)}="${escapeAttribute(value)}"`).join("");
  return `<!doctype html>
<html lang="${escapeAttribute(options.lang ?? "ja")}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${pageTitle}</title>
<style>${baseCss}
${compileThemeCss(theme)}</style>
${options.headHtml ?? ""}
</head>
<body${attrs}>
${header}
${options.bodyHtml}
${footer}
</body>
</html>`;
}
function renderBlock(block, resolver, now, preview) {
  if (!isVisible(block, now))
    return "";
  const id = escapeAttribute(block.id);
  switch (block.type) {
    case "heading": {
      const level = asInt(block.props.level, 2, 1, 6);
      return `<h${level} data-block-id="${id}">${escapeHtml$2(asString(block.props.text))}</h${level}>`;
    }
    case "richText": {
      const paragraphs = Array.isArray(block.props.paragraphs) ? block.props.paragraphs : [];
      return `<section data-block-id="${id}" class="bc-rich-text">${paragraphs.map((value) => `<p>${escapeHtml$2(String(value))}</p>`).join("")}</section>`;
    }
    case "image": {
      const assetId = asString(block.props.assetId);
      const src = resolver.assetUrl(assetId);
      if (!src)
        return preview ? unsupported(block, "Asset is unavailable") : "";
      return `<figure data-block-id="${id}"><img src="${escapeAttribute(src)}" alt="${escapeAttribute(asString(block.props.alt))}" loading="lazy" decoding="async"></figure>`;
    }
    case "imageText": {
      const assetId = asString(block.props.assetId);
      const src = resolver.assetUrl(assetId);
      if (!src)
        return preview ? unsupported(block, "Asset is unavailable") : "";
      return `<section data-block-id="${id}" class="bc-image-text"><img src="${escapeAttribute(src)}" alt="${escapeAttribute(asString(block.props.alt))}" loading="lazy"><p>${escapeHtml$2(asString(block.props.text))}</p></section>`;
    }
    case "gallery": {
      const ids = Array.isArray(block.props.assetIds) ? block.props.assetIds.map(String) : [];
      return `<section data-block-id="${id}" class="bc-gallery">${ids.map((assetId) => {
        const src = resolver.assetUrl(assetId);
        return src ? `<img src="${escapeAttribute(src)}" alt="" loading="lazy">` : "";
      }).join("")}</section>`;
    }
    case "callToAction": {
      const target = resolver.contentUrl(asString(block.props.targetContentId));
      if (!target)
        return preview ? unsupported(block, "Target content is unavailable") : "";
      return `<p data-block-id="${id}" class="bc-cta"><a href="${escapeAttribute(target)}">${escapeHtml$2(asString(block.props.label))}</a></p>`;
    }
    case "table": {
      const rows = Array.isArray(block.props.rows) ? block.props.rows : [];
      return `<div data-block-id="${id}" class="bc-table-wrap"><table><tbody>${rows.map((row) => `<tr>${(Array.isArray(row) ? row : []).map((cell) => `<td>${escapeHtml$2(String(cell))}</td>`).join("")}</tr>`).join("")}</tbody></table></div>`;
    }
    case "fileDownload": {
      const url = resolver.assetUrl(asString(block.props.assetId));
      if (!url)
        return preview ? unsupported(block, "File is unavailable") : "";
      return `<p data-block-id="${id}"><a href="${escapeAttribute(url)}" download>${escapeHtml$2(asString(block.props.label))}</a></p>`;
    }
    case "safeEmbed": {
      const safeUrl = validateEmbed(asString(block.props.provider), asString(block.props.url));
      if (!safeUrl)
        return preview ? unsupported(block, "Embed URL is not allowed") : "";
      return `<div data-block-id="${id}" class="bc-embed"><iframe src="${escapeAttribute(safeUrl)}" loading="lazy" referrerpolicy="strict-origin-when-cross-origin" allowfullscreen></iframe></div>`;
    }
    case "divider":
      return `<hr data-block-id="${id}">`;
    default:
      return preview ? unsupported(block, `Unsupported component: ${block.type}@${block.componentVersion}`) : `<!-- unsupported component ${escapeComment(block.type)} -->`;
  }
}
function isVisible(block, now) {
  const from = block.visibility?.publishAt ? Date.parse(block.visibility.publishAt) : null;
  const until = block.visibility?.unpublishAt ? Date.parse(block.visibility.unpublishAt) : null;
  const timestamp = now.getTime();
  return (from === null || Number.isNaN(from) || timestamp >= from) && (until === null || Number.isNaN(until) || timestamp < until);
}
function validateEmbed(provider, rawUrl) {
  try {
    const url = new URL(rawUrl);
    if (url.protocol !== "https:")
      return null;
    const allowed = {
      youtube: ["www.youtube.com", "youtube.com", "www.youtube-nocookie.com"],
      vimeo: ["player.vimeo.com"],
      maps: ["www.google.com", "maps.google.com"]
    };
    return allowed[provider]?.includes(url.hostname) ? url.toString() : null;
  } catch {
    return null;
  }
}
function unsupported(block, message) {
  return `<aside data-block-id="${escapeAttribute(block.id)}" class="bc-unsupported">${escapeHtml$2(message)}</aside>`;
}
function asString(value) {
  return typeof value === "string" ? value : "";
}
function asInt(value, fallback, min, max) {
  return typeof value === "number" && Number.isInteger(value) && value >= min && value <= max ? value : fallback;
}
function escapeHtml$2(value) {
  return value.replace(/[&<>"']/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[character] ?? character);
}
function escapeAttribute(value) {
  return escapeHtml$2(value).replace(/`/g, "&#96;");
}
function escapeAttributeName(value) {
  return /^[a-zA-Z_:][a-zA-Z0-9:_.-]*$/.test(value) ? value : "data-invalid";
}
function escapeComment(value) {
  return value.replace(/--/g, "—");
}
const baseCss = `
*{box-sizing:border-box}
:root{font-family:var(--bc-font,system-ui,sans-serif);font-size:var(--bc-font-size,16px);color:var(--bc-text,#1d1d1f);background:var(--bc-bg,#fff);line-height:var(--bc-line-height,1.7)}
body{margin:0;background:var(--bc-bg);color:var(--bc-text)}a{color:var(--bc-accent);text-underline-offset:.16em}.bc-shell,.bc-page{width:min(calc(100% - 2rem),var(--bc-content-max,72rem));margin-inline:auto}.bc-page{padding-block:calc(2rem * var(--bc-space-scale,1))}
.bc-site-header,.bc-site-footer{background:var(--bc-surface);border-color:var(--bc-border);border-style:solid;border-width:0}.bc-site-header{border-bottom-width:1px}.bc-site-footer{border-top-width:1px;margin-top:3rem;color:var(--bc-muted)}.bc-site-header .bc-shell,.bc-site-footer .bc-shell{padding-block:1rem}.bc-site-brand{font-weight:800;color:var(--bc-text);text-decoration:none}
img{max-width:100%;height:auto}.bc-image-text{display:grid;gap:1rem;grid-template-columns:minmax(0,1fr) minmax(0,1fr);align-items:center}.bc-gallery{display:grid;grid-template-columns:repeat(auto-fit,minmax(12rem,1fr));gap:1rem}.bc-cta a{display:inline-block;padding:.75rem 1rem;border:1px solid currentColor;border-radius:var(--bc-radius,.5rem)}.bc-table-wrap{overflow:auto}.bc-embed iframe{width:100%;aspect-ratio:16/9;border:0}.bc-unsupported{padding:1rem;border:1px dashed currentColor}.bc-list{display:grid;gap:1rem}.bc-card{border:1px solid var(--bc-border);border-radius:var(--bc-radius);padding:1rem;background:var(--bc-surface)}
@media(max-width:640px){.bc-image-text{grid-template-columns:1fr}}
`;
class MemoryBlogStore {
  collections = /* @__PURE__ */ new Map();
  collectionByContent = /* @__PURE__ */ new Map();
  articles = /* @__PURE__ */ new Map();
  taxonomies = /* @__PURE__ */ new Map();
  terms = /* @__PURE__ */ new Map();
  revisionValues = /* @__PURE__ */ new Map();
  async createCollection(collection) {
    if (this.collections.has(collection.id) || this.collectionByContent.has(collection.contentItemId))
      throw new DomainError("BLOG_EXISTS", "Blog collection already exists", 409);
    this.collections.set(collection.id, structuredClone(collection));
    this.collectionByContent.set(collection.contentItemId, collection.id);
  }
  async getCollection(id) {
    return clone$2(this.collections.get(id) ?? null);
  }
  async getCollectionByContentItem(contentItemId) {
    const id = this.collectionByContent.get(contentItemId);
    return id ? this.getCollection(id) : null;
  }
  async listCollections(siteId) {
    return [...this.collections.values()].filter((item) => item.siteId === siteId).map((item) => structuredClone(item));
  }
  async updateCollection(collection) {
    if (!this.collections.has(collection.id))
      throw new DomainError("BLOG_NOT_FOUND", "Blog collection not found", 404);
    this.collections.set(collection.id, structuredClone(collection));
  }
  async addArticle(record) {
    if (this.articles.has(record.contentItemId))
      throw new DomainError("ARTICLE_EXISTS", "Article is already registered", 409);
    this.articles.set(record.contentItemId, structuredClone(record));
  }
  async getArticle(contentItemId) {
    return clone$2(this.articles.get(contentItemId) ?? null);
  }
  async listArticles(collectionId) {
    return [...this.articles.values()].filter((article) => article.collectionId === collectionId).map((article) => structuredClone(article));
  }
  async updateArticlePostedAt(contentItemId, postedAt) {
    const article = this.articles.get(contentItemId);
    if (!article)
      throw new DomainError("ARTICLE_NOT_FOUND", "Article is not registered in a blog", 404);
    const next = { ...article, postedAt };
    this.articles.set(contentItemId, structuredClone(next));
    return structuredClone(next);
  }
  async createTaxonomy(taxonomy) {
    if ([...this.taxonomies.values()].some((item) => item.collectionId === taxonomy.collectionId && item.key === taxonomy.key))
      throw new DomainError("TAXONOMY_KEY_EXISTS", "Taxonomy key already exists", 409);
    this.taxonomies.set(taxonomy.id, structuredClone(taxonomy));
  }
  async getTaxonomy(id) {
    return clone$2(this.taxonomies.get(id) ?? null);
  }
  async listTaxonomies(collectionId) {
    return [...this.taxonomies.values()].filter((item) => item.collectionId === collectionId).map((item) => structuredClone(item));
  }
  async createTerm(term) {
    if ([...this.terms.values()].some((item) => item.taxonomyId === term.taxonomyId && item.slug === term.slug))
      throw new DomainError("TERM_SLUG_EXISTS", "Term slug already exists", 409);
    this.terms.set(term.id, structuredClone(term));
  }
  async getTerm(id) {
    return clone$2(this.terms.get(id) ?? null);
  }
  async listTerms(taxonomyId) {
    return [...this.terms.values()].filter((item) => item.taxonomyId === taxonomyId).map((item) => structuredClone(item));
  }
  async setRevisionTaxonomyValue(value) {
    this.revisionValues.set(key(value.revisionId, value.taxonomyId), structuredClone(value));
  }
  async getRevisionTaxonomyValue(revisionId, taxonomyId) {
    return clone$2(this.revisionValues.get(key(revisionId, taxonomyId)) ?? null);
  }
}
function key(revisionId, taxonomyId) {
  return `${revisionId}:${taxonomyId}`;
}
function clone$2(value) {
  return value === null ? null : structuredClone(value);
}
class BlogService {
  #store;
  #cms;
  #clock;
  constructor(store, cms, options = {}) {
    this.#store = store;
    this.#cms = cms;
    this.#clock = options.clock ?? systemClock;
  }
  get store() {
    return this.#store;
  }
  async createBlog(actor, input) {
    const snapshot = await this.#cms.createBlog(actor, input);
    const now = this.#clock.now();
    const collection = {
      id: asCollectionId(newId("collection")),
      workspaceId: snapshot.item.workspaceId,
      siteId: snapshot.item.siteId,
      contentItemId: snapshot.item.id,
      pageSize: clamp$2(input.pageSize ?? 10, 1, 100),
      feedSize: clamp$2(input.feedSize ?? 20, 1, 100),
      sortDirection: input.sortDirection ?? "desc",
      state: "active",
      createdAt: now,
      updatedAt: now
    };
    await this.#store.createCollection(collection);
    const category = await this.#createTaxonomyRecord(collection, { key: "category", title: "カテゴリ", kind: "category", hierarchical: true }, now);
    const tag = await this.#createTaxonomyRecord(collection, { key: "tag", title: "タグ", kind: "tag", hierarchical: false }, now);
    await this.#cms.recordSuccessfulOperation(actor, {
      workspaceId: collection.workspaceId,
      siteId: collection.siteId,
      action: "blog.configure",
      resourceType: "blog-collection",
      resourceId: collection.id,
      revisionId: snapshot.workingRevision?.id ?? null,
      capability: Capabilities.BlogCreate,
      details: { contentItemId: collection.contentItemId, pageSize: collection.pageSize, feedSize: collection.feedSize }
    });
    return { collection, snapshot, taxonomies: [category, tag] };
  }
  async createArticle(actor, input) {
    const collection = await this.#requireCollection(input.collectionId);
    const blog = await this.#cms.getContent(actor, collection.contentItemId);
    assertDomain(blog.item.contentTypeKey === "blog", "BLOG_CONTENT_MISMATCH", "Collection content is not a blog", 500);
    const snapshot = await this.#cms.createArticle(actor, {
      blogContentItemId: blog.item.id,
      slug: input.slug,
      title: input.title,
      document: input.document
    });
    const now = this.#clock.now();
    await this.#store.addArticle({
      collectionId: collection.id,
      contentItemId: snapshot.item.id,
      postedAt: input.postedAt ?? now,
      authorPrincipalId: actor.onBehalfOf ?? actor.actorId,
      createdAt: now
    });
    if (input.termIds)
      await this.classifyRevision(actor, snapshot.item.id, snapshot.workingRevision.id, input.termIds);
    await this.#cms.recordSuccessfulOperation(actor, {
      workspaceId: collection.workspaceId,
      siteId: collection.siteId,
      action: "article.register",
      resourceType: "article",
      resourceId: snapshot.item.id,
      revisionId: snapshot.workingRevision?.id ?? null,
      capability: Capabilities.ArticleCreate,
      details: { collectionId: collection.id, postedAt: input.postedAt ?? now }
    });
    return snapshot;
  }
  async getArticleMetadata(actor, contentItemId) {
    const snapshot = await this.#cms.getContent(actor, contentItemId);
    assertDomain(snapshot.item.contentTypeKey === "article", "ARTICLE_CONTENT_MISMATCH", "Content is not an article", 422);
    const article = await this.#requireArticle(contentItemId);
    return { article, snapshot };
  }
  async updateArticlePostedAt(actor, input) {
    const snapshot = await this.#cms.getContent(actor, input.contentItemId);
    assertDomain(snapshot.item.contentTypeKey === "article", "ARTICLE_CONTENT_MISMATCH", "Content is not an article", 422);
    await this.#cms.authorizeOperation(actor, Capabilities.ContentRevise, {
      workspaceId: snapshot.item.workspaceId,
      siteId: snapshot.item.siteId,
      contentType: "article",
      risk: "medium"
    }, "article.update-posted-at", "article", input.contentItemId);
    const article = await this.#store.updateArticlePostedAt(input.contentItemId, input.postedAt);
    await this.#cms.recordSuccessfulOperation(actor, {
      workspaceId: snapshot.item.workspaceId,
      siteId: snapshot.item.siteId,
      action: "article.update-posted-at",
      resourceType: "article",
      resourceId: input.contentItemId,
      revisionId: snapshot.workingRevision?.id ?? null,
      capability: Capabilities.ContentRevise,
      details: { postedAt: input.postedAt }
    });
    return article;
  }
  async reviseArticle(actor, input) {
    const article = await this.#requireArticle(input.contentItemId);
    const revision = await this.#cms.commitRevision(actor, input);
    if (input.termIdsByTaxonomy) {
      for (const [taxonomyId, termIds] of Object.entries(input.termIdsByTaxonomy)) {
        await this.#setTaxonomyValue(actor, article.collectionId, revision.id, asTaxonomyId(taxonomyId), termIds);
      }
    }
    return revision;
  }
  async createTaxonomy(actor, input) {
    const collection = await this.#requireCollection(input.collectionId);
    await this.#cms.authorizeOperation(actor, Capabilities.TaxonomyManage, { workspaceId: collection.workspaceId, siteId: collection.siteId, contentType: "blog", risk: "medium" }, "taxonomy.create", "blog-collection", collection.id);
    const taxonomy = await this.#createTaxonomyRecord(collection, {
      key: normalizeTaxonomyKey(input.key),
      title: input.title.trim(),
      kind: input.kind,
      hierarchical: input.kind === "category" ? input.hierarchical ?? true : false
    }, this.#clock.now());
    await this.#cms.recordSuccessfulOperation(actor, { workspaceId: collection.workspaceId, siteId: collection.siteId, action: "taxonomy.create", resourceType: "taxonomy", resourceId: taxonomy.id, capability: Capabilities.TaxonomyManage, details: { collectionId: collection.id, key: taxonomy.key } });
    return taxonomy;
  }
  async createTerm(actor, input) {
    const taxonomy = await this.#requireTaxonomy(input.taxonomyId);
    const collection = await this.#requireCollection(taxonomy.collectionId);
    await this.#cms.authorizeOperation(actor, Capabilities.TaxonomyManage, { workspaceId: collection.workspaceId, siteId: collection.siteId, contentType: "blog", risk: "medium" }, "term.create", "taxonomy", taxonomy.id);
    let parentId = input.parentId ?? null;
    if (parentId) {
      assertDomain(taxonomy.hierarchical, "TAXONOMY_NOT_HIERARCHICAL", "This taxonomy does not allow parent terms", 422);
      const parent = await this.#store.getTerm(parentId);
      assertDomain(parent && parent.taxonomyId === taxonomy.id && parent.state === "active", "INVALID_TERM_PARENT", "Parent term is invalid", 422);
    }
    const now = this.#clock.now();
    const term = {
      id: asTermId(newId("term")),
      taxonomyId: taxonomy.id,
      parentId,
      slug: normalizeSlug(input.slug),
      title: input.title.trim(),
      state: "active",
      createdAt: now,
      updatedAt: now
    };
    assertDomain(term.title.length > 0, "TERM_TITLE_REQUIRED", "Term title is required", 422);
    await this.#store.createTerm(term);
    await this.#cms.recordSuccessfulOperation(actor, { workspaceId: collection.workspaceId, siteId: collection.siteId, action: "term.create", resourceType: "term", resourceId: term.id, capability: Capabilities.TaxonomyManage, details: { taxonomyId: taxonomy.id, slug: term.slug } });
    return term;
  }
  async classifyRevision(actor, articleContentItemId, revisionId, termIds) {
    const article = await this.#requireArticle(articleContentItemId);
    const taxonomies = await this.#store.listTaxonomies(article.collectionId);
    const grouped = /* @__PURE__ */ new Map();
    for (const termId of unique(termIds)) {
      const term = await this.#store.getTerm(termId);
      assertDomain(term && term.state === "active", "TERM_NOT_FOUND", "Term not found", 404);
      const taxonomy = taxonomies.find((item) => item.id === term.taxonomyId);
      assertDomain(taxonomy, "TERM_COLLECTION_MISMATCH", "Term belongs to another blog", 422);
      grouped.set(taxonomy.id, [...grouped.get(taxonomy.id) ?? [], term.id]);
    }
    for (const taxonomy of taxonomies)
      await this.#setTaxonomyValue(actor, article.collectionId, revisionId, taxonomy.id, grouped.get(taxonomy.id) ?? []);
  }
  async listTaxonomies(collectionId) {
    const taxonomies = await this.#store.listTaxonomies(collectionId);
    return Promise.all(taxonomies.map(async (taxonomy) => ({ taxonomy, terms: await this.#store.listTerms(taxonomy.id) })));
  }
  async findTerm(collectionId, taxonomyKey, slug) {
    const taxonomies = await this.#store.listTaxonomies(collectionId);
    const taxonomy = taxonomies.find((item) => item.key === taxonomyKey && item.state === "active");
    if (!taxonomy)
      return null;
    const normalized = normalizeSlug(slug);
    return (await this.#store.listTerms(taxonomy.id)).find((term) => term.slug === normalized && term.state === "active") ?? null;
  }
  async listPublishedArticles(collectionId, options = {}) {
    const collection = await this.#requireCollection(collectionId);
    const requiredTermIds = unique(options.termIds ?? []);
    const records = await this.#store.listArticles(collection.id);
    const published = [];
    for (const record of records) {
      const snapshot = await this.#cms.store.getContentSnapshot(record.contentItemId);
      if (!snapshot || snapshot.item.state !== "active" || !snapshot.publishedRevision)
        continue;
      const terms = await this.#resolveTerms(collection.id, snapshot.publishedRevision.id);
      if (requiredTermIds.length && !requiredTermIds.every((id) => terms.some((term) => term.id === id)))
        continue;
      published.push({ snapshot, collectionId: collection.id, postedAt: record.postedAt, authorPrincipalId: record.authorPrincipalId, terms });
    }
    published.sort((a, b) => collection.sortDirection === "desc" ? b.postedAt - a.postedAt : a.postedAt - b.postedAt);
    const limit = clamp$2(options.limit ?? collection.pageSize, 1, 100);
    const offset = Math.max(0, options.offset ?? 0);
    return { items: published.slice(offset, offset + limit), total: published.length, limit, offset };
  }
  async getCollectionByContentItem(contentItemId) {
    return this.#store.getCollectionByContentItem(contentItemId);
  }
  async listCollections(siteId) {
    return this.#store.listCollections(siteId);
  }
  async renderRss(collectionId, options) {
    const collection = await this.#requireCollection(collectionId);
    const blog = await this.#cms.store.getContentSnapshot(collection.contentItemId);
    assertDomain(blog?.publishedRevision, "BLOG_NOT_PUBLISHED", "Blog is not published", 409);
    const list = await this.listPublishedArticles(collection.id, { limit: collection.feedSize });
    const title = options.title ?? String(blog.publishedRevision.fields.title ?? "Blog");
    const description = options.description ?? excerpt(blog.publishedRevision.document, 240);
    const base = options.siteUrl.replace(/\/$/, "");
    const items = list.items.map((article) => {
      const revision = article.snapshot.publishedRevision;
      const link = `${base}${article.snapshot.route.path}`;
      const articleTitle = String(revision.fields.title ?? "");
      return `<item><title>${xml(articleTitle)}</title><link>${xml(link)}</link><guid isPermaLink="true">${xml(link)}</guid><pubDate>${new Date(article.postedAt).toUTCString()}</pubDate><description>${xml(excerpt(revision.document, 400))}</description>${article.terms.map((term) => `<category>${xml(term.title)}</category>`).join("")}</item>`;
    }).join("");
    return `<?xml version="1.0" encoding="UTF-8"?><rss version="2.0"><channel><title>${xml(title)}</title><link>${xml(`${base}${blog.route.path}`)}</link><description>${xml(description)}</description><lastBuildDate>${new Date(this.#clock.now()).toUTCString()}</lastBuildDate>${items}</channel></rss>`;
  }
  async #createTaxonomyRecord(collection, input, now) {
    const taxonomy = {
      id: asTaxonomyId(newId("taxonomy")),
      collectionId: collection.id,
      key: input.key,
      title: input.title,
      kind: input.kind,
      hierarchical: input.hierarchical,
      state: "active",
      createdAt: now,
      updatedAt: now
    };
    await this.#store.createTaxonomy(taxonomy);
    return taxonomy;
  }
  async #setTaxonomyValue(actor, collectionId, revisionId, taxonomyId, termIds) {
    const collection = await this.#requireCollection(collectionId);
    const taxonomy = await this.#requireTaxonomy(taxonomyId);
    assertDomain(taxonomy.collectionId === collection.id, "TAXONOMY_COLLECTION_MISMATCH", "Taxonomy belongs to another blog", 422);
    await this.#cms.authorizeOperation(actor, Capabilities.ArticleClassify, { workspaceId: collection.workspaceId, siteId: collection.siteId, contentType: "article", risk: "low" }, "article.classify", "revision", revisionId);
    const revision = await this.#cms.store.getRevision(revisionId);
    assertDomain(revision, "REVISION_NOT_FOUND", "Revision not found", 404);
    const article = await this.#requireArticle(revision.contentItemId);
    assertDomain(article.collectionId === collection.id, "ARTICLE_COLLECTION_MISMATCH", "Revision belongs to another blog", 422);
    const valid = [];
    for (const termId of unique(termIds)) {
      const term = await this.#store.getTerm(termId);
      assertDomain(term && term.taxonomyId === taxonomy.id && term.state === "active", "INVALID_TERM", "Term is invalid for taxonomy", 422);
      valid.push(term.id);
    }
    const value = { revisionId, taxonomyId, termIds: valid };
    await this.#store.setRevisionTaxonomyValue(value);
    await this.#cms.recordSuccessfulOperation(actor, { workspaceId: collection.workspaceId, siteId: collection.siteId, action: "article.classify", resourceType: "revision", resourceId: revisionId, revisionId, capability: Capabilities.ArticleClassify, details: { taxonomyId, termIds: valid } });
  }
  async #resolveTerms(collectionId, revisionId) {
    const taxonomies = await this.#store.listTaxonomies(collectionId);
    const result = [];
    for (const taxonomy of taxonomies) {
      const value = await this.#resolveTaxonomyValue(revisionId, taxonomy.id, /* @__PURE__ */ new Set());
      for (const termId of value) {
        const term = await this.#store.getTerm(termId);
        if (term?.state === "active")
          result.push(term);
      }
    }
    return result;
  }
  async #resolveTaxonomyValue(revisionId, taxonomyId, visited) {
    if (visited.has(revisionId))
      return [];
    visited.add(revisionId);
    const direct = await this.#store.getRevisionTaxonomyValue(revisionId, taxonomyId);
    if (direct)
      return direct.termIds;
    const revision = await this.#cms.store.getRevision(revisionId);
    return revision?.basedOnRevisionId ? this.#resolveTaxonomyValue(revision.basedOnRevisionId, taxonomyId, visited) : [];
  }
  async #requireCollection(id) {
    const collection = await this.#store.getCollection(id);
    assertDomain(collection && collection.state === "active", "BLOG_NOT_FOUND", "Blog collection not found", 404);
    return collection;
  }
  async #requireTaxonomy(id) {
    const taxonomy = await this.#store.getTaxonomy(id);
    assertDomain(taxonomy && taxonomy.state === "active", "TAXONOMY_NOT_FOUND", "Taxonomy not found", 404);
    return taxonomy;
  }
  async #requireArticle(contentItemId) {
    const article = await this.#store.getArticle(contentItemId);
    assertDomain(article, "ARTICLE_NOT_FOUND", "Article is not registered in a blog", 404);
    return article;
  }
}
function clamp$2(value, min, max) {
  return Math.min(max, Math.max(min, Math.trunc(value)));
}
function unique(values) {
  return [...new Set(values)];
}
function normalizeTaxonomyKey(value) {
  const key2 = value.trim().toLowerCase().replace(/[^a-z0-9_-]+/g, "-").replace(/^-+|-+$/g, "");
  assertDomain(key2.length > 0, "TAXONOMY_KEY_REQUIRED", "Taxonomy key is required", 422);
  return key2;
}
function excerpt(document, max) {
  const text = [];
  const visit = (block) => {
    for (const value of Object.values(block.props)) {
      if (typeof value === "string" && !value.startsWith("ast_"))
        text.push(value);
    }
    for (const children of Object.values(block.slots))
      for (const child of children)
        visit(child);
  };
  for (const children of Object.values(document.root.slots))
    for (const child of children)
      visit(child);
  const normalized = text.join(" ").replace(/\s+/g, " ").trim();
  return normalized.length > max ? `${normalized.slice(0, max - 1)}…` : normalized;
}
function xml(value) {
  return value.replace(/[<>&"']/g, (ch) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;", "'": "&apos;" })[ch]);
}
class MemoryCustomContentStore {
  fields = /* @__PURE__ */ new Map();
  tables = /* @__PURE__ */ new Map();
  tableFields = /* @__PURE__ */ new Map();
  contents = /* @__PURE__ */ new Map();
  contentByItem = /* @__PURE__ */ new Map();
  entries = /* @__PURE__ */ new Map();
  revisions = /* @__PURE__ */ new Map();
  approvals = /* @__PURE__ */ new Map();
  async createField(field) {
    if ([...this.fields.values()].some((item) => item.workspaceId === field.workspaceId && item.key === field.key))
      throw new DomainError("CUSTOM_FIELD_KEY_EXISTS", "Custom field key already exists", 409);
    this.fields.set(field.id, clone$1(field));
  }
  async getField(id) {
    return maybe$1(this.fields.get(id));
  }
  async listFields(workspaceId) {
    return [...this.fields.values()].filter((item) => item.workspaceId === workspaceId).map(clone$1);
  }
  async createTable(table) {
    if ([...this.tables.values()].some((item) => item.workspaceId === table.workspaceId && item.key === table.key))
      throw new DomainError("CUSTOM_TABLE_KEY_EXISTS", "Custom table key already exists", 409);
    this.tables.set(table.id, clone$1(table));
  }
  async getTable(id) {
    return maybe$1(this.tables.get(id));
  }
  async listTables(workspaceId) {
    return [...this.tables.values()].filter((item) => item.workspaceId === workspaceId).map(clone$1);
  }
  async updateTable(table) {
    if (!this.tables.has(table.id))
      throw new DomainError("CUSTOM_TABLE_NOT_FOUND", "Custom table not found", 404);
    this.tables.set(table.id, clone$1(table));
  }
  async attachField(relation) {
    const key2 = `${relation.tableId}:${relation.fieldId}`;
    if (this.tableFields.has(key2))
      throw new DomainError("CUSTOM_TABLE_FIELD_EXISTS", "Field is already attached", 409);
    this.tableFields.set(key2, clone$1(relation));
  }
  async listTableFields(tableId) {
    return [...this.tableFields.values()].filter((item) => item.tableId === tableId).sort((a, b) => a.sortOrder - b.sortOrder).map(clone$1);
  }
  async createCustomContent(definition2) {
    if (this.contentByItem.has(definition2.contentItemId))
      throw new DomainError("CUSTOM_CONTENT_EXISTS", "Custom content definition already exists", 409);
    this.contents.set(definition2.id, clone$1(definition2));
    this.contentByItem.set(definition2.contentItemId, definition2.id);
  }
  async getCustomContent(id) {
    return maybe$1(this.contents.get(id));
  }
  async getCustomContentByContentItem(contentItemId) {
    const id = this.contentByItem.get(contentItemId);
    return id ? this.getCustomContent(id) : null;
  }
  async listCustomContents(siteId) {
    return [...this.contents.values()].filter((item) => item.siteId === siteId).map(clone$1);
  }
  async createEntry(entry, revision) {
    if (entry.slug && [...this.entries.values()].some((item) => item.customContentId === entry.customContentId && item.slug === entry.slug))
      throw new DomainError("CUSTOM_ENTRY_SLUG_EXISTS", "Entry slug already exists", 409);
    this.entries.set(entry.id, clone$1(entry));
    this.revisions.set(revision.id, clone$1(revision));
    return this.getEntry(entry.id);
  }
  async getEntry(id) {
    const entry = this.entries.get(id);
    if (!entry)
      return null;
    const working = this.revisions.get(entry.workingRevisionId);
    if (!working)
      throw new DomainError("CUSTOM_ENTRY_REVISION_MISSING", "Working revision missing", 500);
    return { entry: clone$1(entry), workingRevision: clone$1(working), publishedRevision: entry.publishedRevisionId ? clone$1(this.revisions.get(entry.publishedRevisionId) ?? null) : null };
  }
  async getEntryByPublicKey(customContentId, key2) {
    const entry = [...this.entries.values()].find((item) => item.customContentId === customContentId && (item.slug === key2 || item.id === key2));
    return entry ? this.getEntry(entry.id) : null;
  }
  async listEntries(customContentId) {
    const result = [];
    for (const entry of this.entries.values())
      if (entry.customContentId === customContentId)
        result.push(await this.getEntry(entry.id));
    return result;
  }
  async commitEntryRevision(input) {
    const entry = this.entries.get(input.entryId);
    if (!entry)
      throw new DomainError("CUSTOM_ENTRY_NOT_FOUND", "Custom entry not found", 404);
    if (entry.workingRevisionId !== input.baseRevisionId || entry.lockVersion !== input.expectedLockVersion)
      throw new DomainError("CUSTOM_ENTRY_REVISION_CONFLICT", "Custom entry changed since it was read", 409);
    this.revisions.set(input.revision.id, clone$1(input.revision));
    entry.workingRevisionId = input.revision.id;
    entry.lockVersion += 1;
    entry.updatedAt = input.revision.createdAt;
    return clone$1(input.revision);
  }
  async createApproval(approval) {
    this.approvals.set(approval.id, clone$1(approval));
  }
  async getApproval(id) {
    return maybe$1(this.approvals.get(id));
  }
  async listPendingApprovalsBySite(siteId) {
    const result = [];
    for (const approval of this.approvals.values()) {
      if (approval.state !== "pending")
        continue;
      const entry = this.entries.get(approval.entryId);
      if (!entry)
        continue;
      const definition2 = this.contents.get(entry.customContentId);
      if (definition2?.siteId === siteId)
        result.push(clone$1(approval));
    }
    return result.sort((a, b) => b.requestedAt - a.requestedAt);
  }
  async updateApproval(approval) {
    if (!this.approvals.has(approval.id))
      throw new DomainError("CUSTOM_ENTRY_APPROVAL_NOT_FOUND", "Approval not found", 404);
    this.approvals.set(approval.id, clone$1(approval));
  }
  async publishEntry(input) {
    const entry = this.entries.get(input.entryId);
    const approval = this.approvals.get(input.approvalId);
    const revision = this.revisions.get(input.revisionId);
    if (!entry || !revision)
      throw new DomainError("CUSTOM_ENTRY_NOT_FOUND", "Custom entry or revision not found", 404);
    if (!approval || approval.state !== "approved" || approval.entryId !== entry.id || approval.revisionId !== revision.id || approval.revisionHash !== revision.contentHash)
      throw new DomainError("CUSTOM_ENTRY_APPROVAL_REQUIRED", "Matching approved revision is required", 409);
    entry.publishedRevisionId = revision.id;
    entry.updatedAt = input.now;
    return this.getEntry(entry.id);
  }
  async unpublishEntry(input) {
    const entry = this.entries.get(input.entryId);
    if (!entry)
      throw new DomainError("CUSTOM_ENTRY_NOT_FOUND", "Custom entry not found", 404);
    if (entry.state !== "active")
      throw new DomainError("CUSTOM_ENTRY_TRASHED", "Trashed custom entry cannot be unpublished", 409);
    if (!entry.publishedRevisionId)
      throw new DomainError("CUSTOM_ENTRY_NOT_PUBLISHED", "Custom entry is not published", 409);
    entry.publishedRevisionId = null;
    entry.updatedAt = input.now;
    return this.getEntry(entry.id);
  }
}
function clone$1(value) {
  return structuredClone(value);
}
function maybe$1(value) {
  return value === void 0 ? null : clone$1(value);
}
class CustomContentService {
  #store;
  #cms;
  #clock;
  constructor(store, cms, options = {}) {
    this.#store = store;
    this.#cms = cms;
    this.#clock = options.clock ?? systemClock;
  }
  get store() {
    return this.#store;
  }
  async createField(actor, input) {
    await this.#cms.authorizeOperation(actor, Capabilities.CustomFieldManage, { workspaceId: input.workspaceId, contentType: "custom-content", risk: "medium" }, "custom-field.create", "workspace", input.workspaceId);
    const now = this.#clock.now();
    const field = {
      id: asCustomFieldId(newId("customField")),
      workspaceId: input.workspaceId,
      key: normalizeKey(input.key),
      name: input.name.trim(),
      type: input.type,
      description: input.description?.trim() ?? "",
      options: normalizeOptions(input.options ?? [], input.type),
      state: "active",
      createdAt: now,
      updatedAt: now
    };
    assertDomain(field.name.length > 0, "CUSTOM_FIELD_NAME_REQUIRED", "Field name is required", 422);
    await this.#store.createField(field);
    await this.#audit(actor, input.workspaceId, null, "custom-field.create", "custom-field", field.id, Capabilities.CustomFieldManage, { key: field.key, type: field.type });
    return field;
  }
  async createTable(actor, input) {
    await this.#cms.authorizeOperation(actor, Capabilities.CustomTableManage, { workspaceId: input.workspaceId, contentType: "custom-content", risk: "high" }, "custom-table.create", "workspace", input.workspaceId);
    const now = this.#clock.now();
    const table = {
      id: asCustomTableId(newId("customTable")),
      workspaceId: input.workspaceId,
      key: normalizeKey(input.key),
      name: input.name.trim(),
      kind: input.kind,
      hierarchical: input.kind === "master" ? Boolean(input.hierarchical) : false,
      displayFieldKey: input.displayFieldKey ? normalizeKey(input.displayFieldKey) : null,
      schemaVersion: 1,
      state: "active",
      createdAt: now,
      updatedAt: now
    };
    assertDomain(table.name.length > 0, "CUSTOM_TABLE_NAME_REQUIRED", "Table name is required", 422);
    await this.#store.createTable(table);
    await this.#audit(actor, input.workspaceId, null, "custom-table.create", "custom-table", table.id, Capabilities.CustomTableManage, { key: table.key, kind: table.kind });
    return table;
  }
  async attachField(actor, input) {
    const table = await this.#requireTable(input.tableId);
    const field = await this.#requireField(input.fieldId);
    assertDomain(table.workspaceId === field.workspaceId, "CUSTOM_FIELD_WORKSPACE_MISMATCH", "Field belongs to another workspace", 422);
    await this.#cms.authorizeOperation(actor, Capabilities.CustomTableManage, { workspaceId: table.workspaceId, contentType: "custom-content", risk: "high" }, "custom-table.attach-field", "custom-table", table.id);
    const relation = { tableId: table.id, fieldId: field.id, required: Boolean(input.required), searchable: Boolean(input.searchable), unique: Boolean(input.unique), sortOrder: input.sortOrder ?? (await this.#store.listTableFields(table.id)).length * 10, labelOverride: input.labelOverride?.trim() || null, createdAt: this.#clock.now() };
    await this.#store.attachField(relation);
    table.schemaVersion += 1;
    table.updatedAt = this.#clock.now();
    if (!table.displayFieldKey)
      table.displayFieldKey = field.key;
    await this.#store.updateTable(table);
    await this.#audit(actor, table.workspaceId, null, "custom-table.attach-field", "custom-table", table.id, Capabilities.CustomTableManage, { fieldId: field.id, schemaVersion: table.schemaVersion });
    return this.getTableSchema(table.id);
  }
  async getTableSchema(tableId) {
    const table = await this.#requireTable(tableId);
    const relations = await this.#store.listTableFields(table.id);
    const fields = [];
    for (const relation of relations) {
      const definition2 = await this.#requireField(relation.fieldId);
      fields.push({ definition: definition2, relation });
    }
    return { table, fields };
  }
  async createCustomContent(actor, input) {
    const table = await this.#requireTable(input.tableId);
    assertDomain(table.kind === "content", "CONTENT_TABLE_REQUIRED", "Only content tables can be bound to Custom Content", 422);
    const schema = await this.getTableSchema(table.id);
    assertDomain(schema.fields.length > 0, "CUSTOM_TABLE_EMPTY", "Attach at least one field before creating Custom Content", 422);
    const site = await this.#cms.store.getSite(input.siteId);
    assertDomain(site, "SITE_NOT_FOUND", "Site not found", 404);
    assertDomain(site.workspaceId === table.workspaceId, "CUSTOM_TABLE_WORKSPACE_MISMATCH", "Table belongs to another workspace", 422);
    const snapshot = await this.#cms.createCustomContent(actor, { siteId: input.siteId, parentId: input.parentId, slug: input.slug, title: input.title, document: input.document ?? createEmptyDocument() });
    const orderKey = input.listOrderFieldKey ? normalizeKey(input.listOrderFieldKey) : table.displayFieldKey ?? schema.fields[0].definition.key;
    assertDomain(schema.fields.some((item) => item.definition.key === orderKey), "CUSTOM_LIST_ORDER_FIELD_INVALID", "List order field is not in the table", 422);
    const now = this.#clock.now();
    const definition2 = { id: asCustomContentId(newId("customContent")), workspaceId: snapshot.item.workspaceId, siteId: snapshot.item.siteId, contentItemId: snapshot.item.id, tableId: table.id, listCount: clamp$1(input.listCount ?? 10, 1, 100), listOrderFieldKey: orderKey, listDirection: input.listDirection ?? "asc", templateKey: normalizeTemplate(input.templateKey ?? "default"), state: "active", createdAt: now, updatedAt: now };
    await this.#store.createCustomContent(definition2);
    await this.#audit(actor, definition2.workspaceId, definition2.siteId, "custom-content.configure", "custom-content", definition2.id, Capabilities.CustomContentCreate, { contentItemId: definition2.contentItemId, tableId: definition2.tableId });
    return { definition: definition2, snapshot };
  }
  async createEntry(actor, input) {
    const content = await this.#requireContent(input.customContentId);
    const table = await this.#requireTable(content.tableId);
    await this.#cms.authorizeOperation(actor, Capabilities.CustomEntryCreate, { workspaceId: content.workspaceId, siteId: content.siteId, contentType: "custom-entry", risk: "low" }, "custom-entry.create", "custom-content", content.id);
    const schema = await this.getTableSchema(table.id);
    const values = await this.#validateValues(schema, input.values, null, content.id);
    const parentEntryId = input.parentEntryId ?? null;
    if (parentEntryId) {
      assertDomain(table.kind === "master" && table.hierarchical, "CUSTOM_ENTRY_HIERARCHY_NOT_ALLOWED", "Only hierarchical master tables allow parent entries", 422);
      const parent = await this.#store.getEntry(parentEntryId);
      assertDomain(parent?.entry.tableId === table.id, "CUSTOM_ENTRY_PARENT_INVALID", "Parent entry is invalid", 422);
    }
    const slug = normalizeEntrySlug(input.slug ?? null);
    const now = this.#clock.now();
    const entryId = asCustomEntryId(newId("customEntry"));
    const revisionId = asCustomEntryRevisionId(newId("customEntryRevision"));
    const hash = await sha256(stableStringify({ schemaVersion: table.schemaVersion, values }));
    const revision = { id: revisionId, entryId, revisionNumber: 1, basedOnRevisionId: null, schemaVersion: table.schemaVersion, values, contentHash: hash, createdBy: actor.actorId, changeSummary: "Initial custom entry", createdAt: now };
    const entry = { id: entryId, customContentId: content.id, tableId: table.id, slug, parentEntryId, workingRevisionId: revision.id, publishedRevisionId: null, lockVersion: 0, state: "active", createdBy: actor.onBehalfOf ?? actor.actorId, createdAt: now, updatedAt: now };
    const snapshot = await this.#store.createEntry(entry, revision);
    await this.#audit(actor, content.workspaceId, content.siteId, "custom-entry.create", "custom-entry", entry.id, Capabilities.CustomEntryCreate, { customContentId: content.id, revisionId: revision.id });
    return snapshot;
  }
  async reviseEntry(actor, input) {
    const snapshot = await this.#requireEntry(input.entryId);
    const content = await this.#requireContent(snapshot.entry.customContentId);
    const schema = await this.getTableSchema(snapshot.entry.tableId);
    await this.#cms.authorizeOperation(actor, Capabilities.CustomEntryRevise, { workspaceId: content.workspaceId, siteId: content.siteId, contentType: "custom-entry", risk: "low" }, "custom-entry.revise", "custom-entry", snapshot.entry.id);
    const values = await this.#validateValues(schema, input.values, snapshot.entry.id, content.id);
    const now = this.#clock.now();
    const hash = await sha256(stableStringify({ schemaVersion: schema.table.schemaVersion, values }));
    const revision = { id: asCustomEntryRevisionId(newId("customEntryRevision")), entryId: snapshot.entry.id, revisionNumber: snapshot.workingRevision.revisionNumber + 1, basedOnRevisionId: input.baseRevisionId, schemaVersion: schema.table.schemaVersion, values, contentHash: hash, createdBy: actor.actorId, changeSummary: input.changeSummary.trim() || "Custom entry revision", createdAt: now };
    const saved = await this.#store.commitEntryRevision({ entryId: snapshot.entry.id, baseRevisionId: input.baseRevisionId, expectedLockVersion: input.expectedLockVersion, revision });
    await this.#audit(actor, content.workspaceId, content.siteId, "custom-entry.revise", "custom-entry", snapshot.entry.id, Capabilities.CustomEntryRevise, { revisionId: saved.id, schemaVersion: saved.schemaVersion });
    return saved;
  }
  async requestApproval(actor, input) {
    const snapshot = await this.#requireEntry(input.entryId);
    const content = await this.#requireContent(snapshot.entry.customContentId);
    await this.#cms.authorizeOperation(actor, Capabilities.CustomEntryRequestPublish, { workspaceId: content.workspaceId, siteId: content.siteId, contentType: "custom-entry", risk: "medium" }, "custom-entry.request-publish", "custom-entry", snapshot.entry.id);
    assertDomain(snapshot.workingRevision.id === input.revisionId, "CUSTOM_ENTRY_REVISION_NOT_CURRENT", "Approval must target the current working revision", 409);
    const now = this.#clock.now();
    const approval = { id: asCustomEntryApprovalId(newId("customEntryApproval")), entryId: snapshot.entry.id, revisionId: snapshot.workingRevision.id, revisionHash: snapshot.workingRevision.contentHash, state: "pending", requestedBy: actor.actorId, requestedAt: now, decidedBy: null, decidedAt: null, decisionComment: "" };
    await this.#store.createApproval(approval);
    await this.#audit(actor, content.workspaceId, content.siteId, "custom-entry.request-publish", "custom-entry", snapshot.entry.id, Capabilities.CustomEntryRequestPublish, { approvalId: approval.id, revisionId: approval.revisionId });
    return approval;
  }
  async listPendingApprovals(actor, siteId) {
    const definitions = await this.#store.listCustomContents(siteId);
    if (!definitions.length)
      return [];
    const first = definitions[0];
    await this.#cms.authorizeOperation(actor, Capabilities.CustomEntryApprove, { workspaceId: first.workspaceId, siteId: first.siteId, contentType: "custom-entry", risk: "medium" }, "custom-entry.approvals.list", "site", siteId);
    const pending = await this.#store.listPendingApprovalsBySite(siteId);
    const items = [];
    for (const approval of pending) {
      const snapshot = await this.#store.getEntry(approval.entryId);
      if (!snapshot)
        continue;
      items.push({
        approval,
        customContentId: snapshot.entry.customContentId,
        entrySlug: snapshot.entry.slug
      });
    }
    return items;
  }
  async decideApproval(actor, input) {
    const approval = await this.#requireApproval(input.approvalId);
    const snapshot = await this.#requireEntry(approval.entryId);
    const content = await this.#requireContent(snapshot.entry.customContentId);
    await this.#cms.authorizeOperation(actor, Capabilities.CustomEntryApprove, { workspaceId: content.workspaceId, siteId: content.siteId, contentType: "custom-entry", risk: "high" }, "custom-entry.approve", "custom-entry", snapshot.entry.id);
    assertDomain(approval.state === "pending", "CUSTOM_ENTRY_APPROVAL_DECIDED", "Approval has already been decided", 409);
    approval.state = input.decision;
    approval.decidedBy = actor.actorId;
    approval.decidedAt = this.#clock.now();
    approval.decisionComment = input.comment?.trim() ?? "";
    await this.#store.updateApproval(approval);
    await this.#audit(actor, content.workspaceId, content.siteId, "custom-entry.approve", "custom-entry", snapshot.entry.id, Capabilities.CustomEntryApprove, { approvalId: approval.id, decision: approval.state });
    return approval;
  }
  async publishEntry(actor, input) {
    const snapshot = await this.#requireEntry(input.entryId);
    const content = await this.#requireContent(snapshot.entry.customContentId);
    await this.#cms.authorizeOperation(actor, Capabilities.CustomEntryPublish, { workspaceId: content.workspaceId, siteId: content.siteId, contentType: "custom-entry", risk: "high" }, "custom-entry.publish", "custom-entry", snapshot.entry.id);
    const published = await this.#store.publishEntry({ ...input, now: this.#clock.now() });
    await this.#audit(actor, content.workspaceId, content.siteId, "custom-entry.publish", "custom-entry", snapshot.entry.id, Capabilities.CustomEntryPublish, { revisionId: input.revisionId, approvalId: input.approvalId });
    return published;
  }
  async unpublishEntry(actor, input) {
    const snapshot = await this.#requireEntry(input.entryId);
    const content = await this.#requireContent(snapshot.entry.customContentId);
    await this.#cms.authorizeOperation(actor, Capabilities.CustomEntryUnpublish, { workspaceId: content.workspaceId, siteId: content.siteId, contentType: "custom-entry", risk: "high" }, "custom-entry.unpublish", "custom-entry", snapshot.entry.id);
    const previousRevisionId = snapshot.entry.publishedRevisionId;
    if (!previousRevisionId)
      throw new DomainError("CUSTOM_ENTRY_NOT_PUBLISHED", "Custom entry is not published", 409);
    const unpublished = await this.#store.unpublishEntry({ entryId: input.entryId, now: this.#clock.now() });
    await this.#audit(actor, content.workspaceId, content.siteId, "custom-entry.unpublish", "custom-entry", snapshot.entry.id, Capabilities.CustomEntryUnpublish, { previousRevisionId });
    return unpublished;
  }
  async listPublished(customContentId, options = {}) {
    const content = await this.#requireContent(customContentId);
    const schema = await this.getTableSchema(content.tableId);
    const rows = (await this.#store.listEntries(content.id)).filter((item) => item.entry.state === "active" && item.publishedRevision);
    const filtered = rows.filter((item) => matches(item.publishedRevision.values, schema, options));
    filtered.sort((a, b) => compareValues(a.publishedRevision.values[content.listOrderFieldKey], b.publishedRevision.values[content.listOrderFieldKey], content.listDirection));
    const limit = clamp$1(options.limit ?? content.listCount, 1, 100);
    const offset = Math.max(0, options.offset ?? 0);
    return { items: filtered.slice(offset, offset + limit), total: filtered.length, limit, offset };
  }
  async getPublishedByKey(customContentId, key2) {
    const entry = await this.#store.getEntryByPublicKey(customContentId, key2);
    return entry?.entry.state === "active" && entry.publishedRevision ? entry : null;
  }
  async getCustomContentByContentItem(contentItemId) {
    return this.#store.getCustomContentByContentItem(contentItemId);
  }
  async listCustomContents(siteId) {
    return this.#store.listCustomContents(siteId);
  }
  async getEntry(actor, entryId) {
    const snapshot = await this.#requireEntry(entryId);
    const content = await this.#requireContent(snapshot.entry.customContentId);
    await this.#cms.authorizeOperation(actor, Capabilities.CustomEntryRead, { workspaceId: content.workspaceId, siteId: content.siteId, contentType: "custom-entry", risk: "low" }, "custom-entry.read", "custom-entry", entryId);
    return snapshot;
  }
  async listEntries(actor, customContentId) {
    const content = await this.#requireContent(customContentId);
    await this.#cms.authorizeOperation(actor, Capabilities.CustomEntryRead, { workspaceId: content.workspaceId, siteId: content.siteId, contentType: "custom-entry", risk: "low" }, "custom-entry.list", "custom-content", customContentId);
    return this.#store.listEntries(customContentId);
  }
  async listFields(workspaceId) {
    return this.#store.listFields(workspaceId);
  }
  async listTables(workspaceId) {
    return this.#store.listTables(workspaceId);
  }
  async validatePublicValues(tableId, input) {
    const schema = await this.getTableSchema(tableId);
    const allowed = new Set(schema.fields.map((item) => item.definition.key));
    for (const key2 of Object.keys(input))
      assertDomain(allowed.has(key2), "CUSTOM_ENTRY_UNKNOWN_FIELD", `Unknown custom field: ${key2}`, 422);
    const result = {};
    for (const { definition: definition2, relation } of schema.fields) {
      const raw = input[definition2.key];
      if (raw === void 0 || raw === null || raw === "") {
        assertDomain(!relation.required, "CUSTOM_ENTRY_REQUIRED_FIELD", `${relation.labelOverride ?? definition2.name} is required`, 422);
        result[definition2.key] = null;
        continue;
      }
      result[definition2.key] = validateCustomFieldValue(definition2, raw);
    }
    return result;
  }
  async #validateValues(schema, input, currentEntryId, customContentId) {
    const allowed = new Set(schema.fields.map((item) => item.definition.key));
    for (const key2 of Object.keys(input))
      assertDomain(allowed.has(key2), "CUSTOM_ENTRY_UNKNOWN_FIELD", `Unknown custom field: ${key2}`, 422);
    const result = {};
    for (const { definition: definition2, relation } of schema.fields) {
      const raw = input[definition2.key];
      if (raw === void 0 || raw === null || raw === "") {
        assertDomain(!relation.required, "CUSTOM_ENTRY_REQUIRED_FIELD", `${relation.labelOverride ?? definition2.name} is required`, 422);
        result[definition2.key] = null;
        continue;
      }
      result[definition2.key] = validateCustomFieldValue(definition2, raw);
    }
    const existing = await this.#store.listEntries(customContentId);
    for (const { definition: definition2, relation } of schema.fields) {
      if (!relation.unique || result[definition2.key] === null)
        continue;
      assertDomain(!existing.some((item) => item.entry.id !== currentEntryId && item.entry.state === "active" && stableStringify(item.workingRevision.values[definition2.key]) === stableStringify(result[definition2.key])), "CUSTOM_ENTRY_UNIQUE_FIELD", `${relation.labelOverride ?? definition2.name} must be unique`, 409);
    }
    return result;
  }
  async #requireField(id) {
    const value = await this.#store.getField(id);
    assertDomain(value && value.state === "active", "CUSTOM_FIELD_NOT_FOUND", "Custom field not found", 404);
    return value;
  }
  async #requireTable(id) {
    const value = await this.#store.getTable(id);
    assertDomain(value && value.state === "active", "CUSTOM_TABLE_NOT_FOUND", "Custom table not found", 404);
    return value;
  }
  async #requireContent(id) {
    const value = await this.#store.getCustomContent(id);
    assertDomain(value && value.state === "active", "CUSTOM_CONTENT_NOT_FOUND", "Custom content not found", 404);
    return value;
  }
  async #requireEntry(id) {
    const value = await this.#store.getEntry(id);
    assertDomain(value, "CUSTOM_ENTRY_NOT_FOUND", "Custom entry not found", 404);
    return value;
  }
  async #requireApproval(id) {
    const value = await this.#store.getApproval(id);
    assertDomain(value, "CUSTOM_ENTRY_APPROVAL_NOT_FOUND", "Custom entry approval not found", 404);
    return value;
  }
  async #audit(actor, workspaceId, siteId, action, resourceType, resourceId, capability, details) {
    await this.#cms.recordSuccessfulOperation(actor, { workspaceId, siteId, action, resourceType, resourceId, revisionId: null, capability, details });
  }
}
function validateCustomFieldValue(field, value) {
  switch (field.type) {
    case "text":
    case "textarea":
    case "tel":
      assertDomain(typeof value === "string", "CUSTOM_FIELD_TYPE", `${field.name} must be text`, 422);
      return value.trim();
    case "email":
      assertDomain(typeof value === "string" && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value), "CUSTOM_FIELD_EMAIL", `${field.name} must be an email address`, 422);
      return value.toLowerCase();
    case "integer": {
      const n = typeof value === "number" ? value : Number(value);
      assertDomain(Number.isSafeInteger(n), "CUSTOM_FIELD_INTEGER", `${field.name} must be an integer`, 422);
      return n;
    }
    case "decimal": {
      const n = typeof value === "number" ? value : Number(value);
      assertDomain(Number.isFinite(n), "CUSTOM_FIELD_DECIMAL", `${field.name} must be a number`, 422);
      return n;
    }
    case "boolean":
      assertDomain(typeof value === "boolean", "CUSTOM_FIELD_BOOLEAN", `${field.name} must be boolean`, 422);
      return value;
    case "date":
      assertDomain(typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(`${value}T00:00:00Z`)), "CUSTOM_FIELD_DATE", `${field.name} must be YYYY-MM-DD`, 422);
      return value;
    case "datetime":
      assertDomain(typeof value === "string" && !Number.isNaN(Date.parse(value)), "CUSTOM_FIELD_DATETIME", `${field.name} must be an ISO datetime`, 422);
      return new Date(value).toISOString();
    case "select":
      assertDomain(typeof value === "string" && field.options.some((item) => item.value === value), "CUSTOM_FIELD_OPTION", `${field.name} has an invalid option`, 422);
      return value;
    case "multiselect":
      assertDomain(Array.isArray(value) && value.every((item) => typeof item === "string" && field.options.some((option) => option.value === item)), "CUSTOM_FIELD_OPTION", `${field.name} has invalid options`, 422);
      return [...new Set(value)];
    case "asset":
      assertDomain(typeof value === "string" && value.startsWith("ast_"), "CUSTOM_FIELD_ASSET", `${field.name} must contain an Asset ID`, 422);
      return value;
    case "richtext":
      assertDomain(value && typeof value === "object" && !Array.isArray(value) && "formatVersion" in value, "CUSTOM_FIELD_RICHTEXT", `${field.name} must contain a structured document`, 422);
      return structuredClone(value);
  }
}
function matches(values, schema, options) {
  for (const [key2, expected] of Object.entries(options.filters ?? {})) {
    if (!schema.fields.some((item) => item.definition.key === key2))
      return false;
    const actual = values[key2];
    if (Array.isArray(actual)) {
      if (!actual.includes(expected))
        return false;
    } else if (stableStringify(actual) !== stableStringify(expected))
      return false;
  }
  if (options.query) {
    const query = options.query.toLocaleLowerCase("ja");
    const searchable = schema.fields.filter((item) => item.relation.searchable).map((item) => values[item.definition.key]).filter((value) => value !== null && value !== void 0).map(String).join(" ").toLocaleLowerCase("ja");
    if (!searchable.includes(query))
      return false;
  }
  return true;
}
function compareValues(a, b, direction) {
  const factor = direction === "asc" ? 1 : -1;
  if (a === b)
    return 0;
  if (a === null || a === void 0)
    return 1;
  if (b === null || b === void 0)
    return -1;
  if (typeof a === "number" && typeof b === "number")
    return (a - b) * factor;
  return String(a).localeCompare(String(b), "ja") * factor;
}
function normalizeKey(value) {
  const key2 = value.trim().toLowerCase().replace(/[^a-z0-9_]+/g, "_").replace(/^_+|_+$/g, "");
  assertDomain(/^[a-z][a-z0-9_]{0,62}$/.test(key2), "CUSTOM_KEY_INVALID", "Keys must start with a letter and contain lowercase ASCII letters, digits, and underscores", 422);
  return key2;
}
function normalizeEntrySlug(value) {
  if (value === null || value.trim() === "")
    return null;
  const slug = normalizeSlug(value);
  assertDomain(!/^\d+$/.test(slug), "CUSTOM_ENTRY_NUMERIC_SLUG", "Numeric-only slugs are not allowed", 422);
  return slug;
}
function normalizeOptions(options, type) {
  if (type !== "select" && type !== "multiselect")
    return [];
  assertDomain(options.length > 0, "CUSTOM_FIELD_OPTIONS_REQUIRED", "Select fields require options", 422);
  const seen = /* @__PURE__ */ new Set();
  return options.map((item) => {
    const value = item.value.trim();
    const label = item.label.trim();
    assertDomain(value.length > 0 && label.length > 0 && !seen.has(value), "CUSTOM_FIELD_OPTIONS_INVALID", "Options must have unique non-empty values", 422);
    seen.add(value);
    return { value, label };
  });
}
function normalizeTemplate(value) {
  const key2 = value.trim().toLowerCase().replace(/[^a-z0-9_-]+/g, "-");
  return key2 || "default";
}
function clamp$1(value, min, max) {
  return Math.min(max, Math.max(min, Math.trunc(value)));
}
class MemoryMailFormStore {
  forms = /* @__PURE__ */ new Map();
  byContent = /* @__PURE__ */ new Map();
  policies = /* @__PURE__ */ new Map();
  confirmations = /* @__PURE__ */ new Map();
  submissions = /* @__PURE__ */ new Map();
  payloads = /* @__PURE__ */ new Map();
  notifications = /* @__PURE__ */ new Map();
  async createForm(definition2, policies) {
    if (this.byContent.has(definition2.contentItemId))
      throw new DomainError("MAIL_FORM_EXISTS", "Mail form already exists", 409);
    this.forms.set(definition2.id, clone(definition2));
    this.byContent.set(definition2.contentItemId, definition2.id);
    for (const policy of policies)
      this.policies.set(`${policy.mailFormId}:${policy.fieldId}`, clone(policy));
  }
  async getForm(id) {
    return maybe(this.forms.get(id));
  }
  async getFormByContentItem(contentItemId) {
    const id = this.byContent.get(contentItemId);
    return id ? this.getForm(id) : null;
  }
  async listForms(siteId) {
    return [...this.forms.values()].filter((v) => v.siteId === siteId).map(clone);
  }
  async listFieldPolicies(mailFormId) {
    return [...this.policies.values()].filter((v) => v.mailFormId === mailFormId).map(clone);
  }
  async createConfirmation(session) {
    this.confirmations.set(session.id, clone(session));
  }
  async getConfirmation(id) {
    return maybe(this.confirmations.get(id));
  }
  async acceptSubmission(input) {
    const confirmation = this.confirmations.get(input.confirmationId);
    if (!confirmation)
      throw new DomainError("MAIL_CONFIRMATION_NOT_FOUND", "Confirmation not found", 404);
    if (confirmation.usedAt !== null)
      throw new DomainError("MAIL_CONFIRMATION_USED", "Confirmation has already been submitted", 409);
    if (confirmation.expiresAt < input.now)
      throw new DomainError("MAIL_CONFIRMATION_EXPIRED", "Confirmation has expired", 410);
    confirmation.usedAt = input.now;
    this.submissions.set(input.submission.id, clone(input.submission));
    this.payloads.set(input.payload.submissionId, clone(input.payload));
    for (const notification of input.notifications)
      this.notifications.set(notification.id, clone(notification));
    return clone(input.submission);
  }
  async getSubmission(id) {
    const s = this.submissions.get(id);
    if (!s)
      return null;
    return { submission: clone(s), values: s.payloadState === "available" ? clone(this.payloads.get(id)?.values ?? null) : null, redacted: false };
  }
  async listSubmissions(mailFormId) {
    const result = [];
    for (const s of this.submissions.values())
      if (s.mailFormId === mailFormId)
        result.push(await this.getSubmission(s.id));
    return result.sort((a, b) => b.submission.receivedAt - a.submission.receivedAt);
  }
  async purgeSubmission(id, now) {
    const s = this.submissions.get(id);
    if (!s)
      throw new DomainError("MAIL_SUBMISSION_NOT_FOUND", "Submission not found", 404);
    this.payloads.delete(id);
    s.payloadState = "purged";
    return clone(s);
  }
  async listPendingNotifications(limit, now) {
    return [...this.notifications.values()].filter((n) => n.state === "pending" && n.availableAt <= now).sort((a, b) => a.availableAt - b.availableAt).slice(0, limit).map(clone);
  }
  async getNotification(id) {
    return maybe(this.notifications.get(id));
  }
  async listNotificationsForSubmission(id) {
    return [...this.notifications.values()].filter((n) => n.submissionId === id).map(clone);
  }
  async updateNotification(n) {
    if (!this.notifications.has(n.id))
      throw new DomainError("MAIL_NOTIFICATION_NOT_FOUND", "Notification not found", 404);
    this.notifications.set(n.id, clone(n));
  }
  async updateSubmissionState(id, state) {
    const s = this.submissions.get(id);
    if (!s)
      throw new DomainError("MAIL_SUBMISSION_NOT_FOUND", "Submission not found", 404);
    s.state = state;
  }
}
function clone(v) {
  return structuredClone(v);
}
function maybe(v) {
  return v === void 0 ? null : clone(v);
}
class UnavailableBotVerifier {
  async verify() {
    return { success: false, errorCodes: ["turnstile-not-configured"] };
  }
}
class TurnstileBotVerifier {
  #secret;
  #fetch;
  constructor(secret, fetchImpl = fetch) {
    this.#secret = secret;
    this.#fetch = fetchImpl;
  }
  async verify(input) {
    const body = { secret: this.#secret, response: input.token, idempotency_key: input.idempotencyKey };
    if (input.remoteIp)
      body.remoteip = input.remoteIp;
    const response = await this.#fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
    if (!response.ok)
      return { success: false, errorCodes: [`http-${response.status}`] };
    const data = await response.json();
    if (input.expectedHostname && data.hostname !== input.expectedHostname)
      return { success: false, ...data.hostname ? { hostname: data.hostname } : {}, ...data.action ? { action: data.action } : {}, errorCodes: ["hostname-mismatch"] };
    return { success: Boolean(data.success), ...data.hostname ? { hostname: data.hostname } : {}, ...data.action ? { action: data.action } : {}, ...data["error-codes"] ? { errorCodes: data["error-codes"] } : {} };
  }
}
class MailFormService {
  #store;
  #cms;
  #custom;
  #clock;
  #signingSecret;
  #privacySalt;
  #bot;
  #sender;
  constructor(input) {
    this.#store = input.store;
    this.#cms = input.cms;
    this.#custom = input.customContent;
    this.#signingSecret = input.signingSecret;
    this.#privacySalt = input.privacySalt ?? input.signingSecret;
    this.#bot = input.botVerifier ?? new UnavailableBotVerifier();
    this.#sender = input.sender ?? null;
    this.#clock = input.clock ?? systemClock;
  }
  get store() {
    return this.#store;
  }
  async createMailForm(actor, input) {
    const schema = await this.#custom.getTableSchema(input.tableId);
    const site = await this.#cms.store.getSite(input.siteId);
    assertDomain(site, "SITE_NOT_FOUND", "Site not found", 404);
    assertDomain(schema.table.workspaceId === site.workspaceId, "MAIL_TABLE_WORKSPACE_MISMATCH", "Table belongs to another workspace", 422);
    assertDomain(schema.table.kind === "content", "MAIL_TABLE_KIND_INVALID", "Mail forms require a content table", 422);
    assertDomain(schema.fields.length > 0, "MAIL_FORM_EMPTY", "Attach at least one field", 422);
    assertDomain(schema.fields.length <= 100, "MAIL_FORM_TOO_MANY_FIELDS", "Mail forms support at most 100 fields", 422);
    for (const { definition: definition3 } of schema.fields)
      assertDomain(!["asset", "richtext"].includes(definition3.type), "MAIL_FIELD_TYPE_UNSUPPORTED", `${definition3.name} cannot be used in a public mail form`, 422);
    const recipients = normalizeEmails(input.recipientEmails);
    const sender = normalizeEmail(input.senderAddress, "senderAddress");
    const subjectTemplate = normalizeSubject(input.subjectTemplate ?? "【{{formTitle}}】お問い合わせ", "subjectTemplate");
    const autoReplySubject = normalizeSubject(input.autoReplySubject ?? "お問い合わせを受け付けました", "autoReplySubject");
    const autoReplyKey = input.autoReplyEmailFieldKey?.trim() || null;
    if (input.autoReplyEnabled) {
      assertDomain(autoReplyKey, "MAIL_AUTOREPLY_FIELD_REQUIRED", "Auto reply requires an email field", 422);
      const field = schema.fields.find((f) => f.definition.key === autoReplyKey);
      assertDomain(field?.definition.type === "email", "MAIL_AUTOREPLY_FIELD_INVALID", "Auto reply field must be an email field", 422);
    }
    const fieldIds = new Set(schema.fields.map(({ definition: definition3 }) => String(definition3.id)));
    for (const policy of input.fieldPolicies ?? [])
      assertDomain(fieldIds.has(String(policy.fieldId)), "MAIL_FORM_FIELD_POLICY_INVALID", "Field policy refers to a field outside the form table", 422);
    const confirmationTtlSeconds = clamp(input.confirmationTtlSeconds ?? 900, 60, 3600);
    const retentionDays = clamp(input.retentionDays ?? 90, 1, 3650);
    const snapshot = await this.#cms.createMailForm(actor, { siteId: input.siteId, parentId: input.parentId, slug: input.slug, title: input.title, document: input.document ?? createEmptyDocument() });
    const now = this.#clock.now();
    const definition2 = { id: asMailFormId(newId("mailForm")), workspaceId: site.workspaceId, siteId: site.id, contentItemId: snapshot.item.id, tableId: schema.table.id, recipientEmails: recipients, senderAddress: sender, subjectTemplate, autoReplyEnabled: Boolean(input.autoReplyEnabled), autoReplyEmailFieldKey: autoReplyKey, autoReplySubject, confirmationTtlSeconds, retentionDays, turnstileRequired: input.turnstileRequired ?? true, state: "active", createdAt: now, updatedAt: now };
    const requested = new Map((input.fieldPolicies ?? []).map((p) => [String(p.fieldId), p]));
    const policies = schema.fields.map(({ definition: field }) => {
      const policy = requested.get(String(field.id));
      const privacyClass = policy?.privacyClass ?? defaultPrivacy(field.type);
      return { mailFormId: definition2.id, fieldId: field.id, privacyClass, includeInOwnerNotification: policy?.includeInOwnerNotification ?? true, includeInAutoReply: policy?.includeInAutoReply ?? privacyClass !== "sensitive", createdAt: now };
    });
    await this.#store.createForm(definition2, policies);
    await this.#audit(actor, definition2, "mail-form.configure", Capabilities.MailFormManage, { tableId: definition2.tableId, recipientCount: recipients.length, turnstileRequired: definition2.turnstileRequired });
    return { definition: definition2, snapshot };
  }
  async prepareConfirmation(input) {
    const form = await this.#requirePublicForm(input.mailFormId);
    assertDomain(!input.honeypot, "MAIL_FORM_SPAM_REJECTED", "Submission rejected", 422);
    if (form.turnstileRequired) {
      assertDomain(input.turnstileToken, "TURNSTILE_TOKEN_REQUIRED", "Turnstile token is required", 422);
      const result = await this.#bot.verify({ token: input.turnstileToken, idempotencyKey: crypto.randomUUID(), ...input.remoteIp ? { remoteIp: input.remoteIp } : {}, ...input.hostname ? { expectedHostname: input.hostname } : {} });
      assertDomain(result.success, "TURNSTILE_VERIFICATION_FAILED", "Turnstile verification failed", 422, { errorCodes: result.errorCodes ?? [] });
    }
    const values = await this.#custom.validatePublicValues(form.tableId, input.values);
    assertMailPayloadLimits(values);
    const schema = await this.#custom.getTableSchema(form.tableId);
    const now = this.#clock.now();
    const valuesHash = await sha256(stableStringify({ schemaVersion: schema.table.schemaVersion, values }));
    const session = { id: asMailConfirmationId(newId("mailConfirmation")), mailFormId: form.id, schemaVersion: schema.table.schemaVersion, values, valuesHash, clientFingerprintHash: await this.#fingerprint(input.remoteIp, input.userAgent), expiresAt: now + form.confirmationTtlSeconds * 1e3, usedAt: null, createdAt: now };
    const token = await signCompactToken({ confirmationId: session.id, mailFormId: form.id, valuesHash, exp: session.expiresAt }, this.#signingSecret);
    await this.#store.createConfirmation(session);
    return { session, token };
  }
  async submitConfirmation(input) {
    const payload = await verifyCompactToken(input.token, this.#signingSecret);
    assertDomain(payload && payload.confirmationId === input.confirmationId, "MAIL_CONFIRMATION_TOKEN_INVALID", "Confirmation token is invalid", 403);
    const session = await this.#store.getConfirmation(input.confirmationId);
    assertDomain(session, "MAIL_CONFIRMATION_NOT_FOUND", "Confirmation not found", 404);
    const now = this.#clock.now();
    assertDomain(payload.mailFormId === session.mailFormId && payload.valuesHash === session.valuesHash && payload.exp === session.expiresAt, "MAIL_CONFIRMATION_TOKEN_INVALID", "Confirmation token does not match", 403);
    assertDomain(session.expiresAt >= now, "MAIL_CONFIRMATION_EXPIRED", "Confirmation has expired", 410);
    assertDomain(session.usedAt === null, "MAIL_CONFIRMATION_USED", "Confirmation has already been submitted", 409);
    const form = await this.#requireForm(session.mailFormId);
    const schema = await this.#custom.getTableSchema(form.tableId);
    const currentHash = await sha256(stableStringify({ schemaVersion: session.schemaVersion, values: session.values }));
    assertDomain(currentHash === session.valuesHash, "MAIL_CONFIRMATION_CORRUPT", "Confirmation payload is corrupt", 500);
    const submission = { id: asMailSubmissionId(newId("mailSubmission")), mailFormId: form.id, confirmationId: session.id, schemaVersion: session.schemaVersion, payloadHash: session.valuesHash, payloadState: "available", clientFingerprintHash: session.clientFingerprintHash, receivedAt: now, purgeAt: now + form.retentionDays * 864e5, state: "notification-pending" };
    const storedPayload = { submissionId: submission.id, values: session.values, createdAt: now };
    const notifications = this.#buildNotifications(form, schema, submission, session.values, now);
    return this.#store.acceptSubmission({ confirmationId: session.id, submission, payload: storedPayload, notifications, now });
  }
  async listSubmissions(actor, mailFormId) {
    const form = await this.#requireForm(mailFormId);
    await this.#authorize(actor, form, Capabilities.MailSubmissionRead, "mail-submission.list", "low");
    const policies = await this.#store.listFieldPolicies(form.id);
    const schema = await this.#custom.getTableSchema(form.tableId);
    return (await this.#store.listSubmissions(form.id)).map((v) => this.#redact(v, schema, policies, false));
  }
  async getSubmission(actor, id, input = {}) {
    const raw = await this.#store.getSubmission(id);
    assertDomain(raw, "MAIL_SUBMISSION_NOT_FOUND", "Submission not found", 404);
    const form = await this.#requireForm(raw.submission.mailFormId);
    await this.#authorize(actor, form, Capabilities.MailSubmissionRead, "mail-submission.read", "low");
    let allowSensitive = false;
    if (input.includeSensitive && actor.actorType === "human") {
      await this.#authorize(actor, form, Capabilities.MailSubmissionReadSensitive, "mail-submission.read-sensitive", "high");
      allowSensitive = true;
    }
    const policies = await this.#store.listFieldPolicies(form.id);
    const schema = await this.#custom.getTableSchema(form.tableId);
    return this.#redact(raw, schema, policies, allowSensitive);
  }
  async purgeSubmission(actor, id) {
    const raw = await this.#store.getSubmission(id);
    assertDomain(raw, "MAIL_SUBMISSION_NOT_FOUND", "Submission not found", 404);
    const form = await this.#requireForm(raw.submission.mailFormId);
    await this.#authorize(actor, form, Capabilities.MailSubmissionPurge, "mail-submission.purge", "high");
    const result = await this.#store.purgeSubmission(id, this.#clock.now());
    await this.#audit(actor, form, "mail-submission.purge", Capabilities.MailSubmissionPurge, { submissionId: id });
    return result;
  }
  async purgeExpired(actor, mailFormId) {
    const form = await this.#requireForm(mailFormId);
    await this.#authorize(actor, form, Capabilities.MailSubmissionPurge, "mail-submission.purge-expired", "high");
    let count = 0;
    for (const view of await this.#store.listSubmissions(form.id))
      if (view.submission.payloadState === "available" && view.submission.purgeAt <= this.#clock.now()) {
        await this.#store.purgeSubmission(view.submission.id, this.#clock.now());
        count++;
      }
    return count;
  }
  async deliverPending(actor, limit = 20) {
    assertDomain(this.#sender, "MAIL_SENDER_NOT_CONFIGURED", "Mail sender is not configured", 503);
    const pending = await this.#store.listPendingNotifications(clamp(limit, 1, 100), this.#clock.now());
    let sent = 0, failed = 0;
    for (const notification of pending) {
      const view = await this.#store.getSubmission(notification.submissionId);
      if (!view?.values) {
        notification.state = "failed";
        notification.attempts++;
        notification.lastError = "Submission payload is unavailable";
        await this.#store.updateNotification(notification);
        failed++;
        continue;
      }
      const form = await this.#requireForm(view.submission.mailFormId);
      await this.#authorize(actor, form, Capabilities.MailNotificationDeliver, "mail-notification.deliver", "high");
      const schema = await this.#custom.getTableSchema(form.tableId);
      const policies = await this.#store.listFieldPolicies(form.id);
      try {
        await this.#sender.send({ to: notification.recipient, from: form.senderAddress, subject: notification.subject, text: renderMessage(schema, policies, view.values, notification.kind), ...notification.kind === "owner" && form.autoReplyEmailFieldKey && typeof view.values[form.autoReplyEmailFieldKey] === "string" ? { replyTo: String(view.values[form.autoReplyEmailFieldKey]) } : {} });
        notification.state = "sent";
        notification.sentAt = this.#clock.now();
        notification.attempts++;
        notification.lastError = "";
        await this.#store.updateNotification(notification);
        sent++;
      } catch (error) {
        notification.attempts++;
        notification.lastError = error instanceof Error ? error.message : String(error);
        notification.state = notification.attempts >= 5 ? "failed" : "pending";
        notification.availableAt = this.#clock.now() + Math.min(36e5, 2 ** notification.attempts * 3e4);
        await this.#store.updateNotification(notification);
        failed++;
      }
      const all = await this.#store.listNotificationsForSubmission(notification.submissionId);
      if (all.some((n) => n.state === "failed"))
        await this.#store.updateSubmissionState(notification.submissionId, "notification-failed");
      else if (all.length > 0 && all.every((n) => n.state === "sent"))
        await this.#store.updateSubmissionState(notification.submissionId, "notified");
      else
        await this.#store.updateSubmissionState(notification.submissionId, "notification-pending");
    }
    return { sent, failed };
  }
  async getFormByContentItem(contentItemId) {
    return this.#store.getFormByContentItem(contentItemId);
  }
  async listForms(siteId) {
    return this.#store.listForms(siteId);
  }
  async getForm(id) {
    return this.#requireForm(id);
  }
  async getSchema(id) {
    const form = await this.#requireForm(id);
    return this.#custom.getTableSchema(form.tableId);
  }
  async #requirePublicForm(id) {
    const form = await this.#requireForm(id);
    const snapshot = await this.#cms.store.getContentSnapshot(form.contentItemId);
    assertDomain(snapshot?.item.state === "active" && snapshot.publishedRevision, "MAIL_FORM_NOT_PUBLISHED", "Mail form is not published", 404);
    return form;
  }
  async #requireForm(id) {
    const form = await this.#store.getForm(id);
    assertDomain(form && form.state === "active", "MAIL_FORM_NOT_FOUND", "Mail form not found", 404);
    return form;
  }
  async #authorize(actor, form, capability, action, risk) {
    await this.#cms.authorizeOperation(actor, capability, { workspaceId: form.workspaceId, siteId: form.siteId, contentType: "mail-form", risk }, action, "mail-form", form.id);
  }
  async #audit(actor, form, action, capability, details) {
    await this.#cms.recordSuccessfulOperation(actor, { workspaceId: form.workspaceId, siteId: form.siteId, action, resourceType: "mail-form", resourceId: form.id, revisionId: null, capability, details });
  }
  async #fingerprint(ip, ua) {
    return sha256(`${this.#privacySalt}|${ip ?? ""}|${ua ?? ""}`);
  }
  #redact(view, schema, policies, allowSensitive) {
    if (!view.values)
      return { ...view, redacted: true };
    const byId = new Map(policies.map((p) => [String(p.fieldId), p]));
    const values = {};
    for (const { definition: definition2 } of schema.fields) {
      const policy = byId.get(String(definition2.id));
      const value = view.values[definition2.key];
      values[definition2.key] = allowSensitive || policy?.privacyClass === "non-personal" ? value : redactedValue(value, policy?.privacyClass ?? "personal");
    }
    return { ...view, values, redacted: !allowSensitive };
  }
  #buildNotifications(form, schema, submission, values, now) {
    const title = String(schema.table.name);
    const ownerSubject = safeOutboundSubject(form.subjectTemplate.replace(/\{\{formTitle\}\}/g, title));
    const list = form.recipientEmails.map((recipient) => ({ id: asMailNotificationId(newId("mailNotification")), submissionId: submission.id, kind: "owner", recipient, subject: ownerSubject, state: "pending", attempts: 0, availableAt: now, sentAt: null, lastError: "" }));
    if (form.autoReplyEnabled && form.autoReplyEmailFieldKey) {
      const recipient = values[form.autoReplyEmailFieldKey];
      if (typeof recipient === "string")
        list.push({ id: asMailNotificationId(newId("mailNotification")), submissionId: submission.id, kind: "auto-reply", recipient, subject: safeOutboundSubject(form.autoReplySubject), state: "pending", attempts: 0, availableAt: now, sentAt: null, lastError: "" });
    }
    return list;
  }
}
function renderMessage(schema, policies, values, kind) {
  const policyByField = new Map(policies.map((p) => [String(p.fieldId), p]));
  const lines = [kind === "owner" ? "フォームから送信がありました。" : "お問い合わせを受け付けました。", "", ...schema.fields.filter(({ definition: definition2 }) => {
    const p = policyByField.get(String(definition2.id));
    return kind === "owner" ? p?.includeInOwnerNotification : p?.includeInAutoReply;
  }).map(({ definition: definition2, relation }) => `${relation.labelOverride ?? definition2.name}: ${formatValue(values[definition2.key])}`)];
  return lines.join("\n");
}
function formatValue(v) {
  if (v === null || v === void 0)
    return "";
  return Array.isArray(v) ? v.join(", ") : String(v);
}
function normalizeEmail(value, label) {
  const email = value.trim().toLowerCase();
  assertDomain(/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email), "MAIL_EMAIL_INVALID", `${label} must be an email address`, 422);
  return email;
}
function normalizeEmails(values) {
  const result = [...new Set(values.map((v) => normalizeEmail(v, "recipientEmails")))];
  assertDomain(result.length > 0 && result.length <= 20, "MAIL_RECIPIENTS_INVALID", "One to twenty recipients are required", 422);
  return result;
}
function normalizeSubject(value, label) {
  const subject = value.trim();
  assertDomain(subject.length > 0 && subject.length <= 200 && !/[\r\n]/.test(subject), "MAIL_SUBJECT_INVALID", `${label} must be a single line of at most 200 characters`, 422);
  return subject;
}
function safeOutboundSubject(value) {
  return value.replace(/[\r\n]+/g, " ").trim().slice(0, 200) || "Notification";
}
function redactedValue(value, privacy) {
  if (value === null || value === void 0)
    return value;
  if (privacy === "sensitive")
    return "[sensitive]";
  if (typeof value === "string") {
    if (value.includes("@")) {
      const [local, domain] = value.split("@");
      return `${local?.slice(0, 1) ?? "*"}***@${domain ?? "***"}`;
    }
    return value.length <= 2 ? "**" : `${value.slice(0, 1)}***${value.slice(-1)}`;
  }
  return "[personal]";
}
function defaultPrivacy(type) {
  return type === "email" || type === "tel" ? "personal" : "non-personal";
}
function assertMailPayloadLimits(values) {
  const encoder = new TextEncoder();
  assertDomain(encoder.encode(stableStringify(values)).byteLength <= 262144, "MAIL_FORM_PAYLOAD_TOO_LARGE", "Form payload is too large", 413);
  for (const value of Object.values(values)) {
    if (typeof value === "string")
      assertDomain(encoder.encode(value).byteLength <= 65536, "MAIL_FORM_FIELD_TOO_LARGE", "A form field is too large", 413);
    if (Array.isArray(value))
      assertDomain(value.length <= 100, "MAIL_FORM_FIELD_TOO_LARGE", "A multi-value field contains too many values", 413);
  }
}
function clamp(v, min, max) {
  return Math.min(max, Math.max(min, Math.trunc(v)));
}
const ADMIN_VIEW_QUERY = "baserAdminView";
function shouldShowPublishedAdminBanner(url) {
  return url.searchParams.get(ADMIN_VIEW_QUERY) === "published";
}
function injectAdminViewBanner(html, kind, revisionId) {
  const short = revisionId.length > 8 ? revisionId.slice(-8) : revisionId;
  const heading = kind === "draft" ? "下書きプレビュー（未公開）" : "公開済みページ";
  const detail = kind === "draft" ? "この内容はサイトに公開されていません。" : "訪問者に表示されている公開版です。";
  const titlePrefix = kind === "draft" ? "【下書き】" : "【公開】";
  const modifier = kind === "draft" ? "draft" : "published";
  const style = `<style>.baser-admin-banner{position:sticky;top:0;z-index:9999;padding:.65rem 1rem;font:600 .9rem/1.4 system-ui,sans-serif;border-bottom:2px solid #111}.baser-admin-banner--draft{background:#fff3cd;color:#664d03;border-color:#997404}.baser-admin-banner--published{background:#d1e7dd;color:#0f5132;border-color:#0a3622}.baser-admin-banner small{display:block;font-weight:400;opacity:.9;margin-top:.15rem}</style>`;
  const banner = `<div class="baser-admin-banner baser-admin-banner--${modifier}" role="status" aria-live="polite"><strong>${heading}</strong><small>${detail} リビジョン …${escapeHtml$1(short)}</small></div>`;
  let out = html.replace(/<title>([^<]*)<\/title>/i, `<title>${titlePrefix}$1</title>`);
  out = out.replace(/<body([^>]*)>/i, `<body$1>${style}${banner}`);
  return out;
}
function escapeHtml$1(value) {
  return value.replace(/[&<>"']/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[character] ?? character);
}
const memoryCms = new CmsService(new MemoryCmsStore());
const memoryAssets = new MemoryAssetMetadataStore();
const memoryObjects = new MemoryAssetObjectStore();
const memoryPreviews = new MemoryPreviewStore();
const memoryBlog = new MemoryBlogStore();
const memoryCustomContent = new MemoryCustomContentStore();
const memoryMailForms = new MemoryMailFormStore();
const memoryThemes = new MemoryThemeStore();
const noopSecurity = {
  authorize: async () => {
  },
  success: async () => {
  }
};
function createPublicWorker(resolveCms = (env) => env.DB ? new CmsService(new D1CmsStore(env.DB)) : memoryCms, options = {}) {
  return {
    async fetch(request, env) {
      try {
        if (request.method !== "GET" && request.method !== "HEAD" && request.method !== "POST")
          return new Response("Method Not Allowed", { status: 405 });
        const url = new URL(request.url);
        const cms = resolveCms(env);
        const assets = options.resolveAssets?.(env, cms) ?? createAssetService(env);
        const blog = options.resolveBlog?.(env, cms) ?? createBlogService(env, cms);
        const customContent = options.resolveCustomContent?.(env, cms) ?? createCustomContentService(env, cms);
        const mailForms = options.resolveMailForms?.(env, cms, customContent) ?? createMailFormService(env, cms, customContent);
        const themes = options.resolveThemes?.(env, cms) ?? createThemeService(env, cms);
        const assetMatch = url.pathname.match(/^\/assets\/([^/]+)$/);
        if (assetMatch?.[1])
          return serveAsset(request, assets, assetMatch[1]);
        const previewMatch = url.pathname.match(/^\/_preview\/(.+)$/);
        if (previewMatch?.[1]) {
          const previews = options.resolvePreview?.(env, cms) ?? createPreviewService(env, cms);
          const resolved = await previews.resolve(decodeURIComponent(previewMatch[1]));
          const title2 = typeof resolved.revision.fields.title === "string" ? resolved.revision.fields.title : "";
          const theme = await themes.resolveRelease(resolved.session.themeRelease, resolved.session.siteId);
          const previewSite = await cms.store.getSite(resolved.session.siteId);
          let html2 = renderPage(resolved.revision.document, {
            assetUrl: (assetId) => `/assets/${encodeURIComponent(assetId)}`,
            contentUrl: (contentId) => `/content/${encodeURIComponent(contentId)}`
          }, { title: title2, revision: resolved.revision, preview: true, theme, siteName: previewSite?.name ?? "" });
          html2 = injectAdminViewBanner(html2, "draft", resolved.revision.id);
          return new Response(request.method === "HEAD" ? null : html2, {
            headers: {
              "content-type": "text/html; charset=utf-8",
              "cache-control": "private, no-store",
              "x-robots-tag": "noindex, nofollow, noarchive",
              "referrer-policy": "no-referrer",
              "x-baser-preview-session-id": resolved.session.id,
              "x-baser-content-id": resolved.snapshot.item.id,
              "x-baser-revision-id": resolved.revision.id,
              "content-security-policy": "default-src 'self'; img-src 'self' data:; frame-src https://www.youtube.com https://www.youtube-nocookie.com https://player.vimeo.com https://www.google.com https://maps.google.com; style-src 'unsafe-inline'"
            }
          });
        }
        if (!env.SITE_ID)
          return new Response("SITE_ID is not configured", { status: 503 });
        const siteId = asSiteId(env.SITE_ID);
        const activeTheme = await themes.resolveActive(siteId);
        const site = await cms.store.getSite(siteId);
        const siteName = site?.name ?? "";
        const mailActionMatch = url.pathname.match(/^(.*)\/(confirm|submit)\/?$/);
        if (request.method === "POST" && mailActionMatch) {
          const rootPath = mailActionMatch[1] || "/";
          const root = await cms.resolvePublicPath(siteId, rootPath);
          if (!root || root.kind !== "content" || root.snapshot.item.contentTypeKey !== "mail-form" || !root.snapshot.publishedRevision)
            return new Response("Not Found", { status: 404 });
          const form = await mailForms.getFormByContentItem(root.snapshot.item.id);
          if (!form)
            return new Response("Not Found", { status: 404 });
          if (mailActionMatch[2] === "confirm") {
            const schema = await mailForms.getSchema(form.id);
            const data2 = await readMailFormBody(request);
            const values = {};
            for (const { definition: definition2 } of schema.fields) {
              if (definition2.type === "multiselect")
                values[definition2.key] = data2.getAll(definition2.key).map(String);
              else if (definition2.type === "boolean")
                values[definition2.key] = data2.get(definition2.key) === "true" || data2.get(definition2.key) === "1" || data2.get(definition2.key) === "on";
              else {
                const value = data2.get(definition2.key);
                if (value !== null)
                  values[definition2.key] = String(value);
              }
            }
            const prepared = await mailForms.prepareConfirmation({ mailFormId: form.id, values, turnstileToken: String(data2.get("cf-turnstile-response") ?? ""), ...request.headers.get("cf-connecting-ip") ? { remoteIp: request.headers.get("cf-connecting-ip") } : {}, ...request.headers.get("user-agent") ? { userAgent: request.headers.get("user-agent") } : {}, hostname: url.hostname, honeypot: String(data2.get("website") ?? "") });
            return renderMailConfirmation(request, root.snapshot, form, schema, prepared.session.values, prepared.session.id, prepared.token);
          }
          const data = await readMailFormBody(request);
          const submission = await mailForms.submitConfirmation({ confirmationId: asMailConfirmationId(String(data.get("confirmationId") ?? "")), token: String(data.get("token") ?? "") });
          return renderMailThanks(request, root.snapshot, submission.id);
        }
        const customDetailMatch = url.pathname.match(/^(.*)\/view\/([^/]+)\/?$/);
        if (customDetailMatch) {
          const rootPath = customDetailMatch[1] || "/";
          const root = await cms.resolvePublicPath(siteId, rootPath);
          if (root?.kind === "content" && root.snapshot.item.contentTypeKey === "custom-content" && root.snapshot.publishedRevision) {
            const definition2 = await customContent.getCustomContentByContentItem(root.snapshot.item.id);
            if (definition2) {
              const entry = await customContent.getPublishedByKey(definition2.id, decodeURIComponent(customDetailMatch[2]));
              if (entry)
                return renderCustomEntryDetail(request, root.snapshot, definition2, entry, await customContent.getTableSchema(definition2.tableId), activeTheme, siteName);
            }
          }
        }
        const rssMatch = url.pathname.match(/^(.*)\/rss\.xml$/);
        if (rssMatch) {
          const rootPath = rssMatch[1] || "/";
          const root = await cms.resolvePublicPath(siteId, rootPath);
          if (!root || root.kind !== "content" || root.snapshot.item.contentTypeKey !== "blog")
            return new Response("Not Found", { status: 404 });
          const collection = await blog.getCollectionByContentItem(root.snapshot.item.id);
          if (!collection)
            return new Response("Not Found", { status: 404 });
          const xml2 = await blog.renderRss(collection.id, { siteUrl: url.origin });
          return new Response(request.method === "HEAD" ? null : xml2, { headers: { "content-type": "application/rss+xml; charset=utf-8", "cache-control": "public, max-age=300, s-maxage=1800", "cache-tag": `site:${siteId},collection:${collection.id},feed:${collection.id}` } });
        }
        const taxonomyMatch = url.pathname.match(/^(.*)\/(category|tag)\/([^/]+)\/?$/);
        if (taxonomyMatch) {
          const rootPath = taxonomyMatch[1] || "/";
          const root = await cms.resolvePublicPath(siteId, rootPath);
          if (!root || root.kind !== "content" || root.snapshot.item.contentTypeKey !== "blog")
            return new Response("Not Found", { status: 404 });
          const collection = await blog.getCollectionByContentItem(root.snapshot.item.id);
          if (!collection)
            return new Response("Not Found", { status: 404 });
          const term = await blog.findTerm(collection.id, taxonomyMatch[2], taxonomyMatch[3]);
          if (!term)
            return new Response("Not Found", { status: 404 });
          return renderBlogResponse(request, root.snapshot, blog, collection.id, assets, url, activeTheme, siteName, [term.id], `${term.title}`);
        }
        const resolution = await cms.resolvePublicPath(siteId, url.pathname);
        if (!resolution && url.pathname === "/") {
          const homepage = await cms.resolvePublicPath(siteId, "/home");
          if (homepage?.kind === "content" && homepage.snapshot.publishedRevision) {
            return new Response(null, {
              status: 302,
              headers: {
                location: "/home",
                "cache-control": "public, max-age=60"
              }
            });
          }
          const title2 = siteName || "baserEdge";
          const html2 = `<!doctype html><html lang="ja"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escapeHtml(title2)}</title><style>body{margin:0;background:#f4f7f5;color:#18382f;font-family:system-ui,-apple-system,"Segoe UI",sans-serif}.shell{max-width:760px;margin:12vh auto;padding:48px 40px;background:#fff;border:1px solid #d6e2dc;border-radius:18px;box-shadow:0 18px 50px #153d2d16}h1{margin:0 0 18px;font-size:clamp(2rem,7vw,3.8rem)}p{font-size:1.08rem;line-height:1.8}.mark{color:#2c735b;font-weight:700;letter-spacing:.04em}</style></head><body><main class="shell"><div class="mark">baserEdge</div><h1>${escapeHtml(title2)}</h1><p>サイトの開設が完了しました。管理画面を開くと、編集できるホームページが自動で準備されます。</p></main></body></html>`;
          return new Response(request.method === "HEAD" ? null : html2, {
            status: 200,
            headers: {
              "content-type": "text/html; charset=utf-8",
              "cache-control": "no-store",
              "x-robots-tag": "noindex"
            }
          });
        }
        if (!resolution)
          return new Response("Not Found", { status: 404 });
        if (resolution.kind === "redirect") {
          return new Response(null, { status: resolution.statusCode, headers: { location: resolution.location, "cache-control": "public, max-age=300" } });
        }
        const snapshot = resolution.snapshot;
        if (!snapshot.publishedRevision)
          return new Response("Not Found", { status: 404 });
        if (snapshot.item.contentTypeKey === "blog") {
          const collection = await blog.getCollectionByContentItem(snapshot.item.id);
          if (!collection)
            return new Response("Not Found", { status: 404 });
          return renderBlogResponse(request, snapshot, blog, collection.id, assets, url, activeTheme, siteName);
        }
        if (snapshot.item.contentTypeKey === "mail-form") {
          const form = await mailForms.getFormByContentItem(snapshot.item.id);
          if (!form)
            return new Response("Not Found", { status: 404 });
          return renderMailForm(request, snapshot, form, await mailForms.getSchema(form.id), activeTheme, siteName, env.TURNSTILE_SITE_KEY);
        }
        if (snapshot.item.contentTypeKey === "custom-content") {
          const definition2 = await customContent.getCustomContentByContentItem(snapshot.item.id);
          if (!definition2)
            return new Response("Not Found", { status: 404 });
          return renderCustomContentList(request, snapshot, definition2, customContent, url, activeTheme, siteName);
        }
        const title = typeof snapshot.publishedRevision.fields.title === "string" ? snapshot.publishedRevision.fields.title : "";
        const assetBase = (env.ASSET_BASE_URL ?? "/assets").replace(/\/$/, "");
        let html = renderPage(snapshot.publishedRevision.document, {
          assetUrl: (assetId) => `${assetBase}/${encodeURIComponent(assetId)}`,
          contentUrl: (contentId) => `/content/${encodeURIComponent(contentId)}`
        }, { title, revision: snapshot.publishedRevision, theme: activeTheme, siteName });
        if (shouldShowPublishedAdminBanner(url)) {
          html = injectAdminViewBanner(html, "published", snapshot.publishedRevision.id);
        }
        return new Response(request.method === "HEAD" ? null : html, {
          headers: {
            "content-type": "text/html; charset=utf-8",
            "cache-control": "public, max-age=60, s-maxage=3600",
            "cache-tag": `site:${snapshot.item.siteId},content:${snapshot.item.id},revision:${snapshot.publishedRevision.id}`,
            "x-baser-content-id": snapshot.item.id,
            "x-baser-revision-id": snapshot.publishedRevision.id
          }
        });
      } catch (error) {
        if (error instanceof DomainError)
          return new Response(error.message, { status: error.status });
        console.error(error);
        return new Response("Internal Server Error", { status: 500 });
      }
    }
  };
}
function createAssetService(env) {
  return new AssetService({
    metadata: env.DB ? new D1AssetMetadataStore(env.DB) : memoryAssets,
    objects: env.R2 ? new R2AssetObjectStore(env.R2) : memoryObjects,
    security: noopSecurity,
    signingSecret: env.ASSET_UPLOAD_SECRET ?? "development-upload-secret-change-me"
  });
}
function createPreviewService(env, cms) {
  return new PreviewService({
    store: env.DB ? new D1PreviewStore(env.DB) : memoryPreviews,
    cms,
    security: noopSecurity,
    signingSecret: env.PREVIEW_SECRET ?? "development-preview-secret-change-me"
  });
}
function createBlogService(env, cms) {
  return new BlogService(env.DB ? new D1BlogStore(env.DB) : memoryBlog, cms);
}
function createCustomContentService(env, cms) {
  return new CustomContentService(env.DB ? new D1CustomContentStore(env.DB) : memoryCustomContent, cms);
}
function createThemeService(env, cms) {
  return new ThemeService({ store: env.DB ? new D1ThemeStore(env.DB) : memoryThemes, cms, security: noopSecurity });
}
function createMailFormService(env, cms, customContent) {
  return new MailFormService({ store: env.DB ? new D1MailFormStore(env.DB) : memoryMailForms, cms, customContent, signingSecret: env.MAIL_FORM_SECRET ?? "development-mail-form-secret-change-me", ...env.MAIL_PRIVACY_SALT ? { privacySalt: env.MAIL_PRIVACY_SALT } : {}, botVerifier: env.TURNSTILE_SECRET ? new TurnstileBotVerifier(env.TURNSTILE_SECRET) : new UnavailableBotVerifier() });
}
async function renderBlogResponse(request, snapshot, blog, collectionId, assets, url, theme, siteName, termIds = [], suffixTitle = "") {
  const page = Math.max(1, Number(url.searchParams.get("page") ?? "1") || 1);
  const collection = await blog.store.getCollection(collectionId);
  if (!collection || !snapshot.publishedRevision)
    return new Response("Not Found", { status: 404 });
  const list = await blog.listPublishedArticles(collectionId, { limit: collection.pageSize, offset: (page - 1) * collection.pageSize, ...termIds.length ? { termIds } : {} });
  const assetBase = "/assets";
  const baseTitle = typeof snapshot.publishedRevision.fields.title === "string" ? snapshot.publishedRevision.fields.title : "Blog";
  const intro = renderPage(snapshot.publishedRevision.document, { assetUrl: (assetId) => `${assetBase}/${encodeURIComponent(assetId)}`, contentUrl: (contentId) => `/content/${encodeURIComponent(contentId)}` }, { title: baseTitle, revision: snapshot.publishedRevision, theme, siteName });
  const cards = list.items.map(renderArticleCard).join("");
  const totalPages = Math.max(1, Math.ceil(list.total / list.limit));
  const pagination = totalPages > 1 ? `<nav aria-label="ページ送り">${Array.from({ length: totalPages }, (_, index2) => {
    const number = index2 + 1;
    const href = new URL(url);
    href.searchParams.set("page", String(number));
    return number === page ? `<strong aria-current="page">${number}</strong>` : `<a href="${escapeHtml(href.pathname + href.search)}">${number}</a>`;
  }).join(" ")}</nav>` : "";
  const body = renderShell({ title: suffixTitle ? `${suffixTitle} | ${baseTitle}` : baseTitle, siteName, theme, headHtml: `<link rel="alternate" type="application/rss+xml" href="${escapeHtml(snapshot.route.path.replace(/\/$/, "") + "/rss.xml")}">`, bodyHtml: `${extractBody(intro)}<main class="bc-page"><h1>${escapeHtml(suffixTitle || baseTitle)}</h1><div class="bc-list blog-list">${cards || "<p>公開中の記事はありません。</p>"}</div>${pagination}</main>`, bodyAttributes: { "data-theme-release": theme.release.id } });
  return new Response(request.method === "HEAD" ? null : body, { headers: { "content-type": "text/html; charset=utf-8", "cache-control": "public, max-age=60, s-maxage=1800", "cache-tag": `site:${snapshot.item.siteId},content:${snapshot.item.id},collection:${collectionId}`, "x-baser-content-id": snapshot.item.id, "x-baser-revision-id": snapshot.publishedRevision.id } });
}
function renderArticleCard(article) {
  const revision = article.snapshot.publishedRevision;
  const title = typeof revision.fields.title === "string" ? revision.fields.title : "";
  const terms = article.terms.map((term) => `<span class="term">${escapeHtml(term.title)}</span>`).join("");
  return `<article class="article-card bc-card"><h2><a href="${escapeHtml(article.snapshot.route.path)}">${escapeHtml(title)}</a></h2><time datetime="${new Date(article.postedAt).toISOString()}">${new Date(article.postedAt).toLocaleDateString("ja-JP")}</time><div class="terms">${terms}</div></article>`;
}
function extractBody(html) {
  const match = html.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
  return match?.[1] ?? "";
}
function escapeHtml(value) {
  return value.replace(/[&<>"']/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[character]);
}
async function serveAsset(request, service, rawId) {
  const result = await service.getPublicAsset(asAssetId(rawId));
  if (!result)
    return new Response("Not Found", { status: 404 });
  const headers = new Headers({
    "content-type": result.asset.mediaType,
    "content-length": String(result.asset.byteSize ?? result.object.size),
    "cache-control": "public, max-age=31536000, immutable",
    "x-content-type-options": "nosniff",
    "content-disposition": contentDisposition(result.asset.mediaType, result.asset.originalFilename)
  });
  const etag = result.object.httpEtag ?? `"${result.object.etag}"`;
  headers.set("etag", etag);
  headers.set("content-security-policy", "sandbox; default-src 'none'");
  headers.set("cross-origin-resource-policy", "same-site");
  if (request.headers.get("if-none-match") === etag)
    return new Response(null, { status: 304, headers });
  return new Response(request.method === "HEAD" ? null : result.object.body, { headers });
}
function contentDisposition(mediaType, filename) {
  const mode = mediaType.startsWith("image/") || mediaType === "application/pdf" ? "inline" : "attachment";
  return `${mode}; filename*=UTF-8''${encodeURIComponent(filename)}`;
}
async function renderCustomContentList(request, snapshot, definition2, service, url, theme, siteName) {
  if (!snapshot.publishedRevision)
    return new Response("Not Found", { status: 404 });
  const schema = await service.getTableSchema(definition2.tableId);
  const page = Math.max(1, Number(url.searchParams.get("page") ?? "1") || 1);
  const filters = {};
  for (const { definition: field } of schema.fields) {
    const value = url.searchParams.get(`field.${field.key}`);
    if (value !== null)
      filters[field.key] = parseFilterValue(field.type, value);
  }
  const list = await service.listPublished(definition2.id, {
    limit: definition2.listCount,
    offset: (page - 1) * definition2.listCount,
    ...url.searchParams.get("q") ? { query: url.searchParams.get("q") } : {},
    ...Object.keys(filters).length ? { filters } : {}
  });
  const title = typeof snapshot.publishedRevision.fields.title === "string" ? snapshot.publishedRevision.fields.title : schema.table.name;
  const intro = renderPage(snapshot.publishedRevision.document, { assetUrl: (id) => `/assets/${encodeURIComponent(id)}`, contentUrl: (id) => `/content/${encodeURIComponent(id)}` }, { title, revision: snapshot.publishedRevision, theme, siteName });
  const cards = list.items.map((entry) => renderCustomEntryCard(entry, schema, snapshot.route.path)).join("");
  const totalPages = Math.max(1, Math.ceil(list.total / list.limit));
  const pagination = totalPages > 1 ? `<nav aria-label="ページ送り">${Array.from({ length: totalPages }, (_, index2) => {
    const number = index2 + 1;
    const href = new URL(url);
    href.searchParams.set("page", String(number));
    return number === page ? `<strong aria-current="page">${number}</strong>` : `<a href="${escapeHtml(href.pathname + href.search)}">${number}</a>`;
  }).join(" ")}</nav>` : "";
  const html = renderShell({ title, siteName, theme, bodyHtml: `${extractBody(intro)}<main class="bc-page"><h1>${escapeHtml(title)}</h1><div class="bc-list custom-list">${cards || "<p>公開中のエントリーはありません。</p>"}</div>${pagination}</main>`, bodyAttributes: { "data-theme-release": theme.release.id } });
  return new Response(request.method === "HEAD" ? null : html, { headers: { "content-type": "text/html; charset=utf-8", "cache-control": "public, max-age=60, s-maxage=1800", "cache-tag": `site:${snapshot.item.siteId},content:${snapshot.item.id},custom-content:${definition2.id}`, "x-baser-content-id": snapshot.item.id, "x-baser-revision-id": snapshot.publishedRevision.id } });
}
function renderCustomEntryCard(entry, schema, rootPath) {
  const revision = entry.publishedRevision;
  const displayKey = schema.table.displayFieldKey ?? schema.fields[0]?.definition.key;
  const title = displayKey ? displayValue(revision.values[displayKey]) : entry.entry.id;
  const key2 = entry.entry.slug ?? entry.entry.id;
  const visible = schema.fields.slice(0, 4).map(({ definition: definition2, relation }) => `<dt>${escapeHtml(relation.labelOverride ?? definition2.name)}</dt><dd>${renderCustomValue(revision.values[definition2.key], definition2.type)}</dd>`).join("");
  return `<article class="custom-entry bc-card"><h2><a href="${escapeHtml(rootPath.replace(/\/$/, "") + `/view/${encodeURIComponent(key2)}`)}">${escapeHtml(title)}</a></h2><dl>${visible}</dl></article>`;
}
function renderCustomEntryDetail(request, snapshot, definition2, entry, schema, theme, siteName) {
  const revision = entry.publishedRevision;
  const displayKey = schema.table.displayFieldKey ?? schema.fields[0]?.definition.key;
  const title = displayKey ? displayValue(revision.values[displayKey]) : entry.entry.id;
  const fields = schema.fields.map(({ definition: definition3, relation }) => `<dt>${escapeHtml(relation.labelOverride ?? definition3.name)}</dt><dd>${renderCustomValue(revision.values[definition3.key], definition3.type)}</dd>`).join("");
  const html = renderShell({ title, siteName, theme, bodyHtml: `<main class="bc-page"><nav><a href="${escapeHtml(snapshot.route.path)}">一覧へ戻る</a></nav><h1>${escapeHtml(title)}</h1><dl>${fields}</dl></main>`, bodyAttributes: { "data-theme-release": theme.release.id } });
  return new Response(request.method === "HEAD" ? null : html, { headers: { "content-type": "text/html; charset=utf-8", "cache-control": "public, max-age=60, s-maxage=1800", "cache-tag": `site:${snapshot.item.siteId},content:${snapshot.item.id},custom-entry:${entry.entry.id},custom-entry-revision:${revision.id}` } });
}
function renderCustomValue(value, type) {
  if (value === null || value === void 0)
    return "";
  if (type === "boolean")
    return value ? "はい" : "いいえ";
  if (type === "asset" && typeof value === "string")
    return `<img src="/assets/${encodeURIComponent(value)}" alt="">`;
  if (type === "richtext" && value && typeof value === "object") {
    try {
      return extractBody(renderPage(value, { assetUrl: (id) => `/assets/${encodeURIComponent(id)}`, contentUrl: (id) => `/content/${encodeURIComponent(id)}` }, { title: "" }));
    } catch {
      return "";
    }
  }
  if (Array.isArray(value))
    return value.map((item) => escapeHtml(String(item))).join(", ");
  return escapeHtml(String(value));
}
function displayValue(value) {
  return value === null || value === void 0 ? "" : Array.isArray(value) ? value.join(", ") : String(value);
}
function parseFilterValue(type, value) {
  if (type === "integer" || type === "decimal")
    return Number(value);
  if (type === "boolean")
    return value === "true" || value === "1";
  return value;
}
async function readMailFormBody(request) {
  const maximumBytes = 262144;
  const contentType = (request.headers.get("content-type") ?? "").split(";", 1)[0]?.trim().toLowerCase();
  if (contentType !== "application/x-www-form-urlencoded")
    throw new DomainError("MAIL_FORM_CONTENT_TYPE", "Mail form requests must use application/x-www-form-urlencoded", 415);
  const declared = Number(request.headers.get("content-length") ?? "0");
  if (Number.isFinite(declared) && declared > maximumBytes)
    throw new DomainError("MAIL_FORM_BODY_TOO_LARGE", "Mail form request is too large", 413);
  const bytes = await request.arrayBuffer();
  if (bytes.byteLength > maximumBytes)
    throw new DomainError("MAIL_FORM_BODY_TOO_LARGE", "Mail form request is too large", 413);
  return new URLSearchParams(new TextDecoder().decode(bytes));
}
function renderMailForm(request, snapshot, form, schema, theme, siteName, turnstileSiteKey) {
  const revision = snapshot.publishedRevision;
  const title = typeof revision.fields.title === "string" ? revision.fields.title : schema.table.name;
  const intro = extractBody(renderPage(revision.document, { assetUrl: (id) => `/assets/${encodeURIComponent(id)}`, contentUrl: (id) => `/content/${encodeURIComponent(id)}` }, { title, revision, theme, siteName }));
  const fields = schema.fields.map(({ definition: definition2, relation }) => renderMailField(definition2, relation.labelOverride ?? definition2.name, relation.required)).join("");
  const turnstile = form.turnstileRequired ? turnstileSiteKey ? `<div class="cf-turnstile" data-sitekey="${escapeHtml(turnstileSiteKey)}"></div><script src="https://challenges.cloudflare.com/turnstile/v0/api.js" async defer><\/script>` : `<p class="configuration-warning">Turnstile site key is not configured.</p>` : "";
  const html = renderShell({ title, siteName, theme, headHtml: `<style>${mailCss}</style>`, bodyHtml: `${intro}<main class="bc-page"><h1>${escapeHtml(title)}</h1><form method="post" action="${escapeHtml(snapshot.route.path.replace(/\/$/, "") + "/confirm")}">${fields}<label class="honeypot">ウェブサイト<input name="website" tabindex="-1" autocomplete="off"></label>${turnstile}<button type="submit">入力内容を確認する</button></form></main>`, bodyAttributes: { "data-theme-release": theme.release.id } });
  return new Response(request.method === "HEAD" ? null : html, { headers: { "content-type": "text/html; charset=utf-8", "cache-control": "private, no-store", "x-robots-tag": "noarchive", "referrer-policy": "strict-origin-when-cross-origin", "content-security-policy": "default-src 'self'; script-src 'self' https://challenges.cloudflare.com; frame-src https://challenges.cloudflare.com; style-src 'unsafe-inline'; form-action 'self'; base-uri 'none'", "x-baser-content-id": snapshot.item.id, "x-baser-revision-id": revision.id } });
}
function renderMailField(field, label, required) {
  const name = escapeHtml(field.key);
  const req = required ? " required" : "";
  const description = field.description ? `<small>${escapeHtml(field.description)}</small>` : "";
  let input = "";
  switch (field.type) {
    case "textarea":
      input = `<textarea name="${name}" rows="6"${req}></textarea>`;
      break;
    case "email":
      input = `<input type="email" name="${name}"${req} autocomplete="email">`;
      break;
    case "tel":
      input = `<input type="tel" name="${name}"${req} autocomplete="tel">`;
      break;
    case "integer":
    case "decimal":
      input = `<input type="number" name="${name}"${field.type === "decimal" ? ' step="any"' : ""}${req}>`;
      break;
    case "date":
      input = `<input type="date" name="${name}"${req}>`;
      break;
    case "datetime":
      input = `<input type="datetime-local" name="${name}"${req}>`;
      break;
    case "boolean":
      input = `<input type="checkbox" name="${name}" value="true">`;
      break;
    case "select":
      input = `<select name="${name}"${req}><option value="">選択してください</option>${field.options.map((o) => `<option value="${escapeHtml(o.value)}">${escapeHtml(o.label)}</option>`).join("")}</select>`;
      break;
    case "multiselect":
      input = `<select name="${name}" multiple${req}>${field.options.map((o) => `<option value="${escapeHtml(o.value)}">${escapeHtml(o.label)}</option>`).join("")}</select>`;
      break;
    default:
      input = `<input type="text" name="${name}"${req}>`;
  }
  return `<label><span>${escapeHtml(label)}${required ? ' <b aria-label="必須">*</b>' : ""}</span>${description}${input}</label>`;
}
function renderMailConfirmation(request, snapshot, form, schema, values, confirmationId, token) {
  const rows = schema.fields.map(({ definition: definition2, relation }) => `<dt>${escapeHtml(relation.labelOverride ?? definition2.name)}</dt><dd>${escapeHtml(displayValue(values[definition2.key]))}</dd>`).join("");
  const path = snapshot.route.path.replace(/\/$/, "");
  const html = `<!doctype html><html lang="ja"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>入力内容の確認</title><style>${mailCss}</style></head><body><main><h1>入力内容の確認</h1><dl>${rows}</dl><form method="post" action="${escapeHtml(path + "/submit")}"><input type="hidden" name="confirmationId" value="${escapeHtml(confirmationId)}"><input type="hidden" name="token" value="${escapeHtml(token)}"><button type="submit">送信する</button></form><p><a href="${escapeHtml(snapshot.route.path)}">入力画面へ戻る</a></p></main></body></html>`;
  return new Response(request.method === "HEAD" ? null : html, { headers: { "content-type": "text/html; charset=utf-8", "cache-control": "private, no-store", "x-robots-tag": "noindex, nofollow, noarchive", "referrer-policy": "no-referrer", "content-security-policy": "default-src 'self'; style-src 'unsafe-inline'; form-action 'self'; base-uri 'none'" } });
}
function renderMailThanks(request, snapshot, submissionId) {
  const html = `<!doctype html><html lang="ja"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>送信完了</title><style>${mailCss}</style></head><body><main><h1>送信しました</h1><p>お問い合わせを受け付けました。</p><p class="receipt">受付番号: ${escapeHtml(submissionId)}</p><p><a href="/">トップへ戻る</a></p></main></body></html>`;
  return new Response(request.method === "HEAD" ? null : html, { status: 201, headers: { "content-type": "text/html; charset=utf-8", "cache-control": "private, no-store", "x-robots-tag": "noindex, nofollow, noarchive", "referrer-policy": "no-referrer", "content-security-policy": "default-src 'self'; style-src 'unsafe-inline'; base-uri 'none'" } });
}
const mailCss = `body{font-family:system-ui,sans-serif;max-width:52rem;margin:auto;padding:1rem;line-height:1.7}main{display:grid;gap:1rem}form{display:grid;gap:1rem}label{display:grid;gap:.35rem}input,textarea,select,button{font:inherit;padding:.7rem;border:1px solid #999;border-radius:.4rem}button{width:max-content;background:#111;color:#fff;border-color:#111}small{color:#555}dl{display:grid;grid-template-columns:minmax(8rem,14rem) 1fr;gap:.6rem 1rem}dt{font-weight:700}dd{margin:0;white-space:pre-wrap}.honeypot{position:absolute;left:-10000px}.configuration-warning{padding:.7rem;border:1px solid #b00;color:#900}.receipt{font-family:ui-monospace,monospace}`;
const index = createPublicWorker();
export {
  createPublicWorker,
  index as default
};
