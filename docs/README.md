# baserEdge ドキュメント

製品ドキュメントの入口です。迷ったらこのページの「正本」だけを読んでください。

## 正本（公開向け・読む順）

| 文書 | 内容 |
|------|------|
| [README.md](../README.md) | リポジトリ概要（Preview 段階） |
| [product-requirements-v0.4.md](requirements/product-requirements-v0.4.md) | 製品要件（現行） |
| [relationship-to-basercms.md](compatibility/relationship-to-basercms.md) | baserCMS との関係（対外） |
| [ADR-0021](adr/0021-baseredge-product-identity-no-host-migration.md) | 製品境界・デプロイ必達 |
| [ADR-0022](adr/0022-cloud-operations-worker-security.md) | 公式 Operations Worker（teardown / 将来 update）・クラウド破産防止 |
| [cloudflare-one-click-trial.md](deployment/cloudflare-one-click-trial.md) | お試し（ブラウザ + Deploy ボタン） |
| [baseredge-cloudflare.md](deployment/baseredge-cloudflare.md) | 開発者向け prove / deploy |
| [cloudflare-r2-and-media.md](deployment/cloudflare-r2-and-media.md) | R2 有効化・請求・支払い手段・メディア配信とデプロイ形態 |
| [general-user-trial-experiment.md](deployment/general-user-trial-experiment.md) | 一般ユーザー立場のお試し実証（準備・成功基準） |
| [cloudflare-teardown.md](deployment/cloudflare-teardown.md) | お試しスタックの削除（destroy・R2 10008/10006） |
| [cloudflare-prove-troubleshooting.md](deployment/cloudflare-prove-troubleshooting.md) | prove デプロイのよくあるエラーとお試し制限 |
| [AGENTS.md](../AGENTS.md) | コントリビュータ向け不変条件 |

## 履歴・アーカイブ（当時のスナップショット）

- [archive/](archive/README.md) — 旧 ADR・要件 v0.1・古いアーキテクチャ
- [product-requirements-v0.2.md](requirements/product-requirements-v0.2.md) / [v0.3](requirements/product-requirements-v0.3.md) — **v0.4 より前**（移行 First 等は廃止済み）
- [research/source-findings-v0.3.md](research/source-findings-v0.3.md) など — 調査メモ。**「正本」ではない**
- 版付き `architecture/*-v0.x.md` / `mvp-implementation-plan-v0.x.md` — 実装の経緯。現行は v0.9 計画とコード

各ファイル先頭の **Superseded / 履歴** 注記を優先してください。

## ADR

[adr/](adr/) は意思決定の記録です。`Superseded` とあるものは [ADR-0021](adr/0021-baseredge-product-identity-no-host-migration.md) が優先されます。
