import {
  D1_PRIMARY_LOCATION_HINTS,
  type D1PrimaryLocationHint,
} from "./cloudflare-builds.js";

export type TrialProvisionQueueMessage = {
  version: 1;
  sessionId: string;
  accountId: string;
  requestOrigin: string;
  encryptedApiToken: string;
  encryptedState?: string;
  d1PrimaryLocationHint?: D1PrimaryLocationHint;
};

export class TrialProvisionQueueMessageError extends Error {
  readonly code = "INVALID_TRIAL_PROVISION_QUEUE_MESSAGE";

  constructor(message: string) {
    super(message);
    this.name = "TrialProvisionQueueMessageError";
  }
}

function fail(message: string): never {
  throw new TrialProvisionQueueMessageError(message);
}

export function parseTrialProvisionQueueMessage(input: unknown): TrialProvisionQueueMessage {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    fail("Queue message must be an object");
  }

  const body = input as Record<string, unknown>;
  if (body.version !== 1) fail("Queue message version must be 1");

  const sessionId = String(body.sessionId ?? "");
  if (!/^[a-f0-9]{24}$/.test(sessionId)) {
    fail("Queue message sessionId is invalid");
  }

  const accountId = String(body.accountId ?? "");
  if (!/^[a-f0-9]{32}$/.test(accountId)) {
    fail("Queue message accountId is invalid");
  }

  const requestOrigin = String(body.requestOrigin ?? "");
  let origin: URL;
  try {
    origin = new URL(requestOrigin);
  } catch {
    fail("Queue message requestOrigin is invalid");
  }
  if (
    origin.protocol !== "https:" ||
    origin.origin !== requestOrigin ||
    origin.username ||
    origin.password
  ) {
    fail("Queue message requestOrigin must be an HTTPS origin");
  }

  const encryptedApiToken = String(body.encryptedApiToken ?? "");
  if (
    encryptedApiToken.length < 40 ||
    encryptedApiToken.length > 8192 ||
    !/^[A-Za-z0-9_-]+$/.test(encryptedApiToken)
  ) {
    fail("Queue message encryptedApiToken is invalid");
  }

  const encryptedState = body.encryptedState === undefined
    ? undefined
    : String(body.encryptedState);
  if (
    encryptedState !== undefined
    && (
      encryptedState.length < 40
      || encryptedState.length > 16384
      || !/^[A-Za-z0-9_-]+$/.test(encryptedState)
    )
  ) {
    fail("Queue message encryptedState is invalid");
  }

  const d1PrimaryLocationHint = body.d1PrimaryLocationHint;
  if (
    d1PrimaryLocationHint !== undefined
    && (
      typeof d1PrimaryLocationHint !== "string"
      || !D1_PRIMARY_LOCATION_HINTS.includes(d1PrimaryLocationHint as D1PrimaryLocationHint)
    )
  ) {
    fail("Queue message d1PrimaryLocationHint is invalid");
  }

  return {
    version: 1,
    sessionId,
    accountId,
    requestOrigin,
    encryptedApiToken,
    ...(encryptedState ? { encryptedState } : {}),
    ...(d1PrimaryLocationHint
      ? { d1PrimaryLocationHint: d1PrimaryLocationHint as D1PrimaryLocationHint }
      : {}),
  };
}
