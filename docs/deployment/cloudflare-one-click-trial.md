# ブラウザだけでお試し（public リポジトリ + Cloudflare Deploy ボタン）

旧版ドキュメントの正本: [docs/README.md](../README.md)

## 結論

**public にするだけでは足りない。** GitHub Pages の案内と Cloudflare Deploy ボタンが必要（[下記](#利用者がやることブラウザ)）。


| ステップ | 誰 | 内容 |
|----------|-----|------|
| 1 | メンテナ | リポジトリを **public** にする |
| 2 | メンテナ（一度だけ） | GitHub **Settings → Pages → Source: GitHub Actions** |
| 3 | 利用者 | `https://<org>.github.io/baser-edge/start/` を開く |
| 4 | 利用者 | **Deploy to Cloudflare** → 自分の Cloudflare / GitHub で承認 → **管理画面 URL** |

利用者のサイトは **利用者の Cloudflare アカウント内のみ**。fork 管理者が共有 Worker や `repository_dispatch` 用 Secrets を持つ必要はありません。

## 技術的な中身

- 案内ページ: [docs/start/](../start/) → [github-pages-start.yml](../../.github/workflows/github-pages-start.yml)
- ワンクリック: [deploy/one-click/](../../deploy/one-click/)（[Deploy ボタン](https://developers.cloudflare.com/workers/platform/deploy-button/)）
- ビルド / デプロイは **利用者アカウント上の Workers Builds** が `prove:cloudflare` 相当を実行

Deploy ボタン URL（`OWNER` を差し替え）:

```md
[![Deploy to Cloudflare](https://deploy.workers.cloudflare.com/button)](https://deploy.workers.cloudflare.com/?url=https://github.com/OWNER/baser-edge/tree/main/deploy/one-click)
```

## 利用者がやること（ブラウザ）

1. Cloudflare アカウント（無料可）
2. 開始ページの Deploy ボタン
3. Cloudflare の画面でログイン・リポジトリ作成・デプロイ待ち
4. ログの **管理コンソール URL** →「管理をはじめる」

npm・手動 API トークンは不要です。

## fork 管理者が必須ではないこと

- 不特定多数向けの共有 OAuth ホスト
- リポジトリ Secrets に利用者向け `CLOUDFLARE_API_TOKEN` を置くこと
- 自前 VM / Docker での常時オンボーディング API


## 制限・注意

- 初回デプロイは **数分**かかることがある（Deploy ボタンは利用者の GitHub にコピーを作る場合あり）
- GitHub Pages は **public リポジトリ** が前提
- ビルド失敗時は Workers Builds のログを確認

## 履歴を遡って読まれたとき

private 時代のメモや旧要件（Migration First 等）が残っていても **現行方針ではありません**。[docs/README.md](../README.md) と [relationship-to-basercms.md](../compatibility/relationship-to-basercms.md) を参照してください。
