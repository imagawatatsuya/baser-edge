# Cloudflare R2 と baserEdge メディア配信

baserEdge の **画像・ファイル**は、設計上 **R2（オブジェクトストレージ）** に実体を置き、D1 にメタデータを置きます。公開サイトの `/assets/<assetId>` は **公開 Worker が R2 から配信**します。

**関連:** [baseredge-cloudflare.md](baseredge-cloudflare.md) · [cloudflare-prove-troubleshooting.md](cloudflare-prove-troubleshooting.md)

---

## 3 つの別問題（混同しない）

| # | 質問 | 満たすもの | baserEdge 上の結果 |
|---|------|------------|-------------------|
| 1 | Cloudflare アカウントはあるか | サインアップ | Workers / D1 はデプロイ可 |
| 2 | **R2 を使えるか** | [R2 サブスクリプション（チェックアウト）](https://developers.cloudflare.com/r2/get-started/) + 請求プロファイル | `wrangler r2 bucket list` 等が成功 |
| 3 | **デプロイに R2 バインディングがあるか** | prove / `enable-media:cloudflare` / フルスタック | API・公開 Worker の `env.R2` |

**支払い方法を登録しただけでは (2) は自動では満たされません。**  
**R2 が使えても、お試しデプロイのまま (3) が無いと公開 URL では画像は出ません**（一覧に載るだけ、など）。

---

## Cloudflare の請求と支払い方法

製品購入・従量課金サービス（**R2 を含む**）には、ダッシュボードの **Billing** で **プライマリの支払い方法**が必要です。

公式: [Create billing profile](https://developers.cloudflare.com/billing/get-started/create-billing-profile/) · [Billing policy（承認済み手段）](https://developers.cloudflare.com/billing/billing-policy/)

| 種別 | 例 |
|------|-----|
| カード | Visa、Mastercard、American Express、Discover、UnionPay |
| ウォレット / その他 | PayPal、Apple Pay、Google Pay、Stripe Link |
| その他 | ダッシュボードで案内される手段（例: 一部フローでの USDC 等 — [Stablecoin payments](https://developers.cloudflare.com/billing/payment-methods/stablecoin-payments/)） |

- カード追加時に **一時的なオーソリ（保留）** がかかることがあります（発行体により表示が異なる）。**無料枠内の利用だけなら月額の固定料金プランに入る必要はない**一方、**R2 の利用は従量課金**です（下記無料枠）。
- R2 利用不能・支払い失敗時は、ポリシー上 **R2 バケットへのアクセスが止まる**ことがあります（[Billing policy — R2](https://developers.cloudflare.com/billing/billing-policy/)）。

---

## R2 の有効化（利用者がダッシュボードで行う）

1. [Cloudflare Dashboard](https://dash.cloudflare.com/) → **Storage & databases** → **R2** → **Overview**
2. 表示に従い **R2 サブスクリプションのチェックアウト**を完了する（[Get started](https://developers.cloudflare.com/r2/get-started/)）
3. 支払い方法が未設定なら **Billing → Payment methods** で追加する

**無料枠（毎月・公式 [R2 Pricing](https://developers.cloudflare.com/r2/pricing/)）の目安:**

| 項目 | 無料枠 |
|------|--------|
| ストレージ | 10 GB-month / 月 |
| Class A 操作 | 100 万リクエスト / 月 |
| Class B 操作 | 1,000 万リクエスト / 月 |
| インターネットへの egress | 無料（ポリシーは公式を参照） |

小規模な CMS メディア検証は、多くの場合 **無料枠内**に収まります。超過分のみ課金されます。

---

## baserEdge のデプロイ形態とメディア

| 形態 | いつ | R2 バケット | Worker `R2` | 公開 `/assets/…` | 主なコマンド / 条件 |
|------|------|-------------|-------------|------------------|---------------------|
| **お試し（メディアなし）** | R2 未契約、または明示 | 作らない | なし | **不可**（404 等） | `BASER_CF_TRIAL=1` 付き prove |
| **お試し + メディア** | R2 API が使える | 作る | あり（trial wrangler） | **可** | 既定 prove（`resolve-prove-media` が自動判定） |
| **既存スタックのメディア追加** | 一度お試しだけデプロイした後 | 作る | 追加 | **可**（**再アップロード**要） | `npm run enable-media:cloudflare` |
| **フルスタック** | `wrangler.jsonc` 本番寄り | 作る | あり | **可** | `BASER_CF_FULL_STACK=1` + prove |

### 環境変数（デプロイ時）

| 変数 | 意味 |
|------|------|
| `BASER_CF_PROVE=1` | Cloudflare へ接続する同意（必須） |
| `BASER_CF_TRIAL=1` | **R2 を使わない**お試しを強制 |
| `BASER_CF_FULL_STACK=1` | `wrangler.jsonc` / `wrangler.public.jsonc` でフル構成 |
| `BASER_TRIAL_NO_R2=0` | スクリプト内部。R2 provision を有効化 |

PowerShell 例:

```powershell
$env:BASER_CF_PROVE = "1"
npm run prove:cloudflare
```

メディア込みに既存スタックだけ直す場合:

```powershell
$env:BASER_CF_PROVE = "1"
npm run enable-media:cloudflare
```

### なぜ「アップロード成功」なのに表示されないことがあるか

- **メディアなしデプロイ:** バイト列は API Worker の**メモリ**にのみ載り、公開 Worker は**別インスタンス**のため R2 もメモリも共有されない。D1 のメタデータだけ残る。
- **R2 追加後:** 過去にアップロードしたオブジェクトは R2 に無いので **再アップロード**が必要。

---

## コンソール・ブラウザ（運用上の注意）

- 管理画面の静的ファイルは **API Worker** の `STATIC_ASSETS`（`/console/`）。修正後は `npm run build:admin-web` のあと **API Worker を再デプロイ**する。
- アップロード PUT でブラウザの `fetch` に **`Content-Length` ヘッダを付けない**（禁止ヘッダのため `Failed to fetch` になる）。実装は `apps/admin-web` 側で除去済み。

---

## 利用者向けチェックリスト（導入検討・デプロイ後）

1. [ ] Cloudflare アカウント作成
2. [ ] Billing に支払い方法（上表のいずれか）を登録
3. [ ] R2 Overview で **サブスクリプション / チェックアウト**完了
4. [ ] `npm run prove:cloudflare` 実行時、ログに **メディア配信込み**または意図的な **お試し（R2 なし）** が分かる
5. [ ] 画像が必要なら `GET https://<public-worker>/assets/<assetId>` が **200**（お試しのみデプロイした場合は `enable-media:cloudflare` → 再アップロード）
6. [ ] 管理コンソールでアップロード後、公開 URL を開いて確認

---

## 公式リンク（正本）

| トピック | URL |
|----------|-----|
| R2 はじめ方 | https://developers.cloudflare.com/r2/get-started/ |
| R2 料金・無料枠 | https://developers.cloudflare.com/r2/pricing/ |
| 請求プロファイル | https://developers.cloudflare.com/billing/get-started/create-billing-profile/ |
| 請求ポリシー | https://developers.cloudflare.com/billing/billing-policy/ |

技術的なデプロイ障害（D1 マイグレーション、Windows、console 真っ白など）は [cloudflare-prove-troubleshooting.md](cloudflare-prove-troubleshooting.md) を参照してください。スタック削除は [cloudflare-teardown.md](cloudflare-teardown.md)。
