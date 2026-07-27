import { useState } from "react";
import { Button } from "./ui/Button";
import { LIVE_SITE_STALE_ACK_PHRASE, liveSiteStaleAckValid } from "../lib/contentEditorSync";

type Props = {
  open: boolean;
  busy: boolean;
  onCancel: () => void;
  onConfirm: () => void;
};

/** 公開済みページで「下書きのみ保存」を選んだときの機械的確認 */
export function DraftOnlySaveModal({ open, busy, onCancel, onConfirm }: Props) {
  const [ack, setAck] = useState("");

  if (!open) return null;

  const ackOk = liveSiteStaleAckValid(ack);

  return (
    <div className="modal-overlay" role="presentation" onClick={() => !busy && onCancel()}>
      <div
        className="modal-panel editor-leave-dialog"
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="draft-only-save-title"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 id="draft-only-save-title">公開サイトは更新されません</h2>
        <p>
          下書きだけ保存します。<strong>訪問者向けサイトとメディアの公開 URL は今の公開版のまま</strong>です。
          本番に載せ替えるには「サイトに反映」を使ってください。
        </p>
        <label className="editor-leave-ack">
          続行するには <code>{LIVE_SITE_STALE_ACK_PHRASE}</code> と入力
          <input
            type="text"
            value={ack}
            onChange={(e) => setAck(e.target.value)}
            autoComplete="off"
            disabled={busy}
          />
        </label>
        <div className="editor-leave-actions">
          <Button variant="primary" disabled={busy || !ackOk} onClick={() => { setAck(""); onConfirm(); }}>
            下書きのみ保存
          </Button>
          <Button disabled={busy} onClick={() => { setAck(""); onCancel(); }}>
            キャンセル
          </Button>
        </div>
      </div>
    </div>
  );
}
