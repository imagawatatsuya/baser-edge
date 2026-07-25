export function buildTestAuthenticationResponse(challenge: string, credentialId: string) {
  const clientDataJSON = base64UrlEncode(new TextEncoder().encode(JSON.stringify({
    type: "webauthn.get",
    challenge,
    origin: "https://localhost",
  })));
  return {
    id: credentialId,
    rawId: credentialId,
    type: "public-key" as const,
    clientExtensionResults: {},
    response: {
      clientDataJSON,
      authenticatorData: base64UrlEncode(new Uint8Array(37)),
      signature: base64UrlEncode(new Uint8Array(64)),
    },
  };
}

function base64UrlEncode(value: Uint8Array) {
  let binary = "";
  for (const byte of value) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}
