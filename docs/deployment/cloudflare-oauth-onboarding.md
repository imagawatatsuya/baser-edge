# 開始ページ: Cloudflare OAuth（トークン手動作成の代替）

利用者が [API トークン画面](https://dash.cloudflare.com/profile/api-tokens) で迷わないようにする公式の方法は、**Cloudflare OAuth** です。利用者は「ログイン → 許可」だけ。API トークンのコピーは不要です。

参考: [Integrate your OAuth client with Cloudflare](https://developers.cloudflare.com/fundamentals/oauth/integrate-with-cloudflare/)

## 誰が何をするか

| 役割 | 作業 |
|------|------|
| **利用者** | 自分の CF アカウント内にサイトを載せる（共有サーバーに預けない） |

利用者がAPIトークン画面を触らないOAuth導線では、開始ページの運用者がOAuthクライアントとSecretsを管理します。リポジトリをforkして利用する一般ユーザーごとにSecrets設定を要求しません。

## 運営側セットアップ（1 回）

1. Cloudflare ダッシュボード → **Manage Account** → **OAuth clients**  
   [OAuth clients を開く](https://dash.cloudflare.com/?to=/:account/oauth-clients)
2. **Create client**（[手順](https://developers.cloudflare.com/fundamentals/oauth/create-an-oauth-client/)）
   - **Grant type**: Authorization Code（PKCE 可）
   - **Redirect URL**: ローカル PoC なら  
     `http://localhost:5174/api/onboarding/oauth/callback`  
     （Vite が `/api` をオンボーディング API にプロキシ）
   - **Scopes**（**必須**: 作成時に選んだ scope だけが authorize で要求できます）  
     ダッシュボードの表示名と **OAuth scope ID**（`GET /oauth/scopes` の `id`）は別です。**ハイフン区切り**（API トークン権限の `workers_scripts` などのアンダースコアではない）。  
     お試し開設の既定は次の3つ（Worker の `BASER_CF_OAUTH_SCOPES` と一致）:
     - **Account Settings Read** → `account-settings.read`
     - **Workers Scripts Edit** → `workers-scripts.write`
     - **D1 Edit** → `d1.write`  
     一覧確認: `node scripts/cloudflare/list-oauth-scopes.mjs`（要 `wrangler login`）。  
     既存クライアントなら **Edit** → **Scopes** で上記を追加して保存。
3. **Client ID** と **Client Secret** を控える
4. オンボーディング API を起動する環境に設定:

```bash
BASER_CF_OAUTH_CLIENT_ID=...
BASER_CF_OAUTH_CLIENT_SECRET=...
# 省略可（既定: http://localhost:5174/api/onboarding/oauth/callback）
BASER_CF_OAUTH_REDIRECT_URI=http://localhost:5174/api/onboarding/oauth/callback
# OAuth クライアントに登録した scope と同じ（スペース区切り）。要調整:
BASER_CF_OAUTH_SCOPES="account-settings.read workers-scripts.write d1.write"
```

5. `npm run dev:onboarding` を再起動。開始ページに **「Cloudflare でログインしてサイトを開設」** が出れば有効。

### private と public

- 新規 OAuth クライアントは **private**（作成したアカウントのメンバーだけが許可できる）
- **任意の Cloudflare ユーザー**向けには **public** 化と [Client URL のドメイン検証](https://developers.cloudflare.com/fundamentals/oauth/create-an-oauth-client/#client-url-domain-ownership-verification) が必要

## 利用者の流れ（OAuth 有効時）

1. アカウント作成（未所持なら）
2. 開始ページ → **Cloudflare でログインしてサイトを開設**
3. Cloudflare の同意画面でアカウントを選び **Authorize**
4. 自動で開始ページへ戻り、工程別のサイト開設が始まる
5. 完了後に表示された管理画面URLを開く

## トラブル: *not allowed to request scope* / *invalid, unknown, or malformed*

authorize の `scope` は **カタログ上の scope ID**（ドット区切り・多くはハイフン入り）と、OAuth クライアントに **登録済みの ID** の両方が一致する必要があります。`account_settings.read` や `workers_scripts.write` のようにアンダースコアだけ差し替えた文字列は **無効** です。

1. ダッシュボードで OAuth クライアントを **Edit** → **Scopes** を開く。
2. `account-settings.read` / `workers-scripts.write` / `d1.write` に対応する権限を追加して保存。
3. trial-host を再デプロイし、`GET .../api/onboarding/health` の `oauthScopes` が上記3つであること、`oauthScopeConfigError` が無いことを確認。

## OAuth 未設定時

- **公開お試し**（`BASER_ONBOARDING_PUBLIC=1` または本番 `NODE_ENV`）: 利用者には「現在ご利用いただけません」のみ。手動トークンは出さない。
- **ローカル開発**（`BASER_ONBOARDING_PUBLIC=0`）: 従来どおり手動 API トークン可。

## できないこと

- **利用者の代わりに API トークンを勝手に発行する**（Cloudflare は許可しない）。OAuth かユーザー自身のトークン作成のみ。
- **運営の OAuth 登録もゼロ**にはできない（本番は baserEdge 運営が 1 回クライアントを作る）。
