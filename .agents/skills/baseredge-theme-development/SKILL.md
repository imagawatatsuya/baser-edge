---
name: baseredge-theme-development
description: 'Theme Release、Design Token、Layout、Element/Component、Page/Blog/Mail等のcontent template、asset、初期サイト、preview、activationを実装・変更する正本。baserCMSのlayout・element・コンテンツ種類別テンプレート・複数テンプレート選択という知識を、不変ThemeReleaseと安全なStructured Document Rendererへ適応する。'
license: MIT
metadata:
  project: baserEdge
  role: cms-theme
  skill_version: 1
  last_verified: 2026-07-28
---

# Theme Development

## 関連knowledge

- `CMS-THEME-001`
- `CMS-THEME-002`
- `CMS-WIDGET-001`
- `CMS-BLOG-002`
- `CMS-MAIL-002`

## 不変条件

- ThemeReleaseは不変。
- activationはSite単位の明示的な参照である。
- Themeは任意runtime codeをcore processへ注入しない。
- HTMLはrendered outputであり、canonical editable documentではない。
- unknown structured blockの安全な保持方針を壊さない。
- Asset URLを手作業のpath連結へ依存させない。
- Theme更新でcontent dataを暗黙に書き換えない。

## Theme契約

Theme package/releaseは次を明示する。

- identity、version、hash、metadata
- supported renderer contract version
- layouts
- content templates by semantic content kind
- reusable elements/components
- design tokens
- asset manifest
- optional initial-site recipe
- required optional capabilities
- preview entry points
- compatibility range

現在のfolder構造を永久契約にしない。manifestの意味上のslotを正本とする。

## 成熟CMSからの適応

baserCMSのlayout、element、Pages、Blog、Mail、assetという分割から、次の責務を採用する。

- site全体layout
- 再利用component
- content type固有presentation
- 複数templateからの選択
- static asset
- Theme metadataとpreview image
- 初期サイト/初期データ

PHP helper、PHP template、theme-bundled executable pluginはそのまま採用しない。

## Preview

- draft ThemeReleaseとdraft Content Revisionを組み合わせられる。
- preview tokenは短命・scope限定にする。
- previewをpublic cacheへ混入させない。
- active release変更前に主要Page/Blog/Mailを確認できる。
- missing component/assetを明示的に診断する。
- Theme activationはhigh-risk actionとして必要な承認を適用する。

## Asset

- immutable/versioned keyを優先する。
- R2なしtrialを扱う。
- CSS/JS/image/fontのcontent typeとcache policyを定義する。
- external URL、inline script、CSPへの影響を検査する。
- Theme asset削除前にactive release参照を検査する。
- uploadとrelease publicationを別状態にする。

## 初期サイト

- 完成状態の初期`/home`を表示する。
- Theme適用と初期content作成を再実行可能にする。
- user contentをTheme updateで上書きしない。
- initial recipe versionを記録する。
- onboarding fixed releaseへ同梱する場合はhashを固定する。

## 必須テスト

- Release immutability/hash
- layout/content template resolution
- Page/Blog/Mail rendering
- missing component/asset
- preview isolation
- activation rollback pointer
- R2 absent
- initial site idempotency
- CSP/security rejection
