# ADR-0001: AI Agent Firstを最上位原則とする

- Status: Accepted

## Context

従来CMSは人間が管理画面を操作することを中心に設計され、AIは文章生成機能として後付けされることが多い。本プロジェクトではAIが調査、作成、編集、検査、公開申請を継続的に担う。

## Decision

AIを独立したPrincipalおよび正式なCMSクライアントとして扱う。AIは管理画面を擬似操作せず、Human UIと同じApplication Serviceへ型付きCommandを送る。

## Consequences

- すべての主要操作を機械可読なCommandとして設計する必要がある。
- AgentRun、DelegationGrant、AuditEventが初期コアになる。
- AI専用のDB直接操作や例外的権限経路を禁止する。
