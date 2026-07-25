import { DomainError } from "@baser-edge/core-types";
import type { AuthenticationResponseJSON, RegistrationResponseJSON } from "@simplewebauthn/server";
import type { PasskeyCredential } from "./entities.js";
import type { WebAuthnGateway } from "./gateway.js";
import { base64UrlEncode } from "@baser-edge/core-types";

/**
 * Deterministic WebAuthn gateway for automated tests. Never use in production.
 */
export class TestWebAuthnGateway implements WebAuthnGateway {
  async registrationOptions(input: {
    userId: string;
    userName: string;
    userDisplayName: string;
    excludeCredentials: PasskeyCredential[];
  }): Promise<{ options: unknown; challenge: string }> {
    const challenge = base64UrlEncode(new TextEncoder().encode(`register:${input.userId}:${crypto.randomUUID()}`));
    return {
      challenge,
      options: {
        challenge,
        rp: { id: "localhost", name: "test" },
        user: { id: input.userId, name: input.userName, displayName: input.userDisplayName },
      },
    };
  }

  async verifyRegistration(input: {
    response: RegistrationResponseJSON;
    expectedChallenge: string;
  }): Promise<{ credentialId: string; publicKey: Uint8Array; counter: number }> {
    const clientData = JSON.parse(new TextDecoder().decode(base64UrlToBytes(input.response.response.clientDataJSON)));
    if (clientData.challenge !== input.expectedChallenge) {
      throw new DomainError("WEBAUTHN_VERIFICATION_FAILED", "Registration challenge mismatch", 401);
    }
    const credentialId = input.response.id;
    const publicKey = new Uint8Array(65);
    publicKey[0] = 0x04;
    return { credentialId, publicKey, counter: 0 };
  }

  async authenticationOptions(input: {
    allowCredentials: PasskeyCredential[];
  }): Promise<{ options: unknown; challenge: string }> {
    const challenge = base64UrlEncode(new TextEncoder().encode(`auth:${input.allowCredentials[0]?.credentialId ?? "none"}:${crypto.randomUUID()}`));
    return {
      challenge,
      options: { challenge, allowCredentials: input.allowCredentials.map((entry) => ({ id: entry.credentialId })) },
    };
  }

  async verifyAuthentication(input: {
    response: AuthenticationResponseJSON;
    expectedChallenge: string;
    credential: PasskeyCredential;
  }): Promise<{ counter: number }> {
    if (input.response.id !== input.credential.credentialId) {
      throw new DomainError("WEBAUTHN_VERIFICATION_FAILED", "Credential mismatch", 401);
    }
    const clientData = JSON.parse(new TextDecoder().decode(base64UrlToBytes(input.response.response.clientDataJSON)));
    if (clientData.challenge !== input.expectedChallenge) {
      throw new DomainError("WEBAUTHN_VERIFICATION_FAILED", "Authentication challenge mismatch", 401);
    }
    return { counter: input.credential.counter + 1 };
  }
}

function base64UrlToBytes(value: string): Uint8Array {
  const padded = value.replace(/-/g, "+").replace(/_/g, "/") + "=".repeat((4 - value.length % 4) % 4);
  const binary = atob(padded);
  return Uint8Array.from(binary, (character) => character.charCodeAt(0));
}

export function buildTestRegistrationResponse(challenge: string, credentialId = `test-${crypto.randomUUID()}`): RegistrationResponseJSON {
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
  } as RegistrationResponseJSON;
}

export function buildTestAuthenticationResponse(challenge: string, credentialId: string): AuthenticationResponseJSON {
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
  } as AuthenticationResponseJSON;
}
