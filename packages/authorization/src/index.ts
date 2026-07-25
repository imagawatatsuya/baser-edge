import {
  DomainError,
  type ActorContext,
  type CapabilityGrantId,
  type DelegationId,
  type PrincipalId,
  type RiskLevel,
  type SiteId,
  type WorkspaceId,
} from "@baser-edge/core-types";

export const Capabilities = {
  All: "*",
  SiteCreate: "site.create",
  ContentRead: "content.read",
  ContentCreate: "content.create",
  ContentRevise: "content.revise",
  ContentMove: "content.move",
  ContentCopy: "content.copy",
  ContentTrash: "content.trash",
  ContentRestore: "content.restore",
  AliasCreate: "alias.create",
  ContentRequestPublish: "content.request-publish",
  ContentApprove: "content.approve",
  ContentPublish: "content.publish",
  ContentUnpublish: "content.unpublish",
  PrincipalManage: "principal.manage",
  GrantManage: "grant.manage",
  AssetRead: "asset.read",
  AssetUpload: "asset.upload",
  AssetDelete: "asset.delete",
  PreviewCreate: "preview.create",
  PreviewRevoke: "preview.revoke",
  BlogCreate: "blog.create",
  ArticleCreate: "article.create",
  TaxonomyManage: "taxonomy.manage",
  ArticleClassify: "article.classify",
  CustomFieldManage: "custom-field.manage",
  CustomTableManage: "custom-table.manage",
  CustomContentCreate: "custom-content.create",
  CustomEntryRead: "custom-entry.read",
  CustomEntryCreate: "custom-entry.create",
  CustomEntryRevise: "custom-entry.revise",
  CustomEntryRequestPublish: "custom-entry.request-publish",
  CustomEntryApprove: "custom-entry.approve",
  CustomEntryPublish: "custom-entry.publish",
  CustomEntryUnpublish: "custom-entry.unpublish",
  MailFormCreate: "mail-form.create",
  MailFormManage: "mail-form.manage",
  MailSubmissionRead: "mail-submission.read",
  MailSubmissionReadSensitive: "mail-submission.read-sensitive",
  MailSubmissionPurge: "mail-submission.purge",
  MailNotificationDeliver: "mail-notification.deliver",
  ThemeRead: "theme.read",
  ThemeManage: "theme.manage",
  ThemeActivate: "theme.activate",
  PluginRead: "plugin.read",
  PluginManage: "plugin.manage",
  PluginActivate: "plugin.activate",
  PluginInvoke: "plugin.invoke",
} as const;

export type Capability = (typeof Capabilities)[keyof typeof Capabilities] | string;

export interface CapabilityScope {
  workspaceId?: WorkspaceId;
  siteId?: SiteId;
  contentType?: string;
  pathPrefix?: string;
  maximumRisk?: RiskLevel;
}

export interface CapabilityGrant {
  id: CapabilityGrantId;
  principalId: PrincipalId;
  capability: Capability;
  scope: CapabilityScope;
  validFrom?: number;
  validUntil?: number;
  revokedAt?: number;
}

export interface DelegationGrant {
  id: DelegationId;
  humanPrincipalId: PrincipalId;
  agentPrincipalId: PrincipalId;
  capabilities: Capability[];
  scope: CapabilityScope;
  maximumRisk: RiskLevel;
  expiresAt: number;
  revokedAt?: number;
}

export interface AuthorizationResource {
  workspaceId: WorkspaceId;
  siteId?: SiteId;
  contentType?: string;
  path?: string;
  risk: RiskLevel;
}

export interface AuthorizationInput {
  actor: ActorContext;
  capability: Capability;
  resource: AuthorizationResource;
  grants: readonly CapabilityGrant[];
  delegation?: DelegationGrant;
  now: number;
}

const riskOrder: Record<RiskLevel, number> = { low: 0, medium: 1, high: 2, critical: 3 };

export interface AuthorizationDecision {
  allowed: boolean;
  reason: string;
  grantId?: CapabilityGrantId;
  delegationId?: DelegationId;
}

export function evaluateAuthorization(input: AuthorizationInput): AuthorizationDecision {
  if (input.actor.actorType === "agent" && (input.capability === Capabilities.ContentPublish || input.capability === Capabilities.ContentUnpublish || input.capability === Capabilities.CustomEntryPublish || input.capability === Capabilities.CustomEntryUnpublish)) {
    return { allowed: false, reason: "default_agent_publish_policy" };
  }

  const usableGrant = input.grants.find((grant) =>
    grant.principalId === input.actor.actorId &&
    grant.revokedAt === undefined &&
    (grant.validFrom === undefined || grant.validFrom <= input.now) &&
    (grant.validUntil === undefined || grant.validUntil > input.now) &&
    capabilityMatches(grant.capability, input.capability) &&
    scopeMatches(grant.scope, input.resource),
  );

  if (!usableGrant) return { allowed: false, reason: "capability_not_granted" };

  if (input.actor.actorType !== "agent") {
    return { allowed: true, reason: "grant", grantId: usableGrant.id };
  }

  const delegation = input.delegation;
  if (!delegation) return { allowed: false, reason: "agent_delegation_required" };
  if (delegation.agentPrincipalId !== input.actor.actorId) return { allowed: false, reason: "delegation_agent_mismatch" };
  if (input.actor.onBehalfOf !== delegation.humanPrincipalId) return { allowed: false, reason: "delegation_human_mismatch" };
  if (delegation.revokedAt !== undefined || delegation.expiresAt <= input.now) return { allowed: false, reason: "delegation_expired" };
  if (!delegation.capabilities.some((capability) => capabilityMatches(capability, input.capability))) {
    return { allowed: false, reason: "capability_not_delegated" };
  }
  if (!scopeMatches(delegation.scope, input.resource)) return { allowed: false, reason: "delegation_scope_mismatch" };
  if (riskOrder[input.resource.risk] > riskOrder[delegation.maximumRisk]) {
    return { allowed: false, reason: "delegation_risk_exceeded" };
  }

  return {
    allowed: true,
    reason: "grant_and_delegation",
    grantId: usableGrant.id,
    delegationId: delegation.id,
  };
}

export function requireAuthorization(input: AuthorizationInput): AuthorizationDecision {
  const decision = evaluateAuthorization(input);
  if (!decision.allowed) {
    throw new DomainError("FORBIDDEN", `Operation denied: ${decision.reason}`, 403, {
      capability: input.capability,
      reason: decision.reason,
    });
  }
  return decision;
}

function capabilityMatches(granted: Capability, requested: Capability): boolean {
  return granted === Capabilities.All || granted === requested;
}

function scopeMatches(scope: CapabilityScope, resource: AuthorizationResource): boolean {
  if (scope.workspaceId !== undefined && scope.workspaceId !== resource.workspaceId) return false;
  if (scope.siteId !== undefined && scope.siteId !== resource.siteId) return false;
  if (scope.contentType !== undefined && scope.contentType !== resource.contentType) return false;
  if (scope.pathPrefix !== undefined && (resource.path === undefined || !resource.path.startsWith(scope.pathPrefix))) return false;
  if (scope.maximumRisk !== undefined && riskOrder[resource.risk] > riskOrder[scope.maximumRisk]) return false;
  return true;
}
