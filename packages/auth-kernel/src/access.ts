import { DomainError } from "@baser-edge/core-types";
import { createRemoteJWKSet, jwtVerify } from "jose";

export interface CloudflareAccessConfig {
  required: boolean;
  teamDomain?: string;
  audience?: string;
}

export interface CloudflareAccessEnv {
  CF_ACCESS_REQUIRED?: string;
  CF_ACCESS_TEAM_DOMAIN?: string;
  CF_ACCESS_AUDIENCE?: string;
}

export function cloudflareAccessLoginConfigured(env: CloudflareAccessEnv): boolean {
  return env.CF_ACCESS_REQUIRED === "true"
    && Boolean(env.CF_ACCESS_TEAM_DOMAIN?.trim())
    && Boolean(env.CF_ACCESS_AUDIENCE?.trim());
}

export function assertCloudflareAccessBoundary(request: Request, config: CloudflareAccessConfig): void {
  if (!config.required) return;
  const jwt = request.headers.get("cf-access-jwt-assertion");
  if (!jwt) {
    throw new DomainError("ACCESS_JWT_REQUIRED", "Cloudflare Access JWT is required before CMS authentication", 403);
  }
  if (config.teamDomain && !request.headers.get("cf-access-authenticated-user-email")) {
    throw new DomainError("ACCESS_IDENTITY_MISSING", "Cloudflare Access identity headers are missing", 403);
  }
}

export function readAccessIdentityEmail(request: Request): string | null {
  return request.headers.get("cf-access-authenticated-user-email");
}

function normalizeTeamDomain(raw: string): string {
  const trimmed = raw.trim().replace(/\/$/, "");
  return trimmed.startsWith("http://") || trimmed.startsWith("https://")
    ? trimmed
    : `https://${trimmed}`;
}

export async function verifyCloudflareAccessJwt(
  token: string,
  config: { teamDomain: string; audience: string },
): Promise<{ email: string }> {
  const issuer = normalizeTeamDomain(config.teamDomain);
  const JWKS = createRemoteJWKSet(new URL(`${issuer}/cdn-cgi/access/certs`));
  try {
    const { payload } = await jwtVerify(token, JWKS, {
      issuer,
      audience: config.audience.trim(),
    });
    const email = typeof payload.email === "string" ? payload.email.trim() : "";
    if (!email) {
      throw new DomainError("ACCESS_IDENTITY_MISSING", "Cloudflare Access JWT does not include an email", 403);
    }
    const headerEmail = readAccessIdentityEmailFromPayload(payload);
    return { email: headerEmail ?? email };
  } catch (error) {
    if (error instanceof DomainError) throw error;
    throw new DomainError("ACCESS_JWT_INVALID", "Cloudflare Access JWT verification failed", 403);
  }
}

function readAccessIdentityEmailFromPayload(payload: Record<string, unknown>): string | null {
  if (typeof payload.email === "string" && payload.email.trim()) return payload.email.trim();
  return null;
}

export async function assertVerifiedAccessIdentity(
  request: Request,
  env: CloudflareAccessEnv,
  verify: (token: string) => Promise<{ email: string }>,
): Promise<string> {
  if (!cloudflareAccessLoginConfigured(env)) {
    throw new DomainError("ACCESS_LOGIN_DISABLED", "Cloudflare Access login is not configured", 403);
  }
  const token = request.headers.get("cf-access-jwt-assertion");
  if (!token?.trim()) {
    throw new DomainError("ACCESS_JWT_REQUIRED", "Cloudflare Access JWT is required for CMS login", 403);
  }
  const { email: jwtEmail } = await verify(token);
  const headerEmail = readAccessIdentityEmail(request);
  if (headerEmail) {
    const normalizedHeader = headerEmail.trim().toLowerCase();
    const normalizedJwt = jwtEmail.trim().toLowerCase();
    if (normalizedHeader !== normalizedJwt) {
      throw new DomainError("ACCESS_IDENTITY_MISMATCH", "Cloudflare Access identity headers do not match JWT", 403);
    }
  }
  return jwtEmail;
}
