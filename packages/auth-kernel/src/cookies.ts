import { sha256, base64UrlEncode } from "@baser-edge/core-types";

export async function hashSecret(value: string): Promise<string> {
  return sha256(value);
}

export function randomToken(bytes = 32): string {
  const buffer = new Uint8Array(bytes);
  crypto.getRandomValues(buffer);
  return base64UrlEncode(buffer);
}

export function parseCookies(header: string | null): Map<string, string> {
  const cookies = new Map<string, string>();
  if (!header) return cookies;
  for (const part of header.split(";")) {
    const [rawName, ...rest] = part.trim().split("=");
    if (!rawName || rest.length === 0) continue;
    cookies.set(rawName, decodeURIComponent(rest.join("=")));
  }
  return cookies;
}

export function serializeCookie(name: string, value: string, options: {
  maxAgeSeconds: number;
  httpOnly: boolean;
  secure: boolean;
  sameSite: "Lax" | "Strict" | "None";
  path?: string;
}): string {
  const segments = [`${name}=${encodeURIComponent(value)}`, `Path=${options.path ?? "/"}`, `Max-Age=${options.maxAgeSeconds}`];
  if (options.httpOnly) segments.push("HttpOnly");
  if (options.secure) segments.push("Secure");
  segments.push(`SameSite=${options.sameSite}`);
  return segments.join("; ");
}

export function clearCookie(name: string): string {
  return `${name}=; Path=/; Max-Age=0; HttpOnly; SameSite=Lax`;
}
