import type { Capability } from "@baser-edge/authorization";
import { Capabilities } from "@baser-edge/authorization";
import type { RiskLevel } from "@baser-edge/core-types";

export const StepUpOperations = {
  ThemeActivate: "theme.activate",
  PluginActivate: "plugin.activate",
  MailSubmissionReadSensitive: "mail-submission.read-sensitive",
  SessionRevokeAll: "session.revoke-all",
  ContentPublish: "content.publish",
  ContentUnpublish: "content.unpublish",
  CustomEntryPublish: "custom-entry.publish",
  CustomEntryUnpublish: "custom-entry.unpublish",
} as const;

export type StepUpOperation = (typeof StepUpOperations)[keyof typeof StepUpOperations];

export function requiredStepUpOperation(input: {
  action: string;
  capability: Capability;
  risk: RiskLevel;
}): StepUpOperation | null {
  if (input.action === StepUpOperations.ThemeActivate || input.capability === Capabilities.ThemeActivate) {
    return StepUpOperations.ThemeActivate;
  }
  if (input.action === StepUpOperations.PluginActivate || input.capability === Capabilities.PluginActivate) {
    return StepUpOperations.PluginActivate;
  }
  if (input.action === StepUpOperations.MailSubmissionReadSensitive || input.capability === Capabilities.MailSubmissionReadSensitive) {
    return StepUpOperations.MailSubmissionReadSensitive;
  }
  if (input.action === StepUpOperations.ContentPublish || input.capability === Capabilities.ContentPublish) {
    return StepUpOperations.ContentPublish;
  }
  if (input.action === StepUpOperations.ContentUnpublish || input.capability === Capabilities.ContentUnpublish) {
    return StepUpOperations.ContentUnpublish;
  }
  if (input.action === StepUpOperations.CustomEntryPublish || input.capability === Capabilities.CustomEntryPublish) {
    return StepUpOperations.CustomEntryPublish;
  }
  if (input.action === StepUpOperations.CustomEntryUnpublish || input.capability === Capabilities.CustomEntryUnpublish) {
    return StepUpOperations.CustomEntryUnpublish;
  }
  if (input.action === StepUpOperations.SessionRevokeAll) {
    return StepUpOperations.SessionRevokeAll;
  }
  if (input.risk === "critical" && input.capability === Capabilities.PluginActivate) {
    return StepUpOperations.PluginActivate;
  }
  return null;
}
