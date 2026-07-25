import { DomainError } from "@baser-edge/core-types";
import { CSRF_COOKIE, CSRF_HEADER } from "./entities.js";
import { parseCookies } from "./cookies.js";
import { hashSecret } from "./cookies.js";

const MUTATING = new Set(["POST", "PUT", "PATCH", "DELETE"]);

export async function assertCsrfForMutation(request: Request, sessionCsrfHash: string): Promise<void> {
  if (!MUTATING.has(request.method)) return;
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
