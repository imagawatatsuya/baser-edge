# 顧客のCloudflareアカウントで行うゼロタッチ実証

## 製品ストーリー

利用者は自分のCloudflareアカウントを用意し、ブラウザのOAuth導線から自分用のbaserEdgeを開設します。CMSデータと実行リソースは利用者アカウント内のWorkers、D1、任意のR2に置かれます。

| 利用者が行うこと | 利用者が行わないこと |
|---|---|
| Cloudflareアカウントを用意する | リポジトリのclone |
| OAuth画面で対象アカウントと権限を確認する | npm、Wrangler、PowerShellの実行 |
| 表示された管理画面URLを開く | D1やWorkerの手動作成 |
| **管理をはじめる**を押す | APIトークンの作成・貼り付け |

## 現在の体験

```text
お試し開始ページ
  → Cloudflare OAuth
  → 工程別の開設進捗
  → 管理画面URLと公開サイトURL
  → 「管理をはじめる」
  → サイトツリー
  → 初期ホームを編集・公開
```

一般ユーザー向けの開始URLと操作は[利用ガイド](../user-guide.md)を参照してください。

## 実証で確認する価値

- CMSを初めて使う人がCLIなしで管理画面へ到達できる
- 利用者自身のCloudflareアカウントへ分離して配置される
- 固定ページ、ブログ、フォーム等を同じサイトツリーで理解できる
- 保存と公開が分かれ、承認を通して公開できる
- 開設結果として管理画面URLと公開サイトURLを確認できる
- 不要になった`trial`環境をOAuthで削除できる

## プレビューと本番の違い

| 項目 | お試し | 本番運用 |
|---|---|---|
| ログイン | **管理をはじめる**簡易ログイン | Passkey / WebAuthn |
| URL | `workers.dev` | 独自ドメインを推奨 |
| メディア | R2なしが既定 | 公開画像を使う場合はR2 |
| 監視・バックアップ | 実証範囲 | 運用者が設計 |
| Plugin | 基盤・API中心 | 配布・署名・同意UIは今後 |

## 開発者向けの代替確認

ブラウザ向けOAuth導線を使わず、開発者が自分のCloudflareアカウントで同じ主要経路を確認する場合:

```bash
npm install
npx wrangler login
npm run plan:cloudflare
BASER_CF_PROVE=1 npm run prove:cloudflare
```

この経路は一般利用者向け手順ではありません。ローカルだけで確認する場合は`npm run prove:local`を使用します。

## 関連文書

- [一般ユーザー実証チェックリスト](general-user-trial-experiment.md)
- [ブラウザだけで試す](cloudflare-one-click-trial.md)
- [R2とメディア](cloudflare-r2-and-media.md)
- [Cloudflare環境の削除](cloudflare-teardown.md)
