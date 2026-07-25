export const ADMIN_VIEW_QUERY = "baserAdminView";

export type AdminViewKind = "draft" | "published";

export function shouldShowPublishedAdminBanner(url: URL): boolean {
  return url.searchParams.get(ADMIN_VIEW_QUERY) === "published";
}

export function injectAdminViewBanner(html: string, kind: AdminViewKind, revisionId: string): string {
  const short = revisionId.length > 8 ? revisionId.slice(-8) : revisionId;
  const heading = kind === "draft" ? "下書きプレビュー（未公開）" : "公開済みページ";
  const detail = kind === "draft"
    ? "この内容はサイトに公開されていません。"
    : "訪問者に表示されている公開版です。";
  const titlePrefix = kind === "draft" ? "【下書き】" : "【公開】";
  const modifier = kind === "draft" ? "draft" : "published";

  const style = `<style>.baser-admin-banner{position:sticky;top:0;z-index:9999;padding:.65rem 1rem;font:600 .9rem/1.4 system-ui,sans-serif;border-bottom:2px solid #111}.baser-admin-banner--draft{background:#fff3cd;color:#664d03;border-color:#997404}.baser-admin-banner--published{background:#d1e7dd;color:#0f5132;border-color:#0a3622}.baser-admin-banner small{display:block;font-weight:400;opacity:.9;margin-top:.15rem}</style>`;
  const banner = `<div class="baser-admin-banner baser-admin-banner--${modifier}" role="status" aria-live="polite"><strong>${heading}</strong><small>${detail} リビジョン …${escapeHtml(short)}</small></div>`;

  let out = html.replace(/<title>([^<]*)<\/title>/i, `<title>${titlePrefix}$1</title>`);
  out = out.replace(/<body([^>]*)>/i, `<body$1>${style}${banner}`);
  return out;
}

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[character] ?? character);
}
