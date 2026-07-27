import { Component, type ErrorInfo, type ReactNode } from "react";

type Props = { children: ReactNode };
type State = { error: Error | null };

export class ConsoleErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("console fatal render error", error, info.componentStack);
  }

  render() {
    if (this.state.error) {
      const detail = import.meta.env.PROD
        ? "予期しないエラーが発生しました。"
        : this.state.error.message;
      return (
        <div
          className="console-fatal-error"
          data-testid="console-fatal-error"
          role="alert"
          style={{
            minHeight: "100vh",
            padding: "2rem",
            maxWidth: "40rem",
            margin: "0 auto",
            fontFamily: "system-ui, sans-serif",
          }}
        >
          <h1 style={{ fontSize: "1.25rem", marginBottom: "0.75rem" }}>管理画面でエラーが発生しました</h1>
          <p style={{ marginBottom: "1rem", lineHeight: 1.5 }}>
            ページを再読み込みしてください。繰り返す場合は管理者に連絡してください。
          </p>
          <p
            className="status"
            style={{
              fontFamily: "ui-monospace, monospace",
              fontSize: "0.85rem",
              marginBottom: "1.25rem",
              wordBreak: "break-word",
            }}
          >
            {detail}
          </p>
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => window.location.reload()}
          >
            再読み込み
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
