# お試しワンクリック（Deploy ボタン）

Cloudflare [Deploy to Cloudflare](https://developers.cloudflare.com/workers/platform/deploy-button/) がこのディレクトリをビルドします。

- **build**: リポジトリルートで `npm ci` + TypeScript + 管理画面ビルド
- **deploy**: `prove:cloudflare` 相当（`BASER_CF_STACK=trial`、R2 なし）

利用者のブラウザ → Deploy ボタン → 利用者の Cloudflare / GitHub。  
**リポジトリ管理者の Secrets や常時サーバーは不要。**
