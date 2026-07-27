---
name: baseredge-cloudflare-runtime-contract
description: 'baserEdgeの全機能をCloudflare Workers、D1、任意のR2、Queues、Service Bindings、Static Assets上で安全に動かすための横断的実行契約。「Workerを追加・分割」「Bindingを追加」「R2なし対応」「Queueへ移す」「CPUやメモリを削減」「wranglerを変更」「ローカルと本番の差を確認」「Cloudflare無料枠や現行上限を確認」する場合に参照する。固定された古い上限値を正本にせず、Cloudflare公式文書の現行値とbaserEdge固有の資源予算を分離する。'
license: MIT
metadata:
  project: baserEdge
  role: runtime-contract
  last_verified: 2026-07-28
---

# baserEdge Cloudflare Runtime Contract

## 目的

Cloudflareを単なるデプロイ先ではなく、baserEdgeの実行モデルとして扱う。すべての機能追加はWorkersの実行特性、Binding、D1、任意のR2、非同期処理、複数Worker展開、利用者自身のCloudflareアカウント内での運用を前提に設計する。

## 正本

baserEdge固有の製品判断はリポジトリ内文書を正本とする。Cloudflareの上限、料金、API仕様、Wrangler挙動は必ず現行のCloudflare公式文書を確認する。

確認先:

- `https://developers.cloudflare.com/workers/platform/limits/`
- `https://developers.cloudflare.com/workers/platform/pricing/`
- `https://developers.cloudflare.com/workers/runtime-apis/bindings/`
- `https://developers.cloudflare.com/workers/runtime-apis/bindings/service-bindings/`
- `https://developers.cloudflare.com/workers/local-development/`
- `https://developers.cloudflare.com/d1/`
- `https://developers.cloudflare.com/r2/`
- `https://developers.cloudflare.com/queues/`
- `https://developers.cloudflare.com/workflows/`

## 変化しやすい仕様の扱い

CloudflareのCPU時間、bundle size、subrequest、Queue、D1、R2、料金等の数値をこのスキルへ固定して正本化しない。

変更時は次を記録する。

```yaml
cloudflare_assumptions:
  checked_at: YYYY-MM-DD
  target_plan: free | paid | both
  official_pages:
    - https://developers.cloudflare.com/...
  relevant_limits:
    cpu: "確認した値または該当なし"
    memory: "確認した値または該当なし"
    bundle: "確認した値または該当なし"
    subrequests: "確認した値または該当なし"
  design_margin: "上限値ではなくbaserEdge側の目標値"
```

「以前はこの値だった」という記憶で実装しない。

## 実行場所の決定

| 処理 | 既定の場所 |
|---|---|
| 管理API、認証、CMS mutation | `apps/api-worker` |
| 公開HTML、Preview、Asset配信 | `apps/public-renderer` |
| OAuth、開設状態機械 | `apps/onboarding-worker` |
| Cloudflare control-plane操作 | `apps/cloud-operations-worker` |
| Domain規則 | owning `packages/*-kernel` |
| D1/R2/Email実装 | `packages/cloudflare-adapters` |
| 長い処理、再試行可能な処理 | Queue consumerまたはWorkflow |
| 静的な管理画面資産 | Static Assets |

新しいWorkerを追加する前に、既存Workerの責務で表現できない理由を示す。

## Worker実行原則

- 大きな入力、出力、ファイルを可能な限りstreamする。
- リクエスト中にサイト全体再構築や大量一括処理を行わない。
- CPU負荷の高い変換、再試行、外部API連携は非同期化を検討する。
- fetch、D1、R2、Service Binding等の呼出し数を見積もる。
- 全行をメモリへ読み込まず、ページング、cursor、batchを使う。
- bundleへ巨大なテンプレート、生成物、重複依存を埋め込まない。
- compatibility date/flags変更を一般的なリファクタリングと混ぜない。
- `ctx.waitUntil()`を永続的ジョブキューの代用にしない。
- Worker間の内部通信は、公開URL経由よりService Bindingを優先する。
- Service Binding先は呼出し元より先に互換的にdeployする。
- Service Binding呼出しはawaitし、ライフサイクル途中終了を避ける。
- 失敗時のHTTPコード、安定したerror code、retry可否を区別する。

## Binding契約

Binding追加・変更時は、次をすべて設計する。

```yaml
binding_change:
  name: EXAMPLE
  type: d1 | r2 | queue | service | assets | secret | other
  required_at_runtime: true
  optional_fallback: none | explicit-degraded-mode
  new_install_path: "新規開設へどう追加するか"
  existing_install_path: "既存サイトへどう追加するか"
  local_path: "local simulationまたはremote binding"
  removal_path: "撤去時にどう処理するか"
  missing_behavior: "起動失敗/機能単位停止/明示的縮退"
```

- Bindingの欠落を`undefined`由来の500にしない。
- 必須Bindingは起動またはcapabilitiesで明示的に検査する。
- 任意Bindingは能力として公開し、UI/APIが同じ状態を共有する。
- Secretは通常vars、D1、ログへ複製しない。
- Worker更新時に既存Secret、Static Assets、未知のBindingを失わない。
- Binding名変更はadd → migrate → removeの順で互換期間を設ける。

## R2なし構成

R2は常に存在するとは限らない。機能は少なくとも次を区別する。

- `unconfigured`: 利用者がR2を使っていない。
- `configured`: Bindingとbucketが利用可能。
- `temporarily_unavailable`: 構成済みだが呼出しに失敗した。

R2なしの標準trialでは、現行のD1 inline asset仕様とcapabilitiesを壊さない。R2必須機能を追加する場合は、標準trialから除外するか、明示的な縮退動作を定義する。

## D1境界

D1の詳細は `baseredge-d1-development` を参照する。

- 同一D1内で守れる原子性と、Cloudflare API/R2/Emailをまたぐ処理を分ける。
- 外部副作用はOutbox、Queue、冪等キーを使う。
- read replicationを導入する場合はSessionsとread-your-writesを設計する。
- query数、rows read/written、index、payload sizeを観測可能にする。
- migrationは新旧Workerの互換期間を考慮する。

## 非同期化

Queueは重複配送を前提にする。

- メッセージに不変のoperation IDを持たせる。
- consumerは同じメッセージを複数回処理しても最終状態が壊れない。
- 外部APIへも可能なら同じidempotency keyを渡す。
- ack/retry/dead-letterを処理結果ごとに決める。
- Queue投入前の業務更新とOutbox記録は同じD1原子境界に置く。
- payloadへOAuth token、Secret、不要な個人情報を入れない。
- 大きなpayloadはD1/R2参照にし、Queueには識別子を渡す。
- 時間のかかる複数段階処理はWorkflowまたはcheckpointed state machineを検討する。

## Cloudflare API操作

Workers/D1/R2/Queue/Secret等をCloudflare APIで作る処理は原子的ではない。

- 各ステップを再実行可能にする。
- 作成済みリソースを検出し、所有権を確認してから再利用する。
- 名前一致だけで既存リソースを削除・上書きしない。
- checkpointへ作成したresource IDを保存する。
- compensation/cleanupを定義する。
- partial successを利用者へ隠さない。
- control-plane APIの一時失敗を無制限にretryしない。
- retryは指数backoff、上限、観測可能なattempt countを持つ。
- token、authorization header、Secretをログへ出さない。

## ローカル開発

Cloudflareのlocal executionとBinding接続先を分けて考える。

- local simulationがあることを本番同等性の証明とみなさない。
- remote bindingを使う場合は、実データ変更の危険を明示する。
- local testがUTCで動く前提を壊す日時依存テストを書かない。
- Service Bindings、Queues、D1、R2等のlocal/remote対応差を現行公式文書で確認する。
- 実Cloudflareでのみ確認できる変更は `baseredge-testing` のremote proofへ送る。

## 資源予算

各機能追加で、上限値とは別にbaserEdge側の目標を置く。

```yaml
resource_budget:
  request_path: "例: POST /v1/content/:id/publish"
  target_plan: free | paid | both
  expected_cpu_class: low | medium | high
  max_domain_items_per_request: 100
  expected_d1_statements: 8
  expected_external_calls: 0
  streams_large_payloads: true
  async_boundary: none | queue | workflow
  bundle_delta_reviewed: true
  degradation_mode: "R2なし等"
```

上限ぎりぎりを通常運用の目標にしない。

## Remote proofが必要な変更

次の変更は原則として実Cloudflareで検証する。

- `wrangler*.jsonc`
- compatibility date/flags
- D1 migration実行経路
- Trigger、view、remote D1固有挙動
- Queue producer/consumer
- Service Binding
- Static Assets binding
- R2公開配信
- OAuth scope/callback
- Cloudflare APIによる作成・更新・削除
- Workers for Platforms / dispatch / egress policy
- Secret保持とWorker更新
- 開設・撤去経路

実行方法は `baseredge-testing` を参照する。

## 完了チェックリスト

- [ ] Cloudflare公式仕様を変更日当日に確認した。
- [ ] 対象planとbaserEdge側資源予算を記録した。
- [ ] 実行Workerとowning kernelを決めた。
- [ ] Binding追加時に新規・既存・local・撤去経路を定義した。
- [ ] R2なし動作を確認した。
- [ ] Queue/Workflow処理は冪等である。
- [ ] Cloudflare API操作はcheckpointとcleanupを持つ。
- [ ] Secretとtokenをログ・D1平文へ出さない。
- [ ] Worker更新で既存Binding/Secret/Assetsを保持する。
- [ ] 必要なremote proofを実行した。
