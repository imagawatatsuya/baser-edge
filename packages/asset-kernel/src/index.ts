import {
  DomainError,
  assertDomain,
  asAssetId,
  asUploadSessionId,
  newId,
  signCompactToken,
  verifyCompactToken,
  systemClock,
  type ActorContext,
  type AssetId,
  type Clock,
  type PrincipalId,
  type UploadSessionId,
  type WorkspaceId,
} from "@baser-edge/core-types";
import { Capabilities, type AuthorizationResource } from "@baser-edge/authorization";
import { isSniffedTrialInlineImage } from "./image-sniff.js";
import {
  TRIAL_INLINE_MEDIA_POLICY,
  type TrialInlineMediaPolicy,
  trialInlineImageMediaTypeSet,
} from "./trial-inline-media.js";

export {
  TRIAL_INLINE_CLIENT_MAX_SOURCE_BYTES,
  TRIAL_INLINE_IMAGE_MEDIA_TYPES,
  TRIAL_INLINE_MAX_ASSETS,
  TRIAL_INLINE_MAX_BYTES_PER_OBJECT,
  TRIAL_INLINE_MAX_EDGE_PX,
  TRIAL_INLINE_MEDIA_POLICY,
  trialInlineImageMediaTypeSet,
  type TrialInlineImageMediaType,
  type TrialInlineMediaPolicy,
} from "./trial-inline-media.js";
export { isSniffedTrialInlineImage, sniffImageMediaType } from "./image-sniff.js";

export type AssetState = "pending" | "uploaded" | "ready" | "quarantined" | "deleted";
export type UploadSessionState = "pending" | "completed" | "expired" | "failed";

export interface Asset {
  id: AssetId;
  workspaceId: WorkspaceId;
  objectKey: string;
  originalFilename: string;
  mediaType: string;
  byteSize: number | null;
  checksum: string | null;
  width: number | null;
  height: number | null;
  state: AssetState;
  ownerPrincipalId: PrincipalId;
  createdAt: number;
  updatedAt: number;
  deletedAt: number | null;
}

export interface UploadSession {
  id: UploadSessionId;
  assetId: AssetId;
  workspaceId: WorkspaceId;
  objectKey: string;
  mediaType: string;
  maximumBytes: number;
  state: UploadSessionState;
  createdBy: PrincipalId;
  createdAt: number;
  expiresAt: number;
  completedAt: number | null;
  failureReason: string | null;
}

export interface AssetObjectMetadata {
  key: string;
  size: number;
  etag: string;
  uploadedAt: number;
  mediaType?: string;
}

export interface AssetObject extends AssetObjectMetadata {
  body: ReadableStream<Uint8Array> | null;
  httpEtag?: string;
}

export type AssetObjectBody = ReadableStream<Uint8Array> | ArrayBuffer | ArrayBufferView | Blob | string;

export interface AssetObjectStore {
  put(key: string, body: AssetObjectBody, options: { mediaType: string; customMetadata?: Record<string, string> }): Promise<AssetObjectMetadata>;
  head(key: string): Promise<AssetObjectMetadata | null>;
  get(key: string): Promise<AssetObject | null>;
  delete(key: string): Promise<void>;
}

export interface AssetMetadataStore {
  createPendingAsset(asset: Asset, session: UploadSession): Promise<void>;
  getAsset(id: AssetId): Promise<Asset | null>;
  getUploadSession(id: UploadSessionId): Promise<UploadSession | null>;
  completeUpload(input: { sessionId: UploadSessionId; byteSize: number; checksum: string; now: number }): Promise<Asset>;
  failUpload(input: { sessionId: UploadSessionId; reason: string; now: number }): Promise<void>;
  listAssets(workspaceId: WorkspaceId): Promise<Asset[]>;
  softDeleteAsset(input: { assetId: AssetId; now: number }): Promise<Asset>;
  countActiveAssets(workspaceId: WorkspaceId, now: number): Promise<number>;
  expireStalePendingUploads(workspaceId: WorkspaceId, now: number): Promise<void>;
}


export interface AssetUsageReference {
  revisionId: string;
  contentItemId: string;
  siteId: string;
  path: string;
  blockId: string | null;
  fieldPath: string;
  usage: string;
}

export interface AssetUsageInspector {
  listPublishedReferences(assetId: AssetId): Promise<AssetUsageReference[]>;
}

export interface AssetSecurityGateway {
  authorize(
    actor: ActorContext,
    capability: string,
    resource: AuthorizationResource,
    action: string,
    resourceType: string,
    resourceId: string,
  ): Promise<void>;
  success(actor: ActorContext, input: {
    workspaceId: WorkspaceId;
    action: string;
    resourceType: string;
    resourceId: string;
    capability: string;
    details?: Record<string, unknown>;
  }): Promise<void>;
}

export interface CreateUploadSessionInput {
  workspaceId: WorkspaceId;
  filename: string;
  mediaType: string;
  maximumBytes?: number;
  expiresInSeconds?: number;
  uploadBaseUrl: string;
}

export interface CreatedUploadSession {
  asset: Asset;
  session: UploadSession;
  uploadUrl: string;
  method: "PUT";
  requiredHeaders: Record<string, string>;
}

interface UploadTokenPayload extends Record<string, unknown> {
  typ: "asset-upload";
  sessionId: string;
  assetId: string;
  objectKey: string;
  mediaType: string;
  maximumBytes: number;
  expiresAt: number;
}

const defaultAllowedMediaTypes = new Set([
  "image/jpeg", "image/png", "image/webp", "image/gif",
  "application/pdf", "text/plain", "text/csv",
  "application/zip",
]);

export class AssetService {
  readonly #metadata: AssetMetadataStore;
  readonly #objects: AssetObjectStore;
  readonly #security: AssetSecurityGateway;
  readonly #secret: string;
  readonly #clock: Clock;
  readonly #allowedMediaTypes: ReadonlySet<string>;
  readonly #defaultMaximumBytes: number;
  readonly #usageInspector: AssetUsageInspector | undefined;
  readonly #trialInline: TrialInlineMediaPolicy | undefined;

  constructor(input: {
    metadata: AssetMetadataStore;
    objects: AssetObjectStore;
    security: AssetSecurityGateway;
    signingSecret: string;
    clock?: Clock;
    allowedMediaTypes?: ReadonlySet<string>;
    defaultMaximumBytes?: number;
    usageInspector?: AssetUsageInspector;
    trialInline?: TrialInlineMediaPolicy;
  }) {
    assertDomain(input.signingSecret.length >= 16, "WEAK_UPLOAD_SECRET", "Upload signing secret must be at least 16 characters", 500);
    this.#metadata = input.metadata;
    this.#objects = input.objects;
    this.#security = input.security;
    this.#secret = input.signingSecret;
    this.#clock = input.clock ?? systemClock;
    this.#trialInline = input.trialInline;
    this.#allowedMediaTypes = input.trialInline
      ? trialInlineImageMediaTypeSet()
      : (input.allowedMediaTypes ?? defaultAllowedMediaTypes);
    this.#defaultMaximumBytes = input.trialInline
      ? input.trialInline.maxBytesPerObject
      : (input.defaultMaximumBytes ?? 25 * 1024 * 1024);
    this.#usageInspector = input.usageInspector;
  }

  async createUploadSession(actor: ActorContext, input: CreateUploadSessionInput): Promise<CreatedUploadSession> {
    const filename = sanitizeFilename(input.filename);
    const mediaType = normalizeMediaType(input.mediaType);
    assertDomain(this.#allowedMediaTypes.has(mediaType), "MEDIA_TYPE_NOT_ALLOWED", `Media type ${mediaType} is not allowed`, 422);
    let maximumBytes = input.maximumBytes ?? this.#defaultMaximumBytes;
    if (this.#trialInline) {
      maximumBytes = Math.min(maximumBytes, this.#trialInline.maxBytesPerObject);
    }
    assertDomain(Number.isInteger(maximumBytes) && maximumBytes > 0 && maximumBytes <= 5 * 1024 * 1024 * 1024, "INVALID_MAXIMUM_BYTES", "Invalid upload size limit", 422);
    await this.#security.authorize(actor, Capabilities.AssetUpload, { workspaceId: input.workspaceId, risk: "medium" }, "asset.upload-session.create", "workspace", input.workspaceId);

    const now = this.#clock.now();
    await this.#metadata.expireStalePendingUploads(input.workspaceId, now);
    if (this.#trialInline) {
      const active = await this.#metadata.countActiveAssets(input.workspaceId, now);
      assertDomain(
        active < this.#trialInline.maxAssets,
        "TRIAL_INLINE_ASSET_LIMIT",
        `Trial allows at most ${this.#trialInline.maxAssets} images`,
        422,
      );
    }
    const assetId = asAssetId(newId("asset"));
    const sessionId = asUploadSessionId(newId("upload"));
    const expiresAt = now + Math.max(60, Math.min(input.expiresInSeconds ?? 900, 3600)) * 1000;
    const objectKey = `workspaces/${input.workspaceId}/assets/${assetId}/${filename}`;
    const asset: Asset = {
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
      deletedAt: null,
    };
    const session: UploadSession = {
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
      failureReason: null,
    };
    await this.#metadata.createPendingAsset(asset, session);
    const token = await signCompactToken({
      typ: "asset-upload",
      sessionId,
      assetId,
      objectKey,
      mediaType,
      maximumBytes,
      expiresAt,
    } satisfies UploadTokenPayload, this.#secret);
    const base = input.uploadBaseUrl.replace(/\/$/, "");
    const uploadUrl = `${base}/v1/assets/uploads/${encodeURIComponent(sessionId)}?token=${encodeURIComponent(token)}`;
    await this.#security.success(actor, {
      workspaceId: input.workspaceId,
      action: "asset.upload-session.create",
      resourceType: "asset",
      resourceId: assetId,
      capability: Capabilities.AssetUpload,
      details: { mediaType, maximumBytes, expiresAt },
    });
    return { asset, session, uploadUrl, method: "PUT", requiredHeaders: { "content-type": mediaType } };
  }

  async uploadWithToken(input: {
    sessionId: UploadSessionId;
    token: string;
    mediaType: string;
    contentLength?: number;
    body: AssetObjectBody;
  }): Promise<Asset> {
    const payload = await verifyCompactToken<UploadTokenPayload>(input.token, this.#secret);
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
    if (input.contentLength !== undefined) {
      assertDomain(input.contentLength >= 0 && input.contentLength <= session.maximumBytes, "UPLOAD_TOO_LARGE", "Upload exceeds the signed size limit", 413);
    }
    try {
      const bodyForStore = this.#trialInline
        ? await this.#prepareTrialInlineBody(input.body, mediaType, session.maximumBytes)
        : input.body;
      const object = await this.#objects.put(session.objectKey, bodyForStore, {
        mediaType,
        customMetadata: { assetId: session.assetId, uploadSessionId: session.id },
      });
      if (object.size > session.maximumBytes) {
        await this.#objects.delete(session.objectKey);
        await this.#metadata.failUpload({ sessionId: session.id, reason: "size_limit_exceeded", now });
        throw new DomainError("UPLOAD_TOO_LARGE", "Upload exceeds the signed size limit", 413);
      }
      return this.#metadata.completeUpload({ sessionId: session.id, byteSize: object.size, checksum: object.etag, now });
    } catch (error) {
      if (!(error instanceof DomainError)) await this.#metadata.failUpload({ sessionId: session.id, reason: "object_store_failure", now });
      throw error;
    }
  }

  async getAsset(actor: ActorContext, assetId: AssetId): Promise<Asset> {
    const asset = await this.#requireAsset(assetId);
    await this.#security.authorize(actor, Capabilities.AssetRead, { workspaceId: asset.workspaceId, risk: "low" }, "asset.read", "asset", asset.id);
    return asset;
  }

  async listAssets(actor: ActorContext, workspaceId: WorkspaceId): Promise<Asset[]> {
    await this.#security.authorize(actor, Capabilities.AssetRead, { workspaceId, risk: "low" }, "asset.list", "workspace", workspaceId);
    return this.#metadata.listAssets(workspaceId);
  }

  async getPublicAsset(assetId: AssetId): Promise<{ asset: Asset; object: AssetObject } | null> {
    const asset = await this.#metadata.getAsset(assetId);
    if (!asset || asset.state !== "ready" || asset.deletedAt !== null) return null;
    const object = await this.#objects.get(asset.objectKey);
    return object ? { asset, object } : null;
  }

  async getAuthenticatedAssetContent(actor: ActorContext, assetId: AssetId): Promise<{ asset: Asset; object: AssetObject }> {
    const asset = await this.getAsset(actor, assetId);
    assertDomain(asset.state === "ready" && asset.deletedAt === null, "ASSET_NOT_READY", "Asset is not ready for download", 404);
    const object = await this.#objects.get(asset.objectKey);
    assertDomain(object, "ASSET_OBJECT_MISSING", "Asset object not found", 404);
    return { asset, object };
  }

  async deleteAsset(actor: ActorContext, assetId: AssetId): Promise<Asset> {
    const asset = await this.#requireAsset(assetId);
    await this.#security.authorize(actor, Capabilities.AssetDelete, { workspaceId: asset.workspaceId, risk: "high" }, "asset.delete", "asset", asset.id);
    const references = this.#usageInspector ? await this.#usageInspector.listPublishedReferences(asset.id) : [];
    assertDomain(references.length === 0, "ASSET_IN_USE", "Asset is used by published content", 409, { references });
    const deleted = await this.#metadata.softDeleteAsset({ assetId, now: this.#clock.now() });
    try {
      await this.#objects.delete(asset.objectKey);
    } catch {
      /* object store cleanup is best-effort */
    }
    await this.#security.success(actor, {
      workspaceId: asset.workspaceId,
      action: "asset.delete",
      resourceType: "asset",
      resourceId: asset.id,
      capability: Capabilities.AssetDelete,
    });
    return deleted;
  }

  async #requireAsset(id: AssetId): Promise<Asset> {
    const asset = await this.#metadata.getAsset(id);
    assertDomain(asset, "ASSET_NOT_FOUND", "Asset not found", 404);
    return asset;
  }

  async #prepareTrialInlineBody(
    body: AssetObjectBody,
    mediaType: string,
    maximumBytes: number,
  ): Promise<Uint8Array> {
    const bytes = await toBytes(body);
    assertDomain(bytes.byteLength > 0, "UPLOAD_EMPTY", "Upload body is empty", 422);
    assertDomain(bytes.byteLength <= maximumBytes, "UPLOAD_TOO_LARGE", "Upload exceeds the signed size limit", 413);
    assertDomain(
      isSniffedTrialInlineImage(bytes, mediaType),
      "UPLOAD_CONTENT_MISMATCH",
      "File content does not match declared image type",
      422,
    );
    return bytes;
  }
}

export class MemoryAssetMetadataStore implements AssetMetadataStore {
  readonly assets = new Map<AssetId, Asset>();
  readonly sessions = new Map<UploadSessionId, UploadSession>();

  async createPendingAsset(asset: Asset, session: UploadSession): Promise<void> {
    if (this.assets.has(asset.id) || this.sessions.has(session.id)) throw new DomainError("ASSET_EXISTS", "Asset or upload session already exists", 409);
    this.assets.set(asset.id, structuredClone(asset));
    this.sessions.set(session.id, structuredClone(session));
  }
  async getAsset(id: AssetId): Promise<Asset | null> { return clone(this.assets.get(id) ?? null); }
  async getUploadSession(id: UploadSessionId): Promise<UploadSession | null> { return clone(this.sessions.get(id) ?? null); }
  async completeUpload(input: { sessionId: UploadSessionId; byteSize: number; checksum: string; now: number }): Promise<Asset> {
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
  async failUpload(input: { sessionId: UploadSessionId; reason: string; now: number }): Promise<void> {
    const session = this.sessions.get(input.sessionId);
    if (!session || session.state !== "pending") return;
    session.state = "failed";
    session.failureReason = input.reason;
    session.completedAt = input.now;
    const asset = this.assets.get(session.assetId);
    if (asset) { asset.state = "quarantined"; asset.updatedAt = input.now; }
  }
  async listAssets(workspaceId: WorkspaceId): Promise<Asset[]> {
    return [...this.assets.values()].filter((asset) => asset.workspaceId === workspaceId && asset.deletedAt === null).map((asset) => structuredClone(asset));
  }
  async softDeleteAsset(input: { assetId: AssetId; now: number }): Promise<Asset> {
    const asset = requireValue(this.assets.get(input.assetId), "ASSET_NOT_FOUND", "Asset not found");
    asset.state = "deleted";
    asset.deletedAt = input.now;
    asset.updatedAt = input.now;
    return structuredClone(asset);
  }
  async countActiveAssets(workspaceId: WorkspaceId, now: number): Promise<number> {
    let count = 0;
    for (const asset of this.assets.values()) {
      if (asset.workspaceId !== workspaceId || asset.deletedAt !== null) continue;
      if (asset.state === "ready") {
        count += 1;
        continue;
      }
      if (asset.state !== "pending") continue;
      const session = [...this.sessions.values()].find((entry) => entry.assetId === asset.id && entry.state === "pending");
      if (session && session.expiresAt > now) count += 1;
    }
    return count;
  }
  async expireStalePendingUploads(workspaceId: WorkspaceId, now: number): Promise<void> {
    for (const session of this.sessions.values()) {
      if (session.workspaceId !== workspaceId || session.state !== "pending" || session.expiresAt > now) continue;
      session.state = "expired";
      session.completedAt = now;
      session.failureReason = "expired";
      const asset = this.assets.get(session.assetId);
      if (asset && asset.state === "pending") {
        asset.state = "quarantined";
        asset.updatedAt = now;
      }
    }
  }
}

export class MemoryAssetObjectStore implements AssetObjectStore {
  readonly objects = new Map<string, { bytes: Uint8Array; metadata: AssetObjectMetadata; mediaType: string }>();

  async put(key: string, body: AssetObjectBody, options: { mediaType: string }): Promise<AssetObjectMetadata> {
    const bytes = await toBytes(body);
    const etag = await digest(bytes);
    const metadata: AssetObjectMetadata = { key, size: bytes.byteLength, etag, uploadedAt: Date.now(), mediaType: options.mediaType };
    this.objects.set(key, { bytes, metadata, mediaType: options.mediaType });
    return structuredClone(metadata);
  }
  async head(key: string): Promise<AssetObjectMetadata | null> { return clone(this.objects.get(key)?.metadata ?? null); }
  async get(key: string): Promise<AssetObject | null> {
    const entry = this.objects.get(key);
    if (!entry) return null;
    const bytes = entry.bytes.slice();
    return { ...structuredClone(entry.metadata), body: new Blob([bytes]).stream() };
  }
  async delete(key: string): Promise<void> { this.objects.delete(key); }
}

function sanitizeFilename(value: string): string {
  const normalized = value.normalize("NFKC").trim().replace(/[\\/\0]/g, "-").replace(/\s+/g, "-");
  const safe = normalized.replace(/[^\p{L}\p{N}._-]+/gu, "-").replace(/-+/g, "-").replace(/^[-.]+|[-.]+$/g, "");
  assertDomain(safe.length > 0 && safe.length <= 180, "INVALID_FILENAME", "Filename is invalid", 422);
  return safe;
}
function normalizeMediaType(value: string): string { return value.split(";", 1)[0]?.trim().toLowerCase() ?? ""; }
function clone<T>(value: T): T { return value === null || value === undefined ? value : structuredClone(value); }
function requireValue<T>(value: T | undefined, code: string, message: string): T { if (value === undefined) throw new DomainError(code, message, 404); return value; }
async function toBytes(body: AssetObjectBody): Promise<Uint8Array> {
  if (typeof body === "string") return new TextEncoder().encode(body);
  if (body instanceof Blob) return new Uint8Array(await body.arrayBuffer());
  if (body instanceof ArrayBuffer) return new Uint8Array(body);
  if (ArrayBuffer.isView(body)) return new Uint8Array(body.buffer.slice(body.byteOffset, body.byteOffset + body.byteLength));
  return new Uint8Array(await new Response(body).arrayBuffer());
}
async function digest(bytes: Uint8Array): Promise<string> {
  const hash = await crypto.subtle.digest("SHA-256", bytes);
  return [...new Uint8Array(hash)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}
