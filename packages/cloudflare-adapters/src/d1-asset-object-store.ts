import {
  DomainError,
  assertDomain,
  type WorkspaceId,
} from "@baser-edge/core-types";
import {
  isSniffedTrialInlineImage,
  type AssetObject,
  type AssetObjectBody,
  type AssetObjectMetadata,
  type AssetObjectStore,
  type TrialInlineMediaPolicy,
} from "@baser-edge/asset-kernel";

interface D1PreparedStatementLike {
  bind(...values: unknown[]): D1PreparedStatementLike;
  first<T = Record<string, unknown>>(): Promise<T | null>;
  run(): Promise<unknown>;
}

interface D1DatabaseLike {
  prepare(query: string): D1PreparedStatementLike;
}

async function toBytes(body: AssetObjectBody): Promise<Uint8Array> {
  if (typeof body === "string") return new TextEncoder().encode(body);
  if (body instanceof Blob) return new Uint8Array(await body.arrayBuffer());
  if (body instanceof ArrayBuffer) return new Uint8Array(body);
  if (ArrayBuffer.isView(body)) {
    return new Uint8Array(body.buffer.slice(body.byteOffset, body.byteOffset + body.byteLength));
  }
  return new Uint8Array(await new Response(body).arrayBuffer());
}

async function digest(bytes: Uint8Array): Promise<string> {
  const hash = await crypto.subtle.digest("SHA-256", bytes);
  return [...new Uint8Array(hash)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

const THUMBNAIL_OBJECT_SUFFIX = ".thumbnail.webp";

function originalKeyForThumbnail(key: string): string | null {
  return key.endsWith(THUMBNAIL_OBJECT_SUFFIX)
    ? key.slice(0, -THUMBNAIL_OBJECT_SUFFIX.length)
    : null;
}

export function workspaceIdFromAssetObjectKey(objectKey: string): WorkspaceId {
  const match = /^workspaces\/([^/]+)\/assets\//.exec(objectKey);
  assertDomain(match?.[1], "INVALID_OBJECT_KEY", "Asset object key is invalid", 500);
  return match[1] as WorkspaceId;
}

export class D1AssetObjectStore implements AssetObjectStore {
  readonly #db: D1DatabaseLike;
  readonly #policy: TrialInlineMediaPolicy;

  constructor(db: D1DatabaseLike, policy: TrialInlineMediaPolicy) {
    this.#db = db;
    this.#policy = policy;
  }

  async put(
    key: string,
    body: AssetObjectBody,
    options: { mediaType: string; customMetadata?: Record<string, string> },
  ): Promise<AssetObjectMetadata> {
    const bytes = await toBytes(body);
    assertDomain(bytes.byteLength > 0, "UPLOAD_EMPTY", "Upload body is empty", 422);
    assertDomain(
      bytes.byteLength <= this.#policy.maxBytesPerObject,
      "UPLOAD_TOO_LARGE",
      "Upload exceeds the trial size limit",
      413,
    );
    assertDomain(
      isSniffedTrialInlineImage(bytes, options.mediaType),
      "UPLOAD_CONTENT_MISMATCH",
      "File content does not match declared image type",
      422,
    );
    const checksum = await digest(bytes);
    const workspaceId = workspaceIdFromAssetObjectKey(key);
    const now = Date.now();
    const originalKey = originalKeyForThumbnail(key);
    if (originalKey) {
      const asset = await this.#db.prepare(
        "SELECT id FROM assets WHERE object_key = ? AND deleted_at IS NULL",
      ).bind(originalKey).first<{ id: string }>();
      assertDomain(asset, "ASSET_NOT_FOUND", "Thumbnail asset not found", 404);
      await this.#db.prepare(
        `INSERT INTO asset_thumbnail_blobs (asset_id, object_key, workspace_id, media_type, byte_size, checksum, body, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)
         ON CONFLICT(asset_id) DO UPDATE SET
           object_key = excluded.object_key,
           workspace_id = excluded.workspace_id,
           media_type = excluded.media_type,
           byte_size = excluded.byte_size,
           checksum = excluded.checksum,
           body = excluded.body,
           created_at = excluded.created_at`,
      ).bind(asset.id, key, workspaceId, options.mediaType, bytes.byteLength, checksum, bytes, now).run();
      return {
        key,
        size: bytes.byteLength,
        etag: checksum,
        uploadedAt: now,
        mediaType: options.mediaType,
      };
    }
    await this.#db.prepare(
      `INSERT INTO asset_object_blobs (object_key, workspace_id, media_type, byte_size, checksum, body, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(object_key) DO UPDATE SET
         media_type = excluded.media_type,
         byte_size = excluded.byte_size,
         checksum = excluded.checksum,
         body = excluded.body,
         created_at = excluded.created_at`,
    ).bind(key, workspaceId, options.mediaType, bytes.byteLength, checksum, bytes, now).run();
    return {
      key,
      size: bytes.byteLength,
      etag: checksum,
      uploadedAt: now,
      mediaType: options.mediaType,
    };
  }

  async head(key: string): Promise<AssetObjectMetadata | null> {
    const table = originalKeyForThumbnail(key) ? "asset_thumbnail_blobs" : "asset_object_blobs";
    const row = await this.#db.prepare(
      `SELECT media_type, byte_size, checksum, created_at FROM ${table} WHERE object_key = ?`,
    ).bind(key).first<{ media_type: string; byte_size: number; checksum: string; created_at: number }>();
    if (!row) return null;
    return {
      key,
      size: row.byte_size,
      etag: row.checksum,
      uploadedAt: row.created_at,
      mediaType: row.media_type,
    };
  }

  async get(key: string): Promise<AssetObject | null> {
    const table = originalKeyForThumbnail(key) ? "asset_thumbnail_blobs" : "asset_object_blobs";
    const row = await this.#db.prepare(
      `SELECT media_type, byte_size, checksum, created_at, body FROM ${table} WHERE object_key = ?`,
    ).bind(key).first<{
      media_type: string;
      byte_size: number;
      checksum: string;
      created_at: number;
      body: ArrayBuffer | Uint8Array;
    }>();
    if (!row) return null;
    const bytes = row.body instanceof Uint8Array ? row.body : new Uint8Array(row.body);
    return {
      key,
      size: row.byte_size,
      etag: row.checksum,
      uploadedAt: row.created_at,
      mediaType: row.media_type,
      body: new Blob([bytes]).stream(),
    };
  }

  async delete(key: string): Promise<void> {
    const table = originalKeyForThumbnail(key) ? "asset_thumbnail_blobs" : "asset_object_blobs";
    await this.#db.prepare(`DELETE FROM ${table} WHERE object_key = ?`).bind(key).run();
  }
}

export function isD1InlineAssetStorageEnabled(env: { R2?: unknown; DB?: unknown; BASER_ASSET_STORAGE?: string }): boolean {
  if (env.R2) return false;
  return env.DB !== undefined && env.BASER_ASSET_STORAGE === "d1-inline";
}
