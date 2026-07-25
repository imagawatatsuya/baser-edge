# MVP実装計画 v0.2

## 完了済み v0.1 vertical slice

- [x] npm workspace / strict TypeScript
- [x] Workspace / Site / Human / Agent
- [x] Capability / Delegation
- [x] Page / Content Tree node / Route
- [x] Structured Document / 10 Component contracts
- [x] immutable Revision / optimistic conflict detection
- [x] typed Agent ChangeSet
- [x] Approval fixed to Revision hash
- [x] default-deny Agent publish
- [x] Human publish / Audit / Outbox
- [x] Public HTML Renderer
- [x] D1 migration and D1 adapter smoke test
- [x] BurgerEditor conservative importer
- [x] Mobile Operations static prototype

## Milestone 1: baser Content Manager parity — v0.2 complete

- [x] Folder ContentType
- [x] Alias
- [x] Recursive Copy
- [x] Subtree Trash / Restore
- [x] Restore conflict checks
- [x] Descendant move impact report
- [x] Redirect loop prevention and latest-route resolution
- [x] Content Tree API / Trash API
- [x] API-backed mobile tree/trash outline
- [ ] Permanent Delete / Empty Trash
- [ ] Cross-site move/copy

Milestone 1の主要縦断動作は完了した。完全削除とサイト間操作は、データ損失と権限境界が大きいため別Milestoneとして扱う。

## Milestone 2: Asset and Preview

- R2 UploadSession
- Asset metadata and reference extraction
- Signed PreviewSession
- same renderer for preview/publish
- image variants and quarantine state

## Milestone 3: Blog migration

- Blog container as baser domain module
- Article on common Content Kernel
- Category / Tag
- Listing and RSS projections
- baserCMS blog data importer

## Milestone 4: Mobile approval product UI

- real approval queue
- structured diff
- preview comparison
- passkey step-up hook
- request changes and re-proposal

## Milestone 5: EmDash selective adoption review

Evaluate code-level adoption for:

- Passkey authentication package
- signed R2 upload adapter
- MCP transport
- CLI scaffolding
- plugin capability manifest
- Dynamic Workers sandbox

Each adoption requires an ADR and third-party notice.
