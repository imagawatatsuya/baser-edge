/** Parse D1 database UUID from wrangler CLI output (format varies by wrangler version). */
export function parseD1DatabaseIdFromOutput(out) {
  const text = String(out ?? "");
  const patterns = [
    /database_id\s*=\s*([0-9a-f-]{36})/i,
    /"database_id"\s*:\s*"([0-9a-f-]{36})"/i,
    /"uuid"\s*:\s*"([0-9a-f-]{36})"/i,
  ];
  for (const re of patterns) {
    const m = text.match(re);
    if (m?.[1]) return m[1];
  }
  return null;
}

/** @param {unknown} rows */
export function d1DatabaseIdFromListJson(rows, databaseName) {
  if (!Array.isArray(rows)) return null;
  const row = rows.find((r) => r && typeof r === "object" && r.name === databaseName);
  const id = row?.uuid;
  return typeof id === "string" && /^[0-9a-f-]{36}$/i.test(id) ? id : null;
}
