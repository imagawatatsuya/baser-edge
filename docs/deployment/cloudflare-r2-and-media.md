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

R2の有効化時に、CloudflareダッシュボードのBillingで請求プロファイルや支払い方法の設定を求められる場合があります。

公式: [Create billing profile](https://developers.cloudflare.com/billing/get-started/create-billing-profile/) · [Billing policy（承認済み手段）](https://developers.cloudflare.com/billing/billing-policy/)

- 利用可能な支払い方法、無料枠、単価は地域やCloudflareの現行ポリシーに従います。ダッシュボードと公式ドキュメントを正本としてください。
- カード追加時に一時的なオーソリが表示される場合があります。
- R2 利用不能・支払い失敗時は、ポリシー上 **R2 バケットへのアクセスが止まる**ことがあります（[Billing policy — R2](https://developers.cloudflare.com/billing/billing-policy/)）。

---

## R2 の有効化（利用者がダッシュボードで行う）

1. [Cloudflare Dashboard](https://dash.cloudflare.com/) → **Storage & databases** → **R2** → **Overview**
2. 表示に従い **R2 サブスクリプションのチェックアウト**を完了する（[Get started](https://developers.cloudflare.com/r2/get-started/)）
3. 支払い方法が未設定なら **Billing → Payment methods** で追加する

無料枠、ストレージ、Class A / Class B操作、egressの現在の条件は[公式R2 Pricing](https://developers.cloudflare.com/r2/pricing/)で確認してください。ドキュメント内に固定値を転載すると変更時に古くなるため、ここでは数値を正本にしません。

---

## baserEdge のデプロイ形態とメディア

| 形態 | いつ | R2 バケット | Worker `R2` | 公開 `/assets/…` | 主なコマンド / 条件 |
|------|------|-------------|-------------|------------------|---------------------|
| **既存 OAuth お試し Worker の更新** | 開設済み `*-api-trial` を最新 + D1 inline に | 再開設不要 | 同左 | **可** | `npm run refresh:oauth-trial -- --yes`（cmd は `set BASER_CF_PROVE=1` でも可） |
| **ブラウザ向けOAuthお試し** | 一般ユーザー向け標準 | 作らない | なし | **可（お試し上限あり）** | `wrangler.trial.jsonc` + `BASER_ASSET_STORAGE=d1-inline` |
| **開発者prove（メディアなし）** | R2未契約、または明示 | 作らない | なし | **可（D1 inline・最大3枚）** | `BASER_CF_TRIAL=1` + trial wrangler |
| **開発者prove + メディア** | R2 APIが使える | 作る | あり | **可** | `resolve-prove-media`が自動判定 |
| **既存スタックのメディア追加** | R2 を後から有効化したあと | 作る | 追加 | **可**（**再アップロード**要） | `enable-media:cloudflare` または **Deploy / prove の再実行**（自動アップグレード） |
| **フルスタック** | `wrangler.jsonc` 本番寄り | 作る | あり | **可** | `BASER_CF_FULL_STACK=1` + prove |

### 環境変数（デプロイ時）

| 変数 | 意味 |
|------|------|
| `BASER_CF_PROVE=1` | Cloudflare へ接続する同意（必須） |
| `BASER_CF_TRIAL=1` | **R2 を使わない**お試しを強制 |
| `BASER_CF_FULL_STACK=1` | `wrangler.jsonc` / `wrangler.public.jsonc` でフル構成 |
| `BASER_TRIAL_NO_R2=0` | スクリプト内部。R2 provision を有効化 |
| `BASER_ASSET_STORAGE=d1-inline` | **R2 なし trial のみ**。画像実体を D1 `asset_object_blobs` に保存（最大3枚・2MiB/枚）。`R2` binding があるときは無視 |

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

**ブラウザ向けOAuthお試し:** R2を有効にして開始ページから再開設しても、現在の固定リリースにはR2 bindingが追加されません。公開画像の確認には、開発者が`enable-media:cloudflare`またはR2を含むproveを実行する必要があります。

### メディアなしデプロイ（旧）と D1 inline（現 trial 既定）

- **API Worker のメモリのみ（`assetStorage: memory`）:** バイト列は API のメモリにのみ載り、公開 Worker からは読めない。D1 にメタデータだけ残る。
- **`BASER_ASSET_STORAGE=d1-inline`:** API・公開 Worker の両方が D1 BLOB から配信。お試しは **3 枚・2MiB/枚**（管理画面で自動圧縮）。R2 有効化後は **再アップロード**が必要。

---

## コンソール・ブラウザ（運用上の注意）

- 管理画面の静的ファイルは **API Worker** の `STATIC_ASSETS`（`/console/`）。修正後は `npm run build:admin-web` のあと **API Worker を再デプロイ**する。
- アップロード PUT でブラウザの `fetch` に **`Content-Length` ヘッダを付けない**（禁止ヘッダのため `Failed to fetch` になる）。実装は `apps/admin-web` 側で除去済み。
- 管理画面の一覧・画像選択は原寸ではなく、ブラウザが生成する最大256pxのWebP派生画像を使う。既存画像は初回だけ原寸へfallbackし、表示後に派生画像を補完する。
- 認証済み原寸と派生画像は共有CDNへ公開せず、`private`なブラウザキャッシュを使う。派生画像がまだないfallback応答は`no-store`とし、補完後の次回表示を妨げない。

```yaml
cloudflare_assumptions:
  checked_at: 2026-07-30
  target_plan: both
  official_pages:
    - https://developers.cloudflare.com/workers/runtime-apis/cache/
    - https://developers.cloudflare.com/r2/api/workers/workers-api-reference/
  relevant_limits:
    cpu: "クライアント側で縮小するためWorker画像変換CPUは追加しない"
    memory: "派生画像の入力上限256KiB"
    bundle: "小規模な管理画面ユーティリティのみ"
    subrequests: "派生画像取得は原寸取得と同数。既存画像の初回fallbackのみobject lookupが1回増える"
  design_margin: "通常表示は最大256px WebP。画像GET連打時のsession last_seen更新は5分に1回"
```

Cloudflare Cache APIはデータセンター間で自動複製されず、認証Cookieを含む管理資産を共有キャッシュへ載せないため、本経路ではブラウザのprivate cacheを採用する。

### 既存D1 inlineサイトの更新

`0012_asset_thumbnail_blobs.sql`は既存の原寸BLOB表を変更せず、派生画像専用表を追加するexpand-only migrationである。旧Workerは追加表を参照しないためmigration後も動作し、新Workerはmigration適用後にサムネイルを生成する。Workerだけを旧版へ戻しても原寸配信は継続し、未使用の派生表は残る（削除migrationは行わない）。

---

## 利用者向けチェックリスト（導入検討・デプロイ後）

1. [ ] Cloudflareアカウント作成
2. [ ] R2 Overviewで利用条件とBillingを確認
3. [ ] R2の有効化を完了
4. [ ] 開発者が`enable-media:cloudflare`またはR2込みproveを実行
5. [ ] API Workerと公開Workerの両方に`R2` bindingがある
6. [ ] 管理画面で画像を再アップロード
7. [ ] `GET https://<public-worker>/assets/<assetId>`が200

---

## 公式リンク（正本）

| トピック | URL |
|----------|-----|
| R2 はじめ方 | https://developers.cloudflare.com/r2/get-started/ |
| R2 料金・無料枠 | https://developers.cloudflare.com/r2/pricing/ |
| 請求プロファイル | https://developers.cloudflare.com/billing/get-started/create-billing-profile/ |
| 請求ポリシー | https://developers.cloudflare.com/billing/billing-policy/ |

技術的なデプロイ障害（D1 マイグレーション、Windows、console 真っ白など）は [cloudflare-prove-troubleshooting.md](cloudflare-prove-troubleshooting.md) を参照してください。スタック削除は [cloudflare-teardown.md](cloudflare-teardown.md)。
