/** @param {unknown} error */
export function formatAssetDeleteError(error) {
  if (error && typeof error === "object" && "message" in error) {
    const msg = String(/** @type {{ message: unknown }} */ (error).message);
    if (msg.includes("ASSET_IN_USE") || msg.includes("used by published")) {
      return "公開中のページや記事で使われているため削除できません。先に該当コンテンツを編集するか、公開を取り下げてください。";
    }
    return msg;
  }
  return String(error);
}
