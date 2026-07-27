---
name: baseredge-admin-ux
description: '人間向け正本UI `/console/` のサイトツリー、一覧、編集、保存、承認、公開、コピー、移動、ゴミ箱、復元、能力表示、エラー回復、モバイル操作、アクセシビリティを設計・変更する正本。成熟CMSの運用知識を、現在の画面構造へ固定せず操作目的と状態フィードバックとして記録する。'
license: MIT
metadata:
  project: baserEdge
  role: admin-ux
  skill_version: 1
  last_verified: 2026-07-28
---

# Admin UX

## 目的

初心者が一発開設後、迷わず管理開始、記事作成、確認、公開まで完了できる管理面を作る。

## 原則

- サイトツリーを主画面にする。
- 保存、承認依頼、公開を視覚・文言・権限で分ける。
- 現在の状態、次に可能な操作、失敗理由を同じ場所で示す。
- mutation後はtree/list/detail/cacheを即時更新する。
- UI validationはdomain validationの鏡であり唯一の防壁ではない。
- stable error codeを人間が修正できる説明へ変換する。
- capability未構成をgeneric errorにしない。
- desktop hoverだけに依存しない。
- keyboard、focus、label、error associationを満たす。
- destructive operationは対象、影響、復旧可能性を示す。

## 成熟CMSの操作語彙

- 追加
- 編集
- プレビュー
- コピー
- 移動
- 公開/非公開
- ゴミ箱
- 復元
- 削除
- 設定
- 一覧
- 並び替え

内部アーキテクチャ語をそのまま利用者へ出さない。ただしRevision、承認、権限等、理解が安全性に必要な概念は隠さない。

## 状態表示

一覧と編集画面で少なくとも次を識別する。

- draft
- approval requested
- approved
- published
- scheduled
- closed
- conflict/stale
- trashed
- capability unavailable
- async work pending/failed

色だけで区別しない。

## Mobile Operations First

- primary actionを画面外へ追いやらない。
- treeの階層操作に代替のリスト/パンくずを用意する。
- tap target、sticky action、keyboard表示時のフォームを確認する。
- 大きなtableだけで管理しない。
- 一括操作は小画面で誤操作しない確認を持つ。

## テスト

- console golden path
- mutation sync
- keyboard/focus
- error association
- save vs publish
- capability unavailable
- conflict recovery
- mobile viewport
- destructive confirmation
- onboarding完了画面からconsoleへの導線
