# ADR-0011: baserCMSを製品正本、EmDashを汎用実装参照とする

- Status: Accepted (partially superseded)
- Date: 2026-07-24
- **Superseded for product authority and migration:** [ADR-0021](./0021-baseredge-product-identity-no-host-migration.md) — product is **baserEdge**; baserCMS is operational vocabulary reference only; no host-side migration.

## Context

本プロジェクトは、Cloudflare上で動作する新規汎用CMSを作ること自体を目的としない。目的は、baserCMSのサイトツリー、標準コンテンツ、運用モデル、移行可能性を維持したCloudflareネイティブ再実装である。

一方、EmDashはTypeScript、Astro、D1/R2、Revision、Passkey、MCP/CLI、プラグインCapabilityなど、汎用CMS基盤に優れた実装を持つ。これらを無視して再実装する合理性は低い。

## Decision

1. baserCMSを製品仕様・用語・互換性の正本とする。
2. EmDashを汎用的な技術設計とMITコードの採用候補とする。
3. EmDashのCollectionをサイト構造の正本にしない。
4. Astroを唯一の公開方式または製品アイデンティティにしない。
5. EmDash由来コードを取り込む場合、ファイル単位で出典、MIT notice、変更内容を記録する。
6. 初期v0.1では外部コードをコピーせず、境界の妥当性を独自の最小実装で検証する。

## Source hierarchy

```text
1. baserCMS domain behavior and migration compatibility
2. Project principles: AI Agent First / Mobile Operations First
3. Portable implementation mechanisms from EmDash
4. Cloudflare platform constraints
```

## Consequences

- サイトツリー、Folder、Page、Alias、Blog、Mail Form、Custom Contentを中心に設計できる。
- EmDashの更新を無条件に追従する必要はない。
- EmDashを全面フォークする前に、採用コード単位を評価できる。
- 重複実装を減らしながら、baserCMS移植という目的を維持できる。
