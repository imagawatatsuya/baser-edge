# 開始ページ: Cloudflare OAuth（トークン手動作成の代替）

利用者が [API トークン画面](https://dash.cloudflare.com/profile/api-tokens) で迷わないようにする公式の方法は、**Cloudflare OAuth** です。利用者は「ログイン → 許可」だけ。API トークンのコピーは不要です。

参考: [Integrate your OAuth client with Cloudflare](https://developers.cloudflare.com/fundamentals/oauth/integrate-with-cloudflare/)

## 誰が何をするか

| 役割 | 作業 |
|------|------|
| **利用者** | 自分の CF アカウント内にサイトを載せる（共有サーバーに預けない） |

利用者が API トークン画面を触らない OAuth 導線は、**公式が開始ページをホストするとき**に意味があります。個人メンテナが Secrets を設定する前提ではありません。

## 運営側セットアップ（1 回）

1. Cloudflare ダッシュボード → **Manage Account** → **OAuth clients**  
   [OAuth clients を開く](https://dash.cloudflare.com/?to=/:account/oauth-clients)
2. **Create client**（[手順](https://developers.cloudflare.com/fundamentals/oauth/create-an-oauth-client/)）
   - **Grant type**: Authorization Code（PKCE 可）
   - **Redirect URL**: ローカル PoC なら  
     `http://localhost:5174/api/onboarding/oauth/callback`  
     （Vite が `/api` をオンボーディング API にプロキシ）
   - **Scopes**: お試し開設に必要なもの（OAuth クライアント作成時に選択）  
     例: Account Read、Workers Scripts Edit、D1 Edit（表示名はダッシュボードに合わせる）
3. **Client ID** と **Client Secret** を控える
4. オンボーディング API を起動する環境に設定:

```bash
BASER_CF_OAUTH_CLIENT_ID=...
BASER_CF_OAUTH_CLIENT_SECRET=...
# 省略可（既定: http://localhost:5174/api/onboarding/oauth/callback）
BASER_CF_OAUTH_REDIRECT_URI=http://localhost:5174/api/onboarding/oauth/callback
# OAuth クライアントに登録した scope と同じ（スペース区切り）。要調整:
BASER_CF_OAUTH_SCOPES="account:read workers_scripts:edit d1:edit"
```

5. `npm run dev:onboarding` を再起動。開始ページに **「Cloudflare でログインしてサイトを開設」** が出れば有効。

### private と public

- 新規 OAuth クライアントは **private**（作成したアカウントのメンバーだけが許可できる）
- **任意の Cloudflare ユーザー**向けには **public** 化と [Client URL のドメイン検証](https://developers.cloudflare.com/fundamentals/oauth/create-an-oauth-client/#client-url-domain-ownership-verification) が必要

## 利用者の流れ（OAuth 有効時）

1. アカウント作成（未所持なら）
2. 開始ページ → **Cloudflare でログインしてサイトを開設**
3. Cloudflare の同意画面でアカウントを選び **Authorize**
4. 自動で戻り、サイト開設が始まる → 管理画面へ

## OAuth 未設定時

- **公開お試し**（`BASER_ONBOARDING_PUBLIC=1` または本番 `NODE_ENV`）: 利用者には「現在ご利用いただけません」のみ。手動トークンは出さない。
- **ローカル開発**（`BASER_ONBOARDING_PUBLIC=0`）: 従来どおり手動 API トークン可。

## できないこと

- **利用者の代わりに API トークンを勝手に発行する**（Cloudflare は許可しない）。OAuth かユーザー自身のトークン作成のみ。
- **運営の OAuth 登録もゼロ**にはできない（本番は baserEdge 運営が 1 回クライアントを作る）。
