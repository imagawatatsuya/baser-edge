---
name: baseredge-d1-development
description: 'baserEdgeでD1 schema、migration、repository/adapter、複数更新の原子性、Outbox、Trigger/View、index、query効率、read replication、Sessions、復旧を設計・実装する際の正本。「テーブルを追加」「migrationを書く」「複数テーブルを同時更新」「通知Outboxを追加」「remote D1だけ失敗」「Triggerを追加」「保存直後に古い値が見える」「D1 queryを減らす」場合に参照する。'
license: MIT
metadata:
  project: baserEdge
  role: d1-development
  last_verified: 2026-07-28
---

# baserEdge D1 Development

## 目的

D1を単なるSQLite互換DBとしてではなく、Cloudflare Workersから利用するbaserEdgeの永続化境界として扱う。Domain不変条件、Revision/Releaseの不変性、原子性、migration、remote特有の差、復旧可能性を守る。

## 正本

- `AGENTS.md`
- `docs/architecture/architecture-overview-v0.3.md`
- `docs/engineering/validation-policy.md`
- `docs/engineering/api-validation-audit.md`
- `migrations/`
- `scripts/verify-schema.mjs`
- owning kernelと`packages/cloudflare-adapters`
- Cloudflare D1公式文書

Cloudflare仕様は現行公式文書を確認する。

- `https://developers.cloudflare.com/d1/worker-api/d1-database/`
- `https://developers.cloudflare.com/d1/platform/limits/`
- `https://developers.cloudflare.com/d1/best-practices/`
- `https://developers.cloudflare.com/d1/best-practices/read-replication/`
- `https://developers.cloudflare.com/d1/best-practices/use-indexes/`

## 責務分離

- Domain規則と入力検証はowning kernelに置く。
- SQL、D1 binding、row mappingはadapter/repositoryに置く。
- API Workerへbusiness ruleを埋め込まない。
- UIからD1へ直接接続しない。
- Triggerはアプリを迂回しても守る必要がある整合性に限定する。
- DB constraintだけにuser-facing validationを委ねない。

## ID、時刻、不変データ

- ID生成方法は既存規則に合わせる。
- Content identityとroute/path identityを混ぜない。
- Revision、Theme Release、Plugin ReleaseをUPDATEで上書きしない。
- active pointerやactivationは別レコード/参照として扱う。
- 時刻はUTCで保存し、表示時にlocalizeする。
- mutable snapshotとimmutable revisionを混同しない。
- soft delete/trashと物理削除を区別する。
- audit主体とactor contextを保存する。

## 原子性

同一D1で同時に成立すべき複数文は`db.batch()`等の明示的な原子境界へまとめる。

例:

- Content mutation + immutable Revision作成
- publication pointer更新 + Audit記録
- Route移動 + redirect予約 + tree version更新
- Mail Submission保存 + notification Outbox作成
- Queue投入予約用Outbox + business state更新

ただし次は同じD1 transactionでは守れない。

- R2 object write/delete
- Email送信
- Queueへの実投入
- Cloudflare APIによるWorker/D1/R2操作
- 外部HTTP API

外部副作用はOutbox、Queue、冪等operation ID、補償処理を使う。

## Outboxパターン

```text
D1 batch:
  business mutation
  + outbox row(operation_id, type, payload_ref, status=pending)
        ↓
dispatcher
        ↓
Queue / Email / external API
        ↓
outbox delivered または retry state
```

- operation IDは不変で一意にする。
- payloadへSecretや不要な個人情報を複製しない。
- duplicate dispatcher/consumerを許容する。
- delivered更新前後で落ちても外部側idempotency keyを再利用する。
- purge/retentionを設計する。
- post-commit Hookはcommitを取り消せないことをAPI上も明示する。

## migration規約

- migrationは順序付きで追跡する。
- `npm run verify:schema`が期待schema、table/view、Trigger、台帳を検証できるよう更新する。
- 新しいcolumnはまずnullable/default付きで追加し、backfill後に厳格化する。
- rename/dropは互換期間を設ける。
- 新Workerと旧Workerの両方が短時間動けるexpand-and-contractを優先する。
- destructive migrationにはrollback不能範囲を文書化する。
- migration内で外部API、Email、R2操作を行わない。
- 大量backfillをHTTP requestや単一migration stepへ詰め込まない。
- migrationの再適用、部分適用、台帳欠落をテストする。
- schemaが存在するだけでmigration成功と判定せず、台帳と構造を照合する。

## Triggerとremote D1

remote control-plane経路では、`CREATE TRIGGER ... BEGIN ...; ... END`の内部セミコロンを含むSQLがローカルと異なる挙動を示す可能性がある。

- 現行の一時Migration Worker + D1 binding経路を正本として確認する。
- Trigger追加時はlocal migration成功だけで完了にしない。
- remote proofでTriggerの存在と実動作を確認する。
- SQLを雑にセミコロン分割しない。
- 完全なstatement境界を扱えるrunnerを使う。
- `incomplete input`の回避を個別migrationへコピペせずrunner側へ集約する。

## query設計

- `SELECT *`を既定にしない。
- list APIはlimit、cursor/offset、closed sortを持つ。
- UIのN+1 queryを避ける。
- 大量IDの巨大な`IN`や巨大statementを避け、現行D1上限を確認する。
- Filter、join、order、foreign key相当のアクセスにindexを検討する。
- index追加はread改善だけでなくwrite増加も評価する。
- partial indexが適する場合を検討する。
- query resultのmetadataを利用できる箇所ではrows read/written等を観測する。
- 同じrequest内で同一データを何度もreadしない。
- admin mutation後の再読込数をUI syncと合わせて確認する。
- 全データをWorkerメモリへ読み込んでfilterしない。

## Prepared Statementと入力

- 外部入力をSQL文字列連結しない。
- bind parameterを使う。
- column/table/order direction等の識別子はclosed allowlistで選ぶ。
- JSON payloadはDomainでschema validationしてから保存する。
- unknown structured-document blocksの保持方針を壊さない。
- DB errorをそのままuser-facing messageへ露出しない。
- unique/conflictを安定したDomainError codeへ変換する。

## read-your-writes

管理画面は保存直後に自身の更新を読める必要がある。

- 現行でread replicationを使っていない場合、理由なく導入しない。
- read replicationを有効にする場合はD1 Sessions APIを使う。
- logical browser/sessionとD1 session/bookmarkの対応を設計する。
- write後のreadが必要な経路はbookmarkまたはprimary相当の一貫性を確保する。
- UI cache invalidationだけでDBのreplica lagを解決したとみなさない。
- session/bookmarkを無制限にcookieへ肥大化させない。
- public readとadmin readで必要な一貫性を分ける。

## R2との整合

Asset metadataはD1、object bodyはR2またはtrial inline storageにある。

- D1 recordとR2 objectを一つのtransactionとみなさない。
- upload session → object write → finalize metadataの状態を明示する。
- orphan objectとdangling metadataの回収経路を持つ。
- deleteは参照検査後に行う。
- object delete失敗時にmetadataだけ消して不可視化しない。
- immutable object key/versioned keyを優先する。
- R2なしtrialのD1 inline制限と能力表示を維持する。

## backupと復旧

- migration前に復旧手段と不可逆点を確認する。
- D1 export/Time Travel等の現行機能と制約は公式文書を確認する。
- state JSONをbackupの代用にしない。
- schema versionとrelease IDを復旧判断へ使う。
- restore後にWorker release、migration台帳、schemaを照合する。
- audit/approval/revisionの整合性を復旧検証へ含める。

## テスト

最低限:

- Domain success + rejection 2件以上
- repository mapping
- batch途中失敗のrollback
- stale lock/tree version 409
- duplicate operation ID
- Outbox replay
- migration from previous schema
- partially applied migration recovery
- Trigger existenceとbehavior
- indexを前提にしたcorrectness test
- R2なしasset path
- read-after-write
- `npm run verify:schema`
- `npm run check`
- Trigger/migration変更時のremote proof

## 完了チェックリスト

- [ ] owning kernelで入力と不変条件を検証した。
- [ ] SQLをadapter/repositoryへ置いた。
- [ ] 同一D1で必要な複数更新を原子境界へまとめた。
- [ ] 外部副作用へOutbox/冪等性を用意した。
- [ ] migrationをexpand-and-contractで検討した。
- [ ] schema verificationを更新した。
- [ ] Triggerをremote D1で実証した。
- [ ] query数、index、rows read/writeを評価した。
- [ ] read-your-writesを確認した。
- [ ] R2との部分失敗を扱った。
- [ ] backup/復旧/rollback不能範囲を記録した。
