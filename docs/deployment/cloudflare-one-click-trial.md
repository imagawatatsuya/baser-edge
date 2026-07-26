# ブラウザだけでbaserEdgeを試す

一般ユーザー向けの詳しい操作は[利用ガイド](../user-guide.md)が正本です。この文書では、お試し開設の経路とCloudflare上で行われることを説明します。

## 現在の標準経路

1. [お試し開始ページ](https://baser-edge-trial-host.papehiko.workers.dev/start/)を開く
2. Cloudflare OAuthでログイン・許可する
3. 開設画面で進捗を確認する
4. 完了後に表示される管理画面URLと公開サイトURLを開く

通常の利用者にGitHubアカウント、Deploy to Cloudflare画面、APIトークン、npm、Wranglerは要求しません。

## 利用者のCloudflareに作られるもの

- 管理APIと管理画面を配信するWorker
- 公開サイトを配信するWorker
- CMSデータを保存するD1
- 開設時だけ使用し、完了後に削除されるMigration Worker
- R2を有効にした構成ではメディア用R2

サイトのWorkerとD1は利用者自身のCloudflareアカウントに作られます。お試し開始ホストはOAuth、進捗、固定リリースの配布を担当し、利用者のCMSデータを共有ホスティングへ保存しません。

## 開設処理

開設は一つの長いWorker処理ではなく、Cloudflare Queueのチェックポイントに分けて実行します。

1. D1の作成
2. D1 Migration
3. 管理画面Assetsの準備
4. API Workerと公開Workerの配置
5. Secretと環境変数の設定
6. 初期サイト、所有者、公開済みホームページの作成
7. 管理画面と公開サイトの配信確認

完了画面にはURLを残し、自動的に別ページへ移動しません。利用者は管理画面URLと公開サイトURLを確認してから開けます。

## 完了の目印

- 管理画面URLは`/console/`で終わる
- 管理画面で**サイトの準備ができました**と表示される
- **管理をはじめる**でコンテンツツリーへ入れる
- 公開サイトのルートURLから公開済み`/home`を表示できる

Workerの`/health`だけでは開設成功と判定しません。管理画面のHTMLが200で配信されることと、D1の初期化完了を確認します。

## お試しをやめる

開始ページの**お試しをやめる**から、同じCloudflareアカウントでOAuth認証して`trial`環境を削除できます。開設ホストが既存のOAuthコールバックで一回限りの認証grantを受け取り、削除本体をService Binding経由でCloud Operations Workerへ委譲します。削除専用の別OAuth Clientは使用しません。復元できないため、必要な内容を退避してから実行してください。

開発者がCLIで片付ける場合は[Cloudflare環境の削除](cloudflare-teardown.md)を参照してください。

## 代替経路

`deploy/one-click/`のCloudflare Deployボタンと、開発者向け`prove:cloudflare`はフォールバックとして残しています。一般ユーザー向けの標準経路ではありません。

## 関連文書

- [利用ガイド](../user-guide.md)
- [一般ユーザー実証](general-user-trial-experiment.md)
- [お試し開設ホスト](trial-oauth-host.md)
- [Cloudflareのみで完結する開設](trial-provision-cloudflare-only.md)
- [ADR-0023](../adr/0023-trial-provision-without-github-actions.md)
