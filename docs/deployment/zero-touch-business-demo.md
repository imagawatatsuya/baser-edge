# 顧客の Cloudflare アカウントで・ゼロタッチ実証

## 正しい前提（製品ストーリー）

**利用者（零細事業者）は自分の Cloudflare アカウントを取得する。**  
インフラは **そのアカウント上の自分用リソース**（Workers / D1、メディア時は R2）に載る。運営の共有サーバーに預けるモデルではない。R2・請求のルール: [cloudflare-r2-and-media.md](cloudflare-r2-and-media.md)。

| 利用者がやること | 利用者がやらないこと |
|------------------|----------------------|
| Cloudflare でアカウント作成（無料枠可） | `npm install`、リポジトリ clone、Wrangler の手順書 |
| 製品の導線で **アカウント連携・デプロイ開始**（将来: ダッシュボード1クリック） | D1 の手動作成、`wrangler.jsonc` の編集（R2 は本番フルスタック時のみ） |
| デプロイ完了後、表示された **管理画面 URL** を開き **「管理をはじめる」** | Passkey 登録（実証段階）、サーバー用語の理解 |

製品の優位性: **「Cloudflare アカウントさえあれば、サイト開設未経験でもログイン後の管理画面まで一気通貫」**（DEPLOY-001〜003）。

## 体験の流れ（目標）

```text
Cloudflare アカウント作成
    → baserEdge「サイトをはじめる」（連携・デプロイ）
    → あなたの *.workers.dev（または自ドメイン）の /console/
    → 「管理をはじめる」1回
    → コンテンツツリー（管理画面）
```

実証段階のログインは `BASER_INSTANT_LOGIN`（preview）。本番は同じアカウント上で Passkey に切り替え。

## いまのリポジトリでできること（開発者向けスタンドイン）

**最終形の「製品 UI 1クリック」は未実装。** 同じ処理の中身は `prove:cloudflare` に集約済み。

利用者本人の PC で **一時的に**スタンドインする場合（＝開発者が自分の CF アカウントに載せる実証）:

```bash
npm install
npx wrangler login          # 自分の Cloudflare アカウント
npm run plan:cloudflare     # 触るリソースの確認（API 呼び出しなし）
BASER_CF_PROVE=1 npm run prove:cloudflare   # 既定: お試し（R2 なし）。R2 込みは BASER_CF_FULL_STACK=1
```

完了メッセージの **管理コンソール URL** をブラウザで開き、「管理をはじめる」。

### 不特定多数のお試し（ブラウザだけ）

[cloudflare-one-click-trial.md](cloudflare-one-click-trial.md) が正本です。

- **public** リポジトリ
- GitHub Pages で `/start/`（workflow: `github-pages-start.yml`）
- 利用者は **Deploy to Cloudflare** → 自分の CF アカウントに開設

リポジトリ管理者が OAuth / Worker / Secrets を持つ必要はありません。

### API トークンで詰まったとき（ローカル UI の検証のみ）

`npm run dev:onboarding` の開始ページに手順を表示しています。要点だけ:

1. [API トークン](https://dash.cloudflare.com/profile/api-tokens) → **Create Token**
2. テンプレートではなく **Create Custom Token**
3. Token name: 任意（例: `baserEdge お試し`）
4. **Permissions** を3行追加:

   | 1列目 | 2列目 | 3列目 |
   |-------|-------|-------|
   | Account | Workers Scripts | Edit |
   | Account | D1 | Edit |
   | Account | Account Settings | Read |

5. Account Resources: **Include** → 自分のアカウント
6. **Create Token** → 表示された文字列をコピー → 開始ページの入力欄に貼り付け →「サイトを開設」

- リソースは **ログインしたアカウント内** の `baser-edge-*`（または `BASER_CF_STACK=lab` で分離）
- 片付け: `BASER_CF_STACK=lab BASER_CF_DESTROY=1 npm run destroy:cloudflare`

利用者に `npm` を渡さないための行き先は **Cloudflare 側のワンクリック**（[cloudflare-one-click-trial.md](cloudflare-one-click-trial.md)）。ホスト責任の整理は [docs/internal/trial-hosting-architecture.md](../internal/trial-hosting-architecture.md)（内部メモ）。

## ローカルは別物

`npm run prove:local` / `localhost` は **開発者の動作確認用**。  
「自分の Cloudflare アカウントで初めてサイトを持つ」体験の代替にはならない。

## GitHub Actions `hosted-demo` について

リポジトリ Secret に **利用者自身の** `CLOUDFLARE_API_TOKEN` を入れて実行すると、**そのトークンのアカウント**にデモスタックを載せられる（**既定は R2 なしのお試し**）。  
運営用の共有デモ URL ではなく、「npm を触りたくないが自分の CF アカウントで試したい」場合の代替手段。

## 本番との違い（同一アカウント内）

| | 実証 (preview) | 本番 (production) |
|--|----------------|-------------------|
| ログイン | instant「管理をはじめる」 | Passkey |
| デプロイ | 製品フロー1回 | 同左 + ドメイン・シークレット自動 |
