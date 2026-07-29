# Cloudflare 実証デプロイ — トラブルシュートと制限

`npm run prove:cloudflare` / `provision:cloudflare` / `deploy:cloudflare` を初めて通すときに起きやすい事象の整理です。Wrangler 4 系を前提にしています。**R2・カード登録・メディア可否の説明は [cloudflare-r2-and-media.md](cloudflare-r2-and-media.md) に集約**しています。

関連: [baseredge-cloudflare.md](baseredge-cloudflare.md) · [cloudflare-r2-and-media.md](cloudflare-r2-and-media.md)（**R2 / 請求 / 支払い手段の正本**） · [cloudflare-one-click-trial.md](cloudflare-one-click-trial.md)

---

## お試しモード（既定）でできること・できないこと

| できること | できないこと / 制限 |
|------------|---------------------|
| D1・API Worker・公開 Worker・管理コンソール `/console/` | **`BASER_CF_TRIAL=1` 時は R2 なし**（それ以外は R2 利用可アカウントで自動メディア込みのことが多い） |
| instant login によるデモログイン（`BASER_ENV=preview`） | 本番相当の Passkey 運用 |
| コンテンツの作成・公開（HTML ページ） | **メディアの公開 URL での画像配信**（後述） |

### メディアをアップロードしても公開サイトで画像が出ない

**症状:** 管理画面のメディア一覧には載るが、`https://<public-worker>/assets/<assetId>` が 404、またはページ上で画像が欠ける。

**理由（設計）:** [cloudflare-r2-and-media.md](cloudflare-r2-and-media.md) の「3 つの別問題」を参照。

- 支払い方法（Visa / Mastercard / Amex / Discover / UnionPay、PayPal、Apple Pay、Google Pay、Link 等）の登録 ≠ **R2 サブスクリプション** ≠ **Worker の R2 バインディング**。
- `BASER_CF_TRIAL=1` または過去の R2 なしデプロイ: バイト列は API のメモリのみ。公開 Worker からは読めない。

**対処:**

```bash
# 既存スタックをメディア配信対応に（R2 バケット + Worker 再デプロイ）
npm run enable-media:cloudflare
```

その後 **画像を再アップロード**（過去分のバイト列は復元できない）。

新規 prove 時: R2 が使えるアカウントでは自動でメディア込み。明示的にお試しのみ: `BASER_CF_TRIAL=1`。フル `wrangler.jsonc`: `BASER_CF_FULL_STACK=1`。

---

## 環境変数とシェル

### PowerShell で `BASER_CF_PROVE=1` が効かない

bash 形式 `VAR=1 command` は PowerShell では使えない。

```powershell
$env:BASER_CF_PROVE = "1"
npm run prove:cloudflare
```

### 非対話で Wrangler の確認をスキップしたい

`d1 migrations apply` などの Y/n 確認は、CI 扱いでスキップされる。リポジトリの prove スクリプトは `CI` / `WRANGLER_CI` を付与する実装に寄せている。

---

## D1 プロビジョンと `database_id`

### `Could not parse D1 database_id from`（Wrangler 4）

`wrangler d1 create` の出力形式が変わり、旧パーサが UUID を拾えないことがある。対策として **JSON 形式の `database_id` パース**と、**同名 DB が既にあるときは `d1 list --json` で ID を引く**処理を入れている。

### `Invalid uuid` / `REPLACE_ME` で API が失敗

**原因:** 手動の `wrangler d1 …` が **デフォルトの `wrangler.jsonc`** を読んでいる一方、お試しデプロイは **`wrangler.trial.jsonc`** に正しい `database_id` を書いている、など **設定ファイルの取り違え**。

**対処:**

- `wrangler d1 delete` / `migrations apply` などは、デプロイと同じ `--config` を使う（お試しなら `wrangler.trial.jsonc`）。
- provision 後は **trial / full の各 wrangler 設定**に `database_id` が揃うようスクリプト側でパッチする（手元の `wrangler.jsonc` だけ `REPLACE_ME` のままにしない）。

---

## D1 マイグレーション（リモート）

### `incomplete input`（リモートのみ・ローカル D1 は成功）

**原因:** リモート D1 の control-plane query 経路が、`CREATE TRIGGER ... BEGIN ...; ... END` 内部のセミコロンを文の区切りとして扱い、完全なトリガーを送っても `SQLITE_ERROR incomplete input` を返すことがある。ファイル単位の `d1 migrations apply` だけでなく、同じ query 経路へトリガーを1文ずつ送る実装でも発生する。

**対処（OAuth trial-host）:** 利用者アカウントへ認証付きの一時 Migration Worker を配置し、D1 binding の `prepare(sql).run()` で完全なSQLite文を実行する。30文ずつのQueueチェックポイントに分け、全スキーマと `d1_migrations` 台帳を確認した後に一時Workerを削除する（`packages/cf-trial-provision/src/apply-migrations-runner.ts`）。

開発者CLIの `prove:cloudflare` / `deploy:cloudflare` は別経路である。ここで同じエラーが出た場合、OAuth trial-hostの修正だけでは直らないため、新しい使い捨て `BASER_CF_STACK` を使うか、D1 binding経路へ切り替える。

### 再実行で `table workspaces already exists`

**原因:** スキーマは既に入っているのに **`d1_migrations` 台帳が空**（途中失敗・手動 SQL・旧 `migrations apply` の失敗など）。

**対処:** スキーマが揃っているときは **SQL を再実行せず台帳だけ同期**する回復ロジックを入れている。それでも不整合なら **D1 削除 → state 削除 → prove やり直し**が確実。

```bash
# 例: お試し config で DB 名を削除
npx wrangler d1 delete baser-edge --config wrangler.trial.jsonc
# deploy/cloudflare-state.json を削除してから prove
```

---

## Windows 固有

### `d1 execute --command "SELECT …"` が `Unknown arguments: name, FROM, …`

**原因:** PowerShell + `shell` 経由で、スペース入り SQL が **複数引数に分割**される。

**対処:** SQL は **`--file` に書き出して実行**する（問い合わせ・マイグレーションとも）。

---

## デプロイ後のログイン・管理 UI

### `/v1/auth/instant-login` が 404（Instant login is not available）

**原因:** `BASER_INSTANT_LOGIN` / `BASER_INSTANT_OWNER_HINT` が Worker に正しく載っていない。`wrangler.jsonc` への **JSON の二重エスケープ**や、値に `"` を含む vars の **置換正規表現の誤り**など。

**対処:** bootstrap 後に owner hint を **一度だけ JSON.stringify して** vars に書き、API Worker を **再デプロイ**する。prove 再実行時も instant login 用の再デプロイを行う実装に寄せている。

### `/console/` は真っ白（HTML は 200）

**確認:** ブラウザの開発者ツールで `/console/assets/*.js` の **Content-Type** を見る。`text/html` なら **JS の代わりに index.html（SPA フォールバック）** が返っている。

**原因:** Vite の `base: "/console/"` により HTML は `/console/assets/…` を参照するが、Wrangler Static Assets の実体は `dist/assets/…`（**URL から `/console` プレフィックスを外す必要**がある）。

**対処:** API Worker が `/console/*` を配信するとき、assets バインディングには **`/console` を除いたパス**で渡す（`mapConsoleUrlToAssetPath`）。修正後は **API Worker の再デプロイ**が必要。

---

## 診断のしかた（汎用）

| 確認項目 | 期待 |
|----------|------|
| `GET https://<api-worker>/health` | 200 JSON |
| `GET https://<api-worker>/console/` | HTML に `/console/assets/*.js` |
| 上記 JS URL | **200** かつ `Content-Type: application/javascript`（または `text/javascript`） |
| 公開ページを2回GET | 1回目`x-baser-edge-cache: MISS`、同じcoloの2回目`HIT`（Cacheはcoloローカル） |
| 公開ページの`Server-Timing` | `baser;dur=...`でWorker内処理時間を確認 |
| `GET https://<public-worker>/assets/<id>`（フルスタック時） | 画像の 200（お試し R2 なしでは 404 が仕様） |
| `deploy/cloudflare-state.json` | `d1DatabaseId`・`apiUrl`・`bootstrap` / `demoHint` |

---

## ブラウザ向けお試し導線との関係

ブラウザ向けお試しは[cloudflare-one-click-trial.md](cloudflare-one-click-trial.md)が正本。現在の標準経路はOAuth trial-hostで、GitHub PagesとDeployボタンは必須ではない。**D1 Migration、`/console/`のHTMLとAssets、R2なし時のメディア制限**を確認する。片付けは開始ページのOAuth削除、または開発者向け[cloudflare-teardown.md](cloudflare-teardown.md)を使用する。

---

## 片付け（destroy）の要点

詳細: [cloudflare-teardown.md](cloudflare-teardown.md)

| 事象 | 意味 |
|------|------|
| 事前に `npm run destroy:cloudflare` だけ | 破棄対象の確認。`BASER_CF_DESTROY=1` なしでは実行しない |
| R2 `10008` not empty | ダッシュボードでオブジェクト削除後に `wrangler r2 bucket delete` |
| R2 `10006` does not exist | バケット削除済み → 完了 |
| Wrangler 4 | `r2 object list` なし |

---

## まとめ（再発防止の観点）

1. **メディア公開には R2 バインディング** → ルール全体は [cloudflare-r2-and-media.md](cloudflare-r2-and-media.md)。`BASER_CF_TRIAL=1` のみ R2 なしが既定。
2. **Wrangler 設定は trial / default を混ぜない**（`database_id`・migrate・delete）。
3. **トリガーを含むリモート D1 マイグレーションは control-plane query ではなく D1 binding 経由**で実行する。
4. **Windows は env 構文と `d1 execute --file`** に注意。
5. **`/console/assets/*`は同じURL構造で配置し、root `index.html`をSPA fallbackに使う**。どちらもStatic Assetsから直接配信する。
6. **公開D1 readはSessions API**、公開レスポンスはCache APIを使う。管理ビューとPreviewはbypassする。

これらは「一度だけのイレギュラー」ではなく、Cloudflare 上で prove を商品化するうえでの **定常的なチェックリスト**として使える。
