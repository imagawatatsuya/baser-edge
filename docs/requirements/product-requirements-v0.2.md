# baserEdge 製品要件 v0.2

> **Superseded** by [v0.4](./product-requirements-v0.4.md) and [ADR-0021](../adr/0021-baseredge-product-identity-no-host-migration.md). Migration-first 方針は廃止済み。地図: [docs/README.md](../README.md).

## 製品定義

baserEdgeは、baserCMS 5のContent Manager、標準コンテンツ、サイト運用モデルをCloudflare向けに再実装するプロジェクトである。

EmDashなどの優れた汎用CMS実装を選択採用しながら、次を最上位原則とする。

1. **baserCMS Migration First:** baserCMSの優れたドメインと移行可能性を維持する。
2. **AI Agent First:** AIを正式なPrincipalとするが、既定では直接公開を許可しない。
3. **Mobile Operations First:** 日常運用、差分確認、承認、公開、緊急対応をスマートフォンで完結させる。
4. **Structured Service First:** Human、Agent、UI、APIが同じApplication Serviceを使う。

## v0.1 vertical slice

```text
Bootstrap
→ Site
→ Page in Content Tree
→ immutable Revision
→ typed AI ChangeSet
→ Approval
→ Human Publish
→ Public Renderer
→ Audit / Outbox
```

## v0.1 acceptance criteria

- PageがSite Treeへ配置され、Pathが生成される。
- Structured DocumentはHTMLではなく型付きBlockを正本とする。
- 各Blockは永続IDとComponent Versionを持つ。
- 古いbaseRevisionからの保存は競合として拒否する。
- AgentはHumanから期限付きCapability委譲を受ける。
- AgentはChangeSetと候補Revisionを作れる。
- Agentによる直接publishはCapabilityがあっても既定ポリシーで拒否する。
- Approvalが対象Revision IDとHashを固定する。
- Humanだけが承認済みRevisionをpublishできる。
- 公開はAuditとOutboxを同じ原子的処理へ記録する。
- 公開Rendererは任意HTMLを出力せず、Component別にescapeする。
- BurgerEditor未知Blockは元HTMLを保持し、黙って破棄しない。

## v0.2 Content Manager acceptance criteria

- Folderだけが子Contentを保持できる。
- Aliasが独立Pathから対象の公開Revisionを解決できる。
- Folderをコピーすると子孫も独立Contentとして複製される。
- Trash / Restoreがサブツリー単位で動作し、復元時のPath競合を拒否する。
- Move前に子孫を含むURL変更影響を取得できる。
- Move後の旧Pathは301で最新Active Routeへ転送される。
- Content TreeとTrashをAPIおよびモバイルアウトラインから確認できる。

## v0.3以降

- Article / Blog / Category / Tag / RSS
- Asset / R2 direct upload
- Preview token
- Queue projection / Sitemap / Search
- Mobile approval production UI
- baserCMS database importer
