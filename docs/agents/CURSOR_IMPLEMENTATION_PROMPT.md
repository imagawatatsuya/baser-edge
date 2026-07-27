# Cursorへ渡す実装指示

このZIPをbaserEdgeリポジトリのルートへ展開してください。

## 目的

- baserCMSの成熟CMSノウハウを、PHP互換ではなく利用者目的・状態・例外として活用する。
- baserEdgeのCloudflareネイティブ設計と一発開設を保護する。
- 今後のbaserEdgeの構造変更を自動検出できるようにする。

## 作業

1. `AGENTS.md`、`docs/README.md`、active product requirements、ADRを最優先で読む。
2. 今回追加したskillsとregistryを既存契約へ照合する。
3. 矛盾があれば既存製品契約を優先し、skills/registry側だけを最小修正する。
4. 次を実行する。

```bash
node scripts/validate-agent-skills.mjs
node scripts/agents/verify-cms-knowledge-registry.mjs
node scripts/agents/update-context-snapshot.mjs --write --reason "initial adaptive skill installation"
node scripts/agents/check-context-drift.mjs --strict=blocking
```

5. 生成された `.agents/context/baseredge-context.snapshot.json` を確認する。
6. required component roleが未解決なら、現在のpackageの意味を調査して `component-role-registry.json` を修正する。古いpathへ無理に合わせない。
7. `package.json`へ次のscriptsを追加する。既存scriptを消さない。

```json
{
  "context:skills:init": "node scripts/agents/update-context-snapshot.mjs --write",
  "context:skills:check": "node scripts/agents/check-context-drift.mjs --strict=blocking",
  "verify:cms-knowledge": "node scripts/agents/verify-cms-knowledge-registry.mjs",
  "check:agent-skills": "node scripts/validate-agent-skills.mjs && npm run verify:cms-knowledge && npm run context:skills:check"
}
```

8. 既存`check`の最後へ `npm run check:agent-skills` を追加する。
9. `npm run check`を実行する。
10. 製品機能は同時に実装しない。

## 禁止

- baserCMS PHP runtime、DB互換、Theme/Plugin自動移行を追加しない。
- baserCMS source codeをコピーしない。
- 現在のOAuth一発開設、Queue checkpoint、一時Migration Worker、Secret/Assets保持を簡略化しない。
- R2を必須化しない。
- Cloudflareへ実deployしない。
- driftをsnapshotの再生成だけで黙らせない。先に意味をレビューする。
- SKILL.mdをpath置換で自動更新しない。

## 報告

- 追加ファイル
- registryの修正
- 解決したcomponent roles
- authorityとの衝突
- context drift初期結果
- package scripts変更
- `npm run check`結果
- 今後のknowledge reviewが必要な項目
