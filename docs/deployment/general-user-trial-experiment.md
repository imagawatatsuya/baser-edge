# 一般ユーザー立場のお試し実証（準備と実施）

**目的:** コマンドラインを使わない利用者が、GitHub Pages のスタートページ → **Deploy to Cloudflare** → 管理画面まで到達できることを確認する。

**正本（開設）:** [cloudflare-one-click-trial.md](cloudflare-one-click-trial.md)  
**片付け（開発者）:** [cloudflare-teardown.md](cloudflare-teardown.md)（スタック `trial`）

---

## 誰が何をするか

| 役割 | 人 | やること |
|------|-----|----------|
| **準備・観察** | メンテナ（あなた） | Pages 公開・リポジトリ push・失敗時ログ確認・片付け |
| **参加者** | 一般ユーザー想定のテスター | ブラウザだけ。スタート URL → Deploy → 管理画面で「管理をはじめる」 |

参加者に **npm / PowerShell / Wrangler を渡さない**。

---

## メンテナ準備チェックリスト（実証の前日）

### 1. リポジトリ

- [ ] リポジトリが **public**（GitHub Pages お試し導線の前提）
- [ ] `main` に最新の `docs/start/` と `deploy/one-click/` が入っている
- [ ] **Settings → Pages → Build and deployment → Source: GitHub Actions** を有効化（初回のみ）

### 2. Pages のスタート URL

push 後、Actions の **github-pages-start** が成功していること。

| 項目 | 値の例 |
|------|--------|
| スタート URL | `https://<org>.github.io/<repo>/start/` |
| Deploy ボタン | 上記ページ内。リポジトリ名は workflow が `__GITHUB_REPOSITORY__` を置換 |

ローカルで HTML だけ見る場合（Deploy は動かない）:

```powershell
npm run preview:start-page
# → deploy/_preview/start/index.html をブラウザで開く（ボタン URL の確認用）
```

### 3. Cloudflare（参加者側の前提を案内）

- [ ] Cloudflare **無料アカウント**を作れること
- [ ] （画像の公開配信まで試す場合）R2 サブスクリプション — [cloudflare-r2-and-media.md](cloudflare-r2-and-media.md)
- [ ] Deploy 完了後、**Workers Builds のログ**に管理画面 URL が出ることを参加者に伝える準備

### 4. 今回の実証で「しない」こと

- [ ] スタートページからの **削除**（未実装。片付けはメンテナが `trial` スタックで destroy またはダッシュボード）
- [ ] 参加者への **API トークン貼り付け**（Deploy ボタン経路では不要）

---

## 参加者向けスクリプト（そのまま渡せる）

1. スタートページを開く（メンテナから URL をもらう）
2. Cloudflare アカウントが無ければ [無料登録](https://dash.cloudflare.com/sign-up)
3. **Deploy to Cloudflare** をクリック
4. Cloudflare / GitHub の画面で **ログイン・許可**（初回はリポジトリコピー作成の案内あり）
5. デプロイが終わるまで待つ（**数分**）
6. ログまたは完了画面から **`/console/` で終わる管理画面 URL** を開く
7. **「管理をはじめる」** を 1 回押す
8. コンテンツ画面が表示されれば成功
9. （任意）メディアをアップロード — R2 無しのときは画面上部に **公開メディア配信は無効** の注意が出る

**困ったとき:** ビルドログをメンテナに共有。ターミナルは開かなくてよい。

---

## 成功基準（観察者用）

| # | 確認 |
|---|------|
| 1 | 参加者が CLI なしでデプロイ完了まで進めた |
| 2 | 管理 URL で `/console/` が開き、真っ白にならない |
| 3 | instant login でツリー画面に入れた |
| 4 | `GET …/v1/console/capabilities` が 200（開発者ツール・観察者確認可） |
| 5 | R2 なし構成なら capabilities バナーでメディア制限が分かる |
| 6 | 公開ページ URL（ログに出る `baser-edge-public-trial` 等）でトップが 200 |

---

## 失敗時に集める情報

- Workers Builds の **全文ログ**（特に `prove` / `deploy.mjs` 周辺）
- 参加者のブラウザ種別
- 管理 URL と `/console/assets/*.js` のステータス（観察者が代行可）
- Cloudflare ダッシュボードに Worker `baser-edge-api-trial` / D1 `baser-edge-trial` ができているか

---

## 実証後の片付け（メンテナ・開発者）

Deploy ボタンは **`BASER_CF_STACK=trial`** でリソースを作る（`default` とは別名）。

```powershell
cd <リポジトリ>
$env:BASER_CF_STACK = "trial"
npm run destroy:cloudflare
$env:BASER_CF_DESTROY = "1"
npm run destroy:cloudflare
```

R2 `baser-edge-assets-trial` が空でない場合は [cloudflare-teardown.md](cloudflare-teardown.md) の **10008** 手順。

---

## 製品ギャップ（次回以降）

- 管理コンソールから **ワンクリック削除**（OAuth）
- スタートページに **片付け** への誘導（コンソール実装後）

実証レポートはこのファイル末尾に日付・結果を追記してよい。

### 実施記録（テンプレ）

```text
日付:
参加者:
スタート URL:
結果: 成功 / 部分成功 / 失敗
メモ:
```
