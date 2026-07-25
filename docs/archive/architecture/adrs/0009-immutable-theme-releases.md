# ADR-0009: Themeを不変ThemeReleaseとして配布する

- Status: Accepted

## Context

baserCMSテーマはPHP、JavaScript、Helper、初期データ、プラグインを含み、管理画面から直接編集できる。AIが扱うには実行範囲が広すぎる。

## Decision

ThemeコードはGit、Build、Review、Preview、Deployを経た不変ThemeReleaseとして管理する。日常的変更はDesign TokenとLayout Compositionへ限定する。

## Consequences

- 本番管理画面からコードを直接編集できない。
- Component compatibility reportが必要になる。
- コード変更とコンテンツ公開を別パイプラインで扱う。
