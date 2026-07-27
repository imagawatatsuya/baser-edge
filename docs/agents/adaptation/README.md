# Adaptive Agent Knowledge

## 目的

この仕組みは、baserEdgeが変化してもCMS知識を特定のfolder名、package名、コマンド、テスト数へ固定しないためのものです。

## 分離する三層

1. `cms-knowledge-registry.json`  
   成熟CMSから抽出した普遍的な利用者目的、状態、例外、採否判断。

2. `component-role-registry.json`  
   `cms.content`や`surface.admin`等の意味上の役割。

3. `.agents/context/baseredge-context.snapshot.json`  
   現在のリポジトリを走査して得た、roleから実package/pathへの対応、authority hash、commands、migrations、wrangler構成。

## 初回導入

```bash
node scripts/validate-agent-skills.mjs
node scripts/agents/verify-cms-knowledge-registry.mjs
node scripts/agents/update-context-snapshot.mjs --write --reason "initial adaptive skill installation"
node scripts/agents/check-context-drift.mjs --strict=blocking
```

生成されたsnapshotをcommitする。

## 通常チェック

```bash
node scripts/agents/agent-skill-health.mjs
```

推奨package scripts:

```json
{
  "context:skills:init": "node scripts/agents/update-context-snapshot.mjs --write",
  "context:skills:check": "node scripts/agents/check-context-drift.mjs --strict=blocking",
  "verify:cms-knowledge": "node scripts/agents/verify-cms-knowledge-registry.mjs",
  "check:agent-skills": "node scripts/validate-agent-skills.mjs && npm run verify:cms-knowledge && npm run context:skills:check"
}
```

既存の`check`の最後へ`npm run check:agent-skills`を追加する。

## Driftの分類

- `blocking`: `AGENTS.md`、active product requirements、製品境界、required component roleが変化。
- `review`: package/workspace、commands、Wrangler構成、開発ガイドが変化。
- `info`: migration/test/file inventory等の通常進捗。

blockingはsnapshot更新前に必ず意味をレビューする。  
pathを自動置換して解決しない。

## 変更時の流れ

1. drift reportを読む。
2. authority変更なら製品契約を比較する。
3. 新しいcomponentを既存roleへ割り当てるか、新roleを追加する。
4. CMS知識の採否が変わる場合だけknowledge registryを更新する。
5. Skillの手順・コマンドが変わる場合だけSKILL.mdを更新する。
6. `--write --reason`でsnapshotを更新する。
7. `npm run check`を通す。

## なぜ自動更新しないか

自動生成されたskillは、構造変更を意味変更なしのpath renameとして誤認する危険があります。  
この仕組みは変化を検出し、更新対象を絞りますが、採否判断と不変条件の変更は人間またはレビューするAgentが決定します。
