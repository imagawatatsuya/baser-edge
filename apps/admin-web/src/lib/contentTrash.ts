import { apiFetch } from "../api/client";
import type { ContentSnapshot } from "../api/types";
import { invalidateContentTreeCache } from "./contentTreeCache";
import { normalizeSlugInput } from "./slug";

export async function trashContent(snapshot: ContentSnapshot) {
  await apiFetch(`/v1/content/${encodeURIComponent(snapshot.item.id)}/trash`, {
    method: "POST",
    json: { expectedTreeVersion: snapshot.node.treeVersion },
  });
  invalidateContentTreeCache();
}

export async function restoreContent(snapshot: ContentSnapshot, newSlug?: string) {
  await apiFetch(`/v1/content/${encodeURIComponent(snapshot.item.id)}/restore`, {
    method: "POST",
    json: {
      expectedTreeVersion: snapshot.node.treeVersion,
      ...(newSlug ? { newSlug: normalizeSlugInput(newSlug) } : {}),
    },
  });
  invalidateContentTreeCache();
}
