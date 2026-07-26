# サイトの開設経路（どれを使うか）

## 利用者（プロビジョナー兼 CMS オーナー）

**正規ルートは 1 つだけ:** [ブラウザでお試し開設](cloudflare-one-click-trial.md)

1. [お試し開始ページ](https://baser-edge-trial-host.papehiko.workers.dev/start/)を開く
2. **Cloudflare でログインしてサイトを開設**
3. 完了後、管理画面 URL を開き **Cloudflare でログイン**

Git、npm、Wrangler、OAuth アプリの作成、Access の AUD、手動のオーナー binding は**不要**です。開設処理が OAuth シークレットの注入・オーナー登録・secure ログインの有効化まで行います。

## 開発者・メンテナ

| 経路 | 用途 |
|------|------|
| `npm run deploy:cloudflare` / `prove:cloudflare` | このリポジトリの検証・自分用スタックの手動デプロイ。**一般利用者向けではない** |
| `npm run pack:trial-release` + trial ホストのデプロイ | お試し開設に載せる固定リリースの更新（**コード変更後は必須**） |
| `npm run dev:stack` | ローカル開発 |

手動デプロイ後に CMS へ入るには、別途 OAuth または Access の設定が必要になることがあります。**面倒を避けるならお試し開設を使う**のが正しい運用です。

## セキュリティ

- お試し開設では **instant ログイン（URL だけで管理に入る）は使わない**
- 開設した Cloudflare アカウントだけが CMS オーナーとして D1 に登録される
- CMS セッションは **Cloudflare OAuth**（ホストが 1 セットの Client を保持し、各利用者の Worker に注入）で発行し、高リスク操作は **step-up** が必要

## 関連

- [利用ガイド](../user-guide.md)
- [cloudflare-one-click-trial.md](cloudflare-one-click-trial.md)
- [baseredge-cloudflare.md](baseredge-cloudflare.md)（開発者向け CLI）
- [ADR-0023](../adr/0023-trial-provision-without-github-actions.md)
