import type { Capability } from "@baser-edge/authorization";
import type { ActorContext, RiskLevel } from "@baser-edge/core-types";

export interface CmsSecurityHooks {
  assertStepUp?(actor: ActorContext, input: { action: string; capability: Capability; risk: RiskLevel }): Promise<void>;
}
