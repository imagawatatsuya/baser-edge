# baserCMS Theme Diagnostics

既存 baserCMS テーマを**実行せず静的に診断**する開発者向けユーティリティです。baserEdge への移行を保証するものではありません（[relationship-to-basercms.md](../../docs/compatibility/relationship-to-basercms.md)）。

```bash
node tools/basercms-theme-diagnostics/cli.mjs /path/to/extracted/theme
node tools/basercms-theme-diagnostics/cli.mjs /path/to/theme --json report.json --markdown report.md
```

このツールは自動変換器ではありません。PHP テーマの無変換実行を避け、レガシー資産の範囲を見積もるための診断器です。
