# baserEdge 開発者向けガイド

この文書は、baserEdgeをローカルで実行する方、コードを変更する方、開発用Cloudflare環境へデプロイする方を対象にしています。一般のお試し利用は[利用ガイド](user-guide.md)を参照してください。

## 必要環境

- Node.js 22以降
- npm
- Cloudflareへデプロイする場合はCloudflareアカウントとWranglerログイン

## セットアップ

```bash
npm install
npm run check
```

`npm run check`はTypeScriptビルド、自動テスト、D1スキーマ検証、Workerの型チェックを実行します。

## ローカルで管理画面を試す

```bash
npm run dev:stack
```

| URL | 用途 |
|---|---|
| `http://localhost:8787/console/` | 管理画面 |
| `http://localhost:8787` | API |
| `http://localhost:8788` | 公開・プレビュー・アセット |

自動のローカル実証は次のコマンドです。

```bash
npm run prove:local
```

ログイン、承認、公開、公開HTMLまでの主要経路を確認します。

## よく使うコマンド

```bash
npm run build
npm test
npm run verify:schema
npm run demo
npm run build:admin-web
```

baserCMS資産を実行せず静的診断する場合:

```bash
npm run diagnose:theme -- /path/to/theme
npm run diagnose:plugin -- /path/to/plugin
```

これらは移行ツールではなく、再設計が必要な箇所を把握するための診断です。

## Cloudflareでの開発確認

変更対象を確認してから、明示的な同意変数付きで実行します。

```bash
npm run plan:cloudflare
BASER_CF_PROVE=1 npm run prove:cloudflare
```

既定のお試し構成はR2なしです。R2を含む構成は`BASER_CF_FULL_STACK=1`を指定します。詳しいBinding、Secret、片付け方法は次を参照してください。

- [Cloudflareデプロイ](deployment/baseredge-cloudflare.md)
- [R2とメディア](deployment/cloudflare-r2-and-media.md)
- [Cloudflare環境の削除](deployment/cloudflare-teardown.md)
- [デプロイのトラブル対応](deployment/cloudflare-prove-troubleshooting.md)

## 主な構成

```text
apps/
  admin-web/              人間向け管理画面
  api-worker/             管理APIと認証
  public-renderer/        公開・プレビューRenderer
  onboarding-web/         お試し開始画面
  onboarding-worker/      OAuthと開設オーケストレーション
packages/
  content-kernel/         サイトツリー、Revision、承認、公開
  blog-kernel/            Blog、Article、Taxonomy、RSS
  custom-content-kernel/  Field、Table、Entry
  mail-form-kernel/       Form、Submission、通知
  theme-kernel/           Theme Release、Token、Layout
  plugin-kernel/          Manifest、Activation、隔離実行
  auth-kernel/            Passkey、Session、CSRF、Step-up
  cloudflare-adapters/    D1、R2、Email等のAdapter
migrations/               D1 Migration
```

## 実装時の不変条件

- サイトツリーをコンテンツ管理の中心にする
- コンテンツの識別子とURL上の位置を分ける
- Revision、ThemeRelease、PluginReleaseを不変にする
- AI Agentは既定で直接公開しない
- Domain、API、管理UIの順に入力を検証する
- 人間、Agent、Service、PluginでApplication Serviceと監査モデルを共有する

詳細は[AGENTS.md](../AGENTS.md)、[入力検証ポリシー](engineering/validation-policy.md)、[製品要件](requirements/product-requirements-v0.4.md)を参照してください。
