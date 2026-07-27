# ADR-0013: Asset ID・署名付きUploadSession・保存済みPreviewSessionを採用する

- Status: Accepted
- Date: 2026-07-25

## Context

baserCMSとBurgerEditorは、本文へファイルパスを保存し、ログイン中の管理画面状態を利用してプレビューする。Cloudflare移植では、R2 objectの配置、AI/モバイル操作、Revision承認、期限付き共有を一貫して扱う必要がある。

## Decision

1. コンテンツはObject Keyや公開URLではなくAsset IDを参照する。
2. Upload開始時にAssetとUploadSessionを作り、HMAC署名付き短時間URLを発行する。
3. v0.3では署名付きAPI Worker endpointがR2 Bindingへ保存する（**trial の `BASER_ASSET_STORAGE=d1-inline` 時は D1 BLOB・最大3枚・画像 sniff**）。
4. UploadSessionは一回の成功で閉じ、再利用を拒否する。
5. Revision保存時にAssetReferenceを抽出する。
6. 公開中Revisionから参照されるAssetの削除を拒否する。
7. PreviewはPOST bodyや端末内編集中データではなく、保存済み不変Revisionへ固定する。
8. PreviewSessionをD1へ保存し、署名、期限、失効、Revision Hashを検証する。
9. Previewと公開は同じRendererを使う。

## Consequences

### Positive

- URL変更やR2 key変更からコンテンツ参照を分離できる。
- AIへ汎用R2資格情報を渡さずにuploadを委譲できる。
- 承認者が見たRevisionと公開対象を一致させられる。
- Preview tokenを期限前でも失効できる。
- 使用中Assetの誤削除を防げる。

### Negative

- Worker経由uploadは大容量ファイルで帯域と実行時間の負担がある。
- Asset metadataとR2 objectは単一DB transactionにできない。
- Preview tokenはBearer資格情報なので、漏えい時は期限内に利用され得る。
- 画像処理、検疫、物理削除を別非同期系として実装する必要がある。

## Deferred decisions

- S3互換presigned direct upload
- multipart upload
- Cloudflare Images利用
- Access / Passkey Preview protection
- object retention and purge policy
