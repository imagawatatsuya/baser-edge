import { DomainError } from "@baser-edge/core-types";

export interface CloudflareAccessConfig {
  required: boolean;
  teamDomain?: string;
  audience?: string;
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
