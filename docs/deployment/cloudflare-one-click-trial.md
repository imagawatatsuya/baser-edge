# ブラウザだけでお試し（public リポジトリ + Cloudflare Deploy ボタン）

旧版ドキュメントの正本: [docs/README.md](../README.md)

## 結論

**public にするだけでは足りない。** GitHub Pages の案内と Cloudflare Deploy ボタンが必要（[下記](#利用者がやることブラウザ)）。


| ステップ | 誰 | 内容 |
|----------|-----|------|
| 1 | メンテナ | リポジトリを **public** にする |
| 2 | メンテナ（一度だけ） | GitHub **Settings → Pages → Source: GitHub Actions**（下記トラブルシュート参照） |
| 3 | 利用者 | `https://<org>.github.io/baser-edge/start/` を開く |
| 4 | 利用者 | **Deploy to Cloudflare** → 自分の Cloudflare / GitHub で承認 → **管理画面 URL** |

**一般ユーザー実証の準備・チェックリスト:** [general-user-trial-experiment.md](general-user-trial-experiment.md)

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
2. 開始ページの **お試しをはじめる**（公式ホストの OAuth 開設。D1/Git の設定画面は出ない）
3. Cloudflare でログイン・許可 → 進捗表示 → 管理画面へ
4. **「管理をはじめる」**

**裏側（暫定）:** メンテナがホストする [onboarding Worker](../../apps/onboarding-worker/) が OAuth 後、**メンテナの GitHub Actions** で `prove:cloudflare` 相当を実行します（[ADR-0023](adr/0023-trial-provision-without-github-actions.md) で **利用者 Cloudflare のみ**へ移行予定）。`deploy/one-click` の Deploy ボタンは開発者向けフォールバック（もともと利用者 CF のみ）。

npm・手動 API トークンは不要です。

## fork 管理者が必須ではないこと

- 不特定多数向けの共有 OAuth ホスト
- リポジトリ Secrets に利用者向け `CLOUDFLARE_API_TOKEN` を置くこと
- 自前 VM / Docker での常時オンボーディング API


## 制限・注意

- 初回デプロイは **数分**かかることがある（Deploy ボタンは利用者の GitHub にコピーを作る場合あり）
- GitHub Pages は **public リポジトリ** が前提
- ビルド失敗時は Workers Builds のログを確認
- **デプロイ後の片付け（開発者）:** [cloudflare-teardown.md](cloudflare-teardown.md) — `destroy:cloudflare`、R2 空でないときの 10008、Wrangler 4 に object list が無いこと
- **画像の公開 URL（メディア）** には Cloudflare **R2** が必要。支払い方法（カード / PayPal / Apple Pay / Google Pay / Link 等）の登録と **R2 サブスクリプション** は別手続き。詳細: [cloudflare-r2-and-media.md](cloudflare-r2-and-media.md)
- **一般ユーザー向けワンクリック削除**は未実装（予定: 管理コンソール + OAuth）。Pages `/start/` に削除ボタンはない

### GitHub Pages（`/start/`）の Actions が失敗する

`Get Pages site failed` / `HttpError: Not Found` → Settings → Pages で **Source: GitHub Actions** を確認し、workflow を再実行。[general-user-trial-experiment.md](general-user-trial-experiment.md) の Pages 節も参照。

## 履歴を遡って読まれたとき

private 時代のメモや旧要件（Migration First 等）が残っていても **現行方針ではありません**。[docs/README.md](../README.md) と [relationship-to-basercms.md](../compatibility/relationship-to-basercms.md) を参照してください。
