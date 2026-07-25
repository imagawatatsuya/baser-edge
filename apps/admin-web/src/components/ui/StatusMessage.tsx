export function StatusMessage({ message, error }: { message?: string; error?: boolean }) {
  if (!message) return null;
  return <p className={`status ${error ? "status-error" : ""}`}>{message}</p>;
}
