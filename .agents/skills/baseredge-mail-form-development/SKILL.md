---
name: baseredge-mail-form-development
description: '複数Mail Form、Field、入力・確認・完了・受付停止、Submission、管理者通知、自動返信、保存方針、スパム対策、添付、retentionを実装・変更する正本。baserCMSの複数フォーム、項目編集、送信前確認、受付期間、通知テンプレート、受信履歴という成熟運用をD1、Outbox、Queue、任意R2へ適応する。'
license: MIT
metadata:
  project: baserEdge
  role: cms-mail
  skill_version: 1
  last_verified: 2026-07-28
---

# Mail Form Development

## 関連knowledge

- `CMS-MAIL-001`
- `CMS-MAIL-002`
- `CMS-MAIL-003`
- `CMS-LIFECYCLE-001`
- `CMS-THEME-001`

## 利用者目的

- Site内に用途の異なる複数フォームを置く。
- 管理者がField種類、必須、順序、選択肢、受付期間を設定する。
- 訪問者が入力、確認、送信完了を安全に行う。
- 管理者通知と自動返信を再送可能にする。
- Submission保存と個人情報retentionを制御する。

## 状態

```text
draft form
active form
closed form
trashed form

input
confirm
submitted
notification_pending
notification_delivered
notification_failed
retention_purged
```

公開期間と受付期間を同一視しない。受付期間外は技術エラーではなく明示的なclosed表示を返す。

## Field契約

- stable field IDと表示labelを分ける。
- type変更が既存Submission解釈を壊す場合はversionを作る。
- 必須、形式、選択肢、最大長、file制約をdomainで検証する。
- Field順序変更は過去Submissionを壊さない。
- 管理画面とpublic formが同じschema versionを使う。
- unknown field、重複field、改ざんfieldを拒否する。

## Submissionと通知

- Submission保存とnotification Outboxを同じD1原子境界に置く。
- Email送信そのものをrequest transactionに含めない。
- operation IDで重複通知を防ぐ。
- 管理者通知、自動返信、BCCを別deliveryとして記録する。
- 送信成功画面とEmail delivery成功を同一視しない。
- Email未構成時の能力とUIを明示する。
- raw recipient、token、本文を不用意にログへ出さない。

## スパムと安全

- Turnstile等は任意Bindingとして能力表示する。
- rate limit、honeypot、時間検査等を多層化する。
- CAPTCHA通過を入力検証の代用にしない。
- 添付はMIME、size、extension、参照、retentionを検査する。
- R2なし構成では添付を無効化するか、明示的な制限を設ける。
- redirect URLはopen redirectを防ぐclosed policyにする。

## Theme契約

input、confirm、complete、closed/errorの表示責務を分ける。  
baserCMSの画面分割は利用者フローの知識として採用し、PHPテンプレート互換にはしない。

## 必須テスト

- 複数Form分離
- Field type/required/order
- tampered schema version
- confirmからsubmit
- 受付期間前後
- duplicate submit/notification
- Email unavailable
- R2 absent attachment
- retention purge
- closed form Theme rendering
