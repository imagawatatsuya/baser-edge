---
name: baseredge-testing
description: 'baserEdgeの機能追加・Cloudflare変更を、kernel、API Worker、管理画面、local stack、D1 schema、実Cloudflare、開設、撤去まで段階的に検証する正本。「どのテストを追加するか」「npm run check」「prove:local」「prove:cloudflare」「remote proofが必要か」「R2なしを試す」「Queue重複を試す」「console mutation後の同期」「完了証拠を残す」場合に参照する。'
license: MIT
metadata:
  project: baserEdge
  role: testing
  last_verified: 2026-07-28
---

# baserEdge Testing and Proof

## 目的

baserEdgeの「コードが通る」だけでなく、Domain不変条件、管理画面、公開HTML、Cloudflare Binding、D1 migration、一発開設、撤去が成立することを段階的に証明する。

## 原則

- 変更に最も近い小さいテストから始める。
- 新しい入力面は成功1件と拒否2件以上を持つ。
- DomainをAPIやUIだけで代替しない。
- `/console/` mutation後のread-your-writesを検証する。
- Cloudflare固有変更をlocal成功だけで完了にしない。
- 実Cloudflareへ触るコマンドは明示的な同意変数なしで実行しない。
- disposable stackを使い、実証後に撤去する。
- 未実行のテストを実行済みのように報告しない。
- flaky testを再実行成功だけで解決扱いにしない。

## 検証レベル

### Level 1: Pure domain/kernel

対象:

- 正規化
- 不変条件
- state transition
- capability/authorization
- Revision/Release
- Queue message parser
- idempotency decision

必須:

- happy path
- wrong type/shape
- policy violationまたはconflict

### Level 2: Adapter/repository

対象:

- D1 row mapping
- batch rollback
- R2/Email mock adapter
- Outbox
- Trigger/view
- error mapping

### Level 3: Worker handler/API

対象:

- typed field extraction
- HTTP status
- stable error code
- CSRF/session/authz
- capabilities
- plugin trust boundary

変更したrouteは `docs/engineering/api-validation-audit.md` を更新する。

### Level 4: Admin UI wiring

対象:

- client-side early validation
- accessible error display
- mutation後のcache/list/tree/detail更新
- save/publish状態表示
- R2等のcapabilities banner

変更したmutationは `docs/engineering/console-mutation-sync-audit.md` を更新し、`tests/console-mutation-sync-ui.test.mjs`またはfocused testを追加する。

### Level 5: Local stack proof

```bash
npm run check
npm run prove:local
```

`npm run check`は現行のpackage scriptsを正本とし、build、test、schema、wrangler追跡、onboarding/cloud operations Worker checkを含む。

`prove:local`はログイン、承認、公開、公開HTMLの主要経路を確認する。

### Level 6: Remote Cloudflare proof

Cloudflare上でのみ成立する部分を使い捨てstackで確認する。

```bash
npm run plan:cloudflare
BASER_CF_STACK=<disposable-name> BASER_CF_PROVE=1 npm run prove:cloudflare
```

R2なしを明示する場合:

```bash
BASER_CF_STACK=<disposable-name> BASER_CF_TRIAL=1 BASER_CF_PROVE=1 npm run prove:cloudflare
```

full stackが必要な場合のみ:

```bash
BASER_CF_STACK=<disposable-name> BASER_CF_FULL_STACK=1 BASER_CF_PROVE=1 npm run prove:cloudflare
```

実行前に `docs/deployment/baseredge-cloudflare.md` とtroubleshootingを読む。

### Level 7: Onboarding proof

対象:

- OAuth
- fixed release
- Queue checkpoint
- D1 migration
- Secret/Assets保持
- console/public verification
- resume

一般利用者と同じブラウザ開設経路を確認する。開発者CLI proveだけでOAuth onboardingを証明したとみなさない。

### Level 8: Teardown/reinstall proof

```bash
BASER_CF_STACK=<disposable-name> BASER_CF_DESTROY=1 npm run destroy:cloudflare
```

- 削除対象と残存resourceを確認する。
- R2 non-empty等のpartial destroyを確認する。
- 同一stackまたは新しいstackで再開設できることを確認する。
- state file削除だけでCloudflare上のresourceを孤児化させない。

## Remote proof判断

原則として必要:

- `wrangler*.jsonc`
- compatibility date/flags
- Binding/Secret/Assets
- D1 migration runner、Trigger、view
- Queue/Workflow
- Service Binding
- R2公開配信
- OAuth
- Workers for Platforms
- Cloudflare API control-plane操作
- onboarding/destroy
- Worker更新時の設定保持

原則として不要:

- pure domain functionだけの変更
- copy/textだけの管理画面変更
- Cloudflare adapterを通らない局所的な型改善

ただし変更内容がremote差に依存する場合は実行する。

## Feature test matrix

機能追加ごとに埋める。

```yaml
test_matrix:
  domain:
    success: true
    rejection_wrong_type: true
    rejection_policy: true
  api:
    status_codes: true
    stable_error_codes: true
    auth_csrf: applicable
  admin:
    early_validation: applicable
    mutation_sync: applicable
    accessibility: applicable
  d1:
    schema_verified: applicable
    rollback: applicable
    migration_from_previous: applicable
  cloudflare:
    r2_absent: applicable
    queue_duplicate: applicable
    binding_missing: applicable
    remote_proof: applicable
  onboarding:
    new_install: applicable
    resume: applicable
    existing_upgrade: applicable
    destroy: applicable
```

## D1テスト

- migrationを空DBだけでなく直前versionから適用する。
- partial migrationと台帳不整合を試す。
- batch中間失敗で全体がrollbackされることを確認する。
- Trigger/View変更はremote proofを行う。
- 保存直後のread-your-writesを確認する。
- query correctnessをindexの偶然に依存させない。
- `npm run verify:schema`を必ず通す。

## Queueテスト

- 同じmessageを2回処理する。
- consumerが処理後・ack前に落ちる状況を模擬する。
- permanent errorが無限retryされない。
- retryable errorがattempt countを保持する。
- payload parserのwrong type、unknown step、oversized/unexpected fieldsを拒否する。
- Secretやtokenがログsnapshotへ入らない。
- Outbox dispatcherの重複実行を試す。

## R2テスト

最低3構成を区別する。

1. R2 unconfigured
2. R2 configured
3. R2 call failure

- capabilitiesとUI表示が一致する。
- trial inline storage上限を超える入力を拒否する。
- object write成功/metadata失敗、metadata成功/object失敗を扱う。
- Asset参照中のdeleteを拒否する。
- orphan cleanupを確認する。
- public `/assets/<assetId>`をremoteで確認する。

## Console golden path

`/console/`の主要挙動を変更した場合:

- `tests/console-golden-path.test.mjs`
- `tests/console-mutation-sync-ui.test.mjs`
- 必要に応じてfocused test

確認項目:

- ログイン
- create/edit/revise
- approval
- publish
- public HTML
- tree/list/detailの即時更新
- stale lock/tree conflict
- error codeの日本語表示
- saveとpublishの区別

## Security regression

- CSRF
- cookie flags
- productionでのdev principal header拒否
- agent direct publish拒否
- plugin request ≠ grant
- executable pluginのagent install/activate拒否
- missing egress policyのfail closed
- high-risk step-up
- destroyのtrial固定
- OAuth token/Secretの非露出

## 実証前の安全確認

- [ ] `npm run plan:cloudflare`で作成対象を確認した。
- [ ] production/defaultではなくdisposable stackを選んだ。
- [ ] 対象Cloudflare accountを確認した。
- [ ] R2利用有無を決めた。
- [ ] 作成resourceと料金影響を現行公式文書で確認した。
- [ ] destroy手順を先に確認した。
- [ ] 実データへremote bindingしない、または明示的に許可された。

## 完了報告

```markdown
## Automated tests
- `npm run check`: PASS/FAIL
- `npm run prove:local`: PASS/FAIL

## Remote proof
- Stack:
- Plan:
- R2 mode:
- Result:
- Console URL verified:
- Public URL verified:

## Teardown
- Deleted:
- Remaining:
- Manual action:

## Not run
- Test:
- Reason:
- Risk:
```

## 完了チェックリスト

- [ ] success + rejection 2件以上を追加した。
- [ ] API auditを更新した。
- [ ] console mutation sync auditを更新した。
- [ ] `npm run check`が成功した。
- [ ] 必要なら`npm run prove:local`を成功させた。
- [ ] remote proof要否を根拠付きで決めた。
- [ ] remote proof時はdisposable stackを使った。
- [ ] R2なし構成を確認した。
- [ ] Queue重複を確認した。
- [ ] onboarding変更はresume/upgrade/destroyを確認した。
- [ ] 実証resourceを撤去した。
- [ ] 未実行事項を明記した。
