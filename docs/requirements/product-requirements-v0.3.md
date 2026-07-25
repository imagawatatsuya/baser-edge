# baserEdge 製品要件 v0.3

> **Superseded** for product definition and priorities by [v0.4](./product-requirements-v0.4.md) and [ADR-0021](../adr/0021-baseredge-product-identity-no-host-migration.md). Functional acceptance criteria below remain useful except migration/compatibility clauses. 地図: [docs/README.md](../README.md).

## 製品定義

baserEdgeは、baserCMS 5のContent Manager、標準コンテンツ、サイト運用モデルをCloudflare向けに再実装するプロジェクトである。

EmDashなどの優れた汎用CMS実装を選択採用しながら、次を最上位原則とする。

1. **baserCMS Migration First:** baserCMSの優れたドメインと移行可能性を維持する。（**v0.4 で廃止**）
2. **AI Agent First:** AIを正式なPrincipalとするが、既定では直接公開を許可しない。
3. **Mobile Operations First:** 日常運用、差分確認、承認、公開、緊急対応をスマートフォンで完結させる。
4. **Structured Service First:** Human、Agent、UI、APIが同じApplication Serviceを使う。

## 完了済み acceptance criteria

### v0.1 Content vertical slice

- Page、型付きBlock、不変Revision、Agent ChangeSet、Approval、Human Publish、Audit、Outbox、公開Renderer。

### v0.2 Content Manager

- Folderだけが子Contentを保持する。
- Alias、再帰Copy、subtree Trash/Restore、移動影響分析、旧URL Redirect。

### v0.3 Asset and Preview

- コンテンツはファイルパスではなくAsset IDを保存する。
- UploadSessionは短時間・一回限りで、署名対象にMIME、最大サイズ、Object Keyを含める。
- Assetはupload完了前に公開されない。
- Structured DocumentからAssetReferenceを抽出し、Revisionと一緒に保存する。
- 公開中Revisionから参照されるAssetの削除を拒否する。
- PreviewSessionはContent Item、Revision ID、Revision Hash、Theme Releaseへ固定する。
- Preview tokenの改ざん、期限切れ、失効、Revision不一致を拒否する。
- Previewと公開は同じRendererを利用する。
- モバイル管理画面からAsset登録とPreview作成を実行できる。

## v0.4以降

- Article / Blog / Category / Tag / Listing / RSS
- QueueによるAsset quarantine、variant生成、projection処理
- Mobile approval production UI
- Passkey / Access integration
- ~~baserCMS database importer~~（v0.4: スコープ外。baserCMS 側が baserEdge 仕様へ合わせる）
