---
name: baseredge-onboarding-deployment
description: 'baserEdgeのCloudflare OAuthによるブラウザ一発開設、既存サイト更新、再開可能チェックポイント、Queue工程、D1 migration、一時Migration Worker、Secret/Static Assets保持、完了確認、trial撤去を変更する際の正本。「開設フローを変更」「Bindingを追加」「既存開設サイトをアップグレード」「途中失敗から再開」「Queue重複」「D1 migrationがremoteだけ失敗」「お試しをやめる」「残骸を安全に削除」する場合に参照する。'
license: MIT
metadata:
  project: baserEdge
  role: onboarding-deployment
  last_verified: 2026-07-28
---

# baserEdge Onboarding and Deployment

## 目的

利用者がGitHub、npm、Wrangler、API token貼り付けを必要とせず、自身のCloudflareアカウント内へbaserEdgeを開設できる正規経路を保護する。

この経路は補助的なデプロイスクリプトではなく、製品中核である。機能追加は新規開設、途中再開、既存サイト更新、撤去まで成立させる。

## 現行の標準経路

現行実装の重要要素:

- Cloudflare OAuth
- 固定リリース
- 暗号化した再開可能checkpoint
- Queueによる工程分割
- 一時Migration WorkerのD1 bindingでTriggerを含むmigration実行
- Worker更新時のSecretとStatic Assets binding保持
- `/console/`の200かつHTML配信を完了条件として確認
- 管理画面URLと公開サイトURLの保持
- OAuthによる`trial`環境の削除

変更前に次を確認する。

- `IMPLEMENTATION_STATUS.md`
- `docs/deployment/provisioning-paths.md`
- `docs/deployment/cloudflare-one-click-trial.md`
- `docs/deployment/baseredge-cloudflare.md`
- `docs/deployment/cloudflare-teardown.md`
- `docs/deployment/cloudflare-prove-troubleshooting.md`
- 関連ADR、特にCloud Operations Workerの安全境界
- `baseredge-cloudflare-runtime-contract`

## 安全境界

- 一般利用者向け正規経路はブラウザのOAuth開設である。
- GitHub ActionsやDeploy buttonを標準経路へ置き換えない。
- 利用者のCloudflare tokenをブラウザlocalStorageへ永続化しない。
- OAuth tokenは必要最小scope、暗号化保存、短い保持期間を使う。
- token、authorization header、Secretをログへ出さない。
- Cloudflare control-plane操作は隔離されたoperations境界を通す。
- hosted trialのdestroy対象をserver側で`trial`へ固定する。
- resource名の一致だけで削除権限を決めない。
- Agentに開設、実行Plugin登録、有効化、破壊操作を既定で許可しない。
- 開設フローの都合でAPI/authのfail-closed動作を弱めない。

## 状態機械

状態名は実装へ合わせてよいが、意味上は次を区別する。

```text
SESSION_CREATED
OAUTH_AUTHORIZED
ACCOUNT_SELECTED
RELEASE_RESOLVED
D1_CREATED
API_WORKER_DEPLOYED
PUBLIC_WORKER_DEPLOYED
ASSETS_DEPLOYED
MIGRATIONS_APPLIED
BOOTSTRAPPED
OWNER_BOUND
CONSOLE_VERIFIED
PUBLIC_SITE_VERIFIED
COMPLETED
```

失敗、取消、撤去も状態として持つ。

```text
FAILED_RETRYABLE
FAILED_TERMINAL
CANCEL_REQUESTED
DESTROYING
DESTROY_PARTIAL
DESTROYED
```

状態を単なる進捗表示にせず、再開判断とcleanupの正本にする。

## checkpoint契約

各checkpointは最低限次を持つ。

```yaml
checkpoint:
  session_id: immutable
  release_id: immutable
  step: MIGRATIONS_APPLIED
  attempt: 3
  updated_at: ISO-8601
  encrypted_credentials_ref: opaque
  account_id: opaque
  resources:
    d1_database_id: optional
    api_worker_name: optional
    public_worker_name: optional
    migration_worker_name: optional
    queue_name: optional
    r2_bucket_name: optional
  verification:
    console_status: optional
    public_status: optional
  cleanup_pending:
    - resource_type
  last_error:
    code: stable
    retryable: true
```

- checkpoint更新は単調に進める。
- 完了済みstepを再実行する場合は存在確認と整合性確認を行う。
- release IDを途中で暗黙に変更しない。
- checkpointだけを消し、Cloudflare上のresourcesを孤児化させない。
- 暗号化credential本体と表示用状態を分離する。

## 冪等性

各stepは同じQueue message、HTTP retry、browser再送で複数回呼ばれても壊れない。

### 作成step

1. checkpointにresource IDがあればCloudflare上の存在と所有権を検査する。
2. なければ作成する。
3. 作成成功直後にresource IDをcheckpointへ保存する。
4. checkpoint保存に失敗した場合、次回の検索で自分が作ったresourceを同定できるtag/name/metadataを持つ。
5. 名前衝突時に他者resourceを採用しない。

### 更新step

- 既存設定を読み取る。
- baserEdgeが管理する差分だけを更新する。
- Secret、Static Assets、未知のBindingを保持する。
- add → deploy compatible target → switch caller → remove oldの順で互換性を保つ。

### Queue step

- messageにsession ID、step、operation ID、release IDを含める。
- encrypted token以外のSecretを含めない。
- parserで型、許可されたstep、ID形式を検証する。
- 同じoperation IDは二重副作用を起こさない。
- retryable/terminalを安定したerror codeで区別する。

## D1作成とmigration

詳細は `baseredge-d1-development` を参照する。

- D1作成とmigration適用を一つの原子操作とみなさない。
- Triggerを含むSQLはremote control-plane経路とD1 binding経路の差を考慮する。
- 現行の一時Migration Worker経路を、単純化のために安易に削除しない。
- migrationをcheckpoint単位に分割する場合も、schema全体と`d1_migrations`台帳を最終検証する。
- `table already exists`を無条件に成功扱いしない。schemaと台帳の整合性を検査する。
- migration workerは完了後に削除し、削除失敗をcleanup pendingへ残す。
- 新しいmigrationは新旧Workerの互換期間を考慮する。

## 固定リリース

- 開設中にmain最新版を追従しない。
- release packageの識別子、hash、生成日時をcheckpointへ固定する。
- package内のWorker、Assets、migration、bootstrap contractを同一releaseとして扱う。
- partial rollout時に異なるreleaseの構成物を混在させない。
- release packageのprovenance、hash検証を将来拡張可能にする。

## Binding追加時の必須実装

新しいBindingを必要とする機能は、同じ変更で次を用意する。

- 新規開設への追加
- 既存開設サイトへのupgrade
- Bindingなし旧Workerとの互換期間
- capabilitiesでの可用性表示
- local dev/prove設定
- destroy/cleanup
- Secret/Assets保持
- R2なしtrialへの影響
- rollback時の扱い

「新規開設だけ動く」「mainから手動deployしたサイトだけ動く」は未完成である。

## 完了確認

`deploy succeeded`だけを完了条件にしない。

最低限:

1. D1 schema verification
2. API Worker health/readiness
3. bootstrap済みworkspace/site/owner
4. `/console/`が200でHTML
5. 公開URLが200で初期`/home`を表示
6. 必須Binding/capabilitiesが期待値
7. 一時migration resourceのcleanup
8. checkpointが`COMPLETED`
9. 利用者へ管理画面URLと公開URLを返す

HTML確認では、単なる200 JSONやCloudflareエラーページを成功扱いにしない。

## 既存サイト更新

更新は新規開設と別の設計面を持つ。

- 現在release、schema version、Binding capabilitiesを検出する。
- expand-and-contract migrationを優先する。
- target Workerを先に互換的にdeployする。
- migration後も直前releaseが短時間動けるか確認する。
- rollback可能範囲を明示する。
- D1の不可逆migration後にWorkerだけ戻す危険を記録する。
- すべての利用者サイトへ一斉に破壊的更新を要求しない。
- update失敗時も既存公開サイトを可能な限り維持する。

## 撤去

- 利用者が明示的に選んだtrialだけを対象にする。
- resource ownershipとcheckpointを照合する。
- 削除順序と依存関係を定義する。
- R2 bucketが空でない場合は勝手にデータを消さず、partial destroyを返す。
- state消失時に名前推測だけで自動削除しない。
- 「存在しない」は冪等な成功として扱える箇所と、異常な欠落を区別する。
- 削除したもの、残ったもの、手動対応を利用者へ表示する。
- Cloudflare account、billing profile、R2 subscription自体は削除対象にしない。
- local stateとCloudflare resourceのどちらを先に消すか慎重に扱う。

## エラー設計

例:

```yaml
error:
  code: CF_MIGRATION_TRIGGER_INCOMPLETE_INPUT
  phase: MIGRATIONS_APPLIED
  retryable: false
  user_action: "新しい使い捨てstackで再試行、またはD1 binding経路を利用"
  cleanup_pending:
    - migration_worker
```

- user-facing messageとstable codeを分ける。
- Cloudflare APIの生レスポンスにtokenや内部情報が含まれないようsanitizeする。
- retryableでないエラーをQueueで無限retryしない。
- 同じ根本原因の大量失敗を一件ずつ手動修正しない。

## テスト

最低限:

- state transition unit tests
- checkpoint parse/encryption boundary tests
- Queue message success + 2 rejection tests
- duplicate delivery test
- partial resource creationからのresume
- Worker更新時のSecret/Assets/Binding保持
- migration途中失敗からのresume
- console HTML verificationの偽陽性拒否
- destroyの所有権拒否
- non-trial destroy拒否
- R2 bucket non-empty partial destroy
- fixed release hash mismatch拒否
- `npm run check`
- `npm run prove:local`
- 変更内容に応じた使い捨てstackでのremote proof
- remote proof後のdestroy

## 完了チェックリスト

- [ ] 新規開設と既存更新の両方を設計した。
- [ ] state machineとcheckpointを更新した。
- [ ] 各stepが冪等である。
- [ ] Queue重複配送テストがある。
- [ ] fixed releaseを維持した。
- [ ] Secret/Assets/未知Bindingを保持する。
- [ ] migration台帳とschemaを検証する。
- [ ] `/console/` HTMLと公開`/home`を確認する。
- [ ] partial failureから再開できる。
- [ ] cleanup pendingを観測できる。
- [ ] trial以外をdestroyできない。
- [ ] remote proofと撤去を実行した。
