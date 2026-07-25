/** Matches server `normalizeSlug` rules in @baser-edge/baser-domain. */
const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export function normalizeSlugInput(raw: string): string {
  return raw
    .normalize("NFC")
    .trim()
    .replace(/^\/+|\/+$/g, "")
    .replace(/[\s\u3000]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "")
    .toLowerCase();
}

/** Shown next to slug fields; keep in sync with server `normalizeSlug`. */
export const SLUG_FIELD_HINT =
  "英小文字・数字・ハイフンのみ（例: news, my-post）。先頭・末尾のハイフンは自動で除かれます。タイトルは日本語でも構いません。";

export function validateSlugInput(raw: string): string | null {
  const slug = normalizeSlugInput(raw);
  if (!slug) return "URLスラッグを入力してください。";
  if (slug.length > 160) return "URLスラッグは160文字以内にしてください。";
  if (!SLUG_PATTERN.test(slug)) {
    return "URLスラッグは英小文字・数字・ハイフンのみ使えます（例: news, my-post）。先頭・末尾にハイフンだけの入力はできません。日本語は使えません。";
  }
  return null;
}
