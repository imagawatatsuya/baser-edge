import type {
  CustomContentId,
  CustomEntryApprovalId,
  CustomEntryId,
  CustomEntryRevisionId,
  CustomFieldId,
  CustomTableId,
  ContentItemId,
  PrincipalId,
  SiteId,
  WorkspaceId,
} from "@baser-edge/core-types";

export type CustomFieldType =
  | "text"
  | "textarea"
  | "integer"
  | "decimal"
  | "boolean"
  | "date"
  | "datetime"
  | "email"
  | "tel"
  | "select"
  | "multiselect"
  | "asset"
  | "richtext";

export interface SelectOption { value: string; label: string; }

export interface CustomFieldDefinition {
  id: CustomFieldId;
  workspaceId: WorkspaceId;
  key: string;
  name: string;
  type: CustomFieldType;
  description: string;
  options: SelectOption[];
  state: "active" | "disabled";
  createdAt: number;
  updatedAt: number;
}

export interface CustomTableDefinition {
  id: CustomTableId;
  workspaceId: WorkspaceId;
  key: string;
  name: string;
  kind: "content" | "master";
  hierarchical: boolean;
  displayFieldKey: string | null;
  schemaVersion: number;
  state: "active" | "disabled";
  createdAt: number;
  updatedAt: number;
}

export interface CustomTableField {
  tableId: CustomTableId;
  fieldId: CustomFieldId;
  required: boolean;
  searchable: boolean;
  unique: boolean;
  sortOrder: number;
  labelOverride: string | null;
  createdAt: number;
}

export interface CustomContentDefinition {
  id: CustomContentId;
  workspaceId: WorkspaceId;
  siteId: SiteId;
  contentItemId: ContentItemId;
  tableId: CustomTableId;
  listCount: number;
  listOrderFieldKey: string;
  listDirection: "asc" | "desc";
  templateKey: string;
  state: "active" | "disabled";
  createdAt: number;
  updatedAt: number;
}

export interface CustomEntry {
  id: CustomEntryId;
  customContentId: CustomContentId;
  tableId: CustomTableId;
  slug: string | null;
  parentEntryId: CustomEntryId | null;
  workingRevisionId: CustomEntryRevisionId;
  publishedRevisionId: CustomEntryRevisionId | null;
  lockVersion: number;
  state: "active" | "trashed";
  createdBy: PrincipalId;
  createdAt: number;
  updatedAt: number;
}

export interface CustomEntryRevision {
  id: CustomEntryRevisionId;
  entryId: CustomEntryId;
  revisionNumber: number;
  basedOnRevisionId: CustomEntryRevisionId | null;
  schemaVersion: number;
  values: Record<string, unknown>;
  contentHash: string;
  createdBy: PrincipalId;
  changeSummary: string;
  createdAt: number;
}

export interface CustomEntryApproval {
  id: CustomEntryApprovalId;
  entryId: CustomEntryId;
  revisionId: CustomEntryRevisionId;
  revisionHash: string;
  state: "pending" | "approved" | "rejected";
  requestedBy: PrincipalId;
  requestedAt: number;
  decidedBy: PrincipalId | null;
  decidedAt: number | null;
  decisionComment: string;
}

export interface CustomEntryApprovalInboxItem {
  approval: CustomEntryApproval;
  customContentId: CustomContentId;
  entrySlug: string | null;
}

export interface CustomEntrySnapshot {
  entry: CustomEntry;
  workingRevision: CustomEntryRevision;
  publishedRevision: CustomEntryRevision | null;
}

export interface CustomTableSchema {
  table: CustomTableDefinition;
  fields: Array<{ definition: CustomFieldDefinition; relation: CustomTableField }>;
}

export interface CustomEntryListOptions {
  limit?: number;
  offset?: number;
  filters?: Record<string, unknown>;
  query?: string;
}

export interface CustomEntryListResult {
  items: CustomEntrySnapshot[];
  total: number;
  limit: number;
  offset: number;
}
