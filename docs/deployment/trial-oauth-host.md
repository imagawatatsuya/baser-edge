# お試し開設ホスト（OAuth・一気通貫 UX）

> **既定:** 開設 prove は、固定ビルド成果物を段階的に配置する **Cloudflare Queue + REST**（`BASER_TRIAL_PROVISION_MODE=cloudflare`, `BASER_TRIAL_PROVISION_STRATEGY=release`）。メンテナ GitHub Actions は **フォールバック**（`github`）のみ。方針: [ADR-0023](../adr/0023-trial-provision-without-github-actions.md) / [trial-provision-cloudflare-only.md](trial-provision-cloudflare-only.md)。

一般ユーザーには **GitHub Pages `/start/`** からここへ誘導します。Cloudflare の Deploy ボタン（D1/Git 設定画面）は **開発者向けフォールバック**です。

## 利用者が見る流れ

1. `/start/` → **お試しをはじめる**
2. この Worker 上の `/start/`（onboarding-web）→ **Cloudflare でログインしてサイトを開設**
3. 工程別の進捗メッセージを表示
4. 完了後、**管理画面URLと公開サイトURLを画面に表示・保存**
5. 片付けは開始ページの**お試しをやめる**（Cloud Operations Worker）

## メンテナが 1 回やること

### 1. GitHub リポジトリ Secrets（**`BASER_TRIAL_PROVISION_MODE=github` のときのみ**）

| Secret | 用途 |
|--------|------|
| `ONBOARDING_CALLBACK_SECRET` | Worker ↔ Actions 進捗コールバック |
| `ONBOARDING_TOKEN_ENCRYPTION_KEY` | 32 バイト base64（OAuth トークン暗号化） |
| `GH_DISPATCH_TOKEN` | `repository_dispatch` 用 fine-grained PAT |

### 2. `wrangler.onboarding-host.jsonc`

- `GITHUB_REPO` を `owner/baser-edge` に
- `kv_namespaces` の KV ID を本番 ID に
- `TRIAL_PROVISION_QUEUE` は `npm run deploy:trial-host` が初回だけ `baser-edge-trial-provision` を作成
- `BASER_ONBOARDING_PROVISION_STACK_ID`: `trial`（固定お試し名）
- `OPS_SERVICE`: `baser-edge-cloud-operations` へのService Binding

Worker Secrets（`wrangler secret put`）:

- `BASER_CF_OAUTH_CLIENT_ID` / `BASER_CF_OAUTH_CLIENT_SECRET`
- `BASER_OPS_BROKER_SECRET`（Operations Workerと同じ値）
- OAuth Redirect に `https://<trial-host>/api/onboarding/oauth/callback` を追加

### 3. デプロイ

```bash
npm run setup:ops-broker-secret
npm run deploy:cloud-operations
npm run build:onboarding-web
npm run deploy:trial-host
```

`setup:ops-broker-secret`は共有Secretを生成して両Workerへ同じ値を設定します。値は標準出力やリポジトリへ保存しません。

### 4. Pages 用 URL

`deploy/trial-onboarding.json` の `onboardingStartUrl` を  
`https://<trial-host>/start/` に合わせて push（Pages workflow が `/start/` に埋め込む）。

## 技術メモ

- **既定（`BASER_TRIAL_PROVISION_STRATEGY=release`）:** メンテナが配布する **固定ビルド成果物** を trial-host から取得し、利用者アカウントへ **D1 + Worker API デプロイ**（**利用者の GitHub アカウント不要**）。トリガーを含むD1マイグレーションだけは、利用者アカウントへ一時配置する認証付きWorkerのD1 bindingから実行します。`deploy:trial-host` 前に `npm run pack:trial-release` が実行されます。
- 開設処理は`ctx.waitUntil()`や単一Queue invocationでは実行しません。D1、マイグレーション30 SQLごと、Assets、Worker、Secrets、bootstrapを**別々のQueueメッセージ**に分割し、1回のinvocationに処理が集中しないようにします。
- Worker Secrets は Worker ごとに一括更新し、API Worker の認証済み readiness probe が新しい bootstrap secret を確認してから初期サイトを作成します。後続の Worker 更新では既存 Secret binding を明示的に保持します。
- Static Assets の completion token は初回 API Worker 配置と同じ Queue 段階で取得・消費し、再配信時は新しい token を取得します。最終 API Worker 更新では token を再利用せず `keep_assets` で既存 Assets を保持します。
- Static Assets の multipart 各 file part には拡張子に対応する MIME type を指定します。アセットハッシュには MIME 形式世代も含め、配信メタデータを変更したときは同じ内容でも Cloudflare へ再アップロードさせます。
- Static AssetsはWorker-firstで配信し、`/console/`をAssetsルート`/`へ割り当てます。`/index.html`への内部変換はHTML正規化とのリダイレクト循環を起こすため使用しません。
- 最終確認は`/health`だけでなく、`/console/`がリダイレクトなしの200 HTMLを返すことを検証します。
- 開設画面の工程は Queue 状態（D1作成、migration、Assets、各Worker、Secrets、bootstrap、最終確認）をそのまま表示し、各段階の実行前にセッション進捗を更新します。
- 各段階の成功後、AES-256-GCMで暗号化した次のチェックポイントを KV セッションへ先に保存してから次メッセージを送信します。Queue再配信や送信失敗時は、完了済みCloudflare変更を繰り返さず次段階から再開します。
- Queue メッセージに OAuth/API トークンの平文は保存せず、`ONBOARDING_TOKEN_ENCRYPTION_KEY` による AES-256-GCM 暗号文だけを渡します。
- 旧方式の停止済みセッションと、16 分以上進捗がない Queue セッションは `failed` へ遷移し、画面を無期限に待機させません。
- bootstrapは所有者とサイトだけでなく、通常のApplication Serviceを通して初期`/home`を作成・承認・公開します。既存の空サイトは管理画面を開いたときに同じ初期化を一度だけ実行します。
- **オプション `builds`:** 利用者の Cloudflare に **GitHub 連携** と `workers-ci.write` が必要（開発者向け）。
- 利用者のブラウザに **wrangler / D1 バインディング UI は出ない**
- 削除も同じOAuth Clientとコールバックを使う。`intent=destroy`のstateを一回限りで消費し、Operations WorkerへService Bindingで委譲するため、削除専用OAuth Clientは不要。
