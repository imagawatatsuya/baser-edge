# Cloudflare Native CMS 製品要件定義 v0.1

## 1. 製品定義

Cloudflare Native CMSは、AIエージェントがコンテンツ制作と複雑なCMS操作を担い、人間が主にスマートフォンから指示・確認・承認できるCMSである。

単なるbaserCMSのCloudflare移植ではない。baserCMSの成熟したCMSドメイン設計と、BurgerEditorで実証されたブロック編集操作を再構成し、Cloudflare Workers、D1、R2、Queues、Workflowsを前提に実装する。

## 2. 最上位原則

### PR-001 AI Agent First

AIを補助機能ではなく、Human、Mobile UI、Desktop UI、External Clientと並ぶ正式なPrincipal／Clientとして扱う。

### PR-002 Mobile Operations First

日常的な運用、承認、公開、緊急対応をスマートフォンのみで完結可能にする。

### PR-003 Structured Service First

すべてのクライアントは同じApplication Service、Capability、Validation、Revision、Auditを利用する。

## 3. 対象利用者

### Owner / Administrator

- サイト、利用者、AI権限、公開ポリシーを管理する。
- 高危険度変更を承認する。

### Editor

- ページやArticleを作成・編集する。
- AIへ制作指示を出す。
- 変更案を確認・修正する。

### Approver

- モバイルから差分とプレビューを確認する。
- 承認、却下、修正指示を行う。

### Developer / Theme Author

- ThemeRelease、Component、RendererをGitとCIで開発する。
- 本番管理画面からコードを直接編集しない。

### AI Agent

- 許可された範囲内で情報取得、下書き、変更提案、検査、公開申請を行う。

## 4. MVPの中心シナリオ

1. 利用者がスマートフォンからAIへページ更新を指示する。
2. AIが対象ContentItemと公開Revisionを調査する。
3. AIが型付きBlock操作からなるChangeSetを生成する。
4. システムが候補ContentRevisionを作成する。
5. 利用者が変更概要、Block差分、実ページプレビューを確認する。
6. 利用者が修正指示、却下、承認のいずれかを行う。
7. 承認済みRevisionを即時または予約公開する。
8. 検索、サイトマップ、キャッシュ、リンク、SEOの派生処理を更新する。
9. 公開URLを再取得し、公開Revisionが実際に表示されたことを検証する。

## 5. 機能要件

### 5.1 Content Kernel

- **FR-CONTENT-001** ContentItemは不変IDを持つ。
- **FR-CONTENT-002** PageとArticleは共通ContentItem／ContentRevisionを利用する。
- **FR-CONTENT-003** ContentRevisionは作成後に変更しない。
- **FR-CONTENT-004** working revisionとpublished revisionを分離する。
- **FR-CONTENT-005** ContentNodeは親子関係、slug、並び順、cached pathを持つ。
- **FR-CONTENT-006** URL変更時に旧URLのRedirectを作成できる。
- **FR-CONTENT-007** 内部リンクは可能な限りContent ID参照として保存する。

### 5.2 Structured Document

- **FR-DOC-001** HTML文字列ではなく型付きBlock Treeを正本とする。
- **FR-DOC-002** 各Blockは永続IDを持つ。
- **FR-DOC-003** 各BlockはComponent typeとComponent versionを持つ。
- **FR-DOC-004** Blockの追加、編集、上下移動、複製、削除を提供する。
- **FR-DOC-005** 未知または非対応Componentを破棄せず保持する。
- **FR-DOC-006** Component migrationは明示的に実行し、移行前後を確認可能にする。
- **FR-DOC-007** Block単位の表示開始・終了を表現できる。
- **FR-DOC-008** RichText内部も構造化文書として保存する。

### 5.3 初期Component

- Heading
- RichText
- Image
- ImageText
- Gallery
- CallToAction
- Table
- FileDownload
- SafeEmbed
- Divider

### 5.4 Autosave and Recovery

- **FR-AUTO-001** ブラウザ内一時保存を行う。
- **FR-AUTO-002** サーバー側editing draftを保存する。
- **FR-AUTO-003** 意味のある保存地点で正式Revisionを作成する。
- **FR-AUTO-004** baseRevisionIdを用いて競合更新を検出する。

### 5.5 AI Agent

- **FR-AI-001** AIは独立したAgent Principalとして識別する。
- **FR-AI-002** 人間の指示で動く場合、actorとonBehalfOfを分離して記録する。
- **FR-AI-003** AIはD1やR2を直接操作しない。
- **FR-AI-004** AIは型付きCommandのみを実行する。
- **FR-AI-005** MVPではAIに直接公開権限を与えない。
- **FR-AI-006** AIはChangeSetと候補Revisionを生成する。
- **FR-AI-007** AgentRunにモデル、指示元、base revision、生成revision、利用ツールを記録する。
- **FR-AI-008** 外部入力を信頼できないデータとして扱い、命令として実行しない。

### 5.6 Approval and Publication

- **FR-APPROVAL-001** 編集状態と公開状態を分離する。
- **FR-APPROVAL-002** ApprovalRequestは対象Revisionを固定する。
- **FR-APPROVAL-003** 承認後にRevision内容を差し替えられない。
- **FR-APPROVAL-004** 高危険度操作ではStep-up authenticationを要求可能にする。
- **FR-PUB-001** 即時公開と予約公開を提供する。
- **FR-PUB-002** 公開時にpublished_revision_idを原子的に切り替える。
- **FR-PUB-003** PublicationEventとAuditEventを記録する。
- **FR-PUB-004** 公開後の派生処理をOutbox経由で起動する。
- **FR-PUB-005** 公開URLを再取得し、期待Revisionを検証する。

### 5.7 Mobile Operations

- **FR-MOBILE-001** 承認待ち、公開予定、公開失敗をホームへ表示する。
- **FR-MOBILE-002** AIへの自然言語または音声指示を提供する。
- **FR-MOBILE-003** Block単位・フィールド単位の差分を表示する。
- **FR-MOBILE-004** 実ページプレビューを表示する。
- **FR-MOBILE-005** 修正指示、却下、承認を片手操作可能にする。
- **FR-MOBILE-006** 高危険度操作では影響範囲を要約表示する。
- **FR-MOBILE-007** カメラまたは端末ファイルからAssetを登録できる。

### 5.8 Asset

- **FR-ASSET-001** ファイルはR2へ保存し、D1にAsset metadataを保存する。
- **FR-ASSET-002** 本文にはファイルパスではなくAsset IDを保存する。
- **FR-ASSET-003** R2への直接アップロード用UploadSessionを発行する。
- **FR-ASSET-004** pending、uploaded、processing、ready、quarantined、failed等の状態を持つ。
- **FR-ASSET-005** AssetVariantを管理する。
- **FR-ASSET-006** AssetReferenceによって利用箇所を追跡する。
- **FR-ASSET-007** 利用中Assetの削除時に影響範囲を表示する。

### 5.9 Article and Collection

- **FR-COLLECTION-001** Articleを束ねるCollectionを提供する。
- **FR-COLLECTION-002** Collectionは一覧順、ページサイズ、表示Componentを持つ。
- **FR-TAXONOMY-001** CategoryとTagを共通Taxonomyで表現する。
- **FR-TAXONOMY-002** Termは不変IDを持つ。
- **FR-FEED-001** RSS等は公開Revisionから生成する派生Projectionとする。

### 5.10 Search, SEO, Sitemap, Cache

- **FR-SEARCH-001** 公開RevisionからSearchDocumentを生成する。
- **FR-SEARCH-002** MVPではD1 FTS5を使用する。
- **FR-SEO-001** SEO値はsite default、content type default、revision overrideから解決する。
- **FR-SEO-002** AI生成SEO値はSuggestionとして確定値と分離する。
- **FR-SITEMAP-001** canonicalかつindexableな公開Routeのみを掲載する。
- **FR-CACHE-001** Cache Tagによる限定無効化を行う。
- **FR-HEALTH-001** 公開後の検索、サイトマップ、キャッシュ、リンク、SEO状態を追跡する。

### 5.11 Identity, Authorization, Audit

- **FR-AUTH-001** Human、Agent、Service、ExternalClientをPrincipalとして扱う。
- **FR-AUTH-002** URLではなくCapabilityを認可の正本とする。
- **FR-AUTH-003** Capabilityにsite、content type、path、risk、期限のscopeを付与できる。
- **FR-AUTH-004** DelegationGrantでHumanからAgentへの権限委譲を明示する。
- **FR-AUDIT-001** 成功、失敗、拒否された操作を監査する。
- **FR-AUDIT-002** actor、onBehalfOf、delegation、resource、revision、capability、resultを記録する。
- **FR-AUDIT-003** 監査イベントは通常UIから物理削除できない。

### 5.12 Theme and Rendering

- **FR-THEME-001** ThemeReleaseは不変とする。
- **FR-THEME-002** 管理画面から本番テーマコードを直接編集しない。
- **FR-THEME-003** 日常的な外観変更はDesign TokenとLayout Compositionで行う。
- **FR-THEME-004** ThemeReleaseは対応Component Versionを宣言する。
- **FR-THEME-005** テーマ変更前に全Contentとの互換性を検査する。
- **FR-PREVIEW-001** PreviewはContent Revision、ThemeRelease、Token Revisionを固定する。

## 6. 非機能要件

### Security

- 任意HTML、任意Script、任意外部コード実行をMVPでは許可しない。
- AIへHuman session cookie、password、secretを渡さない。
- 入力はJSON Schema等で完全検証する。
- 高危険度操作はStep-up authentication対象とする。

### Reliability

- Revision作成、head更新、Audit、Outboxを原子的に処理する。
- Queue処理は冪等とする。
- Search、Sitemap等は再構築可能にする。
- 公開成功をcommittedとverifiedへ分ける。

### Mobile UX

- 主要操作は幅360px程度でも完結する。
- ドラッグ操作を必須にしない。
- 長い技術ログではなく、自然言語の要約と影響範囲を優先する。

### Performance

- 公開ページはEdge Cacheを利用する。
- 静的アセットは内容ハッシュ付きURLを使う。
- 公開トランザクションに検索再構築等の重い処理を含めない。

### Portability

- Application ServiceとDomain ModelをCloudflare SDKへ直接密結合させすぎない。
- D1、R2、Queuesのadapter境界を設ける。

## 7. MVP非対象

- コメント
- メールフォーム
- 多言語
- 高度なマルチサイト
- SaaS向けCustom Hostname管理
- リアルタイム共同編集
- 自由配置キャンバス
- 任意HTML／任意JavaScript
- 第三者任意コードプラグイン
- AIによる直接公開
- AIによるSchema変更
- テーママーケット
- BurgerEditor全Blockの再現

## 8. MVP受入条件

- Pageを構造化Blockで作成・編集できる。
- AIが既存Pageから候補Revisionを作成できる。
- モバイルUIで差分、プレビュー、承認を完結できる。
- 承認したRevisionと公開Revisionが一致する。
- 公開後に検索、サイトマップ、キャッシュ処理の状態を確認できる。
- 公開URLで期待Revisionが表示されることを自動検証できる。
- すべての操作主体と権限判断をAuditで追跡できる。
