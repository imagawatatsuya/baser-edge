# ADR-0006: Capability-based Authorizationを採用する

- Status: Accepted

## Context

baserCMSのURL／HTTPメソッド中心の認可では、AIに「下書きは編集できるが公開はできない」等の細粒度権限を安全に付与しにくい。

## Decision

`content.createDraft`、`content.publish`、`asset.delete` 等の意味的Capabilityを認可の正本とし、site、content type、path、risk、期限のscopeを持たせる。

## Consequences

- GatewayとApplication Serviceの両方で認可を強制する。
- DelegationGrantによりAIへの権限委譲を明示する。
- 拒否された認可判断もAuditへ記録する。
