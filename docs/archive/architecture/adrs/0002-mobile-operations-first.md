# ADR-0002: Mobile Operations Firstを採用する

- Status: Accepted

## Context

スマートフォンは複雑な制作キャンバスには不向きだが、AIへの指示、差分確認、承認、緊急操作に適している。

## Decision

管理画面を単にレスポンシブ化せず、日常運用と承認を中心としたMobile Operations Shellを設計する。ドラッグ操作を必須にしない。

## Consequences

- ホームはコンテンツ一覧より承認待ち、公開予定、障害、AI指示を優先する。
- 差分はBlock／Field単位で要約する。
- 複雑なSchema／Theme開発はDesktopへ残す。
