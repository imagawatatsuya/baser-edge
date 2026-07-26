# Console mutation → view sync audit

Policy: [`.cursor/rules/console-mutation-sync.mdc`](../../.cursor/rules/console-mutation-sync.mdc). After a successful write, every on-screen list/tree/detail that depends on the changed data must update (read-your-writes).

Update this table when adding or changing admin mutations.

| Surface | Mutation | API / helper | View sync | Tests |
|---------|----------|--------------|-----------|-------|
| Content tree | Create page/folder/blog/article | `POST /v1/pages` etc. | `ContentLayout` → `reload()` | Golden path (article); layout static |
| Content tree | Move / reorder / copy | `treeMove`, `TreeModals` | `reload()` | Kernel / API worker |
| Content tree | Trash (tree menu) | `trashContent` | `reload()` + `invalidateSiteContentViews` | Static + golden path |
| Content tree | Trash (editor) | `trashContent` | `reloadContentTree()` + invalidate | Static |
| Content tree | Save / publish / unpublish (editor) | revisions, `publishContent` | `reloadContentTree()` + invalidate on trash/restore | Static (editor) |
| Trash page | Restore | `restoreContent` | `reload()` trash list + `invalidateSiteContentViews` | Golden path restore; static |
| Approvals | Approve / reject (+ publish) | inbox decide | `invalidateSiteContentViews` + `reload()` | API inbox test |
| Media library | Upload | upload session | `useMediaAssets.reload()` on upload page | — |
| Media library | Delete asset | `deleteAsset` | `reload()` on library page | format-asset-delete |
| Custom entries | Create entry | `POST …/entries` | `reload()` before navigate to editor | — |
| Custom entry editor | Save / publish / unpublish | custom-entry APIs | `setSnapshot` from GET (detail only); list refreshes on remount | Custom content kernel |
| Auth | Logout / site switch | session | `invalidateSiteContentViews` | — |

## P1 (not yet unified)

| Surface | Gap | Planned sync |
|---------|-----|----------------|
| Custom entry editor | List badges stale if user navigates back without remount | Optional shared entries context + `reload()` after publish |
| Media | Separate `useMediaAssets` per route child | Optional `MediaAssetsProvider` on `MediaLayout` |
| Themes / plugins | Activation lists | Invalidate or reload when console shows dependent state |

## Shared helpers

- `apps/admin-web/src/lib/siteViewSync.ts` — `invalidateSiteContentViews()` (content tree cache today)
- `apps/admin-web/src/lib/contentTrash.ts` — trash/restore + invalidate
- `apps/admin-web/src/hooks/useContentTree.ts` — tree fetch cache; `ContentTreeProvider` for child routes

## Regression tests

- `tests/console-golden-path.test.mjs` — API trash/restore vs tree/trash lists
- `tests/console-mutation-sync-ui.test.mjs` — critical React wiring
