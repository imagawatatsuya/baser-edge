import { invalidateContentTreeCache } from "./contentTreeCache";
import { invalidateMediaAssetsCache } from "./mediaAssetsCache";
import { invalidateContentEditorCache } from "./contentSnapshotCache";

/**
 * Invalidate cached admin views after mutations that can affect multiple console surfaces.
 * Logout / site switch / trash / restore / approvals use this (tree + media).
 */
export function invalidateSiteContentViews(): void {
  invalidateContentTreeCache();
  invalidateMediaAssetsCache();
  invalidateContentEditorCache();
}
