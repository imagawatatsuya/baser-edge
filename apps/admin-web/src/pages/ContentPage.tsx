import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { apiFetch } from "../api/client";
import type { BlogListEntry } from "../api/types";
import { useAuth } from "../auth/AuthProvider";
import { displayTitle, simpleDocument } from "../lib/document";
import { normalizeSlugInput, SLUG_FIELD_HINT, validateSlugInput } from "../lib/slug";

export function ContentPageToolbar({ onRefresh }: { onRefresh: () => void }) {
  const navigate = useNavigate();
  const [showNewBlog, setShowNewBlog] = useState(false);
  const [showNewArticle, setShowNewArticle] = useState(false);
  const [blogs, setBlogs] = useState<BlogListEntry[]>([]);
  const { session } = useAuth();

  async function openNewArticle() {
    if (!session) return;
    const list = await apiFetch<BlogListEntry[]>(`/v1/sites/${session.siteId}/blogs`);
    setBlogs(list);
    setShowNewArticle(true);
  }

  return (
    <>
      <div className="toolbar">
        <button type="button" className="btn" onClick={onRefresh}>更新</button>
        <button type="button" className="btn" onClick={() => setShowNewBlog(true)}>ブログを追加</button>
        <button type="button" className="btn btn-primary" onClick={() => void openNewArticle()}>記事を追加</button>
      </div>
      {showNewBlog ? (
        <NewBlogModal
          onClose={() => setShowNewBlog(false)}
          onCreated={() => { setShowNewBlog(false); onRefresh(); }}
        />
      ) : null}
      {showNewArticle ? (
        <NewArticleModal
          blogs={blogs}
          onClose={() => setShowNewArticle(false)}
          onCreated={(id) => { setShowNewArticle(false); onRefresh(); navigate(`/content/${id}`); }}
        />
      ) : null}
    </>
  );
}

function NewBlogModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const { session } = useAuth();
  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!session) return;
    setBusy(true);
    setError("");
    const slugError = validateSlugInput(slug);
    if (slugError) {
      setError(slugError);
      setBusy(false);
      return;
    }
    const normalizedSlug = normalizeSlugInput(slug);
    try {
      await apiFetch("/v1/blogs", {
        method: "POST",
        json: { siteId: session.siteId, title, slug: normalizedSlug, document: simpleDocument(title, "") },
      });
      onCreated();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setBusy(false);
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <form className="modal" onClick={(e) => e.stopPropagation()} onSubmit={(e) => void submit(e)}>
        <h2>ブログを追加</h2>
        <div className="field"><label>タイトル<input value={title} onChange={(e) => setTitle(e.target.value)} required /></label></div>
        <div className="field">
          <label>URLスラッグ
            <input value={slug} onChange={(e) => setSlug(e.target.value)} required placeholder="news" />
          </label>
          <small className="field-hint">{SLUG_FIELD_HINT}</small>
        </div>
        {error ? <p className="status status-error">{error}</p> : null}
        <div className="modal-actions">
          <button type="button" className="btn" onClick={onClose}>キャンセル</button>
          <button type="submit" className="btn btn-primary" disabled={busy}>作成</button>
        </div>
      </form>
    </div>
  );
}

function NewArticleModal({
  blogs,
  onClose,
  onCreated,
}: {
  blogs: BlogListEntry[];
  onClose: () => void;
  onCreated: (contentItemId: string) => void;
}) {
  const { session } = useAuth();
  const [collectionId, setCollectionId] = useState(blogs[0]?.collection.id ?? "");
  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!session || !collectionId) return;
    setBusy(true);
    setError("");
    const slugError = validateSlugInput(slug);
    if (slugError) {
      setError(slugError);
      setBusy(false);
      return;
    }
    const normalizedSlug = normalizeSlugInput(slug);
    try {
      const created = await apiFetch<{ item: { id: string } }>(`/v1/blogs/${encodeURIComponent(collectionId)}/articles`, {
        method: "POST",
        json: { title, slug: normalizedSlug, document: simpleDocument(title, "") },
      });
      onCreated(created.item.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setBusy(false);
    }
  }

  if (!blogs.length) {
    return (
      <div className="modal-overlay" onClick={onClose}>
        <div className="modal" onClick={(e) => e.stopPropagation()}>
          <h2>記事を追加</h2>
          <p>先にブログを作成してください。</p>
          <div className="modal-actions"><button type="button" className="btn" onClick={onClose}>閉じる</button></div>
        </div>
      </div>
    );
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <form className="modal" onClick={(e) => e.stopPropagation()} onSubmit={(e) => void submit(e)}>
        <h2>記事の下書き</h2>
        <div className="field">
          <label>ブログ
            <select value={collectionId} onChange={(e) => setCollectionId(e.target.value)} required>
              {blogs.map((b) => (
                <option key={b.collection.id} value={b.collection.id}>{displayTitle(b)}</option>
              ))}
            </select>
          </label>
        </div>
        <div className="field"><label>タイトル<input value={title} onChange={(e) => setTitle(e.target.value)} required /></label></div>
        <div className="field">
          <label>URLスラッグ
            <input value={slug} onChange={(e) => setSlug(e.target.value)} required placeholder="hello" />
          </label>
          <small className="field-hint">{SLUG_FIELD_HINT}</small>
        </div>
        {error ? <p className="status status-error">{error}</p> : null}
        <div className="modal-actions">
          <button type="button" className="btn" onClick={onClose}>キャンセル</button>
          <button type="submit" className="btn btn-primary" disabled={busy}>下書きを作成</button>
        </div>
      </form>
    </div>
  );
}
