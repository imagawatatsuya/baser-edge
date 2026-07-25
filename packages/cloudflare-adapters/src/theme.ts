import {
  asDesignTokenRevisionId,
  asLayoutRevisionId,
  asPrincipalId,
  asSiteId,
  asThemeActivationId,
  asThemeId,
  asThemeReleaseId,
  type DesignTokenRevisionId,
  type LayoutRevisionId,
  type SiteId,
  type ThemeActivationId,
  type ThemeId,
  type ThemeReleaseId,
  type WorkspaceId,
} from "@baser-edge/core-types";
import type {
  DesignTokenRevision,
  LayoutRevision,
  SiteThemeActivation,
  Theme,
  ThemeRelease,
  ThemeStore,
} from "@baser-edge/theme-kernel";

interface Statement {
  bind(...values: unknown[]): Statement;
  first<T = Record<string, unknown>>(): Promise<T | null>;
  all<T = Record<string, unknown>>(): Promise<{ results: T[] }>;
  run(): Promise<unknown>;
}
interface Database { prepare(sql: string): Statement; batch(statements: Statement[]): Promise<unknown[]>; }

export class D1ThemeStore implements ThemeStore {
  readonly #db: Database;
  constructor(db: Database) { this.#db = db; }

  async createTheme(theme: Theme): Promise<void> {
    await this.#db.prepare("INSERT INTO themes(id,workspace_id,theme_key,name,description,state,created_by,created_at) VALUES(?,?,?,?,?,?,?,?)")
      .bind(theme.id, theme.workspaceId, theme.key, theme.name, theme.description, theme.state, theme.createdBy, theme.createdAt).run();
  }
  async getTheme(id: ThemeId): Promise<Theme | null> { const row=await this.#db.prepare("SELECT * FROM themes WHERE id=?").bind(id).first<ThemeRow>(); return row?mapTheme(row):null; }
  async listThemes(workspaceId: WorkspaceId): Promise<Theme[]> { return (await this.#db.prepare("SELECT * FROM themes WHERE workspace_id=? ORDER BY created_at DESC").bind(workspaceId).all<ThemeRow>()).results.map(mapTheme); }
  async createTokenRevision(revision: DesignTokenRevision): Promise<void> {
    await this.#db.prepare("INSERT INTO design_token_revisions(id,theme_id,revision_number,name,tokens_json,content_hash,created_by,created_at) VALUES(?,?,?,?,?,?,?,?)")
      .bind(revision.id, revision.themeId, revision.revisionNumber, revision.name, JSON.stringify(revision.tokens), revision.contentHash, revision.createdBy, revision.createdAt).run();
  }
  async getTokenRevision(id: DesignTokenRevisionId): Promise<DesignTokenRevision | null> { const row=await this.#db.prepare("SELECT * FROM design_token_revisions WHERE id=?").bind(id).first<TokenRow>(); return row?mapToken(row):null; }
  async countTokenRevisions(themeId: ThemeId): Promise<number> { const row=await this.#db.prepare("SELECT COUNT(*) AS count FROM design_token_revisions WHERE theme_id=?").bind(themeId).first<{count:number}>(); return Number(row?.count??0); }
  async createLayoutRevision(revision: LayoutRevision): Promise<void> {
    await this.#db.prepare("INSERT INTO layout_revisions(id,theme_id,revision_number,name,layout_json,content_hash,created_by,created_at) VALUES(?,?,?,?,?,?,?,?)")
      .bind(revision.id, revision.themeId, revision.revisionNumber, revision.name, JSON.stringify(revision.layout), revision.contentHash, revision.createdBy, revision.createdAt).run();
  }
  async getLayoutRevision(id: LayoutRevisionId): Promise<LayoutRevision | null> { const row=await this.#db.prepare("SELECT * FROM layout_revisions WHERE id=?").bind(id).first<LayoutRow>(); return row?mapLayout(row):null; }
  async countLayoutRevisions(themeId: ThemeId): Promise<number> { const row=await this.#db.prepare("SELECT COUNT(*) AS count FROM layout_revisions WHERE theme_id=?").bind(themeId).first<{count:number}>(); return Number(row?.count??0); }
  async createRelease(release: ThemeRelease): Promise<void> {
    await this.#db.prepare("INSERT INTO theme_releases(id,theme_id,version,design_token_revision_id,layout_revision_id,manifest_json,release_hash,state,created_by,created_at) VALUES(?,?,?,?,?,?,?,?,?,?)")
      .bind(release.id,release.themeId,release.version,release.designTokenRevisionId,release.layoutRevisionId,JSON.stringify(release.manifest),release.releaseHash,release.state,release.createdBy,release.createdAt).run();
  }
  async getRelease(id: ThemeReleaseId): Promise<ThemeRelease | null> { const row=await this.#db.prepare("SELECT * FROM theme_releases WHERE id=?").bind(id).first<ReleaseRow>(); return row?mapRelease(row):null; }
  async listReleases(themeId: ThemeId): Promise<ThemeRelease[]> { return (await this.#db.prepare("SELECT * FROM theme_releases WHERE theme_id=? ORDER BY created_at DESC").bind(themeId).all<ReleaseRow>()).results.map(mapRelease); }
  async activate(activation: SiteThemeActivation): Promise<void> {
    await this.#db.batch([
      this.#db.prepare("UPDATE site_theme_activations SET deactivated_at=? WHERE site_id=? AND deactivated_at IS NULL").bind(activation.activatedAt,activation.siteId),
      this.#db.prepare("INSERT INTO site_theme_activations(id,site_id,theme_release_id,activated_by,activated_at,deactivated_at) VALUES(?,?,?,?,?,NULL)").bind(activation.id,activation.siteId,activation.themeReleaseId,activation.activatedBy,activation.activatedAt),
    ]);
  }
  async getActiveActivation(siteId: SiteId): Promise<SiteThemeActivation | null> { const row=await this.#db.prepare("SELECT * FROM site_theme_activations WHERE site_id=? AND deactivated_at IS NULL ORDER BY activated_at DESC LIMIT 1").bind(siteId).first<ActivationRow>(); return row?mapActivation(row):null; }
}

type ThemeRow={id:string;workspace_id:string;theme_key:string;name:string;description:string;state:Theme["state"];created_by:string;created_at:number};
type TokenRow={id:string;theme_id:string;revision_number:number;name:string;tokens_json:string;content_hash:string;created_by:string;created_at:number};
type LayoutRow={id:string;theme_id:string;revision_number:number;name:string;layout_json:string;content_hash:string;created_by:string;created_at:number};
type ReleaseRow={id:string;theme_id:string;version:string;design_token_revision_id:string;layout_revision_id:string;manifest_json:string;release_hash:string;state:ThemeRelease["state"];created_by:string;created_at:number};
type ActivationRow={id:string;site_id:string;theme_release_id:string;activated_by:string;activated_at:number;deactivated_at:number|null};
function mapTheme(r:ThemeRow):Theme{return{id:asThemeId(r.id),workspaceId:r.workspace_id as WorkspaceId,key:r.theme_key,name:r.name,description:r.description,state:r.state,createdBy:asPrincipalId(r.created_by),createdAt:r.created_at};}
function mapToken(r:TokenRow):DesignTokenRevision{return{id:asDesignTokenRevisionId(r.id),themeId:asThemeId(r.theme_id),revisionNumber:r.revision_number,name:r.name,tokens:JSON.parse(r.tokens_json),contentHash:r.content_hash,createdBy:asPrincipalId(r.created_by),createdAt:r.created_at};}
function mapLayout(r:LayoutRow):LayoutRevision{return{id:asLayoutRevisionId(r.id),themeId:asThemeId(r.theme_id),revisionNumber:r.revision_number,name:r.name,layout:JSON.parse(r.layout_json),contentHash:r.content_hash,createdBy:asPrincipalId(r.created_by),createdAt:r.created_at};}
function mapRelease(r:ReleaseRow):ThemeRelease{return{id:asThemeReleaseId(r.id),themeId:asThemeId(r.theme_id),version:r.version,designTokenRevisionId:asDesignTokenRevisionId(r.design_token_revision_id),layoutRevisionId:asLayoutRevisionId(r.layout_revision_id),manifest:JSON.parse(r.manifest_json),releaseHash:r.release_hash,state:r.state,createdBy:asPrincipalId(r.created_by),createdAt:r.created_at};}
function mapActivation(r:ActivationRow):SiteThemeActivation{return{id:asThemeActivationId(r.id),siteId:asSiteId(r.site_id),themeReleaseId:asThemeReleaseId(r.theme_release_id),activatedBy:asPrincipalId(r.activated_by),activatedAt:r.activated_at,deactivatedAt:r.deactivated_at};}
