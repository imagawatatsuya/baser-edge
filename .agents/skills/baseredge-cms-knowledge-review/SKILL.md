---
name: baseredge-cms-knowledge-review
description: 'baserEdgeの機能追加・ロードマップ・設計変更に対し、baserCMSの成熟したCMS運用知識から見落としを探し、adopt/adapt/defer/rejectを記録するレビュー手順。「baserCMSではどうしているか」「CMSとして足りない機能」「既存CMSノウハウを活用」「知識registryを更新」「baserEdgeの構造変更でスキルが古くなった」場合に参照する。コード互換性や自動移行ではなく、利用者目的と運用上の例外を比較する。'
license: MIT
metadata:
  project: baserEdge
  role: cms-knowledge-review
  skill_version: 1
  last_verified: 2026-07-28
---

# CMS Knowledge Review

## 目的

機能を実装する前に、成熟CMSが既に解決した問題を再発見し直す無駄と、単純なCRUDへ縮退する危険を減らす。

## 入力

- 新機能要求、Issue、設計案または差分
- `AGENTS.md`とactive product requirements
- `cms-knowledge-registry.json`
- 最新context snapshot
- 必要に応じてbaserCMS公式skills、仕様書、操作ガイド

## レビュー手順

1. 要求を利用者の完了状態へ言い換える。
2. registryをcategory、keyword、related IDで検索する。
3. baserCMS側のUIや実装ではなく、必要になった理由を抽出する。
4. baserEdgeの不変条件とCloudflare契約へ照らす。
5. `adopt/adapt/defer/reject`を決める。
6. 現在のcomponent roleへ割り当てる。
7. 状態、例外、管理UI、テスト、開設影響を追加する。
8. registryに新しい知識を追加するか、既存項目の判断履歴を更新する。

## 比較表

```markdown
| Knowledge ID | 成熟CMSで解決した問題 | baserEdge判断 | 変換方法 | 今回のacceptance |
|---|---|---|---|---|
```

## よくある誤り

- PHPクラス名やCakePHP APIを知識として取り込む。
- baserCMSの画面をそのまま再現する。
- 現在未実装なので不要と判断する。
- Cloudflareの制約を理由に利用者目的を削除する。
- 逆に、過去CMSにある機能を無条件に全部採用する。
- registryを更新せず、会話やIssueだけへ判断を残す。
- 現在のfolder名を普遍的な契約として記録する。

## 新規knowledge entry

`docs/agents/adaptation/decision-record-template.md`を使う。必須項目:

- stable ID
- source references
- universal user need
- hidden edge cases
- baserEdge decision
- product rationale
- component roles
- Cloudflare translation
- acceptance criteria
- revisit triggers

## Drift review

`node scripts/agents/check-context-drift.mjs --strict=review`が差分を報告した場合:

1. authority変更なら新旧契約を比較する。
2. component roleの解決不能ならregistryを更新する。
3. package追加だけなら該当roleを追加または既存roleへ統合する。
4. command変更ならskillsの実行例を更新する。
5. migration/test数の変化だけなら知識本文を更新しない。
6. review後にsnapshotを更新し、理由を履歴へ記録する。

自動でSKILL.mdを書き換えない。意味の変化を機械的なpath置換で隠さない。

## 出力

```markdown
## CMS knowledge review
- Reviewed knowledge IDs:
- Adopted:
- Adapted:
- Deferred:
- Rejected:
- New edge cases:
- Registry changes:
- Context drift resolved:
```
