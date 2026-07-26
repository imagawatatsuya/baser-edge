import {
  BUILTIN_STARTER_HOME_HERO_ASSET_ID,
  createBlock,
  type BlockNode,
} from "@baser-edge/structured-document";

export function buildInitialHomepageBlocks(siteName: string): BlockNode[] {
  const heroImage = createBlock("image", {
    assetId: BUILTIN_STARTER_HOME_HERO_ASSET_ID,
    alt: "店内に飾られた花々のサンプル画像",
  });
  heroImage.id = "starter-home-hero";
  return [
    createBlock("heading", { level: 1, text: siteName }),
    createBlock("richText", {
      paragraphs: ["地域に根ざし、一つひとつのご相談に丁寧に向き合います。"],
    }),
    heroImage,
    createBlock("heading", { level: 2, text: "私たちについて" }),
    createBlock("richText", {
      paragraphs: [
        "ここに事業や活動の紹介を書きます。得意なこと、大切にしていること、選ばれる理由を簡潔に伝えましょう。",
      ],
    }),
    createBlock("heading", { level: 2, text: "ご案内" }),
    createBlock("richText", {
      paragraphs: [
        "サービス内容、営業時間、所在地、料金の目安など、お客様が知りたい情報を掲載できます。",
      ],
    }),
    createBlock("heading", { level: 2, text: "お知らせ" }),
    createBlock("richText", {
      paragraphs: ["営業日や新しいサービスなど、最新情報をこのサイトから発信できます。"],
    }),
    createBlock("divider", {}),
    createBlock("heading", { level: 2, text: "このページを編集する" }),
    createBlock("richText", {
      paragraphs: [
        "管理画面の『コンテンツ』からホームを開き、文章と写真をあなたの内容へ置き換えてください。",
      ],
    }),
  ];
}
