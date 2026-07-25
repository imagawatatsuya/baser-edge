# ADR-0005: PageとArticleを共通ContentItemで管理する

- Status: Accepted

## Context

baserCMSではPage、BlogPost、CustomEntryが異なる保存モデルを持つが、BurgerEditorはUI上それらを共通編集している。

## Decision

Page、Article、将来のCustom TypeをContentItem／ContentRevision／StructuredDocumentで共通化する。ブログ固有の集合機能はCollection、Taxonomy、Feedへ分離する。

## Consequences

- 公開、Revision、SEO、Asset、AI Toolを共通化できる。
- ContentType capabilityとschema設計が必要になる。
