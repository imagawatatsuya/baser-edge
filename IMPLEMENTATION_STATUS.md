# baserEdge v0.9 Preview — 実装状況

更新基準: 現行`main`相当のコードと`npm run check`。製品定義は[製品要件 v0.4](docs/requirements/product-requirements-v0.4.md)、一般向けの利用方法は[README](README.md)と[利用ガイド](docs/user-guide.md)を参照してください。

## 利用可能な縦断経路

- Cloudflare OAuth開始ページから、利用者アカウントへD1・API Worker・公開Worker・管理画面Assetsを段階配置
- 初期サイト、所有者、公開済み`/home`の作成
- `/console/`からの簡易ログイン、サイトツリー表示
- Pageの作成、Revision保存、承認、公開
- 公開RendererによるHTML表示
- Blog、Article、Category、Tag、RSS
- Custom ContentのField、Table、Entry Revision、承認、公開
- Mail Formの入力、確認、送信、通知Outbox
- Theme Release、Design Token、Layout、Preview
- Asset Upload Session、参照検査、削除、任意のR2保存
- OAuthによる`trial`環境の削除

## v0.9の認証・権限

- Human PrincipalとAuthentication Identityの分離
- Passkey/WebAuthn登録・ログイン
- Memory / D1のサーバーサイドSession
- `HttpOnly`、`SameSite=Lax` Cookie
- Cookie認証された更新のCSRF保護
- Session一覧、個別失効、全失効、ログアウト
- 高リスク操作のWebAuthn Step-up
- 任意のCloudflare Access外側ゲート
- 本番での開発用Principal Header拒否
- Capability、Delegation、Approval、Audit
- AI Agentの直接公開拒否

お試し環境の**管理をはじめる**はPasskey設定前の簡易ログインです。本番認証の完成を意味しません。

## コンテンツ・表示

- Site配下の統一Content Tree
- Page、Folder、Alias、Blog、Article、Mail Form、Custom Content
- 不変Content Revision
- コピー、移動、ゴミ箱、復元、旧URL Redirect
- 安全なStructured Document Renderer
- 不変Theme ReleaseとSite単位の有効化

## Plugin

実装済み:

- Plugin identity、Manifest、Capability要求
- 不変Plugin ReleaseとRelease Hash
- Workspace / Site scopeのActivation
- Humanのみの登録・有効化
- `content.beforePublish` / `content.afterPublish`
- Trusted handlerとWorkers for Platforms adapter
- D1永続化とInvocation履歴
- Dispatch bindingやegress policyがない場合の失敗時閉鎖

未完成:

- 第三者Pluginのアップロード、署名、Registry、install pipeline
- Release登録、権限同意、有効化を完結させる一般向け管理UI
- Plugin専用Storage APIとSchema migration
- Mail / Theme hookの自動dispatch
- SBOM、provenance、脆弱性検査

## Cloudflareお試し開設

現在の標準経路:

- Cloudflare OAuth
- 固定リリース
- 暗号化した再開可能チェックポイント
- Queueで工程を分割
- 一時Migration WorkerのD1 bindingでTriggerを含むMigrationを実行
- Worker更新時のSecretとStatic Assets binding保持
- `/console/`の200 HTML配信を完了条件として確認
- 完了画面に管理画面URLと公開サイトURLを保持

GitHub ActionsとDeployボタンは一般ユーザー向け開設の標準経路ではありません。

## 自動検証

- **290テスト成功**
- **71 tables/views**
- **12 D1 migrations**
- TypeScript build、D1 schema verification、onboarding Worker、cloud operations Workerの型チェック

実行コマンド:

```bash
npm run check
```

## 本番運用前に必要な構成

- 実ホスト名に対応する`BASER_AUTH_RP_ID`と`BASER_AUTH_ORIGIN`
- `BASER_WEBAUTHN_GATEWAY=simple`
- Cloudflare Accessを使う場合のJWT署名検証強化
- Agent用OAuth/MCP credential
- Rate limiting、Session anomaly detection、監視
- R2、Email、Turnstile、Workers for Platformsを使用する場合のBindingとSecret
- バックアップ、復旧、料金監視

## 製品範囲外

- baserCMS 5のPHPランタイム
- baserCMSデータベースやPluginの後方互換
- WordPress互換
- 任意JavaScriptをcore processへ読み込むPlugin方式

詳しくは[baserCMSとの関係](docs/compatibility/relationship-to-basercms.md)と[ADR-0021](docs/adr/0021-baseredge-product-identity-no-host-migration.md)を参照してください。
