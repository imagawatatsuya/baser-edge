# baserCMS Plugin移行診断: BurgerEditor

- Key候補: `burger-editor`
- 判定: **trusted-adapter-required**
- PHP: 123 files
- Critical: 0
- High: 4

## 推奨Manifest

```json
{
  "key": "burger-editor",
  "name": "BurgerEditor",
  "trust": "trusted",
  "capabilities": [
    "admin:page",
    "api:route",
    "block:register",
    "content:propose",
    "content:read",
    "storage:write"
  ],
  "hooks": [
    "content.afterPublish (要手動判定)",
    "content.beforePublish (要手動判定)"
  ],
  "source": {
    "kind": "basercms-migration",
    "reference": "BurgerEditor"
  }
}
```

## 構成

- Controllers: 2
- Services: 1
- Models: 11
- Templates: 1
- Migrations: 0

## Findings

### [high] ファイルシステム書込み

R2 AssetまたはPlugin専用Storageへ置換する。パスをコンテンツ正本にしない。

移行方針: `storage-adapter`

- `src/Controller/Admin/BurgerEditorController.php`
- `src/Plugin.php`
- `src/View/Helper/BurgerEditorHelper.php`

### [high] 直接SQL・Connection操作

PluginからD1へ任意SQLを許可せず、宣言済みStorage CollectionまたはHost APIへ置換する。

移行方針: `storage-schema`

- `config/update/2.6.2/updater.php`
- `src/Event/BurgerEditorModelEventListener.php`
- `src/Plugin.php`

### [high] FormProtection無効化

CSRF等の保護を外す実装は移植しない。型付きRouteとHost認証へ置換する。

移行方針: `security-redesign`

- `src/Controller/Admin/BurgerEditorController.php`
- `src/Event/BurgerEditorControllerEventListener.php`

### [high] 任意HTMLまたはScript注入

任意HTMLを正本・実行コードとして扱わず、安全なBlockまたは隔離Rendererへ変換する。

移行方針: `renderer-redesign`

- `Addon/type/button/init.php`
- `Addon/type/ckeditor/init.php`
- `Addon/type/download-file/init.php`
- `Addon/type/embed/init.php`
- `Addon/type/google-maps/init.php`
- `Addon/type/hr/init.php`
- `Addon/type/image/init.php`
- `Addon/type/image-link/init.php`
- `Addon/type/table/init.php`
- `Addon/type/title-h2/init.php`
- `Addon/type/title-h3/init.php`
- `Addon/type/trimmed-image/init.php`
- `Addon/type/trimmed-image-link/init.php`
- `Addon/type/youtube/init.php`
- `src/Event/BurgerEditorViewEventListener.php`
- `src/Lib/BurgerEditorUtil.php`
- `src/View/Helper/BurgerEditorHelper.php`
- `templates/cell/BurgerEditor/display.php`
- `webroot/js/admin/burger_editor.js`

### [medium] Session依存

Workersのローカルメモリへ依存せず、期限付きSession Storeへ置換する。

移行方針: `session-adapter`

- `webroot/js/admin/burger_editor.js`

### [info] CakePHP Event Listener

対応する宣言的Hookへ分解する候補。

移行方針: `hook-adapter`

- `src/Event/BurgerEditorControllerEventListener.php`
- `src/Event/BurgerEditorViewEventListener.php`

### [info] 管理画面Controller

admin:pageまたはHost管理画面の専用モジュールへ変換する。

移行方針: `admin-extension`

- `Addon/type/button/test.js`
- `Addon/type/ckeditor/init.js`
- `Addon/type/download-file/test.js`
- `Addon/type/embed/test.js`
- `Addon/type/hr/test.js`
- `Addon/type/table/test.js`
- `config/setting.php`
- `src/Controller/Admin/BurgerEditorController.php`
- `src/Event/BurgerEditorModelEventListener.php`
- `src/View/Helper/BurgerEditorHelper.php`

### [info] BurgerEditor Addon

Component Manifest・Block Version・Importerへ変換する。

移行方針: `block-manifest`

- `Addon/block/button/style.scss`
- `Addon/block/button2/style.scss`
- `Addon/block/button3/style.scss`
- `Addon/block/download-file/style.scss`
- `Addon/block/download-file2/style.scss`
- `Addon/block/download-file3/style.scss`
- `Addon/block/embed/style.scss`
- `Addon/block/google-maps/style.scss`
- `Addon/block/hr/style.scss`
- `Addon/block/image-link-text2/style.scss`
- `Addon/block/image-link-text3/style.scss`
- `Addon/block/image-link-text4/style.scss`
- `Addon/block/image-link-text5/style.scss`
- `Addon/block/image-link1/style.scss`
- `Addon/block/image-link2/style.scss`
- `Addon/block/image-link3/style.scss`
- `Addon/block/image-link4/style.scss`
- `Addon/block/image-link5/style.scss`
- `Addon/block/image-text2/style.scss`
- `Addon/block/image-text3/style.scss`

## 移行工程

1. 元Pluginの機能を、公開表示・管理画面・保存・外部通信・インストール処理へ分解する。
2. 推奨Manifestを人間が確認し、必要最小限のCapabilityだけを採用する。
3. 直接SQLとMigrationをHost管理の宣言的Storage Schemaへ変換する。
4. ファイル操作をR2 AssetまたはPlugin専用Storageへ変換する。
5. Controllerを型付きAPI RouteまたはHost Service Commandへ分解する。
6. PHP TemplateをTheme Componentまたは管理画面Extensionへ変換する。
7. 隔離実行候補はWorkers for Platformsで検証し、Trusted扱いは第一者コードに限定する。
8. 実サイトのデータ移行・権限・監査・Rollbackを統合テストする。

