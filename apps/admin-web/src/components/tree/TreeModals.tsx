import { useState } from "react";
import { apiFetch } from "../../api/client";
import type { ContentSnapshot, ContentTreeEntry } from "../../api/types";
import { useAuth } from "../../auth/AuthProvider";
import { simpleDocument } from "../../lib/document";
import { normalizeSlugInput, SLUG_FIELD_HINT, validateSlugInput } from "../../lib/slug";
import { restoreContent, trashContent } from "../../lib/contentTrash";
import { Modal } from "../ui/Modal";
import { Button } from "../ui/Button";
import { Field } from "../ui/Field";

export function CreatePageModal({
  parentId,
  onClose,
  onCreated,
}: {
  parentId: string | null;
  onClose: () => void;
  onCreated: () => void;
}) {
  const { session } = useAuth();
  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!session) return;
    const slugError = validateSlugInput(slug);
    if (slugError) { setError(slugError); return; }
    setBusy(true);
    setError("");
    try {
      await apiFetch("/v1/pages", {
        method: "POST",
        json: {
          siteId: session.siteId,
          parentId,
          title,
          slug: normalizeSlugInput(slug),
          document: simpleDocument(title, ""),
        },
      });
      onCreated();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setBusy(false);
    }
  }

  return (
    <Modal title="ページを追加" onClose={onClose} footer={(
      <>
        <Button onClick={onClose}>キャンセル</Button>
        <button type="submit" form="create-page-form" className="btn btn-primary" disabled={busy}>作成</button>
      </>
    )}>
      <form id="create-page-form" onSubmit={(e) => void submit(e)}>
        <Field label="タイトル"><input value={title} onChange={(e) => setTitle(e.target.value)} required /></Field>
        <Field label="URLスラッグ" hint={SLUG_FIELD_HINT}>
          <input value={slug} onChange={(e) => setSlug(e.target.value)} required />
        </Field>
        {error ? <p className="status status-error">{error}</p> : null}
      </form>
    </Modal>
  );
}

export function CreateFolderModal({ parentId, onClose, onCreated }: { parentId: string | null; onClose: () => void; onCreated: () => void }) {
  const { session } = useAuth();
  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!session) return;
    const slugError = validateSlugInput(slug);
    if (slugError) { setError(slugError); return; }
    setBusy(true);
    try {
      await apiFetch("/v1/folders", {
        method: "POST",
        json: { siteId: session.siteId, parentId, title, slug: normalizeSlugInput(slug) },
      });
      onCreated();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setBusy(false);
    }
  }

  return (
    <Modal title="フォルダを追加" onClose={onClose} footer={(
      <>
        <Button onClick={onClose}>キャンセル</Button>
        <button type="submit" form="create-folder-form" className="btn btn-primary" disabled={busy}>作成</button>
      </>
    )}>
      <form id="create-folder-form" onSubmit={(e) => void submit(e)}>
        <Field label="タイトル"><input value={title} onChange={(e) => setTitle(e.target.value)} required /></Field>
        <Field label="URLスラッグ" hint={SLUG_FIELD_HINT}><input value={slug} onChange={(e) => setSlug(e.target.value)} required /></Field>
        {error ? <p className="status status-error">{error}</p> : null}
      </form>
    </Modal>
  );
}

export function MoveContentModal({
  entry,
  tree,
  onClose,
  onMoved,
}: {
  entry: ContentTreeEntry;
  tree: ContentTreeEntry[];
  onClose: () => void;
  onMoved: () => void;
}) {
  const [newSlug, setNewSlug] = useState(entry.snapshot.node.slug);
  const [parentId, setParentId] = useState(entry.snapshot.node.parentId ?? "");
  const [impact, setImpact] = useState<string>("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const folders = tree.filter((e) => e.snapshot.item.contentTypeKey === "folder");

  async function previewImpact() {
    setError("");
    try {
      const result = await apiFetch<{ affected: { oldPath: string; newPath: string }[] }>(
        `/v1/content/${encodeURIComponent(entry.snapshot.item.id)}/move-impact`,
        { method: "POST", json: { targetParentId: parentId || null, newSlug: normalizeSlugInput(newSlug) } },
      );
      setImpact(`${result.affected.length} 件のパスが変わります`);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const slugError = validateSlugInput(newSlug);
    if (slugError) { setError(slugError); return; }
    setBusy(true);
    try {
      await apiFetch(`/v1/content/${encodeURIComponent(entry.snapshot.item.id)}/move`, {
        method: "POST",
        json: {
          targetParentId: parentId || null,
          newSlug: normalizeSlugInput(newSlug),
          expectedTreeVersion: entry.snapshot.node.treeVersion,
        },
      });
      onMoved();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setBusy(false);
    }
  }

  return (
    <Modal title="移動" onClose={onClose} footer={(
      <>
        <Button onClick={onClose}>キャンセル</Button>
        <button type="submit" form="move-form" className="btn btn-primary" disabled={busy}>移動</button>
      </>
    )}>
      <form id="move-form" onSubmit={(e) => void submit(e)}>
        <Field label="親フォルダ">
          <select value={parentId} onChange={(e) => setParentId(e.target.value)}>
            <option value="">（ルート）</option>
            {folders.map((f) => (
              <option key={f.snapshot.item.id} value={f.snapshot.node.id}>{f.snapshot.node.slug}</option>
            ))}
          </select>
        </Field>
        <Field label="新しいスラッグ"><input value={newSlug} onChange={(e) => setNewSlug(e.target.value)} required /></Field>
        <Button onClick={() => void previewImpact()}>影響を確認</Button>
        {impact ? <p className="status">{impact}</p> : null}
        {error ? <p className="status status-error">{error}</p> : null}
      </form>
    </Modal>
  );
}

export { trashContent, restoreContent };

export async function copyContent(snapshot: ContentSnapshot, newSlug: string, targetParentId: string | null) {
  await apiFetch(`/v1/content/${encodeURIComponent(snapshot.item.id)}/copy`, {
    method: "POST",
    json: {
      newSlug: normalizeSlugInput(newSlug),
      targetParentId,
      expectedTreeVersion: snapshot.node.treeVersion,
    },
  });
}
