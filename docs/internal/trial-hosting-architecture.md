# お試し導線とホスト責任の整理

> **Internal:** メンテナ向け。製品仕様ではない。[docs/README.md](../README.md)

## 共有開始ページを fork 管理者がホストしない（デフォルト）

利用者の CMS は **利用者の Cloudflare アカウント内** に載せる（[zero-touch-business-demo.md](../deployment/zero-touch-business-demo.md)）。**共有 `/start/` と開設 API をリポジトリ管理者個人が常時運用する**設計は、デフォルトにしません。

## 責任の分け方

| 主体 | 役割 |
|------|------|
| **利用者** | 自分の Cloudflare アカウントに baserEdge をデプロイ |
| **リポジトリ管理者** | ソースと手順を公開。共有ホストの義務はない |
| **baserEdge 公式（将来）** | 共有 URL を製品として出す場合は公式インフラ |
| **Cloudflare** | Deploy ボタン（[cloudflare-one-click-trial.md](../deployment/cloudflare-one-click-trial.md)） |

## 一般公開時の最小作業

1. public リポジトリ（または公開用サブプロジェクト）
2. お試しは Deploy ボタン導線（fork 管理者の Secrets 不要）
3. 自己確認は `BASER_CF_PROVE=1 npm run prove:cloudflare`

## 参考実装（公式ホスト用）

`apps/onboarding-worker` 等は **公式が共有開始ページを運用する場合**の参考。fork 先での必須セットアップではありません。

関連: [release-checklist.md](release-checklist.md)、[relationship-to-basercms.md](../compatibility/relationship-to-basercms.md)
