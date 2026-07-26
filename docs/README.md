# baserEdge ドキュメント

このページは、読む人と目的に応じて文書を探すための索引です。初めて利用する方は、設計記録や過去の実装計画ではなく、最初に[利用ガイド](user-guide.md)を読んでください。

## 一般ユーザー向け

| 文書 | 内容 |
|---|---|
| [README](../README.md) | 製品概要、ブラウザでのお試し、主な機能と制約 |
| [利用ガイド](user-guide.md) | 開設、管理画面、公開サイト、画像、削除、トラブル対応 |
| [baserCMSとの関係](compatibility/relationship-to-basercms.md) | 共通する考え方と、互換・移行の対象外範囲 |
| [R2とメディア](deployment/cloudflare-r2-and-media.md) | 公開画像を使う場合のR2有効化と注意 |

現在の一般ユーザー向けお試しは、Cloudflare OAuthと段階的な開設処理を使います。GitHub DeployボタンやAPIトークン入力は、通常の利用経路ではありません。

## 開発者・運用担当者向け

| 文書 | 内容 |
|---|---|
| [開発者向けガイド](developer-guide.md) | ローカル実行、テスト、主要コマンド、構成 |
| [実装状況](../IMPLEMENTATION_STATUS.md) | 現在実装済みの範囲と未完了項目 |
| [Cloudflareデプロイ](deployment/baseredge-cloudflare.md) | 開発用proveと本番構成 |
| [お試し開設ホスト](deployment/trial-oauth-host.md) | OAuth、Queue、固定リリースによる現行開設方式 |
| [Cloudflareのみで完結する開設](deployment/trial-provision-cloudflare-only.md) | 現行アーキテクチャと運用確認 |
| [削除・片付け](deployment/cloudflare-teardown.md) | OAuth削除と開発者向け手動削除 |
| [トラブル対応](deployment/cloudflare-prove-troubleshooting.md) | D1、Worker Assets、R2、デプロイエラー |
| [入力検証ポリシー](engineering/validation-policy.md) | Domain、API、管理UIの検証基準 |
| [API検証状況](engineering/api-validation-audit.md) | API入力面の監査表 |
| [AGENTS.md](../AGENTS.md) | 実装時の不変条件と作業ルール |

## 製品仕様・設計

| 文書 | 内容 |
|---|---|
| [製品要件 v0.4](requirements/product-requirements-v0.4.md) | 現行の製品定義と必達要件 |
| [ADR-0020](adr/0020-admin-console-as-product-surface.md) | `/console/`を人間向け管理UIとする決定 |
| [ADR-0021](adr/0021-baseredge-product-identity-no-host-migration.md) | 製品境界と移行非目標 |
| [ADR-0022](adr/0022-cloud-operations-worker-security.md) | 削除・更新を担うOperations Workerの安全境界 |
| [ADR-0023](adr/0023-trial-provision-without-github-actions.md) | お試し開設をCloudflare内で完結させる決定 |
| [アーキテクチャ](architecture/) | Content、Blog、Custom Content、Mail Form、Theme、Plugin等 |
| [MVP実装計画 v0.9](implementation/mvp-implementation-plan-v0.9.md) | 現行フェーズの実装計画 |

製品の正本は[製品要件 v0.4](requirements/product-requirements-v0.4.md)と有効なADRです。READMEは利用者向けの入口であり、詳細な設計契約はこれらの文書に置きます。

## メンテナ向け・内部資料

開発リポジトリの`docs/internal/`は、リリース運用やホスト責任を整理するメンテナ向け資料です。公開スナップショットからは除外され、一般ユーザー向けの製品仕様ではありません。

調査メモ、診断結果、提案段階の文書は`research/`や個別のdeployment文書にあります。現行の利用方法を判断するときは、一般ユーザー向け文書と現行実装を優先してください。

## 履歴・旧版

- [archive/](archive/README.md) — 旧ADR、旧要件、古いアーキテクチャ
- [製品要件 v0.2](requirements/product-requirements-v0.2.md) / [v0.3](requirements/product-requirements-v0.3.md) — v0.4より前の製品定義
- `architecture/*-v0.x.md` — 各時点の設計
- `implementation/mvp-implementation-plan-v0.x.md` — 各時点の実装計画

旧文書は開発経緯を確認するために残しています。各ファイルの`Superseded`や履歴注記を確認し、現在の利用手順として使わないでください。
