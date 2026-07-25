import {
  asCustomContentId,
  asCustomEntryApprovalId,
  asCustomEntryId,
  asCustomEntryRevisionId,
  asCustomFieldId,
  asCustomTableId,
  assertDomain,
  DomainError,
  newId,
  sha256,
  stableStringify,
  systemClock,
  type ActorContext,
  type Clock,
  type ContentNodeId,
  type CustomContentId,
  type CustomEntryApprovalId,
  type CustomEntryId,
  type CustomEntryRevisionId,
  type CustomFieldId,
  type CustomTableId,
  type SiteId,
  type WorkspaceId,
} from "@baser-edge/core-types";
import { Capabilities } from "@baser-edge/authorization";
import { normalizeSlug } from "@baser-edge/baser-domain";
import { CmsService, type ContentSnapshot } from "@baser-edge/content-kernel";
import { createEmptyDocument, type StructuredDocument } from "@baser-edge/structured-document";
import type {
  CustomContentDefinition,
  CustomEntry,
  CustomEntryApproval,
  CustomEntryListOptions,
  CustomEntryListResult,
  CustomEntryRevision,
  CustomEntrySnapshot,
  CustomFieldDefinition,
  CustomFieldType,
  CustomTableDefinition,
  CustomTableField,
  CustomTableSchema,
  SelectOption,
} from "./entities.js";
import type { CustomContentStore } from "./store.js";

export class CustomContentService {
  readonly #store: CustomContentStore;
  readonly #cms: CmsService;
  readonly #clock: Clock;

  constructor(store: CustomContentStore, cms: CmsService, options: { clock?: Clock } = {}) {
    this.#store = store;
    this.#cms = cms;
    this.#clock = options.clock ?? systemClock;
  }
  get store(): CustomContentStore { return this.#store; }

  async createField(actor: ActorContext, input: {
    workspaceId: WorkspaceId; key: string; name: string; type: CustomFieldType; description?: string; options?: SelectOption[];
  }): Promise<CustomFieldDefinition> {
    await this.#cms.authorizeOperation(actor, Capabilities.CustomFieldManage, { workspaceId: input.workspaceId, contentType: "custom-content", risk: "medium" }, "custom-field.create", "workspace", input.workspaceId);
    const now = this.#clock.now();
    const field: CustomFieldDefinition = {
      id: asCustomFieldId(newId("customField")), workspaceId: input.workspaceId, key: normalizeKey(input.key), name: input.name.trim(), type: input.type,
      description: input.description?.trim() ?? "", options: normalizeOptions(input.options ?? [], input.type), state: "active", createdAt: now, updatedAt: now,
    };
    assertDomain(field.name.length > 0, "CUSTOM_FIELD_NAME_REQUIRED", "Field name is required", 422);
    await this.#store.createField(field);
    await this.#audit(actor, input.workspaceId, null, "custom-field.create", "custom-field", field.id, Capabilities.CustomFieldManage, { key: field.key, type: field.type });
    return field;
  }

  async createTable(actor: ActorContext, input: {
    workspaceId: WorkspaceId; key: string; name: string; kind: "content" | "master"; hierarchical?: boolean; displayFieldKey?: string | null;
  }): Promise<CustomTableDefinition> {
    await this.#cms.authorizeOperation(actor, Capabilities.CustomTableManage, { workspaceId: input.workspaceId, contentType: "custom-content", risk: "high" }, "custom-table.create", "workspace", input.workspaceId);
    const now=this.#clock.now();
    const table: CustomTableDefinition = {
      id: asCustomTableId(newId("customTable")), workspaceId: input.workspaceId, key: normalizeKey(input.key), name: input.name.trim(), kind: input.kind,
      hierarchical: input.kind === "master" ? Boolean(input.hierarchical) : false, displayFieldKey: input.displayFieldKey ? normalizeKey(input.displayFieldKey) : null,
      schemaVersion: 1, state: "active", createdAt: now, updatedAt: now,
    };
    assertDomain(table.name.length > 0, "CUSTOM_TABLE_NAME_REQUIRED", "Table name is required", 422);
    await this.#store.createTable(table);
    await this.#audit(actor, input.workspaceId, null, "custom-table.create", "custom-table", table.id, Capabilities.CustomTableManage, { key: table.key, kind: table.kind });
    return table;
  }

  async attachField(actor: ActorContext, input: {
    tableId: CustomTableId; fieldId: CustomFieldId; required?: boolean; searchable?: boolean; unique?: boolean; sortOrder?: number; labelOverride?: string | null;
  }): Promise<CustomTableSchema> {
    const table=await this.#requireTable(input.tableId); const field=await this.#requireField(input.fieldId);
    assertDomain(table.workspaceId===field.workspaceId, "CUSTOM_FIELD_WORKSPACE_MISMATCH", "Field belongs to another workspace",422);
    await this.#cms.authorizeOperation(actor, Capabilities.CustomTableManage, { workspaceId: table.workspaceId, contentType: "custom-content", risk: "high" }, "custom-table.attach-field", "custom-table", table.id);
    const relation: CustomTableField={ tableId:table.id, fieldId:field.id, required:Boolean(input.required), searchable:Boolean(input.searchable), unique:Boolean(input.unique), sortOrder:input.sortOrder??(await this.#store.listTableFields(table.id)).length*10, labelOverride:input.labelOverride?.trim()||null, createdAt:this.#clock.now() };
    await this.#store.attachField(relation);
    table.schemaVersion+=1; table.updatedAt=this.#clock.now();
    if (!table.displayFieldKey) table.displayFieldKey=field.key;
    await this.#store.updateTable(table);
    await this.#audit(actor, table.workspaceId, null, "custom-table.attach-field", "custom-table", table.id, Capabilities.CustomTableManage, { fieldId:field.id, schemaVersion:table.schemaVersion });
    return this.getTableSchema(table.id);
  }

  async getTableSchema(tableId: CustomTableId): Promise<CustomTableSchema> {
    const table=await this.#requireTable(tableId); const relations=await this.#store.listTableFields(table.id);
    const fields=[];
    for(const relation of relations){ const definition=await this.#requireField(relation.fieldId); fields.push({definition,relation}); }
    return {table,fields};
  }

  async createCustomContent(actor: ActorContext, input: {
    siteId: SiteId; parentId: ContentNodeId | null; slug: string; title: string; tableId: CustomTableId; document?: StructuredDocument;
    listCount?: number; listOrderFieldKey?: string; listDirection?: "asc"|"desc"; templateKey?: string;
  }): Promise<{ definition: CustomContentDefinition; snapshot: ContentSnapshot }> {
    const table=await this.#requireTable(input.tableId);
    assertDomain(table.kind==="content", "CONTENT_TABLE_REQUIRED", "Only content tables can be bound to Custom Content",422);
    const schema=await this.getTableSchema(table.id);
    assertDomain(schema.fields.length>0,"CUSTOM_TABLE_EMPTY","Attach at least one field before creating Custom Content",422);
    const site=await this.#cms.store.getSite(input.siteId);
    assertDomain(site,"SITE_NOT_FOUND","Site not found",404);
    assertDomain(site.workspaceId===table.workspaceId,"CUSTOM_TABLE_WORKSPACE_MISMATCH","Table belongs to another workspace",422);
    const snapshot=await this.#cms.createCustomContent(actor,{siteId:input.siteId,parentId:input.parentId,slug:input.slug,title:input.title,document:input.document??createEmptyDocument()});
    const orderKey=input.listOrderFieldKey?normalizeKey(input.listOrderFieldKey):table.displayFieldKey??schema.fields[0]!.definition.key;
    assertDomain(schema.fields.some((item)=>item.definition.key===orderKey),"CUSTOM_LIST_ORDER_FIELD_INVALID","List order field is not in the table",422);
    const now=this.#clock.now();
    const definition:CustomContentDefinition={id:asCustomContentId(newId("customContent")),workspaceId:snapshot.item.workspaceId,siteId:snapshot.item.siteId,contentItemId:snapshot.item.id,tableId:table.id,listCount:clamp(input.listCount??10,1,100),listOrderFieldKey:orderKey,listDirection:input.listDirection??"asc",templateKey:normalizeTemplate(input.templateKey??"default"),state:"active",createdAt:now,updatedAt:now};
    await this.#store.createCustomContent(definition);
    await this.#audit(actor,definition.workspaceId,definition.siteId,"custom-content.configure","custom-content",definition.id,Capabilities.CustomContentCreate,{contentItemId:definition.contentItemId,tableId:definition.tableId});
    return {definition,snapshot};
  }

  async createEntry(actor:ActorContext,input:{customContentId:CustomContentId;slug?:string|null;parentEntryId?:CustomEntryId|null;values:Record<string,unknown>}):Promise<CustomEntrySnapshot>{
    const content=await this.#requireContent(input.customContentId); const table=await this.#requireTable(content.tableId);
    await this.#cms.authorizeOperation(actor,Capabilities.CustomEntryCreate,{workspaceId:content.workspaceId,siteId:content.siteId,contentType:"custom-entry",risk:"low"},"custom-entry.create","custom-content",content.id);
    const schema=await this.getTableSchema(table.id); const values=await this.#validateValues(schema,input.values,null,content.id);
    const parentEntryId=input.parentEntryId??null;
    if(parentEntryId){assertDomain(table.kind==="master"&&table.hierarchical,"CUSTOM_ENTRY_HIERARCHY_NOT_ALLOWED","Only hierarchical master tables allow parent entries",422);const parent=await this.#store.getEntry(parentEntryId);assertDomain(parent?.entry.tableId===table.id,"CUSTOM_ENTRY_PARENT_INVALID","Parent entry is invalid",422);}
    const slug=normalizeEntrySlug(input.slug??null); const now=this.#clock.now(); const entryId=asCustomEntryId(newId("customEntry")); const revisionId=asCustomEntryRevisionId(newId("customEntryRevision"));
    const hash=await sha256(stableStringify({schemaVersion:table.schemaVersion,values}));
    const revision:CustomEntryRevision={id:revisionId,entryId,revisionNumber:1,basedOnRevisionId:null,schemaVersion:table.schemaVersion,values,contentHash:hash,createdBy:actor.actorId,changeSummary:"Initial custom entry",createdAt:now};
    const entry:CustomEntry={id:entryId,customContentId:content.id,tableId:table.id,slug,parentEntryId,workingRevisionId:revision.id,publishedRevisionId:null,lockVersion:0,state:"active",createdBy:actor.onBehalfOf??actor.actorId,createdAt:now,updatedAt:now};
    const snapshot=await this.#store.createEntry(entry,revision);
    await this.#audit(actor,content.workspaceId,content.siteId,"custom-entry.create","custom-entry",entry.id,Capabilities.CustomEntryCreate,{customContentId:content.id,revisionId:revision.id});
    return snapshot;
  }

  async reviseEntry(actor:ActorContext,input:{entryId:CustomEntryId;baseRevisionId:CustomEntryRevisionId;expectedLockVersion:number;values:Record<string,unknown>;changeSummary:string}):Promise<CustomEntryRevision>{
    const snapshot=await this.#requireEntry(input.entryId); const content=await this.#requireContent(snapshot.entry.customContentId); const schema=await this.getTableSchema(snapshot.entry.tableId);
    await this.#cms.authorizeOperation(actor,Capabilities.CustomEntryRevise,{workspaceId:content.workspaceId,siteId:content.siteId,contentType:"custom-entry",risk:"low"},"custom-entry.revise","custom-entry",snapshot.entry.id);
    const values=await this.#validateValues(schema,input.values,snapshot.entry.id,content.id); const now=this.#clock.now(); const hash=await sha256(stableStringify({schemaVersion:schema.table.schemaVersion,values}));
    const revision:CustomEntryRevision={id:asCustomEntryRevisionId(newId("customEntryRevision")),entryId:snapshot.entry.id,revisionNumber:snapshot.workingRevision.revisionNumber+1,basedOnRevisionId:input.baseRevisionId,schemaVersion:schema.table.schemaVersion,values,contentHash:hash,createdBy:actor.actorId,changeSummary:input.changeSummary.trim()||"Custom entry revision",createdAt:now};
    const saved=await this.#store.commitEntryRevision({entryId:snapshot.entry.id,baseRevisionId:input.baseRevisionId,expectedLockVersion:input.expectedLockVersion,revision});
    await this.#audit(actor,content.workspaceId,content.siteId,"custom-entry.revise","custom-entry",snapshot.entry.id,Capabilities.CustomEntryRevise,{revisionId:saved.id,schemaVersion:saved.schemaVersion});
    return saved;
  }

  async requestApproval(actor:ActorContext,input:{entryId:CustomEntryId;revisionId:CustomEntryRevisionId}):Promise<CustomEntryApproval>{
    const snapshot=await this.#requireEntry(input.entryId); const content=await this.#requireContent(snapshot.entry.customContentId);
    await this.#cms.authorizeOperation(actor,Capabilities.CustomEntryRequestPublish,{workspaceId:content.workspaceId,siteId:content.siteId,contentType:"custom-entry",risk:"medium"},"custom-entry.request-publish","custom-entry",snapshot.entry.id);
    assertDomain(snapshot.workingRevision.id===input.revisionId,"CUSTOM_ENTRY_REVISION_NOT_CURRENT","Approval must target the current working revision",409);
    const now=this.#clock.now(); const approval:CustomEntryApproval={id:asCustomEntryApprovalId(newId("customEntryApproval")),entryId:snapshot.entry.id,revisionId:snapshot.workingRevision.id,revisionHash:snapshot.workingRevision.contentHash,state:"pending",requestedBy:actor.actorId,requestedAt:now,decidedBy:null,decidedAt:null,decisionComment:""};
    await this.#store.createApproval(approval); await this.#audit(actor,content.workspaceId,content.siteId,"custom-entry.request-publish","custom-entry",snapshot.entry.id,Capabilities.CustomEntryRequestPublish,{approvalId:approval.id,revisionId:approval.revisionId}); return approval;
  }

  async listPendingApprovals(actor: ActorContext, siteId: SiteId): Promise<import("./entities.js").CustomEntryApprovalInboxItem[]> {
    const definitions = await this.#store.listCustomContents(siteId);
    if (!definitions.length) return [];
    const first = definitions[0]!;
    await this.#cms.authorizeOperation(actor, Capabilities.CustomEntryApprove, { workspaceId: first.workspaceId, siteId: first.siteId, contentType: "custom-entry", risk: "medium" }, "custom-entry.approvals.list", "site", siteId);
    const pending = await this.#store.listPendingApprovalsBySite(siteId);
    const items: import("./entities.js").CustomEntryApprovalInboxItem[] = [];
    for (const approval of pending) {
      const snapshot = await this.#store.getEntry(approval.entryId);
      if (!snapshot) continue;
      items.push({
        approval,
        customContentId: snapshot.entry.customContentId,
        entrySlug: snapshot.entry.slug,
      });
    }
    return items;
  }

  async decideApproval(actor:ActorContext,input:{approvalId:CustomEntryApprovalId;decision:"approved"|"rejected";comment?:string}):Promise<CustomEntryApproval>{
    const approval=await this.#requireApproval(input.approvalId); const snapshot=await this.#requireEntry(approval.entryId); const content=await this.#requireContent(snapshot.entry.customContentId);
    await this.#cms.authorizeOperation(actor,Capabilities.CustomEntryApprove,{workspaceId:content.workspaceId,siteId:content.siteId,contentType:"custom-entry",risk:"high"},"custom-entry.approve","custom-entry",snapshot.entry.id);
    assertDomain(approval.state==="pending","CUSTOM_ENTRY_APPROVAL_DECIDED","Approval has already been decided",409);
    approval.state=input.decision; approval.decidedBy=actor.actorId; approval.decidedAt=this.#clock.now(); approval.decisionComment=input.comment?.trim()??""; await this.#store.updateApproval(approval);
    await this.#audit(actor,content.workspaceId,content.siteId,"custom-entry.approve","custom-entry",snapshot.entry.id,Capabilities.CustomEntryApprove,{approvalId:approval.id,decision:approval.state}); return approval;
  }

  async publishEntry(actor:ActorContext,input:{entryId:CustomEntryId;revisionId:CustomEntryRevisionId;approvalId:CustomEntryApprovalId}):Promise<CustomEntrySnapshot>{
    const snapshot=await this.#requireEntry(input.entryId); const content=await this.#requireContent(snapshot.entry.customContentId);
    await this.#cms.authorizeOperation(actor,Capabilities.CustomEntryPublish,{workspaceId:content.workspaceId,siteId:content.siteId,contentType:"custom-entry",risk:"high"},"custom-entry.publish","custom-entry",snapshot.entry.id);
    const published=await this.#store.publishEntry({...input,now:this.#clock.now()}); await this.#audit(actor,content.workspaceId,content.siteId,"custom-entry.publish","custom-entry",snapshot.entry.id,Capabilities.CustomEntryPublish,{revisionId:input.revisionId,approvalId:input.approvalId}); return published;
  }

  async unpublishEntry(actor:ActorContext,input:{entryId:CustomEntryId}):Promise<CustomEntrySnapshot>{
    const snapshot=await this.#requireEntry(input.entryId); const content=await this.#requireContent(snapshot.entry.customContentId);
    await this.#cms.authorizeOperation(actor,Capabilities.CustomEntryUnpublish,{workspaceId:content.workspaceId,siteId:content.siteId,contentType:"custom-entry",risk:"high"},"custom-entry.unpublish","custom-entry",snapshot.entry.id);
    const previousRevisionId=snapshot.entry.publishedRevisionId;
    if(!previousRevisionId)throw new DomainError("CUSTOM_ENTRY_NOT_PUBLISHED","Custom entry is not published",409);
    const unpublished=await this.#store.unpublishEntry({entryId:input.entryId,now:this.#clock.now()});
    await this.#audit(actor,content.workspaceId,content.siteId,"custom-entry.unpublish","custom-entry",snapshot.entry.id,Capabilities.CustomEntryUnpublish,{previousRevisionId});
    return unpublished;
  }

  async listPublished(customContentId:CustomContentId,options:CustomEntryListOptions={}):Promise<CustomEntryListResult>{
    const content=await this.#requireContent(customContentId); const schema=await this.getTableSchema(content.tableId); const rows=(await this.#store.listEntries(content.id)).filter((item)=>item.entry.state==="active"&&item.publishedRevision);
    const filtered=rows.filter((item)=>matches(item.publishedRevision!.values,schema,options));
    filtered.sort((a,b)=>compareValues(a.publishedRevision!.values[content.listOrderFieldKey],b.publishedRevision!.values[content.listOrderFieldKey],content.listDirection));
    const limit=clamp(options.limit??content.listCount,1,100); const offset=Math.max(0,options.offset??0); return {items:filtered.slice(offset,offset+limit),total:filtered.length,limit,offset};
  }

  async getPublishedByKey(customContentId:CustomContentId,key:string):Promise<CustomEntrySnapshot|null>{const entry=await this.#store.getEntryByPublicKey(customContentId,key);return entry?.entry.state==="active"&&entry.publishedRevision?entry:null;}
  async getCustomContentByContentItem(contentItemId:import("@baser-edge/core-types").ContentItemId){return this.#store.getCustomContentByContentItem(contentItemId);}
  async listCustomContents(siteId:SiteId){return this.#store.listCustomContents(siteId);}
  async getEntry(actor:ActorContext,entryId:CustomEntryId){const snapshot=await this.#requireEntry(entryId);const content=await this.#requireContent(snapshot.entry.customContentId);await this.#cms.authorizeOperation(actor,Capabilities.CustomEntryRead,{workspaceId:content.workspaceId,siteId:content.siteId,contentType:"custom-entry",risk:"low"},"custom-entry.read","custom-entry",entryId);return snapshot;}
  async listEntries(actor:ActorContext,customContentId:CustomContentId){const content=await this.#requireContent(customContentId);await this.#cms.authorizeOperation(actor,Capabilities.CustomEntryRead,{workspaceId:content.workspaceId,siteId:content.siteId,contentType:"custom-entry",risk:"low"},"custom-entry.list","custom-content",customContentId);return this.#store.listEntries(customContentId);}
  async listFields(workspaceId:WorkspaceId){return this.#store.listFields(workspaceId);} async listTables(workspaceId:WorkspaceId){return this.#store.listTables(workspaceId);}

  async validatePublicValues(tableId: CustomTableId, input: Record<string, unknown>): Promise<Record<string, unknown>> {
    const schema = await this.getTableSchema(tableId);
    const allowed = new Set(schema.fields.map((item) => item.definition.key));
    for (const key of Object.keys(input)) assertDomain(allowed.has(key), "CUSTOM_ENTRY_UNKNOWN_FIELD", `Unknown custom field: ${key}`, 422);
    const result: Record<string, unknown> = {};
    for (const { definition, relation } of schema.fields) {
      const raw = input[definition.key];
      if (raw === undefined || raw === null || raw === "") {
        assertDomain(!relation.required, "CUSTOM_ENTRY_REQUIRED_FIELD", `${relation.labelOverride ?? definition.name} is required`, 422);
        result[definition.key] = null;
        continue;
      }
      result[definition.key] = validateCustomFieldValue(definition, raw);
    }
    return result;
  }

  async #validateValues(schema:CustomTableSchema,input:Record<string,unknown>,currentEntryId:CustomEntryId|null,customContentId:CustomContentId):Promise<Record<string,unknown>>{
    const allowed=new Set(schema.fields.map((item)=>item.definition.key)); for(const key of Object.keys(input))assertDomain(allowed.has(key),"CUSTOM_ENTRY_UNKNOWN_FIELD",`Unknown custom field: ${key}`,422);
    const result:Record<string,unknown>={};
    for(const {definition,relation} of schema.fields){const raw=input[definition.key]; if(raw===undefined||raw===null||raw===""){assertDomain(!relation.required,"CUSTOM_ENTRY_REQUIRED_FIELD",`${relation.labelOverride??definition.name} is required`,422);result[definition.key]=null;continue;} result[definition.key]=validateCustomFieldValue(definition,raw);}
    const existing=await this.#store.listEntries(customContentId);
    for(const {definition,relation} of schema.fields){if(!relation.unique||result[definition.key]===null)continue;assertDomain(!existing.some((item)=>item.entry.id!==currentEntryId&&item.entry.state==="active"&&stableStringify(item.workingRevision.values[definition.key])===stableStringify(result[definition.key])),"CUSTOM_ENTRY_UNIQUE_FIELD",`${relation.labelOverride??definition.name} must be unique`,409);}
    return result;
  }


  async #requireField(id:CustomFieldId){const value=await this.#store.getField(id);assertDomain(value&&value.state==="active","CUSTOM_FIELD_NOT_FOUND","Custom field not found",404);return value;}
  async #requireTable(id:CustomTableId){const value=await this.#store.getTable(id);assertDomain(value&&value.state==="active","CUSTOM_TABLE_NOT_FOUND","Custom table not found",404);return value;}
  async #requireContent(id:CustomContentId){const value=await this.#store.getCustomContent(id);assertDomain(value&&value.state==="active","CUSTOM_CONTENT_NOT_FOUND","Custom content not found",404);return value;}
  async #requireEntry(id:CustomEntryId){const value=await this.#store.getEntry(id);assertDomain(value,"CUSTOM_ENTRY_NOT_FOUND","Custom entry not found",404);return value;}
  async #requireApproval(id:CustomEntryApprovalId){const value=await this.#store.getApproval(id);assertDomain(value,"CUSTOM_ENTRY_APPROVAL_NOT_FOUND","Custom entry approval not found",404);return value;}
  async #audit(actor:ActorContext,workspaceId:WorkspaceId,siteId:SiteId|null,action:string,resourceType:string,resourceId:string,capability:string,details:Record<string,unknown>){await this.#cms.recordSuccessfulOperation(actor,{workspaceId,siteId,action,resourceType,resourceId,revisionId:null,capability,details});}
}

export function validateCustomFieldValue(field:CustomFieldDefinition,value:unknown):unknown{
  switch(field.type){
    case "text":case "textarea":case "tel": assertDomain(typeof value==="string","CUSTOM_FIELD_TYPE",`${field.name} must be text`,422); return value.trim();
    case "email": assertDomain(typeof value==="string"&&/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value),"CUSTOM_FIELD_EMAIL",`${field.name} must be an email address`,422); return value.toLowerCase();
    case "integer": {const n=typeof value==="number"?value:Number(value);assertDomain(Number.isSafeInteger(n),"CUSTOM_FIELD_INTEGER",`${field.name} must be an integer`,422);return n;}
    case "decimal": {const n=typeof value==="number"?value:Number(value);assertDomain(Number.isFinite(n),"CUSTOM_FIELD_DECIMAL",`${field.name} must be a number`,422);return n;}
    case "boolean": assertDomain(typeof value==="boolean","CUSTOM_FIELD_BOOLEAN",`${field.name} must be boolean`,422);return value;
    case "date": assertDomain(typeof value==="string"&&/^\d{4}-\d{2}-\d{2}$/.test(value)&&!Number.isNaN(Date.parse(`${value}T00:00:00Z`)),"CUSTOM_FIELD_DATE",`${field.name} must be YYYY-MM-DD`,422);return value;
    case "datetime": assertDomain(typeof value==="string"&&!Number.isNaN(Date.parse(value)),"CUSTOM_FIELD_DATETIME",`${field.name} must be an ISO datetime`,422);return new Date(value).toISOString();
    case "select": assertDomain(typeof value==="string"&&field.options.some((item)=>item.value===value),"CUSTOM_FIELD_OPTION",`${field.name} has an invalid option`,422);return value;
    case "multiselect": assertDomain(Array.isArray(value)&&value.every((item)=>typeof item==="string"&&field.options.some((option)=>option.value===item)),"CUSTOM_FIELD_OPTION",`${field.name} has invalid options`,422);return [...new Set(value)];
    case "asset": assertDomain(typeof value==="string"&&value.startsWith("ast_"),"CUSTOM_FIELD_ASSET",`${field.name} must contain an Asset ID`,422);return value;
    case "richtext": assertDomain(value&&typeof value==="object"&&!Array.isArray(value)&&"formatVersion" in value,"CUSTOM_FIELD_RICHTEXT",`${field.name} must contain a structured document`,422);return structuredClone(value);
  }
}
function matches(values:Record<string,unknown>,schema:CustomTableSchema,options:CustomEntryListOptions):boolean{for(const [key,expected] of Object.entries(options.filters??{})){if(!schema.fields.some((item)=>item.definition.key===key))return false;const actual=values[key];if(Array.isArray(actual)){if(!actual.includes(expected))return false;}else if(stableStringify(actual)!==stableStringify(expected))return false;}if(options.query){const query=options.query.toLocaleLowerCase("ja");const searchable=schema.fields.filter((item)=>item.relation.searchable).map((item)=>values[item.definition.key]).filter((value)=>value!==null&&value!==undefined).map(String).join(" ").toLocaleLowerCase("ja");if(!searchable.includes(query))return false;}return true;}
function compareValues(a:unknown,b:unknown,direction:"asc"|"desc"):number{const factor=direction==="asc"?1:-1;if(a===b)return 0;if(a===null||a===undefined)return 1;if(b===null||b===undefined)return -1;if(typeof a==="number"&&typeof b==="number")return(a-b)*factor;return String(a).localeCompare(String(b),"ja")*factor;}
function normalizeKey(value:string):string{const key=value.trim().toLowerCase().replace(/[^a-z0-9_]+/g,"_").replace(/^_+|_+$/g,"");assertDomain(/^[a-z][a-z0-9_]{0,62}$/.test(key),"CUSTOM_KEY_INVALID","Keys must start with a letter and contain lowercase ASCII letters, digits, and underscores",422);return key;}
function normalizeEntrySlug(value:string|null):string|null{if(value===null||value.trim()==="")return null;const slug=normalizeSlug(value);assertDomain(!/^\d+$/.test(slug),"CUSTOM_ENTRY_NUMERIC_SLUG","Numeric-only slugs are not allowed",422);return slug;}
function normalizeOptions(options:SelectOption[],type:CustomFieldType):SelectOption[]{if(type!=="select"&&type!=="multiselect")return[];assertDomain(options.length>0,"CUSTOM_FIELD_OPTIONS_REQUIRED","Select fields require options",422);const seen=new Set<string>();return options.map((item)=>{const value=item.value.trim();const label=item.label.trim();assertDomain(value.length>0&&label.length>0&&!seen.has(value),"CUSTOM_FIELD_OPTIONS_INVALID","Options must have unique non-empty values",422);seen.add(value);return{value,label};});}
function normalizeTemplate(value:string):string{const key=value.trim().toLowerCase().replace(/[^a-z0-9_-]+/g,"-");return key||"default";} function clamp(value:number,min:number,max:number){return Math.min(max,Math.max(min,Math.trunc(value)));}
