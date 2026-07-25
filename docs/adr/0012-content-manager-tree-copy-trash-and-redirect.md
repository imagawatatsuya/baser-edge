# ADR-0012: Content ManagerのTree、Copy、Trash、Redirectを共通Kernelへ実装する

- Status: Accepted
- Date: 2026-07-25

## Context

baserCMS移植として、PageだけでなくFolder、Alias、コピー、ゴミ箱、復元、移動後URL維持を同じContent Managerで扱う必要がある。

EmDashのCollection中心モデルでは、このサイト構造上の振る舞いを製品の中心として表現できない。したがって、これらはbaser domainとして所有する。

## Decision

1. `ContentItem` を不変のコンテンツID、`ContentNode` をツリー位置として分離する。
2. 子を保持できるContentTypeはFolderだけとする。
3. Aliasも独立ContentItemとしてツリーへ参加し、別ContentItemを参照する。
4. Copyは新しいContentItem、Node、Revisionを作り、公開状態と履歴を継承しない。
5. Trashは物理削除ではなくサブツリーを隔離し、元の親・slug・pathを保存する。
6. Restoreは元位置または指定位置の競合を検査し、上書きしない。
7. Move前に全子孫のPath変化を計算する。
8. Move後は旧PathにRedirectを作る。
9. Redirectは移動時点の固定Pathではなく、対象ContentItemの最新Active Routeへ解決する。
10. 過去Pathを再利用した場合は、そのPath上のRedirectを無効化してloopを防ぐ。
11. MemoryとD1は同じStore contractを実装する。

## Consequences

### Positive

- baserCMSのContent Managerらしいサイト全体の操作を維持できる。
- URL変更後も外部リンクを保護できる。
- CopyやTrashをPage固有機能にせず、将来のBlog、Mail、Custom Contentでも再利用できる。
- AIは操作前に影響範囲を提示できる。

### Negative

- サブツリー操作とRoute更新は単一Entry操作より複雑になる。
- Cross-site操作、完全削除、巨大ツリーの性能設計が別途必要になる。
- Aliasの循環参照と対象消失に対するHealth Checkが必要になる。

## Deferred

- permanent delete / empty trash
- cross-site copy/move
- Alias chain and broken-target diagnostics
- production drag-and-drop UI
