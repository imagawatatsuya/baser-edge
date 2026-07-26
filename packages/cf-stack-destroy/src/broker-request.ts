import { TRIAL_STACK_ID } from "./trial-names.js";

export type BrokerTeardownRequest = {
  accessToken: string;
  stackId: typeof TRIAL_STACK_ID;
};

export type BrokerTeardownRequestErrorCode =
  | "INVALID_BODY"
  | "MISSING_ACCESS_TOKEN"
  | "INVALID_STACK";

export class BrokerTeardownRequestError extends Error {
  constructor(
    message: string,
    readonly code: BrokerTeardownRequestErrorCode,
  ) {
    super(message);
    this.name = "BrokerTeardownRequestError";
  }
}

export function parseBrokerTeardownRequest(value: unknown): BrokerTeardownRequest {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new BrokerTeardownRequestError("リクエストの形式が正しくありません。", "INVALID_BODY");
  }
  const input = value as Record<string, unknown>;
  const accessToken = typeof input.accessToken === "string" ? input.accessToken.trim() : "";
  if (!accessToken) {
    throw new BrokerTeardownRequestError("認証情報がありません。", "MISSING_ACCESS_TOKEN");
  }
  if (input.stackId !== TRIAL_STACK_ID) {
    throw new BrokerTeardownRequestError("削除対象は trial スタックだけです。", "INVALID_STACK");
  }
  return { accessToken, stackId: TRIAL_STACK_ID };
}
