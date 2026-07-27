# baserEdge Agent Skills Index

## 体系

```text
baseredge-cms-domain-contract
        ↓
baseredge-cms-knowledge-review
        ↓
Content / Blog / Mail / Theme / Plugin / Admin / Publishing
        ↓
Cloudflare Runtime / D1 / Onboarding
        ↓
Testing
```

## CMS知識層

| スキル | 役割 |
|---|---|
| `baseredge-cms-domain-contract` | 成熟CMS知識をbaserEdge製品契約へ変換 |
| `baseredge-cms-knowledge-review` | adopt/adapt/defer/rejectレビュー |
| `baseredge-content-development` | Tree、Page、Folder、Alias、copy/move/trash |
| `baseredge-blog-development` | 複数Blog、Article、taxonomy、RSS |
| `baseredge-mail-form-development` | Form、Field、Submission、通知 |
| `baseredge-theme-development` | immutable ThemeReleaseと表示契約 |
| `baseredge-plugin-development` | Manifest、grant、sandbox、lifecycle |
| `baseredge-admin-ux` | `/console/`の運用UX |
| `baseredge-publishing-workflow` | Revision、approval、publish、schedule |

## Cloudflare基盤層

| スキル | 役割 |
|---|---|
| `baseredge-development` | 共通入口 |
| `baseredge-cloudflare-runtime-contract` | Workers/D1/R2/Queues/Bindings |
| `baseredge-onboarding-deployment` | OAuth一発開設、更新、再開、撤去 |
| `baseredge-d1-development` | schema、migration、原子性、Outbox |
| `baseredge-testing` | local、remote、onboarding、teardown proof |

## 将来変化への対応

- CMS知識: `docs/agents/adaptation/cms-knowledge-registry.json`
- component role: `component-role-registry.json`
- current mapping: `.agents/context/baseredge-context.snapshot.json`
- drift check: `node scripts/agents/check-context-drift.mjs --strict=review`

現在のpathをskillの正本にせず、roleからsnapshotで解決する。
