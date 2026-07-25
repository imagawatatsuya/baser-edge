# ADR-0010: 任意コードプラグインをMVPで提供しない

- Status: Accepted

## Context

baserCMSのプラグインとテーマは任意PHP、migration、event hookを実行できる。AIによる自動導入、サプライチェーン耐性、マルチテナント化と衝突する。

## Decision

MVPでは任意コードプラグインを提供しない。拡張はschema、Component Manifest、Pattern、Webhook、分離Worker等の制限された契約へ限定する。

## Consequences

- 従来CMSより拡張自由度は下がる。
- セキュリティ、互換性、監査可能性は高まる。
- 信頼済みModuleを追加する正式な審査・Build経路が必要になる。
