import {
  assertDomain,
  asContentItemId,
  asPreviewSessionId,
  asRevisionId,
  asSiteId,
  newId,
  signCompactToken,
  verifyCompactToken,
  systemClock,
  type ActorContext,
  type Clock,
  type ContentItemId,
  type PreviewSessionId,
  type PrincipalId,
  type RevisionId,
  type SiteId,
  type WorkspaceId,
} from "@baser-edge/core-types";
import { Capabilities, type AuthorizationResource } from "@baser-edge/authorization";
import type { CmsService, ContentRevision, ContentSnapshot, Site } from "@baser-edge/content-kernel";

export interface PreviewSession {
  id: PreviewSessionId;
  workspaceId: WorkspaceId;
  siteId: SiteId;
  contentItemId: ContentItemId;
  revisionId: RevisionId;
  revisionHash: string;
  themeRelease: string;
  tokenVersion: number;
  createdBy: PrincipalId;
  createdAt: number;
  expiresAt: number;
  revokedAt: number | null;
  lastAccessedAt: number | null;
}

export interface PreviewStore {
  create(session: PreviewSession): Promise<void>;
  get(id: PreviewSessionId): Promise<PreviewSession | null>;
  revoke(id: PreviewSessionId, now: number): Promise<PreviewSession>;
  touch(id: PreviewSessionId, now: number): Promise<void>;
  listActiveSessionsForSite(siteId: SiteId, now: number): Promise<PreviewSession[]>;
  resolve?(id: PreviewSessionId): Promise<ResolvedPreview | null>;
}

export interface PreviewSecurityGateway {
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
    siteId?: SiteId | null;
    action: string;
    resourceType: string;
    resourceId: string;
    revisionId?: RevisionId | null;
    capability: string;
    details?: Record<string, unknown>;
  }): Promise<void>;
}

interface PreviewTokenPayload extends Record<string, unknown> {
  typ: "content-preview";
  sessionId: string;
  contentItemId: string;
  revisionId: string;
  siteId: string;
  revisionHash: string;
  themeRelease: string;
  expiresAt: number;
  tokenVersion: number;
}

export interface ResolvedPreview {
  session: PreviewSession;
  snapshot: ContentSnapshot;
  revision: ContentRevision;
  site?: Site;
}

export class PreviewService {
  readonly #store: PreviewStore;
  readonly #cms: CmsService;
  readonly #security: PreviewSecurityGateway;
  readonly #secret: string;
  readonly #clock: Clock;

  constructor(input: { store: PreviewStore; cms: CmsService; security: PreviewSecurityGateway; signingSecret: string; clock?: Clock }) {
    assertDomain(input.signingSecret.length >= 16, "WEAK_PREVIEW_SECRET", "Preview signing secret must be at least 16 characters", 500);
    this.#store = input.store;
    this.#cms = input.cms;
    this.#security = input.security;
    this.#secret = input.signingSecret;
    this.#clock = input.clock ?? systemClock;
  }

  async create(actor: ActorContext, input: {
    contentItemId: ContentItemId;
    revisionId: RevisionId;
    previewBaseUrl: string;
    expiresInSeconds?: number;
    themeRelease?: string;
    snapshot?: ContentSnapshot;
  }): Promise<{ session: PreviewSession; previewUrl: string }> {
    const snapshot = input.snapshot ?? await this.#cms.getContent(actor, input.contentItemId);
    assertDomain(snapshot.item.id === input.contentItemId, "PREVIEW_CONTENT_MISMATCH", "Preview content does not match the requested item", 422);
    await this.#security.authorize(actor, Capabilities.PreviewCreate, {
      workspaceId: snapshot.item.workspaceId,
      siteId: snapshot.item.siteId,
      contentType: snapshot.item.contentTypeKey,
      path: snapshot.route.path,
      risk: "low",
    }, "preview.create", "content-item", snapshot.item.id);
    const revision = await this.#cms.getRevisionForPreview(actor, input.contentItemId, input.revisionId, snapshot);
    const now = this.#clock.now();
    const expiresAt = now + Math.max(60, Math.min(input.expiresInSeconds ?? 1800, 24 * 60 * 60)) * 1000;
    const session: PreviewSession = {
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
      lastAccessedAt: null,
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
      tokenVersion: session.tokenVersion,
    } satisfies PreviewTokenPayload, this.#secret);
    const previewUrl = `${input.previewBaseUrl.replace(/\/$/, "")}/_preview/${encodeURIComponent(token)}`;
    await this.#security.success(actor, {
      workspaceId: session.workspaceId,
      siteId: session.siteId,
      action: "preview.create",
      resourceType: "preview-session",
      resourceId: session.id,
      revisionId: session.revisionId,
      capability: Capabilities.PreviewCreate,
      details: { expiresAt, themeRelease: session.themeRelease },
    });
    return { session, previewUrl };
  }

  async resolve(token: string, options: { deferTouch?: (promise: Promise<void>) => void } = {}): Promise<ResolvedPreview> {
    const payload = await verifyCompactToken<PreviewTokenPayload>(token, this.#secret);
    assertDomain(payload?.typ === "content-preview", "INVALID_PREVIEW_TOKEN", "Preview token is invalid", 403);
    const now = this.#clock.now();
    assertDomain(typeof payload.expiresAt === "number" && payload.expiresAt > now, "PREVIEW_EXPIRED", "Preview has expired", 410);
    const previewId = asPreviewSessionId(String(payload.sessionId));
    const projected = this.#store.resolve ? await this.#store.resolve(previewId) : null;
    const session = projected?.session ?? await this.#store.get(previewId);
    assertDomain(session, "PREVIEW_NOT_FOUND", "Preview session not found", 404);
    assertDomain(session.revokedAt === null, "PREVIEW_REVOKED", "Preview session has been revoked", 410);
    assertDomain(session.expiresAt > now, "PREVIEW_EXPIRED", "Preview has expired", 410);
    assertDomain(
      session.contentItemId === payload.contentItemId &&
      session.revisionId === payload.revisionId &&
      session.siteId === payload.siteId &&
      session.revisionHash === payload.revisionHash &&
      session.themeRelease === payload.themeRelease &&
      session.tokenVersion === payload.tokenVersion,
      "PREVIEW_TOKEN_MISMATCH",
      "Preview token no longer matches the stored session",
      403,
    );
    const snapshot = projected?.snapshot ?? await this.#cms.store.getContentSnapshot(asContentItemId(String(payload.contentItemId)));
    assertDomain(snapshot && snapshot.item.siteId === asSiteId(String(payload.siteId)), "PREVIEW_CONTENT_NOT_FOUND", "Preview content was not found", 404);
    const revision = projected?.revision ?? await this.#cms.store.getRevision(asRevisionId(String(payload.revisionId)));
    assertDomain(revision && revision.contentItemId === snapshot.item.id, "PREVIEW_REVISION_NOT_FOUND", "Preview revision was not found", 404);
    assertDomain(revision.contentHash === session.revisionHash, "PREVIEW_REVISION_CHANGED", "Preview revision integrity check failed", 409);
    const touch = this.#store.touch(session.id, now);
    if (options.deferTouch) options.deferTouch(touch);
    else await touch;
    return { session, snapshot, revision, ...(projected?.site ? { site: projected.site } : {}) };
  }

  async revoke(actor: ActorContext, previewId: PreviewSessionId): Promise<PreviewSession> {
    const session = await this.#store.get(previewId);
    assertDomain(session, "PREVIEW_NOT_FOUND", "Preview session not found", 404);
    await this.#security.authorize(actor, Capabilities.PreviewRevoke, {
      workspaceId: session.workspaceId,
      siteId: session.siteId,
      risk: "medium",
    }, "preview.revoke", "preview-session", session.id);
    const revoked = await this.#store.revoke(session.id, this.#clock.now());
    await this.#security.success(actor, {
      workspaceId: session.workspaceId,
      siteId: session.siteId,
      action: "preview.revoke",
      resourceType: "preview-session",
      resourceId: session.id,
      revisionId: session.revisionId,
      capability: Capabilities.PreviewRevoke,
    });
    return revoked;
  }

  listActiveSessionsForSite(siteId: SiteId, now = this.#clock.now()): Promise<PreviewSession[]> {
    return this.#store.listActiveSessionsForSite(siteId, now);
  }
}

export class MemoryPreviewStore implements PreviewStore {
  readonly sessions = new Map<PreviewSessionId, PreviewSession>();
  async create(session: PreviewSession): Promise<void> { this.sessions.set(session.id, structuredClone(session)); }
  async get(id: PreviewSessionId): Promise<PreviewSession | null> { return this.sessions.has(id) ? structuredClone(this.sessions.get(id)!) : null; }
  async revoke(id: PreviewSessionId, now: number): Promise<PreviewSession> {
    const session = this.sessions.get(id);
    assertDomain(session, "PREVIEW_NOT_FOUND", "Preview session not found", 404);
    session.revokedAt = now;
    return structuredClone(session);
  }
  async touch(id: PreviewSessionId, now: number): Promise<void> { const session = this.sessions.get(id); if (session) session.lastAccessedAt = now; }
  async listActiveSessionsForSite(siteId: SiteId, now: number): Promise<PreviewSession[]> {
    return [...this.sessions.values()]
      .filter((session) => session.siteId === siteId && session.revokedAt === null && session.expiresAt > now)
      .map((session) => structuredClone(session));
  }
}
