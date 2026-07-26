# Cloudflare お試しスタックの片付け（destroy）

開発者が **CLI で** baserEdge の prove / Deploy 試行で作ったリソースを削除するときの正本です。

**一般ユーザー向け:** [お試し開始ページ](https://baser-edge-trial-host.papehiko.workers.dev/start/)の**お試しをやめる**から、Cloudflare OAuthで`trial`環境を削除できます。Cloud Operations Workerの安全境界は[ADR-0022](../adr/0022-cloud-operations-worker-security.md)を参照してください。

関連: [baseredge-cloudflare.md](baseredge-cloudflare.md) · [cloudflare-prove-troubleshooting.md](cloudflare-prove-troubleshooting.md) · [cloudflare-r2-and-media.md](cloudflare-r2-and-media.md)

---

## 開発者向け: `destroy:cloudflare`

### 手順（PowerShell）

```powershell
cd <リポジトリルート>
npm run destroy:cloudflare
# 破棄対象を確認したら:
$env:BASER_CF_DESTROY = "1"
# スタックが default 以外なら例: $env:BASER_CF_STACK = "lab"
npm run destroy:cloudflare
```

`npx wrangler login` 済み・**スタックを作った Cloudflare アカウント**で実行する。

### 削除されるもの（default スタックの例）

| リソース | 名前の例 |
|----------|----------|
| API Worker | `baser-edge-api` |
| 公開 Worker | `baser-edge-public` |
| D1 | `baser-edge`（データごと） |
| R2 バケット | `baser-edge-assets`（**空のときのみ**） |
| ローカル | `deploy/cloudflare-state.json`（または `cloudflare-state.<stack>.json`） |
| ローカル | ルート `wrangler*.jsonc` → `REPLACE_ME` / `example.invalid` に戻す |

`deploy/cloudflare-state.json` を消したあと **もう一度 destroy を走らせても** Cloudflare 上の残りは自動では消えない（state 無しのため）。

### 削除されないもの

- Cloudflare **アカウント**・請求プロファイル・**R2 サブスクリプション契約**そのもの
- Deploy ボタンで作った **GitHub 上のリポジトリコピー**
- ローカルの `deploy/cloudflare-secrets.json`（任意で手動削除可）
- **`ob-…` オンボーディング専用スタック** — 別 API（`apps/onboarding-web`）経由。本コマンドは `BASER_CF_STACK` に従う通常名のみ

---

## よくある結果と対処

### R2: `not empty` [code: 10008]

バケットにオブジェクトが残っている。Worker / D1 は既に消えていることが多い。

1. ダッシュボード → **R2** → `baser-edge-assets`（またはスタック付き名）→ オブジェクトをすべて削除
2. バケット削除、または:

```powershell
npx wrangler r2 bucket delete baser-edge-assets
```

**Wrangler 4 には `wrangler r2 object list` がない**（`object get|put|delete` のみ）。キー一覧は **ダッシュボード**か [R2 List objects API](https://developers.cloudflare.com/api/resources/r2/subresources/buckets/subresources/objects/methods/list/) を使う。オブジェクトキーの例: `workspaces/<workspaceId>/assets/<assetId>/<filename>`。

将来: `destroy` 前にバケットを空にする処理をスクリプトに足す余地あり。

### R2: `does not exist` [code: 10006]

**既にバケットが無い（削除済み）。** エラーに見えても片付け完了でよい。

確認:

```powershell
npx wrangler r2 bucket list
```

### destroy 後も R2 だけ残る

`10008` で R2 削除が失敗した場合、state は削除済みのため **手動で R2 を空にして削除**（上記）。再 `destroy` は不要。

### Windows で `UV_HANDLE_CLOSING` など

Wrangler 終了時のノイズとして報告がある。**削除成否は直前の API メッセージ**（Deleted / 10008 / 10006）で判断する。

---

## 管理コンソールの capabilities バナー

`GET /v1/console/capabilities` の `assetPublicDelivery: false` は **R2 バインディング無し**の説明用。片付け後は Worker 自体が無いため URL は 404 になる。

---

## 削除経路

| 対象 | 片付け導線 |
|------|------------|
| 一般ユーザーのお試し | 開始ページの**お試しをやめる** → 開設OAuth → Service Binding → Cloud Operations Worker |
| 開発者の`default` / `lab`等 | `destroy:cloudflare` |
| OAuth削除が利用できない場合 | Cloudflareダッシュボードで対象リソースを確認して手動削除 |

開設と削除は同じ有効なOAuth Clientと登録済みコールバックを使用します。開設ホストは一回限りのgrantを受け取り、共有Secretで認証したService BindingからCloud Operations Workerへ削除を委譲します。OAuthアクセストークンをブラウザへ返さず、公開された汎用Cloudflare APIも作りません。

Cloud Operations Workerは固定レシピとallowlistに従い、`trial`以外のリソースを削除対象にしません。現在の標準trialはR2を作らないため、OAuth削除もR2 APIを呼びません。Operations Worker側ではグローバル上限、アカウント別上限、同時実行制限、Cloudflare API呼び出し上限を適用します。

---

## 再開

```powershell
$env:BASER_CF_PROVE = "1"
npm run prove:cloudflare
```

新しい D1・Worker・（R2 利用可なら）バケットが作られる。過去のサイトデータは復元できない。
