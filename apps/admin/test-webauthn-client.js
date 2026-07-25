export function buildTestRegistrationResponse(challenge, credentialId = `test-${crypto.randomUUID()}`) {
  const clientDataJSON = base64UrlEncode(new TextEncoder().encode(JSON.stringify({
    type: "webauthn.create",
    challenge,
    origin: "https://localhost",
  })));
  return {
    id: credentialId,
    rawId: credentialId,
    type: "public-key",
    clientExtensionResults: {},
    response: {
      clientDataJSON,
      attestationObject: base64UrlEncode(new Uint8Array([1, 2, 3])),
      transports: ["internal"],
    },
  };
}

export function buildTestAuthenticationResponse(challenge, credentialId) {
  const clientDataJSON = base64UrlEncode(new TextEncoder().encode(JSON.stringify({
    type: "webauthn.get",
    challenge,
    origin: "https://localhost",
  })));
  return {
    id: credentialId,
    rawId: credentialId,
    type: "public-key",
    clientExtensionResults: {},
    response: {
      clientDataJSON,
      authenticatorData: base64UrlEncode(new Uint8Array(37)),
      signature: base64UrlEncode(new Uint8Array(64)),
    },
  };
}

function base64UrlEncode(value) {
  let binary = "";
  for (const byte of value) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}
