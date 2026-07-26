function decodeBase64(value: string): Uint8Array {
  return Uint8Array.from(atob(value), (c) => c.charCodeAt(0));
}

function encodeBase64url(bytes: Uint8Array): string {
  let value = "";
  for (const byte of bytes) value += String.fromCharCode(byte);
  return btoa(value).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function decodeBase64url(value: string): Uint8Array {
  const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
  const padded = normalized + "=".repeat((4 - (normalized.length % 4)) % 4);
  return decodeBase64(padded);
}

function encryptionKeyBytes(base64Key: string): Uint8Array {
  const key = decodeBase64(base64Key.trim());
  if (key.length !== 32) throw new Error("ONBOARDING_TOKEN_ENCRYPTION_KEY invalid");
  return key;
}

export async function encryptTrialProvisionToken(base64Key: string, plaintext: string): Promise<string> {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const key = await crypto.subtle.importKey("raw", encryptionKeyBytes(base64Key), "AES-GCM", false, ["encrypt"]);
  const encoded = new TextEncoder().encode(plaintext);
  const cipher = new Uint8Array(
    await crypto.subtle.encrypt({ name: "AES-GCM", iv, tagLength: 128 }, key, encoded),
  );
  const tag = cipher.slice(-16);
  const data = cipher.slice(0, -16);
  const packed = new Uint8Array(12 + 16 + data.length);
  packed.set(iv, 0);
  packed.set(tag, 12);
  packed.set(data, 28);
  return encodeBase64url(packed);
}

export async function decryptTrialProvisionToken(base64Key: string, packedToken: string): Promise<string> {
  const packed = decodeBase64url(packedToken);
  if (packed.length < 29) throw new Error("Encrypted onboarding token is invalid");
  const iv = packed.slice(0, 12);
  const tag = packed.slice(12, 28);
  const data = packed.slice(28);
  const cipher = new Uint8Array(data.length + tag.length);
  cipher.set(data, 0);
  cipher.set(tag, data.length);
  const key = await crypto.subtle.importKey("raw", encryptionKeyBytes(base64Key), "AES-GCM", false, ["decrypt"]);
  const plain = await crypto.subtle.decrypt({ name: "AES-GCM", iv, tagLength: 128 }, key, cipher);
  return new TextDecoder().decode(plain);
}
