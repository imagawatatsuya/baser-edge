import { apiFetch } from "../api/client";
import type { ContentSnapshot } from "../api/types";

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
  await apiFetch(`/v1/content/${encodeURIComponent(snapshot.item.id)}/reorder`, {
    method: "POST",
    json: {
      targetParentId,
      insertAfterContentItemId,
      expectedTreeVersion: snapshot.node.treeVersion,
    },
  });
}

export function canDropOnFolder(dragType: string, targetType: string): boolean {
  if (dragType === "article") return targetType === "blog";
  if (dragType === "page" || dragType === "blog" || dragType === "folder" || dragType === "alias") {
    return targetType === "folder" || targetType === "root";
  }
  return false;
}
