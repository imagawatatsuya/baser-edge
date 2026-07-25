# ADR-0022: Cloud Operations Worker（方式1）— セキュリティとクラウド破産防止

- Status: Accepted
- Date: 2026-07-26
- Deciders: product / platform
- Supersedes: informal teardown notes in [cloudflare-teardown.md](../deployment/cloudflare-teardown.md) §製品ロードマップ（方針は本 ADR を正とする）

## Context

一般ユーザー向けお試しの **片付け（テアダウン）** と、将来の **CMS 的アップデート通知・適用** は、利用者の Cloudflare アカウントに対する **公式の「クラウド操作」** になる。方式1として **メンテナが運用する薄い Operations Worker**（固定 URL）を採用する（[会話上の方式1](../deployment/cloudflare-teardown.md)）。

リスク:

1. **クラウド破産** — 公開 URL への乱打、OAuth フローの悪用、R2 大量削除ループによる CPU / サブリクエスト / ログの従量爆発。
2. **越権削除** — 許可されたトークンで baserEdge 以外のリソースを消す、または他人の意図しない削除。
3. **トークン漏えい** — 短期 API トークンや OAuth 状態のログ・永続化ミス。
4. **供給網** — Operations Worker 改ざんによる全利用者への影響。

既存の `scripts/onboarding` は `ob-*` スタック向けに OAuth・レート制限・`runDestroy` の原型があるが、**本番の trial ワンクリック**と **コスト上限** は本 ADR で別設計する。

## Decision

### 1. 責務の分離

| コンポーネント | ホスト | 責務 |
|----------------|--------|------|
| **CMS Worker**（利用者） | 利用者 CF | 編集・公開・`/console/`・コンテンツデータ |
| **Operations Worker** | **メンテナ CF** | OAuth 開始/完了、**固定レシピ**の teardown（将来: upgrade apply）、レート制限、監査ログ |
| **Release manifest** | **GitHub Pages または静的 R2**（推奨） | 版情報のみ。Operations Worker に載せない（リクエスト爆発を避ける） |

Operations Worker は **利用者データを保持しない**（D1 なし）。OAuth `state` / 一回限りのジョブ ID のみ **KV、TTL ≤ 15 分**。

### 2. 脅威モデルと失敗モード（fail closed）

| 脅威 | 対策 |
|------|------|
| 匿名の大量アクセス | IP + グローバルレート制限；削除は **認証済み OAuth のみ**；`GET` では副作用なし |
| OAuth 開始の乱発 | Turnstile（必須）+ `/oauth/start` の厳しいレート制限 |
| トークンで任意 API | **汎用 CF プロキシ禁止**。許可されるのは `destroyTrialStack(accountId)` の固定手順のみ |
| 誤削除 | 確認 UI（利用者 CF ログイン＋明示文言）；将来は CMS 側 step-up 後の **短期署名付き intent** |
| メンテナ Worker 侵害 | 最小権限デプロイ、単一スクリプト、署名付きリリース、キルスイッチ（§7） |
| R2 空化の長時間 CPU | **1 リクエストあたり削除オブジェクト上限** + 継続は **別ジョブ（同一 account 1 並列）** |

いずれかの制限・検証に失敗したら **操作しない**（422/429/503）。「とりあえず wrangler 相当を全部試す」は禁止。

### 3. 削除対象の allowlist（越権防止）

`stackId` は **`trial` のみ**（v1）。名前は `stack.mjs` と一致させる:

- Workers: `baser-edge-api-trial`, `baser-edge-public-trial`
- D1: `baser-edge-trial`
- R2: `baser-edge-assets-trial`（存在時のみ）

**`default` / 任意 stackId / ワイルドカードは本番 Operations では受け付けない。** 開発者用 CLI `destroy:cloudflare` は従来どおりローカル wrangler（別経路）。

削除前に **Cloudflare API で存在確認**。Worker 名が allowlist に合致しないリソースは触らない。将来「この Worker は baserEdge お試し」と分かる **タグまたは環境変数**（例: `BASER_EDGE_STACK=trial`）の検証を追加してよい（v1.1）。

### 4. OAuth とシークレット

- **PKCE 必須**（onboarding 同等）。
- **state** は KV に一回限り保存。再利用検知で拒否。
- 利用者に **API トークンの手入力 UI を出さない**（フィッシング・全権トークン回避）。
- OAuth / API トークンの **スコープは最小テンプレート**（当該アカウント内の上記リソース種別のみ）。可能なら Cloudflare の **限定権限トークン** テンプレをドキュメント化する。
- トークンは **メモリ上で即使用→破棄**。ログ・KV・D1 に保存しない。
- **ログにトークン・Authorization ヘッダを出さない**（Logpush 含む）。

### 5. クラウド破産防止（コスト上限）— 必須

Operations Worker は **メンテナの請求**に載る。以下を **実装要件** とする。

#### 5.1 レート制限（多層）

| 層 | 目安（初期値・要定数化） |
|----|---------------------------|
| グローバル | teardown **開始** ≤ 500 回/日（超過は 503 + アラート） |
| 送信元 IP | `/oauth/start` ≤ 20/時、`/oauth/callback` ≤ 30/時 |
| Cloudflare Account ID（トークン検証後） | teardown 完了 ≤ **3/日** |
| 並列 | アカウントあたり **進行中ジョブ 1** |

#### 5.2 1 回の teardown の作業上限

| 項目 | 上限 |
|------|------|
| R2 オブジェクト削除 | **200 キー/ジョブ**（超過は「部分完了」+ 利用者へダッシュボード手順。無限ループ禁止） |
| サブリクエスト | Worker 1 invocation あたり CF API 呼び出し **≤ 50**（超過で中断） |
| CPU | Workers Paid 前提。Free（10ms）は **本番 Operations に使わない** |

#### 5.3 課金の外側ガード（運用）

- メンテナ CF アカウントで **Billing アラート**（例: 月 $10 / $25 超で通知）。
- Operations Worker 専用サブアカウントまたは **請求タグ**で可視化（可能なら）。
- **キルスイッチ**: Worker 環境変数 `BASER_OPS_DISABLED=1` で全 mutating ルート即 503（デプロイのみで切替）。

#### 5.4 エンドポイント設計

- **GET**: 静的説明 HTML のみ（キャッシュ可）。削除・OAuth 交換は **POST** のみ。
- **Turnstile**: OAuth 開始前に検証（ボットによる OAuth 開始コストを抑止）。
- Manifest / 更新チェックは **GitHub Pages** 等に分離し、Operations の req を増やさない。

### 6. 利用者向け体験（セキュリティと両立）

- 文言は **「お試しサイトをやめる」**（destroy / スタックを表に出さない）。
- 完了後: 管理 URL が 404 になること、**復元不可**、R2 だけ残る場合の **部分成功** を明示。
- `/start/` は **コンソールへ誘導**（未ログインでの誤爆削除を減らす）。

### 7. 将来の CMS アップデート（同一 Operations 窓口）

- **manifest** は静的配信。Operations は **「適用」ボタン**のみ OAuth 経由（teardown と同型のレート制限・allowlist・ジョブ上限）。
- アップデート適用は **migrate + redeploy レシピ固定**。任意 Worker 名のデプロイは不可。

### 8. 監査

- 構造化ログ: `teardown.requested` / `teardown.completed` / `teardown.denied`（理由コード）。
- フィールド: `requestId`, `outcome`, `stackId`, **accountId のハッシュ**（生 ID はログに避ける）、レート制限ヒット。
- 利用者 CMS の `audit` テーブルとは別。照合は将来 `requestId` でよい。

### 9. 実装経路

- **v1**: Cloudflare Worker（`apps/cloud-operations` 等新規）+ KV。削除は **REST API**（Worker 内で `wrangler` サブプロセスは使わない）。
- **ロジック共有**: `runDestroy` と同等の順序を **ライブラリ化**（`packages/` または `scripts/cloudflare/` から Worker 安全な API クライアントを抽出）。CLI `destroy:cloudflare` と Operations で **同じレシピ**。
- **onboarding** の `ob-*` destroy は当面維持。trial は **Operations Worker** が正規経路。

### 10. テスト・リリース

- 拒否テスト: allowlist 外、レート超過、二重 state、Turnstile 失敗、無効トークン → **操作ゼロ**。
- ステージング CF アカウントで dry-run モード（`BASER_OPS_DRY_RUN=1` は API 呼び出ししない）。
- 本番前: ペネトレーション観点で「公開 URL から課金が跳ねる経路が無いこと」をチェックリスト化。

## Non-goals

- 利用者の **Cloudflare アカウント削除** や **請求プロファイル削除**。
- GitHub fork の自動削除。
- コンソールから **default 本番スタック**のワンクリック削除（CLI・明示 stack のみ）。
- Operations Worker 上での **利用者コンテンツのホスティング**。

## Consequences

- メンテナは **小さな常時 Worker**（おおよそ **Workers Paid $5/月** 想定）を運用するが、§5 により **従量爆発は設計上抑止**する。
- `docs/deployment/cloudflare-teardown.md` の一般ユーザー導線は **Operations URL + コンソール** に更新する（実装後）。
- 新規コードは **汎用 CF 管理 API** を公開しない。レビューで「プロキシ化」していないか確認する。
- `general-user-trial-experiment.md` の片付けは、実装完了後に **コンソール手順**へ差し替える。

## References

- [cloudflare-teardown.md](../deployment/cloudflare-teardown.md)
- [cloudflare-r2-and-media.md](../deployment/cloudflare-r2-and-media.md)
- [ADR-0019](./0019-human-authentication-sessions-and-step-up.md)（将来: コンソール step-up と intent 連携）
- [ADR-0021](./0021-baseredge-product-identity-no-host-migration.md)
- [Cloudflare Workers pricing](https://developers.cloudflare.com/workers/platform/pricing/)
