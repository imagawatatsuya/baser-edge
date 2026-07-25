import type { ReactNode } from "react";

export function Modal({
  title,
  children,
  onClose,
  footer,
}: {
  title: string;
  children: ReactNode;
  onClose: () => void;
  footer?: ReactNode;
}) {
  return (
    <div className="modal-overlay" onClick={onClose} role="presentation">
      <div className="modal" onClick={(e) => e.stopPropagation()} role="dialog" aria-labelledby="modal-title">
        <h2 id="modal-title">{title}</h2>
        {children}
        {footer ? <div className="modal-actions">{footer}</div> : null}
      </div>
    </div>
  );
}
