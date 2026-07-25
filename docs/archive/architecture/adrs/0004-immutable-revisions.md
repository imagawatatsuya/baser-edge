# ADR-0004: Content Revisionを不変とする

- Status: Accepted

## Context

baserCMSとBurgerEditorは本稿・草稿の二面構造を持つ。AIと人間の並行提案、承認済み内容の固定、完全な復元には不足する。

## Decision

すべての意味ある保存で新しいContentRevisionを作成し、既存Revisionを更新しない。working headとpublished headを分ける。

## Consequences

- 競合検出にbaseRevisionIdが必要になる。
- Autosaveは正式Revisionと分離する。
- 承認対象Revisionと公開Revisionを完全一致させられる。
