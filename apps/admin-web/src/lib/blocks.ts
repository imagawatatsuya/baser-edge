import type { DocumentBlock, StructuredDocument } from "../api/types";

export type BodyBlock =
  | { id: string; kind: "heading"; level: number; text: string }
  | { id: string; kind: "paragraph"; text: string }
  | { id: string; kind: "image"; assetId: string; alt: string; decorative: boolean };

function newBlockId(prefix: string) {
  return `${prefix}-${Math.random().toString(36).slice(2, 9)}`;
}

export function readTitleAndBlocks(document: StructuredDocument): { title: string; blocks: BodyBlock[] } {
  const slots = document.root.slots.body ?? [];
  let title = "";
  const blocks: BodyBlock[] = [];
  for (const block of slots) {
    if (block.type === "heading") {
      const level = typeof block.props.level === "number" ? block.props.level : 1;
      const text = typeof block.props.text === "string" ? block.props.text : "";
      if (level === 1 && !title) {
        title = text;
        continue;
      }
      blocks.push({ id: block.id, kind: "heading", level, text });
    } else if (block.type === "richText") {
      const paragraphs = Array.isArray(block.props.paragraphs) ? (block.props.paragraphs as string[]) : [""];
      paragraphs.forEach((text, index) => {
        blocks.push({ id: `${block.id}-p${index}`, kind: "paragraph", text });
      });
    } else if (block.type === "image") {
      const assetId = typeof block.props.assetId === "string" ? block.props.assetId : "";
      if (assetId) {
        blocks.push({
          id: block.id,
          kind: "image",
          assetId,
          alt: typeof block.props.alt === "string" ? block.props.alt : "",
          decorative: block.componentVersion >= 2 ? block.props.decorative === true : false,
        });
      }
    }
  }
  if (!blocks.length) {
    blocks.push({ id: newBlockId("para"), kind: "paragraph", text: "" });
  }
  return { title, blocks };
}

export function writeTitleAndBlocks(document: StructuredDocument, title: string, blocks: BodyBlock[]): StructuredDocument {
  const body: DocumentBlock[] = [
    {
      id: "heading",
      type: "heading",
      componentVersion: 1,
      props: { level: 1, text: title },
      slots: {},
    },
  ];
  for (const block of blocks) {
    if (block.kind === "heading") {
      body.push({
        id: block.id,
        type: "heading",
        componentVersion: 1,
        props: { level: block.level, text: block.text },
        slots: {},
      });
    } else if (block.kind === "paragraph") {
      body.push({
        id: block.id.split("-p")[0] ?? block.id,
        type: "richText",
        componentVersion: 1,
        props: { paragraphs: [block.text] },
        slots: {},
      });
    } else if (block.kind === "image" && block.assetId) {
      body.push({
        id: block.id,
        type: "image",
        componentVersion: 2,
        props: {
          assetId: block.assetId,
          decorative: block.decorative,
          ...(block.decorative ? {} : { alt: block.alt.trim() }),
        },
        slots: {},
      });
    }
  }
  return {
    ...document,
    root: { ...document.root, slots: { body } },
  };
}

export function isEditorDirty(document: StructuredDocument, title: string, blocks: BodyBlock[]): boolean {
  const parsed = readTitleAndBlocks(document);
  if (title !== parsed.title) return true;
  return JSON.stringify(blocks) !== JSON.stringify(parsed.blocks);
}

/** Client-side gate mirroring structured-document v2 image a11y rules. */
export function validateEditorBlocks(blocks: BodyBlock[]): string | null {
  for (const block of blocks) {
    if (block.kind !== "image") continue;
    if (block.decorative) continue;
    if (!block.alt.trim()) {
      return "画像の代替テキストを入力するか、「装飾画像」にチェックを入れてください。";
    }
  }
  return null;
}
