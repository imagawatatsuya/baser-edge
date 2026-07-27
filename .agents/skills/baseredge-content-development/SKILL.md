---
name: baseredge-content-development
description: 'サイトツリー中心のFolder、Page、Alias、route、copy、move、trash、restore、redirect、revision、preview、publishを実装・変更する正本。baserCMSで蓄積された「異なるコンテンツ種別を一つの木で管理する」「フォルダ配下でURLが変わる」「同じ内容への別導線」「コピー・移動・復旧」の運用知識を、baserEdgeのContent identityとroute identity分離へ適応する。'
license: MIT
metadata:
  project: baserEdge
  role: cms-content
  skill_version: 1
  last_verified: 2026-07-28
---

# Content Development

## 目的

サイト運営者が、ページ種類を意識しすぎず一つのサイトツリーから構造・内容・公開状態を管理できるようにする。

## 関連knowledge

- `CMS-TREE-001`
- `CMS-ROUTE-001`
- `CMS-FOLDER-001`
- `CMS-ALIAS-001`
- `CMS-LIFECYCLE-001`
- `CMS-SEO-001`

## 不変条件

- Content identityとroute/path identityを分ける。
- Folder、Page、Alias、Blog、Mail Form、Custom Contentは同じtreeに参加する。
- Revisionは不変。
- moveはContentの同一性を壊さない。
- 旧URLの扱いを暗黙にしない。
- Agentはproposal/approval経由であり、既定で直接公開しない。
- tree versionとitem lock versionを混同しない。

## 操作契約

### Create

- 作成先parent、content type、slug、titleをdomainで検証する。
- slugは現行product policyに従う。
- 同一parentのroute衝突を拒否する。
- 作成後、tree/list/detailへ即時反映する。

### Copy

- 新しいContent identityを作る。
- 公開状態やapprovalを無条件に複製しない。
- routeを必ず新しく割り当てる。
- 子孫を含むcopyは規模、失敗、部分作成を設計する。
- Mail FormやCustom Content等の型固有設定をowning serviceへ委譲する。

### Move

- Content identityとRevision historyを維持する。
- cycleを拒否する。
- tree version conflictを409にする。
- path変更と旧URL redirectを同じ業務操作として設計する。
- 子孫routeの影響を一括で見積もり、大量処理は非同期化を検討する。

### Alias

成熟CMSでは同じ内容への別URLが必要になるが、重複コンテンツとcanonicalの問題がある。

- Aliasはtarget Contentを参照し、本文を複製しない。
- Alias自身のroute identityを持つ。
- public rendererはcanonical/redirect方針を明示する。
- target消失、trash、非公開時の挙動を定義する。
- Alias chain/cycleを拒否する。

### Trash/Restore

- trashは即時物理削除ではない。
- treeから不可視化する範囲と公開URLの状態を定義する。
- restore先route衝突を扱う。
- retentionとpurgeを分ける。
- Asset、Plugin、Theme等の参照をpurge前に検査する。

## Cloudflare変換

- domainは`cms.content` role。
- D1原子境界、redirect、outboxは`baseredge-d1-development`。
- 大量subtree操作はQueue/Workflowを検討する。
- public HTMLとpreviewは`surface.public` role。
- 新規Bindingを要求しない限りonboardingを変更しない。

## 必須テスト

- create success、slug type拒否、route conflict拒否
- move success、cycle拒否、stale tree version
- copy後にidentityが異なる
- alias cycle/target unavailable
- trash/restore route conflict
- old URL redirect
- console tree/list/detail read-your-writes
- public canonical/redirect
