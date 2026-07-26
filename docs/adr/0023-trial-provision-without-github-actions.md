# ADR-0023: お試し開設は利用者 Cloudflare で完結（メンテナ GitHub Actions を使わない）

- Status: Accepted（方針）。**実装は段階的 — v1 の `repository_dispatch` は暫定**
- Date: 2026-07-26
- Deciders: product / platform
- Related: [ADR-0021](0021-baseredge-product-identity-no-host-migration.md)（ワンクリック必達）、[ADR-0022](0022-cloud-operations-worker-security.md)（Operations Worker）、[trial-oauth-host.md](../deployment/trial-oauth-host.md)

## Context

一般ユーザー向けお試しの **最低水準** は、GitHub Pages `/start/` → **Cloudflare OAuth のみ** → 進捗表示 → 管理画面（Deploy ボタンや API トークン画面を見せない）である（[cloudflare-one-click-trial.md](../deployment/cloudflare-one-click-trial.md)）。

**暫定実装**（`apps/onboarding-worker`）は開設 prove を **メンテナの GitHub リポジトリ**へ `repository_dispatch` し、Actions 上で `runProve`（`npm ci` / `npm run build` / `wrangler`）を実行する。これには次の問題がある。

| 問題 | 影響 |
|------|------|
| **メンテナの GitHub Actions 枠** | お試し 1 回 ≒ workflow 1 本（数分）。無料プランでは上限・悪用で枯渇しやすい |
| **失敗しやすい** | `npm ci` / ビルド未実行、D1 再試行時のマイグレーション不整合、Secrets 不一致などで UI が「進行中」のまま止まる |
| **責務のねじれ** | ドキュメント上「fork 管理者は Actions を消費しない」と矛盾（OAuth ホストだけメンテナが Actions を消費） |
| **利用者のデータは利用者 CF** | 正しいが、**計算はメンテナ GitHub** に寄っている |

一方、**Deploy ボタン**（`deploy/one-click`）はすでに **利用者アカウント上の Workers Builds** で prove 相当を回し、メンテナの Actions を消費しない。UX は OAuth 路線より重い。

**目標:** OAuth 路線の手軽さを保ち、**開設 prove の実行場所を利用者の Cloudflare のみ**に移す。メンテナがホストするのは **薄いオーケストレーション**（trial-host + 将来は Operations と同型の境界）に限定する。

## Decision

### 1. 採用するアーキテクチャ（ターゲット）

```
利用者ブラウザ
    → trial-host（メンテナ CF）: OAuth, UI, 進捗 KV
    → 【ここから先は利用者 CF アカウント内のみ】
    → prove パイプライン（ビルド・D1・Worker デプロイ）
    → 管理画面 URL を trial-host へコールバック（またはポーリング）
```

- **メンテナ GitHub Actions はお試し開設の prove に使わない**（`onboarding-jobs` の prove ジョブは廃止予定）。
- **メンテナ GitHub** は引き続き **ソース公開・Pages `/start/` 案内・CI（品質ゲート）** に使ってよい。利用者 1 人あたりの開設コストとは切り離す。
- **片付け**はすでに [ADR-0022](0022-cloud-operations-worker-security.md) の Operations Worker（メンテナ CF、REST レシピ）— 開設と対称だが **ホストは同じメンテナ CF、アクションは利用者トークンで利用者リソースのみ**。

### 2. prove 実装の候補（実装時に 1 本化）

| 案 | 概要 | メリット | 課題 |
|----|------|----------|------|
| **A. Workers Builds（推奨第一候補）** | OAuth 後、利用者アカウントで Builds / Deploy API を起動し、リポジトリまたはテンプレートから `runProve` 相当を実行 | Deploy ボタンと同じ信頼モデル。メンテナ Actions ゼロ | Builds API・テンプレート更新・進捗の取り方の設計 |
| **B. 事前ビルド成果物 + CF REST** | 管理画面・Worker バンドルはメンテナが版固定で配布。prove は D1 作成・マイグレーション・`workers/scripts` PUT のみ | trial-host から短いジョブで完結しうる | `runProve` の大幅スリム化。版の整合・manifest |
| **C. Containers / 外部ランナー** | Node + wrangler をメンテナ CF 上で実行 | 既存 `runProve` を流用しやすい | コスト・セキュリティ（利用者トークン）・運用負荷 |

**採用:** **B**。固定成果物を、暗号化チェックポイント付きの Queue 状態機械で段階配置する。単一 Queue consumer に全REST操作を詰めると Workers Free の外部 subrequest 上限（50/invocation）を超えるため、D1、マイグレーションチャンク、Assets、Worker、Secrets、Secret反映確認、bootstrapを別 invocation に分割する。D1 マイグレーションは事前に SQLite 文単位へ分割し、D1 REST API へ直接適用する。公開 URL の伝播に依存する一時 Migration Worker は作らない。Secrets は Worker ごとの bulk API で原子的に更新し、後続の Worker upload は secret binding を保持する。**A** は開発者向けオプション、**C** は最後の手段とする。

いずれも **利用者 OAuth トークンはメモリ／短期 KV のみ**、ログに出さない（ADR-0022 と同型）。

### 3. 暫定（現状）の位置づけ

| 経路 | 状態 | メンテナ Actions |
|------|------|------------------|
| Deploy ボタン | 本番相当・維持 | 使わない |
| OAuth trial-host + `onboarding-jobs` | **暫定 PoC** | **使う（廃止予定）** |
| OAuth + CF-only prove（段階Queue + 固定成果物） | **実装済み・E2E検証中** | 使わない |

暫定路線を運用する間は、Actions 失敗時の UX（`failed` コールバック、UI でエラー表示）と D1 再試行の整合を **バグ修正として維持**するが、**新機能は CF-only 側に追加**する。

### 4. 非目標（本 ADR ではやらない）

- 利用者に API トークン手入力を戻す
- メンテナの GitHub で利用者ごとに fork / リポジトリを作る
- `runProve` を Worker 内で無制限に `wrangler` 子プロセス（Workers ランタイムでは不可）

## Consequences

### プラス

- お試しのスケールが **メンテナ GitHub 枠に依存しない**
- 「公式ホスト」と「fork 管理者不要」の説明が一致する
- 失敗モードを **利用者 CF のログ（Workers Builds）** に寄せられる

### マイナス / リスク

- 設計・実装コスト（A/B の API 調査、進捗プロトコルの統一）
- メンテナ CF（trial-host）のレート制限・悪用対策は引き続き必要
- 版更新時は manifest / テンプレート配信の運用が増える（B の場合）

## Implementation phases（計画）

| Phase | 内容 | 完了条件 |
|-------|------|----------|
| **0** | 本 ADR + [trial-provision-cloudflare-only.md](../deployment/trial-provision-cloudflare-only.md) | ドキュメント合意 |
| **1** | Workers Builds または REST スリム prove の **スパイク**（1 アカウント手動） | 利用者トークンのみで trial スタックが立つ |
| **2** | trial-host から prove 起動・進捗を **KV のみ**（GitHub dispatch 削除） | E2E: `/start/` → 管理画面、メンテナ Actions 0 |
| **3** | `onboarding-jobs` prove 廃止、Secrets 整理、トラブルシュート更新 | CI はリポジトリ品質のみ |
| **4** | 再試行時 D1 / マイグレーションの idempotent 化（Actions 有無に依存しない） | 連続お試しで壊れない |

## References

- [trial-provision-cloudflare-only.md](../deployment/trial-provision-cloudflare-only.md) — 実装チェックリスト（Phase 1–2）
- [trial-hosting-architecture.md](../internal/trial-hosting-architecture.md) — ホスト責任の整理
- `scripts/cloudflare/run-prove.mjs` — 現行 prove の正本（移植元）
- `.github/workflows/onboarding-jobs.yml` — 暫定（廃止対象）
