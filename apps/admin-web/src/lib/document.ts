import type { DocumentBlock, StructuredDocument } from "../api/types";

export function simpleDocument(title: string, body: string): StructuredDocument {
  return {
    formatVersion: 1,
    root: {
      id: "root",
      type: "page",
      componentVersion: 1,
      props: {},
      slots: {
        body: [
          {
            id: "heading",
            type: "heading",
            componentVersion: 1,
            props: { level: 1, text: title },
            slots: {},
          },
          {
            id: "body",
            type: "richText",
            componentVersion: 1,
            props: { paragraphs: body ? [body] : [""] },
            slots: {},
          },
        ],
      },
    },
  };
}

export function readTitleAndBody(document: StructuredDocument): { title: string; body: string } {
  const blocks = document.root.slots.body ?? [];
  const heading = blocks.find((b) => b.type === "heading");
  const rich = blocks.find((b) => b.type === "richText");
  const title = typeof heading?.props.text === "string" ? heading.props.text : "";
  const paragraphs = Array.isArray(rich?.props.paragraphs) ? rich.props.paragraphs as string[] : [];
  return { title, body: paragraphs.join("\n\n") };
}

export function updateDocument(document: StructuredDocument, title: string, body: string): StructuredDocument {
  const blocks: DocumentBlock[] = [...(document.root.slots.body ?? [])];
  const headingIdx = blocks.findIndex((b) => b.type === "heading");
  const richIdx = blocks.findIndex((b) => b.type === "richText");
  if (headingIdx >= 0) {
    blocks[headingIdx] = { ...blocks[headingIdx], props: { ...blocks[headingIdx].props, text: title } };
  } else {
    blocks.unshift({
      id: "heading",
      type: "heading",
      componentVersion: 1,
      props: { level: 1, text: title },
      slots: {},
    });
  }
  const paragraphs = body.split(/\n\n+/).filter((p) => p.length > 0);
  const richProps = { paragraphs: paragraphs.length ? paragraphs : [""] };
  if (richIdx >= 0) {
    blocks[richIdx] = { ...blocks[richIdx], props: { ...blocks[richIdx].props, ...richProps } };
  } else {
    blocks.push({
      id: "body",
      type: "richText",
      componentVersion: 1,
      props: richProps,
      slots: {},
    });
  }
  return {
    ...document,
    root: { ...document.root, slots: { body: blocks } },
  };
}

export function displayTitle(entry: { snapshot: { workingRevision?: { fields?: Record<string, unknown> } | null; node: { slug: string } } }) {
  const title = entry.snapshot.workingRevision?.fields?.title;
  if (typeof title === "string" && title) return title;
  return entry.snapshot.node.slug;
}
