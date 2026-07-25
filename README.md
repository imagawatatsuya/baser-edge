# baserEdge (repository: baser-edge) v0.9

> **Preview:** 本リポジトリは開発中です。製品定義は [product-requirements-v0.4.md](docs/requirements/product-requirements-v0.4.md)、baserCMS との関係は [relationship-to-basercms.md](docs/compatibility/relationship-to-basercms.md)。**旧版ドキュメントを遡る場合は [docs/README.md](docs/README.md) を正本にしてください。**

**baserEdge** は Cloudflare 向け CMS です。サイトツリー中心の Content Manager、標準コンテンツ、Theme、Plugin を Workers + D1 + R2 上で提供します。v0.9 では Plugin 境界に加え、**Passkey/WebAuthn、サーバーサイド Session、CSRF、Step-up 認証**を追加しました。

製品定義の正本: [製品要件 v0.4](docs/requirements/product-requirements-v0.4.md)、[ADR-0021](docs/adr/0021-baseredge-product-identity-no-host-migration.md)。

## 位置づけ

- **製品:** baserEdge（本リポジトリが仕様・実装の正本）
- **運用モデル:** サイトツリー中心の CMS（Folder / Page / Blog 等）。baserCMS との位置づけは [relationship-to-basercms.md](docs/compatibility/relationship-to-basercms.md)
- **必達:** Cloudflare アカウント → **ワンクリック一括デプロイ・初期設定** → 管理開始（手作業 Wrangler を最終形にしない）
- **汎用参照:** EmDash（Manifest / Capability 等）、BurgerEditor（編集挙動の参考のみ）
- **ライセンス:** 他プロジェクトのソースはコピーしない（[THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md)）

Collection 中心 CMS や WordPress 互換は対象外です。

## リポジトリと npm

| 名前 | 値 |
|------|-----|
| 製品 | **baserEdge** |
| Git リポジトリ | [`imagawatatsuya/baser-edge`](https://github.com/imagawatatsuya/baser-edge)（公開・正本） |
| npm ルートパッケージ | `baser-edge` |
| ワークスペーススコープ | `@baser-edge/*`（例: `@baser-edge/content-kernel`, `@baser-edge/admin-web`） |
| Wrangler（例） | `baser-edge-api`, `baser-edge-public`, D1 `baser-edge`, R2 `baser-edge-assets` |

旧スコープ `@baser-cloud/*` は廃止しました。

## 顧客の Cloudflare アカウントで始める（製品体験）

**利用者は自分の Cloudflare アカウントを取る。** サイトは **そのアカウント上** にデプロイされる（共有ホスティングではない）。

利用者がやらないこと: リポジトリ操作、Wrangler 手順、D1/R2 の手動作成。  
利用者がやること: アカウント作成 → 製品の導線でデプロイ → **管理画面で「管理をはじめる」**。

| 段階 | 状態 |
|------|------|
| **目標（DEPLOY-001〜003）** | CF アカウント連携 → 一括デプロイ → instant ログインで管理画面 |
| **現状（お試し）** | public + [GitHub Pages `/start/`](docs/start/index.html) → [Cloudflare Deploy ボタン](deploy/one-click/)（**管理者のサーバー不要**） |
| **開発確認** | `prove:cloudflare` / `dev:onboarding` |

**ドキュメント地図:** [docs/README.md](docs/README.md) · **お試し:** [cloudflare-one-click-trial.md](docs/deployment/cloudflare-one-click-trial.md) · **コントリビュート:** [AGENTS.md](AGENTS.md)
開発者が自分の CF アカウントでスタンドインする場合:

```bash
npm install && npx wrangler login
BASER_CF_PROVE=1 npm run prove:cloudflare   # 既定お試し（R2 なし）
```

表示された `/console/` を開き「管理をはじめる」。

---

## Cloudflare へデプロイ（開発者・スタンドイン）

[docs/deployment/baseredge-cloudflare.md](docs/deployment/baseredge-cloudflare.md) を参照。

```bash
npm run plan:cloudflare
BASER_CF_PROVE=1 npm run prove:cloudflare   # 既定お試し（R2 なし）
```

## 開発者向けローカル実証

```bash
npm run check
npm run prove:local   # スタック起動 → ログイン → 承認 → 公開 → 公開 HTML（CI と同じ）
```

手動で UI を触る場合: `npm run dev:stack` → http://localhost:8787/console/

Cloudflare 実証: `npm run plan:cloudflare` で影響範囲を確認 → `BASER_CF_PROVE=1` 付きで `prove:cloudflare`（**既定は R2 なし**）。R2 込みは `BASER_CF_FULL_STACK=1`。使い捨ては `BASER_CF_STACK=lab`。片付けは `destroy:cloudflare`（要 `BASER_CF_DESTROY=1`）。

## v0.9で動くもの（認証）

- Human Principal と Authentication Identity の分離
- Passkey 登録・ログイン（WebAuthn、`@simplewebauthn/server`）
- サーバーサイド Session（Memory / D1）
- `HttpOnly` + `SameSite` Session Cookie と CSRF 二重送信
- Session 一覧、個別失効、全失効、ログアウト
- Theme/Plugin 有効化、生 PII 閲覧、公開などの Step-up 認証（Cookie Session 時）
- 本番での開発用 Principal Header 拒否
- Cloudflare Access を任意の外側到達制御として扱う境界（CMS Capability は別）

### Auth API

```text
POST /v1/auth/passkeys/register/begin
POST /v1/auth/passkeys/register/finish
POST /v1/auth/login/begin
POST /v1/auth/login/finish
POST /v1/auth/logout
GET  /v1/auth/session
GET  /v1/auth/sessions
DELETE /v1/auth/sessions/:sessionId
DELETE /v1/auth/sessions
POST /v1/auth/step-up/begin
POST /v1/auth/step-up/finish
```

本番環境変数（例）:

```text
BASER_ENV=production
BASER_AUTH_RP_ID=admin.example.com
BASER_AUTH_ORIGIN=https://admin.example.com
BASER_WEBAUTHN_GATEWAY=simple
BASER_ALLOW_BOOTSTRAP=false
CF_ACCESS_REQUIRED=true
```

開発・テストでは `x-baser-principal-*` ヘッダーが引き続き利用できます（`BASER_ENV=production` 以外）。

## v0.8で動くもの

### Plugin Kernel

- Workspace配下のPlugin identity
- `trusted`／`sandboxed` の信頼分類
- 不変PluginReleaseとRelease Hash
- Semantic Version、Bundle形式、SHA-256、サイズ上限の検証
- ManifestでのCapability、Hook、API Route、管理画面Page／Widget、外部Host、Storage宣言
- Human PrincipalだけによるPlugin登録、Release登録、有効化、無効化
- Workspace全体またはSite単位の有効化
- Manifest要求権限の部分集合だけを明示的に許可
- Manifest要求Hostの部分集合だけを明示的に許可
- Plugin invocation履歴
- Memory Store／D1 Store
- D1 TriggerによるPluginReleaseの更新・削除拒否

### 宣言済みCapability

```text
content:read
content:propose
content:request-publish
asset:read
asset:write
email:send
network:request
storage:read
storage:write
admin:page
admin:widget
api:route
block:register
audit:write
```

Pluginが要求したCapabilityをそのまま自動付与しません。人間が有効化時に、必要なものだけを選びます。

### Lifecycle Hook

```text
content.beforePublish
content.afterPublish
mail.afterSubmit
theme.afterActivate
```

v0.8でContent Kernelへ実接続しているのは、公開前と公開後のContent Hookです。

- `content.beforePublish` はポリシー違反時に公開を停止可能
- `content.afterPublish` は公開確定後に実行し、失敗しても公開を巻き戻さない
- 公開後Hookへ `failureMode=block` を宣言するManifestは拒否
- Hookへ渡すのはContent ID、Revision ID、種類、Path等の最小イベントであり、本文全体ではない

Mail／Theme HookはManifest契約とdispatch APIを先行実装していますが、各Kernelへの自動dispatch接続は未完成です。

### Trusted Plugin

第一者コードや、十分に監査された移植Adapter向けです。

- Host processへ事前登録されたhandlerだけを呼び出す
- ReleaseのBundle形式は `host-module`
- 外部配布された任意JavaScriptを動的importしない
- 有効化してもHost側に実装が存在しなければ失敗

### Sandboxed Plugin

第三者・生成コード向けの実行境界です。

- Bundle形式は `worker-module`
- Cloudflare Workers for PlatformsのDispatch Namespace Adapter
- HostがCPU時間とSubrequest数を指定
- JSON protocolによる限定された呼び出し
- 応答を256 KiB以下へ制限
- Dispatch binding未設定時は失敗時閉鎖
- 外部通信Capabilityがある場合、Outbound Worker policyが強制済みと明示されなければ失敗時閉鎖

ネットワーク許可HostはPluginへContextとして渡しますが、Contextだけを信頼しません。本番ではOutbound Workerで実際の`fetch()`を検査・拒否する必要があります。

### 管理画面・API拡張

- Manifestに管理画面Page／Widgetを宣言
- 有効化時に`admin:page`／`admin:widget`を許可した場合だけ一覧へ出す
- Plugin API Routeを `/v1/plugin-routes/:pluginKey/...` へマウント
- `api:route`が許可されていないPlugin Routeは実行不可
- Authorization、Cookie等の機密Request HeaderをPluginへ渡さない
- `set-cookie`等の危険Response HeaderをHost側で除去

管理画面v0.8ではPlugin identityの作成と有効Plugin一覧を確認できます。Release登録・Capability同意・有効化の完全UIは未実装で、APIを使用します。

### baserCMS Plugin 静的診断

レガシー Plugin を**実行せず静的に分類**する開発者向けユーティリティです（[relationship-to-basercms.md](docs/compatibility/relationship-to-basercms.md)）。

```bash
npm run diagnose:plugin -- /path/to/extracted/basercms-plugin
npm run diagnose:plugin -- /path/to/plugin --json report.json --markdown report.md
```

診断対象:

- Controller、Service、Model／Table、Template、Migration、Route、Asset
- CakePHP Event Listener
- BurgerEditor Addon
- ファイル書込み
- 直接SQL／Connection
- FormProtection無効化
- 任意HTML／Script注入
- 外部通信、メール、Session
- eval／プロセス実行等の危険コード
- 推奨Capability、Hook、Trust分類、移行工程

ユーザー提供BurgerEditor 3.4.0を診断した結果は、`docs/research/burger-editor-plugin-diagnostic-v0.8.md`へ保存しています。判定は`trusted-adapter-required`で、直接SQL、ファイル書込み、FormProtection無効化、任意HTML／Scriptを再設計対象として検出しました。

### v0.7までの基盤

- Page、Folder、Alias、Blog、Article、Custom Content、Mail Formを同じContent Treeへ配置
- 不変Content Revision、AI ChangeSet、Approval、AI直接公開拒否
- Recursive Copy、Trash／Restore、移動影響分析、旧URL Redirect
- Blog／Category／Tag／RSS
- Custom Field／Table／Entry Revision／型付きProjection
- Mail Form／確認Session／PII分離／通知Outbox
- Asset ID／署名付きUploadSession／R2 Adapter
- Revision／Hash／ThemeRelease固定PreviewSession
- 不変ThemeRelease／Design Token／Layout／Site Theme有効化
- baserCMS Theme診断、BurgerEditor Importer骨格

## 実行

```bash
npm install
npm run check
npm run demo
```

`npm run check` はTypeScript build、自動テスト、全D1 MigrationのSQLite互換検証を実行します。

`npm run demo` はTheme、Page、AI提案、承認、Blog、Custom Content、Mail Formに加え、第一者Trusted Pluginを登録・有効化し、公開後HookのInvocationを表示します。

管理画面・API・公開Rendererをまとめて試す場合:

```bash
npm run dev:stack
npm run dev:admin
```

- Admin: `http://localhost:4173`
- API: `http://localhost:8787`
- Public / Preview / Asset / Blog / Custom Content / Mail Form: `http://localhost:8788`

## Plugin API

```text
POST /v1/plugins
GET  /v1/workspaces/:workspaceId/plugins

POST /v1/plugins/:pluginId/releases
GET  /v1/plugins/:pluginId/releases
GET  /v1/plugin-releases/:pluginReleaseId/invocations

POST   /v1/workspaces/:workspaceId/plugin-activations
GET    /v1/workspaces/:workspaceId/plugin-activations
DELETE /v1/plugin-activations/:activationId

GET /v1/workspaces/:workspaceId/plugin-admin-extensions
GET|POST /v1/plugin-routes/:pluginKey/*
```

Site単位の有効化一覧・管理画面拡張・Route呼び出しでは`siteId`を指定できます。指定しない有効化一覧はWorkspace内の全有効化を返します。

## Plugin Manifest例

```json
{
  "manifestVersion": 1,
  "key": "publish-policy",
  "name": "Publish Policy",
  "description": "公開前検査",
  "capabilities": ["content:read"],
  "hooks": [
    {
      "name": "content.beforePublish",
      "handler": "check",
      "failureMode": "block"
    }
  ],
  "routes": [],
  "admin": { "pages": [], "widgets": [] },
  "network": { "allowedHosts": [] },
  "storage": { "kvNamespaces": [], "collections": [] },
  "source": { "kind": "native" }
}
```

Manifestは権限申請書であり、権限付与記録ではありません。Activationが実際のCapabilityとHost許可を保持します。

## D1 Plugin保存方式

```text
plugins
  Workspace内のPlugin identity、key、trust、状態

plugin_releases
  不変Manifest、Bundle descriptor、Release hash

plugin_activations
  Workspace／Site scope、許可Capability、許可Host、有効化履歴

plugin_invocations
  Hook／Route、結果、所要時間、Error code、Request ID
```

同じPluginを同じScopeで有効化すると、既存Activationを閉じ、新しい履歴行を追加します。

## Cloudflare設定

本番では既存Secretに加え、Sandbox Plugin用Dispatch Namespaceを構成します。Dispatch Namespaceそのものはアカウント固有のため、サンプルWranglerへ偽のBindingは追加していません。

```text
PLUGIN_DISPATCHER
  Workers for Platforms Dispatch Namespace binding

PLUGIN_OUTBOUND_POLICY_ENFORCED=true
  Outbound WorkerがPlugin外部通信を実際に検査するときだけ設定
```

`PLUGIN_OUTBOUND_POLICY_ENFORCED=true`は単なる設定値です。Outbound Workerを構築せずにtrueへ設定してはいけません。詳細は[`docs/deployment/workers-for-platforms-plugin-runtime.md`](./docs/deployment/workers-for-platforms-plugin-runtime.md)を参照してください。

## ディレクトリ

```text
apps/
  admin/                  モバイル運用・Plugin identity管理prototype
  api-worker/             Command／Plugin／Theme／Mail／Asset API Worker
  public-renderer/        Public／Preview／Theme Renderer
packages/
  baser-domain/           Site Tree／Path／Route影響計算
  content-kernel/         Content／Revision／Content Manager／Publication
  blog-kernel/            Blog／Article／Taxonomy／Listing／RSS
  custom-content-kernel/  Field／Table／Entry Revision／Listing
  mail-form-kernel/       Form／Confirmation／Submission／PII／Notification
  theme-kernel/           Theme／Token／Layout／Release／Activation
  plugin-kernel/          Manifest／Capability／Release／Activation／Invocation
  structured-document/    型付きBlock DocumentとAsset参照抽出
  authorization/          Principal／Capability／Delegation
  auth-kernel/            Passkey、Session、CSRF、Step-up
  asset-kernel/           Asset／UploadSession／Object Store contract
  preview-kernel/         PreviewSession／HMAC token
  agent-tools/            AI向け型付き操作
  renderer/               Theme対応安全HTML Renderer
  cloudflare-adapters/    D1／R2／Email／Theme／Plugin runtime adapters
migrations/               D1 Migration
tools/
  basercms-plugin-diagnostics/
  basercms-theme-diagnostics/
  burger-editor-importer/
```

## 現時点の制約

- 実CloudflareアカウントのDispatch Namespace／Outbound Workerへ未デプロイです。
- Sandboxed PluginのBundle upload、署名、Registry、install pipelineは未実装です。
- Trusted PluginはHostへ事前登録した第一者handlerだけを実行します。
- 外部通信の実 enforcement はOutbound Workerが必要です。
- Plugin専用Storage AdapterとSchema migrationはManifest契約のみで、実保存APIは未実装です。
- Mail／Theme lifecycle Hookの自動dispatch接続は未実装です。
- Content Type／Component登録はCapability名だけで、完全なRegistry接続は未実装です。
- Release／Capability同意／有効化の完全な管理画面は未実装です。
- PluginReleaseの署名、SBOM、provenance、脆弱性検査は未実装です。
- Passkey、Cloudflare Access、本番Session、Step-up認証は v0.9 で基盤実装済み（本番RP/Origin/Access JWT検証は要構成）
- D1／R2／Email／Turnstile／Workers for Platformsを組み合わせた実Cloudflare Deploy試験は未実施です。

詳細は[`IMPLEMENTATION_STATUS.md`](./IMPLEMENTATION_STATUS.md)、[`docs/architecture/plugin-v0.8.md`](./docs/architecture/plugin-v0.8.md)、[`docs/adr/0018-plugin-manifest-capabilities-and-isolated-runtime.md`](./docs/adr/0018-plugin-manifest-capabilities-and-isolated-runtime.md)を参照してください。
