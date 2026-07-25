import type {
  CustomContentId,
  CustomEntryApprovalId,
  CustomEntryId,
  CustomEntryRevisionId,
  CustomFieldId,
  CustomTableId,
  ContentItemId,
  SiteId,
  WorkspaceId,
} from "@baser-edge/core-types";
import type {
  CustomContentDefinition,
  CustomEntry,
  CustomEntryApproval,
  CustomEntryRevision,
  CustomEntrySnapshot,
  CustomFieldDefinition,
  CustomTableDefinition,
  CustomTableField,
} from "./entities.js";

export interface CustomContentStore {
  createField(field: CustomFieldDefinition): Promise<void>;
  getField(id: CustomFieldId): Promise<CustomFieldDefinition | null>;
  listFields(workspaceId: WorkspaceId): Promise<CustomFieldDefinition[]>;

  createTable(table: CustomTableDefinition): Promise<void>;
  getTable(id: CustomTableId): Promise<CustomTableDefinition | null>;
  listTables(workspaceId: WorkspaceId): Promise<CustomTableDefinition[]>;
  updateTable(table: CustomTableDefinition): Promise<void>;
  attachField(relation: CustomTableField): Promise<void>;
  listTableFields(tableId: CustomTableId): Promise<CustomTableField[]>;

  createCustomContent(definition: CustomContentDefinition): Promise<void>;
  getCustomContent(id: CustomContentId): Promise<CustomContentDefinition | null>;
  getCustomContentByContentItem(contentItemId: ContentItemId): Promise<CustomContentDefinition | null>;
  listCustomContents(siteId: SiteId): Promise<CustomContentDefinition[]>;

  createEntry(entry: CustomEntry, revision: CustomEntryRevision): Promise<CustomEntrySnapshot>;
  getEntry(id: CustomEntryId): Promise<CustomEntrySnapshot | null>;
  getEntryByPublicKey(customContentId: CustomContentId, key: string): Promise<CustomEntrySnapshot | null>;
  listEntries(customContentId: CustomContentId): Promise<CustomEntrySnapshot[]>;
  commitEntryRevision(input: {
    entryId: CustomEntryId;
    baseRevisionId: CustomEntryRevisionId;
    expectedLockVersion: number;
    revision: CustomEntryRevision;
  }): Promise<CustomEntryRevision>;

  createApproval(approval: CustomEntryApproval): Promise<void>;
  getApproval(id: CustomEntryApprovalId): Promise<CustomEntryApproval | null>;
  listPendingApprovalsBySite(siteId: SiteId): Promise<CustomEntryApproval[]>;
  updateApproval(approval: CustomEntryApproval): Promise<void>;
  publishEntry(input: { entryId: CustomEntryId; revisionId: CustomEntryRevisionId; approvalId: CustomEntryApprovalId; now: number }): Promise<CustomEntrySnapshot>;
  unpublishEntry(input: { entryId: CustomEntryId; now: number }): Promise<CustomEntrySnapshot>;
}
