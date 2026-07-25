# MVP実装計画 v0.1

## 1. 実装方針

横方向に多数機能を作るのではなく、次の縦方向シナリオを先に完成させる。

```text
AI指示 → 候補Revision → モバイル差分 → 承認 → 公開 → 公開後検証
```

## 2. Milestone 0: Repository Foundation

### Deliverables

- Monorepo構成
- TypeScript strict設定
- Workers環境分離（local / preview / production）
- D1 migration基盤
- R2、Queues、Workflows bindings
- 共通ID、時刻、Result、Error型
- API schema生成とvalidation基盤
- Audit context middleware

### Exit Criteria

- ローカルとpreview環境でmigrationを再現可能。
- すべてのCommandへrequest IDとprincipal contextが付与される。

## 3. Milestone 1: Content Kernel

### Deliverables

- Workspace、Site
- ContentType、ContentItem
- ContentRevision、RevisionDocument
- ContentNode、Route、Redirect
- Revision commit transaction
- baseRevisionId競合検出
- AuditEvent

### Exit Criteria

- Pageを作成し、複数Revisionを保存できる。
- 公開Revisionと作業Revisionを別々に取得できる。
- URL変更でRedirectが生成される。

## 4. Milestone 2: Structured Editor Core

### Deliverables

- Component Registry
- Document schema validator
- 10 initial Components
- insert/update/move/duplicate/remove Block Commands
- Unknown Component保持
- Desktop outline editor
- Browser local recovery
- D1 editing draft

### Exit Criteria

- HTMLを保存せずPage Documentを作成・編集できる。
- Block IDが並び替え後も維持される。
- 非対応Componentを開いてもデータが失われない。

## 5. Milestone 3: Asset Pipeline

### Deliverables

- Asset、AssetVariant、AssetReference
- UploadSession
- R2 direct upload
- Processing Queue
- Image metadata extraction
- ready / failed / quarantined state
- Mobile camera upload

### Exit Criteria

- Image BlockへAsset IDを設定できる。
- 利用中Assetの削除要求が拒否または警告される。

## 6. Milestone 4: Preview and Renderer

### Deliverables

- Public Renderer Worker
- Initial ThemeRelease
- Design Tokens
- Signed PreviewSession
- Revision固定preview
- Cache tags

### Exit Criteria

- 同じRevisionがpreviewとpublishで同一Component Rendererを使う。
- Preview token失効後はアクセスできない。

## 7. Milestone 5: AI Agent

### Deliverables

- AgentPrincipal
- DelegationGrant
- AgentRun
- inspectContent
- proposeDocumentChange
- createDraftRevision
- summarizeChanges
- validatePublicationReadiness
- requestPublication

### Exit Criteria

- AIがHTMLを直接書かずBlock ChangeSetを作る。
- AI変更にbaseRevisionId、agentRunId、指示者が記録される。
- AIはpublish capabilityを持たない。

## 8. Milestone 6: Mobile Approval

### Deliverables

- Operations home
- Approval queue
- Change summary
- Block / field diff
- Preview
- Reject / approve / request changes
- Step-up authentication hook

### Exit Criteria

- スマートフォン幅でAI提案の確認から承認まで完結する。
- 承認対象Revisionのhashが固定される。

## 9. Milestone 7: Publication Pipeline

### Deliverables

- ApprovalRequest
- PublicationSchedule
- Publication Workflow
- PublicationEvent
- Transactional Outbox
- Queue dispatch
- Cache invalidation
- Public URL verification
- ProjectionStatus

### Exit Criteria

- 即時・予約公開が動作する。
- Queue処理が重複しても結果が壊れない。
- 公開状態をcommitted / verifiedで確認できる。

## 10. Milestone 8: Search, Sitemap, SEO

### Deliverables

- SearchDocument projection
- D1 FTS5
- Sitemap projection
- SEO policy / override / resolved snapshot
- Internal link validation
- Site health issues

### Exit Criteria

- 公開Revisionのみ検索される。
- canonicalかつindexableなRouteのみサイトマップへ出る。
- Projectionの遅延や失敗が管理画面で見える。

## 11. Milestone 9: Article and Collection

### Deliverables

- Article ContentType preset
- Collection
- ListingDefinition
- Taxonomy / Term
- Category / Tag presets
- RSS projection

### Exit Criteria

- NEWS CollectionへArticleを追加し、一覧・分類・RSSへ反映できる。
- PageとArticleが同じRevision、AI、公開基盤を利用する。

## 12. Cross-cutting Test Matrix

### Content

- Revision conflict
- Unknown Component
- Large document rejection
- Invalid props
- Route collision
- Redirect loop

### AI

- Delegation expiry
- Forbidden publish attempt
- Prompt injection in source content
- Stale base revision
- Invalid ChangeSet

### Mobile

- Narrow viewport
- Interrupted connection
- Preview expiration
- Double approval submission

### Publication

- Duplicate Queue delivery
- Cache purge failure
- Search projection failure
- Public URL mismatch
- Scheduled publication reschedule

### Asset

- Incomplete upload
- MIME mismatch
- Oversized file
- Referenced asset deletion
- Processing retry

## 13. Definition of Done

各機能は次を満たした時点で完了とする。

- 型付きAPI契約がある。
- Capability検査がある。
- AuditEventがある。
- 失敗が構造化Errorとして返る。
- 冪等性または競合対策がある。
- モバイル主要画面で操作できる。
- 自動テストがある。
- 再構築または復旧手順がある。
