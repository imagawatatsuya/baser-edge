# Cloudflare Native CMS アーキテクチャ概要 v0.1

## 1. 全体構造

```text
Human / Mobile UI / Desktop UI / AI Agent / External Client
                              │
                              ▼
                    Command / Query Gateway
                              │
        ┌─────────────────────┼─────────────────────┐
        │ Authentication      │ Authorization       │
        │ Schema Validation   │ Risk Evaluation     │
        │ Idempotency         │ Audit Context       │
        └─────────────────────┼─────────────────────┘
                              ▼
                     Application Services
                              │
     ┌──────────────┬─────────┼─────────┬──────────────┐
     │ Content      │ Revision│ Asset   │ Publication  │
     │ Route        │ Approval│ Search  │ Theme        │
     │ Agent        │ Audit   │ Site    │ Collection   │
     └──────────────┴─────────┼─────────┴──────────────┘
                              ▼
                D1 / R2 / Queues / Workflows
```

## 2. Cloudflareサービス対応

| サービス | 責務 |
|---|---|
| Workers | 管理API、公開Renderer、認可、Preview Gateway |
| D1 | Content、Revision、Route、権限、監査、公開状態 |
| R2 | Asset本体、派生画像、添付ファイル |
| Queues | 検索、サイトマップ、キャッシュ、画像処理、通知 |
| Workflows | 承認待ち、予約公開、長時間処理 |
| Durable Objects | 必要時のサイト単位直列化・高競合制御 |
| Workers Static Assets | ThemeReleaseの不変アセット |
| Access | 管理面への到達制御。CMS内部認可とは分離 |
| Turnstile | 公開フォーム等を追加した際のBot対策 |

## 3. Domain Model

```text
Workspace
└─ Site
   ├─ ContentType
   ├─ ContentItem
   │  ├─ ContentRevision
   │  │  └─ StructuredDocument
   │  ├─ ContentNode
   │  ├─ RouteBinding
   │  ├─ ApprovalRequest
   │  └─ PublicationEvent
   ├─ Collection
   ├─ Taxonomy
   ├─ Asset
   ├─ ThemeActivation
   └─ SiteHealthIssue

Principal
├─ HumanPrincipal
├─ AgentPrincipal
├─ ServicePrincipal
└─ ExternalClientPrincipal
```

## 4. Structured Document

### 正本

```json
{
  "formatVersion": 1,
  "root": {
    "id": "root",
    "type": "page",
    "slots": {
      "body": []
    }
  }
}
```

### Block Instance

```text
id
componentType
componentVersion
props
slots
visibility
provenance
```

HTMLは保存正本ではなく、ThemeReleaseのRendererによって生成する。

## 5. Revision Commit

Revision作成時は次を一つの原子的処理として扱う。

```text
1. baseRevision / lockVersion検査
2. ContentRevision INSERT
3. RevisionDocument INSERT
4. AssetReference更新
5. ContentItem working head更新
6. ChangeSet確定
7. AuditEvent INSERT
8. OutboxEvent INSERT
```

競合時は全体を失敗させ、既存Revisionを上書きしない。

## 6. Publication Pipeline

```text
Approved Revision
       │
       ▼
PublicationReadinessCheck
       │
       ▼
Published Revision Pointer Update
       │
       ├─ PublicationEvent
       ├─ AuditEvent
       └─ OutboxEvent
              │
              ├─ Search Projection
              ├─ Sitemap Projection
              ├─ Cache Invalidation
              ├─ SEO Validation
              ├─ Link Validation
              └─ Public URL Verification
```

公開結果は次の二段階で管理する。

- `committed`: D1上の公開ポインター更新に成功
- `verified`: 公開URLで期待Revisionを確認

## 7. Authorization

```text
Effective Permission =
  Human capability
  ∩ Delegated capability
  ∩ Agent maximum capability
  ∩ Resource scope
  ∩ Risk policy
```

AI実行時は次を分離する。

```text
actor = AgentPrincipal
onBehalfOf = HumanPrincipal
 delegation = DelegationGrant
```

## 8. Theme

```text
Theme
└─ ThemeRelease (immutable)
   ├─ Worker version
   ├─ Static asset manifest
   ├─ Component manifest
   ├─ Renderer compatibility
   └─ Build provenance
```

Design Token、Layout Composition、Content RevisionはThemeReleaseコードと分離する。

## 9. Extension Model

MVPでは任意コードプラグインを提供しない。

将来の拡張は次の種類へ制限する。

- ContentType schema
- Component manifest
- Pattern
- Webhook
- Workflow declaration
- Safe external integration
- 分離Workerとしての信頼済みExtension

コアプロセスへの任意コード注入、無制限D1 migration、認可上書きを許可しない。
