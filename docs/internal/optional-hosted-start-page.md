# （任意）公式が共有開始ページをホストする場合のみ

> **Internal:** baserEdge **公式組織**向け参考。fork 利用者の必須手順ではない。[docs/README.md](../README.md)

[trial-hosting-architecture.md](trial-hosting-architecture.md) を先に読んでください。

- `apps/onboarding-worker` + `wrangler.onboarding-host.jsonc`
- `apps/onboarding-web`（同梱 UI）
- `.github/workflows/publish-trial-start.yml`（**手動**）
- `.github/workflows/onboarding-jobs.yml`（`repository_dispatch`）

Secrets・OAuth・KV は **公式の Cloudflare / GitHub アカウント** にのみ配置。

ローカル PoC: `npm run dev:onboarding` / `npm run deploy:trial-host`

OAuth 手順: [cloudflare-oauth-onboarding.md](../deployment/cloudflare-oauth-onboarding.md)
