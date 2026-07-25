import {
  asCustomContentId,
  asCustomEntryApprovalId,
  asCustomEntryId,
  asCustomEntryRevisionId,
  asCustomFieldId,
  asCustomTableId,
  asContentItemId,
  asPrincipalId,
  asSiteId,
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
  CustomContentStore,
  CustomEntry,
  CustomEntryApproval,
  CustomEntryRevision,
  CustomEntrySnapshot,
  CustomFieldDefinition,
  CustomTableDefinition,
  CustomTableField,
} from "@baser-edge/custom-content-kernel";
import type { D1DatabaseLike, D1PreparedStatementLike } from "./index.js";

export class D1CustomContentStore implements CustomContentStore {
  readonly #db: D1DatabaseLike;
  constructor(db: D1DatabaseLike){this.#db=db;}

  async createField(field:CustomFieldDefinition):Promise<void>{
    try{await this.#db.prepare("INSERT INTO custom_fields(id,workspace_id,field_key,name,field_type,description,options_json,state,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?,?,?)").bind(field.id,field.workspaceId,field.key,field.name,field.type,field.description,JSON.stringify(field.options),field.state,field.createdAt,field.updatedAt).run();}
    catch(error){throw translate(error);}
  }
  async getField(id:CustomFieldId):Promise<CustomFieldDefinition|null>{const row=await this.#db.prepare("SELECT * FROM custom_fields WHERE id=?").bind(id).first<CustomFieldRow>();return row?mapField(row):null;}
  async listFields(workspaceId:WorkspaceId):Promise<CustomFieldDefinition[]>{return(await this.#db.prepare("SELECT * FROM custom_fields WHERE workspace_id=? ORDER BY created_at,id").bind(workspaceId).all<CustomFieldRow>()).results.map(mapField);}

  async createTable(table:CustomTableDefinition):Promise<void>{
    try{await this.#db.prepare("INSERT INTO custom_tables(id,workspace_id,table_key,name,table_kind,hierarchical,display_field_key,schema_version,state,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?,?,?,?)").bind(table.id,table.workspaceId,table.key,table.name,table.kind,table.hierarchical?1:0,table.displayFieldKey,table.schemaVersion,table.state,table.createdAt,table.updatedAt).run();}
    catch(error){throw translate(error);}
  }
  async getTable(id:CustomTableId):Promise<CustomTableDefinition|null>{const row=await this.#db.prepare("SELECT * FROM custom_tables WHERE id=?").bind(id).first<CustomTableRow>();return row?mapTable(row):null;}
  async listTables(workspaceId:WorkspaceId):Promise<CustomTableDefinition[]>{return(await this.#db.prepare("SELECT * FROM custom_tables WHERE workspace_id=? ORDER BY created_at,id").bind(workspaceId).all<CustomTableRow>()).results.map(mapTable);}
  async updateTable(table:CustomTableDefinition):Promise<void>{await this.#db.prepare("UPDATE custom_tables SET name=?,table_kind=?,hierarchical=?,display_field_key=?,schema_version=?,state=?,updated_at=? WHERE id=?").bind(table.name,table.kind,table.hierarchical?1:0,table.displayFieldKey,table.schemaVersion,table.state,table.updatedAt,table.id).run();}
  async attachField(relation:CustomTableField):Promise<void>{
    try{await this.#db.prepare("INSERT INTO custom_table_fields(table_id,field_id,required,searchable,is_unique,sort_order,label_override,created_at) VALUES(?,?,?,?,?,?,?,?)").bind(relation.tableId,relation.fieldId,relation.required?1:0,relation.searchable?1:0,relation.unique?1:0,relation.sortOrder,relation.labelOverride,relation.createdAt).run();}
    catch(error){throw translate(error);}
  }
  async listTableFields(tableId:CustomTableId):Promise<CustomTableField[]>{return(await this.#db.prepare("SELECT * FROM custom_table_fields WHERE table_id=? ORDER BY sort_order,field_id").bind(tableId).all<CustomTableFieldRow>()).results.map(mapTableField);}

  async createCustomContent(definition:CustomContentDefinition):Promise<void>{
    try{await this.#db.prepare("INSERT INTO custom_contents(id,workspace_id,site_id,content_item_id,table_id,list_count,list_order_field_key,list_direction,template_key,state,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?,?,?,?,?)").bind(definition.id,definition.workspaceId,definition.siteId,definition.contentItemId,definition.tableId,definition.listCount,definition.listOrderFieldKey,definition.listDirection,definition.templateKey,definition.state,definition.createdAt,definition.updatedAt).run();}
    catch(error){throw translate(error);}
  }
  async getCustomContent(id:CustomContentId):Promise<CustomContentDefinition|null>{const row=await this.#db.prepare("SELECT * FROM custom_contents WHERE id=?").bind(id).first<CustomContentRow>();return row?mapContent(row):null;}
  async getCustomContentByContentItem(contentItemId:ContentItemId):Promise<CustomContentDefinition|null>{const row=await this.#db.prepare("SELECT * FROM custom_contents WHERE content_item_id=?").bind(contentItemId).first<CustomContentRow>();return row?mapContent(row):null;}
  async listCustomContents(siteId:SiteId):Promise<CustomContentDefinition[]>{return(await this.#db.prepare("SELECT * FROM custom_contents WHERE site_id=? ORDER BY created_at,id").bind(siteId).all<CustomContentRow>()).results.map(mapContent);}

  async createEntry(entry:CustomEntry,revision:CustomEntryRevision):Promise<CustomEntrySnapshot>{
    const statements:D1PreparedStatementLike[]=[
      this.#db.prepare("INSERT INTO custom_entries(id,custom_content_id,table_id,slug,parent_entry_id,working_revision_id,published_revision_id,lock_version,state,created_by,created_at,updated_at) VALUES(?,?,?,?,?,?,NULL,0,?,?,?,?)").bind(entry.id,entry.customContentId,entry.tableId,entry.slug,entry.parentEntryId,entry.workingRevisionId,entry.state,entry.createdBy,entry.createdAt,entry.updatedAt),
      this.#revisionInsert(revision,0),
      ...(await this.#projectionStatements(entry.tableId,revision)),
    ];
    try{await this.#db.batch(statements);}catch(error){throw translate(error);}
    return (await this.getEntry(entry.id))!;
  }
  async getEntry(id:CustomEntryId):Promise<CustomEntrySnapshot|null>{
    const row=await this.#db.prepare("SELECT * FROM custom_entries WHERE id=?").bind(id).first<CustomEntryRow>(); if(!row)return null;
    const working=await this.#getRevision(asCustomEntryRevisionId(row.working_revision_id)); if(!working)throw new DomainError("CUSTOM_ENTRY_REVISION_MISSING","Working revision missing",500);
    const published=row.published_revision_id?await this.#getRevision(asCustomEntryRevisionId(row.published_revision_id)):null;
    return{entry:mapEntry(row),workingRevision:working,publishedRevision:published};
  }
  async getEntryByPublicKey(customContentId:CustomContentId,key:string):Promise<CustomEntrySnapshot|null>{const row=await this.#db.prepare("SELECT id FROM custom_entries WHERE custom_content_id=? AND (slug=? OR id=?) LIMIT 1").bind(customContentId,key,key).first<{id:string}>();return row?this.getEntry(asCustomEntryId(row.id)):null;}
  async listEntries(customContentId:CustomContentId):Promise<CustomEntrySnapshot[]>{const rows=(await this.#db.prepare("SELECT id FROM custom_entries WHERE custom_content_id=? ORDER BY created_at,id").bind(customContentId).all<{id:string}>()).results;const result:CustomEntrySnapshot[]=[];for(const row of rows){const item=await this.getEntry(asCustomEntryId(row.id));if(item)result.push(item);}return result;}
  async commitEntryRevision(input:{entryId:CustomEntryId;baseRevisionId:CustomEntryRevisionId;expectedLockVersion:number;revision:CustomEntryRevision}):Promise<CustomEntryRevision>{
    const entry=await this.#db.prepare("SELECT table_id FROM custom_entries WHERE id=?").bind(input.entryId).first<{table_id:string}>();if(!entry)throw new DomainError("CUSTOM_ENTRY_NOT_FOUND","Custom entry not found",404);
    const statements=[this.#revisionInsert(input.revision,input.expectedLockVersion),...(await this.#projectionStatements(asCustomTableId(entry.table_id),input.revision)),this.#db.prepare("UPDATE custom_entries SET working_revision_id=?,lock_version=lock_version+1,updated_at=? WHERE id=? AND working_revision_id=? AND lock_version=?").bind(input.revision.id,input.revision.createdAt,input.entryId,input.baseRevisionId,input.expectedLockVersion)];
    try{await this.#db.batch(statements);}catch(error){throw translate(error);}
    const saved=await this.#getRevision(input.revision.id);if(!saved)throw new DomainError("CUSTOM_ENTRY_REVISION_MISSING","Revision was not saved",500);return saved;
  }
  async createApproval(approval:CustomEntryApproval):Promise<void>{await this.#db.prepare("INSERT INTO custom_entry_approvals(id,entry_id,revision_id,revision_hash,state,requested_by,requested_at,decided_by,decided_at,decision_comment) VALUES(?,?,?,?,?,?,?,?,?,?)").bind(approval.id,approval.entryId,approval.revisionId,approval.revisionHash,approval.state,approval.requestedBy,approval.requestedAt,approval.decidedBy,approval.decidedAt,approval.decisionComment).run();}
  async getApproval(id:CustomEntryApprovalId):Promise<CustomEntryApproval|null>{const row=await this.#db.prepare("SELECT * FROM custom_entry_approvals WHERE id=?").bind(id).first<CustomEntryApprovalRow>();return row?mapApproval(row):null;}
  async listPendingApprovalsBySite(siteId:SiteId):Promise<CustomEntryApproval[]>{
    const rows=(await this.#db.prepare("SELECT a.* FROM custom_entry_approvals a INNER JOIN custom_entries e ON e.id=a.entry_id INNER JOIN custom_contents c ON c.id=e.custom_content_id WHERE c.site_id=? AND a.state='pending' ORDER BY a.requested_at DESC").bind(siteId).all<CustomEntryApprovalRow>()).results;
    return rows.map(mapApproval);
  }
  async updateApproval(approval:CustomEntryApproval):Promise<void>{await this.#db.prepare("UPDATE custom_entry_approvals SET state=?,decided_by=?,decided_at=?,decision_comment=? WHERE id=?").bind(approval.state,approval.decidedBy,approval.decidedAt,approval.decisionComment,approval.id).run();}
  async publishEntry(input:{entryId:CustomEntryId;revisionId:CustomEntryRevisionId;approvalId:CustomEntryApprovalId;now:number}):Promise<CustomEntrySnapshot>{
    const approval=await this.getApproval(input.approvalId);if(!approval||approval.entryId!==input.entryId||approval.revisionId!==input.revisionId||approval.state!=="approved")throw new DomainError("CUSTOM_ENTRY_APPROVAL_REQUIRED","Matching approved revision is required",409);
    try{await this.#db.prepare("UPDATE custom_entries SET published_revision_id=?,updated_at=? WHERE id=?").bind(input.revisionId,input.now,input.entryId).run();}catch(error){throw translate(error);}
    const snapshot=await this.getEntry(input.entryId);if(!snapshot)throw new DomainError("CUSTOM_ENTRY_NOT_FOUND","Custom entry not found",404);return snapshot;
  }
  async unpublishEntry(input:{entryId:CustomEntryId;now:number}):Promise<CustomEntrySnapshot>{
    const snapshot=await this.getEntry(input.entryId);if(!snapshot)throw new DomainError("CUSTOM_ENTRY_NOT_FOUND","Custom entry not found",404);
    if(snapshot.entry.state!=="active")throw new DomainError("CUSTOM_ENTRY_TRASHED","Trashed custom entry cannot be unpublished",409);
    if(!snapshot.entry.publishedRevisionId)throw new DomainError("CUSTOM_ENTRY_NOT_PUBLISHED","Custom entry is not published",409);
    try{await this.#db.prepare("UPDATE custom_entries SET published_revision_id=NULL,updated_at=? WHERE id=?").bind(input.now,input.entryId).run();}catch(error){throw translate(error);}
    const next=await this.getEntry(input.entryId);if(!next)throw new DomainError("CUSTOM_ENTRY_NOT_FOUND","Custom entry not found",404);return next;
  }

  #revisionInsert(revision:CustomEntryRevision,expectedLockVersion:number):D1PreparedStatementLike{return this.#db.prepare("INSERT INTO custom_entry_revisions(id,entry_id,revision_number,based_on_revision_id,schema_version,expected_lock_version,values_json,content_hash,created_by,change_summary,created_at) VALUES(?,?,?,?,?,?,?,?,?,?,?)").bind(revision.id,revision.entryId,revision.revisionNumber,revision.basedOnRevisionId,revision.schemaVersion,expectedLockVersion,JSON.stringify(revision.values),revision.contentHash,revision.createdBy,revision.changeSummary,revision.createdAt);}
  async #getRevision(id:CustomEntryRevisionId):Promise<CustomEntryRevision|null>{const row=await this.#db.prepare("SELECT * FROM custom_entry_revisions WHERE id=?").bind(id).first<CustomEntryRevisionRow>();return row?mapRevision(row):null;}
  async #projectionStatements(tableId:CustomTableId,revision:CustomEntryRevision):Promise<D1PreparedStatementLike[]>{
    const rows=(await this.#db.prepare("SELECT f.id,f.field_key,f.field_type FROM custom_table_fields tf JOIN custom_fields f ON f.id=tf.field_id WHERE tf.table_id=? ORDER BY tf.sort_order").bind(tableId).all<{id:string;field_key:string;field_type:string}>()).results;
    return rows.filter((row)=>revision.values[row.field_key]!==null&&revision.values[row.field_key]!==undefined).map((row)=>{const v=revision.values[row.field_key];let text:null|string=null,number:null|number=null,integer:null|number=null,bool:null|number=null,timestamp:null|number=null,json:null|string=null;switch(row.field_type){case"text":case"textarea":case"email":case"tel":case"select":case"asset":text=String(v);break;case"integer":integer=Number(v);break;case"decimal":number=Number(v);break;case"boolean":bool=v?1:0;break;case"date":timestamp=Date.parse(`${v}T00:00:00Z`);break;case"datetime":timestamp=Date.parse(String(v));break;default:json=JSON.stringify(v);}return this.#db.prepare("INSERT INTO custom_entry_values(revision_id,field_id,value_text,value_number,value_integer,value_boolean,value_timestamp,value_json) VALUES(?,?,?,?,?,?,?,?)").bind(revision.id,row.id,text,number,integer,bool,timestamp,json);});
  }
}

type CustomFieldRow={id:string;workspace_id:string;field_key:string;name:string;field_type:CustomFieldDefinition["type"];description:string;options_json:string;state:CustomFieldDefinition["state"];created_at:number;updated_at:number};
type CustomTableRow={id:string;workspace_id:string;table_key:string;name:string;table_kind:CustomTableDefinition["kind"];hierarchical:number;display_field_key:string|null;schema_version:number;state:CustomTableDefinition["state"];created_at:number;updated_at:number};
type CustomTableFieldRow={table_id:string;field_id:string;required:number;searchable:number;is_unique:number;sort_order:number;label_override:string|null;created_at:number};
type CustomContentRow={id:string;workspace_id:string;site_id:string;content_item_id:string;table_id:string;list_count:number;list_order_field_key:string;list_direction:CustomContentDefinition["listDirection"];template_key:string;state:CustomContentDefinition["state"];created_at:number;updated_at:number};
type CustomEntryRow={id:string;custom_content_id:string;table_id:string;slug:string|null;parent_entry_id:string|null;working_revision_id:string;published_revision_id:string|null;lock_version:number;state:CustomEntry["state"];created_by:string;created_at:number;updated_at:number};
type CustomEntryRevisionRow={id:string;entry_id:string;revision_number:number;based_on_revision_id:string|null;schema_version:number;values_json:string;content_hash:string;created_by:string;change_summary:string;created_at:number};
type CustomEntryApprovalRow={id:string;entry_id:string;revision_id:string;revision_hash:string;state:CustomEntryApproval["state"];requested_by:string;requested_at:number;decided_by:string|null;decided_at:number|null;decision_comment:string};
function mapField(r:CustomFieldRow):CustomFieldDefinition{return{id:asCustomFieldId(r.id),workspaceId:r.workspace_id as WorkspaceId,key:r.field_key,name:r.name,type:r.field_type,description:r.description,options:JSON.parse(r.options_json),state:r.state,createdAt:r.created_at,updatedAt:r.updated_at};}
function mapTable(r:CustomTableRow):CustomTableDefinition{return{id:asCustomTableId(r.id),workspaceId:r.workspace_id as WorkspaceId,key:r.table_key,name:r.name,kind:r.table_kind,hierarchical:Boolean(r.hierarchical),displayFieldKey:r.display_field_key,schemaVersion:r.schema_version,state:r.state,createdAt:r.created_at,updatedAt:r.updated_at};}
function mapTableField(r:CustomTableFieldRow):CustomTableField{return{tableId:asCustomTableId(r.table_id),fieldId:asCustomFieldId(r.field_id),required:Boolean(r.required),searchable:Boolean(r.searchable),unique:Boolean(r.is_unique),sortOrder:r.sort_order,labelOverride:r.label_override,createdAt:r.created_at};}
function mapContent(r:CustomContentRow):CustomContentDefinition{return{id:asCustomContentId(r.id),workspaceId:r.workspace_id as WorkspaceId,siteId:asSiteId(r.site_id),contentItemId:asContentItemId(r.content_item_id),tableId:asCustomTableId(r.table_id),listCount:r.list_count,listOrderFieldKey:r.list_order_field_key,listDirection:r.list_direction,templateKey:r.template_key,state:r.state,createdAt:r.created_at,updatedAt:r.updated_at};}
function mapEntry(r:CustomEntryRow):CustomEntry{return{id:asCustomEntryId(r.id),customContentId:asCustomContentId(r.custom_content_id),tableId:asCustomTableId(r.table_id),slug:r.slug,parentEntryId:r.parent_entry_id?asCustomEntryId(r.parent_entry_id):null,workingRevisionId:asCustomEntryRevisionId(r.working_revision_id),publishedRevisionId:r.published_revision_id?asCustomEntryRevisionId(r.published_revision_id):null,lockVersion:r.lock_version,state:r.state,createdBy:asPrincipalId(r.created_by),createdAt:r.created_at,updatedAt:r.updated_at};}
function mapRevision(r:CustomEntryRevisionRow):CustomEntryRevision{return{id:asCustomEntryRevisionId(r.id),entryId:asCustomEntryId(r.entry_id),revisionNumber:r.revision_number,basedOnRevisionId:r.based_on_revision_id?asCustomEntryRevisionId(r.based_on_revision_id):null,schemaVersion:r.schema_version,values:JSON.parse(r.values_json),contentHash:r.content_hash,createdBy:asPrincipalId(r.created_by),changeSummary:r.change_summary,createdAt:r.created_at};}
function mapApproval(r:CustomEntryApprovalRow):CustomEntryApproval{return{id:asCustomEntryApprovalId(r.id),entryId:asCustomEntryId(r.entry_id),revisionId:asCustomEntryRevisionId(r.revision_id),revisionHash:r.revision_hash,state:r.state,requestedBy:asPrincipalId(r.requested_by),requestedAt:r.requested_at,decidedBy:r.decided_by?asPrincipalId(r.decided_by):null,decidedAt:r.decided_at,decisionComment:r.decision_comment};}
function translate(error:unknown):DomainError{const message=error instanceof Error?error.message:String(error);if(message.includes("CUSTOM_ENTRY_REVISION_CONFLICT"))return new DomainError("CUSTOM_ENTRY_REVISION_CONFLICT","Custom entry changed since it was read",409);if(message.includes("CUSTOM_ENTRY_APPROVAL_REQUIRED"))return new DomainError("CUSTOM_ENTRY_APPROVAL_REQUIRED","Matching approved revision is required",409);if(message.includes("UNIQUE constraint failed: custom_fields"))return new DomainError("CUSTOM_FIELD_KEY_EXISTS","Custom field key already exists",409);if(message.includes("UNIQUE constraint failed: custom_tables"))return new DomainError("CUSTOM_TABLE_KEY_EXISTS","Custom table key already exists",409);if(message.includes("UNIQUE constraint failed: custom_entries.custom_content_id, custom_entries.slug"))return new DomainError("CUSTOM_ENTRY_SLUG_EXISTS","Custom entry slug already exists",409);return new DomainError("D1_CUSTOM_CONTENT_ERROR",message,500);}
