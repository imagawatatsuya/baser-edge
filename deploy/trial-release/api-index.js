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
function asWorkspaceId(value) {
  return value;
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
function asAgentRunId(value) {
  return value;
}
function asChangeSetId(value) {
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
function asPluginId(value) {
  return value;
}
function asPluginReleaseId(value) {
  return value;
}
function asPluginActivationId(value) {
  return value;
}
function asPluginInvocationId(value) {
  return value;
}
function asAuthIdentityId(value) {
  return value;
}
function asPasskeyCredentialId(value) {
  return value;
}
function asAuthSessionId(value) {
  return value;
}
function asWebAuthnChallengeId(value) {
  return value;
}
function asSessionStepUpId(value) {
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
function applyOperations(source, operations, registry) {
  const document = structuredClone(source);
  for (const operation of operations)
    applyOperation(document, operation);
  const validation = validateDocument(document, registry);
  if (!validation.valid) {
    throw new DomainError("INVALID_DOCUMENT", "Document operations produced an invalid document", 422, {
      errors: validation.errors
    });
  }
  return document;
}
function applyOperation(document, operation) {
  switch (operation.kind) {
    case "insert": {
      assertDomain(!findBlock(document.root, operation.block.id), "BLOCK_ID_EXISTS", `Block ${operation.block.id} already exists`, 409);
      const parent = requireBlock(document.root, operation.parentId);
      const target = parent.slots[operation.slot] ?? (parent.slots[operation.slot] = []);
      target.splice(clampIndex(operation.index, target.length), 0, structuredClone(operation.block));
      return;
    }
    case "updateProps": {
      const block = requireBlock(document.root, operation.blockId);
      block.props = { ...block.props, ...structuredClone(operation.patch) };
      return;
    }
    case "remove": {
      assertDomain(operation.blockId !== document.root.id, "CANNOT_REMOVE_ROOT", "The document root cannot be removed", 422);
      const removed = detachBlock(document.root, operation.blockId);
      assertDomain(removed, "BLOCK_NOT_FOUND", `Block ${operation.blockId} was not found`, 404);
      return;
    }
    case "move": {
      assertDomain(operation.blockId !== document.root.id, "CANNOT_MOVE_ROOT", "The document root cannot be moved", 422);
      const targetParent = requireBlock(document.root, operation.parentId);
      assertDomain(!containsBlock(requireBlock(document.root, operation.blockId), targetParent.id), "BLOCK_CYCLE", "A block cannot be moved into its descendant", 422);
      const block = detachBlock(document.root, operation.blockId);
      assertDomain(block, "BLOCK_NOT_FOUND", `Block ${operation.blockId} was not found`, 404);
      const target = targetParent.slots[operation.slot] ?? (targetParent.slots[operation.slot] = []);
      target.splice(clampIndex(operation.index, target.length), 0, block);
      return;
    }
    case "duplicate": {
      const source = requireBlock(document.root, operation.blockId);
      const parent = requireBlock(document.root, operation.parentId);
      const copy = cloneWithNewIds(source);
      const target = parent.slots[operation.slot] ?? (parent.slots[operation.slot] = []);
      target.splice(clampIndex(operation.index, target.length), 0, copy);
      return;
    }
  }
}
function clampIndex(index2, length) {
  assertDomain(Number.isInteger(index2), "INVALID_INDEX", "Block index must be an integer", 422);
  return Math.max(0, Math.min(index2, length));
}
function cloneWithNewIds(block) {
  const cloned = structuredClone(block);
  cloned.id = newId("content").replace("cnt_", "blk_");
  cloned.slots = Object.fromEntries(Object.entries(cloned.slots).map(([slot, children]) => [slot, children.map(cloneWithNewIds)]));
  return cloned;
}
function containsBlock(root, blockId) {
  return Boolean(findBlock(root, blockId));
}
function requireBlock(root, blockId) {
  const block = findBlock(root, blockId);
  assertDomain(block, "BLOCK_NOT_FOUND", `Block ${blockId} was not found`, 404);
  return block;
}
function findBlock(root, blockId) {
  if (root.id === blockId)
    return root;
  for (const children of Object.values(root.slots)) {
    for (const child of children) {
      const found = findBlock(child, blockId);
      if (found)
        return found;
    }
  }
  return void 0;
}
function detachBlock(root, blockId) {
  for (const children of Object.values(root.slots)) {
    const index2 = children.findIndex((child) => child.id === blockId);
    if (index2 >= 0)
      return children.splice(index2, 1)[0];
    for (const child of children) {
      const found = detachBlock(child, blockId);
      if (found)
        return found;
    }
  }
  return void 0;
}
function walk(block, parent, slot, callback) {
  callback(block, parent, slot);
  for (const [slotName, children] of Object.entries(block.slots)) {
    for (const child of children)
      walk(child, block, slotName, callback);
  }
}
function indexDocument(document) {
  const result = /* @__PURE__ */ new Map();
  const visit = (block, parentId, slot, index2) => {
    const location = { index: index2, block };
    if (parentId !== void 0)
      location.parentId = parentId;
    if (slot !== void 0)
      location.slot = slot;
    result.set(block.id, location);
    for (const [slotName, children] of Object.entries(block.slots)) {
      children.forEach((child, childIndex) => visit(child, block.id, slotName, childIndex));
    }
  };
  visit(document.root, void 0, void 0, 0);
  return result;
}
function diffDocuments(before, after) {
  const oldIndex = indexDocument(before);
  const newIndex = indexDocument(after);
  const added = [...newIndex.keys()].filter((id) => !oldIndex.has(id));
  const removed = [...oldIndex.keys()].filter((id) => !newIndex.has(id));
  const moved = [];
  const updated = [];
  for (const [id, oldLocation] of oldIndex) {
    const newLocation = newIndex.get(id);
    if (!newLocation)
      continue;
    const oldPosition = `${oldLocation.parentId ?? "root"}/${oldLocation.slot ?? "root"}/${oldLocation.index}`;
    const newPosition = `${newLocation.parentId ?? "root"}/${newLocation.slot ?? "root"}/${newLocation.index}`;
    if (oldPosition !== newPosition)
      moved.push({ id, from: oldPosition, to: newPosition });
    const changed = [];
    if (stableStringify(oldLocation.block.props) !== stableStringify(newLocation.block.props))
      changed.push("props");
    if (stableStringify(oldLocation.block.visibility ?? null) !== stableStringify(newLocation.block.visibility ?? null))
      changed.push("visibility");
    if (oldLocation.block.componentVersion !== newLocation.block.componentVersion)
      changed.push("componentVersion");
    if (changed.length)
      updated.push({ id, changed });
  }
  return { added, removed, moved, updated };
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
    return clone$6(this.principals.get(id) ?? null);
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
    return clone$6(this.delegations.get(id) ?? null);
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
    return clone$6(this.nodes.get(id) ?? null);
  }
  async getContentSnapshot(contentItemId) {
    if (!this.items.has(contentItemId))
      return null;
    return this.snapshot(contentItemId);
  }
  async getRevision(revisionId) {
    return clone$6(this.revisions.get(revisionId) ?? null);
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
    return clone$6(this.approvals.get(id) ?? null);
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
    return clone$6(this.changeSets.get(id) ?? null);
  }
  async appendAudit(event) {
    this.audits.set(event.id, structuredClone(event));
  }
  async listAudit(workspaceId) {
    return [...this.audits.values()].filter((event) => event.workspaceId === workspaceId).sort((a, b) => a.occurredAt - b.occurredAt).map((event) => structuredClone(event));
  }
  async getWorkspace(id) {
    return clone$6(this.workspaces.get(id) ?? null);
  }
  async getSite(id) {
    return clone$6(this.sites.get(id) ?? null);
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
      trash: clone$6(this.trashEntries.get(contentItemId) ?? null)
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
function clone$6(value) {
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
  ThemeActivate: "theme.activate",
  PluginRead: "plugin.read",
  PluginManage: "plugin.manage",
  PluginActivate: "plugin.activate",
  PluginInvoke: "plugin.invoke"
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
class AgentOperations {
  #cms;
  constructor(cms) {
    this.#cms = cms;
  }
  async proposeDocumentChange(agentActor, input) {
    assertDomain(agentActor.actorType === "agent", "AGENT_ACTOR_REQUIRED", "Agent operation requires an AgentPrincipal", 403);
    assertDomain(agentActor.onBehalfOf, "HUMAN_INSTRUCTOR_REQUIRED", "Agent operation must identify the instructing human", 422);
    assertDomain(agentActor.delegationId, "DELEGATION_REQUIRED", "Agent operation requires an explicit delegation", 403);
    const snapshot = await this.#cms.getContent(agentActor, input.contentItemId);
    const base = snapshot.workingRevision;
    assertDomain(base, "WORKING_REVISION_MISSING", "Content has no working revision", 409);
    assertDomain(base.id === input.baseRevisionId, "STALE_AGENT_BASE", "Agent proposal is based on a stale revision", 409);
    const startedAt = Date.now();
    const run = {
      id: asAgentRunId(newId("agentRun")),
      workspaceId: snapshot.item.workspaceId,
      agentPrincipalId: agentActor.actorId,
      instructedBy: agentActor.onBehalfOf,
      modelProvider: input.modelProvider,
      modelName: input.modelName,
      baseRevisionId: base.id,
      producedRevisionId: null,
      state: "running",
      startedAt,
      completedAt: null
    };
    await this.#cms.store.saveAgentRun(run);
    try {
      const candidate = applyOperations(base.document, input.operations, this.#cms.registry);
      const diff = diffDocuments(base.document, candidate);
      const riskLevel = calculateRisk(input.operations);
      const changeSet = {
        id: asChangeSetId(newId("changeSet")),
        contentItemId: input.contentItemId,
        baseRevisionId: base.id,
        resultRevisionId: null,
        operations: structuredClone(input.operations),
        diff,
        riskLevel,
        state: "proposed",
        createdBy: agentActor.actorId,
        agentRunId: run.id,
        createdAt: startedAt
      };
      await this.#cms.store.saveChangeSet(changeSet);
      const revision = await this.#cms.commitRevision(agentActor, {
        contentItemId: input.contentItemId,
        baseRevisionId: base.id,
        expectedLockVersion: input.expectedLockVersion,
        fields: structuredClone(base.fields),
        document: candidate,
        changeSummary: input.instructionSummary,
        agentRunId: run.id
      });
      changeSet.resultRevisionId = revision.id;
      changeSet.state = "committed";
      await this.#cms.store.saveChangeSet(changeSet);
      run.producedRevisionId = revision.id;
      run.state = "completed";
      run.completedAt = Date.now();
      await this.#cms.store.updateAgentRun(run);
      return { run, changeSet, revision };
    } catch (error) {
      run.state = "failed";
      run.completedAt = Date.now();
      await this.#cms.store.updateAgentRun(run);
      throw error;
    }
  }
  async requestPublication(agentActor, input) {
    return this.#cms.requestApproval(agentActor, input);
  }
}
function calculateRisk(operations) {
  if (operations.some((operation) => operation.kind === "remove"))
    return "medium";
  if (operations.some((operation) => operation.kind === "move"))
    return "medium";
  return "low";
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
    return row ? mapRelease$1(row) : null;
  }
  async listReleases(themeId) {
    return (await this.#db.prepare("SELECT * FROM theme_releases WHERE theme_id=? ORDER BY created_at DESC").bind(themeId).all()).results.map(mapRelease$1);
  }
  async activate(activation) {
    await this.#db.batch([
      this.#db.prepare("UPDATE site_theme_activations SET deactivated_at=? WHERE site_id=? AND deactivated_at IS NULL").bind(activation.activatedAt, activation.siteId),
      this.#db.prepare("INSERT INTO site_theme_activations(id,site_id,theme_release_id,activated_by,activated_at,deactivated_at) VALUES(?,?,?,?,?,NULL)").bind(activation.id, activation.siteId, activation.themeReleaseId, activation.activatedBy, activation.activatedAt)
    ]);
  }
  async getActiveActivation(siteId) {
    const row = await this.#db.prepare("SELECT * FROM site_theme_activations WHERE site_id=? AND deactivated_at IS NULL ORDER BY activated_at DESC LIMIT 1").bind(siteId).first();
    return row ? mapActivation$1(row) : null;
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
function mapRelease$1(r) {
  return { id: asThemeReleaseId(r.id), themeId: asThemeId(r.theme_id), version: r.version, designTokenRevisionId: asDesignTokenRevisionId(r.design_token_revision_id), layoutRevisionId: asLayoutRevisionId(r.layout_revision_id), manifest: JSON.parse(r.manifest_json), releaseHash: r.release_hash, state: r.state, createdBy: asPrincipalId(r.created_by), createdAt: r.created_at };
}
function mapActivation$1(r) {
  return { id: asThemeActivationId(r.id), siteId: asSiteId(r.site_id), themeReleaseId: asThemeReleaseId(r.theme_release_id), activatedBy: asPrincipalId(r.activated_by), activatedAt: r.activated_at, deactivatedAt: r.deactivated_at };
}
class D1PluginStore {
  #db;
  constructor(db) {
    this.#db = db;
  }
  async createPlugin(plugin) {
    await this.#db.prepare("INSERT INTO plugins(id,workspace_id,plugin_key,name,description,trust,state,created_by,created_at) VALUES(?,?,?,?,?,?,?,?,?)").bind(plugin.id, plugin.workspaceId, plugin.key, plugin.name, plugin.description, plugin.trust, plugin.state, plugin.createdBy, plugin.createdAt).run();
  }
  async getPlugin(id) {
    const row = await this.#db.prepare("SELECT * FROM plugins WHERE id=?").bind(id).first();
    return row ? mapPlugin(row) : null;
  }
  async getPluginByKey(workspaceId, key2) {
    const row = await this.#db.prepare("SELECT * FROM plugins WHERE workspace_id=? AND plugin_key=?").bind(workspaceId, key2).first();
    return row ? mapPlugin(row) : null;
  }
  async listPlugins(workspaceId) {
    return (await this.#db.prepare("SELECT * FROM plugins WHERE workspace_id=? ORDER BY created_at DESC").bind(workspaceId).all()).results.map(mapPlugin);
  }
  async createRelease(release) {
    await this.#db.prepare("INSERT INTO plugin_releases(id,plugin_id,version,manifest_json,bundle_json,release_hash,state,created_by,created_at) VALUES(?,?,?,?,?,?,?,?,?)").bind(release.id, release.pluginId, release.version, JSON.stringify(release.manifest), JSON.stringify(release.bundle), release.releaseHash, release.state, release.createdBy, release.createdAt).run();
  }
  async getRelease(id) {
    const row = await this.#db.prepare("SELECT * FROM plugin_releases WHERE id=?").bind(id).first();
    return row ? mapRelease(row) : null;
  }
  async listReleases(pluginId) {
    return (await this.#db.prepare("SELECT * FROM plugin_releases WHERE plugin_id=? ORDER BY created_at DESC").bind(pluginId).all()).results.map(mapRelease);
  }
  async activate(activation) {
    const release = await this.getRelease(activation.pluginReleaseId);
    assertDomain(release, "PLUGIN_RELEASE_NOT_FOUND", "Plugin release not found", 404);
    await this.#db.batch([
      this.#db.prepare("UPDATE plugin_activations SET state='disabled',deactivated_at=? WHERE workspace_id=? AND COALESCE(site_id,'')=COALESCE(?, '') AND plugin_id=? AND state='active'").bind(activation.activatedAt, activation.workspaceId, activation.siteId, release.pluginId),
      this.#db.prepare("INSERT INTO plugin_activations(id,workspace_id,site_id,plugin_id,plugin_release_id,granted_capabilities_json,allowed_hosts_json,state,activated_by,activated_at,deactivated_at) VALUES(?,?,?,?,?,?,?,?,?,?,NULL)").bind(activation.id, activation.workspaceId, activation.siteId, release.pluginId, activation.pluginReleaseId, JSON.stringify(activation.grantedCapabilities), JSON.stringify(activation.allowedHosts), activation.state, activation.activatedBy, activation.activatedAt)
    ]);
  }
  async deactivate(activationId, at) {
    await this.#db.prepare("UPDATE plugin_activations SET state='disabled',deactivated_at=? WHERE id=? AND state='active'").bind(at, activationId).run();
  }
  async getActivation(id) {
    const row = await this.#db.prepare("SELECT * FROM plugin_activations WHERE id=?").bind(id).first();
    return row ? mapActivation(row) : null;
  }
  async listActiveActivations(workspaceId, siteId) {
    const rows = siteId === void 0 ? await this.#db.prepare("SELECT * FROM plugin_activations WHERE workspace_id=? AND state='active' ORDER BY activated_at").bind(workspaceId).all() : await this.#db.prepare("SELECT * FROM plugin_activations WHERE workspace_id=? AND state='active' AND (site_id IS NULL OR site_id=?) ORDER BY activated_at").bind(workspaceId, siteId).all();
    return rows.results.map(mapActivation);
  }
  async recordInvocation(invocation) {
    await this.#db.prepare("INSERT INTO plugin_invocations(id,plugin_release_id,activation_id,hook_name,route_id,request_id,state,duration_ms,error_code,created_at) VALUES(?,?,?,?,?,?,?,?,?,?)").bind(invocation.id, invocation.pluginReleaseId, invocation.activationId, invocation.hookName, invocation.routeId, invocation.requestId, invocation.state, invocation.durationMs, invocation.errorCode, invocation.createdAt).run();
  }
  async listInvocations(pluginReleaseId) {
    return (await this.#db.prepare("SELECT * FROM plugin_invocations WHERE plugin_release_id=? ORDER BY created_at DESC").bind(pluginReleaseId).all()).results.map(mapInvocation);
  }
}
class WorkersForPlatformsPluginRuntime {
  #dispatcher;
  #scriptPrefix;
  #cpuMs;
  #subRequests;
  #networkPolicyEnforced;
  constructor(input) {
    this.#dispatcher = input.dispatcher;
    this.#scriptPrefix = input.scriptPrefix ?? "baser-plugin-";
    this.#cpuMs = input.cpuMs ?? 20;
    this.#subRequests = input.subRequests ?? 10;
    this.#networkPolicyEnforced = input.networkPolicyEnforced ?? false;
  }
  async invoke(release, invocation) {
    assertDomain(release.bundle.format === "worker-module", "SANDBOX_RUNTIME_BUNDLE_REQUIRED", "Sandbox runtime requires a worker-module release", 500);
    const requestsNetwork = invocation.context.capabilities.includes("network:request") || invocation.context.allowedHosts.length > 0;
    assertDomain(!requestsNetwork || this.#networkPolicyEnforced, "PLUGIN_OUTBOUND_POLICY_REQUIRED", "Network-enabled sandbox plugins require an enforced outbound Worker policy", 503);
    const worker = this.#dispatcher.get(`${this.#scriptPrefix}${release.id}`, {}, { limits: { cpuMs: this.#cpuMs, subRequests: this.#subRequests } });
    const response = await worker.fetch(new Request("https://plugin.internal/v1/invoke", {
      method: "POST",
      headers: { "content-type": "application/json", "x-baser-plugin-protocol": "1" },
      body: JSON.stringify(invocation)
    }));
    const text = await readLimitedText(response, 256 * 1024);
    if (!response.ok)
      return { ok: false, error: { code: `PLUGIN_SANDBOX_${response.status}`, message: text.slice(0, 1e3) || "Sandbox plugin failed" } };
    try {
      const parsed = JSON.parse(text);
      return parsed && typeof parsed === "object" && typeof parsed.ok === "boolean" ? parsed : { ok: false, error: { code: "INVALID_PLUGIN_RESPONSE", message: "Sandbox returned an invalid response" } };
    } catch {
      return { ok: false, error: { code: "INVALID_PLUGIN_RESPONSE", message: "Sandbox returned non-JSON output" } };
    }
  }
}
async function readLimitedText(response, limit) {
  const buffer = await response.arrayBuffer();
  assertDomain(buffer.byteLength <= limit, "PLUGIN_RESPONSE_TOO_LARGE", "Plugin response exceeds limit", 502);
  return new TextDecoder().decode(buffer);
}
function mapPlugin(r) {
  return { id: asPluginId(r.id), workspaceId: r.workspace_id, key: r.plugin_key, name: r.name, description: r.description, trust: r.trust, state: r.state, createdBy: asPrincipalId(r.created_by), createdAt: r.created_at };
}
function mapRelease(r) {
  return { id: asPluginReleaseId(r.id), pluginId: asPluginId(r.plugin_id), version: r.version, manifest: JSON.parse(r.manifest_json), bundle: JSON.parse(r.bundle_json), releaseHash: r.release_hash, state: r.state, createdBy: asPrincipalId(r.created_by), createdAt: r.created_at };
}
function mapActivation(r) {
  return { id: asPluginActivationId(r.id), workspaceId: r.workspace_id, siteId: r.site_id ? asSiteId(r.site_id) : null, pluginReleaseId: asPluginReleaseId(r.plugin_release_id), grantedCapabilities: JSON.parse(r.granted_capabilities_json), allowedHosts: JSON.parse(r.allowed_hosts_json), state: r.state, activatedBy: asPrincipalId(r.activated_by), activatedAt: r.activated_at, deactivatedAt: r.deactivated_at };
}
function mapInvocation(r) {
  return { id: asPluginInvocationId(r.id), pluginReleaseId: asPluginReleaseId(r.plugin_release_id), activationId: asPluginActivationId(r.activation_id), hookName: r.hook_name, routeId: r.route_id, requestId: r.request_id, state: r.state, durationMs: r.duration_ms, errorCode: r.error_code, createdAt: r.created_at };
}
class D1AuthStore {
  #db;
  constructor(db) {
    this.#db = db;
  }
  async createIdentity(identity) {
    await this.#db.prepare("INSERT INTO auth_identities(id,workspace_id,principal_id,label,state,created_at) VALUES(?,?,?,?,?,?)").bind(identity.id, identity.workspaceId, identity.principalId, identity.label, identity.state, identity.createdAt).run();
  }
  async getIdentity(id) {
    const row = await this.#db.prepare("SELECT * FROM auth_identities WHERE id=?").bind(id).first();
    return row ? mapIdentity(row) : null;
  }
  async getIdentityByLabel(workspaceId, principalId, label) {
    const row = await this.#db.prepare("SELECT * FROM auth_identities WHERE workspace_id=? AND principal_id=? AND label=?").bind(workspaceId, principalId, label).first();
    return row ? mapIdentity(row) : null;
  }
  async listIdentitiesForPrincipal(principalId) {
    const rows = await this.#db.prepare("SELECT * FROM auth_identities WHERE principal_id=?").bind(principalId).all();
    return rows.results.map(mapIdentity);
  }
  async createPasskey(credential) {
    await this.#db.prepare("INSERT INTO passkey_credentials(id,identity_id,credential_id,public_key,counter,transports_json,aaguid,created_at,last_used_at) VALUES(?,?,?,?,?,?,?,?,?)").bind(credential.id, credential.identityId, credential.credentialId, credential.publicKey, credential.counter, JSON.stringify(credential.transports), credential.aaguid, credential.createdAt, credential.lastUsedAt).run();
  }
  async getPasskeyByCredentialId(credentialId) {
    const row = await this.#db.prepare("SELECT * FROM passkey_credentials WHERE credential_id=?").bind(credentialId).first();
    return row ? mapPasskey(row) : null;
  }
  async listPasskeysForIdentity(identityId) {
    const rows = await this.#db.prepare("SELECT * FROM passkey_credentials WHERE identity_id=?").bind(identityId).all();
    return rows.results.map(mapPasskey);
  }
  async updatePasskeyCounter(id, counter, lastUsedAt) {
    await this.#db.prepare("UPDATE passkey_credentials SET counter=?, last_used_at=? WHERE id=?").bind(counter, lastUsedAt, id).run();
  }
  async createChallenge(record) {
    await this.#db.prepare("INSERT INTO webauthn_challenges(id,workspace_id,principal_id,identity_id,purpose,challenge,operation,expires_at,created_at) VALUES(?,?,?,?,?,?,?,?,?)").bind(record.id, record.workspaceId, record.principalId, record.identityId, record.purpose, record.challenge, record.operation, record.expiresAt, record.createdAt).run();
  }
  async getChallenge(id) {
    const row = await this.#db.prepare("SELECT * FROM webauthn_challenges WHERE id=?").bind(id).first();
    return row ? mapChallenge(row) : null;
  }
  async deleteChallenge(id) {
    await this.#db.prepare("DELETE FROM webauthn_challenges WHERE id=?").bind(id).run();
  }
  async createSession(session) {
    await this.#db.prepare("INSERT INTO auth_sessions(id,workspace_id,principal_id,token_hash,csrf_token_hash,user_agent,ip_hint,created_at,expires_at,rotated_at,revoked_at,last_seen_at) VALUES(?,?,?,?,?,?,?,?,?,?,?,?)").bind(session.id, session.workspaceId, session.principalId, session.tokenHash, session.csrfTokenHash, session.userAgent, session.ipHint, session.createdAt, session.expiresAt, session.rotatedAt, session.revokedAt, session.lastSeenAt).run();
  }
  async getSession(id) {
    const row = await this.#db.prepare("SELECT * FROM auth_sessions WHERE id=?").bind(id).first();
    return row ? mapSession(row) : null;
  }
  async getSessionByTokenHash(tokenHash) {
    const row = await this.#db.prepare("SELECT * FROM auth_sessions WHERE token_hash=?").bind(tokenHash).first();
    return row ? mapSession(row) : null;
  }
  async updateSession(session) {
    await this.#db.prepare("UPDATE auth_sessions SET token_hash=?, csrf_token_hash=?, user_agent=?, ip_hint=?, expires_at=?, rotated_at=?, revoked_at=?, last_seen_at=? WHERE id=?").bind(session.tokenHash, session.csrfTokenHash, session.userAgent, session.ipHint, session.expiresAt, session.rotatedAt, session.revokedAt, session.lastSeenAt, session.id).run();
  }
  async listSessionsForPrincipal(principalId) {
    const rows = await this.#db.prepare("SELECT * FROM auth_sessions WHERE principal_id=?").bind(principalId).all();
    return rows.results.map(mapSession);
  }
  async upsertStepUp(stepUp) {
    await this.#db.prepare("INSERT INTO session_step_ups(id,session_id,operation,expires_at,created_at) VALUES(?,?,?,?,?) ON CONFLICT(session_id, operation) DO UPDATE SET id=excluded.id, expires_at=excluded.expires_at, created_at=excluded.created_at").bind(stepUp.id, stepUp.sessionId, stepUp.operation, stepUp.expiresAt, stepUp.createdAt).run();
  }
  async getStepUp(sessionId, operation, now) {
    const row = await this.#db.prepare("SELECT * FROM session_step_ups WHERE session_id=? AND operation=? AND expires_at>?").bind(sessionId, operation, now).first();
    return row ? mapStepUp(row) : null;
  }
  async deleteStepUpsForSession(sessionId) {
    await this.#db.prepare("DELETE FROM session_step_ups WHERE session_id=?").bind(sessionId).run();
  }
}
function mapIdentity(row) {
  return {
    id: asAuthIdentityId(String(row.id)),
    workspaceId: asWorkspaceId(String(row.workspace_id)),
    principalId: asPrincipalId(String(row.principal_id)),
    label: String(row.label),
    state: row.state === "disabled" ? "disabled" : "active",
    createdAt: Number(row.created_at)
  };
}
function mapPasskey(row) {
  const publicKey = row.public_key instanceof Uint8Array ? row.public_key : new Uint8Array(row.public_key);
  return {
    id: asPasskeyCredentialId(String(row.id)),
    identityId: asAuthIdentityId(String(row.identity_id)),
    credentialId: String(row.credential_id),
    publicKey,
    counter: Number(row.counter),
    transports: JSON.parse(String(row.transports_json)),
    aaguid: row.aaguid === null || row.aaguid === void 0 ? null : String(row.aaguid),
    createdAt: Number(row.created_at),
    lastUsedAt: row.last_used_at === null || row.last_used_at === void 0 ? null : Number(row.last_used_at)
  };
}
function mapChallenge(row) {
  return {
    id: asWebAuthnChallengeId(String(row.id)),
    workspaceId: asWorkspaceId(String(row.workspace_id)),
    principalId: row.principal_id === null ? null : asPrincipalId(String(row.principal_id)),
    identityId: row.identity_id === null ? null : asAuthIdentityId(String(row.identity_id)),
    purpose: String(row.purpose),
    challenge: String(row.challenge),
    operation: row.operation === null ? null : String(row.operation),
    expiresAt: Number(row.expires_at),
    createdAt: Number(row.created_at)
  };
}
function mapSession(row) {
  return {
    id: asAuthSessionId(String(row.id)),
    workspaceId: asWorkspaceId(String(row.workspace_id)),
    principalId: asPrincipalId(String(row.principal_id)),
    tokenHash: String(row.token_hash),
    csrfTokenHash: String(row.csrf_token_hash),
    userAgent: row.user_agent === null ? null : String(row.user_agent),
    ipHint: row.ip_hint === null ? null : String(row.ip_hint),
    createdAt: Number(row.created_at),
    expiresAt: Number(row.expires_at),
    rotatedAt: row.rotated_at === null ? null : Number(row.rotated_at),
    revokedAt: row.revoked_at === null ? null : Number(row.revoked_at),
    lastSeenAt: Number(row.last_seen_at)
  };
}
function mapStepUp(row) {
  return {
    id: asSessionStepUpId(String(row.id)),
    sessionId: asAuthSessionId(String(row.session_id)),
    operation: String(row.operation),
    expiresAt: Number(row.expires_at),
    createdAt: Number(row.created_at)
  };
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
function json$2(value) {
  return JSON.parse(value);
}
function mapSite(r) {
  return { id: asSiteId(r.id), workspaceId: r.workspace_id, name: r.name, hostname: r.hostname, locale: r.locale, state: r.state, createdAt: r.created_at, updatedAt: r.updated_at };
}
function mapPrincipal(r) {
  return { id: asPrincipalId(r.id), workspaceId: r.workspace_id, type: r.principal_type, displayName: r.display_name, state: r.state, createdAt: r.created_at };
}
function mapGrant(r) {
  const g = { id: r.id, principalId: asPrincipalId(r.principal_id), capability: r.capability, scope: json$2(r.scope_json) };
  if (r.valid_from !== null)
    g.validFrom = r.valid_from;
  if (r.valid_until !== null)
    g.validUntil = r.valid_until;
  if (r.revoked_at !== null)
    g.revokedAt = r.revoked_at;
  return g;
}
function mapDelegation(r) {
  const g = { id: r.id, humanPrincipalId: asPrincipalId(r.human_principal_id), agentPrincipalId: asPrincipalId(r.agent_principal_id), capabilities: json$2(r.capabilities_json), scope: json$2(r.scope_json), maximumRisk: r.maximum_risk, expiresAt: r.expires_at };
  if (r.revoked_at !== null)
    g.revokedAt = r.revoked_at;
  return g;
}
function mapItem(r) {
  return { id: asContentItemId(r.id), workspaceId: r.workspace_id, siteId: asSiteId(r.site_id), contentTypeKey: r.content_type_key, workingRevisionId: r.working_revision_id ? asRevisionId(r.working_revision_id) : null, publishedRevisionId: r.published_revision_id ? asRevisionId(r.published_revision_id) : null, lockVersion: r.lock_version, state: r.state, createdBy: asPrincipalId(r.created_by), createdAt: r.created_at, updatedAt: r.updated_at };
}
function mapRevision(r) {
  return { id: asRevisionId(r.id), contentItemId: asContentItemId(r.content_item_id), revisionNumber: r.revision_number, basedOnRevisionId: r.based_on_revision_id ? asRevisionId(r.based_on_revision_id) : null, fields: json$2(r.fields_json), document: json$2(r.document_json), contentHash: r.content_hash, createdBy: asPrincipalId(r.created_by), agentRunId: r.agent_run_id, changeSummary: r.change_summary, createdAt: r.created_at };
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
  return { id: r.id, contentItemId: asContentItemId(r.content_item_id), baseRevisionId: asRevisionId(r.base_revision_id), resultRevisionId: r.result_revision_id ? asRevisionId(r.result_revision_id) : null, operations: json$2(r.operations_json), diff: r.diff_json ? json$2(r.diff_json) : null, riskLevel: r.risk_level, state: r.state, createdBy: asPrincipalId(r.created_by), agentRunId: r.agent_run_id, createdAt: r.created_at };
}
function mapAudit(r) {
  return { id: r.id, workspaceId: r.workspace_id, siteId: r.site_id ? asSiteId(r.site_id) : null, occurredAt: r.occurred_at, actorPrincipalId: asPrincipalId(r.actor_principal_id), actorType: r.actor_type, onBehalfOfPrincipalId: r.on_behalf_of_principal_id ? asPrincipalId(r.on_behalf_of_principal_id) : null, delegationId: r.delegation_id, action: r.action, resourceType: r.resource_type, resourceId: r.resource_id, revisionId: r.revision_id ? asRevisionId(r.revision_id) : null, capability: r.capability, result: r.result, reason: r.reason, requestId: r.request_id, details: json$2(r.details_json) };
}
function mapOutbox(r) {
  return { id: r.id, eventType: r.event_type, aggregateType: r.aggregate_type, aggregateId: r.aggregate_id, payload: json$2(r.payload_json), state: r.state, attempts: r.attempts, availableAt: r.available_at, createdAt: r.created_at };
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
    return clone$5(this.assets.get(id) ?? null);
  }
  async getUploadSession(id) {
    return clone$5(this.sessions.get(id) ?? null);
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
    const etag = await digest$1(bytes);
    const metadata = { key: key2, size: bytes.byteLength, etag, uploadedAt: Date.now(), mediaType: options.mediaType };
    this.objects.set(key2, { bytes, metadata, mediaType: options.mediaType });
    return structuredClone(metadata);
  }
  async head(key2) {
    return clone$5(this.objects.get(key2)?.metadata ?? null);
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
function clone$5(value) {
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
async function digest$1(bytes) {
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
    return clone$4(this.collections.get(id) ?? null);
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
    return clone$4(this.articles.get(contentItemId) ?? null);
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
    return clone$4(this.taxonomies.get(id) ?? null);
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
    return clone$4(this.terms.get(id) ?? null);
  }
  async listTerms(taxonomyId) {
    return [...this.terms.values()].filter((item) => item.taxonomyId === taxonomyId).map((item) => structuredClone(item));
  }
  async setRevisionTaxonomyValue(value) {
    this.revisionValues.set(key(value.revisionId, value.taxonomyId), structuredClone(value));
  }
  async getRevisionTaxonomyValue(revisionId, taxonomyId) {
    return clone$4(this.revisionValues.get(key(revisionId, taxonomyId)) ?? null);
  }
}
function key(revisionId, taxonomyId) {
  return `${revisionId}:${taxonomyId}`;
}
function clone$4(value) {
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
    for (const termId of unique$1(termIds)) {
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
    const requiredTermIds = unique$1(options.termIds ?? []);
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
    for (const termId of unique$1(termIds)) {
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
function unique$1(values) {
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
    this.fields.set(field.id, clone$3(field));
  }
  async getField(id) {
    return maybe$1(this.fields.get(id));
  }
  async listFields(workspaceId) {
    return [...this.fields.values()].filter((item) => item.workspaceId === workspaceId).map(clone$3);
  }
  async createTable(table) {
    if ([...this.tables.values()].some((item) => item.workspaceId === table.workspaceId && item.key === table.key))
      throw new DomainError("CUSTOM_TABLE_KEY_EXISTS", "Custom table key already exists", 409);
    this.tables.set(table.id, clone$3(table));
  }
  async getTable(id) {
    return maybe$1(this.tables.get(id));
  }
  async listTables(workspaceId) {
    return [...this.tables.values()].filter((item) => item.workspaceId === workspaceId).map(clone$3);
  }
  async updateTable(table) {
    if (!this.tables.has(table.id))
      throw new DomainError("CUSTOM_TABLE_NOT_FOUND", "Custom table not found", 404);
    this.tables.set(table.id, clone$3(table));
  }
  async attachField(relation) {
    const key2 = `${relation.tableId}:${relation.fieldId}`;
    if (this.tableFields.has(key2))
      throw new DomainError("CUSTOM_TABLE_FIELD_EXISTS", "Field is already attached", 409);
    this.tableFields.set(key2, clone$3(relation));
  }
  async listTableFields(tableId) {
    return [...this.tableFields.values()].filter((item) => item.tableId === tableId).sort((a, b) => a.sortOrder - b.sortOrder).map(clone$3);
  }
  async createCustomContent(definition2) {
    if (this.contentByItem.has(definition2.contentItemId))
      throw new DomainError("CUSTOM_CONTENT_EXISTS", "Custom content definition already exists", 409);
    this.contents.set(definition2.id, clone$3(definition2));
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
    return [...this.contents.values()].filter((item) => item.siteId === siteId).map(clone$3);
  }
  async createEntry(entry, revision) {
    if (entry.slug && [...this.entries.values()].some((item) => item.customContentId === entry.customContentId && item.slug === entry.slug))
      throw new DomainError("CUSTOM_ENTRY_SLUG_EXISTS", "Entry slug already exists", 409);
    this.entries.set(entry.id, clone$3(entry));
    this.revisions.set(revision.id, clone$3(revision));
    return this.getEntry(entry.id);
  }
  async getEntry(id) {
    const entry = this.entries.get(id);
    if (!entry)
      return null;
    const working = this.revisions.get(entry.workingRevisionId);
    if (!working)
      throw new DomainError("CUSTOM_ENTRY_REVISION_MISSING", "Working revision missing", 500);
    return { entry: clone$3(entry), workingRevision: clone$3(working), publishedRevision: entry.publishedRevisionId ? clone$3(this.revisions.get(entry.publishedRevisionId) ?? null) : null };
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
    this.revisions.set(input.revision.id, clone$3(input.revision));
    entry.workingRevisionId = input.revision.id;
    entry.lockVersion += 1;
    entry.updatedAt = input.revision.createdAt;
    return clone$3(input.revision);
  }
  async createApproval(approval) {
    this.approvals.set(approval.id, clone$3(approval));
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
        result.push(clone$3(approval));
    }
    return result.sort((a, b) => b.requestedAt - a.requestedAt);
  }
  async updateApproval(approval) {
    if (!this.approvals.has(approval.id))
      throw new DomainError("CUSTOM_ENTRY_APPROVAL_NOT_FOUND", "Approval not found", 404);
    this.approvals.set(approval.id, clone$3(approval));
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
function clone$3(value) {
  return structuredClone(value);
}
function maybe$1(value) {
  return value === void 0 ? null : clone$3(value);
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
      key: normalizeKey$2(input.key),
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
      key: normalizeKey$2(input.key),
      name: input.name.trim(),
      kind: input.kind,
      hierarchical: input.kind === "master" ? Boolean(input.hierarchical) : false,
      displayFieldKey: input.displayFieldKey ? normalizeKey$2(input.displayFieldKey) : null,
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
    const orderKey = input.listOrderFieldKey ? normalizeKey$2(input.listOrderFieldKey) : table.displayFieldKey ?? schema.fields[0].definition.key;
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
function normalizeKey$2(value) {
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
    this.forms.set(definition2.id, clone$2(definition2));
    this.byContent.set(definition2.contentItemId, definition2.id);
    for (const policy of policies)
      this.policies.set(`${policy.mailFormId}:${policy.fieldId}`, clone$2(policy));
  }
  async getForm(id) {
    return maybe(this.forms.get(id));
  }
  async getFormByContentItem(contentItemId) {
    const id = this.byContent.get(contentItemId);
    return id ? this.getForm(id) : null;
  }
  async listForms(siteId) {
    return [...this.forms.values()].filter((v) => v.siteId === siteId).map(clone$2);
  }
  async listFieldPolicies(mailFormId) {
    return [...this.policies.values()].filter((v) => v.mailFormId === mailFormId).map(clone$2);
  }
  async createConfirmation(session) {
    this.confirmations.set(session.id, clone$2(session));
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
    this.submissions.set(input.submission.id, clone$2(input.submission));
    this.payloads.set(input.payload.submissionId, clone$2(input.payload));
    for (const notification of input.notifications)
      this.notifications.set(notification.id, clone$2(notification));
    return clone$2(input.submission);
  }
  async getSubmission(id) {
    const s = this.submissions.get(id);
    if (!s)
      return null;
    return { submission: clone$2(s), values: s.payloadState === "available" ? clone$2(this.payloads.get(id)?.values ?? null) : null, redacted: false };
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
    return clone$2(s);
  }
  async listPendingNotifications(limit, now) {
    return [...this.notifications.values()].filter((n) => n.state === "pending" && n.availableAt <= now).sort((a, b) => a.availableAt - b.availableAt).slice(0, limit).map(clone$2);
  }
  async getNotification(id) {
    return maybe(this.notifications.get(id));
  }
  async listNotificationsForSubmission(id) {
    return [...this.notifications.values()].filter((n) => n.submissionId === id).map(clone$2);
  }
  async updateNotification(n) {
    if (!this.notifications.has(n.id))
      throw new DomainError("MAIL_NOTIFICATION_NOT_FOUND", "Notification not found", 404);
    this.notifications.set(n.id, clone$2(n));
  }
  async updateSubmissionState(id, state) {
    const s = this.submissions.get(id);
    if (!s)
      throw new DomainError("MAIL_SUBMISSION_NOT_FOUND", "Submission not found", 404);
    s.state = state;
  }
}
function clone$2(v) {
  return structuredClone(v);
}
function maybe(v) {
  return v === void 0 ? null : clone$2(v);
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
      const privacyClass2 = policy?.privacyClass ?? defaultPrivacy(field.type);
      return { mailFormId: definition2.id, fieldId: field.id, privacyClass: privacyClass2, includeInOwnerNotification: policy?.includeInOwnerNotification ?? true, includeInAutoReply: policy?.includeInAutoReply ?? privacyClass2 !== "sensitive", createdAt: now };
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
class CloudflareEmailSender {
  #binding;
  constructor(binding) {
    this.#binding = binding;
  }
  async send(message) {
    await this.#binding.send({ to: message.to, from: message.from, subject: message.subject, text: message.text, ...message.replyTo ? { replyTo: message.replyTo } : {} });
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
      name: requiredText$1(input.name, 120),
      description: optionalText$1(input.description ?? "", 1e3),
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
      name: requiredText$1(input.name, 120),
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
      name: requiredText$1(input.name, 120),
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
    const manifest = validateManifest$1(input.manifest);
    const version = validateVersion$1(input.version);
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
    return clone$1(this.themes.get(id));
  }
  async listThemes(workspaceId) {
    return [...this.themes.values()].filter((value) => value.workspaceId === workspaceId).map((value) => structuredClone(value));
  }
  async createTokenRevision(revision) {
    this.tokenRevisions.set(revision.id, structuredClone(revision));
  }
  async getTokenRevision(id) {
    return clone$1(this.tokenRevisions.get(id));
  }
  async countTokenRevisions(themeId) {
    return [...this.tokenRevisions.values()].filter((value) => value.themeId === themeId).length;
  }
  async createLayoutRevision(revision) {
    this.layoutRevisions.set(revision.id, structuredClone(revision));
  }
  async getLayoutRevision(id) {
    return clone$1(this.layoutRevisions.get(id));
  }
  async countLayoutRevisions(themeId) {
    return [...this.layoutRevisions.values()].filter((value) => value.themeId === themeId).length;
  }
  async createRelease(release) {
    assertDomain(![...this.releases.values()].some((value) => value.themeId === release.themeId && value.version === release.version), "THEME_VERSION_EXISTS", "Theme release version already exists", 409);
    this.releases.set(release.id, structuredClone(release));
  }
  async getRelease(id) {
    return clone$1(this.releases.get(id));
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
  const footerText = optionalText$1(input.footerText, 240);
  const mainClass = validateClassName(input.mainClass || "bc-page");
  return { ...input, footerText, mainClass };
}
function validateManifest$1(input) {
  assertDomain(input.rendererApiVersion === 1, "UNSUPPORTED_THEME_RENDERER", "Unsupported theme renderer API version", 422);
  assertDomain(["light", "dark", "auto"].includes(input.variant), "INVALID_THEME_VARIANT", "Invalid theme variant", 422);
  assertDomain(Array.isArray(input.supportedContentTypes) && input.supportedContentTypes.length > 0 && input.supportedContentTypes.length <= 64, "INVALID_THEME_CONTENT_TYPES", "supportedContentTypes is invalid", 422);
  const cssText = input.cssText ?? "";
  assertDomain(cssText.length <= 65536, "THEME_CSS_TOO_LARGE", "Theme CSS exceeds 64 KiB", 413);
  const lowered = cssText.toLowerCase();
  assertDomain(!lowered.includes("@import") && !lowered.includes("expression(") && !lowered.includes("javascript:") && !lowered.includes("</style") && !/url\s*\(\s*["']?https?:/i.test(cssText), "UNSAFE_THEME_CSS", "Theme CSS contains a forbidden external or executable construct", 422);
  assertDomain(["native", "basercms-migration", "emdash-derived"].includes(input.source.kind), "INVALID_THEME_SOURCE", "Invalid theme source", 422);
  return { rendererApiVersion: 1, variant: input.variant, supportedContentTypes: [...new Set(input.supportedContentTypes.map((value) => requiredText$1(String(value), 80)))], cssText, source: { kind: input.source.kind, ...input.source.reference ? { reference: optionalText$1(input.source.reference, 500) } : {} } };
}
function normalizeKey$1(value) {
  const key2 = value.trim().toLowerCase();
  assertDomain(/^[a-z][a-z0-9-]{1,62}$/.test(key2), "INVALID_THEME_KEY", "Theme key must be lowercase ASCII with hyphens", 422);
  return key2;
}
function validateVersion$1(value) {
  const version = value.trim();
  assertDomain(/^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?$/.test(version), "INVALID_THEME_VERSION", "Theme release version must be semantic versioning", 422);
  return version;
}
function validateClassName(value) {
  assertDomain(/^[a-zA-Z][a-zA-Z0-9 _-]{0,120}$/.test(value), "INVALID_THEME_CLASS", "Theme layout class is invalid", 422);
  return value;
}
function requiredText$1(value, max) {
  const result = value.trim();
  assertDomain(result.length > 0 && result.length <= max, "INVALID_TEXT", "Required text is empty or too long", 422);
  return result;
}
function optionalText$1(value, max) {
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
function clone$1(value) {
  return value === void 0 ? null : structuredClone(value);
}
const PluginCapabilities = {
  ContentRead: "content:read",
  ContentPropose: "content:propose",
  ContentRequestPublish: "content:request-publish",
  AssetRead: "asset:read",
  AssetWrite: "asset:write",
  MailSend: "email:send",
  NetworkRequest: "network:request",
  StorageRead: "storage:read",
  StorageWrite: "storage:write",
  AdminPage: "admin:page",
  AdminWidget: "admin:widget",
  ApiRoute: "api:route",
  BlockRegister: "block:register",
  AuditWrite: "audit:write"
};
const PLUGIN_CAPABILITY_SET = new Set(Object.values(PluginCapabilities));
const PluginHooks = {
  ContentBeforePublish: "content.beforePublish",
  ContentAfterPublish: "content.afterPublish",
  MailAfterSubmit: "mail.afterSubmit",
  ThemeAfterActivate: "theme.afterActivate"
};
const PLUGIN_HOOK_SET = new Set(Object.values(PluginHooks));
class UnavailablePluginRuntime {
  #reason;
  constructor(reason = "Plugin runtime is not configured") {
    this.#reason = reason;
  }
  async invoke() {
    return { ok: false, error: { code: "PLUGIN_RUNTIME_UNAVAILABLE", message: this.#reason } };
  }
}
class MemoryTrustedPluginRuntime {
  #handlers = /* @__PURE__ */ new Map();
  register(releaseId, handlerName2, handler) {
    this.#handlers.set(`${releaseId}:${handlerName2}`, handler);
  }
  async invoke(release, invocation) {
    assertDomain(release.bundle.format === "host-module", "TRUSTED_RUNTIME_BUNDLE_REQUIRED", "Trusted runtime only accepts host-module releases", 500);
    const handler = this.#handlers.get(`${release.id}:${invocation.handler}`);
    assertDomain(handler, "PLUGIN_HANDLER_NOT_REGISTERED", `Plugin handler is not registered: ${invocation.handler}`, 500);
    return structuredClone(await handler(structuredClone(invocation)));
  }
}
class PluginService {
  store;
  #cms;
  #security;
  #trustedRuntime;
  #sandboxRuntime;
  #clock;
  constructor(input) {
    this.store = input.store;
    this.#cms = input.cms;
    this.#security = input.security;
    this.#trustedRuntime = input.trustedRuntime;
    this.#sandboxRuntime = input.sandboxRuntime;
    this.#clock = input.clock ?? systemClock;
  }
  async createPlugin(actor, input) {
    const key2 = normalizeKey(input.key);
    await this.#authorize(actor, Capabilities.PluginManage, { workspaceId: input.workspaceId, risk: "high" }, "plugin.create", "workspace", input.workspaceId);
    assertDomain(actor.actorType === "human", "HUMAN_PLUGIN_CREATION_REQUIRED", "Only a human can register a plugin identity", 403);
    const plugin = {
      id: asPluginId(newId("plugin")),
      workspaceId: input.workspaceId,
      key: key2,
      name: requiredText(input.name, 120),
      description: optionalText(input.description ?? "", 1e3),
      trust: input.trust,
      state: "active",
      createdBy: actor.actorId,
      createdAt: this.#clock.now()
    };
    await this.store.createPlugin(plugin);
    await this.#success(actor, plugin.workspaceId, null, "plugin.create", "plugin", plugin.id, Capabilities.PluginManage, { key: key2, trust: plugin.trust });
    return plugin;
  }
  async listPlugins(actor, workspaceId) {
    await this.#authorize(actor, Capabilities.PluginRead, { workspaceId, risk: "low" }, "plugin.list", "workspace", workspaceId);
    return this.store.listPlugins(workspaceId);
  }
  async createRelease(actor, input) {
    const plugin = await this.#requirePlugin(input.pluginId);
    await this.#authorize(actor, Capabilities.PluginManage, { workspaceId: plugin.workspaceId, risk: "high" }, "plugin.release.create", "plugin", plugin.id);
    assertDomain(actor.actorType === "human", "HUMAN_PLUGIN_RELEASE_REQUIRED", "Only a human can register a plugin release", 403);
    const manifest = validateManifest(input.manifest);
    assertDomain(manifest.key === plugin.key, "PLUGIN_MANIFEST_KEY_MISMATCH", "Manifest key does not match plugin key", 422);
    const bundle = validateBundle(input.bundle, plugin.trust);
    const version = validateVersion(input.version);
    const material = { pluginId: plugin.id, version, manifest, bundle };
    const release = {
      id: asPluginReleaseId(newId("pluginRelease")),
      pluginId: plugin.id,
      version,
      manifest,
      bundle,
      releaseHash: await sha256(stableStringify(material)),
      state: "ready",
      createdBy: actor.actorId,
      createdAt: this.#clock.now()
    };
    await this.store.createRelease(release);
    await this.#success(actor, plugin.workspaceId, null, "plugin.release.create", "plugin-release", release.id, Capabilities.PluginManage, {
      version,
      releaseHash: release.releaseHash,
      requestedCapabilities: manifest.capabilities
    });
    return release;
  }
  async listReleases(actor, pluginId) {
    const plugin = await this.#requirePlugin(pluginId);
    await this.#authorize(actor, Capabilities.PluginRead, { workspaceId: plugin.workspaceId, risk: "low" }, "plugin.release.list", "plugin", plugin.id);
    return this.store.listReleases(plugin.id);
  }
  async listInvocations(actor, pluginReleaseId) {
    const release = await this.#requireRelease(pluginReleaseId);
    const plugin = await this.#requirePlugin(release.pluginId);
    await this.#authorize(actor, Capabilities.PluginRead, { workspaceId: plugin.workspaceId, risk: "low" }, "plugin.invocation.list", "plugin-release", release.id);
    return this.store.listInvocations(release.id);
  }
  async activate(actor, input) {
    await this.#authorize(actor, Capabilities.PluginActivate, { workspaceId: input.workspaceId, ...input.siteId ? { siteId: input.siteId } : {}, risk: "critical" }, "plugin.activate", "plugin-release", input.pluginReleaseId);
    assertDomain(actor.actorType === "human", "HUMAN_PLUGIN_ACTIVATION_REQUIRED", "Only a human can activate a plugin release", 403);
    const release = await this.#requireRelease(input.pluginReleaseId);
    const plugin = await this.#requirePlugin(release.pluginId);
    assertDomain(plugin.workspaceId === input.workspaceId, "PLUGIN_WORKSPACE_MISMATCH", "Plugin belongs to another workspace", 422);
    if (input.siteId) {
      const site = await this.#cms.store.getSite(input.siteId);
      assertDomain(site?.workspaceId === input.workspaceId, "PLUGIN_SITE_WORKSPACE_MISMATCH", "Site belongs to another workspace", 422);
    }
    const grantedCapabilities = unique(input.grantedCapabilities);
    assertDomain(grantedCapabilities.every((capability) => release.manifest.capabilities.includes(capability)), "PLUGIN_CAPABILITY_NOT_REQUESTED", "Granted capability was not requested by the manifest", 422);
    const allowedHosts = unique((input.allowedHosts ?? []).map(normalizeHostPattern));
    assertDomain(allowedHosts.every((host) => release.manifest.network.allowedHosts.includes(host)), "PLUGIN_HOST_NOT_REQUESTED", "Allowed network host was not requested by the manifest", 422);
    if (allowedHosts.length > 0)
      assertDomain(grantedCapabilities.includes(PluginCapabilities.NetworkRequest), "PLUGIN_NETWORK_CAPABILITY_REQUIRED", "Network hosts require network:request capability", 422);
    const activation = {
      id: asPluginActivationId(newId("pluginActivation")),
      workspaceId: input.workspaceId,
      siteId: input.siteId ?? null,
      pluginReleaseId: release.id,
      grantedCapabilities,
      allowedHosts,
      state: "active",
      activatedBy: actor.actorId,
      activatedAt: this.#clock.now(),
      deactivatedAt: null
    };
    await this.store.activate(activation);
    await this.#success(actor, input.workspaceId, input.siteId ?? null, "plugin.activate", "plugin-release", release.id, Capabilities.PluginActivate, {
      activationId: activation.id,
      grantedCapabilities,
      allowedHosts,
      trust: plugin.trust
    });
    return activation;
  }
  async deactivate(actor, activationId) {
    const activation = await this.#requireActivation(activationId);
    await this.#authorize(actor, Capabilities.PluginActivate, { workspaceId: activation.workspaceId, ...activation.siteId ? { siteId: activation.siteId } : {}, risk: "high" }, "plugin.deactivate", "plugin-activation", activation.id);
    assertDomain(actor.actorType === "human", "HUMAN_PLUGIN_ACTIVATION_REQUIRED", "Only a human can deactivate a plugin", 403);
    await this.store.deactivate(activation.id, this.#clock.now());
    await this.#success(actor, activation.workspaceId, activation.siteId, "plugin.deactivate", "plugin-activation", activation.id, Capabilities.PluginActivate, {});
  }
  async listActivations(actor, workspaceId, siteId) {
    await this.#authorize(actor, Capabilities.PluginRead, { workspaceId, ...siteId ? { siteId } : {}, risk: "low" }, "plugin.activation.list", "workspace", workspaceId);
    const result = [];
    const activations = siteId === void 0 ? await this.store.listActiveActivations(workspaceId) : await this.#effectiveActivations(workspaceId, siteId);
    for (const activation of activations) {
      const release = await this.#requireRelease(activation.pluginReleaseId);
      const plugin = await this.#requirePlugin(release.pluginId);
      result.push({ activation, plugin, release });
    }
    return result;
  }
  async listAdminExtensions(actor, workspaceId, siteId) {
    const active = await this.listActivations(actor, workspaceId, siteId);
    return active.map(({ plugin, release, activation }) => ({
      pluginKey: plugin.key,
      releaseId: release.id,
      pages: activation.grantedCapabilities.includes(PluginCapabilities.AdminPage) ? structuredClone(release.manifest.admin.pages) : [],
      widgets: activation.grantedCapabilities.includes(PluginCapabilities.AdminWidget) ? structuredClone(release.manifest.admin.widgets) : []
    })).filter((value) => value.pages.length > 0 || value.widgets.length > 0);
  }
  async invokeRoute(actor, input) {
    await this.#authorize(actor, Capabilities.PluginInvoke, { workspaceId: input.workspaceId, ...input.siteId ? { siteId: input.siteId } : {}, risk: input.method === "GET" ? "low" : "medium" }, "plugin.route.invoke", "plugin", input.pluginKey);
    const plugin = await this.store.getPluginByKey(input.workspaceId, normalizeKey(input.pluginKey));
    assertDomain(plugin, "PLUGIN_NOT_FOUND", "Plugin not found", 404);
    const activation = await this.#findActivationForPlugin(input.workspaceId, input.siteId ?? null, plugin.id);
    const release = await this.#requireRelease(activation.pluginReleaseId);
    assertDomain(activation.grantedCapabilities.includes(PluginCapabilities.ApiRoute), "PLUGIN_ROUTE_CAPABILITY_NOT_GRANTED", "Plugin route capability is not granted", 403);
    const routePath = normalizeRoutePath(input.path);
    const route = release.manifest.routes.find((candidate) => candidate.method === input.method && candidate.path === routePath);
    assertDomain(route, "PLUGIN_ROUTE_NOT_FOUND", "Plugin route not found", 404);
    const result = await this.#invoke(plugin, release, activation, {
      kind: "route",
      handler: route.handler,
      route: { method: input.method, path: routePath, query: input.query ?? {}, headers: safeHeaders(input.headers ?? {}), body: input.body ?? null },
      context: this.#runtimeContext(actor.requestId, activation)
    }, { routeId: route.id });
    assertDomain(result.response, "PLUGIN_ROUTE_RESPONSE_REQUIRED", "Plugin route did not return a response", 502);
    return { status: validStatus(result.response.status), headers: safeResponseHeaders(result.response.headers ?? {}), body: String(result.response.body ?? "") };
  }
  async beforePublish(event) {
    await this.dispatchHook(PluginHooks.ContentBeforePublish, event.workspaceId, event.siteId, {
      contentItemId: event.contentItemId,
      revisionId: event.revisionId,
      approvalId: event.approvalId,
      contentType: event.contentType,
      path: event.path,
      actorType: event.actor.actorType
    }, event.actor.requestId, true);
  }
  async afterPublish(event) {
    await this.dispatchHook(PluginHooks.ContentAfterPublish, event.workspaceId, event.siteId, {
      contentItemId: event.contentItemId,
      revisionId: event.revisionId,
      approvalId: event.approvalId,
      contentType: event.contentType,
      path: event.path,
      actorType: event.actor.actorType
    }, event.actor.requestId, false);
  }
  async dispatchHook(hookName, workspaceId, siteId, event, requestId, critical = false) {
    for (const activation of await this.#effectiveActivations(workspaceId, siteId)) {
      const release = await this.#requireRelease(activation.pluginReleaseId);
      const plugin = await this.#requirePlugin(release.pluginId);
      if ((hookName === PluginHooks.ContentBeforePublish || hookName === PluginHooks.ContentAfterPublish) && !activation.grantedCapabilities.includes(PluginCapabilities.ContentRead))
        continue;
      for (const hook of release.manifest.hooks.filter((candidate) => candidate.name === hookName)) {
        const result = await this.#invoke(plugin, release, activation, {
          kind: "hook",
          hookName,
          handler: hook.handler,
          event: structuredClone(event),
          context: this.#runtimeContext(requestId, activation)
        }, { hookName, failureMode: hook.failureMode, critical });
        const blocked = result.output?.blocked === true;
        if (blocked && critical)
          throw new DomainError("PLUGIN_POLICY_BLOCKED", String(result.output?.reason ?? `Plugin ${plugin.key} blocked the operation`), 409, { pluginKey: plugin.key, hookName });
      }
    }
  }
  async #invoke(plugin, release, activation, invocation, meta) {
    const started = this.#clock.now();
    let result;
    try {
      result = await (plugin.trust === "trusted" ? this.#trustedRuntime : this.#sandboxRuntime).invoke(release, invocation);
    } catch (error) {
      result = { ok: false, error: { code: "PLUGIN_RUNTIME_ERROR", message: error instanceof Error ? error.message : "Plugin runtime failed" } };
    }
    const blocked = result.output?.blocked === true;
    await this.store.recordInvocation({
      id: asPluginInvocationId(newId("pluginInvocation")),
      pluginReleaseId: release.id,
      activationId: activation.id,
      hookName: meta.hookName ?? null,
      routeId: meta.routeId ?? null,
      requestId: invocation.context.requestId,
      state: blocked ? "blocked" : result.ok ? "succeeded" : "failed",
      durationMs: Math.max(0, this.#clock.now() - started),
      errorCode: result.error?.code ?? null,
      createdAt: started
    });
    if (!result.ok && (meta.critical || meta.failureMode === "block" || invocation.kind === "route")) {
      throw new DomainError(result.error?.code ?? "PLUGIN_EXECUTION_FAILED", result.error?.message ?? "Plugin execution failed", 502, { pluginKey: plugin.key, releaseId: release.id });
    }
    return result;
  }
  #runtimeContext(requestId, activation) {
    return { requestId, workspaceId: activation.workspaceId, siteId: activation.siteId, capabilities: [...activation.grantedCapabilities], allowedHosts: [...activation.allowedHosts] };
  }
  async #effectiveActivations(workspaceId, siteId) {
    const candidates = await this.store.listActiveActivations(workspaceId, siteId);
    if (siteId === null)
      return candidates.filter((activation) => activation.siteId === null);
    const byPlugin = /* @__PURE__ */ new Map();
    for (const activation of candidates) {
      const release = await this.#requireRelease(activation.pluginReleaseId);
      const current = byPlugin.get(release.pluginId);
      if (!current || activation.siteId === siteId)
        byPlugin.set(release.pluginId, activation);
    }
    return [...byPlugin.values()].sort((a, b) => a.activatedAt - b.activatedAt);
  }
  async #findActivationForPlugin(workspaceId, siteId, pluginId) {
    for (const activation of await this.#effectiveActivations(workspaceId, siteId)) {
      const release = await this.#requireRelease(activation.pluginReleaseId);
      if (release.pluginId === pluginId)
        return activation;
    }
    throw new DomainError("PLUGIN_NOT_ACTIVE", "Plugin is not active for this scope", 404);
  }
  async #requirePlugin(id) {
    const value = await this.store.getPlugin(id);
    assertDomain(value, "PLUGIN_NOT_FOUND", "Plugin not found", 404);
    return value;
  }
  async #requireRelease(id) {
    const value = await this.store.getRelease(id);
    assertDomain(value, "PLUGIN_RELEASE_NOT_FOUND", "Plugin release not found", 404);
    return value;
  }
  async #requireActivation(id) {
    const value = await this.store.getActivation(id);
    assertDomain(value, "PLUGIN_ACTIVATION_NOT_FOUND", "Plugin activation not found", 404);
    return value;
  }
  #authorize(actor, capability, resource, action, resourceType, resourceId) {
    return this.#security.authorize(actor, capability, resource, action, resourceType, resourceId);
  }
  #success(actor, workspaceId, siteId, action, resourceType, resourceId, capability, details) {
    return this.#security.success(actor, { workspaceId, siteId, action, resourceType, resourceId, capability, details });
  }
}
class MemoryPluginStore {
  plugins = /* @__PURE__ */ new Map();
  releases = /* @__PURE__ */ new Map();
  activations = /* @__PURE__ */ new Map();
  invocations = /* @__PURE__ */ new Map();
  async createPlugin(plugin) {
    assertDomain(![...this.plugins.values()].some((value) => value.workspaceId === plugin.workspaceId && value.key === plugin.key), "PLUGIN_KEY_EXISTS", "Plugin key already exists", 409);
    this.plugins.set(plugin.id, structuredClone(plugin));
  }
  async getPlugin(id) {
    return clone(this.plugins.get(id));
  }
  async getPluginByKey(workspaceId, key2) {
    return clone([...this.plugins.values()].find((value) => value.workspaceId === workspaceId && value.key === key2));
  }
  async listPlugins(workspaceId) {
    return [...this.plugins.values()].filter((value) => value.workspaceId === workspaceId).map((value) => structuredClone(value));
  }
  async createRelease(release) {
    assertDomain(![...this.releases.values()].some((value) => value.pluginId === release.pluginId && value.version === release.version), "PLUGIN_VERSION_EXISTS", "Plugin release version already exists", 409);
    this.releases.set(release.id, structuredClone(release));
  }
  async getRelease(id) {
    return clone(this.releases.get(id));
  }
  async listReleases(pluginId) {
    return [...this.releases.values()].filter((value) => value.pluginId === pluginId).sort((a, b) => b.createdAt - a.createdAt).map((value) => structuredClone(value));
  }
  async activate(activation) {
    const release = this.releases.get(activation.pluginReleaseId);
    assertDomain(release, "PLUGIN_RELEASE_NOT_FOUND", "Plugin release not found", 404);
    for (const current of this.activations.values()) {
      const currentRelease = this.releases.get(current.pluginReleaseId);
      if (current.state === "active" && current.workspaceId === activation.workspaceId && current.siteId === activation.siteId && currentRelease?.pluginId === release.pluginId) {
        current.state = "disabled";
        current.deactivatedAt = activation.activatedAt;
      }
    }
    this.activations.set(activation.id, structuredClone(activation));
  }
  async deactivate(activationId, at) {
    const value = this.activations.get(activationId);
    assertDomain(value, "PLUGIN_ACTIVATION_NOT_FOUND", "Plugin activation not found", 404);
    value.state = "disabled";
    value.deactivatedAt = at;
  }
  async getActivation(id) {
    return clone(this.activations.get(id));
  }
  async listActiveActivations(workspaceId, siteId) {
    return [...this.activations.values()].filter((value) => value.workspaceId === workspaceId && value.state === "active" && (siteId === void 0 ? true : value.siteId === null || value.siteId === siteId)).sort((a, b) => a.activatedAt - b.activatedAt).map((value) => structuredClone(value));
  }
  async recordInvocation(invocation) {
    this.invocations.set(invocation.id, structuredClone(invocation));
  }
  async listInvocations(pluginReleaseId) {
    return [...this.invocations.values()].filter((value) => value.pluginReleaseId === pluginReleaseId).map((value) => structuredClone(value));
  }
}
function validateManifest(input) {
  assertDomain(input?.manifestVersion === 1, "UNSUPPORTED_PLUGIN_MANIFEST", "Plugin manifest version must be 1", 422);
  const key2 = normalizeKey(input.key);
  const capabilities = unique(input.capabilities ?? []);
  assertDomain(capabilities.length <= 32 && capabilities.every((value) => PLUGIN_CAPABILITY_SET.has(value)), "INVALID_PLUGIN_CAPABILITY", "Plugin manifest contains an unknown capability", 422);
  const hooks = (input.hooks ?? []).map((hook) => {
    assertDomain(PLUGIN_HOOK_SET.has(hook.name), "INVALID_PLUGIN_HOOK", "Plugin manifest contains an unknown hook", 422);
    const failureMode = hook.failureMode === "block" ? "block" : "continue";
    assertDomain(hook.name === PluginHooks.ContentBeforePublish || failureMode === "continue", "PLUGIN_AFTER_HOOK_CANNOT_BLOCK", "Post-commit plugin hooks must use failureMode=continue", 422);
    return { name: hook.name, handler: handlerName(hook.handler), failureMode };
  });
  assertDomain(hooks.length <= 32 && unique(hooks.map((value) => `${value.name}:${value.handler}`)).length === hooks.length, "INVALID_PLUGIN_HOOKS", "Plugin hooks are duplicated or exceed limits", 422);
  if (hooks.some((hook) => hook.name === PluginHooks.ContentBeforePublish || hook.name === PluginHooks.ContentAfterPublish))
    assertDomain(capabilities.includes(PluginCapabilities.ContentRead), "PLUGIN_CONTENT_HOOK_CAPABILITY_REQUIRED", "Content hooks require content:read capability", 422);
  const routes = (input.routes ?? []).map((route) => ({ id: manifestId(route.id), method: route.method, path: normalizeRoutePath(route.path), handler: handlerName(route.handler) }));
  assertDomain(routes.length <= 16 && routes.every((route) => route.method === "GET" || route.method === "POST"), "INVALID_PLUGIN_ROUTES", "Plugin routes are invalid", 422);
  assertDomain(unique(routes.map((route) => `${route.method}:${route.path}`)).length === routes.length, "DUPLICATE_PLUGIN_ROUTE", "Plugin routes must be unique", 422);
  const pages = (input.admin?.pages ?? []).map((page) => ({ id: manifestId(page.id), title: requiredText(page.title, 80), path: normalizeAdminPath(page.path) }));
  const widgets = (input.admin?.widgets ?? []).map((widget) => ({ id: manifestId(widget.id), title: requiredText(widget.title, 80), placement: widget.placement }));
  assertDomain(widgets.every((widget) => widget.placement === "dashboard" || widget.placement === "content-sidebar"), "INVALID_PLUGIN_WIDGET", "Plugin widget placement is invalid", 422);
  assertDomain(pages.length <= 16 && widgets.length <= 16, "PLUGIN_ADMIN_LIMIT_EXCEEDED", "Plugin admin extensions exceed limits", 422);
  const allowedHosts = unique((input.network?.allowedHosts ?? []).map(normalizeHostPattern));
  assertDomain(allowedHosts.length <= 32, "PLUGIN_HOST_LIMIT_EXCEEDED", "Plugin network host allowlist exceeds limits", 422);
  const storage = {
    kvNamespaces: unique((input.storage?.kvNamespaces ?? []).map(storageKey)),
    collections: (input.storage?.collections ?? []).map((collection) => ({ key: storageKey(collection.key), maxBytes: integerRange(collection.maxBytes, 1024, 10 * 1024 * 1024, "collection.maxBytes") }))
  };
  assertDomain(storage.kvNamespaces.length <= 8 && storage.collections.length <= 8, "PLUGIN_STORAGE_LIMIT_EXCEEDED", "Plugin storage declarations exceed limits", 422);
  if (routes.length > 0)
    assertDomain(capabilities.includes(PluginCapabilities.ApiRoute), "PLUGIN_ROUTE_CAPABILITY_REQUIRED", "Routes require api:route capability", 422);
  if (pages.length > 0)
    assertDomain(capabilities.includes(PluginCapabilities.AdminPage), "PLUGIN_ADMIN_CAPABILITY_REQUIRED", "Admin pages require admin:page capability", 422);
  if (widgets.length > 0)
    assertDomain(capabilities.includes(PluginCapabilities.AdminWidget), "PLUGIN_WIDGET_CAPABILITY_REQUIRED", "Admin widgets require admin:widget capability", 422);
  if (allowedHosts.length > 0)
    assertDomain(capabilities.includes(PluginCapabilities.NetworkRequest), "PLUGIN_NETWORK_CAPABILITY_REQUIRED", "Network hosts require network:request capability", 422);
  if (storage.kvNamespaces.length > 0 || storage.collections.length > 0)
    assertDomain(capabilities.includes(PluginCapabilities.StorageRead) || capabilities.includes(PluginCapabilities.StorageWrite), "PLUGIN_STORAGE_CAPABILITY_REQUIRED", "Storage declarations require storage capability", 422);
  const source = input.source ?? { kind: "native" };
  assertDomain(["native", "basercms-migration", "emdash-derived"].includes(source.kind), "INVALID_PLUGIN_SOURCE", "Plugin source is invalid", 422);
  return {
    manifestVersion: 1,
    key: key2,
    name: requiredText(input.name, 120),
    description: optionalText(input.description ?? "", 1e3),
    capabilities,
    hooks,
    routes,
    admin: { pages, widgets },
    network: { allowedHosts },
    storage,
    source: { kind: source.kind, ...source.reference ? { reference: optionalText(source.reference, 500) } : {} }
  };
}
function validateBundle(input, trust) {
  assertDomain(input && typeof input === "object", "INVALID_PLUGIN_BUNDLE", "Plugin bundle descriptor is required", 422);
  const expected = trust === "trusted" ? "host-module" : "worker-module";
  assertDomain(input.format === expected, "PLUGIN_BUNDLE_TRUST_MISMATCH", `Plugin trust ${trust} requires ${expected}`, 422);
  const entrypoint = requiredText(input.entrypoint, 240);
  assertDomain(!entrypoint.includes("..") && !entrypoint.startsWith("/") && /^[a-zA-Z0-9_./:@-]+$/.test(entrypoint), "INVALID_PLUGIN_ENTRYPOINT", "Plugin entrypoint is invalid", 422);
  const sizeBytes = integerRange(input.sizeBytes, 1, trust === "sandboxed" ? 256 * 1024 : 2 * 1024 * 1024, "bundle.sizeBytes");
  const digest2 = input.sha256.toLowerCase();
  assertDomain(/^[a-f0-9]{64}$/.test(digest2), "INVALID_PLUGIN_BUNDLE_HASH", "Plugin bundle hash must be SHA-256", 422);
  return { format: expected, entrypoint, sizeBytes, sha256: digest2 };
}
function normalizeKey(value) {
  const key2 = String(value).trim().toLowerCase();
  assertDomain(/^[a-z][a-z0-9-]{1,62}$/.test(key2), "INVALID_PLUGIN_KEY", "Plugin key must be lowercase ASCII with hyphens", 422);
  return key2;
}
function validateVersion(value) {
  const version = String(value).trim();
  assertDomain(/^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?$/.test(version), "INVALID_PLUGIN_VERSION", "Plugin release version must use semantic versioning", 422);
  return version;
}
function normalizeRoutePath(value) {
  const path = String(value).trim();
  assertDomain(/^\/[a-zA-Z0-9/_-]*$/.test(path) && !path.includes("//") && !path.includes("..") && path.length <= 160, "INVALID_PLUGIN_ROUTE_PATH", "Plugin route path is invalid", 422);
  return path || "/";
}
function normalizeAdminPath(value) {
  const path = normalizeRoutePath(value);
  assertDomain(path.startsWith("/plugins/"), "INVALID_PLUGIN_ADMIN_PATH", "Plugin admin page must be under /plugins/", 422);
  return path;
}
function normalizeHostPattern(value) {
  const host = String(value).trim().toLowerCase();
  assertDomain(/^(?:\*\.)?[a-z0-9](?:[a-z0-9.-]{0,251}[a-z0-9])?$/.test(host) && !host.includes("..") && !host.includes(":") && !host.includes("/"), "INVALID_PLUGIN_HOST", "Plugin network host is invalid", 422);
  return host;
}
function handlerName(value) {
  const name = String(value).trim();
  assertDomain(/^[a-zA-Z][a-zA-Z0-9_.-]{0,119}$/.test(name), "INVALID_PLUGIN_HANDLER", "Plugin handler name is invalid", 422);
  return name;
}
function manifestId(value) {
  const id = String(value).trim();
  assertDomain(/^[a-z][a-z0-9-]{0,62}$/.test(id), "INVALID_PLUGIN_MANIFEST_ID", "Plugin manifest id is invalid", 422);
  return id;
}
function storageKey(value) {
  const key2 = String(value).trim();
  assertDomain(/^[a-z][a-z0-9_-]{0,62}$/.test(key2), "INVALID_PLUGIN_STORAGE_KEY", "Plugin storage key is invalid", 422);
  return key2;
}
function requiredText(value, max) {
  const result = String(value).trim();
  assertDomain(result.length > 0 && result.length <= max, "INVALID_TEXT", "Required text is empty or too long", 422);
  return result;
}
function optionalText(value, max) {
  const result = String(value).trim();
  assertDomain(result.length <= max, "TEXT_TOO_LONG", "Text is too long", 422);
  return result;
}
function integerRange(value, min, max, name) {
  assertDomain(Number.isInteger(value) && value >= min && value <= max, "INVALID_PLUGIN_LIMIT", `${name} is outside the allowed range`, 422);
  return value;
}
function unique(values) {
  return [...new Set(values)];
}
function clone(value) {
  return value === void 0 ? null : structuredClone(value);
}
function safeHeaders(input) {
  const result = {};
  for (const [key2, value] of Object.entries(input)) {
    const name = key2.toLowerCase();
    if (["authorization", "cookie", "cf-access-jwt-assertion", "x-baser-principal-id"].includes(name))
      continue;
    if (/^[a-z0-9-]{1,64}$/.test(name) && String(value).length <= 2048)
      result[name] = String(value);
  }
  return result;
}
function safeResponseHeaders(input) {
  const result = {};
  for (const [key2, value] of Object.entries(input)) {
    const name = key2.toLowerCase();
    if (["set-cookie", "location", "content-security-policy", "access-control-allow-origin"].includes(name))
      continue;
    if (["content-type", "cache-control", "etag", "x-plugin-result"].includes(name) && String(value).length <= 2048)
      result[name] = String(value);
  }
  return result;
}
function validStatus(value) {
  return Number.isInteger(value) && value >= 200 && value <= 599 ? value : 200;
}
const SESSION_COOKIE = "baser_session";
const CSRF_COOKIE = "baser_csrf";
const CSRF_HEADER = "x-baser-csrf-token";
const STEP_UP_TTL_MS = 5 * 60 * 1e3;
const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1e3;
const StepUpOperations = {
  ThemeActivate: "theme.activate",
  PluginActivate: "plugin.activate",
  MailSubmissionReadSensitive: "mail-submission.read-sensitive",
  SessionRevokeAll: "session.revoke-all",
  ContentPublish: "content.publish",
  ContentUnpublish: "content.unpublish",
  CustomEntryPublish: "custom-entry.publish",
  CustomEntryUnpublish: "custom-entry.unpublish"
};
function requiredStepUpOperation(input) {
  if (input.action === StepUpOperations.ThemeActivate || input.capability === Capabilities.ThemeActivate) {
    return StepUpOperations.ThemeActivate;
  }
  if (input.action === StepUpOperations.PluginActivate || input.capability === Capabilities.PluginActivate) {
    return StepUpOperations.PluginActivate;
  }
  if (input.action === StepUpOperations.MailSubmissionReadSensitive || input.capability === Capabilities.MailSubmissionReadSensitive) {
    return StepUpOperations.MailSubmissionReadSensitive;
  }
  if (input.action === StepUpOperations.ContentPublish || input.capability === Capabilities.ContentPublish) {
    return StepUpOperations.ContentPublish;
  }
  if (input.action === StepUpOperations.ContentUnpublish || input.capability === Capabilities.ContentUnpublish) {
    return StepUpOperations.ContentUnpublish;
  }
  if (input.action === StepUpOperations.CustomEntryPublish || input.capability === Capabilities.CustomEntryPublish) {
    return StepUpOperations.CustomEntryPublish;
  }
  if (input.action === StepUpOperations.CustomEntryUnpublish || input.capability === Capabilities.CustomEntryUnpublish) {
    return StepUpOperations.CustomEntryUnpublish;
  }
  if (input.action === StepUpOperations.SessionRevokeAll) {
    return StepUpOperations.SessionRevokeAll;
  }
  if (input.risk === "critical" && input.capability === Capabilities.PluginActivate) {
    return StepUpOperations.PluginActivate;
  }
  return null;
}
class MemoryAuthStore {
  identities = /* @__PURE__ */ new Map();
  passkeys = /* @__PURE__ */ new Map();
  passkeysByCredentialId = /* @__PURE__ */ new Map();
  challenges = /* @__PURE__ */ new Map();
  sessions = /* @__PURE__ */ new Map();
  sessionsByToken = /* @__PURE__ */ new Map();
  stepUps = /* @__PURE__ */ new Map();
  async createIdentity(identity) {
    this.identities.set(identity.id, structuredClone(identity));
  }
  async getIdentity(id) {
    const value = this.identities.get(id);
    return value ? structuredClone(value) : null;
  }
  async getIdentityByLabel(workspaceId, principalId, label) {
    for (const identity of this.identities.values()) {
      if (identity.workspaceId === workspaceId && identity.principalId === principalId && identity.label === label) {
        return structuredClone(identity);
      }
    }
    return null;
  }
  async listIdentitiesForPrincipal(principalId) {
    return [...this.identities.values()].filter((entry) => entry.principalId === principalId).map((entry) => structuredClone(entry));
  }
  async createPasskey(credential) {
    assertDomain(!this.passkeysByCredentialId.has(credential.credentialId), "PASSKEY_EXISTS", "Passkey already registered", 409);
    this.passkeys.set(credential.id, structuredClone(credential));
    this.passkeysByCredentialId.set(credential.credentialId, credential.id);
  }
  async getPasskeyByCredentialId(credentialId) {
    const id = this.passkeysByCredentialId.get(credentialId);
    if (!id)
      return null;
    const value = this.passkeys.get(id);
    return value ? structuredClone(value) : null;
  }
  async listPasskeysForIdentity(identityId) {
    return [...this.passkeys.values()].filter((entry) => entry.identityId === identityId).map((entry) => structuredClone(entry));
  }
  async updatePasskeyCounter(id, counter, lastUsedAt) {
    const value = this.passkeys.get(id);
    assertDomain(value, "PASSKEY_NOT_FOUND", "Passkey not found", 404);
    value.counter = counter;
    value.lastUsedAt = lastUsedAt;
  }
  async createChallenge(record) {
    this.challenges.set(record.id, structuredClone(record));
  }
  async getChallenge(id) {
    const value = this.challenges.get(id);
    return value ? structuredClone(value) : null;
  }
  async deleteChallenge(id) {
    this.challenges.delete(id);
  }
  async createSession(session) {
    this.sessions.set(session.id, structuredClone(session));
    this.sessionsByToken.set(session.tokenHash, session.id);
  }
  async getSession(id) {
    const value = this.sessions.get(id);
    return value ? structuredClone(value) : null;
  }
  async getSessionByTokenHash(tokenHash) {
    const id = this.sessionsByToken.get(tokenHash);
    if (!id)
      return null;
    return this.getSession(id);
  }
  async updateSession(session) {
    const existing = this.sessions.get(session.id);
    assertDomain(existing, "SESSION_NOT_FOUND", "Session not found", 404);
    if (existing.tokenHash !== session.tokenHash) {
      this.sessionsByToken.delete(existing.tokenHash);
      this.sessionsByToken.set(session.tokenHash, session.id);
    }
    this.sessions.set(session.id, structuredClone(session));
  }
  async listSessionsForPrincipal(principalId) {
    return [...this.sessions.values()].filter((entry) => entry.principalId === principalId).map((entry) => structuredClone(entry));
  }
  async upsertStepUp(stepUp) {
    this.stepUps.set(`${stepUp.sessionId}:${stepUp.operation}`, structuredClone(stepUp));
  }
  async getStepUp(sessionId, operation, now) {
    const value = this.stepUps.get(`${sessionId}:${operation}`);
    if (!value || value.expiresAt <= now)
      return null;
    return structuredClone(value);
  }
  async deleteStepUpsForSession(sessionId) {
    for (const key2 of [...this.stepUps.keys()]) {
      if (key2.startsWith(`${sessionId}:`))
        this.stepUps.delete(key2);
    }
  }
}
const memoryAuthStore = new MemoryAuthStore();
async function hashSecret(value) {
  return sha256(value);
}
function randomToken(bytes = 32) {
  const buffer = new Uint8Array(bytes);
  crypto.getRandomValues(buffer);
  return base64UrlEncode(buffer);
}
function parseCookies(header) {
  const cookies = /* @__PURE__ */ new Map();
  if (!header)
    return cookies;
  for (const part of header.split(";")) {
    const [rawName, ...rest] = part.trim().split("=");
    if (!rawName || rest.length === 0)
      continue;
    cookies.set(rawName, decodeURIComponent(rest.join("=")));
  }
  return cookies;
}
function serializeCookie(name, value, options) {
  const segments = [`${name}=${encodeURIComponent(value)}`, `Path=${options.path ?? "/"}`, `Max-Age=${options.maxAgeSeconds}`];
  if (options.httpOnly)
    segments.push("HttpOnly");
  if (options.secure)
    segments.push("Secure");
  segments.push(`SameSite=${options.sameSite}`);
  return segments.join("; ");
}
function clearCookie(name) {
  return `${name}=; Path=/; Max-Age=0; HttpOnly; SameSite=Lax`;
}
const MUTATING = /* @__PURE__ */ new Set(["POST", "PUT", "PATCH", "DELETE"]);
async function assertCsrfForMutation(request, sessionCsrfHash) {
  if (!MUTATING.has(request.method))
    return;
  const cookies = parseCookies(request.headers.get("cookie"));
  const cookieToken = cookies.get(CSRF_COOKIE);
  const headerToken = request.headers.get(CSRF_HEADER);
  if (!cookieToken || !headerToken || cookieToken !== headerToken) {
    throw new DomainError("CSRF_VALIDATION_FAILED", "CSRF token is required for cookie-authenticated mutations", 403);
  }
  const headerHash = await hashSecret(headerToken);
  if (headerHash !== sessionCsrfHash) {
    throw new DomainError("CSRF_VALIDATION_FAILED", "CSRF token does not match the active session", 403);
  }
}
function assertCloudflareAccessBoundary(request, config) {
  if (!config.required)
    return;
  const jwt = request.headers.get("cf-access-jwt-assertion");
  if (!jwt) {
    throw new DomainError("ACCESS_JWT_REQUIRED", "Cloudflare Access JWT is required before CMS authentication", 403);
  }
  if (config.teamDomain && !request.headers.get("cf-access-authenticated-user-email")) {
    throw new DomainError("ACCESS_IDENTITY_MISSING", "Cloudflare Access identity headers are missing", 403);
  }
}
const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/", charsUrl = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_", genLookup = (target) => {
  const lookupTemp = typeof Uint8Array === "undefined" ? [] : new Uint8Array(256);
  const len = chars.length;
  for (let i = 0; i < len; i++) {
    lookupTemp[target.charCodeAt(i)] = i;
  }
  return lookupTemp;
}, lookup = genLookup(chars), lookupUrl = genLookup(charsUrl);
const base64UrlPattern = /^[-A-Za-z0-9\-_]*$/;
const base64Pattern = /^[-A-Za-z0-9+/]*={0,3}$/;
const base64 = {};
base64.toArrayBuffer = (data, urlMode) => {
  const len = data.length;
  let bufferLength = data.length * 0.75, i, p = 0, encoded1, encoded2, encoded3, encoded4;
  if (data[data.length - 1] === "=") {
    bufferLength--;
    if (data[data.length - 2] === "=") {
      bufferLength--;
    }
  }
  const arraybuffer = new ArrayBuffer(bufferLength), bytes = new Uint8Array(arraybuffer), target = urlMode ? lookupUrl : lookup;
  for (i = 0; i < len; i += 4) {
    encoded1 = target[data.charCodeAt(i)];
    encoded2 = target[data.charCodeAt(i + 1)];
    encoded3 = target[data.charCodeAt(i + 2)];
    encoded4 = target[data.charCodeAt(i + 3)];
    bytes[p++] = encoded1 << 2 | encoded2 >> 4;
    bytes[p++] = (encoded2 & 15) << 4 | encoded3 >> 2;
    bytes[p++] = (encoded3 & 3) << 6 | encoded4 & 63;
  }
  return arraybuffer;
};
base64.fromArrayBuffer = (arrBuf, urlMode) => {
  const bytes = new Uint8Array(arrBuf);
  let i, result = "";
  const len = bytes.length, target = urlMode ? charsUrl : chars;
  for (i = 0; i < len; i += 3) {
    result += target[bytes[i] >> 2];
    result += target[(bytes[i] & 3) << 4 | bytes[i + 1] >> 4];
    result += target[(bytes[i + 1] & 15) << 2 | bytes[i + 2] >> 6];
    result += target[bytes[i + 2] & 63];
  }
  const remainder = len % 3;
  if (remainder === 2) {
    result = result.substring(0, result.length - 1) + (urlMode ? "" : "=");
  } else if (remainder === 1) {
    result = result.substring(0, result.length - 2) + (urlMode ? "" : "==");
  }
  return result;
};
base64.toString = (str, urlMode) => {
  return new TextDecoder().decode(base64.toArrayBuffer(str, urlMode));
};
base64.fromString = (str, urlMode) => {
  return base64.fromArrayBuffer(new TextEncoder().encode(str), urlMode);
};
base64.validate = (encoded, urlMode) => {
  if (!(typeof encoded === "string" || encoded instanceof String)) {
    return false;
  }
  try {
    return urlMode ? base64UrlPattern.test(encoded) : base64Pattern.test(encoded);
  } catch (_e) {
    return false;
  }
};
base64.base64 = base64;
function toBuffer(base64urlString, from = "base64url") {
  const _buffer = base64.toArrayBuffer(base64urlString, from === "base64url");
  return new Uint8Array(_buffer);
}
function fromBuffer(buffer, to = "base64url") {
  const _normalized = new Uint8Array(buffer);
  return base64.fromArrayBuffer(_normalized.buffer, to === "base64url");
}
function toBase64(base64urlString) {
  const fromBase64Url = base64.toArrayBuffer(base64urlString, true);
  const toBase642 = base64.fromArrayBuffer(fromBase64Url);
  return toBase642;
}
function toUTF8String$1(base64urlString) {
  return base64.toString(base64urlString, true);
}
function isBase64(input) {
  return base64.validate(input, false);
}
function isBase64URL(input) {
  input = trimPadding(input);
  return base64.validate(input, true);
}
function trimPadding(input) {
  return input.replace(/=/g, "");
}
function decodeLength(data, argument, index2) {
  if (argument < 24) {
    return [argument, 1];
  }
  const remainingDataLength = data.byteLength - index2 - 1;
  const view = new DataView(data.buffer, index2 + 1);
  let output;
  let bytes = 0;
  switch (argument) {
    case 24: {
      if (remainingDataLength > 0) {
        output = view.getUint8(0);
        bytes = 2;
      }
      break;
    }
    case 25: {
      if (remainingDataLength > 1) {
        output = view.getUint16(0, false);
        bytes = 3;
      }
      break;
    }
    case 26: {
      if (remainingDataLength > 3) {
        output = view.getUint32(0, false);
        bytes = 5;
      }
      break;
    }
    case 27: {
      if (remainingDataLength > 7) {
        const bigOutput = view.getBigUint64(0, false);
        if (bigOutput >= 24n && bigOutput <= Number.MAX_SAFE_INTEGER) {
          return [Number(bigOutput), 9];
        }
      }
      break;
    }
  }
  if (output && output >= 24) {
    return [output, bytes];
  }
  throw new Error("Length not supported or not well formed");
}
const MAJOR_TYPE_UNSIGNED_INTEGER = 0;
const MAJOR_TYPE_NEGATIVE_INTEGER = 1;
const MAJOR_TYPE_BYTE_STRING = 2;
const MAJOR_TYPE_TEXT_STRING = 3;
const MAJOR_TYPE_ARRAY = 4;
const MAJOR_TYPE_MAP = 5;
const MAJOR_TYPE_TAG = 6;
const MAJOR_TYPE_SIMPLE_OR_FLOAT = 7;
function encodeLength(major, argument) {
  const majorEncoded = major << 5;
  if (argument < 0) {
    throw new Error("CBOR Data Item argument must not be negative");
  }
  let bigintArgument;
  if (typeof argument == "number") {
    if (!Number.isInteger(argument)) {
      throw new Error("CBOR Data Item argument must be an integer");
    }
    bigintArgument = BigInt(argument);
  } else {
    bigintArgument = argument;
  }
  if (major == MAJOR_TYPE_NEGATIVE_INTEGER) {
    if (bigintArgument == 0n) {
      throw new Error("CBOR Data Item argument cannot be zero when negative");
    }
    bigintArgument = bigintArgument - 1n;
  }
  if (bigintArgument > 18446744073709551615n) {
    throw new Error("CBOR number out of range");
  }
  const buffer = new Uint8Array(8);
  const view = new DataView(buffer.buffer);
  view.setBigUint64(0, bigintArgument, false);
  if (bigintArgument <= 23) {
    return [majorEncoded | buffer[7]];
  } else if (bigintArgument <= 255) {
    return [majorEncoded | 24, buffer[7]];
  } else if (bigintArgument <= 65535) {
    return [majorEncoded | 25, ...buffer.slice(6)];
  } else if (bigintArgument <= 4294967295) {
    return [
      majorEncoded | 26,
      ...buffer.slice(4)
    ];
  } else {
    return [
      majorEncoded | 27,
      ...buffer
    ];
  }
}
class CBORTag {
  /**
   * Wrap a value with a tag number.
   * When encoded, this tag will be attached to the value.
   *
   * @param tag Tag number
   * @param value Wrapped value
   */
  constructor(tag, value) {
    Object.defineProperty(this, "tagId", {
      enumerable: true,
      configurable: true,
      writable: true,
      value: void 0
    });
    Object.defineProperty(this, "tagValue", {
      enumerable: true,
      configurable: true,
      writable: true,
      value: void 0
    });
    this.tagId = tag;
    this.tagValue = value;
  }
  /**
   * Read the tag number
   */
  get tag() {
    return this.tagId;
  }
  /**
   * Read the value
   */
  get value() {
    return this.tagValue;
  }
}
function decodeUnsignedInteger(data, argument, index2) {
  return decodeLength(data, argument, index2);
}
function decodeNegativeInteger(data, argument, index2) {
  const [value, length] = decodeUnsignedInteger(data, argument, index2);
  return [-value - 1, length];
}
function decodeByteString(data, argument, index2) {
  const [lengthValue, lengthConsumed] = decodeLength(data, argument, index2);
  const dataStartIndex = index2 + lengthConsumed;
  return [
    new Uint8Array(data.buffer.slice(dataStartIndex, dataStartIndex + lengthValue)),
    lengthConsumed + lengthValue
  ];
}
const TEXT_DECODER = new TextDecoder();
function decodeString(data, argument, index2) {
  const [value, length] = decodeByteString(data, argument, index2);
  return [TEXT_DECODER.decode(value), length];
}
function decodeArray(data, argument, index2) {
  if (argument === 0) {
    return [[], 1];
  }
  const [length, lengthConsumed] = decodeLength(data, argument, index2);
  let consumedLength = lengthConsumed;
  const value = [];
  for (let i = 0; i < length; i++) {
    const remainingDataLength = data.byteLength - index2 - consumedLength;
    if (remainingDataLength <= 0) {
      throw new Error("array is not supported or well formed");
    }
    const [decodedValue, consumed] = decodeNext(data, index2 + consumedLength);
    value.push(decodedValue);
    consumedLength += consumed;
  }
  return [value, consumedLength];
}
const MAP_ERROR = "Map is not supported or well formed";
function decodeMap(data, argument, index2) {
  if (argument === 0) {
    return [/* @__PURE__ */ new Map(), 1];
  }
  const [length, lengthConsumed] = decodeLength(data, argument, index2);
  let consumedLength = lengthConsumed;
  const result = /* @__PURE__ */ new Map();
  for (let i = 0; i < length; i++) {
    let remainingDataLength = data.byteLength - index2 - consumedLength;
    if (remainingDataLength <= 0) {
      throw new Error(MAP_ERROR);
    }
    const [key2, keyConsumed] = decodeNext(data, index2 + consumedLength);
    consumedLength += keyConsumed;
    remainingDataLength -= keyConsumed;
    if (remainingDataLength <= 0) {
      throw new Error(MAP_ERROR);
    }
    if (typeof key2 !== "string" && typeof key2 !== "number") {
      throw new Error(MAP_ERROR);
    }
    if (result.has(key2)) {
      throw new Error(MAP_ERROR);
    }
    const [value, valueConsumed] = decodeNext(data, index2 + consumedLength);
    consumedLength += valueConsumed;
    result.set(key2, value);
  }
  return [result, consumedLength];
}
function decodeFloat16(data, index2) {
  if (index2 + 3 > data.byteLength) {
    throw new Error("CBOR stream ended before end of Float 16");
  }
  const result = data.getUint16(index2 + 1, false);
  if (result == 31744) {
    return [Infinity, 3];
  } else if (result == 32256) {
    return [NaN, 3];
  } else if (result == 64512) {
    return [-Infinity, 3];
  }
  throw new Error("Float16 data is unsupported");
}
function decodeFloat32(data, index2) {
  if (index2 + 5 > data.byteLength) {
    throw new Error("CBOR stream ended before end of Float 32");
  }
  const result = data.getFloat32(index2 + 1, false);
  return [result, 5];
}
function decodeFloat64(data, index2) {
  if (index2 + 9 > data.byteLength) {
    throw new Error("CBOR stream ended before end of Float 64");
  }
  const result = data.getFloat64(index2 + 1, false);
  return [result, 9];
}
function decodeTag(data, argument, index2) {
  const [tag, tagBytes] = decodeLength(data, argument, index2);
  const [value, valueBytes] = decodeNext(data, index2 + tagBytes);
  return [new CBORTag(tag, value), tagBytes + valueBytes];
}
function decodeNext(data, index2) {
  if (index2 >= data.byteLength) {
    throw new Error("CBOR stream ended before tag value");
  }
  const byte = data.getUint8(index2);
  const majorType = byte >> 5;
  const argument = byte & 31;
  switch (majorType) {
    case MAJOR_TYPE_UNSIGNED_INTEGER: {
      return decodeUnsignedInteger(data, argument, index2);
    }
    case MAJOR_TYPE_NEGATIVE_INTEGER: {
      return decodeNegativeInteger(data, argument, index2);
    }
    case MAJOR_TYPE_BYTE_STRING: {
      return decodeByteString(data, argument, index2);
    }
    case MAJOR_TYPE_TEXT_STRING: {
      return decodeString(data, argument, index2);
    }
    case MAJOR_TYPE_ARRAY: {
      return decodeArray(data, argument, index2);
    }
    case MAJOR_TYPE_MAP: {
      return decodeMap(data, argument, index2);
    }
    case MAJOR_TYPE_TAG: {
      return decodeTag(data, argument, index2);
    }
    case MAJOR_TYPE_SIMPLE_OR_FLOAT: {
      switch (argument) {
        case 20:
          return [false, 1];
        case 21:
          return [true, 1];
        case 22:
          return [null, 1];
        case 23:
          return [void 0, 1];
        // 24: Simple value (value 32..255 in following byte)
        case 25:
          return decodeFloat16(data, index2);
        case 26:
          return decodeFloat32(data, index2);
        case 27:
          return decodeFloat64(data, index2);
      }
    }
  }
  throw new Error(`Unsupported or not well formed at ${index2}`);
}
function encodeSimple(data) {
  if (data === true) {
    return 245;
  } else if (data === false) {
    return 244;
  } else if (data === null) {
    return 246;
  }
  return 247;
}
function encodeFloat(data) {
  if (Math.fround(data) == data || !Number.isFinite(data) || Number.isNaN(data)) {
    const output = new Uint8Array(5);
    output[0] = 250;
    const view = new DataView(output.buffer);
    view.setFloat32(1, data, false);
    return output;
  } else {
    const output = new Uint8Array(9);
    output[0] = 251;
    const view = new DataView(output.buffer);
    view.setFloat64(1, data, false);
    return output;
  }
}
function encodeNumber(data) {
  if (typeof data == "number") {
    if (Number.isSafeInteger(data)) {
      if (data < 0) {
        return encodeLength(MAJOR_TYPE_NEGATIVE_INTEGER, Math.abs(data));
      } else {
        return encodeLength(MAJOR_TYPE_UNSIGNED_INTEGER, data);
      }
    }
    return [encodeFloat(data)];
  } else {
    if (data < 0n) {
      return encodeLength(MAJOR_TYPE_NEGATIVE_INTEGER, data * -1n);
    } else {
      return encodeLength(MAJOR_TYPE_UNSIGNED_INTEGER, data);
    }
  }
}
const ENCODER = new TextEncoder();
function encodeString(data, output) {
  output.push(...encodeLength(MAJOR_TYPE_TEXT_STRING, data.length));
  output.push(ENCODER.encode(data));
}
function encodeBytes(data, output) {
  output.push(...encodeLength(MAJOR_TYPE_BYTE_STRING, data.length));
  output.push(data);
}
function encodeArray(data, output) {
  output.push(...encodeLength(MAJOR_TYPE_ARRAY, data.length));
  for (const element of data) {
    encodePartialCBOR(element, output);
  }
}
function encodeMap(data, output) {
  output.push(new Uint8Array(encodeLength(MAJOR_TYPE_MAP, data.size)));
  for (const [key2, value] of data.entries()) {
    encodePartialCBOR(key2, output);
    encodePartialCBOR(value, output);
  }
}
function encodeTag(tag, output) {
  output.push(...encodeLength(MAJOR_TYPE_TAG, tag.tag));
  encodePartialCBOR(tag.value, output);
}
function encodePartialCBOR(data, output) {
  if (typeof data == "boolean" || data === null || data == void 0) {
    output.push(encodeSimple(data));
    return;
  }
  if (typeof data == "number" || typeof data == "bigint") {
    output.push(...encodeNumber(data));
    return;
  }
  if (typeof data == "string") {
    encodeString(data, output);
    return;
  }
  if (data instanceof Uint8Array) {
    encodeBytes(data, output);
    return;
  }
  if (Array.isArray(data)) {
    encodeArray(data, output);
    return;
  }
  if (data instanceof Map) {
    encodeMap(data, output);
    return;
  }
  if (data instanceof CBORTag) {
    encodeTag(data, output);
    return;
  }
  throw new Error("Not implemented");
}
function decodePartialCBOR(data, index2) {
  if (data.byteLength === 0 || data.byteLength <= index2 || index2 < 0) {
    throw new Error("No data");
  }
  if (data instanceof Uint8Array) {
    return decodeNext(new DataView(data.buffer), index2);
  } else if (data instanceof ArrayBuffer) {
    return decodeNext(new DataView(data), index2);
  }
  return decodeNext(data, index2);
}
function encodeCBOR(data) {
  const results = [];
  encodePartialCBOR(data, results);
  let length = 0;
  for (const result of results) {
    if (typeof result == "number") {
      length += 1;
    } else {
      length += result.length;
    }
  }
  const output = new Uint8Array(length);
  let index2 = 0;
  for (const result of results) {
    if (typeof result == "number") {
      output[index2] = result;
      index2 += 1;
    } else {
      output.set(result, index2);
      index2 += result.length;
    }
  }
  return output;
}
function decodeFirst(input) {
  const _input = new Uint8Array(input);
  const decoded = decodePartialCBOR(_input, 0);
  const [first] = decoded;
  return first;
}
function encode$1(input) {
  return encodeCBOR(input);
}
function isCOSEPublicKeyOKP(cosePublicKey) {
  const kty = cosePublicKey.get(COSEKEYS.kty);
  return isCOSEKty(kty) && kty === COSEKTY.OKP;
}
function isCOSEPublicKeyEC2(cosePublicKey) {
  const kty = cosePublicKey.get(COSEKEYS.kty);
  return isCOSEKty(kty) && kty === COSEKTY.EC2;
}
function isCOSEPublicKeyRSA(cosePublicKey) {
  const kty = cosePublicKey.get(COSEKEYS.kty);
  return isCOSEKty(kty) && kty === COSEKTY.RSA;
}
var COSEKEYS;
(function(COSEKEYS2) {
  COSEKEYS2[COSEKEYS2["kty"] = 1] = "kty";
  COSEKEYS2[COSEKEYS2["alg"] = 3] = "alg";
  COSEKEYS2[COSEKEYS2["crv"] = -1] = "crv";
  COSEKEYS2[COSEKEYS2["x"] = -2] = "x";
  COSEKEYS2[COSEKEYS2["y"] = -3] = "y";
  COSEKEYS2[COSEKEYS2["n"] = -1] = "n";
  COSEKEYS2[COSEKEYS2["e"] = -2] = "e";
})(COSEKEYS || (COSEKEYS = {}));
var COSEKTY;
(function(COSEKTY2) {
  COSEKTY2[COSEKTY2["OKP"] = 1] = "OKP";
  COSEKTY2[COSEKTY2["EC2"] = 2] = "EC2";
  COSEKTY2[COSEKTY2["RSA"] = 3] = "RSA";
})(COSEKTY || (COSEKTY = {}));
function isCOSEKty(kty) {
  return Object.values(COSEKTY).indexOf(kty) >= 0;
}
var COSECRV;
(function(COSECRV2) {
  COSECRV2[COSECRV2["P256"] = 1] = "P256";
  COSECRV2[COSECRV2["P384"] = 2] = "P384";
  COSECRV2[COSECRV2["P521"] = 3] = "P521";
  COSECRV2[COSECRV2["ED25519"] = 6] = "ED25519";
  COSECRV2[COSECRV2["SECP256K1"] = 8] = "SECP256K1";
})(COSECRV || (COSECRV = {}));
function isCOSECrv(crv) {
  return Object.values(COSECRV).indexOf(crv) >= 0;
}
var COSEALG;
(function(COSEALG2) {
  COSEALG2[COSEALG2["ES256"] = -7] = "ES256";
  COSEALG2[COSEALG2["EdDSA"] = -8] = "EdDSA";
  COSEALG2[COSEALG2["ES384"] = -35] = "ES384";
  COSEALG2[COSEALG2["ES512"] = -36] = "ES512";
  COSEALG2[COSEALG2["PS256"] = -37] = "PS256";
  COSEALG2[COSEALG2["PS384"] = -38] = "PS384";
  COSEALG2[COSEALG2["PS512"] = -39] = "PS512";
  COSEALG2[COSEALG2["ES256K"] = -47] = "ES256K";
  COSEALG2[COSEALG2["RS256"] = -257] = "RS256";
  COSEALG2[COSEALG2["RS384"] = -258] = "RS384";
  COSEALG2[COSEALG2["RS512"] = -259] = "RS512";
  COSEALG2[COSEALG2["RS1"] = -65535] = "RS1";
})(COSEALG || (COSEALG = {}));
function isCOSEAlg(alg) {
  return Object.values(COSEALG).indexOf(alg) >= 0;
}
function mapCoseAlgToWebCryptoAlg(alg) {
  if ([COSEALG.RS1].indexOf(alg) >= 0) {
    return "SHA-1";
  } else if ([COSEALG.ES256, COSEALG.PS256, COSEALG.RS256].indexOf(alg) >= 0) {
    return "SHA-256";
  } else if ([COSEALG.ES384, COSEALG.PS384, COSEALG.RS384].indexOf(alg) >= 0) {
    return "SHA-384";
  } else if ([COSEALG.ES512, COSEALG.PS512, COSEALG.RS512, COSEALG.EdDSA].indexOf(alg) >= 0) {
    return "SHA-512";
  }
  throw new Error(`Could not map COSE alg value of ${alg} to a WebCrypto alg`);
}
let webCrypto = void 0;
function getWebCrypto() {
  const toResolve = new Promise((resolve, reject) => {
    if (webCrypto) {
      return resolve(webCrypto);
    }
    const _globalThisCrypto = _getWebCryptoInternals.stubThisGlobalThisCrypto();
    if (_globalThisCrypto) {
      webCrypto = _globalThisCrypto;
      return resolve(webCrypto);
    }
    return reject(new MissingWebCrypto());
  });
  return toResolve;
}
class MissingWebCrypto extends Error {
  constructor() {
    const message = "An instance of the Crypto API could not be located";
    super(message);
    this.name = "MissingWebCrypto";
  }
}
const _getWebCryptoInternals = {
  stubThisGlobalThisCrypto: () => globalThis.crypto,
  // Make it possible to reset the `webCrypto` at the top of the file
  setCachedCrypto: (newCrypto) => {
    webCrypto = newCrypto;
  }
};
async function digest(data, algorithm) {
  const WebCrypto = await getWebCrypto();
  const subtleAlgorithm = mapCoseAlgToWebCryptoAlg(algorithm);
  const hashed = await WebCrypto.subtle.digest(subtleAlgorithm, data);
  return new Uint8Array(hashed);
}
async function getRandomValues(array) {
  const WebCrypto = await getWebCrypto();
  WebCrypto.getRandomValues(array);
  return array;
}
async function importKey(opts) {
  const WebCrypto = await getWebCrypto();
  const { keyData, algorithm } = opts;
  return WebCrypto.subtle.importKey("jwk", keyData, algorithm, false, [
    "verify"
  ]);
}
async function verifyEC2(opts) {
  const { cosePublicKey, signature, data, shaHashOverride } = opts;
  const WebCrypto = await getWebCrypto();
  const alg = cosePublicKey.get(COSEKEYS.alg);
  const crv = cosePublicKey.get(COSEKEYS.crv);
  const x = cosePublicKey.get(COSEKEYS.x);
  const y = cosePublicKey.get(COSEKEYS.y);
  if (!alg) {
    throw new Error("Public key was missing alg (EC2)");
  }
  if (!crv) {
    throw new Error("Public key was missing crv (EC2)");
  }
  if (!x) {
    throw new Error("Public key was missing x (EC2)");
  }
  if (!y) {
    throw new Error("Public key was missing y (EC2)");
  }
  let _crv;
  if (crv === COSECRV.P256) {
    _crv = "P-256";
  } else if (crv === COSECRV.P384) {
    _crv = "P-384";
  } else if (crv === COSECRV.P521) {
    _crv = "P-521";
  } else {
    throw new Error(`Unexpected COSE crv value of ${crv} (EC2)`);
  }
  const keyData = {
    kty: "EC",
    crv: _crv,
    x: fromBuffer(x),
    y: fromBuffer(y),
    ext: false
  };
  const keyAlgorithm = {
    /**
     * Note to future self: you can't use `mapCoseAlgToWebCryptoKeyAlgName()` here because some
     * leaf certs from actual devices specified an RSA SHA value for `alg` (e.g. `-257`) which
     * would then map here to `'RSASSA-PKCS1-v1_5'`. We always want `'ECDSA'` here so we'll
     * hard-code this.
     */
    name: "ECDSA",
    namedCurve: _crv
  };
  const key2 = await importKey({
    keyData,
    algorithm: keyAlgorithm
  });
  let subtleAlg = mapCoseAlgToWebCryptoAlg(alg);
  if (shaHashOverride) {
    subtleAlg = mapCoseAlgToWebCryptoAlg(shaHashOverride);
  }
  const verifyAlgorithm = {
    name: "ECDSA",
    hash: { name: subtleAlg }
  };
  return WebCrypto.subtle.verify(verifyAlgorithm, key2, signature, data);
}
function mapCoseAlgToWebCryptoKeyAlgName(alg) {
  if ([COSEALG.EdDSA].indexOf(alg) >= 0) {
    return "Ed25519";
  } else if ([COSEALG.ES256, COSEALG.ES384, COSEALG.ES512, COSEALG.ES256K].indexOf(alg) >= 0) {
    return "ECDSA";
  } else if ([COSEALG.RS256, COSEALG.RS384, COSEALG.RS512, COSEALG.RS1].indexOf(alg) >= 0) {
    return "RSASSA-PKCS1-v1_5";
  } else if ([COSEALG.PS256, COSEALG.PS384, COSEALG.PS512].indexOf(alg) >= 0) {
    return "RSA-PSS";
  }
  throw new Error(`Could not map COSE alg value of ${alg} to a WebCrypto key alg name`);
}
async function verifyRSA(opts) {
  const { cosePublicKey, signature, data, shaHashOverride } = opts;
  const WebCrypto = await getWebCrypto();
  const alg = cosePublicKey.get(COSEKEYS.alg);
  const n = cosePublicKey.get(COSEKEYS.n);
  const e = cosePublicKey.get(COSEKEYS.e);
  if (!alg) {
    throw new Error("Public key was missing alg (RSA)");
  }
  if (!isCOSEAlg(alg)) {
    throw new Error(`Public key had invalid alg ${alg} (RSA)`);
  }
  if (!n) {
    throw new Error("Public key was missing n (RSA)");
  }
  if (!e) {
    throw new Error("Public key was missing e (RSA)");
  }
  const keyData = {
    kty: "RSA",
    alg: "",
    n: fromBuffer(n),
    e: fromBuffer(e),
    ext: false
  };
  const keyAlgorithm = {
    name: mapCoseAlgToWebCryptoKeyAlgName(alg),
    hash: { name: mapCoseAlgToWebCryptoAlg(alg) }
  };
  const verifyAlgorithm = {
    name: mapCoseAlgToWebCryptoKeyAlgName(alg)
  };
  if (shaHashOverride) {
    keyAlgorithm.hash.name = mapCoseAlgToWebCryptoAlg(shaHashOverride);
  }
  if (keyAlgorithm.name === "RSASSA-PKCS1-v1_5") {
    if (keyAlgorithm.hash.name === "SHA-256") {
      keyData.alg = "RS256";
    } else if (keyAlgorithm.hash.name === "SHA-384") {
      keyData.alg = "RS384";
    } else if (keyAlgorithm.hash.name === "SHA-512") {
      keyData.alg = "RS512";
    } else if (keyAlgorithm.hash.name === "SHA-1") {
      keyData.alg = "RS1";
    }
  } else if (keyAlgorithm.name === "RSA-PSS") {
    let saltLength = 0;
    if (keyAlgorithm.hash.name === "SHA-256") {
      keyData.alg = "PS256";
      saltLength = 32;
    } else if (keyAlgorithm.hash.name === "SHA-384") {
      keyData.alg = "PS384";
      saltLength = 48;
    } else if (keyAlgorithm.hash.name === "SHA-512") {
      keyData.alg = "PS512";
      saltLength = 64;
    }
    verifyAlgorithm.saltLength = saltLength;
  } else {
    throw new Error(`Unexpected RSA key algorithm ${alg} (${keyAlgorithm.name})`);
  }
  const key2 = await importKey({
    keyData,
    algorithm: keyAlgorithm
  });
  return WebCrypto.subtle.verify(verifyAlgorithm, key2, signature, data);
}
function convertAAGUIDToString(aaguid) {
  const hex = toHex(aaguid);
  const segments = [
    hex.slice(0, 8),
    // 8
    hex.slice(8, 12),
    // 4
    hex.slice(12, 16),
    // 4
    hex.slice(16, 20),
    // 4
    hex.slice(20, 32)
    // 8
  ];
  return segments.join("-");
}
function convertCertBufferToPEM(certBuffer) {
  let b64cert;
  if (typeof certBuffer === "string") {
    if (isBase64URL(certBuffer)) {
      b64cert = toBase64(certBuffer);
    } else if (isBase64(certBuffer)) {
      b64cert = certBuffer;
    } else {
      throw new Error("Certificate is not a valid base64 or base64url string");
    }
  } else {
    b64cert = fromBuffer(certBuffer, "base64");
  }
  let PEMKey = "";
  for (let i = 0; i < Math.ceil(b64cert.length / 64); i += 1) {
    const start = 64 * i;
    PEMKey += `${b64cert.substr(start, 64)}
`;
  }
  PEMKey = `-----BEGIN CERTIFICATE-----
${PEMKey}-----END CERTIFICATE-----
`;
  return PEMKey;
}
function convertCOSEtoPKCS(cosePublicKey) {
  const struct = decodeFirst(cosePublicKey);
  const tag = Uint8Array.from([4]);
  const x = struct.get(COSEKEYS.x);
  const y = struct.get(COSEKEYS.y);
  if (!x) {
    throw new Error("COSE public key was missing x");
  }
  if (y) {
    return concat([tag, x, y]);
  }
  return concat([tag, x]);
}
function decodeAttestationObject(attestationObject) {
  return _decodeAttestationObjectInternals.stubThis(decodeFirst(attestationObject));
}
const _decodeAttestationObjectInternals = {
  stubThis: (value) => value
};
function decodeClientDataJSON(data) {
  const toString = toUTF8String$1(data);
  const clientData = JSON.parse(toString);
  return _decodeClientDataJSONInternals.stubThis(clientData);
}
const _decodeClientDataJSONInternals = {
  stubThis: (value) => value
};
function decodeCredentialPublicKey(publicKey) {
  return _decodeCredentialPublicKeyInternals.stubThis(decodeFirst(publicKey));
}
const _decodeCredentialPublicKeyInternals = {
  stubThis: (value) => value
};
async function generateUserID() {
  const newUserID = new Uint8Array(32);
  await getRandomValues(newUserID);
  return _generateUserIDInternals.stubThis(newUserID);
}
const _generateUserIDInternals = {
  stubThis: (value) => value
};
/*!
 * MIT License
 * 
 * Copyright (c) 2017-2024 Peculiar Ventures, LLC
 * 
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 * 
 * The above copyright notice and this permission notice shall be included in all
 * copies or substantial portions of the Software.
 * 
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
 * SOFTWARE.
 * 
 */
const ARRAY_BUFFER_NAME = "[object ArrayBuffer]";
class BufferSourceConverter {
  static isArrayBuffer(data) {
    return Object.prototype.toString.call(data) === ARRAY_BUFFER_NAME;
  }
  static toArrayBuffer(data) {
    if (this.isArrayBuffer(data)) {
      return data;
    }
    if (data.byteLength === data.buffer.byteLength) {
      return data.buffer;
    }
    if (data.byteOffset === 0 && data.byteLength === data.buffer.byteLength) {
      return data.buffer;
    }
    return this.toUint8Array(data.buffer).slice(data.byteOffset, data.byteOffset + data.byteLength).buffer;
  }
  static toUint8Array(data) {
    return this.toView(data, Uint8Array);
  }
  static toView(data, type) {
    if (data.constructor === type) {
      return data;
    }
    if (this.isArrayBuffer(data)) {
      return new type(data);
    }
    if (this.isArrayBufferView(data)) {
      return new type(data.buffer, data.byteOffset, data.byteLength);
    }
    throw new TypeError("The provided value is not of type '(ArrayBuffer or ArrayBufferView)'");
  }
  static isBufferSource(data) {
    return this.isArrayBufferView(data) || this.isArrayBuffer(data);
  }
  static isArrayBufferView(data) {
    return ArrayBuffer.isView(data) || data && this.isArrayBuffer(data.buffer);
  }
  static isEqual(a, b) {
    const aView = BufferSourceConverter.toUint8Array(a);
    const bView = BufferSourceConverter.toUint8Array(b);
    if (aView.length !== bView.byteLength) {
      return false;
    }
    for (let i = 0; i < aView.length; i++) {
      if (aView[i] !== bView[i]) {
        return false;
      }
    }
    return true;
  }
  static concat(...args) {
    let buffers;
    if (Array.isArray(args[0]) && !(args[1] instanceof Function)) {
      buffers = args[0];
    } else if (Array.isArray(args[0]) && args[1] instanceof Function) {
      buffers = args[0];
    } else {
      if (args[args.length - 1] instanceof Function) {
        buffers = args.slice(0, args.length - 1);
      } else {
        buffers = args;
      }
    }
    let size = 0;
    for (const buffer of buffers) {
      size += buffer.byteLength;
    }
    const res = new Uint8Array(size);
    let offset = 0;
    for (const buffer of buffers) {
      const view = this.toUint8Array(buffer);
      res.set(view, offset);
      offset += view.length;
    }
    if (args[args.length - 1] instanceof Function) {
      return this.toView(res, args[args.length - 1]);
    }
    return res.buffer;
  }
}
const STRING_TYPE = "string";
const HEX_REGEX = /^[0-9a-f\s]+$/i;
const BASE64_REGEX = /^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/;
const BASE64URL_REGEX = /^[a-zA-Z0-9-_]+$/;
class Utf8Converter {
  static fromString(text) {
    const s = unescape(encodeURIComponent(text));
    const uintArray = new Uint8Array(s.length);
    for (let i = 0; i < s.length; i++) {
      uintArray[i] = s.charCodeAt(i);
    }
    return uintArray.buffer;
  }
  static toString(buffer) {
    const buf = BufferSourceConverter.toUint8Array(buffer);
    let encodedString = "";
    for (let i = 0; i < buf.length; i++) {
      encodedString += String.fromCharCode(buf[i]);
    }
    const decodedString = decodeURIComponent(escape(encodedString));
    return decodedString;
  }
}
class Utf16Converter {
  static toString(buffer, littleEndian = false) {
    const arrayBuffer = BufferSourceConverter.toArrayBuffer(buffer);
    const dataView = new DataView(arrayBuffer);
    let res = "";
    for (let i = 0; i < arrayBuffer.byteLength; i += 2) {
      const code = dataView.getUint16(i, littleEndian);
      res += String.fromCharCode(code);
    }
    return res;
  }
  static fromString(text, littleEndian = false) {
    const res = new ArrayBuffer(text.length * 2);
    const dataView = new DataView(res);
    for (let i = 0; i < text.length; i++) {
      dataView.setUint16(i * 2, text.charCodeAt(i), littleEndian);
    }
    return res;
  }
}
class Convert {
  static isHex(data) {
    return typeof data === STRING_TYPE && HEX_REGEX.test(data);
  }
  static isBase64(data) {
    return typeof data === STRING_TYPE && BASE64_REGEX.test(data);
  }
  static isBase64Url(data) {
    return typeof data === STRING_TYPE && BASE64URL_REGEX.test(data);
  }
  static ToString(buffer, enc = "utf8") {
    const buf = BufferSourceConverter.toUint8Array(buffer);
    switch (enc.toLowerCase()) {
      case "utf8":
        return this.ToUtf8String(buf);
      case "binary":
        return this.ToBinary(buf);
      case "hex":
        return this.ToHex(buf);
      case "base64":
        return this.ToBase64(buf);
      case "base64url":
        return this.ToBase64Url(buf);
      case "utf16le":
        return Utf16Converter.toString(buf, true);
      case "utf16":
      case "utf16be":
        return Utf16Converter.toString(buf);
      default:
        throw new Error(`Unknown type of encoding '${enc}'`);
    }
  }
  static FromString(str, enc = "utf8") {
    if (!str) {
      return new ArrayBuffer(0);
    }
    switch (enc.toLowerCase()) {
      case "utf8":
        return this.FromUtf8String(str);
      case "binary":
        return this.FromBinary(str);
      case "hex":
        return this.FromHex(str);
      case "base64":
        return this.FromBase64(str);
      case "base64url":
        return this.FromBase64Url(str);
      case "utf16le":
        return Utf16Converter.fromString(str, true);
      case "utf16":
      case "utf16be":
        return Utf16Converter.fromString(str);
      default:
        throw new Error(`Unknown type of encoding '${enc}'`);
    }
  }
  static ToBase64(buffer) {
    const buf = BufferSourceConverter.toUint8Array(buffer);
    if (typeof btoa !== "undefined") {
      const binary = this.ToString(buf, "binary");
      return btoa(binary);
    } else {
      return Buffer.from(buf).toString("base64");
    }
  }
  static FromBase64(base642) {
    const formatted = this.formatString(base642);
    if (!formatted) {
      return new ArrayBuffer(0);
    }
    if (!Convert.isBase64(formatted)) {
      throw new TypeError("Argument 'base64Text' is not Base64 encoded");
    }
    if (typeof atob !== "undefined") {
      return this.FromBinary(atob(formatted));
    } else {
      return new Uint8Array(Buffer.from(formatted, "base64")).buffer;
    }
  }
  static FromBase64Url(base64url) {
    const formatted = this.formatString(base64url);
    if (!formatted) {
      return new ArrayBuffer(0);
    }
    if (!Convert.isBase64Url(formatted)) {
      throw new TypeError("Argument 'base64url' is not Base64Url encoded");
    }
    return this.FromBase64(this.Base64Padding(formatted.replace(/\-/g, "+").replace(/\_/g, "/")));
  }
  static ToBase64Url(data) {
    return this.ToBase64(data).replace(/\+/g, "-").replace(/\//g, "_").replace(/\=/g, "");
  }
  static FromUtf8String(text, encoding = Convert.DEFAULT_UTF8_ENCODING) {
    switch (encoding) {
      case "ascii":
        return this.FromBinary(text);
      case "utf8":
        return Utf8Converter.fromString(text);
      case "utf16":
      case "utf16be":
        return Utf16Converter.fromString(text);
      case "utf16le":
      case "usc2":
        return Utf16Converter.fromString(text, true);
      default:
        throw new Error(`Unknown type of encoding '${encoding}'`);
    }
  }
  static ToUtf8String(buffer, encoding = Convert.DEFAULT_UTF8_ENCODING) {
    switch (encoding) {
      case "ascii":
        return this.ToBinary(buffer);
      case "utf8":
        return Utf8Converter.toString(buffer);
      case "utf16":
      case "utf16be":
        return Utf16Converter.toString(buffer);
      case "utf16le":
      case "usc2":
        return Utf16Converter.toString(buffer, true);
      default:
        throw new Error(`Unknown type of encoding '${encoding}'`);
    }
  }
  static FromBinary(text) {
    const stringLength = text.length;
    const resultView = new Uint8Array(stringLength);
    for (let i = 0; i < stringLength; i++) {
      resultView[i] = text.charCodeAt(i);
    }
    return resultView.buffer;
  }
  static ToBinary(buffer) {
    const buf = BufferSourceConverter.toUint8Array(buffer);
    let res = "";
    for (let i = 0; i < buf.length; i++) {
      res += String.fromCharCode(buf[i]);
    }
    return res;
  }
  static ToHex(buffer) {
    const buf = BufferSourceConverter.toUint8Array(buffer);
    let result = "";
    const len = buf.length;
    for (let i = 0; i < len; i++) {
      const byte = buf[i];
      if (byte < 16) {
        result += "0";
      }
      result += byte.toString(16);
    }
    return result;
  }
  static FromHex(hexString) {
    let formatted = this.formatString(hexString);
    if (!formatted) {
      return new ArrayBuffer(0);
    }
    if (!Convert.isHex(formatted)) {
      throw new TypeError("Argument 'hexString' is not HEX encoded");
    }
    if (formatted.length % 2) {
      formatted = `0${formatted}`;
    }
    const res = new Uint8Array(formatted.length / 2);
    for (let i = 0; i < formatted.length; i = i + 2) {
      const c = formatted.slice(i, i + 2);
      res[i / 2] = parseInt(c, 16);
    }
    return res.buffer;
  }
  static ToUtf16String(buffer, littleEndian = false) {
    return Utf16Converter.toString(buffer, littleEndian);
  }
  static FromUtf16String(text, littleEndian = false) {
    return Utf16Converter.fromString(text, littleEndian);
  }
  static Base64Padding(base642) {
    const padCount = 4 - base642.length % 4;
    if (padCount < 4) {
      for (let i = 0; i < padCount; i++) {
        base642 += "=";
      }
    }
    return base642;
  }
  static formatString(data) {
    return (data === null || data === void 0 ? void 0 : data.replace(/[\n\r\t ]/g, "")) || "";
  }
}
Convert.DEFAULT_UTF8_ENCODING = "utf8";
function combine(...buf) {
  const totalByteLength = buf.map((item) => item.byteLength).reduce((prev, cur) => prev + cur);
  const res = new Uint8Array(totalByteLength);
  let currentPos = 0;
  buf.map((item) => new Uint8Array(item)).forEach((arr) => {
    for (const item2 of arr) {
      res[currentPos++] = item2;
    }
  });
  return res.buffer;
}
function isEqual(bytes1, bytes2) {
  if (!(bytes1 && bytes2)) {
    return false;
  }
  if (bytes1.byteLength !== bytes2.byteLength) {
    return false;
  }
  const b1 = new Uint8Array(bytes1);
  const b2 = new Uint8Array(bytes2);
  for (let i = 0; i < bytes1.byteLength; i++) {
    if (b1[i] !== b2[i]) {
      return false;
    }
  }
  return true;
}
/*!
 Copyright (c) Peculiar Ventures, LLC
*/
function utilFromBase(inputBuffer, inputBase) {
  let result = 0;
  if (inputBuffer.length === 1) {
    return inputBuffer[0];
  }
  for (let i = inputBuffer.length - 1; i >= 0; i--) {
    result += inputBuffer[inputBuffer.length - 1 - i] * Math.pow(2, inputBase * i);
  }
  return result;
}
function utilToBase(value, base, reserved = -1) {
  const internalReserved = reserved;
  let internalValue = value;
  let result = 0;
  let biggest = Math.pow(2, base);
  for (let i = 1; i < 8; i++) {
    if (value < biggest) {
      let retBuf;
      if (internalReserved < 0) {
        retBuf = new ArrayBuffer(i);
        result = i;
      } else {
        if (internalReserved < i) {
          return new ArrayBuffer(0);
        }
        retBuf = new ArrayBuffer(internalReserved);
        result = internalReserved;
      }
      const retView = new Uint8Array(retBuf);
      for (let j = i - 1; j >= 0; j--) {
        const basis = Math.pow(2, j * base);
        retView[result - j - 1] = Math.floor(internalValue / basis);
        internalValue -= retView[result - j - 1] * basis;
      }
      return retBuf;
    }
    biggest *= Math.pow(2, base);
  }
  return new ArrayBuffer(0);
}
function utilConcatView(...views) {
  let outputLength = 0;
  let prevLength = 0;
  for (const view of views) {
    outputLength += view.length;
  }
  const retBuf = new ArrayBuffer(outputLength);
  const retView = new Uint8Array(retBuf);
  for (const view of views) {
    retView.set(view, prevLength);
    prevLength += view.length;
  }
  return retView;
}
function utilDecodeTC() {
  const buf = new Uint8Array(this.valueHex);
  if (this.valueHex.byteLength >= 2) {
    const condition1 = buf[0] === 255 && buf[1] & 128;
    const condition2 = buf[0] === 0 && (buf[1] & 128) === 0;
    if (condition1 || condition2) {
      this.warnings.push("Needlessly long format");
    }
  }
  const bigIntBuffer = new ArrayBuffer(this.valueHex.byteLength);
  const bigIntView = new Uint8Array(bigIntBuffer);
  for (let i = 0; i < this.valueHex.byteLength; i++) {
    bigIntView[i] = 0;
  }
  bigIntView[0] = buf[0] & 128;
  const bigInt = utilFromBase(bigIntView, 8);
  const smallIntBuffer = new ArrayBuffer(this.valueHex.byteLength);
  const smallIntView = new Uint8Array(smallIntBuffer);
  for (let j = 0; j < this.valueHex.byteLength; j++) {
    smallIntView[j] = buf[j];
  }
  smallIntView[0] &= 127;
  const smallInt = utilFromBase(smallIntView, 8);
  return smallInt - bigInt;
}
function utilEncodeTC(value) {
  const modValue = value < 0 ? value * -1 : value;
  let bigInt = 128;
  for (let i = 1; i < 8; i++) {
    if (modValue <= bigInt) {
      if (value < 0) {
        const smallInt = bigInt - modValue;
        const retBuf2 = utilToBase(smallInt, 8, i);
        const retView2 = new Uint8Array(retBuf2);
        retView2[0] |= 128;
        return retBuf2;
      }
      let retBuf = utilToBase(modValue, 8, i);
      let retView = new Uint8Array(retBuf);
      if (retView[0] & 128) {
        const tempBuf = retBuf.slice(0);
        const tempView = new Uint8Array(tempBuf);
        retBuf = new ArrayBuffer(retBuf.byteLength + 1);
        retView = new Uint8Array(retBuf);
        for (let k = 0; k < tempBuf.byteLength; k++) {
          retView[k + 1] = tempView[k];
        }
        retView[0] = 0;
      }
      return retBuf;
    }
    bigInt *= Math.pow(2, 8);
  }
  return new ArrayBuffer(0);
}
function isEqualBuffer(inputBuffer1, inputBuffer2) {
  if (inputBuffer1.byteLength !== inputBuffer2.byteLength) {
    return false;
  }
  const view1 = new Uint8Array(inputBuffer1);
  const view2 = new Uint8Array(inputBuffer2);
  for (let i = 0; i < view1.length; i++) {
    if (view1[i] !== view2[i]) {
      return false;
    }
  }
  return true;
}
function padNumber(inputNumber, fullLength) {
  const str = inputNumber.toString(10);
  if (fullLength < str.length) {
    return "";
  }
  const dif = fullLength - str.length;
  const padding = new Array(dif);
  for (let i = 0; i < dif; i++) {
    padding[i] = "0";
  }
  const paddingString = padding.join("");
  return paddingString.concat(str);
}
/*!
 * Copyright (c) 2014, GMO GlobalSign
 * Copyright (c) 2015-2022, Peculiar Ventures
 * All rights reserved.
 * 
 * Author 2014-2019, Yury Strozhevsky
 * 
 * Redistribution and use in source and binary forms, with or without modification,
 * are permitted provided that the following conditions are met:
 * 
 * * Redistributions of source code must retain the above copyright notice, this
 *   list of conditions and the following disclaimer.
 * 
 * * Redistributions in binary form must reproduce the above copyright notice, this
 *   list of conditions and the following disclaimer in the documentation and/or
 *   other materials provided with the distribution.
 * 
 * * Neither the name of the copyright holder nor the names of its
 *   contributors may be used to endorse or promote products derived from
 *   this software without specific prior written permission.
 * 
 * THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS" AND
 * ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED
 * WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE
 * DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT HOLDER OR CONTRIBUTORS BE LIABLE FOR
 * ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES
 * (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES;
 * LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON
 * ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT
 * (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS
 * SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
 * 
 */
function assertBigInt() {
  if (typeof BigInt === "undefined") {
    throw new Error("BigInt is not defined. Your environment doesn't implement BigInt.");
  }
}
function concat$1(buffers) {
  let outputLength = 0;
  let prevLength = 0;
  for (let i = 0; i < buffers.length; i++) {
    const buffer = buffers[i];
    outputLength += buffer.byteLength;
  }
  const retView = new Uint8Array(outputLength);
  for (let i = 0; i < buffers.length; i++) {
    const buffer = buffers[i];
    retView.set(new Uint8Array(buffer), prevLength);
    prevLength += buffer.byteLength;
  }
  return retView.buffer;
}
function checkBufferParams(baseBlock, inputBuffer, inputOffset, inputLength) {
  if (!(inputBuffer instanceof Uint8Array)) {
    baseBlock.error = "Wrong parameter: inputBuffer must be 'Uint8Array'";
    return false;
  }
  if (!inputBuffer.byteLength) {
    baseBlock.error = "Wrong parameter: inputBuffer has zero length";
    return false;
  }
  if (inputOffset < 0) {
    baseBlock.error = "Wrong parameter: inputOffset less than zero";
    return false;
  }
  if (inputLength < 0) {
    baseBlock.error = "Wrong parameter: inputLength less than zero";
    return false;
  }
  if (inputBuffer.byteLength - inputOffset - inputLength < 0) {
    baseBlock.error = "End of input reached before message was fully decoded (inconsistent offset and length values)";
    return false;
  }
  return true;
}
class ViewWriter {
  constructor() {
    this.items = [];
  }
  write(buf) {
    this.items.push(buf);
  }
  final() {
    return concat$1(this.items);
  }
}
const powers2 = [new Uint8Array([1])];
const digitsString = "0123456789";
const NAME$1 = "name";
const VALUE_HEX_VIEW = "valueHexView";
const IS_HEX_ONLY = "isHexOnly";
const ID_BLOCK = "idBlock";
const TAG_CLASS = "tagClass";
const TAG_NUMBER = "tagNumber";
const IS_CONSTRUCTED = "isConstructed";
const FROM_BER = "fromBER";
const TO_BER = "toBER";
const LOCAL = "local";
const EMPTY_STRING = "";
const EMPTY_BUFFER = new ArrayBuffer(0);
const EMPTY_VIEW = new Uint8Array(0);
const END_OF_CONTENT_NAME = "EndOfContent";
const OCTET_STRING_NAME = "OCTET STRING";
const BIT_STRING_NAME = "BIT STRING";
function HexBlock(BaseClass) {
  var _a2;
  return _a2 = class Some extends BaseClass {
    get valueHex() {
      return this.valueHexView.slice().buffer;
    }
    set valueHex(value) {
      this.valueHexView = new Uint8Array(value);
    }
    constructor(...args) {
      var _b;
      super(...args);
      const params = args[0] || {};
      this.isHexOnly = (_b = params.isHexOnly) !== null && _b !== void 0 ? _b : false;
      this.valueHexView = params.valueHex ? BufferSourceConverter.toUint8Array(params.valueHex) : EMPTY_VIEW;
    }
    fromBER(inputBuffer, inputOffset, inputLength, _context) {
      const view = inputBuffer instanceof ArrayBuffer ? new Uint8Array(inputBuffer) : inputBuffer;
      if (!checkBufferParams(this, view, inputOffset, inputLength)) {
        return -1;
      }
      const endLength = inputOffset + inputLength;
      this.valueHexView = view.subarray(inputOffset, endLength);
      if (!this.valueHexView.length) {
        this.warnings.push("Zero buffer length");
        return inputOffset;
      }
      this.blockLength = inputLength;
      return endLength;
    }
    toBER(sizeOnly = false) {
      if (!this.isHexOnly) {
        this.error = "Flag 'isHexOnly' is not set, abort";
        return EMPTY_BUFFER;
      }
      if (sizeOnly) {
        return new ArrayBuffer(this.valueHexView.byteLength);
      }
      return this.valueHexView.byteLength === this.valueHexView.buffer.byteLength ? this.valueHexView.buffer : this.valueHexView.slice().buffer;
    }
    toJSON() {
      return {
        ...super.toJSON(),
        isHexOnly: this.isHexOnly,
        valueHex: Convert.ToHex(this.valueHexView)
      };
    }
  }, _a2.NAME = "hexBlock", _a2;
}
class LocalBaseBlock {
  static blockName() {
    return this.NAME;
  }
  get valueBeforeDecode() {
    return this.valueBeforeDecodeView.slice().buffer;
  }
  set valueBeforeDecode(value) {
    this.valueBeforeDecodeView = new Uint8Array(value);
  }
  constructor({ blockLength = 0, error = EMPTY_STRING, warnings = [], valueBeforeDecode = EMPTY_VIEW } = {}) {
    this.blockLength = blockLength;
    this.error = error;
    this.warnings = warnings;
    this.valueBeforeDecodeView = BufferSourceConverter.toUint8Array(valueBeforeDecode);
  }
  toJSON() {
    return {
      blockName: this.constructor.NAME,
      blockLength: this.blockLength,
      error: this.error,
      warnings: this.warnings,
      valueBeforeDecode: Convert.ToHex(this.valueBeforeDecodeView)
    };
  }
}
LocalBaseBlock.NAME = "baseBlock";
class ValueBlock extends LocalBaseBlock {
  fromBER(_inputBuffer, _inputOffset, _inputLength, _context) {
    throw TypeError("User need to make a specific function in a class which extends 'ValueBlock'");
  }
  toBER(_sizeOnly, _writer) {
    throw TypeError("User need to make a specific function in a class which extends 'ValueBlock'");
  }
}
ValueBlock.NAME = "valueBlock";
class LocalIdentificationBlock extends HexBlock(LocalBaseBlock) {
  constructor({ idBlock = {} } = {}) {
    var _a2, _b, _c, _d;
    super();
    if (idBlock) {
      this.isHexOnly = (_a2 = idBlock.isHexOnly) !== null && _a2 !== void 0 ? _a2 : false;
      this.valueHexView = idBlock.valueHex ? BufferSourceConverter.toUint8Array(idBlock.valueHex) : EMPTY_VIEW;
      this.tagClass = (_b = idBlock.tagClass) !== null && _b !== void 0 ? _b : -1;
      this.tagNumber = (_c = idBlock.tagNumber) !== null && _c !== void 0 ? _c : -1;
      this.isConstructed = (_d = idBlock.isConstructed) !== null && _d !== void 0 ? _d : false;
    } else {
      this.tagClass = -1;
      this.tagNumber = -1;
      this.isConstructed = false;
    }
  }
  toBER(sizeOnly = false) {
    let firstOctet = 0;
    switch (this.tagClass) {
      case 1:
        firstOctet |= 0;
        break;
      case 2:
        firstOctet |= 64;
        break;
      case 3:
        firstOctet |= 128;
        break;
      case 4:
        firstOctet |= 192;
        break;
      default:
        this.error = "Unknown tag class";
        return EMPTY_BUFFER;
    }
    if (this.isConstructed)
      firstOctet |= 32;
    if (this.tagNumber < 31 && !this.isHexOnly) {
      const retView2 = new Uint8Array(1);
      if (!sizeOnly) {
        let number = this.tagNumber;
        number &= 31;
        firstOctet |= number;
        retView2[0] = firstOctet;
      }
      return retView2.buffer;
    }
    if (!this.isHexOnly) {
      const encodedBuf = utilToBase(this.tagNumber, 7);
      const encodedView = new Uint8Array(encodedBuf);
      const size = encodedBuf.byteLength;
      const retView2 = new Uint8Array(size + 1);
      retView2[0] = firstOctet | 31;
      if (!sizeOnly) {
        for (let i = 0; i < size - 1; i++)
          retView2[i + 1] = encodedView[i] | 128;
        retView2[size] = encodedView[size - 1];
      }
      return retView2.buffer;
    }
    const retView = new Uint8Array(this.valueHexView.byteLength + 1);
    retView[0] = firstOctet | 31;
    if (!sizeOnly) {
      const curView = this.valueHexView;
      for (let i = 0; i < curView.length - 1; i++)
        retView[i + 1] = curView[i] | 128;
      retView[this.valueHexView.byteLength] = curView[curView.length - 1];
    }
    return retView.buffer;
  }
  fromBER(inputBuffer, inputOffset, inputLength) {
    const inputView = BufferSourceConverter.toUint8Array(inputBuffer);
    if (!checkBufferParams(this, inputView, inputOffset, inputLength)) {
      return -1;
    }
    const intBuffer = inputView.subarray(inputOffset, inputOffset + inputLength);
    if (intBuffer.length === 0) {
      this.error = "Zero buffer length";
      return -1;
    }
    const tagClassMask = intBuffer[0] & 192;
    switch (tagClassMask) {
      case 0:
        this.tagClass = 1;
        break;
      case 64:
        this.tagClass = 2;
        break;
      case 128:
        this.tagClass = 3;
        break;
      case 192:
        this.tagClass = 4;
        break;
      default:
        this.error = "Unknown tag class";
        return -1;
    }
    this.isConstructed = (intBuffer[0] & 32) === 32;
    this.isHexOnly = false;
    const tagNumberMask = intBuffer[0] & 31;
    if (tagNumberMask !== 31) {
      this.tagNumber = tagNumberMask;
      this.blockLength = 1;
    } else {
      let count = 0;
      while (true) {
        const tagByteIndex = count + 1;
        if (tagByteIndex >= intBuffer.length) {
          this.error = "End of input reached before message was fully decoded";
          return -1;
        }
        count++;
        if ((intBuffer[tagByteIndex] & 128) === 0)
          break;
      }
      this.blockLength = count + 1;
      const intTagNumberBuffer = this.valueHexView = new Uint8Array(count);
      for (let i = 0; i < count; i++)
        intTagNumberBuffer[i] = intBuffer[i + 1] & 127;
      if (this.blockLength <= 9)
        this.tagNumber = utilFromBase(intTagNumberBuffer, 7);
      else {
        this.isHexOnly = true;
        this.warnings.push("Tag too long, represented as hex-coded");
      }
    }
    if (this.tagClass === 1 && this.isConstructed) {
      switch (this.tagNumber) {
        case 1:
        case 2:
        case 5:
        case 6:
        case 9:
        case 13:
        case 14:
        case 23:
        case 24:
        case 31:
        case 32:
        case 33:
        case 34:
          this.error = "Constructed encoding used for primitive type";
          return -1;
      }
    }
    return inputOffset + this.blockLength;
  }
  toJSON() {
    return {
      ...super.toJSON(),
      tagClass: this.tagClass,
      tagNumber: this.tagNumber,
      isConstructed: this.isConstructed
    };
  }
}
LocalIdentificationBlock.NAME = "identificationBlock";
class LocalLengthBlock extends LocalBaseBlock {
  constructor({ lenBlock = {} } = {}) {
    var _a2, _b, _c;
    super();
    this.isIndefiniteForm = (_a2 = lenBlock.isIndefiniteForm) !== null && _a2 !== void 0 ? _a2 : false;
    this.longFormUsed = (_b = lenBlock.longFormUsed) !== null && _b !== void 0 ? _b : false;
    this.length = (_c = lenBlock.length) !== null && _c !== void 0 ? _c : 0;
  }
  fromBER(inputBuffer, inputOffset, inputLength) {
    const view = BufferSourceConverter.toUint8Array(inputBuffer);
    if (!checkBufferParams(this, view, inputOffset, inputLength)) {
      return -1;
    }
    const intBuffer = view.subarray(inputOffset, inputOffset + inputLength);
    if (intBuffer.length === 0) {
      this.error = "Zero buffer length";
      return -1;
    }
    if (intBuffer[0] === 255) {
      this.error = "Length block 0xFF is reserved by standard";
      return -1;
    }
    this.isIndefiniteForm = intBuffer[0] === 128;
    if (this.isIndefiniteForm) {
      this.blockLength = 1;
      return inputOffset + this.blockLength;
    }
    this.longFormUsed = !!(intBuffer[0] & 128);
    if (this.longFormUsed === false) {
      this.length = intBuffer[0];
      this.blockLength = 1;
      return inputOffset + this.blockLength;
    }
    const count = intBuffer[0] & 127;
    if (count > 8) {
      this.error = "Too big integer";
      return -1;
    }
    if (count + 1 > intBuffer.length) {
      this.error = "End of input reached before message was fully decoded";
      return -1;
    }
    const lenOffset = inputOffset + 1;
    const lengthBufferView = view.subarray(lenOffset, lenOffset + count);
    if (lengthBufferView[count - 1] === 0)
      this.warnings.push("Needlessly long encoded length");
    this.length = utilFromBase(lengthBufferView, 8);
    if (this.longFormUsed && this.length <= 127)
      this.warnings.push("Unnecessary usage of long length form");
    this.blockLength = count + 1;
    return inputOffset + this.blockLength;
  }
  toBER(sizeOnly = false) {
    let retBuf;
    let retView;
    if (this.length > 127)
      this.longFormUsed = true;
    if (this.isIndefiniteForm) {
      retBuf = new ArrayBuffer(1);
      if (sizeOnly === false) {
        retView = new Uint8Array(retBuf);
        retView[0] = 128;
      }
      return retBuf;
    }
    if (this.longFormUsed) {
      const encodedBuf = utilToBase(this.length, 8);
      if (encodedBuf.byteLength > 127) {
        this.error = "Too big length";
        return EMPTY_BUFFER;
      }
      retBuf = new ArrayBuffer(encodedBuf.byteLength + 1);
      if (sizeOnly)
        return retBuf;
      const encodedView = new Uint8Array(encodedBuf);
      retView = new Uint8Array(retBuf);
      retView[0] = encodedBuf.byteLength | 128;
      for (let i = 0; i < encodedBuf.byteLength; i++)
        retView[i + 1] = encodedView[i];
      return retBuf;
    }
    retBuf = new ArrayBuffer(1);
    if (sizeOnly === false) {
      retView = new Uint8Array(retBuf);
      retView[0] = this.length;
    }
    return retBuf;
  }
  toJSON() {
    return {
      ...super.toJSON(),
      isIndefiniteForm: this.isIndefiniteForm,
      longFormUsed: this.longFormUsed,
      length: this.length
    };
  }
}
LocalLengthBlock.NAME = "lengthBlock";
const typeStore = {};
class BaseBlock extends LocalBaseBlock {
  constructor({ name = EMPTY_STRING, optional = false, primitiveSchema, ...parameters } = {}, valueBlockType) {
    super(parameters);
    this.name = name;
    this.optional = optional;
    if (primitiveSchema) {
      this.primitiveSchema = primitiveSchema;
    }
    this.idBlock = new LocalIdentificationBlock(parameters);
    this.lenBlock = new LocalLengthBlock(parameters);
    this.valueBlock = valueBlockType ? new valueBlockType(parameters) : new ValueBlock(parameters);
  }
  fromBER(inputBuffer, inputOffset, inputLength, context) {
    const resultOffset = this.valueBlock.fromBER(inputBuffer, inputOffset, this.lenBlock.isIndefiniteForm ? inputLength : this.lenBlock.length, context);
    if (resultOffset === -1) {
      this.error = this.valueBlock.error;
      return resultOffset;
    }
    if (!this.idBlock.error.length)
      this.blockLength += this.idBlock.blockLength;
    if (!this.lenBlock.error.length)
      this.blockLength += this.lenBlock.blockLength;
    if (!this.valueBlock.error.length)
      this.blockLength += this.valueBlock.blockLength;
    return resultOffset;
  }
  toBER(sizeOnly, writer) {
    const _writer = writer || new ViewWriter();
    if (!writer) {
      prepareIndefiniteForm(this);
    }
    const idBlockBuf = this.idBlock.toBER(sizeOnly);
    _writer.write(idBlockBuf);
    if (this.lenBlock.isIndefiniteForm) {
      _writer.write(new Uint8Array([128]).buffer);
      this.valueBlock.toBER(sizeOnly, _writer);
      _writer.write(new ArrayBuffer(2));
    } else {
      const valueBlockBuf = this.valueBlock.toBER(sizeOnly);
      this.lenBlock.length = valueBlockBuf.byteLength;
      const lenBlockBuf = this.lenBlock.toBER(sizeOnly);
      _writer.write(lenBlockBuf);
      _writer.write(valueBlockBuf);
    }
    if (!writer) {
      return _writer.final();
    }
    return EMPTY_BUFFER;
  }
  toJSON() {
    const object = {
      ...super.toJSON(),
      idBlock: this.idBlock.toJSON(),
      lenBlock: this.lenBlock.toJSON(),
      valueBlock: this.valueBlock.toJSON(),
      name: this.name,
      optional: this.optional
    };
    if (this.primitiveSchema)
      object.primitiveSchema = this.primitiveSchema.toJSON();
    return object;
  }
  toString(encoding = "ascii") {
    if (encoding === "ascii") {
      return this.onAsciiEncoding();
    }
    return Convert.ToHex(this.toBER());
  }
  onAsciiEncoding() {
    const name = this.constructor.NAME;
    const value = Convert.ToHex(this.valueBlock.valueBeforeDecodeView);
    return `${name} : ${value}`;
  }
  isEqual(other) {
    if (this === other) {
      return true;
    }
    if (!(other instanceof this.constructor)) {
      return false;
    }
    const thisRaw = this.toBER();
    const otherRaw = other.toBER();
    return isEqualBuffer(thisRaw, otherRaw);
  }
}
BaseBlock.NAME = "BaseBlock";
function prepareIndefiniteForm(baseBlock) {
  var _a2;
  if (baseBlock instanceof typeStore.Constructed) {
    for (const value of baseBlock.valueBlock.value) {
      if (prepareIndefiniteForm(value)) {
        baseBlock.lenBlock.isIndefiniteForm = true;
      }
    }
  }
  return !!((_a2 = baseBlock.lenBlock) === null || _a2 === void 0 ? void 0 : _a2.isIndefiniteForm);
}
class BaseStringBlock extends BaseBlock {
  getValue() {
    return this.valueBlock.value;
  }
  setValue(value) {
    this.valueBlock.value = value;
  }
  constructor({ value = EMPTY_STRING, ...parameters } = {}, stringValueBlockType) {
    super(parameters, stringValueBlockType);
    if (value) {
      this.fromString(value);
    }
  }
  fromBER(inputBuffer, inputOffset, inputLength) {
    const resultOffset = this.valueBlock.fromBER(inputBuffer, inputOffset, this.lenBlock.isIndefiniteForm ? inputLength : this.lenBlock.length);
    if (resultOffset === -1) {
      this.error = this.valueBlock.error;
      return resultOffset;
    }
    this.fromBuffer(this.valueBlock.valueHexView);
    if (!this.idBlock.error.length)
      this.blockLength += this.idBlock.blockLength;
    if (!this.lenBlock.error.length)
      this.blockLength += this.lenBlock.blockLength;
    if (!this.valueBlock.error.length)
      this.blockLength += this.valueBlock.blockLength;
    return resultOffset;
  }
  onAsciiEncoding() {
    return `${this.constructor.NAME} : '${this.valueBlock.value}'`;
  }
}
BaseStringBlock.NAME = "BaseStringBlock";
class LocalPrimitiveValueBlock extends HexBlock(ValueBlock) {
  constructor({ isHexOnly = true, ...parameters } = {}) {
    super(parameters);
    this.isHexOnly = isHexOnly;
  }
}
LocalPrimitiveValueBlock.NAME = "PrimitiveValueBlock";
var _a$w;
class Primitive extends BaseBlock {
  constructor(parameters = {}) {
    super(parameters, LocalPrimitiveValueBlock);
    this.idBlock.isConstructed = false;
  }
}
_a$w = Primitive;
(() => {
  typeStore.Primitive = _a$w;
})();
Primitive.NAME = "PRIMITIVE";
const DEFAULT_MAX_DEPTH = 100;
const DEFAULT_MAX_NODES = 1e4;
const DEFAULT_MAX_CONTENT_LENGTH = 16 * 1024 * 1024;
const MAX_DEPTH_EXCEEDED_ERROR = "Maximum ASN.1 nesting depth exceeded";
const MAX_NODES_EXCEEDED_ERROR = "Maximum ASN.1 node count exceeded";
const MAX_CONTENT_LENGTH_EXCEEDED_ERROR = "Maximum ASN.1 content length exceeded";
function createFromBerContext(options = {}) {
  var _a2, _b, _c;
  return {
    depth: 0,
    maxDepth: (_a2 = options.maxDepth) !== null && _a2 !== void 0 ? _a2 : DEFAULT_MAX_DEPTH,
    nodesCount: 0,
    maxNodes: (_b = options.maxNodes) !== null && _b !== void 0 ? _b : DEFAULT_MAX_NODES,
    maxContentLength: (_c = options.maxContentLength) !== null && _c !== void 0 ? _c : DEFAULT_MAX_CONTENT_LENGTH
  };
}
function createErrorResult(error) {
  const result = new BaseBlock({}, ValueBlock);
  result.error = error;
  return {
    offset: -1,
    result
  };
}
function checkNodesLimit(context) {
  context.nodesCount += 1;
  if (context.nodesCount > context.maxNodes) {
    return MAX_NODES_EXCEEDED_ERROR;
  }
  return void 0;
}
function checkContentLengthLimit(inputLength, context) {
  if (inputLength > context.maxContentLength) {
    return MAX_CONTENT_LENGTH_EXCEEDED_ERROR;
  }
  return void 0;
}
function localFromBERWithChildContext(inputBuffer, inputOffset, inputLength, context) {
  const childDepth = context.depth + 1;
  if (childDepth > context.maxDepth) {
    return createErrorResult(MAX_DEPTH_EXCEEDED_ERROR);
  }
  context.depth = childDepth;
  try {
    return localFromBER(inputBuffer, inputOffset, inputLength, context);
  } finally {
    context.depth -= 1;
  }
}
function localChangeType(inputObject, newType) {
  if (inputObject instanceof newType) {
    return inputObject;
  }
  const newObject = new newType();
  newObject.idBlock = inputObject.idBlock;
  newObject.lenBlock = inputObject.lenBlock;
  newObject.warnings = inputObject.warnings;
  newObject.valueBeforeDecodeView = inputObject.valueBeforeDecodeView;
  return newObject;
}
function localFromBER(inputBuffer, inputOffset = 0, inputLength = inputBuffer.length, context = createFromBerContext()) {
  const incomingOffset = inputOffset;
  let returnObject = new BaseBlock({}, ValueBlock);
  const baseBlock = new LocalBaseBlock();
  if (!checkBufferParams(baseBlock, inputBuffer, inputOffset, inputLength)) {
    returnObject.error = baseBlock.error;
    return {
      offset: -1,
      result: returnObject
    };
  }
  const intBuffer = inputBuffer.subarray(inputOffset, inputOffset + inputLength);
  if (!intBuffer.length) {
    returnObject.error = "Zero buffer length";
    return {
      offset: -1,
      result: returnObject
    };
  }
  const nodesLimitError = checkNodesLimit(context);
  if (nodesLimitError) {
    returnObject.error = nodesLimitError;
    return {
      offset: -1,
      result: returnObject
    };
  }
  let resultOffset = returnObject.idBlock.fromBER(inputBuffer, inputOffset, inputLength);
  if (returnObject.idBlock.warnings.length) {
    returnObject.warnings.concat(returnObject.idBlock.warnings);
  }
  if (resultOffset === -1) {
    returnObject.error = returnObject.idBlock.error;
    return {
      offset: -1,
      result: returnObject
    };
  }
  inputOffset = resultOffset;
  inputLength -= returnObject.idBlock.blockLength;
  resultOffset = returnObject.lenBlock.fromBER(inputBuffer, inputOffset, inputLength);
  if (returnObject.lenBlock.warnings.length) {
    returnObject.warnings.concat(returnObject.lenBlock.warnings);
  }
  if (resultOffset === -1) {
    returnObject.error = returnObject.lenBlock.error;
    return {
      offset: -1,
      result: returnObject
    };
  }
  inputOffset = resultOffset;
  inputLength -= returnObject.lenBlock.blockLength;
  const valueLength = returnObject.lenBlock.isIndefiniteForm ? inputLength : returnObject.lenBlock.length;
  const contentLengthError = checkContentLengthLimit(valueLength, context);
  if (contentLengthError) {
    returnObject.error = contentLengthError;
    return {
      offset: -1,
      result: returnObject
    };
  }
  if (!returnObject.idBlock.isConstructed && returnObject.lenBlock.isIndefiniteForm) {
    returnObject.error = "Indefinite length form used for primitive encoding form";
    return {
      offset: -1,
      result: returnObject
    };
  }
  let newASN1Type = BaseBlock;
  switch (returnObject.idBlock.tagClass) {
    case 1:
      if (returnObject.idBlock.tagNumber >= 37 && returnObject.idBlock.isHexOnly === false) {
        returnObject.error = "UNIVERSAL 37 and upper tags are reserved by ASN.1 standard";
        return {
          offset: -1,
          result: returnObject
        };
      }
      switch (returnObject.idBlock.tagNumber) {
        case 0:
          if (returnObject.idBlock.isConstructed && returnObject.lenBlock.length > 0) {
            returnObject.error = "Type [UNIVERSAL 0] is reserved";
            return {
              offset: -1,
              result: returnObject
            };
          }
          newASN1Type = typeStore.EndOfContent;
          break;
        case 1:
          newASN1Type = typeStore.Boolean;
          break;
        case 2:
          newASN1Type = typeStore.Integer;
          break;
        case 3:
          newASN1Type = typeStore.BitString;
          break;
        case 4:
          newASN1Type = typeStore.OctetString;
          break;
        case 5:
          newASN1Type = typeStore.Null;
          break;
        case 6:
          newASN1Type = typeStore.ObjectIdentifier;
          break;
        case 10:
          newASN1Type = typeStore.Enumerated;
          break;
        case 12:
          newASN1Type = typeStore.Utf8String;
          break;
        case 13:
          newASN1Type = typeStore.RelativeObjectIdentifier;
          break;
        case 14:
          newASN1Type = typeStore.TIME;
          break;
        case 15:
          returnObject.error = "[UNIVERSAL 15] is reserved by ASN.1 standard";
          return {
            offset: -1,
            result: returnObject
          };
        case 16:
          newASN1Type = typeStore.Sequence;
          break;
        case 17:
          newASN1Type = typeStore.Set;
          break;
        case 18:
          newASN1Type = typeStore.NumericString;
          break;
        case 19:
          newASN1Type = typeStore.PrintableString;
          break;
        case 20:
          newASN1Type = typeStore.TeletexString;
          break;
        case 21:
          newASN1Type = typeStore.VideotexString;
          break;
        case 22:
          newASN1Type = typeStore.IA5String;
          break;
        case 23:
          newASN1Type = typeStore.UTCTime;
          break;
        case 24:
          newASN1Type = typeStore.GeneralizedTime;
          break;
        case 25:
          newASN1Type = typeStore.GraphicString;
          break;
        case 26:
          newASN1Type = typeStore.VisibleString;
          break;
        case 27:
          newASN1Type = typeStore.GeneralString;
          break;
        case 28:
          newASN1Type = typeStore.UniversalString;
          break;
        case 29:
          newASN1Type = typeStore.CharacterString;
          break;
        case 30:
          newASN1Type = typeStore.BmpString;
          break;
        case 31:
          newASN1Type = typeStore.DATE;
          break;
        case 32:
          newASN1Type = typeStore.TimeOfDay;
          break;
        case 33:
          newASN1Type = typeStore.DateTime;
          break;
        case 34:
          newASN1Type = typeStore.Duration;
          break;
        default: {
          const newObject = returnObject.idBlock.isConstructed ? new typeStore.Constructed() : new typeStore.Primitive();
          newObject.idBlock = returnObject.idBlock;
          newObject.lenBlock = returnObject.lenBlock;
          newObject.warnings = returnObject.warnings;
          returnObject = newObject;
        }
      }
      break;
    case 2:
    case 3:
    case 4:
    default: {
      newASN1Type = returnObject.idBlock.isConstructed ? typeStore.Constructed : typeStore.Primitive;
    }
  }
  returnObject = localChangeType(returnObject, newASN1Type);
  resultOffset = returnObject.fromBER(inputBuffer, inputOffset, valueLength, context);
  returnObject.valueBeforeDecodeView = inputBuffer.subarray(incomingOffset, incomingOffset + returnObject.blockLength);
  return {
    offset: resultOffset,
    result: returnObject
  };
}
function fromBER(inputBuffer, options = {}) {
  if (!inputBuffer.byteLength) {
    const result = new BaseBlock({}, ValueBlock);
    result.error = "Input buffer has zero length";
    return {
      offset: -1,
      result
    };
  }
  return localFromBER(BufferSourceConverter.toUint8Array(inputBuffer).slice(), 0, inputBuffer.byteLength, createFromBerContext(options));
}
function checkLen(indefiniteLength, length) {
  if (indefiniteLength) {
    return 1;
  }
  return length;
}
class LocalConstructedValueBlock extends ValueBlock {
  constructor({ value = [], isIndefiniteForm = false, ...parameters } = {}) {
    super(parameters);
    this.value = value;
    this.isIndefiniteForm = isIndefiniteForm;
  }
  fromBER(inputBuffer, inputOffset, inputLength, context) {
    const view = BufferSourceConverter.toUint8Array(inputBuffer);
    const parseContext = context !== null && context !== void 0 ? context : createFromBerContext();
    if (!checkBufferParams(this, view, inputOffset, inputLength)) {
      return -1;
    }
    this.valueBeforeDecodeView = view.subarray(inputOffset, inputOffset + inputLength);
    if (this.valueBeforeDecodeView.length === 0) {
      this.warnings.push("Zero buffer length");
      return inputOffset;
    }
    let currentOffset = inputOffset;
    while (checkLen(this.isIndefiniteForm, inputLength) > 0) {
      const returnObject = localFromBERWithChildContext(view, currentOffset, inputLength, parseContext);
      if (returnObject.offset === -1) {
        this.error = returnObject.result.error;
        this.warnings.concat(returnObject.result.warnings);
        return -1;
      }
      currentOffset = returnObject.offset;
      this.blockLength += returnObject.result.blockLength;
      inputLength -= returnObject.result.blockLength;
      this.value.push(returnObject.result);
      if (this.isIndefiniteForm && returnObject.result.constructor.NAME === END_OF_CONTENT_NAME) {
        break;
      }
    }
    if (this.isIndefiniteForm) {
      if (this.value[this.value.length - 1].constructor.NAME === END_OF_CONTENT_NAME) {
        this.value.pop();
      } else {
        this.warnings.push("No EndOfContent block encoded");
      }
    }
    return currentOffset;
  }
  toBER(sizeOnly, writer) {
    const _writer = writer || new ViewWriter();
    for (let i = 0; i < this.value.length; i++) {
      this.value[i].toBER(sizeOnly, _writer);
    }
    if (!writer) {
      return _writer.final();
    }
    return EMPTY_BUFFER;
  }
  toJSON() {
    const object = {
      ...super.toJSON(),
      isIndefiniteForm: this.isIndefiniteForm,
      value: []
    };
    for (const value of this.value) {
      object.value.push(value.toJSON());
    }
    return object;
  }
}
LocalConstructedValueBlock.NAME = "ConstructedValueBlock";
var _a$v;
class Constructed extends BaseBlock {
  constructor(parameters = {}) {
    super(parameters, LocalConstructedValueBlock);
    this.idBlock.isConstructed = true;
  }
  fromBER(inputBuffer, inputOffset, inputLength, context) {
    this.valueBlock.isIndefiniteForm = this.lenBlock.isIndefiniteForm;
    const resultOffset = this.valueBlock.fromBER(inputBuffer, inputOffset, this.lenBlock.isIndefiniteForm ? inputLength : this.lenBlock.length, context);
    if (resultOffset === -1) {
      this.error = this.valueBlock.error;
      return resultOffset;
    }
    if (!this.idBlock.error.length)
      this.blockLength += this.idBlock.blockLength;
    if (!this.lenBlock.error.length)
      this.blockLength += this.lenBlock.blockLength;
    if (!this.valueBlock.error.length)
      this.blockLength += this.valueBlock.blockLength;
    return resultOffset;
  }
  onAsciiEncoding() {
    const values = [];
    for (const value of this.valueBlock.value) {
      values.push(value.toString("ascii").split("\n").map((o) => `  ${o}`).join("\n"));
    }
    const blockName = this.idBlock.tagClass === 3 ? `[${this.idBlock.tagNumber}]` : this.constructor.NAME;
    return values.length ? `${blockName} :
${values.join("\n")}` : `${blockName} :`;
  }
}
_a$v = Constructed;
(() => {
  typeStore.Constructed = _a$v;
})();
Constructed.NAME = "CONSTRUCTED";
class LocalEndOfContentValueBlock extends ValueBlock {
  fromBER(inputBuffer, inputOffset, _inputLength) {
    return inputOffset;
  }
  toBER(_sizeOnly) {
    return EMPTY_BUFFER;
  }
}
LocalEndOfContentValueBlock.override = "EndOfContentValueBlock";
var _a$u;
class EndOfContent extends BaseBlock {
  constructor(parameters = {}) {
    super(parameters, LocalEndOfContentValueBlock);
    this.idBlock.tagClass = 1;
    this.idBlock.tagNumber = 0;
  }
}
_a$u = EndOfContent;
(() => {
  typeStore.EndOfContent = _a$u;
})();
EndOfContent.NAME = END_OF_CONTENT_NAME;
var _a$t;
class Null extends BaseBlock {
  constructor(parameters = {}) {
    super(parameters, ValueBlock);
    this.idBlock.tagClass = 1;
    this.idBlock.tagNumber = 5;
  }
  fromBER(inputBuffer, inputOffset, inputLength) {
    if (this.lenBlock.length > 0)
      this.warnings.push("Non-zero length of value block for Null type");
    if (!this.idBlock.error.length)
      this.blockLength += this.idBlock.blockLength;
    if (!this.lenBlock.error.length)
      this.blockLength += this.lenBlock.blockLength;
    this.blockLength += inputLength;
    if (inputOffset + inputLength > inputBuffer.byteLength) {
      this.error = "End of input reached before message was fully decoded (inconsistent offset and length values)";
      return -1;
    }
    return inputOffset + inputLength;
  }
  toBER(sizeOnly, writer) {
    const retBuf = new ArrayBuffer(2);
    if (!sizeOnly) {
      const retView = new Uint8Array(retBuf);
      retView[0] = 5;
      retView[1] = 0;
    }
    if (writer) {
      writer.write(retBuf);
    }
    return retBuf;
  }
  onAsciiEncoding() {
    return `${this.constructor.NAME}`;
  }
}
_a$t = Null;
(() => {
  typeStore.Null = _a$t;
})();
Null.NAME = "NULL";
class LocalBooleanValueBlock extends HexBlock(ValueBlock) {
  get value() {
    for (const octet of this.valueHexView) {
      if (octet > 0) {
        return true;
      }
    }
    return false;
  }
  set value(value) {
    this.valueHexView[0] = value ? 255 : 0;
  }
  constructor({ value, ...parameters } = {}) {
    super(parameters);
    if (parameters.valueHex) {
      this.valueHexView = BufferSourceConverter.toUint8Array(parameters.valueHex);
    } else {
      this.valueHexView = new Uint8Array(1);
    }
    if (value) {
      this.value = value;
    }
  }
  fromBER(inputBuffer, inputOffset, inputLength) {
    const inputView = BufferSourceConverter.toUint8Array(inputBuffer);
    if (!checkBufferParams(this, inputView, inputOffset, inputLength)) {
      return -1;
    }
    this.valueHexView = inputView.subarray(inputOffset, inputOffset + inputLength);
    if (inputLength > 1)
      this.warnings.push("Boolean value encoded in more then 1 octet");
    this.isHexOnly = true;
    utilDecodeTC.call(this);
    this.blockLength = inputLength;
    return inputOffset + inputLength;
  }
  toBER() {
    return this.valueHexView.slice();
  }
  toJSON() {
    return {
      ...super.toJSON(),
      value: this.value
    };
  }
}
LocalBooleanValueBlock.NAME = "BooleanValueBlock";
var _a$s;
let Boolean$1 = class Boolean2 extends BaseBlock {
  getValue() {
    return this.valueBlock.value;
  }
  setValue(value) {
    this.valueBlock.value = value;
  }
  constructor(parameters = {}) {
    super(parameters, LocalBooleanValueBlock);
    this.idBlock.tagClass = 1;
    this.idBlock.tagNumber = 1;
  }
  onAsciiEncoding() {
    return `${this.constructor.NAME} : ${this.getValue}`;
  }
};
_a$s = Boolean$1;
(() => {
  typeStore.Boolean = _a$s;
})();
Boolean$1.NAME = "BOOLEAN";
class LocalOctetStringValueBlock extends HexBlock(LocalConstructedValueBlock) {
  constructor({ isConstructed = false, ...parameters } = {}) {
    super(parameters);
    this.isConstructed = isConstructed;
  }
  fromBER(inputBuffer, inputOffset, inputLength, context) {
    let resultOffset = 0;
    if (this.isConstructed) {
      this.isHexOnly = false;
      resultOffset = LocalConstructedValueBlock.prototype.fromBER.call(this, inputBuffer, inputOffset, inputLength, context);
      if (resultOffset === -1)
        return resultOffset;
      for (let i = 0; i < this.value.length; i++) {
        const currentBlockName = this.value[i].constructor.NAME;
        if (currentBlockName === END_OF_CONTENT_NAME) {
          if (this.isIndefiniteForm)
            break;
          else {
            this.error = "EndOfContent is unexpected, OCTET STRING may consists of OCTET STRINGs only";
            return -1;
          }
        }
        if (currentBlockName !== OCTET_STRING_NAME) {
          this.error = "OCTET STRING may consists of OCTET STRINGs only";
          return -1;
        }
      }
    } else {
      this.isHexOnly = true;
      resultOffset = super.fromBER(inputBuffer, inputOffset, inputLength);
      this.blockLength = inputLength;
    }
    return resultOffset;
  }
  toBER(sizeOnly, writer) {
    if (this.isConstructed)
      return LocalConstructedValueBlock.prototype.toBER.call(this, sizeOnly, writer);
    return sizeOnly ? new ArrayBuffer(this.valueHexView.byteLength) : this.valueHexView.slice().buffer;
  }
  toJSON() {
    return {
      ...super.toJSON(),
      isConstructed: this.isConstructed
    };
  }
}
LocalOctetStringValueBlock.NAME = "OctetStringValueBlock";
var _a$r;
let OctetString$1 = class OctetString extends BaseBlock {
  constructor({ idBlock = {}, lenBlock = {}, ...parameters } = {}) {
    var _b, _c;
    (_b = parameters.isConstructed) !== null && _b !== void 0 ? _b : parameters.isConstructed = !!((_c = parameters.value) === null || _c === void 0 ? void 0 : _c.length);
    super({
      idBlock: {
        isConstructed: parameters.isConstructed,
        ...idBlock
      },
      lenBlock: {
        ...lenBlock,
        isIndefiniteForm: !!parameters.isIndefiniteForm
      },
      ...parameters
    }, LocalOctetStringValueBlock);
    this.idBlock.tagClass = 1;
    this.idBlock.tagNumber = 4;
  }
  fromBER(inputBuffer, inputOffset, inputLength, context) {
    this.valueBlock.isConstructed = this.idBlock.isConstructed;
    this.valueBlock.isIndefiniteForm = this.lenBlock.isIndefiniteForm;
    if (inputLength === 0) {
      if (this.idBlock.error.length === 0)
        this.blockLength += this.idBlock.blockLength;
      if (this.lenBlock.error.length === 0)
        this.blockLength += this.lenBlock.blockLength;
      return inputOffset;
    }
    if (!this.valueBlock.isConstructed) {
      const view = inputBuffer instanceof ArrayBuffer ? new Uint8Array(inputBuffer) : inputBuffer;
      const buf = view.subarray(inputOffset, inputOffset + inputLength);
      try {
        if (buf.byteLength) {
          const parseContext = context !== null && context !== void 0 ? context : createFromBerContext();
          const asn = localFromBERWithChildContext(buf, 0, buf.byteLength, parseContext);
          if (asn.offset !== -1 && asn.offset === inputLength) {
            this.valueBlock.value = [asn.result];
          }
        }
      } catch {
      }
    }
    return super.fromBER(inputBuffer, inputOffset, inputLength, context);
  }
  onAsciiEncoding() {
    if (this.valueBlock.isConstructed || this.valueBlock.value && this.valueBlock.value.length) {
      return Constructed.prototype.onAsciiEncoding.call(this);
    }
    const name = this.constructor.NAME;
    const value = Convert.ToHex(this.valueBlock.valueHexView);
    return `${name} : ${value}`;
  }
  getValue() {
    if (!this.idBlock.isConstructed) {
      return this.valueBlock.valueHexView.slice().buffer;
    }
    const array = [];
    for (const content of this.valueBlock.value) {
      if (content instanceof _a$r) {
        array.push(content.valueBlock.valueHexView);
      }
    }
    return BufferSourceConverter.concat(array);
  }
};
_a$r = OctetString$1;
(() => {
  typeStore.OctetString = _a$r;
})();
OctetString$1.NAME = OCTET_STRING_NAME;
class LocalBitStringValueBlock extends HexBlock(LocalConstructedValueBlock) {
  constructor({ unusedBits = 0, isConstructed = false, ...parameters } = {}) {
    super(parameters);
    this.unusedBits = unusedBits;
    this.isConstructed = isConstructed;
    this.blockLength = this.valueHexView.byteLength;
  }
  fromBER(inputBuffer, inputOffset, inputLength, context) {
    if (!inputLength) {
      return inputOffset;
    }
    let resultOffset = -1;
    if (this.isConstructed) {
      resultOffset = LocalConstructedValueBlock.prototype.fromBER.call(this, inputBuffer, inputOffset, inputLength, context);
      if (resultOffset === -1)
        return resultOffset;
      for (const value of this.value) {
        const currentBlockName = value.constructor.NAME;
        if (currentBlockName === END_OF_CONTENT_NAME) {
          if (this.isIndefiniteForm)
            break;
          else {
            this.error = "EndOfContent is unexpected, BIT STRING may consists of BIT STRINGs only";
            return -1;
          }
        }
        if (currentBlockName !== BIT_STRING_NAME) {
          this.error = "BIT STRING may consists of BIT STRINGs only";
          return -1;
        }
        const valueBlock = value.valueBlock;
        if (this.unusedBits > 0 && valueBlock.unusedBits > 0) {
          this.error = 'Using of "unused bits" inside constructive BIT STRING allowed for least one only';
          return -1;
        }
        this.unusedBits = valueBlock.unusedBits;
      }
      return resultOffset;
    }
    const inputView = BufferSourceConverter.toUint8Array(inputBuffer);
    if (!checkBufferParams(this, inputView, inputOffset, inputLength)) {
      return -1;
    }
    const intBuffer = inputView.subarray(inputOffset, inputOffset + inputLength);
    this.unusedBits = intBuffer[0];
    if (this.unusedBits > 7) {
      this.error = "Unused bits for BitString must be in range 0-7";
      return -1;
    }
    if (!this.unusedBits) {
      const buf = intBuffer.subarray(1);
      try {
        if (buf.byteLength) {
          const parseContext = context !== null && context !== void 0 ? context : createFromBerContext();
          const asn = localFromBERWithChildContext(buf, 0, buf.byteLength, parseContext);
          if (asn.offset !== -1 && asn.offset === inputLength - 1) {
            this.value = [asn.result];
          }
        }
      } catch {
      }
    }
    this.valueHexView = intBuffer.subarray(1);
    this.blockLength = intBuffer.length;
    return inputOffset + inputLength;
  }
  toBER(sizeOnly, writer) {
    if (this.isConstructed) {
      return LocalConstructedValueBlock.prototype.toBER.call(this, sizeOnly, writer);
    }
    if (sizeOnly) {
      return new ArrayBuffer(this.valueHexView.byteLength + 1);
    }
    if (!this.valueHexView.byteLength) {
      const empty = new Uint8Array(1);
      empty[0] = 0;
      return empty.buffer;
    }
    const retView = new Uint8Array(this.valueHexView.length + 1);
    retView[0] = this.unusedBits;
    retView.set(this.valueHexView, 1);
    return retView.buffer;
  }
  toJSON() {
    return {
      ...super.toJSON(),
      unusedBits: this.unusedBits,
      isConstructed: this.isConstructed
    };
  }
}
LocalBitStringValueBlock.NAME = "BitStringValueBlock";
var _a$q;
let BitString$1 = class BitString extends BaseBlock {
  constructor({ idBlock = {}, lenBlock = {}, ...parameters } = {}) {
    var _b, _c;
    (_b = parameters.isConstructed) !== null && _b !== void 0 ? _b : parameters.isConstructed = !!((_c = parameters.value) === null || _c === void 0 ? void 0 : _c.length);
    super({
      idBlock: {
        isConstructed: parameters.isConstructed,
        ...idBlock
      },
      lenBlock: {
        ...lenBlock,
        isIndefiniteForm: !!parameters.isIndefiniteForm
      },
      ...parameters
    }, LocalBitStringValueBlock);
    this.idBlock.tagClass = 1;
    this.idBlock.tagNumber = 3;
  }
  fromBER(inputBuffer, inputOffset, inputLength, context) {
    this.valueBlock.isConstructed = this.idBlock.isConstructed;
    this.valueBlock.isIndefiniteForm = this.lenBlock.isIndefiniteForm;
    return super.fromBER(inputBuffer, inputOffset, inputLength, context);
  }
  onAsciiEncoding() {
    if (this.valueBlock.isConstructed || this.valueBlock.value && this.valueBlock.value.length) {
      return Constructed.prototype.onAsciiEncoding.call(this);
    } else {
      const bits = [];
      const valueHex = this.valueBlock.valueHexView;
      for (const byte of valueHex) {
        bits.push(byte.toString(2).padStart(8, "0"));
      }
      const bitsStr = bits.join("");
      const name = this.constructor.NAME;
      const value = bitsStr.substring(0, bitsStr.length - this.valueBlock.unusedBits);
      return `${name} : ${value}`;
    }
  }
};
_a$q = BitString$1;
(() => {
  typeStore.BitString = _a$q;
})();
BitString$1.NAME = BIT_STRING_NAME;
var _a$p;
function viewAdd(first, second) {
  const c = new Uint8Array([0]);
  const firstView = new Uint8Array(first);
  const secondView = new Uint8Array(second);
  let firstViewCopy = firstView.slice(0);
  const firstViewCopyLength = firstViewCopy.length - 1;
  const secondViewCopy = secondView.slice(0);
  const secondViewCopyLength = secondViewCopy.length - 1;
  let value = 0;
  const max = secondViewCopyLength < firstViewCopyLength ? firstViewCopyLength : secondViewCopyLength;
  let counter = 0;
  for (let i = max; i >= 0; i--, counter++) {
    switch (true) {
      case counter < secondViewCopy.length:
        value = firstViewCopy[firstViewCopyLength - counter] + secondViewCopy[secondViewCopyLength - counter] + c[0];
        break;
      default:
        value = firstViewCopy[firstViewCopyLength - counter] + c[0];
    }
    c[0] = value / 10;
    switch (true) {
      case counter >= firstViewCopy.length:
        firstViewCopy = utilConcatView(new Uint8Array([value % 10]), firstViewCopy);
        break;
      default:
        firstViewCopy[firstViewCopyLength - counter] = value % 10;
    }
  }
  if (c[0] > 0)
    firstViewCopy = utilConcatView(c, firstViewCopy);
  return firstViewCopy;
}
function power2(n) {
  if (n >= powers2.length) {
    for (let p = powers2.length; p <= n; p++) {
      const c = new Uint8Array([0]);
      let digits = powers2[p - 1].slice(0);
      for (let i = digits.length - 1; i >= 0; i--) {
        const newValue = new Uint8Array([(digits[i] << 1) + c[0]]);
        c[0] = newValue[0] / 10;
        digits[i] = newValue[0] % 10;
      }
      if (c[0] > 0)
        digits = utilConcatView(c, digits);
      powers2.push(digits);
    }
  }
  return powers2[n];
}
function viewSub(first, second) {
  let b = 0;
  const firstView = new Uint8Array(first);
  const secondView = new Uint8Array(second);
  const firstViewCopy = firstView.slice(0);
  const firstViewCopyLength = firstViewCopy.length - 1;
  const secondViewCopy = secondView.slice(0);
  const secondViewCopyLength = secondViewCopy.length - 1;
  let value;
  let counter = 0;
  for (let i = secondViewCopyLength; i >= 0; i--, counter++) {
    value = firstViewCopy[firstViewCopyLength - counter] - secondViewCopy[secondViewCopyLength - counter] - b;
    switch (true) {
      case value < 0:
        b = 1;
        firstViewCopy[firstViewCopyLength - counter] = value + 10;
        break;
      default:
        b = 0;
        firstViewCopy[firstViewCopyLength - counter] = value;
    }
  }
  if (b > 0) {
    for (let i = firstViewCopyLength - secondViewCopyLength + 1; i >= 0; i--, counter++) {
      value = firstViewCopy[firstViewCopyLength - counter] - b;
      if (value < 0) {
        b = 1;
        firstViewCopy[firstViewCopyLength - counter] = value + 10;
      } else {
        b = 0;
        firstViewCopy[firstViewCopyLength - counter] = value;
        break;
      }
    }
  }
  return firstViewCopy.slice();
}
class LocalIntegerValueBlock extends HexBlock(ValueBlock) {
  setValueHex() {
    if (this.valueHexView.length >= 4) {
      this.warnings.push("Too big Integer for decoding, hex only");
      this.isHexOnly = true;
      this._valueDec = 0;
    } else {
      this.isHexOnly = false;
      if (this.valueHexView.length > 0) {
        this._valueDec = utilDecodeTC.call(this);
      }
    }
  }
  constructor({ value, ...parameters } = {}) {
    super(parameters);
    this._valueDec = 0;
    if (parameters.valueHex) {
      this.setValueHex();
    }
    if (value !== void 0) {
      this.valueDec = value;
    }
  }
  set valueDec(v) {
    this._valueDec = v;
    this.isHexOnly = false;
    this.valueHexView = new Uint8Array(utilEncodeTC(v));
  }
  get valueDec() {
    return this._valueDec;
  }
  fromDER(inputBuffer, inputOffset, inputLength, expectedLength = 0) {
    const offset = this.fromBER(inputBuffer, inputOffset, inputLength);
    if (offset === -1)
      return offset;
    const view = this.valueHexView;
    if (view[0] === 0 && (view[1] & 128) !== 0) {
      this.valueHexView = view.subarray(1);
    } else {
      if (expectedLength !== 0) {
        if (view.length < expectedLength) {
          if (expectedLength - view.length > 1)
            expectedLength = view.length + 1;
          this.valueHexView = view.subarray(expectedLength - view.length);
        }
      }
    }
    return offset;
  }
  toDER(sizeOnly = false) {
    const view = this.valueHexView;
    switch (true) {
      case (view[0] & 128) !== 0:
        {
          const updatedView = new Uint8Array(this.valueHexView.length + 1);
          updatedView[0] = 0;
          updatedView.set(view, 1);
          this.valueHexView = updatedView;
        }
        break;
      case (view[0] === 0 && (view[1] & 128) === 0):
        {
          this.valueHexView = this.valueHexView.subarray(1);
        }
        break;
    }
    return this.toBER(sizeOnly);
  }
  fromBER(inputBuffer, inputOffset, inputLength) {
    const resultOffset = super.fromBER(inputBuffer, inputOffset, inputLength);
    if (resultOffset === -1) {
      return resultOffset;
    }
    this.setValueHex();
    return resultOffset;
  }
  toBER(sizeOnly) {
    return sizeOnly ? new ArrayBuffer(this.valueHexView.length) : this.valueHexView.slice().buffer;
  }
  toJSON() {
    return {
      ...super.toJSON(),
      valueDec: this.valueDec
    };
  }
  toString() {
    const firstBit = this.valueHexView.length * 8 - 1;
    let digits = new Uint8Array(this.valueHexView.length * 8 / 3);
    let bitNumber = 0;
    let currentByte;
    const asn1View = this.valueHexView;
    let result = "";
    let flag = false;
    for (let byteNumber = asn1View.byteLength - 1; byteNumber >= 0; byteNumber--) {
      currentByte = asn1View[byteNumber];
      for (let i = 0; i < 8; i++) {
        if ((currentByte & 1) === 1) {
          switch (bitNumber) {
            case firstBit:
              digits = viewSub(power2(bitNumber), digits);
              result = "-";
              break;
            default:
              digits = viewAdd(digits, power2(bitNumber));
          }
        }
        bitNumber++;
        currentByte >>= 1;
      }
    }
    for (let i = 0; i < digits.length; i++) {
      if (digits[i])
        flag = true;
      if (flag)
        result += digitsString.charAt(digits[i]);
    }
    if (flag === false)
      result += digitsString.charAt(0);
    return result;
  }
}
_a$p = LocalIntegerValueBlock;
LocalIntegerValueBlock.NAME = "IntegerValueBlock";
(() => {
  Object.defineProperty(_a$p.prototype, "valueHex", {
    set: function(v) {
      this.valueHexView = new Uint8Array(v);
      this.setValueHex();
    },
    get: function() {
      return this.valueHexView.slice().buffer;
    }
  });
})();
var _a$o;
class Integer extends BaseBlock {
  constructor(parameters = {}) {
    super(parameters, LocalIntegerValueBlock);
    this.idBlock.tagClass = 1;
    this.idBlock.tagNumber = 2;
  }
  toBigInt() {
    assertBigInt();
    return BigInt(this.valueBlock.toString());
  }
  static fromBigInt(value) {
    assertBigInt();
    const bigIntValue = BigInt(value);
    const writer = new ViewWriter();
    const hex = bigIntValue.toString(16).replace(/^-/, "");
    const view = new Uint8Array(Convert.FromHex(hex));
    if (bigIntValue < 0) {
      const first = new Uint8Array(view.length + (view[0] & 128 ? 1 : 0));
      first[0] |= 128;
      const firstInt = BigInt(`0x${Convert.ToHex(first)}`);
      const secondInt = firstInt + bigIntValue;
      const second = BufferSourceConverter.toUint8Array(Convert.FromHex(secondInt.toString(16)));
      second[0] |= 128;
      writer.write(second);
    } else {
      if (view[0] & 128) {
        writer.write(new Uint8Array([0]));
      }
      writer.write(view);
    }
    const res = new _a$o({ valueHex: writer.final() });
    return res;
  }
  convertToDER() {
    const integer = new _a$o({ valueHex: this.valueBlock.valueHexView });
    integer.valueBlock.toDER();
    return integer;
  }
  convertFromDER() {
    return new _a$o({
      valueHex: this.valueBlock.valueHexView[0] === 0 ? this.valueBlock.valueHexView.subarray(1) : this.valueBlock.valueHexView
    });
  }
  onAsciiEncoding() {
    return `${this.constructor.NAME} : ${this.valueBlock.toString()}`;
  }
}
_a$o = Integer;
(() => {
  typeStore.Integer = _a$o;
})();
Integer.NAME = "INTEGER";
var _a$n;
class Enumerated extends Integer {
  constructor(parameters = {}) {
    super(parameters);
    this.idBlock.tagClass = 1;
    this.idBlock.tagNumber = 10;
  }
}
_a$n = Enumerated;
(() => {
  typeStore.Enumerated = _a$n;
})();
Enumerated.NAME = "ENUMERATED";
class LocalSidValueBlock extends HexBlock(ValueBlock) {
  constructor({ valueDec = -1, isFirstSid = false, ...parameters } = {}) {
    super(parameters);
    this.valueDec = valueDec;
    this.isFirstSid = isFirstSid;
  }
  fromBER(inputBuffer, inputOffset, inputLength) {
    if (!inputLength) {
      return inputOffset;
    }
    const inputView = BufferSourceConverter.toUint8Array(inputBuffer);
    if (!checkBufferParams(this, inputView, inputOffset, inputLength)) {
      return -1;
    }
    const intBuffer = inputView.subarray(inputOffset, inputOffset + inputLength);
    this.valueHexView = new Uint8Array(inputLength);
    for (let i = 0; i < inputLength; i++) {
      this.valueHexView[i] = intBuffer[i] & 127;
      this.blockLength++;
      if ((intBuffer[i] & 128) === 0)
        break;
    }
    const tempView = new Uint8Array(this.blockLength);
    for (let i = 0; i < this.blockLength; i++) {
      tempView[i] = this.valueHexView[i];
    }
    this.valueHexView = tempView;
    if ((intBuffer[this.blockLength - 1] & 128) !== 0) {
      this.error = "End of input reached before message was fully decoded";
      return -1;
    }
    if (this.valueHexView[0] === 0)
      this.warnings.push("Needlessly long format of SID encoding");
    if (this.blockLength <= 8)
      this.valueDec = utilFromBase(this.valueHexView, 7);
    else {
      this.isHexOnly = true;
      this.warnings.push("Too big SID for decoding, hex only");
    }
    return inputOffset + this.blockLength;
  }
  set valueBigInt(value) {
    assertBigInt();
    let bits = BigInt(value).toString(2);
    while (bits.length % 7) {
      bits = "0" + bits;
    }
    const bytes = new Uint8Array(bits.length / 7);
    for (let i = 0; i < bytes.length; i++) {
      bytes[i] = parseInt(bits.slice(i * 7, i * 7 + 7), 2) + (i + 1 < bytes.length ? 128 : 0);
    }
    this.fromBER(bytes.buffer, 0, bytes.length);
  }
  toBER(sizeOnly) {
    if (this.isHexOnly) {
      if (sizeOnly)
        return new ArrayBuffer(this.valueHexView.byteLength);
      const curView = this.valueHexView;
      const retView2 = new Uint8Array(this.blockLength);
      for (let i = 0; i < this.blockLength - 1; i++)
        retView2[i] = curView[i] | 128;
      retView2[this.blockLength - 1] = curView[this.blockLength - 1];
      return retView2.buffer;
    }
    const encodedBuf = utilToBase(this.valueDec, 7);
    if (encodedBuf.byteLength === 0) {
      this.error = "Error during encoding SID value";
      return EMPTY_BUFFER;
    }
    const retView = new Uint8Array(encodedBuf.byteLength);
    if (!sizeOnly) {
      const encodedView = new Uint8Array(encodedBuf);
      const len = encodedBuf.byteLength - 1;
      for (let i = 0; i < len; i++)
        retView[i] = encodedView[i] | 128;
      retView[len] = encodedView[len];
    }
    return retView;
  }
  toString() {
    let result = "";
    if (this.isHexOnly)
      result = Convert.ToHex(this.valueHexView);
    else {
      if (this.isFirstSid) {
        let sidValue = this.valueDec;
        if (this.valueDec <= 39)
          result = "0.";
        else {
          if (this.valueDec <= 79) {
            result = "1.";
            sidValue -= 40;
          } else {
            result = "2.";
            sidValue -= 80;
          }
        }
        result += sidValue.toString();
      } else
        result = this.valueDec.toString();
    }
    return result;
  }
  toJSON() {
    return {
      ...super.toJSON(),
      valueDec: this.valueDec,
      isFirstSid: this.isFirstSid
    };
  }
}
LocalSidValueBlock.NAME = "sidBlock";
class LocalObjectIdentifierValueBlock extends ValueBlock {
  constructor({ value = EMPTY_STRING, ...parameters } = {}) {
    super(parameters);
    this.value = [];
    if (value) {
      this.fromString(value);
    }
  }
  fromBER(inputBuffer, inputOffset, inputLength) {
    let resultOffset = inputOffset;
    while (inputLength > 0) {
      const sidBlock = new LocalSidValueBlock();
      resultOffset = sidBlock.fromBER(inputBuffer, resultOffset, inputLength);
      if (resultOffset === -1) {
        this.blockLength = 0;
        this.error = sidBlock.error;
        return resultOffset;
      }
      if (this.value.length === 0)
        sidBlock.isFirstSid = true;
      this.blockLength += sidBlock.blockLength;
      inputLength -= sidBlock.blockLength;
      this.value.push(sidBlock);
    }
    return resultOffset;
  }
  toBER(sizeOnly) {
    const retBuffers = [];
    for (let i = 0; i < this.value.length; i++) {
      const valueBuf = this.value[i].toBER(sizeOnly);
      if (valueBuf.byteLength === 0) {
        this.error = this.value[i].error;
        return EMPTY_BUFFER;
      }
      retBuffers.push(valueBuf);
    }
    return concat$1(retBuffers);
  }
  fromString(string) {
    this.value = [];
    let pos1 = 0;
    let pos2 = 0;
    let sid = "";
    let flag = false;
    do {
      pos2 = string.indexOf(".", pos1);
      if (pos2 === -1)
        sid = string.substring(pos1);
      else
        sid = string.substring(pos1, pos2);
      pos1 = pos2 + 1;
      if (flag) {
        const sidBlock = this.value[0];
        let plus = 0;
        switch (sidBlock.valueDec) {
          case 0:
            break;
          case 1:
            plus = 40;
            break;
          case 2:
            plus = 80;
            break;
          default:
            this.value = [];
            return;
        }
        const parsedSID = parseInt(sid, 10);
        if (isNaN(parsedSID))
          return;
        sidBlock.valueDec = parsedSID + plus;
        flag = false;
      } else {
        const sidBlock = new LocalSidValueBlock();
        if (sid > Number.MAX_SAFE_INTEGER) {
          assertBigInt();
          const sidValue = BigInt(sid);
          sidBlock.valueBigInt = sidValue;
        } else {
          sidBlock.valueDec = parseInt(sid, 10);
          if (isNaN(sidBlock.valueDec))
            return;
        }
        if (!this.value.length) {
          sidBlock.isFirstSid = true;
          flag = true;
        }
        this.value.push(sidBlock);
      }
    } while (pos2 !== -1);
  }
  toString() {
    let result = "";
    let isHexOnly = false;
    for (let i = 0; i < this.value.length; i++) {
      isHexOnly = this.value[i].isHexOnly;
      let sidStr = this.value[i].toString();
      if (i !== 0)
        result = `${result}.`;
      if (isHexOnly) {
        sidStr = `{${sidStr}}`;
        if (this.value[i].isFirstSid)
          result = `2.{${sidStr} - 80}`;
        else
          result += sidStr;
      } else
        result += sidStr;
    }
    return result;
  }
  toJSON() {
    const object = {
      ...super.toJSON(),
      value: this.toString(),
      sidArray: []
    };
    for (let i = 0; i < this.value.length; i++) {
      object.sidArray.push(this.value[i].toJSON());
    }
    return object;
  }
}
LocalObjectIdentifierValueBlock.NAME = "ObjectIdentifierValueBlock";
var _a$m;
class ObjectIdentifier extends BaseBlock {
  getValue() {
    return this.valueBlock.toString();
  }
  setValue(value) {
    this.valueBlock.fromString(value);
  }
  constructor(parameters = {}) {
    super(parameters, LocalObjectIdentifierValueBlock);
    this.idBlock.tagClass = 1;
    this.idBlock.tagNumber = 6;
  }
  onAsciiEncoding() {
    return `${this.constructor.NAME} : ${this.valueBlock.toString() || "empty"}`;
  }
  toJSON() {
    return {
      ...super.toJSON(),
      value: this.getValue()
    };
  }
}
_a$m = ObjectIdentifier;
(() => {
  typeStore.ObjectIdentifier = _a$m;
})();
ObjectIdentifier.NAME = "OBJECT IDENTIFIER";
class LocalRelativeSidValueBlock extends HexBlock(LocalBaseBlock) {
  constructor({ valueDec = 0, ...parameters } = {}) {
    super(parameters);
    this.valueDec = valueDec;
  }
  fromBER(inputBuffer, inputOffset, inputLength) {
    if (inputLength === 0)
      return inputOffset;
    const inputView = BufferSourceConverter.toUint8Array(inputBuffer);
    if (!checkBufferParams(this, inputView, inputOffset, inputLength))
      return -1;
    const intBuffer = inputView.subarray(inputOffset, inputOffset + inputLength);
    this.valueHexView = new Uint8Array(inputLength);
    for (let i = 0; i < inputLength; i++) {
      this.valueHexView[i] = intBuffer[i] & 127;
      this.blockLength++;
      if ((intBuffer[i] & 128) === 0)
        break;
    }
    const tempView = new Uint8Array(this.blockLength);
    for (let i = 0; i < this.blockLength; i++)
      tempView[i] = this.valueHexView[i];
    this.valueHexView = tempView;
    if ((intBuffer[this.blockLength - 1] & 128) !== 0) {
      this.error = "End of input reached before message was fully decoded";
      return -1;
    }
    if (this.valueHexView[0] === 0)
      this.warnings.push("Needlessly long format of SID encoding");
    if (this.blockLength <= 8)
      this.valueDec = utilFromBase(this.valueHexView, 7);
    else {
      this.isHexOnly = true;
      this.warnings.push("Too big SID for decoding, hex only");
    }
    return inputOffset + this.blockLength;
  }
  toBER(sizeOnly) {
    if (this.isHexOnly) {
      if (sizeOnly)
        return new ArrayBuffer(this.valueHexView.byteLength);
      const curView = this.valueHexView;
      const retView2 = new Uint8Array(this.blockLength);
      for (let i = 0; i < this.blockLength - 1; i++)
        retView2[i] = curView[i] | 128;
      retView2[this.blockLength - 1] = curView[this.blockLength - 1];
      return retView2.buffer;
    }
    const encodedBuf = utilToBase(this.valueDec, 7);
    if (encodedBuf.byteLength === 0) {
      this.error = "Error during encoding SID value";
      return EMPTY_BUFFER;
    }
    const retView = new Uint8Array(encodedBuf.byteLength);
    if (!sizeOnly) {
      const encodedView = new Uint8Array(encodedBuf);
      const len = encodedBuf.byteLength - 1;
      for (let i = 0; i < len; i++)
        retView[i] = encodedView[i] | 128;
      retView[len] = encodedView[len];
    }
    return retView.buffer;
  }
  toString() {
    let result = "";
    if (this.isHexOnly)
      result = Convert.ToHex(this.valueHexView);
    else {
      result = this.valueDec.toString();
    }
    return result;
  }
  toJSON() {
    return {
      ...super.toJSON(),
      valueDec: this.valueDec
    };
  }
}
LocalRelativeSidValueBlock.NAME = "relativeSidBlock";
class LocalRelativeObjectIdentifierValueBlock extends ValueBlock {
  constructor({ value = EMPTY_STRING, ...parameters } = {}) {
    super(parameters);
    this.value = [];
    if (value) {
      this.fromString(value);
    }
  }
  fromBER(inputBuffer, inputOffset, inputLength) {
    let resultOffset = inputOffset;
    while (inputLength > 0) {
      const sidBlock = new LocalRelativeSidValueBlock();
      resultOffset = sidBlock.fromBER(inputBuffer, resultOffset, inputLength);
      if (resultOffset === -1) {
        this.blockLength = 0;
        this.error = sidBlock.error;
        return resultOffset;
      }
      this.blockLength += sidBlock.blockLength;
      inputLength -= sidBlock.blockLength;
      this.value.push(sidBlock);
    }
    return resultOffset;
  }
  toBER(sizeOnly, _writer) {
    const retBuffers = [];
    for (let i = 0; i < this.value.length; i++) {
      const valueBuf = this.value[i].toBER(sizeOnly);
      if (valueBuf.byteLength === 0) {
        this.error = this.value[i].error;
        return EMPTY_BUFFER;
      }
      retBuffers.push(valueBuf);
    }
    return concat$1(retBuffers);
  }
  fromString(string) {
    this.value = [];
    let pos1 = 0;
    let pos2 = 0;
    let sid = "";
    do {
      pos2 = string.indexOf(".", pos1);
      if (pos2 === -1)
        sid = string.substring(pos1);
      else
        sid = string.substring(pos1, pos2);
      pos1 = pos2 + 1;
      const sidBlock = new LocalRelativeSidValueBlock();
      sidBlock.valueDec = parseInt(sid, 10);
      if (isNaN(sidBlock.valueDec))
        return true;
      this.value.push(sidBlock);
    } while (pos2 !== -1);
    return true;
  }
  toString() {
    let result = "";
    let isHexOnly = false;
    for (let i = 0; i < this.value.length; i++) {
      isHexOnly = this.value[i].isHexOnly;
      let sidStr = this.value[i].toString();
      if (i !== 0)
        result = `${result}.`;
      if (isHexOnly) {
        sidStr = `{${sidStr}}`;
        result += sidStr;
      } else
        result += sidStr;
    }
    return result;
  }
  toJSON() {
    const object = {
      ...super.toJSON(),
      value: this.toString(),
      sidArray: []
    };
    for (let i = 0; i < this.value.length; i++)
      object.sidArray.push(this.value[i].toJSON());
    return object;
  }
}
LocalRelativeObjectIdentifierValueBlock.NAME = "RelativeObjectIdentifierValueBlock";
var _a$l;
class RelativeObjectIdentifier extends BaseBlock {
  getValue() {
    return this.valueBlock.toString();
  }
  setValue(value) {
    this.valueBlock.fromString(value);
  }
  constructor(parameters = {}) {
    super(parameters, LocalRelativeObjectIdentifierValueBlock);
    this.idBlock.tagClass = 1;
    this.idBlock.tagNumber = 13;
  }
  onAsciiEncoding() {
    return `${this.constructor.NAME} : ${this.valueBlock.toString() || "empty"}`;
  }
  toJSON() {
    return {
      ...super.toJSON(),
      value: this.getValue()
    };
  }
}
_a$l = RelativeObjectIdentifier;
(() => {
  typeStore.RelativeObjectIdentifier = _a$l;
})();
RelativeObjectIdentifier.NAME = "RelativeObjectIdentifier";
var _a$k;
class Sequence extends Constructed {
  constructor(parameters = {}) {
    super(parameters);
    this.idBlock.tagClass = 1;
    this.idBlock.tagNumber = 16;
  }
}
_a$k = Sequence;
(() => {
  typeStore.Sequence = _a$k;
})();
Sequence.NAME = "SEQUENCE";
var _a$j;
let Set$1 = class Set2 extends Constructed {
  constructor(parameters = {}) {
    super(parameters);
    this.idBlock.tagClass = 1;
    this.idBlock.tagNumber = 17;
  }
};
_a$j = Set$1;
(() => {
  typeStore.Set = _a$j;
})();
Set$1.NAME = "SET";
class LocalStringValueBlock extends HexBlock(ValueBlock) {
  constructor({ ...parameters } = {}) {
    super(parameters);
    this.isHexOnly = true;
    this.value = EMPTY_STRING;
  }
  toJSON() {
    return {
      ...super.toJSON(),
      value: this.value
    };
  }
}
LocalStringValueBlock.NAME = "StringValueBlock";
class LocalSimpleStringValueBlock extends LocalStringValueBlock {
}
LocalSimpleStringValueBlock.NAME = "SimpleStringValueBlock";
class LocalSimpleStringBlock extends BaseStringBlock {
  constructor({ ...parameters } = {}) {
    super(parameters, LocalSimpleStringValueBlock);
  }
  fromBuffer(inputBuffer) {
    this.valueBlock.value = String.fromCharCode.apply(null, BufferSourceConverter.toUint8Array(inputBuffer));
  }
  fromString(inputString) {
    const strLen = inputString.length;
    const view = this.valueBlock.valueHexView = new Uint8Array(strLen);
    for (let i = 0; i < strLen; i++)
      view[i] = inputString.charCodeAt(i);
    this.valueBlock.value = inputString;
  }
}
LocalSimpleStringBlock.NAME = "SIMPLE STRING";
class LocalUtf8StringValueBlock extends LocalSimpleStringBlock {
  fromBuffer(inputBuffer) {
    this.valueBlock.valueHexView = BufferSourceConverter.toUint8Array(inputBuffer);
    try {
      this.valueBlock.value = Convert.ToUtf8String(inputBuffer);
    } catch (ex) {
      this.warnings.push(`Error during "decodeURIComponent": ${ex}, using raw string`);
      this.valueBlock.value = Convert.ToBinary(inputBuffer);
    }
  }
  fromString(inputString) {
    this.valueBlock.valueHexView = new Uint8Array(Convert.FromUtf8String(inputString));
    this.valueBlock.value = inputString;
  }
}
LocalUtf8StringValueBlock.NAME = "Utf8StringValueBlock";
var _a$i;
class Utf8String extends LocalUtf8StringValueBlock {
  constructor(parameters = {}) {
    super(parameters);
    this.idBlock.tagClass = 1;
    this.idBlock.tagNumber = 12;
  }
}
_a$i = Utf8String;
(() => {
  typeStore.Utf8String = _a$i;
})();
Utf8String.NAME = "UTF8String";
class LocalBmpStringValueBlock extends LocalSimpleStringBlock {
  fromBuffer(inputBuffer) {
    this.valueBlock.value = Convert.ToUtf16String(inputBuffer);
    this.valueBlock.valueHexView = BufferSourceConverter.toUint8Array(inputBuffer);
  }
  fromString(inputString) {
    this.valueBlock.value = inputString;
    this.valueBlock.valueHexView = new Uint8Array(Convert.FromUtf16String(inputString));
  }
}
LocalBmpStringValueBlock.NAME = "BmpStringValueBlock";
var _a$h;
class BmpString extends LocalBmpStringValueBlock {
  constructor({ ...parameters } = {}) {
    super(parameters);
    this.idBlock.tagClass = 1;
    this.idBlock.tagNumber = 30;
  }
}
_a$h = BmpString;
(() => {
  typeStore.BmpString = _a$h;
})();
BmpString.NAME = "BMPString";
class LocalUniversalStringValueBlock extends LocalSimpleStringBlock {
  fromBuffer(inputBuffer) {
    const copyBuffer = ArrayBuffer.isView(inputBuffer) ? inputBuffer.slice().buffer : inputBuffer.slice(0);
    const valueView = new Uint8Array(copyBuffer);
    for (let i = 0; i < valueView.length; i += 4) {
      valueView[i] = valueView[i + 3];
      valueView[i + 1] = valueView[i + 2];
      valueView[i + 2] = 0;
      valueView[i + 3] = 0;
    }
    this.valueBlock.value = String.fromCharCode.apply(null, new Uint32Array(copyBuffer));
  }
  fromString(inputString) {
    const strLength = inputString.length;
    const valueHexView = this.valueBlock.valueHexView = new Uint8Array(strLength * 4);
    for (let i = 0; i < strLength; i++) {
      const codeBuf = utilToBase(inputString.charCodeAt(i), 8);
      const codeView = new Uint8Array(codeBuf);
      if (codeView.length > 4)
        continue;
      const dif = 4 - codeView.length;
      for (let j = codeView.length - 1; j >= 0; j--)
        valueHexView[i * 4 + j + dif] = codeView[j];
    }
    this.valueBlock.value = inputString;
  }
}
LocalUniversalStringValueBlock.NAME = "UniversalStringValueBlock";
var _a$g;
class UniversalString extends LocalUniversalStringValueBlock {
  constructor({ ...parameters } = {}) {
    super(parameters);
    this.idBlock.tagClass = 1;
    this.idBlock.tagNumber = 28;
  }
}
_a$g = UniversalString;
(() => {
  typeStore.UniversalString = _a$g;
})();
UniversalString.NAME = "UniversalString";
var _a$f;
class NumericString extends LocalSimpleStringBlock {
  constructor(parameters = {}) {
    super(parameters);
    this.idBlock.tagClass = 1;
    this.idBlock.tagNumber = 18;
  }
}
_a$f = NumericString;
(() => {
  typeStore.NumericString = _a$f;
})();
NumericString.NAME = "NumericString";
var _a$e;
class PrintableString extends LocalSimpleStringBlock {
  constructor(parameters = {}) {
    super(parameters);
    this.idBlock.tagClass = 1;
    this.idBlock.tagNumber = 19;
  }
}
_a$e = PrintableString;
(() => {
  typeStore.PrintableString = _a$e;
})();
PrintableString.NAME = "PrintableString";
var _a$d;
class TeletexString extends LocalSimpleStringBlock {
  constructor(parameters = {}) {
    super(parameters);
    this.idBlock.tagClass = 1;
    this.idBlock.tagNumber = 20;
  }
}
_a$d = TeletexString;
(() => {
  typeStore.TeletexString = _a$d;
})();
TeletexString.NAME = "TeletexString";
var _a$c;
class VideotexString extends LocalSimpleStringBlock {
  constructor(parameters = {}) {
    super(parameters);
    this.idBlock.tagClass = 1;
    this.idBlock.tagNumber = 21;
  }
}
_a$c = VideotexString;
(() => {
  typeStore.VideotexString = _a$c;
})();
VideotexString.NAME = "VideotexString";
var _a$b;
class IA5String extends LocalSimpleStringBlock {
  constructor(parameters = {}) {
    super(parameters);
    this.idBlock.tagClass = 1;
    this.idBlock.tagNumber = 22;
  }
}
_a$b = IA5String;
(() => {
  typeStore.IA5String = _a$b;
})();
IA5String.NAME = "IA5String";
var _a$a;
class GraphicString extends LocalSimpleStringBlock {
  constructor(parameters = {}) {
    super(parameters);
    this.idBlock.tagClass = 1;
    this.idBlock.tagNumber = 25;
  }
}
_a$a = GraphicString;
(() => {
  typeStore.GraphicString = _a$a;
})();
GraphicString.NAME = "GraphicString";
var _a$9;
class VisibleString extends LocalSimpleStringBlock {
  constructor(parameters = {}) {
    super(parameters);
    this.idBlock.tagClass = 1;
    this.idBlock.tagNumber = 26;
  }
}
_a$9 = VisibleString;
(() => {
  typeStore.VisibleString = _a$9;
})();
VisibleString.NAME = "VisibleString";
var _a$8;
class GeneralString extends LocalSimpleStringBlock {
  constructor(parameters = {}) {
    super(parameters);
    this.idBlock.tagClass = 1;
    this.idBlock.tagNumber = 27;
  }
}
_a$8 = GeneralString;
(() => {
  typeStore.GeneralString = _a$8;
})();
GeneralString.NAME = "GeneralString";
var _a$7;
class CharacterString extends LocalSimpleStringBlock {
  constructor(parameters = {}) {
    super(parameters);
    this.idBlock.tagClass = 1;
    this.idBlock.tagNumber = 29;
  }
}
_a$7 = CharacterString;
(() => {
  typeStore.CharacterString = _a$7;
})();
CharacterString.NAME = "CharacterString";
var _a$6;
class UTCTime extends VisibleString {
  constructor({ value, valueDate, ...parameters } = {}) {
    super(parameters);
    this.year = 0;
    this.month = 0;
    this.day = 0;
    this.hour = 0;
    this.minute = 0;
    this.second = 0;
    if (value) {
      this.fromString(value);
      this.valueBlock.valueHexView = new Uint8Array(value.length);
      for (let i = 0; i < value.length; i++)
        this.valueBlock.valueHexView[i] = value.charCodeAt(i);
    }
    if (valueDate) {
      this.fromDate(valueDate);
      this.valueBlock.valueHexView = new Uint8Array(this.toBuffer());
    }
    this.idBlock.tagClass = 1;
    this.idBlock.tagNumber = 23;
  }
  fromBuffer(inputBuffer) {
    this.fromString(String.fromCharCode.apply(null, BufferSourceConverter.toUint8Array(inputBuffer)));
  }
  toBuffer() {
    const str = this.toString();
    const buffer = new ArrayBuffer(str.length);
    const view = new Uint8Array(buffer);
    for (let i = 0; i < str.length; i++)
      view[i] = str.charCodeAt(i);
    return buffer;
  }
  fromDate(inputDate) {
    this.year = inputDate.getUTCFullYear();
    this.month = inputDate.getUTCMonth() + 1;
    this.day = inputDate.getUTCDate();
    this.hour = inputDate.getUTCHours();
    this.minute = inputDate.getUTCMinutes();
    this.second = inputDate.getUTCSeconds();
  }
  toDate() {
    return new Date(Date.UTC(this.year, this.month - 1, this.day, this.hour, this.minute, this.second));
  }
  fromString(inputString) {
    const parser = /(\d{2})(\d{2})(\d{2})(\d{2})(\d{2})(\d{2})Z/ig;
    const parserArray = parser.exec(inputString);
    if (parserArray === null) {
      this.error = "Wrong input string for conversion";
      return;
    }
    const year = parseInt(parserArray[1], 10);
    if (year >= 50)
      this.year = 1900 + year;
    else
      this.year = 2e3 + year;
    this.month = parseInt(parserArray[2], 10);
    this.day = parseInt(parserArray[3], 10);
    this.hour = parseInt(parserArray[4], 10);
    this.minute = parseInt(parserArray[5], 10);
    this.second = parseInt(parserArray[6], 10);
  }
  toString(encoding = "iso") {
    if (encoding === "iso") {
      const outputArray = new Array(7);
      outputArray[0] = padNumber(this.year < 2e3 ? this.year - 1900 : this.year - 2e3, 2);
      outputArray[1] = padNumber(this.month, 2);
      outputArray[2] = padNumber(this.day, 2);
      outputArray[3] = padNumber(this.hour, 2);
      outputArray[4] = padNumber(this.minute, 2);
      outputArray[5] = padNumber(this.second, 2);
      outputArray[6] = "Z";
      return outputArray.join("");
    }
    return super.toString(encoding);
  }
  onAsciiEncoding() {
    return `${this.constructor.NAME} : ${this.toDate().toISOString()}`;
  }
  toJSON() {
    return {
      ...super.toJSON(),
      year: this.year,
      month: this.month,
      day: this.day,
      hour: this.hour,
      minute: this.minute,
      second: this.second
    };
  }
}
_a$6 = UTCTime;
(() => {
  typeStore.UTCTime = _a$6;
})();
UTCTime.NAME = "UTCTime";
var _a$5;
class GeneralizedTime extends UTCTime {
  constructor(parameters = {}) {
    var _b;
    super(parameters);
    (_b = this.millisecond) !== null && _b !== void 0 ? _b : this.millisecond = 0;
    this.idBlock.tagClass = 1;
    this.idBlock.tagNumber = 24;
  }
  fromDate(inputDate) {
    super.fromDate(inputDate);
    this.millisecond = inputDate.getUTCMilliseconds();
  }
  toDate() {
    const utcDate = Date.UTC(this.year, this.month - 1, this.day, this.hour, this.minute, this.second, this.millisecond);
    return new Date(utcDate);
  }
  fromString(inputString) {
    let isUTC = false;
    let timeString = "";
    let dateTimeString = "";
    let fractionPart = 0;
    let parser;
    let hourDifference = 0;
    let minuteDifference = 0;
    if (inputString[inputString.length - 1] === "Z") {
      timeString = inputString.substring(0, inputString.length - 1);
      isUTC = true;
    } else {
      const number = new Number(inputString[inputString.length - 1]);
      if (isNaN(number.valueOf()))
        throw new Error("Wrong input string for conversion");
      timeString = inputString;
    }
    if (isUTC) {
      if (timeString.indexOf("+") !== -1)
        throw new Error("Wrong input string for conversion");
      if (timeString.indexOf("-") !== -1)
        throw new Error("Wrong input string for conversion");
    } else {
      let multiplier = 1;
      let differencePosition = timeString.indexOf("+");
      let differenceString = "";
      if (differencePosition === -1) {
        differencePosition = timeString.indexOf("-");
        multiplier = -1;
      }
      if (differencePosition !== -1) {
        differenceString = timeString.substring(differencePosition + 1);
        timeString = timeString.substring(0, differencePosition);
        if (differenceString.length !== 2 && differenceString.length !== 4)
          throw new Error("Wrong input string for conversion");
        let number = parseInt(differenceString.substring(0, 2), 10);
        if (isNaN(number.valueOf()))
          throw new Error("Wrong input string for conversion");
        hourDifference = multiplier * number;
        if (differenceString.length === 4) {
          number = parseInt(differenceString.substring(2, 4), 10);
          if (isNaN(number.valueOf()))
            throw new Error("Wrong input string for conversion");
          minuteDifference = multiplier * number;
        }
      }
    }
    let fractionPointPosition = timeString.indexOf(".");
    if (fractionPointPosition === -1)
      fractionPointPosition = timeString.indexOf(",");
    if (fractionPointPosition !== -1) {
      const fractionPartCheck = new Number(`0${timeString.substring(fractionPointPosition)}`);
      if (isNaN(fractionPartCheck.valueOf()))
        throw new Error("Wrong input string for conversion");
      fractionPart = fractionPartCheck.valueOf();
      dateTimeString = timeString.substring(0, fractionPointPosition);
    } else
      dateTimeString = timeString;
    switch (true) {
      case dateTimeString.length === 8:
        parser = /(\d{4})(\d{2})(\d{2})/ig;
        if (fractionPointPosition !== -1)
          throw new Error("Wrong input string for conversion");
        break;
      case dateTimeString.length === 10:
        parser = /(\d{4})(\d{2})(\d{2})(\d{2})/ig;
        if (fractionPointPosition !== -1) {
          let fractionResult = 60 * fractionPart;
          this.minute = Math.floor(fractionResult);
          fractionResult = 60 * (fractionResult - this.minute);
          this.second = Math.floor(fractionResult);
          fractionResult = 1e3 * (fractionResult - this.second);
          this.millisecond = Math.floor(fractionResult);
        }
        break;
      case dateTimeString.length === 12:
        parser = /(\d{4})(\d{2})(\d{2})(\d{2})(\d{2})/ig;
        if (fractionPointPosition !== -1) {
          let fractionResult = 60 * fractionPart;
          this.second = Math.floor(fractionResult);
          fractionResult = 1e3 * (fractionResult - this.second);
          this.millisecond = Math.floor(fractionResult);
        }
        break;
      case dateTimeString.length === 14:
        parser = /(\d{4})(\d{2})(\d{2})(\d{2})(\d{2})(\d{2})/ig;
        if (fractionPointPosition !== -1) {
          const fractionResult = 1e3 * fractionPart;
          this.millisecond = Math.floor(fractionResult);
        }
        break;
      default:
        throw new Error("Wrong input string for conversion");
    }
    const parserArray = parser.exec(dateTimeString);
    if (parserArray === null)
      throw new Error("Wrong input string for conversion");
    for (let j = 1; j < parserArray.length; j++) {
      switch (j) {
        case 1:
          this.year = parseInt(parserArray[j], 10);
          break;
        case 2:
          this.month = parseInt(parserArray[j], 10);
          break;
        case 3:
          this.day = parseInt(parserArray[j], 10);
          break;
        case 4:
          this.hour = parseInt(parserArray[j], 10) + hourDifference;
          break;
        case 5:
          this.minute = parseInt(parserArray[j], 10) + minuteDifference;
          break;
        case 6:
          this.second = parseInt(parserArray[j], 10);
          break;
        default:
          throw new Error("Wrong input string for conversion");
      }
    }
    if (isUTC === false) {
      const tempDate = new Date(this.year, this.month, this.day, this.hour, this.minute, this.second, this.millisecond);
      this.year = tempDate.getUTCFullYear();
      this.month = tempDate.getUTCMonth();
      this.day = tempDate.getUTCDay();
      this.hour = tempDate.getUTCHours();
      this.minute = tempDate.getUTCMinutes();
      this.second = tempDate.getUTCSeconds();
      this.millisecond = tempDate.getUTCMilliseconds();
    }
  }
  toString(encoding = "iso") {
    if (encoding === "iso") {
      const outputArray = [];
      outputArray.push(padNumber(this.year, 4));
      outputArray.push(padNumber(this.month, 2));
      outputArray.push(padNumber(this.day, 2));
      outputArray.push(padNumber(this.hour, 2));
      outputArray.push(padNumber(this.minute, 2));
      outputArray.push(padNumber(this.second, 2));
      if (this.millisecond !== 0) {
        outputArray.push(".");
        outputArray.push(padNumber(this.millisecond, 3));
      }
      outputArray.push("Z");
      return outputArray.join("");
    }
    return super.toString(encoding);
  }
  toJSON() {
    return {
      ...super.toJSON(),
      millisecond: this.millisecond
    };
  }
}
_a$5 = GeneralizedTime;
(() => {
  typeStore.GeneralizedTime = _a$5;
})();
GeneralizedTime.NAME = "GeneralizedTime";
var _a$4;
class DATE extends Utf8String {
  constructor(parameters = {}) {
    super(parameters);
    this.idBlock.tagClass = 1;
    this.idBlock.tagNumber = 31;
  }
}
_a$4 = DATE;
(() => {
  typeStore.DATE = _a$4;
})();
DATE.NAME = "DATE";
var _a$3;
class TimeOfDay extends Utf8String {
  constructor(parameters = {}) {
    super(parameters);
    this.idBlock.tagClass = 1;
    this.idBlock.tagNumber = 32;
  }
}
_a$3 = TimeOfDay;
(() => {
  typeStore.TimeOfDay = _a$3;
})();
TimeOfDay.NAME = "TimeOfDay";
var _a$2;
class DateTime extends Utf8String {
  constructor(parameters = {}) {
    super(parameters);
    this.idBlock.tagClass = 1;
    this.idBlock.tagNumber = 33;
  }
}
_a$2 = DateTime;
(() => {
  typeStore.DateTime = _a$2;
})();
DateTime.NAME = "DateTime";
var _a$1;
class Duration extends Utf8String {
  constructor(parameters = {}) {
    super(parameters);
    this.idBlock.tagClass = 1;
    this.idBlock.tagNumber = 34;
  }
}
_a$1 = Duration;
(() => {
  typeStore.Duration = _a$1;
})();
Duration.NAME = "Duration";
var _a$x;
class TIME extends Utf8String {
  constructor(parameters = {}) {
    super(parameters);
    this.idBlock.tagClass = 1;
    this.idBlock.tagNumber = 14;
  }
}
_a$x = TIME;
(() => {
  typeStore.TIME = _a$x;
})();
TIME.NAME = "TIME";
class Any {
  constructor({ name = EMPTY_STRING, optional = false } = {}) {
    this.name = name;
    this.optional = optional;
  }
}
class Choice extends Any {
  constructor({ value = [], ...parameters } = {}) {
    super(parameters);
    this.value = value;
  }
}
class Repeated extends Any {
  constructor({ value = new Any(), local = false, ...parameters } = {}) {
    super(parameters);
    this.value = value;
    this.local = local;
  }
}
class RawData {
  get data() {
    return this.dataView.slice().buffer;
  }
  set data(value) {
    this.dataView = BufferSourceConverter.toUint8Array(value);
  }
  constructor({ data = EMPTY_VIEW } = {}) {
    this.dataView = BufferSourceConverter.toUint8Array(data);
  }
  fromBER(inputBuffer, inputOffset, inputLength) {
    const endLength = inputOffset + inputLength;
    this.dataView = BufferSourceConverter.toUint8Array(inputBuffer).subarray(inputOffset, endLength);
    return endLength;
  }
  toBER(_sizeOnly) {
    return this.dataView.slice().buffer;
  }
}
function compareSchema(root, inputData, inputSchema) {
  if (inputSchema instanceof Choice) {
    for (const element of inputSchema.value) {
      const result = compareSchema(root, inputData, element);
      if (result.verified) {
        return {
          verified: true,
          result: root
        };
      }
    }
    {
      const _result = {
        verified: false,
        result: { error: "Wrong values for Choice type" }
      };
      if (inputSchema.hasOwnProperty(NAME$1))
        _result.name = inputSchema.name;
      return _result;
    }
  }
  if (inputSchema instanceof Any) {
    if (inputSchema.hasOwnProperty(NAME$1))
      root[inputSchema.name] = inputData;
    return {
      verified: true,
      result: root
    };
  }
  if (root instanceof Object === false) {
    return {
      verified: false,
      result: { error: "Wrong root object" }
    };
  }
  if (inputData instanceof Object === false) {
    return {
      verified: false,
      result: { error: "Wrong ASN.1 data" }
    };
  }
  if (inputSchema instanceof Object === false) {
    return {
      verified: false,
      result: { error: "Wrong ASN.1 schema" }
    };
  }
  if (ID_BLOCK in inputSchema === false) {
    return {
      verified: false,
      result: { error: "Wrong ASN.1 schema" }
    };
  }
  if (FROM_BER in inputSchema.idBlock === false) {
    return {
      verified: false,
      result: { error: "Wrong ASN.1 schema" }
    };
  }
  if (TO_BER in inputSchema.idBlock === false) {
    return {
      verified: false,
      result: { error: "Wrong ASN.1 schema" }
    };
  }
  const encodedId = inputSchema.idBlock.toBER(false);
  if (encodedId.byteLength === 0) {
    return {
      verified: false,
      result: { error: "Error encoding idBlock for ASN.1 schema" }
    };
  }
  const decodedOffset = inputSchema.idBlock.fromBER(encodedId, 0, encodedId.byteLength);
  if (decodedOffset === -1) {
    return {
      verified: false,
      result: { error: "Error decoding idBlock for ASN.1 schema" }
    };
  }
  if (inputSchema.idBlock.hasOwnProperty(TAG_CLASS) === false) {
    return {
      verified: false,
      result: { error: "Wrong ASN.1 schema" }
    };
  }
  if (inputSchema.idBlock.tagClass !== inputData.idBlock.tagClass) {
    return {
      verified: false,
      result: root
    };
  }
  if (inputSchema.idBlock.hasOwnProperty(TAG_NUMBER) === false) {
    return {
      verified: false,
      result: { error: "Wrong ASN.1 schema" }
    };
  }
  if (inputSchema.idBlock.tagNumber !== inputData.idBlock.tagNumber) {
    return {
      verified: false,
      result: root
    };
  }
  if (inputSchema.idBlock.hasOwnProperty(IS_CONSTRUCTED) === false) {
    return {
      verified: false,
      result: { error: "Wrong ASN.1 schema" }
    };
  }
  if (inputSchema.idBlock.isConstructed !== inputData.idBlock.isConstructed) {
    return {
      verified: false,
      result: root
    };
  }
  if (!(IS_HEX_ONLY in inputSchema.idBlock)) {
    return {
      verified: false,
      result: { error: "Wrong ASN.1 schema" }
    };
  }
  if (inputSchema.idBlock.isHexOnly !== inputData.idBlock.isHexOnly) {
    return {
      verified: false,
      result: root
    };
  }
  if (inputSchema.idBlock.isHexOnly) {
    if (VALUE_HEX_VIEW in inputSchema.idBlock === false) {
      return {
        verified: false,
        result: { error: "Wrong ASN.1 schema" }
      };
    }
    const schemaView = inputSchema.idBlock.valueHexView;
    const asn1View = inputData.idBlock.valueHexView;
    if (schemaView.length !== asn1View.length) {
      return {
        verified: false,
        result: root
      };
    }
    for (let i = 0; i < schemaView.length; i++) {
      if (schemaView[i] !== asn1View[1]) {
        return {
          verified: false,
          result: root
        };
      }
    }
  }
  if (inputSchema.name) {
    inputSchema.name = inputSchema.name.replace(/^\s+|\s+$/g, EMPTY_STRING);
    if (inputSchema.name)
      root[inputSchema.name] = inputData;
  }
  if (inputSchema instanceof typeStore.Constructed) {
    let admission = 0;
    let result = {
      verified: false,
      result: { error: "Unknown error" }
    };
    let maxLength = inputSchema.valueBlock.value.length;
    if (maxLength > 0) {
      if (inputSchema.valueBlock.value[0] instanceof Repeated) {
        maxLength = inputData.valueBlock.value.length;
      }
    }
    if (maxLength === 0) {
      return {
        verified: true,
        result: root
      };
    }
    if (inputData.valueBlock.value.length === 0 && inputSchema.valueBlock.value.length !== 0) {
      let _optional = true;
      for (let i = 0; i < inputSchema.valueBlock.value.length; i++)
        _optional = _optional && (inputSchema.valueBlock.value[i].optional || false);
      if (_optional) {
        return {
          verified: true,
          result: root
        };
      }
      if (inputSchema.name) {
        inputSchema.name = inputSchema.name.replace(/^\s+|\s+$/g, EMPTY_STRING);
        if (inputSchema.name)
          delete root[inputSchema.name];
      }
      root.error = "Inconsistent object length";
      return {
        verified: false,
        result: root
      };
    }
    for (let i = 0; i < maxLength; i++) {
      if (i - admission >= inputData.valueBlock.value.length) {
        if (inputSchema.valueBlock.value[i].optional === false) {
          const _result = {
            verified: false,
            result: root
          };
          root.error = "Inconsistent length between ASN.1 data and schema";
          if (inputSchema.name) {
            inputSchema.name = inputSchema.name.replace(/^\s+|\s+$/g, EMPTY_STRING);
            if (inputSchema.name) {
              delete root[inputSchema.name];
              _result.name = inputSchema.name;
            }
          }
          return _result;
        }
      } else {
        if (inputSchema.valueBlock.value[0] instanceof Repeated) {
          result = compareSchema(root, inputData.valueBlock.value[i], inputSchema.valueBlock.value[0].value);
          if (result.verified === false) {
            if (inputSchema.valueBlock.value[0].optional)
              admission++;
            else {
              if (inputSchema.name) {
                inputSchema.name = inputSchema.name.replace(/^\s+|\s+$/g, EMPTY_STRING);
                if (inputSchema.name)
                  delete root[inputSchema.name];
              }
              return result;
            }
          }
          if (NAME$1 in inputSchema.valueBlock.value[0] && inputSchema.valueBlock.value[0].name.length > 0) {
            let arrayRoot = {};
            if (LOCAL in inputSchema.valueBlock.value[0] && inputSchema.valueBlock.value[0].local)
              arrayRoot = inputData;
            else
              arrayRoot = root;
            if (typeof arrayRoot[inputSchema.valueBlock.value[0].name] === "undefined")
              arrayRoot[inputSchema.valueBlock.value[0].name] = [];
            arrayRoot[inputSchema.valueBlock.value[0].name].push(inputData.valueBlock.value[i]);
          }
        } else {
          result = compareSchema(root, inputData.valueBlock.value[i - admission], inputSchema.valueBlock.value[i]);
          if (result.verified === false) {
            if (inputSchema.valueBlock.value[i].optional)
              admission++;
            else {
              if (inputSchema.name) {
                inputSchema.name = inputSchema.name.replace(/^\s+|\s+$/g, EMPTY_STRING);
                if (inputSchema.name)
                  delete root[inputSchema.name];
              }
              return result;
            }
          }
        }
      }
    }
    if (result.verified === false) {
      const _result = {
        verified: false,
        result: root
      };
      if (inputSchema.name) {
        inputSchema.name = inputSchema.name.replace(/^\s+|\s+$/g, EMPTY_STRING);
        if (inputSchema.name) {
          delete root[inputSchema.name];
          _result.name = inputSchema.name;
        }
      }
      return _result;
    }
    return {
      verified: true,
      result: root
    };
  }
  if (inputSchema.primitiveSchema && VALUE_HEX_VIEW in inputData.valueBlock) {
    const asn1 = localFromBER(inputData.valueBlock.valueHexView);
    if (asn1.offset === -1) {
      const _result = {
        verified: false,
        result: asn1.result
      };
      if (inputSchema.name) {
        inputSchema.name = inputSchema.name.replace(/^\s+|\s+$/g, EMPTY_STRING);
        if (inputSchema.name) {
          delete root[inputSchema.name];
          _result.name = inputSchema.name;
        }
      }
      return _result;
    }
    return compareSchema(root, asn1.result, inputSchema.primitiveSchema);
  }
  return {
    verified: true,
    result: root
  };
}
function verifySchema(inputBuffer, inputSchema) {
  if (inputSchema instanceof Object === false) {
    return {
      verified: false,
      result: { error: "Wrong ASN.1 schema type" }
    };
  }
  const asn1 = localFromBER(BufferSourceConverter.toUint8Array(inputBuffer));
  if (asn1.offset === -1) {
    return {
      verified: false,
      result: asn1.result
    };
  }
  return compareSchema(asn1.result, asn1.result, inputSchema);
}
const asn1js = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  Any,
  BaseBlock,
  BaseStringBlock,
  BitString: BitString$1,
  BmpString,
  Boolean: Boolean$1,
  CharacterString,
  Choice,
  Constructed,
  DATE,
  DEFAULT_MAX_CONTENT_LENGTH,
  DEFAULT_MAX_DEPTH,
  DEFAULT_MAX_NODES,
  DateTime,
  Duration,
  EndOfContent,
  Enumerated,
  GeneralString,
  GeneralizedTime,
  GraphicString,
  HexBlock,
  IA5String,
  Integer,
  Null,
  NumericString,
  ObjectIdentifier,
  OctetString: OctetString$1,
  Primitive,
  PrintableString,
  RawData,
  RelativeObjectIdentifier,
  Repeated,
  Sequence,
  Set: Set$1,
  TIME,
  TeletexString,
  TimeOfDay,
  UTCTime,
  UniversalString,
  Utf8String,
  ValueBlock,
  VideotexString,
  ViewWriter,
  VisibleString,
  compareSchema,
  fromBER,
  verifySchema
}, Symbol.toStringTag, { value: "Module" }));
const ARRAY_BUFFER_TAG = "[object ArrayBuffer]";
const SHARED_ARRAY_BUFFER_TAG = "[object SharedArrayBuffer]";
function tagOf(value) {
  return Object.prototype.toString.call(value);
}
function isArrayBufferViewLike(value) {
  if (ArrayBuffer.isView(value)) {
    return true;
  }
  if (!value || typeof value !== "object") {
    return false;
  }
  const view = value;
  return typeof view.byteOffset === "number" && typeof view.byteLength === "number" && isArrayBufferLike(view.buffer);
}
function isArrayBuffer(value) {
  return tagOf(value) === ARRAY_BUFFER_TAG;
}
function isSharedArrayBuffer(value) {
  return typeof SharedArrayBuffer !== "undefined" && tagOf(value) === SHARED_ARRAY_BUFFER_TAG;
}
function isArrayBufferLike(value) {
  return isArrayBuffer(value) || isSharedArrayBuffer(value);
}
function isArrayBufferView(value) {
  return isArrayBufferViewLike(value);
}
function isBufferSource(value) {
  return isArrayBufferLike(value) || isArrayBufferView(value);
}
function assertBufferSource(value) {
  if (!isBufferSource(value)) {
    throw new TypeError("Expected ArrayBuffer, SharedArrayBuffer, or ArrayBufferView");
  }
}
function toUint8Array(data) {
  assertBufferSource(data);
  if (isArrayBufferLike(data)) {
    return new Uint8Array(data);
  }
  return new Uint8Array(data.buffer, data.byteOffset, data.byteLength);
}
function toArrayBuffer(data) {
  assertBufferSource(data);
  if (isArrayBuffer(data)) {
    return data;
  }
  const buffer = new ArrayBuffer(data.byteLength);
  new Uint8Array(buffer).set(toUint8Array(data));
  return buffer;
}
function equal(a, b, options = {}) {
  const left = toUint8Array(a);
  const right = toUint8Array(b);
  if (!options.constantTime && left.byteLength !== right.byteLength) {
    return false;
  }
  const length = Math.max(left.byteLength, right.byteLength);
  let diff = left.byteLength ^ right.byteLength;
  for (let i = 0; i < length; i++) {
    diff |= (left[i] ?? 0) ^ (right[i] ?? 0);
  }
  return diff === 0;
}
var AsnTypeTypes;
(function(AsnTypeTypes2) {
  AsnTypeTypes2[AsnTypeTypes2["Sequence"] = 0] = "Sequence";
  AsnTypeTypes2[AsnTypeTypes2["Set"] = 1] = "Set";
  AsnTypeTypes2[AsnTypeTypes2["Choice"] = 2] = "Choice";
})(AsnTypeTypes || (AsnTypeTypes = {}));
var AsnPropTypes;
(function(AsnPropTypes2) {
  AsnPropTypes2[AsnPropTypes2["Any"] = 1] = "Any";
  AsnPropTypes2[AsnPropTypes2["Boolean"] = 2] = "Boolean";
  AsnPropTypes2[AsnPropTypes2["OctetString"] = 3] = "OctetString";
  AsnPropTypes2[AsnPropTypes2["BitString"] = 4] = "BitString";
  AsnPropTypes2[AsnPropTypes2["Integer"] = 5] = "Integer";
  AsnPropTypes2[AsnPropTypes2["Enumerated"] = 6] = "Enumerated";
  AsnPropTypes2[AsnPropTypes2["ObjectIdentifier"] = 7] = "ObjectIdentifier";
  AsnPropTypes2[AsnPropTypes2["Utf8String"] = 8] = "Utf8String";
  AsnPropTypes2[AsnPropTypes2["BmpString"] = 9] = "BmpString";
  AsnPropTypes2[AsnPropTypes2["UniversalString"] = 10] = "UniversalString";
  AsnPropTypes2[AsnPropTypes2["NumericString"] = 11] = "NumericString";
  AsnPropTypes2[AsnPropTypes2["PrintableString"] = 12] = "PrintableString";
  AsnPropTypes2[AsnPropTypes2["TeletexString"] = 13] = "TeletexString";
  AsnPropTypes2[AsnPropTypes2["VideotexString"] = 14] = "VideotexString";
  AsnPropTypes2[AsnPropTypes2["IA5String"] = 15] = "IA5String";
  AsnPropTypes2[AsnPropTypes2["GraphicString"] = 16] = "GraphicString";
  AsnPropTypes2[AsnPropTypes2["VisibleString"] = 17] = "VisibleString";
  AsnPropTypes2[AsnPropTypes2["GeneralString"] = 18] = "GeneralString";
  AsnPropTypes2[AsnPropTypes2["CharacterString"] = 19] = "CharacterString";
  AsnPropTypes2[AsnPropTypes2["UTCTime"] = 20] = "UTCTime";
  AsnPropTypes2[AsnPropTypes2["GeneralizedTime"] = 21] = "GeneralizedTime";
  AsnPropTypes2[AsnPropTypes2["DATE"] = 22] = "DATE";
  AsnPropTypes2[AsnPropTypes2["TimeOfDay"] = 23] = "TimeOfDay";
  AsnPropTypes2[AsnPropTypes2["DateTime"] = 24] = "DateTime";
  AsnPropTypes2[AsnPropTypes2["Duration"] = 25] = "Duration";
  AsnPropTypes2[AsnPropTypes2["TIME"] = 26] = "TIME";
  AsnPropTypes2[AsnPropTypes2["Null"] = 27] = "Null";
})(AsnPropTypes || (AsnPropTypes = {}));
class BitString2 {
  unusedBits = 0;
  value = new ArrayBuffer(0);
  constructor(params, unusedBits = 0) {
    if (params) {
      if (typeof params === "number") {
        this.fromNumber(params);
      } else if (isBufferSource(params)) {
        this.unusedBits = unusedBits;
        this.value = toArrayBuffer(params);
      } else {
        throw TypeError("Unsupported type of 'params' argument for BitString");
      }
    }
  }
  fromASN(asn) {
    if (!(asn instanceof BitString$1)) {
      throw new TypeError("Argument 'asn' is not instance of ASN.1 BitString");
    }
    this.unusedBits = asn.valueBlock.unusedBits;
    this.value = toArrayBuffer(asn.valueBlock.valueHex);
    return this;
  }
  toASN() {
    return new BitString$1({
      unusedBits: this.unusedBits,
      valueHex: this.value
    });
  }
  toSchema(name) {
    return new BitString$1({ name });
  }
  toNumber() {
    let res = "";
    const uintArray = new Uint8Array(this.value);
    for (const octet of uintArray) {
      res += octet.toString(2).padStart(8, "0");
    }
    res = res.split("").reverse().join("");
    if (this.unusedBits) {
      res = res.slice(this.unusedBits).padStart(this.unusedBits, "0");
    }
    return parseInt(res, 2);
  }
  fromNumber(value) {
    let bits = value.toString(2);
    const octetSize = bits.length + 7 >> 3;
    this.unusedBits = (octetSize << 3) - bits.length;
    const octets = new Uint8Array(octetSize);
    bits = bits.padStart(octetSize << 3, "0").split("").reverse().join("");
    let index2 = 0;
    while (index2 < octetSize) {
      octets[index2] = parseInt(bits.slice(index2 << 3, (index2 << 3) + 8), 2);
      index2++;
    }
    this.value = octets.buffer;
  }
}
class OctetString2 {
  buffer;
  get byteLength() {
    return this.buffer.byteLength;
  }
  get byteOffset() {
    return 0;
  }
  constructor(param) {
    if (typeof param === "number") {
      this.buffer = new ArrayBuffer(param);
    } else {
      if (isBufferSource(param)) {
        this.buffer = toArrayBuffer(param);
      } else if (Array.isArray(param)) {
        this.buffer = new Uint8Array(param).buffer;
      } else {
        this.buffer = new ArrayBuffer(0);
      }
    }
  }
  fromASN(asn) {
    if (!(asn instanceof OctetString$1)) {
      throw new TypeError("Argument 'asn' is not instance of ASN.1 OctetString");
    }
    this.buffer = toArrayBuffer(asn.valueBlock.valueHex);
    return this;
  }
  toASN() {
    return new OctetString$1({ valueHex: this.buffer });
  }
  toSchema(name) {
    return new OctetString$1({ name });
  }
}
const AsnAnyConverter = {
  fromASN: (value) => value instanceof Null ? null : toArrayBuffer(value.valueBeforeDecodeView),
  toASN: (value) => {
    if (value === null) {
      return new Null();
    }
    const schema = fromBER(value);
    if (schema.result.error) {
      throw new Error(schema.result.error);
    }
    return schema.result;
  }
};
const AsnIntegerConverter = {
  fromASN: (value) => value.valueBlock.valueHexView.byteLength >= 4 ? value.valueBlock.toString() : value.valueBlock.valueDec,
  toASN: (value) => new Integer({ value: +value })
};
const AsnEnumeratedConverter = {
  fromASN: (value) => value.valueBlock.valueDec,
  toASN: (value) => new Enumerated({ value })
};
const AsnIntegerArrayBufferConverter = {
  fromASN: (value) => toArrayBuffer(value.valueBlock.valueHexView),
  toASN: (value) => new Integer({ valueHex: value })
};
const AsnBitStringConverter = {
  fromASN: (value) => toArrayBuffer(value.valueBlock.valueHexView),
  toASN: (value) => new BitString$1({ valueHex: value })
};
const AsnObjectIdentifierConverter = {
  fromASN: (value) => value.valueBlock.toString(),
  toASN: (value) => new ObjectIdentifier({ value })
};
const AsnBooleanConverter = {
  fromASN: (value) => value.valueBlock.value,
  toASN: (value) => new Boolean$1({ value })
};
const AsnOctetStringConverter = {
  fromASN: (value) => toArrayBuffer(value.valueBlock.valueHexView),
  toASN: (value) => new OctetString$1({ valueHex: value })
};
const AsnConstructedOctetStringConverter = {
  fromASN: (value) => new OctetString2(value.getValue()),
  toASN: (value) => value.toASN()
};
function createStringConverter(Asn1Type) {
  return {
    fromASN: (value) => value.valueBlock.value,
    toASN: (value) => new Asn1Type({ value })
  };
}
const AsnUtf8StringConverter = createStringConverter(Utf8String);
const AsnBmpStringConverter = createStringConverter(BmpString);
const AsnUniversalStringConverter = createStringConverter(UniversalString);
const AsnNumericStringConverter = createStringConverter(NumericString);
const AsnPrintableStringConverter = createStringConverter(PrintableString);
const AsnTeletexStringConverter = createStringConverter(TeletexString);
const AsnVideotexStringConverter = createStringConverter(VideotexString);
const AsnIA5StringConverter = createStringConverter(IA5String);
const AsnGraphicStringConverter = createStringConverter(GraphicString);
const AsnVisibleStringConverter = createStringConverter(VisibleString);
const AsnGeneralStringConverter = createStringConverter(GeneralString);
const AsnCharacterStringConverter = createStringConverter(CharacterString);
const AsnUTCTimeConverter = {
  fromASN: (value) => value.toDate(),
  toASN: (value) => new UTCTime({ valueDate: value })
};
const AsnGeneralizedTimeConverter = {
  fromASN: (value) => value.toDate(),
  toASN: (value) => new GeneralizedTime({ valueDate: value })
};
const AsnNullConverter = {
  fromASN: () => null,
  toASN: () => {
    return new Null();
  }
};
function defaultConverter(type) {
  switch (type) {
    case AsnPropTypes.Any:
      return AsnAnyConverter;
    case AsnPropTypes.BitString:
      return AsnBitStringConverter;
    case AsnPropTypes.BmpString:
      return AsnBmpStringConverter;
    case AsnPropTypes.Boolean:
      return AsnBooleanConverter;
    case AsnPropTypes.CharacterString:
      return AsnCharacterStringConverter;
    case AsnPropTypes.Enumerated:
      return AsnEnumeratedConverter;
    case AsnPropTypes.GeneralString:
      return AsnGeneralStringConverter;
    case AsnPropTypes.GeneralizedTime:
      return AsnGeneralizedTimeConverter;
    case AsnPropTypes.GraphicString:
      return AsnGraphicStringConverter;
    case AsnPropTypes.IA5String:
      return AsnIA5StringConverter;
    case AsnPropTypes.Integer:
      return AsnIntegerConverter;
    case AsnPropTypes.Null:
      return AsnNullConverter;
    case AsnPropTypes.NumericString:
      return AsnNumericStringConverter;
    case AsnPropTypes.ObjectIdentifier:
      return AsnObjectIdentifierConverter;
    case AsnPropTypes.OctetString:
      return AsnOctetStringConverter;
    case AsnPropTypes.PrintableString:
      return AsnPrintableStringConverter;
    case AsnPropTypes.TeletexString:
      return AsnTeletexStringConverter;
    case AsnPropTypes.UTCTime:
      return AsnUTCTimeConverter;
    case AsnPropTypes.UniversalString:
      return AsnUniversalStringConverter;
    case AsnPropTypes.Utf8String:
      return AsnUtf8StringConverter;
    case AsnPropTypes.VideotexString:
      return AsnVideotexStringConverter;
    case AsnPropTypes.VisibleString:
      return AsnVisibleStringConverter;
    default:
      return null;
  }
}
function isConvertible(target) {
  if (typeof target === "function" && target.prototype) {
    if (target.prototype.toASN && target.prototype.fromASN) {
      return true;
    } else {
      return isConvertible(target.prototype);
    }
  } else {
    return !!(target && typeof target === "object" && "toASN" in target && "fromASN" in target);
  }
}
function isTypeOfArray(target) {
  if (target) {
    const proto = Object.getPrototypeOf(target);
    if (proto?.prototype?.constructor === Array) {
      return true;
    }
    return isTypeOfArray(proto);
  }
  return false;
}
function isArrayEqual(bytes1, bytes2) {
  if (!(bytes1 && bytes2)) {
    return false;
  }
  if (bytes1.byteLength !== bytes2.byteLength) {
    return false;
  }
  const b1 = new Uint8Array(bytes1);
  const b2 = new Uint8Array(bytes2);
  for (let i = 0; i < bytes1.byteLength; i++) {
    if (b1[i] !== b2[i]) {
      return false;
    }
  }
  return true;
}
class AsnSchemaStorage {
  items = /* @__PURE__ */ new WeakMap();
  has(target) {
    return this.items.has(target);
  }
  get(target, checkSchema = false) {
    const schema = this.items.get(target);
    if (!schema) {
      throw new Error(`Cannot get schema for '${target.prototype.constructor.name}' target`);
    }
    if (checkSchema && !schema.schema) {
      throw new Error(`Schema '${target.prototype.constructor.name}' doesn't contain ASN.1 schema. Call 'AsnSchemaStorage.cache'.`);
    }
    return schema;
  }
  cache(target) {
    const schema = this.get(target);
    if (!schema.schema) {
      schema.schema = this.create(target, true);
    }
  }
  createDefault(target) {
    const schema = {
      type: AsnTypeTypes.Sequence,
      items: {}
    };
    const parentSchema = this.findParentSchema(target);
    if (parentSchema) {
      Object.assign(schema, parentSchema);
      schema.items = Object.assign({}, schema.items, parentSchema.items);
    }
    return schema;
  }
  create(target, useNames) {
    const schema = this.items.get(target) || this.createDefault(target);
    const asn1Value = [];
    for (const key2 in schema.items) {
      const item = schema.items[key2];
      const name = useNames ? key2 : "";
      let asn1Item;
      if (typeof item.type === "number") {
        const Asn1TypeName = AsnPropTypes[item.type];
        const Asn1Type = asn1js[Asn1TypeName];
        if (!Asn1Type) {
          throw new Error(`Cannot get ASN1 class by name '${Asn1TypeName}'`);
        }
        asn1Item = new Asn1Type({ name });
      } else if (isConvertible(item.type)) {
        const instance2 = new item.type();
        asn1Item = instance2.toSchema(name);
      } else if (item.optional) {
        const itemSchema = this.get(item.type);
        if (itemSchema.type === AsnTypeTypes.Choice) {
          asn1Item = new Any({ name });
        } else {
          asn1Item = this.create(item.type, false);
          asn1Item.name = name;
        }
      } else {
        asn1Item = new Any({ name });
      }
      const optional = !!item.optional || item.defaultValue !== void 0;
      if (item.repeated) {
        asn1Item.name = "";
        const Container = item.repeated === "set" ? Set$1 : Sequence;
        asn1Item = new Container({
          name: "",
          value: [new Repeated({
            name,
            value: asn1Item
          })]
        });
      }
      if (item.context !== null && item.context !== void 0) {
        if (item.implicit) {
          if (typeof item.type === "number" || isConvertible(item.type)) {
            const Container = item.repeated ? Constructed : Primitive;
            asn1Value.push(new Container({
              name,
              optional,
              idBlock: {
                tagClass: 3,
                tagNumber: item.context
              }
            }));
          } else {
            this.cache(item.type);
            const isRepeated = !!item.repeated;
            let value = !isRepeated ? this.get(item.type, true).schema : asn1Item;
            value = "valueBlock" in value ? value.valueBlock.value : value.value;
            asn1Value.push(new Constructed({
              name: !isRepeated ? name : "",
              optional,
              idBlock: {
                tagClass: 3,
                tagNumber: item.context
              },
              value
            }));
          }
        } else {
          asn1Value.push(new Constructed({
            optional,
            idBlock: {
              tagClass: 3,
              tagNumber: item.context
            },
            value: [asn1Item]
          }));
        }
      } else {
        asn1Item.optional = optional;
        asn1Value.push(asn1Item);
      }
    }
    switch (schema.type) {
      case AsnTypeTypes.Sequence:
        return new Sequence({
          value: asn1Value,
          name: ""
        });
      case AsnTypeTypes.Set:
        return new Set$1({
          value: asn1Value,
          name: ""
        });
      case AsnTypeTypes.Choice:
        return new Choice({
          value: asn1Value,
          name: ""
        });
      default:
        throw new Error("Unsupported ASN1 type in use");
    }
  }
  set(target, schema) {
    this.items.set(target, schema);
    return this;
  }
  findParentSchema(target) {
    const parent = Object.getPrototypeOf(target);
    if (parent) {
      const schema = this.items.get(parent);
      return schema || this.findParentSchema(parent);
    }
    return null;
  }
}
const schemaStorage = new AsnSchemaStorage();
const AsnType = (options) => (target) => {
  let schema;
  if (!schemaStorage.has(target)) {
    schema = schemaStorage.createDefault(target);
    schemaStorage.set(target, schema);
  } else {
    schema = schemaStorage.get(target);
  }
  Object.assign(schema, options);
};
const AsnProp = (options) => (target, propertyKey) => {
  let schema;
  if (!schemaStorage.has(target.constructor)) {
    schema = schemaStorage.createDefault(target.constructor);
    schemaStorage.set(target.constructor, schema);
  } else {
    schema = schemaStorage.get(target.constructor);
  }
  const copyOptions = Object.assign({}, options);
  if (typeof copyOptions.type === "number" && !copyOptions.converter) {
    const defaultConverter$1 = defaultConverter(options.type);
    if (!defaultConverter$1) {
      throw new Error(`Cannot get default converter for property '${propertyKey}' of ${target.constructor.name}`);
    }
    copyOptions.converter = defaultConverter$1;
  }
  copyOptions.raw = options.raw;
  schema.items[propertyKey] = copyOptions;
};
class AsnSchemaValidationError extends Error {
  schemas = [];
}
class AsnParser {
  static parse(data, target, options) {
    const asn1Parsed = fromBER(toArrayBuffer(data), options?.berOptions);
    if (asn1Parsed.result.error) {
      throw new Error(asn1Parsed.result.error);
    }
    const res = this.fromASN(asn1Parsed.result, target, options);
    return res;
  }
  static fromASN(asn1Schema, target, options) {
    try {
      if (isConvertible(target)) {
        const value = new target();
        return value.fromASN(asn1Schema);
      }
      const schema = schemaStorage.get(target);
      schemaStorage.cache(target);
      let targetSchema = schema.schema;
      const choiceResult = this.handleChoiceTypes(asn1Schema, schema, target, targetSchema, options);
      if (choiceResult?.result) {
        return choiceResult.result;
      }
      if (choiceResult?.targetSchema) {
        targetSchema = choiceResult.targetSchema;
      }
      const sequenceResult = this.handleSequenceTypes(asn1Schema, schema, target, targetSchema);
      const res = new target();
      if (isTypeOfArray(target)) {
        return this.handleArrayTypes(asn1Schema, schema, target, options);
      }
      this.processSchemaItems(schema, sequenceResult, res, options);
      return res;
    } catch (error) {
      if (error instanceof AsnSchemaValidationError) {
        error.schemas.push(target.name);
      }
      throw error;
    }
  }
  static handleChoiceTypes(asn1Schema, schema, target, targetSchema, options) {
    if (asn1Schema.constructor === Constructed && schema.type === AsnTypeTypes.Choice && asn1Schema.idBlock.tagClass === 3) {
      for (const key2 in schema.items) {
        const schemaItem = schema.items[key2];
        if (schemaItem.context === asn1Schema.idBlock.tagNumber && schemaItem.implicit) {
          if (typeof schemaItem.type === "function" && schemaStorage.has(schemaItem.type)) {
            const fieldSchema = schemaStorage.get(schemaItem.type);
            if (fieldSchema && fieldSchema.type === AsnTypeTypes.Sequence) {
              const newSeq = new Sequence();
              if ("value" in asn1Schema.valueBlock && Array.isArray(asn1Schema.valueBlock.value) && "value" in newSeq.valueBlock) {
                newSeq.valueBlock.value = asn1Schema.valueBlock.value;
                const fieldValue = this.fromASN(newSeq, schemaItem.type, options);
                const res = new target();
                res[key2] = fieldValue;
                return { result: res };
              }
            }
          }
        }
      }
    } else if (asn1Schema.constructor === Constructed && schema.type !== AsnTypeTypes.Choice) {
      const newTargetSchema = new Constructed({
        idBlock: {
          tagClass: 3,
          tagNumber: asn1Schema.idBlock.tagNumber
        },
        value: schema.schema.valueBlock.value
      });
      for (const key2 in schema.items) {
        delete asn1Schema[key2];
      }
      return { targetSchema: newTargetSchema };
    }
    return null;
  }
  static handleSequenceTypes(asn1Schema, schema, target, targetSchema) {
    if (schema.type === AsnTypeTypes.Sequence) {
      const asn1ComparedSchema = compareSchema({}, asn1Schema, targetSchema);
      if (!asn1ComparedSchema.verified) {
        throw new AsnSchemaValidationError(`Data does not match to ${target.name} ASN1 schema.${asn1ComparedSchema.result.error ? ` ${asn1ComparedSchema.result.error}` : ""}`);
      }
      return asn1ComparedSchema;
    } else {
      const asn1ComparedSchema = compareSchema({}, asn1Schema, targetSchema);
      if (!asn1ComparedSchema.verified) {
        throw new AsnSchemaValidationError(`Data does not match to ${target.name} ASN1 schema.${asn1ComparedSchema.result.error ? ` ${asn1ComparedSchema.result.error}` : ""}`);
      }
      return asn1ComparedSchema;
    }
  }
  static processRepeatedField(asn1Elements, asn1Index, schemaItem) {
    let elementsToProcess = asn1Elements.slice(asn1Index);
    if (elementsToProcess.length === 1 && elementsToProcess[0].constructor.name === "Sequence") {
      const seq = elementsToProcess[0];
      if (seq.valueBlock && seq.valueBlock.value && Array.isArray(seq.valueBlock.value)) {
        elementsToProcess = seq.valueBlock.value;
      }
    }
    if (typeof schemaItem.type === "number") {
      const converter = defaultConverter(schemaItem.type);
      if (!converter)
        throw new Error(`No converter for ASN.1 type ${schemaItem.type}`);
      return elementsToProcess.filter((el) => el && el.valueBlock).map((el) => {
        try {
          return converter.fromASN(el);
        } catch {
          return void 0;
        }
      }).filter((v) => v !== void 0);
    } else {
      return elementsToProcess.filter((el) => el && el.valueBlock).map((el) => {
        try {
          return this.fromASN(el, schemaItem.type);
        } catch {
          return void 0;
        }
      }).filter((v) => v !== void 0);
    }
  }
  static processPrimitiveField(asn1Element, schemaItem) {
    const converter = defaultConverter(schemaItem.type);
    if (!converter)
      throw new Error(`No converter for ASN.1 type ${schemaItem.type}`);
    return converter.fromASN(asn1Element);
  }
  static isOptionalChoiceField(schemaItem) {
    return schemaItem.optional && typeof schemaItem.type === "function" && schemaStorage.has(schemaItem.type) && schemaStorage.get(schemaItem.type).type === AsnTypeTypes.Choice;
  }
  static processOptionalChoiceField(asn1Element, schemaItem) {
    try {
      const value = this.fromASN(asn1Element, schemaItem.type);
      return {
        processed: true,
        value
      };
    } catch (err) {
      if (err instanceof AsnSchemaValidationError && /Wrong values for Choice type/.test(err.message)) {
        return { processed: false };
      }
      throw err;
    }
  }
  static handleArrayTypes(asn1Schema, schema, target, options) {
    if (!("value" in asn1Schema.valueBlock && Array.isArray(asn1Schema.valueBlock.value))) {
      throw new Error("Cannot get items from the ASN.1 parsed value. ASN.1 object is not constructed.");
    }
    const itemType = schema.itemType;
    if (typeof itemType === "number") {
      const converter = defaultConverter(itemType);
      if (!converter) {
        throw new Error(`Cannot get default converter for array item of ${target.name} ASN1 schema`);
      }
      return target.from(asn1Schema.valueBlock.value, (element) => converter.fromASN(element));
    } else {
      return target.from(asn1Schema.valueBlock.value, (element) => this.fromASN(element, itemType, options));
    }
  }
  static processSchemaItems(schema, asn1ComparedSchema, res, options) {
    for (const key2 in schema.items) {
      const asn1SchemaValue = asn1ComparedSchema.result[key2];
      if (!asn1SchemaValue) {
        continue;
      }
      const schemaItem = schema.items[key2];
      const schemaItemType = schemaItem.type;
      let parsedValue;
      if (typeof schemaItemType === "number" || isConvertible(schemaItemType)) {
        parsedValue = this.processPrimitiveSchemaItem(asn1SchemaValue, schemaItem, schemaItemType, options);
      } else {
        parsedValue = this.processComplexSchemaItem(asn1SchemaValue, schemaItem, schemaItemType, options);
      }
      if (parsedValue && typeof parsedValue === "object" && "value" in parsedValue && "raw" in parsedValue) {
        res[key2] = parsedValue.value;
        res[`${key2}Raw`] = parsedValue.raw;
      } else {
        res[key2] = parsedValue;
      }
    }
  }
  static processPrimitiveSchemaItem(asn1SchemaValue, schemaItem, schemaItemType, options) {
    const converter = schemaItem.converter ?? (isConvertible(schemaItemType) ? new schemaItemType() : null);
    if (!converter) {
      throw new Error("Converter is empty");
    }
    if (schemaItem.repeated) {
      return this.processRepeatedPrimitiveItem(asn1SchemaValue, schemaItem, converter, options);
    } else {
      return this.processSinglePrimitiveItem(asn1SchemaValue, schemaItem, schemaItemType, converter, options);
    }
  }
  static processRepeatedPrimitiveItem(asn1SchemaValue, schemaItem, converter, options) {
    if (schemaItem.implicit) {
      const Container = schemaItem.repeated === "sequence" ? Sequence : Set$1;
      const newItem = new Container();
      newItem.valueBlock = asn1SchemaValue.valueBlock;
      const newItemAsn = fromBER(newItem.toBER(false), options?.berOptions);
      if (newItemAsn.offset === -1) {
        throw new Error(`Cannot parse the child item. ${newItemAsn.result.error}`);
      }
      if (!("value" in newItemAsn.result.valueBlock && Array.isArray(newItemAsn.result.valueBlock.value))) {
        throw new Error("Cannot get items from the ASN.1 parsed value. ASN.1 object is not constructed.");
      }
      const value = newItemAsn.result.valueBlock.value;
      return Array.from(value, (element) => converter.fromASN(element));
    } else {
      return Array.from(asn1SchemaValue, (element) => converter.fromASN(element));
    }
  }
  static processSinglePrimitiveItem(asn1SchemaValue, schemaItem, schemaItemType, converter, options) {
    let value = asn1SchemaValue;
    if (schemaItem.implicit) {
      let newItem;
      if (isConvertible(schemaItemType)) {
        newItem = new schemaItemType().toSchema("");
      } else {
        const Asn1TypeName = AsnPropTypes[schemaItemType];
        const Asn1Type = asn1js[Asn1TypeName];
        if (!Asn1Type) {
          throw new Error(`Cannot get '${Asn1TypeName}' class from asn1js module`);
        }
        newItem = new Asn1Type();
      }
      newItem.valueBlock = value.valueBlock;
      value = fromBER(newItem.toBER(false), options?.berOptions).result;
    }
    return converter.fromASN(value);
  }
  static processComplexSchemaItem(asn1SchemaValue, schemaItem, schemaItemType, options) {
    if (schemaItem.repeated) {
      if (!Array.isArray(asn1SchemaValue)) {
        throw new Error("Cannot get list of items from the ASN.1 parsed value. ASN.1 value should be iterable.");
      }
      return Array.from(asn1SchemaValue, (element) => this.fromASN(element, schemaItemType, options));
    } else {
      const valueToProcess = this.handleImplicitTagging(asn1SchemaValue, schemaItem, schemaItemType);
      if (this.isOptionalChoiceField(schemaItem)) {
        try {
          return this.fromASN(valueToProcess, schemaItemType, options);
        } catch (err) {
          if (err instanceof AsnSchemaValidationError && /Wrong values for Choice type/.test(err.message)) {
            return void 0;
          }
          throw err;
        }
      } else {
        const parsedValue = this.fromASN(valueToProcess, schemaItemType, options);
        if (schemaItem.raw) {
          return {
            value: parsedValue,
            raw: asn1SchemaValue.valueBeforeDecodeView
          };
        }
        return parsedValue;
      }
    }
  }
  static handleImplicitTagging(asn1SchemaValue, schemaItem, schemaItemType) {
    if (schemaItem.implicit && typeof schemaItem.context === "number") {
      const schema = schemaStorage.get(schemaItemType);
      if (schema.type === AsnTypeTypes.Sequence) {
        const newSeq = new Sequence();
        if ("value" in asn1SchemaValue.valueBlock && Array.isArray(asn1SchemaValue.valueBlock.value) && "value" in newSeq.valueBlock) {
          newSeq.valueBlock.value = asn1SchemaValue.valueBlock.value;
          return newSeq;
        }
      } else if (schema.type === AsnTypeTypes.Set) {
        const newSet = new Set$1();
        if ("value" in asn1SchemaValue.valueBlock && Array.isArray(asn1SchemaValue.valueBlock.value) && "value" in newSet.valueBlock) {
          newSet.valueBlock.value = asn1SchemaValue.valueBlock.value;
          return newSet;
        }
      }
    }
    return asn1SchemaValue;
  }
}
class AsnSerializer {
  static serialize(obj) {
    if (obj instanceof BaseBlock) {
      return obj.toBER(false);
    }
    return this.toASN(obj).toBER(false);
  }
  static toASN(obj) {
    if (obj && typeof obj === "object" && isConvertible(obj)) {
      return obj.toASN();
    }
    if (!(obj && typeof obj === "object")) {
      throw new TypeError("Parameter 1 should be type of Object.");
    }
    const target = obj.constructor;
    const schema = schemaStorage.get(target);
    schemaStorage.cache(target);
    let asn1Value = [];
    if (schema.itemType) {
      if (!Array.isArray(obj)) {
        throw new TypeError("Parameter 1 should be type of Array.");
      }
      if (typeof schema.itemType === "number") {
        const converter = defaultConverter(schema.itemType);
        if (!converter) {
          throw new Error(`Cannot get default converter for array item of ${target.name} ASN1 schema`);
        }
        asn1Value = obj.map((o) => converter.toASN(o));
      } else {
        asn1Value = obj.map((o) => this.toAsnItem({ type: schema.itemType }, "[]", target, o));
      }
    } else {
      for (const key2 in schema.items) {
        const schemaItem = schema.items[key2];
        const objProp = obj[key2];
        if (objProp === void 0 || schemaItem.defaultValue === objProp || typeof schemaItem.defaultValue === "object" && typeof objProp === "object" && isArrayEqual(this.serialize(schemaItem.defaultValue), this.serialize(objProp))) {
          continue;
        }
        const asn1Item = AsnSerializer.toAsnItem(schemaItem, key2, target, objProp);
        if (typeof schemaItem.context === "number") {
          if (schemaItem.implicit) {
            if (!schemaItem.repeated && (typeof schemaItem.type === "number" || isConvertible(schemaItem.type))) {
              const value = {};
              value.valueHex = asn1Item instanceof Null ? toArrayBuffer(asn1Item.valueBeforeDecodeView) : asn1Item.valueBlock.toBER();
              asn1Value.push(new Primitive({
                optional: schemaItem.optional,
                idBlock: {
                  tagClass: 3,
                  tagNumber: schemaItem.context
                },
                ...value
              }));
            } else {
              asn1Value.push(new Constructed({
                optional: schemaItem.optional,
                idBlock: {
                  tagClass: 3,
                  tagNumber: schemaItem.context
                },
                value: asn1Item.valueBlock.value
              }));
            }
          } else {
            asn1Value.push(new Constructed({
              optional: schemaItem.optional,
              idBlock: {
                tagClass: 3,
                tagNumber: schemaItem.context
              },
              value: [asn1Item]
            }));
          }
        } else if (schemaItem.repeated) {
          asn1Value = asn1Value.concat(asn1Item);
        } else {
          asn1Value.push(asn1Item);
        }
      }
    }
    let asnSchema;
    switch (schema.type) {
      case AsnTypeTypes.Sequence:
        asnSchema = new Sequence({ value: asn1Value });
        break;
      case AsnTypeTypes.Set:
        asnSchema = new Set$1({ value: asn1Value });
        break;
      case AsnTypeTypes.Choice:
        if (!asn1Value[0]) {
          throw new Error(`Schema '${target.name}' has wrong data. Choice cannot be empty.`);
        }
        asnSchema = asn1Value[0];
        break;
    }
    return asnSchema;
  }
  static toAsnItem(schemaItem, key2, target, objProp) {
    let asn1Item;
    if (typeof schemaItem.type === "number") {
      const converter = schemaItem.converter;
      if (!converter) {
        throw new Error(`Property '${key2}' doesn't have converter for type ${AsnPropTypes[schemaItem.type]} in schema '${target.name}'`);
      }
      if (schemaItem.repeated) {
        if (!Array.isArray(objProp)) {
          throw new TypeError("Parameter 'objProp' should be type of Array.");
        }
        const items = Array.from(objProp, (element) => converter.toASN(element));
        const Container = schemaItem.repeated === "sequence" ? Sequence : Set$1;
        asn1Item = new Container({ value: items });
      } else {
        asn1Item = converter.toASN(objProp);
      }
    } else {
      if (schemaItem.repeated) {
        if (!Array.isArray(objProp)) {
          throw new TypeError("Parameter 'objProp' should be type of Array.");
        }
        const items = Array.from(objProp, (element) => this.toASN(element));
        const Container = schemaItem.repeated === "sequence" ? Sequence : Set$1;
        asn1Item = new Container({ value: items });
      } else {
        asn1Item = this.toASN(objProp);
      }
    }
    return asn1Item;
  }
}
class AsnArray extends Array {
  constructor(items = []) {
    if (typeof items === "number") {
      super(items);
    } else {
      super();
      for (const item of items) {
        this.push(item);
      }
    }
  }
}
class AsnConvert {
  static serialize(obj) {
    return AsnSerializer.serialize(obj);
  }
  static parse(data, target, options) {
    return AsnParser.parse(data, target, options);
  }
  static toString(data, options) {
    const buf = isBufferSource(data) ? toArrayBuffer(data) : AsnConvert.serialize(data);
    const asn = fromBER(buf, options?.berOptions);
    if (asn.offset === -1) {
      throw new Error(`Cannot decode ASN.1 data. ${asn.result.error}`);
    }
    return asn.result.toString();
  }
}
function __decorate(decorators, target, key2, desc) {
  var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key2) : desc, d;
  if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key2, desc);
  else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key2, r) : d(target, key2)) || r;
  return c > 3 && r && Object.defineProperty(target, key2, r), r;
}
function __classPrivateFieldGet(receiver, state, kind, f) {
  if (kind === "a" && !f) throw new TypeError("Private accessor was defined without a getter");
  if (typeof state === "function" ? receiver !== state || !f : !state.has(receiver)) throw new TypeError("Cannot read private member from an object whose class did not declare it");
  return kind === "m" ? f : kind === "a" ? f.call(receiver) : f ? f.value : state.get(receiver);
}
function __classPrivateFieldSet(receiver, state, value, kind, f) {
  if (kind === "m") throw new TypeError("Private method is not writable");
  if (kind === "a" && !f) throw new TypeError("Private accessor was defined without a setter");
  if (typeof state === "function" ? receiver !== state || !f : !state.has(receiver)) throw new TypeError("Cannot write private member to an object whose class did not declare it");
  return kind === "a" ? f.call(receiver, value) : f ? f.value = value : state.set(receiver, value), value;
}
typeof SuppressedError === "function" ? SuppressedError : function(error, suppressed, message) {
  var e = new Error(message);
  return e.name = "SuppressedError", e.error = error, e.suppressed = suppressed, e;
};
function groupPairs(pairs, group) {
  if (!group) {
    return pairs.join("");
  }
  if (!Number.isInteger(group.size) || group.size < 1) {
    throw new RangeError("Hex group size must be a positive integer");
  }
  const chunks = [];
  for (let index2 = 0; index2 < pairs.length; index2 += group.size) {
    chunks.push(pairs.slice(index2, index2 + group.size).join(""));
  }
  return chunks.join(group.separator);
}
function encode(data, options = {}) {
  const bytes = toUint8Array(data);
  const casing = options.case ?? "lower";
  const pairs = Array.from(bytes, (byte) => {
    const text = byte.toString(16).padStart(2, "0");
    return casing === "upper" ? text.toUpperCase() : text;
  });
  let body = "";
  if (options.line) {
    const bytesPerLine = options.line.bytesPerLine;
    if (!Number.isInteger(bytesPerLine) || bytesPerLine < 1) {
      throw new RangeError("Hex bytesPerLine must be a positive integer");
    }
    const separator = options.line.separator ?? "\n";
    const lines = [];
    for (let index2 = 0; index2 < pairs.length; index2 += bytesPerLine) {
      lines.push(groupPairs(pairs.slice(index2, index2 + bytesPerLine), options.group));
    }
    body = lines.join(separator);
  } else {
    body = groupPairs(pairs, options.group);
  }
  return `${options.prefix ?? ""}${body}`;
}
class IpConverter {
  static isIPv4(ip) {
    return /^(\d{1,3}\.){3}\d{1,3}$/.test(ip);
  }
  static parseIPv4(ip) {
    const parts = ip.split(".");
    if (parts.length !== 4) {
      throw new Error("Invalid IPv4 address");
    }
    return parts.map((part) => {
      const num = parseInt(part, 10);
      if (isNaN(num) || num < 0 || num > 255) {
        throw new Error("Invalid IPv4 address part");
      }
      return num;
    });
  }
  static parseIPv6(ip) {
    const expandedIP = this.expandIPv6(ip);
    const parts = expandedIP.split(":");
    if (parts.length !== 8) {
      throw new Error("Invalid IPv6 address");
    }
    return parts.reduce((bytes, part) => {
      const num = parseInt(part, 16);
      if (isNaN(num) || num < 0 || num > 65535) {
        throw new Error("Invalid IPv6 address part");
      }
      bytes.push(num >> 8 & 255);
      bytes.push(num & 255);
      return bytes;
    }, []);
  }
  static expandIPv6(ip) {
    if (!ip.includes("::")) {
      return ip;
    }
    const parts = ip.split("::");
    if (parts.length > 2) {
      throw new Error("Invalid IPv6 address");
    }
    const left = parts[0] ? parts[0].split(":") : [];
    const right = parts[1] ? parts[1].split(":") : [];
    const missing = 8 - (left.length + right.length);
    if (missing < 0) {
      throw new Error("Invalid IPv6 address");
    }
    return [...left, ...Array(missing).fill("0"), ...right].join(":");
  }
  static formatIPv6(bytes) {
    const parts = [];
    for (let i = 0; i < 16; i += 2) {
      parts.push((bytes[i] << 8 | bytes[i + 1]).toString(16));
    }
    return this.compressIPv6(parts.join(":"));
  }
  static compressIPv6(ip) {
    const parts = ip.split(":");
    let longestZeroStart = -1;
    let longestZeroLength = 0;
    let currentZeroStart = -1;
    let currentZeroLength = 0;
    for (let i = 0; i < parts.length; i++) {
      if (parts[i] === "0") {
        if (currentZeroStart === -1) {
          currentZeroStart = i;
        }
        currentZeroLength++;
      } else {
        if (currentZeroLength > longestZeroLength) {
          longestZeroStart = currentZeroStart;
          longestZeroLength = currentZeroLength;
        }
        currentZeroStart = -1;
        currentZeroLength = 0;
      }
    }
    if (currentZeroLength > longestZeroLength) {
      longestZeroStart = currentZeroStart;
      longestZeroLength = currentZeroLength;
    }
    if (longestZeroLength > 1) {
      const before = parts.slice(0, longestZeroStart).join(":");
      const after = parts.slice(longestZeroStart + longestZeroLength).join(":");
      return `${before}::${after}`;
    }
    return ip;
  }
  static parseCIDR(text) {
    const [addr, prefixStr] = text.split("/");
    const prefix = parseInt(prefixStr, 10);
    if (this.isIPv4(addr)) {
      if (prefix < 0 || prefix > 32) {
        throw new Error("Invalid IPv4 prefix length");
      }
      return [this.parseIPv4(addr), prefix];
    } else {
      if (prefix < 0 || prefix > 128) {
        throw new Error("Invalid IPv6 prefix length");
      }
      return [this.parseIPv6(addr), prefix];
    }
  }
  static decodeIP(value) {
    if (value.length === 64 && parseInt(value, 16) === 0) {
      return "::/0";
    }
    if (value.length !== 16) {
      return value;
    }
    const mask = parseInt(value.slice(8), 16).toString(2).split("").reduce((a, k) => a + +k, 0);
    let ip = value.slice(0, 8).replace(/(.{2})/g, (match) => `${parseInt(match, 16)}.`);
    ip = ip.slice(0, -1);
    return `${ip}/${mask}`;
  }
  static toString(buf) {
    const uint8 = new Uint8Array(buf);
    if (uint8.length === 4) {
      return Array.from(uint8).join(".");
    }
    if (uint8.length === 16) {
      return this.formatIPv6(uint8);
    }
    if (uint8.length === 8 || uint8.length === 32) {
      const half = uint8.length / 2;
      const addrBytes = uint8.slice(0, half);
      const maskBytes = uint8.slice(half);
      const isAllZeros = uint8.every((byte) => byte === 0);
      if (isAllZeros) {
        return uint8.length === 8 ? "0.0.0.0/0" : "::/0";
      }
      const prefixLen = maskBytes.reduce((a, b) => a + (b.toString(2).match(/1/g) || []).length, 0);
      if (uint8.length === 8) {
        const addrStr = Array.from(addrBytes).join(".");
        return `${addrStr}/${prefixLen}`;
      } else {
        const addrStr = this.formatIPv6(addrBytes);
        return `${addrStr}/${prefixLen}`;
      }
    }
    return this.decodeIP(encode(buf));
  }
  static fromString(text) {
    if (text.includes("/")) {
      const [addr, prefix] = this.parseCIDR(text);
      const maskBytes = new Uint8Array(addr.length);
      let bitsLeft = prefix;
      for (let i = 0; i < maskBytes.length; i++) {
        if (bitsLeft >= 8) {
          maskBytes[i] = 255;
          bitsLeft -= 8;
        } else if (bitsLeft > 0) {
          maskBytes[i] = 255 << 8 - bitsLeft;
          bitsLeft = 0;
        }
      }
      const out = new Uint8Array(addr.length * 2);
      out.set(addr, 0);
      out.set(maskBytes, addr.length);
      return out.buffer;
    }
    const bytes = this.isIPv4(text) ? this.parseIPv4(text) : this.parseIPv6(text);
    return new Uint8Array(bytes).buffer;
  }
}
var RelativeDistinguishedName_1, RDNSequence_1, Name_1;
let DirectoryString = class DirectoryString2 {
  teletexString;
  printableString;
  universalString;
  utf8String;
  bmpString;
  constructor(params = {}) {
    Object.assign(this, params);
  }
  toString() {
    return this.bmpString || this.printableString || this.teletexString || this.universalString || this.utf8String || "";
  }
};
__decorate([
  AsnProp({ type: AsnPropTypes.TeletexString })
], DirectoryString.prototype, "teletexString", void 0);
__decorate([
  AsnProp({ type: AsnPropTypes.PrintableString })
], DirectoryString.prototype, "printableString", void 0);
__decorate([
  AsnProp({ type: AsnPropTypes.UniversalString })
], DirectoryString.prototype, "universalString", void 0);
__decorate([
  AsnProp({ type: AsnPropTypes.Utf8String })
], DirectoryString.prototype, "utf8String", void 0);
__decorate([
  AsnProp({ type: AsnPropTypes.BmpString })
], DirectoryString.prototype, "bmpString", void 0);
DirectoryString = __decorate([
  AsnType({ type: AsnTypeTypes.Choice })
], DirectoryString);
let AttributeValue = class AttributeValue2 extends DirectoryString {
  ia5String;
  anyValue;
  constructor(params = {}) {
    super(params);
    Object.assign(this, params);
  }
  toString() {
    return this.ia5String || (this.anyValue ? encode(this.anyValue) : super.toString());
  }
};
__decorate([
  AsnProp({ type: AsnPropTypes.IA5String })
], AttributeValue.prototype, "ia5String", void 0);
__decorate([
  AsnProp({ type: AsnPropTypes.Any })
], AttributeValue.prototype, "anyValue", void 0);
AttributeValue = __decorate([
  AsnType({ type: AsnTypeTypes.Choice })
], AttributeValue);
class AttributeTypeAndValue {
  type = "";
  value = new AttributeValue();
  constructor(params = {}) {
    Object.assign(this, params);
  }
}
__decorate([
  AsnProp({ type: AsnPropTypes.ObjectIdentifier })
], AttributeTypeAndValue.prototype, "type", void 0);
__decorate([
  AsnProp({ type: AttributeValue })
], AttributeTypeAndValue.prototype, "value", void 0);
let RelativeDistinguishedName = RelativeDistinguishedName_1 = class RelativeDistinguishedName2 extends AsnArray {
  constructor(items) {
    super(items);
    Object.setPrototypeOf(this, RelativeDistinguishedName_1.prototype);
  }
};
RelativeDistinguishedName = RelativeDistinguishedName_1 = __decorate([
  AsnType({
    type: AsnTypeTypes.Set,
    itemType: AttributeTypeAndValue
  })
], RelativeDistinguishedName);
let RDNSequence = RDNSequence_1 = class RDNSequence2 extends AsnArray {
  constructor(items) {
    super(items);
    Object.setPrototypeOf(this, RDNSequence_1.prototype);
  }
};
RDNSequence = RDNSequence_1 = __decorate([
  AsnType({
    type: AsnTypeTypes.Sequence,
    itemType: RelativeDistinguishedName
  })
], RDNSequence);
let Name$1 = Name_1 = class Name extends RDNSequence {
  constructor(items) {
    super(items);
    Object.setPrototypeOf(this, Name_1.prototype);
  }
};
Name$1 = Name_1 = __decorate([
  AsnType({ type: AsnTypeTypes.Sequence })
], Name$1);
const AsnIpConverter = {
  fromASN: (value) => IpConverter.toString(AsnOctetStringConverter.fromASN(value)),
  toASN: (value) => AsnOctetStringConverter.toASN(IpConverter.fromString(value))
};
class OtherName {
  typeId = "";
  value = new ArrayBuffer(0);
  constructor(params = {}) {
    Object.assign(this, params);
  }
}
__decorate([
  AsnProp({ type: AsnPropTypes.ObjectIdentifier })
], OtherName.prototype, "typeId", void 0);
__decorate([
  AsnProp({
    type: AsnPropTypes.Any,
    context: 0
  })
], OtherName.prototype, "value", void 0);
class EDIPartyName {
  nameAssigner;
  partyName = new DirectoryString();
  constructor(params = {}) {
    Object.assign(this, params);
  }
}
__decorate([
  AsnProp({
    type: DirectoryString,
    optional: true,
    context: 0,
    implicit: true
  })
], EDIPartyName.prototype, "nameAssigner", void 0);
__decorate([
  AsnProp({
    type: DirectoryString,
    context: 1,
    implicit: true
  })
], EDIPartyName.prototype, "partyName", void 0);
let GeneralName$1 = class GeneralName {
  otherName;
  rfc822Name;
  dNSName;
  x400Address;
  directoryName;
  ediPartyName;
  uniformResourceIdentifier;
  iPAddress;
  registeredID;
  constructor(params = {}) {
    Object.assign(this, params);
  }
};
__decorate([
  AsnProp({
    type: OtherName,
    context: 0,
    implicit: true
  })
], GeneralName$1.prototype, "otherName", void 0);
__decorate([
  AsnProp({
    type: AsnPropTypes.IA5String,
    context: 1,
    implicit: true
  })
], GeneralName$1.prototype, "rfc822Name", void 0);
__decorate([
  AsnProp({
    type: AsnPropTypes.IA5String,
    context: 2,
    implicit: true
  })
], GeneralName$1.prototype, "dNSName", void 0);
__decorate([
  AsnProp({
    type: AsnPropTypes.Any,
    context: 3,
    implicit: true
  })
], GeneralName$1.prototype, "x400Address", void 0);
__decorate([
  AsnProp({
    type: Name$1,
    context: 4,
    implicit: false
  })
], GeneralName$1.prototype, "directoryName", void 0);
__decorate([
  AsnProp({
    type: EDIPartyName,
    context: 5
  })
], GeneralName$1.prototype, "ediPartyName", void 0);
__decorate([
  AsnProp({
    type: AsnPropTypes.IA5String,
    context: 6,
    implicit: true
  })
], GeneralName$1.prototype, "uniformResourceIdentifier", void 0);
__decorate([
  AsnProp({
    type: AsnPropTypes.OctetString,
    context: 7,
    implicit: true,
    converter: AsnIpConverter
  })
], GeneralName$1.prototype, "iPAddress", void 0);
__decorate([
  AsnProp({
    type: AsnPropTypes.ObjectIdentifier,
    context: 8,
    implicit: true
  })
], GeneralName$1.prototype, "registeredID", void 0);
GeneralName$1 = __decorate([
  AsnType({ type: AsnTypeTypes.Choice })
], GeneralName$1);
const id_pkix = "1.3.6.1.5.5.7";
const id_pe = `${id_pkix}.1`;
const id_kp = `${id_pkix}.3`;
const id_ad = `${id_pkix}.48`;
const id_ad_ocsp = `${id_ad}.1`;
const id_ad_caIssuers = `${id_ad}.2`;
const id_ad_timeStamping = `${id_ad}.3`;
const id_ad_caRepository = `${id_ad}.5`;
const id_ce = "2.5.29";
var AuthorityInfoAccessSyntax_1;
const id_pe_authorityInfoAccess = `${id_pe}.1`;
class AccessDescription {
  accessMethod = "";
  accessLocation = new GeneralName$1();
  constructor(params = {}) {
    Object.assign(this, params);
  }
}
__decorate([
  AsnProp({ type: AsnPropTypes.ObjectIdentifier })
], AccessDescription.prototype, "accessMethod", void 0);
__decorate([
  AsnProp({ type: GeneralName$1 })
], AccessDescription.prototype, "accessLocation", void 0);
let AuthorityInfoAccessSyntax = AuthorityInfoAccessSyntax_1 = class AuthorityInfoAccessSyntax2 extends AsnArray {
  constructor(items) {
    super(items);
    Object.setPrototypeOf(this, AuthorityInfoAccessSyntax_1.prototype);
  }
};
AuthorityInfoAccessSyntax = AuthorityInfoAccessSyntax_1 = __decorate([
  AsnType({
    type: AsnTypeTypes.Sequence,
    itemType: AccessDescription
  })
], AuthorityInfoAccessSyntax);
const id_ce_authorityKeyIdentifier = `${id_ce}.35`;
class KeyIdentifier extends OctetString2 {
}
class AuthorityKeyIdentifier {
  keyIdentifier;
  authorityCertIssuer;
  authorityCertSerialNumber;
  constructor(params = {}) {
    if (params) {
      Object.assign(this, params);
    }
  }
}
__decorate([
  AsnProp({
    type: KeyIdentifier,
    context: 0,
    optional: true,
    implicit: true
  })
], AuthorityKeyIdentifier.prototype, "keyIdentifier", void 0);
__decorate([
  AsnProp({
    type: GeneralName$1,
    context: 1,
    optional: true,
    implicit: true,
    repeated: "sequence"
  })
], AuthorityKeyIdentifier.prototype, "authorityCertIssuer", void 0);
__decorate([
  AsnProp({
    type: AsnPropTypes.Integer,
    context: 2,
    optional: true,
    implicit: true,
    converter: AsnIntegerArrayBufferConverter
  })
], AuthorityKeyIdentifier.prototype, "authorityCertSerialNumber", void 0);
const id_ce_basicConstraints = `${id_ce}.19`;
class BasicConstraints {
  cA = false;
  pathLenConstraint;
  constructor(params = {}) {
    Object.assign(this, params);
  }
}
__decorate([
  AsnProp({
    type: AsnPropTypes.Boolean,
    defaultValue: false
  })
], BasicConstraints.prototype, "cA", void 0);
__decorate([
  AsnProp({
    type: AsnPropTypes.Integer,
    optional: true
  })
], BasicConstraints.prototype, "pathLenConstraint", void 0);
var GeneralNames_1;
let GeneralNames$1 = GeneralNames_1 = class GeneralNames extends AsnArray {
  constructor(items) {
    super(items);
    Object.setPrototypeOf(this, GeneralNames_1.prototype);
  }
};
GeneralNames$1 = GeneralNames_1 = __decorate([
  AsnType({
    type: AsnTypeTypes.Sequence,
    itemType: GeneralName$1
  })
], GeneralNames$1);
var CertificateIssuer_1;
let CertificateIssuer = CertificateIssuer_1 = class CertificateIssuer2 extends GeneralNames$1 {
  constructor(items) {
    super(items);
    Object.setPrototypeOf(this, CertificateIssuer_1.prototype);
  }
};
CertificateIssuer = CertificateIssuer_1 = __decorate([
  AsnType({ type: AsnTypeTypes.Sequence })
], CertificateIssuer);
var CertificatePolicies_1;
const id_ce_certificatePolicies = `${id_ce}.32`;
let DisplayText = class DisplayText2 {
  ia5String;
  visibleString;
  bmpString;
  utf8String;
  constructor(params = {}) {
    Object.assign(this, params);
  }
  toString() {
    return this.ia5String || this.visibleString || this.bmpString || this.utf8String || "";
  }
};
__decorate([
  AsnProp({ type: AsnPropTypes.IA5String })
], DisplayText.prototype, "ia5String", void 0);
__decorate([
  AsnProp({ type: AsnPropTypes.VisibleString })
], DisplayText.prototype, "visibleString", void 0);
__decorate([
  AsnProp({ type: AsnPropTypes.BmpString })
], DisplayText.prototype, "bmpString", void 0);
__decorate([
  AsnProp({ type: AsnPropTypes.Utf8String })
], DisplayText.prototype, "utf8String", void 0);
DisplayText = __decorate([
  AsnType({ type: AsnTypeTypes.Choice })
], DisplayText);
class NoticeReference {
  organization = new DisplayText();
  noticeNumbers = [];
  constructor(params = {}) {
    Object.assign(this, params);
  }
}
__decorate([
  AsnProp({ type: DisplayText })
], NoticeReference.prototype, "organization", void 0);
__decorate([
  AsnProp({
    type: AsnPropTypes.Integer,
    repeated: "sequence"
  })
], NoticeReference.prototype, "noticeNumbers", void 0);
class UserNotice {
  noticeRef;
  explicitText;
  constructor(params = {}) {
    Object.assign(this, params);
  }
}
__decorate([
  AsnProp({
    type: NoticeReference,
    optional: true
  })
], UserNotice.prototype, "noticeRef", void 0);
__decorate([
  AsnProp({
    type: DisplayText,
    optional: true
  })
], UserNotice.prototype, "explicitText", void 0);
let Qualifier = class Qualifier2 {
  cPSuri;
  userNotice;
  constructor(params = {}) {
    Object.assign(this, params);
  }
};
__decorate([
  AsnProp({ type: AsnPropTypes.IA5String })
], Qualifier.prototype, "cPSuri", void 0);
__decorate([
  AsnProp({ type: UserNotice })
], Qualifier.prototype, "userNotice", void 0);
Qualifier = __decorate([
  AsnType({ type: AsnTypeTypes.Choice })
], Qualifier);
class PolicyQualifierInfo {
  policyQualifierId = "";
  qualifier = new ArrayBuffer(0);
  constructor(params = {}) {
    Object.assign(this, params);
  }
}
__decorate([
  AsnProp({ type: AsnPropTypes.ObjectIdentifier })
], PolicyQualifierInfo.prototype, "policyQualifierId", void 0);
__decorate([
  AsnProp({ type: AsnPropTypes.Any })
], PolicyQualifierInfo.prototype, "qualifier", void 0);
class PolicyInformation {
  policyIdentifier = "";
  policyQualifiers;
  constructor(params = {}) {
    Object.assign(this, params);
  }
}
__decorate([
  AsnProp({ type: AsnPropTypes.ObjectIdentifier })
], PolicyInformation.prototype, "policyIdentifier", void 0);
__decorate([
  AsnProp({
    type: PolicyQualifierInfo,
    repeated: "sequence",
    optional: true
  })
], PolicyInformation.prototype, "policyQualifiers", void 0);
let CertificatePolicies = CertificatePolicies_1 = class CertificatePolicies2 extends AsnArray {
  constructor(items) {
    super(items);
    Object.setPrototypeOf(this, CertificatePolicies_1.prototype);
  }
};
CertificatePolicies = CertificatePolicies_1 = __decorate([
  AsnType({
    type: AsnTypeTypes.Sequence,
    itemType: PolicyInformation
  })
], CertificatePolicies);
let CRLNumber = class CRLNumber2 {
  value;
  constructor(value = 0) {
    this.value = value;
  }
};
__decorate([
  AsnProp({ type: AsnPropTypes.Integer })
], CRLNumber.prototype, "value", void 0);
CRLNumber = __decorate([
  AsnType({ type: AsnTypeTypes.Choice })
], CRLNumber);
let BaseCRLNumber = class BaseCRLNumber2 extends CRLNumber {
};
BaseCRLNumber = __decorate([
  AsnType({ type: AsnTypeTypes.Choice })
], BaseCRLNumber);
var CRLDistributionPoints_1;
const id_ce_cRLDistributionPoints = `${id_ce}.31`;
var ReasonFlags;
(function(ReasonFlags2) {
  ReasonFlags2[ReasonFlags2["unused"] = 1] = "unused";
  ReasonFlags2[ReasonFlags2["keyCompromise"] = 2] = "keyCompromise";
  ReasonFlags2[ReasonFlags2["cACompromise"] = 4] = "cACompromise";
  ReasonFlags2[ReasonFlags2["affiliationChanged"] = 8] = "affiliationChanged";
  ReasonFlags2[ReasonFlags2["superseded"] = 16] = "superseded";
  ReasonFlags2[ReasonFlags2["cessationOfOperation"] = 32] = "cessationOfOperation";
  ReasonFlags2[ReasonFlags2["certificateHold"] = 64] = "certificateHold";
  ReasonFlags2[ReasonFlags2["privilegeWithdrawn"] = 128] = "privilegeWithdrawn";
  ReasonFlags2[ReasonFlags2["aACompromise"] = 256] = "aACompromise";
})(ReasonFlags || (ReasonFlags = {}));
class Reason extends BitString2 {
  toJSON() {
    const res = [];
    const flags = this.toNumber();
    if (flags & ReasonFlags.aACompromise) {
      res.push("aACompromise");
    }
    if (flags & ReasonFlags.affiliationChanged) {
      res.push("affiliationChanged");
    }
    if (flags & ReasonFlags.cACompromise) {
      res.push("cACompromise");
    }
    if (flags & ReasonFlags.certificateHold) {
      res.push("certificateHold");
    }
    if (flags & ReasonFlags.cessationOfOperation) {
      res.push("cessationOfOperation");
    }
    if (flags & ReasonFlags.keyCompromise) {
      res.push("keyCompromise");
    }
    if (flags & ReasonFlags.privilegeWithdrawn) {
      res.push("privilegeWithdrawn");
    }
    if (flags & ReasonFlags.superseded) {
      res.push("superseded");
    }
    if (flags & ReasonFlags.unused) {
      res.push("unused");
    }
    return res;
  }
  toString() {
    return `[${this.toJSON().join(", ")}]`;
  }
}
let DistributionPointName = class DistributionPointName2 {
  fullName;
  nameRelativeToCRLIssuer;
  constructor(params = {}) {
    Object.assign(this, params);
  }
};
__decorate([
  AsnProp({
    type: GeneralName$1,
    context: 0,
    repeated: "sequence",
    implicit: true
  })
], DistributionPointName.prototype, "fullName", void 0);
__decorate([
  AsnProp({
    type: RelativeDistinguishedName,
    context: 1,
    implicit: true
  })
], DistributionPointName.prototype, "nameRelativeToCRLIssuer", void 0);
DistributionPointName = __decorate([
  AsnType({ type: AsnTypeTypes.Choice })
], DistributionPointName);
class DistributionPoint {
  distributionPoint;
  reasons;
  cRLIssuer;
  constructor(params = {}) {
    Object.assign(this, params);
  }
}
__decorate([
  AsnProp({
    type: DistributionPointName,
    context: 0,
    optional: true
  })
], DistributionPoint.prototype, "distributionPoint", void 0);
__decorate([
  AsnProp({
    type: Reason,
    context: 1,
    optional: true,
    implicit: true
  })
], DistributionPoint.prototype, "reasons", void 0);
__decorate([
  AsnProp({
    type: GeneralName$1,
    context: 2,
    optional: true,
    repeated: "sequence",
    implicit: true
  })
], DistributionPoint.prototype, "cRLIssuer", void 0);
let CRLDistributionPoints = CRLDistributionPoints_1 = class CRLDistributionPoints2 extends AsnArray {
  constructor(items) {
    super(items);
    Object.setPrototypeOf(this, CRLDistributionPoints_1.prototype);
  }
};
CRLDistributionPoints = CRLDistributionPoints_1 = __decorate([
  AsnType({
    type: AsnTypeTypes.Sequence,
    itemType: DistributionPoint
  })
], CRLDistributionPoints);
var FreshestCRL_1;
let FreshestCRL = FreshestCRL_1 = class FreshestCRL2 extends CRLDistributionPoints {
  constructor(items) {
    super(items);
    Object.setPrototypeOf(this, FreshestCRL_1.prototype);
  }
};
FreshestCRL = FreshestCRL_1 = __decorate([
  AsnType({
    type: AsnTypeTypes.Sequence,
    itemType: DistributionPoint
  })
], FreshestCRL);
class IssuingDistributionPoint {
  static ONLY = false;
  distributionPoint;
  onlyContainsUserCerts = IssuingDistributionPoint.ONLY;
  onlyContainsCACerts = IssuingDistributionPoint.ONLY;
  onlySomeReasons;
  indirectCRL = IssuingDistributionPoint.ONLY;
  onlyContainsAttributeCerts = IssuingDistributionPoint.ONLY;
  constructor(params = {}) {
    Object.assign(this, params);
  }
}
__decorate([
  AsnProp({
    type: DistributionPointName,
    context: 0,
    optional: true
  })
], IssuingDistributionPoint.prototype, "distributionPoint", void 0);
__decorate([
  AsnProp({
    type: AsnPropTypes.Boolean,
    context: 1,
    defaultValue: IssuingDistributionPoint.ONLY,
    implicit: true
  })
], IssuingDistributionPoint.prototype, "onlyContainsUserCerts", void 0);
__decorate([
  AsnProp({
    type: AsnPropTypes.Boolean,
    context: 2,
    defaultValue: IssuingDistributionPoint.ONLY,
    implicit: true
  })
], IssuingDistributionPoint.prototype, "onlyContainsCACerts", void 0);
__decorate([
  AsnProp({
    type: Reason,
    context: 3,
    optional: true,
    implicit: true
  })
], IssuingDistributionPoint.prototype, "onlySomeReasons", void 0);
__decorate([
  AsnProp({
    type: AsnPropTypes.Boolean,
    context: 4,
    defaultValue: IssuingDistributionPoint.ONLY,
    implicit: true
  })
], IssuingDistributionPoint.prototype, "indirectCRL", void 0);
__decorate([
  AsnProp({
    type: AsnPropTypes.Boolean,
    context: 5,
    defaultValue: IssuingDistributionPoint.ONLY,
    implicit: true
  })
], IssuingDistributionPoint.prototype, "onlyContainsAttributeCerts", void 0);
const id_ce_cRLReasons = `${id_ce}.21`;
var CRLReasons;
(function(CRLReasons2) {
  CRLReasons2[CRLReasons2["unspecified"] = 0] = "unspecified";
  CRLReasons2[CRLReasons2["keyCompromise"] = 1] = "keyCompromise";
  CRLReasons2[CRLReasons2["cACompromise"] = 2] = "cACompromise";
  CRLReasons2[CRLReasons2["affiliationChanged"] = 3] = "affiliationChanged";
  CRLReasons2[CRLReasons2["superseded"] = 4] = "superseded";
  CRLReasons2[CRLReasons2["cessationOfOperation"] = 5] = "cessationOfOperation";
  CRLReasons2[CRLReasons2["certificateHold"] = 6] = "certificateHold";
  CRLReasons2[CRLReasons2["removeFromCRL"] = 8] = "removeFromCRL";
  CRLReasons2[CRLReasons2["privilegeWithdrawn"] = 9] = "privilegeWithdrawn";
  CRLReasons2[CRLReasons2["aACompromise"] = 10] = "aACompromise";
})(CRLReasons || (CRLReasons = {}));
let CRLReason = class CRLReason2 {
  reason = CRLReasons.unspecified;
  constructor(reason = CRLReasons.unspecified) {
    this.reason = reason;
  }
  toJSON() {
    return CRLReasons[this.reason];
  }
  toString() {
    return this.toJSON();
  }
};
__decorate([
  AsnProp({ type: AsnPropTypes.Enumerated })
], CRLReason.prototype, "reason", void 0);
CRLReason = __decorate([
  AsnType({ type: AsnTypeTypes.Choice })
], CRLReason);
var ExtendedKeyUsage_1;
const id_ce_extKeyUsage = `${id_ce}.37`;
let ExtendedKeyUsage$1 = ExtendedKeyUsage_1 = class ExtendedKeyUsage extends AsnArray {
  constructor(items) {
    super(items);
    Object.setPrototypeOf(this, ExtendedKeyUsage_1.prototype);
  }
};
ExtendedKeyUsage$1 = ExtendedKeyUsage_1 = __decorate([
  AsnType({
    type: AsnTypeTypes.Sequence,
    itemType: AsnPropTypes.ObjectIdentifier
  })
], ExtendedKeyUsage$1);
const id_kp_serverAuth = `${id_kp}.1`;
const id_kp_clientAuth = `${id_kp}.2`;
const id_kp_codeSigning = `${id_kp}.3`;
const id_kp_emailProtection = `${id_kp}.4`;
const id_kp_timeStamping = `${id_kp}.8`;
const id_kp_OCSPSigning = `${id_kp}.9`;
let InhibitAnyPolicy = class InhibitAnyPolicy2 {
  value;
  constructor(value = new ArrayBuffer(0)) {
    this.value = value;
  }
};
__decorate([
  AsnProp({
    type: AsnPropTypes.Integer,
    converter: AsnIntegerArrayBufferConverter
  })
], InhibitAnyPolicy.prototype, "value", void 0);
InhibitAnyPolicy = __decorate([
  AsnType({ type: AsnTypeTypes.Choice })
], InhibitAnyPolicy);
const id_ce_invalidityDate = `${id_ce}.24`;
let InvalidityDate = class InvalidityDate2 {
  value = /* @__PURE__ */ new Date();
  constructor(value) {
    if (value) {
      this.value = value;
    }
  }
};
__decorate([
  AsnProp({ type: AsnPropTypes.GeneralizedTime })
], InvalidityDate.prototype, "value", void 0);
InvalidityDate = __decorate([
  AsnType({ type: AsnTypeTypes.Choice })
], InvalidityDate);
var IssueAlternativeName_1;
const id_ce_issuerAltName = `${id_ce}.18`;
let IssueAlternativeName = IssueAlternativeName_1 = class IssueAlternativeName2 extends GeneralNames$1 {
  constructor(items) {
    super(items);
    Object.setPrototypeOf(this, IssueAlternativeName_1.prototype);
  }
};
IssueAlternativeName = IssueAlternativeName_1 = __decorate([
  AsnType({ type: AsnTypeTypes.Sequence })
], IssueAlternativeName);
const id_ce_keyUsage = `${id_ce}.15`;
var KeyUsageFlags$1;
(function(KeyUsageFlags2) {
  KeyUsageFlags2[KeyUsageFlags2["digitalSignature"] = 1] = "digitalSignature";
  KeyUsageFlags2[KeyUsageFlags2["nonRepudiation"] = 2] = "nonRepudiation";
  KeyUsageFlags2[KeyUsageFlags2["keyEncipherment"] = 4] = "keyEncipherment";
  KeyUsageFlags2[KeyUsageFlags2["dataEncipherment"] = 8] = "dataEncipherment";
  KeyUsageFlags2[KeyUsageFlags2["keyAgreement"] = 16] = "keyAgreement";
  KeyUsageFlags2[KeyUsageFlags2["keyCertSign"] = 32] = "keyCertSign";
  KeyUsageFlags2[KeyUsageFlags2["cRLSign"] = 64] = "cRLSign";
  KeyUsageFlags2[KeyUsageFlags2["encipherOnly"] = 128] = "encipherOnly";
  KeyUsageFlags2[KeyUsageFlags2["decipherOnly"] = 256] = "decipherOnly";
})(KeyUsageFlags$1 || (KeyUsageFlags$1 = {}));
class KeyUsage extends BitString2 {
  toJSON() {
    const flag = this.toNumber();
    const res = [];
    if (flag & KeyUsageFlags$1.cRLSign) {
      res.push("crlSign");
    }
    if (flag & KeyUsageFlags$1.dataEncipherment) {
      res.push("dataEncipherment");
    }
    if (flag & KeyUsageFlags$1.decipherOnly) {
      res.push("decipherOnly");
    }
    if (flag & KeyUsageFlags$1.digitalSignature) {
      res.push("digitalSignature");
    }
    if (flag & KeyUsageFlags$1.encipherOnly) {
      res.push("encipherOnly");
    }
    if (flag & KeyUsageFlags$1.keyAgreement) {
      res.push("keyAgreement");
    }
    if (flag & KeyUsageFlags$1.keyCertSign) {
      res.push("keyCertSign");
    }
    if (flag & KeyUsageFlags$1.keyEncipherment) {
      res.push("keyEncipherment");
    }
    if (flag & KeyUsageFlags$1.nonRepudiation) {
      res.push("nonRepudiation");
    }
    return res;
  }
  toString() {
    return `[${this.toJSON().join(", ")}]`;
  }
}
var GeneralSubtrees_1;
class GeneralSubtree {
  base = new GeneralName$1();
  minimum = 0;
  maximum;
  constructor(params = {}) {
    Object.assign(this, params);
  }
}
__decorate([
  AsnProp({ type: GeneralName$1 })
], GeneralSubtree.prototype, "base", void 0);
__decorate([
  AsnProp({
    type: AsnPropTypes.Integer,
    context: 0,
    defaultValue: 0,
    implicit: true
  })
], GeneralSubtree.prototype, "minimum", void 0);
__decorate([
  AsnProp({
    type: AsnPropTypes.Integer,
    context: 1,
    optional: true,
    implicit: true
  })
], GeneralSubtree.prototype, "maximum", void 0);
let GeneralSubtrees = GeneralSubtrees_1 = class GeneralSubtrees2 extends AsnArray {
  constructor(items) {
    super(items);
    Object.setPrototypeOf(this, GeneralSubtrees_1.prototype);
  }
};
GeneralSubtrees = GeneralSubtrees_1 = __decorate([
  AsnType({
    type: AsnTypeTypes.Sequence,
    itemType: GeneralSubtree
  })
], GeneralSubtrees);
class NameConstraints {
  permittedSubtrees;
  excludedSubtrees;
  constructor(params = {}) {
    Object.assign(this, params);
  }
}
__decorate([
  AsnProp({
    type: GeneralSubtrees,
    context: 0,
    optional: true,
    implicit: true
  })
], NameConstraints.prototype, "permittedSubtrees", void 0);
__decorate([
  AsnProp({
    type: GeneralSubtrees,
    context: 1,
    optional: true,
    implicit: true
  })
], NameConstraints.prototype, "excludedSubtrees", void 0);
class PolicyConstraints {
  requireExplicitPolicy;
  inhibitPolicyMapping;
  constructor(params = {}) {
    Object.assign(this, params);
  }
}
__decorate([
  AsnProp({
    type: AsnPropTypes.Integer,
    context: 0,
    implicit: true,
    optional: true,
    converter: AsnIntegerArrayBufferConverter
  })
], PolicyConstraints.prototype, "requireExplicitPolicy", void 0);
__decorate([
  AsnProp({
    type: AsnPropTypes.Integer,
    context: 1,
    implicit: true,
    optional: true,
    converter: AsnIntegerArrayBufferConverter
  })
], PolicyConstraints.prototype, "inhibitPolicyMapping", void 0);
var PolicyMappings_1;
class PolicyMapping {
  issuerDomainPolicy = "";
  subjectDomainPolicy = "";
  constructor(params = {}) {
    Object.assign(this, params);
  }
}
__decorate([
  AsnProp({ type: AsnPropTypes.ObjectIdentifier })
], PolicyMapping.prototype, "issuerDomainPolicy", void 0);
__decorate([
  AsnProp({ type: AsnPropTypes.ObjectIdentifier })
], PolicyMapping.prototype, "subjectDomainPolicy", void 0);
let PolicyMappings = PolicyMappings_1 = class PolicyMappings2 extends AsnArray {
  constructor(items) {
    super(items);
    Object.setPrototypeOf(this, PolicyMappings_1.prototype);
  }
};
PolicyMappings = PolicyMappings_1 = __decorate([
  AsnType({
    type: AsnTypeTypes.Sequence,
    itemType: PolicyMapping
  })
], PolicyMappings);
var SubjectAlternativeName_1;
const id_ce_subjectAltName = `${id_ce}.17`;
let SubjectAlternativeName = SubjectAlternativeName_1 = class SubjectAlternativeName2 extends GeneralNames$1 {
  constructor(items) {
    super(items);
    Object.setPrototypeOf(this, SubjectAlternativeName_1.prototype);
  }
};
SubjectAlternativeName = SubjectAlternativeName_1 = __decorate([
  AsnType({ type: AsnTypeTypes.Sequence })
], SubjectAlternativeName);
let Attribute$2 = class Attribute {
  type = "";
  values = [];
  constructor(params = {}) {
    Object.assign(this, params);
  }
};
__decorate([
  AsnProp({ type: AsnPropTypes.ObjectIdentifier })
], Attribute$2.prototype, "type", void 0);
__decorate([
  AsnProp({
    type: AsnPropTypes.Any,
    repeated: "set"
  })
], Attribute$2.prototype, "values", void 0);
var SubjectDirectoryAttributes_1;
let SubjectDirectoryAttributes = SubjectDirectoryAttributes_1 = class SubjectDirectoryAttributes2 extends AsnArray {
  constructor(items) {
    super(items);
    Object.setPrototypeOf(this, SubjectDirectoryAttributes_1.prototype);
  }
};
SubjectDirectoryAttributes = SubjectDirectoryAttributes_1 = __decorate([
  AsnType({
    type: AsnTypeTypes.Sequence,
    itemType: Attribute$2
  })
], SubjectDirectoryAttributes);
const id_ce_subjectKeyIdentifier = `${id_ce}.14`;
class SubjectKeyIdentifier extends KeyIdentifier {
}
class PrivateKeyUsagePeriod {
  notBefore;
  notAfter;
  constructor(params = {}) {
    Object.assign(this, params);
  }
}
__decorate([
  AsnProp({
    type: AsnPropTypes.GeneralizedTime,
    context: 0,
    implicit: true,
    optional: true
  })
], PrivateKeyUsagePeriod.prototype, "notBefore", void 0);
__decorate([
  AsnProp({
    type: AsnPropTypes.GeneralizedTime,
    context: 1,
    implicit: true,
    optional: true
  })
], PrivateKeyUsagePeriod.prototype, "notAfter", void 0);
var EntrustInfoFlags;
(function(EntrustInfoFlags2) {
  EntrustInfoFlags2[EntrustInfoFlags2["keyUpdateAllowed"] = 1] = "keyUpdateAllowed";
  EntrustInfoFlags2[EntrustInfoFlags2["newExtensions"] = 2] = "newExtensions";
  EntrustInfoFlags2[EntrustInfoFlags2["pKIXCertificate"] = 4] = "pKIXCertificate";
})(EntrustInfoFlags || (EntrustInfoFlags = {}));
class EntrustInfo extends BitString2 {
  toJSON() {
    const res = [];
    const flags = this.toNumber();
    if (flags & EntrustInfoFlags.pKIXCertificate) {
      res.push("pKIXCertificate");
    }
    if (flags & EntrustInfoFlags.newExtensions) {
      res.push("newExtensions");
    }
    if (flags & EntrustInfoFlags.keyUpdateAllowed) {
      res.push("keyUpdateAllowed");
    }
    return res;
  }
  toString() {
    return `[${this.toJSON().join(", ")}]`;
  }
}
class EntrustVersionInfo {
  entrustVers = "";
  entrustInfoFlags = new EntrustInfo();
  constructor(params = {}) {
    Object.assign(this, params);
  }
}
__decorate([
  AsnProp({ type: AsnPropTypes.GeneralString })
], EntrustVersionInfo.prototype, "entrustVers", void 0);
__decorate([
  AsnProp({ type: EntrustInfo })
], EntrustVersionInfo.prototype, "entrustInfoFlags", void 0);
var SubjectInfoAccessSyntax_1;
let SubjectInfoAccessSyntax = SubjectInfoAccessSyntax_1 = class SubjectInfoAccessSyntax2 extends AsnArray {
  constructor(items) {
    super(items);
    Object.setPrototypeOf(this, SubjectInfoAccessSyntax_1.prototype);
  }
};
SubjectInfoAccessSyntax = SubjectInfoAccessSyntax_1 = __decorate([
  AsnType({
    type: AsnTypeTypes.Sequence,
    itemType: AccessDescription
  })
], SubjectInfoAccessSyntax);
class AlgorithmIdentifier {
  algorithm = "";
  parameters;
  constructor(params = {}) {
    Object.assign(this, params);
  }
  isEqual(data) {
    return data instanceof AlgorithmIdentifier && data.algorithm == this.algorithm && (data.parameters && this.parameters && equal(data.parameters, this.parameters) || data.parameters === this.parameters);
  }
}
__decorate([
  AsnProp({ type: AsnPropTypes.ObjectIdentifier })
], AlgorithmIdentifier.prototype, "algorithm", void 0);
__decorate([
  AsnProp({
    type: AsnPropTypes.Any,
    optional: true
  })
], AlgorithmIdentifier.prototype, "parameters", void 0);
class SubjectPublicKeyInfo {
  algorithm = new AlgorithmIdentifier();
  subjectPublicKey = new ArrayBuffer(0);
  constructor(params = {}) {
    Object.assign(this, params);
  }
}
__decorate([
  AsnProp({ type: AlgorithmIdentifier })
], SubjectPublicKeyInfo.prototype, "algorithm", void 0);
__decorate([
  AsnProp({ type: AsnPropTypes.BitString })
], SubjectPublicKeyInfo.prototype, "subjectPublicKey", void 0);
let Time = class Time2 {
  utcTime;
  generalTime;
  constructor(time) {
    if (time) {
      if (typeof time === "string" || typeof time === "number" || time instanceof Date) {
        const date = new Date(time);
        date.setMilliseconds(0);
        if (date.getUTCFullYear() > 2049) {
          this.generalTime = date;
        } else {
          this.utcTime = date;
        }
      } else {
        Object.assign(this, time);
      }
    }
  }
  getTime() {
    const time = this.utcTime || this.generalTime;
    if (!time) {
      throw new Error("Cannot get time from CHOICE object");
    }
    return time;
  }
};
__decorate([
  AsnProp({ type: AsnPropTypes.UTCTime })
], Time.prototype, "utcTime", void 0);
__decorate([
  AsnProp({ type: AsnPropTypes.GeneralizedTime })
], Time.prototype, "generalTime", void 0);
Time = __decorate([
  AsnType({ type: AsnTypeTypes.Choice })
], Time);
class Validity {
  notBefore = new Time(/* @__PURE__ */ new Date());
  notAfter = new Time(/* @__PURE__ */ new Date());
  constructor(params) {
    if (params) {
      this.notBefore = new Time(params.notBefore);
      this.notAfter = new Time(params.notAfter);
    }
  }
}
__decorate([
  AsnProp({ type: Time })
], Validity.prototype, "notBefore", void 0);
__decorate([
  AsnProp({ type: Time })
], Validity.prototype, "notAfter", void 0);
var Extensions_1;
let Extension$1 = class Extension {
  static CRITICAL = false;
  extnID = "";
  critical = Extension.CRITICAL;
  extnValue = new OctetString2();
  constructor(params = {}) {
    Object.assign(this, params);
  }
};
__decorate([
  AsnProp({ type: AsnPropTypes.ObjectIdentifier })
], Extension$1.prototype, "extnID", void 0);
__decorate([
  AsnProp({
    type: AsnPropTypes.Boolean,
    defaultValue: Extension$1.CRITICAL
  })
], Extension$1.prototype, "critical", void 0);
__decorate([
  AsnProp({ type: OctetString2 })
], Extension$1.prototype, "extnValue", void 0);
let Extensions = Extensions_1 = class Extensions2 extends AsnArray {
  constructor(items) {
    super(items);
    Object.setPrototypeOf(this, Extensions_1.prototype);
  }
};
Extensions = Extensions_1 = __decorate([
  AsnType({
    type: AsnTypeTypes.Sequence,
    itemType: Extension$1
  })
], Extensions);
var Version$2;
(function(Version2) {
  Version2[Version2["v1"] = 0] = "v1";
  Version2[Version2["v2"] = 1] = "v2";
  Version2[Version2["v3"] = 2] = "v3";
})(Version$2 || (Version$2 = {}));
class TBSCertificate {
  version = Version$2.v1;
  serialNumber = new ArrayBuffer(0);
  signature = new AlgorithmIdentifier();
  issuer = new Name$1();
  validity = new Validity();
  subject = new Name$1();
  subjectPublicKeyInfo = new SubjectPublicKeyInfo();
  issuerUniqueID;
  subjectUniqueID;
  extensions;
  constructor(params = {}) {
    Object.assign(this, params);
  }
}
__decorate([
  AsnProp({
    type: AsnPropTypes.Integer,
    context: 0,
    defaultValue: Version$2.v1
  })
], TBSCertificate.prototype, "version", void 0);
__decorate([
  AsnProp({
    type: AsnPropTypes.Integer,
    converter: AsnIntegerArrayBufferConverter
  })
], TBSCertificate.prototype, "serialNumber", void 0);
__decorate([
  AsnProp({ type: AlgorithmIdentifier })
], TBSCertificate.prototype, "signature", void 0);
__decorate([
  AsnProp({ type: Name$1 })
], TBSCertificate.prototype, "issuer", void 0);
__decorate([
  AsnProp({ type: Validity })
], TBSCertificate.prototype, "validity", void 0);
__decorate([
  AsnProp({ type: Name$1 })
], TBSCertificate.prototype, "subject", void 0);
__decorate([
  AsnProp({ type: SubjectPublicKeyInfo })
], TBSCertificate.prototype, "subjectPublicKeyInfo", void 0);
__decorate([
  AsnProp({
    type: AsnPropTypes.BitString,
    context: 1,
    implicit: true,
    optional: true
  })
], TBSCertificate.prototype, "issuerUniqueID", void 0);
__decorate([
  AsnProp({
    type: AsnPropTypes.BitString,
    context: 2,
    implicit: true,
    optional: true
  })
], TBSCertificate.prototype, "subjectUniqueID", void 0);
__decorate([
  AsnProp({
    type: Extensions,
    context: 3,
    optional: true
  })
], TBSCertificate.prototype, "extensions", void 0);
class Certificate {
  tbsCertificate = new TBSCertificate();
  tbsCertificateRaw;
  signatureAlgorithm = new AlgorithmIdentifier();
  signatureValue = new ArrayBuffer(0);
  constructor(params = {}) {
    Object.assign(this, params);
  }
}
__decorate([
  AsnProp({
    type: TBSCertificate,
    raw: true
  })
], Certificate.prototype, "tbsCertificate", void 0);
__decorate([
  AsnProp({ type: AlgorithmIdentifier })
], Certificate.prototype, "signatureAlgorithm", void 0);
__decorate([
  AsnProp({ type: AsnPropTypes.BitString })
], Certificate.prototype, "signatureValue", void 0);
class RevokedCertificate {
  userCertificate = new ArrayBuffer(0);
  revocationDate = new Time();
  crlEntryExtensions;
  constructor(params = {}) {
    Object.assign(this, params);
  }
}
__decorate([
  AsnProp({
    type: AsnPropTypes.Integer,
    converter: AsnIntegerArrayBufferConverter
  })
], RevokedCertificate.prototype, "userCertificate", void 0);
__decorate([
  AsnProp({ type: Time })
], RevokedCertificate.prototype, "revocationDate", void 0);
__decorate([
  AsnProp({
    type: Extension$1,
    optional: true,
    repeated: "sequence"
  })
], RevokedCertificate.prototype, "crlEntryExtensions", void 0);
class TBSCertList {
  version;
  signature = new AlgorithmIdentifier();
  issuer = new Name$1();
  thisUpdate = new Time();
  nextUpdate;
  revokedCertificates;
  crlExtensions;
  constructor(params = {}) {
    Object.assign(this, params);
  }
}
__decorate([
  AsnProp({
    type: AsnPropTypes.Integer,
    optional: true
  })
], TBSCertList.prototype, "version", void 0);
__decorate([
  AsnProp({ type: AlgorithmIdentifier })
], TBSCertList.prototype, "signature", void 0);
__decorate([
  AsnProp({ type: Name$1 })
], TBSCertList.prototype, "issuer", void 0);
__decorate([
  AsnProp({ type: Time })
], TBSCertList.prototype, "thisUpdate", void 0);
__decorate([
  AsnProp({
    type: Time,
    optional: true
  })
], TBSCertList.prototype, "nextUpdate", void 0);
__decorate([
  AsnProp({
    type: RevokedCertificate,
    repeated: "sequence",
    optional: true
  })
], TBSCertList.prototype, "revokedCertificates", void 0);
__decorate([
  AsnProp({
    type: Extension$1,
    optional: true,
    context: 0,
    repeated: "sequence"
  })
], TBSCertList.prototype, "crlExtensions", void 0);
class CertificateList {
  tbsCertList = new TBSCertList();
  tbsCertListRaw;
  signatureAlgorithm = new AlgorithmIdentifier();
  signature = new ArrayBuffer(0);
  constructor(params = {}) {
    Object.assign(this, params);
  }
}
__decorate([
  AsnProp({
    type: TBSCertList,
    raw: true
  })
], CertificateList.prototype, "tbsCertList", void 0);
__decorate([
  AsnProp({ type: AlgorithmIdentifier })
], CertificateList.prototype, "signatureAlgorithm", void 0);
__decorate([
  AsnProp({ type: AsnPropTypes.BitString })
], CertificateList.prototype, "signature", void 0);
const issuerSubjectIDKey = {
  "2.5.4.6": "C",
  "2.5.4.10": "O",
  "2.5.4.11": "OU",
  "2.5.4.3": "CN"
};
function getCertificateInfo(leafCertBuffer) {
  const x509 = AsnParser.parse(leafCertBuffer, Certificate);
  const parsedCert = x509.tbsCertificate;
  const issuer = { combined: "" };
  parsedCert.issuer.forEach(([iss]) => {
    const key2 = issuerSubjectIDKey[iss.type];
    if (key2) {
      issuer[key2] = iss.value.toString();
    }
  });
  issuer.combined = issuerSubjectToString(issuer);
  const subject = { combined: "" };
  parsedCert.subject.forEach(([iss]) => {
    const key2 = issuerSubjectIDKey[iss.type];
    if (key2) {
      subject[key2] = iss.value.toString();
    }
  });
  subject.combined = issuerSubjectToString(subject);
  let basicConstraintsCA = false;
  if (parsedCert.extensions) {
    for (const ext of parsedCert.extensions) {
      if (ext.extnID === id_ce_basicConstraints) {
        const basicConstraints = AsnParser.parse(ext.extnValue, BasicConstraints);
        basicConstraintsCA = basicConstraints.cA;
      }
    }
  }
  return {
    issuer,
    subject,
    version: parsedCert.version,
    basicConstraintsCA,
    notBefore: parsedCert.validity.notBefore.getTime(),
    notAfter: parsedCert.validity.notAfter.getTime(),
    parsedCertificate: x509
  };
}
function issuerSubjectToString(input) {
  const parts = [];
  if (input.C) {
    parts.push(input.C);
  }
  if (input.O) {
    parts.push(input.O);
  }
  if (input.OU) {
    parts.push(input.OU);
  }
  if (input.CN) {
    parts.push(input.CN);
  }
  return parts.join(" : ");
}
var commonjsGlobal = typeof globalThis !== "undefined" ? globalThis : typeof window !== "undefined" ? window : typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : {};
var _Reflect = {};
/*! *****************************************************************************
Copyright (C) Microsoft. All rights reserved.
Licensed under the Apache License, Version 2.0 (the "License"); you may not use
this file except in compliance with the License. You may obtain a copy of the
License at http://www.apache.org/licenses/LICENSE-2.0

THIS CODE IS PROVIDED ON AN *AS IS* BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
KIND, EITHER EXPRESS OR IMPLIED, INCLUDING WITHOUT LIMITATION ANY IMPLIED
WARRANTIES OR CONDITIONS OF TITLE, FITNESS FOR A PARTICULAR PURPOSE,
MERCHANTABLITY OR NON-INFRINGEMENT.

See the Apache Version 2.0 License for specific language governing permissions
and limitations under the License.
***************************************************************************** */
var hasRequired_Reflect;
function require_Reflect() {
  if (hasRequired_Reflect) return _Reflect;
  hasRequired_Reflect = 1;
  var Reflect2;
  (function(Reflect3) {
    (function(factory) {
      var root = typeof globalThis === "object" ? globalThis : typeof commonjsGlobal === "object" ? commonjsGlobal : typeof self === "object" ? self : typeof this === "object" ? this : sloppyModeThis();
      var exporter = makeExporter(Reflect3);
      if (typeof root.Reflect !== "undefined") {
        exporter = makeExporter(root.Reflect, exporter);
      }
      factory(exporter, root);
      if (typeof root.Reflect === "undefined") {
        root.Reflect = Reflect3;
      }
      function makeExporter(target, previous) {
        return function(key2, value) {
          Object.defineProperty(target, key2, { configurable: true, writable: true, value });
          if (previous)
            previous(key2, value);
        };
      }
      function functionThis() {
        try {
          return Function("return this;")();
        } catch (_) {
        }
      }
      function indirectEvalThis() {
        try {
          return (void 0, eval)("(function() { return this; })()");
        } catch (_) {
        }
      }
      function sloppyModeThis() {
        return functionThis() || indirectEvalThis();
      }
    })(function(exporter, root) {
      var hasOwn = Object.prototype.hasOwnProperty;
      var supportsSymbol = typeof Symbol === "function";
      var toPrimitiveSymbol = supportsSymbol && typeof Symbol.toPrimitive !== "undefined" ? Symbol.toPrimitive : "@@toPrimitive";
      var iteratorSymbol = supportsSymbol && typeof Symbol.iterator !== "undefined" ? Symbol.iterator : "@@iterator";
      var supportsCreate = typeof Object.create === "function";
      var supportsProto = { __proto__: [] } instanceof Array;
      var downLevel = !supportsCreate && !supportsProto;
      var HashMap = {
        // create an object in dictionary mode (a.k.a. "slow" mode in v8)
        create: supportsCreate ? function() {
          return MakeDictionary(/* @__PURE__ */ Object.create(null));
        } : supportsProto ? function() {
          return MakeDictionary({ __proto__: null });
        } : function() {
          return MakeDictionary({});
        },
        has: downLevel ? function(map, key2) {
          return hasOwn.call(map, key2);
        } : function(map, key2) {
          return key2 in map;
        },
        get: downLevel ? function(map, key2) {
          return hasOwn.call(map, key2) ? map[key2] : void 0;
        } : function(map, key2) {
          return map[key2];
        }
      };
      var functionPrototype = Object.getPrototypeOf(Function);
      var _Map = typeof Map === "function" && typeof Map.prototype.entries === "function" ? Map : CreateMapPolyfill();
      var _Set = typeof Set === "function" && typeof Set.prototype.entries === "function" ? Set : CreateSetPolyfill();
      var _WeakMap = typeof WeakMap === "function" ? WeakMap : CreateWeakMapPolyfill();
      var registrySymbol = supportsSymbol ? Symbol.for("@reflect-metadata:registry") : void 0;
      var metadataRegistry = GetOrCreateMetadataRegistry();
      var metadataProvider = CreateMetadataProvider(metadataRegistry);
      function decorate(decorators, target, propertyKey, attributes) {
        if (!IsUndefined(propertyKey)) {
          if (!IsArray(decorators))
            throw new TypeError();
          if (!IsObject(target))
            throw new TypeError();
          if (!IsObject(attributes) && !IsUndefined(attributes) && !IsNull(attributes))
            throw new TypeError();
          if (IsNull(attributes))
            attributes = void 0;
          propertyKey = ToPropertyKey(propertyKey);
          return DecorateProperty(decorators, target, propertyKey, attributes);
        } else {
          if (!IsArray(decorators))
            throw new TypeError();
          if (!IsConstructor(target))
            throw new TypeError();
          return DecorateConstructor(decorators, target);
        }
      }
      exporter("decorate", decorate);
      function metadata(metadataKey, metadataValue) {
        function decorator(target, propertyKey) {
          if (!IsObject(target))
            throw new TypeError();
          if (!IsUndefined(propertyKey) && !IsPropertyKey(propertyKey))
            throw new TypeError();
          OrdinaryDefineOwnMetadata(metadataKey, metadataValue, target, propertyKey);
        }
        return decorator;
      }
      exporter("metadata", metadata);
      function defineMetadata(metadataKey, metadataValue, target, propertyKey) {
        if (!IsObject(target))
          throw new TypeError();
        if (!IsUndefined(propertyKey))
          propertyKey = ToPropertyKey(propertyKey);
        return OrdinaryDefineOwnMetadata(metadataKey, metadataValue, target, propertyKey);
      }
      exporter("defineMetadata", defineMetadata);
      function hasMetadata(metadataKey, target, propertyKey) {
        if (!IsObject(target))
          throw new TypeError();
        if (!IsUndefined(propertyKey))
          propertyKey = ToPropertyKey(propertyKey);
        return OrdinaryHasMetadata(metadataKey, target, propertyKey);
      }
      exporter("hasMetadata", hasMetadata);
      function hasOwnMetadata(metadataKey, target, propertyKey) {
        if (!IsObject(target))
          throw new TypeError();
        if (!IsUndefined(propertyKey))
          propertyKey = ToPropertyKey(propertyKey);
        return OrdinaryHasOwnMetadata(metadataKey, target, propertyKey);
      }
      exporter("hasOwnMetadata", hasOwnMetadata);
      function getMetadata(metadataKey, target, propertyKey) {
        if (!IsObject(target))
          throw new TypeError();
        if (!IsUndefined(propertyKey))
          propertyKey = ToPropertyKey(propertyKey);
        return OrdinaryGetMetadata(metadataKey, target, propertyKey);
      }
      exporter("getMetadata", getMetadata);
      function getOwnMetadata(metadataKey, target, propertyKey) {
        if (!IsObject(target))
          throw new TypeError();
        if (!IsUndefined(propertyKey))
          propertyKey = ToPropertyKey(propertyKey);
        return OrdinaryGetOwnMetadata(metadataKey, target, propertyKey);
      }
      exporter("getOwnMetadata", getOwnMetadata);
      function getMetadataKeys(target, propertyKey) {
        if (!IsObject(target))
          throw new TypeError();
        if (!IsUndefined(propertyKey))
          propertyKey = ToPropertyKey(propertyKey);
        return OrdinaryMetadataKeys(target, propertyKey);
      }
      exporter("getMetadataKeys", getMetadataKeys);
      function getOwnMetadataKeys(target, propertyKey) {
        if (!IsObject(target))
          throw new TypeError();
        if (!IsUndefined(propertyKey))
          propertyKey = ToPropertyKey(propertyKey);
        return OrdinaryOwnMetadataKeys(target, propertyKey);
      }
      exporter("getOwnMetadataKeys", getOwnMetadataKeys);
      function deleteMetadata(metadataKey, target, propertyKey) {
        if (!IsObject(target))
          throw new TypeError();
        if (!IsUndefined(propertyKey))
          propertyKey = ToPropertyKey(propertyKey);
        if (!IsObject(target))
          throw new TypeError();
        if (!IsUndefined(propertyKey))
          propertyKey = ToPropertyKey(propertyKey);
        var provider = GetMetadataProvider(
          target,
          propertyKey,
          /*Create*/
          false
        );
        if (IsUndefined(provider))
          return false;
        return provider.OrdinaryDeleteMetadata(metadataKey, target, propertyKey);
      }
      exporter("deleteMetadata", deleteMetadata);
      function DecorateConstructor(decorators, target) {
        for (var i = decorators.length - 1; i >= 0; --i) {
          var decorator = decorators[i];
          var decorated = decorator(target);
          if (!IsUndefined(decorated) && !IsNull(decorated)) {
            if (!IsConstructor(decorated))
              throw new TypeError();
            target = decorated;
          }
        }
        return target;
      }
      function DecorateProperty(decorators, target, propertyKey, descriptor) {
        for (var i = decorators.length - 1; i >= 0; --i) {
          var decorator = decorators[i];
          var decorated = decorator(target, propertyKey, descriptor);
          if (!IsUndefined(decorated) && !IsNull(decorated)) {
            if (!IsObject(decorated))
              throw new TypeError();
            descriptor = decorated;
          }
        }
        return descriptor;
      }
      function OrdinaryHasMetadata(MetadataKey, O, P) {
        var hasOwn2 = OrdinaryHasOwnMetadata(MetadataKey, O, P);
        if (hasOwn2)
          return true;
        var parent = OrdinaryGetPrototypeOf(O);
        if (!IsNull(parent))
          return OrdinaryHasMetadata(MetadataKey, parent, P);
        return false;
      }
      function OrdinaryHasOwnMetadata(MetadataKey, O, P) {
        var provider = GetMetadataProvider(
          O,
          P,
          /*Create*/
          false
        );
        if (IsUndefined(provider))
          return false;
        return ToBoolean(provider.OrdinaryHasOwnMetadata(MetadataKey, O, P));
      }
      function OrdinaryGetMetadata(MetadataKey, O, P) {
        var hasOwn2 = OrdinaryHasOwnMetadata(MetadataKey, O, P);
        if (hasOwn2)
          return OrdinaryGetOwnMetadata(MetadataKey, O, P);
        var parent = OrdinaryGetPrototypeOf(O);
        if (!IsNull(parent))
          return OrdinaryGetMetadata(MetadataKey, parent, P);
        return void 0;
      }
      function OrdinaryGetOwnMetadata(MetadataKey, O, P) {
        var provider = GetMetadataProvider(
          O,
          P,
          /*Create*/
          false
        );
        if (IsUndefined(provider))
          return;
        return provider.OrdinaryGetOwnMetadata(MetadataKey, O, P);
      }
      function OrdinaryDefineOwnMetadata(MetadataKey, MetadataValue, O, P) {
        var provider = GetMetadataProvider(
          O,
          P,
          /*Create*/
          true
        );
        provider.OrdinaryDefineOwnMetadata(MetadataKey, MetadataValue, O, P);
      }
      function OrdinaryMetadataKeys(O, P) {
        var ownKeys = OrdinaryOwnMetadataKeys(O, P);
        var parent = OrdinaryGetPrototypeOf(O);
        if (parent === null)
          return ownKeys;
        var parentKeys = OrdinaryMetadataKeys(parent, P);
        if (parentKeys.length <= 0)
          return ownKeys;
        if (ownKeys.length <= 0)
          return parentKeys;
        var set = new _Set();
        var keys = [];
        for (var _i = 0, ownKeys_1 = ownKeys; _i < ownKeys_1.length; _i++) {
          var key2 = ownKeys_1[_i];
          var hasKey = set.has(key2);
          if (!hasKey) {
            set.add(key2);
            keys.push(key2);
          }
        }
        for (var _a2 = 0, parentKeys_1 = parentKeys; _a2 < parentKeys_1.length; _a2++) {
          var key2 = parentKeys_1[_a2];
          var hasKey = set.has(key2);
          if (!hasKey) {
            set.add(key2);
            keys.push(key2);
          }
        }
        return keys;
      }
      function OrdinaryOwnMetadataKeys(O, P) {
        var provider = GetMetadataProvider(
          O,
          P,
          /*create*/
          false
        );
        if (!provider) {
          return [];
        }
        return provider.OrdinaryOwnMetadataKeys(O, P);
      }
      function Type(x) {
        if (x === null)
          return 1;
        switch (typeof x) {
          case "undefined":
            return 0;
          case "boolean":
            return 2;
          case "string":
            return 3;
          case "symbol":
            return 4;
          case "number":
            return 5;
          case "object":
            return x === null ? 1 : 6;
          default:
            return 6;
        }
      }
      function IsUndefined(x) {
        return x === void 0;
      }
      function IsNull(x) {
        return x === null;
      }
      function IsSymbol(x) {
        return typeof x === "symbol";
      }
      function IsObject(x) {
        return typeof x === "object" ? x !== null : typeof x === "function";
      }
      function ToPrimitive(input, PreferredType) {
        switch (Type(input)) {
          case 0:
            return input;
          case 1:
            return input;
          case 2:
            return input;
          case 3:
            return input;
          case 4:
            return input;
          case 5:
            return input;
        }
        var hint = "string";
        var exoticToPrim = GetMethod(input, toPrimitiveSymbol);
        if (exoticToPrim !== void 0) {
          var result = exoticToPrim.call(input, hint);
          if (IsObject(result))
            throw new TypeError();
          return result;
        }
        return OrdinaryToPrimitive(input);
      }
      function OrdinaryToPrimitive(O, hint) {
        var valueOf, result;
        {
          var toString_1 = O.toString;
          if (IsCallable(toString_1)) {
            var result = toString_1.call(O);
            if (!IsObject(result))
              return result;
          }
          var valueOf = O.valueOf;
          if (IsCallable(valueOf)) {
            var result = valueOf.call(O);
            if (!IsObject(result))
              return result;
          }
        }
        throw new TypeError();
      }
      function ToBoolean(argument) {
        return !!argument;
      }
      function ToString(argument) {
        return "" + argument;
      }
      function ToPropertyKey(argument) {
        var key2 = ToPrimitive(argument);
        if (IsSymbol(key2))
          return key2;
        return ToString(key2);
      }
      function IsArray(argument) {
        return Array.isArray ? Array.isArray(argument) : argument instanceof Object ? argument instanceof Array : Object.prototype.toString.call(argument) === "[object Array]";
      }
      function IsCallable(argument) {
        return typeof argument === "function";
      }
      function IsConstructor(argument) {
        return typeof argument === "function";
      }
      function IsPropertyKey(argument) {
        switch (Type(argument)) {
          case 3:
            return true;
          case 4:
            return true;
          default:
            return false;
        }
      }
      function SameValueZero(x, y) {
        return x === y || x !== x && y !== y;
      }
      function GetMethod(V, P) {
        var func = V[P];
        if (func === void 0 || func === null)
          return void 0;
        if (!IsCallable(func))
          throw new TypeError();
        return func;
      }
      function GetIterator(obj) {
        var method = GetMethod(obj, iteratorSymbol);
        if (!IsCallable(method))
          throw new TypeError();
        var iterator = method.call(obj);
        if (!IsObject(iterator))
          throw new TypeError();
        return iterator;
      }
      function IteratorValue(iterResult) {
        return iterResult.value;
      }
      function IteratorStep(iterator) {
        var result = iterator.next();
        return result.done ? false : result;
      }
      function IteratorClose(iterator) {
        var f = iterator["return"];
        if (f)
          f.call(iterator);
      }
      function OrdinaryGetPrototypeOf(O) {
        var proto = Object.getPrototypeOf(O);
        if (typeof O !== "function" || O === functionPrototype)
          return proto;
        if (proto !== functionPrototype)
          return proto;
        var prototype = O.prototype;
        var prototypeProto = prototype && Object.getPrototypeOf(prototype);
        if (prototypeProto == null || prototypeProto === Object.prototype)
          return proto;
        var constructor = prototypeProto.constructor;
        if (typeof constructor !== "function")
          return proto;
        if (constructor === O)
          return proto;
        return constructor;
      }
      function CreateMetadataRegistry() {
        var fallback;
        if (!IsUndefined(registrySymbol) && typeof root.Reflect !== "undefined" && !(registrySymbol in root.Reflect) && typeof root.Reflect.defineMetadata === "function") {
          fallback = CreateFallbackProvider(root.Reflect);
        }
        var first;
        var second;
        var rest;
        var targetProviderMap = new _WeakMap();
        var registry = {
          registerProvider,
          getProvider,
          setProvider
        };
        return registry;
        function registerProvider(provider) {
          if (!Object.isExtensible(registry)) {
            throw new Error("Cannot add provider to a frozen registry.");
          }
          switch (true) {
            case fallback === provider:
              break;
            case IsUndefined(first):
              first = provider;
              break;
            case first === provider:
              break;
            case IsUndefined(second):
              second = provider;
              break;
            case second === provider:
              break;
            default:
              if (rest === void 0)
                rest = new _Set();
              rest.add(provider);
              break;
          }
        }
        function getProviderNoCache(O, P) {
          if (!IsUndefined(first)) {
            if (first.isProviderFor(O, P))
              return first;
            if (!IsUndefined(second)) {
              if (second.isProviderFor(O, P))
                return first;
              if (!IsUndefined(rest)) {
                var iterator = GetIterator(rest);
                while (true) {
                  var next = IteratorStep(iterator);
                  if (!next) {
                    return void 0;
                  }
                  var provider = IteratorValue(next);
                  if (provider.isProviderFor(O, P)) {
                    IteratorClose(iterator);
                    return provider;
                  }
                }
              }
            }
          }
          if (!IsUndefined(fallback) && fallback.isProviderFor(O, P)) {
            return fallback;
          }
          return void 0;
        }
        function getProvider(O, P) {
          var providerMap = targetProviderMap.get(O);
          var provider;
          if (!IsUndefined(providerMap)) {
            provider = providerMap.get(P);
          }
          if (!IsUndefined(provider)) {
            return provider;
          }
          provider = getProviderNoCache(O, P);
          if (!IsUndefined(provider)) {
            if (IsUndefined(providerMap)) {
              providerMap = new _Map();
              targetProviderMap.set(O, providerMap);
            }
            providerMap.set(P, provider);
          }
          return provider;
        }
        function hasProvider(provider) {
          if (IsUndefined(provider))
            throw new TypeError();
          return first === provider || second === provider || !IsUndefined(rest) && rest.has(provider);
        }
        function setProvider(O, P, provider) {
          if (!hasProvider(provider)) {
            throw new Error("Metadata provider not registered.");
          }
          var existingProvider = getProvider(O, P);
          if (existingProvider !== provider) {
            if (!IsUndefined(existingProvider)) {
              return false;
            }
            var providerMap = targetProviderMap.get(O);
            if (IsUndefined(providerMap)) {
              providerMap = new _Map();
              targetProviderMap.set(O, providerMap);
            }
            providerMap.set(P, provider);
          }
          return true;
        }
      }
      function GetOrCreateMetadataRegistry() {
        var metadataRegistry2;
        if (!IsUndefined(registrySymbol) && IsObject(root.Reflect) && Object.isExtensible(root.Reflect)) {
          metadataRegistry2 = root.Reflect[registrySymbol];
        }
        if (IsUndefined(metadataRegistry2)) {
          metadataRegistry2 = CreateMetadataRegistry();
        }
        if (!IsUndefined(registrySymbol) && IsObject(root.Reflect) && Object.isExtensible(root.Reflect)) {
          Object.defineProperty(root.Reflect, registrySymbol, {
            enumerable: false,
            configurable: false,
            writable: false,
            value: metadataRegistry2
          });
        }
        return metadataRegistry2;
      }
      function CreateMetadataProvider(registry) {
        var metadata2 = new _WeakMap();
        var provider = {
          isProviderFor: function(O, P) {
            var targetMetadata = metadata2.get(O);
            if (IsUndefined(targetMetadata))
              return false;
            return targetMetadata.has(P);
          },
          OrdinaryDefineOwnMetadata: OrdinaryDefineOwnMetadata2,
          OrdinaryHasOwnMetadata: OrdinaryHasOwnMetadata2,
          OrdinaryGetOwnMetadata: OrdinaryGetOwnMetadata2,
          OrdinaryOwnMetadataKeys: OrdinaryOwnMetadataKeys2,
          OrdinaryDeleteMetadata
        };
        metadataRegistry.registerProvider(provider);
        return provider;
        function GetOrCreateMetadataMap(O, P, Create) {
          var targetMetadata = metadata2.get(O);
          var createdTargetMetadata = false;
          if (IsUndefined(targetMetadata)) {
            if (!Create)
              return void 0;
            targetMetadata = new _Map();
            metadata2.set(O, targetMetadata);
            createdTargetMetadata = true;
          }
          var metadataMap = targetMetadata.get(P);
          if (IsUndefined(metadataMap)) {
            if (!Create)
              return void 0;
            metadataMap = new _Map();
            targetMetadata.set(P, metadataMap);
            if (!registry.setProvider(O, P, provider)) {
              targetMetadata.delete(P);
              if (createdTargetMetadata) {
                metadata2.delete(O);
              }
              throw new Error("Wrong provider for target.");
            }
          }
          return metadataMap;
        }
        function OrdinaryHasOwnMetadata2(MetadataKey, O, P) {
          var metadataMap = GetOrCreateMetadataMap(
            O,
            P,
            /*Create*/
            false
          );
          if (IsUndefined(metadataMap))
            return false;
          return ToBoolean(metadataMap.has(MetadataKey));
        }
        function OrdinaryGetOwnMetadata2(MetadataKey, O, P) {
          var metadataMap = GetOrCreateMetadataMap(
            O,
            P,
            /*Create*/
            false
          );
          if (IsUndefined(metadataMap))
            return void 0;
          return metadataMap.get(MetadataKey);
        }
        function OrdinaryDefineOwnMetadata2(MetadataKey, MetadataValue, O, P) {
          var metadataMap = GetOrCreateMetadataMap(
            O,
            P,
            /*Create*/
            true
          );
          metadataMap.set(MetadataKey, MetadataValue);
        }
        function OrdinaryOwnMetadataKeys2(O, P) {
          var keys = [];
          var metadataMap = GetOrCreateMetadataMap(
            O,
            P,
            /*Create*/
            false
          );
          if (IsUndefined(metadataMap))
            return keys;
          var keysObj = metadataMap.keys();
          var iterator = GetIterator(keysObj);
          var k = 0;
          while (true) {
            var next = IteratorStep(iterator);
            if (!next) {
              keys.length = k;
              return keys;
            }
            var nextValue = IteratorValue(next);
            try {
              keys[k] = nextValue;
            } catch (e) {
              try {
                IteratorClose(iterator);
              } finally {
                throw e;
              }
            }
            k++;
          }
        }
        function OrdinaryDeleteMetadata(MetadataKey, O, P) {
          var metadataMap = GetOrCreateMetadataMap(
            O,
            P,
            /*Create*/
            false
          );
          if (IsUndefined(metadataMap))
            return false;
          if (!metadataMap.delete(MetadataKey))
            return false;
          if (metadataMap.size === 0) {
            var targetMetadata = metadata2.get(O);
            if (!IsUndefined(targetMetadata)) {
              targetMetadata.delete(P);
              if (targetMetadata.size === 0) {
                metadata2.delete(targetMetadata);
              }
            }
          }
          return true;
        }
      }
      function CreateFallbackProvider(reflect) {
        var defineMetadata2 = reflect.defineMetadata, hasOwnMetadata2 = reflect.hasOwnMetadata, getOwnMetadata2 = reflect.getOwnMetadata, getOwnMetadataKeys2 = reflect.getOwnMetadataKeys, deleteMetadata2 = reflect.deleteMetadata;
        var metadataOwner = new _WeakMap();
        var provider = {
          isProviderFor: function(O, P) {
            var metadataPropertySet = metadataOwner.get(O);
            if (!IsUndefined(metadataPropertySet) && metadataPropertySet.has(P)) {
              return true;
            }
            if (getOwnMetadataKeys2(O, P).length) {
              if (IsUndefined(metadataPropertySet)) {
                metadataPropertySet = new _Set();
                metadataOwner.set(O, metadataPropertySet);
              }
              metadataPropertySet.add(P);
              return true;
            }
            return false;
          },
          OrdinaryDefineOwnMetadata: defineMetadata2,
          OrdinaryHasOwnMetadata: hasOwnMetadata2,
          OrdinaryGetOwnMetadata: getOwnMetadata2,
          OrdinaryOwnMetadataKeys: getOwnMetadataKeys2,
          OrdinaryDeleteMetadata: deleteMetadata2
        };
        return provider;
      }
      function GetMetadataProvider(O, P, Create) {
        var registeredProvider = metadataRegistry.getProvider(O, P);
        if (!IsUndefined(registeredProvider)) {
          return registeredProvider;
        }
        if (Create) {
          if (metadataRegistry.setProvider(O, P, metadataProvider)) {
            return metadataProvider;
          }
          throw new Error("Illegal state.");
        }
        return void 0;
      }
      function CreateMapPolyfill() {
        var cacheSentinel = {};
        var arraySentinel = [];
        var MapIterator = (
          /** @class */
          (function() {
            function MapIterator2(keys, values, selector) {
              this._index = 0;
              this._keys = keys;
              this._values = values;
              this._selector = selector;
            }
            MapIterator2.prototype["@@iterator"] = function() {
              return this;
            };
            MapIterator2.prototype[iteratorSymbol] = function() {
              return this;
            };
            MapIterator2.prototype.next = function() {
              var index2 = this._index;
              if (index2 >= 0 && index2 < this._keys.length) {
                var result = this._selector(this._keys[index2], this._values[index2]);
                if (index2 + 1 >= this._keys.length) {
                  this._index = -1;
                  this._keys = arraySentinel;
                  this._values = arraySentinel;
                } else {
                  this._index++;
                }
                return { value: result, done: false };
              }
              return { value: void 0, done: true };
            };
            MapIterator2.prototype.throw = function(error) {
              if (this._index >= 0) {
                this._index = -1;
                this._keys = arraySentinel;
                this._values = arraySentinel;
              }
              throw error;
            };
            MapIterator2.prototype.return = function(value) {
              if (this._index >= 0) {
                this._index = -1;
                this._keys = arraySentinel;
                this._values = arraySentinel;
              }
              return { value, done: true };
            };
            return MapIterator2;
          })()
        );
        var Map2 = (
          /** @class */
          (function() {
            function Map3() {
              this._keys = [];
              this._values = [];
              this._cacheKey = cacheSentinel;
              this._cacheIndex = -2;
            }
            Object.defineProperty(Map3.prototype, "size", {
              get: function() {
                return this._keys.length;
              },
              enumerable: true,
              configurable: true
            });
            Map3.prototype.has = function(key2) {
              return this._find(
                key2,
                /*insert*/
                false
              ) >= 0;
            };
            Map3.prototype.get = function(key2) {
              var index2 = this._find(
                key2,
                /*insert*/
                false
              );
              return index2 >= 0 ? this._values[index2] : void 0;
            };
            Map3.prototype.set = function(key2, value) {
              var index2 = this._find(
                key2,
                /*insert*/
                true
              );
              this._values[index2] = value;
              return this;
            };
            Map3.prototype.delete = function(key2) {
              var index2 = this._find(
                key2,
                /*insert*/
                false
              );
              if (index2 >= 0) {
                var size = this._keys.length;
                for (var i = index2 + 1; i < size; i++) {
                  this._keys[i - 1] = this._keys[i];
                  this._values[i - 1] = this._values[i];
                }
                this._keys.length--;
                this._values.length--;
                if (SameValueZero(key2, this._cacheKey)) {
                  this._cacheKey = cacheSentinel;
                  this._cacheIndex = -2;
                }
                return true;
              }
              return false;
            };
            Map3.prototype.clear = function() {
              this._keys.length = 0;
              this._values.length = 0;
              this._cacheKey = cacheSentinel;
              this._cacheIndex = -2;
            };
            Map3.prototype.keys = function() {
              return new MapIterator(this._keys, this._values, getKey);
            };
            Map3.prototype.values = function() {
              return new MapIterator(this._keys, this._values, getValue);
            };
            Map3.prototype.entries = function() {
              return new MapIterator(this._keys, this._values, getEntry);
            };
            Map3.prototype["@@iterator"] = function() {
              return this.entries();
            };
            Map3.prototype[iteratorSymbol] = function() {
              return this.entries();
            };
            Map3.prototype._find = function(key2, insert) {
              if (!SameValueZero(this._cacheKey, key2)) {
                this._cacheIndex = -1;
                for (var i = 0; i < this._keys.length; i++) {
                  if (SameValueZero(this._keys[i], key2)) {
                    this._cacheIndex = i;
                    break;
                  }
                }
              }
              if (this._cacheIndex < 0 && insert) {
                this._cacheIndex = this._keys.length;
                this._keys.push(key2);
                this._values.push(void 0);
              }
              return this._cacheIndex;
            };
            return Map3;
          })()
        );
        return Map2;
        function getKey(key2, _) {
          return key2;
        }
        function getValue(_, value) {
          return value;
        }
        function getEntry(key2, value) {
          return [key2, value];
        }
      }
      function CreateSetPolyfill() {
        var Set3 = (
          /** @class */
          (function() {
            function Set4() {
              this._map = new _Map();
            }
            Object.defineProperty(Set4.prototype, "size", {
              get: function() {
                return this._map.size;
              },
              enumerable: true,
              configurable: true
            });
            Set4.prototype.has = function(value) {
              return this._map.has(value);
            };
            Set4.prototype.add = function(value) {
              return this._map.set(value, value), this;
            };
            Set4.prototype.delete = function(value) {
              return this._map.delete(value);
            };
            Set4.prototype.clear = function() {
              this._map.clear();
            };
            Set4.prototype.keys = function() {
              return this._map.keys();
            };
            Set4.prototype.values = function() {
              return this._map.keys();
            };
            Set4.prototype.entries = function() {
              return this._map.entries();
            };
            Set4.prototype["@@iterator"] = function() {
              return this.keys();
            };
            Set4.prototype[iteratorSymbol] = function() {
              return this.keys();
            };
            return Set4;
          })()
        );
        return Set3;
      }
      function CreateWeakMapPolyfill() {
        var UUID_SIZE = 16;
        var keys = HashMap.create();
        var rootKey = CreateUniqueKey();
        return (
          /** @class */
          (function() {
            function WeakMap2() {
              this._key = CreateUniqueKey();
            }
            WeakMap2.prototype.has = function(target) {
              var table = GetOrCreateWeakMapTable(
                target,
                /*create*/
                false
              );
              return table !== void 0 ? HashMap.has(table, this._key) : false;
            };
            WeakMap2.prototype.get = function(target) {
              var table = GetOrCreateWeakMapTable(
                target,
                /*create*/
                false
              );
              return table !== void 0 ? HashMap.get(table, this._key) : void 0;
            };
            WeakMap2.prototype.set = function(target, value) {
              var table = GetOrCreateWeakMapTable(
                target,
                /*create*/
                true
              );
              table[this._key] = value;
              return this;
            };
            WeakMap2.prototype.delete = function(target) {
              var table = GetOrCreateWeakMapTable(
                target,
                /*create*/
                false
              );
              return table !== void 0 ? delete table[this._key] : false;
            };
            WeakMap2.prototype.clear = function() {
              this._key = CreateUniqueKey();
            };
            return WeakMap2;
          })()
        );
        function CreateUniqueKey() {
          var key2;
          do
            key2 = "@@WeakMap@@" + CreateUUID();
          while (HashMap.has(keys, key2));
          keys[key2] = true;
          return key2;
        }
        function GetOrCreateWeakMapTable(target, create2) {
          if (!hasOwn.call(target, rootKey)) {
            if (!create2)
              return void 0;
            Object.defineProperty(target, rootKey, { value: HashMap.create() });
          }
          return target[rootKey];
        }
        function FillRandomBytes(buffer, size) {
          for (var i = 0; i < size; ++i)
            buffer[i] = Math.random() * 255 | 0;
          return buffer;
        }
        function GenRandomBytes(size) {
          if (typeof Uint8Array === "function") {
            var array = new Uint8Array(size);
            if (typeof crypto !== "undefined") {
              crypto.getRandomValues(array);
            } else if (typeof msCrypto !== "undefined") {
              msCrypto.getRandomValues(array);
            } else {
              FillRandomBytes(array, size);
            }
            return array;
          }
          return FillRandomBytes(new Array(size), size);
        }
        function CreateUUID() {
          var data = GenRandomBytes(UUID_SIZE);
          data[6] = data[6] & 79 | 64;
          data[8] = data[8] & 191 | 128;
          var result = "";
          for (var offset = 0; offset < UUID_SIZE; ++offset) {
            var byte = data[offset];
            if (offset === 4 || offset === 6 || offset === 8)
              result += "-";
            if (byte < 16)
              result += "0";
            result += byte.toString(16).toLowerCase();
          }
          return result;
        }
      }
      function MakeDictionary(obj) {
        obj.__ = void 0;
        delete obj.__;
        return obj;
      }
    });
  })(Reflect2 || (Reflect2 = {}));
  return _Reflect;
}
require_Reflect();
class IssuerAndSerialNumber {
  issuer = new Name$1();
  serialNumber = new ArrayBuffer(0);
  constructor(params = {}) {
    Object.assign(this, params);
  }
}
__decorate([
  AsnProp({ type: Name$1 })
], IssuerAndSerialNumber.prototype, "issuer", void 0);
__decorate([
  AsnProp({
    type: AsnPropTypes.Integer,
    converter: AsnIntegerArrayBufferConverter
  })
], IssuerAndSerialNumber.prototype, "serialNumber", void 0);
let SignerIdentifier = class SignerIdentifier2 {
  subjectKeyIdentifier;
  issuerAndSerialNumber;
  constructor(params = {}) {
    Object.assign(this, params);
  }
};
__decorate([
  AsnProp({
    type: SubjectKeyIdentifier,
    context: 0,
    implicit: true
  })
], SignerIdentifier.prototype, "subjectKeyIdentifier", void 0);
__decorate([
  AsnProp({ type: IssuerAndSerialNumber })
], SignerIdentifier.prototype, "issuerAndSerialNumber", void 0);
SignerIdentifier = __decorate([
  AsnType({ type: AsnTypeTypes.Choice })
], SignerIdentifier);
var CMSVersion;
(function(CMSVersion2) {
  CMSVersion2[CMSVersion2["v0"] = 0] = "v0";
  CMSVersion2[CMSVersion2["v1"] = 1] = "v1";
  CMSVersion2[CMSVersion2["v2"] = 2] = "v2";
  CMSVersion2[CMSVersion2["v3"] = 3] = "v3";
  CMSVersion2[CMSVersion2["v4"] = 4] = "v4";
  CMSVersion2[CMSVersion2["v5"] = 5] = "v5";
})(CMSVersion || (CMSVersion = {}));
let DigestAlgorithmIdentifier = class DigestAlgorithmIdentifier2 extends AlgorithmIdentifier {
};
DigestAlgorithmIdentifier = __decorate([
  AsnType({ type: AsnTypeTypes.Sequence })
], DigestAlgorithmIdentifier);
let SignatureAlgorithmIdentifier = class SignatureAlgorithmIdentifier2 extends AlgorithmIdentifier {
};
SignatureAlgorithmIdentifier = __decorate([
  AsnType({ type: AsnTypeTypes.Sequence })
], SignatureAlgorithmIdentifier);
let KeyEncryptionAlgorithmIdentifier = class KeyEncryptionAlgorithmIdentifier2 extends AlgorithmIdentifier {
};
KeyEncryptionAlgorithmIdentifier = __decorate([
  AsnType({ type: AsnTypeTypes.Sequence })
], KeyEncryptionAlgorithmIdentifier);
let ContentEncryptionAlgorithmIdentifier = class ContentEncryptionAlgorithmIdentifier2 extends AlgorithmIdentifier {
};
ContentEncryptionAlgorithmIdentifier = __decorate([
  AsnType({ type: AsnTypeTypes.Sequence })
], ContentEncryptionAlgorithmIdentifier);
let MessageAuthenticationCodeAlgorithm = class MessageAuthenticationCodeAlgorithm2 extends AlgorithmIdentifier {
};
MessageAuthenticationCodeAlgorithm = __decorate([
  AsnType({ type: AsnTypeTypes.Sequence })
], MessageAuthenticationCodeAlgorithm);
let KeyDerivationAlgorithmIdentifier = class KeyDerivationAlgorithmIdentifier2 extends AlgorithmIdentifier {
};
KeyDerivationAlgorithmIdentifier = __decorate([
  AsnType({ type: AsnTypeTypes.Sequence })
], KeyDerivationAlgorithmIdentifier);
let Attribute$1 = class Attribute2 {
  attrType = "";
  attrValues = [];
  constructor(params = {}) {
    Object.assign(this, params);
  }
};
__decorate([
  AsnProp({ type: AsnPropTypes.ObjectIdentifier })
], Attribute$1.prototype, "attrType", void 0);
__decorate([
  AsnProp({
    type: AsnPropTypes.Any,
    repeated: "set"
  })
], Attribute$1.prototype, "attrValues", void 0);
var SignerInfos_1;
class SignerInfo {
  version = CMSVersion.v0;
  sid = new SignerIdentifier();
  digestAlgorithm = new DigestAlgorithmIdentifier();
  signedAttrs;
  signedAttrsRaw;
  signatureAlgorithm = new SignatureAlgorithmIdentifier();
  signature = new OctetString2();
  unsignedAttrs;
  constructor(params = {}) {
    Object.assign(this, params);
  }
}
__decorate([
  AsnProp({ type: AsnPropTypes.Integer })
], SignerInfo.prototype, "version", void 0);
__decorate([
  AsnProp({ type: SignerIdentifier })
], SignerInfo.prototype, "sid", void 0);
__decorate([
  AsnProp({ type: DigestAlgorithmIdentifier })
], SignerInfo.prototype, "digestAlgorithm", void 0);
__decorate([
  AsnProp({
    type: Attribute$1,
    repeated: "set",
    context: 0,
    implicit: true,
    optional: true,
    raw: true
  })
], SignerInfo.prototype, "signedAttrs", void 0);
__decorate([
  AsnProp({ type: SignatureAlgorithmIdentifier })
], SignerInfo.prototype, "signatureAlgorithm", void 0);
__decorate([
  AsnProp({ type: OctetString2 })
], SignerInfo.prototype, "signature", void 0);
__decorate([
  AsnProp({
    type: Attribute$1,
    repeated: "set",
    context: 1,
    implicit: true,
    optional: true
  })
], SignerInfo.prototype, "unsignedAttrs", void 0);
let SignerInfos = SignerInfos_1 = class SignerInfos2 extends AsnArray {
  constructor(items) {
    super(items);
    Object.setPrototypeOf(this, SignerInfos_1.prototype);
  }
};
SignerInfos = SignerInfos_1 = __decorate([
  AsnType({
    type: AsnTypeTypes.Set,
    itemType: SignerInfo
  })
], SignerInfos);
let CounterSignature$1 = class CounterSignature extends SignerInfo {
};
CounterSignature$1 = __decorate([
  AsnType({ type: AsnTypeTypes.Sequence })
], CounterSignature$1);
let SigningTime$1 = class SigningTime extends Time {
};
SigningTime$1 = __decorate([
  AsnType({ type: AsnTypeTypes.Choice })
], SigningTime$1);
class ACClearAttrs {
  acIssuer = new GeneralName$1();
  acSerial = 0;
  attrs = [];
  constructor(params = {}) {
    Object.assign(this, params);
  }
}
__decorate([
  AsnProp({ type: GeneralName$1 })
], ACClearAttrs.prototype, "acIssuer", void 0);
__decorate([
  AsnProp({ type: AsnPropTypes.Integer })
], ACClearAttrs.prototype, "acSerial", void 0);
__decorate([
  AsnProp({
    type: Attribute$2,
    repeated: "sequence"
  })
], ACClearAttrs.prototype, "attrs", void 0);
var AttrSpec_1;
let AttrSpec = AttrSpec_1 = class AttrSpec2 extends AsnArray {
  constructor(items) {
    super(items);
    Object.setPrototypeOf(this, AttrSpec_1.prototype);
  }
};
AttrSpec = AttrSpec_1 = __decorate([
  AsnType({
    type: AsnTypeTypes.Sequence,
    itemType: AsnPropTypes.ObjectIdentifier
  })
], AttrSpec);
class AAControls {
  pathLenConstraint;
  permittedAttrs;
  excludedAttrs;
  permitUnSpecified = true;
  constructor(params = {}) {
    Object.assign(this, params);
  }
}
__decorate([
  AsnProp({
    type: AsnPropTypes.Integer,
    optional: true
  })
], AAControls.prototype, "pathLenConstraint", void 0);
__decorate([
  AsnProp({
    type: AttrSpec,
    implicit: true,
    context: 0,
    optional: true
  })
], AAControls.prototype, "permittedAttrs", void 0);
__decorate([
  AsnProp({
    type: AttrSpec,
    implicit: true,
    context: 1,
    optional: true
  })
], AAControls.prototype, "excludedAttrs", void 0);
__decorate([
  AsnProp({
    type: AsnPropTypes.Boolean,
    defaultValue: true
  })
], AAControls.prototype, "permitUnSpecified", void 0);
class IssuerSerial {
  issuer = new GeneralNames$1();
  serial = new ArrayBuffer(0);
  issuerUID = new ArrayBuffer(0);
  constructor(params = {}) {
    Object.assign(this, params);
  }
}
__decorate([
  AsnProp({ type: GeneralNames$1 })
], IssuerSerial.prototype, "issuer", void 0);
__decorate([
  AsnProp({
    type: AsnPropTypes.Integer,
    converter: AsnIntegerArrayBufferConverter
  })
], IssuerSerial.prototype, "serial", void 0);
__decorate([
  AsnProp({
    type: AsnPropTypes.BitString,
    optional: true
  })
], IssuerSerial.prototype, "issuerUID", void 0);
var DigestedObjectType;
(function(DigestedObjectType2) {
  DigestedObjectType2[DigestedObjectType2["publicKey"] = 0] = "publicKey";
  DigestedObjectType2[DigestedObjectType2["publicKeyCert"] = 1] = "publicKeyCert";
  DigestedObjectType2[DigestedObjectType2["otherObjectTypes"] = 2] = "otherObjectTypes";
})(DigestedObjectType || (DigestedObjectType = {}));
class ObjectDigestInfo {
  digestedObjectType = DigestedObjectType.publicKey;
  otherObjectTypeID;
  digestAlgorithm = new AlgorithmIdentifier();
  objectDigest = new ArrayBuffer(0);
  constructor(params = {}) {
    Object.assign(this, params);
  }
}
__decorate([
  AsnProp({ type: AsnPropTypes.Enumerated })
], ObjectDigestInfo.prototype, "digestedObjectType", void 0);
__decorate([
  AsnProp({
    type: AsnPropTypes.ObjectIdentifier,
    optional: true
  })
], ObjectDigestInfo.prototype, "otherObjectTypeID", void 0);
__decorate([
  AsnProp({ type: AlgorithmIdentifier })
], ObjectDigestInfo.prototype, "digestAlgorithm", void 0);
__decorate([
  AsnProp({ type: AsnPropTypes.BitString })
], ObjectDigestInfo.prototype, "objectDigest", void 0);
class V2Form {
  issuerName;
  baseCertificateID;
  objectDigestInfo;
  constructor(params = {}) {
    Object.assign(this, params);
  }
}
__decorate([
  AsnProp({
    type: GeneralNames$1,
    optional: true
  })
], V2Form.prototype, "issuerName", void 0);
__decorate([
  AsnProp({
    type: IssuerSerial,
    context: 0,
    implicit: true,
    optional: true
  })
], V2Form.prototype, "baseCertificateID", void 0);
__decorate([
  AsnProp({
    type: ObjectDigestInfo,
    context: 1,
    implicit: true,
    optional: true
  })
], V2Form.prototype, "objectDigestInfo", void 0);
let AttCertIssuer = class AttCertIssuer2 {
  v1Form;
  v2Form;
  constructor(params = {}) {
    Object.assign(this, params);
  }
};
__decorate([
  AsnProp({
    type: GeneralName$1,
    repeated: "sequence"
  })
], AttCertIssuer.prototype, "v1Form", void 0);
__decorate([
  AsnProp({
    type: V2Form,
    context: 0,
    implicit: true
  })
], AttCertIssuer.prototype, "v2Form", void 0);
AttCertIssuer = __decorate([
  AsnType({ type: AsnTypeTypes.Choice })
], AttCertIssuer);
class AttCertValidityPeriod {
  notBeforeTime = /* @__PURE__ */ new Date();
  notAfterTime = /* @__PURE__ */ new Date();
  constructor(params = {}) {
    Object.assign(this, params);
  }
}
__decorate([
  AsnProp({ type: AsnPropTypes.GeneralizedTime })
], AttCertValidityPeriod.prototype, "notBeforeTime", void 0);
__decorate([
  AsnProp({ type: AsnPropTypes.GeneralizedTime })
], AttCertValidityPeriod.prototype, "notAfterTime", void 0);
class Holder {
  baseCertificateID;
  entityName;
  objectDigestInfo;
  constructor(params = {}) {
    Object.assign(this, params);
  }
}
__decorate([
  AsnProp({
    type: IssuerSerial,
    implicit: true,
    context: 0,
    optional: true
  })
], Holder.prototype, "baseCertificateID", void 0);
__decorate([
  AsnProp({
    type: GeneralNames$1,
    implicit: true,
    context: 1,
    optional: true
  })
], Holder.prototype, "entityName", void 0);
__decorate([
  AsnProp({
    type: ObjectDigestInfo,
    implicit: true,
    context: 2,
    optional: true
  })
], Holder.prototype, "objectDigestInfo", void 0);
var AttCertVersion;
(function(AttCertVersion2) {
  AttCertVersion2[AttCertVersion2["v2"] = 1] = "v2";
})(AttCertVersion || (AttCertVersion = {}));
class AttributeCertificateInfo {
  version = AttCertVersion.v2;
  holder = new Holder();
  issuer = new AttCertIssuer();
  signature = new AlgorithmIdentifier();
  serialNumber = new ArrayBuffer(0);
  attrCertValidityPeriod = new AttCertValidityPeriod();
  attributes = [];
  issuerUniqueID;
  extensions;
  constructor(params = {}) {
    Object.assign(this, params);
  }
}
__decorate([
  AsnProp({ type: AsnPropTypes.Integer })
], AttributeCertificateInfo.prototype, "version", void 0);
__decorate([
  AsnProp({ type: Holder })
], AttributeCertificateInfo.prototype, "holder", void 0);
__decorate([
  AsnProp({ type: AttCertIssuer })
], AttributeCertificateInfo.prototype, "issuer", void 0);
__decorate([
  AsnProp({ type: AlgorithmIdentifier })
], AttributeCertificateInfo.prototype, "signature", void 0);
__decorate([
  AsnProp({
    type: AsnPropTypes.Integer,
    converter: AsnIntegerArrayBufferConverter
  })
], AttributeCertificateInfo.prototype, "serialNumber", void 0);
__decorate([
  AsnProp({ type: AttCertValidityPeriod })
], AttributeCertificateInfo.prototype, "attrCertValidityPeriod", void 0);
__decorate([
  AsnProp({
    type: Attribute$2,
    repeated: "sequence"
  })
], AttributeCertificateInfo.prototype, "attributes", void 0);
__decorate([
  AsnProp({
    type: AsnPropTypes.BitString,
    optional: true
  })
], AttributeCertificateInfo.prototype, "issuerUniqueID", void 0);
__decorate([
  AsnProp({
    type: Extensions,
    optional: true
  })
], AttributeCertificateInfo.prototype, "extensions", void 0);
class AttributeCertificate {
  acinfo = new AttributeCertificateInfo();
  signatureAlgorithm = new AlgorithmIdentifier();
  signatureValue = new ArrayBuffer(0);
  constructor(params = {}) {
    Object.assign(this, params);
  }
}
__decorate([
  AsnProp({ type: AttributeCertificateInfo })
], AttributeCertificate.prototype, "acinfo", void 0);
__decorate([
  AsnProp({ type: AlgorithmIdentifier })
], AttributeCertificate.prototype, "signatureAlgorithm", void 0);
__decorate([
  AsnProp({ type: AsnPropTypes.BitString })
], AttributeCertificate.prototype, "signatureValue", void 0);
var ClassListFlags;
(function(ClassListFlags2) {
  ClassListFlags2[ClassListFlags2["unmarked"] = 1] = "unmarked";
  ClassListFlags2[ClassListFlags2["unclassified"] = 2] = "unclassified";
  ClassListFlags2[ClassListFlags2["restricted"] = 4] = "restricted";
  ClassListFlags2[ClassListFlags2["confidential"] = 8] = "confidential";
  ClassListFlags2[ClassListFlags2["secret"] = 16] = "secret";
  ClassListFlags2[ClassListFlags2["topSecret"] = 32] = "topSecret";
})(ClassListFlags || (ClassListFlags = {}));
class ClassList extends BitString2 {
}
class SecurityCategory {
  type = "";
  value = new ArrayBuffer(0);
  constructor(params = {}) {
    Object.assign(this, params);
  }
}
__decorate([
  AsnProp({
    type: AsnPropTypes.ObjectIdentifier,
    implicit: true,
    context: 0
  })
], SecurityCategory.prototype, "type", void 0);
__decorate([
  AsnProp({
    type: AsnPropTypes.Any,
    implicit: true,
    context: 1
  })
], SecurityCategory.prototype, "value", void 0);
class Clearance {
  policyId = "";
  classList = new ClassList(ClassListFlags.unclassified);
  securityCategories;
  constructor(params = {}) {
    Object.assign(this, params);
  }
}
__decorate([
  AsnProp({ type: AsnPropTypes.ObjectIdentifier })
], Clearance.prototype, "policyId", void 0);
__decorate([
  AsnProp({
    type: ClassList,
    defaultValue: new ClassList(ClassListFlags.unclassified)
  })
], Clearance.prototype, "classList", void 0);
__decorate([
  AsnProp({
    type: SecurityCategory,
    repeated: "set"
  })
], Clearance.prototype, "securityCategories", void 0);
class IetfAttrSyntaxValueChoices {
  cotets;
  oid;
  string;
  constructor(params = {}) {
    Object.assign(this, params);
  }
}
__decorate([
  AsnProp({ type: OctetString2 })
], IetfAttrSyntaxValueChoices.prototype, "cotets", void 0);
__decorate([
  AsnProp({ type: AsnPropTypes.ObjectIdentifier })
], IetfAttrSyntaxValueChoices.prototype, "oid", void 0);
__decorate([
  AsnProp({ type: AsnPropTypes.Utf8String })
], IetfAttrSyntaxValueChoices.prototype, "string", void 0);
class IetfAttrSyntax {
  policyAuthority;
  values = [];
  constructor(params = {}) {
    Object.assign(this, params);
  }
}
__decorate([
  AsnProp({
    type: GeneralNames$1,
    implicit: true,
    context: 0,
    optional: true
  })
], IetfAttrSyntax.prototype, "policyAuthority", void 0);
__decorate([
  AsnProp({
    type: IetfAttrSyntaxValueChoices,
    repeated: "sequence"
  })
], IetfAttrSyntax.prototype, "values", void 0);
var Targets_1;
class TargetCert {
  targetCertificate = new IssuerSerial();
  targetName;
  certDigestInfo;
  constructor(params = {}) {
    Object.assign(this, params);
  }
}
__decorate([
  AsnProp({ type: IssuerSerial })
], TargetCert.prototype, "targetCertificate", void 0);
__decorate([
  AsnProp({
    type: GeneralName$1,
    optional: true
  })
], TargetCert.prototype, "targetName", void 0);
__decorate([
  AsnProp({
    type: ObjectDigestInfo,
    optional: true
  })
], TargetCert.prototype, "certDigestInfo", void 0);
let Target = class Target2 {
  targetName;
  targetGroup;
  targetCert;
  constructor(params = {}) {
    Object.assign(this, params);
  }
};
__decorate([
  AsnProp({
    type: GeneralName$1,
    context: 0,
    implicit: true
  })
], Target.prototype, "targetName", void 0);
__decorate([
  AsnProp({
    type: GeneralName$1,
    context: 1,
    implicit: true
  })
], Target.prototype, "targetGroup", void 0);
__decorate([
  AsnProp({
    type: TargetCert,
    context: 2,
    implicit: true
  })
], Target.prototype, "targetCert", void 0);
Target = __decorate([
  AsnType({ type: AsnTypeTypes.Choice })
], Target);
let Targets = Targets_1 = class Targets2 extends AsnArray {
  constructor(items) {
    super(items);
    Object.setPrototypeOf(this, Targets_1.prototype);
  }
};
Targets = Targets_1 = __decorate([
  AsnType({
    type: AsnTypeTypes.Sequence,
    itemType: Target
  })
], Targets);
var ProxyInfo_1;
let ProxyInfo = ProxyInfo_1 = class ProxyInfo2 extends AsnArray {
  constructor(items) {
    super(items);
    Object.setPrototypeOf(this, ProxyInfo_1.prototype);
  }
};
ProxyInfo = ProxyInfo_1 = __decorate([
  AsnType({
    type: AsnTypeTypes.Sequence,
    itemType: Targets
  })
], ProxyInfo);
class RoleSyntax {
  roleAuthority;
  roleName;
  constructor(params = {}) {
    Object.assign(this, params);
  }
}
__decorate([
  AsnProp({
    type: GeneralNames$1,
    implicit: true,
    context: 0,
    optional: true
  })
], RoleSyntax.prototype, "roleAuthority", void 0);
__decorate([
  AsnProp({
    type: GeneralName$1,
    implicit: true,
    context: 1
  })
], RoleSyntax.prototype, "roleName", void 0);
class SvceAuthInfo {
  service = new GeneralName$1();
  ident = new GeneralName$1();
  authInfo;
  constructor(params = {}) {
    Object.assign(this, params);
  }
}
__decorate([
  AsnProp({ type: GeneralName$1 })
], SvceAuthInfo.prototype, "service", void 0);
__decorate([
  AsnProp({ type: GeneralName$1 })
], SvceAuthInfo.prototype, "ident", void 0);
__decorate([
  AsnProp({
    type: OctetString2,
    optional: true
  })
], SvceAuthInfo.prototype, "authInfo", void 0);
var CertificateSet_1;
class OtherCertificateFormat {
  otherCertFormat = "";
  otherCert = new ArrayBuffer(0);
  constructor(params = {}) {
    Object.assign(this, params);
  }
}
__decorate([
  AsnProp({ type: AsnPropTypes.ObjectIdentifier })
], OtherCertificateFormat.prototype, "otherCertFormat", void 0);
__decorate([
  AsnProp({ type: AsnPropTypes.Any })
], OtherCertificateFormat.prototype, "otherCert", void 0);
let CertificateChoices = class CertificateChoices2 {
  certificate;
  v2AttrCert;
  other;
  constructor(params = {}) {
    Object.assign(this, params);
  }
};
__decorate([
  AsnProp({ type: Certificate })
], CertificateChoices.prototype, "certificate", void 0);
__decorate([
  AsnProp({
    type: AttributeCertificate,
    context: 2,
    implicit: true
  })
], CertificateChoices.prototype, "v2AttrCert", void 0);
__decorate([
  AsnProp({
    type: OtherCertificateFormat,
    context: 3,
    implicit: true
  })
], CertificateChoices.prototype, "other", void 0);
CertificateChoices = __decorate([
  AsnType({ type: AsnTypeTypes.Choice })
], CertificateChoices);
let CertificateSet = CertificateSet_1 = class CertificateSet2 extends AsnArray {
  constructor(items) {
    super(items);
    Object.setPrototypeOf(this, CertificateSet_1.prototype);
  }
};
CertificateSet = CertificateSet_1 = __decorate([
  AsnType({
    type: AsnTypeTypes.Set,
    itemType: CertificateChoices
  })
], CertificateSet);
class ContentInfo {
  contentType = "";
  content = new ArrayBuffer(0);
  constructor(params = {}) {
    Object.assign(this, params);
  }
}
__decorate([
  AsnProp({ type: AsnPropTypes.ObjectIdentifier })
], ContentInfo.prototype, "contentType", void 0);
__decorate([
  AsnProp({
    type: AsnPropTypes.Any,
    context: 0
  })
], ContentInfo.prototype, "content", void 0);
let EncapsulatedContent = class EncapsulatedContent2 {
  single;
  any;
  constructor(params = {}) {
    Object.assign(this, params);
  }
};
__decorate([
  AsnProp({ type: OctetString2 })
], EncapsulatedContent.prototype, "single", void 0);
__decorate([
  AsnProp({ type: AsnPropTypes.Any })
], EncapsulatedContent.prototype, "any", void 0);
EncapsulatedContent = __decorate([
  AsnType({ type: AsnTypeTypes.Choice })
], EncapsulatedContent);
class EncapsulatedContentInfo {
  eContentType = "";
  eContent;
  constructor(params = {}) {
    Object.assign(this, params);
  }
}
__decorate([
  AsnProp({ type: AsnPropTypes.ObjectIdentifier })
], EncapsulatedContentInfo.prototype, "eContentType", void 0);
__decorate([
  AsnProp({
    type: EncapsulatedContent,
    context: 0,
    optional: true
  })
], EncapsulatedContentInfo.prototype, "eContent", void 0);
let EncryptedContent = class EncryptedContent2 {
  value;
  constructedValue;
  constructor(params = {}) {
    Object.assign(this, params);
  }
};
__decorate([
  AsnProp({
    type: OctetString2,
    context: 0,
    implicit: true,
    optional: true
  })
], EncryptedContent.prototype, "value", void 0);
__decorate([
  AsnProp({
    type: OctetString2,
    converter: AsnConstructedOctetStringConverter,
    context: 0,
    implicit: true,
    optional: true,
    repeated: "sequence"
  })
], EncryptedContent.prototype, "constructedValue", void 0);
EncryptedContent = __decorate([
  AsnType({ type: AsnTypeTypes.Choice })
], EncryptedContent);
class EncryptedContentInfo {
  contentType = "";
  contentEncryptionAlgorithm = new ContentEncryptionAlgorithmIdentifier();
  encryptedContent;
  constructor(params = {}) {
    Object.assign(this, params);
  }
}
__decorate([
  AsnProp({ type: AsnPropTypes.ObjectIdentifier })
], EncryptedContentInfo.prototype, "contentType", void 0);
__decorate([
  AsnProp({ type: ContentEncryptionAlgorithmIdentifier })
], EncryptedContentInfo.prototype, "contentEncryptionAlgorithm", void 0);
__decorate([
  AsnProp({
    type: EncryptedContent,
    optional: true
  })
], EncryptedContentInfo.prototype, "encryptedContent", void 0);
class OtherKeyAttribute {
  keyAttrId = "";
  keyAttr;
  constructor(params = {}) {
    Object.assign(this, params);
  }
}
__decorate([
  AsnProp({ type: AsnPropTypes.ObjectIdentifier })
], OtherKeyAttribute.prototype, "keyAttrId", void 0);
__decorate([
  AsnProp({
    type: AsnPropTypes.Any,
    optional: true
  })
], OtherKeyAttribute.prototype, "keyAttr", void 0);
var RecipientEncryptedKeys_1;
class RecipientKeyIdentifier {
  subjectKeyIdentifier = new SubjectKeyIdentifier();
  date;
  other;
  constructor(params = {}) {
    Object.assign(this, params);
  }
}
__decorate([
  AsnProp({ type: SubjectKeyIdentifier })
], RecipientKeyIdentifier.prototype, "subjectKeyIdentifier", void 0);
__decorate([
  AsnProp({
    type: AsnPropTypes.GeneralizedTime,
    optional: true
  })
], RecipientKeyIdentifier.prototype, "date", void 0);
__decorate([
  AsnProp({
    type: OtherKeyAttribute,
    optional: true
  })
], RecipientKeyIdentifier.prototype, "other", void 0);
let KeyAgreeRecipientIdentifier = class KeyAgreeRecipientIdentifier2 {
  rKeyId;
  issuerAndSerialNumber;
  constructor(params = {}) {
    Object.assign(this, params);
  }
};
__decorate([
  AsnProp({
    type: RecipientKeyIdentifier,
    context: 0,
    implicit: true,
    optional: true
  })
], KeyAgreeRecipientIdentifier.prototype, "rKeyId", void 0);
__decorate([
  AsnProp({
    type: IssuerAndSerialNumber,
    optional: true
  })
], KeyAgreeRecipientIdentifier.prototype, "issuerAndSerialNumber", void 0);
KeyAgreeRecipientIdentifier = __decorate([
  AsnType({ type: AsnTypeTypes.Choice })
], KeyAgreeRecipientIdentifier);
class RecipientEncryptedKey {
  rid = new KeyAgreeRecipientIdentifier();
  encryptedKey = new OctetString2();
  constructor(params = {}) {
    Object.assign(this, params);
  }
}
__decorate([
  AsnProp({ type: KeyAgreeRecipientIdentifier })
], RecipientEncryptedKey.prototype, "rid", void 0);
__decorate([
  AsnProp({ type: OctetString2 })
], RecipientEncryptedKey.prototype, "encryptedKey", void 0);
let RecipientEncryptedKeys = RecipientEncryptedKeys_1 = class RecipientEncryptedKeys2 extends AsnArray {
  constructor(items) {
    super(items);
    Object.setPrototypeOf(this, RecipientEncryptedKeys_1.prototype);
  }
};
RecipientEncryptedKeys = RecipientEncryptedKeys_1 = __decorate([
  AsnType({
    type: AsnTypeTypes.Sequence,
    itemType: RecipientEncryptedKey
  })
], RecipientEncryptedKeys);
class OriginatorPublicKey {
  algorithm = new AlgorithmIdentifier();
  publicKey = new ArrayBuffer(0);
  constructor(params = {}) {
    Object.assign(this, params);
  }
}
__decorate([
  AsnProp({ type: AlgorithmIdentifier })
], OriginatorPublicKey.prototype, "algorithm", void 0);
__decorate([
  AsnProp({ type: AsnPropTypes.BitString })
], OriginatorPublicKey.prototype, "publicKey", void 0);
let OriginatorIdentifierOrKey = class OriginatorIdentifierOrKey2 {
  subjectKeyIdentifier;
  originatorKey;
  issuerAndSerialNumber;
  constructor(params = {}) {
    Object.assign(this, params);
  }
};
__decorate([
  AsnProp({
    type: SubjectKeyIdentifier,
    context: 0,
    implicit: true,
    optional: true
  })
], OriginatorIdentifierOrKey.prototype, "subjectKeyIdentifier", void 0);
__decorate([
  AsnProp({
    type: OriginatorPublicKey,
    context: 1,
    implicit: true,
    optional: true
  })
], OriginatorIdentifierOrKey.prototype, "originatorKey", void 0);
__decorate([
  AsnProp({
    type: IssuerAndSerialNumber,
    optional: true
  })
], OriginatorIdentifierOrKey.prototype, "issuerAndSerialNumber", void 0);
OriginatorIdentifierOrKey = __decorate([
  AsnType({ type: AsnTypeTypes.Choice })
], OriginatorIdentifierOrKey);
class KeyAgreeRecipientInfo {
  version = CMSVersion.v3;
  originator = new OriginatorIdentifierOrKey();
  ukm;
  keyEncryptionAlgorithm = new KeyEncryptionAlgorithmIdentifier();
  recipientEncryptedKeys = new RecipientEncryptedKeys();
  constructor(params = {}) {
    Object.assign(this, params);
  }
}
__decorate([
  AsnProp({ type: AsnPropTypes.Integer })
], KeyAgreeRecipientInfo.prototype, "version", void 0);
__decorate([
  AsnProp({
    type: OriginatorIdentifierOrKey,
    context: 0
  })
], KeyAgreeRecipientInfo.prototype, "originator", void 0);
__decorate([
  AsnProp({
    type: OctetString2,
    context: 1,
    optional: true
  })
], KeyAgreeRecipientInfo.prototype, "ukm", void 0);
__decorate([
  AsnProp({ type: KeyEncryptionAlgorithmIdentifier })
], KeyAgreeRecipientInfo.prototype, "keyEncryptionAlgorithm", void 0);
__decorate([
  AsnProp({ type: RecipientEncryptedKeys })
], KeyAgreeRecipientInfo.prototype, "recipientEncryptedKeys", void 0);
let RecipientIdentifier = class RecipientIdentifier2 {
  subjectKeyIdentifier;
  issuerAndSerialNumber;
  constructor(params = {}) {
    Object.assign(this, params);
  }
};
__decorate([
  AsnProp({
    type: SubjectKeyIdentifier,
    context: 0,
    implicit: true
  })
], RecipientIdentifier.prototype, "subjectKeyIdentifier", void 0);
__decorate([
  AsnProp({ type: IssuerAndSerialNumber })
], RecipientIdentifier.prototype, "issuerAndSerialNumber", void 0);
RecipientIdentifier = __decorate([
  AsnType({ type: AsnTypeTypes.Choice })
], RecipientIdentifier);
class KeyTransRecipientInfo {
  version = CMSVersion.v0;
  rid = new RecipientIdentifier();
  keyEncryptionAlgorithm = new KeyEncryptionAlgorithmIdentifier();
  encryptedKey = new OctetString2();
  constructor(params = {}) {
    Object.assign(this, params);
  }
}
__decorate([
  AsnProp({ type: AsnPropTypes.Integer })
], KeyTransRecipientInfo.prototype, "version", void 0);
__decorate([
  AsnProp({ type: RecipientIdentifier })
], KeyTransRecipientInfo.prototype, "rid", void 0);
__decorate([
  AsnProp({ type: KeyEncryptionAlgorithmIdentifier })
], KeyTransRecipientInfo.prototype, "keyEncryptionAlgorithm", void 0);
__decorate([
  AsnProp({ type: OctetString2 })
], KeyTransRecipientInfo.prototype, "encryptedKey", void 0);
class KEKIdentifier {
  keyIdentifier = new OctetString2();
  date;
  other;
  constructor(params = {}) {
    Object.assign(this, params);
  }
}
__decorate([
  AsnProp({ type: OctetString2 })
], KEKIdentifier.prototype, "keyIdentifier", void 0);
__decorate([
  AsnProp({
    type: AsnPropTypes.GeneralizedTime,
    optional: true
  })
], KEKIdentifier.prototype, "date", void 0);
__decorate([
  AsnProp({
    type: OtherKeyAttribute,
    optional: true
  })
], KEKIdentifier.prototype, "other", void 0);
class KEKRecipientInfo {
  version = CMSVersion.v4;
  kekid = new KEKIdentifier();
  keyEncryptionAlgorithm = new KeyEncryptionAlgorithmIdentifier();
  encryptedKey = new OctetString2();
  constructor(params = {}) {
    Object.assign(this, params);
  }
}
__decorate([
  AsnProp({ type: AsnPropTypes.Integer })
], KEKRecipientInfo.prototype, "version", void 0);
__decorate([
  AsnProp({ type: KEKIdentifier })
], KEKRecipientInfo.prototype, "kekid", void 0);
__decorate([
  AsnProp({ type: KeyEncryptionAlgorithmIdentifier })
], KEKRecipientInfo.prototype, "keyEncryptionAlgorithm", void 0);
__decorate([
  AsnProp({ type: OctetString2 })
], KEKRecipientInfo.prototype, "encryptedKey", void 0);
class PasswordRecipientInfo {
  version = CMSVersion.v0;
  keyDerivationAlgorithm;
  keyEncryptionAlgorithm = new KeyEncryptionAlgorithmIdentifier();
  encryptedKey = new OctetString2();
  constructor(params = {}) {
    Object.assign(this, params);
  }
}
__decorate([
  AsnProp({ type: AsnPropTypes.Integer })
], PasswordRecipientInfo.prototype, "version", void 0);
__decorate([
  AsnProp({
    type: KeyDerivationAlgorithmIdentifier,
    context: 0,
    optional: true
  })
], PasswordRecipientInfo.prototype, "keyDerivationAlgorithm", void 0);
__decorate([
  AsnProp({ type: KeyEncryptionAlgorithmIdentifier })
], PasswordRecipientInfo.prototype, "keyEncryptionAlgorithm", void 0);
__decorate([
  AsnProp({ type: OctetString2 })
], PasswordRecipientInfo.prototype, "encryptedKey", void 0);
class OtherRecipientInfo {
  oriType = "";
  oriValue = new ArrayBuffer(0);
  constructor(params = {}) {
    Object.assign(this, params);
  }
}
__decorate([
  AsnProp({ type: AsnPropTypes.ObjectIdentifier })
], OtherRecipientInfo.prototype, "oriType", void 0);
__decorate([
  AsnProp({ type: AsnPropTypes.Any })
], OtherRecipientInfo.prototype, "oriValue", void 0);
let RecipientInfo = class RecipientInfo2 {
  ktri;
  kari;
  kekri;
  pwri;
  ori;
  constructor(params = {}) {
    Object.assign(this, params);
  }
};
__decorate([
  AsnProp({
    type: KeyTransRecipientInfo,
    optional: true
  })
], RecipientInfo.prototype, "ktri", void 0);
__decorate([
  AsnProp({
    type: KeyAgreeRecipientInfo,
    context: 1,
    implicit: true,
    optional: true
  })
], RecipientInfo.prototype, "kari", void 0);
__decorate([
  AsnProp({
    type: KEKRecipientInfo,
    context: 2,
    implicit: true,
    optional: true
  })
], RecipientInfo.prototype, "kekri", void 0);
__decorate([
  AsnProp({
    type: PasswordRecipientInfo,
    context: 3,
    implicit: true,
    optional: true
  })
], RecipientInfo.prototype, "pwri", void 0);
__decorate([
  AsnProp({
    type: OtherRecipientInfo,
    context: 4,
    implicit: true,
    optional: true
  })
], RecipientInfo.prototype, "ori", void 0);
RecipientInfo = __decorate([
  AsnType({ type: AsnTypeTypes.Choice })
], RecipientInfo);
var RecipientInfos_1;
let RecipientInfos = RecipientInfos_1 = class RecipientInfos2 extends AsnArray {
  constructor(items) {
    super(items);
    Object.setPrototypeOf(this, RecipientInfos_1.prototype);
  }
};
RecipientInfos = RecipientInfos_1 = __decorate([
  AsnType({
    type: AsnTypeTypes.Set,
    itemType: RecipientInfo
  })
], RecipientInfos);
var RevocationInfoChoices_1;
class OtherRevocationInfoFormat {
  otherRevInfoFormat = "";
  otherRevInfo = new ArrayBuffer(0);
  constructor(params = {}) {
    Object.assign(this, params);
  }
}
__decorate([
  AsnProp({ type: AsnPropTypes.ObjectIdentifier })
], OtherRevocationInfoFormat.prototype, "otherRevInfoFormat", void 0);
__decorate([
  AsnProp({ type: AsnPropTypes.Any })
], OtherRevocationInfoFormat.prototype, "otherRevInfo", void 0);
let RevocationInfoChoice = class RevocationInfoChoice2 {
  other = new OtherRevocationInfoFormat();
  constructor(params = {}) {
    Object.assign(this, params);
  }
};
__decorate([
  AsnProp({
    type: OtherRevocationInfoFormat,
    context: 1,
    implicit: true
  })
], RevocationInfoChoice.prototype, "other", void 0);
RevocationInfoChoice = __decorate([
  AsnType({ type: AsnTypeTypes.Choice })
], RevocationInfoChoice);
let RevocationInfoChoices = RevocationInfoChoices_1 = class RevocationInfoChoices2 extends AsnArray {
  constructor(items) {
    super(items);
    Object.setPrototypeOf(this, RevocationInfoChoices_1.prototype);
  }
};
RevocationInfoChoices = RevocationInfoChoices_1 = __decorate([
  AsnType({
    type: AsnTypeTypes.Set,
    itemType: RevocationInfoChoice
  })
], RevocationInfoChoices);
class OriginatorInfo {
  certs;
  crls;
  constructor(params = {}) {
    Object.assign(this, params);
  }
}
__decorate([
  AsnProp({
    type: CertificateSet,
    context: 0,
    implicit: true,
    optional: true
  })
], OriginatorInfo.prototype, "certs", void 0);
__decorate([
  AsnProp({
    type: RevocationInfoChoices,
    context: 1,
    implicit: true,
    optional: true
  })
], OriginatorInfo.prototype, "crls", void 0);
var UnprotectedAttributes_1;
let UnprotectedAttributes = UnprotectedAttributes_1 = class UnprotectedAttributes2 extends AsnArray {
  constructor(items) {
    super(items);
    Object.setPrototypeOf(this, UnprotectedAttributes_1.prototype);
  }
};
UnprotectedAttributes = UnprotectedAttributes_1 = __decorate([
  AsnType({
    type: AsnTypeTypes.Set,
    itemType: Attribute$1
  })
], UnprotectedAttributes);
class EnvelopedData {
  version = CMSVersion.v0;
  originatorInfo;
  recipientInfos = new RecipientInfos();
  encryptedContentInfo = new EncryptedContentInfo();
  unprotectedAttrs;
  constructor(params = {}) {
    Object.assign(this, params);
  }
}
__decorate([
  AsnProp({ type: AsnPropTypes.Integer })
], EnvelopedData.prototype, "version", void 0);
__decorate([
  AsnProp({
    type: OriginatorInfo,
    context: 0,
    implicit: true,
    optional: true
  })
], EnvelopedData.prototype, "originatorInfo", void 0);
__decorate([
  AsnProp({ type: RecipientInfos })
], EnvelopedData.prototype, "recipientInfos", void 0);
__decorate([
  AsnProp({ type: EncryptedContentInfo })
], EnvelopedData.prototype, "encryptedContentInfo", void 0);
__decorate([
  AsnProp({
    type: UnprotectedAttributes,
    context: 1,
    implicit: true,
    optional: true
  })
], EnvelopedData.prototype, "unprotectedAttrs", void 0);
const id_data = "1.2.840.113549.1.7.1";
const id_signedData = "1.2.840.113549.1.7.2";
var DigestAlgorithmIdentifiers_1;
let DigestAlgorithmIdentifiers = DigestAlgorithmIdentifiers_1 = class DigestAlgorithmIdentifiers2 extends AsnArray {
  constructor(items) {
    super(items);
    Object.setPrototypeOf(this, DigestAlgorithmIdentifiers_1.prototype);
  }
};
DigestAlgorithmIdentifiers = DigestAlgorithmIdentifiers_1 = __decorate([
  AsnType({
    type: AsnTypeTypes.Set,
    itemType: DigestAlgorithmIdentifier
  })
], DigestAlgorithmIdentifiers);
class SignedData {
  version = CMSVersion.v0;
  digestAlgorithms = new DigestAlgorithmIdentifiers();
  encapContentInfo = new EncapsulatedContentInfo();
  certificates;
  crls;
  signerInfos = new SignerInfos();
  constructor(params = {}) {
    Object.assign(this, params);
  }
}
__decorate([
  AsnProp({ type: AsnPropTypes.Integer })
], SignedData.prototype, "version", void 0);
__decorate([
  AsnProp({ type: DigestAlgorithmIdentifiers })
], SignedData.prototype, "digestAlgorithms", void 0);
__decorate([
  AsnProp({ type: EncapsulatedContentInfo })
], SignedData.prototype, "encapContentInfo", void 0);
__decorate([
  AsnProp({
    type: CertificateSet,
    context: 0,
    implicit: true,
    optional: true
  })
], SignedData.prototype, "certificates", void 0);
__decorate([
  AsnProp({
    type: RevocationInfoChoices,
    context: 1,
    implicit: true,
    optional: true
  })
], SignedData.prototype, "crls", void 0);
__decorate([
  AsnProp({ type: SignerInfos })
], SignedData.prototype, "signerInfos", void 0);
const id_ecPublicKey = "1.2.840.10045.2.1";
const id_ecdsaWithSHA1 = "1.2.840.10045.4.1";
const id_ecdsaWithSHA224 = "1.2.840.10045.4.3.1";
const id_ecdsaWithSHA256 = "1.2.840.10045.4.3.2";
const id_ecdsaWithSHA384 = "1.2.840.10045.4.3.3";
const id_ecdsaWithSHA512 = "1.2.840.10045.4.3.4";
const id_secp256r1 = "1.2.840.10045.3.1.7";
const id_secp384r1 = "1.3.132.0.34";
const id_secp521r1 = "1.3.132.0.35";
function create$1(algorithm) {
  return new AlgorithmIdentifier({ algorithm });
}
const ecdsaWithSHA1 = create$1(id_ecdsaWithSHA1);
create$1(id_ecdsaWithSHA224);
const ecdsaWithSHA256 = create$1(id_ecdsaWithSHA256);
const ecdsaWithSHA384 = create$1(id_ecdsaWithSHA384);
const ecdsaWithSHA512 = create$1(id_ecdsaWithSHA512);
let FieldID = class FieldID2 {
  fieldType;
  parameters;
  constructor(params = {}) {
    Object.assign(this, params);
  }
};
__decorate([
  AsnProp({ type: AsnPropTypes.ObjectIdentifier })
], FieldID.prototype, "fieldType", void 0);
__decorate([
  AsnProp({ type: AsnPropTypes.Any })
], FieldID.prototype, "parameters", void 0);
FieldID = __decorate([
  AsnType({ type: AsnTypeTypes.Sequence })
], FieldID);
class ECPoint extends OctetString2 {
}
let Curve = class Curve2 {
  a;
  b;
  seed;
  constructor(params = {}) {
    Object.assign(this, params);
  }
};
__decorate([
  AsnProp({ type: AsnPropTypes.OctetString })
], Curve.prototype, "a", void 0);
__decorate([
  AsnProp({ type: AsnPropTypes.OctetString })
], Curve.prototype, "b", void 0);
__decorate([
  AsnProp({
    type: AsnPropTypes.BitString,
    optional: true
  })
], Curve.prototype, "seed", void 0);
Curve = __decorate([
  AsnType({ type: AsnTypeTypes.Sequence })
], Curve);
var ECPVer;
(function(ECPVer2) {
  ECPVer2[ECPVer2["ecpVer1"] = 1] = "ecpVer1";
})(ECPVer || (ECPVer = {}));
let SpecifiedECDomain = class SpecifiedECDomain2 {
  version = ECPVer.ecpVer1;
  fieldID;
  curve;
  base;
  order;
  cofactor;
  constructor(params = {}) {
    Object.assign(this, params);
  }
};
__decorate([
  AsnProp({ type: AsnPropTypes.Integer })
], SpecifiedECDomain.prototype, "version", void 0);
__decorate([
  AsnProp({ type: FieldID })
], SpecifiedECDomain.prototype, "fieldID", void 0);
__decorate([
  AsnProp({ type: Curve })
], SpecifiedECDomain.prototype, "curve", void 0);
__decorate([
  AsnProp({ type: ECPoint })
], SpecifiedECDomain.prototype, "base", void 0);
__decorate([
  AsnProp({
    type: AsnPropTypes.Integer,
    converter: AsnIntegerArrayBufferConverter
  })
], SpecifiedECDomain.prototype, "order", void 0);
__decorate([
  AsnProp({
    type: AsnPropTypes.Integer,
    optional: true
  })
], SpecifiedECDomain.prototype, "cofactor", void 0);
SpecifiedECDomain = __decorate([
  AsnType({ type: AsnTypeTypes.Sequence })
], SpecifiedECDomain);
let ECParameters = class ECParameters2 {
  namedCurve;
  implicitCurve;
  specifiedCurve;
  constructor(params = {}) {
    Object.assign(this, params);
  }
};
__decorate([
  AsnProp({ type: AsnPropTypes.ObjectIdentifier })
], ECParameters.prototype, "namedCurve", void 0);
__decorate([
  AsnProp({ type: AsnPropTypes.Null })
], ECParameters.prototype, "implicitCurve", void 0);
__decorate([
  AsnProp({ type: SpecifiedECDomain })
], ECParameters.prototype, "specifiedCurve", void 0);
ECParameters = __decorate([
  AsnType({ type: AsnTypeTypes.Choice })
], ECParameters);
class ECPrivateKey {
  version = 1;
  privateKey = new OctetString2();
  parameters;
  publicKey;
  constructor(params = {}) {
    Object.assign(this, params);
  }
}
__decorate([
  AsnProp({ type: AsnPropTypes.Integer })
], ECPrivateKey.prototype, "version", void 0);
__decorate([
  AsnProp({ type: OctetString2 })
], ECPrivateKey.prototype, "privateKey", void 0);
__decorate([
  AsnProp({
    type: ECParameters,
    context: 0,
    optional: true
  })
], ECPrivateKey.prototype, "parameters", void 0);
__decorate([
  AsnProp({
    type: AsnPropTypes.BitString,
    context: 1,
    optional: true
  })
], ECPrivateKey.prototype, "publicKey", void 0);
class ECDSASigValue {
  r = new ArrayBuffer(0);
  s = new ArrayBuffer(0);
  constructor(params = {}) {
    Object.assign(this, params);
  }
}
__decorate([
  AsnProp({
    type: AsnPropTypes.Integer,
    converter: AsnIntegerArrayBufferConverter
  })
], ECDSASigValue.prototype, "r", void 0);
__decorate([
  AsnProp({
    type: AsnPropTypes.Integer,
    converter: AsnIntegerArrayBufferConverter
  })
], ECDSASigValue.prototype, "s", void 0);
const id_pkcs_1 = "1.2.840.113549.1.1";
const id_rsaEncryption = `${id_pkcs_1}.1`;
const id_RSAES_OAEP = `${id_pkcs_1}.7`;
const id_pSpecified = `${id_pkcs_1}.9`;
const id_RSASSA_PSS = `${id_pkcs_1}.10`;
const id_md2WithRSAEncryption = `${id_pkcs_1}.2`;
const id_md5WithRSAEncryption = `${id_pkcs_1}.4`;
const id_sha1WithRSAEncryption = `${id_pkcs_1}.5`;
const id_sha224WithRSAEncryption = `${id_pkcs_1}.14`;
const id_sha256WithRSAEncryption = `${id_pkcs_1}.11`;
const id_sha384WithRSAEncryption = `${id_pkcs_1}.12`;
const id_sha512WithRSAEncryption = `${id_pkcs_1}.13`;
const id_sha512_224WithRSAEncryption = `${id_pkcs_1}.15`;
const id_sha512_256WithRSAEncryption = `${id_pkcs_1}.16`;
const id_sha1 = "1.3.14.3.2.26";
const id_sha224 = "2.16.840.1.101.3.4.2.4";
const id_sha256 = "2.16.840.1.101.3.4.2.1";
const id_sha384 = "2.16.840.1.101.3.4.2.2";
const id_sha512 = "2.16.840.1.101.3.4.2.3";
const id_sha512_224 = "2.16.840.1.101.3.4.2.5";
const id_sha512_256 = "2.16.840.1.101.3.4.2.6";
const id_md2 = "1.2.840.113549.2.2";
const id_md5 = "1.2.840.113549.2.5";
const id_mgf1 = `${id_pkcs_1}.8`;
function create(algorithm) {
  return new AlgorithmIdentifier({
    algorithm,
    parameters: null
  });
}
create(id_md2);
create(id_md5);
const sha1 = create(id_sha1);
create(id_sha224);
create(id_sha256);
create(id_sha384);
create(id_sha512);
create(id_sha512_224);
create(id_sha512_256);
const mgf1SHA1 = new AlgorithmIdentifier({
  algorithm: id_mgf1,
  parameters: AsnConvert.serialize(sha1)
});
const pSpecifiedEmpty = new AlgorithmIdentifier({
  algorithm: id_pSpecified,
  parameters: AsnConvert.serialize(AsnOctetStringConverter.toASN(new Uint8Array([
    218,
    57,
    163,
    238,
    94,
    107,
    75,
    13,
    50,
    85,
    191,
    239,
    149,
    96,
    24,
    144,
    175,
    216,
    7,
    9
  ]).buffer))
});
create(id_rsaEncryption);
create(id_md2WithRSAEncryption);
create(id_md5WithRSAEncryption);
create(id_sha1WithRSAEncryption);
create(id_sha512_224WithRSAEncryption);
create(id_sha512_256WithRSAEncryption);
create(id_sha384WithRSAEncryption);
create(id_sha512WithRSAEncryption);
create(id_sha512_224WithRSAEncryption);
create(id_sha512_256WithRSAEncryption);
class RsaEsOaepParams {
  hashAlgorithm = new AlgorithmIdentifier(sha1);
  maskGenAlgorithm = new AlgorithmIdentifier({
    algorithm: id_mgf1,
    parameters: AsnConvert.serialize(sha1)
  });
  pSourceAlgorithm = new AlgorithmIdentifier(pSpecifiedEmpty);
  constructor(params = {}) {
    Object.assign(this, params);
  }
}
__decorate([
  AsnProp({
    type: AlgorithmIdentifier,
    context: 0,
    defaultValue: sha1
  })
], RsaEsOaepParams.prototype, "hashAlgorithm", void 0);
__decorate([
  AsnProp({
    type: AlgorithmIdentifier,
    context: 1,
    defaultValue: mgf1SHA1
  })
], RsaEsOaepParams.prototype, "maskGenAlgorithm", void 0);
__decorate([
  AsnProp({
    type: AlgorithmIdentifier,
    context: 2,
    defaultValue: pSpecifiedEmpty
  })
], RsaEsOaepParams.prototype, "pSourceAlgorithm", void 0);
new AlgorithmIdentifier({
  algorithm: id_RSAES_OAEP,
  parameters: AsnConvert.serialize(new RsaEsOaepParams())
});
class RsaSaPssParams {
  hashAlgorithm = new AlgorithmIdentifier(sha1);
  maskGenAlgorithm = new AlgorithmIdentifier({
    algorithm: id_mgf1,
    parameters: AsnConvert.serialize(sha1)
  });
  saltLength = 20;
  trailerField = 1;
  constructor(params = {}) {
    Object.assign(this, params);
  }
}
__decorate([
  AsnProp({
    type: AlgorithmIdentifier,
    context: 0,
    defaultValue: sha1
  })
], RsaSaPssParams.prototype, "hashAlgorithm", void 0);
__decorate([
  AsnProp({
    type: AlgorithmIdentifier,
    context: 1,
    defaultValue: mgf1SHA1
  })
], RsaSaPssParams.prototype, "maskGenAlgorithm", void 0);
__decorate([
  AsnProp({
    type: AsnPropTypes.Integer,
    context: 2,
    defaultValue: 20
  })
], RsaSaPssParams.prototype, "saltLength", void 0);
__decorate([
  AsnProp({
    type: AsnPropTypes.Integer,
    context: 3,
    defaultValue: 1
  })
], RsaSaPssParams.prototype, "trailerField", void 0);
new AlgorithmIdentifier({
  algorithm: id_RSASSA_PSS,
  parameters: AsnConvert.serialize(new RsaSaPssParams())
});
class DigestInfo {
  digestAlgorithm = new AlgorithmIdentifier();
  digest = new OctetString2();
  constructor(params = {}) {
    Object.assign(this, params);
  }
}
__decorate([
  AsnProp({ type: AlgorithmIdentifier })
], DigestInfo.prototype, "digestAlgorithm", void 0);
__decorate([
  AsnProp({ type: OctetString2 })
], DigestInfo.prototype, "digest", void 0);
var OtherPrimeInfos_1;
class OtherPrimeInfo {
  prime = new ArrayBuffer(0);
  exponent = new ArrayBuffer(0);
  coefficient = new ArrayBuffer(0);
  constructor(params = {}) {
    Object.assign(this, params);
  }
}
__decorate([
  AsnProp({
    type: AsnPropTypes.Integer,
    converter: AsnIntegerArrayBufferConverter
  })
], OtherPrimeInfo.prototype, "prime", void 0);
__decorate([
  AsnProp({
    type: AsnPropTypes.Integer,
    converter: AsnIntegerArrayBufferConverter
  })
], OtherPrimeInfo.prototype, "exponent", void 0);
__decorate([
  AsnProp({
    type: AsnPropTypes.Integer,
    converter: AsnIntegerArrayBufferConverter
  })
], OtherPrimeInfo.prototype, "coefficient", void 0);
let OtherPrimeInfos = OtherPrimeInfos_1 = class OtherPrimeInfos2 extends AsnArray {
  constructor(items) {
    super(items);
    Object.setPrototypeOf(this, OtherPrimeInfos_1.prototype);
  }
};
OtherPrimeInfos = OtherPrimeInfos_1 = __decorate([
  AsnType({
    type: AsnTypeTypes.Sequence,
    itemType: OtherPrimeInfo
  })
], OtherPrimeInfos);
class RSAPrivateKey {
  version = 0;
  modulus = new ArrayBuffer(0);
  publicExponent = new ArrayBuffer(0);
  privateExponent = new ArrayBuffer(0);
  prime1 = new ArrayBuffer(0);
  prime2 = new ArrayBuffer(0);
  exponent1 = new ArrayBuffer(0);
  exponent2 = new ArrayBuffer(0);
  coefficient = new ArrayBuffer(0);
  otherPrimeInfos;
  constructor(params = {}) {
    Object.assign(this, params);
  }
}
__decorate([
  AsnProp({ type: AsnPropTypes.Integer })
], RSAPrivateKey.prototype, "version", void 0);
__decorate([
  AsnProp({
    type: AsnPropTypes.Integer,
    converter: AsnIntegerArrayBufferConverter
  })
], RSAPrivateKey.prototype, "modulus", void 0);
__decorate([
  AsnProp({
    type: AsnPropTypes.Integer,
    converter: AsnIntegerArrayBufferConverter
  })
], RSAPrivateKey.prototype, "publicExponent", void 0);
__decorate([
  AsnProp({
    type: AsnPropTypes.Integer,
    converter: AsnIntegerArrayBufferConverter
  })
], RSAPrivateKey.prototype, "privateExponent", void 0);
__decorate([
  AsnProp({
    type: AsnPropTypes.Integer,
    converter: AsnIntegerArrayBufferConverter
  })
], RSAPrivateKey.prototype, "prime1", void 0);
__decorate([
  AsnProp({
    type: AsnPropTypes.Integer,
    converter: AsnIntegerArrayBufferConverter
  })
], RSAPrivateKey.prototype, "prime2", void 0);
__decorate([
  AsnProp({
    type: AsnPropTypes.Integer,
    converter: AsnIntegerArrayBufferConverter
  })
], RSAPrivateKey.prototype, "exponent1", void 0);
__decorate([
  AsnProp({
    type: AsnPropTypes.Integer,
    converter: AsnIntegerArrayBufferConverter
  })
], RSAPrivateKey.prototype, "exponent2", void 0);
__decorate([
  AsnProp({
    type: AsnPropTypes.Integer,
    converter: AsnIntegerArrayBufferConverter
  })
], RSAPrivateKey.prototype, "coefficient", void 0);
__decorate([
  AsnProp({
    type: OtherPrimeInfos,
    optional: true
  })
], RSAPrivateKey.prototype, "otherPrimeInfos", void 0);
class RSAPublicKey {
  modulus = new ArrayBuffer(0);
  publicExponent = new ArrayBuffer(0);
  constructor(params = {}) {
    Object.assign(this, params);
  }
}
__decorate([
  AsnProp({
    type: AsnPropTypes.Integer,
    converter: AsnIntegerArrayBufferConverter
  })
], RSAPublicKey.prototype, "modulus", void 0);
__decorate([
  AsnProp({
    type: AsnPropTypes.Integer,
    converter: AsnIntegerArrayBufferConverter
  })
], RSAPublicKey.prototype, "publicExponent", void 0);
var Lifecycle;
(function(Lifecycle2) {
  Lifecycle2[Lifecycle2["Transient"] = 0] = "Transient";
  Lifecycle2[Lifecycle2["Singleton"] = 1] = "Singleton";
  Lifecycle2[Lifecycle2["ResolutionScoped"] = 2] = "ResolutionScoped";
  Lifecycle2[Lifecycle2["ContainerScoped"] = 3] = "ContainerScoped";
})(Lifecycle || (Lifecycle = {}));
const Lifecycle$1 = Lifecycle;
/*! *****************************************************************************
Copyright (c) Microsoft Corporation.

Permission to use, copy, modify, and/or distribute this software for any
purpose with or without fee is hereby granted.

THE SOFTWARE IS PROVIDED "AS IS" AND THE AUTHOR DISCLAIMS ALL WARRANTIES WITH
REGARD TO THIS SOFTWARE INCLUDING ALL IMPLIED WARRANTIES OF MERCHANTABILITY
AND FITNESS. IN NO EVENT SHALL THE AUTHOR BE LIABLE FOR ANY SPECIAL, DIRECT,
INDIRECT, OR CONSEQUENTIAL DAMAGES OR ANY DAMAGES WHATSOEVER RESULTING FROM
LOSS OF USE, DATA OR PROFITS, WHETHER IN AN ACTION OF CONTRACT, NEGLIGENCE OR
OTHER TORTIOUS ACTION, ARISING OUT OF OR IN CONNECTION WITH THE USE OR
PERFORMANCE OF THIS SOFTWARE.
***************************************************************************** */
var extendStatics = function(d, b) {
  extendStatics = Object.setPrototypeOf || { __proto__: [] } instanceof Array && function(d2, b2) {
    d2.__proto__ = b2;
  } || function(d2, b2) {
    for (var p in b2) if (b2.hasOwnProperty(p)) d2[p] = b2[p];
  };
  return extendStatics(d, b);
};
function __extends(d, b) {
  extendStatics(d, b);
  function __() {
    this.constructor = d;
  }
  d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
}
function __awaiter(thisArg, _arguments, P, generator) {
  function adopt(value) {
    return value instanceof P ? value : new P(function(resolve) {
      resolve(value);
    });
  }
  return new (P || (P = Promise))(function(resolve, reject) {
    function fulfilled(value) {
      try {
        step(generator.next(value));
      } catch (e) {
        reject(e);
      }
    }
    function rejected(value) {
      try {
        step(generator["throw"](value));
      } catch (e) {
        reject(e);
      }
    }
    function step(result) {
      result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected);
    }
    step((generator = generator.apply(thisArg, [])).next());
  });
}
function __generator(thisArg, body) {
  var _ = { label: 0, sent: function() {
    if (t[0] & 1) throw t[1];
    return t[1];
  }, trys: [], ops: [] }, f, y, t, g;
  return g = { next: verb(0), "throw": verb(1), "return": verb(2) }, typeof Symbol === "function" && (g[Symbol.iterator] = function() {
    return this;
  }), g;
  function verb(n) {
    return function(v) {
      return step([n, v]);
    };
  }
  function step(op) {
    if (f) throw new TypeError("Generator is already executing.");
    while (_) try {
      if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
      if (y = 0, t) op = [op[0] & 2, t.value];
      switch (op[0]) {
        case 0:
        case 1:
          t = op;
          break;
        case 4:
          _.label++;
          return { value: op[1], done: false };
        case 5:
          _.label++;
          y = op[1];
          op = [0];
          continue;
        case 7:
          op = _.ops.pop();
          _.trys.pop();
          continue;
        default:
          if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) {
            _ = 0;
            continue;
          }
          if (op[0] === 3 && (!t || op[1] > t[0] && op[1] < t[3])) {
            _.label = op[1];
            break;
          }
          if (op[0] === 6 && _.label < t[1]) {
            _.label = t[1];
            t = op;
            break;
          }
          if (t && _.label < t[2]) {
            _.label = t[2];
            _.ops.push(op);
            break;
          }
          if (t[2]) _.ops.pop();
          _.trys.pop();
          continue;
      }
      op = body.call(thisArg, _);
    } catch (e) {
      op = [6, e];
      y = 0;
    } finally {
      f = t = 0;
    }
    if (op[0] & 5) throw op[1];
    return { value: op[0] ? op[1] : void 0, done: true };
  }
}
function __values(o) {
  var s = typeof Symbol === "function" && Symbol.iterator, m = s && o[s], i = 0;
  if (m) return m.call(o);
  if (o && typeof o.length === "number") return {
    next: function() {
      if (o && i >= o.length) o = void 0;
      return { value: o && o[i++], done: !o };
    }
  };
  throw new TypeError(s ? "Object is not iterable." : "Symbol.iterator is not defined.");
}
function __read(o, n) {
  var m = typeof Symbol === "function" && o[Symbol.iterator];
  if (!m) return o;
  var i = m.call(o), r, ar = [], e;
  try {
    while ((n === void 0 || n-- > 0) && !(r = i.next()).done) ar.push(r.value);
  } catch (error) {
    e = { error };
  } finally {
    try {
      if (r && !r.done && (m = i["return"])) m.call(i);
    } finally {
      if (e) throw e.error;
    }
  }
  return ar;
}
function __spread() {
  for (var ar = [], i = 0; i < arguments.length; i++)
    ar = ar.concat(__read(arguments[i]));
  return ar;
}
var INJECTION_TOKEN_METADATA_KEY = "injectionTokens";
function getParamInfo(target) {
  var params = Reflect.getMetadata("design:paramtypes", target) || [];
  var injectionTokens = Reflect.getOwnMetadata(INJECTION_TOKEN_METADATA_KEY, target) || {};
  Object.keys(injectionTokens).forEach(function(key2) {
    params[+key2] = injectionTokens[key2];
  });
  return params;
}
function isClassProvider(provider) {
  return !!provider.useClass;
}
function isFactoryProvider(provider) {
  return !!provider.useFactory;
}
var DelayedConstructor = (function() {
  function DelayedConstructor2(wrap) {
    this.wrap = wrap;
    this.reflectMethods = [
      "get",
      "getPrototypeOf",
      "setPrototypeOf",
      "getOwnPropertyDescriptor",
      "defineProperty",
      "has",
      "set",
      "deleteProperty",
      "apply",
      "construct",
      "ownKeys"
    ];
  }
  DelayedConstructor2.prototype.createProxy = function(createObject) {
    var _this = this;
    var target = {};
    var init = false;
    var value;
    var delayedObject = function() {
      if (!init) {
        value = createObject(_this.wrap());
        init = true;
      }
      return value;
    };
    return new Proxy(target, this.createHandler(delayedObject));
  };
  DelayedConstructor2.prototype.createHandler = function(delayedObject) {
    var handler = {};
    var install = function(name) {
      handler[name] = function() {
        var args = [];
        for (var _i = 0; _i < arguments.length; _i++) {
          args[_i] = arguments[_i];
        }
        args[0] = delayedObject();
        var method = Reflect[name];
        return method.apply(void 0, __spread(args));
      };
    };
    this.reflectMethods.forEach(install);
    return handler;
  };
  return DelayedConstructor2;
})();
function isNormalToken(token) {
  return typeof token === "string" || typeof token === "symbol";
}
function isTokenDescriptor(descriptor) {
  return typeof descriptor === "object" && "token" in descriptor && "multiple" in descriptor;
}
function isTransformDescriptor(descriptor) {
  return typeof descriptor === "object" && "token" in descriptor && "transform" in descriptor;
}
function isConstructorToken(token) {
  return typeof token === "function" || token instanceof DelayedConstructor;
}
function isTokenProvider(provider) {
  return !!provider.useToken;
}
function isValueProvider(provider) {
  return provider.useValue != void 0;
}
function isProvider(provider) {
  return isClassProvider(provider) || isValueProvider(provider) || isTokenProvider(provider) || isFactoryProvider(provider);
}
var RegistryBase = (function() {
  function RegistryBase2() {
    this._registryMap = /* @__PURE__ */ new Map();
  }
  RegistryBase2.prototype.entries = function() {
    return this._registryMap.entries();
  };
  RegistryBase2.prototype.getAll = function(key2) {
    this.ensure(key2);
    return this._registryMap.get(key2);
  };
  RegistryBase2.prototype.get = function(key2) {
    this.ensure(key2);
    var value = this._registryMap.get(key2);
    return value[value.length - 1] || null;
  };
  RegistryBase2.prototype.set = function(key2, value) {
    this.ensure(key2);
    this._registryMap.get(key2).push(value);
  };
  RegistryBase2.prototype.setAll = function(key2, value) {
    this._registryMap.set(key2, value);
  };
  RegistryBase2.prototype.has = function(key2) {
    this.ensure(key2);
    return this._registryMap.get(key2).length > 0;
  };
  RegistryBase2.prototype.clear = function() {
    this._registryMap.clear();
  };
  RegistryBase2.prototype.ensure = function(key2) {
    if (!this._registryMap.has(key2)) {
      this._registryMap.set(key2, []);
    }
  };
  return RegistryBase2;
})();
var Registry = (function(_super) {
  __extends(Registry2, _super);
  function Registry2() {
    return _super !== null && _super.apply(this, arguments) || this;
  }
  return Registry2;
})(RegistryBase);
var ResolutionContext = /* @__PURE__ */ (function() {
  function ResolutionContext2() {
    this.scopedResolutions = /* @__PURE__ */ new Map();
  }
  return ResolutionContext2;
})();
function formatDependency(params, idx) {
  if (params === null) {
    return "at position #" + idx;
  }
  var argName = params.split(",")[idx].trim();
  return '"' + argName + '" at position #' + idx;
}
function composeErrorMessage(msg, e, indent) {
  if (indent === void 0) {
    indent = "    ";
  }
  return __spread([msg], e.message.split("\n").map(function(l) {
    return indent + l;
  })).join("\n");
}
function formatErrorCtor(ctor, paramIdx, error) {
  var _a2 = __read(ctor.toString().match(/constructor\(([\w, ]+)\)/) || [], 2), _b = _a2[1], params = _b === void 0 ? null : _b;
  var dep = formatDependency(params, paramIdx);
  return composeErrorMessage("Cannot inject the dependency " + dep + ' of "' + ctor.name + '" constructor. Reason:', error);
}
function isDisposable(value) {
  if (typeof value.dispose !== "function")
    return false;
  var disposeFun = value.dispose;
  if (disposeFun.length > 0) {
    return false;
  }
  return true;
}
var PreResolutionInterceptors = (function(_super) {
  __extends(PreResolutionInterceptors2, _super);
  function PreResolutionInterceptors2() {
    return _super !== null && _super.apply(this, arguments) || this;
  }
  return PreResolutionInterceptors2;
})(RegistryBase);
var PostResolutionInterceptors = (function(_super) {
  __extends(PostResolutionInterceptors2, _super);
  function PostResolutionInterceptors2() {
    return _super !== null && _super.apply(this, arguments) || this;
  }
  return PostResolutionInterceptors2;
})(RegistryBase);
var Interceptors = /* @__PURE__ */ (function() {
  function Interceptors2() {
    this.preResolution = new PreResolutionInterceptors();
    this.postResolution = new PostResolutionInterceptors();
  }
  return Interceptors2;
})();
var typeInfo = /* @__PURE__ */ new Map();
var InternalDependencyContainer = (function() {
  function InternalDependencyContainer2(parent) {
    this.parent = parent;
    this._registry = new Registry();
    this.interceptors = new Interceptors();
    this.disposed = false;
    this.disposables = /* @__PURE__ */ new Set();
  }
  InternalDependencyContainer2.prototype.register = function(token, providerOrConstructor, options) {
    if (options === void 0) {
      options = { lifecycle: Lifecycle$1.Transient };
    }
    this.ensureNotDisposed();
    var provider;
    if (!isProvider(providerOrConstructor)) {
      provider = { useClass: providerOrConstructor };
    } else {
      provider = providerOrConstructor;
    }
    if (isTokenProvider(provider)) {
      var path = [token];
      var tokenProvider = provider;
      while (tokenProvider != null) {
        var currentToken = tokenProvider.useToken;
        if (path.includes(currentToken)) {
          throw new Error("Token registration cycle detected! " + __spread(path, [currentToken]).join(" -> "));
        }
        path.push(currentToken);
        var registration = this._registry.get(currentToken);
        if (registration && isTokenProvider(registration.provider)) {
          tokenProvider = registration.provider;
        } else {
          tokenProvider = null;
        }
      }
    }
    if (options.lifecycle === Lifecycle$1.Singleton || options.lifecycle == Lifecycle$1.ContainerScoped || options.lifecycle == Lifecycle$1.ResolutionScoped) {
      if (isValueProvider(provider) || isFactoryProvider(provider)) {
        throw new Error('Cannot use lifecycle "' + Lifecycle$1[options.lifecycle] + '" with ValueProviders or FactoryProviders');
      }
    }
    this._registry.set(token, { provider, options });
    return this;
  };
  InternalDependencyContainer2.prototype.registerType = function(from, to) {
    this.ensureNotDisposed();
    if (isNormalToken(to)) {
      return this.register(from, {
        useToken: to
      });
    }
    return this.register(from, {
      useClass: to
    });
  };
  InternalDependencyContainer2.prototype.registerInstance = function(token, instance2) {
    this.ensureNotDisposed();
    return this.register(token, {
      useValue: instance2
    });
  };
  InternalDependencyContainer2.prototype.registerSingleton = function(from, to) {
    this.ensureNotDisposed();
    if (isNormalToken(from)) {
      if (isNormalToken(to)) {
        return this.register(from, {
          useToken: to
        }, { lifecycle: Lifecycle$1.Singleton });
      } else if (to) {
        return this.register(from, {
          useClass: to
        }, { lifecycle: Lifecycle$1.Singleton });
      }
      throw new Error('Cannot register a type name as a singleton without a "to" token');
    }
    var useClass = from;
    if (to && !isNormalToken(to)) {
      useClass = to;
    }
    return this.register(from, {
      useClass
    }, { lifecycle: Lifecycle$1.Singleton });
  };
  InternalDependencyContainer2.prototype.resolve = function(token, context, isOptional) {
    if (context === void 0) {
      context = new ResolutionContext();
    }
    if (isOptional === void 0) {
      isOptional = false;
    }
    this.ensureNotDisposed();
    var registration = this.getRegistration(token);
    if (!registration && isNormalToken(token)) {
      if (isOptional) {
        return void 0;
      }
      throw new Error('Attempted to resolve unregistered dependency token: "' + token.toString() + '"');
    }
    this.executePreResolutionInterceptor(token, "Single");
    if (registration) {
      var result = this.resolveRegistration(registration, context);
      this.executePostResolutionInterceptor(token, result, "Single");
      return result;
    }
    if (isConstructorToken(token)) {
      var result = this.construct(token, context);
      this.executePostResolutionInterceptor(token, result, "Single");
      return result;
    }
    throw new Error("Attempted to construct an undefined constructor. Could mean a circular dependency problem. Try using `delay` function.");
  };
  InternalDependencyContainer2.prototype.executePreResolutionInterceptor = function(token, resolutionType) {
    var e_1, _a2;
    if (this.interceptors.preResolution.has(token)) {
      var remainingInterceptors = [];
      try {
        for (var _b = __values(this.interceptors.preResolution.getAll(token)), _c = _b.next(); !_c.done; _c = _b.next()) {
          var interceptor = _c.value;
          if (interceptor.options.frequency != "Once") {
            remainingInterceptors.push(interceptor);
          }
          interceptor.callback(token, resolutionType);
        }
      } catch (e_1_1) {
        e_1 = { error: e_1_1 };
      } finally {
        try {
          if (_c && !_c.done && (_a2 = _b.return)) _a2.call(_b);
        } finally {
          if (e_1) throw e_1.error;
        }
      }
      this.interceptors.preResolution.setAll(token, remainingInterceptors);
    }
  };
  InternalDependencyContainer2.prototype.executePostResolutionInterceptor = function(token, result, resolutionType) {
    var e_2, _a2;
    if (this.interceptors.postResolution.has(token)) {
      var remainingInterceptors = [];
      try {
        for (var _b = __values(this.interceptors.postResolution.getAll(token)), _c = _b.next(); !_c.done; _c = _b.next()) {
          var interceptor = _c.value;
          if (interceptor.options.frequency != "Once") {
            remainingInterceptors.push(interceptor);
          }
          interceptor.callback(token, result, resolutionType);
        }
      } catch (e_2_1) {
        e_2 = { error: e_2_1 };
      } finally {
        try {
          if (_c && !_c.done && (_a2 = _b.return)) _a2.call(_b);
        } finally {
          if (e_2) throw e_2.error;
        }
      }
      this.interceptors.postResolution.setAll(token, remainingInterceptors);
    }
  };
  InternalDependencyContainer2.prototype.resolveRegistration = function(registration, context) {
    this.ensureNotDisposed();
    if (registration.options.lifecycle === Lifecycle$1.ResolutionScoped && context.scopedResolutions.has(registration)) {
      return context.scopedResolutions.get(registration);
    }
    var isSingleton = registration.options.lifecycle === Lifecycle$1.Singleton;
    var isContainerScoped = registration.options.lifecycle === Lifecycle$1.ContainerScoped;
    var returnInstance = isSingleton || isContainerScoped;
    var resolved;
    if (isValueProvider(registration.provider)) {
      resolved = registration.provider.useValue;
    } else if (isTokenProvider(registration.provider)) {
      resolved = returnInstance ? registration.instance || (registration.instance = this.resolve(registration.provider.useToken, context)) : this.resolve(registration.provider.useToken, context);
    } else if (isClassProvider(registration.provider)) {
      resolved = returnInstance ? registration.instance || (registration.instance = this.construct(registration.provider.useClass, context)) : this.construct(registration.provider.useClass, context);
    } else if (isFactoryProvider(registration.provider)) {
      resolved = registration.provider.useFactory(this);
    } else {
      resolved = this.construct(registration.provider, context);
    }
    if (registration.options.lifecycle === Lifecycle$1.ResolutionScoped) {
      context.scopedResolutions.set(registration, resolved);
    }
    return resolved;
  };
  InternalDependencyContainer2.prototype.resolveAll = function(token, context, isOptional) {
    var _this = this;
    if (context === void 0) {
      context = new ResolutionContext();
    }
    if (isOptional === void 0) {
      isOptional = false;
    }
    this.ensureNotDisposed();
    var registrations = this.getAllRegistrations(token);
    if (!registrations && isNormalToken(token)) {
      if (isOptional) {
        return [];
      }
      throw new Error('Attempted to resolve unregistered dependency token: "' + token.toString() + '"');
    }
    this.executePreResolutionInterceptor(token, "All");
    if (registrations) {
      var result_1 = registrations.map(function(item) {
        return _this.resolveRegistration(item, context);
      });
      this.executePostResolutionInterceptor(token, result_1, "All");
      return result_1;
    }
    var result = [this.construct(token, context)];
    this.executePostResolutionInterceptor(token, result, "All");
    return result;
  };
  InternalDependencyContainer2.prototype.isRegistered = function(token, recursive) {
    if (recursive === void 0) {
      recursive = false;
    }
    this.ensureNotDisposed();
    return this._registry.has(token) || recursive && (this.parent || false) && this.parent.isRegistered(token, true);
  };
  InternalDependencyContainer2.prototype.reset = function() {
    this.ensureNotDisposed();
    this._registry.clear();
    this.interceptors.preResolution.clear();
    this.interceptors.postResolution.clear();
  };
  InternalDependencyContainer2.prototype.clearInstances = function() {
    var e_3, _a2;
    this.ensureNotDisposed();
    try {
      for (var _b = __values(this._registry.entries()), _c = _b.next(); !_c.done; _c = _b.next()) {
        var _d = __read(_c.value, 2), token = _d[0], registrations = _d[1];
        this._registry.setAll(token, registrations.filter(function(registration) {
          return !isValueProvider(registration.provider);
        }).map(function(registration) {
          registration.instance = void 0;
          return registration;
        }));
      }
    } catch (e_3_1) {
      e_3 = { error: e_3_1 };
    } finally {
      try {
        if (_c && !_c.done && (_a2 = _b.return)) _a2.call(_b);
      } finally {
        if (e_3) throw e_3.error;
      }
    }
  };
  InternalDependencyContainer2.prototype.createChildContainer = function() {
    var e_4, _a2;
    this.ensureNotDisposed();
    var childContainer = new InternalDependencyContainer2(this);
    try {
      for (var _b = __values(this._registry.entries()), _c = _b.next(); !_c.done; _c = _b.next()) {
        var _d = __read(_c.value, 2), token = _d[0], registrations = _d[1];
        if (registrations.some(function(_a3) {
          var options = _a3.options;
          return options.lifecycle === Lifecycle$1.ContainerScoped;
        })) {
          childContainer._registry.setAll(token, registrations.map(function(registration) {
            if (registration.options.lifecycle === Lifecycle$1.ContainerScoped) {
              return {
                provider: registration.provider,
                options: registration.options
              };
            }
            return registration;
          }));
        }
      }
    } catch (e_4_1) {
      e_4 = { error: e_4_1 };
    } finally {
      try {
        if (_c && !_c.done && (_a2 = _b.return)) _a2.call(_b);
      } finally {
        if (e_4) throw e_4.error;
      }
    }
    return childContainer;
  };
  InternalDependencyContainer2.prototype.beforeResolution = function(token, callback, options) {
    if (options === void 0) {
      options = { frequency: "Always" };
    }
    this.interceptors.preResolution.set(token, {
      callback,
      options
    });
  };
  InternalDependencyContainer2.prototype.afterResolution = function(token, callback, options) {
    if (options === void 0) {
      options = { frequency: "Always" };
    }
    this.interceptors.postResolution.set(token, {
      callback,
      options
    });
  };
  InternalDependencyContainer2.prototype.dispose = function() {
    return __awaiter(this, void 0, void 0, function() {
      var promises;
      return __generator(this, function(_a2) {
        switch (_a2.label) {
          case 0:
            this.disposed = true;
            promises = [];
            this.disposables.forEach(function(disposable) {
              var maybePromise = disposable.dispose();
              if (maybePromise) {
                promises.push(maybePromise);
              }
            });
            return [4, Promise.all(promises)];
          case 1:
            _a2.sent();
            return [2];
        }
      });
    });
  };
  InternalDependencyContainer2.prototype.getRegistration = function(token) {
    if (this.isRegistered(token)) {
      return this._registry.get(token);
    }
    if (this.parent) {
      return this.parent.getRegistration(token);
    }
    return null;
  };
  InternalDependencyContainer2.prototype.getAllRegistrations = function(token) {
    if (this.isRegistered(token)) {
      return this._registry.getAll(token);
    }
    if (this.parent) {
      return this.parent.getAllRegistrations(token);
    }
    return null;
  };
  InternalDependencyContainer2.prototype.construct = function(ctor, context) {
    var _this = this;
    if (ctor instanceof DelayedConstructor) {
      return ctor.createProxy(function(target) {
        return _this.resolve(target, context);
      });
    }
    var instance2 = (function() {
      var paramInfo = typeInfo.get(ctor);
      if (!paramInfo || paramInfo.length === 0) {
        if (ctor.length === 0) {
          return new ctor();
        } else {
          throw new Error('TypeInfo not known for "' + ctor.name + '"');
        }
      }
      var params = paramInfo.map(_this.resolveParams(context, ctor));
      return new (ctor.bind.apply(ctor, __spread([void 0], params)))();
    })();
    if (isDisposable(instance2)) {
      this.disposables.add(instance2);
    }
    return instance2;
  };
  InternalDependencyContainer2.prototype.resolveParams = function(context, ctor) {
    var _this = this;
    return function(param, idx) {
      var _a2, _b, _c;
      try {
        if (isTokenDescriptor(param)) {
          if (isTransformDescriptor(param)) {
            return param.multiple ? (_a2 = _this.resolve(param.transform)).transform.apply(_a2, __spread([_this.resolveAll(param.token, new ResolutionContext(), param.isOptional)], param.transformArgs)) : (_b = _this.resolve(param.transform)).transform.apply(_b, __spread([_this.resolve(param.token, context, param.isOptional)], param.transformArgs));
          } else {
            return param.multiple ? _this.resolveAll(param.token, new ResolutionContext(), param.isOptional) : _this.resolve(param.token, context, param.isOptional);
          }
        } else if (isTransformDescriptor(param)) {
          return (_c = _this.resolve(param.transform, context)).transform.apply(_c, __spread([_this.resolve(param.token, context)], param.transformArgs));
        }
        return _this.resolve(param, context);
      } catch (e) {
        throw new Error(formatErrorCtor(ctor, idx, e));
      }
    };
  };
  InternalDependencyContainer2.prototype.ensureNotDisposed = function() {
    if (this.disposed) {
      throw new Error("This container has been disposed, you cannot interact with a disposed container");
    }
  };
  return InternalDependencyContainer2;
})();
var instance = new InternalDependencyContainer();
function injectable(options) {
  return function(target) {
    typeInfo.set(target, getParamInfo(target));
  };
}
if (typeof Reflect === "undefined" || !Reflect.getMetadata) {
  throw new Error(`tsyringe requires a reflect polyfill. Please add 'import "reflect-metadata"' to the top of your entry point.`);
}
var PKCS12AttrSet_1;
class PKCS12Attribute {
  attrId = "";
  attrValues = [];
  constructor(params = {}) {
    Object.assign(params);
  }
}
__decorate([
  AsnProp({ type: AsnPropTypes.ObjectIdentifier })
], PKCS12Attribute.prototype, "attrId", void 0);
__decorate([
  AsnProp({
    type: AsnPropTypes.Any,
    repeated: "set"
  })
], PKCS12Attribute.prototype, "attrValues", void 0);
let PKCS12AttrSet = PKCS12AttrSet_1 = class PKCS12AttrSet2 extends AsnArray {
  constructor(items) {
    super(items);
    Object.setPrototypeOf(this, PKCS12AttrSet_1.prototype);
  }
};
PKCS12AttrSet = PKCS12AttrSet_1 = __decorate([
  AsnType({
    type: AsnTypeTypes.Sequence,
    itemType: PKCS12Attribute
  })
], PKCS12AttrSet);
var AuthenticatedSafe_1;
let AuthenticatedSafe = AuthenticatedSafe_1 = class AuthenticatedSafe2 extends AsnArray {
  constructor(items) {
    super(items);
    Object.setPrototypeOf(this, AuthenticatedSafe_1.prototype);
  }
};
AuthenticatedSafe = AuthenticatedSafe_1 = __decorate([
  AsnType({
    type: AsnTypeTypes.Sequence,
    itemType: ContentInfo
  })
], AuthenticatedSafe);
class CertBag {
  certId = "";
  certValue = new ArrayBuffer(0);
  constructor(params = {}) {
    Object.assign(this, params);
  }
}
__decorate([
  AsnProp({ type: AsnPropTypes.ObjectIdentifier })
], CertBag.prototype, "certId", void 0);
__decorate([
  AsnProp({
    type: AsnPropTypes.Any,
    context: 0
  })
], CertBag.prototype, "certValue", void 0);
class CRLBag {
  crlId = "";
  crltValue = new ArrayBuffer(0);
  constructor(params = {}) {
    Object.assign(this, params);
  }
}
__decorate([
  AsnProp({ type: AsnPropTypes.ObjectIdentifier })
], CRLBag.prototype, "crlId", void 0);
__decorate([
  AsnProp({
    type: AsnPropTypes.Any,
    context: 0
  })
], CRLBag.prototype, "crltValue", void 0);
class EncryptedData extends OctetString2 {
}
let EncryptedPrivateKeyInfo$1 = class EncryptedPrivateKeyInfo {
  encryptionAlgorithm = new AlgorithmIdentifier();
  encryptedData = new EncryptedData();
  constructor(params = {}) {
    Object.assign(this, params);
  }
};
__decorate([
  AsnProp({ type: AlgorithmIdentifier })
], EncryptedPrivateKeyInfo$1.prototype, "encryptionAlgorithm", void 0);
__decorate([
  AsnProp({ type: EncryptedData })
], EncryptedPrivateKeyInfo$1.prototype, "encryptedData", void 0);
var Attributes_1$1;
var Version$1;
(function(Version2) {
  Version2[Version2["v1"] = 0] = "v1";
})(Version$1 || (Version$1 = {}));
class PrivateKey extends OctetString2 {
}
let Attributes$1 = Attributes_1$1 = class Attributes extends AsnArray {
  constructor(items) {
    super(items);
    Object.setPrototypeOf(this, Attributes_1$1.prototype);
  }
};
Attributes$1 = Attributes_1$1 = __decorate([
  AsnType({
    type: AsnTypeTypes.Sequence,
    itemType: Attribute$2
  })
], Attributes$1);
class PrivateKeyInfo {
  version = Version$1.v1;
  privateKeyAlgorithm = new AlgorithmIdentifier();
  privateKey = new PrivateKey();
  attributes;
  constructor(params = {}) {
    Object.assign(this, params);
  }
}
__decorate([
  AsnProp({ type: AsnPropTypes.Integer })
], PrivateKeyInfo.prototype, "version", void 0);
__decorate([
  AsnProp({ type: AlgorithmIdentifier })
], PrivateKeyInfo.prototype, "privateKeyAlgorithm", void 0);
__decorate([
  AsnProp({ type: PrivateKey })
], PrivateKeyInfo.prototype, "privateKey", void 0);
__decorate([
  AsnProp({
    type: Attributes$1,
    implicit: true,
    context: 0,
    optional: true
  })
], PrivateKeyInfo.prototype, "attributes", void 0);
let KeyBag = class KeyBag2 extends PrivateKeyInfo {
};
KeyBag = __decorate([
  AsnType({ type: AsnTypeTypes.Sequence })
], KeyBag);
let PKCS8ShroudedKeyBag = class PKCS8ShroudedKeyBag2 extends EncryptedPrivateKeyInfo$1 {
};
PKCS8ShroudedKeyBag = __decorate([
  AsnType({ type: AsnTypeTypes.Sequence })
], PKCS8ShroudedKeyBag);
class SecretBag {
  secretTypeId = "";
  secretValue = new ArrayBuffer(0);
  constructor(params = {}) {
    Object.assign(this, params);
  }
}
__decorate([
  AsnProp({ type: AsnPropTypes.ObjectIdentifier })
], SecretBag.prototype, "secretTypeId", void 0);
__decorate([
  AsnProp({
    type: AsnPropTypes.Any,
    context: 0
  })
], SecretBag.prototype, "secretValue", void 0);
class MacData {
  mac = new DigestInfo();
  macSalt = new OctetString2();
  iterations = 1;
  constructor(params = {}) {
    Object.assign(this, params);
  }
}
__decorate([
  AsnProp({ type: DigestInfo })
], MacData.prototype, "mac", void 0);
__decorate([
  AsnProp({ type: OctetString2 })
], MacData.prototype, "macSalt", void 0);
__decorate([
  AsnProp({
    type: AsnPropTypes.Integer,
    defaultValue: 1
  })
], MacData.prototype, "iterations", void 0);
class PFX {
  version = 3;
  authSafe = new ContentInfo();
  macData = new MacData();
  constructor(params = {}) {
    Object.assign(this, params);
  }
}
__decorate([
  AsnProp({ type: AsnPropTypes.Integer })
], PFX.prototype, "version", void 0);
__decorate([
  AsnProp({ type: ContentInfo })
], PFX.prototype, "authSafe", void 0);
__decorate([
  AsnProp({
    type: MacData,
    optional: true
  })
], PFX.prototype, "macData", void 0);
var SafeContents_1;
class SafeBag {
  bagId = "";
  bagValue = new ArrayBuffer(0);
  bagAttributes;
  constructor(params = {}) {
    Object.assign(this, params);
  }
}
__decorate([
  AsnProp({ type: AsnPropTypes.ObjectIdentifier })
], SafeBag.prototype, "bagId", void 0);
__decorate([
  AsnProp({
    type: AsnPropTypes.Any,
    context: 0
  })
], SafeBag.prototype, "bagValue", void 0);
__decorate([
  AsnProp({
    type: PKCS12Attribute,
    repeated: "set",
    optional: true
  })
], SafeBag.prototype, "bagAttributes", void 0);
let SafeContents = SafeContents_1 = class SafeContents2 extends AsnArray {
  constructor(items) {
    super(items);
    Object.setPrototypeOf(this, SafeContents_1.prototype);
  }
};
SafeContents = SafeContents_1 = __decorate([
  AsnType({
    type: AsnTypeTypes.Sequence,
    itemType: SafeBag
  })
], SafeContents);
var ExtensionRequest_1, ExtendedCertificateAttributes_1, SMIMECapabilities_1;
const id_pkcs9 = "1.2.840.113549.1.9";
const id_pkcs9_at_challengePassword = `${id_pkcs9}.7`;
const id_pkcs9_at_extensionRequest = `${id_pkcs9}.14`;
let PKCS9String = class PKCS9String2 extends DirectoryString {
  ia5String;
  constructor(params = {}) {
    super(params);
  }
  toString() {
    return this.ia5String || super.toString();
  }
};
__decorate([
  AsnProp({ type: AsnPropTypes.IA5String })
], PKCS9String.prototype, "ia5String", void 0);
PKCS9String = __decorate([
  AsnType({ type: AsnTypeTypes.Choice })
], PKCS9String);
let Pkcs7PDU = class Pkcs7PDU2 extends ContentInfo {
};
Pkcs7PDU = __decorate([
  AsnType({ type: AsnTypeTypes.Sequence })
], Pkcs7PDU);
let UserPKCS12 = class UserPKCS122 extends PFX {
};
UserPKCS12 = __decorate([
  AsnType({ type: AsnTypeTypes.Sequence })
], UserPKCS12);
let EncryptedPrivateKeyInfo2 = class EncryptedPrivateKeyInfo3 extends EncryptedPrivateKeyInfo$1 {
};
EncryptedPrivateKeyInfo2 = __decorate([
  AsnType({ type: AsnTypeTypes.Sequence })
], EncryptedPrivateKeyInfo2);
let EmailAddress = class EmailAddress2 {
  value;
  constructor(value = "") {
    this.value = value;
  }
  toString() {
    return this.value;
  }
};
__decorate([
  AsnProp({ type: AsnPropTypes.IA5String })
], EmailAddress.prototype, "value", void 0);
EmailAddress = __decorate([
  AsnType({ type: AsnTypeTypes.Choice })
], EmailAddress);
let UnstructuredName = class UnstructuredName2 extends PKCS9String {
};
UnstructuredName = __decorate([
  AsnType({ type: AsnTypeTypes.Choice })
], UnstructuredName);
let UnstructuredAddress = class UnstructuredAddress2 extends DirectoryString {
};
UnstructuredAddress = __decorate([
  AsnType({ type: AsnTypeTypes.Choice })
], UnstructuredAddress);
let DateOfBirth = class DateOfBirth2 {
  value;
  constructor(value = /* @__PURE__ */ new Date()) {
    this.value = value;
  }
};
__decorate([
  AsnProp({ type: AsnPropTypes.GeneralizedTime })
], DateOfBirth.prototype, "value", void 0);
DateOfBirth = __decorate([
  AsnType({ type: AsnTypeTypes.Choice })
], DateOfBirth);
let PlaceOfBirth = class PlaceOfBirth2 extends DirectoryString {
};
PlaceOfBirth = __decorate([
  AsnType({ type: AsnTypeTypes.Choice })
], PlaceOfBirth);
let Gender = class Gender2 {
  value;
  constructor(value = "M") {
    this.value = value;
  }
  toString() {
    return this.value;
  }
};
__decorate([
  AsnProp({ type: AsnPropTypes.PrintableString })
], Gender.prototype, "value", void 0);
Gender = __decorate([
  AsnType({ type: AsnTypeTypes.Choice })
], Gender);
let CountryOfCitizenship = class CountryOfCitizenship2 {
  value;
  constructor(value = "") {
    this.value = value;
  }
  toString() {
    return this.value;
  }
};
__decorate([
  AsnProp({ type: AsnPropTypes.PrintableString })
], CountryOfCitizenship.prototype, "value", void 0);
CountryOfCitizenship = __decorate([
  AsnType({ type: AsnTypeTypes.Choice })
], CountryOfCitizenship);
let CountryOfResidence = class CountryOfResidence2 extends CountryOfCitizenship {
};
CountryOfResidence = __decorate([
  AsnType({ type: AsnTypeTypes.Choice })
], CountryOfResidence);
let Pseudonym = class Pseudonym2 extends DirectoryString {
};
Pseudonym = __decorate([
  AsnType({ type: AsnTypeTypes.Choice })
], Pseudonym);
let ContentType = class ContentType2 {
  value;
  constructor(value = "") {
    this.value = value;
  }
  toString() {
    return this.value;
  }
};
__decorate([
  AsnProp({ type: AsnPropTypes.ObjectIdentifier })
], ContentType.prototype, "value", void 0);
ContentType = __decorate([
  AsnType({ type: AsnTypeTypes.Choice })
], ContentType);
let SigningTime2 = class SigningTime3 extends Time {
};
SigningTime2 = __decorate([
  AsnType({ type: AsnTypeTypes.Choice })
], SigningTime2);
let SequenceNumber = class SequenceNumber2 {
  value;
  constructor(value = 0) {
    this.value = value;
  }
  toString() {
    return this.value.toString();
  }
};
__decorate([
  AsnProp({ type: AsnPropTypes.Integer })
], SequenceNumber.prototype, "value", void 0);
SequenceNumber = __decorate([
  AsnType({ type: AsnTypeTypes.Choice })
], SequenceNumber);
let CounterSignature2 = class CounterSignature3 extends SignerInfo {
};
CounterSignature2 = __decorate([
  AsnType({ type: AsnTypeTypes.Sequence })
], CounterSignature2);
let ChallengePassword = class ChallengePassword2 extends DirectoryString {
};
ChallengePassword = __decorate([
  AsnType({ type: AsnTypeTypes.Choice })
], ChallengePassword);
let ExtensionRequest = ExtensionRequest_1 = class ExtensionRequest2 extends Extensions {
  constructor(items) {
    super(items);
    Object.setPrototypeOf(this, ExtensionRequest_1.prototype);
  }
};
ExtensionRequest = ExtensionRequest_1 = __decorate([
  AsnType({ type: AsnTypeTypes.Sequence })
], ExtensionRequest);
let ExtendedCertificateAttributes = ExtendedCertificateAttributes_1 = class ExtendedCertificateAttributes2 extends AsnArray {
  constructor(items) {
    super(items);
    Object.setPrototypeOf(this, ExtendedCertificateAttributes_1.prototype);
  }
};
ExtendedCertificateAttributes = ExtendedCertificateAttributes_1 = __decorate([
  AsnType({
    type: AsnTypeTypes.Set,
    itemType: Attribute$1
  })
], ExtendedCertificateAttributes);
let FriendlyName = class FriendlyName2 {
  value;
  constructor(value = "") {
    this.value = value;
  }
  toString() {
    return this.value;
  }
};
__decorate([
  AsnProp({ type: AsnPropTypes.BmpString })
], FriendlyName.prototype, "value", void 0);
FriendlyName = __decorate([
  AsnType({ type: AsnTypeTypes.Choice })
], FriendlyName);
let SMIMECapability = class SMIMECapability2 extends AlgorithmIdentifier {
};
SMIMECapability = __decorate([
  AsnType({ type: AsnTypeTypes.Sequence })
], SMIMECapability);
let SMIMECapabilities = SMIMECapabilities_1 = class SMIMECapabilities2 extends AsnArray {
  constructor(items) {
    super(items);
    Object.setPrototypeOf(this, SMIMECapabilities_1.prototype);
  }
};
SMIMECapabilities = SMIMECapabilities_1 = __decorate([
  AsnType({
    type: AsnTypeTypes.Sequence,
    itemType: SMIMECapability
  })
], SMIMECapabilities);
var Attributes_1;
let Attributes2 = Attributes_1 = class Attributes3 extends AsnArray {
  constructor(items) {
    super(items);
    Object.setPrototypeOf(this, Attributes_1.prototype);
  }
};
Attributes2 = Attributes_1 = __decorate([
  AsnType({
    type: AsnTypeTypes.Sequence,
    itemType: Attribute$2
  })
], Attributes2);
class CertificationRequestInfo {
  version = 0;
  subject = new Name$1();
  subjectPKInfo = new SubjectPublicKeyInfo();
  attributes = new Attributes2();
  constructor(params = {}) {
    Object.assign(this, params);
  }
}
__decorate([
  AsnProp({ type: AsnPropTypes.Integer })
], CertificationRequestInfo.prototype, "version", void 0);
__decorate([
  AsnProp({ type: Name$1 })
], CertificationRequestInfo.prototype, "subject", void 0);
__decorate([
  AsnProp({ type: SubjectPublicKeyInfo })
], CertificationRequestInfo.prototype, "subjectPKInfo", void 0);
__decorate([
  AsnProp({
    type: Attributes2,
    implicit: true,
    context: 0,
    optional: true
  })
], CertificationRequestInfo.prototype, "attributes", void 0);
class CertificationRequest {
  certificationRequestInfo = new CertificationRequestInfo();
  certificationRequestInfoRaw;
  signatureAlgorithm = new AlgorithmIdentifier();
  signature = new ArrayBuffer(0);
  constructor(params = {}) {
    Object.assign(this, params);
  }
}
__decorate([
  AsnProp({
    type: CertificationRequestInfo,
    raw: true
  })
], CertificationRequest.prototype, "certificationRequestInfo", void 0);
__decorate([
  AsnProp({ type: AlgorithmIdentifier })
], CertificationRequest.prototype, "signatureAlgorithm", void 0);
__decorate([
  AsnProp({ type: AsnPropTypes.BitString })
], CertificationRequest.prototype, "signature", void 0);
/*!
 * MIT License
 * 
 * Copyright (c) Peculiar Ventures. All rights reserved.
 * 
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 * 
 * The above copyright notice and this permission notice shall be included in all
 * copies or substantial portions of the Software.
 * 
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
 * SOFTWARE.
 * 
 */
const diAlgorithm = "crypto.algorithm";
class AlgorithmProvider {
  getAlgorithms() {
    return instance.resolveAll(diAlgorithm);
  }
  toAsnAlgorithm(alg) {
    ({ ...alg });
    for (const algorithm of this.getAlgorithms()) {
      const res = algorithm.toAsnAlgorithm(alg);
      if (res) {
        return res;
      }
    }
    if (/^[0-9.]+$/.test(alg.name)) {
      const res = new AlgorithmIdentifier({ algorithm: alg.name });
      if ("parameters" in alg) {
        const unknown = alg;
        res.parameters = unknown.parameters;
      }
      return res;
    }
    throw new Error("Cannot convert WebCrypto algorithm to ASN.1 algorithm");
  }
  toWebAlgorithm(alg) {
    for (const algorithm of this.getAlgorithms()) {
      const res = algorithm.toWebAlgorithm(alg);
      if (res) {
        return res;
      }
    }
    const unknown = {
      name: alg.algorithm,
      parameters: alg.parameters
    };
    return unknown;
  }
}
const diAlgorithmProvider = "crypto.algorithmProvider";
instance.registerSingleton(diAlgorithmProvider, AlgorithmProvider);
var EcAlgorithm_1;
const idVersionOne = "1.3.36.3.3.2.8.1.1";
const idBrainpoolP160r1 = `${idVersionOne}.1`;
const idBrainpoolP160t1 = `${idVersionOne}.2`;
const idBrainpoolP192r1 = `${idVersionOne}.3`;
const idBrainpoolP192t1 = `${idVersionOne}.4`;
const idBrainpoolP224r1 = `${idVersionOne}.5`;
const idBrainpoolP224t1 = `${idVersionOne}.6`;
const idBrainpoolP256r1 = `${idVersionOne}.7`;
const idBrainpoolP256t1 = `${idVersionOne}.8`;
const idBrainpoolP320r1 = `${idVersionOne}.9`;
const idBrainpoolP320t1 = `${idVersionOne}.10`;
const idBrainpoolP384r1 = `${idVersionOne}.11`;
const idBrainpoolP384t1 = `${idVersionOne}.12`;
const idBrainpoolP512r1 = `${idVersionOne}.13`;
const idBrainpoolP512t1 = `${idVersionOne}.14`;
const brainpoolP160r1 = "brainpoolP160r1";
const brainpoolP160t1 = "brainpoolP160t1";
const brainpoolP192r1 = "brainpoolP192r1";
const brainpoolP192t1 = "brainpoolP192t1";
const brainpoolP224r1 = "brainpoolP224r1";
const brainpoolP224t1 = "brainpoolP224t1";
const brainpoolP256r1 = "brainpoolP256r1";
const brainpoolP256t1 = "brainpoolP256t1";
const brainpoolP320r1 = "brainpoolP320r1";
const brainpoolP320t1 = "brainpoolP320t1";
const brainpoolP384r1 = "brainpoolP384r1";
const brainpoolP384t1 = "brainpoolP384t1";
const brainpoolP512r1 = "brainpoolP512r1";
const brainpoolP512t1 = "brainpoolP512t1";
const ECDSA = "ECDSA";
let EcAlgorithm = EcAlgorithm_1 = class EcAlgorithm2 {
  toAsnAlgorithm(alg) {
    switch (alg.name.toLowerCase()) {
      case ECDSA.toLowerCase():
        if ("hash" in alg) {
          const hash = typeof alg.hash === "string" ? alg.hash : alg.hash.name;
          switch (hash.toLowerCase()) {
            case "sha-1":
              return ecdsaWithSHA1;
            case "sha-256":
              return ecdsaWithSHA256;
            case "sha-384":
              return ecdsaWithSHA384;
            case "sha-512":
              return ecdsaWithSHA512;
          }
        } else if ("namedCurve" in alg) {
          let parameters = "";
          switch (alg.namedCurve) {
            case "P-256":
              parameters = id_secp256r1;
              break;
            case "K-256":
              parameters = EcAlgorithm_1.SECP256K1;
              break;
            case "P-384":
              parameters = id_secp384r1;
              break;
            case "P-521":
              parameters = id_secp521r1;
              break;
            case brainpoolP160r1:
              parameters = idBrainpoolP160r1;
              break;
            case brainpoolP160t1:
              parameters = idBrainpoolP160t1;
              break;
            case brainpoolP192r1:
              parameters = idBrainpoolP192r1;
              break;
            case brainpoolP192t1:
              parameters = idBrainpoolP192t1;
              break;
            case brainpoolP224r1:
              parameters = idBrainpoolP224r1;
              break;
            case brainpoolP224t1:
              parameters = idBrainpoolP224t1;
              break;
            case brainpoolP256r1:
              parameters = idBrainpoolP256r1;
              break;
            case brainpoolP256t1:
              parameters = idBrainpoolP256t1;
              break;
            case brainpoolP320r1:
              parameters = idBrainpoolP320r1;
              break;
            case brainpoolP320t1:
              parameters = idBrainpoolP320t1;
              break;
            case brainpoolP384r1:
              parameters = idBrainpoolP384r1;
              break;
            case brainpoolP384t1:
              parameters = idBrainpoolP384t1;
              break;
            case brainpoolP512r1:
              parameters = idBrainpoolP512r1;
              break;
            case brainpoolP512t1:
              parameters = idBrainpoolP512t1;
              break;
          }
          if (parameters) {
            return new AlgorithmIdentifier({
              algorithm: id_ecPublicKey,
              parameters: AsnConvert.serialize(new ECParameters({ namedCurve: parameters }))
            });
          }
        }
    }
    return null;
  }
  toWebAlgorithm(alg) {
    switch (alg.algorithm) {
      case id_ecdsaWithSHA1:
        return {
          name: ECDSA,
          hash: { name: "SHA-1" }
        };
      case id_ecdsaWithSHA256:
        return {
          name: ECDSA,
          hash: { name: "SHA-256" }
        };
      case id_ecdsaWithSHA384:
        return {
          name: ECDSA,
          hash: { name: "SHA-384" }
        };
      case id_ecdsaWithSHA512:
        return {
          name: ECDSA,
          hash: { name: "SHA-512" }
        };
      case id_ecPublicKey: {
        if (!alg.parameters) {
          throw new TypeError("Cannot get required parameters from EC algorithm");
        }
        const parameters = AsnConvert.parse(alg.parameters, ECParameters);
        switch (parameters.namedCurve) {
          case id_secp256r1:
            return {
              name: ECDSA,
              namedCurve: "P-256"
            };
          case EcAlgorithm_1.SECP256K1:
            return {
              name: ECDSA,
              namedCurve: "K-256"
            };
          case id_secp384r1:
            return {
              name: ECDSA,
              namedCurve: "P-384"
            };
          case id_secp521r1:
            return {
              name: ECDSA,
              namedCurve: "P-521"
            };
          case idBrainpoolP160r1:
            return {
              name: ECDSA,
              namedCurve: brainpoolP160r1
            };
          case idBrainpoolP160t1:
            return {
              name: ECDSA,
              namedCurve: brainpoolP160t1
            };
          case idBrainpoolP192r1:
            return {
              name: ECDSA,
              namedCurve: brainpoolP192r1
            };
          case idBrainpoolP192t1:
            return {
              name: ECDSA,
              namedCurve: brainpoolP192t1
            };
          case idBrainpoolP224r1:
            return {
              name: ECDSA,
              namedCurve: brainpoolP224r1
            };
          case idBrainpoolP224t1:
            return {
              name: ECDSA,
              namedCurve: brainpoolP224t1
            };
          case idBrainpoolP256r1:
            return {
              name: ECDSA,
              namedCurve: brainpoolP256r1
            };
          case idBrainpoolP256t1:
            return {
              name: ECDSA,
              namedCurve: brainpoolP256t1
            };
          case idBrainpoolP320r1:
            return {
              name: ECDSA,
              namedCurve: brainpoolP320r1
            };
          case idBrainpoolP320t1:
            return {
              name: ECDSA,
              namedCurve: brainpoolP320t1
            };
          case idBrainpoolP384r1:
            return {
              name: ECDSA,
              namedCurve: brainpoolP384r1
            };
          case idBrainpoolP384t1:
            return {
              name: ECDSA,
              namedCurve: brainpoolP384t1
            };
          case idBrainpoolP512r1:
            return {
              name: ECDSA,
              namedCurve: brainpoolP512r1
            };
          case idBrainpoolP512t1:
            return {
              name: ECDSA,
              namedCurve: brainpoolP512t1
            };
        }
      }
    }
    return null;
  }
};
EcAlgorithm.SECP256K1 = "1.3.132.0.10";
EcAlgorithm = EcAlgorithm_1 = __decorate([
  injectable()
], EcAlgorithm);
instance.registerSingleton(diAlgorithm, EcAlgorithm);
const NAME = Symbol("name");
const VALUE = Symbol("value");
class TextObject {
  constructor(name, items = {}, value = "") {
    this[NAME] = name;
    this[VALUE] = value;
    for (const key2 in items) {
      this[key2] = items[key2];
    }
  }
}
TextObject.NAME = NAME;
TextObject.VALUE = VALUE;
class DefaultAlgorithmSerializer {
  static toTextObject(alg) {
    const obj = new TextObject("Algorithm Identifier", {}, OidSerializer.toString(alg.algorithm));
    if (alg.parameters) {
      switch (alg.algorithm) {
        case id_ecPublicKey: {
          const ecAlg = new EcAlgorithm().toWebAlgorithm(alg);
          if (ecAlg && "namedCurve" in ecAlg) {
            obj["Named Curve"] = ecAlg.namedCurve;
          } else {
            obj["Parameters"] = alg.parameters;
          }
          break;
        }
        default:
          obj["Parameters"] = alg.parameters;
      }
    }
    return obj;
  }
}
class OidSerializer {
  static toString(oid) {
    const name = this.items[oid];
    if (name) {
      return name;
    }
    return oid;
  }
}
OidSerializer.items = {
  [id_sha1]: "sha1",
  [id_sha224]: "sha224",
  [id_sha256]: "sha256",
  [id_sha384]: "sha384",
  [id_sha512]: "sha512",
  [id_rsaEncryption]: "rsaEncryption",
  [id_sha1WithRSAEncryption]: "sha1WithRSAEncryption",
  [id_sha224WithRSAEncryption]: "sha224WithRSAEncryption",
  [id_sha256WithRSAEncryption]: "sha256WithRSAEncryption",
  [id_sha384WithRSAEncryption]: "sha384WithRSAEncryption",
  [id_sha512WithRSAEncryption]: "sha512WithRSAEncryption",
  [id_ecPublicKey]: "ecPublicKey",
  [id_ecdsaWithSHA1]: "ecdsaWithSHA1",
  [id_ecdsaWithSHA224]: "ecdsaWithSHA224",
  [id_ecdsaWithSHA256]: "ecdsaWithSHA256",
  [id_ecdsaWithSHA384]: "ecdsaWithSHA384",
  [id_ecdsaWithSHA512]: "ecdsaWithSHA512",
  [id_kp_serverAuth]: "TLS WWW server authentication",
  [id_kp_clientAuth]: "TLS WWW client authentication",
  [id_kp_codeSigning]: "Code Signing",
  [id_kp_emailProtection]: "E-mail Protection",
  [id_kp_timeStamping]: "Time Stamping",
  [id_kp_OCSPSigning]: "OCSP Signing",
  [id_signedData]: "Signed Data"
};
class TextConverter {
  static serialize(obj) {
    return this.serializeObj(obj).join("\n");
  }
  static pad(deep = 0) {
    return "".padStart(2 * deep, " ");
  }
  static serializeObj(obj, deep = 0) {
    const res = [];
    let pad = this.pad(deep++);
    let value = "";
    const objValue = obj[TextObject.VALUE];
    if (objValue) {
      value = ` ${objValue}`;
    }
    res.push(`${pad}${obj[TextObject.NAME]}:${value}`);
    pad = this.pad(deep);
    for (const key2 in obj) {
      if (typeof key2 === "symbol") {
        continue;
      }
      const value2 = obj[key2];
      const keyValue = key2 ? `${key2}: ` : "";
      if (typeof value2 === "string" || typeof value2 === "number" || typeof value2 === "boolean") {
        res.push(`${pad}${keyValue}${value2}`);
      } else if (value2 instanceof Date) {
        res.push(`${pad}${keyValue}${value2.toUTCString()}`);
      } else if (Array.isArray(value2)) {
        for (const obj2 of value2) {
          obj2[TextObject.NAME] = key2;
          res.push(...this.serializeObj(obj2, deep));
        }
      } else if (value2 instanceof TextObject) {
        value2[TextObject.NAME] = key2;
        res.push(...this.serializeObj(value2, deep));
      } else if (BufferSourceConverter.isBufferSource(value2)) {
        if (key2) {
          res.push(`${pad}${keyValue}`);
          res.push(...this.serializeBufferSource(value2, deep + 1));
        } else {
          res.push(...this.serializeBufferSource(value2, deep));
        }
      } else if ("toTextObject" in value2) {
        const obj2 = value2.toTextObject();
        obj2[TextObject.NAME] = key2;
        res.push(...this.serializeObj(obj2, deep));
      } else {
        throw new TypeError("Cannot serialize data in text format. Unsupported type.");
      }
    }
    return res;
  }
  static serializeBufferSource(buffer, deep = 0) {
    const pad = this.pad(deep);
    const view = BufferSourceConverter.toUint8Array(buffer);
    const res = [];
    for (let i = 0; i < view.length; ) {
      const row = [];
      for (let j = 0; j < 16 && i < view.length; j++) {
        if (j === 8) {
          row.push("");
        }
        const hex = view[i++].toString(16).padStart(2, "0");
        row.push(hex);
      }
      res.push(`${pad}${row.join(" ")}`);
    }
    return res;
  }
  static serializeAlgorithm(alg) {
    return this.algorithmSerializer.toTextObject(alg);
  }
}
TextConverter.oidSerializer = OidSerializer;
TextConverter.algorithmSerializer = DefaultAlgorithmSerializer;
var _AsnData_rawData;
class AsnData {
  get rawData() {
    if (!__classPrivateFieldGet(this, _AsnData_rawData, "f")) {
      __classPrivateFieldSet(this, _AsnData_rawData, AsnConvert.serialize(this.asn), "f");
    }
    return __classPrivateFieldGet(this, _AsnData_rawData, "f");
  }
  constructor(...args) {
    _AsnData_rawData.set(this, void 0);
    if (BufferSourceConverter.isBufferSource(args[0])) {
      this.asn = AsnConvert.parse(args[0], args[1]);
      __classPrivateFieldSet(this, _AsnData_rawData, BufferSourceConverter.toArrayBuffer(args[0]), "f");
      this.onInit(this.asn);
    } else {
      this.asn = args[0];
      this.onInit(this.asn);
    }
  }
  equal(data) {
    if (data instanceof AsnData) {
      return isEqual(data.rawData, this.rawData);
    }
    return false;
  }
  toString(format = "text") {
    switch (format) {
      case "asn":
        return AsnConvert.toString(this.rawData);
      case "text":
        return TextConverter.serialize(this.toTextObject());
      case "hex":
        return Convert.ToHex(this.rawData);
      case "base64":
        return Convert.ToBase64(this.rawData);
      case "base64url":
        return Convert.ToBase64Url(this.rawData);
      default:
        throw TypeError("Argument 'format' is unsupported value");
    }
  }
  getTextName() {
    const constructor = this.constructor;
    return constructor.NAME;
  }
  toTextObject() {
    const obj = this.toTextObjectEmpty();
    obj[""] = this.rawData;
    return obj;
  }
  toTextObjectEmpty(value) {
    return new TextObject(this.getTextName(), {}, value);
  }
}
_AsnData_rawData = /* @__PURE__ */ new WeakMap();
AsnData.NAME = "ASN";
class Extension2 extends AsnData {
  constructor(...args) {
    let raw;
    if (BufferSourceConverter.isBufferSource(args[0])) {
      raw = BufferSourceConverter.toArrayBuffer(args[0]);
    } else {
      raw = AsnConvert.serialize(new Extension$1({
        extnID: args[0],
        critical: args[1],
        extnValue: new OctetString2(BufferSourceConverter.toArrayBuffer(args[2]))
      }));
    }
    super(raw, Extension$1);
  }
  onInit(asn) {
    this.type = asn.extnID;
    this.critical = asn.critical;
    this.value = asn.extnValue.buffer;
  }
  toTextObject() {
    const obj = this.toTextObjectWithoutValue();
    obj[""] = this.value;
    return obj;
  }
  toTextObjectWithoutValue() {
    const obj = this.toTextObjectEmpty(this.critical ? "critical" : void 0);
    if (obj[TextObject.NAME] === Extension2.NAME) {
      obj[TextObject.NAME] = OidSerializer.toString(this.type);
    }
    return obj;
  }
}
var _a;
class CryptoProvider {
  static isCryptoKeyPair(data) {
    return data && data.privateKey && data.publicKey;
  }
  static isCryptoKey(data) {
    return data && data.usages && data.type && data.algorithm && data.extractable !== void 0;
  }
  constructor() {
    this.items = /* @__PURE__ */ new Map();
    this[_a] = "CryptoProvider";
    if (typeof self !== "undefined" && typeof crypto !== "undefined") {
      this.set(CryptoProvider.DEFAULT, crypto);
    } else if (typeof global !== "undefined" && global.crypto && global.crypto.subtle) {
      this.set(CryptoProvider.DEFAULT, global.crypto);
    }
  }
  clear() {
    this.items.clear();
  }
  delete(key2) {
    return this.items.delete(key2);
  }
  forEach(callbackfn, thisArg) {
    return this.items.forEach(callbackfn, thisArg);
  }
  has(key2) {
    return this.items.has(key2);
  }
  get size() {
    return this.items.size;
  }
  entries() {
    return this.items.entries();
  }
  keys() {
    return this.items.keys();
  }
  values() {
    return this.items.values();
  }
  [Symbol.iterator]() {
    return this.items[Symbol.iterator]();
  }
  get(key2 = CryptoProvider.DEFAULT) {
    const crypto2 = this.items.get(key2.toLowerCase());
    if (!crypto2) {
      throw new Error(`Cannot get Crypto by name '${key2}'`);
    }
    return crypto2;
  }
  set(key2, value) {
    if (typeof key2 === "string") {
      if (!value) {
        throw new TypeError("Argument 'value' is required");
      }
      this.items.set(key2.toLowerCase(), value);
    } else {
      this.items.set(CryptoProvider.DEFAULT, key2);
    }
    return this;
  }
}
_a = Symbol.toStringTag;
CryptoProvider.DEFAULT = "default";
const cryptoProvider = new CryptoProvider();
const OID_REGEX = /^[0-2](?:\.[1-9][0-9]*)+$/;
function isOID(id) {
  return new RegExp(OID_REGEX).test(id);
}
class NameIdentifier {
  constructor(names2 = {}) {
    this.items = {};
    for (const id in names2) {
      this.register(id, names2[id]);
    }
  }
  get(idOrName) {
    return this.items[idOrName] || null;
  }
  findId(idOrName) {
    if (!isOID(idOrName)) {
      return this.get(idOrName);
    }
    return idOrName;
  }
  register(id, name) {
    this.items[id] = name;
    this.items[name] = id;
  }
}
const names = new NameIdentifier();
names.register("CN", "2.5.4.3");
names.register("L", "2.5.4.7");
names.register("ST", "2.5.4.8");
names.register("O", "2.5.4.10");
names.register("OU", "2.5.4.11");
names.register("C", "2.5.4.6");
names.register("DC", "0.9.2342.19200300.100.1.25");
names.register("E", "1.2.840.113549.1.9.1");
names.register("G", "2.5.4.42");
names.register("I", "2.5.4.43");
names.register("SN", "2.5.4.4");
names.register("T", "2.5.4.12");
function replaceUnknownCharacter(text, char) {
  return `\\${Convert.ToHex(Convert.FromUtf8String(char)).toUpperCase()}`;
}
function escape$1(data) {
  return data.replace(/([,+"\\<>;])/g, "\\$1").replace(/^([ #])/, "\\$1").replace(/([ ]$)/, "\\$1").replace(/([\r\n\t])/, replaceUnknownCharacter);
}
class Name2 {
  static isASCII(text) {
    for (let i = 0; i < text.length; i++) {
      const code = text.charCodeAt(i);
      if (code > 255) {
        return false;
      }
    }
    return true;
  }
  static isPrintableString(text) {
    return /^[A-Za-z0-9 '()+,-./:=?]*$/g.test(text);
  }
  constructor(data, extraNames = {}) {
    this.extraNames = new NameIdentifier();
    this.asn = new Name$1();
    for (const key2 in extraNames) {
      if (Object.prototype.hasOwnProperty.call(extraNames, key2)) {
        const value = extraNames[key2];
        this.extraNames.register(key2, value);
      }
    }
    if (typeof data === "string") {
      this.asn = this.fromString(data);
    } else if (data instanceof Name$1) {
      this.asn = data;
    } else if (BufferSourceConverter.isBufferSource(data)) {
      this.asn = AsnConvert.parse(data, Name$1);
    } else {
      this.asn = this.fromJSON(data);
    }
  }
  getField(idOrName) {
    const id = this.extraNames.findId(idOrName) || names.findId(idOrName);
    const res = [];
    for (const name of this.asn) {
      for (const rdn of name) {
        if (rdn.type === id) {
          res.push(rdn.value.toString());
        }
      }
    }
    return res;
  }
  getName(idOrName) {
    return this.extraNames.get(idOrName) || names.get(idOrName);
  }
  toString() {
    return this.asn.map((rdn) => rdn.map((o) => {
      const type = this.getName(o.type) || o.type;
      const value = o.value.anyValue ? `#${Convert.ToHex(o.value.anyValue)}` : escape$1(o.value.toString());
      return `${type}=${value}`;
    }).join("+")).join(", ");
  }
  toJSON() {
    var _a2;
    const json2 = [];
    for (const rdn of this.asn) {
      const jsonItem = {};
      for (const attr of rdn) {
        const type = this.getName(attr.type) || attr.type;
        (_a2 = jsonItem[type]) !== null && _a2 !== void 0 ? _a2 : jsonItem[type] = [];
        jsonItem[type].push(attr.value.anyValue ? `#${Convert.ToHex(attr.value.anyValue)}` : attr.value.toString());
      }
      json2.push(jsonItem);
    }
    return json2;
  }
  fromString(data) {
    const asn = new Name$1();
    const regex = /(\d\.[\d.]*\d|[A-Za-z]+)=((?:"")|(?:".*?[^\\]")|(?:[^,+"\\](?=[,+]|$))|(?:[^,+].*?(?:[^\\][,+]))|(?:))([,+])?/g;
    let matches2 = null;
    let level = ",";
    while (matches2 = regex.exec(`${data},`)) {
      let [, type, value] = matches2;
      const lastChar = value[value.length - 1];
      if (lastChar === "," || lastChar === "+") {
        value = value.slice(0, value.length - 1);
        matches2[3] = lastChar;
      }
      const next = matches2[3];
      type = this.getTypeOid(type);
      const attr = this.createAttribute(type, value);
      if (level === "+") {
        asn[asn.length - 1].push(attr);
      } else {
        asn.push(new RelativeDistinguishedName([attr]));
      }
      level = next;
    }
    return asn;
  }
  fromJSON(data) {
    const asn = new Name$1();
    for (const item of data) {
      const asnRdn = new RelativeDistinguishedName();
      for (const type in item) {
        const typeId = this.getTypeOid(type);
        const values = item[type];
        for (const value of values) {
          const asnAttr = this.createAttribute(typeId, value);
          asnRdn.push(asnAttr);
        }
      }
      asn.push(asnRdn);
    }
    return asn;
  }
  getTypeOid(type) {
    if (!/[\d.]+/.test(type)) {
      type = this.getName(type) || "";
    }
    if (!type) {
      throw new Error(`Cannot get OID for name type '${type}'`);
    }
    return type;
  }
  createAttribute(type, value) {
    const attr = new AttributeTypeAndValue({ type });
    if (typeof value === "object") {
      for (const key2 in value) {
        switch (key2) {
          case "ia5String":
            attr.value.ia5String = value[key2];
            break;
          case "utf8String":
            attr.value.utf8String = value[key2];
            break;
          case "universalString":
            attr.value.universalString = value[key2];
            break;
          case "bmpString":
            attr.value.bmpString = value[key2];
            break;
          case "printableString":
            attr.value.printableString = value[key2];
            break;
        }
      }
    } else if (value[0] === "#") {
      attr.value.anyValue = Convert.FromHex(value.slice(1));
    } else {
      const processedValue = this.processStringValue(value);
      if (type === this.getName("E") || type === this.getName("DC")) {
        attr.value.ia5String = processedValue;
      } else {
        if (Name2.isPrintableString(processedValue)) {
          attr.value.printableString = processedValue;
        } else {
          attr.value.utf8String = processedValue;
        }
      }
    }
    return attr;
  }
  processStringValue(value) {
    const quotedMatches = /"(.*?[^\\])?"/.exec(value);
    if (quotedMatches) {
      value = quotedMatches[1];
    }
    return value.replace(/\\0a/ig, "\n").replace(/\\0d/ig, "\r").replace(/\\0g/ig, "	").replace(/\\(.)/g, "$1");
  }
  toArrayBuffer() {
    return AsnConvert.serialize(this.asn);
  }
  async getThumbprint(...args) {
    var _a2;
    let crypto2;
    let algorithm = "SHA-1";
    if (args.length >= 1 && !((_a2 = args[0]) === null || _a2 === void 0 ? void 0 : _a2.subtle)) {
      algorithm = args[0] || algorithm;
      crypto2 = args[1] || cryptoProvider.get();
    } else {
      crypto2 = args[0] || cryptoProvider.get();
    }
    return await crypto2.subtle.digest(algorithm, this.toArrayBuffer());
  }
}
const ERR_GN_CONSTRUCTOR = "Cannot initialize GeneralName from ASN.1 data.";
const ERR_GN_STRING_FORMAT = `${ERR_GN_CONSTRUCTOR} Unsupported string format in use.`;
const ERR_GUID = `${ERR_GN_CONSTRUCTOR} Value doesn't match to GUID regular expression.`;
const GUID_REGEX = /^([0-9a-f]{8})-?([0-9a-f]{4})-?([0-9a-f]{4})-?([0-9a-f]{4})-?([0-9a-f]{12})$/i;
const id_GUID = "1.3.6.1.4.1.311.25.1";
const id_UPN = "1.3.6.1.4.1.311.20.2.3";
const DNS = "dns";
const DN = "dn";
const EMAIL = "email";
const IP = "ip";
const URL$1 = "url";
const GUID = "guid";
const UPN = "upn";
const REGISTERED_ID = "id";
class GeneralName2 extends AsnData {
  constructor(...args) {
    let name;
    if (args.length === 2) {
      switch (args[0]) {
        case DN: {
          const derName = new Name2(args[1]).toArrayBuffer();
          const asnName = AsnConvert.parse(derName, Name$1);
          name = new GeneralName$1({ directoryName: asnName });
          break;
        }
        case DNS:
          name = new GeneralName$1({ dNSName: args[1] });
          break;
        case EMAIL:
          name = new GeneralName$1({ rfc822Name: args[1] });
          break;
        case GUID: {
          const matches2 = new RegExp(GUID_REGEX, "i").exec(args[1]);
          if (!matches2) {
            throw new Error("Cannot parse GUID value. Value doesn't match to regular expression");
          }
          const hex = matches2.slice(1).map((o, i) => {
            if (i < 3) {
              return Convert.ToHex(new Uint8Array(Convert.FromHex(o)).reverse());
            }
            return o;
          }).join("");
          name = new GeneralName$1({
            otherName: new OtherName({
              typeId: id_GUID,
              value: AsnConvert.serialize(new OctetString2(Convert.FromHex(hex)))
            })
          });
          break;
        }
        case IP:
          name = new GeneralName$1({ iPAddress: args[1] });
          break;
        case REGISTERED_ID:
          name = new GeneralName$1({ registeredID: args[1] });
          break;
        case UPN: {
          name = new GeneralName$1({
            otherName: new OtherName({
              typeId: id_UPN,
              value: AsnConvert.serialize(AsnUtf8StringConverter.toASN(args[1]))
            })
          });
          break;
        }
        case URL$1:
          name = new GeneralName$1({ uniformResourceIdentifier: args[1] });
          break;
        default:
          throw new Error("Cannot create GeneralName. Unsupported type of the name");
      }
    } else if (BufferSourceConverter.isBufferSource(args[0])) {
      name = AsnConvert.parse(args[0], GeneralName$1);
    } else {
      name = args[0];
    }
    super(name);
  }
  onInit(asn) {
    if (asn.dNSName != void 0) {
      this.type = DNS;
      this.value = asn.dNSName;
    } else if (asn.rfc822Name != void 0) {
      this.type = EMAIL;
      this.value = asn.rfc822Name;
    } else if (asn.iPAddress != void 0) {
      this.type = IP;
      this.value = asn.iPAddress;
    } else if (asn.uniformResourceIdentifier != void 0) {
      this.type = URL$1;
      this.value = asn.uniformResourceIdentifier;
    } else if (asn.registeredID != void 0) {
      this.type = REGISTERED_ID;
      this.value = asn.registeredID;
    } else if (asn.directoryName != void 0) {
      this.type = DN;
      this.value = new Name2(asn.directoryName).toString();
    } else if (asn.otherName != void 0) {
      if (asn.otherName.typeId === id_GUID) {
        this.type = GUID;
        const guid = AsnConvert.parse(asn.otherName.value, OctetString2);
        const matches2 = new RegExp(GUID_REGEX, "i").exec(Convert.ToHex(guid));
        if (!matches2) {
          throw new Error(ERR_GUID);
        }
        this.value = matches2.slice(1).map((o, i) => {
          if (i < 3) {
            return Convert.ToHex(new Uint8Array(Convert.FromHex(o)).reverse());
          }
          return o;
        }).join("-");
      } else if (asn.otherName.typeId === id_UPN) {
        this.type = UPN;
        this.value = AsnConvert.parse(asn.otherName.value, DirectoryString).toString();
      } else {
        throw new Error(ERR_GN_STRING_FORMAT);
      }
    } else {
      throw new Error(ERR_GN_STRING_FORMAT);
    }
  }
  toJSON() {
    return {
      type: this.type,
      value: this.value
    };
  }
  toTextObject() {
    let type;
    switch (this.type) {
      case DN:
      case DNS:
      case GUID:
      case IP:
      case REGISTERED_ID:
      case UPN:
      case URL$1:
        type = this.type.toUpperCase();
        break;
      case EMAIL:
        type = "Email";
        break;
      default:
        throw new Error("Unsupported GeneralName type");
    }
    let value = this.value;
    if (this.type === REGISTERED_ID) {
      value = OidSerializer.toString(value);
    }
    return new TextObject(type, void 0, value);
  }
}
class GeneralNames2 extends AsnData {
  constructor(params) {
    let names2;
    if (params instanceof GeneralNames$1) {
      names2 = params;
    } else if (Array.isArray(params)) {
      const items = [];
      for (const name of params) {
        if (name instanceof GeneralName$1) {
          items.push(name);
        } else {
          const asnName = AsnConvert.parse(new GeneralName2(name.type, name.value).rawData, GeneralName$1);
          items.push(asnName);
        }
      }
      names2 = new GeneralNames$1(items);
    } else if (BufferSourceConverter.isBufferSource(params)) {
      names2 = AsnConvert.parse(params, GeneralNames$1);
    } else {
      throw new Error("Cannot initialize GeneralNames. Incorrect incoming arguments");
    }
    super(names2);
  }
  onInit(asn) {
    const items = [];
    for (const asnName of asn) {
      let name = null;
      try {
        name = new GeneralName2(asnName);
      } catch {
        continue;
      }
      items.push(name);
    }
    this.items = items;
  }
  toJSON() {
    return this.items.map((o) => o.toJSON());
  }
  toTextObject() {
    const res = super.toTextObjectEmpty();
    for (const name of this.items) {
      const nameObj = name.toTextObject();
      let field = res[nameObj[TextObject.NAME]];
      if (!Array.isArray(field)) {
        field = [];
        res[nameObj[TextObject.NAME]] = field;
      }
      field.push(nameObj);
    }
    return res;
  }
}
GeneralNames2.NAME = "GeneralNames";
const rPaddingTag = "-{5}";
const rEolChars = "\\n";
const rNameTag = `[^${rEolChars}]+`;
const rBeginTag = `${rPaddingTag}BEGIN (${rNameTag}(?=${rPaddingTag}))${rPaddingTag}`;
const rEndTag = `${rPaddingTag}END \\1${rPaddingTag}`;
const rEolGroup = "\\n";
const rHeaderKey = `[^:${rEolChars}]+`;
const rHeaderValue = `(?:[^${rEolChars}]+${rEolGroup}(?: +[^${rEolChars}]+${rEolGroup})*)`;
const rBase64Chars = "[a-zA-Z0-9=+/]+";
const rBase64 = `(?:${rBase64Chars}${rEolGroup})+`;
const rPem = `${rBeginTag}${rEolGroup}(?:((?:${rHeaderKey}: ${rHeaderValue})+))?${rEolGroup}?(${rBase64})${rEndTag}`;
class PemConverter {
  static isPem(data) {
    return typeof data === "string" && new RegExp(rPem, "g").test(data.replace(/\r/g, ""));
  }
  static decodeWithHeaders(pem) {
    pem = pem.replace(/\r/g, "");
    const pattern = new RegExp(rPem, "g");
    const res = [];
    let matches2 = null;
    while (matches2 = pattern.exec(pem)) {
      const base642 = matches2[3].replace(new RegExp(`[${rEolChars}]+`, "g"), "");
      const pemStruct = {
        type: matches2[1],
        headers: [],
        rawData: Convert.FromBase64(base642)
      };
      const headersString = matches2[2];
      if (headersString) {
        const headers = headersString.split(new RegExp(rEolGroup, "g"));
        let lastHeader = null;
        for (const header of headers) {
          const [key2, value] = header.split(/:(.*)/);
          if (value === void 0) {
            if (!lastHeader) {
              throw new Error("Cannot parse PEM string. Incorrect header value");
            }
            lastHeader.value += key2.trim();
          } else {
            if (lastHeader) {
              pemStruct.headers.push(lastHeader);
            }
            lastHeader = {
              key: key2,
              value: value.trim()
            };
          }
        }
        if (lastHeader) {
          pemStruct.headers.push(lastHeader);
        }
      }
      res.push(pemStruct);
    }
    return res;
  }
  static decode(pem) {
    const blocks = this.decodeWithHeaders(pem);
    return blocks.map((o) => o.rawData);
  }
  static decodeFirst(pem) {
    const items = this.decode(pem);
    if (!items.length) {
      throw new RangeError("PEM string doesn't contain any objects");
    }
    return items[0];
  }
  static encode(rawData, tag) {
    if (Array.isArray(rawData)) {
      const raws = new Array();
      if (tag) {
        rawData.forEach((element) => {
          if (!BufferSourceConverter.isBufferSource(element)) {
            throw new TypeError("Cannot encode array of BufferSource in PEM format. Not all items of the array are BufferSource");
          }
          raws.push(this.encodeStruct({
            type: tag,
            rawData: BufferSourceConverter.toArrayBuffer(element)
          }));
        });
      } else {
        rawData.forEach((element) => {
          if (!("type" in element)) {
            throw new TypeError("Cannot encode array of PemStruct in PEM format. Not all items of the array are PemStrut");
          }
          raws.push(this.encodeStruct(element));
        });
      }
      return raws.join("\n");
    } else {
      if (!tag) {
        throw new Error("Required argument 'tag' is missed");
      }
      return this.encodeStruct({
        type: tag,
        rawData: BufferSourceConverter.toArrayBuffer(rawData)
      });
    }
  }
  static encodeStruct(pem) {
    var _a2;
    const upperCaseType = pem.type.toLocaleUpperCase();
    const res = [];
    res.push(`-----BEGIN ${upperCaseType}-----`);
    if ((_a2 = pem.headers) === null || _a2 === void 0 ? void 0 : _a2.length) {
      for (const header of pem.headers) {
        res.push(`${header.key}: ${header.value}`);
      }
      res.push("");
    }
    const base642 = Convert.ToBase64(pem.rawData);
    let sliced;
    let offset = 0;
    const rows = Array();
    while (offset < base642.length) {
      if (base642.length - offset < 64) {
        sliced = base642.substring(offset);
      } else {
        sliced = base642.substring(offset, offset + 64);
        offset += 64;
      }
      if (sliced.length !== 0) {
        rows.push(sliced);
        if (sliced.length < 64) {
          break;
        }
      } else {
        break;
      }
    }
    res.push(...rows);
    res.push(`-----END ${upperCaseType}-----`);
    return res.join("\n");
  }
}
PemConverter.CertificateTag = "CERTIFICATE";
PemConverter.CrlTag = "CRL";
PemConverter.CertificateRequestTag = "CERTIFICATE REQUEST";
PemConverter.PublicKeyTag = "PUBLIC KEY";
PemConverter.PrivateKeyTag = "PRIVATE KEY";
class PemData extends AsnData {
  static isAsnEncoded(data) {
    return BufferSourceConverter.isBufferSource(data) || typeof data === "string";
  }
  static toArrayBuffer(raw) {
    if (typeof raw === "string") {
      if (PemConverter.isPem(raw)) {
        return PemConverter.decode(raw)[0];
      } else if (Convert.isHex(raw)) {
        return Convert.FromHex(raw);
      } else if (Convert.isBase64(raw)) {
        return Convert.FromBase64(raw);
      } else if (Convert.isBase64Url(raw)) {
        return Convert.FromBase64Url(raw);
      } else {
        throw new TypeError("Unsupported format of 'raw' argument. Must be one of DER, PEM, HEX, Base64, or Base4Url");
      }
    } else {
      const buffer = BufferSourceConverter.toUint8Array(raw);
      if (buffer.length > 0 && buffer[0] === 48) {
        return BufferSourceConverter.toArrayBuffer(raw);
      }
      const stringRaw = Convert.ToBinary(raw);
      if (PemConverter.isPem(stringRaw)) {
        return PemConverter.decode(stringRaw)[0];
      } else if (Convert.isHex(stringRaw)) {
        return Convert.FromHex(stringRaw);
      } else if (Convert.isBase64(stringRaw)) {
        return Convert.FromBase64(stringRaw);
      } else if (Convert.isBase64Url(stringRaw)) {
        return Convert.FromBase64Url(stringRaw);
      }
      throw new TypeError("Unsupported format of 'raw' argument. Must be one of DER, PEM, HEX, Base64, or Base4Url");
    }
  }
  constructor(...args) {
    if (PemData.isAsnEncoded(args[0])) {
      super(PemData.toArrayBuffer(args[0]), args[1]);
    } else {
      super(args[0]);
    }
  }
  toString(format = "pem") {
    switch (format) {
      case "pem":
        return PemConverter.encode(this.rawData, this.tag);
      default:
        return super.toString(format);
    }
  }
}
class PublicKey extends PemData {
  static async create(data, crypto2 = cryptoProvider.get()) {
    if (data instanceof PublicKey) {
      return data;
    } else if (CryptoProvider.isCryptoKey(data)) {
      if (data.type !== "public") {
        throw new TypeError("Public key is required");
      }
      const spki = await crypto2.subtle.exportKey("spki", data);
      return new PublicKey(spki);
    } else if (data.publicKey) {
      return data.publicKey;
    } else if (BufferSourceConverter.isBufferSource(data)) {
      return new PublicKey(data);
    } else {
      throw new TypeError("Unsupported PublicKeyType");
    }
  }
  constructor(param) {
    if (PemData.isAsnEncoded(param)) {
      super(param, SubjectPublicKeyInfo);
    } else {
      super(param);
    }
    this.tag = PemConverter.PublicKeyTag;
  }
  async export(...args) {
    let crypto2;
    let keyUsages = ["verify"];
    let algorithm = {
      hash: "SHA-256",
      ...this.algorithm
    };
    if (args.length > 1) {
      algorithm = args[0] || algorithm;
      keyUsages = args[1] || keyUsages;
      crypto2 = args[2] || cryptoProvider.get();
    } else {
      crypto2 = args[0] || cryptoProvider.get();
    }
    let raw = this.rawData;
    const asnSpki = AsnConvert.parse(this.rawData, SubjectPublicKeyInfo);
    if (asnSpki.algorithm.algorithm === id_RSASSA_PSS) {
      raw = convertSpkiToRsaPkcs1(asnSpki, raw);
    }
    return crypto2.subtle.importKey("spki", raw, algorithm, true, keyUsages);
  }
  onInit(asn) {
    const algProv = instance.resolve(diAlgorithmProvider);
    const algorithm = this.algorithm = algProv.toWebAlgorithm(asn.algorithm);
    switch (asn.algorithm.algorithm) {
      case id_rsaEncryption: {
        const rsaPublicKey = AsnConvert.parse(asn.subjectPublicKey, RSAPublicKey);
        const modulus = BufferSourceConverter.toUint8Array(rsaPublicKey.modulus);
        algorithm.publicExponent = BufferSourceConverter.toUint8Array(rsaPublicKey.publicExponent);
        algorithm.modulusLength = (!modulus[0] ? modulus.slice(1) : modulus).byteLength << 3;
        break;
      }
    }
  }
  async getThumbprint(...args) {
    var _a2;
    let crypto2;
    let algorithm = "SHA-1";
    if (args.length >= 1 && !((_a2 = args[0]) === null || _a2 === void 0 ? void 0 : _a2.subtle)) {
      algorithm = args[0] || algorithm;
      crypto2 = args[1] || cryptoProvider.get();
    } else {
      crypto2 = args[0] || cryptoProvider.get();
    }
    return await crypto2.subtle.digest(algorithm, this.rawData);
  }
  async getKeyIdentifier(...args) {
    let crypto2;
    let algorithm = "SHA-1";
    if (args.length === 1) {
      if (typeof args[0] === "string") {
        algorithm = args[0];
        crypto2 = cryptoProvider.get();
      } else {
        crypto2 = args[0];
      }
    } else if (args.length === 2) {
      algorithm = args[0];
      crypto2 = args[1];
    } else {
      crypto2 = cryptoProvider.get();
    }
    const asn = AsnConvert.parse(this.rawData, SubjectPublicKeyInfo);
    return await crypto2.subtle.digest(algorithm, asn.subjectPublicKey);
  }
  toTextObject() {
    const obj = this.toTextObjectEmpty();
    const asn = AsnConvert.parse(this.rawData, SubjectPublicKeyInfo);
    obj["Algorithm"] = TextConverter.serializeAlgorithm(asn.algorithm);
    switch (asn.algorithm.algorithm) {
      case id_ecPublicKey:
        obj["EC Point"] = asn.subjectPublicKey;
        break;
      case id_rsaEncryption:
      default:
        obj["Raw Data"] = asn.subjectPublicKey;
    }
    return obj;
  }
}
function convertSpkiToRsaPkcs1(asnSpki, raw) {
  asnSpki.algorithm = new AlgorithmIdentifier({
    algorithm: id_rsaEncryption,
    parameters: null
  });
  raw = AsnConvert.serialize(asnSpki);
  return raw;
}
class AuthorityKeyIdentifierExtension extends Extension2 {
  static async create(param, critical = false, crypto2 = cryptoProvider.get()) {
    if ("name" in param && "serialNumber" in param) {
      return new AuthorityKeyIdentifierExtension(param, critical);
    }
    const key2 = await PublicKey.create(param, crypto2);
    const id = await key2.getKeyIdentifier(crypto2);
    return new AuthorityKeyIdentifierExtension(Convert.ToHex(id), critical);
  }
  constructor(...args) {
    if (BufferSourceConverter.isBufferSource(args[0])) {
      super(args[0]);
    } else if (typeof args[0] === "string") {
      const value = new AuthorityKeyIdentifier({ keyIdentifier: new KeyIdentifier(Convert.FromHex(args[0])) });
      super(id_ce_authorityKeyIdentifier, args[1], AsnConvert.serialize(value));
    } else {
      const certId = args[0];
      const certIdName = certId.name instanceof GeneralNames2 ? AsnConvert.parse(certId.name.rawData, GeneralNames$1) : certId.name;
      const value = new AuthorityKeyIdentifier({
        authorityCertIssuer: certIdName,
        authorityCertSerialNumber: Convert.FromHex(certId.serialNumber)
      });
      super(id_ce_authorityKeyIdentifier, args[1], AsnConvert.serialize(value));
    }
  }
  onInit(asn) {
    super.onInit(asn);
    const aki = AsnConvert.parse(asn.extnValue, AuthorityKeyIdentifier);
    if (aki.keyIdentifier) {
      this.keyId = Convert.ToHex(aki.keyIdentifier);
    }
    if (aki.authorityCertIssuer || aki.authorityCertSerialNumber) {
      this.certId = {
        name: aki.authorityCertIssuer || [],
        serialNumber: aki.authorityCertSerialNumber ? Convert.ToHex(aki.authorityCertSerialNumber) : ""
      };
    }
  }
  toTextObject() {
    const obj = this.toTextObjectWithoutValue();
    const asn = AsnConvert.parse(this.value, AuthorityKeyIdentifier);
    if (asn.authorityCertIssuer) {
      obj["Authority Issuer"] = new GeneralNames2(asn.authorityCertIssuer).toTextObject();
    }
    if (asn.authorityCertSerialNumber) {
      obj["Authority Serial Number"] = asn.authorityCertSerialNumber;
    }
    if (asn.keyIdentifier) {
      obj[""] = asn.keyIdentifier;
    }
    return obj;
  }
}
AuthorityKeyIdentifierExtension.NAME = "Authority Key Identifier";
class BasicConstraintsExtension extends Extension2 {
  constructor(...args) {
    if (BufferSourceConverter.isBufferSource(args[0])) {
      super(args[0]);
      const value = AsnConvert.parse(this.value, BasicConstraints);
      this.ca = value.cA;
      this.pathLength = value.pathLenConstraint;
    } else {
      const value = new BasicConstraints({
        cA: args[0],
        pathLenConstraint: args[1]
      });
      super(id_ce_basicConstraints, args[2], AsnConvert.serialize(value));
      this.ca = args[0];
      this.pathLength = args[1];
    }
  }
  toTextObject() {
    const obj = this.toTextObjectWithoutValue();
    if (this.ca) {
      obj["CA"] = this.ca;
    }
    if (this.pathLength !== void 0) {
      obj["Path Length"] = this.pathLength;
    }
    return obj;
  }
}
BasicConstraintsExtension.NAME = "Basic Constraints";
var ExtendedKeyUsage2;
(function(ExtendedKeyUsage3) {
  ExtendedKeyUsage3["serverAuth"] = "1.3.6.1.5.5.7.3.1";
  ExtendedKeyUsage3["clientAuth"] = "1.3.6.1.5.5.7.3.2";
  ExtendedKeyUsage3["codeSigning"] = "1.3.6.1.5.5.7.3.3";
  ExtendedKeyUsage3["emailProtection"] = "1.3.6.1.5.5.7.3.4";
  ExtendedKeyUsage3["timeStamping"] = "1.3.6.1.5.5.7.3.8";
  ExtendedKeyUsage3["ocspSigning"] = "1.3.6.1.5.5.7.3.9";
})(ExtendedKeyUsage2 || (ExtendedKeyUsage2 = {}));
class ExtendedKeyUsageExtension extends Extension2 {
  constructor(...args) {
    if (BufferSourceConverter.isBufferSource(args[0])) {
      super(args[0]);
      const value = AsnConvert.parse(this.value, ExtendedKeyUsage$1);
      this.usages = value.map((o) => o);
    } else {
      const value = new ExtendedKeyUsage$1(args[0]);
      super(id_ce_extKeyUsage, args[1], AsnConvert.serialize(value));
      this.usages = args[0];
    }
  }
  toTextObject() {
    const obj = this.toTextObjectWithoutValue();
    obj[""] = this.usages.map((o) => OidSerializer.toString(o)).join(", ");
    return obj;
  }
}
ExtendedKeyUsageExtension.NAME = "Extended Key Usages";
var KeyUsageFlags;
(function(KeyUsageFlags2) {
  KeyUsageFlags2[KeyUsageFlags2["digitalSignature"] = 1] = "digitalSignature";
  KeyUsageFlags2[KeyUsageFlags2["nonRepudiation"] = 2] = "nonRepudiation";
  KeyUsageFlags2[KeyUsageFlags2["keyEncipherment"] = 4] = "keyEncipherment";
  KeyUsageFlags2[KeyUsageFlags2["dataEncipherment"] = 8] = "dataEncipherment";
  KeyUsageFlags2[KeyUsageFlags2["keyAgreement"] = 16] = "keyAgreement";
  KeyUsageFlags2[KeyUsageFlags2["keyCertSign"] = 32] = "keyCertSign";
  KeyUsageFlags2[KeyUsageFlags2["cRLSign"] = 64] = "cRLSign";
  KeyUsageFlags2[KeyUsageFlags2["encipherOnly"] = 128] = "encipherOnly";
  KeyUsageFlags2[KeyUsageFlags2["decipherOnly"] = 256] = "decipherOnly";
})(KeyUsageFlags || (KeyUsageFlags = {}));
class KeyUsagesExtension extends Extension2 {
  constructor(...args) {
    if (BufferSourceConverter.isBufferSource(args[0])) {
      super(args[0]);
      const value = AsnConvert.parse(this.value, KeyUsage);
      this.usages = value.toNumber();
    } else {
      const value = new KeyUsage(args[0]);
      super(id_ce_keyUsage, args[1], AsnConvert.serialize(value));
      this.usages = args[0];
    }
  }
  toTextObject() {
    const obj = this.toTextObjectWithoutValue();
    const asn = AsnConvert.parse(this.value, KeyUsage);
    obj[""] = asn.toJSON().join(", ");
    return obj;
  }
}
KeyUsagesExtension.NAME = "Key Usages";
class SubjectKeyIdentifierExtension extends Extension2 {
  static async create(publicKey, critical = false, crypto2 = cryptoProvider.get()) {
    const key2 = await PublicKey.create(publicKey, crypto2);
    const id = await key2.getKeyIdentifier(crypto2);
    return new SubjectKeyIdentifierExtension(Convert.ToHex(id), critical);
  }
  constructor(...args) {
    if (BufferSourceConverter.isBufferSource(args[0])) {
      super(args[0]);
      const value = AsnConvert.parse(this.value, SubjectKeyIdentifier);
      this.keyId = Convert.ToHex(value);
    } else {
      const identifier = typeof args[0] === "string" ? Convert.FromHex(args[0]) : args[0];
      const value = new SubjectKeyIdentifier(identifier);
      super(id_ce_subjectKeyIdentifier, args[1], AsnConvert.serialize(value));
      this.keyId = Convert.ToHex(identifier);
    }
  }
  toTextObject() {
    const obj = this.toTextObjectWithoutValue();
    const asn = AsnConvert.parse(this.value, SubjectKeyIdentifier);
    obj[""] = asn;
    return obj;
  }
}
SubjectKeyIdentifierExtension.NAME = "Subject Key Identifier";
class SubjectAlternativeNameExtension extends Extension2 {
  constructor(...args) {
    if (BufferSourceConverter.isBufferSource(args[0])) {
      super(args[0]);
    } else {
      super(id_ce_subjectAltName, args[1], new GeneralNames2(args[0] || []).rawData);
    }
  }
  onInit(asn) {
    super.onInit(asn);
    const value = AsnConvert.parse(asn.extnValue, SubjectAlternativeName);
    this.names = new GeneralNames2(value);
  }
  toTextObject() {
    const obj = this.toTextObjectWithoutValue();
    const namesObj = this.names.toTextObject();
    for (const key2 in namesObj) {
      obj[key2] = namesObj[key2];
    }
    return obj;
  }
}
SubjectAlternativeNameExtension.NAME = "Subject Alternative Name";
class ExtensionFactory {
  static register(id, type) {
    this.items.set(id, type);
  }
  static create(data) {
    const extension = new Extension2(data);
    const Type = this.items.get(extension.type);
    if (Type) {
      return new Type(data);
    }
    return extension;
  }
}
ExtensionFactory.items = /* @__PURE__ */ new Map();
class CertificatePolicyExtension extends Extension2 {
  constructor(...args) {
    var _a2;
    if (BufferSourceConverter.isBufferSource(args[0])) {
      super(args[0]);
      const asnPolicies = AsnConvert.parse(this.value, CertificatePolicies);
      this.policies = asnPolicies.map((o) => o.policyIdentifier);
    } else {
      const policies = args[0];
      const critical = (_a2 = args[1]) !== null && _a2 !== void 0 ? _a2 : false;
      const value = new CertificatePolicies(policies.map((o) => new PolicyInformation({ policyIdentifier: o })));
      super(id_ce_certificatePolicies, critical, AsnConvert.serialize(value));
      this.policies = policies;
    }
  }
  toTextObject() {
    const obj = this.toTextObjectWithoutValue();
    obj["Policy"] = this.policies.map((o) => new TextObject("", {}, OidSerializer.toString(o)));
    return obj;
  }
}
CertificatePolicyExtension.NAME = "Certificate Policies";
ExtensionFactory.register(id_ce_certificatePolicies, CertificatePolicyExtension);
class CRLDistributionPointsExtension extends Extension2 {
  constructor(...args) {
    var _a2;
    if (BufferSourceConverter.isBufferSource(args[0])) {
      super(args[0]);
    } else if (Array.isArray(args[0]) && typeof args[0][0] === "string") {
      const urls = args[0];
      const dps = urls.map((url) => {
        return new DistributionPoint({
          distributionPoint: new DistributionPointName({ fullName: [new GeneralName$1({ uniformResourceIdentifier: url })] })
        });
      });
      const value = new CRLDistributionPoints(dps);
      super(id_ce_cRLDistributionPoints, args[1], AsnConvert.serialize(value));
    } else {
      const value = new CRLDistributionPoints(args[0]);
      super(id_ce_cRLDistributionPoints, args[1], AsnConvert.serialize(value));
    }
    (_a2 = this.distributionPoints) !== null && _a2 !== void 0 ? _a2 : this.distributionPoints = [];
  }
  onInit(asn) {
    super.onInit(asn);
    const crlExt = AsnConvert.parse(asn.extnValue, CRLDistributionPoints);
    this.distributionPoints = crlExt;
  }
  toTextObject() {
    const obj = this.toTextObjectWithoutValue();
    obj["Distribution Point"] = this.distributionPoints.map((dp) => {
      var _a2;
      const dpObj = {};
      if (dp.distributionPoint) {
        dpObj[""] = (_a2 = dp.distributionPoint.fullName) === null || _a2 === void 0 ? void 0 : _a2.map((name) => new GeneralName2(name).toString()).join(", ");
      }
      if (dp.reasons) {
        dpObj["Reasons"] = dp.reasons.toString();
      }
      if (dp.cRLIssuer) {
        dpObj["CRL Issuer"] = dp.cRLIssuer.map((issuer) => issuer.toString()).join(", ");
      }
      return dpObj;
    });
    return obj;
  }
}
CRLDistributionPointsExtension.NAME = "CRL Distribution Points";
class AuthorityInfoAccessExtension extends Extension2 {
  constructor(...args) {
    var _a2, _b, _c, _d;
    if (BufferSourceConverter.isBufferSource(args[0])) {
      super(args[0]);
    } else if (args[0] instanceof AuthorityInfoAccessSyntax) {
      const value = new AuthorityInfoAccessSyntax(args[0]);
      super(id_pe_authorityInfoAccess, args[1], AsnConvert.serialize(value));
    } else {
      const params = args[0];
      const value = new AuthorityInfoAccessSyntax();
      addAccessDescriptions(value, params, id_ad_ocsp, "ocsp");
      addAccessDescriptions(value, params, id_ad_caIssuers, "caIssuers");
      addAccessDescriptions(value, params, id_ad_timeStamping, "timeStamping");
      addAccessDescriptions(value, params, id_ad_caRepository, "caRepository");
      super(id_pe_authorityInfoAccess, args[1], AsnConvert.serialize(value));
    }
    (_a2 = this.ocsp) !== null && _a2 !== void 0 ? _a2 : this.ocsp = [];
    (_b = this.caIssuers) !== null && _b !== void 0 ? _b : this.caIssuers = [];
    (_c = this.timeStamping) !== null && _c !== void 0 ? _c : this.timeStamping = [];
    (_d = this.caRepository) !== null && _d !== void 0 ? _d : this.caRepository = [];
  }
  onInit(asn) {
    super.onInit(asn);
    this.ocsp = [];
    this.caIssuers = [];
    this.timeStamping = [];
    this.caRepository = [];
    const aia = AsnConvert.parse(asn.extnValue, AuthorityInfoAccessSyntax);
    aia.forEach((accessDescription) => {
      switch (accessDescription.accessMethod) {
        case id_ad_ocsp:
          this.ocsp.push(new GeneralName2(accessDescription.accessLocation));
          break;
        case id_ad_caIssuers:
          this.caIssuers.push(new GeneralName2(accessDescription.accessLocation));
          break;
        case id_ad_timeStamping:
          this.timeStamping.push(new GeneralName2(accessDescription.accessLocation));
          break;
        case id_ad_caRepository:
          this.caRepository.push(new GeneralName2(accessDescription.accessLocation));
          break;
      }
    });
  }
  toTextObject() {
    const obj = this.toTextObjectWithoutValue();
    if (this.ocsp.length) {
      addUrlsToObject(obj, "OCSP", this.ocsp);
    }
    if (this.caIssuers.length) {
      addUrlsToObject(obj, "CA Issuers", this.caIssuers);
    }
    if (this.timeStamping.length) {
      addUrlsToObject(obj, "Time Stamping", this.timeStamping);
    }
    if (this.caRepository.length) {
      addUrlsToObject(obj, "CA Repository", this.caRepository);
    }
    return obj;
  }
}
AuthorityInfoAccessExtension.NAME = "Authority Info Access";
function addUrlsToObject(obj, key2, urls) {
  if (urls.length === 1) {
    obj[key2] = urls[0].toTextObject();
  } else {
    const names2 = new TextObject("");
    urls.forEach((name, index2) => {
      const nameObj = name.toTextObject();
      const indexedKey = `${nameObj[TextObject.NAME]} ${index2 + 1}`;
      let field = names2[indexedKey];
      if (!Array.isArray(field)) {
        field = [];
        names2[indexedKey] = field;
      }
      field.push(nameObj);
    });
    obj[key2] = names2;
  }
}
function addAccessDescriptions(value, params, method, key2) {
  const items = params[key2];
  if (items) {
    const array = Array.isArray(items) ? items : [items];
    array.forEach((url) => {
      if (typeof url === "string") {
        url = new GeneralName2("url", url);
      }
      value.push(new AccessDescription({
        accessMethod: method,
        accessLocation: AsnConvert.parse(url.rawData, GeneralName$1)
      }));
    });
  }
}
class IssuerAlternativeNameExtension extends Extension2 {
  constructor(...args) {
    if (BufferSourceConverter.isBufferSource(args[0])) {
      super(args[0]);
    } else {
      super(id_ce_issuerAltName, args[1], new GeneralNames2(args[0] || []).rawData);
    }
  }
  onInit(asn) {
    super.onInit(asn);
    const value = AsnConvert.parse(asn.extnValue, GeneralNames$1);
    this.names = new GeneralNames2(value);
  }
  toTextObject() {
    const obj = this.toTextObjectWithoutValue();
    const namesObj = this.names.toTextObject();
    for (const key2 in namesObj) {
      obj[key2] = namesObj[key2];
    }
    return obj;
  }
}
IssuerAlternativeNameExtension.NAME = "Issuer Alternative Name";
class Attribute3 extends AsnData {
  constructor(...args) {
    let raw;
    if (BufferSourceConverter.isBufferSource(args[0])) {
      raw = BufferSourceConverter.toArrayBuffer(args[0]);
    } else {
      const type = args[0];
      const values = Array.isArray(args[1]) ? args[1].map((o) => BufferSourceConverter.toArrayBuffer(o)) : [];
      raw = AsnConvert.serialize(new Attribute$2({
        type,
        values
      }));
    }
    super(raw, Attribute$2);
  }
  onInit(asn) {
    this.type = asn.type;
    this.values = asn.values;
  }
  toTextObject() {
    const obj = this.toTextObjectWithoutValue();
    obj["Value"] = this.values.map((o) => new TextObject("", { "": o }));
    return obj;
  }
  toTextObjectWithoutValue() {
    const obj = this.toTextObjectEmpty();
    if (obj[TextObject.NAME] === Attribute3.NAME) {
      obj[TextObject.NAME] = OidSerializer.toString(this.type);
    }
    return obj;
  }
}
Attribute3.NAME = "Attribute";
class ChallengePasswordAttribute extends Attribute3 {
  constructor(...args) {
    var _a2;
    if (BufferSourceConverter.isBufferSource(args[0])) {
      super(args[0]);
    } else {
      const value = new ChallengePassword({ printableString: args[0] });
      super(id_pkcs9_at_challengePassword, [AsnConvert.serialize(value)]);
    }
    (_a2 = this.password) !== null && _a2 !== void 0 ? _a2 : this.password = "";
  }
  onInit(asn) {
    super.onInit(asn);
    if (this.values[0]) {
      const value = AsnConvert.parse(this.values[0], ChallengePassword);
      this.password = value.toString();
    }
  }
  toTextObject() {
    const obj = this.toTextObjectWithoutValue();
    obj[TextObject.VALUE] = this.password;
    return obj;
  }
}
ChallengePasswordAttribute.NAME = "Challenge Password";
class ExtensionsAttribute extends Attribute3 {
  constructor(...args) {
    var _a2;
    if (BufferSourceConverter.isBufferSource(args[0])) {
      super(args[0]);
    } else {
      const extensions = args[0];
      const value = new Extensions();
      for (const extension of extensions) {
        value.push(AsnConvert.parse(extension.rawData, Extension$1));
      }
      super(id_pkcs9_at_extensionRequest, [AsnConvert.serialize(value)]);
    }
    (_a2 = this.items) !== null && _a2 !== void 0 ? _a2 : this.items = [];
  }
  onInit(asn) {
    super.onInit(asn);
    if (this.values[0]) {
      const value = AsnConvert.parse(this.values[0], Extensions);
      this.items = value.map((o) => ExtensionFactory.create(AsnConvert.serialize(o)));
    }
  }
  toTextObject() {
    const obj = this.toTextObjectWithoutValue();
    const extensions = this.items.map((o) => o.toTextObject());
    for (const extension of extensions) {
      obj[extension[TextObject.NAME]] = extension;
    }
    return obj;
  }
}
ExtensionsAttribute.NAME = "Extensions";
class AttributeFactory {
  static register(id, type) {
    this.items.set(id, type);
  }
  static create(data) {
    const attribute = new Attribute3(data);
    const Type = this.items.get(attribute.type);
    if (Type) {
      return new Type(data);
    }
    return attribute;
  }
}
AttributeFactory.items = /* @__PURE__ */ new Map();
const diAsnSignatureFormatter = "crypto.signatureFormatter";
class AsnDefaultSignatureFormatter {
  toAsnSignature(algorithm, signature) {
    return BufferSourceConverter.toArrayBuffer(signature);
  }
  toWebSignature(algorithm, signature) {
    return BufferSourceConverter.toArrayBuffer(signature);
  }
}
var RsaAlgorithm_1;
let RsaAlgorithm = RsaAlgorithm_1 = class RsaAlgorithm2 {
  static createPssParams(hash, saltLength) {
    const hashAlgorithm = RsaAlgorithm_1.getHashAlgorithm(hash);
    if (!hashAlgorithm) {
      return null;
    }
    return new RsaSaPssParams({
      hashAlgorithm,
      maskGenAlgorithm: new AlgorithmIdentifier({
        algorithm: id_mgf1,
        parameters: AsnConvert.serialize(hashAlgorithm)
      }),
      saltLength
    });
  }
  static getHashAlgorithm(alg) {
    const algProv = instance.resolve(diAlgorithmProvider);
    if (typeof alg === "string") {
      return algProv.toAsnAlgorithm({ name: alg });
    }
    if (typeof alg === "object" && alg && "name" in alg) {
      return algProv.toAsnAlgorithm(alg);
    }
    return null;
  }
  toAsnAlgorithm(alg) {
    switch (alg.name.toLowerCase()) {
      case "rsassa-pkcs1-v1_5":
        if ("hash" in alg) {
          let hash;
          if (typeof alg.hash === "string") {
            hash = alg.hash;
          } else if (alg.hash && typeof alg.hash === "object" && "name" in alg.hash && typeof alg.hash.name === "string") {
            hash = alg.hash.name.toUpperCase();
          } else {
            throw new Error("Cannot get hash algorithm name");
          }
          switch (hash.toLowerCase()) {
            case "sha-1":
              return new AlgorithmIdentifier({
                algorithm: id_sha1WithRSAEncryption,
                parameters: null
              });
            case "sha-256":
              return new AlgorithmIdentifier({
                algorithm: id_sha256WithRSAEncryption,
                parameters: null
              });
            case "sha-384":
              return new AlgorithmIdentifier({
                algorithm: id_sha384WithRSAEncryption,
                parameters: null
              });
            case "sha-512":
              return new AlgorithmIdentifier({
                algorithm: id_sha512WithRSAEncryption,
                parameters: null
              });
          }
        } else {
          return new AlgorithmIdentifier({
            algorithm: id_rsaEncryption,
            parameters: null
          });
        }
        break;
      case "rsa-pss":
        if ("hash" in alg) {
          if (!("saltLength" in alg && typeof alg.saltLength === "number")) {
            throw new Error("Cannot get 'saltLength' from 'alg' argument");
          }
          const pssParams = RsaAlgorithm_1.createPssParams(alg.hash, alg.saltLength);
          if (!pssParams) {
            throw new Error("Cannot create PSS parameters");
          }
          return new AlgorithmIdentifier({
            algorithm: id_RSASSA_PSS,
            parameters: AsnConvert.serialize(pssParams)
          });
        } else {
          return new AlgorithmIdentifier({
            algorithm: id_RSASSA_PSS,
            parameters: null
          });
        }
    }
    return null;
  }
  toWebAlgorithm(alg) {
    switch (alg.algorithm) {
      case id_rsaEncryption:
        return { name: "RSASSA-PKCS1-v1_5" };
      case id_sha1WithRSAEncryption:
        return {
          name: "RSASSA-PKCS1-v1_5",
          hash: { name: "SHA-1" }
        };
      case id_sha256WithRSAEncryption:
        return {
          name: "RSASSA-PKCS1-v1_5",
          hash: { name: "SHA-256" }
        };
      case id_sha384WithRSAEncryption:
        return {
          name: "RSASSA-PKCS1-v1_5",
          hash: { name: "SHA-384" }
        };
      case id_sha512WithRSAEncryption:
        return {
          name: "RSASSA-PKCS1-v1_5",
          hash: { name: "SHA-512" }
        };
      case id_RSASSA_PSS:
        if (alg.parameters) {
          const pssParams = AsnConvert.parse(alg.parameters, RsaSaPssParams);
          const algProv = instance.resolve(diAlgorithmProvider);
          const hashAlg = algProv.toWebAlgorithm(pssParams.hashAlgorithm);
          return {
            name: "RSA-PSS",
            hash: hashAlg,
            saltLength: pssParams.saltLength
          };
        } else {
          return { name: "RSA-PSS" };
        }
    }
    return null;
  }
};
RsaAlgorithm = RsaAlgorithm_1 = __decorate([
  injectable()
], RsaAlgorithm);
instance.registerSingleton(diAlgorithm, RsaAlgorithm);
let ShaAlgorithm = class ShaAlgorithm2 {
  toAsnAlgorithm(alg) {
    switch (alg.name.toLowerCase()) {
      case "sha-1":
        return new AlgorithmIdentifier({ algorithm: id_sha1 });
      case "sha-256":
        return new AlgorithmIdentifier({ algorithm: id_sha256 });
      case "sha-384":
        return new AlgorithmIdentifier({ algorithm: id_sha384 });
      case "sha-512":
        return new AlgorithmIdentifier({ algorithm: id_sha512 });
    }
    return null;
  }
  toWebAlgorithm(alg) {
    switch (alg.algorithm) {
      case id_sha1:
        return { name: "SHA-1" };
      case id_sha256:
        return { name: "SHA-256" };
      case id_sha384:
        return { name: "SHA-384" };
      case id_sha512:
        return { name: "SHA-512" };
    }
    return null;
  }
};
ShaAlgorithm = __decorate([
  injectable()
], ShaAlgorithm);
instance.registerSingleton(diAlgorithm, ShaAlgorithm);
class AsnEcSignatureFormatter {
  addPadding(pointSize, data) {
    const bytes = BufferSourceConverter.toUint8Array(data);
    const res = new Uint8Array(pointSize);
    res.set(bytes, pointSize - bytes.length);
    return res.buffer;
  }
  removePadding(data, positive = false) {
    let bytes = BufferSourceConverter.toUint8Array(data);
    for (let i = 0; i < bytes.length; i++) {
      if (!bytes[i]) {
        continue;
      }
      bytes = bytes.slice(i);
      break;
    }
    if (positive && bytes[0] > 127) {
      const result = new Uint8Array(bytes.length + 1);
      result.set(bytes, 1);
      return result.buffer;
    }
    return bytes.buffer;
  }
  toAsnSignature(algorithm, signature) {
    if (algorithm.name === "ECDSA") {
      const namedCurve = algorithm.namedCurve;
      const pointSize = AsnEcSignatureFormatter.namedCurveSize.get(namedCurve) || AsnEcSignatureFormatter.defaultNamedCurveSize;
      const ecSignature = new ECDSASigValue();
      const uint8Signature = BufferSourceConverter.toUint8Array(signature);
      ecSignature.r = this.removePadding(uint8Signature.slice(0, pointSize), true);
      ecSignature.s = this.removePadding(uint8Signature.slice(pointSize, pointSize + pointSize), true);
      return AsnConvert.serialize(ecSignature);
    }
    return null;
  }
  toWebSignature(algorithm, signature) {
    if (algorithm.name === "ECDSA") {
      const ecSigValue = AsnConvert.parse(signature, ECDSASigValue);
      const namedCurve = algorithm.namedCurve;
      const pointSize = AsnEcSignatureFormatter.namedCurveSize.get(namedCurve) || AsnEcSignatureFormatter.defaultNamedCurveSize;
      const r = this.addPadding(pointSize, this.removePadding(ecSigValue.r));
      const s = this.addPadding(pointSize, this.removePadding(ecSigValue.s));
      return combine(r, s);
    }
    return null;
  }
}
AsnEcSignatureFormatter.namedCurveSize = /* @__PURE__ */ new Map();
AsnEcSignatureFormatter.defaultNamedCurveSize = 32;
const idX25519 = "1.3.101.110";
const idX448 = "1.3.101.111";
const idEd25519 = "1.3.101.112";
const idEd448 = "1.3.101.113";
let EdAlgorithm = class EdAlgorithm2 {
  toAsnAlgorithm(alg) {
    let algorithm = null;
    switch (alg.name.toLowerCase()) {
      case "ed25519":
        algorithm = idEd25519;
        break;
      case "x25519":
        algorithm = idX25519;
        break;
      case "eddsa":
        switch (alg.namedCurve.toLowerCase()) {
          case "ed25519":
            algorithm = idEd25519;
            break;
          case "ed448":
            algorithm = idEd448;
            break;
        }
        break;
      case "ecdh-es":
        switch (alg.namedCurve.toLowerCase()) {
          case "x25519":
            algorithm = idX25519;
            break;
          case "x448":
            algorithm = idX448;
            break;
        }
    }
    if (algorithm) {
      return new AlgorithmIdentifier({ algorithm });
    }
    return null;
  }
  toWebAlgorithm(alg) {
    switch (alg.algorithm) {
      case idEd25519:
        return { name: "Ed25519" };
      case idEd448:
        return {
          name: "EdDSA",
          namedCurve: "Ed448"
        };
      case idX25519:
        return { name: "X25519" };
      case idX448:
        return {
          name: "ECDH-ES",
          namedCurve: "X448"
        };
    }
    return null;
  }
};
EdAlgorithm = __decorate([
  injectable()
], EdAlgorithm);
instance.registerSingleton(diAlgorithm, EdAlgorithm);
var _Pkcs10CertificateRequest_tbs, _Pkcs10CertificateRequest_subjectName, _Pkcs10CertificateRequest_subject, _Pkcs10CertificateRequest_signatureAlgorithm, _Pkcs10CertificateRequest_signature, _Pkcs10CertificateRequest_publicKey, _Pkcs10CertificateRequest_attributes, _Pkcs10CertificateRequest_extensions;
class Pkcs10CertificateRequest extends PemData {
  get subjectName() {
    if (!__classPrivateFieldGet(this, _Pkcs10CertificateRequest_subjectName, "f")) {
      __classPrivateFieldSet(this, _Pkcs10CertificateRequest_subjectName, new Name2(this.asn.certificationRequestInfo.subject), "f");
    }
    return __classPrivateFieldGet(this, _Pkcs10CertificateRequest_subjectName, "f");
  }
  get subject() {
    if (!__classPrivateFieldGet(this, _Pkcs10CertificateRequest_subject, "f")) {
      __classPrivateFieldSet(this, _Pkcs10CertificateRequest_subject, this.subjectName.toString(), "f");
    }
    return __classPrivateFieldGet(this, _Pkcs10CertificateRequest_subject, "f");
  }
  get signatureAlgorithm() {
    if (!__classPrivateFieldGet(this, _Pkcs10CertificateRequest_signatureAlgorithm, "f")) {
      const algProv = instance.resolve(diAlgorithmProvider);
      __classPrivateFieldSet(this, _Pkcs10CertificateRequest_signatureAlgorithm, algProv.toWebAlgorithm(this.asn.signatureAlgorithm), "f");
    }
    return __classPrivateFieldGet(this, _Pkcs10CertificateRequest_signatureAlgorithm, "f");
  }
  get signature() {
    if (!__classPrivateFieldGet(this, _Pkcs10CertificateRequest_signature, "f")) {
      __classPrivateFieldSet(this, _Pkcs10CertificateRequest_signature, this.asn.signature, "f");
    }
    return __classPrivateFieldGet(this, _Pkcs10CertificateRequest_signature, "f");
  }
  get publicKey() {
    if (!__classPrivateFieldGet(this, _Pkcs10CertificateRequest_publicKey, "f")) {
      __classPrivateFieldSet(this, _Pkcs10CertificateRequest_publicKey, new PublicKey(this.asn.certificationRequestInfo.subjectPKInfo), "f");
    }
    return __classPrivateFieldGet(this, _Pkcs10CertificateRequest_publicKey, "f");
  }
  get attributes() {
    if (!__classPrivateFieldGet(this, _Pkcs10CertificateRequest_attributes, "f")) {
      __classPrivateFieldSet(this, _Pkcs10CertificateRequest_attributes, this.asn.certificationRequestInfo.attributes.map((o) => AttributeFactory.create(AsnConvert.serialize(o))), "f");
    }
    return __classPrivateFieldGet(this, _Pkcs10CertificateRequest_attributes, "f");
  }
  get extensions() {
    if (!__classPrivateFieldGet(this, _Pkcs10CertificateRequest_extensions, "f")) {
      __classPrivateFieldSet(this, _Pkcs10CertificateRequest_extensions, [], "f");
      const extensions = this.getAttribute(id_pkcs9_at_extensionRequest);
      if (extensions instanceof ExtensionsAttribute) {
        __classPrivateFieldSet(this, _Pkcs10CertificateRequest_extensions, extensions.items, "f");
      }
    }
    return __classPrivateFieldGet(this, _Pkcs10CertificateRequest_extensions, "f");
  }
  get tbs() {
    if (!__classPrivateFieldGet(this, _Pkcs10CertificateRequest_tbs, "f")) {
      __classPrivateFieldSet(this, _Pkcs10CertificateRequest_tbs, this.asn.certificationRequestInfoRaw || AsnConvert.serialize(this.asn.certificationRequestInfo), "f");
    }
    return __classPrivateFieldGet(this, _Pkcs10CertificateRequest_tbs, "f");
  }
  constructor(param) {
    const args = PemData.isAsnEncoded(param) ? [param, CertificationRequest] : [param];
    super(args[0], args[1]);
    _Pkcs10CertificateRequest_tbs.set(this, void 0);
    _Pkcs10CertificateRequest_subjectName.set(this, void 0);
    _Pkcs10CertificateRequest_subject.set(this, void 0);
    _Pkcs10CertificateRequest_signatureAlgorithm.set(this, void 0);
    _Pkcs10CertificateRequest_signature.set(this, void 0);
    _Pkcs10CertificateRequest_publicKey.set(this, void 0);
    _Pkcs10CertificateRequest_attributes.set(this, void 0);
    _Pkcs10CertificateRequest_extensions.set(this, void 0);
    this.tag = PemConverter.CertificateRequestTag;
  }
  onInit(_asn) {
  }
  getAttribute(type) {
    for (const attr of this.attributes) {
      if (attr.type === type) {
        return attr;
      }
    }
    return null;
  }
  getAttributes(type) {
    return this.attributes.filter((o) => o.type === type);
  }
  getExtension(type) {
    for (const ext of this.extensions) {
      if (ext.type === type) {
        return ext;
      }
    }
    return null;
  }
  getExtensions(type) {
    return this.extensions.filter((o) => o.type === type);
  }
  async verify(crypto2 = cryptoProvider.get()) {
    const algorithm = {
      ...this.publicKey.algorithm,
      ...this.signatureAlgorithm
    };
    const publicKey = await this.publicKey.export(algorithm, ["verify"], crypto2);
    const signatureFormatters = instance.resolveAll(diAsnSignatureFormatter).reverse();
    let signature = null;
    for (const signatureFormatter of signatureFormatters) {
      signature = signatureFormatter.toWebSignature(algorithm, this.signature);
      if (signature) {
        break;
      }
    }
    if (!signature) {
      throw Error("Cannot convert WebCrypto signature value to ASN.1 format");
    }
    const ok = await crypto2.subtle.verify(this.signatureAlgorithm, publicKey, signature, this.tbs);
    return ok;
  }
  toTextObject() {
    const obj = this.toTextObjectEmpty();
    const req = AsnConvert.parse(this.rawData, CertificationRequest);
    const tbs = req.certificationRequestInfo;
    const data = new TextObject("", {
      Version: `${Version$2[tbs.version]} (${tbs.version})`,
      Subject: this.subject,
      "Subject Public Key Info": this.publicKey
    });
    if (this.attributes.length) {
      const attrs = new TextObject("");
      for (const ext of this.attributes) {
        const attrObj = ext.toTextObject();
        attrs[attrObj[TextObject.NAME]] = attrObj;
      }
      data["Attributes"] = attrs;
    }
    obj["Data"] = data;
    obj["Signature"] = new TextObject("", {
      Algorithm: TextConverter.serializeAlgorithm(req.signatureAlgorithm),
      "": req.signature
    });
    return obj;
  }
}
_Pkcs10CertificateRequest_tbs = /* @__PURE__ */ new WeakMap(), _Pkcs10CertificateRequest_subjectName = /* @__PURE__ */ new WeakMap(), _Pkcs10CertificateRequest_subject = /* @__PURE__ */ new WeakMap(), _Pkcs10CertificateRequest_signatureAlgorithm = /* @__PURE__ */ new WeakMap(), _Pkcs10CertificateRequest_signature = /* @__PURE__ */ new WeakMap(), _Pkcs10CertificateRequest_publicKey = /* @__PURE__ */ new WeakMap(), _Pkcs10CertificateRequest_attributes = /* @__PURE__ */ new WeakMap(), _Pkcs10CertificateRequest_extensions = /* @__PURE__ */ new WeakMap();
Pkcs10CertificateRequest.NAME = "PKCS#10 Certificate Request";
var _X509Certificate_tbs, _X509Certificate_serialNumber, _X509Certificate_subjectName, _X509Certificate_subject, _X509Certificate_issuerName, _X509Certificate_issuer, _X509Certificate_notBefore, _X509Certificate_notAfter, _X509Certificate_signatureAlgorithm, _X509Certificate_signature, _X509Certificate_extensions, _X509Certificate_publicKey;
class X509Certificate extends PemData {
  get publicKey() {
    if (!__classPrivateFieldGet(this, _X509Certificate_publicKey, "f")) {
      __classPrivateFieldSet(this, _X509Certificate_publicKey, new PublicKey(this.asn.tbsCertificate.subjectPublicKeyInfo), "f");
    }
    return __classPrivateFieldGet(this, _X509Certificate_publicKey, "f");
  }
  get serialNumber() {
    if (!__classPrivateFieldGet(this, _X509Certificate_serialNumber, "f")) {
      const tbs = this.asn.tbsCertificate;
      let serialNumberBytes = new Uint8Array(tbs.serialNumber);
      if (serialNumberBytes.length > 1 && serialNumberBytes[0] === 0 && serialNumberBytes[1] > 127) {
        serialNumberBytes = serialNumberBytes.slice(1);
      }
      __classPrivateFieldSet(this, _X509Certificate_serialNumber, Convert.ToHex(serialNumberBytes), "f");
    }
    return __classPrivateFieldGet(this, _X509Certificate_serialNumber, "f");
  }
  get subjectName() {
    if (!__classPrivateFieldGet(this, _X509Certificate_subjectName, "f")) {
      __classPrivateFieldSet(this, _X509Certificate_subjectName, new Name2(this.asn.tbsCertificate.subject), "f");
    }
    return __classPrivateFieldGet(this, _X509Certificate_subjectName, "f");
  }
  get subject() {
    if (!__classPrivateFieldGet(this, _X509Certificate_subject, "f")) {
      __classPrivateFieldSet(this, _X509Certificate_subject, this.subjectName.toString(), "f");
    }
    return __classPrivateFieldGet(this, _X509Certificate_subject, "f");
  }
  get issuerName() {
    if (!__classPrivateFieldGet(this, _X509Certificate_issuerName, "f")) {
      __classPrivateFieldSet(this, _X509Certificate_issuerName, new Name2(this.asn.tbsCertificate.issuer), "f");
    }
    return __classPrivateFieldGet(this, _X509Certificate_issuerName, "f");
  }
  get issuer() {
    if (!__classPrivateFieldGet(this, _X509Certificate_issuer, "f")) {
      __classPrivateFieldSet(this, _X509Certificate_issuer, this.issuerName.toString(), "f");
    }
    return __classPrivateFieldGet(this, _X509Certificate_issuer, "f");
  }
  get notBefore() {
    if (!__classPrivateFieldGet(this, _X509Certificate_notBefore, "f")) {
      const notBefore = this.asn.tbsCertificate.validity.notBefore.utcTime || this.asn.tbsCertificate.validity.notBefore.generalTime;
      if (!notBefore) {
        throw new Error("Cannot get 'notBefore' value");
      }
      __classPrivateFieldSet(this, _X509Certificate_notBefore, notBefore, "f");
    }
    return __classPrivateFieldGet(this, _X509Certificate_notBefore, "f");
  }
  get notAfter() {
    if (!__classPrivateFieldGet(this, _X509Certificate_notAfter, "f")) {
      const notAfter = this.asn.tbsCertificate.validity.notAfter.utcTime || this.asn.tbsCertificate.validity.notAfter.generalTime;
      if (!notAfter) {
        throw new Error("Cannot get 'notAfter' value");
      }
      __classPrivateFieldSet(this, _X509Certificate_notAfter, notAfter, "f");
    }
    return __classPrivateFieldGet(this, _X509Certificate_notAfter, "f");
  }
  get signatureAlgorithm() {
    if (!__classPrivateFieldGet(this, _X509Certificate_signatureAlgorithm, "f")) {
      const algProv = instance.resolve(diAlgorithmProvider);
      __classPrivateFieldSet(this, _X509Certificate_signatureAlgorithm, algProv.toWebAlgorithm(this.asn.signatureAlgorithm), "f");
    }
    return __classPrivateFieldGet(this, _X509Certificate_signatureAlgorithm, "f");
  }
  get signature() {
    if (!__classPrivateFieldGet(this, _X509Certificate_signature, "f")) {
      __classPrivateFieldSet(this, _X509Certificate_signature, this.asn.signatureValue, "f");
    }
    return __classPrivateFieldGet(this, _X509Certificate_signature, "f");
  }
  get extensions() {
    if (!__classPrivateFieldGet(this, _X509Certificate_extensions, "f")) {
      __classPrivateFieldSet(this, _X509Certificate_extensions, [], "f");
      if (this.asn.tbsCertificate.extensions) {
        __classPrivateFieldSet(this, _X509Certificate_extensions, this.asn.tbsCertificate.extensions.map((o) => ExtensionFactory.create(AsnConvert.serialize(o))), "f");
      }
    }
    return __classPrivateFieldGet(this, _X509Certificate_extensions, "f");
  }
  get tbs() {
    if (!__classPrivateFieldGet(this, _X509Certificate_tbs, "f")) {
      __classPrivateFieldSet(this, _X509Certificate_tbs, this.asn.tbsCertificateRaw || AsnConvert.serialize(this.asn.tbsCertificate), "f");
    }
    return __classPrivateFieldGet(this, _X509Certificate_tbs, "f");
  }
  constructor(param) {
    const args = PemData.isAsnEncoded(param) ? [param, Certificate] : [param];
    super(args[0], args[1]);
    _X509Certificate_tbs.set(this, void 0);
    _X509Certificate_serialNumber.set(this, void 0);
    _X509Certificate_subjectName.set(this, void 0);
    _X509Certificate_subject.set(this, void 0);
    _X509Certificate_issuerName.set(this, void 0);
    _X509Certificate_issuer.set(this, void 0);
    _X509Certificate_notBefore.set(this, void 0);
    _X509Certificate_notAfter.set(this, void 0);
    _X509Certificate_signatureAlgorithm.set(this, void 0);
    _X509Certificate_signature.set(this, void 0);
    _X509Certificate_extensions.set(this, void 0);
    _X509Certificate_publicKey.set(this, void 0);
    this.tag = PemConverter.CertificateTag;
  }
  onInit(_asn) {
  }
  getExtension(type) {
    for (const ext of this.extensions) {
      if (typeof type === "string") {
        if (ext.type === type) {
          return ext;
        }
      } else {
        if (ext instanceof type) {
          return ext;
        }
      }
    }
    return null;
  }
  getExtensions(type) {
    return this.extensions.filter((o) => {
      if (typeof type === "string") {
        return o.type === type;
      } else {
        return o instanceof type;
      }
    });
  }
  async verify(params = {}, crypto2 = cryptoProvider.get()) {
    let keyAlgorithm;
    let publicKey;
    const paramsKey = params.publicKey;
    try {
      if (!paramsKey) {
        keyAlgorithm = {
          ...this.publicKey.algorithm,
          ...this.signatureAlgorithm
        };
        publicKey = await this.publicKey.export(keyAlgorithm, ["verify"], crypto2);
      } else if ("publicKey" in paramsKey) {
        keyAlgorithm = {
          ...paramsKey.publicKey.algorithm,
          ...this.signatureAlgorithm
        };
        publicKey = await paramsKey.publicKey.export(keyAlgorithm, ["verify"], crypto2);
      } else if (paramsKey instanceof PublicKey) {
        keyAlgorithm = {
          ...paramsKey.algorithm,
          ...this.signatureAlgorithm
        };
        publicKey = await paramsKey.export(keyAlgorithm, ["verify"], crypto2);
      } else if (BufferSourceConverter.isBufferSource(paramsKey)) {
        const key2 = new PublicKey(paramsKey);
        keyAlgorithm = {
          ...key2.algorithm,
          ...this.signatureAlgorithm
        };
        publicKey = await key2.export(keyAlgorithm, ["verify"], crypto2);
      } else {
        keyAlgorithm = {
          ...paramsKey.algorithm,
          ...this.signatureAlgorithm
        };
        publicKey = paramsKey;
      }
    } catch {
      return false;
    }
    const signatureFormatters = instance.resolveAll(diAsnSignatureFormatter).reverse();
    let signature = null;
    for (const signatureFormatter of signatureFormatters) {
      signature = signatureFormatter.toWebSignature(keyAlgorithm, this.signature);
      if (signature) {
        break;
      }
    }
    if (!signature) {
      throw Error("Cannot convert ASN.1 signature value to WebCrypto format");
    }
    const ok = await crypto2.subtle.verify(this.signatureAlgorithm, publicKey, signature, this.tbs);
    if (params.signatureOnly) {
      return ok;
    } else {
      const date = params.date || /* @__PURE__ */ new Date();
      const time = date.getTime();
      return ok && this.notBefore.getTime() < time && time < this.notAfter.getTime();
    }
  }
  async getThumbprint(...args) {
    let crypto2;
    let algorithm = "SHA-1";
    if (args[0]) {
      if (!args[0].subtle) {
        algorithm = args[0] || algorithm;
        crypto2 = args[1];
      } else {
        crypto2 = args[0];
      }
    }
    crypto2 !== null && crypto2 !== void 0 ? crypto2 : crypto2 = cryptoProvider.get();
    return await crypto2.subtle.digest(algorithm, this.rawData);
  }
  async isSelfSigned(crypto2 = cryptoProvider.get()) {
    return this.subject === this.issuer && await this.verify({ signatureOnly: true }, crypto2);
  }
  toTextObject() {
    const obj = this.toTextObjectEmpty();
    const cert = AsnConvert.parse(this.rawData, Certificate);
    const tbs = cert.tbsCertificate;
    const data = new TextObject("", {
      Version: `${Version$2[tbs.version]} (${tbs.version})`,
      "Serial Number": tbs.serialNumber,
      "Signature Algorithm": TextConverter.serializeAlgorithm(tbs.signature),
      Issuer: this.issuer,
      Validity: new TextObject("", {
        "Not Before": tbs.validity.notBefore.getTime(),
        "Not After": tbs.validity.notAfter.getTime()
      }),
      Subject: this.subject,
      "Subject Public Key Info": this.publicKey
    });
    if (tbs.issuerUniqueID) {
      data["Issuer Unique ID"] = tbs.issuerUniqueID;
    }
    if (tbs.subjectUniqueID) {
      data["Subject Unique ID"] = tbs.subjectUniqueID;
    }
    if (this.extensions.length) {
      const extensions = new TextObject("");
      for (const ext of this.extensions) {
        const extObj = ext.toTextObject();
        extensions[extObj[TextObject.NAME]] = extObj;
      }
      data["Extensions"] = extensions;
    }
    obj["Data"] = data;
    obj["Signature"] = new TextObject("", {
      Algorithm: TextConverter.serializeAlgorithm(cert.signatureAlgorithm),
      "": cert.signatureValue
    });
    return obj;
  }
}
_X509Certificate_tbs = /* @__PURE__ */ new WeakMap(), _X509Certificate_serialNumber = /* @__PURE__ */ new WeakMap(), _X509Certificate_subjectName = /* @__PURE__ */ new WeakMap(), _X509Certificate_subject = /* @__PURE__ */ new WeakMap(), _X509Certificate_issuerName = /* @__PURE__ */ new WeakMap(), _X509Certificate_issuer = /* @__PURE__ */ new WeakMap(), _X509Certificate_notBefore = /* @__PURE__ */ new WeakMap(), _X509Certificate_notAfter = /* @__PURE__ */ new WeakMap(), _X509Certificate_signatureAlgorithm = /* @__PURE__ */ new WeakMap(), _X509Certificate_signature = /* @__PURE__ */ new WeakMap(), _X509Certificate_extensions = /* @__PURE__ */ new WeakMap(), _X509Certificate_publicKey = /* @__PURE__ */ new WeakMap();
X509Certificate.NAME = "Certificate";
class X509Certificates extends Array {
  constructor(param) {
    super();
    if (PemData.isAsnEncoded(param)) {
      this.import(param);
    } else if (param instanceof X509Certificate) {
      this.push(param);
    } else if (Array.isArray(param)) {
      for (const item of param) {
        this.push(item);
      }
    }
  }
  export(format) {
    const signedData = new SignedData();
    signedData.version = 1;
    signedData.encapContentInfo.eContentType = id_data;
    signedData.encapContentInfo.eContent = new EncapsulatedContent({ single: new OctetString2() });
    signedData.certificates = new CertificateSet(this.map((o) => new CertificateChoices({ certificate: AsnConvert.parse(o.rawData, Certificate) })));
    const cms = new ContentInfo({
      contentType: id_signedData,
      content: AsnConvert.serialize(signedData)
    });
    const raw = AsnConvert.serialize(cms);
    if (format === "raw") {
      return raw;
    }
    return this.toString(format);
  }
  import(data) {
    const raw = PemData.toArrayBuffer(data);
    const cms = AsnConvert.parse(raw, ContentInfo);
    if (cms.contentType !== id_signedData) {
      throw new TypeError("Cannot parse CMS package. Incoming data is not a SignedData object.");
    }
    const signedData = AsnConvert.parse(cms.content, SignedData);
    this.clear();
    for (const item of signedData.certificates || []) {
      if (item.certificate) {
        this.push(new X509Certificate(item.certificate));
      }
    }
  }
  clear() {
    while (this.pop()) {
    }
  }
  toString(format = "pem") {
    const raw = this.export("raw");
    switch (format) {
      case "pem":
        return PemConverter.encode(raw, "CMS");
      case "pem-chain":
        return this.map((o) => o.toString("pem")).join("\n");
      case "asn":
        return AsnConvert.toString(raw);
      case "hex":
        return Convert.ToHex(raw);
      case "base64":
        return Convert.ToBase64(raw);
      case "base64url":
        return Convert.ToBase64Url(raw);
      case "text":
        return TextConverter.serialize(this.toTextObject());
      default:
        throw TypeError("Argument 'format' is unsupported value");
    }
  }
  toTextObject() {
    const contentInfo = AsnConvert.parse(this.export("raw"), ContentInfo);
    const signedData = AsnConvert.parse(contentInfo.content, SignedData);
    const obj = new TextObject("X509Certificates", {
      "Content Type": OidSerializer.toString(contentInfo.contentType),
      Content: new TextObject("", {
        Version: `${CMSVersion[signedData.version]} (${signedData.version})`,
        Certificates: new TextObject("", { Certificate: this.map((o) => o.toTextObject()) })
      })
    });
    return obj;
  }
}
class X509ChainBuilder {
  constructor(params = {}) {
    this.certificates = [];
    if (params.certificates) {
      this.certificates = params.certificates;
    }
  }
  async build(cert, crypto2 = cryptoProvider.get()) {
    const chain = new X509Certificates(cert);
    let current = cert;
    while (current = await this.findIssuer(current, crypto2)) {
      const thumbprint = await current.getThumbprint(crypto2);
      for (const item of chain) {
        const thumbprint2 = await item.getThumbprint(crypto2);
        if (isEqual(thumbprint, thumbprint2)) {
          throw new Error("Cannot build a certificate chain. Circular dependency.");
        }
      }
      chain.push(current);
    }
    return chain;
  }
  async findIssuer(cert, crypto2 = cryptoProvider.get()) {
    if (!await cert.isSelfSigned(crypto2)) {
      const akiExt = cert.getExtension(id_ce_authorityKeyIdentifier);
      for (const item of this.certificates) {
        if (item.subject !== cert.issuer) {
          continue;
        }
        if (akiExt) {
          if (akiExt.keyId) {
            const skiExt = item.getExtension(id_ce_subjectKeyIdentifier);
            if (skiExt && skiExt.keyId !== akiExt.keyId) {
              continue;
            }
          } else if (akiExt.certId) {
            const sanExt = item.getExtension(id_ce_subjectAltName);
            if (sanExt && !(akiExt.certId.serialNumber === item.serialNumber && isEqual(AsnConvert.serialize(akiExt.certId.name), AsnConvert.serialize(sanExt)))) {
              continue;
            }
          }
        }
        try {
          const algorithm = {
            ...item.publicKey.algorithm,
            ...cert.signatureAlgorithm
          };
          const publicKey = await item.publicKey.export(algorithm, ["verify"], crypto2);
          const ok = await cert.verify({
            publicKey,
            signatureOnly: true
          }, crypto2);
          if (!ok) {
            continue;
          }
        } catch {
          continue;
        }
        return item;
      }
    }
    return null;
  }
}
function generateCertificateSerialNumber(input, crypto2 = cryptoProvider.get()) {
  const inputView = BufferSourceConverter.toUint8Array(Convert.FromHex(input || ""));
  let serialNumber = inputView && inputView.length && inputView.some((o) => o > 0) ? new Uint8Array(inputView) : void 0;
  if (!serialNumber) {
    serialNumber = crypto2.getRandomValues(new Uint8Array(16));
  }
  let firstNonZero = 0;
  while (firstNonZero < serialNumber.length - 1 && serialNumber[firstNonZero] === 0) {
    firstNonZero++;
  }
  serialNumber = serialNumber.slice(firstNonZero);
  if (serialNumber[0] > 127) {
    const newSerialNumber = new Uint8Array(serialNumber.length + 1);
    newSerialNumber[0] = 0;
    newSerialNumber.set(serialNumber, 1);
    serialNumber = newSerialNumber;
  }
  return serialNumber.buffer;
}
var _X509CrlEntry_serialNumber, _X509CrlEntry_revocationDate, _X509CrlEntry_reason, _X509CrlEntry_invalidity, _X509CrlEntry_extensions;
var X509CrlReason;
(function(X509CrlReason2) {
  X509CrlReason2[X509CrlReason2["unspecified"] = 0] = "unspecified";
  X509CrlReason2[X509CrlReason2["keyCompromise"] = 1] = "keyCompromise";
  X509CrlReason2[X509CrlReason2["cACompromise"] = 2] = "cACompromise";
  X509CrlReason2[X509CrlReason2["affiliationChanged"] = 3] = "affiliationChanged";
  X509CrlReason2[X509CrlReason2["superseded"] = 4] = "superseded";
  X509CrlReason2[X509CrlReason2["cessationOfOperation"] = 5] = "cessationOfOperation";
  X509CrlReason2[X509CrlReason2["certificateHold"] = 6] = "certificateHold";
  X509CrlReason2[X509CrlReason2["removeFromCRL"] = 8] = "removeFromCRL";
  X509CrlReason2[X509CrlReason2["privilegeWithdrawn"] = 9] = "privilegeWithdrawn";
  X509CrlReason2[X509CrlReason2["aACompromise"] = 10] = "aACompromise";
})(X509CrlReason || (X509CrlReason = {}));
class X509CrlEntry extends AsnData {
  get serialNumber() {
    if (!__classPrivateFieldGet(this, _X509CrlEntry_serialNumber, "f")) {
      __classPrivateFieldSet(this, _X509CrlEntry_serialNumber, Convert.ToHex(this.asn.userCertificate), "f");
    }
    return __classPrivateFieldGet(this, _X509CrlEntry_serialNumber, "f");
  }
  get revocationDate() {
    if (!__classPrivateFieldGet(this, _X509CrlEntry_revocationDate, "f")) {
      __classPrivateFieldSet(this, _X509CrlEntry_revocationDate, this.asn.revocationDate.getTime(), "f");
    }
    return __classPrivateFieldGet(this, _X509CrlEntry_revocationDate, "f");
  }
  get reason() {
    if (__classPrivateFieldGet(this, _X509CrlEntry_reason, "f") === void 0) {
      void this.extensions;
    }
    return __classPrivateFieldGet(this, _X509CrlEntry_reason, "f");
  }
  get invalidity() {
    if (__classPrivateFieldGet(this, _X509CrlEntry_invalidity, "f") === void 0) {
      void this.extensions;
    }
    return __classPrivateFieldGet(this, _X509CrlEntry_invalidity, "f");
  }
  get extensions() {
    if (!__classPrivateFieldGet(this, _X509CrlEntry_extensions, "f")) {
      __classPrivateFieldSet(this, _X509CrlEntry_extensions, [], "f");
      if (this.asn.crlEntryExtensions) {
        __classPrivateFieldSet(this, _X509CrlEntry_extensions, this.asn.crlEntryExtensions.map((o) => {
          const extension = ExtensionFactory.create(AsnConvert.serialize(o));
          switch (extension.type) {
            case id_ce_cRLReasons:
              if (__classPrivateFieldGet(this, _X509CrlEntry_reason, "f") === void 0) {
                __classPrivateFieldSet(this, _X509CrlEntry_reason, AsnConvert.parse(extension.value, CRLReason).reason, "f");
              }
              break;
            case id_ce_invalidityDate:
              if (__classPrivateFieldGet(this, _X509CrlEntry_invalidity, "f") === void 0) {
                __classPrivateFieldSet(this, _X509CrlEntry_invalidity, AsnConvert.parse(extension.value, InvalidityDate).value, "f");
              }
              break;
          }
          return extension;
        }), "f");
      }
    }
    return __classPrivateFieldGet(this, _X509CrlEntry_extensions, "f");
  }
  constructor(...args) {
    let raw;
    if (BufferSourceConverter.isBufferSource(args[0])) {
      raw = BufferSourceConverter.toArrayBuffer(args[0]);
    } else if (typeof args[0] === "string") {
      raw = AsnConvert.serialize(new RevokedCertificate({
        userCertificate: generateCertificateSerialNumber(args[0]),
        revocationDate: new Time(args[1]),
        crlEntryExtensions: args[2]
      }));
    } else if (args[0] instanceof RevokedCertificate) {
      raw = args[0];
    }
    if (!raw) {
      throw new TypeError("Cannot create X509CrlEntry instance. Wrong constructor arguments.");
    }
    super(raw, RevokedCertificate);
    _X509CrlEntry_serialNumber.set(this, void 0);
    _X509CrlEntry_revocationDate.set(this, void 0);
    _X509CrlEntry_reason.set(this, void 0);
    _X509CrlEntry_invalidity.set(this, void 0);
    _X509CrlEntry_extensions.set(this, void 0);
  }
  onInit(_asn) {
  }
}
_X509CrlEntry_serialNumber = /* @__PURE__ */ new WeakMap(), _X509CrlEntry_revocationDate = /* @__PURE__ */ new WeakMap(), _X509CrlEntry_reason = /* @__PURE__ */ new WeakMap(), _X509CrlEntry_invalidity = /* @__PURE__ */ new WeakMap(), _X509CrlEntry_extensions = /* @__PURE__ */ new WeakMap();
var _X509Crl_tbs, _X509Crl_signatureAlgorithm, _X509Crl_issuerName, _X509Crl_thisUpdate, _X509Crl_nextUpdate, _X509Crl_entries, _X509Crl_extensions;
class X509Crl extends PemData {
  get version() {
    return this.asn.tbsCertList.version;
  }
  get signatureAlgorithm() {
    if (!__classPrivateFieldGet(this, _X509Crl_signatureAlgorithm, "f")) {
      const algProv = instance.resolve(diAlgorithmProvider);
      __classPrivateFieldSet(this, _X509Crl_signatureAlgorithm, algProv.toWebAlgorithm(this.asn.signatureAlgorithm), "f");
    }
    return __classPrivateFieldGet(this, _X509Crl_signatureAlgorithm, "f");
  }
  get signature() {
    return this.asn.signature;
  }
  get issuer() {
    return this.issuerName.toString();
  }
  get issuerName() {
    if (!__classPrivateFieldGet(this, _X509Crl_issuerName, "f")) {
      __classPrivateFieldSet(this, _X509Crl_issuerName, new Name2(this.asn.tbsCertList.issuer), "f");
    }
    return __classPrivateFieldGet(this, _X509Crl_issuerName, "f");
  }
  get thisUpdate() {
    if (!__classPrivateFieldGet(this, _X509Crl_thisUpdate, "f")) {
      const thisUpdate = this.asn.tbsCertList.thisUpdate.getTime();
      if (!thisUpdate) {
        throw new Error("Cannot get 'thisUpdate' value");
      }
      __classPrivateFieldSet(this, _X509Crl_thisUpdate, thisUpdate, "f");
    }
    return __classPrivateFieldGet(this, _X509Crl_thisUpdate, "f");
  }
  get nextUpdate() {
    var _a2;
    if (__classPrivateFieldGet(this, _X509Crl_nextUpdate, "f") === void 0) {
      __classPrivateFieldSet(this, _X509Crl_nextUpdate, ((_a2 = this.asn.tbsCertList.nextUpdate) === null || _a2 === void 0 ? void 0 : _a2.getTime()) || void 0, "f");
    }
    return __classPrivateFieldGet(this, _X509Crl_nextUpdate, "f");
  }
  get entries() {
    var _a2;
    if (!__classPrivateFieldGet(this, _X509Crl_entries, "f")) {
      __classPrivateFieldSet(this, _X509Crl_entries, ((_a2 = this.asn.tbsCertList.revokedCertificates) === null || _a2 === void 0 ? void 0 : _a2.map((o) => new X509CrlEntry(o))) || [], "f");
    }
    return __classPrivateFieldGet(this, _X509Crl_entries, "f");
  }
  get extensions() {
    if (!__classPrivateFieldGet(this, _X509Crl_extensions, "f")) {
      __classPrivateFieldSet(this, _X509Crl_extensions, [], "f");
      if (this.asn.tbsCertList.crlExtensions) {
        __classPrivateFieldSet(this, _X509Crl_extensions, this.asn.tbsCertList.crlExtensions.map((o) => ExtensionFactory.create(AsnConvert.serialize(o))), "f");
      }
    }
    return __classPrivateFieldGet(this, _X509Crl_extensions, "f");
  }
  get tbs() {
    if (!__classPrivateFieldGet(this, _X509Crl_tbs, "f")) {
      __classPrivateFieldSet(this, _X509Crl_tbs, this.asn.tbsCertListRaw || AsnConvert.serialize(this.asn.tbsCertList), "f");
    }
    return __classPrivateFieldGet(this, _X509Crl_tbs, "f");
  }
  get tbsCertListSignatureAlgorithm() {
    return this.asn.tbsCertList.signature;
  }
  get certListSignatureAlgorithm() {
    return this.asn.signatureAlgorithm;
  }
  constructor(param) {
    super(param, PemData.isAsnEncoded(param) ? CertificateList : void 0);
    this.tag = PemConverter.CrlTag;
    _X509Crl_tbs.set(this, void 0);
    _X509Crl_signatureAlgorithm.set(this, void 0);
    _X509Crl_issuerName.set(this, void 0);
    _X509Crl_thisUpdate.set(this, void 0);
    _X509Crl_nextUpdate.set(this, void 0);
    _X509Crl_entries.set(this, void 0);
    _X509Crl_extensions.set(this, void 0);
  }
  onInit(_asn) {
  }
  getExtension(type) {
    for (const ext of this.extensions) {
      if (typeof type === "string") {
        if (ext.type === type) {
          return ext;
        }
      } else {
        if (ext instanceof type) {
          return ext;
        }
      }
    }
    return null;
  }
  getExtensions(type) {
    return this.extensions.filter((o) => {
      if (typeof type === "string") {
        return o.type === type;
      } else {
        return o instanceof type;
      }
    });
  }
  async verify(params, crypto2 = cryptoProvider.get()) {
    if (!this.certListSignatureAlgorithm.isEqual(this.tbsCertListSignatureAlgorithm)) {
      throw new Error("algorithm identifier in the sequence tbsCertList and CertificateList mismatch");
    }
    let keyAlgorithm;
    let publicKey;
    const paramsKey = params.publicKey;
    try {
      if (paramsKey instanceof X509Certificate) {
        keyAlgorithm = {
          ...paramsKey.publicKey.algorithm,
          ...paramsKey.signatureAlgorithm
        };
        publicKey = await paramsKey.publicKey.export(keyAlgorithm, ["verify"]);
      } else if (paramsKey instanceof PublicKey) {
        keyAlgorithm = {
          ...paramsKey.algorithm,
          ...this.signatureAlgorithm
        };
        publicKey = await paramsKey.export(keyAlgorithm, ["verify"]);
      } else {
        keyAlgorithm = {
          ...paramsKey.algorithm,
          ...this.signatureAlgorithm
        };
        publicKey = paramsKey;
      }
    } catch {
      return false;
    }
    const signatureFormatters = instance.resolveAll(diAsnSignatureFormatter).reverse();
    let signature = null;
    for (const signatureFormatter of signatureFormatters) {
      signature = signatureFormatter.toWebSignature(keyAlgorithm, this.signature);
      if (signature) {
        break;
      }
    }
    if (!signature) {
      throw Error("Cannot convert ASN.1 signature value to WebCrypto format");
    }
    return await crypto2.subtle.verify(this.signatureAlgorithm, publicKey, signature, this.tbs);
  }
  async getThumbprint(...args) {
    let crypto2;
    let algorithm = "SHA-1";
    if (args[0]) {
      if (!args[0].subtle) {
        algorithm = args[0] || algorithm;
        crypto2 = args[1];
      } else {
        crypto2 = args[0];
      }
    }
    crypto2 !== null && crypto2 !== void 0 ? crypto2 : crypto2 = cryptoProvider.get();
    return await crypto2.subtle.digest(algorithm, this.rawData);
  }
  findRevoked(certOrSerialNumber) {
    const serialNumber = typeof certOrSerialNumber === "string" ? certOrSerialNumber : certOrSerialNumber.serialNumber;
    const serialBuffer = generateCertificateSerialNumber(serialNumber);
    for (const revoked of this.asn.tbsCertList.revokedCertificates || []) {
      if (BufferSourceConverter.isEqual(revoked.userCertificate, serialBuffer)) {
        return new X509CrlEntry(AsnConvert.serialize(revoked));
      }
    }
    return null;
  }
}
_X509Crl_tbs = /* @__PURE__ */ new WeakMap(), _X509Crl_signatureAlgorithm = /* @__PURE__ */ new WeakMap(), _X509Crl_issuerName = /* @__PURE__ */ new WeakMap(), _X509Crl_thisUpdate = /* @__PURE__ */ new WeakMap(), _X509Crl_nextUpdate = /* @__PURE__ */ new WeakMap(), _X509Crl_entries = /* @__PURE__ */ new WeakMap(), _X509Crl_extensions = /* @__PURE__ */ new WeakMap();
ExtensionFactory.register(id_ce_basicConstraints, BasicConstraintsExtension);
ExtensionFactory.register(id_ce_extKeyUsage, ExtendedKeyUsageExtension);
ExtensionFactory.register(id_ce_keyUsage, KeyUsagesExtension);
ExtensionFactory.register(id_ce_subjectKeyIdentifier, SubjectKeyIdentifierExtension);
ExtensionFactory.register(id_ce_authorityKeyIdentifier, AuthorityKeyIdentifierExtension);
ExtensionFactory.register(id_ce_subjectAltName, SubjectAlternativeNameExtension);
ExtensionFactory.register(id_ce_cRLDistributionPoints, CRLDistributionPointsExtension);
ExtensionFactory.register(id_pe_authorityInfoAccess, AuthorityInfoAccessExtension);
ExtensionFactory.register(id_ce_issuerAltName, IssuerAlternativeNameExtension);
AttributeFactory.register(id_pkcs9_at_challengePassword, ChallengePasswordAttribute);
AttributeFactory.register(id_pkcs9_at_extensionRequest, ExtensionsAttribute);
instance.registerSingleton(diAsnSignatureFormatter, AsnDefaultSignatureFormatter);
instance.registerSingleton(diAsnSignatureFormatter, AsnEcSignatureFormatter);
AsnEcSignatureFormatter.namedCurveSize.set("P-256", 32);
AsnEcSignatureFormatter.namedCurveSize.set("K-256", 32);
AsnEcSignatureFormatter.namedCurveSize.set("P-384", 48);
AsnEcSignatureFormatter.namedCurveSize.set("P-521", 66);
function fetch$1(url) {
  return _fetchInternals.stubThis(url);
}
const _fetchInternals = {
  stubThis: (url) => globalThis.fetch(url)
};
const cacheRevokedCerts = {};
async function isCertRevoked(cert) {
  const { extensions } = cert;
  if (!extensions) {
    return false;
  }
  let extAuthorityKeyID;
  let extSubjectKeyID;
  let extCRLDistributionPoints;
  extensions.forEach((ext) => {
    if (ext instanceof AuthorityKeyIdentifierExtension) {
      extAuthorityKeyID = ext;
    } else if (ext instanceof SubjectKeyIdentifierExtension) {
      extSubjectKeyID = ext;
    } else if (ext instanceof CRLDistributionPointsExtension) {
      extCRLDistributionPoints = ext;
    }
  });
  let keyIdentifier = void 0;
  if (extAuthorityKeyID && extAuthorityKeyID.keyId) {
    keyIdentifier = extAuthorityKeyID.keyId;
  } else if (extSubjectKeyID) {
    keyIdentifier = extSubjectKeyID.keyId;
  }
  if (keyIdentifier) {
    const cached = cacheRevokedCerts[keyIdentifier];
    if (cached) {
      const now = /* @__PURE__ */ new Date();
      if (!cached.nextUpdate || cached.nextUpdate > now) {
        return cached.revokedCerts.indexOf(cert.serialNumber) >= 0;
      }
    }
  }
  const crlURL = extCRLDistributionPoints?.distributionPoints?.[0].distributionPoint?.fullName?.[0].uniformResourceIdentifier;
  if (!crlURL) {
    return false;
  }
  let certListBytes;
  try {
    const respCRL = await fetch$1(crlURL);
    certListBytes = await respCRL.arrayBuffer();
  } catch (_err) {
    return false;
  }
  let data;
  try {
    data = new X509Crl(certListBytes);
  } catch (_err) {
    return false;
  }
  const newCached = {
    revokedCerts: [],
    nextUpdate: void 0
  };
  if (data.nextUpdate) {
    newCached.nextUpdate = data.nextUpdate;
  }
  const revokedCerts = data.entries;
  if (revokedCerts) {
    for (const cert2 of revokedCerts) {
      const revokedHex = cert2.serialNumber;
      newCached.revokedCerts.push(revokedHex);
    }
    if (keyIdentifier) {
      cacheRevokedCerts[keyIdentifier] = newCached;
    }
    return newCached.revokedCerts.indexOf(cert.serialNumber) >= 0;
  }
  return false;
}
function decodeAuthenticatorExtensions(extensionData) {
  let toCBOR;
  try {
    toCBOR = decodeFirst(extensionData);
  } catch (err) {
    const _err = err;
    throw new Error(`Error decoding authenticator extensions: ${_err.message}`);
  }
  return convertMapToObjectDeep(toCBOR);
}
function convertMapToObjectDeep(input) {
  const mapped = {};
  for (const [key2, value] of input) {
    if (value instanceof Map) {
      mapped[key2] = convertMapToObjectDeep(value);
    } else {
      mapped[key2] = value;
    }
  }
  return mapped;
}
function parseAuthenticatorData(authData) {
  if (authData.byteLength < 37) {
    throw new Error(`Authenticator data was ${authData.byteLength} bytes, expected at least 37 bytes`);
  }
  let pointer = 0;
  const dataView = toDataView(authData);
  const rpIdHash = authData.slice(pointer, pointer += 32);
  const flagsBuf = authData.slice(pointer, pointer += 1);
  const flagsInt = flagsBuf[0];
  const flags = {
    up: !!(flagsInt & 1 << 0),
    // User Presence
    uv: !!(flagsInt & 1 << 2),
    // User Verified
    be: !!(flagsInt & 1 << 3),
    // Backup Eligibility
    bs: !!(flagsInt & 1 << 4),
    // Backup State
    at: !!(flagsInt & 1 << 6),
    // Attested Credential Data Present
    ed: !!(flagsInt & 1 << 7),
    // Extension Data Present
    flagsInt
  };
  const counterBuf = authData.slice(pointer, pointer + 4);
  const counter = dataView.getUint32(pointer, false);
  pointer += 4;
  let aaguid = void 0;
  let credentialID = void 0;
  let credentialPublicKey = void 0;
  if (flags.at) {
    aaguid = authData.slice(pointer, pointer += 16);
    const credIDLen = dataView.getUint16(pointer);
    pointer += 2;
    credentialID = authData.slice(pointer, pointer += credIDLen);
    const badEdDSACBOR = fromHex("a301634f4b500327206745643235353139");
    const bytesAtCurrentPosition = authData.slice(pointer, pointer + badEdDSACBOR.byteLength);
    let foundBadCBOR = false;
    if (areEqual(badEdDSACBOR, bytesAtCurrentPosition)) {
      foundBadCBOR = true;
      authData[pointer] = 164;
    }
    const firstDecoded = decodeFirst(authData.slice(pointer));
    const firstEncoded = Uint8Array.from(
      /**
       * Casting to `Map` via `as unknown` here because TS doesn't make it possible to define Maps
       * with discrete keys and properties with known types per pair, and CBOR libs typically parse
       * CBOR Major Type 5 to `Map` because you can have numbers for keys. A `COSEPublicKey` can be
       * generalized as "a Map with numbers for keys and either numbers or bytes for values" though.
       * If this presumption falls apart then other parts of verification later on will fail so we
       * should be safe doing this here.
       */
      encode$1(firstDecoded)
    );
    if (foundBadCBOR) {
      authData[pointer] = 163;
    }
    credentialPublicKey = firstEncoded;
    pointer += firstEncoded.byteLength;
  }
  let extensionsData = void 0;
  let extensionsDataBuffer = void 0;
  if (flags.ed) {
    const firstDecoded = decodeFirst(authData.slice(pointer));
    extensionsDataBuffer = Uint8Array.from(encode$1(firstDecoded));
    extensionsData = decodeAuthenticatorExtensions(extensionsDataBuffer);
    pointer += extensionsDataBuffer.byteLength;
  }
  if (authData.byteLength > pointer) {
    throw new Error("Leftover bytes detected while parsing authenticator data");
  }
  return _parseAuthenticatorDataInternals.stubThis({
    rpIdHash,
    flagsBuf,
    flags,
    counter,
    counterBuf,
    aaguid,
    credentialID,
    credentialPublicKey,
    extensionsData,
    extensionsDataBuffer
  });
}
const _parseAuthenticatorDataInternals = {
  stubThis: (value) => value
};
function toHash(data, algorithm = -7) {
  if (typeof data === "string") {
    data = fromUTF8String(data);
  }
  const digest$12 = digest(data, algorithm);
  return digest$12;
}
async function validateCertificatePath(x5cCertsPEM, trustAnchorsPEM = []) {
  if (trustAnchorsPEM.length === 0) {
    return true;
  }
  const x5cCertsParsed = x5cCertsPEM.map((certPEM) => new X509Certificate(certPEM));
  for (let i = 0; i < x5cCertsParsed.length; i++) {
    const cert = x5cCertsParsed[i];
    const certPEM = x5cCertsPEM[i];
    try {
      await assertCertNotRevoked(cert);
    } catch (_err) {
      throw new Error(`Found revoked certificate in x5c:
${certPEM}`);
    }
    try {
      assertCertIsWithinValidTimeWindow(cert.notBefore, cert.notAfter);
    } catch (_err) {
      throw new Error(`Found certificate out of validity period in x5c:
${certPEM}`);
    }
  }
  const trustAnchorsParsed = trustAnchorsPEM.map((certPEM) => {
    try {
      return new X509Certificate(certPEM);
    } catch (err) {
      const _err = err;
      throw new Error(`Could not parse trust anchor certificate:
${certPEM}`, { cause: _err });
    }
  });
  const validTrustAnchors = [];
  for (let i = 0; i < trustAnchorsParsed.length; i++) {
    const cert = trustAnchorsParsed[i];
    try {
      await assertCertNotRevoked(cert);
    } catch (_err) {
      continue;
    }
    try {
      assertCertIsWithinValidTimeWindow(cert.notBefore, cert.notAfter);
    } catch (_err) {
      continue;
    }
    validTrustAnchors.push(cert);
  }
  if (validTrustAnchors.length === 0) {
    throw new Error("No specified trust anchor was valid for verifying x5c");
  }
  let invalidCertificateChain = true;
  for (const anchor of validTrustAnchors) {
    try {
      const x5cWithTrustAnchor = x5cCertsParsed.concat([anchor]);
      const numUniqueCerts = new Set(x5cWithTrustAnchor.map((cert) => cert.toString("pem"))).size;
      if (numUniqueCerts !== x5cWithTrustAnchor.length) {
        throw new Error("Invalid certificate path: found duplicate certificates");
      }
      const x5cLeafCert = x5cCertsParsed[0];
      let x5cIntermediates = [];
      if (x5cCertsParsed.length > 1) {
        x5cIntermediates = x5cCertsParsed.slice(1);
      }
      const chainBuilder = new X509ChainBuilder({ certificates: [...x5cIntermediates, anchor] });
      const chain = await chainBuilder.build(x5cLeafCert);
      if (chain.length < numUniqueCerts) {
        continue;
      }
      if (chain[chain.length - 1].subject !== anchor.subject) {
        continue;
      }
      invalidCertificateChain = false;
      break;
    } catch (err) {
      throw new Error("Unexpected error while validating certificate path", { cause: err });
    }
  }
  if (invalidCertificateChain) {
    throw new InvalidCertificatePath();
  }
  return true;
}
async function assertCertNotRevoked(certificate) {
  const subjectCertRevoked = await isCertRevoked(certificate);
  if (subjectCertRevoked) {
    throw new Error("Found revoked certificate in certificate path");
  }
}
function assertCertIsWithinValidTimeWindow(certNotBefore, certNotAfter) {
  const now = new Date(Date.now());
  if (certNotBefore > now || certNotAfter < now) {
    throw new Error("Certificate is not yet valid or expired");
  }
}
class InvalidCertificatePath extends Error {
  constructor() {
    const message = "x5c could not be chained to any specified trust anchor";
    super(message);
    this.name = "InvalidX5CChain";
  }
}
function mapX509SignatureAlgToCOSEAlg(signatureAlgorithm) {
  let alg;
  if (signatureAlgorithm === "1.2.840.10045.4.3.2") {
    alg = COSEALG.ES256;
  } else if (signatureAlgorithm === "1.2.840.10045.4.3.3") {
    alg = COSEALG.ES384;
  } else if (signatureAlgorithm === "1.2.840.10045.4.3.4") {
    alg = COSEALG.ES512;
  } else if (signatureAlgorithm === "1.2.840.113549.1.1.11") {
    alg = COSEALG.RS256;
  } else if (signatureAlgorithm === "1.2.840.113549.1.1.12") {
    alg = COSEALG.RS384;
  } else if (signatureAlgorithm === "1.2.840.113549.1.1.13") {
    alg = COSEALG.RS512;
  } else if (signatureAlgorithm === "1.2.840.113549.1.1.5") {
    alg = COSEALG.RS1;
  } else {
    throw new Error(`Unable to map X.509 signature algorithm ${signatureAlgorithm} to a COSE algorithm`);
  }
  return alg;
}
function convertX509PublicKeyToCOSE(x509Certificate) {
  let cosePublicKey = /* @__PURE__ */ new Map();
  const x509 = AsnParser.parse(x509Certificate, Certificate);
  const { tbsCertificate } = x509;
  const { subjectPublicKeyInfo, signature: _tbsSignature } = tbsCertificate;
  const signatureAlgorithm = _tbsSignature.algorithm;
  const publicKeyAlgorithmID = subjectPublicKeyInfo.algorithm.algorithm;
  if (publicKeyAlgorithmID === id_ecPublicKey) {
    if (!subjectPublicKeyInfo.algorithm.parameters) {
      throw new Error("Certificate public key was missing parameters (EC2)");
    }
    const ecParameters = AsnParser.parse(new Uint8Array(subjectPublicKeyInfo.algorithm.parameters), ECParameters);
    let crv = -999;
    const { namedCurve } = ecParameters;
    if (namedCurve === id_secp256r1) {
      crv = COSECRV.P256;
    } else if (namedCurve === id_secp384r1) {
      crv = COSECRV.P384;
    } else {
      throw new Error(`Certificate public key contained unexpected namedCurve ${namedCurve} (EC2)`);
    }
    const subjectPublicKey = new Uint8Array(subjectPublicKeyInfo.subjectPublicKey);
    let x;
    let y;
    if (subjectPublicKey[0] === 4) {
      let pointer = 1;
      const halfLength = (subjectPublicKey.length - 1) / 2;
      x = subjectPublicKey.slice(pointer, pointer += halfLength);
      y = subjectPublicKey.slice(pointer);
    } else {
      throw new Error('TODO: Figure out how to handle public keys in "compressed form"');
    }
    const coseEC2PubKey = /* @__PURE__ */ new Map();
    coseEC2PubKey.set(COSEKEYS.kty, COSEKTY.EC2);
    coseEC2PubKey.set(COSEKEYS.alg, mapX509SignatureAlgToCOSEAlg(signatureAlgorithm));
    coseEC2PubKey.set(COSEKEYS.crv, crv);
    coseEC2PubKey.set(COSEKEYS.x, x);
    coseEC2PubKey.set(COSEKEYS.y, y);
    cosePublicKey = coseEC2PubKey;
  } else if (publicKeyAlgorithmID === id_rsaEncryption) {
    const rsaPublicKey = AsnParser.parse(subjectPublicKeyInfo.subjectPublicKey, RSAPublicKey);
    const coseRSAPubKey = /* @__PURE__ */ new Map();
    coseRSAPubKey.set(COSEKEYS.kty, COSEKTY.RSA);
    coseRSAPubKey.set(COSEKEYS.alg, mapX509SignatureAlgToCOSEAlg(signatureAlgorithm));
    coseRSAPubKey.set(COSEKEYS.n, new Uint8Array(rsaPublicKey.modulus));
    coseRSAPubKey.set(COSEKEYS.e, new Uint8Array(rsaPublicKey.publicExponent));
    cosePublicKey = coseRSAPubKey;
  } else {
    throw new Error(`Certificate public key contained unexpected algorithm ID ${publicKeyAlgorithmID}`);
  }
  return cosePublicKey;
}
function verifySignature(opts) {
  const { signature, data, credentialPublicKey, x509Certificate, hashAlgorithm } = opts;
  if (!x509Certificate && !credentialPublicKey) {
    throw new Error('Must declare either "leafCert" or "credentialPublicKey"');
  }
  if (x509Certificate && credentialPublicKey) {
    throw new Error('Must not declare both "leafCert" and "credentialPublicKey"');
  }
  let cosePublicKey = /* @__PURE__ */ new Map();
  if (credentialPublicKey) {
    cosePublicKey = decodeCredentialPublicKey(credentialPublicKey);
  } else if (x509Certificate) {
    cosePublicKey = convertX509PublicKeyToCOSE(x509Certificate);
  }
  return _verifySignatureInternals.stubThis(verify({
    cosePublicKey,
    signature,
    data,
    shaHashOverride: hashAlgorithm
  }));
}
const _verifySignatureInternals = {
  stubThis: (value) => value
};
function parseJWT(jwt) {
  const parts = jwt.split(".");
  return [
    JSON.parse(toUTF8String$1(parts[0])),
    JSON.parse(toUTF8String$1(parts[1])),
    parts[2]
  ];
}
function verifyJWT(jwt, leafCert) {
  const [header, payload, signature] = jwt.split(".");
  const certCOSE = convertX509PublicKeyToCOSE(leafCert);
  const data = fromUTF8String(`${header}.${payload}`);
  const signatureBytes = toBuffer(signature);
  if (isCOSEPublicKeyEC2(certCOSE)) {
    return verifyEC2({
      data,
      signature: signatureBytes,
      cosePublicKey: certCOSE,
      shaHashOverride: COSEALG.ES256
    });
  } else if (isCOSEPublicKeyRSA(certCOSE)) {
    return verifyRSA({
      data,
      signature: signatureBytes,
      cosePublicKey: certCOSE
    });
  }
  const kty = certCOSE.get(COSEKEYS.kty);
  throw new Error(`JWT verification with public key of kty ${kty} is not supported by this method`);
}
function convertPEMToBytes(pem) {
  const certBase64 = pem.replace("-----BEGIN CERTIFICATE-----", "").replace("-----END CERTIFICATE-----", "").replace(/[\n ]/g, "");
  return toBuffer(certBase64, "base64");
}
const GlobalSign_Root_CA = `-----BEGIN CERTIFICATE-----
MIIDdTCCAl2gAwIBAgILBAAAAAABFUtaw5QwDQYJKoZIhvcNAQEFBQAwVzELMAkG
A1UEBhMCQkUxGTAXBgNVBAoTEEdsb2JhbFNpZ24gbnYtc2ExEDAOBgNVBAsTB1Jv
b3QgQ0ExGzAZBgNVBAMTEkdsb2JhbFNpZ24gUm9vdCBDQTAeFw05ODA5MDExMjAw
MDBaFw0yODAxMjgxMjAwMDBaMFcxCzAJBgNVBAYTAkJFMRkwFwYDVQQKExBHbG9i
YWxTaWduIG52LXNhMRAwDgYDVQQLEwdSb290IENBMRswGQYDVQQDExJHbG9iYWxT
aWduIFJvb3QgQ0EwggEiMA0GCSqGSIb3DQEBAQUAA4IBDwAwggEKAoIBAQDaDuaZ
jc6j40+Kfvvxi4Mla+pIH/EqsLmVEQS98GPR4mdmzxzdzxtIK+6NiY6arymAZavp
xy0Sy6scTHAHoT0KMM0VjU/43dSMUBUc71DuxC73/OlS8pF94G3VNTCOXkNz8kHp
1Wrjsok6Vjk4bwY8iGlbKk3Fp1S4bInMm/k8yuX9ifUSPJJ4ltbcdG6TRGHRjcdG
snUOhugZitVtbNV4FpWi6cgKOOvyJBNPc1STE4U6G7weNLWLBYy5d4ux2x8gkasJ
U26Qzns3dLlwR5EiUWMWea6xrkEmCMgZK9FGqkjWZCrXgzT/LCrBbBlDSgeF59N8
9iFo7+ryUp9/k5DPAgMBAAGjQjBAMA4GA1UdDwEB/wQEAwIBBjAPBgNVHRMBAf8E
BTADAQH/MB0GA1UdDgQWBBRge2YaRQ2XyolQL30EzTSo//z9SzANBgkqhkiG9w0B
AQUFAAOCAQEA1nPnfE920I2/7LqivjTFKDK1fPxsnCwrvQmeU79rXqoRSLblCKOz
yj1hTdNGCbM+w6DjY1Ub8rrvrTnhQ7k4o+YviiY776BQVvnGCv04zcQLcFGUl5gE
38NflNUVyRRBnMRddWQVDf9VMOyGj/8N7yy5Y0b2qvzfvGn9LhJIZJrglfCm7ymP
AbEVtQwdpf5pLGkkeB6zpxxxYu7KyJesF12KwvhHhm4qxFYxldBniYUr+WymXUad
DKqC5JlR3XC321Y9YeRq4VzW9v493kHMB65jUr9TU/Qr6cf9tveCX4XSQRjbgbME
HMUfpIBvFSDJ3gyICh3WZlXi/EjJKSZp4A==
-----END CERTIFICATE-----
`;
const Google_Hardware_Attestation_Root_1 = `-----BEGIN CERTIFICATE-----
MIIFYDCCA0igAwIBAgIJAOj6GWMU0voYMA0GCSqGSIb3DQEBCwUAMBsxGTAXBgNV
BAUTEGY5MjAwOWU4NTNiNmIwNDUwHhcNMTYwNTI2MTYyODUyWhcNMjYwNTI0MTYy
ODUyWjAbMRkwFwYDVQQFExBmOTIwMDllODUzYjZiMDQ1MIICIjANBgkqhkiG9w0B
AQEFAAOCAg8AMIICCgKCAgEAr7bHgiuxpwHsK7Qui8xUFmOr75gvMsd/dTEDDJdS
Sxtf6An7xyqpRR90PL2abxM1dEqlXnf2tqw1Ne4Xwl5jlRfdnJLmN0pTy/4lj4/7
tv0Sk3iiKkypnEUtR6WfMgH0QZfKHM1+di+y9TFRtv6y//0rb+T+W8a9nsNL/ggj
nar86461qO0rOs2cXjp3kOG1FEJ5MVmFmBGtnrKpa73XpXyTqRxB/M0n1n/W9nGq
C4FSYa04T6N5RIZGBN2z2MT5IKGbFlbC8UrW0DxW7AYImQQcHtGl/m00QLVWutHQ
oVJYnFPlXTcHYvASLu+RhhsbDmxMgJJ0mcDpvsC4PjvB+TxywElgS70vE0XmLD+O
JtvsBslHZvPBKCOdT0MS+tgSOIfga+z1Z1g7+DVagf7quvmag8jfPioyKvxnK/Eg
sTUVi2ghzq8wm27ud/mIM7AY2qEORR8Go3TVB4HzWQgpZrt3i5MIlCaY504LzSRi
igHCzAPlHws+W0rB5N+er5/2pJKnfBSDiCiFAVtCLOZ7gLiMm0jhO2B6tUXHI/+M
RPjy02i59lINMRRev56GKtcd9qO/0kUJWdZTdA2XoS82ixPvZtXQpUpuL12ab+9E
aDK8Z4RHJYYfCT3Q5vNAXaiWQ+8PTWm2QgBR/bkwSWc+NpUFgNPN9PvQi8WEg5Um
AGMCAwEAAaOBpjCBozAdBgNVHQ4EFgQUNmHhAHyIBQlRi0RsR/8aTMnqTxIwHwYD
VR0jBBgwFoAUNmHhAHyIBQlRi0RsR/8aTMnqTxIwDwYDVR0TAQH/BAUwAwEB/zAO
BgNVHQ8BAf8EBAMCAYYwQAYDVR0fBDkwNzA1oDOgMYYvaHR0cHM6Ly9hbmRyb2lk
Lmdvb2dsZWFwaXMuY29tL2F0dGVzdGF0aW9uL2NybC8wDQYJKoZIhvcNAQELBQAD
ggIBACDIw41L3KlXG0aMiS//cqrG+EShHUGo8HNsw30W1kJtjn6UBwRM6jnmiwfB
Pb8VA91chb2vssAtX2zbTvqBJ9+LBPGCdw/E53Rbf86qhxKaiAHOjpvAy5Y3m00m
qC0w/Zwvju1twb4vhLaJ5NkUJYsUS7rmJKHHBnETLi8GFqiEsqTWpG/6ibYCv7rY
DBJDcR9W62BW9jfIoBQcxUCUJouMPH25lLNcDc1ssqvC2v7iUgI9LeoM1sNovqPm
QUiG9rHli1vXxzCyaMTjwftkJLkf6724DFhuKug2jITV0QkXvaJWF4nUaHOTNA4u
JU9WDvZLI1j83A+/xnAJUucIv/zGJ1AMH2boHqF8CY16LpsYgBt6tKxxWH00XcyD
CdW2KlBCeqbQPcsFmWyWugxdcekhYsAWyoSf818NUsZdBWBaR/OukXrNLfkQ79Iy
ZohZbvabO/X+MVT3rriAoKc8oE2Uws6DF+60PV7/WIPjNvXySdqspImSN78mflxD
qwLqRBYkA3I75qppLGG9rp7UCdRjxMl8ZDBld+7yvHVgt1cVzJx9xnyGCC23Uaic
MDSXYrB4I4WHXPGjxhZuCuPBLTdOLU8YRvMYdEvYebWHMpvwGCF6bAx3JBpIeOQ1
wDB5y0USicV3YgYGmi+NZfhA4URSh77Yd6uuJOJENRaNVTzk
-----END CERTIFICATE-----
`;
const Google_Hardware_Attestation_Root_2 = `-----BEGIN CERTIFICATE-----
MIIFHDCCAwSgAwIBAgIJANUP8luj8tazMA0GCSqGSIb3DQEBCwUAMBsxGTAXBgNV
BAUTEGY5MjAwOWU4NTNiNmIwNDUwHhcNMTkxMTIyMjAzNzU4WhcNMzQxMTE4MjAz
NzU4WjAbMRkwFwYDVQQFExBmOTIwMDllODUzYjZiMDQ1MIICIjANBgkqhkiG9w0B
AQEFAAOCAg8AMIICCgKCAgEAr7bHgiuxpwHsK7Qui8xUFmOr75gvMsd/dTEDDJdS
Sxtf6An7xyqpRR90PL2abxM1dEqlXnf2tqw1Ne4Xwl5jlRfdnJLmN0pTy/4lj4/7
tv0Sk3iiKkypnEUtR6WfMgH0QZfKHM1+di+y9TFRtv6y//0rb+T+W8a9nsNL/ggj
nar86461qO0rOs2cXjp3kOG1FEJ5MVmFmBGtnrKpa73XpXyTqRxB/M0n1n/W9nGq
C4FSYa04T6N5RIZGBN2z2MT5IKGbFlbC8UrW0DxW7AYImQQcHtGl/m00QLVWutHQ
oVJYnFPlXTcHYvASLu+RhhsbDmxMgJJ0mcDpvsC4PjvB+TxywElgS70vE0XmLD+O
JtvsBslHZvPBKCOdT0MS+tgSOIfga+z1Z1g7+DVagf7quvmag8jfPioyKvxnK/Eg
sTUVi2ghzq8wm27ud/mIM7AY2qEORR8Go3TVB4HzWQgpZrt3i5MIlCaY504LzSRi
igHCzAPlHws+W0rB5N+er5/2pJKnfBSDiCiFAVtCLOZ7gLiMm0jhO2B6tUXHI/+M
RPjy02i59lINMRRev56GKtcd9qO/0kUJWdZTdA2XoS82ixPvZtXQpUpuL12ab+9E
aDK8Z4RHJYYfCT3Q5vNAXaiWQ+8PTWm2QgBR/bkwSWc+NpUFgNPN9PvQi8WEg5Um
AGMCAwEAAaNjMGEwHQYDVR0OBBYEFDZh4QB8iAUJUYtEbEf/GkzJ6k8SMB8GA1Ud
IwQYMBaAFDZh4QB8iAUJUYtEbEf/GkzJ6k8SMA8GA1UdEwEB/wQFMAMBAf8wDgYD
VR0PAQH/BAQDAgIEMA0GCSqGSIb3DQEBCwUAA4ICAQBOMaBc8oumXb2voc7XCWnu
XKhBBK3e2KMGz39t7lA3XXRe2ZLLAkLM5y3J7tURkf5a1SutfdOyXAmeE6SRo83U
h6WszodmMkxK5GM4JGrnt4pBisu5igXEydaW7qq2CdC6DOGjG+mEkN8/TA6p3cno
L/sPyz6evdjLlSeJ8rFBH6xWyIZCbrcpYEJzXaUOEaxxXxgYz5/cTiVKN2M1G2ok
QBUIYSY6bjEL4aUN5cfo7ogP3UvliEo3Eo0YgwuzR2v0KR6C1cZqZJSTnghIC/vA
D32KdNQ+c3N+vl2OTsUVMC1GiWkngNx1OO1+kXW+YTnnTUOtOIswUP/Vqd5SYgAI
mMAfY8U9/iIgkQj6T2W6FsScy94IN9fFhE1UtzmLoBIuUFsVXJMTz+Jucth+IqoW
Fua9v1R93/k98p41pjtFX+H8DslVgfP097vju4KDlqN64xV1grw3ZLl4CiOe/A91
oeLm2UHOq6wn3esB4r2EIQKb6jTVGu5sYCcdWpXr0AUVqcABPdgL+H7qJguBw09o
jm6xNIrw2OocrDKsudk/okr/AwqEyPKw9WnMlQgLIKw1rODG2NvU9oR3GVGdMkUB
ZutL8VuFkERQGt6vQ2OCw0sV47VMkuYbacK/xyZFiRcrPJPb41zgbQj9XAEyLKCH
ex0SdDrx+tWUDqG8At2JHA==
-----END CERTIFICATE-----
`;
const Google_Hardware_Attestation_Root_3 = `
-----BEGIN CERTIFICATE-----
MIIFHDCCAwSgAwIBAgIJAMNrfES5rhgxMA0GCSqGSIb3DQEBCwUAMBsxGTAXBgNV
BAUTEGY5MjAwOWU4NTNiNmIwNDUwHhcNMjExMTE3MjMxMDQyWhcNMzYxMTEzMjMx
MDQyWjAbMRkwFwYDVQQFExBmOTIwMDllODUzYjZiMDQ1MIICIjANBgkqhkiG9w0B
AQEFAAOCAg8AMIICCgKCAgEAr7bHgiuxpwHsK7Qui8xUFmOr75gvMsd/dTEDDJdS
Sxtf6An7xyqpRR90PL2abxM1dEqlXnf2tqw1Ne4Xwl5jlRfdnJLmN0pTy/4lj4/7
tv0Sk3iiKkypnEUtR6WfMgH0QZfKHM1+di+y9TFRtv6y//0rb+T+W8a9nsNL/ggj
nar86461qO0rOs2cXjp3kOG1FEJ5MVmFmBGtnrKpa73XpXyTqRxB/M0n1n/W9nGq
C4FSYa04T6N5RIZGBN2z2MT5IKGbFlbC8UrW0DxW7AYImQQcHtGl/m00QLVWutHQ
oVJYnFPlXTcHYvASLu+RhhsbDmxMgJJ0mcDpvsC4PjvB+TxywElgS70vE0XmLD+O
JtvsBslHZvPBKCOdT0MS+tgSOIfga+z1Z1g7+DVagf7quvmag8jfPioyKvxnK/Eg
sTUVi2ghzq8wm27ud/mIM7AY2qEORR8Go3TVB4HzWQgpZrt3i5MIlCaY504LzSRi
igHCzAPlHws+W0rB5N+er5/2pJKnfBSDiCiFAVtCLOZ7gLiMm0jhO2B6tUXHI/+M
RPjy02i59lINMRRev56GKtcd9qO/0kUJWdZTdA2XoS82ixPvZtXQpUpuL12ab+9E
aDK8Z4RHJYYfCT3Q5vNAXaiWQ+8PTWm2QgBR/bkwSWc+NpUFgNPN9PvQi8WEg5Um
AGMCAwEAAaNjMGEwHQYDVR0OBBYEFDZh4QB8iAUJUYtEbEf/GkzJ6k8SMB8GA1Ud
IwQYMBaAFDZh4QB8iAUJUYtEbEf/GkzJ6k8SMA8GA1UdEwEB/wQFMAMBAf8wDgYD
VR0PAQH/BAQDAgIEMA0GCSqGSIb3DQEBCwUAA4ICAQBTNNZe5cuf8oiq+jV0itTG
zWVhSTjOBEk2FQvh11J3o3lna0o7rd8RFHnN00q4hi6TapFhh4qaw/iG6Xg+xOan
63niLWIC5GOPFgPeYXM9+nBb3zZzC8ABypYuCusWCmt6Tn3+Pjbz3MTVhRGXuT/T
QH4KGFY4PhvzAyXwdjTOCXID+aHud4RLcSySr0Fq/L+R8TWalvM1wJJPhyRjqRCJ
erGtfBagiALzvhnmY7U1qFcS0NCnKjoO7oFedKdWlZz0YAfu3aGCJd4KHT0MsGiL
Zez9WP81xYSrKMNEsDK+zK5fVzw6jA7cxmpXcARTnmAuGUeI7VVDhDzKeVOctf3a
0qQLwC+d0+xrETZ4r2fRGNw2YEs2W8Qj6oDcfPvq9JySe7pJ6wcHnl5EZ0lwc4xH
7Y4Dx9RA1JlfooLMw3tOdJZH0enxPXaydfAD3YifeZpFaUzicHeLzVJLt9dvGB0b
HQLE4+EqKFgOZv2EoP686DQqbVS1u+9k0p2xbMA105TBIk7npraa8VM0fnrRKi7w
lZKwdH+aNAyhbXRW9xsnODJ+g8eF452zvbiKKngEKirK5LGieoXBX7tZ9D1GNBH2
Ob3bKOwwIWdEFle/YF/h6zWgdeoaNGDqVBrLr2+0DtWoiB1aDEjLWl9FmyIUyUm7
mD/vFDkzF+wm7cyWpQpCVQ==
-----END CERTIFICATE-----
`;
const Google_Hardware_Attestation_Root_4 = `
-----BEGIN CERTIFICATE-----
MIIFHDCCAwSgAwIBAgIJAPHBcqaZ6vUdMA0GCSqGSIb3DQEBCwUAMBsxGTAXBgNV
BAUTEGY5MjAwOWU4NTNiNmIwNDUwHhcNMjIwMzIwMTgwNzQ4WhcNNDIwMzE1MTgw
NzQ4WjAbMRkwFwYDVQQFExBmOTIwMDllODUzYjZiMDQ1MIICIjANBgkqhkiG9w0B
AQEFAAOCAg8AMIICCgKCAgEAr7bHgiuxpwHsK7Qui8xUFmOr75gvMsd/dTEDDJdS
Sxtf6An7xyqpRR90PL2abxM1dEqlXnf2tqw1Ne4Xwl5jlRfdnJLmN0pTy/4lj4/7
tv0Sk3iiKkypnEUtR6WfMgH0QZfKHM1+di+y9TFRtv6y//0rb+T+W8a9nsNL/ggj
nar86461qO0rOs2cXjp3kOG1FEJ5MVmFmBGtnrKpa73XpXyTqRxB/M0n1n/W9nGq
C4FSYa04T6N5RIZGBN2z2MT5IKGbFlbC8UrW0DxW7AYImQQcHtGl/m00QLVWutHQ
oVJYnFPlXTcHYvASLu+RhhsbDmxMgJJ0mcDpvsC4PjvB+TxywElgS70vE0XmLD+O
JtvsBslHZvPBKCOdT0MS+tgSOIfga+z1Z1g7+DVagf7quvmag8jfPioyKvxnK/Eg
sTUVi2ghzq8wm27ud/mIM7AY2qEORR8Go3TVB4HzWQgpZrt3i5MIlCaY504LzSRi
igHCzAPlHws+W0rB5N+er5/2pJKnfBSDiCiFAVtCLOZ7gLiMm0jhO2B6tUXHI/+M
RPjy02i59lINMRRev56GKtcd9qO/0kUJWdZTdA2XoS82ixPvZtXQpUpuL12ab+9E
aDK8Z4RHJYYfCT3Q5vNAXaiWQ+8PTWm2QgBR/bkwSWc+NpUFgNPN9PvQi8WEg5Um
AGMCAwEAAaNjMGEwHQYDVR0OBBYEFDZh4QB8iAUJUYtEbEf/GkzJ6k8SMB8GA1Ud
IwQYMBaAFDZh4QB8iAUJUYtEbEf/GkzJ6k8SMA8GA1UdEwEB/wQFMAMBAf8wDgYD
VR0PAQH/BAQDAgIEMA0GCSqGSIb3DQEBCwUAA4ICAQB8cMqTllHc8U+qCrOlg3H7
174lmaCsbo/bJ0C17JEgMLb4kvrqsXZs01U3mB/qABg/1t5Pd5AORHARs1hhqGIC
W/nKMav574f9rZN4PC2ZlufGXb7sIdJpGiO9ctRhiLuYuly10JccUZGEHpHSYM2G
tkgYbZba6lsCPYAAP83cyDV+1aOkTf1RCp/lM0PKvmxYN10RYsK631jrleGdcdkx
oSK//mSQbgcWnmAEZrzHoF1/0gso1HZgIn0YLzVhLSA/iXCX4QT2h3J5z3znluKG
1nv8NQdxei2DIIhASWfu804CA96cQKTTlaae2fweqXjdN1/v2nqOhngNyz1361mF
mr4XmaKH/ItTwOe72NI9ZcwS1lVaCvsIkTDCEXdm9rCNPAY10iTunIHFXRh+7KPz
lHGewCq/8TOohBRn0/NNfh7uRslOSZ/xKbN9tMBtw37Z8d2vvnXq/YWdsm1+JLVw
n6yYD/yacNJBlwpddla8eaVMjsF6nBnIgQOf9zKSe06nSTqvgwUHosgOECZJZ1Eu
zbH4yswbt02tKtKEFhx+v+OTge/06V+jGsqTWLsfrOCNLuA8H++z+pUENmpqnnHo
vaI47gC+TNpkgYGkkBT6B/m/U01BuOBBTzhIlMEZq9qkDWuM2cA5kW5V3FJUcfHn
w1IdYIg2Wxg7yHcQZemFQg==
-----END CERTIFICATE-----
`;
const Apple_WebAuthn_Root_CA = `-----BEGIN CERTIFICATE-----
MIICEjCCAZmgAwIBAgIQaB0BbHo84wIlpQGUKEdXcTAKBggqhkjOPQQDAzBLMR8w
HQYDVQQDDBZBcHBsZSBXZWJBdXRobiBSb290IENBMRMwEQYDVQQKDApBcHBsZSBJ
bmMuMRMwEQYDVQQIDApDYWxpZm9ybmlhMB4XDTIwMDMxODE4MjEzMloXDTQ1MDMx
NTAwMDAwMFowSzEfMB0GA1UEAwwWQXBwbGUgV2ViQXV0aG4gUm9vdCBDQTETMBEG
A1UECgwKQXBwbGUgSW5jLjETMBEGA1UECAwKQ2FsaWZvcm5pYTB2MBAGByqGSM49
AgEGBSuBBAAiA2IABCJCQ2pTVhzjl4Wo6IhHtMSAzO2cv+H9DQKev3//fG59G11k
xu9eI0/7o6V5uShBpe1u6l6mS19S1FEh6yGljnZAJ+2GNP1mi/YK2kSXIuTHjxA/
pcoRf7XkOtO4o1qlcaNCMEAwDwYDVR0TAQH/BAUwAwEB/zAdBgNVHQ4EFgQUJtdk
2cV4wlpn0afeaxLQG2PxxtcwDgYDVR0PAQH/BAQDAgEGMAoGCCqGSM49BAMDA2cA
MGQCMFrZ+9DsJ1PW9hfNdBywZDsWDbWFp28it1d/5w2RPkRX3Bbn/UbDTNLx7Jr3
jAGGiQIwHFj+dJZYUJR786osByBelJYsVZd2GbHQu209b5RCmGQ21gpSAk9QZW4B
1bWeT0vT
-----END CERTIFICATE-----
`;
const GlobalSign_Root_CA_R3 = `-----BEGIN CERTIFICATE-----
MIIDXzCCAkegAwIBAgILBAAAAAABIVhTCKIwDQYJKoZIhvcNAQELBQAwTDEgMB4G
A1UECxMXR2xvYmFsU2lnbiBSb290IENBIC0gUjMxEzARBgNVBAoTCkdsb2JhbFNp
Z24xEzARBgNVBAMTCkdsb2JhbFNpZ24wHhcNMDkwMzE4MTAwMDAwWhcNMjkwMzE4
MTAwMDAwWjBMMSAwHgYDVQQLExdHbG9iYWxTaWduIFJvb3QgQ0EgLSBSMzETMBEG
A1UEChMKR2xvYmFsU2lnbjETMBEGA1UEAxMKR2xvYmFsU2lnbjCCASIwDQYJKoZI
hvcNAQEBBQADggEPADCCAQoCggEBAMwldpB5BngiFvXAg7aEyiie/QV2EcWtiHL8
RgJDx7KKnQRfJMsuS+FggkbhUqsMgUdwbN1k0ev1LKMPgj0MK66X17YUhhB5uzsT
gHeMCOFJ0mpiLx9e+pZo34knlTifBtc+ycsmWQ1z3rDI6SYOgxXG71uL0gRgykmm
KPZpO/bLyCiR5Z2KYVc3rHQU3HTgOu5yLy6c+9C7v/U9AOEGM+iCK65TpjoWc4zd
QQ4gOsC0p6Hpsk+QLjJg6VfLuQSSaGjlOCZgdbKfd/+RFO+uIEn8rUAVSNECMWEZ
XriX7613t2Saer9fwRPvm2L7DWzgVGkWqQPabumDk3F2xmmFghcCAwEAAaNCMEAw
DgYDVR0PAQH/BAQDAgEGMA8GA1UdEwEB/wQFMAMBAf8wHQYDVR0OBBYEFI/wS3+o
LkUkrk1Q+mOai97i3Ru8MA0GCSqGSIb3DQEBCwUAA4IBAQBLQNvAUKr+yAzv95ZU
RUm7lgAJQayzE4aGKAczymvmdLm6AC2upArT9fHxD4q/c2dKg8dEe3jgr25sbwMp
jjM5RcOO5LlXbKr8EpbsU8Yt5CRsuZRj+9xTaGdWPoO4zzUhw8lo/s7awlOqzJCK
6fBdRoyV3XpYKBovHd7NADdBj+1EbddTKJd+82cEHhXXipa0095MJ6RMG3NzdvQX
mcIfeg7jLQitChws/zyrVQ4PkX4268NXSb7hLi18YIvDQVETI53O9zJrlAGomecs
Mx86OyXShkDOOyyGeMlhLxS67ttVb9+E7gUJTb0o2HLO02JQZR7rkpeDMdmztcpH
WD9f
-----END CERTIFICATE-----
 `;
class BaseSettingsService {
  constructor() {
    Object.defineProperty(this, "pemCertificates", {
      enumerable: true,
      configurable: true,
      writable: true,
      value: void 0
    });
    this.pemCertificates = /* @__PURE__ */ new Map();
  }
  setRootCertificates(opts) {
    const { identifier, certificates } = opts;
    const newCertificates = [];
    for (const cert of certificates) {
      if (cert instanceof Uint8Array) {
        newCertificates.push(convertCertBufferToPEM(cert));
      } else {
        newCertificates.push(cert);
      }
    }
    this.pemCertificates.set(identifier, newCertificates);
  }
  getRootCertificates(opts) {
    const { identifier } = opts;
    return this.pemCertificates.get(identifier) ?? [];
  }
}
const SettingsService = new BaseSettingsService();
SettingsService.setRootCertificates({
  identifier: "android-key",
  certificates: [
    Google_Hardware_Attestation_Root_1,
    Google_Hardware_Attestation_Root_2,
    Google_Hardware_Attestation_Root_3,
    Google_Hardware_Attestation_Root_4
  ]
});
SettingsService.setRootCertificates({
  identifier: "android-safetynet",
  certificates: [GlobalSign_Root_CA]
});
SettingsService.setRootCertificates({
  identifier: "apple",
  certificates: [Apple_WebAuthn_Root_CA]
});
SettingsService.setRootCertificates({
  identifier: "mds",
  certificates: [GlobalSign_Root_CA_R3]
});
async function verifyMDSBlob(blob) {
  const parsedJWT = parseJWT(blob);
  const header = parsedJWT[0];
  const payload = parsedJWT[1];
  const headerCertsPEM = header.x5c.map(convertCertBufferToPEM);
  try {
    const rootCerts = SettingsService.getRootCertificates({
      identifier: "mds"
    });
    await validateCertificatePath(headerCertsPEM, rootCerts);
  } catch (error) {
    const _error = error;
    throw new Error("BLOB certificate path could not be validated", { cause: _error });
  }
  const leafCert = headerCertsPEM[0];
  const verified = await verifyJWT(blob, convertPEMToBytes(leafCert));
  if (!verified) {
    throw new Error("BLOB signature could not be verified");
  }
  const statements = [];
  for (const entry of payload.entries) {
    if (entry.aaguid && entry.metadataStatement) {
      statements.push(entry.metadataStatement);
    }
  }
  const [year, month, day] = payload.nextUpdate.split("-");
  const parsedNextUpdate = new Date(
    parseInt(year, 10),
    // Months need to be zero-indexed
    parseInt(month, 10) - 1,
    parseInt(day, 10)
  );
  return {
    statements,
    parsedNextUpdate,
    payload
  };
}
async function verifyOKP(opts) {
  const { cosePublicKey, signature, data } = opts;
  const WebCrypto = await getWebCrypto();
  const alg = cosePublicKey.get(COSEKEYS.alg);
  const crv = cosePublicKey.get(COSEKEYS.crv);
  const x = cosePublicKey.get(COSEKEYS.x);
  if (!alg) {
    throw new Error("Public key was missing alg (OKP)");
  }
  if (!isCOSEAlg(alg)) {
    throw new Error(`Public key had invalid alg ${alg} (OKP)`);
  }
  if (!crv) {
    throw new Error("Public key was missing crv (OKP)");
  }
  if (!x) {
    throw new Error("Public key was missing x (OKP)");
  }
  let _crv;
  if (crv === COSECRV.ED25519) {
    _crv = "Ed25519";
  } else {
    throw new Error(`Unexpected COSE crv value of ${crv} (OKP)`);
  }
  const keyData = {
    kty: "OKP",
    crv: _crv,
    alg: "EdDSA",
    x: fromBuffer(x),
    ext: false
  };
  const keyAlgorithm = {
    name: _crv,
    namedCurve: _crv
  };
  const key2 = await importKey({
    keyData,
    algorithm: keyAlgorithm
  });
  const verifyAlgorithm = {
    name: _crv
  };
  return WebCrypto.subtle.verify(verifyAlgorithm, key2, signature, data);
}
function unwrapEC2Signature(signature, crv) {
  const parsedSignature = AsnParser.parse(signature, ECDSASigValue);
  const rBytes = new Uint8Array(parsedSignature.r);
  const sBytes = new Uint8Array(parsedSignature.s);
  const componentLength = getSignatureComponentLength(crv);
  const rNormalizedBytes = toNormalizedBytes(rBytes, componentLength);
  const sNormalizedBytes = toNormalizedBytes(sBytes, componentLength);
  const finalSignature = concat([
    rNormalizedBytes,
    sNormalizedBytes
  ]);
  return finalSignature;
}
function getSignatureComponentLength(crv) {
  switch (crv) {
    case COSECRV.P256:
      return 32;
    case COSECRV.P384:
      return 48;
    case COSECRV.P521:
      return 66;
    default:
      throw new Error(`Unexpected COSE crv value of ${crv} (EC2)`);
  }
}
function toNormalizedBytes(bytes, componentLength) {
  let normalizedBytes;
  if (bytes.length < componentLength) {
    normalizedBytes = new Uint8Array(componentLength);
    normalizedBytes.set(bytes, componentLength - bytes.length);
  } else if (bytes.length === componentLength) {
    normalizedBytes = bytes;
  } else if (bytes.length === componentLength + 1 && bytes[0] === 0 && (bytes[1] & 128) === 128) {
    normalizedBytes = bytes.subarray(1);
  } else {
    throw new Error(`Invalid signature component length ${bytes.length}, expected ${componentLength}`);
  }
  return normalizedBytes;
}
function verify(opts) {
  const { cosePublicKey, signature, data, shaHashOverride } = opts;
  if (isCOSEPublicKeyEC2(cosePublicKey)) {
    const crv = cosePublicKey.get(COSEKEYS.crv);
    if (!isCOSECrv(crv)) {
      throw new Error(`unknown COSE curve ${crv}`);
    }
    const unwrappedSignature = unwrapEC2Signature(signature, crv);
    return verifyEC2({
      cosePublicKey,
      signature: unwrappedSignature,
      data,
      shaHashOverride
    });
  } else if (isCOSEPublicKeyRSA(cosePublicKey)) {
    return verifyRSA({ cosePublicKey, signature, data, shaHashOverride });
  } else if (isCOSEPublicKeyOKP(cosePublicKey)) {
    return verifyOKP({ cosePublicKey, signature, data });
  }
  const kty = cosePublicKey.get(COSEKEYS.kty);
  throw new Error(`Signature verification with public key of kty ${kty} is not supported by this method`);
}
function areEqual(array1, array2) {
  if (array1.length != array2.length) {
    return false;
  }
  return array1.every((val, i) => val === array2[i]);
}
function toHex(array) {
  const hexParts = Array.from(array, (i) => i.toString(16).padStart(2, "0"));
  return hexParts.join("");
}
function fromHex(hex) {
  const isValid = hex.length !== 0 && hex.length % 2 === 0 && !/[^a-fA-F0-9]/u.test(hex);
  if (!isValid) {
    throw new Error("Invalid hex string");
  }
  const byteStrings = hex.match(/.{1,2}/g) ?? [];
  return Uint8Array.from(byteStrings.map((byte) => parseInt(byte, 16)));
}
function concat(arrays) {
  let pointer = 0;
  const totalLength = arrays.reduce((prev, curr) => prev + curr.length, 0);
  const toReturn = new Uint8Array(totalLength);
  arrays.forEach((arr) => {
    toReturn.set(arr, pointer);
    pointer += arr.length;
  });
  return toReturn;
}
function toUTF8String(array) {
  const decoder = new globalThis.TextDecoder("utf-8");
  return decoder.decode(array);
}
function fromUTF8String(utf8String) {
  const encoder = new globalThis.TextEncoder();
  return encoder.encode(utf8String);
}
function fromASCIIString(value) {
  return Uint8Array.from(value.split("").map((x) => x.charCodeAt(0)));
}
function toDataView(array) {
  return new DataView(array.buffer, array.byteOffset, array.length);
}
async function generateChallenge() {
  const challenge = new Uint8Array(32);
  await getRandomValues(challenge);
  return _generateChallengeInternals.stubThis(challenge);
}
const _generateChallengeInternals = {
  stubThis: (value) => value
};
const supportedCOSEAlgorithmIdentifiers = [
  // EdDSA (In first position to encourage authenticators to use this over ES256)
  -8,
  // ECDSA w/ SHA-256
  -7,
  // ECDSA w/ SHA-512
  -36,
  // RSASSA-PSS w/ SHA-256
  -37,
  // RSASSA-PSS w/ SHA-384
  -38,
  // RSASSA-PSS w/ SHA-512
  -39,
  // RSASSA-PKCS1-v1_5 w/ SHA-256
  -257,
  // RSASSA-PKCS1-v1_5 w/ SHA-384
  -258,
  // RSASSA-PKCS1-v1_5 w/ SHA-512
  -259,
  // RSASSA-PKCS1-v1_5 w/ SHA-1 (Deprecated; here for legacy support)
  -65535
];
const defaultAuthenticatorSelection = {
  residentKey: "preferred",
  userVerification: "preferred"
};
const defaultSupportedAlgorithmIDs = [-8, -7, -257];
async function generateRegistrationOptions(options) {
  const { rpName, rpID, userName, userID, challenge = await generateChallenge(), userDisplayName = "", timeout = 6e4, attestationType = "none", excludeCredentials = [], authenticatorSelection = defaultAuthenticatorSelection, extensions, supportedAlgorithmIDs = defaultSupportedAlgorithmIDs, preferredAuthenticatorType } = options;
  const pubKeyCredParams = supportedAlgorithmIDs.map((id) => ({
    alg: id,
    type: "public-key"
  }));
  if (authenticatorSelection.residentKey === void 0) {
    if (authenticatorSelection.requireResidentKey) {
      authenticatorSelection.residentKey = "required";
    }
  } else {
    authenticatorSelection.requireResidentKey = authenticatorSelection.residentKey === "required";
  }
  let _challenge = challenge;
  if (typeof _challenge === "string") {
    _challenge = fromUTF8String(_challenge);
  }
  if (typeof userID === "string") {
    throw new Error(`String values for \`userID\` are no longer supported. See https://simplewebauthn.dev/docs/advanced/server/custom-user-ids`);
  }
  let _userID = userID;
  if (!_userID) {
    _userID = await generateUserID();
  }
  const hints = [];
  if (preferredAuthenticatorType) {
    if (preferredAuthenticatorType === "securityKey") {
      hints.push("security-key");
      authenticatorSelection.authenticatorAttachment = "cross-platform";
    } else if (preferredAuthenticatorType === "localDevice") {
      hints.push("client-device");
      authenticatorSelection.authenticatorAttachment = "platform";
    } else if (preferredAuthenticatorType === "remoteDevice") {
      hints.push("hybrid");
      authenticatorSelection.authenticatorAttachment = "cross-platform";
    }
  }
  return {
    challenge: fromBuffer(_challenge),
    rp: {
      name: rpName,
      id: rpID
    },
    user: {
      id: fromBuffer(_userID),
      name: userName,
      displayName: userDisplayName
    },
    pubKeyCredParams,
    timeout,
    attestation: attestationType,
    excludeCredentials: excludeCredentials.map((cred) => {
      if (!isBase64URL(cred.id)) {
        throw new Error(`excludeCredential id "${cred.id}" is not a valid base64url string`);
      }
      return {
        ...cred,
        id: trimPadding(cred.id),
        type: "public-key"
      };
    }),
    authenticatorSelection,
    extensions: {
      ...extensions,
      credProps: true
    },
    hints
  };
}
function parseBackupFlags({ be, bs }) {
  const credentialBackedUp = bs;
  let credentialDeviceType = "singleDevice";
  if (be) {
    credentialDeviceType = "multiDevice";
  }
  if (credentialDeviceType === "singleDevice" && credentialBackedUp) {
    throw new InvalidBackupFlags("Single-device credential indicated that it was backed up, which should be impossible.");
  }
  return { credentialDeviceType, credentialBackedUp };
}
class InvalidBackupFlags extends Error {
  constructor(message) {
    super(message);
    this.name = "InvalidBackupFlags";
  }
}
async function matchExpectedRPID(rpIDHash, expectedRPIDs) {
  try {
    const matchedRPID = await Promise.any(expectedRPIDs.map((expected) => {
      return new Promise((resolve, reject) => {
        toHash(fromASCIIString(expected)).then((expectedRPIDHash) => {
          if (areEqual(rpIDHash, expectedRPIDHash)) {
            resolve(expected);
          } else {
            reject();
          }
        });
      });
    }));
    return matchedRPID;
  } catch (err) {
    const _err = err;
    if (_err.name === "AggregateError") {
      throw new UnexpectedRPIDHash();
    }
    throw err;
  }
}
class UnexpectedRPIDHash extends Error {
  constructor() {
    const message = "Unexpected RP ID hash";
    super(message);
    this.name = "UnexpectedRPIDHash";
  }
}
async function verifyAttestationFIDOU2F(options) {
  const { attStmt, clientDataHash, rpIdHash, credentialID, credentialPublicKey, aaguid, rootCertificates } = options;
  const reservedByte = Uint8Array.from([0]);
  const publicKey = convertCOSEtoPKCS(credentialPublicKey);
  const signatureBase = concat([
    reservedByte,
    rpIdHash,
    clientDataHash,
    credentialID,
    publicKey
  ]);
  const sig = attStmt.get("sig");
  const x5c = attStmt.get("x5c");
  if (!x5c) {
    throw new Error("No attestation certificate provided in attestation statement (FIDOU2F)");
  }
  if (!sig) {
    throw new Error("No attestation signature provided in attestation statement (FIDOU2F)");
  }
  const aaguidToHex = Number.parseInt(toHex(aaguid), 16);
  if (aaguidToHex !== 0) {
    throw new Error(`AAGUID "${aaguidToHex}" was not expected value`);
  }
  try {
    await validateCertificatePath(x5c.map(convertCertBufferToPEM), rootCertificates);
  } catch (err) {
    const _err = err;
    throw new Error(`${_err.message} (FIDOU2F)`);
  }
  return verifySignature({
    signature: sig,
    data: signatureBase,
    x509Certificate: x5c[0],
    hashAlgorithm: COSEALG.ES256
  });
}
const id_fido_gen_ce_aaguid = "1.3.6.1.4.1.45724.1.1.4";
function validateExtFIDOGenCEAAGUID(certExtensions, aaguid) {
  if (!certExtensions) {
    return true;
  }
  const extFIDOGenCEAAGUID = certExtensions.find((ext) => ext.extnID === id_fido_gen_ce_aaguid);
  if (!extFIDOGenCEAAGUID) {
    return true;
  }
  const parsedExtFIDOGenCEAAGUID = AsnParser.parse(extFIDOGenCEAAGUID.extnValue, OctetString2);
  const extValue = new Uint8Array(parsedExtFIDOGenCEAAGUID.buffer);
  const aaguidAndExtAreEqual = areEqual(aaguid, extValue);
  if (!aaguidAndExtAreEqual) {
    const _debugExtHex = toHex(extValue);
    const _debugAAGUIDHex = toHex(aaguid);
    throw new Error(`Certificate extension id-fido-gen-ce-aaguid (${id_fido_gen_ce_aaguid}) value of "${_debugExtHex}" was present but not equal to attestation statement AAGUID value of "${_debugAAGUIDHex}"`);
  }
  return true;
}
function getLogger(_name) {
  return (_message, ..._rest) => {
  };
}
const NonRefreshingMDS = {
  url: ""
};
const defaultURLMDS = "https://mds.fidoalliance.org/";
var SERVICE_STATE;
(function(SERVICE_STATE2) {
  SERVICE_STATE2[SERVICE_STATE2["DISABLED"] = 0] = "DISABLED";
  SERVICE_STATE2[SERVICE_STATE2["REFRESHING"] = 1] = "REFRESHING";
  SERVICE_STATE2[SERVICE_STATE2["READY"] = 2] = "READY";
})(SERVICE_STATE || (SERVICE_STATE = {}));
const log = getLogger();
class BaseMetadataService {
  constructor() {
    Object.defineProperty(this, "mdsCache", {
      enumerable: true,
      configurable: true,
      writable: true,
      value: {}
    });
    Object.defineProperty(this, "statementCache", {
      enumerable: true,
      configurable: true,
      writable: true,
      value: {}
    });
    Object.defineProperty(this, "state", {
      enumerable: true,
      configurable: true,
      writable: true,
      value: SERVICE_STATE.DISABLED
    });
    Object.defineProperty(this, "verificationMode", {
      enumerable: true,
      configurable: true,
      writable: true,
      value: "strict"
    });
  }
  async initialize(opts = {}) {
    this.statementCache = {};
    const { mdsServers = [defaultURLMDS], statements, verificationMode } = opts;
    this.setState(SERVICE_STATE.REFRESHING);
    if (statements?.length) {
      let statementsAdded = 0;
      statements.forEach((statement) => {
        if (statement.aaguid) {
          this.statementCache[statement.aaguid] = {
            entry: {
              metadataStatement: statement,
              statusReports: [],
              timeOfLastStatusChange: "1970-01-01"
            },
            url: NonRefreshingMDS.url
          };
          statementsAdded += 1;
        }
      });
      log(`Cached ${statementsAdded} local statements`);
    }
    if (mdsServers?.length) {
      const currentCacheCount = Object.keys(this.statementCache).length;
      let numServers = mdsServers.length;
      for (const url of mdsServers) {
        try {
          const cachedMDS = {
            url,
            no: 0,
            nextUpdate: /* @__PURE__ */ new Date(0)
          };
          const blob = await this.downloadBlob(cachedMDS);
          await this.verifyBlob(blob, cachedMDS);
        } catch (err) {
          log(`Could not download BLOB from ${url}:`, err);
          numServers -= 1;
        }
      }
      const newCacheCount = Object.keys(this.statementCache).length;
      const cacheDiff = newCacheCount - currentCacheCount;
      log(`Cached ${cacheDiff} statements from ${numServers} metadata server(s)`);
    }
    if (verificationMode) {
      this.verificationMode = verificationMode;
    }
    this.setState(SERVICE_STATE.READY);
  }
  async getStatement(aaguid) {
    if (this.state === SERVICE_STATE.DISABLED) {
      return;
    }
    if (!aaguid) {
      return;
    }
    if (aaguid instanceof Uint8Array) {
      aaguid = convertAAGUIDToString(aaguid);
    }
    await this.pauseUntilReady();
    const cachedStatement = this.statementCache[aaguid];
    if (!cachedStatement) {
      if (this.verificationMode === "strict") {
        throw new Error(`No metadata statement found for aaguid "${aaguid}"`);
      }
      return;
    }
    if (cachedStatement.url) {
      const mds = this.mdsCache[cachedStatement.url];
      const now = /* @__PURE__ */ new Date();
      if (now > mds.nextUpdate) {
        try {
          this.setState(SERVICE_STATE.REFRESHING);
          const blob = await this.downloadBlob(mds);
          await this.verifyBlob(blob, mds);
        } finally {
          this.setState(SERVICE_STATE.READY);
        }
      }
    }
    const { entry } = cachedStatement;
    for (const report of entry.statusReports) {
      const { status } = report;
      if (status === "USER_VERIFICATION_BYPASS" || status === "ATTESTATION_KEY_COMPROMISE" || status === "USER_KEY_REMOTE_COMPROMISE" || status === "USER_KEY_PHYSICAL_COMPROMISE") {
        throw new Error(`Detected compromised aaguid "${aaguid}"`);
      }
    }
    return entry.metadataStatement;
  }
  /**
   * Download and process the latest BLOB from MDS
   */
  async downloadBlob(cachedMDS) {
    const { url } = cachedMDS;
    const resp = await fetch$1(url);
    const data = await resp.text();
    return data;
  }
  /**
   * Verify and process the MDS metadata blob
   */
  async verifyBlob(blob, cachedMDS) {
    const { url, no } = cachedMDS;
    const { payload, parsedNextUpdate } = await verifyMDSBlob(blob);
    if (payload.no <= no) {
      throw new Error(`Latest BLOB no. ${payload.no} is not greater than previous no. ${no}`);
    }
    for (const entry of payload.entries) {
      if (entry.aaguid) {
        this.statementCache[entry.aaguid] = { entry, url };
      }
    }
    if (url) {
      this.mdsCache[url] = {
        ...cachedMDS,
        // Store the payload `no` to make sure we're getting the next BLOB in the sequence
        no: payload.no,
        // Remember when we need to refresh this blob
        nextUpdate: parsedNextUpdate
      };
    } else {
      if (parsedNextUpdate < /* @__PURE__ */ new Date()) {
        log(`⚠️ This MDS blob (serial: ${payload.no}) contains stale data as of ${parsedNextUpdate.toISOString()}. Please consider re-initializing MetadataService with a newer MDS blob.`);
      }
    }
  }
  /**
   * A helper method to pause execution until the service is ready
   */
  pauseUntilReady() {
    if (this.state === SERVICE_STATE.READY) {
      return new Promise((resolve) => {
        resolve();
      });
    }
    const readyPromise = new Promise((resolve, reject) => {
      const totalTimeoutMS = 7e4;
      const intervalMS = 100;
      let iterations = totalTimeoutMS / intervalMS;
      const intervalID = globalThis.setInterval(() => {
        if (iterations < 1) {
          clearInterval(intervalID);
          reject(`State did not become ready in ${totalTimeoutMS / 1e3} seconds`);
        } else if (this.state === SERVICE_STATE.READY) {
          clearInterval(intervalID);
          resolve();
        }
        iterations -= 1;
      }, intervalMS);
    });
    return readyPromise;
  }
  /**
   * Report service status on change
   */
  setState(newState) {
    this.state = newState;
    if (newState === SERVICE_STATE.DISABLED) {
      log("MetadataService is DISABLED");
    } else if (newState === SERVICE_STATE.REFRESHING) {
      log("MetadataService is REFRESHING");
    } else if (newState === SERVICE_STATE.READY) {
      log("MetadataService is READY");
    }
  }
}
const MetadataService = new BaseMetadataService();
async function verifyAttestationWithMetadata({ statement, credentialPublicKey, x5c, attestationStatementAlg }) {
  const { authenticationAlgorithms, authenticatorGetInfo, attestationRootCertificates } = statement;
  const keypairCOSEAlgs = /* @__PURE__ */ new Set();
  authenticationAlgorithms.forEach((algSign) => {
    const algSignCOSEINFO = algSignToCOSEInfoMap[algSign];
    if (algSignCOSEINFO) {
      keypairCOSEAlgs.add(algSignCOSEINFO);
    }
  });
  const decodedPublicKey = decodeCredentialPublicKey(credentialPublicKey);
  const kty = decodedPublicKey.get(COSEKEYS.kty);
  const alg = decodedPublicKey.get(COSEKEYS.alg);
  if (!kty) {
    throw new Error("Credential public key was missing kty");
  }
  if (!alg) {
    throw new Error("Credential public key was missing alg");
  }
  if (!kty) {
    throw new Error("Credential public key was missing kty");
  }
  const publicKeyCOSEInfo = { kty, alg };
  if (isCOSEPublicKeyEC2(decodedPublicKey)) {
    const crv = decodedPublicKey.get(COSEKEYS.crv);
    publicKeyCOSEInfo.crv = crv;
  }
  let foundMatch = false;
  for (const keypairAlg of keypairCOSEAlgs) {
    if (keypairAlg.alg === publicKeyCOSEInfo.alg && keypairAlg.kty === publicKeyCOSEInfo.kty) {
      if ((keypairAlg.kty === COSEKTY.EC2 || keypairAlg.kty === COSEKTY.OKP) && keypairAlg.crv === publicKeyCOSEInfo.crv) {
        foundMatch = true;
      } else {
        foundMatch = true;
      }
    }
    if (foundMatch) {
      break;
    }
  }
  if (!foundMatch) {
    const debugMDSAlgs = authenticationAlgorithms.map((algSign) => `'${algSign}' (COSE info: ${stringifyCOSEInfo(algSignToCOSEInfoMap[algSign])})`);
    const strMDSAlgs = JSON.stringify(debugMDSAlgs, null, 2).replace(/"/g, "");
    const strPubKeyAlg = stringifyCOSEInfo(publicKeyCOSEInfo);
    throw new Error(`Public key parameters ${strPubKeyAlg} did not match any of the following metadata algorithms:
${strMDSAlgs}`);
  }
  if (attestationStatementAlg !== void 0 && authenticatorGetInfo?.algorithms !== void 0) {
    const getInfoAlgs = authenticatorGetInfo.algorithms.map((_alg) => _alg.alg);
    if (getInfoAlgs.indexOf(attestationStatementAlg) < 0) {
      throw new Error(`Attestation statement alg ${attestationStatementAlg} did not match one of ${getInfoAlgs}`);
    }
  }
  const authenticatorCerts = x5c.map(convertCertBufferToPEM);
  const statementRootCerts = attestationRootCertificates.map(convertCertBufferToPEM);
  let authenticatorIsSelfReferencing = false;
  if (authenticatorCerts.length === 1 && statementRootCerts.indexOf(authenticatorCerts[0]) >= 0) {
    authenticatorIsSelfReferencing = true;
  }
  if (!authenticatorIsSelfReferencing) {
    try {
      await validateCertificatePath(authenticatorCerts, statementRootCerts);
    } catch (err) {
      const _err = err;
      throw new Error(`Could not validate certificate path with any metadata root certificates: ${_err.message}`);
    }
  }
  return true;
}
const algSignToCOSEInfoMap = {
  secp256r1_ecdsa_sha256_raw: { kty: 2, alg: -7, crv: 1 },
  secp256r1_ecdsa_sha256_der: { kty: 2, alg: -7, crv: 1 },
  rsassa_pss_sha256_raw: { kty: 3, alg: -37 },
  rsassa_pss_sha256_der: { kty: 3, alg: -37 },
  secp256k1_ecdsa_sha256_raw: { kty: 2, alg: -47, crv: 8 },
  secp256k1_ecdsa_sha256_der: { kty: 2, alg: -47, crv: 8 },
  rsassa_pss_sha384_raw: { kty: 3, alg: -38 },
  rsassa_pkcsv15_sha256_raw: { kty: 3, alg: -257 },
  rsassa_pkcsv15_sha384_raw: { kty: 3, alg: -258 },
  rsassa_pkcsv15_sha512_raw: { kty: 3, alg: -259 },
  rsassa_pkcsv15_sha1_raw: { kty: 3, alg: -65535 },
  secp384r1_ecdsa_sha384_raw: { kty: 2, alg: -35, crv: 2 },
  secp512r1_ecdsa_sha256_raw: { kty: 2, alg: -36, crv: 3 },
  ed25519_eddsa_sha512_raw: { kty: 1, alg: -8, crv: 6 }
};
function stringifyCOSEInfo(info) {
  const { kty, alg, crv } = info;
  let toReturn = "";
  if (kty !== COSEKTY.RSA) {
    toReturn = `{ kty: ${kty}, alg: ${alg}, crv: ${crv} }`;
  } else {
    toReturn = `{ kty: ${kty}, alg: ${alg} }`;
  }
  return toReturn;
}
async function verifyAttestationPacked(options) {
  const { attStmt, clientDataHash, authData, credentialPublicKey, aaguid, rootCertificates } = options;
  const sig = attStmt.get("sig");
  const x5c = attStmt.get("x5c");
  const alg = attStmt.get("alg");
  if (!sig) {
    throw new Error("No attestation signature provided in attestation statement (Packed)");
  }
  if (!alg) {
    throw new Error("Attestation statement did not contain alg (Packed)");
  }
  if (!isCOSEAlg(alg)) {
    throw new Error(`Attestation statement contained invalid alg ${alg} (Packed)`);
  }
  const signatureBase = concat([authData, clientDataHash]);
  let verified = false;
  if (x5c) {
    const { subject, basicConstraintsCA, version, notBefore, notAfter, parsedCertificate } = getCertificateInfo(x5c[0]);
    const { OU, CN, O, C } = subject;
    if (OU !== "Authenticator Attestation") {
      throw new Error('Certificate OU was not "Authenticator Attestation" (Packed|Full)');
    }
    if (!CN) {
      throw new Error("Certificate CN was empty (Packed|Full)");
    }
    if (!O) {
      throw new Error("Certificate O was empty (Packed|Full)");
    }
    if (!C || C.length !== 2) {
      throw new Error("Certificate C was not two-character ISO 3166 code (Packed|Full)");
    }
    if (basicConstraintsCA) {
      throw new Error("Certificate basic constraints CA was not `false` (Packed|Full)");
    }
    if (version !== 2) {
      throw new Error("Certificate version was not `3` (ASN.1 value of 2) (Packed|Full)");
    }
    let now = /* @__PURE__ */ new Date();
    if (notBefore > now) {
      throw new Error(`Certificate not good before "${notBefore.toString()}" (Packed|Full)`);
    }
    now = /* @__PURE__ */ new Date();
    if (notAfter < now) {
      throw new Error(`Certificate not good after "${notAfter.toString()}" (Packed|Full)`);
    }
    try {
      await validateExtFIDOGenCEAAGUID(parsedCertificate.tbsCertificate.extensions, aaguid);
    } catch (err) {
      const _err = err;
      throw new Error(`${_err.message} (Packed|Full)`);
    }
    const statement = await MetadataService.getStatement(aaguid);
    if (statement) {
      if (statement.attestationTypes.indexOf("basic_full") < 0) {
        throw new Error("Metadata does not indicate support for full attestations (Packed|Full)");
      }
      try {
        await verifyAttestationWithMetadata({
          statement,
          credentialPublicKey,
          x5c,
          attestationStatementAlg: alg
        });
      } catch (err) {
        const _err = err;
        throw new Error(`${_err.message} (Packed|Full)`);
      }
    } else {
      try {
        await validateCertificatePath(x5c.map(convertCertBufferToPEM), rootCertificates);
      } catch (err) {
        const _err = err;
        throw new Error(`${_err.message} (Packed|Full)`);
      }
    }
    verified = await verifySignature({
      signature: sig,
      data: signatureBase,
      x509Certificate: x5c[0],
      hashAlgorithm: alg
    });
  } else {
    verified = await verifySignature({
      signature: sig,
      data: signatureBase,
      credentialPublicKey,
      hashAlgorithm: alg
    });
  }
  return verified;
}
async function verifyAttestationAndroidSafetyNet(options) {
  const { attStmt, clientDataHash, authData, aaguid, rootCertificates, verifyTimestampMS = true, credentialPublicKey, attestationSafetyNetEnforceCTSCheck } = options;
  const alg = attStmt.get("alg");
  const response = attStmt.get("response");
  const ver = attStmt.get("ver");
  if (!ver) {
    throw new Error("No ver value in attestation (SafetyNet)");
  }
  if (!response) {
    throw new Error("No response was included in attStmt by authenticator (SafetyNet)");
  }
  const jwt = toUTF8String(response);
  const jwtParts = jwt.split(".");
  const HEADER = JSON.parse(toUTF8String$1(jwtParts[0]));
  const PAYLOAD = JSON.parse(toUTF8String$1(jwtParts[1]));
  const SIGNATURE = jwtParts[2];
  const { nonce, ctsProfileMatch, timestampMs } = PAYLOAD;
  if (verifyTimestampMS) {
    let now = Date.now();
    if (timestampMs > Date.now()) {
      throw new Error(`Payload timestamp "${timestampMs}" was later than "${now}" (SafetyNet)`);
    }
    const timestampPlusDelay = timestampMs + 60 * 1e3;
    now = Date.now();
    if (timestampPlusDelay < now) {
      throw new Error(`Payload timestamp "${timestampPlusDelay}" has expired (SafetyNet)`);
    }
  }
  const nonceBase = concat([authData, clientDataHash]);
  const nonceBuffer = await toHash(nonceBase);
  const expectedNonce = fromBuffer(nonceBuffer, "base64");
  if (nonce !== expectedNonce) {
    throw new Error("Could not verify payload nonce (SafetyNet)");
  }
  if (attestationSafetyNetEnforceCTSCheck && !ctsProfileMatch) {
    throw new Error("Could not verify device integrity (SafetyNet)");
  }
  const leafCertBuffer = toBuffer(HEADER.x5c[0], "base64");
  const leafCertInfo = getCertificateInfo(leafCertBuffer);
  const { subject } = leafCertInfo;
  if (subject.CN !== "attest.android.com") {
    throw new Error('Certificate common name was not "attest.android.com" (SafetyNet)');
  }
  const statement = await MetadataService.getStatement(aaguid);
  if (statement) {
    try {
      await verifyAttestationWithMetadata({
        statement,
        credentialPublicKey,
        x5c: HEADER.x5c,
        attestationStatementAlg: alg
      });
    } catch (err) {
      const _err = err;
      throw new Error(`${_err.message} (SafetyNet)`);
    }
  } else {
    try {
      await validateCertificatePath(HEADER.x5c.map(convertCertBufferToPEM), rootCertificates);
    } catch (err) {
      const _err = err;
      throw new Error(`${_err.message} (SafetyNet)`);
    }
  }
  const signatureBaseBuffer = fromUTF8String(`${jwtParts[0]}.${jwtParts[1]}`);
  const signatureBuffer = toBuffer(SIGNATURE);
  const verified = await verifySignature({
    signature: signatureBuffer,
    data: signatureBaseBuffer,
    x509Certificate: leafCertBuffer,
    hashAlgorithm: alg
  });
  return verified;
}
const TPM_ST = {
  196: "TPM_ST_RSP_COMMAND",
  32768: "TPM_ST_NULL",
  32769: "TPM_ST_NO_SESSIONS",
  32770: "TPM_ST_SESSIONS",
  32788: "TPM_ST_ATTEST_NV",
  32789: "TPM_ST_ATTEST_COMMAND_AUDIT",
  32790: "TPM_ST_ATTEST_SESSION_AUDIT",
  32791: "TPM_ST_ATTEST_CERTIFY",
  32792: "TPM_ST_ATTEST_QUOTE",
  32793: "TPM_ST_ATTEST_TIME",
  32794: "TPM_ST_ATTEST_CREATION",
  32801: "TPM_ST_CREATION",
  32802: "TPM_ST_VERIFIED",
  32803: "TPM_ST_AUTH_SECRET",
  32804: "TPM_ST_HASHCHECK",
  32805: "TPM_ST_AUTH_SIGNED",
  32809: "TPM_ST_FU_MANIFEST"
};
const TPM_ALG = {
  0: "TPM_ALG_ERROR",
  1: "TPM_ALG_RSA",
  4: "TPM_ALG_SHA",
  // @ts-ignore 2300
  4: "TPM_ALG_SHA1",
  5: "TPM_ALG_HMAC",
  6: "TPM_ALG_AES",
  7: "TPM_ALG_MGF1",
  8: "TPM_ALG_KEYEDHASH",
  10: "TPM_ALG_XOR",
  11: "TPM_ALG_SHA256",
  12: "TPM_ALG_SHA384",
  13: "TPM_ALG_SHA512",
  16: "TPM_ALG_NULL",
  18: "TPM_ALG_SM3_256",
  19: "TPM_ALG_SM4",
  20: "TPM_ALG_RSASSA",
  21: "TPM_ALG_RSAES",
  22: "TPM_ALG_RSAPSS",
  23: "TPM_ALG_OAEP",
  24: "TPM_ALG_ECDSA",
  25: "TPM_ALG_ECDH",
  26: "TPM_ALG_ECDAA",
  27: "TPM_ALG_SM2",
  28: "TPM_ALG_ECSCHNORR",
  29: "TPM_ALG_ECMQV",
  32: "TPM_ALG_KDF1_SP800_56A",
  33: "TPM_ALG_KDF2",
  34: "TPM_ALG_KDF1_SP800_108",
  35: "TPM_ALG_ECC",
  37: "TPM_ALG_SYMCIPHER",
  38: "TPM_ALG_CAMELLIA",
  64: "TPM_ALG_CTR",
  65: "TPM_ALG_OFB",
  66: "TPM_ALG_CBC",
  67: "TPM_ALG_CFB",
  68: "TPM_ALG_ECB"
};
const TPM_ECC_CURVE = {
  0: "TPM_ECC_NONE",
  1: "TPM_ECC_NIST_P192",
  2: "TPM_ECC_NIST_P224",
  3: "TPM_ECC_NIST_P256",
  4: "TPM_ECC_NIST_P384",
  5: "TPM_ECC_NIST_P521",
  16: "TPM_ECC_BN_P256",
  17: "TPM_ECC_BN_P638",
  32: "TPM_ECC_SM2_P256"
};
const TPM_MANUFACTURERS = {
  "id:414D4400": { name: "AMD", id: "AMD" },
  "id:414E5400": { name: "Ant Group", id: "ANT" },
  "id:41544D4C": { name: "Atmel", id: "ATML" },
  "id:4252434D": { name: "Broadcom", id: "BRCM" },
  "id:4353434F": { name: "Cisco", id: "CSCO" },
  "id:464C5953": { name: "Flyslice Technologies", id: "FLYS" },
  "id:524F4343": { name: "Fuzhou Rockchip", id: "ROCC" },
  "id:474F4F47": { name: "Google", id: "GOOG" },
  "id:48504900": { name: "HPI", id: "HPI" },
  "id:48504500": { name: "HPE", id: "HPE" },
  "id:48495349": { name: "Huawei", id: "HISI" },
  "id:49424d00": { name: "IBM", id: "IBM" },
  "id:49424D00": { name: "IBM", id: "IBM" },
  // Same ID for IBM as above, except the "D" is capitalized as per TPM spec
  "id:49465800": { name: "Infineon", id: "IFX" },
  "id:494E5443": { name: "Intel", id: "INTC" },
  "id:4C454E00": { name: "Lenovo", id: "LEN" },
  "id:4D534654": { name: "Microsoft", id: "MSFT" },
  "id:4E534D20": { name: "National Semiconductor", id: "NSM" },
  "id:4E545A00": { name: "Nationz", id: "NTZ" },
  "id:4E534700": { name: "NSING", id: "NSG" },
  "id:4E544300": { name: "Nuvoton Technology", id: "NTC" },
  "id:51434F4D": { name: "Qualcomm", id: "QCOM" },
  "id:534D534E": { name: "Samsung", id: "SMSN" },
  "id:53454345": { name: "SecEdge", id: "SECE" },
  "id:534E5300": { name: "Sinosun", id: "SNS" },
  "id:534D5343": { name: "SMSC", id: "SMSC" },
  "id:53544D20": { name: "STMicroelectronics", id: "STM" },
  "id:54584E00": { name: "Texas Instruments", id: "TXN" },
  "id:57454300": { name: "Winbond", id: "WEC" },
  "id:5345414C": { name: "Wisekey", id: "SEAL" },
  "id:FFFFF1D0": { name: "FIDO Alliance", id: "FIDO" }
  // FIDO Conformance
};
const TPM_ECC_CURVE_COSE_CRV_MAP = {
  TPM_ECC_NIST_P256: 1,
  // p256
  TPM_ECC_NIST_P384: 2,
  // p384
  TPM_ECC_NIST_P521: 3,
  // p521
  TPM_ECC_BN_P256: 1,
  // p256
  TPM_ECC_SM2_P256: 1
  // p256
};
function parseCertInfo(certInfo) {
  let pointer = 0;
  const dataView = toDataView(certInfo);
  const magic = dataView.getUint32(pointer);
  pointer += 4;
  const typeBuffer = dataView.getUint16(pointer);
  pointer += 2;
  const type = TPM_ST[typeBuffer];
  const qualifiedSignerLength = dataView.getUint16(pointer);
  pointer += 2;
  const qualifiedSigner = certInfo.slice(pointer, pointer += qualifiedSignerLength);
  const extraDataLength = dataView.getUint16(pointer);
  pointer += 2;
  const extraData = certInfo.slice(pointer, pointer += extraDataLength);
  const clock = certInfo.slice(pointer, pointer += 8);
  const resetCount = dataView.getUint32(pointer);
  pointer += 4;
  const restartCount = dataView.getUint32(pointer);
  pointer += 4;
  const safe = !!certInfo.slice(pointer, pointer += 1);
  const clockInfo = { clock, resetCount, restartCount, safe };
  const firmwareVersion = certInfo.slice(pointer, pointer += 8);
  const attestedNameLength = dataView.getUint16(pointer);
  pointer += 2;
  const attestedName = certInfo.slice(pointer, pointer += attestedNameLength);
  const attestedNameDataView = toDataView(attestedName);
  const qualifiedNameLength = dataView.getUint16(pointer);
  pointer += 2;
  const qualifiedName = certInfo.slice(pointer, pointer += qualifiedNameLength);
  const attested = {
    nameAlg: TPM_ALG[attestedNameDataView.getUint16(0)],
    nameAlgBuffer: attestedName.slice(0, 2),
    name: attestedName,
    qualifiedName
  };
  return {
    magic,
    type,
    qualifiedSigner,
    extraData,
    clockInfo,
    firmwareVersion,
    attested
  };
}
function parsePubArea(pubArea) {
  let pointer = 0;
  const dataView = toDataView(pubArea);
  const type = TPM_ALG[dataView.getUint16(pointer)];
  pointer += 2;
  const nameAlg = TPM_ALG[dataView.getUint16(pointer)];
  pointer += 2;
  const objectAttributesInt = dataView.getUint32(pointer);
  pointer += 4;
  const objectAttributes = {
    fixedTPM: !!(objectAttributesInt & 1),
    stClear: !!(objectAttributesInt & 2),
    fixedParent: !!(objectAttributesInt & 8),
    sensitiveDataOrigin: !!(objectAttributesInt & 16),
    userWithAuth: !!(objectAttributesInt & 32),
    adminWithPolicy: !!(objectAttributesInt & 64),
    noDA: !!(objectAttributesInt & 512),
    encryptedDuplication: !!(objectAttributesInt & 1024),
    restricted: !!(objectAttributesInt & 32768),
    decrypt: !!(objectAttributesInt & 65536),
    signOrEncrypt: !!(objectAttributesInt & 131072)
  };
  const authPolicyLength = dataView.getUint16(pointer);
  pointer += 2;
  const authPolicy = pubArea.slice(pointer, pointer += authPolicyLength);
  const parameters = {};
  let unique2 = Uint8Array.from([]);
  if (type === "TPM_ALG_RSA") {
    const symmetric = TPM_ALG[dataView.getUint16(pointer)];
    pointer += 2;
    const scheme = TPM_ALG[dataView.getUint16(pointer)];
    pointer += 2;
    const keyBits = dataView.getUint16(pointer);
    pointer += 2;
    const exponent = dataView.getUint32(pointer);
    pointer += 4;
    parameters.rsa = { symmetric, scheme, keyBits, exponent };
    const uniqueLength = dataView.getUint16(pointer);
    pointer += 2;
    unique2 = pubArea.slice(pointer, pointer += uniqueLength);
  } else if (type === "TPM_ALG_ECC") {
    const symmetric = TPM_ALG[dataView.getUint16(pointer)];
    pointer += 2;
    const scheme = TPM_ALG[dataView.getUint16(pointer)];
    pointer += 2;
    const curveID = TPM_ECC_CURVE[dataView.getUint16(pointer)];
    pointer += 2;
    const kdf = TPM_ALG[dataView.getUint16(pointer)];
    pointer += 2;
    parameters.ecc = { symmetric, scheme, curveID, kdf };
    const uniqueXLength = dataView.getUint16(pointer);
    pointer += 2;
    const uniqueX = pubArea.slice(pointer, pointer += uniqueXLength);
    const uniqueYLength = dataView.getUint16(pointer);
    pointer += 2;
    const uniqueY = pubArea.slice(pointer, pointer += uniqueYLength);
    unique2 = concat([uniqueX, uniqueY]);
  } else {
    throw new Error(`Unexpected type "${type}" (TPM)`);
  }
  return {
    type,
    nameAlg,
    objectAttributes,
    authPolicy,
    parameters,
    unique: unique2
  };
}
async function verifyAttestationTPM(options) {
  const { aaguid, attStmt, authData, credentialPublicKey, clientDataHash, rootCertificates } = options;
  const ver = attStmt.get("ver");
  const sig = attStmt.get("sig");
  const alg = attStmt.get("alg");
  const x5c = attStmt.get("x5c");
  const pubArea = attStmt.get("pubArea");
  const certInfo = attStmt.get("certInfo");
  if (ver !== "2.0") {
    throw new Error(`Unexpected ver "${ver}", expected "2.0" (TPM)`);
  }
  if (!sig) {
    throw new Error("No attestation signature provided in attestation statement (TPM)");
  }
  if (!alg) {
    throw new Error(`Attestation statement did not contain alg (TPM)`);
  }
  if (!isCOSEAlg(alg)) {
    throw new Error(`Attestation statement contained invalid alg ${alg} (TPM)`);
  }
  if (!x5c) {
    throw new Error("No attestation certificate provided in attestation statement (TPM)");
  }
  if (!pubArea) {
    throw new Error("Attestation statement did not contain pubArea (TPM)");
  }
  if (!certInfo) {
    throw new Error("Attestation statement did not contain certInfo (TPM)");
  }
  const parsedPubArea = parsePubArea(pubArea);
  const { unique: unique2, type: pubType, parameters } = parsedPubArea;
  const cosePublicKey = decodeCredentialPublicKey(credentialPublicKey);
  if (pubType === "TPM_ALG_RSA") {
    if (!isCOSEPublicKeyRSA(cosePublicKey)) {
      throw new Error(`Credential public key with kty ${cosePublicKey.get(COSEKEYS.kty)} did not match ${pubType}`);
    }
    const n = cosePublicKey.get(COSEKEYS.n);
    const e = cosePublicKey.get(COSEKEYS.e);
    if (!n) {
      throw new Error("COSE public key missing n (TPM|RSA)");
    }
    if (!e) {
      throw new Error("COSE public key missing e (TPM|RSA)");
    }
    if (!areEqual(unique2, n)) {
      throw new Error("PubArea unique is not same as credentialPublicKey (TPM|RSA)");
    }
    if (!parameters.rsa) {
      throw new Error(`Parsed pubArea type is RSA, but missing parameters.rsa (TPM|RSA)`);
    }
    const eBuffer = e;
    const pubAreaExponent = parameters.rsa.exponent || 65537;
    const eSum = eBuffer[0] + (eBuffer[1] << 8) + (eBuffer[2] << 16);
    if (pubAreaExponent !== eSum) {
      throw new Error(`Unexpected public key exp ${eSum}, expected ${pubAreaExponent} (TPM|RSA)`);
    }
  } else if (pubType === "TPM_ALG_ECC") {
    if (!isCOSEPublicKeyEC2(cosePublicKey)) {
      throw new Error(`Credential public key with kty ${cosePublicKey.get(COSEKEYS.kty)} did not match ${pubType}`);
    }
    const crv = cosePublicKey.get(COSEKEYS.crv);
    const x = cosePublicKey.get(COSEKEYS.x);
    const y = cosePublicKey.get(COSEKEYS.y);
    if (!crv) {
      throw new Error("COSE public key missing crv (TPM|ECC)");
    }
    if (!x) {
      throw new Error("COSE public key missing x (TPM|ECC)");
    }
    if (!y) {
      throw new Error("COSE public key missing y (TPM|ECC)");
    }
    if (!areEqual(unique2, concat([x, y]))) {
      throw new Error("PubArea unique is not same as public key x and y (TPM|ECC)");
    }
    if (!parameters.ecc) {
      throw new Error(`Parsed pubArea type is ECC, but missing parameters.ecc (TPM|ECC)`);
    }
    const pubAreaCurveID = parameters.ecc.curveID;
    const pubAreaCurveIDMapToCOSECRV = TPM_ECC_CURVE_COSE_CRV_MAP[pubAreaCurveID];
    if (pubAreaCurveIDMapToCOSECRV !== crv) {
      throw new Error(`Public area key curve ID "${pubAreaCurveID}" mapped to "${pubAreaCurveIDMapToCOSECRV}" which did not match public key crv of "${crv}" (TPM|ECC)`);
    }
  } else {
    throw new Error(`Unsupported pubArea.type "${pubType}"`);
  }
  const parsedCertInfo = parseCertInfo(certInfo);
  const { magic, type: certType, attested, extraData } = parsedCertInfo;
  if (magic !== 4283712327) {
    throw new Error(`Unexpected magic value "${magic}", expected "0xff544347" (TPM)`);
  }
  if (certType !== "TPM_ST_ATTEST_CERTIFY") {
    throw new Error(`Unexpected type "${certType}", expected "TPM_ST_ATTEST_CERTIFY" (TPM)`);
  }
  const pubAreaHash = await toHash(pubArea, attestedNameAlgToCOSEAlg(attested.nameAlg));
  const attestedName = concat([
    attested.nameAlgBuffer,
    pubAreaHash
  ]);
  if (!areEqual(attested.name, attestedName)) {
    throw new Error(`Attested name comparison failed (TPM)`);
  }
  const attToBeSigned = concat([authData, clientDataHash]);
  const attToBeSignedHash = await toHash(attToBeSigned, alg);
  if (!areEqual(extraData, attToBeSignedHash)) {
    throw new Error("CertInfo extra data did not equal hashed attestation (TPM)");
  }
  if (x5c.length < 1) {
    throw new Error("No certificates present in x5c array (TPM)");
  }
  const leafCertInfo = getCertificateInfo(x5c[0]);
  const { basicConstraintsCA, version, subject, notAfter, notBefore } = leafCertInfo;
  if (basicConstraintsCA) {
    throw new Error("Certificate basic constraints CA was not `false` (TPM)");
  }
  if (version !== 2) {
    throw new Error("Certificate version was not `3` (ASN.1 value of 2) (TPM)");
  }
  if (subject.combined.length > 0) {
    throw new Error("Certificate subject was not empty (TPM)");
  }
  let now = /* @__PURE__ */ new Date();
  if (notBefore > now) {
    throw new Error(`Certificate not good before "${notBefore.toString()}" (TPM)`);
  }
  now = /* @__PURE__ */ new Date();
  if (notAfter < now) {
    throw new Error(`Certificate not good after "${notAfter.toString()}" (TPM)`);
  }
  const parsedCert = AsnParser.parse(x5c[0], Certificate);
  if (!parsedCert.tbsCertificate.extensions) {
    throw new Error("Certificate was missing extensions (TPM)");
  }
  let subjectAltNamePresent;
  let extKeyUsage;
  parsedCert.tbsCertificate.extensions.forEach((ext) => {
    if (ext.extnID === id_ce_subjectAltName) {
      subjectAltNamePresent = AsnParser.parse(ext.extnValue, SubjectAlternativeName);
    } else if (ext.extnID === id_ce_extKeyUsage) {
      extKeyUsage = AsnParser.parse(ext.extnValue, ExtendedKeyUsage$1);
    }
  });
  if (!subjectAltNamePresent) {
    throw new Error("Certificate did not contain subjectAltName extension (TPM)");
  }
  if (!subjectAltNamePresent[0].directoryName?.[0].length) {
    throw new Error("Certificate subjectAltName extension directoryName was empty (TPM)");
  }
  const { tcgAtTpmManufacturer, tcgAtTpmModel, tcgAtTpmVersion } = getTcgAtTpmValues(subjectAltNamePresent[0].directoryName);
  if (!tcgAtTpmManufacturer || !tcgAtTpmModel || !tcgAtTpmVersion) {
    throw new Error("Certificate contained incomplete subjectAltName data (TPM)");
  }
  if (!extKeyUsage) {
    throw new Error("Certificate did not contain ExtendedKeyUsage extension (TPM)");
  }
  if (!TPM_MANUFACTURERS[tcgAtTpmManufacturer]) {
    throw new Error(`Could not match TPM manufacturer "${tcgAtTpmManufacturer}" (TPM)`);
  }
  if (extKeyUsage[0] !== "2.23.133.8.3") {
    throw new Error(`Unexpected extKeyUsage "${extKeyUsage[0]}", expected "2.23.133.8.3" (TPM)`);
  }
  try {
    await validateExtFIDOGenCEAAGUID(parsedCert.tbsCertificate.extensions, aaguid);
  } catch (err) {
    const _err = err;
    throw new Error(`${_err.message} (TPM)`);
  }
  const statement = await MetadataService.getStatement(aaguid);
  if (statement) {
    try {
      await verifyAttestationWithMetadata({
        statement,
        credentialPublicKey,
        x5c,
        attestationStatementAlg: alg
      });
    } catch (err) {
      const _err = err;
      throw new Error(`${_err.message} (TPM)`);
    }
  } else {
    try {
      await validateCertificatePath(x5c.map(convertCertBufferToPEM), rootCertificates);
    } catch (err) {
      const _err = err;
      throw new Error(`${_err.message} (TPM)`);
    }
  }
  return verifySignature({
    signature: sig,
    data: certInfo,
    x509Certificate: x5c[0],
    hashAlgorithm: alg
  });
}
function getTcgAtTpmValues(root) {
  const oidManufacturer = "2.23.133.2.1";
  const oidModel = "2.23.133.2.2";
  const oidVersion = "2.23.133.2.3";
  let tcgAtTpmManufacturer;
  let tcgAtTpmModel;
  let tcgAtTpmVersion;
  root.forEach((relName) => {
    relName.forEach((attr) => {
      if (attr.type === oidManufacturer) {
        tcgAtTpmManufacturer = attr.value.toString();
      } else if (attr.type === oidModel) {
        tcgAtTpmModel = attr.value.toString();
      } else if (attr.type === oidVersion) {
        tcgAtTpmVersion = attr.value.toString();
      }
    });
  });
  return {
    tcgAtTpmManufacturer,
    tcgAtTpmModel,
    tcgAtTpmVersion
  };
}
function attestedNameAlgToCOSEAlg(alg) {
  if (alg === "TPM_ALG_SHA256") {
    return COSEALG.ES256;
  } else if (alg === "TPM_ALG_SHA384") {
    return COSEALG.ES384;
  } else if (alg === "TPM_ALG_SHA512") {
    return COSEALG.ES512;
  }
  throw new Error(`Unexpected TPM attested name alg ${alg}`);
}
var IntegerSet_1;
const id_ce_keyDescription = "1.3.6.1.4.1.11129.2.1.17";
var VerifiedBootState;
(function(VerifiedBootState2) {
  VerifiedBootState2[VerifiedBootState2["verified"] = 0] = "verified";
  VerifiedBootState2[VerifiedBootState2["selfSigned"] = 1] = "selfSigned";
  VerifiedBootState2[VerifiedBootState2["unverified"] = 2] = "unverified";
  VerifiedBootState2[VerifiedBootState2["failed"] = 3] = "failed";
})(VerifiedBootState || (VerifiedBootState = {}));
class RootOfTrust {
  verifiedBootKey = new OctetString2();
  deviceLocked = false;
  verifiedBootState = VerifiedBootState.verified;
  verifiedBootHash;
  constructor(params = {}) {
    Object.assign(this, params);
  }
}
__decorate([
  AsnProp({ type: OctetString2 })
], RootOfTrust.prototype, "verifiedBootKey", void 0);
__decorate([
  AsnProp({ type: AsnPropTypes.Boolean })
], RootOfTrust.prototype, "deviceLocked", void 0);
__decorate([
  AsnProp({ type: AsnPropTypes.Enumerated })
], RootOfTrust.prototype, "verifiedBootState", void 0);
__decorate([
  AsnProp({
    type: OctetString2,
    optional: true
  })
], RootOfTrust.prototype, "verifiedBootHash", void 0);
let IntegerSet = IntegerSet_1 = class IntegerSet2 extends AsnArray {
  constructor(items) {
    super(items);
    Object.setPrototypeOf(this, IntegerSet_1.prototype);
  }
};
IntegerSet = IntegerSet_1 = __decorate([
  AsnType({
    type: AsnTypeTypes.Set,
    itemType: AsnPropTypes.Integer
  })
], IntegerSet);
class AuthorizationList {
  purpose;
  algorithm;
  keySize;
  digest;
  padding;
  ecCurve;
  rsaPublicExponent;
  mgfDigest;
  rollbackResistance;
  earlyBootOnly;
  activeDateTime;
  originationExpireDateTime;
  usageExpireDateTime;
  usageCountLimit;
  noAuthRequired;
  userAuthType;
  authTimeout;
  allowWhileOnBody;
  trustedUserPresenceRequired;
  trustedConfirmationRequired;
  unlockedDeviceRequired;
  allApplications;
  applicationId;
  creationDateTime;
  origin;
  rollbackResistant;
  rootOfTrust;
  osVersion;
  osPatchLevel;
  attestationApplicationId;
  attestationIdBrand;
  attestationIdDevice;
  attestationIdProduct;
  attestationIdSerial;
  attestationIdImei;
  attestationIdMeid;
  attestationIdManufacturer;
  attestationIdModel;
  vendorPatchLevel;
  bootPatchLevel;
  deviceUniqueAttestation;
  attestationIdSecondImei;
  moduleHash;
  constructor(params = {}) {
    Object.assign(this, params);
  }
}
__decorate([
  AsnProp({
    context: 1,
    type: IntegerSet,
    optional: true
  })
], AuthorizationList.prototype, "purpose", void 0);
__decorate([
  AsnProp({
    context: 2,
    type: AsnPropTypes.Integer,
    optional: true
  })
], AuthorizationList.prototype, "algorithm", void 0);
__decorate([
  AsnProp({
    context: 3,
    type: AsnPropTypes.Integer,
    optional: true
  })
], AuthorizationList.prototype, "keySize", void 0);
__decorate([
  AsnProp({
    context: 5,
    type: IntegerSet,
    optional: true
  })
], AuthorizationList.prototype, "digest", void 0);
__decorate([
  AsnProp({
    context: 6,
    type: IntegerSet,
    optional: true
  })
], AuthorizationList.prototype, "padding", void 0);
__decorate([
  AsnProp({
    context: 10,
    type: AsnPropTypes.Integer,
    optional: true
  })
], AuthorizationList.prototype, "ecCurve", void 0);
__decorate([
  AsnProp({
    context: 200,
    type: AsnPropTypes.Integer,
    optional: true
  })
], AuthorizationList.prototype, "rsaPublicExponent", void 0);
__decorate([
  AsnProp({
    context: 203,
    type: IntegerSet,
    optional: true
  })
], AuthorizationList.prototype, "mgfDigest", void 0);
__decorate([
  AsnProp({
    context: 303,
    type: AsnPropTypes.Null,
    optional: true
  })
], AuthorizationList.prototype, "rollbackResistance", void 0);
__decorate([
  AsnProp({
    context: 305,
    type: AsnPropTypes.Null,
    optional: true
  })
], AuthorizationList.prototype, "earlyBootOnly", void 0);
__decorate([
  AsnProp({
    context: 400,
    type: AsnPropTypes.Integer,
    optional: true
  })
], AuthorizationList.prototype, "activeDateTime", void 0);
__decorate([
  AsnProp({
    context: 401,
    type: AsnPropTypes.Integer,
    optional: true
  })
], AuthorizationList.prototype, "originationExpireDateTime", void 0);
__decorate([
  AsnProp({
    context: 402,
    type: AsnPropTypes.Integer,
    optional: true
  })
], AuthorizationList.prototype, "usageExpireDateTime", void 0);
__decorate([
  AsnProp({
    context: 405,
    type: AsnPropTypes.Integer,
    optional: true
  })
], AuthorizationList.prototype, "usageCountLimit", void 0);
__decorate([
  AsnProp({
    context: 503,
    type: AsnPropTypes.Null,
    optional: true
  })
], AuthorizationList.prototype, "noAuthRequired", void 0);
__decorate([
  AsnProp({
    context: 504,
    type: AsnPropTypes.Integer,
    optional: true
  })
], AuthorizationList.prototype, "userAuthType", void 0);
__decorate([
  AsnProp({
    context: 505,
    type: AsnPropTypes.Integer,
    optional: true
  })
], AuthorizationList.prototype, "authTimeout", void 0);
__decorate([
  AsnProp({
    context: 506,
    type: AsnPropTypes.Null,
    optional: true
  })
], AuthorizationList.prototype, "allowWhileOnBody", void 0);
__decorate([
  AsnProp({
    context: 507,
    type: AsnPropTypes.Null,
    optional: true
  })
], AuthorizationList.prototype, "trustedUserPresenceRequired", void 0);
__decorate([
  AsnProp({
    context: 508,
    type: AsnPropTypes.Null,
    optional: true
  })
], AuthorizationList.prototype, "trustedConfirmationRequired", void 0);
__decorate([
  AsnProp({
    context: 509,
    type: AsnPropTypes.Null,
    optional: true
  })
], AuthorizationList.prototype, "unlockedDeviceRequired", void 0);
__decorate([
  AsnProp({
    context: 600,
    type: AsnPropTypes.Null,
    optional: true
  })
], AuthorizationList.prototype, "allApplications", void 0);
__decorate([
  AsnProp({
    context: 601,
    type: OctetString2,
    optional: true
  })
], AuthorizationList.prototype, "applicationId", void 0);
__decorate([
  AsnProp({
    context: 701,
    type: AsnPropTypes.Integer,
    optional: true
  })
], AuthorizationList.prototype, "creationDateTime", void 0);
__decorate([
  AsnProp({
    context: 702,
    type: AsnPropTypes.Integer,
    optional: true
  })
], AuthorizationList.prototype, "origin", void 0);
__decorate([
  AsnProp({
    context: 703,
    type: AsnPropTypes.Null,
    optional: true
  })
], AuthorizationList.prototype, "rollbackResistant", void 0);
__decorate([
  AsnProp({
    context: 704,
    type: RootOfTrust,
    optional: true
  })
], AuthorizationList.prototype, "rootOfTrust", void 0);
__decorate([
  AsnProp({
    context: 705,
    type: AsnPropTypes.Integer,
    optional: true
  })
], AuthorizationList.prototype, "osVersion", void 0);
__decorate([
  AsnProp({
    context: 706,
    type: AsnPropTypes.Integer,
    optional: true
  })
], AuthorizationList.prototype, "osPatchLevel", void 0);
__decorate([
  AsnProp({
    context: 709,
    type: OctetString2,
    optional: true
  })
], AuthorizationList.prototype, "attestationApplicationId", void 0);
__decorate([
  AsnProp({
    context: 710,
    type: OctetString2,
    optional: true
  })
], AuthorizationList.prototype, "attestationIdBrand", void 0);
__decorate([
  AsnProp({
    context: 711,
    type: OctetString2,
    optional: true
  })
], AuthorizationList.prototype, "attestationIdDevice", void 0);
__decorate([
  AsnProp({
    context: 712,
    type: OctetString2,
    optional: true
  })
], AuthorizationList.prototype, "attestationIdProduct", void 0);
__decorate([
  AsnProp({
    context: 713,
    type: OctetString2,
    optional: true
  })
], AuthorizationList.prototype, "attestationIdSerial", void 0);
__decorate([
  AsnProp({
    context: 714,
    type: OctetString2,
    optional: true
  })
], AuthorizationList.prototype, "attestationIdImei", void 0);
__decorate([
  AsnProp({
    context: 715,
    type: OctetString2,
    optional: true
  })
], AuthorizationList.prototype, "attestationIdMeid", void 0);
__decorate([
  AsnProp({
    context: 716,
    type: OctetString2,
    optional: true
  })
], AuthorizationList.prototype, "attestationIdManufacturer", void 0);
__decorate([
  AsnProp({
    context: 717,
    type: OctetString2,
    optional: true
  })
], AuthorizationList.prototype, "attestationIdModel", void 0);
__decorate([
  AsnProp({
    context: 718,
    type: AsnPropTypes.Integer,
    optional: true
  })
], AuthorizationList.prototype, "vendorPatchLevel", void 0);
__decorate([
  AsnProp({
    context: 719,
    type: AsnPropTypes.Integer,
    optional: true
  })
], AuthorizationList.prototype, "bootPatchLevel", void 0);
__decorate([
  AsnProp({
    context: 720,
    type: AsnPropTypes.Null,
    optional: true
  })
], AuthorizationList.prototype, "deviceUniqueAttestation", void 0);
__decorate([
  AsnProp({
    context: 723,
    type: OctetString2,
    optional: true
  })
], AuthorizationList.prototype, "attestationIdSecondImei", void 0);
__decorate([
  AsnProp({
    context: 724,
    type: OctetString2,
    optional: true
  })
], AuthorizationList.prototype, "moduleHash", void 0);
var SecurityLevel;
(function(SecurityLevel2) {
  SecurityLevel2[SecurityLevel2["software"] = 0] = "software";
  SecurityLevel2[SecurityLevel2["trustedEnvironment"] = 1] = "trustedEnvironment";
  SecurityLevel2[SecurityLevel2["strongBox"] = 2] = "strongBox";
})(SecurityLevel || (SecurityLevel = {}));
var Version;
(function(Version2) {
  Version2[Version2["KM2"] = 1] = "KM2";
  Version2[Version2["KM3"] = 2] = "KM3";
  Version2[Version2["KM4"] = 3] = "KM4";
  Version2[Version2["KM4_1"] = 4] = "KM4_1";
  Version2[Version2["keyMint1"] = 100] = "keyMint1";
  Version2[Version2["keyMint2"] = 200] = "keyMint2";
  Version2[Version2["keyMint3"] = 300] = "keyMint3";
  Version2[Version2["keyMint4"] = 400] = "keyMint4";
})(Version || (Version = {}));
class KeyDescription {
  attestationVersion = Version.KM4;
  attestationSecurityLevel = SecurityLevel.software;
  keymasterVersion = 0;
  keymasterSecurityLevel = SecurityLevel.software;
  attestationChallenge = new OctetString2();
  uniqueId = new OctetString2();
  softwareEnforced = new AuthorizationList();
  teeEnforced = new AuthorizationList();
  constructor(params = {}) {
    Object.assign(this, params);
  }
}
__decorate([
  AsnProp({ type: AsnPropTypes.Integer })
], KeyDescription.prototype, "attestationVersion", void 0);
__decorate([
  AsnProp({ type: AsnPropTypes.Enumerated })
], KeyDescription.prototype, "attestationSecurityLevel", void 0);
__decorate([
  AsnProp({ type: AsnPropTypes.Integer })
], KeyDescription.prototype, "keymasterVersion", void 0);
__decorate([
  AsnProp({ type: AsnPropTypes.Enumerated })
], KeyDescription.prototype, "keymasterSecurityLevel", void 0);
__decorate([
  AsnProp({ type: OctetString2 })
], KeyDescription.prototype, "attestationChallenge", void 0);
__decorate([
  AsnProp({ type: OctetString2 })
], KeyDescription.prototype, "uniqueId", void 0);
__decorate([
  AsnProp({ type: AuthorizationList })
], KeyDescription.prototype, "softwareEnforced", void 0);
__decorate([
  AsnProp({ type: AuthorizationList })
], KeyDescription.prototype, "teeEnforced", void 0);
class KeyMintKeyDescription {
  attestationVersion = Version.keyMint4;
  attestationSecurityLevel = SecurityLevel.software;
  keyMintVersion = 0;
  keyMintSecurityLevel = SecurityLevel.software;
  attestationChallenge = new OctetString2();
  uniqueId = new OctetString2();
  softwareEnforced = new AuthorizationList();
  hardwareEnforced = new AuthorizationList();
  constructor(params = {}) {
    Object.assign(this, params);
  }
  toLegacyKeyDescription() {
    return new KeyDescription({
      attestationVersion: this.attestationVersion,
      attestationSecurityLevel: this.attestationSecurityLevel,
      keymasterVersion: this.keyMintVersion,
      keymasterSecurityLevel: this.keyMintSecurityLevel,
      attestationChallenge: this.attestationChallenge,
      uniqueId: this.uniqueId,
      softwareEnforced: this.softwareEnforced,
      teeEnforced: this.hardwareEnforced
    });
  }
  static fromLegacyKeyDescription(keyDesc) {
    return new KeyMintKeyDescription({
      attestationVersion: keyDesc.attestationVersion,
      attestationSecurityLevel: keyDesc.attestationSecurityLevel,
      keyMintVersion: keyDesc.keymasterVersion,
      keyMintSecurityLevel: keyDesc.keymasterSecurityLevel,
      attestationChallenge: keyDesc.attestationChallenge,
      uniqueId: keyDesc.uniqueId,
      softwareEnforced: keyDesc.softwareEnforced,
      hardwareEnforced: keyDesc.teeEnforced
    });
  }
}
__decorate([
  AsnProp({ type: AsnPropTypes.Integer })
], KeyMintKeyDescription.prototype, "attestationVersion", void 0);
__decorate([
  AsnProp({ type: AsnPropTypes.Enumerated })
], KeyMintKeyDescription.prototype, "attestationSecurityLevel", void 0);
__decorate([
  AsnProp({ type: AsnPropTypes.Integer })
], KeyMintKeyDescription.prototype, "keyMintVersion", void 0);
__decorate([
  AsnProp({ type: AsnPropTypes.Enumerated })
], KeyMintKeyDescription.prototype, "keyMintSecurityLevel", void 0);
__decorate([
  AsnProp({ type: OctetString2 })
], KeyMintKeyDescription.prototype, "attestationChallenge", void 0);
__decorate([
  AsnProp({ type: OctetString2 })
], KeyMintKeyDescription.prototype, "uniqueId", void 0);
__decorate([
  AsnProp({ type: AuthorizationList })
], KeyMintKeyDescription.prototype, "softwareEnforced", void 0);
__decorate([
  AsnProp({ type: AuthorizationList })
], KeyMintKeyDescription.prototype, "hardwareEnforced", void 0);
var NonStandardAuthorizationList_1;
let NonStandardAuthorization = class NonStandardAuthorization2 extends AuthorizationList {
};
NonStandardAuthorization = __decorate([
  AsnType({ type: AsnTypeTypes.Choice })
], NonStandardAuthorization);
let NonStandardAuthorizationList = NonStandardAuthorizationList_1 = class NonStandardAuthorizationList2 extends AsnArray {
  constructor(items) {
    super(items);
    Object.setPrototypeOf(this, NonStandardAuthorizationList_1.prototype);
  }
  findProperty(key2) {
    const prop = this.find((o) => o[key2] !== void 0);
    if (prop) {
      return prop[key2];
    }
    return void 0;
  }
};
NonStandardAuthorizationList = NonStandardAuthorizationList_1 = __decorate([
  AsnType({
    type: AsnTypeTypes.Sequence,
    itemType: NonStandardAuthorization
  })
], NonStandardAuthorizationList);
class NonStandardKeyDescription {
  attestationVersion = Version.KM4;
  attestationSecurityLevel = SecurityLevel.software;
  keymasterVersion = 0;
  keymasterSecurityLevel = SecurityLevel.software;
  attestationChallenge = new OctetString2();
  uniqueId = new OctetString2();
  softwareEnforced = new NonStandardAuthorizationList();
  teeEnforced = new NonStandardAuthorizationList();
  get keyMintVersion() {
    return this.keymasterVersion;
  }
  set keyMintVersion(value) {
    this.keymasterVersion = value;
  }
  get keyMintSecurityLevel() {
    return this.keymasterSecurityLevel;
  }
  set keyMintSecurityLevel(value) {
    this.keymasterSecurityLevel = value;
  }
  get hardwareEnforced() {
    return this.teeEnforced;
  }
  set hardwareEnforced(value) {
    this.teeEnforced = value;
  }
  constructor(params = {}) {
    Object.assign(this, params);
  }
}
__decorate([
  AsnProp({ type: AsnPropTypes.Integer })
], NonStandardKeyDescription.prototype, "attestationVersion", void 0);
__decorate([
  AsnProp({ type: AsnPropTypes.Enumerated })
], NonStandardKeyDescription.prototype, "attestationSecurityLevel", void 0);
__decorate([
  AsnProp({ type: AsnPropTypes.Integer })
], NonStandardKeyDescription.prototype, "keymasterVersion", void 0);
__decorate([
  AsnProp({ type: AsnPropTypes.Enumerated })
], NonStandardKeyDescription.prototype, "keymasterSecurityLevel", void 0);
__decorate([
  AsnProp({ type: OctetString2 })
], NonStandardKeyDescription.prototype, "attestationChallenge", void 0);
__decorate([
  AsnProp({ type: OctetString2 })
], NonStandardKeyDescription.prototype, "uniqueId", void 0);
__decorate([
  AsnProp({ type: NonStandardAuthorizationList })
], NonStandardKeyDescription.prototype, "softwareEnforced", void 0);
__decorate([
  AsnProp({ type: NonStandardAuthorizationList })
], NonStandardKeyDescription.prototype, "teeEnforced", void 0);
let NonStandardKeyMintKeyDescription = class NonStandardKeyMintKeyDescription2 extends NonStandardKeyDescription {
  constructor(params = {}) {
    if ("keymasterVersion" in params && !("keyMintVersion" in params)) {
      params.keyMintVersion = params.keymasterVersion;
    }
    if ("keymasterSecurityLevel" in params && !("keyMintSecurityLevel" in params)) {
      params.keyMintSecurityLevel = params.keymasterSecurityLevel;
    }
    if ("teeEnforced" in params && !("hardwareEnforced" in params)) {
      params.hardwareEnforced = params.teeEnforced;
    }
    super(params);
  }
};
NonStandardKeyMintKeyDescription = __decorate([
  AsnType({ type: AsnTypeTypes.Sequence })
], NonStandardKeyMintKeyDescription);
class AttestationPackageInfo {
  packageName;
  version;
  constructor(params = {}) {
    Object.assign(this, params);
  }
}
__decorate([
  AsnProp({ type: AsnPropTypes.OctetString })
], AttestationPackageInfo.prototype, "packageName", void 0);
__decorate([
  AsnProp({ type: AsnPropTypes.Integer })
], AttestationPackageInfo.prototype, "version", void 0);
class AttestationApplicationId {
  packageInfos;
  signatureDigests;
  constructor(params = {}) {
    Object.assign(this, params);
  }
}
__decorate([
  AsnProp({
    type: AttestationPackageInfo,
    repeated: "set"
  })
], AttestationApplicationId.prototype, "packageInfos", void 0);
__decorate([
  AsnProp({
    type: AsnPropTypes.OctetString,
    repeated: "set"
  })
], AttestationApplicationId.prototype, "signatureDigests", void 0);
async function verifyAttestationAndroidKey(options) {
  const { authData, clientDataHash, attStmt, credentialPublicKey, aaguid, rootCertificates } = options;
  const x5c = attStmt.get("x5c");
  const sig = attStmt.get("sig");
  const alg = attStmt.get("alg");
  if (!x5c) {
    throw new Error("No attestation certificate provided in attestation statement (Android Key)");
  }
  if (!sig) {
    throw new Error("No attestation signature provided in attestation statement (Android Key)");
  }
  if (!alg) {
    throw new Error(`Attestation statement did not contain alg (Android Key)`);
  }
  if (!isCOSEAlg(alg)) {
    throw new Error(`Attestation statement contained invalid alg ${alg} (Android Key)`);
  }
  const parsedCert = AsnParser.parse(x5c[0], Certificate);
  const parsedCertPubKey = new Uint8Array(parsedCert.tbsCertificate.subjectPublicKeyInfo.subjectPublicKey);
  const credPubKeyPKCS = convertCOSEtoPKCS(credentialPublicKey);
  if (!areEqual(credPubKeyPKCS, parsedCertPubKey)) {
    throw new Error("Credential public key does not equal leaf cert public key (Android Key)");
  }
  const extKeyStore = parsedCert.tbsCertificate.extensions?.find((ext) => ext.extnID === id_ce_keyDescription);
  if (!extKeyStore) {
    throw new Error("Certificate did not contain extKeyStore (Android Key)");
  }
  const parsedExtKeyStore = AsnParser.parse(extKeyStore.extnValue, KeyDescription);
  const { attestationChallenge, teeEnforced, softwareEnforced } = parsedExtKeyStore;
  if (!areEqual(new Uint8Array(attestationChallenge.buffer), clientDataHash)) {
    throw new Error("Attestation challenge was not equal to client data hash (Android Key)");
  }
  if (teeEnforced.allApplications !== void 0) {
    throw new Error('teeEnforced contained "allApplications [600]" tag (Android Key)');
  }
  if (softwareEnforced.allApplications !== void 0) {
    throw new Error('teeEnforced contained "allApplications [600]" tag (Android Key)');
  }
  const statement = await MetadataService.getStatement(aaguid);
  if (statement) {
    try {
      await verifyAttestationWithMetadata({
        statement,
        credentialPublicKey,
        x5c,
        attestationStatementAlg: alg
      });
    } catch (err) {
      const _err = err;
      throw new Error(`${_err.message} (Android Key)`, { cause: _err });
    }
  } else {
    const x5cNoRootPEM = x5c.slice(0, -1).map(convertCertBufferToPEM);
    const x5cRootPEM = x5c.slice(-1).map(convertCertBufferToPEM);
    try {
      await validateCertificatePath(x5cNoRootPEM, x5cRootPEM);
    } catch (err) {
      const _err = err;
      throw new Error(`${_err.message} (Android Key)`, { cause: _err });
    }
    if (rootCertificates.length > 0 && rootCertificates.indexOf(x5cRootPEM[0]) < 0) {
      throw new Error("x5c root certificate was not a known root certificate (Android Key)");
    }
  }
  const signatureBase = concat([authData, clientDataHash]);
  return verifySignature({
    signature: sig,
    data: signatureBase,
    x509Certificate: x5c[0],
    hashAlgorithm: alg
  });
}
async function verifyAttestationApple(options) {
  const { attStmt, authData, clientDataHash, credentialPublicKey, rootCertificates } = options;
  const x5c = attStmt.get("x5c");
  if (!x5c) {
    throw new Error("No attestation certificate provided in attestation statement (Apple)");
  }
  try {
    await validateCertificatePath(x5c.map(convertCertBufferToPEM), rootCertificates);
  } catch (err) {
    const _err = err;
    throw new Error(`${_err.message} (Apple)`);
  }
  const parsedCredCert = AsnParser.parse(x5c[0], Certificate);
  const { extensions, subjectPublicKeyInfo } = parsedCredCert.tbsCertificate;
  if (!extensions) {
    throw new Error("credCert missing extensions (Apple)");
  }
  const extCertNonce = extensions.find((ext) => ext.extnID === "1.2.840.113635.100.8.2");
  if (!extCertNonce) {
    throw new Error('credCert missing "1.2.840.113635.100.8.2" extension (Apple)');
  }
  const nonceToHash = concat([authData, clientDataHash]);
  const nonce = await toHash(nonceToHash);
  const extNonce = new Uint8Array(extCertNonce.extnValue.buffer).slice(6);
  if (!areEqual(nonce, extNonce)) {
    throw new Error(`credCert nonce was not expected value (Apple)`);
  }
  const credPubKeyPKCS = convertCOSEtoPKCS(credentialPublicKey);
  const credCertSubjectPublicKey = new Uint8Array(subjectPublicKeyInfo.subjectPublicKey);
  if (!areEqual(credPubKeyPKCS, credCertSubjectPublicKey)) {
    throw new Error("Credential public key does not equal credCert public key (Apple)");
  }
  return true;
}
async function verifyRegistrationResponse(options) {
  const { response, expectedChallenge, expectedOrigin, expectedRPID, expectedType, requireUserPresence = true, requireUserVerification = true, supportedAlgorithmIDs = supportedCOSEAlgorithmIdentifiers, attestationSafetyNetEnforceCTSCheck = true } = options;
  const { id, rawId, type: credentialType, response: attestationResponse } = response;
  if (!id) {
    throw new Error("Missing credential ID");
  }
  if (id !== rawId) {
    throw new Error("Credential ID was not base64url-encoded");
  }
  if (credentialType !== "public-key") {
    throw new Error(`Unexpected credential type ${credentialType}, expected "public-key"`);
  }
  const clientDataJSON = decodeClientDataJSON(attestationResponse.clientDataJSON);
  const { type, origin, challenge, tokenBinding } = clientDataJSON;
  if (Array.isArray(expectedType)) {
    if (!expectedType.includes(type)) {
      const joinedExpectedType = expectedType.join(", ");
      throw new Error(`Unexpected registration response type "${type}", expected one of: ${joinedExpectedType}`);
    }
  } else if (expectedType) {
    if (type !== expectedType) {
      throw new Error(`Unexpected registration response type "${type}", expected "${expectedType}"`);
    }
  } else if (type !== "webauthn.create") {
    throw new Error(`Unexpected registration response type: ${type}`);
  }
  if (typeof expectedChallenge === "function") {
    if (!await expectedChallenge(challenge)) {
      throw new Error(`Custom challenge verifier returned false for registration response challenge "${challenge}"`);
    }
  } else if (challenge !== expectedChallenge) {
    throw new Error(`Unexpected registration response challenge "${challenge}", expected "${expectedChallenge}"`);
  }
  if (Array.isArray(expectedOrigin)) {
    if (!expectedOrigin.includes(origin)) {
      throw new Error(`Unexpected registration response origin "${origin}", expected one of: ${expectedOrigin.join(", ")}`);
    }
  } else {
    if (origin !== expectedOrigin) {
      throw new Error(`Unexpected registration response origin "${origin}", expected "${expectedOrigin}"`);
    }
  }
  if (tokenBinding) {
    if (typeof tokenBinding !== "object") {
      throw new Error(`Unexpected value for TokenBinding "${tokenBinding}"`);
    }
    if (["present", "supported", "not-supported"].indexOf(tokenBinding.status) < 0) {
      throw new Error(`Unexpected tokenBinding.status value of "${tokenBinding.status}"`);
    }
  }
  const attestationObject = toBuffer(attestationResponse.attestationObject);
  const decodedAttestationObject = decodeAttestationObject(attestationObject);
  const fmt = decodedAttestationObject.get("fmt");
  const authData = decodedAttestationObject.get("authData");
  const attStmt = decodedAttestationObject.get("attStmt");
  const parsedAuthData = parseAuthenticatorData(authData);
  const { aaguid, rpIdHash, flags, credentialID, counter, credentialPublicKey, extensionsData } = parsedAuthData;
  let matchedRPID;
  if (expectedRPID) {
    let expectedRPIDs = [];
    if (typeof expectedRPID === "string") {
      expectedRPIDs = [expectedRPID];
    } else {
      expectedRPIDs = expectedRPID;
    }
    matchedRPID = await matchExpectedRPID(rpIdHash, expectedRPIDs);
  }
  if (requireUserPresence && !flags.up) {
    throw new Error("User presence was required, but user was not present");
  }
  if (requireUserVerification && !flags.uv) {
    throw new Error("User verification was required, but user could not be verified");
  }
  if (!credentialID) {
    throw new Error("No credential ID was provided by authenticator");
  }
  if (!credentialPublicKey) {
    throw new Error("No public key was provided by authenticator");
  }
  if (!aaguid) {
    throw new Error("No AAGUID was present during registration");
  }
  const decodedPublicKey = decodeCredentialPublicKey(credentialPublicKey);
  const alg = decodedPublicKey.get(COSEKEYS.alg);
  if (typeof alg !== "number") {
    throw new Error("Credential public key was missing numeric alg");
  }
  if (!supportedAlgorithmIDs.includes(alg)) {
    const supported = supportedAlgorithmIDs.join(", ");
    throw new Error(`Unexpected public key alg "${alg}", expected one of "${supported}"`);
  }
  const clientDataHash = await toHash(toBuffer(attestationResponse.clientDataJSON));
  const rootCertificates = SettingsService.getRootCertificates({
    identifier: fmt
  });
  const verifierOpts = {
    aaguid,
    attStmt,
    authData,
    clientDataHash,
    credentialID,
    credentialPublicKey,
    rootCertificates,
    rpIdHash,
    attestationSafetyNetEnforceCTSCheck
  };
  let verified = false;
  if (fmt === "fido-u2f") {
    verified = await verifyAttestationFIDOU2F(verifierOpts);
  } else if (fmt === "packed") {
    verified = await verifyAttestationPacked(verifierOpts);
  } else if (fmt === "android-safetynet") {
    verified = await verifyAttestationAndroidSafetyNet(verifierOpts);
  } else if (fmt === "android-key") {
    verified = await verifyAttestationAndroidKey(verifierOpts);
  } else if (fmt === "tpm") {
    verified = await verifyAttestationTPM(verifierOpts);
  } else if (fmt === "apple") {
    verified = await verifyAttestationApple(verifierOpts);
  } else if (fmt === "none") {
    if (attStmt.size > 0) {
      throw new Error("None attestation had unexpected attestation statement");
    }
    verified = true;
  } else {
    throw new Error(`Unsupported Attestation Format: ${fmt}`);
  }
  if (!verified) {
    return { verified: false };
  }
  const { credentialDeviceType, credentialBackedUp } = parseBackupFlags(flags);
  return {
    verified: true,
    registrationInfo: {
      fmt,
      aaguid: convertAAGUIDToString(aaguid),
      credentialType,
      credential: {
        id: fromBuffer(credentialID),
        publicKey: credentialPublicKey,
        counter,
        transports: response.response.transports
      },
      attestationObject,
      userVerified: flags.uv,
      credentialDeviceType,
      credentialBackedUp,
      origin: clientDataJSON.origin,
      rpID: matchedRPID,
      authenticatorExtensionResults: extensionsData
    }
  };
}
async function generateAuthenticationOptions(options) {
  const { allowCredentials, challenge = await generateChallenge(), timeout = 6e4, userVerification = "preferred", extensions, rpID } = options;
  let _challenge = challenge;
  if (typeof _challenge === "string") {
    _challenge = fromUTF8String(_challenge);
  }
  return {
    rpId: rpID,
    challenge: fromBuffer(_challenge),
    allowCredentials: allowCredentials?.map((cred) => {
      if (!isBase64URL(cred.id)) {
        throw new Error(`allowCredential id "${cred.id}" is not a valid base64url string`);
      }
      return {
        ...cred,
        id: trimPadding(cred.id),
        type: "public-key"
      };
    }),
    timeout,
    userVerification,
    extensions
  };
}
async function verifyAuthenticationResponse(options) {
  const { response, expectedChallenge, expectedOrigin, expectedRPID, expectedType, credential, requireUserVerification = true, advancedFIDOConfig } = options;
  const { id, rawId, type: credentialType, response: assertionResponse } = response;
  if (!id) {
    throw new Error("Missing credential ID");
  }
  if (id !== rawId) {
    throw new Error("Credential ID was not base64url-encoded");
  }
  if (credentialType !== "public-key") {
    throw new Error(`Unexpected credential type ${credentialType}, expected "public-key"`);
  }
  if (!response) {
    throw new Error("Credential missing response");
  }
  if (typeof assertionResponse?.clientDataJSON !== "string") {
    throw new Error("Credential response clientDataJSON was not a string");
  }
  const clientDataJSON = decodeClientDataJSON(assertionResponse.clientDataJSON);
  const { type, origin, challenge, tokenBinding } = clientDataJSON;
  if (Array.isArray(expectedType)) {
    if (!expectedType.includes(type)) {
      const joinedExpectedType = expectedType.join(", ");
      throw new Error(`Unexpected authentication response type "${type}", expected one of: ${joinedExpectedType}`);
    }
  } else if (expectedType) {
    if (type !== expectedType) {
      throw new Error(`Unexpected authentication response type "${type}", expected "${expectedType}"`);
    }
  } else if (type !== "webauthn.get") {
    throw new Error(`Unexpected authentication response type: ${type}`);
  }
  if (typeof expectedChallenge === "function") {
    if (!await expectedChallenge(challenge)) {
      throw new Error(`Custom challenge verifier returned false for registration response challenge "${challenge}"`);
    }
  } else if (challenge !== expectedChallenge) {
    throw new Error(`Unexpected authentication response challenge "${challenge}", expected "${expectedChallenge}"`);
  }
  if (Array.isArray(expectedOrigin)) {
    if (!expectedOrigin.includes(origin)) {
      const joinedExpectedOrigin = expectedOrigin.join(", ");
      throw new Error(`Unexpected authentication response origin "${origin}", expected one of: ${joinedExpectedOrigin}`);
    }
  } else {
    if (origin !== expectedOrigin) {
      throw new Error(`Unexpected authentication response origin "${origin}", expected "${expectedOrigin}"`);
    }
  }
  if (!isBase64URL(assertionResponse.authenticatorData)) {
    throw new Error("Credential response authenticatorData was not a base64url string");
  }
  if (!isBase64URL(assertionResponse.signature)) {
    throw new Error("Credential response signature was not a base64url string");
  }
  if (assertionResponse.userHandle && typeof assertionResponse.userHandle !== "string") {
    throw new Error("Credential response userHandle was not a string");
  }
  if (tokenBinding) {
    if (typeof tokenBinding !== "object") {
      throw new Error("ClientDataJSON tokenBinding was not an object");
    }
    if (["present", "supported", "notSupported"].indexOf(tokenBinding.status) < 0) {
      throw new Error(`Unexpected tokenBinding status ${tokenBinding.status}`);
    }
  }
  const authDataBuffer = toBuffer(assertionResponse.authenticatorData);
  const parsedAuthData = parseAuthenticatorData(authDataBuffer);
  const { rpIdHash, flags, counter, extensionsData } = parsedAuthData;
  let expectedRPIDs = [];
  if (typeof expectedRPID === "string") {
    expectedRPIDs = [expectedRPID];
  } else {
    expectedRPIDs = expectedRPID;
  }
  const matchedRPID = await matchExpectedRPID(rpIdHash, expectedRPIDs);
  if (advancedFIDOConfig !== void 0) {
    const { userVerification: fidoUserVerification } = advancedFIDOConfig;
    if (fidoUserVerification === "required") {
      if (!flags.uv) {
        throw new Error("User verification required, but user could not be verified");
      }
    }
  } else {
    if (!flags.up) {
      throw new Error("User not present during authentication");
    }
    if (requireUserVerification && !flags.uv) {
      throw new Error("User verification required, but user could not be verified");
    }
  }
  const clientDataHash = await toHash(toBuffer(assertionResponse.clientDataJSON));
  const signatureBase = concat([authDataBuffer, clientDataHash]);
  const signature = toBuffer(assertionResponse.signature);
  if ((counter > 0 || credential.counter > 0) && counter <= credential.counter) {
    throw new Error(`Response counter value ${counter} was lower than expected ${credential.counter}`);
  }
  const { credentialDeviceType, credentialBackedUp } = parseBackupFlags(flags);
  const toReturn = {
    verified: await verifySignature({
      signature,
      data: signatureBase,
      credentialPublicKey: credential.publicKey
    }),
    authenticationInfo: {
      newCounter: counter,
      credentialID: credential.id,
      userVerified: flags.uv,
      credentialDeviceType,
      credentialBackedUp,
      authenticatorExtensionResults: extensionsData,
      origin: clientDataJSON.origin,
      rpID: matchedRPID
    }
  };
  return toReturn;
}
class SimpleWebAuthnGateway {
  #config;
  constructor(config) {
    this.#config = config;
  }
  async registrationOptions(input) {
    const options = await generateRegistrationOptions({
      rpName: this.#config.rpName,
      rpID: this.#config.rpId,
      userID: new TextEncoder().encode(input.userId),
      userName: input.userName,
      userDisplayName: input.userDisplayName,
      attestationType: "none",
      excludeCredentials: input.excludeCredentials.map((credential) => ({
        id: credential.credentialId,
        transports: credential.transports
      })),
      authenticatorSelection: {
        residentKey: "preferred",
        userVerification: "required"
      }
    });
    return { options, challenge: options.challenge };
  }
  async verifyRegistration(input) {
    const verification = await verifyRegistrationResponse({
      response: input.response,
      expectedChallenge: input.expectedChallenge,
      expectedOrigin: this.#config.origin,
      expectedRPID: this.#config.rpId,
      requireUserVerification: true
    });
    if (!verification.verified || !verification.registrationInfo) {
      throw new Error("Registration verification failed");
    }
    return {
      credentialId: verification.registrationInfo.credential.id,
      publicKey: verification.registrationInfo.credential.publicKey,
      counter: verification.registrationInfo.credential.counter,
      ...verification.registrationInfo.aaguid ? { aaguid: verification.registrationInfo.aaguid } : {}
    };
  }
  async authenticationOptions(input) {
    const options = await generateAuthenticationOptions({
      rpID: this.#config.rpId,
      userVerification: "required",
      allowCredentials: input.allowCredentials.map((credential) => ({
        id: credential.credentialId,
        transports: credential.transports
      }))
    });
    return { options, challenge: options.challenge };
  }
  async verifyAuthentication(input) {
    const verification = await verifyAuthenticationResponse({
      response: input.response,
      expectedChallenge: input.expectedChallenge,
      expectedOrigin: this.#config.origin,
      expectedRPID: this.#config.rpId,
      credential: {
        id: input.credential.credentialId,
        publicKey: input.credential.publicKey,
        counter: input.credential.counter,
        transports: input.credential.transports
      },
      requireUserVerification: true
    });
    if (!verification.verified || !verification.authenticationInfo) {
      throw new Error("Authentication verification failed");
    }
    return { counter: verification.authenticationInfo.newCounter };
  }
}
class AuthService {
  #store;
  #principals;
  #webauthn;
  #clock;
  #sessionTtlMs;
  #stepUpTtlMs;
  #secureCookies;
  #bootstrapSecret;
  constructor(options) {
    this.#store = options.store;
    this.#principals = options.principals;
    this.#webauthn = options.webauthn;
    this.#clock = options.clock ?? systemClock;
    this.#sessionTtlMs = options.sessionTtlMs ?? SESSION_TTL_MS;
    this.#stepUpTtlMs = options.stepUpTtlMs ?? STEP_UP_TTL_MS;
    this.#secureCookies = options.secureCookies ?? false;
    this.#bootstrapSecret = options.bootstrapSecret ?? null;
  }
  async beginPasskeyRegistration(actor, input) {
    await this.#assertRegistrationAuthority(actor, input);
    const principal = await this.#requireHumanPrincipal(input.principalId, input.workspaceId);
    let identity = await this.#store.getIdentityByLabel(input.workspaceId, principal.id, input.label);
    if (!identity) {
      identity = {
        id: asAuthIdentityId(newId("authIdentity")),
        workspaceId: input.workspaceId,
        principalId: principal.id,
        label: input.label,
        state: "active",
        createdAt: this.#clock.now()
      };
      await this.#store.createIdentity(identity);
    }
    const existing = await this.#store.listPasskeysForIdentity(identity.id);
    const { options, challenge } = await this.#webauthn.registrationOptions({
      userId: identity.id,
      userName: `${input.label}@${input.workspaceId}`,
      userDisplayName: input.label,
      excludeCredentials: existing
    });
    const challengeId = asWebAuthnChallengeId(newId("webauthnChallenge"));
    await this.#store.createChallenge({
      id: challengeId,
      workspaceId: input.workspaceId,
      principalId: principal.id,
      identityId: identity.id,
      purpose: "registration",
      challenge,
      operation: null,
      expiresAt: this.#clock.now() + 5 * 6e4,
      createdAt: this.#clock.now()
    });
    return { challengeId, options };
  }
  async finishPasskeyRegistration(actor, input) {
    const record = await this.#requireChallenge(input.challengeId, "registration");
    await this.#assertActorOwnsPrincipal(actor, record.principalId);
    assertDomain(record.identityId, "IDENTITY_REQUIRED", "Registration identity is missing", 422);
    const verified = await this.#webauthn.verifyRegistration({
      response: input.response,
      expectedChallenge: record.challenge
    });
    const credential = {
      id: asPasskeyCredentialId(newId("passkey")),
      identityId: record.identityId,
      credentialId: verified.credentialId,
      publicKey: verified.publicKey,
      counter: verified.counter,
      transports: input.transports ?? [],
      aaguid: verified.aaguid ?? null,
      createdAt: this.#clock.now(),
      lastUsedAt: null
    };
    await this.#store.createPasskey(credential);
    await this.#store.deleteChallenge(record.id);
    return { identityId: record.identityId };
  }
  async beginLogin(input) {
    const principal = await this.#requireHumanPrincipal(input.principalId, input.workspaceId);
    const identity = await this.#store.getIdentityByLabel(input.workspaceId, principal.id, input.label);
    assertDomain(identity && identity.state === "active", "AUTH_IDENTITY_NOT_FOUND", "Authentication identity not found", 404);
    const credentials = await this.#store.listPasskeysForIdentity(identity.id);
    assertDomain(credentials.length > 0, "PASSKEY_NOT_FOUND", "No passkeys registered for this identity", 404);
    const { options, challenge } = await this.#webauthn.authenticationOptions({ allowCredentials: credentials });
    const challengeId = asWebAuthnChallengeId(newId("webauthnChallenge"));
    await this.#store.createChallenge({
      id: challengeId,
      workspaceId: input.workspaceId,
      principalId: principal.id,
      identityId: identity.id,
      purpose: "authentication",
      challenge,
      operation: null,
      expiresAt: this.#clock.now() + 5 * 6e4,
      createdAt: this.#clock.now()
    });
    return { challengeId, options };
  }
  /** Preview / PoC only: session without WebAuthn; pre-grants step-up for owner workflows. */
  async issueInstantOwnerSession(input) {
    await this.#requireHumanPrincipal(input.principalId, input.workspaceId);
    const issue = await this.#issueSession({
      workspaceId: input.workspaceId,
      principalId: input.principalId,
      userAgent: input.userAgent ?? null,
      ipHint: input.ipHint ?? null
    });
    const expiresAt = this.#clock.now() + this.#stepUpTtlMs;
    for (const operation of Object.values(StepUpOperations)) {
      await this.#store.upsertStepUp({
        id: asSessionStepUpId(newId("sessionStepUp")),
        sessionId: issue.session.id,
        operation,
        expiresAt,
        createdAt: this.#clock.now()
      });
    }
    return issue;
  }
  async finishLogin(input) {
    const record = await this.#requireChallenge(input.challengeId, "authentication");
    assertDomain(record.identityId, "IDENTITY_REQUIRED", "Authentication identity is missing", 422);
    const passkey = await this.#store.getPasskeyByCredentialId(input.response.id);
    assertDomain(passkey, "PASSKEY_NOT_FOUND", "Passkey not found", 404);
    const verified = await this.#webauthn.verifyAuthentication({
      response: input.response,
      expectedChallenge: record.challenge,
      credential: passkey
    });
    await this.#store.updatePasskeyCounter(passkey.id, verified.counter, this.#clock.now());
    await this.#store.deleteChallenge(record.id);
    assertDomain(record.principalId, "PRINCIPAL_REQUIRED", "Principal is required", 422);
    return this.#issueSession({
      workspaceId: record.workspaceId,
      principalId: record.principalId,
      userAgent: input.userAgent ?? null,
      ipHint: input.ipHint ?? null
    });
  }
  async beginStepUp(actor, operation) {
    assertDomain(actor.authSessionId, "SESSION_REQUIRED", "An authenticated session is required for step-up", 401);
    assertDomain(actor.actorType === "human", "STEP_UP_HUMAN_ONLY", "Only human principals can perform step-up authentication", 403);
    const session = await this.#requireActiveSession(actor.authSessionId);
    assertDomain(session.principalId === actor.actorId, "SESSION_PRINCIPAL_MISMATCH", "Session does not belong to the actor", 403);
    const identities = await this.#store.listIdentitiesForPrincipal(actor.actorId);
    const credentials = [];
    for (const identity of identities) {
      credentials.push(...await this.#store.listPasskeysForIdentity(identity.id));
    }
    assertDomain(credentials.length > 0, "PASSKEY_NOT_FOUND", "No passkeys available for step-up", 404);
    const { options, challenge } = await this.#webauthn.authenticationOptions({ allowCredentials: credentials });
    const challengeId = asWebAuthnChallengeId(newId("webauthnChallenge"));
    await this.#store.createChallenge({
      id: challengeId,
      workspaceId: session.workspaceId,
      principalId: actor.actorId,
      identityId: null,
      purpose: "step-up",
      challenge,
      operation,
      expiresAt: this.#clock.now() + 5 * 6e4,
      createdAt: this.#clock.now()
    });
    return { challengeId, options, operation };
  }
  async finishStepUp(actor, input) {
    assertDomain(actor.authSessionId, "SESSION_REQUIRED", "An authenticated session is required for step-up", 401);
    const record = await this.#requireChallenge(input.challengeId, "step-up");
    assertDomain(record.operation, "STEP_UP_OPERATION_REQUIRED", "Step-up operation is missing", 422);
    const passkey = await this.#store.getPasskeyByCredentialId(input.response.id);
    assertDomain(passkey, "PASSKEY_NOT_FOUND", "Passkey not found", 404);
    await this.#webauthn.verifyAuthentication({
      response: input.response,
      expectedChallenge: record.challenge,
      credential: passkey
    });
    await this.#store.deleteChallenge(record.id);
    const expiresAt = this.#clock.now() + this.#stepUpTtlMs;
    await this.#store.upsertStepUp({
      id: asSessionStepUpId(newId("sessionStepUp")),
      sessionId: actor.authSessionId,
      operation: record.operation,
      expiresAt,
      createdAt: this.#clock.now()
    });
    return { operation: record.operation, expiresAt };
  }
  async assertStepUp(actor, input) {
    if (actor.authenticationMethod !== "session" || !actor.authSessionId)
      return;
    const operation = requiredStepUpOperation(input);
    if (!operation)
      return;
    if (actor.actorType !== "human") {
      throw new DomainError("STEP_UP_REQUIRED", "Step-up authentication is required for this operation", 403, { operation });
    }
    if (!actor.authSessionId) {
      throw new DomainError("SESSION_REQUIRED", "A server-side session is required for this operation", 401, { operation });
    }
    const stepUp = await this.#store.getStepUp(actor.authSessionId, operation, this.#clock.now());
    if (!stepUp) {
      throw new DomainError("STEP_UP_REQUIRED", "Recent step-up authentication is required for this operation", 403, { operation });
    }
  }
  async resolveSessionFromRequest(request) {
    const cookies = parseCookies(request.headers.get("cookie"));
    const token = cookies.get(SESSION_COOKIE);
    if (!token)
      return null;
    const tokenHash = await hashSecret(token);
    const session = await this.#store.getSessionByTokenHash(tokenHash);
    if (!session || session.revokedAt !== null || session.expiresAt <= this.#clock.now())
      return null;
    session.lastSeenAt = this.#clock.now();
    await this.#store.updateSession(session);
    return session;
  }
  actorFromSession(session, request) {
    return {
      actorId: session.principalId,
      actorType: "human",
      requestId: request.headers.get("x-request-id") ?? crypto.randomUUID(),
      authSessionId: session.id,
      authenticationMethod: "session"
    };
  }
  async assertCsrf(request, session) {
    await assertCsrfForMutation(request, session.csrfTokenHash);
  }
  async logout(actor) {
    if (!actor.authSessionId)
      return;
    const session = await this.#store.getSession(actor.authSessionId);
    if (!session)
      return;
    session.revokedAt = this.#clock.now();
    await this.#store.updateSession(session);
    await this.#store.deleteStepUpsForSession(session.id);
  }
  async getSessionView(actor) {
    assertDomain(actor.authSessionId, "SESSION_REQUIRED", "No active session", 401);
    const session = await this.#requireActiveSession(actor.authSessionId);
    return { sessionId: session.id, principalId: session.principalId, expiresAt: session.expiresAt };
  }
  async listSessions(actor) {
    const sessions = await this.#store.listSessionsForPrincipal(actor.actorId);
    const now = this.#clock.now();
    return sessions.filter((session) => session.revokedAt === null && session.expiresAt > now).map((session) => ({
      id: session.id,
      createdAt: session.createdAt,
      expiresAt: session.expiresAt,
      lastSeenAt: session.lastSeenAt,
      current: session.id === actor.authSessionId
    }));
  }
  async revokeSession(actor, sessionId) {
    const session = await this.#store.getSession(sessionId);
    assertDomain(session, "SESSION_NOT_FOUND", "Session not found", 404);
    assertDomain(session.principalId === actor.actorId, "SESSION_FORBIDDEN", "Cannot revoke another principal's session", 403);
    session.revokedAt = this.#clock.now();
    await this.#store.updateSession(session);
    if (session.id === actor.authSessionId) {
      await this.#store.deleteStepUpsForSession(session.id);
    }
  }
  async revokeAllSessions(actor) {
    await this.assertStepUp(actor, { action: "session.revoke-all", capability: "session.revoke-all", risk: "high" });
    const sessions = await this.#store.listSessionsForPrincipal(actor.actorId);
    const now = this.#clock.now();
    for (const session of sessions) {
      if (session.revokedAt !== null)
        continue;
      session.revokedAt = now;
      await this.#store.updateSession(session);
      await this.#store.deleteStepUpsForSession(session.id);
    }
  }
  sessionCookieHeaders(issue) {
    const maxAge = Math.floor(this.#sessionTtlMs / 1e3);
    const secure = this.#secureCookies;
    return [
      serializeCookie(SESSION_COOKIE, issue.sessionToken, { maxAgeSeconds: maxAge, httpOnly: true, secure, sameSite: "Lax" }),
      serializeCookie("baser_csrf", issue.csrfToken, { maxAgeSeconds: maxAge, httpOnly: false, secure, sameSite: "Lax" })
    ];
  }
  clearSessionCookieHeaders() {
    return [clearCookie(SESSION_COOKIE), clearCookie("baser_csrf")];
  }
  async #issueSession(input) {
    const now = this.#clock.now();
    const sessionToken = randomToken();
    const csrfToken = randomToken(24);
    const session = {
      id: asAuthSessionId(newId("authSession")),
      workspaceId: input.workspaceId,
      principalId: input.principalId,
      tokenHash: await hashSecret(sessionToken),
      csrfTokenHash: await hashSecret(csrfToken),
      userAgent: input.userAgent,
      ipHint: input.ipHint,
      createdAt: now,
      expiresAt: now + this.#sessionTtlMs,
      rotatedAt: null,
      revokedAt: null,
      lastSeenAt: now
    };
    await this.#store.createSession(session);
    return { session, sessionToken, csrfToken };
  }
  async #assertRegistrationAuthority(actor, input) {
    if (actor.authenticationMethod === "session" || actor.authSessionId) {
      await this.#assertActorOwnsPrincipal(actor, input.principalId);
      return;
    }
    if (actor.authenticationMethod === "dev-header" && actor.actorId === input.principalId) {
      return;
    }
    if (this.#bootstrapSecret && input.bootstrapSecret === this.#bootstrapSecret && actor.actorId === input.principalId) {
      return;
    }
    throw new DomainError("REGISTRATION_FORBIDDEN", "Passkey registration requires an authenticated session or bootstrap secret", 403);
  }
  async #assertActorOwnsPrincipal(actor, principalId) {
    assertDomain(principalId, "PRINCIPAL_REQUIRED", "Principal is required", 422);
    assertDomain(actor.actorId === principalId, "PRINCIPAL_MISMATCH", "Actor cannot register passkeys for another principal", 403);
    assertDomain(actor.actorType === "human", "HUMAN_ONLY", "Only human principals can manage authentication identities", 403);
  }
  async #requireHumanPrincipal(principalId, workspaceId) {
    const principal = await this.#principals.getPrincipal(principalId);
    assertDomain(principal, "PRINCIPAL_NOT_FOUND", "Principal not found", 404);
    assertDomain(principal.type === "human", "HUMAN_PRINCIPAL_REQUIRED", "Authentication identities can only be linked to human principals", 422);
    assertDomain(principal.workspaceId === workspaceId, "WORKSPACE_MISMATCH", "Principal belongs to another workspace", 403);
    assertDomain(principal.state === "active", "PRINCIPAL_DISABLED", "Principal is disabled", 403);
    return principal;
  }
  async #requireChallenge(id, purpose) {
    const record = await this.#store.getChallenge(id);
    assertDomain(record, "CHALLENGE_NOT_FOUND", "WebAuthn challenge not found", 404);
    assertDomain(record.purpose === purpose, "CHALLENGE_PURPOSE_MISMATCH", "WebAuthn challenge purpose mismatch", 422);
    assertDomain(record.expiresAt > this.#clock.now(), "CHALLENGE_EXPIRED", "WebAuthn challenge has expired", 410);
    return record;
  }
  async #requireActiveSession(id) {
    const session = await this.#store.getSession(id);
    assertDomain(session, "SESSION_NOT_FOUND", "Session not found", 404);
    assertDomain(session.revokedAt === null, "SESSION_REVOKED", "Session has been revoked", 401);
    assertDomain(session.expiresAt > this.#clock.now(), "SESSION_EXPIRED", "Session has expired", 401);
    return session;
  }
}
function actorFromDevHeaders(request) {
  const principalId = request.headers.get("x-baser-principal-id");
  const type = request.headers.get("x-baser-principal-type");
  if (!principalId || !isPrincipalType$1(type)) {
    throw new DomainError("AUTHENTICATION_REQUIRED", "Principal headers are required", 401);
  }
  const context = {
    actorId: asPrincipalId(principalId),
    actorType: type,
    requestId: request.headers.get("x-request-id") ?? crypto.randomUUID(),
    authenticationMethod: "dev-header"
  };
  const onBehalfOf = request.headers.get("x-baser-on-behalf-of");
  const delegationId = request.headers.get("x-baser-delegation-id");
  if (onBehalfOf)
    context.onBehalfOf = asPrincipalId(onBehalfOf);
  if (delegationId)
    context.delegationId = delegationId;
  return context;
}
function isPrincipalType$1(value) {
  return value === "human" || value === "agent" || value === "service" || value === "external-client";
}
class TestWebAuthnGateway {
  async registrationOptions(input) {
    const challenge = base64UrlEncode(new TextEncoder().encode(`register:${input.userId}:${crypto.randomUUID()}`));
    return {
      challenge,
      options: {
        challenge,
        rp: { id: "localhost", name: "test" },
        user: { id: input.userId, name: input.userName, displayName: input.userDisplayName }
      }
    };
  }
  async verifyRegistration(input) {
    const clientData = JSON.parse(new TextDecoder().decode(base64UrlToBytes(input.response.response.clientDataJSON)));
    if (clientData.challenge !== input.expectedChallenge) {
      throw new DomainError("WEBAUTHN_VERIFICATION_FAILED", "Registration challenge mismatch", 401);
    }
    const credentialId = input.response.id;
    const publicKey = new Uint8Array(65);
    publicKey[0] = 4;
    return { credentialId, publicKey, counter: 0 };
  }
  async authenticationOptions(input) {
    const challenge = base64UrlEncode(new TextEncoder().encode(`auth:${input.allowCredentials[0]?.credentialId ?? "none"}:${crypto.randomUUID()}`));
    return {
      challenge,
      options: { challenge, allowCredentials: input.allowCredentials.map((entry) => ({ id: entry.credentialId })) }
    };
  }
  async verifyAuthentication(input) {
    if (input.response.id !== input.credential.credentialId) {
      throw new DomainError("WEBAUTHN_VERIFICATION_FAILED", "Credential mismatch", 401);
    }
    const clientData = JSON.parse(new TextDecoder().decode(base64UrlToBytes(input.response.response.clientDataJSON)));
    if (clientData.challenge !== input.expectedChallenge) {
      throw new DomainError("WEBAUTHN_VERIFICATION_FAILED", "Authentication challenge mismatch", 401);
    }
    return { counter: input.credential.counter + 1 };
  }
}
function base64UrlToBytes(value) {
  const padded = value.replace(/-/g, "+").replace(/_/g, "/") + "=".repeat((4 - value.length % 4) % 4);
  const binary = atob(padded);
  return Uint8Array.from(binary, (character) => character.charCodeAt(0));
}
function parseInstantOwnerHint(raw) {
  if (!raw?.trim())
    return null;
  try {
    const value = JSON.parse(raw);
    if (typeof value.workspaceId === "string" && typeof value.ownerPrincipalId === "string" && typeof value.siteId === "string") {
      return {
        workspaceId: value.workspaceId,
        ownerPrincipalId: value.ownerPrincipalId,
        siteId: value.siteId,
        ...typeof value.siteName === "string" ? { siteName: value.siteName } : {},
        ...typeof value.publicUrl === "string" ? { publicUrl: value.publicUrl } : {}
      };
    }
  } catch {
    return null;
  }
  return null;
}
function instantLoginEnabled(env) {
  return !isProductionEnv(env) && env.BASER_INSTANT_LOGIN === "true" && Boolean(parseInstantOwnerHint(env.BASER_INSTANT_OWNER_HINT));
}
function createPrincipalLookup(cms) {
  return {
    getPrincipal: async (principalId) => {
      const principal = await cms.store.getPrincipal(principalId);
      if (!principal)
        return null;
      return {
        id: principal.id,
        workspaceId: principal.workspaceId,
        type: principal.type,
        state: principal.state
      };
    }
  };
}
function isProductionEnv(env) {
  return env.BASER_ENV === "production";
}
async function resolveActorContext(request, env, auth) {
  assertCloudflareAccessBoundary(request, {
    required: env.CF_ACCESS_REQUIRED === "true",
    ...env.BASER_AUTH_RP_ID ? { teamDomain: env.BASER_AUTH_RP_ID } : {}
  });
  const hasDevHeaders = Boolean(request.headers.get("x-baser-principal-id"));
  if (isProductionEnv(env) && hasDevHeaders) {
    throw new DomainError("DEV_AUTH_FORBIDDEN", "Development principal headers are not allowed in production", 403);
  }
  if (!isProductionEnv(env) && hasDevHeaders) {
    return actorFromDevHeaders(request);
  }
  const session = await auth.resolveSessionFromRequest(request);
  if (session) {
    const actor = auth.actorFromSession(session, request);
    await auth.assertCsrf(request, session);
    return actor;
  }
  throw new DomainError("AUTHENTICATION_REQUIRED", "A valid session or development principal headers are required", 401);
}
async function handleAuthRoute(request, url, env, auth, readJson2) {
  if (request.method === "GET" && url.pathname === "/v1/auth/instant-entry") {
    if (!instantLoginEnabled(env))
      return json$1({ available: false });
    const hint = parseInstantOwnerHint(env.BASER_INSTANT_OWNER_HINT);
    return json$1({
      available: true,
      siteName: hint.siteName ?? "マイサイト",
      siteId: hint.siteId
    });
  }
  if (request.method === "POST" && url.pathname === "/v1/auth/instant-login") {
    if (!instantLoginEnabled(env)) {
      throw new DomainError("INSTANT_LOGIN_DISABLED", "Instant login is not available", 404);
    }
    const hint = parseInstantOwnerHint(env.BASER_INSTANT_OWNER_HINT);
    const issue = await auth.issueInstantOwnerSession({
      workspaceId: hint.workspaceId,
      principalId: asPrincipalId(hint.ownerPrincipalId),
      userAgent: request.headers.get("user-agent"),
      ipHint: request.headers.get("cf-connecting-ip")
    });
    return json$1({
      workspaceId: hint.workspaceId,
      siteId: hint.siteId,
      ownerPrincipalId: hint.ownerPrincipalId,
      siteName: hint.siteName ?? "マイサイト",
      publicUrl: hint.publicUrl ?? "",
      instantDemo: true
    }, 201, auth.sessionCookieHeaders(issue));
  }
  if (request.method === "POST" && url.pathname === "/v1/auth/passkeys/register/begin") {
    const body = await readJson2(request);
    const actor = await resolveActorContext(request, env, auth);
    const result = await auth.beginPasskeyRegistration(actor, {
      workspaceId: body.workspaceId,
      principalId: asPrincipalId(String(body.principalId)),
      label: String(body.label),
      ...typeof body.bootstrapSecret === "string" ? { bootstrapSecret: body.bootstrapSecret } : {}
    });
    return json$1({ challengeId: result.challengeId, options: result.options });
  }
  if (request.method === "POST" && url.pathname === "/v1/auth/passkeys/register/finish") {
    const body = await readJson2(request);
    const actor = await resolveActorContext(request, env, auth);
    const result = await auth.finishPasskeyRegistration(actor, {
      challengeId: asWebAuthnChallengeId(String(body.challengeId)),
      response: body.response,
      transports: Array.isArray(body.transports) ? body.transports.map(String) : []
    });
    return json$1(result, 201);
  }
  if (request.method === "POST" && url.pathname === "/v1/auth/login/begin") {
    const body = await readJson2(request);
    const result = await auth.beginLogin({
      workspaceId: body.workspaceId,
      principalId: asPrincipalId(String(body.principalId)),
      label: String(body.label)
    });
    return json$1(result);
  }
  if (request.method === "POST" && url.pathname === "/v1/auth/login/finish") {
    const body = await readJson2(request);
    const issue = await auth.finishLogin({
      challengeId: asWebAuthnChallengeId(String(body.challengeId)),
      response: body.response,
      userAgent: request.headers.get("user-agent"),
      ipHint: request.headers.get("cf-connecting-ip")
    });
    return json$1({ principalId: issue.session.principalId, expiresAt: issue.session.expiresAt }, 201, auth.sessionCookieHeaders(issue));
  }
  if (request.method === "GET" && url.pathname === "/v1/auth/session") {
    const actor = await resolveActorContext(request, env, auth);
    return json$1(await auth.getSessionView(actor));
  }
  if (request.method === "GET" && url.pathname === "/v1/auth/sessions") {
    const actor = await resolveActorContext(request, env, auth);
    return json$1(await auth.listSessions(actor));
  }
  if (request.method === "DELETE" && url.pathname === "/v1/auth/sessions") {
    const actor = await resolveActorContext(request, env, auth);
    await auth.revokeAllSessions(actor);
    return clearCookieResponse(auth.clearSessionCookieHeaders());
  }
  const sessionMatch = url.pathname.match(/^\/v1\/auth\/sessions\/([^/]+)$/);
  if (request.method === "DELETE" && sessionMatch?.[1]) {
    const actor = await resolveActorContext(request, env, auth);
    await auth.revokeSession(actor, sessionMatch[1]);
    return new Response(null, { status: 204 });
  }
  if (request.method === "POST" && url.pathname === "/v1/auth/logout") {
    const actor = await resolveActorContext(request, env, auth);
    await auth.logout(actor);
    return clearCookieResponse(auth.clearSessionCookieHeaders());
  }
  if (request.method === "POST" && url.pathname === "/v1/auth/step-up/begin") {
    const body = await readJson2(request);
    const actor = await resolveActorContext(request, env, auth);
    const operation = String(body.operation);
    const result = await auth.beginStepUp(actor, operation);
    return json$1(result);
  }
  if (request.method === "POST" && url.pathname === "/v1/auth/step-up/finish") {
    const body = await readJson2(request);
    const actor = await resolveActorContext(request, env, auth);
    const result = await auth.finishStepUp(actor, {
      challengeId: asWebAuthnChallengeId(String(body.challengeId)),
      response: body.response
    });
    return json$1(result);
  }
  return null;
}
function clearCookieResponse(cookies) {
  const headers = new Headers();
  for (const cookie of cookies)
    headers.append("set-cookie", cookie);
  return new Response(null, { status: 204, headers });
}
function json$1(value, status = 200, setCookies = []) {
  const headers = new Headers({ "content-type": "application/json; charset=utf-8" });
  for (const cookie of setCookies)
    headers.append("set-cookie", cookie);
  return new Response(JSON.stringify(value), { status, headers });
}
function resolveConsoleCapabilities(env) {
  const assetPublicDelivery = Boolean(env.R2);
  return {
    assetPublicDelivery,
    assetStorage: assetPublicDelivery ? "r2" : "memory",
    environment: isProductionEnv(env) ? "production" : "preview",
    instantLogin: instantLoginEnabled(env),
    publicSiteUrl: pickPublicSiteUrl(env)
  };
}
function pickPublicSiteUrl(env) {
  const preview = env.PREVIEW_BASE_URL?.trim();
  const pub = env.PUBLIC_BASE_URL?.trim();
  const candidate = preview && !isPlaceholderUrl(preview) ? preview : pub;
  if (!candidate || isPlaceholderUrl(candidate))
    return null;
  try {
    return new URL(candidate).toString().replace(/\/$/, "");
  } catch {
    return null;
  }
}
function isPlaceholderUrl(value) {
  return value.includes("example.invalid");
}
const memoryStore = new MemoryCmsStore();
const memoryCms = new CmsService(memoryStore);
const memoryAssetMetadata = new MemoryAssetMetadataStore();
const memoryAssetObjects = new MemoryAssetObjectStore();
const memoryPreviewStore = new MemoryPreviewStore();
const memoryBlogStore = new MemoryBlogStore();
const memoryCustomContentStore = new MemoryCustomContentStore();
const memoryMailFormStore = new MemoryMailFormStore();
const memoryThemeStore = new MemoryThemeStore();
const memoryPluginStore = new MemoryPluginStore();
const memoryTrustedPluginRuntime = new MemoryTrustedPluginRuntime();
let activeCorsRequest;
let activeCorsEnv;
function mapConsoleUrlToAssetPath(pathname) {
  if (pathname === "/console")
    return "/index.html";
  if (!pathname.startsWith("/console/"))
    return null;
  const rest = pathname.slice("/console".length);
  if (!rest || rest === "/")
    return "/index.html";
  return rest;
}
async function tryServeConsole(request, env) {
  const url = new URL(request.url);
  if (!env.STATIC_ASSETS)
    return null;
  const assetPath = mapConsoleUrlToAssetPath(url.pathname);
  if (!assetPath)
    return null;
  const assetUrl = new URL(assetPath, url.origin);
  return env.STATIC_ASSETS.fetch(new Request(assetUrl, request));
}
function createApiWorker(resolveCms = defaultResolver, options = {}) {
  return {
    async fetch(request, env) {
      activeCorsRequest = request;
      activeCorsEnv = env;
      try {
        if (request.method === "OPTIONS")
          return withCors(new Response(null, { status: 204 }));
        const url = new URL(request.url);
        if (request.method === "GET" && url.pathname === "/") {
          return Response.redirect(`${url.origin}/console/`, 302);
        }
        const consoleResponse = await tryServeConsole(request, env);
        if (consoleResponse)
          return consoleResponse;
        const cms = resolveCms(env);
        const auth = options.resolveAuth?.(env, cms) ?? createAuthService(env, cms);
        cms.attachSecurityHooks({ assertStepUp: (actor, input) => auth.assertStepUp(actor, input) });
        const assets = options.resolveAssets?.(env, cms) ?? createAssetService(env, cms);
        const previews = options.resolvePreviews?.(env, cms) ?? createPreviewService(env, cms);
        const blog = options.resolveBlog?.(env, cms) ?? createBlogService(env, cms);
        const customContent = options.resolveCustomContent?.(env, cms) ?? createCustomContentService(env, cms);
        const mailForms = options.resolveMailForms?.(env, cms, customContent) ?? createMailFormService(env, cms, customContent);
        const themes = options.resolveThemes?.(env, cms) ?? createThemeService(env, cms);
        const plugins = options.resolvePlugins?.(env, cms) ?? createPluginService(env, cms);
        cms.attachLifecycleHooks(plugins);
        try {
          if (request.method === "GET" && url.pathname === "/health") {
            return json({ ok: true, service: "baser-edge-api", version: "0.9.0" });
          }
          if (url.pathname === "/v1/console/capabilities") {
            if (request.method !== "GET") {
              throw new DomainError("METHOD_NOT_ALLOWED", "Only GET is supported", 405);
            }
            return json(resolveConsoleCapabilities(env));
          }
          if (request.method === "GET" && url.pathname === "/v1/dev/local-login-hint") {
            if (!env.LOCAL_DEV_LOGIN_HINT) {
              return json({
                error: {
                  code: "LOCAL_STACK_REQUIRED",
                  message: "ローカルログイン情報がありません。ルートで npm run dev:stack を起動し、http://localhost:8787/console/ を開いてください。"
                }
              }, 503);
            }
            return json(JSON.parse(env.LOCAL_DEV_LOGIN_HINT));
          }
          const authResponse = await handleAuthRoute(request, url, env, auth, readJson);
          if (authResponse)
            return withCors(authResponse);
          if (request.method === "POST" && url.pathname === "/v1/bootstrap/ready") {
            assertBootstrapAllowed(request, env);
            return json({ ready: true });
          }
          if (request.method === "POST" && url.pathname === "/v1/bootstrap") {
            assertBootstrapAllowed(request, env);
            const body = await readJson(request);
            try {
              return json(await cms.bootstrap({
                workspaceName: stringField(body, "workspaceName"),
                siteName: stringField(body, "siteName"),
                hostname: stringField(body, "hostname"),
                ownerName: stringField(body, "ownerName"),
                ...typeof body.locale === "string" ? { locale: body.locale } : {}
              }), 201);
            } catch (error) {
              if (error instanceof DomainError)
                throw error;
              const cause = error instanceof Error ? error.message : String(error);
              throw new DomainError("BOOTSTRAP_FAILED", "Bootstrap failed", 500, {
                cause: cause.slice(0, 500)
              });
            }
          }
          const uploadMatch = url.pathname.match(/^\/v1\/assets\/uploads\/([^/]+)$/);
          if (request.method === "PUT" && uploadMatch?.[1]) {
            const token = url.searchParams.get("token");
            if (!token)
              invalid("token is required");
            if (!request.body)
              invalid("upload body is required");
            const contentLengthHeader = request.headers.get("content-length");
            const contentLength = contentLengthHeader === null ? void 0 : Number(contentLengthHeader);
            const uploaded = await assets.uploadWithToken({
              sessionId: asUploadSessionId(uploadMatch[1]),
              token,
              mediaType: request.headers.get("content-type") ?? "application/octet-stream",
              ...contentLength !== void 0 && Number.isFinite(contentLength) ? { contentLength } : {},
              body: request.body
            });
            return json(uploaded, 201);
          }
          const context = await resolveActorContext(request, env, auth);
          if (request.method === "POST" && url.pathname === "/v1/plugins") {
            const body = await readJson(request);
            return json(await plugins.createPlugin(context, {
              workspaceId: stringField(body, "workspaceId"),
              key: stringField(body, "key"),
              name: stringField(body, "name"),
              trust: pluginTrust(body.trust),
              ...typeof body.description === "string" ? { description: body.description } : {}
            }), 201);
          }
          const workspacePluginsMatch = url.pathname.match(/^\/v1\/workspaces\/([^/]+)\/plugins$/);
          if (request.method === "GET" && workspacePluginsMatch?.[1])
            return json(await plugins.listPlugins(context, workspacePluginsMatch[1]));
          const pluginReleasesMatch = url.pathname.match(/^\/v1\/plugins\/([^/]+)\/releases$/);
          if (request.method === "POST" && pluginReleasesMatch?.[1]) {
            const body = await readJson(request);
            return json(await plugins.createRelease(context, { pluginId: asPluginId(pluginReleasesMatch[1]), version: stringField(body, "version"), manifest: pluginManifestField(body.manifest), bundle: pluginBundleField(body.bundle) }), 201);
          }
          if (request.method === "GET" && pluginReleasesMatch?.[1])
            return json(await plugins.listReleases(context, asPluginId(pluginReleasesMatch[1])));
          const pluginInvocationsMatch = url.pathname.match(/^\/v1\/plugin-releases\/([^/]+)\/invocations$/);
          if (request.method === "GET" && pluginInvocationsMatch?.[1])
            return json(await plugins.listInvocations(context, asPluginReleaseId(pluginInvocationsMatch[1])));
          const pluginActivationsMatch = url.pathname.match(/^\/v1\/workspaces\/([^/]+)\/plugin-activations$/);
          if (request.method === "POST" && pluginActivationsMatch?.[1]) {
            const body = await readJson(request);
            return json(await plugins.activate(context, { workspaceId: pluginActivationsMatch[1], siteId: typeof body.siteId === "string" ? asSiteId(body.siteId) : null, pluginReleaseId: asPluginReleaseId(stringField(body, "pluginReleaseId")), grantedCapabilities: pluginCapabilitiesField(body.grantedCapabilities), allowedHosts: typeof body.allowedHosts === "undefined" ? [] : stringArray(body.allowedHosts, "allowedHosts") }), 201);
          }
          if (request.method === "GET" && pluginActivationsMatch?.[1]) {
            const siteId = url.searchParams.get("siteId");
            return json(await plugins.listActivations(context, pluginActivationsMatch[1], ...siteId ? [asSiteId(siteId)] : []));
          }
          const pluginActivationMatch = url.pathname.match(/^\/v1\/plugin-activations\/([^/]+)$/);
          if (request.method === "DELETE" && pluginActivationMatch?.[1]) {
            await plugins.deactivate(context, asPluginActivationId(pluginActivationMatch[1]));
            return new Response(null, { status: 204 });
          }
          const pluginAdminMatch = url.pathname.match(/^\/v1\/workspaces\/([^/]+)\/plugin-admin-extensions$/);
          if (request.method === "GET" && pluginAdminMatch?.[1])
            return json(await plugins.listAdminExtensions(context, pluginAdminMatch[1], url.searchParams.get("siteId") ? asSiteId(url.searchParams.get("siteId")) : null));
          const pluginRouteMatch = url.pathname.match(/^\/v1\/plugin-routes\/([^/]+)(\/.*)?$/);
          if ((request.method === "GET" || request.method === "POST") && pluginRouteMatch?.[1]) {
            const workspaceId = url.searchParams.get("workspaceId");
            if (!workspaceId)
              invalid("workspaceId query parameter is required");
            const query = Object.fromEntries([...url.searchParams.entries()].filter(([key2]) => key2 !== "workspaceId" && key2 !== "siteId"));
            const result = await plugins.invokeRoute(context, { workspaceId, siteId: url.searchParams.get("siteId") ? asSiteId(url.searchParams.get("siteId")) : null, pluginKey: pluginRouteMatch[1], method: request.method, path: pluginRouteMatch[2] ?? "/", query, headers: Object.fromEntries(request.headers), body: request.method === "POST" ? await readOptionalJson(request) : null });
            return withCors(new Response(result.body, { status: result.status, headers: result.headers }));
          }
          if (request.method === "POST" && url.pathname === "/v1/principals") {
            const body = await readJson(request);
            return json(await cms.createPrincipal(context, {
              workspaceId: stringField(body, "workspaceId"),
              type: principalType(body.type),
              displayName: stringField(body, "displayName")
            }), 201);
          }
          if (request.method === "POST" && url.pathname === "/v1/grants") {
            const body = await readJson(request);
            return json(await cms.grantCapability(context, {
              principalId: asPrincipalId(stringField(body, "principalId")),
              capability: stringField(body, "capability"),
              ...isRecord(body.scope) ? { scope: body.scope } : {},
              ...typeof body.validUntil === "number" ? { validUntil: body.validUntil } : {}
            }), 201);
          }
          if (request.method === "POST" && url.pathname === "/v1/themes") {
            const body = await readJson(request);
            return json(await themes.createTheme(context, { workspaceId: stringField(body, "workspaceId"), key: stringField(body, "key"), name: stringField(body, "name"), ...typeof body.description === "string" ? { description: body.description } : {} }), 201);
          }
          const workspaceThemesMatch = url.pathname.match(/^\/v1\/workspaces\/([^/]+)\/themes$/);
          if (request.method === "GET" && workspaceThemesMatch?.[1])
            return json(await themes.listThemes(context, workspaceThemesMatch[1]));
          const tokenRevisionMatch = url.pathname.match(/^\/v1\/themes\/([^/]+)\/token-revisions$/);
          if (request.method === "POST" && tokenRevisionMatch?.[1]) {
            const body = await readJson(request);
            return json(await themes.createTokenRevision(context, { themeId: asThemeId(tokenRevisionMatch[1]), name: stringField(body, "name"), tokens: designTokensField(body.tokens) }), 201);
          }
          const layoutRevisionMatch = url.pathname.match(/^\/v1\/themes\/([^/]+)\/layout-revisions$/);
          if (request.method === "POST" && layoutRevisionMatch?.[1]) {
            const body = await readJson(request);
            return json(await themes.createLayoutRevision(context, { themeId: asThemeId(layoutRevisionMatch[1]), name: stringField(body, "name"), layout: layoutField(body.layout) }), 201);
          }
          const themeReleaseMatch = url.pathname.match(/^\/v1\/themes\/([^/]+)\/releases$/);
          if (request.method === "POST" && themeReleaseMatch?.[1]) {
            const body = await readJson(request);
            return json(await themes.createRelease(context, { themeId: asThemeId(themeReleaseMatch[1]), version: stringField(body, "version"), designTokenRevisionId: asDesignTokenRevisionId(stringField(body, "designTokenRevisionId")), layoutRevisionId: asLayoutRevisionId(stringField(body, "layoutRevisionId")), manifest: themeManifestField(body.manifest) }), 201);
          }
          if (request.method === "GET" && themeReleaseMatch?.[1])
            return json(await themes.listReleases(context, asThemeId(themeReleaseMatch[1])));
          const siteThemeMatch = url.pathname.match(/^\/v1\/sites\/([^/]+)\/theme$/);
          if (request.method === "GET" && siteThemeMatch?.[1])
            return json(await themes.getActive(context, asSiteId(siteThemeMatch[1])));
          const themeActivationMatch = url.pathname.match(/^\/v1\/sites\/([^/]+)\/theme-activations$/);
          if (request.method === "POST" && themeActivationMatch?.[1]) {
            const body = await readJson(request);
            return json(await themes.activate(context, { siteId: asSiteId(themeActivationMatch[1]), themeReleaseId: asThemeReleaseId(stringField(body, "themeReleaseId")) }), 201);
          }
          if (request.method === "POST" && url.pathname === "/v1/delegations") {
            const body = await readJson(request);
            return json(await cms.createDelegation(context, {
              humanPrincipalId: asPrincipalId(stringField(body, "humanPrincipalId")),
              agentPrincipalId: asPrincipalId(stringField(body, "agentPrincipalId")),
              capabilities: stringArray(body.capabilities, "capabilities"),
              expiresAt: numberField(body, "expiresAt"),
              ...isRecord(body.scope) ? { scope: body.scope } : {},
              ...isRisk(body.maximumRisk) ? { maximumRisk: body.maximumRisk } : {}
            }), 201);
          }
          if (request.method === "POST" && url.pathname === "/v1/pages") {
            const body = await readJson(request);
            return json(await cms.createPage(context, {
              siteId: asSiteId(stringField(body, "siteId")),
              parentId: typeof body.parentId === "string" ? asContentNodeId(body.parentId) : null,
              slug: stringField(body, "slug"),
              title: stringField(body, "title"),
              document: documentField(body.document)
            }), 201);
          }
          if (request.method === "POST" && url.pathname === "/v1/folders") {
            const body = await readJson(request);
            return json(await cms.createFolder(context, {
              siteId: asSiteId(stringField(body, "siteId")),
              parentId: typeof body.parentId === "string" ? asContentNodeId(body.parentId) : null,
              slug: stringField(body, "slug"),
              title: stringField(body, "title")
            }), 201);
          }
          if (request.method === "POST" && url.pathname === "/v1/aliases") {
            const body = await readJson(request);
            return json(await cms.createAlias(context, {
              siteId: asSiteId(stringField(body, "siteId")),
              parentId: typeof body.parentId === "string" ? asContentNodeId(body.parentId) : null,
              slug: stringField(body, "slug"),
              title: stringField(body, "title"),
              targetContentItemId: asContentItemId(stringField(body, "targetContentItemId"))
            }), 201);
          }
          if (request.method === "POST" && url.pathname === "/v1/blogs") {
            const body = await readJson(request);
            return json(await blog.createBlog(context, {
              siteId: asSiteId(stringField(body, "siteId")),
              parentId: typeof body.parentId === "string" ? asContentNodeId(body.parentId) : null,
              slug: stringField(body, "slug"),
              title: stringField(body, "title"),
              document: documentField(body.document),
              ...typeof body.pageSize === "number" ? { pageSize: body.pageSize } : {},
              ...typeof body.feedSize === "number" ? { feedSize: body.feedSize } : {},
              ...body.sortDirection === "asc" || body.sortDirection === "desc" ? { sortDirection: body.sortDirection } : {}
            }), 201);
          }
          const articleCreateMatch = url.pathname.match(/^\/v1\/blogs\/([^/]+)\/articles$/);
          if (request.method === "POST" && articleCreateMatch?.[1]) {
            const body = await readJson(request);
            return json(await blog.createArticle(context, {
              collectionId: asCollectionId(articleCreateMatch[1]),
              slug: stringField(body, "slug"),
              title: stringField(body, "title"),
              document: documentField(body.document),
              ...typeof body.postedAt === "number" ? { postedAt: body.postedAt } : {},
              ...Array.isArray(body.termIds) ? { termIds: body.termIds.map((value) => asTermId(String(value))) } : {}
            }), 201);
          }
          if (request.method === "GET" && articleCreateMatch?.[1]) {
            const termIds = url.searchParams.getAll("termId").map(asTermId);
            return json(await blog.listPublishedArticles(asCollectionId(articleCreateMatch[1]), {
              ...url.searchParams.has("limit") ? { limit: optionalQueryInt(url.searchParams.get("limit"), "limit", 100) } : {},
              ...url.searchParams.has("offset") ? { offset: optionalQueryInt(url.searchParams.get("offset"), "offset", 1e6) } : {},
              ...termIds.length ? { termIds } : {}
            }));
          }
          const taxonomyListMatch = url.pathname.match(/^\/v1\/blogs\/([^/]+)\/taxonomies$/);
          if (request.method === "GET" && taxonomyListMatch?.[1])
            return json(await blog.listTaxonomies(asCollectionId(taxonomyListMatch[1])));
          if (request.method === "POST" && taxonomyListMatch?.[1]) {
            const body = await readJson(request);
            const kind = body.kind === "category" || body.kind === "tag" ? body.kind : invalid("kind must be category or tag");
            return json(await blog.createTaxonomy(context, {
              collectionId: asCollectionId(taxonomyListMatch[1]),
              key: stringField(body, "key"),
              title: stringField(body, "title"),
              kind,
              ...typeof body.hierarchical === "boolean" ? { hierarchical: body.hierarchical } : {}
            }), 201);
          }
          const termCreateMatch = url.pathname.match(/^\/v1\/taxonomies\/([^/]+)\/terms$/);
          if (request.method === "POST" && termCreateMatch?.[1]) {
            const body = await readJson(request);
            return json(await blog.createTerm(context, {
              taxonomyId: asTaxonomyId(termCreateMatch[1]),
              slug: stringField(body, "slug"),
              title: stringField(body, "title"),
              ...body.parentId === null ? { parentId: null } : typeof body.parentId === "string" ? { parentId: asTermId(body.parentId) } : {}
            }), 201);
          }
          if (request.method === "POST" && url.pathname === "/v1/custom-fields") {
            const body = await readJson(request);
            return json(await customContent.createField(context, {
              workspaceId: stringField(body, "workspaceId"),
              key: stringField(body, "key"),
              name: stringField(body, "name"),
              type: customFieldType(body.type),
              ...typeof body.description === "string" ? { description: body.description } : {},
              ...Array.isArray(body.options) ? { options: body.options.map((item) => {
                if (!isRecord(item))
                  invalid("options entries must be objects");
                return { value: stringField(item, "value"), label: stringField(item, "label") };
              }) } : {}
            }), 201);
          }
          if (request.method === "GET" && url.pathname === "/v1/custom-fields") {
            const workspaceId = url.searchParams.get("workspaceId");
            if (!workspaceId)
              invalid("workspaceId is required");
            return json(await customContent.listFields(workspaceId));
          }
          if (request.method === "POST" && url.pathname === "/v1/custom-tables") {
            const body = await readJson(request);
            const kind = body.kind === "content" || body.kind === "master" ? body.kind : invalid("kind must be content or master");
            return json(await customContent.createTable(context, {
              workspaceId: stringField(body, "workspaceId"),
              key: stringField(body, "key"),
              name: stringField(body, "name"),
              kind,
              ...typeof body.hierarchical === "boolean" ? { hierarchical: body.hierarchical } : {},
              ...body.displayFieldKey === null || typeof body.displayFieldKey === "string" ? { displayFieldKey: body.displayFieldKey } : {}
            }), 201);
          }
          if (request.method === "GET" && url.pathname === "/v1/custom-tables") {
            const workspaceId = url.searchParams.get("workspaceId");
            if (!workspaceId)
              invalid("workspaceId is required");
            return json(await customContent.listTables(workspaceId));
          }
          const customTableSchemaMatch = url.pathname.match(/^\/v1\/custom-tables\/([^/]+)\/schema$/);
          if (request.method === "GET" && customTableSchemaMatch?.[1])
            return json(await customContent.getTableSchema(asCustomTableId(customTableSchemaMatch[1])));
          const customTableFieldsMatch = url.pathname.match(/^\/v1\/custom-tables\/([^/]+)\/fields$/);
          if (request.method === "POST" && customTableFieldsMatch?.[1]) {
            const body = await readJson(request);
            return json(await customContent.attachField(context, {
              tableId: asCustomTableId(customTableFieldsMatch[1]),
              fieldId: asCustomFieldId(stringField(body, "fieldId")),
              ...typeof body.required === "boolean" ? { required: body.required } : {},
              ...typeof body.searchable === "boolean" ? { searchable: body.searchable } : {},
              ...typeof body.unique === "boolean" ? { unique: body.unique } : {},
              ...typeof body.sortOrder === "number" ? { sortOrder: body.sortOrder } : {},
              ...body.labelOverride === null || typeof body.labelOverride === "string" ? { labelOverride: body.labelOverride } : {}
            }), 201);
          }
          if (request.method === "POST" && url.pathname === "/v1/custom-contents") {
            const body = await readJson(request);
            return json(await customContent.createCustomContent(context, {
              siteId: asSiteId(stringField(body, "siteId")),
              parentId: typeof body.parentId === "string" ? asContentNodeId(body.parentId) : null,
              slug: stringField(body, "slug"),
              title: stringField(body, "title"),
              tableId: asCustomTableId(stringField(body, "tableId")),
              ...isRecord(body.document) ? { document: documentField(body.document) } : {},
              ...typeof body.listCount === "number" ? { listCount: body.listCount } : {},
              ...typeof body.listOrderFieldKey === "string" ? { listOrderFieldKey: body.listOrderFieldKey } : {},
              ...body.listDirection === "asc" || body.listDirection === "desc" ? { listDirection: body.listDirection } : {},
              ...typeof body.templateKey === "string" ? { templateKey: body.templateKey } : {}
            }), 201);
          }
          const customEntriesMatch = url.pathname.match(/^\/v1\/custom-contents\/([^/]+)\/entries$/);
          if (request.method === "POST" && customEntriesMatch?.[1]) {
            const body = await readJson(request);
            return json(await customContent.createEntry(context, {
              customContentId: asCustomContentId(customEntriesMatch[1]),
              values: recordField(body, "values"),
              ...body.slug === null || typeof body.slug === "string" ? { slug: body.slug } : {},
              ...body.parentEntryId === null || typeof body.parentEntryId === "string" ? { parentEntryId: body.parentEntryId ? asCustomEntryId(body.parentEntryId) : null } : {}
            }), 201);
          }
          if (request.method === "GET" && customEntriesMatch?.[1])
            return json(await customContent.listEntries(context, asCustomContentId(customEntriesMatch[1])));
          const customEntryMatch = url.pathname.match(/^\/v1\/custom-entries\/([^/]+)$/);
          if (request.method === "GET" && customEntryMatch?.[1])
            return json(await customContent.getEntry(context, asCustomEntryId(customEntryMatch[1])));
          const customEntryRevisionMatch = url.pathname.match(/^\/v1\/custom-entries\/([^/]+)\/revisions$/);
          if (request.method === "POST" && customEntryRevisionMatch?.[1]) {
            const body = await readJson(request);
            return json(await customContent.reviseEntry(context, { entryId: asCustomEntryId(customEntryRevisionMatch[1]), baseRevisionId: asCustomEntryRevisionId(stringField(body, "baseRevisionId")), expectedLockVersion: numberField(body, "expectedLockVersion"), values: recordField(body, "values"), changeSummary: stringField(body, "changeSummary") }), 201);
          }
          const customEntryApprovalMatch = url.pathname.match(/^\/v1\/custom-entries\/([^/]+)\/approvals$/);
          if (request.method === "POST" && customEntryApprovalMatch?.[1]) {
            const body = await readJson(request);
            return json(await customContent.requestApproval(context, { entryId: asCustomEntryId(customEntryApprovalMatch[1]), revisionId: asCustomEntryRevisionId(stringField(body, "revisionId")) }), 201);
          }
          const customApprovalDecisionMatch = url.pathname.match(/^\/v1\/custom-entry-approvals\/([^/]+)\/decide$/);
          if (request.method === "POST" && customApprovalDecisionMatch?.[1]) {
            const body = await readJson(request);
            const decision = body.decision === "approved" || body.decision === "rejected" ? body.decision : invalid("decision must be approved or rejected");
            return json(await customContent.decideApproval(context, { approvalId: asCustomEntryApprovalId(customApprovalDecisionMatch[1]), decision, ...typeof body.comment === "string" ? { comment: body.comment } : {} }));
          }
          const customEntryPublishMatch = url.pathname.match(/^\/v1\/custom-entries\/([^/]+)\/publish$/);
          if (request.method === "POST" && customEntryPublishMatch?.[1]) {
            const body = await readJson(request);
            return json(await customContent.publishEntry(context, { entryId: asCustomEntryId(customEntryPublishMatch[1]), revisionId: asCustomEntryRevisionId(stringField(body, "revisionId")), approvalId: asCustomEntryApprovalId(stringField(body, "approvalId")) }));
          }
          const customEntryUnpublishMatch = url.pathname.match(/^\/v1\/custom-entries\/([^/]+)\/unpublish$/);
          if (request.method === "POST" && customEntryUnpublishMatch?.[1]) {
            return json(await customContent.unpublishEntry(context, { entryId: asCustomEntryId(customEntryUnpublishMatch[1]) }));
          }
          const classifyMatch = url.pathname.match(/^\/v1\/articles\/([^/]+)\/revisions\/([^/]+)\/terms$/);
          if (request.method === "PUT" && classifyMatch?.[1] && classifyMatch[2]) {
            const body = await readJson(request);
            const termIds = stringArray(body.termIds, "termIds").map(asTermId);
            await blog.classifyRevision(context, asContentItemId(classifyMatch[1]), asRevisionId(classifyMatch[2]), termIds);
            return json({ ok: true });
          }
          const treeMatch = url.pathname.match(/^\/v1\/sites\/([^/]+)\/content-tree$/);
          if (request.method === "GET" && treeMatch?.[1]) {
            return json(await cms.listContentTree(context, asSiteId(treeMatch[1])));
          }
          const blogsListMatch = url.pathname.match(/^\/v1\/sites\/([^/]+)\/blogs$/);
          if (request.method === "GET" && blogsListMatch?.[1]) {
            const siteId = asSiteId(blogsListMatch[1]);
            await cms.listContentTree(context, siteId);
            const collections = await blog.listCollections(siteId);
            return json(await Promise.all(collections.map(async (collection) => ({ collection, snapshot: await cms.getContent(context, collection.contentItemId) }))));
          }
          const customContentsListMatch = url.pathname.match(/^\/v1\/sites\/([^/]+)\/custom-contents$/);
          if (request.method === "GET" && customContentsListMatch?.[1]) {
            const siteId = asSiteId(customContentsListMatch[1]);
            await cms.listContentTree(context, siteId);
            const definitions = await customContent.listCustomContents(siteId);
            return json(await Promise.all(definitions.map(async (definition2) => ({
              definition: definition2,
              snapshot: await cms.getContent(context, definition2.contentItemId),
              schema: await customContent.getTableSchema(definition2.tableId)
            }))));
          }
          const trashListMatch = url.pathname.match(/^\/v1\/sites\/([^/]+)\/trash$/);
          if (request.method === "GET" && trashListMatch?.[1]) {
            return json(await cms.listTrash(context, asSiteId(trashListMatch[1])));
          }
          const pendingApprovalsMatch = url.pathname.match(/^\/v1\/sites\/([^/]+)\/pending-approvals$/);
          if (request.method === "GET" && pendingApprovalsMatch?.[1]) {
            return json(await cms.listPendingApprovals(context, asSiteId(pendingApprovalsMatch[1])));
          }
          const pendingCustomApprovalsMatch = url.pathname.match(/^\/v1\/sites\/([^/]+)\/pending-custom-entry-approvals$/);
          if (request.method === "GET" && pendingCustomApprovalsMatch?.[1]) {
            return json(await customContent.listPendingApprovals(context, asSiteId(pendingCustomApprovalsMatch[1])));
          }
          const approvalInboxMatch = url.pathname.match(/^\/v1\/sites\/([^/]+)\/approval-inbox$/);
          if (request.method === "GET" && approvalInboxMatch?.[1]) {
            const siteId = asSiteId(approvalInboxMatch[1]);
            return json({
              content: await cms.listContentApprovalInbox(context, siteId),
              customEntries: await customContent.listPendingApprovals(context, siteId)
            });
          }
          if (request.method === "POST" && url.pathname === "/v1/mail-forms") {
            const body = await readJson(request);
            return json(await mailForms.createMailForm(context, {
              siteId: asSiteId(stringField(body, "siteId")),
              parentId: typeof body.parentId === "string" ? asContentNodeId(body.parentId) : null,
              slug: stringField(body, "slug"),
              title: stringField(body, "title"),
              tableId: asCustomTableId(stringField(body, "tableId")),
              recipientEmails: stringArray(body.recipientEmails, "recipientEmails"),
              senderAddress: stringField(body, "senderAddress"),
              ...typeof body.subjectTemplate === "string" ? { subjectTemplate: body.subjectTemplate } : {},
              ...typeof body.autoReplyEnabled === "boolean" ? { autoReplyEnabled: body.autoReplyEnabled } : {},
              ...typeof body.autoReplyEmailFieldKey === "string" || body.autoReplyEmailFieldKey === null ? { autoReplyEmailFieldKey: body.autoReplyEmailFieldKey } : {},
              ...typeof body.autoReplySubject === "string" ? { autoReplySubject: body.autoReplySubject } : {},
              ...typeof body.confirmationTtlSeconds === "number" ? { confirmationTtlSeconds: body.confirmationTtlSeconds } : {},
              ...typeof body.retentionDays === "number" ? { retentionDays: body.retentionDays } : {},
              ...typeof body.turnstileRequired === "boolean" ? { turnstileRequired: body.turnstileRequired } : {},
              ...isRecord(body.document) ? { document: documentField(body.document) } : {},
              ...Array.isArray(body.fieldPolicies) ? { fieldPolicies: body.fieldPolicies.map((value) => {
                if (!isRecord(value))
                  invalid("fieldPolicies entries must be objects");
                return { fieldId: asCustomFieldId(stringField(value, "fieldId")), ...privacyClass(value.privacyClass) ? { privacyClass: privacyClass(value.privacyClass) } : {}, ...typeof value.includeInOwnerNotification === "boolean" ? { includeInOwnerNotification: value.includeInOwnerNotification } : {}, ...typeof value.includeInAutoReply === "boolean" ? { includeInAutoReply: value.includeInAutoReply } : {} };
              }) } : {}
            }), 201);
          }
          const siteMailFormsMatch = url.pathname.match(/^\/v1\/sites\/([^/]+)\/mail-forms$/);
          if (request.method === "GET" && siteMailFormsMatch?.[1]) {
            const siteId = asSiteId(siteMailFormsMatch[1]);
            await cms.listContentTree(context, siteId);
            return json(await mailForms.listForms(siteId));
          }
          const mailSubmissionsMatch = url.pathname.match(/^\/v1\/mail-forms\/([^/]+)\/submissions$/);
          if (request.method === "GET" && mailSubmissionsMatch?.[1])
            return json(await mailForms.listSubmissions(context, asMailFormId(mailSubmissionsMatch[1])));
          const mailSubmissionMatch = url.pathname.match(/^\/v1\/mail-submissions\/([^/]+)$/);
          if (request.method === "GET" && mailSubmissionMatch?.[1])
            return json(await mailForms.getSubmission(context, asMailSubmissionId(mailSubmissionMatch[1]), { includeSensitive: url.searchParams.get("includeSensitive") === "true" }));
          const mailPurgeMatch = url.pathname.match(/^\/v1\/mail-submissions\/([^/]+)\/purge$/);
          if (request.method === "POST" && mailPurgeMatch?.[1])
            return json(await mailForms.purgeSubmission(context, asMailSubmissionId(mailPurgeMatch[1])));
          if (request.method === "POST" && url.pathname === "/v1/mail-notifications/deliver") {
            const body = await readJson(request);
            return json(await mailForms.deliverPending(context, typeof body.limit === "number" ? body.limit : 20));
          }
          const articleMetaMatch = url.pathname.match(/^\/v1\/content\/([^/]+)\/article-meta$/);
          if (articleMetaMatch?.[1]) {
            const contentItemId = asContentItemId(articleMetaMatch[1]);
            if (request.method === "GET") {
              const { article } = await blog.getArticleMetadata(context, contentItemId);
              return json({ postedAt: article.postedAt, createdAt: article.createdAt });
            }
            if (request.method === "PATCH") {
              const body = await readJson(request);
              const updated = await blog.updateArticlePostedAt(context, {
                contentItemId,
                postedAt: numberField(body, "postedAt")
              });
              return json({ postedAt: updated.postedAt, createdAt: updated.createdAt });
            }
          }
          const contentMatch = url.pathname.match(/^\/v1\/content\/([^/]+)$/);
          if (request.method === "GET" && contentMatch?.[1]) {
            return json(await cms.getContent(context, asContentItemId(contentMatch[1])));
          }
          const revisionsMatch = url.pathname.match(/^\/v1\/content\/([^/]+)\/revisions$/);
          if (request.method === "POST" && revisionsMatch?.[1]) {
            const body = await readJson(request);
            return json(await cms.commitRevision(context, {
              contentItemId: asContentItemId(revisionsMatch[1]),
              baseRevisionId: asRevisionId(stringField(body, "baseRevisionId")),
              expectedLockVersion: numberField(body, "expectedLockVersion"),
              fields: recordField(body, "fields"),
              document: documentField(body.document),
              changeSummary: stringField(body, "changeSummary")
            }), 201);
          }
          const proposalMatch = url.pathname.match(/^\/v1\/content\/([^/]+)\/agent-proposals$/);
          if (request.method === "POST" && proposalMatch?.[1]) {
            const body = await readJson(request);
            const tools = new AgentOperations(cms);
            return json(await tools.proposeDocumentChange(context, {
              contentItemId: asContentItemId(proposalMatch[1]),
              baseRevisionId: asRevisionId(stringField(body, "baseRevisionId")),
              expectedLockVersion: numberField(body, "expectedLockVersion"),
              operations: Array.isArray(body.operations) ? body.operations : invalid("operations must be an array"),
              instructionSummary: stringField(body, "instructionSummary"),
              modelProvider: stringField(body, "modelProvider"),
              modelName: stringField(body, "modelName")
            }), 201);
          }
          const approvalsMatch = url.pathname.match(/^\/v1\/content\/([^/]+)\/approvals$/);
          if (request.method === "POST" && approvalsMatch?.[1]) {
            const body = await readJson(request);
            return json(await cms.requestApproval(context, {
              contentItemId: asContentItemId(approvalsMatch[1]),
              revisionId: asRevisionId(stringField(body, "revisionId")),
              ...isRisk(body.riskLevel) ? { riskLevel: body.riskLevel } : {}
            }), 201);
          }
          const decideMatch = url.pathname.match(/^\/v1\/approvals\/([^/]+)\/decide$/);
          if (request.method === "POST" && decideMatch?.[1]) {
            const body = await readJson(request);
            const decision = body.decision === "approved" || body.decision === "rejected" ? body.decision : invalid("decision must be approved or rejected");
            return json(await cms.decideApproval(context, {
              approvalId: asApprovalId(decideMatch[1]),
              decision,
              ...typeof body.comment === "string" ? { comment: body.comment } : {}
            }));
          }
          const publishMatch = url.pathname.match(/^\/v1\/content\/([^/]+)\/publish$/);
          if (request.method === "POST" && publishMatch?.[1]) {
            const body = await readJson(request);
            return json(await cms.publish(context, {
              contentItemId: asContentItemId(publishMatch[1]),
              revisionId: asRevisionId(stringField(body, "revisionId")),
              approvalId: asApprovalId(stringField(body, "approvalId"))
            }));
          }
          const unpublishMatch = url.pathname.match(/^\/v1\/content\/([^/]+)\/unpublish$/);
          if (request.method === "POST" && unpublishMatch?.[1]) {
            return json(await cms.unpublish(context, { contentItemId: asContentItemId(unpublishMatch[1]) }));
          }
          const reorderMatch = url.pathname.match(/^\/v1\/content\/([^/]+)\/reorder$/);
          if (request.method === "POST" && reorderMatch?.[1]) {
            const body = await readJson(request);
            const contentItemId = asContentItemId(reorderMatch[1]);
            const snapshot = await cms.getContent(context, contentItemId);
            return json(await cms.reorderContent(context, {
              contentItemId,
              targetParentId: body.targetParentId === null ? null : typeof body.targetParentId === "string" ? asContentNodeId(body.targetParentId) : snapshot.node.parentId,
              insertAfterContentItemId: body.insertAfterContentItemId === null ? null : typeof body.insertAfterContentItemId === "string" ? asContentItemId(body.insertAfterContentItemId) : null,
              expectedTreeVersion: numberField(body, "expectedTreeVersion")
            }));
          }
          const moveImpactMatch = url.pathname.match(/^\/v1\/content\/([^/]+)\/move-impact$/);
          if (request.method === "POST" && moveImpactMatch?.[1]) {
            const body = await readJson(request);
            return json(await cms.analyzeRelocation(context, {
              contentItemId: asContentItemId(moveImpactMatch[1]),
              targetParentId: typeof body.targetParentId === "string" ? asContentNodeId(body.targetParentId) : null,
              newSlug: stringField(body, "newSlug")
            }));
          }
          const moveMatch = url.pathname.match(/^\/v1\/content\/([^/]+)\/move$/);
          if (request.method === "POST" && moveMatch?.[1]) {
            const body = await readJson(request);
            return json(await cms.relocateContent(context, {
              contentItemId: asContentItemId(moveMatch[1]),
              targetParentId: typeof body.targetParentId === "string" ? asContentNodeId(body.targetParentId) : null,
              newSlug: stringField(body, "newSlug"),
              expectedTreeVersion: numberField(body, "expectedTreeVersion")
            }));
          }
          const copyMatch = url.pathname.match(/^\/v1\/content\/([^/]+)\/copy$/);
          if (request.method === "POST" && copyMatch?.[1]) {
            const body = await readJson(request);
            return json(await cms.copyContent(context, {
              contentItemId: asContentItemId(copyMatch[1]),
              targetParentId: typeof body.targetParentId === "string" ? asContentNodeId(body.targetParentId) : null,
              newSlug: stringField(body, "newSlug"),
              expectedTreeVersion: numberField(body, "expectedTreeVersion"),
              ...typeof body.includeDescendants === "boolean" ? { includeDescendants: body.includeDescendants } : {}
            }), 201);
          }
          const trashMatch = url.pathname.match(/^\/v1\/content\/([^/]+)\/trash$/);
          if (request.method === "POST" && trashMatch?.[1]) {
            const body = await readJson(request);
            return json(await cms.trashContent(context, {
              contentItemId: asContentItemId(trashMatch[1]),
              expectedTreeVersion: numberField(body, "expectedTreeVersion")
            }));
          }
          const restoreMatch = url.pathname.match(/^\/v1\/content\/([^/]+)\/restore$/);
          if (request.method === "POST" && restoreMatch?.[1]) {
            const body = await readJson(request);
            return json(await cms.restoreContent(context, {
              contentItemId: asContentItemId(restoreMatch[1]),
              expectedTreeVersion: numberField(body, "expectedTreeVersion"),
              ...body.targetParentId === null ? { targetParentId: null } : typeof body.targetParentId === "string" ? { targetParentId: asContentNodeId(body.targetParentId) } : {},
              ...typeof body.newSlug === "string" ? { newSlug: body.newSlug } : {}
            }));
          }
          if (request.method === "POST" && url.pathname === "/v1/assets/upload-sessions") {
            const body = await readJson(request);
            return json(await assets.createUploadSession(context, {
              workspaceId: stringField(body, "workspaceId"),
              filename: stringField(body, "filename"),
              mediaType: stringField(body, "mediaType"),
              uploadBaseUrl: typeof body.uploadBaseUrl === "string" ? body.uploadBaseUrl : env.PUBLIC_BASE_URL ?? url.origin,
              ...typeof body.maximumBytes === "number" ? { maximumBytes: body.maximumBytes } : {},
              ...typeof body.expiresInSeconds === "number" ? { expiresInSeconds: body.expiresInSeconds } : {}
            }), 201);
          }
          if (request.method === "GET" && url.pathname === "/v1/assets") {
            const workspaceId = url.searchParams.get("workspaceId");
            if (!workspaceId)
              invalid("workspaceId is required");
            return json(await assets.listAssets(context, workspaceId));
          }
          const assetMatch = url.pathname.match(/^\/v1\/assets\/([^/]+)$/);
          if (request.method === "GET" && assetMatch?.[1])
            return json(await assets.getAsset(context, asAssetId(assetMatch[1])));
          if (request.method === "DELETE" && assetMatch?.[1])
            return json(await assets.deleteAsset(context, asAssetId(assetMatch[1])));
          const previewCreateMatch = url.pathname.match(/^\/v1\/content\/([^/]+)\/previews$/);
          if (request.method === "POST" && previewCreateMatch?.[1]) {
            const body = await readJson(request);
            const contentItemId = asContentItemId(previewCreateMatch[1]);
            const snapshot = await cms.getContent(context, contentItemId);
            const themeRelease = typeof body.themeRelease === "string" ? body.themeRelease : (await themes.resolveActive(snapshot.item.siteId)).release.id;
            return json(await previews.create(context, {
              contentItemId,
              revisionId: asRevisionId(stringField(body, "revisionId")),
              previewBaseUrl: typeof body.previewBaseUrl === "string" ? body.previewBaseUrl : env.PREVIEW_BASE_URL ?? env.PUBLIC_BASE_URL ?? url.origin,
              ...typeof body.expiresInSeconds === "number" ? { expiresInSeconds: body.expiresInSeconds } : {},
              themeRelease
            }), 201);
          }
          const previewRevokeMatch = url.pathname.match(/^\/v1\/previews\/([^/]+)\/revoke$/);
          if (request.method === "POST" && previewRevokeMatch?.[1])
            return json(await previews.revoke(context, asPreviewSessionId(previewRevokeMatch[1])));
          if (request.method === "GET" && url.pathname === "/v1/audit") {
            const workspaceId = url.searchParams.get("workspaceId");
            if (!workspaceId)
              invalid("workspaceId is required");
            return json(await cms.listAudit(context, workspaceId));
          }
          return json({ error: { code: "NOT_FOUND", message: "Route not found" } }, 404);
        } catch (error) {
          return errorResponse(error);
        }
      } finally {
        activeCorsRequest = void 0;
        activeCorsEnv = void 0;
      }
    }
  };
}
function createAuthService(env, cms) {
  const store = env.DB ? new D1AuthStore(env.DB) : memoryAuthStore;
  const origin = env.BASER_AUTH_ORIGIN ?? "http://localhost:8787";
  const rpId = env.BASER_AUTH_RP_ID ?? new URL(origin).hostname;
  const webauthn = env.BASER_WEBAUTHN_GATEWAY === "simple" ? new SimpleWebAuthnGateway({ rpId, rpName: "baser-edge", origin }) : new TestWebAuthnGateway();
  return new AuthService({
    store,
    principals: createPrincipalLookup(cms),
    webauthn,
    secureCookies: isProductionEnv(env),
    ...env.BASER_BOOTSTRAP_SECRET ? { bootstrapSecret: env.BASER_BOOTSTRAP_SECRET } : {}
  });
}
function assertBootstrapAllowed(request, env) {
  if (isProductionEnv(env) && env.BASER_ALLOW_BOOTSTRAP !== "true") {
    throw new DomainError("BOOTSTRAP_DISABLED", "Bootstrap is disabled in production", 403);
  }
  if (env.BASER_BOOTSTRAP_SECRET && request.headers.get("x-baser-bootstrap-secret") !== env.BASER_BOOTSTRAP_SECRET) {
    throw new DomainError("BOOTSTRAP_SECRET_INVALID", "Bootstrap secret is invalid", 403);
  }
}
function securityGateway(cms) {
  return {
    authorize: cms.authorizeOperation.bind(cms),
    success: cms.recordSuccessfulOperation.bind(cms)
  };
}
function createAssetService(env, cms) {
  return new AssetService({
    metadata: env.DB ? new D1AssetMetadataStore(env.DB) : memoryAssetMetadata,
    objects: env.R2 ? new R2AssetObjectStore(env.R2) : memoryAssetObjects,
    security: securityGateway(cms),
    signingSecret: env.ASSET_UPLOAD_SECRET ?? "development-upload-secret-change-me",
    usageInspector: { listPublishedReferences: cms.store.listPublishedAssetReferences.bind(cms.store) }
  });
}
function createPreviewService(env, cms) {
  return new PreviewService({
    store: env.DB ? new D1PreviewStore(env.DB) : memoryPreviewStore,
    cms,
    security: securityGateway(cms),
    signingSecret: env.PREVIEW_SECRET ?? "development-preview-secret-change-me"
  });
}
function createBlogService(env, cms) {
  return new BlogService(env.DB ? new D1BlogStore(env.DB) : memoryBlogStore, cms);
}
function createCustomContentService(env, cms) {
  return new CustomContentService(env.DB ? new D1CustomContentStore(env.DB) : memoryCustomContentStore, cms);
}
function createThemeService(env, cms) {
  return new ThemeService({ store: env.DB ? new D1ThemeStore(env.DB) : memoryThemeStore, cms, security: securityGateway(cms) });
}
function createPluginService(env, cms) {
  return new PluginService({
    store: env.DB ? new D1PluginStore(env.DB) : memoryPluginStore,
    cms,
    security: securityGateway(cms),
    trustedRuntime: memoryTrustedPluginRuntime,
    sandboxRuntime: env.PLUGIN_DISPATCHER ? new WorkersForPlatformsPluginRuntime({ dispatcher: env.PLUGIN_DISPATCHER, networkPolicyEnforced: env.PLUGIN_OUTBOUND_POLICY_ENFORCED === "true" }) : new UnavailablePluginRuntime("PLUGIN_DISPATCHER binding is not configured")
  });
}
function createMailFormService(env, cms, customContent) {
  return new MailFormService({
    store: env.DB ? new D1MailFormStore(env.DB) : memoryMailFormStore,
    cms,
    customContent,
    signingSecret: env.MAIL_FORM_SECRET ?? "development-mail-form-secret-change-me",
    ...env.MAIL_PRIVACY_SALT ? { privacySalt: env.MAIL_PRIVACY_SALT } : {},
    botVerifier: env.TURNSTILE_SECRET ? new TurnstileBotVerifier(env.TURNSTILE_SECRET) : new UnavailableBotVerifier(),
    ...env.EMAIL ? { sender: new CloudflareEmailSender(env.EMAIL) } : {}
  });
}
function defaultResolver(env) {
  return env.DB ? new CmsService(new D1CmsStore(env.DB)) : memoryCms;
}
async function readOptionalJson(request) {
  const text = await request.text();
  if (!text)
    return null;
  try {
    return JSON.parse(text);
  } catch {
    throw new DomainError("INVALID_JSON", "Request body is not valid JSON", 400);
  }
}
async function readJson(request) {
  try {
    const value = await request.json();
    if (!isRecord(value))
      invalid("JSON body must be an object");
    return value;
  } catch (error) {
    if (error instanceof DomainError)
      throw error;
    throw new DomainError("INVALID_JSON", "Request body is not valid JSON", 400);
  }
}
function documentField(value) {
  if (!isRecord(value) || value.formatVersion !== 1 || !isRecord(value.root))
    invalid("document must be a StructuredDocument");
  return value;
}
function recordField(body, key2) {
  const value = body[key2];
  return isRecord(value) ? value : invalid(`${key2} must be an object`);
}
function stringField(body, key2) {
  const value = body[key2];
  return typeof value === "string" && value.length > 0 ? value : invalid(`${key2} must be a non-empty string`);
}
function numberField(body, key2) {
  const value = body[key2];
  return typeof value === "number" && Number.isFinite(value) ? value : invalid(`${key2} must be a number`);
}
function optionalQueryInt(raw, name, max) {
  if (raw === null || raw.trim() === "")
    invalid(`${name} is required`);
  const value = Number(raw);
  if (!Number.isFinite(value) || !Number.isInteger(value))
    invalid(`${name} must be an integer`);
  if (value < 0)
    invalid(`${name} must be >= 0`);
  if (value > max)
    invalid(`${name} must be <= ${max}`);
  return value;
}
function stringArray(value, key2) {
  return Array.isArray(value) && value.every((entry) => typeof entry === "string") ? value : invalid(`${key2} must be an array of strings`);
}
function customFieldType(value) {
  const values = ["text", "textarea", "integer", "decimal", "boolean", "date", "datetime", "email", "tel", "select", "multiselect", "asset", "richtext"];
  return typeof value === "string" && values.includes(value) ? value : invalid("type must be a supported custom field type");
}
function designTokensField(value) {
  if (!isRecord(value))
    invalid("tokens must be an object");
  return value;
}
function layoutField(value) {
  if (!isRecord(value))
    invalid("layout must be an object");
  return value;
}
function themeManifestField(value) {
  if (!isRecord(value))
    invalid("manifest must be an object");
  return value;
}
function pluginManifestField(value) {
  if (!isRecord(value))
    invalid("manifest must be an object");
  return value;
}
function pluginBundleField(value) {
  if (!isRecord(value))
    invalid("bundle must be an object");
  return value;
}
function pluginTrust(value) {
  return value === "trusted" || value === "sandboxed" ? value : invalid("trust must be trusted or sandboxed");
}
function pluginCapabilitiesField(value) {
  return stringArray(value, "grantedCapabilities");
}
function privacyClass(value) {
  return value === "non-personal" || value === "personal" || value === "sensitive" ? value : null;
}
function principalType(value) {
  return isPrincipalType(value) ? value : invalid("type must be a valid principal type");
}
function isPrincipalType(value) {
  return value === "human" || value === "agent" || value === "service" || value === "external-client";
}
function isRisk(value) {
  return value === "low" || value === "medium" || value === "high" || value === "critical";
}
function isRecord(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}
function invalid(message) {
  throw new DomainError("INVALID_REQUEST", message, 422);
}
function errorResponse(error) {
  if (error instanceof DomainError)
    return json({ error: { code: error.code, message: error.message, details: error.details ?? {} } }, error.status);
  console.error(error);
  return json({ error: { code: "INTERNAL_ERROR", message: "Internal server error" } }, 500);
}
function json(value, status = 200) {
  return withCors(new Response(JSON.stringify(value), { status, headers: { "content-type": "application/json; charset=utf-8" } }));
}
function withCors(response) {
  const headers = new Headers(response.headers);
  const origin = activeCorsRequest?.headers.get("Origin");
  const authOrigin = activeCorsEnv?.BASER_AUTH_ORIGIN;
  if (origin && (/^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin) || authOrigin && origin === authOrigin)) {
    headers.set("access-control-allow-origin", origin);
    headers.set("vary", "Origin");
  } else {
    headers.set("access-control-allow-origin", "*");
  }
  headers.set("access-control-allow-headers", `content-type,x-baser-bootstrap-secret,x-baser-principal-id,x-baser-principal-type,x-baser-on-behalf-of,x-baser-delegation-id,x-request-id,${CSRF_HEADER}`);
  headers.set("access-control-allow-credentials", "true");
  headers.set("access-control-allow-methods", "GET,POST,PUT,DELETE,OPTIONS");
  return new Response(response.body, { status: response.status, statusText: response.statusText, headers });
}
const index = createApiWorker();
export {
  createApiWorker,
  index as default,
  mapConsoleUrlToAssetPath
};
