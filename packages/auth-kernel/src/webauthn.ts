import type {
  AuthenticationResponseJSON,
  AuthenticatorTransportFuture,
  PublicKeyCredentialCreationOptionsJSON,
  PublicKeyCredentialRequestOptionsJSON,
  RegistrationResponseJSON,
} from "@simplewebauthn/server";
import {
  generateAuthenticationOptions,
  generateRegistrationOptions,
  verifyAuthenticationResponse,
  verifyRegistrationResponse,
} from "@simplewebauthn/server";
import type { PasskeyCredential } from "./entities.js";
import type { WebAuthnGateway } from "./gateway.js";

export interface WebAuthnConfig {
  rpId: string;
  rpName: string;
  origin: string;
}

export class SimpleWebAuthnGateway implements WebAuthnGateway {
  readonly #config: WebAuthnConfig;

  constructor(config: WebAuthnConfig) {
    this.#config = config;
  }

  async registrationOptions(input: {
    userId: string;
    userName: string;
    userDisplayName: string;
    excludeCredentials: PasskeyCredential[];
  }): Promise<{ options: PublicKeyCredentialCreationOptionsJSON; challenge: string }> {
    const options = await generateRegistrationOptions({
      rpName: this.#config.rpName,
      rpID: this.#config.rpId,
      userID: new TextEncoder().encode(input.userId),
      userName: input.userName,
      userDisplayName: input.userDisplayName,
      attestationType: "none",
      excludeCredentials: input.excludeCredentials.map((credential) => ({
        id: credential.credentialId,
        transports: credential.transports as AuthenticatorTransportFuture[],
      })),
      authenticatorSelection: {
        residentKey: "preferred",
        userVerification: "required",
      },
    });
    return { options, challenge: options.challenge };
  }

  async verifyRegistration(input: {
    response: RegistrationResponseJSON;
    expectedChallenge: string;
  }): Promise<{ credentialId: string; publicKey: Uint8Array; counter: number; aaguid?: string }> {
    const verification = await verifyRegistrationResponse({
      response: input.response,
      expectedChallenge: input.expectedChallenge,
      expectedOrigin: this.#config.origin,
      expectedRPID: this.#config.rpId,
      requireUserVerification: true,
    });
    if (!verification.verified || !verification.registrationInfo) {
      throw new Error("Registration verification failed");
    }
    return {
      credentialId: verification.registrationInfo.credential.id,
      publicKey: verification.registrationInfo.credential.publicKey,
      counter: verification.registrationInfo.credential.counter,
      ...(verification.registrationInfo.aaguid ? { aaguid: verification.registrationInfo.aaguid } : {}),
    };
  }

  async authenticationOptions(input: {
    allowCredentials: PasskeyCredential[];
  }): Promise<{ options: PublicKeyCredentialRequestOptionsJSON; challenge: string }> {
    const options = await generateAuthenticationOptions({
      rpID: this.#config.rpId,
      userVerification: "required",
      allowCredentials: input.allowCredentials.map((credential) => ({
        id: credential.credentialId,
        transports: credential.transports as AuthenticatorTransportFuture[],
      })),
    });
    return { options, challenge: options.challenge };
  }

  async verifyAuthentication(input: {
    response: AuthenticationResponseJSON;
    expectedChallenge: string;
    credential: PasskeyCredential;
  }): Promise<{ counter: number }> {
    const verification = await verifyAuthenticationResponse({
      response: input.response,
      expectedChallenge: input.expectedChallenge,
      expectedOrigin: this.#config.origin,
      expectedRPID: this.#config.rpId,
      credential: {
        id: input.credential.credentialId,
        publicKey: input.credential.publicKey,
        counter: input.credential.counter,
        transports: input.credential.transports as AuthenticatorTransportFuture[],
      },
      requireUserVerification: true,
    });
    if (!verification.verified || !verification.authenticationInfo) {
      throw new Error("Authentication verification failed");
    }
    return { counter: verification.authenticationInfo.newCounter };
  }
}
