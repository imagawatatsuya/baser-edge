# baserEdge

**baserEdge** は、Cloudflare 上で動くサイトツリー型CMSです。固定ページ、フォルダ、ブログ、メールフォーム、カスタムコンテンツなどを一つのツリーで管理し、編集・承認・公開までをブラウザで行えます。

> **現在はプレビュー版です。** お試し環境では簡易ログインを使用します。本番サイトとして運用する前に、[現在の制約](#現在の制約)と[本番運用の準備](docs/user-guide.md#本番運用について)を確認してください。

[ブラウザで試す](https://baser-edge-trial-host.papehiko.workers.dev/start/) · [利用ガイド](docs/user-guide.md) · [ドキュメント一覧](docs/README.md)

## ブラウザで試す

必要なのはCloudflareアカウントだけです。GitHubアカウント、コマンド操作、npm、Wrangler、APIトークンの貼り付けは、通常のお試し手順では必要ありません。

1. [お試し開始ページ](https://baser-edge-trial-host.papehiko.workers.dev/start/)を開く
2. **Cloudflareでログインしてサイトを開設**を押す
3. Cloudflareで対象アカウントと権限を確認し、許可する
4. 開設が完了するまで画面を閉じずに待つ
5. 表示された**管理画面URL**を開き、**管理をはじめる**を押す

完了画面には次の2つのURLが表示されます。

| URL | 用途 |
|---|---|
| 管理画面URL（末尾が `/console/`） | ページの作成、編集、承認、公開 |
| 公開サイトURL | 訪問者が見るサイト。最初は公開済みの `/home` が用意されます |

作成されるWorkerとD1は、利用者自身のCloudflareアカウント内に置かれます。開設の詳しい流れ、画像利用、削除、トラブル対応は[利用ガイド](docs/user-guide.md)を参照してください。

## できること

- Page、Folder、Alias、Blog、Mail Form、Custom Contentを同じサイトツリーで管理
- 下書きRevision、承認依頼、承認後の公開
- ページの移動、コピー、ゴミ箱、復元と旧URLからのリダイレクト
- ブログ記事、カテゴリ、タグ、RSS
- カスタム項目・テーブル・エントリー
- メールフォームの確認画面、送信、通知
- Theme Releaseを使った表示切り替えとプレビュー
- メディアのアップロードと利用状況に応じた削除制御
- Human、Agent、Service、Pluginに共通する権限・監査モデル

AI Agentは変更案と承認依頼を作成できますが、既定のポリシーでは直接公開できません。公開は人間による承認を通ります。

## 基本的な使い方

1. 管理画面の**コンテンツ**でページやフォルダを作る
2. 編集画面でタイトルと本文を保存する
3. 公開の承認を行う
4. 公開サイトURLで表示を確認する

初期状態では「ホーム」という公開済みページがあります。管理画面から編集して、最初のサイト内容として利用できます。

## 現在の制約

- お試し環境の**管理をはじめる**は実証用の簡易ログインです。本番認証ではPasskey、Session、CSRF、Step-up認証の設定が必要です。
- R2を有効にしていないお試し環境では、管理画面でメディアを試せますが、公開サイトでの画像配信は利用できません。
- Pluginの基盤とAPIはありますが、第三者Pluginのインストールや権限同意を完結させる管理画面は未完成です。
- baserCMS 5のPHP実行環境や自動移行機能は含みません。詳しくは[baserCMSとの関係](docs/compatibility/relationship-to-basercms.md)を参照してください。
- プレビュー版のため、重要なデータを置く前にバックアップとCloudflare側の利用状況を確認してください。

お試し環境が不要になった場合は、開始ページの**お試しをやめる**から削除できます。対象は`trial`のお試し環境で、削除後は復元できません。

## ドキュメント

| 読む人 | 文書 |
|---|---|
| 初めて試す方 | [利用ガイド](docs/user-guide.md) |
| 製品の範囲を知りたい方 | [製品要件 v0.4](docs/requirements/product-requirements-v0.4.md) |
| baserCMSとの違いを知りたい方 | [baserCMSとの関係](docs/compatibility/relationship-to-basercms.md) |
| 開発・コントリビュートする方 | [開発者向けガイド](docs/developer-guide.md) |
| すべての文書を探す方 | [ドキュメント一覧](docs/README.md) |

版ごとの実装経緯、ADR、過去の計画はREADMEではなく、[ドキュメント一覧](docs/README.md)から参照できます。

## 開発者向けクイックスタート

必要環境はNode.js 22以降です。

```bash
npm install
npm run check
npm run dev:stack
```

起動後に `http://localhost:8787/console/` を開きます。主要コマンド、ローカル構成、Cloudflareへの開発者向けデプロイは[開発者向けガイド](docs/developer-guide.md)にまとめています。

## 製品の位置づけ

- 製品名: **baserEdge**
- 現行バージョン: **v0.9 Preview**
- 人間向け管理UI: `apps/admin-web`（`/console/`）
- 実行基盤: Cloudflare Workers、D1、任意のR2
- 製品モデル: サイトツリー中心のCMS

baserEdgeはbaserCMSプロジェクトの後継や互換実装を宣言するものではありません。運用上わかりやすい用語とサイトツリーの考え方を参考にした、別のCloudflare向けCMSです。
