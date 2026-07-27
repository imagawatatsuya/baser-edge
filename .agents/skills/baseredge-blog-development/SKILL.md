---
name: baseredge-blog-development
description: '複数Blog、Article、Category、Tag、RSS、一覧順・件数、記事概要、アイキャッチ、archive、preview、publicationを実装・変更する正本。baserCMSがブログをサイトツリー上へ複数設置し、ブログごとに表示設定とテンプレートを持つ運用知識をbaserEdgeへ適応する。'
license: MIT
metadata:
  project: baserEdge
  role: cms-blog
  skill_version: 1
  last_verified: 2026-07-28
---

# Blog Development

## 関連knowledge

- `CMS-BLOG-001`
- `CMS-BLOG-002`
- `CMS-THEME-001`
- `CMS-LIFECYCLE-001`
- `CMS-SEO-001`

## 利用者目的

- 一つのSiteに「お知らせ」「活動記録」等の複数Blogを置く。
- Blogごとに記事、taxonomy、表示順、表示件数、RSSを管理する。
- 記事を下書き、確認、承認、公開する。
- 一覧、個別、archive、埋め込み一覧をThemeで表現する。

## Domain契約

- BlogはContent Tree上のContentである。
- ArticleはBlogに属し、Blog境界を越える移動は明示操作にする。
- CategoryとTagの意味を分ける。
- publicationはArticle Revisionを指す。
- RSSは公開済みArticleだけを対象にする。
- list order/countはBlog設定として扱い、Theme内へ固定しない。
- summary/eye-catch機能を無効化しても既存データを即時破棄しない。
- timezone、未来日時、公開取消、URL変更を扱う。

## URLとSEO

- Blog root、Article、Category、Tag、年月archiveのrouteを閉じた規則で生成する。
- slug conflictをdomainで拒否する。
- route変更時はredirect/canonicalを設計する。
- RSS URLを安定させる。
- draft/previewを検索indexへ露出しない。

## Theme契約

Themeは最低限次のview modelを安定して受け取れる。

- Blog header/settings
- Article list item
- Article detail
- taxonomy/archive context
- pagination/cursor
- eye-catch asset reference
- publication metadata

PHPテンプレート名を互換契約にしない。baserCMSのindex/single/archives/posts分割は、必要な表示責務の参考として扱う。

## Cloudflare変換

- scheduled publicationをHTTP閲覧時の副作用だけに依存させない。
- Cron、Queue、read-time判定の選択を明示する。
- RSS生成を毎回全件読み込みにしない。
- eye-catchはR2なし構成を扱う。
- archive queryに適切なindexを設計する。

## 必須テスト

- 複数Blogの分離
- Article CRUD + revision + approval + publish
- list order/count
- Category/Tag filter
- future/past publication boundary in UTC
- RSS published-only
- R2 absent eye-catch
- route redirect/canonical
- Theme view model contract
