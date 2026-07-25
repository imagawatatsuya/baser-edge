# MVP実装計画 v0.3

## 完了済み

### v0.1 Content Kernel

- [x] Workspace / Site / Human / Agent
- [x] Capability / Delegation
- [x] Page / Content Tree / Route
- [x] Structured Document / immutable Revision
- [x] Agent ChangeSet / Approval / Human Publish
- [x] Audit / Outbox / safe Renderer
- [x] D1 invariants and BurgerEditor conservative importer

### v0.2 baser Content Manager

- [x] Folder / Alias
- [x] Recursive Copy
- [x] Subtree Trash / Restore
- [x] Move impact / Redirect
- [x] Content Tree / Trash API and mobile outline

### v0.3 Asset and Preview

- [x] Asset / UploadSession kernel
- [x] HMAC signed short-lived upload URL
- [x] MIME / size / expiry / one-time validation
- [x] R2 Binding adapter and Memory object store
- [x] AssetReference extraction and D1 persistence
- [x] published-use deletion protection
- [x] public Asset GET / HEAD
- [x] persisted and revocable PreviewSession
- [x] Revision ID / Hash / Theme fixed token
- [x] same Renderer for preview and publish
- [x] Media and Preview mobile prototype
- [x] shared-memory local stack

## Milestone 3: Blog migration — next

- [ ] Blog container as baser domain module
- [ ] Article on common Content Kernel
- [ ] Blog category hierarchy
- [ ] Tags
- [ ] Listing Definition and pagination
- [ ] RSS projection
- [ ] baserCMS Blog importer
- [ ] BurgerEditor article body import

## Milestone 4: Asset processing and publication projection

- [ ] quarantine Queue
- [ ] MIME sniffing / malware hook
- [ ] image metadata and EXIF policy
- [ ] thumbnail / display variants
- [ ] object retention and physical deletion
- [ ] Sitemap / Search / cache projection workers

## Milestone 5: Mobile approval product UI

- [ ] real approval queue
- [ ] structured Block/Field diff
- [ ] preview comparison
- [ ] passkey step-up hook
- [ ] request changes and re-proposal

## Milestone 6: EmDash selective adoption review

Evaluate code-level adoption for Passkey, MCP transport, CLI scaffolding, plugin capability manifest and Dynamic Workers sandbox. Each adoption requires an ADR and third-party notice.
