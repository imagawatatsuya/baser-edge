# Asset・Previewアーキテクチャ v0.3

## 目的

baserCMSのメディア管理と公開前確認を、Cloudflare向けに次の原則で再実装する。

- コンテンツにはファイルパスではなく不変Asset IDを保存する。
- アップロード資格情報は短時間・一用途・一回限りとする。
- 未公開内容は保存済みの正確なRevisionとしてプレビューする。
- プレビューで確認したRevisionと公開対象を一致させる。
- 公開中コンテンツから参照されるAssetを無警告で削除しない。

## Assetモデル

```text
Asset
├─ workspaceId
├─ objectKey
├─ originalFilename
├─ mediaType
├─ byteSize / checksum
├─ state
└─ ownerPrincipalId

UploadSession
├─ assetId
├─ mediaType
├─ maximumBytes
├─ expiresAt
├─ state
└─ createdBy
```

Assetの状態は `pending → ready` をMVPで使用する。`quarantined` は型として予約しているが、検査Processorは未実装である。

## Upload flow

```text
Human / Agent
  ↓ asset.upload Capability
POST /v1/assets/upload-sessions
  ↓
Asset(pending) + UploadSession(pending)
  ↓ HMAC signed URL
PUT /v1/assets/uploads/{sessionId}?token=...
  ↓ API Worker validates token, MIME, expiry, size and state
R2 Binding.put()
  ↓
UploadSession(completed) + Asset(ready)
```

署名payloadは、Session ID、Asset ID、Object Key、Content-Type、最大サイズ、期限へ固定する。Session完了後の再利用は拒否する。

### 現在の意図的な制限

v0.3はAPI Workerを経由してR2 Bindingへ保存する。S3互換presigned URLでブラウザからR2へ直接送信する方式ではない。後者は大容量・multipart対応Milestoneで追加可能なadapterとして残す。

## AssetReference

Structured Document保存時にAsset IDを抽出し、Revision単位の参照として保存する。

```text
revision_asset_references
├─ revision_id
├─ asset_id
├─ block_id
├─ field_path
└─ usage
```

削除時は、公開中Revisionからの参照を検索する。参照があれば `ASSET_IN_USE` としてsoft deleteを拒否する。

MVPの削除はmetadata上のsoft deleteのみで、R2 objectの物理削除は行わない。

## Public Asset route

```text
GET /assets/{assetId}
HEAD /assets/{assetId}
```

`ready` かつ未削除のAssetだけを返す。レスポンスにはContent-Type、Content-Length、ETag、immutable cache、`nosniff`、安全側のContent-Dispositionを設定する。

## PreviewSession

```text
PreviewSession
├─ contentItemId
├─ revisionId
├─ revisionHash
├─ themeRelease
├─ issuedTo
├─ expiresAt
├─ revokedAt
└─ lastAccessedAt
```

Preview tokenはSessionを指すHMAC署名付きBearer tokenである。解決時に次をすべて検証する。

1. 署名
2. token期限
3. 保存済みSessionの存在
4. Sessionの失効状態
5. tokenとSessionのContent/Revision/Hash/Theme一致
6. 現在保存されているRevisionのHash一致

```text
GET /_preview/{token}
```

公開Rendererと同じComponent Rendererを使用し、公開headの代わりにSessionで固定されたRevisionを渡す。

## Response policy

Previewには次を付ける。

- `Cache-Control: private, no-store`
- `X-Robots-Tag: noindex, nofollow, noarchive`
- `Referrer-Policy: no-referrer`
- PreviewSession / Content / Revision識別ヘッダー

## D1 invariants

Migration 0003は、PreviewSessionが同じWorkspace・Site・Content Itemに属するRevisionを指し、Revision Hashが一致することをTriggerで強制する。

## 未実装

- 画像variant
- MIME sniffingと実ファイル形式照合
- malware scan
- EXIF除去
- quarantine Queue
- multipart upload
- physical deletion / retention
- AccessまたはPasskeyによるPreview二重保護
