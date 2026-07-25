# baserCMS との関係（公開向け）

baserEdge は **baserCMS プロジェクトの後継・置き換えを宣言するものではありません。** 別製品として、Cloudflare（Workers / D1 / R2）上で動く CMS を目指しています。

## 共通していること

- **運用イメージ:** サイトツリーを中心に、Folder / Page / Alias / Blog / Mail Form / Custom Content などを一つの木で扱う考え方（baserCMS で馴染みのあるモデルに近い）
- **用語:** ドキュメントやコード中の Site、Content Tree、Theme、Plugin などは、その理解を共有しやすくするための参照

## 意図的に含めないこと

- baserCMS 5 の **PHP 実行・同梱・データベースの後方互換**
- 既存 baserCMS サイトの **ワンクリック移行** を baserEdge 本体の必須機能とすること
- baserCMS / BurgerEditor / EmDash の **ソースコードのコピー**（参照・診断ツールは [THIRD_PARTY_NOTICES.md](../../THIRD_PARTY_NOTICES.md)）

製品境界の詳細: [ADR-0021](../adr/0021-baseredge-product-identity-no-host-migration.md)

## データ連携について

将来、baserCMS から baserEdge へコンテンツを移す必要があれば、**双方が合意したエクスポート／インポート形式**（公開 API やファイル形式）として **別途** 検討するのが自然です。baserEdge コアのスコープは「移行パイプラインの実装」ではなく、**移行先としての安定した契約**の提供です。

## 診断ツール（theme / plugin）

`npm run diagnose:theme` / `diagnose:plugin` は、**既存 baserCMS 資産を実行せず静的に調べる**開発者向けユーティリティです。baserEdge 製品の公式移行保証や baserCMS 本体への評価・批判を目的としません。

## このリポジトリの状態

README および [product-requirements-v0.4.md](../requirements/product-requirements-v0.4.md) に従い、**プレビュー段階**の機能があります。Issue やドキュメントの「将来」「未実装」はロードマップであり、baserCMS 本体の開発方針を指すものではありません。

**public 化後**に旧版ドキュメントや Git 履歴を遡って読まれることがあります。当時の記述が残っていても、**正本は [docs/README.md](../README.md)** に従ってください。
