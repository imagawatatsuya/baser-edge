# Console mutation → view sync audit

Policy: [`.cursor/rules/console-mutation-sync.mdc`](../../.cursor/rules/console-mutation-sync.mdc). After a successful write, every on-screen list/tree/detail that depends on the changed data must update (read-your-writes).

Update this table when adding or changing admin mutations.

| Surface | Mutation | API / helper | View sync | Tests |
|---------|----------|--------------|-----------|-------|
| Content tree | Create page/folder/blog/article | `POST /v1/pages` etc. | `ContentLayout` → `reload()` | Golden path (article); layout static |
| Content tree | Move / reorder / copy | `treeMove`, `TreeModals` | `reload()` | Kernel / API worker |
| Content tree | Trash (tree menu) | `trashContent` | `reload()` + `invalidateSiteContentViews` | Static + golden path |
| Content tree | Trash (editor) | `trashContent` | `reloadContentTree()` + invalidate | Static |
| Content tree | Save / publish / unpublish (editor) | revisions, `publishContent` | API 応答で `syncEditorFromSnapshot` + `reloadContentTree()` | Static (editor) |
| Content tree | Article postedAt (editor blur) | `PATCH …/article-meta` | 変更時のみ `reloadContentTree()` | Static (editor) |
| Trash page | Restore | `restoreContent` | `reload()` trash list + `invalidateSiteContentViews` | Golden path restore; static |
| Approvals | Approve / reject (+ publish) | inbox decide | `invalidateSiteContentViews` + `reload()` | API inbox test |
| Media library | Upload | upload session | `MediaLayout` provider; upload page `reload()` | Static (media layout) |
| Media library | Delete asset | `deleteAsset` | `useMediaAssetsContext().reload()` on library page | format-asset-delete; static |
| Content editor | Pick image | — | `AssetPickerModal` → `useWorkspaceMediaAssets` (shared `mediaAssetsCache`) | Static |
| Custom entries | Create entry | `POST …/entries` | `CustomEntriesLayout` + `reload()` before navigate | Static |
| Custom entry editor | Save / publish / unpublish | custom-entry APIs | `setSnapshot` + `reloadEntries()` via context | Static; custom content kernel |
| Plugins | Activate / deactivate | plugin-activations | `loadActivations()` after success | Static |
| Themes | Activate release | `POST …/theme-activations` | `loadActiveTheme()` + active badge from `GET …/theme` | Static |
| Mail forms | (public submit) | — | 送信一覧は手動「更新」（`reloadSubmissions`） | Static (mail page) |
| Auth | Logout / site switch | session | `invalidateSiteContentViews` | — |

## P2 (optional)

_No open P2 items._

## Shared helpers

- `apps/admin-web/src/lib/siteViewSync.ts` — `invalidateSiteContentViews()` (tree + media; not used for editor-only tree reload)
- `apps/admin-web/src/lib/contentTrash.ts` — trash/restore + invalidate
- `apps/admin-web/src/hooks/useContentTree.ts` — tree fetch cache; `ContentTreeProvider` for child routes
- `apps/admin-web/src/lib/contentSnapshotCache.ts` — per-content editor snapshot cache (invalidate clears inflight; use `fresh` after mutations)
- `apps/admin-web/src/hooks/useCustomEntries.ts` — `CustomEntriesProvider` on `CustomEntriesLayout`
- `apps/admin-web/src/lib/mediaAssetsCache.ts` — workspace asset list cache (media layout + asset picker)

## Regression tests

- `tests/console-golden-path.test.mjs` — API trash/restore vs tree/trash lists
- `tests/console-mutation-sync-ui.test.mjs` — critical React wiring
