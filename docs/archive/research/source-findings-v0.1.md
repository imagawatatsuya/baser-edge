# 調査事実と設計判断 v0.1

## 1. 調査対象

### 主要ソース

- `baserproject/basercms` の `5.2.x` ブランチ
- `basercms/plugins/baser-core`
- `bc-blog`
- `bc-custom-content`
- `bc-mail`
- `bc-uploader`
- `bc-search-index`
- `bc-seo`
- 提供ファイル `BurgerEditor.zip`（BurgerEditor 3.4.0）
- 提供ファイル `Cloudflare_Native_CMS_Plan_AI_Updated.md`

## 2. ソースから確認した事実

### baserCMS

- 実際のCMS機能はモノレポ内の `plugins/` に分割されている。
- `plugins/baser-core` がコンテンツ、固定ページ、サイト、ユーザー、権限、テーマ、プラグイン、APIなどの中核を担う。
- 異なるコンテンツ種別を共通のコンテンツツリーへ配置する設計を持つ。
- ページ、ブログ、カスタムコンテンツは、それぞれ独自データを持ちながら共通のURL・階層・公開情報と連携する。
- サービス層とServiceInterfaceを用いて、Controllerからアプリケーション処理を分離している。
- 権限管理の中心はユーザーグループとURL／HTTPメソッドである。
- 固定ページとブログ記事は、本稿と草稿の二面構造を持つ。
- カスタムコンテンツとメールフォームは、定義に応じて物理テーブルや列を生成・変更する。
- テーマはPHPテンプレート、Helper、JavaScript、初期データ、プラグインまで含み得る実行可能パッケージである。

### BurgerEditor 3.4.0

- 固定ページ、ブログ、カスタムコンテンツの既存フィールドを置き換える汎用エディタとして実装されている。
- 対象フィールド例は `contents`、`draft`、`content`、`content_draft`、`detail`、`detail_draft`。
- 構造化JSONではなく、`data-bgb`、`data-bgt`、`data-bgt-ver` などを含むHTMLを既存本文列へ保存する。
- BlockとTypeの二層構造を持つ。
- 提供ZIPには45 Block、14 Typeが含まれる。
- Type単位のバージョン情報と移行処理を持つ。
- 未知の既存HTMLを保持・変換する経路を持つ。
- Blockインスタンス固有の永続IDは持たない。
- 画像参照はAsset IDではなくファイルパス中心である。
- 外部プラグインの `BurgerAddon/block`、`BurgerAddon/type` から独自Block／Typeを追加できる。
- 任意埋め込みコードを扱えるTypeがあり、script等の実行可能内容も扱える。
- Block単位の公開開始・終了属性を持つ。
- `sessionStorage` を使った編集内容復元を持つ。

## 3. ソースから直接は確認できない事項

- Cloudflare版で最適なD1分割単位
- AIエージェントへ許可すべき最終的な自動公開範囲
- 商用SaaSとしてのテナントモデル
- 料金体系と利用制限
- 実運用で必要になる同時編集規模
- 最適な管理画面フレームワーク
- 初期テーマの具体的なデザイン

これらは設計判断または今後の検証対象であり、baserCMSやBurgerEditorから直接導出された事実ではない。

## 4. 本プロジェクトの設計判断

- BurgerEditorの操作モデルは採用するが、HTML保存方式は採用しない。
- コンテンツ正本を型付きBlock Treeとする。
- Blockに永続ID、Component Version、provenanceを持たせる。
- 固定ページ、Article、カスタム型を共通ContentItem／ContentRevisionで管理する。
- Revisionを不変とし、本稿・草稿の二面構造を廃止する。
- AIは直接DBを操作せず、型付きCommandとChangeSetを使用する。
- AIによる変更は原則として候補Revisionを生成し、人間の承認を経る。
- 権限をURL中心からCapability中心へ変更する。
- 画像・ファイルはR2上のAssetとして管理し、本文にはAsset IDを保存する。
- テーマは不変のThemeReleaseとして扱い、本番コードを管理画面から直接編集しない。
- 公開後の検索、サイトマップ、キャッシュ、検証をPublication Pipelineとして統合する。
