export function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[character] ?? character);
}

export function escapeAttribute(value: string): string {
  return escapeHtml(value).replace(/`/g, "&#96;");
}

export function escapeAttributeName(value: string): string {
  return /^[a-zA-Z_:][a-zA-Z0-9:_.-]*$/.test(value) ? value : "data-invalid";
}

export function escapeComment(value: string): string {
  return value.replace(/--/g, "—");
}
