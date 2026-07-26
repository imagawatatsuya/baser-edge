# ADR-0023: お試し開設は利用者 Cloudflare で完結（メンテナ GitHub Actions を使わない）

- Status: Accepted / Implemented（固定リリース + Queue + CF REST）
- Date: 2026-07-26
- Deciders: product / platform
- Related: [ADR-0021](0021-baseredge-product-identity-no-host-migration.md)（ワンクリック必達）、[ADR-0022](0022-cloud-operations-worker-security.md)（Operations Worker）、[trial-oauth-host.md](../deployment/trial-oauth-host.md)

## Context

一般ユーザー向けお試しの最低水準は、開始ページ → **Cloudflare OAuthのみ** → 進捗表示 → 管理画面と公開サイトのURL表示（DeployボタンやAPIトークン画面を見せない）である（[cloudflare-one-click-trial.md](../deployment/cloudflare-one-click-trial.md)）。

本ADR決定時の暫定実装は、開設proveをメンテナのGitHubリポジトリへ`repository_dispatch`し、Actions上で実行していた。これには次の問題があった。

| 問題 | 影響 |
|------|------|
| **メンテナの GitHub Actions 枠** | お試し 1 回 ≒ workflow 1 本（数分）。無料プランでは上限・悪用で枯渇しやすい |
| **失敗しやすい** | `npm ci` / ビルド未実行、D1 再試行時のマイグレーション不整合、Secrets 不一致などで UI が「進行中」のまま止まる |
| **責務のねじれ** | ドキュメント上「fork 管理者は Actions を消費しない」と矛盾（OAuth ホストだけメンテナが Actions を消費） |
| **利用者のデータは利用者 CF** | 正しいが、**計算はメンテナ GitHub** に寄っている |

一方、**Deploy ボタン**（`deploy/one-click`）はすでに **利用者アカウント上の Workers Builds** で prove 相当を回し、メンテナの Actions を消費しない。UX は OAuth 路線より重い。

**目標:** OAuth 路線の手軽さを保ち、**開設 prove の実行場所を利用者の Cloudflare のみ**に移す。メンテナがホストするのは **薄いオーケストレーション**（trial-host + 将来は Operations と同型の境界）に限定する。

## Decision

### 1. 採用したアーキテクチャ

```
利用者ブラウザ
    → trial-host（メンテナ CF）: OAuth, UI, 進捗 KV
    → 【ここから先は利用者 CF アカウント内のみ】
    → 固定リリース + Queue（D1・Migration・Assets・Worker・Secrets）
    → 管理画面URLと公開サイトURLをtrial-hostへ保存
```

- **メンテナGitHub Actionsはお試し開設のproveに使わない**。
- **メンテナ GitHub** は引き続き **ソース公開・Pages `/start/` 案内・CI（品質ゲート）** に使ってよい。利用者 1 人あたりの開設コストとは切り離す。
- **片付け**はすでに [ADR-0022](0022-cloud-operations-worker-security.md) の Operations Worker（メンテナ CF、REST レシピ）— 開設と対称だが **ホストは同じメンテナ CF、アクションは利用者トークンで利用者リソースのみ**。

### 2. 検討した実装候補

| 案 | 概要 | メリット | 課題 |
|----|------|----------|------|
| **A. Workers Builds（推奨第一候補）** | OAuth 後、利用者アカウントで Builds / Deploy API を起動し、リポジトリまたはテンプレートから `runProve` 相当を実行 | Deploy ボタンと同じ信頼モデル。メンテナ Actions ゼロ | Builds API・テンプレート更新・進捗の取り方の設計 |
| **B. 事前ビルド成果物 + CF REST** | 管理画面・Worker バンドルはメンテナが版固定で配布。prove は D1 作成・マイグレーション・`workers/scripts` PUT のみ | trial-host から短いジョブで完結しうる | `runProve` の大幅スリム化。版の整合・manifest |
| **C. Containers / 外部ランナー** | Node + wrangler をメンテナ CF 上で実行 | 既存 `runProve` を流用しやすい | コスト・セキュリティ（利用者トークン）・運用負荷 |

**採用:** **B**。固定成果物を、暗号化チェックポイント付きの Queue 状態機械で段階配置する。単一 Queue consumer に全REST操作を詰めると Workers Free の外部 subrequest 上限（50/invocation）を超えるため、D1、マイグレーションチャンク、Assets、Worker、Secrets、Secret反映確認、bootstrapを別 invocation に分割する。

D1 の control-plane `/query` は `CREATE TRIGGER ... BEGIN ...; ... END` の内部セミコロンを正しく扱えず `SQLITE_ERROR: incomplete input` になるため、マイグレーション専用の一時 Worker を利用者アカウントへ配置し、D1 binding の `prepare(sql).run()` で完全な文を実行する。呼び出しはランダムな一時 Secret で認証し、1 invocation は30文以下、完了後に Worker を削除する。Queue invocation の最大外部 subrequest 数は47で Free plan の50未満を維持する。Secrets は Worker ごとの bulk API で原子的に更新し、後続の Worker upload は secret binding を保持する。**A** は開発者向けオプション、**C** は最後の手段とする。

いずれも **利用者 OAuth トークンはメモリ／短期 KV のみ**、ログに出さない（ADR-0022 と同型）。

### 3. 現在の位置づけ

| 経路 | 状態 | メンテナ Actions |
|------|------|------------------|
| Deployボタン | 開発者向けフォールバック | 使わない |
| OAuth trial-host + `onboarding-jobs` | 旧方式・新規機能を追加しない | 使う |
| OAuth + CF-only prove（段階Queue + 固定成果物） | **一般ユーザー向け標準経路** | 使わない |

新規の開設機能とバグ修正はCF-only経路へ追加する。GitHub方式は標準経路として扱わない。

### 4. 非目標（本 ADR ではやらない）

- 利用者に API トークン手入力を戻す
- メンテナの GitHub で利用者ごとに fork / リポジトリを作る
- `runProve` を Worker 内で無制限に `wrangler` 子プロセス（Workers ランタイムでは不可）

## Consequences

### プラス

- お試しのスケールが **メンテナ GitHub 枠に依存しない**
- 「公式ホスト」と「fork 管理者不要」の説明が一致する
- 失敗工程をtrial-hostの進捗KVとQueue consumerログで特定できる

### マイナス / リスク

- 固定リリースの更新、Queue状態機械、進捗プロトコルを保守する必要がある
- メンテナ CF（trial-host）のレート制限・悪用対策は引き続き必要
- 版更新時は manifest / テンプレート配信の運用が増える（B の場合）

## Implementation phases（実施状況）

| Phase | 内容 | 完了条件 |
|-------|------|----------|
| **0** | 本ADR + [trial-provision-cloudflare-only.md](../deployment/trial-provision-cloudflare-only.md) | 完了 |
| **1** | 固定リリース + REST proveのスパイク | 完了 |
| **2** | trial-host、Queue、KVチェックポイント | 完了 |
| **3** | GitHub Actionsを標準経路から除外、Secrets整理、トラブルシュート更新 | 完了 |
| **4** | D1 Migrationの再開、全オブジェクト検証、一時Migration Worker | 完了 |
| **5** | `/console/`配信確認、URL保持、初期`/home`作成 | 完了 |

## References

- [trial-provision-cloudflare-only.md](../deployment/trial-provision-cloudflare-only.md) — 現行実装チェックリスト
- [trial-hosting-architecture.md](../internal/trial-hosting-architecture.md) — ホスト責任の整理
- `scripts/cloudflare/run-prove.mjs` — 現行 prove の正本（移植元）
- `.github/workflows/onboarding-jobs.yml` — 旧GitHub経路
