# baserEdge 製品モデル（サイトツリー運用）

> **Not a migration checklist.** See [relationship-to-basercms.md](./relationship-to-basercms.md), [ADR-0021](../adr/0021-baseredge-product-identity-no-host-migration.md), and [product requirements v0.4](../requirements/product-requirements-v0.4.md).

以下を満たさない実装は、baserEdge の製品モデルとして採用しない。

## Content Manager

- Site 配下に統一 Content Tree がある。
- Folder、Page、Alias、Blog、Mail Form、Custom Content が同じツリーへ参加できる。
- コンテンツ固有データとツリー上の位置を分離する。
- 親子関係と slug から公開 Path を解決できる。
- 移動、コピー、ゴミ箱、復元、Alias、並び替えを提供する。

## Standard content

- Page を中核とする。
- Blog、Mail Form、Custom Content を共通 Kernel 上で提供する。
- Blog を単なる汎用 Collection UI へ置換せず、ツリー上の運用単位として提供する。

## Site and Theme

- Site は独立した Content Tree、Domain、Theme 設定を持つ。
- 公開 Theme と管理 Operations UI を分離する。
- PHP Theme は baserEdge 上で実行しない。

## External systems (out of scope for baserEdge core)

- baserCMS 5 の ID・Path・プラグイン・DB を保持する importer は **baserEdge に実装しない**。
- 第三者（baserCMS プロジェクト含む）が baserEdge の公開 API・エクスポート形式へ合わせる場合のみ、データ連携が起こり得る。
- 静的診断 CLI はレガシー資産の理解用であり、製品の移行工程ではない。
