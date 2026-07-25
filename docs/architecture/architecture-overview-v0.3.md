# アーキテクチャ概要 v0.3

## Domain ownership

```text
Baser Domain Core
  Site / Content Tree / Folder / Page / Alias / Blog / Mail / Custom Content
                         │
                         ▼
Modern CMS Kernel
  Structured Document / Revision / Capability / Approval / Audit / Asset / Preview
                         │
                         ▼
Cloudflare Adapters
  Workers / D1 / R2 / Queues / Workflows
                         │
                         ▼
Operations
  Mobile Admin / Desktop Builder / AI Agent / MCP / CLI
```

Baser Domain CoreはEmDashやCloudflare SDKへ依存しない。

## Current package boundaries

- `baser-domain`: Tree、Path、Route影響計算
- `structured-document`: Block、Component Registry、Change operations、Diff、Asset参照抽出
- `authorization`: Capability、Scope、Delegation、Agent publish policy
- `content-kernel`: Content、Revision、Folder、Alias、Copy、Trash、Approval、Publication、Audit
- `asset-kernel`: Asset、UploadSession、Object Store contract、利用中削除防止
- `preview-kernel`: 保存済みPreviewSession、署名token、Revision固定
- `agent-tools`: AI向け型付き操作
- `renderer`: 安全な公開・Preview HTML
- `cloudflare-adapters`: D1 persistence、R2 Binding adapter

## D1 invariants

- `validate_revision_commit` がbaseRevisionとlockVersionを検査する。
- `validate_publication` がApproval ID、Revision ID、Hashを照合する。
- Preview triggerがWorkspace、Site、Content Item、Revision Hashの整合性を強制する。
- Revision保存とAssetReference保存を同じstore operationで行う。

## Runtime split

```text
API Worker
  Command / Approval / UploadSession / PreviewSession

Public Renderer Worker
  Published Page / Redirect / Asset / Preview

D1
  Domain state / Audit / Asset metadata / PreviewSession

R2
  Immutable uploaded objects
```

## External-source policy

- baserCMS: optional operational vocabulary and legacy static diagnostics only — **not** product spec or migration obligation ([ADR-0021](../adr/0021-baseredge-product-identity-no-host-migration.md))
- BurgerEditor: optional editing-behavior reference
- EmDash: generic implementation patterns and future selective MIT code adoption

詳細は `content-manager-v0.2.md`、`assets-and-preview-v0.3.md`、ADR-0012、ADR-0013を参照する。
