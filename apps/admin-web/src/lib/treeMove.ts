import { apiFetch } from "../api/client";
import { buildSortKey } from "@baser-edge/baser-domain";
import type { ContentSnapshot, ContentTreeEntry } from "../api/types";
import { compareTreeEntries } from "./treeSort";

export async function moveContentToParent(
  snapshot: ContentSnapshot,
  targetParentId: string | null,
  newSlug?: string,
) {
  await apiFetch(`/v1/content/${encodeURIComponent(snapshot.item.id)}/move`, {
    method: "POST",
    json: {
      targetParentId,
      newSlug: newSlug ?? snapshot.node.slug,
      expectedTreeVersion: snapshot.node.treeVersion,
    },
  });
}

export async function reorderContentInTree(
  snapshot: ContentSnapshot,
  targetParentId: string | null,
  insertAfterContentItemId: string | null,
) {
  return apiFetch<ContentSnapshot>(`/v1/content/${encodeURIComponent(snapshot.item.id)}/reorder`, {
    method: "POST",
    json: {
      targetParentId,
      insertAfterContentItemId,
      expectedTreeVersion: snapshot.node.treeVersion,
    },
  });
}

export function applyReorderToContentTree(
  entries: ContentTreeEntry[],
  previous: ContentSnapshot,
  next: ContentSnapshot,
  targetParentId: string | null,
  insertAfterContentItemId: string | null,
): ContentTreeEntry[] {
  const movingId = previous.item.id;
  const previousRoot = previous.node.cachedPath;
  const nextRoot = next.node.cachedPath;
  const siblings = entries
    .filter((entry) => entry.snapshot.item.id !== movingId && entry.snapshot.node.parentId === targetParentId)
    .sort(compareTreeEntries);
  const moving = entries.find((entry) => entry.snapshot.item.id === movingId);
  if (!moving) return entries;

  const ordered = [...siblings];
  const insertIndex = insertAfterContentItemId
    ? ordered.findIndex((entry) => entry.snapshot.item.id === insertAfterContentItemId) + 1
    : 0;
  ordered.splice(Math.max(0, insertIndex), 0, { ...moving, snapshot: next });
  const sortKeyById = new Map(
    ordered.map((entry, index) => [
      entry.snapshot.item.id,
      buildSortKey(index + 1, entry.snapshot.item.id),
    ]),
  );
  const relocated = previousRoot !== nextRoot;

  return entries.map((entry) => {
    const id = entry.snapshot.item.id;
    if (id === movingId) {
      return {
        ...entry,
        snapshot: {
          ...next,
          node: { ...next.node, sortKey: sortKeyById.get(id) ?? next.node.sortKey },
        },
      };
    }
    const sortKey = sortKeyById.get(id);
    const isDescendant = relocated && entry.snapshot.node.cachedPath.startsWith(`${previousRoot}/`);
    if (!sortKey && !isDescendant) return entry;
    const suffix = isDescendant ? entry.snapshot.node.cachedPath.slice(previousRoot.length) : "";
    return {
      ...entry,
      snapshot: {
        ...entry.snapshot,
        node: {
          ...entry.snapshot.node,
          ...(sortKey ? { sortKey } : {}),
          ...(isDescendant ? {
            cachedPath: `${nextRoot}${suffix}`,
            treeVersion: entry.snapshot.node.treeVersion + 1,
          } : {}),
        },
        route: isDescendant
          ? { ...entry.snapshot.route, path: `${nextRoot}${suffix}` }
          : entry.snapshot.route,
      },
    };
  });
}

export function canDropOnFolder(dragType: string, targetType: string): boolean {
  if (dragType === "article") return targetType === "blog";
  if (dragType === "page" || dragType === "blog" || dragType === "folder" || dragType === "alias") {
    return targetType === "folder" || targetType === "root";
  }
  return false;
}
