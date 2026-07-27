import type { AssetId, SiteId } from "@baser-edge/core-types";
import type { CmsService } from "@baser-edge/content-kernel";
import type { PreviewService } from "@baser-edge/preview-kernel";

export async function isAssetDeliverableOnPublicSite(
  cms: CmsService,
  previews: PreviewService | undefined,
  siteId: SiteId,
  assetId: AssetId,
  now: number,
): Promise<boolean> {
  const store = cms.store;
  if (typeof store.isAssetDeliverableOnPublicSite === "function") {
    return store.isAssetDeliverableOnPublicSite(siteId, assetId, now);
  }
  const published = await store.listPublishedAssetReferences(assetId);
  if (published.some((reference) => reference.siteId === siteId)) return true;
  if (!previews) return false;
  const activeSessions = await previews.listActiveSessionsForSite(siteId, now);
  for (const session of activeSessions) {
    if (await store.revisionReferencesAsset(session.revisionId, assetId)) return true;
  }
  return false;
}
