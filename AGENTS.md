# AGENTS.md

## Project identity

This is **baserEdge** — a Cloudflare-optimized CMS. The product specification and shipping contracts are authoritative here.

- **Operational model:** site-tree Content Manager semantics (Folder, Page, Alias, Blog, Mail Form, Custom Content) inspired by baserCMS-style operations — not a baserCMS 5 runtime, bundle, or compatibility target.
- **No host-side migration in core:** baserEdge does not ship baserCMS importers or backward-compatibility shims. See [relationship-to-basercms.md](docs/compatibility/relationship-to-basercms.md).
- **Mandatory deploy UX:** one-click (or equivalent single-flow) Cloudflare deploy and bootstrap is a **must-achieve product goal** ([ADR-0021](docs/adr/0021-baseredge-product-identity-no-host-migration.md), [product requirements v0.4](docs/requirements/product-requirements-v0.4.md)).
- **EmDash:** portable implementation ideas (Revision, Manifest, isolation), not the product model.

Human administration UI is **`apps/admin-web`** (`/console/`). Follow [ADR-0020](docs/adr/0020-admin-console-as-product-surface.md) and the active console phase in [MVP v0.9](docs/implementation/mvp-implementation-plan-v0.9.md); do not expand C0 wireframe scope except bugfixes.

## Non-negotiable invariants

1. The site tree is the primary content-management surface.
2. Pages, folders, blogs, forms, aliases, and custom content participate in one content tree.
3. Content identity is separate from route/path identity.
4. Revisions, ThemeReleases and PluginReleases are immutable.
5. AI agents create proposals and approval requests; they do not publish in the default policy.
6. Human, agent, service and plugin actions use the same application services and audit model.
7. HTML is rendered output, not the canonical editable document.
8. Do not add arbitrary runtime code to the core process.
9. Plugin Manifest requests are not grants; Activation stores the explicit granted subset.
10. Agents cannot install, register or activate executable Plugin releases under the default policy.
11. Sandboxed Plugin network access must fail closed without host-enforced egress policy.
12. A post-commit Hook cannot claim to block or roll back the committed operation.

## Source adoption rules

- Preserve baserCMS **terminology** when it expresses baserEdge domain behavior: Site, Content Tree, Folder, Page, Alias, Blog, Mail Form, Custom Content, Theme, Plugin.
- Do not add features whose sole justification is legacy baserCMS compatibility ([ADR-0021](docs/adr/0021-baseredge-product-identity-no-host-migration.md)).
- Prefer EmDash-style generic mechanisms when they do not replace baserCMS semantics: TypeScript, Cloudflare adapters, revision tokens, passkeys, MCP/CLI, signed uploads, manifests and sandbox capabilities.
- Record adopted external code and license in `THIRD_PARTY_NOTICES.md` before copying any code.
- BurgerEditor is an optional editing-behavior reference. Do not copy its licensed source into this repository.
- Never execute a source baserCMS PHP Theme or Plugin during diagnostics. Diagnostics do not imply a product migration path.

## Commands

```bash
npm install
npm run build
npm test
npm run verify:schema
npm run demo
npm run diagnose:theme -- /path/to/theme
npm run diagnose:plugin -- /path/to/plugin
```

All changes must keep `npm run check` passing.

## Input validation (mandatory for new features)

Low bar validation (e.g. accepting Japanese URL slugs that break public routes, wrong `lockVersion` fields, or UI-only checks) is **explicitly out of scope** for new work. Follow **`docs/engineering/validation-policy.md`** end to end. When touching existing API or console surfaces, consult **`docs/engineering/api-validation-audit.md`** and update its row in the same change.

### Agent rules (summary)

1. **Validate in the domain/kernel first**, then API, then admin UI as a mirror—not the only gate.
2. **Stable error codes** (`DomainError.code`); use **422** for fixable input, **409** for revision/tree conflicts.
3. **URL slugs:** ASCII `[a-z0-9-]` only unless an ADR adds otherwise; titles may be Unicode.
4. **Revisions:** `expectedLockVersion` = **`item.lockVersion`**; never trust revision row metadata for locks.
5. **Tests:** every new input surface needs success + at least **two** rejection tests; extend golden-path tests when `/console/` behavior changes.
6. **Auth mutations:** CSRF + session cookies; do not weaken fail-closed behavior for convenience.
7. **Console UI sync:** after successful mutations, refresh or invalidate every on-screen view that depends on the changed data (read-your-writes); see `.cursor/rules/console-mutation-sync.mdc` and `docs/engineering/console-mutation-sync-audit.md`. Extend `tests/console-golden-path.test.mjs` and `tests/console-mutation-sync-ui.test.mjs` when behavior changes.
8. **Admin SPA router:** `useBlocker` and similar APIs require `createBrowserRouter` + `RouterProvider` — never `BrowserRouter` in `apps/admin-web`. See `docs/engineering/admin-spa-router-policy.md` and `npm run verify:admin-router`.
9. **Agent skills (repo):** adaptive CMS skills live under `.agents/skills/`; index and drift policy in `docs/agents/skill-index.md`. Run `npm run check:agent-skills` after changing authorities, component roles, or skill layout.

If a feature cannot meet this bar in the same change, **narrow the feature** (smaller API surface) rather than shipping permissive parsing.

## Cloudflare browser investigation

Cloudflare Dashboard、Workers、Pages、D1、R2、KV、Durable Objects、Access、DNS、WAFのブラウザ調査では、`playwright-cloudflare` MCPを優先する。

調査の基本手順:

1. 接続中のブラウザ、タブ、現在のURLを確認する。
2. ページ構造とスクリーンショットを確認する。
3. Consoleメッセージを確認する。
4. Networkリクエストを列挙する。
5. 問題に関係する通信だけ、ヘッダー、送信本文、応答本文、HTTPステータスを確認する。
6. Cookie、localStorage、sessionStorageは必要な項目だけ調べる。
7. 調査依頼では、設定変更、削除、デプロイ、課金操作を行わない。
8. UI表示とAPI応答が矛盾する場合は、両方を記録して原因を分析する。
9. Cloudflare側の制限、ブラウザ側の制限、MCP側の制限、Codex側の制限を区別して報告する。
10. Chrome DevTools MCPは、Playwrightでは取得できないChrome固有の詳細なパフォーマンストレースが必要な場合だけ使う。

## Windows ACL escalation

作業対象内のコマンドが `Access is denied`、`PermissionError`、`EPERM` で失敗した場合:

1. 対象パスと操作を限定し、理由を明記してCodexのサンドボックス昇格承認をユーザーへ要求する。
2. ユーザーが承認してもWindows ACLまたはUACで拒否された場合は、同じ試行を繰り返さない。
3. 必要最小限の手動PowerShellコマンド、対象パス、変更内容、元に戻す方法を提示し、ユーザーの実行完了を待つ。
4. リポジトリ全体やユーザープロファイル全体への再帰的ACL変更は提案しない。
5. ユーザーの手動許可後、失敗した元のコマンドを再実行し、結果を確認してから作業を続ける。
