# ADR-0024: 公開サイトの `/assets/:id` は参照許可がある場合のみ配信する

- Status: Accepted
- Date: 2026-07-28

## Context

Asset ID はコンテンツ Revision から参照される。Upload 直後や下書きのみの参照では、公開ページにはまだ出ていないが `/assets/:id` だけ誰でも取得できる状態だった。公開中 Revision から画像を外して下書きだけ保存した場合も、再公開までは旧公開 Revision が参照を保持するため、メディア削除ポリシーと訪問者向け表示は一致するが、**公開と無関係な Asset ID の直リンク**は残る。

管理コンソールのサムネイルは同一 API オリジン上の認証付きバイナリ配信を使い、公開 Worker とは責務を分ける。

## Decision

1. 公開 Renderer の `GET /assets/:id` は **fail-closed** とする。`SITE_ID` が設定されている本番相当の Worker では、次のいずれかを満たすときだけ 200 を返す。
   - 当該サイトの **公開中 Revision**（`published_revision_id`）が Asset を参照している。
   - 当該サイトで **有効な PreviewSession**（未失効・未 revoke・期限内）が指す Revision が Asset を参照している。
2. 上記以外はオブジェクトが R2/D1 に存在しても **404**（存在隠蔽）。
3. 認証済みオペレータ向けに API `GET /v1/assets/:id/content` で Workspace 内の ready Asset バイナリを配信する（コンソール・メディアライブラリ用）。
4. 公開配信の変更は `listPublishedAssetReferences` と同じデータモデル（`revision_asset_references`）に基づく。

## Consequences

### Positive

- 公開ページに載っていない（かつ有効プレビューにも載っていない）Asset ID の直リンクを塞げる。
- 再公開後は公開 Revision から外れた Asset の直リンクも 404 になり、訪問者向け表示と一致する。
- コンソールは認証経路のままライブラリ表示を維持できる。

### Negative

- 公開 Worker は Asset 配信前に D1 参照チェックが増える。
- 「公開サイトの URL でメディアだけ開く」は、公開またはプレビュー中 Revision に載っている場合に限られる。

## Related

- [ADR-0013](0013-assets-signed-upload-and-preview-sessions.md)（Asset ID・PreviewSession）
- `docs/engineering/api-validation-audit.md`（`/v1/assets/:id/content`）
