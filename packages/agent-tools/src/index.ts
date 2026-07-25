import {
  asAgentRunId,
  asChangeSetId,
  assertDomain,
  newId,
  type ActorContext,
  type ContentItemId,
  type RevisionId,
} from "@baser-edge/core-types";
import {
  applyOperations,
  diffDocuments,
  type BlockOperation,
} from "@baser-edge/structured-document";
import {
  CmsService,
  type AgentRun,
  type ChangeSet,
  type ContentRevision,
} from "@baser-edge/content-kernel";

export interface ProposalInput {
  contentItemId: ContentItemId;
  baseRevisionId: RevisionId;
  expectedLockVersion: number;
  operations: BlockOperation[];
  instructionSummary: string;
  modelProvider: string;
  modelName: string;
}

export interface ProposalResult {
  run: AgentRun;
  changeSet: ChangeSet;
  revision: ContentRevision;
}

export class AgentOperations {
  readonly #cms: CmsService;

  constructor(cms: CmsService) {
    this.#cms = cms;
  }

  async proposeDocumentChange(agentActor: ActorContext, input: ProposalInput): Promise<ProposalResult> {
    assertDomain(agentActor.actorType === "agent", "AGENT_ACTOR_REQUIRED", "Agent operation requires an AgentPrincipal", 403);
    assertDomain(agentActor.onBehalfOf, "HUMAN_INSTRUCTOR_REQUIRED", "Agent operation must identify the instructing human", 422);
    assertDomain(agentActor.delegationId, "DELEGATION_REQUIRED", "Agent operation requires an explicit delegation", 403);

    const snapshot = await this.#cms.getContent(agentActor, input.contentItemId);
    const base = snapshot.workingRevision;
    assertDomain(base, "WORKING_REVISION_MISSING", "Content has no working revision", 409);
    assertDomain(base.id === input.baseRevisionId, "STALE_AGENT_BASE", "Agent proposal is based on a stale revision", 409);

    const startedAt = Date.now();
    const run: AgentRun = {
      id: asAgentRunId(newId("agentRun")),
      workspaceId: snapshot.item.workspaceId,
      agentPrincipalId: agentActor.actorId,
      instructedBy: agentActor.onBehalfOf,
      modelProvider: input.modelProvider,
      modelName: input.modelName,
      baseRevisionId: base.id,
      producedRevisionId: null,
      state: "running",
      startedAt,
      completedAt: null,
    };
    await this.#cms.store.saveAgentRun(run);

    try {
      const candidate = applyOperations(base.document, input.operations, this.#cms.registry);
      const diff = diffDocuments(base.document, candidate);
      const riskLevel = calculateRisk(input.operations);
      const changeSet: ChangeSet = {
        id: asChangeSetId(newId("changeSet")),
        contentItemId: input.contentItemId,
        baseRevisionId: base.id,
        resultRevisionId: null,
        operations: structuredClone(input.operations),
        diff,
        riskLevel,
        state: "proposed",
        createdBy: agentActor.actorId,
        agentRunId: run.id,
        createdAt: startedAt,
      };
      await this.#cms.store.saveChangeSet(changeSet);

      const revision = await this.#cms.commitRevision(agentActor, {
        contentItemId: input.contentItemId,
        baseRevisionId: base.id,
        expectedLockVersion: input.expectedLockVersion,
        fields: structuredClone(base.fields),
        document: candidate,
        changeSummary: input.instructionSummary,
        agentRunId: run.id,
      });

      changeSet.resultRevisionId = revision.id;
      changeSet.state = "committed";
      await this.#cms.store.saveChangeSet(changeSet);
      run.producedRevisionId = revision.id;
      run.state = "completed";
      run.completedAt = Date.now();
      await this.#cms.store.updateAgentRun(run);
      return { run, changeSet, revision };
    } catch (error) {
      run.state = "failed";
      run.completedAt = Date.now();
      await this.#cms.store.updateAgentRun(run);
      throw error;
    }
  }

  async requestPublication(agentActor: ActorContext, input: { contentItemId: ContentItemId; revisionId: RevisionId; riskLevel?: ChangeSet["riskLevel"] }) {
    return this.#cms.requestApproval(agentActor, input);
  }
}

function calculateRisk(operations: readonly BlockOperation[]): ChangeSet["riskLevel"] {
  if (operations.some((operation) => operation.kind === "remove")) return "medium";
  if (operations.some((operation) => operation.kind === "move")) return "medium";
  return "low";
}
