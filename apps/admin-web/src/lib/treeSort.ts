import type { ContentTreeEntry } from "../api/types";

/** Sibling order per ContentNode.sortKey (numeric prefix). */
export function compareTreeEntries(a: ContentTreeEntry, b: ContentTreeEntry): number {
  const bySort = a.snapshot.node.sortKey.localeCompare(b.snapshot.node.sortKey, undefined, {
    numeric: true,
    sensitivity: "base",
  });
  if (bySort !== 0) return bySort;
  return a.snapshot.node.slug.localeCompare(b.snapshot.node.slug);
}
