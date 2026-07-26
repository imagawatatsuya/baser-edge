import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { apiFetch, ensureStepUp } from "../api/client";
import { useAuth } from "../auth/AuthProvider";
import { invalidateSiteContentViews } from "../lib/siteViewSync";
import { Button } from "../components/ui/Button";
import { StatusMessage } from "../components/ui/StatusMessage";

type ContentInboxRow = {
  approval: { id: string; contentItemId: string; revisionId: string; riskLevel: string };
  path: string;
  title: string;
  fromAgent: boolean;
  agentRunId: string | null;
};

type CustomInboxRow = {
  approval: { id: string; entryId: string; revisionId: string };
  customContentId: string;
  entrySlug: string | null;
};

type Inbox = { content: ContentInboxRow[]; customEntries: CustomInboxRow[] };

export function ApprovalsPage() {
  const { session } = useAuth();
  const [inbox, setInbox] = useState<Inbox>({ content: [], customEntries: [] });
  const [filter, setFilter] = useState<"all" | "agent">("all");
  const [status, setStatus] = useState("");
  const [busyId, setBusyId] = useState("");

  const reload = useCallback(async () => {
    if (!session) return;
    const data = await apiFetch<Inbox>(`/v1/sites/${session.siteId}/approval-inbox`);
    setInbox(data);
  }, [session]);

  useEffect(() => { void reload().catch((e) => setStatus(String(e))); }, [reload]);

  const contentRows = filter === "agent" ? inbox.content.filter((r) => r.fromAgent) : inbox.content;

  async function decideContent(row: ContentInboxRow, decision: "approved" | "rejected") {
    if (!session) return;
    setBusyId(row.approval.id);
    try {
      await apiFetch(`/v1/approvals/${encodeURIComponent(row.approval.id)}/decide`, {
        method: "POST",
        json: { decision, comment: decision === "approved" ? "承認キュー" : "却下" },
      });
      if (decision === "approved") {
        await ensureStepUp("content.publish", session.credentialId);
        await apiFetch(`/v1/content/${encodeURIComponent(row.approval.contentItemId)}/publish`, {
          method: "POST",
          json: { revisionId: row.approval.revisionId, approvalId: row.approval.id },
        });
      }
      invalidateSiteContentViews();
      await reload();
      setStatus(decision === "approved" ? "公開しました。" : "却下しました。");
    } catch (e) {
      setStatus(e instanceof Error ? e.message : String(e));
    } finally {
      setBusyId("");
    }
  }

  async function decideCustom(row: CustomInboxRow, decision: "approved" | "rejected") {
    if (!session) return;
    setBusyId(row.approval.id);
    try {
      await apiFetch(`/v1/custom-entry-approvals/${encodeURIComponent(row.approval.id)}/decide`, {
        method: "POST",
        json: { decision, comment: "承認キュー" },
      });
      if (decision === "approved") {
        await ensureStepUp("custom-entry.publish", session.credentialId);
        await apiFetch(`/v1/custom-entries/${encodeURIComponent(row.approval.entryId)}/publish`, {
          method: "POST",
          json: { revisionId: row.approval.revisionId, approvalId: row.approval.id },
        });
      }
      invalidateSiteContentViews();
      await reload();
      setStatus(decision === "approved" ? "カスタムエントリを公開しました。" : "却下しました。");
    } catch (e) {
      setStatus(e instanceof Error ? e.message : String(e));
    } finally {
      setBusyId("");
    }
  }

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1>承認キュー</h1>
          <p>コンテンツ・カスタムエントリ・エージェント提案の公開待ちを処理します。</p>
        </div>
        <div className="toolbar">
          <Button variant={filter === "all" ? "primary" : "default"} onClick={() => setFilter("all")}>すべて</Button>
          <Button variant={filter === "agent" ? "primary" : "default"} onClick={() => setFilter("agent")}>エージェントのみ</Button>
          <Button onClick={() => void reload()}>更新</Button>
        </div>
      </div>
      <h2>サイトコンテンツ</h2>
      <ul className="simple-list">
        {contentRows.map((row) => (
          <li key={row.approval.id}>
            <Link to={`/content/${row.approval.contentItemId}`}>{row.title}</Link>
            <span className="tree-meta">{row.path}</span>
            {row.fromAgent ? <span className="badge badge-pending">Agent</span> : null}
            <span className="badge badge-pending">{row.approval.riskLevel}</span>
            <Button disabled={busyId === row.approval.id} onClick={() => void decideContent(row, "approved")}>承認して公開</Button>
            <Button variant="danger" disabled={busyId === row.approval.id} onClick={() => void decideContent(row, "rejected")}>却下</Button>
          </li>
        ))}
      </ul>
      <h2>カスタムエントリ</h2>
      <ul className="simple-list">
        {inbox.customEntries.map((row) => (
          <li key={row.approval.id}>
            <Link to={`/custom/${row.customContentId}/entries/${row.approval.entryId}`}>
              {row.entrySlug ?? row.approval.entryId.slice(0, 8)}
            </Link>
            <Button disabled={busyId === row.approval.id} onClick={() => void decideCustom(row, "approved")}>承認して公開</Button>
            <Button variant="danger" disabled={busyId === row.approval.id} onClick={() => void decideCustom(row, "rejected")}>却下</Button>
          </li>
        ))}
      </ul>
      {!contentRows.length && !inbox.customEntries.length ? <p className="status">承認待ちはありません。</p> : null}
      <StatusMessage message={status} />
    </div>
  );
}
