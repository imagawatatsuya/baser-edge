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
  ResolvedThemePresentation,
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

  async resolveActivePresentation(siteId: SiteId): Promise<ResolvedThemePresentation | null> {
    const row = await this.#db.prepare(
      `SELECT
         a.id AS a_id,a.site_id AS a_site_id,a.theme_release_id AS a_release_id,
         a.activated_by AS a_activated_by,a.activated_at AS a_activated_at,
         a.deactivated_at AS a_deactivated_at,
         r.id AS r_id,r.theme_id AS r_theme_id,r.version AS r_version,
         r.design_token_revision_id AS r_token_id,r.layout_revision_id AS r_layout_id,
         r.manifest_json AS r_manifest_json,r.release_hash AS r_release_hash,
         r.state AS r_state,r.created_by AS r_created_by,r.created_at AS r_created_at,
         t.id AS t_id,t.workspace_id AS t_workspace_id,t.theme_key AS t_key,
         t.name AS t_name,t.description AS t_description,t.state AS t_state,
         t.created_by AS t_created_by,t.created_at AS t_created_at,
         d.id AS d_id,d.theme_id AS d_theme_id,d.revision_number AS d_revision_number,
         d.name AS d_name,d.tokens_json AS d_tokens_json,d.content_hash AS d_content_hash,
         d.created_by AS d_created_by,d.created_at AS d_created_at,
         l.id AS l_id,l.theme_id AS l_theme_id,l.revision_number AS l_revision_number,
         l.name AS l_name,l.layout_json AS l_layout_json,l.content_hash AS l_content_hash,
         l.created_by AS l_created_by,l.created_at AS l_created_at
       FROM site_theme_activations a
       INNER JOIN theme_releases r ON r.id=a.theme_release_id
       INNER JOIN themes t ON t.id=r.theme_id
       INNER JOIN design_token_revisions d ON d.id=r.design_token_revision_id
       INNER JOIN layout_revisions l ON l.id=r.layout_revision_id
       WHERE a.site_id=? AND a.deactivated_at IS NULL
       ORDER BY a.activated_at DESC LIMIT 1`,
    ).bind(siteId).first<ResolvedThemeRow>();
    if (!row) return null;
    return mapResolvedTheme(row);
  }

  async resolveReleasePresentation(releaseId: ThemeReleaseId, siteId?: SiteId): Promise<ResolvedThemePresentation | null> {
    const row = await this.#db.prepare(
      `SELECT
         a.id AS a_id,a.site_id AS a_site_id,a.theme_release_id AS a_release_id,
         a.activated_by AS a_activated_by,a.activated_at AS a_activated_at,
         a.deactivated_at AS a_deactivated_at,
         r.id AS r_id,r.theme_id AS r_theme_id,r.version AS r_version,
         r.design_token_revision_id AS r_token_id,r.layout_revision_id AS r_layout_id,
         r.manifest_json AS r_manifest_json,r.release_hash AS r_release_hash,
         r.state AS r_state,r.created_by AS r_created_by,r.created_at AS r_created_at,
         t.id AS t_id,t.workspace_id AS t_workspace_id,t.theme_key AS t_key,
         t.name AS t_name,t.description AS t_description,t.state AS t_state,
         t.created_by AS t_created_by,t.created_at AS t_created_at,
         d.id AS d_id,d.theme_id AS d_theme_id,d.revision_number AS d_revision_number,
         d.name AS d_name,d.tokens_json AS d_tokens_json,d.content_hash AS d_content_hash,
         d.created_by AS d_created_by,d.created_at AS d_created_at,
         l.id AS l_id,l.theme_id AS l_theme_id,l.revision_number AS l_revision_number,
         l.name AS l_name,l.layout_json AS l_layout_json,l.content_hash AS l_content_hash,
         l.created_by AS l_created_by,l.created_at AS l_created_at
       FROM theme_releases r
       INNER JOIN themes t ON t.id=r.theme_id
       INNER JOIN design_token_revisions d ON d.id=r.design_token_revision_id
       INNER JOIN layout_revisions l ON l.id=r.layout_revision_id
       LEFT JOIN site_theme_activations a
         ON a.theme_release_id=r.id AND a.site_id=? AND a.deactivated_at IS NULL
       WHERE r.id=?
       ORDER BY a.activated_at DESC LIMIT 1`,
    ).bind(siteId ?? null, releaseId).first<ResolvedThemeRow>();
    return row ? mapResolvedTheme(row) : null;
  }

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
type ResolvedThemeRow={
  a_id:string|null;a_site_id:string|null;a_release_id:string|null;a_activated_by:string|null;a_activated_at:number|null;a_deactivated_at:number|null;
  r_id:string;r_theme_id:string;r_version:string;r_token_id:string;r_layout_id:string;r_manifest_json:string;r_release_hash:string;r_state:ThemeRelease["state"];r_created_by:string;r_created_at:number;
  t_id:string;t_workspace_id:string;t_key:string;t_name:string;t_description:string;t_state:Theme["state"];t_created_by:string;t_created_at:number;
  d_id:string;d_theme_id:string;d_revision_number:number;d_name:string;d_tokens_json:string;d_content_hash:string;d_created_by:string;d_created_at:number;
  l_id:string;l_theme_id:string;l_revision_number:number;l_name:string;l_layout_json:string;l_content_hash:string;l_created_by:string;l_created_at:number;
};
function mapTheme(r:ThemeRow):Theme{return{id:asThemeId(r.id),workspaceId:r.workspace_id as WorkspaceId,key:r.theme_key,name:r.name,description:r.description,state:r.state,createdBy:asPrincipalId(r.created_by),createdAt:r.created_at};}
function mapToken(r:TokenRow):DesignTokenRevision{return{id:asDesignTokenRevisionId(r.id),themeId:asThemeId(r.theme_id),revisionNumber:r.revision_number,name:r.name,tokens:JSON.parse(r.tokens_json),contentHash:r.content_hash,createdBy:asPrincipalId(r.created_by),createdAt:r.created_at};}
function mapLayout(r:LayoutRow):LayoutRevision{return{id:asLayoutRevisionId(r.id),themeId:asThemeId(r.theme_id),revisionNumber:r.revision_number,name:r.name,layout:JSON.parse(r.layout_json),contentHash:r.content_hash,createdBy:asPrincipalId(r.created_by),createdAt:r.created_at};}
function mapRelease(r:ReleaseRow):ThemeRelease{return{id:asThemeReleaseId(r.id),themeId:asThemeId(r.theme_id),version:r.version,designTokenRevisionId:asDesignTokenRevisionId(r.design_token_revision_id),layoutRevisionId:asLayoutRevisionId(r.layout_revision_id),manifest:JSON.parse(r.manifest_json),releaseHash:r.release_hash,state:r.state,createdBy:asPrincipalId(r.created_by),createdAt:r.created_at};}
function mapActivation(r:ActivationRow):SiteThemeActivation{return{id:asThemeActivationId(r.id),siteId:asSiteId(r.site_id),themeReleaseId:asThemeReleaseId(r.theme_release_id),activatedBy:asPrincipalId(r.activated_by),activatedAt:r.activated_at,deactivatedAt:r.deactivated_at};}
function mapResolvedTheme(row: ResolvedThemeRow): ResolvedThemePresentation {
  return {
    activation: row.a_id && row.a_site_id && row.a_release_id && row.a_activated_by && row.a_activated_at !== null
      ? mapActivation({
        id: row.a_id,
        site_id: row.a_site_id,
        theme_release_id: row.a_release_id,
        activated_by: row.a_activated_by,
        activated_at: row.a_activated_at,
        deactivated_at: row.a_deactivated_at,
      })
      : null,
    release: mapRelease({
      id: row.r_id,
      theme_id: row.r_theme_id,
      version: row.r_version,
      design_token_revision_id: row.r_token_id,
      layout_revision_id: row.r_layout_id,
      manifest_json: row.r_manifest_json,
      release_hash: row.r_release_hash,
      state: row.r_state,
      created_by: row.r_created_by,
      created_at: row.r_created_at,
    }),
    theme: mapTheme({
      id: row.t_id,
      workspace_id: row.t_workspace_id,
      theme_key: row.t_key,
      name: row.t_name,
      description: row.t_description,
      state: row.t_state,
      created_by: row.t_created_by,
      created_at: row.t_created_at,
    }),
    tokenRevision: mapToken({
      id: row.d_id,
      theme_id: row.d_theme_id,
      revision_number: row.d_revision_number,
      name: row.d_name,
      tokens_json: row.d_tokens_json,
      content_hash: row.d_content_hash,
      created_by: row.d_created_by,
      created_at: row.d_created_at,
    }),
    layoutRevision: mapLayout({
      id: row.l_id,
      theme_id: row.l_theme_id,
      revision_number: row.l_revision_number,
      name: row.l_name,
      layout_json: row.l_layout_json,
      content_hash: row.l_content_hash,
      created_by: row.l_created_by,
      created_at: row.l_created_at,
    }),
    builtin: false,
  };
}
