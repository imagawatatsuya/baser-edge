# ADR-0008: 公開処理にTransactional Outboxを採用する

- Status: Accepted

## Context

検索、サイトマップ、キャッシュ、通知を公開トランザクションへ同期的に含めると、外部処理の失敗で公開自体が不安定になる。

## Decision

公開ポインター更新、PublicationEvent、AuditEvent、OutboxEventを原子的に記録する。派生処理はOutboxからQueuesへ送る。

## Consequences

- Queue Consumerは冪等でなければならない。
- ProjectionStatusでdesired versionとactual versionを追跡する。
- 公開成功をcommittedとverifiedに分ける。
