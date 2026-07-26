# 開発チェックポイントとリセット

> **Internal:** メンテナ向け。製品仕様ではない。

機能追加で壊したときに、**コード**と **Cloudflare お試しスタック**を別々に「既知の良い地点」へ戻す手順。

## チェックポイントの定義

| 層 | 「この地点」の意味 |
|----|------------------|
| **Git** | 注釈タグ `checkpoint-2026-07-27`（`npm run check` 通過済みの `main`） |
| **ローカル** | 上記タグを checkout したうえで `npm run check` と `npm run prove:local` |
| **Cloud（lab）** | `BASER_CF_STACK=lab` で `destroy` → `prove` 直後（D1 含め作り直し） |

リモート: https://github.com/imagawatatsuya/baser-edge

## コードをチェックポイントへ戻す

```powershell
cd <リポジトリルート>
git fetch origin
git switch main
git reset --hard checkpoint-2026-07-27
npm install
npm run check
npm run prove:local
```

未コミットの作業を残す場合は、戻す前に `git stash push -u -m "wip"` または別ブランチへコミット。

新しい安心地点を作るとき:

```powershell
npm run check
npm run prove:local
git tag -a checkpoint-YYYY-MM-DD -m "check + prove:local OK"
git push origin checkpoint-YYYY-MM-DD
```

## Cloudflare スタックを初期化（lab 推奨）

本番相当の `default`（`baser-edge-api`）を触らないため、実験は **`lab` スタック**を使う。

```powershell
$env:BASER_CF_STACK = "lab"
npm run destroy:cloudflare
$env:BASER_CF_DESTROY = "1"
npm run destroy:cloudflare

$env:BASER_CF_PROVE = "1"
npm run prove:cloudflare
```

詳細・R2 残り対処: [cloudflare-teardown.md](../deployment/cloudflare-teardown.md)

**trial ホスト経由の `trial` 環境**は CLI `destroy:cloudflare` とは別経路（開始ページの「お試しをやめる」／ Cloud Operations）。ADR-0022 参照。

## 日常の機能追加

1. ブランチで作業（`main` の WIP を最小に）
2. PR 前: `npm run check`（必須）、`npm run prove:local`（推奨）
3. `wrangler` / `cf-trial-provision` / `cf-stack-destroy` を触った PR のみ: lab で prove + destroy を検討

CMS 変更の主戦場: `packages/*-kernel`, `apps/api-worker`, `apps/admin-web`, `apps/public-renderer`, `tests/`。デプロイ脚本は必要時だけ。
