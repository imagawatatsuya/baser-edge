---
name: baseredge-development
description: 'baserEdgeで機能追加・改修・障害修正を行う際の共通入口。サイトツリー、Revision、認証、管理画面、Cloudflare Workers/D1/R2/Queues、ワンクリック開設のどこへ変更を置くべきか判断し、正本スキルへ振り分ける。「新機能を追加」「どのpackageを変更するか」「APIと管理画面を実装」「Cloudflareへの影響を確認」「完了条件を決める」場合に参照する。Cloudflare実行モデルはbaseredge-cloudflare-runtime-contract、開設系はbaseredge-onboarding-deployment、D1はbaseredge-d1-development、検証はbaseredge-testingを正本とする。'
license: MIT
metadata:
  project: baserEdge
  role: router
  last_verified: 2026-07-28
---

# baserEdge 開発共通入口

## 目的

このスキルは、baserEdgeの変更要求を適切なドメイン、アプリ、Cloudflareリソース、検証経路へ振り分ける共通入口である。個別技術の詳細を重複して持たず、各正本スキルへ誘導する。

## 権威の順序

実装判断では、次の順序を守る。

1. `AGENTS.md` の非交渉の不変条件
2. `docs/requirements/product-requirements-v0.4.md`
3. 現行ADR、実装計画、engineering/deployment文書
4. `IMPLEMENTATION_STATUS.md`
5. このスキル群
6. 外部の一般的な実装例

外部の例が上位文書と衝突する場合は採用しない。

## 着手前に読むもの

最低限、次を確認する。

- `AGENTS.md`
- `IMPLEMENTATION_STATUS.md`
- `docs/developer-guide.md`
- `docs/engineering/validation-policy.md`
- 変更対象に対応するaudit、ADR、deployment文書
- Cloudflareへ影響する場合は `baseredge-cloudflare-runtime-contract`
- D1へ影響する場合は `baseredge-d1-development`
- 開設・更新・撤去へ影響する場合は `baseredge-onboarding-deployment`
- 完了判定では `baseredge-testing`

## 非交渉の不変条件

- サイトツリーをコンテンツ管理の中心にする。
- Contentの識別子とRoute/Pathの識別子を分ける。
- Content Revision、Theme Release、Plugin Releaseを不変にする。
- HTMLを正本の編集文書にしない。
- AI Agentは既定の方針で直接公開しない。
- Human、Agent、Service、Pluginは同じApplication Serviceと監査モデルを使う。
- Plugin Manifestの要求権限を許可とみなさない。
- 任意実行コードをcore processへ追加しない。
- Sandboxやegress policyが成立しない場合は失敗時閉鎖する。
- post-commit Hookにロールバック能力があるように見せない。
- baserCMS PHP資産を診断中に実行しない。
- 新機能のために一発開設経路を壊さない。

## 変更の分類

最初に変更を次へ分類する。複数にまたがる場合は責務を分ける。

| 領域 | 主な配置 |
|---|---|
| サイトツリー、Revision、承認、公開 | `packages/content-kernel` |
| Blog、Article、Taxonomy、RSS | `packages/blog-kernel` |
| Custom Content | `packages/custom-content-kernel` |
| Mail Form、Submission、通知 | `packages/mail-form-kernel` |
| Theme、Token、Layout、Release | `packages/theme-kernel` |
| Plugin、Manifest、Activation、隔離実行 | `packages/plugin-kernel` |
| Passkey、Session、CSRF、Step-up | `packages/auth-kernel` |
| D1、R2、Email等の実装 | `packages/cloudflare-adapters` |
| 管理API、認証HTTP境界 | `apps/api-worker` |
| 公開・Preview・Asset配信 | `apps/public-renderer` |
| 人間向け管理画面 | `apps/admin-web` |
| OAuth開設オーケストレーション | `apps/onboarding-worker` |
| 開設開始画面 | `apps/onboarding-web` |
| Cloudflare操作の隔離境界 | `apps/cloud-operations-worker` |
| D1スキーマ変更 | `migrations` |

## 標準実装順序

1. 要求を一文で定義する。
2. 既存不変条件と衝突しないことを確認する。
3. owning kernelを決める。
4. Domain入力、正規化、安定したエラーコードを定義する。
5. D1変更、外部副作用、非同期化、Binding変更の有無を判定する。
6. kernel/application serviceを実装する。
7. adapterとAPI workerを実装する。
8. `/console/`へ公開する場合は管理UIを実装する。
9. mutation後のread-your-writesを実装する。
10. 成功経路と拒否経路をテストする。
11. 開設、更新、撤去、R2なし構成への影響を確認する。
12. `baseredge-testing` の完了条件を満たす。

## 入力検証

- Domain/kernelが正本である。
- APIは型付き抽出を行い、未検証JSONへ`as string`等を使わない。
- UIはserver規則を先行表示するが、唯一の防壁にしない。
- 修正可能な入力は原則422、認証・認可は401/403、競合は409を使う。
- `DomainError.code`等の安定したコードを契約にする。
- 新しい入力面には成功1件と拒否2件以上を追加する。
- 変更したAPI面は `docs/engineering/api-validation-audit.md` を更新する。

## 管理画面

- 管理画面は `apps/admin-web` の `/console/` が製品面である。
- 成功したmutation後、依存するtree/list/detail/cacheを更新する。
- `docs/engineering/console-mutation-sync-audit.md` を更新する。
- `/console/`の挙動変更はgolden pathまたはfocused UI wiring testを追加する。
- C0 wireframe範囲を無関係に拡張しない。

## Cloudflare影響判定

次のいずれかに該当する場合、`baseredge-cloudflare-runtime-contract` を必ず読む。

- Workerを追加・分割・統合する。
- D1、R2、Queue、Service Binding、Assets、Secretを変更する。
- `wrangler*.jsonc`、compatibility date/flagsを変更する。
- HTTPリクエスト内のCPU、メモリ、外部呼出し量が増える。
- 重い処理、再試行、定期処理を追加する。
- Cloudflare APIを使ってリソースを作成・更新・削除する。
- 開設済みサイトのアップグレードが必要になる。

## 禁止される近道

- UIだけに検証を置く。
- Domainを通さずD1へ直接保存する。
- Cloudflare APIをまたぐ処理を一つのトランザクションとみなす。
- Queue consumerを一回だけ実行される前提で書く。
- R2 bindingが常に存在すると仮定する。
- 開発用Principal Headerや簡易ログインを本番へ漏らす。
- ローカル成功だけでCloudflare固有変更を完了扱いにする。
- 新しいBindingを追加し、既存開設サイトを即座に起動不能にする。
- SecretやOAuth tokenをログ、D1平文、state JSONへ保存する。
- 既存のSecret、Assets、BindingをWorker更新で消す。

## 完了時の報告形式

```markdown
## 変更概要
## 変更したdomain / apps / packages
## 守った不変条件
## D1 / Binding / onboardingへの影響
## 追加した成功・拒否テスト
## 実行した検証
## 未検証事項と理由
## ロールバック・撤去方法
```

## 関連スキル

- `baseredge-cloudflare-runtime-contract`
- `baseredge-onboarding-deployment`
- `baseredge-d1-development`
- `baseredge-testing`


## 適応型コンテキスト

機能追加前に `.agents/context/baseredge-context.snapshot.json` を確認する。現在のpackage/pathはsnapshotが解決し、CMS知識は `cms-knowledge-registry.json` を正本とする。

```bash
node scripts/agents/check-context-drift.mjs --strict=review
```

driftがある場合は `baseredge-cms-knowledge-review` を使う。古いpathを推測して実装しない。
