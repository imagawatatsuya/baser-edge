# ADR-0003: HTMLではなく型付きStructured Documentを正本とする

- Status: Accepted

## Context

BurgerEditorは優れたBlock操作を提供する一方、編集情報を含むHTMLを正本として保存する。永続Block ID、型安全なAI操作、厳密な差分、Theme互換性には不足する。

## Decision

本文の正本をComponent type、version、props、slots、永続Block IDからなるJSON文書とする。HTMLはRendererが生成する派生物とする。

## Consequences

- Component RegistryとDocument Validatorが必要になる。
- 既存HTML移行にはUnknown／Legacy Blockを用意する。
- AIはHTML全体ではなくBlock Commandを操作する。
