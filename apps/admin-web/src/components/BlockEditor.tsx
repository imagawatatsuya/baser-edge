import type { BodyBlock } from "../../lib/blocks";
import { AssetPreviewImage } from "./AssetThumbnail";
import { Button } from "./ui/Button";
import { Field } from "./ui/Field";

export function BlockEditor({
  blocks,
  onChange,
  onPickImage,
}: {
  blocks: BodyBlock[];
  onChange: (blocks: BodyBlock[]) => void;
  onPickImage: (insertIndex: number) => void;
}) {
  function updateBlock(index: number, next: BodyBlock) {
    const copy = [...blocks];
    copy[index] = next;
    onChange(copy);
  }

  function removeBlock(index: number) {
    onChange(blocks.filter((_, i) => i !== index));
  }

  function addParagraph() {
    onChange([...blocks, { id: `para-${Date.now()}`, kind: "paragraph", text: "" }]);
  }

  return (
    <div className="block-editor">
      {blocks.map((block, index) => (
        <div key={block.id} className="block-editor-row">
          {block.kind === "paragraph" ? (
            <Field label={`段落 ${index + 1}`} htmlFor={`block-${block.id}`}>
              <textarea
                id={`block-${block.id}`}
                value={block.text}
                rows={4}
                onChange={(e) => updateBlock(index, { ...block, text: e.target.value })}
              />
            </Field>
          ) : null}
          {block.kind === "heading" ? (
            <Field label={`見出し (H${block.level})`} htmlFor={`block-${block.id}`}>
              <input
                id={`block-${block.id}`}
                value={block.text}
                onChange={(e) => updateBlock(index, { ...block, text: e.target.value })}
              />
            </Field>
          ) : null}
          {block.kind === "image" ? (
            <Field label="画像" hint={`Asset ID: ${block.assetId}`}>
              <AssetPreviewImage assetId={block.assetId} alt={block.alt} className="media-preview block-editor-image" />
              <input
                value={block.alt}
                placeholder="代替テキスト"
                onChange={(e) => updateBlock(index, { ...block, alt: e.target.value })}
              />
            </Field>
          ) : null}
          <Button variant="link" className="block-remove" onClick={() => removeBlock(index)}>削除</Button>
        </div>
      ))}
      <div className="toolbar block-editor-actions">
        <Button onClick={addParagraph}>段落を追加</Button>
        <Button onClick={() => onChange([...blocks, { id: `h-${Date.now()}`, kind: "heading", level: 2, text: "" }])}>
          見出しを追加
        </Button>
        <Button onClick={() => onPickImage(blocks.length)}>画像を挿入</Button>
      </div>
    </div>
  );
}
