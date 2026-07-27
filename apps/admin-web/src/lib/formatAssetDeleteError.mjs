/** @param {unknown} error */
export function formatAssetDeleteError(error) {
  if (error && typeof error === "object" && "message" in error) {
    const err = /** @type {{ message: unknown; domainCode?: string; domainDetails?: { references?: Array<{ path?: string }> } }} */ (error);
    const msg = String(err.message);
    const code = err.domainCode ?? (msg.includes("ASSET_IN_USE") ? "ASSET_IN_USE" : "");
    if (code === "ASSET_IN_USE" || msg.includes("ASSET_IN_USE") || msg.includes("used by published")) {
      const paths = Array.isArray(err.domainDetails?.references)
        ? [...new Set(err.domainDetails.references.map((r) => r.path).filter((p) => typeof p === "string" && p.length > 0))]
        : [];
      const where = paths.length ? ` 使用中: ${paths.join("、")}` : "";
      return (
        "この画像は、いまサイトに公開されている版の記事・ページで使われています。"
        + "編集画面で画像を外して「保存」しただけでは公開版は変わりません。"
        + "画像を外した変更を「公開」するか、記事の「公開を取り下げ」してから、メディアを削除してください。"
        + where
      );
    }
    return msg;
  }
  return String(error);
}
