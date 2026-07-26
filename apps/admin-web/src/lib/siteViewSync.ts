import { invalidateContentTreeCache } from "./contentTreeCache";
import { invalidateMediaAssetsCache } from "./mediaAssetsCache";

/**
 * Invalidate cached admin views of site content (tree, etc.) after mutations.
 * Call from shared mutation helpers or when a screen cannot reload the tree directly.
 */
export function invalidateSiteContentViews(): void {
  invalidateContentTreeCache();
  invalidateMediaAssetsCache();
}
