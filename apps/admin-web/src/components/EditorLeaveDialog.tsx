import { useState } from "react";
import { Button } from "./ui/Button";
import { LIVE_SITE_STALE_ACK_PHRASE, liveSiteStaleAckValid } from "../lib/contentEditorSync";

export type EditorLeaveDialogMode = "unsaved" | "live-stale";

type Props = {
  open: boolean;
  mode: EditorLeaveDialogMode;
  busy: boolean;
  onCancel: () => void;
  onSaveAndPublishLive: () => void;
  onPublishLive: () => void;
  onSaveDraftOnly: () => void;
  onDiscard: () => void;
  onLeaveWithStaleLive: () => void;
  /** 未保存の編集があり、離脱前に下書きへ書き込む必要がある */
  needsCommit: boolean;
  published: boolean;
};

export function EditorLeaveDialog({
  open,
  mode,
  busy,
  onCancel,
  onSaveAndPublishLive,
  onPublishLive,
  onSaveDraftOnly,
  onDiscard,
  onLeaveWithStaleLive,
  needsCommit,
  published,
}: Props) {
  const [ack, setAck] = useState("");
  const [showDraftOnly, setShowDraftOnly] = useState(false);

  if (!open) return null;

  const ackOk = liveSiteStaleAckValid(ack);

  function resetLocal() {
    setAck("");
    setShowDraftOnly(false);
  }

  return (
    <div className="modal-overlay" role="presentation" onClick={() => !busy && onCancel()}>
      <div
        className="modal-panel editor-leave-dialog"
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="editor-leave-title"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 id="editor-leave-title">
          {mode === "live-stale" ? "公開サイトが古いままです" : "保存していない変更があります"}
        </h2>
        {mode === "live-stale" ? (
          <p>
            編集中の内容は下書きに保存されている場合でも、<strong>訪問者向けサイトはまだ古い版</strong>のままです。
            画像の削除などは「サイトに反映」するまで本番に出続けます。
          </p>
        ) : (
          <p>このまま移動すると、入力中の変更は失われます。</p>
        )}

        <div className="editor-leave-actions">
          {mode === "unsaved" ? (
            <>
              {published ? (
                <Button variant="primary" disabled={busy} onClick={() => { resetLocal(); onSaveAndPublishLive(); }}>
                  保存してサイトに反映
                </Button>
              ) : (
                <Button variant="primary" disabled={busy} onClick={() => { resetLocal(); onSaveDraftOnly(); }}>
                  保存して移動
                </Button>
              )}
              <Button disabled={busy} onClick={() => { resetLocal(); onDiscard(); }}>
                変更を破棄して移動
              </Button>
            </>
          ) : (
            <>
              <Button variant="primary" disabled={busy} onClick={() => { resetLocal(); onPublishLive(); }}>
                サイトに反映してから移動
              </Button>
              {needsCommit ? (
                <Button variant="link" disabled={busy} onClick={() => setShowDraftOnly((v) => !v)}>
                  {showDraftOnly ? "下書きのみ保存を閉じる" : "下書きのみ保存してから移動…"}
                </Button>
              ) : null}
              {showDraftOnly && needsCommit ? (
                <div className="editor-leave-draft-only">
                  <Button
                    disabled={busy || !ackOk}
                    onClick={() => { resetLocal(); onSaveDraftOnly(); }}
                  >
                    下書きのみ保存して移動
                  </Button>
                </div>
              ) : null}
              <label className="editor-leave-ack">
                本番を更新せずに移動する場合は <code>{LIVE_SITE_STALE_ACK_PHRASE}</code> と入力
                <input
                  type="text"
                  value={ack}
                  onChange={(e) => setAck(e.target.value)}
                  autoComplete="off"
                  disabled={busy}
                />
              </label>
              <Button
                variant="danger"
                disabled={busy || !ackOk}
                onClick={() => { resetLocal(); onLeaveWithStaleLive(); }}
              >
                本番を更新せずに移動
              </Button>
            </>
          )}
          <Button disabled={busy} onClick={() => { resetLocal(); onCancel(); }}>
            編集を続ける
          </Button>
        </div>
      </div>
    </div>
  );
}
