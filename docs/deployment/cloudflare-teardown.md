# Cloudflare お試しスタックの片付け（destroy）

開発者が **CLI で** baserEdge の prove / Deploy 試行で作ったリソースを削除するときの正本です。

**一般ユーザー向け:** GitHub Pages の `/start/` には削除ボタンはない（開設は Deploy のみ）。**今後**は管理コンソールから OAuth でワンクリック削除を予定。現状は本ドキュメント（開発者）か [Cloudflare ダッシュボード](https://dash.cloudflare.com/) の手動削除。

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

## 製品ロードマップ（メモ）

| 時期 | 片付け導線 |
|------|------------|
| 現状 | 開発者: `destroy:cloudflare` / ダッシュボード手動 |
| 予定 | 一般ユーザー: `/console/` から Cloudflare OAuth でワンクリック削除（`runDestroy` 共通化） |

---

## 再開

```powershell
$env:BASER_CF_PROVE = "1"
npm run prove:cloudflare
```

新しい D1・Worker・（R2 利用可なら）バケットが作られる。過去のサイトデータは復元できない。
