---
name: baseredge-publishing-workflow
description: 'Page、Article、Custom Entry、Theme、Plugin等のdraft、revision、approval request、approved、scheduled、published、closed、rollback pointerと、Human/Agent/Service/Pluginの公開権限を設計・変更する正本。成熟CMSの公開・非公開・プレビュー運用を、baserEdgeの不変RevisionとAI Agent必須承認へ適応する。'
license: MIT
metadata:
  project: baserEdge
  role: publishing-workflow
  skill_version: 1
  last_verified: 2026-07-28
---

# Publishing Workflow

## 不変条件

- 公開対象は不変Revision/Releaseを指す。
- 編集中documentを直接公開状態に変えない。
- Agentは既定でproposalとapproval requestまで。
- Human、Agent、Service、Pluginは同じapplication serviceとaudit modelを使う。
- approvalとpublish capabilityを分ける。
- scheduled publicationはtimezoneと取消を扱う。
- rollbackは過去Revisionへのpointer切替でありRevision書換えではない。

## 状態機械

製品面に合わせて詳細化してよいが、意味を混ぜない。

```text
draft
review_requested
changes_requested
approved
scheduled
published
closed
superseded
```

Theme/Pluginは追加のverification、consent、activation stateを持つ。

## Preview

- unpublished revisionをtoken限定で表示する。
- production route/cache/search indexへ混入させない。
- Theme draftとContent draftの組合せを識別する。
- preview tokenのsubject、site、revision、expiryを検証する。
- screenshot/visual diff等を将来追加できる安定契約を持つ。

## Scheduled publication

- UTCで保存し、利用者timezoneをUIへ表示する。
- 過去日時、同時刻更新、取消、再予約を定義する。
- Cron/Queueの重複実行に耐える。
- 実行時にもapprovalと対象Revisionの整合性を再検証する。
- 実行失敗をsilentにせず状態とretryを表示する。

## Audit

最低限:

- actor principal
- actor type
- action
- target identity
- revision/release ID
- approval ID
- previous/next publication pointer
- reason/comment
- operation ID
- timestamp
- result/error code

## 必須テスト

- Human publish success
- Agent direct publish rejection
- approval required
- stale revision conflict
- scheduled duplicate execution
- cancel schedule
- rollback pointer
- preview isolation
- audit completeness
