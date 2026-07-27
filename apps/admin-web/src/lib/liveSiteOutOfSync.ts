import type { ContentTreeEntry } from "../api/types";
import type { CustomEntrySyncSnapshot } from "./contentEditorSync";

export function isContentSnapshotLiveOutOfSync(snapshot: {
  workingRevision: { id: string } | null;
  publishedRevision: { id: string } | null;
}): boolean {
  if (!snapshot.publishedRevision || !snapshot.workingRevision) return false;
  return snapshot.workingRevision.id !== snapshot.publishedRevision.id;
}

export function isContentTreeEntryLiveOutOfSync(entry: ContentTreeEntry): boolean {
  if (entry.snapshot.item.state === "trashed") return false;
  const key = entry.snapshot.item.contentTypeKey;
  if (key === "folder" || key === "alias") return false;
  return isContentSnapshotLiveOutOfSync(entry.snapshot);
}

export function isCustomEntryLiveOutOfSync(row: CustomEntrySyncSnapshot): boolean {
  if (!row.publishedRevision) return false;
  return row.workingRevision.id !== row.publishedRevision.id;
}

export function countContentTreeLiveOutOfSync(entries: ContentTreeEntry[]): number {
  return entries.filter(isContentTreeEntryLiveOutOfSync).length;
}
