---
name: baseredge-cms-domain-contract
description: 'baserCMSで成熟したサイト運用ノウハウを、PHP互換やソースコピーではなくCMSの普遍的な利用者目的・状態・例外・管理操作として抽出し、baserEdgeの製品契約へ変換する最上位CMSスキル。Content Tree、Folder、Page、Alias、Blog、Mail Form、Custom Content、Theme、Plugin、コピー、移動、ゴミ箱、プレビュー、公開などを追加・変更する場合に参照する。現在のpackage名ではなく意味上のcomponent roleと知識registryを正本にし、baserEdgeの将来変更へ追従する。'
license: MIT
metadata:
  project: baserEdge
  role: cms-domain-contract
  skill_version: 1
  knowledge_schema: 1
  last_verified: 2026-07-28
---

# baserEdge CMS Domain Contract

## 目的

成熟したCMSが長年の運用で獲得した知識を、baserEdgeの製品モデルへ安全に取り込む。

取り込む対象はPHP、CakePHP、DB schema、テンプレート構文の互換性ではない。次を抽出する。

- 利用者が達成したいこと
- 必要な状態と状態遷移
- 管理画面で必要な操作とフィードバック
- URL、公開、複製、削除、復旧の例外
- テーマ・プラグイン・標準コンテンツ間の契約
- 長期運用で発生する失敗と再発防止テスト

## 三層モデル

```text
Layer 1: 成熟CMSの普遍的知識
Layer 2: baserEdgeとしての採否・再設計判断
Layer 3: 現在のapps/packages/Workers/D1への実装配置
```

Layer 1とLayer 2は `docs/agents/adaptation/cms-knowledge-registry.json` を正本とする。  
Layer 3は `.agents/context/baseredge-context.snapshot.json` で生成する。

現在のパスやpackage名をLayer 1へ書かない。実装配置が変わってもCMS知識を失わないためである。

## 採否の種類

| Decision | 意味 |
|---|---|
| `adopt` | CMS概念をほぼそのまま製品契約へ採用 |
| `adapt` | 利用者目的を保ち、Cloudflare・Revision・安全境界向けに再設計 |
| `defer` | 有用だが現在の優先度や基盤が不足 |
| `reject` | baserEdgeの製品境界または安全性と衝突 |
| `superseded` | より良いbaserEdge固有契約に置換済み |

「baserCMSに存在する」だけで採用しない。「現在baserEdgeに存在しない」だけで不要と判断しない。

## 非交渉の境界

- baserEdgeはbaserCMS runtimeや後方互換製品ではない。
- baserCMSのPHP Theme/Pluginを実行しない。
- source codeをコピーする場合は別途licenseとnoticeを処理する。
- サイトツリー中心の運用モデルは維持する。
- Content identityとroute/path identityを分ける。
- Revision、ThemeRelease、PluginReleaseは不変。
- Agentは既定で直接公開しない。
- Pluginの要求権限と付与権限を分ける。
- Cloudflare一発開設を新機能より劣後させない。

## 機能設計の標準質問

新機能ごとに次へ回答する。

1. どの利用者が何を完了したいか。
2. サイトツリー上のどの種類として見えるか。
3. Content identity、route、revision、publicationのどれを持つか。
4. 作成、編集、コピー、移動、プレビュー、公開、非公開、ゴミ箱、復元のうち何が必要か。
5. 状態を一覧でどう把握するか。
6. 保存と公開をどう区別するか。
7. 競合、失敗、途中離脱後に何が残るか。
8. Themeと公開Rendererへどの契約を渡すか。
9. Plugin/Agent/Humanが同じapplication serviceを使えるか。
10. CloudflareのD1/R2/Queue/Bindingへどう変換するか。
11. 新規開設、既存更新、撤去へどう反映するか。
12. 成熟CMS知識registryのどの項目を採用・変更・却下したか。

## 標準CMS能力

最低限、次を独立した能力として扱う。

- 統一Content Tree
- Folder
- Page
- Aliasまたは安全な代替
- 複数Blog
- Article、Category、Tag、RSS
- 複数Mail Form
- Field、確認、送信、受付停止、通知
- Custom Content schema、entry、revision
- Theme Release、layout、content template、asset、preview
- Plugin Manifest、Release、Activation、Capability、Hook
- copy、move、trash、restore、redirect
- draft、approval、publish、close
- audit、conflict、read-your-writes

「CRUDがある」だけで能力を実装済みとみなさない。

## 適応性

実装配置はcomponent roleで参照する。

例:

- `cms.content`
- `cms.blog`
- `cms.mail`
- `cms.custom-content`
- `cms.theme`
- `cms.plugin`
- `surface.admin`
- `surface.public`
- `platform.cloudflare`
- `platform.onboarding`

実際のpackage/pathはcontext snapshotが解決する。role解決が失敗した場合、古いパスを推測して実装せず、drift reviewを行う。

## 完了条件

- [ ] registryの関連knowledge IDを列挙した。
- [ ] 採否と理由を記録した。
- [ ] 利用者目的と状態遷移を定義した。
- [ ] サイトツリー、route、revision、publicationへの影響を確認した。
- [ ] 管理画面の操作完了とエラー回復を定義した。
- [ ] Cloudflare変換を別レイヤで設計した。
- [ ] context drift checkが成功した。
- [ ] 現在の実装パスではなくcomponent roleで知識を記録した。
