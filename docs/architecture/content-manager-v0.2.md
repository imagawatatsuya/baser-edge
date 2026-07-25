# baser Content Manager architecture v0.2

## Purpose

baserCMSの中心である「異なるコンテンツ種別を一つのサイトツリーで管理する」振る舞いを、Cloudflare向けContent Kernelへ移植する。

## Content types in v0.2

- `page`: Structured DocumentとRevisionを持つ公開コンテンツ
- `folder`: 子コンテンツを保持できる構造コンテンツ
- `alias`: 別ContentItemを別のツリーパスから公開する参照コンテンツ

Folder以外を親として指定する操作はServiceとStoreの両方で拒否する。

## Common identity and tree position

```text
ContentItem       不変のコンテンツID・Revision head
ContentNode       parent / slug / sortKey / cachedPath / treeVersion
Route             hostname / path / canonical state
ContentRevision   Page等の不変コンテンツ版
```

コンテンツIDとURLを分離する。移動やslug変更でContentItem IDは変わらない。

## Alias

Aliasは独立したContentItemとContentNodeを持ち、`content_aliases` で対象ContentItemを参照する。公開解決時にはAlias自身の文書ではなく、対象の公開Revisionを返す。

Aliasをコピーした場合、コピー先も同じ対象を参照する。対象コンテンツが未公開または存在しない場合の管理画面警告は今後追加する。

## Recursive copy

- Folderは既定で子孫を再帰コピーする。
- Page RevisionとStructured Documentは新しいRevision IDで複製する。
- Aliasは新しいAlias IDで同じ対象へ関連付ける。
- コピーは独立した未公開コンテンツとなる。
- 元コンテンツの公開ポインター、Approval、Audit履歴はコピーしない。

## Trash and restore

Trashは物理削除ではなく、サブツリーを内部の予約パスへ移動し、元の配置を `trash_entries` に保存する。

```text
previousParentId
previousSlug
previousPath
rootContentItemId
trashedBy / trashedAt
```

復元時には、元の親Folderが有効か、復元先slugが空いているかを検証する。衝突がある場合は黙って上書きせず、別の親またはslugを要求する。

## Move impact and redirects

移動前に、対象と子孫の旧Path／新Pathを計算して返す。

```text
oldRootPath
newRootPath
affected[]
redirectCount
riskLevel
```

移動後は旧Pathへ301 Redirectを作る。Redirectは固定された古いtarget pathではなく、対象ContentItemの現在のActive Routeへ解決するため、その後さらに移動しても最新URLへ追随する。

コンテンツが過去のPathへ戻った場合、そのPath上のRedirectを無効化し、自分自身へのRedirect loopを防止する。

## API surface

```text
POST /v1/folders
POST /v1/aliases
GET  /v1/sites/:siteId/content-tree
GET  /v1/sites/:siteId/trash
POST /v1/content/:id/move-impact
POST /v1/content/:id/copy
POST /v1/content/:id/trash
POST /v1/content/:id/restore
POST /v1/content/:id/reorder
POST /v1/content/:id/unpublish
```

既存のPage／Revision／Approval／Publication APIと同じActor、Capability、Audit境界を利用する。

## Storage parity

`MemoryCmsStore` と `D1CmsStore` は同じ `CmsStore` contractを実装する。Content Managerの自動テストは両Storeに対して主要フローを検証する。

## Remaining work

- permanent delete / empty trash
- cross-site copy and move
- Alias target health issue
- UI operation commands
- baserCMS database importer mapping
