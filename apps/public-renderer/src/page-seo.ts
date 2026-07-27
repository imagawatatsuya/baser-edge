import type { ContentRevision } from "@baser-edge/content-kernel";
import type { StructuredDocument } from "@baser-edge/structured-document";
import {
  buildAbsoluteCanonicalUrl,
  descriptionFromDocument,
  trimMetaDescription,
  type PageSeoInput,
} from "@baser-edge/renderer";

export function buildPublicPageSeo(input: {
  origin: string;
  path: string;
  title: string;
  siteName: string;
  locale: string;
  document: StructuredDocument;
  revision?: ContentRevision;
  preview?: boolean;
  openGraphType?: "website" | "article";
}): PageSeoInput {
  const description = trimMetaDescription(
    descriptionFromDocument(input.document) || input.title || input.siteName,
  );
  const canonicalUrl = buildAbsoluteCanonicalUrl(input.origin, input.path);
  const dateIso = input.revision ? new Date(input.revision.createdAt).toISOString() : undefined;
  return {
    description,
    canonicalUrl,
    locale: input.locale,
    ...(input.preview ? { preview: true } : {}),
    ...(input.openGraphType ? { openGraphType: input.openGraphType } : {}),
    ...(dateIso ? { datePublished: dateIso, dateModified: dateIso } : {}),
  };
}
