import type { AuthenticationResponseJSON, RegistrationResponseJSON } from "@simplewebauthn/server";
import type { PasskeyCredential } from "./entities.js";

export interface WebAuthnGateway {
  registrationOptions(input: {
    userId: string;
    userName: string;
    userDisplayName: string;
    excludeCredentials: PasskeyCredential[];
  }): Promise<{ options: unknown; challenge: string }>;

  verifyRegistration(input: {
    response: RegistrationResponseJSON;
    expectedChallenge: string;
  }): Promise<{ credentialId: string; publicKey: Uint8Array; counter: number; aaguid?: string }>;

  authenticationOptions(input: {
    allowCredentials: PasskeyCredential[];
  }): Promise<{ options: unknown; challenge: string }>;

  verifyAuthentication(input: {
    response: AuthenticationResponseJSON;
    expectedChallenge: string;
    credential: PasskeyCredential;
  }): Promise<{ counter: number }>;
}
