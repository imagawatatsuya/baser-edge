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
const ADMIN_VIEW_QUERY = "baserAdminView";
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
const CLOUDFLARE_ACCOUNT_ID_RE = /^[a-f0-9]{32}$/i;
function normalizeCloudflareOwnerEmail(input) {
  const email = input.normalize("NFC").trim().toLowerCase();
  assertDomain(email.length > 0, "EMPTY_EMAIL", "Email cannot be empty", 422);
  assertDomain(email.length <= 254, "EMAIL_TOO_LONG", "Email must be 254 characters or fewer", 422);
  assertDomain(email.includes("@") && !email.startsWith("@") && !email.endsWith("@"), "INVALID_EMAIL", "Email format is invalid", 422);
  return email;
}
function normalizeCloudflareAccountId(input) {
  const accountId = input.trim().toLowerCase().replace(/-/g, "");
  assertDomain(CLOUDFLARE_ACCOUNT_ID_RE.test(accountId), "INVALID_CLOUDFLARE_ACCOUNT_ID", "Cloudflare account id must be 32 hex characters", 422);
  return accountId;
}
function normalizeSiteHostname(input) {
  const hostname = input.normalize("NFC").trim().toLowerCase();
  assertDomain(hostname.length > 0, "INVALID_HOSTNAME", "Hostname cannot be empty", 422);
  assertDomain(hostname.length <= 253, "INVALID_HOSTNAME", "Hostname must be 253 characters or fewer", 422);
  assertDomain(!hostname.includes("..") && !hostname.includes(":") && !hostname.includes("/") && !hostname.includes(" "), "INVALID_HOSTNAME", "Hostname must not contain spaces, slashes, or port syntax", 422);
  const labelPattern = /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/;
  const labels = hostname.split(".");
  assertDomain(labels.length >= 2, "INVALID_HOSTNAME", "Hostname must include a domain suffix (e.g. example.test)", 422);
  assertDomain(labels.every((label) => labelPattern.test(label)), "INVALID_HOSTNAME", "Hostname must use ASCII letters, numbers, hyphens, and dots only (e.g. example.test)", 422);
  return hostname;
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
const BUILTIN_STARTER_HOME_HERO_ASSET_ID = "builtin:starter-home-hero";
function isEmbeddedBuiltinAssetId(assetId) {
  return assetId === BUILTIN_STARTER_HOME_HERO_ASSET_ID;
}
function collectAssetReferences(document) {
  const references = [];
  walk(document.root, void 0, void 0, (block) => {
    if (block.type === "image" || block.type === "imageText") {
      const assetId = block.props.assetId;
      if (typeof assetId === "string" && assetId.length > 0 && !isEmbeddedBuiltinAssetId(assetId)) {
        references.push({ assetId, blockId: block.id, fieldPath: "props.assetId", usage: "image" });
      }
    } else if (block.type === "gallery") {
      const assetIds = block.props.assetIds;
      if (Array.isArray(assetIds))
        assetIds.forEach((assetId, index2) => {
          if (typeof assetId === "string" && assetId.length > 0)
            references.push({ assetId, blockId: block.id, fieldPath: `props.assetIds[${index2}]`, usage: "gallery" });
        });
    } else if (block.type === "fileDownload") {
      const assetId = block.props.assetId;
      if (typeof assetId === "string" && assetId.length > 0 && !isEmbeddedBuiltinAssetId(assetId)) {
        references.push({ assetId, blockId: block.id, fieldPath: "props.assetId", usage: "download" });
      }
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
    return [...this.items.values()].filter((item) => item.siteId === siteId && item.state === "active").map((item) => this.managerEntryForTree(item.id)).sort((a, b) => compareSortKeys(a.snapshot.node.sortKey, b.snapshot.node.sortKey) || a.snapshot.node.cachedPath.localeCompare(b.snapshot.node.cachedPath));
  }
  async listTrash(siteId) {
    return [...this.items.values()].filter((item) => item.siteId === siteId && item.state === "trashed").map((item) => this.managerEntryForTree(item.id)).sort((a, b) => (a.trash?.previousPath ?? "").localeCompare(b.trash?.previousPath ?? ""));
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
  async findCloudflareLoginTarget(accountId, ownerEmail) {
    for (const workspace of this.workspaces.values()) {
      if (workspace.cloudflareAccountId !== accountId || workspace.cloudflareOwnerEmail !== ownerEmail)
        continue;
      return this.#cloudflareTargetForWorkspace(workspace);
    }
    return null;
  }
  async findCloudflareLoginTargetByEmail(ownerEmail) {
    let match = null;
    for (const workspace of this.workspaces.values()) {
      if (workspace.cloudflareOwnerEmail !== ownerEmail)
        continue;
      const target = this.#cloudflareTargetForWorkspace(workspace);
      if (match) {
        throw new DomainError("CLOUDFLARE_OWNER_AMBIGUOUS", "Multiple workspaces match this Cloudflare email", 409);
      }
      match = target;
    }
    return match;
  }
  async bindCloudflareOwner(input) {
    const workspaces = [...this.workspaces.values()];
    assertDomain(workspaces.length === 1, "WORKSPACE_COUNT_INVALID", "Exactly one workspace is required to bind Cloudflare owner", 422);
    const workspace = workspaces[0];
    assertDomain(!workspace.cloudflareAccountId, "CLOUDFLARE_OWNER_ALREADY_BOUND", "Cloudflare owner is already bound", 409);
    workspace.cloudflareAccountId = input.cloudflareAccountId;
    workspace.cloudflareOwnerEmail = input.cloudflareOwnerEmail;
    this.workspaces.set(workspace.id, structuredClone(workspace));
    return this.#cloudflareTargetForWorkspace(workspace);
  }
  async hasCloudflareOwnerBinding() {
    return [...this.workspaces.values()].some((w) => Boolean(w.cloudflareAccountId && w.cloudflareOwnerEmail));
  }
  #cloudflareTargetForWorkspace(workspace) {
    const owner = [...this.principals.values()].find((p) => p.workspaceId === workspace.id && p.type === "human");
    assertDomain(owner, "OWNER_NOT_FOUND", "Workspace owner principal not found", 500);
    const site = [...this.sites.values()].find((s) => s.workspaceId === workspace.id);
    assertDomain(site, "SITE_NOT_FOUND", "Workspace site not found", 500);
    return {
      workspaceId: workspace.id,
      ownerPrincipalId: owner.id,
      siteId: site.id,
      siteName: site.name
    };
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
  managerEntryForTree(contentItemId) {
    const entry = this.managerEntry(contentItemId);
    return {
      ...entry,
      snapshot: this.snapshotForTreeListing(entry.snapshot)
    };
  }
  snapshotForTreeListing(snapshot) {
    return {
      ...snapshot,
      workingRevision: snapshot.workingRevision ? { ...snapshot.workingRevision, document: createEmptyDocument() } : null,
      publishedRevision: snapshot.publishedRevision ? { ...snapshot.publishedRevision, document: createEmptyDocument() } : null
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
    const cloudflareAccountId = input.cloudflareAccountId ? normalizeCloudflareAccountId(input.cloudflareAccountId) : null;
    const cloudflareOwnerEmail = input.cloudflareOwnerEmail ? normalizeCloudflareOwnerEmail(input.cloudflareOwnerEmail) : null;
    if (cloudflareAccountId !== null || cloudflareOwnerEmail !== null) {
      assertDomain(cloudflareAccountId !== null && cloudflareOwnerEmail !== null, "CLOUDFLARE_OWNER_INCOMPLETE", "cloudflareAccountId and cloudflareOwnerEmail must be set together", 422);
    }
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
      workspace: {
        id: workspaceId,
        name: input.workspaceName,
        createdAt: now,
        cloudflareAccountId,
        cloudflareOwnerEmail
      },
      owner,
      site: {
        id: siteId,
        workspaceId,
        name: input.siteName,
        hostname: normalizeSiteHostname(input.hostname),
        locale: input.locale ?? "ja-JP",
        state: "active",
        createdAt: now,
        updatedAt: now
      },
      ownerGrant
    });
    return { workspaceId, siteId, ownerPrincipalId: ownerId };
  }
  async findCloudflareLoginTarget(accountId, ownerEmail) {
    return this.#store.findCloudflareLoginTarget(accountId, ownerEmail);
  }
  async findCloudflareLoginTargetByEmail(ownerEmail) {
    return this.#store.findCloudflareLoginTargetByEmail(ownerEmail);
  }
  async bindCloudflareOwner(input) {
    return this.#store.bindCloudflareOwner({
      cloudflareAccountId: normalizeCloudflareAccountId(input.cloudflareAccountId),
      cloudflareOwnerEmail: normalizeCloudflareOwnerEmail(input.cloudflareOwnerEmail)
    });
  }
  async hasCloudflareOwnerBinding() {
    return this.#store.hasCloudflareOwnerBinding();
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
      this.#db.prepare("INSERT INTO workspaces(id,name,created_at,cloudflare_account_id,cloudflare_owner_email) VALUES(?,?,?,?,?)").bind(input.workspace.id, input.workspace.name, input.workspace.createdAt, input.workspace.cloudflareAccountId ?? null, input.workspace.cloudflareOwnerEmail ?? null),
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
    const itemRows = (await this.#db.prepare("SELECT * FROM content_items WHERE site_id=? AND state='active'").bind(siteId).all()).results;
    if (!itemRows.length)
      return [];
    const entries = await this.#contentManagerEntriesForItemRows(siteId, itemRows, false);
    return entries.sort((a, b) => compareSortKeys(a.snapshot.node.sortKey, b.snapshot.node.sortKey) || a.snapshot.node.cachedPath.localeCompare(b.snapshot.node.cachedPath));
  }
  async listTrash(siteId) {
    const itemRows = (await this.#db.prepare("SELECT * FROM content_items WHERE site_id=? AND state='trashed'").bind(siteId).all()).results;
    if (!itemRows.length)
      return [];
    const entries = await this.#contentManagerEntriesForItemRows(siteId, itemRows, true);
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
    return row ? mapWorkspace(row) : null;
  }
  async findCloudflareLoginTarget(accountId, ownerEmail) {
    const row = await this.#db.prepare(`SELECT w.id AS workspace_id, w.name AS workspace_name, p.id AS owner_principal_id, s.id AS site_id, s.name AS site_name
       FROM workspaces w
       JOIN principals p ON p.workspace_id = w.id AND p.principal_type = 'human'
       JOIN sites s ON s.workspace_id = w.id
       WHERE w.cloudflare_account_id = ? AND w.cloudflare_owner_email = ?
       LIMIT 1`).bind(accountId, ownerEmail).first();
    return row ? {
      workspaceId: row.workspace_id,
      ownerPrincipalId: asPrincipalId(row.owner_principal_id),
      siteId: asSiteId(row.site_id),
      siteName: row.site_name
    } : null;
  }
  async findCloudflareLoginTargetByEmail(ownerEmail) {
    const rows = await this.#db.prepare(`SELECT w.id AS workspace_id, w.name AS workspace_name, p.id AS owner_principal_id, s.id AS site_id, s.name AS site_name
       FROM workspaces w
       JOIN principals p ON p.workspace_id = w.id AND p.principal_type = 'human'
       JOIN sites s ON s.workspace_id = w.id
       WHERE w.cloudflare_owner_email = ?`).bind(ownerEmail).all();
    if (rows.results.length === 0)
      return null;
    if (rows.results.length > 1) {
      throw new DomainError("CLOUDFLARE_OWNER_AMBIGUOUS", "Multiple workspaces match this Cloudflare email", 409);
    }
    const row = rows.results[0];
    return {
      workspaceId: row.workspace_id,
      ownerPrincipalId: asPrincipalId(row.owner_principal_id),
      siteId: asSiteId(row.site_id),
      siteName: row.site_name
    };
  }
  async bindCloudflareOwner(input) {
    const workspaces = await this.#db.prepare("SELECT id, cloudflare_account_id FROM workspaces").all();
    assertDomain(workspaces.results.length === 1, "WORKSPACE_COUNT_INVALID", "Exactly one workspace is required to bind Cloudflare owner", 422);
    const workspace = workspaces.results[0];
    assertDomain(!workspace.cloudflare_account_id, "CLOUDFLARE_OWNER_ALREADY_BOUND", "Cloudflare owner is already bound", 409);
    await this.#db.prepare("UPDATE workspaces SET cloudflare_account_id=?, cloudflare_owner_email=? WHERE id=?").bind(input.cloudflareAccountId, input.cloudflareOwnerEmail, workspace.id).run();
    const target = await this.findCloudflareLoginTarget(input.cloudflareAccountId, input.cloudflareOwnerEmail);
    assertDomain(target, "CLOUDFLARE_OWNER_BIND_FAILED", "Failed to bind Cloudflare owner", 500);
    return target;
  }
  async hasCloudflareOwnerBinding() {
    const row = await this.#db.prepare("SELECT 1 AS ok FROM workspaces WHERE cloudflare_account_id IS NOT NULL AND cloudflare_owner_email IS NOT NULL LIMIT 1").first();
    return Boolean(row);
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
  async #contentManagerEntriesForItemRows(siteId, itemRows, includeTrash) {
    const [nodeResult, routeResult, aliasResult, trashResult] = await Promise.all([
      this.#db.prepare("SELECT * FROM content_nodes WHERE site_id=?").bind(siteId).all(),
      this.#db.prepare("SELECT * FROM routes WHERE site_id=? AND active=1 AND is_canonical=1").bind(siteId).all(),
      this.#db.prepare("SELECT ca.* FROM content_aliases ca INNER JOIN content_items ci ON ci.id=ca.alias_content_item_id WHERE ci.site_id=?").bind(siteId).all(),
      includeTrash ? this.#db.prepare("SELECT te.* FROM trash_entries te INNER JOIN content_items ci ON ci.id=te.content_item_id WHERE ci.site_id=? AND ci.state='trashed'").bind(siteId).all() : Promise.resolve({ results: [] })
    ]);
    const nodeRows = nodeResult.results;
    const routeRows = routeResult.results;
    const aliasRows = aliasResult.results;
    const trashRows = trashResult.results;
    const revisionIds = [];
    for (const row of itemRows) {
      if (row.working_revision_id)
        revisionIds.push(asRevisionId(row.working_revision_id));
      if (row.published_revision_id)
        revisionIds.push(asRevisionId(row.published_revision_id));
    }
    const revisions = await this.#loadRevisionSummariesForTree(revisionIds);
    const nodeByContentId = new Map(nodeRows.map((row) => [row.content_item_id, row]));
    const routeByContentId = pickLatestCanonicalRouteByContentItem(routeRows);
    const aliasByContentId = new Map(aliasRows.map((row) => [row.alias_content_item_id, row]));
    const trashByContentId = new Map(trashRows.map((row) => [row.content_item_id, row]));
    const entries = [];
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
          publishedRevision: item.publishedRevisionId ? revisions.get(item.publishedRevisionId) ?? null : null
        },
        aliasTargetContentItemId: aliasByContentId.has(itemRow.id) ? asContentItemId(aliasByContentId.get(itemRow.id).target_content_item_id) : null,
        trash: trashByContentId.has(itemRow.id) ? mapTrash(trashByContentId.get(itemRow.id)) : null
      });
    }
    return entries;
  }
  async #loadRevisionSummariesForTree(ids) {
    const map = /* @__PURE__ */ new Map();
    const unique2 = [...new Set(ids)];
    if (!unique2.length)
      return map;
    const chunkSize = 80;
    for (let offset = 0; offset < unique2.length; offset += chunkSize) {
      const chunk = unique2.slice(offset, offset + chunkSize);
      const placeholders = chunk.map(() => "?").join(",");
      const rows = (await this.#db.prepare(`SELECT id,content_item_id,revision_number,based_on_revision_id,fields_json,content_hash,created_by,agent_run_id,change_summary,created_at FROM content_revisions WHERE id IN (${placeholders})`).bind(...chunk).all()).results;
      for (const row of rows) {
        map.set(asRevisionId(row.id), mapRevisionFieldsOnly(row));
      }
    }
    return map;
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
function pickLatestCanonicalRouteByContentItem(routeRows) {
  const map = /* @__PURE__ */ new Map();
  for (const row of routeRows) {
    const existing = map.get(row.content_item_id);
    if (!existing || row.activated_at > existing.activated_at) {
      map.set(row.content_item_id, row);
    }
  }
  return map;
}
function mapWorkspace(row) {
  return {
    id: row.id,
    name: row.name,
    createdAt: row.created_at,
    cloudflareAccountId: row.cloudflare_account_id,
    cloudflareOwnerEmail: row.cloudflare_owner_email
  };
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
function mapRevisionFieldsOnly(r) {
  return {
    id: asRevisionId(r.id),
    contentItemId: asContentItemId(r.content_item_id),
    revisionNumber: r.revision_number,
    basedOnRevisionId: r.based_on_revision_id ? asRevisionId(r.based_on_revision_id) : null,
    fields: json(r.fields_json),
    document: createEmptyDocument(),
    contentHash: r.content_hash,
    createdBy: asPrincipalId(r.created_by),
    agentRunId: r.agent_run_id,
    changeSummary: r.change_summary,
    createdAt: r.created_at
  };
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
      const heroClass = block.id === "starter-home-hero" ? " bc-starter-hero" : "";
      return `<figure data-block-id="${id}" class="bc-figure-image${heroClass}"><img src="${escapeAttribute(src)}" alt="${escapeAttribute(asString(block.props.alt))}" loading="lazy" decoding="async"></figure>`;
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
img{max-width:100%;height:auto}.bc-figure-image.bc-starter-hero{margin:1.5rem 0}.bc-starter-hero img{width:100%;max-width:100%;aspect-ratio:16/9;object-fit:cover;border-radius:var(--bc-radius,.5rem);height:auto}.bc-image-text{display:grid;gap:1rem;grid-template-columns:minmax(0,1fr) minmax(0,1fr);align-items:center}.bc-gallery{display:grid;grid-template-columns:repeat(auto-fit,minmax(12rem,1fr));gap:1rem}.bc-cta a{display:inline-block;padding:.75rem 1rem;border:1px solid currentColor;border-radius:var(--bc-radius,.5rem)}.bc-table-wrap{overflow:auto}.bc-embed iframe{width:100%;aspect-ratio:16/9;border:0}.bc-unsupported{padding:1rem;border:1px dashed currentColor}.bc-list{display:grid;gap:1rem}.bc-card{border:1px solid var(--bc-border);border-radius:var(--bc-radius);padding:1rem;background:var(--bc-surface)}
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
const STARTER_HOME_HERO_CONTENT_TYPE = "image/webp";
const STARTER_HOME_HERO_SHA256 = "f9ced36d0884e9fbe96383dd141063b758248b48b8bbcde733937964a8cc0ec5";
const STARTER_HOME_HERO_BASE64 = "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";
const BUILTIN_STARTER_HOME_HERO_PATH = "/__baser/builtin-assets/starter-home-hero.webp";
const STARTER_HOME_HERO_ETAG = `"${STARTER_HOME_HERO_SHA256}"`;
let cachedStarterHeroBytes;
function starterHomeHeroBytes() {
  if (!cachedStarterHeroBytes) {
    const binary = atob(STARTER_HOME_HERO_BASE64);
    const bytes = new Uint8Array(binary.length);
    for (let index2 = 0; index2 < binary.length; index2 += 1) {
      bytes[index2] = binary.charCodeAt(index2);
    }
    cachedStarterHeroBytes = bytes;
  }
  return cachedStarterHeroBytes;
}
function resolveBuiltinPublicAssetUrl(assetId) {
  if (assetId === BUILTIN_STARTER_HOME_HERO_ASSET_ID)
    return BUILTIN_STARTER_HOME_HERO_PATH;
  return null;
}
function createPublicAssetUrlResolver(assetBase) {
  const base = assetBase.replace(/\/$/, "");
  return (assetId) => {
    const builtinPath = resolveBuiltinPublicAssetUrl(assetId);
    if (builtinPath)
      return builtinPath;
    return `${base}/${encodeURIComponent(assetId)}`;
  };
}
function serveBuiltinAssetRequest(request, pathname) {
  if (pathname.startsWith("/__baser/builtin-assets/") && pathname !== BUILTIN_STARTER_HOME_HERO_PATH) {
    return new Response("Not Found", { status: 404 });
  }
  if (pathname !== BUILTIN_STARTER_HOME_HERO_PATH)
    return null;
  if (request.method !== "GET" && request.method !== "HEAD") {
    return new Response("Method Not Allowed", { status: 405 });
  }
  const headers = new Headers({
    "content-type": STARTER_HOME_HERO_CONTENT_TYPE,
    "cache-control": "public, max-age=31536000, immutable",
    "x-content-type-options": "nosniff",
    etag: STARTER_HOME_HERO_ETAG
  });
  if (request.headers.get("if-none-match") === STARTER_HOME_HERO_ETAG) {
    return new Response(null, { status: 304, headers });
  }
  const bytes = starterHomeHeroBytes();
  headers.set("content-length", String(bytes.length));
  return new Response(request.method === "HEAD" ? null : bytes, { headers });
}
function serveBuiltinAssetByRawId(request, rawAssetId) {
  try {
    const assetId = decodeURIComponent(rawAssetId);
    if (assetId !== BUILTIN_STARTER_HOME_HERO_ASSET_ID)
      return null;
  } catch {
    return null;
  }
  return serveBuiltinAssetRequest(request, BUILTIN_STARTER_HOME_HERO_PATH);
}
const defaultPublicAssetUrl = createPublicAssetUrlResolver("/assets");
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
        const builtinAssetResponse = serveBuiltinAssetRequest(request, url.pathname);
        if (builtinAssetResponse)
          return builtinAssetResponse;
        const cms = resolveCms(env);
        const assets = options.resolveAssets?.(env, cms) ?? createAssetService(env);
        const blog = options.resolveBlog?.(env, cms) ?? createBlogService(env, cms);
        const customContent = options.resolveCustomContent?.(env, cms) ?? createCustomContentService(env, cms);
        const mailForms = options.resolveMailForms?.(env, cms, customContent) ?? createMailFormService(env, cms, customContent);
        const themes = options.resolveThemes?.(env, cms) ?? createThemeService(env, cms);
        const assetMatch = url.pathname.match(/^\/assets\/([^/]+)$/);
        if (assetMatch?.[1]) {
          const builtinById = serveBuiltinAssetByRawId(request, assetMatch[1]);
          if (builtinById)
            return builtinById;
          return serveAsset(request, assets, assetMatch[1]);
        }
        const previewMatch = url.pathname.match(/^\/_preview\/(.+)$/);
        if (previewMatch?.[1]) {
          const previews = options.resolvePreview?.(env, cms) ?? createPreviewService(env, cms);
          const resolved = await previews.resolve(decodeURIComponent(previewMatch[1]));
          const title2 = typeof resolved.revision.fields.title === "string" ? resolved.revision.fields.title : "";
          const theme = await themes.resolveRelease(resolved.session.themeRelease, resolved.session.siteId);
          const previewSite = await cms.store.getSite(resolved.session.siteId);
          let html2 = renderPage(resolved.revision.document, {
            assetUrl: createPublicAssetUrlResolver("/assets"),
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
        const assetUrl = createPublicAssetUrlResolver(assetBase);
        let html = renderPage(snapshot.publishedRevision.document, {
          assetUrl,
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
  const assetUrl = createPublicAssetUrlResolver(assetBase);
  const baseTitle = typeof snapshot.publishedRevision.fields.title === "string" ? snapshot.publishedRevision.fields.title : "Blog";
  const intro = renderPage(snapshot.publishedRevision.document, { assetUrl, contentUrl: (contentId) => `/content/${encodeURIComponent(contentId)}` }, { title: baseTitle, revision: snapshot.publishedRevision, theme, siteName });
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
  const intro = renderPage(snapshot.publishedRevision.document, { assetUrl: defaultPublicAssetUrl, contentUrl: (id) => `/content/${encodeURIComponent(id)}` }, { title, revision: snapshot.publishedRevision, theme, siteName });
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
    return `<img src="${escapeHtml(defaultPublicAssetUrl(value))}" alt="">`;
  if (type === "richtext" && value && typeof value === "object") {
    try {
      return extractBody(renderPage(value, { assetUrl: defaultPublicAssetUrl, contentUrl: (id) => `/content/${encodeURIComponent(id)}` }, { title: "" }));
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
  const intro = extractBody(renderPage(revision.document, { assetUrl: defaultPublicAssetUrl, contentUrl: (id) => `/content/${encodeURIComponent(id)}` }, { title, revision, theme, siteName }));
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
