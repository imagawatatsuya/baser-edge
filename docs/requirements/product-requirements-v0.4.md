# baserEdge 製品要件 v0.4

> **Authority:** [ADR-0021](../adr/0021-baseredge-product-identity-no-host-migration.md). Supersedes [v0.3](./product-requirements-v0.3.md) for product definition and priorities. ドキュメント地図（旧版との見分け）: [docs/README.md](../README.md).

## 製品定義

**baserEdge** は、Cloudflare 上で動作する CMS である。サイトツリー中心の Content Manager、標準コンテンツ（Page / Blog / Mail Form / Custom Content 等）、Theme、Plugin による機能分割を製品の骨格とする。

- baserCMS 5 を同梱・実行・依存しない。PHP レンタルサーバー前提を再現しない。
- WordPress 互換や Collection 中心の汎用 CMS は作らない。
- baserCMS 系の**運用モデル**（ツリー上の Folder / Page / Alias / Blog 等）を参考にするが、**後方互換性は製品目標に含めない**。

## 必達目標（導入体験）

| ID | 要件 |
|----|------|
| **DEPLOY-001** | 顧客は Cloudflare アカウント作成後、**ワンクリック（または同等の単一フロー）で** API・公開配信・管理コンソール・D1/R2 等の初期リソースをデプロイし、初期設定を完了できること。 |
| **DEPLOY-002** | 本番の標準導線で、手作業の Wrangler 設定・複数リポジトリ手順・未定義の秘密情報の手入力を要求しないこと（開発者向けローカルスタックは除外可）。 |
| **DEPLOY-003** | 初回ブートストラップ（サイト所有者・Passkey 登録・必須シークレット）が上記フローに含まれること。 |

未達の DEPLOY 要件は、新機能より優先して解消する。

## 最上位原則

1. **Cloudflare 運用体験と安全境界**（ワンクリックデプロイ含む）
2. **サイトツリー中心の baserEdge 製品モデル**
3. **AI Agent First / Mobile Operations First / 必須承認**（既定で Agent は直接公開しない）
4. **汎用機構の選択採用**（Revision、Manifest、隔離など）。製品モデルを WP/Collection 化しない。

## 移行・互換（明示的にスコープ外）

- baserEdge コアは **baserCMS 5 からのデータ・テーマ・プラグインの自動移行** を製品要件としない（[relationship-to-basercms.md](../compatibility/relationship-to-basercms.md)）。
- 後方互換のための ID / Path / プラグイン拘束は製品目標に含めない。
- 将来のデータ連携が必要な場合は、**双方が合意したエクスポート形式や公開 API** として別途検討する。baserEdge コアのバックログに importer / 互換レイヤを必須とはしない。

静的な baserCMS テーマ・プラグイン診断 CLI は、レガシー資産の理解用ユーティリティであり、移行の完了保証や baserCMS 本体への評価を目的としない。

## 認証・権限

- CMS ログイン: Passkey（WebAuthn）+ サーバーサイド Session + CSRF + Capability。
- Cloudflare Access は任意の外側到達制御。Access ≠ CMS 管理者権限。
- Human / Agent / Service / Plugin は同一 Application Service と監査モデルを使用する。

## 構造（不変）

- Site 配下の統一 Content Tree。Folder / Page / Alias / Blog / Mail Form / Custom Content が同一ツリーに参加。
- コンテンツ本体とルート位置の分離。Site ↔ Theme。Plugin は Manifest + Activation の明示付与。
- Revision / ThemeRelease / PluginRelease は不変。
- 入力検証は domain → API → admin（[validation-policy.md](../engineering/validation-policy.md)）。

## 管理 UI

- 人間向け正本 UI: `apps/admin-web`（`/console/`）。[ADR-0020](../adr/0020-admin-console-as-product-surface.md)。

## v0.4 以前の acceptance criteria

v0.1–v0.3 で定義されたコンテンツ縦スライス、Content Manager、Asset/Preview、Blog、Custom Content、Mail Form、Theme、Plugin、Auth 等の**機能要件**は引き続き有効（互換条項を除く）。詳細は [v0.3](./product-requirements-v0.3.md) および各アーキテクチャドキュメントを参照。
