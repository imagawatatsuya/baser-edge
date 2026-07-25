# baserCMS Plugin 静的診断

レガシー baserCMS Plugin を実行せず、静的に分類する**開発者向け**診断器です。PHP は実行しません。baserEdge への移行を保証するものではありません（[relationship-to-basercms.md](../../docs/compatibility/relationship-to-basercms.md)）。

```bash
npm run diagnose:plugin -- /path/to/BaserPlugin \
  --json plugin-report.json \
  --markdown plugin-report.md
```

診断対象:

- Controller / Service / Table / Entity / Event Listener / Helper / Template / Migration
- 直接SQL、ファイル書込み、外部通信、メール、動的コード、OSプロセス
- 管理画面、API Route、BurgerEditor Addon
- 推奨Capability、Hook、Trusted/Sandbox候補

結果は移行判断を補助するものであり、安全性や互換性を保証しません。
