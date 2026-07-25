# アーキテクチャ概要 v0.2

## Domain ownership

```text
Baser Domain Core
  Site / Content Tree / Folder / Page / Alias / Blog / Mail / Custom Content
                         │
                         ▼
Modern CMS Kernel
  Structured Document / Revision / Capability / Approval / Audit / Asset
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
- `structured-document`: Block、Component Registry、Change operations、Diff
- `authorization`: Capability、Scope、Delegation、Agent publish policy
- `content-kernel`: Content、Revision、Folder、Alias、Copy、Trash、Approval、Publication、Audit
- `agent-tools`: AI向け型付き操作
- `renderer`: 安全な公開HTML
- `cloudflare-adapters`: D1 persistence

## D1 invariants

- `validate_revision_commit` triggerがbaseRevisionとlockVersionを検査する。
- `advance_working_revision` triggerがworking headを進める。
- `validate_publication` triggerがApproval ID、Revision ID、Hashを照合する。
- `advance_published_revision` triggerがpublished headを切り替える。

アプリケーション以外の経路からSQLを実行しても、未承認Revisionは公開できない。

## External-source policy

- baserCMS: domain and migration compatibility
- BurgerEditor: editing behavior and input-format migration
- EmDash: generic implementation patterns and future selective MIT code adoption


## Content Manager v0.2

Folder、Page、Aliasは共通Content Treeへ参加する。Copy、Trash、Restore、Move Impact、RedirectはContentType別Controllerではなく、共通Content KernelのCommandとして実装する。詳細は `content-manager-v0.2.md` と ADR-0012を参照する。
