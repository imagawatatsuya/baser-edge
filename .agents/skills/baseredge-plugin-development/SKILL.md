---
name: baseredge-plugin-development
description: 'Plugin identity、Manifest、immutable Release、Capability request/grant、Activation、Hook、sandbox、egress、Storage、schema migration、管理画面拡張、install/update/uninstallを実装・変更する正本。baserCMSの機能をプラグイン単位に分割する成熟ノウハウを採用しつつ、PHP pluginやcore processへの任意コード読込は採用しない。'
license: MIT
metadata:
  project: baserEdge
  role: cms-plugin
  skill_version: 1
  last_verified: 2026-07-28
---

# Plugin Development

## 関連knowledge

- `CMS-PLUGIN-001`
- `CMS-PLUGIN-002`
- `CMS-LIFECYCLE-001`
- `CMS-TEST-001`

## 採用する知識

- 機能をcoreから分離して配布・更新する。
- identity、version、設定、管理画面、migration、hookを明示する。
- install、activate、deactivate、update、uninstallを別操作にする。
- compatibilityと依存関係を事前検査する。
- テストをPlugin単位でも実行可能にする。
- 失敗がcore全体を壊さないよう隔離する。

## 採用しないもの

- PHP/CakePHP Plugin互換。
- ファイルを置くだけの自動実行。
- Themeへ同梱された実行コードの自動install/activate。
- core processへの任意JavaScript import。
- Manifestの要求を自動的な権限付与とみなす。
- Agentによる実行Pluginの登録・有効化。
- egress policyなしのnetwork access。

## Lifecycle

```text
discovered
verified
registered
consent_pending
activated
suspended
deactivated
update_available
uninstall_pending
uninstalled
quarantined
```

Releaseは不変。Activationがgranted capability subset、scope、configuration、active releaseを持つ。

## Manifest

最低限:

- plugin identity
- release version/hash
- compatibility contract
- requested capabilities
- hooks
- admin extension declarations
- storage/schema requirements
- network destinations
- provenance/SBOM/signature metadata
- uninstall/retention policy

unknown capabilityを黙って無視せず、登録またはactivationを拒否する。

## Hook

- pre-commitとpost-commitを区別する。
- post-commit hookはrollbackを主張できない。
- timeout、retry、idempotency、orderingを定義する。
- Hook failureが業務操作へ与える影響をmanifest contractにする。
- invocation ID、release hash、activation IDをauditする。
- Mail/Theme hook追加も同じdispatch境界を使う。

## Storage/Migration

- Plugin専用namespaceを持つ。
- core tableへの任意DDLを許さない。
- schema versionとPlugin Releaseを関連付ける。
- migrationはsandbox/host policyで許可された宣言的操作に制限する。
- deactivateとuninstallでdataを即時削除しない。
- retention/export/purgeを明示する。
- D1/R2/Queue bindingを直接渡さず、capability APIを介す。

## Admin拡張

- navigation、settings、view componentを宣言的に登録する。
- route/auth/CSRFをcore application serviceへ統合する。
- arbitrary HTML/script injectionを許さない。
- capability未付与のUIを表示しない。
- Plugin失敗時もcore consoleの主要操作を維持する。

## 必須テスト

- request ≠ grant
- Human-only register/activate
- immutable Release/hash mismatch
- missing dispatch/egress fail closed
- hook timeout/retry/idempotency
- post-commit no rollback claim
- storage namespace isolation
- migration rejection
- admin extension permission
- uninstall retention
- provenance/signature invalid
