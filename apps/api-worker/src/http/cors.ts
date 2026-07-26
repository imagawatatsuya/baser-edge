import { CSRF_HEADER } from "@baser-edge/auth-kernel";

export type CorsContext = Readonly<{
  requestOrigin: string | null;
  authOrigin?: string;
}>;

export function createCorsContext(request: Request, authOrigin: string | undefined): CorsContext {
  return {
    requestOrigin: request.headers.get("Origin"),
    ...(authOrigin ? { authOrigin } : {}),
  };
}

export function applyCors(response: Response, context: CorsContext): Response {
  const headers = new Headers(response.headers);
  const origin = context.requestOrigin;
  const authOrigin = context.authOrigin;
  if (origin && (/^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin) || (authOrigin && origin === authOrigin))) {
    headers.set("access-control-allow-origin", origin);
    headers.set("vary", "Origin");
  } else {
    headers.set("access-control-allow-origin", "*");
  }
  headers.set(
    "access-control-allow-headers",
    `content-type,x-baser-bootstrap-secret,x-baser-principal-id,x-baser-principal-type,x-baser-on-behalf-of,x-baser-delegation-id,x-request-id,${CSRF_HEADER}`,
  );
  headers.set("access-control-allow-credentials", "true");
  headers.set("access-control-allow-methods", "GET,POST,PUT,DELETE,OPTIONS");
  return new Response(response.body, { status: response.status, statusText: response.statusText, headers });
}
