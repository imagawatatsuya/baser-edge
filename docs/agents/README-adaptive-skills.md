# baserEdge Adaptive CMS Skills Pack

## 狙い

1. baserCMSで成熟したCMSノウハウを利用者目的・状態・例外として抽出する。
2. PHP/CakePHP互換やソースコピーをせずbaserEdgeへ再設計する。
3. Cloudflare Workers/D1/R2/Queuesと一発開設へ安全に変換する。
4. baserEdgeの将来変更をcontext driftとして検出する。

## 内容

- 14 Agent Skills
- 18 CMS knowledge entries
- source、authority、component role registry
- repository context snapshot generator
- drift checker
- registry validator
- Cursor導入指示

## 適用

このリポジトリには既に展開済みです。新規クローンや大きな構成変更のあとは次を実行します。

```bash
node scripts/validate-agent-skills.mjs
node scripts/agents/verify-cms-knowledge-registry.mjs
node scripts/agents/update-context-snapshot.mjs --write --reason "initial adaptive skill installation"
node scripts/agents/check-context-drift.mjs --strict=blocking
npm run check
```

## 将来の変更

通常は `node scripts/agents/agent-skill-health.mjs` を実行する。

authority、workspace、component role、Wrangler、commandsが変化するとdrift reportが出る。意味をレビューした後だけsnapshotを更新する。SKILL.mdを機械的に自動書換えしない。
