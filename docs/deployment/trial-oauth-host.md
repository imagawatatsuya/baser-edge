# お試し開設ホスト（OAuth・一気通貫 UX）

一般ユーザーには **GitHub Pages `/start/`** からここへ誘導します。Cloudflare の Deploy ボタン（D1/Git 設定画面）は **開発者向けフォールバック**です。

## 利用者が見る流れ

1. `/start/` → **お試しをはじめる**
2. この Worker 上の `/start/`（onboarding-web）→ **Cloudflare でログインしてサイトを開設**
3. 進捗メッセージ → 完了後 **管理画面へ自動遷移**
4. 片付けは `deploy/trial-onboarding.json` の `teardownUrl`（Cloud Operations Worker）

## メンテナが 1 回やること

### 1. GitHub リポジトリ Secrets（`onboarding-jobs` 用）

| Secret | 用途 |
|--------|------|
| `ONBOARDING_CALLBACK_SECRET` | Worker ↔ Actions 進捗コールバック |
| `ONBOARDING_TOKEN_ENCRYPTION_KEY` | 32 バイト base64（OAuth トークン暗号化） |
| `GH_DISPATCH_TOKEN` | `repository_dispatch` 用 fine-grained PAT |

### 2. `wrangler.onboarding-host.jsonc`

- `GITHUB_REPO` を `owner/baser-edge` に
- `kv_namespaces` の KV ID を本番 ID に
- `BASER_ONBOARDING_PROVISION_STACK_ID`: `trial`（固定お試し名）
- `BASER_EDGE_OPS_PUBLIC_URL`: Operations Worker の URL

Worker Secrets（`wrangler secret put`）:

- `BASER_CF_OAUTH_CLIENT_ID` / `BASER_CF_OAUTH_CLIENT_SECRET`
- OAuth Redirect に `https://<trial-host>/api/onboarding/oauth/callback` を追加

### 3. デプロイ

```bash
npm run build:onboarding-web
npm run deploy:trial-host
```

### 4. Pages 用 URL

`deploy/trial-onboarding.json` の `onboardingStartUrl` を  
`https://<trial-host>/start/` に合わせて push（Pages workflow が `/start/` に埋め込む）。

## 技術メモ

- 開設ジョブ: Worker → `repository_dispatch` → `scripts/onboarding/gh-run-prove.mjs` → `runProve`（利用者トークン・`BASER_CF_STACK=trial`）
- 利用者のブラウザに **wrangler / D1 バインディング UI は出ない**
