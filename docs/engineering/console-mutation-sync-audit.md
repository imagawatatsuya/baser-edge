# Console mutation → view sync audit

Policy: [`.cursor/rules/console-mutation-sync.mdc`](../../.cursor/rules/console-mutation-sync.mdc). After a successful write, every on-screen list/tree/detail that depends on the changed data must update (read-your-writes).

Update this table when adding or changing admin mutations.

| Surface | Mutation | API / helper | View sync | Tests |
|---------|----------|--------------|-----------|-------|
| Content tree | Create page/folder/blog/article | `POST /v1/pages` etc. | `ContentLayout` → `reload()` | Golden path (article); layout static |
| Content tree | Reorder / drag move | `treeMove` | API snapshotを`applyReorderToContentTree`で共有tree cacheへ反映（全tree再取得なし）。drop位置、保存中、成功位置、undoを表示し、Articleの別Blog dropはAPI前に拒否 | Kernel / API worker / static feedback + undo |
| Content tree | Move dialog / copy | `TreeModals` | `reload()` | Kernel / API worker |
| Content tree | Trash (tree menu) | `trashContent` | `reload()` + `invalidateSiteContentViews` | Static + golden path |
| Content tree | Trash (editor) | `trashContent` | `reloadContentTree()` + invalidate | Static |
| Content tree | Save / publish / unpublish (editor) | revisions, `publishContent` | API 応答で `syncEditorFromSnapshot` + `reloadContentTree()` | Static (editor) |
| Content tree | Article postedAt (editor blur) | `PATCH …/article-meta` | API応答をeditor local stateへ反映（tree表示項目ではないため再取得なし） | Static (editor) |
| Trash page | Restore | `restoreContent` | `reload()` trash list + `invalidateSiteContentViews` | Golden path restore; static |
| Approvals | Approve / reject (+ publish) | inbox decide | `invalidateSiteContentViews` + `reload()` | API inbox test |
| Media library | Upload | upload session | `MediaLayout` provider; upload page `reload()` | Static (media layout) |
| Media library | Delete asset | `deleteAsset` | `useMediaAssetsContext().reload()` on library page | format-asset-delete; static |
| Media thumbnails | Generate/backfill derivative | `PUT /v1/assets/:id/thumbnail` | Asset list metadata is unchanged; current `<img>` already displays original fallback, next request uses immutable derivative | API + static thumbnail wiring |
| Content editor | Pick image | — | `AssetPickerModal` → `useWorkspaceMediaAssets` (shared `mediaAssetsCache`) | Static |
| Custom entries | Create entry | `POST …/entries` | `CustomEntriesLayout` + `reload()` before navigate | Static |
| Custom entry editor | Save / publish / unpublish | custom-entry APIs | `setSnapshot` + `reloadEntries()` via context | Static; custom content kernel |
| Plugins | Activate / deactivate | plugin-activations | activation query cacheを無効化後、`loadActivations()` | Static |
| Themes | Activate release | `POST …/theme-activations` | API応答でactive badgeとtheme query cacheを同時更新 | Static |
| Mail forms | (public submit) | — | 送信一覧は手動「更新」（`reloadSubmissions`） | Static (mail page) |
| Auth | Logout / site switch | session | `invalidateSiteContentViews` + console GET cache全消去 | Static |

## P2 (optional)

_No open P2 items._

## Shared helpers

- `apps/admin-web/src/lib/siteViewSync.ts` — `invalidateSiteContentViews()` (tree + media; not used for editor-only tree reload)
- `apps/admin-web/src/lib/contentTrash.ts` — trash/restore + invalidate
- `apps/admin-web/src/hooks/useContentTree.ts` — tree fetch cache; `ContentTreeProvider` for child routes; `updateEntries`でmutation deltaをcache/stateへ同時反映
- `apps/admin-web/src/lib/contentSnapshotCache.ts` — per-content editor snapshot cache (invalidate clears inflight; use `fresh` after mutations)
- `apps/admin-web/src/hooks/useCustomEntries.ts` — `CustomEntriesProvider` on `CustomEntriesLayout`
- `apps/admin-web/src/lib/mediaAssetsCache.ts` — workspace asset list cache (media layout + asset picker)
- `apps/admin-web/src/lib/consoleQueryCache.ts` — capabilities、Theme/Plugin Release等の短期GET cacheとinflight統合。mutation後は対象prefixを無効化またはAPI応答で更新し、auth失効時は全消去する。
- `scripts/benchmark-admin-console.mjs` — local stackへ簡易ログインし、主要9画面を5周してinteractive/settled時間と`/v1/*` request数を出力する。
- `scripts/benchmark-admin-content-workflow.mjs` — Blog作成、記事追加modal、記事editor、dirty draft previewの実ブラウザ応答時間と`Server-Timing`を出力する。
- `scripts/benchmark-d1-performance.mjs` — editor、blog picker/list、tree reorder、preview create/resolveのD1 statement数・論理round trip数を固定fixtureで出力する。
- 公開RendererのCache APIはクエリなしGETだけを対象とし、管理画面の`baserAdminView=published` URLはbypassするため、公開直後の管理確認はread-your-writesを維持する。

## Regression tests

- `tests/console-golden-path.test.mjs` — API trash/restore vs tree/trash lists
- `tests/console-mutation-sync-ui.test.mjs` — critical React wiring
