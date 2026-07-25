# BurgerEditor importer

BurgerEditorの保存HTMLから、v0.3のStructured Documentへ移すための保守的なImporterです。

```bash
node tools/burger-editor-importer/cli.mjs input.html output.json
```

## 方針

- 認識できる見出し、区切り、画像グリッド、YouTubeだけを型付きComponentへ変換します。
- 画像パスは `legacy-path:` 参照として残し、後段のAsset importerでR2 Asset IDへ置換します。
- 未知Blockは `legacyBurgerBlock` として元HTMLを保持します。
- 未知Blockを推測で変換したり、黙って破棄したりしません。

BurgerEditor本体のコードはこのツールへコピーしていません。
