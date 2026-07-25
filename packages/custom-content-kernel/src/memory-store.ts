import {
  DomainError,
  type CustomContentId,
  type CustomEntryApprovalId,
  type CustomEntryId,
  type CustomEntryRevisionId,
  type CustomFieldId,
  type CustomTableId,
  type ContentItemId,
  type SiteId,
  type WorkspaceId,
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
import type { CustomContentStore } from "./store.js";

export class MemoryCustomContentStore implements CustomContentStore {
  readonly fields = new Map<CustomFieldId, CustomFieldDefinition>();
  readonly tables = new Map<CustomTableId, CustomTableDefinition>();
  readonly tableFields = new Map<string, CustomTableField>();
  readonly contents = new Map<CustomContentId, CustomContentDefinition>();
  readonly contentByItem = new Map<ContentItemId, CustomContentId>();
  readonly entries = new Map<CustomEntryId, CustomEntry>();
  readonly revisions = new Map<CustomEntryRevisionId, CustomEntryRevision>();
  readonly approvals = new Map<CustomEntryApprovalId, CustomEntryApproval>();

  async createField(field: CustomFieldDefinition): Promise<void> {
    if ([...this.fields.values()].some((item) => item.workspaceId === field.workspaceId && item.key === field.key)) throw new DomainError("CUSTOM_FIELD_KEY_EXISTS", "Custom field key already exists", 409);
    this.fields.set(field.id, clone(field));
  }
  async getField(id: CustomFieldId): Promise<CustomFieldDefinition | null> { return maybe(this.fields.get(id)); }
  async listFields(workspaceId: WorkspaceId): Promise<CustomFieldDefinition[]> { return [...this.fields.values()].filter((item) => item.workspaceId === workspaceId).map(clone); }

  async createTable(table: CustomTableDefinition): Promise<void> {
    if ([...this.tables.values()].some((item) => item.workspaceId === table.workspaceId && item.key === table.key)) throw new DomainError("CUSTOM_TABLE_KEY_EXISTS", "Custom table key already exists", 409);
    this.tables.set(table.id, clone(table));
  }
  async getTable(id: CustomTableId): Promise<CustomTableDefinition | null> { return maybe(this.tables.get(id)); }
  async listTables(workspaceId: WorkspaceId): Promise<CustomTableDefinition[]> { return [...this.tables.values()].filter((item) => item.workspaceId === workspaceId).map(clone); }
  async updateTable(table: CustomTableDefinition): Promise<void> { if (!this.tables.has(table.id)) throw new DomainError("CUSTOM_TABLE_NOT_FOUND", "Custom table not found", 404); this.tables.set(table.id, clone(table)); }
  async attachField(relation: CustomTableField): Promise<void> {
    const key = `${relation.tableId}:${relation.fieldId}`;
    if (this.tableFields.has(key)) throw new DomainError("CUSTOM_TABLE_FIELD_EXISTS", "Field is already attached", 409);
    this.tableFields.set(key, clone(relation));
  }
  async listTableFields(tableId: CustomTableId): Promise<CustomTableField[]> { return [...this.tableFields.values()].filter((item) => item.tableId === tableId).sort((a,b)=>a.sortOrder-b.sortOrder).map(clone); }

  async createCustomContent(definition: CustomContentDefinition): Promise<void> {
    if (this.contentByItem.has(definition.contentItemId)) throw new DomainError("CUSTOM_CONTENT_EXISTS", "Custom content definition already exists", 409);
    this.contents.set(definition.id, clone(definition));
    this.contentByItem.set(definition.contentItemId, definition.id);
  }
  async getCustomContent(id: CustomContentId): Promise<CustomContentDefinition | null> { return maybe(this.contents.get(id)); }
  async getCustomContentByContentItem(contentItemId: ContentItemId): Promise<CustomContentDefinition | null> { const id=this.contentByItem.get(contentItemId); return id ? this.getCustomContent(id) : null; }
  async listCustomContents(siteId: SiteId): Promise<CustomContentDefinition[]> { return [...this.contents.values()].filter((item) => item.siteId === siteId).map(clone); }

  async createEntry(entry: CustomEntry, revision: CustomEntryRevision): Promise<CustomEntrySnapshot> {
    if (entry.slug && [...this.entries.values()].some((item) => item.customContentId === entry.customContentId && item.slug === entry.slug)) throw new DomainError("CUSTOM_ENTRY_SLUG_EXISTS", "Entry slug already exists", 409);
    this.entries.set(entry.id, clone(entry)); this.revisions.set(revision.id, clone(revision)); return this.getEntry(entry.id) as Promise<CustomEntrySnapshot>;
  }
  async getEntry(id: CustomEntryId): Promise<CustomEntrySnapshot | null> {
    const entry=this.entries.get(id); if(!entry)return null;
    const working=this.revisions.get(entry.workingRevisionId); if(!working)throw new DomainError("CUSTOM_ENTRY_REVISION_MISSING", "Working revision missing", 500);
    return { entry: clone(entry), workingRevision: clone(working), publishedRevision: entry.publishedRevisionId ? clone(this.revisions.get(entry.publishedRevisionId) ?? null) : null };
  }
  async getEntryByPublicKey(customContentId: CustomContentId, key: string): Promise<CustomEntrySnapshot | null> {
    const entry=[...this.entries.values()].find((item)=>item.customContentId===customContentId && (item.slug===key || item.id===key)); return entry ? this.getEntry(entry.id) : null;
  }
  async listEntries(customContentId: CustomContentId): Promise<CustomEntrySnapshot[]> { const result=[]; for(const entry of this.entries.values()) if(entry.customContentId===customContentId) result.push((await this.getEntry(entry.id))!); return result; }
  async commitEntryRevision(input: { entryId: CustomEntryId; baseRevisionId: CustomEntryRevisionId; expectedLockVersion: number; revision: CustomEntryRevision }): Promise<CustomEntryRevision> {
    const entry=this.entries.get(input.entryId); if(!entry)throw new DomainError("CUSTOM_ENTRY_NOT_FOUND", "Custom entry not found", 404);
    if(entry.workingRevisionId!==input.baseRevisionId || entry.lockVersion!==input.expectedLockVersion) throw new DomainError("CUSTOM_ENTRY_REVISION_CONFLICT", "Custom entry changed since it was read", 409);
    this.revisions.set(input.revision.id, clone(input.revision));
    entry.workingRevisionId=input.revision.id; entry.lockVersion+=1; entry.updatedAt=input.revision.createdAt;
    return clone(input.revision);
  }
  async createApproval(approval: CustomEntryApproval): Promise<void> { this.approvals.set(approval.id, clone(approval)); }
  async getApproval(id: CustomEntryApprovalId): Promise<CustomEntryApproval | null> { return maybe(this.approvals.get(id)); }
  async listPendingApprovalsBySite(siteId: SiteId): Promise<CustomEntryApproval[]> {
    const result: CustomEntryApproval[] = [];
    for (const approval of this.approvals.values()) {
      if (approval.state !== "pending") continue;
      const entry = this.entries.get(approval.entryId);
      if (!entry) continue;
      const definition = this.contents.get(entry.customContentId);
      if (definition?.siteId === siteId) result.push(clone(approval));
    }
    return result.sort((a, b) => b.requestedAt - a.requestedAt);
  }
  async updateApproval(approval: CustomEntryApproval): Promise<void> { if(!this.approvals.has(approval.id))throw new DomainError("CUSTOM_ENTRY_APPROVAL_NOT_FOUND", "Approval not found",404); this.approvals.set(approval.id, clone(approval)); }
  async publishEntry(input: { entryId: CustomEntryId; revisionId: CustomEntryRevisionId; approvalId: CustomEntryApprovalId; now: number }): Promise<CustomEntrySnapshot> {
    const entry=this.entries.get(input.entryId); const approval=this.approvals.get(input.approvalId); const revision=this.revisions.get(input.revisionId);
    if(!entry||!revision)throw new DomainError("CUSTOM_ENTRY_NOT_FOUND", "Custom entry or revision not found",404);
    if(!approval||approval.state!=="approved"||approval.entryId!==entry.id||approval.revisionId!==revision.id||approval.revisionHash!==revision.contentHash)throw new DomainError("CUSTOM_ENTRY_APPROVAL_REQUIRED", "Matching approved revision is required",409);
    entry.publishedRevisionId=revision.id; entry.updatedAt=input.now; return this.getEntry(entry.id) as Promise<CustomEntrySnapshot>;
  }
  async unpublishEntry(input: { entryId: CustomEntryId; now: number }): Promise<CustomEntrySnapshot> {
    const entry = this.entries.get(input.entryId);
    if (!entry) throw new DomainError("CUSTOM_ENTRY_NOT_FOUND", "Custom entry not found", 404);
    if (entry.state !== "active") throw new DomainError("CUSTOM_ENTRY_TRASHED", "Trashed custom entry cannot be unpublished", 409);
    if (!entry.publishedRevisionId) throw new DomainError("CUSTOM_ENTRY_NOT_PUBLISHED", "Custom entry is not published", 409);
    entry.publishedRevisionId = null;
    entry.updatedAt = input.now;
    return this.getEntry(entry.id) as Promise<CustomEntrySnapshot>;
  }
}
function clone<T>(value:T):T{return structuredClone(value);} function maybe<T>(value:T|undefined):T|null{return value===undefined?null:clone(value);}
