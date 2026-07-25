import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";

function keyBytes() {
  const raw = process.env.ONBOARDING_TOKEN_ENCRYPTION_KEY?.trim();
  if (!raw) throw new Error("ONBOARDING_TOKEN_ENCRYPTION_KEY が未設定です");
  const buf = Buffer.from(raw, "base64");
  if (buf.length !== 32) throw new Error("ONBOARDING_TOKEN_ENCRYPTION_KEY は base64 の 32 バイトである必要があります");
  return buf;
}

/** @param {string} plaintext */
export function encryptOnboardingSecret(plaintext) {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", keyBytes(), iv);
  const enc = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([iv, tag, enc]).toString("base64url");
}

/** @param {string} packed */
export function decryptOnboardingSecret(packed) {
  const buf = Buffer.from(packed, "base64url");
  const iv = buf.subarray(0, 12);
  const tag = buf.subarray(12, 28);
  const data = buf.subarray(28);
  const decipher = createDecipheriv("aes-256-gcm", keyBytes(), iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(data), decipher.final()]).toString("utf8");
}
