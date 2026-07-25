# ADR-0007: AssetをR2へ保存し、本文はAsset IDで参照する

- Status: Accepted

## Context

BurgerEditorは画像ファイルパスをHTMLへ保存し、削除時の利用参照を保証しない。Cloudflare Workersには永続ローカルファイルシステムがない。

## Decision

ファイル本体をR2、metadataをD1へ保存し、Structured DocumentにはAsset IDのみを保存する。AssetReferenceで利用箇所を追跡する。

## Consequences

- UploadSessionと署名付きアップロードが必要になる。
- Asset lifecycleと派生画像処理を非同期化する。
- 利用中Assetの削除を安全に防止できる。
