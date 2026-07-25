# baserEdge on Cloudflare

**利用者は自分の Cloudflare アカウントを使う。** baserEdge はそのアカウント内に Workers / D1 をデプロイする（運営の共有環境ではない）。**既定の prove / 開始ページは R2 を作らない**（クレジットカード未登録のお試し向け）。R2 込みは `BASER_CF_FULL_STACK=1`。

製品要件 [DEPLOY-001–003](../requirements/product-requirements-v0.4.md) 向けの**単一フロー**デプロイです。顧客向けの完全ワンクリック（ダッシュボードボタン）は今後このスクリプトを土台にします。

## 前提

- Node.js 22+
- Cloudflare アカウント
- `npx wrangler login` 済み

## 手順（推奨）

### Cloudflare を汚したくない場合

| 目的 | コマンド |
|------|----------|
| **アカウントに一切触らない** | `npm run prove:local`（CI と同じ） |
| **何が作られるかだけ見る** | `npm run plan:cloudflare` |
| **使い捨てスタックで実証（お試し・R2 なし）** | `BASER_CF_STACK=lab npm run plan:cloudflare` のあと `BASER_CF_STACK=lab BASER_CF_PROVE=1 npm run prove:cloudflare` |
| **R2 込みフルスタック** | 上に `BASER_CF_FULL_STACK=1` を付与（R2 有効化に支払い方法が必要なことが多い） |
| **片付け** | `BASER_CF_STACK=lab BASER_CF_DESTROY=1 npm run destroy:cloudflare` |

`prove:cloudflare` / `provision:cloudflare` / `deploy:cloudflare` は、**`BASER_CF_PROVE=1`（または `--yes`）がないと Cloudflare に接続しません**。誤実行防止用です。

`BASER_CF_STACK` を変えると Worker / D1 の名前が分離され、本番用の `default`（`baser-edge-api` など）と混ざりにくくなります。状態は `deploy/cloudflare-state.<stack>.json` に保存されます。R2 を使う場合のみ `BASER_CF_FULL_STACK=1` でバケット名もスタックごとに分離されます。

### 確実な実証（自動）

```bash
npm install
npx wrangler login
npm run plan:cloudflare          # 触る前に確認（API 呼び出しなし）
BASER_CF_STACK=lab BASER_CF_PROVE=1 npm run prove:cloudflare
```

`prove:cloudflare` は provision（**既定: D1 のみ**）→ シークレット投入 → デプロイ → bootstrap → instant login 設定 → **公開ページまで API スモーク** まで一括実行します。  
`BASER_ENV=preview` と Test WebAuthn を使う**デモ専用**構成です（本番は `BASER_ENV=production` + 実 Passkey）。

事前確認: `npm run preflight:cloudflare`（ログイン・シークレット・管理 UI ビルドのみ）

再検証のみ: `npm run smoke:cloudflare`（`deploy/cloudflare-state.json` 必須）

### ローカルだけで同等の API 実証

```bash
npm run check
npm run prove:local
```

### prove が WORKSPACE_EXISTS で止まる場合

初回 prove 後は `deploy/cloudflare-state.json` を残してください。D1 だけ残して state を消した場合は、リモート D1 を空にするか state を復元する必要があります（例は `prove.mjs` のエラーメッセージ参照）。

### 手動デプロイのみ

```bash
npm install
npx wrangler login
npm run provision:cloudflare   # 既定: D1 のみ（trial）。R2 は BASER_CF_FULL_STACK=1
npm run deploy:cloudflare      # build → migrate → API + Public デプロイ（既定: wrangler.trial.jsonc）
```

初回サイト作成（Worker 上で `BASER_ALLOW_BOOTSTRAP=true` を一時設定したうえで）:

```bash
npm run deploy:cloudflare -- --bootstrap
```

`deploy/cloudflare-state.json` に `d1DatabaseId`・Worker URL・`siteId` を保存します（gitignore）。

## 何がデプロイされるか

| コンポーネント | Wrangler 名 | 備考 |
|----------------|-------------|------|
| API + 管理 UI | `baser-edge-api` | `/v1/*`、Passkey、`/console/*`（`apps/admin-web/dist` を Static Assets） |
| 公開サイト | `baser-edge-public` | `SITE_ID` が必要（bootstrap 後） |
| D1 | `baser-edge` | `migrations/` |
| R2 | `baser-edge-assets` | **のみ** `BASER_CF_FULL_STACK=1` 時。binding `R2` |

## 本番前チェックリスト

1. `wrangler secret put ASSET_UPLOAD_SECRET` / `PREVIEW_SECRET` / `MAIL_FORM_SECRET` / `MAIL_PRIVACY_SALT`
2. vars: `BASER_ENV=production`、`BASER_AUTH_RP_ID`、`BASER_AUTH_ORIGIN`（コンソールと API 同一オリジン推奨）
3. `BASER_WEBAUTHN_GATEWAY=simple`
4. bootstrap 後 `BASER_ALLOW_BOOTSTRAP` を外す
5. `wrangler.public.jsonc` の `SITE_ID` が bootstrap の site と一致

## ローカル

Cloudflare なしで開発する場合:

```bash
npm run dev:stack
```

→ http://localhost:8787/console/

## 旧 `baser-cloud-*` リソース

既存の Cloudflare リソースは自動移行しません。新規 `baser-edge-*` で作り直すか、手動で wrangler の id を合わせてください。
