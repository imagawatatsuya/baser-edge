import { DomainError, assertDomain, newId, stableStringify } from "@baser-edge/core-types";

export interface BlockVisibility {
  publishAt?: string;
  unpublishAt?: string;
}

export interface BlockProvenance {
  source: "human" | "agent" | "pattern" | "migration";
  sourceId?: string;
}

export interface BlockNode {
  id: string;
  type: string;
  componentVersion: number;
  props: Record<string, unknown>;
  slots: Record<string, BlockNode[]>;
  visibility?: BlockVisibility;
  provenance?: BlockProvenance;
}

export interface StructuredDocument {
  formatVersion: 1;
  root: BlockNode;
}

export type BlockOperation =
  | { kind: "insert"; parentId: string; slot: string; index: number; block: BlockNode }
  | { kind: "updateProps"; blockId: string; patch: Record<string, unknown> }
  | { kind: "move"; blockId: string; parentId: string; slot: string; index: number }
  | { kind: "duplicate"; blockId: string; parentId: string; slot: string; index: number }
  | { kind: "remove"; blockId: string };

export interface ComponentDefinition {
  type: string;
  version: number;
  title: string;
  allowedSlots: Readonly<Record<string, readonly string[] | "*">>;
  validateProps(props: Record<string, unknown>): string[];
}

export class ComponentRegistry {
  readonly #definitions = new Map<string, ComponentDefinition>();

  register(definition: ComponentDefinition): void {
    this.#definitions.set(key(definition.type, definition.version), definition);
  }

  get(type: string, version: number): ComponentDefinition | undefined {
    return this.#definitions.get(key(type, version));
  }

  has(type: string, version: number): boolean {
    return this.#definitions.has(key(type, version));
  }

  list(): ComponentDefinition[] {
    return [...this.#definitions.values()];
  }
}

function key(type: string, version: number): string {
  return `${type}@${version}`;
}

export interface DocumentValidationResult {
  valid: boolean;
  errors: string[];
  unknownComponents: Array<{ id: string; type: string; version: number }>;
}

export function validateDocument(document: StructuredDocument, registry: ComponentRegistry): DocumentValidationResult {
  const errors: string[] = [];
  const unknownComponents: Array<{ id: string; type: string; version: number }> = [];
  const ids = new Set<string>();

  if (document.formatVersion !== 1) errors.push(`Unsupported document format: ${document.formatVersion}`);
  walk(document.root, undefined, undefined, (block, parent, slot) => {
    if (ids.has(block.id)) errors.push(`Duplicate block id: ${block.id}`);
    ids.add(block.id);
    if (!block.id.trim()) errors.push("Block id is empty");
    if (!Number.isInteger(block.componentVersion) || block.componentVersion < 1) {
      errors.push(`Invalid component version on ${block.id}`);
    }

    const definition = registry.get(block.type, block.componentVersion);
    if (!definition) {
      unknownComponents.push({ id: block.id, type: block.type, version: block.componentVersion });
      return;
    }
    errors.push(...definition.validateProps(block.props).map((message) => `${block.id}: ${message}`));

    if (parent && slot) {
      const parentDefinition = registry.get(parent.type, parent.componentVersion);
      const allowed = parentDefinition?.allowedSlots[slot];
      if (allowed && allowed !== "*" && !allowed.includes(block.type)) {
        errors.push(`${block.id}: component ${block.type} is not allowed in ${parent.type}.${slot}`);
      }
    }
  });

  return { valid: errors.length === 0, errors, unknownComponents };
}

export function applyOperations(
  source: StructuredDocument,
  operations: readonly BlockOperation[],
  registry: ComponentRegistry,
): StructuredDocument {
  const document = structuredClone(source);
  for (const operation of operations) applyOperation(document, operation);
  const validation = validateDocument(document, registry);
  if (!validation.valid) {
    throw new DomainError("INVALID_DOCUMENT", "Document operations produced an invalid document", 422, {
      errors: validation.errors,
    });
  }
  return document;
}

export function applyOperation(document: StructuredDocument, operation: BlockOperation): void {
  switch (operation.kind) {
    case "insert": {
      assertDomain(!findBlock(document.root, operation.block.id), "BLOCK_ID_EXISTS", `Block ${operation.block.id} already exists`, 409);
      const parent = requireBlock(document.root, operation.parentId);
      const target = parent.slots[operation.slot] ?? (parent.slots[operation.slot] = []);
      target.splice(clampIndex(operation.index, target.length), 0, structuredClone(operation.block));
      return;
    }
    case "updateProps": {
      const block = requireBlock(document.root, operation.blockId);
      block.props = { ...block.props, ...structuredClone(operation.patch) };
      return;
    }
    case "remove": {
      assertDomain(operation.blockId !== document.root.id, "CANNOT_REMOVE_ROOT", "The document root cannot be removed", 422);
      const removed = detachBlock(document.root, operation.blockId);
      assertDomain(removed, "BLOCK_NOT_FOUND", `Block ${operation.blockId} was not found`, 404);
      return;
    }
    case "move": {
      assertDomain(operation.blockId !== document.root.id, "CANNOT_MOVE_ROOT", "The document root cannot be moved", 422);
      const targetParent = requireBlock(document.root, operation.parentId);
      assertDomain(!containsBlock(requireBlock(document.root, operation.blockId), targetParent.id), "BLOCK_CYCLE", "A block cannot be moved into its descendant", 422);
      const block = detachBlock(document.root, operation.blockId);
      assertDomain(block, "BLOCK_NOT_FOUND", `Block ${operation.blockId} was not found`, 404);
      const target = targetParent.slots[operation.slot] ?? (targetParent.slots[operation.slot] = []);
      target.splice(clampIndex(operation.index, target.length), 0, block);
      return;
    }
    case "duplicate": {
      const source = requireBlock(document.root, operation.blockId);
      const parent = requireBlock(document.root, operation.parentId);
      const copy = cloneWithNewIds(source);
      const target = parent.slots[operation.slot] ?? (parent.slots[operation.slot] = []);
      target.splice(clampIndex(operation.index, target.length), 0, copy);
      return;
    }
  }
}

function clampIndex(index: number, length: number): number {
  assertDomain(Number.isInteger(index), "INVALID_INDEX", "Block index must be an integer", 422);
  return Math.max(0, Math.min(index, length));
}

function cloneWithNewIds(block: BlockNode): BlockNode {
  const cloned = structuredClone(block);
  cloned.id = newId("content").replace("cnt_", "blk_");
  cloned.slots = Object.fromEntries(
    Object.entries(cloned.slots).map(([slot, children]) => [slot, children.map(cloneWithNewIds)]),
  );
  return cloned;
}

function containsBlock(root: BlockNode, blockId: string): boolean {
  return Boolean(findBlock(root, blockId));
}

function requireBlock(root: BlockNode, blockId: string): BlockNode {
  const block = findBlock(root, blockId);
  assertDomain(block, "BLOCK_NOT_FOUND", `Block ${blockId} was not found`, 404);
  return block;
}

export function findBlock(root: BlockNode, blockId: string): BlockNode | undefined {
  if (root.id === blockId) return root;
  for (const children of Object.values(root.slots)) {
    for (const child of children) {
      const found = findBlock(child, blockId);
      if (found) return found;
    }
  }
  return undefined;
}

function detachBlock(root: BlockNode, blockId: string): BlockNode | undefined {
  for (const children of Object.values(root.slots)) {
    const index = children.findIndex((child) => child.id === blockId);
    if (index >= 0) return children.splice(index, 1)[0];
    for (const child of children) {
      const found = detachBlock(child, blockId);
      if (found) return found;
    }
  }
  return undefined;
}

function walk(
  block: BlockNode,
  parent: BlockNode | undefined,
  slot: string | undefined,
  callback: (block: BlockNode, parent: BlockNode | undefined, slot: string | undefined) => void,
): void {
  callback(block, parent, slot);
  for (const [slotName, children] of Object.entries(block.slots)) {
    for (const child of children) walk(child, block, slotName, callback);
  }
}

interface BlockLocation {
  parentId?: string;
  slot?: string;
  index: number;
  block: BlockNode;
}

function indexDocument(document: StructuredDocument): Map<string, BlockLocation> {
  const result = new Map<string, BlockLocation>();
  const visit = (block: BlockNode, parentId: string | undefined, slot: string | undefined, index: number): void => {
    const location: BlockLocation = { index, block };
    if (parentId !== undefined) location.parentId = parentId;
    if (slot !== undefined) location.slot = slot;
    result.set(block.id, location);
    for (const [slotName, children] of Object.entries(block.slots)) {
      children.forEach((child, childIndex) => visit(child, block.id, slotName, childIndex));
    }
  };
  visit(document.root, undefined, undefined, 0);
  return result;
}

export interface DocumentDiff {
  added: string[];
  removed: string[];
  moved: Array<{ id: string; from: string; to: string }>;
  updated: Array<{ id: string; changed: Array<"props" | "visibility" | "componentVersion"> }>;
}

export function diffDocuments(before: StructuredDocument, after: StructuredDocument): DocumentDiff {
  const oldIndex = indexDocument(before);
  const newIndex = indexDocument(after);
  const added = [...newIndex.keys()].filter((id) => !oldIndex.has(id));
  const removed = [...oldIndex.keys()].filter((id) => !newIndex.has(id));
  const moved: DocumentDiff["moved"] = [];
  const updated: DocumentDiff["updated"] = [];

  for (const [id, oldLocation] of oldIndex) {
    const newLocation = newIndex.get(id);
    if (!newLocation) continue;
    const oldPosition = `${oldLocation.parentId ?? "root"}/${oldLocation.slot ?? "root"}/${oldLocation.index}`;
    const newPosition = `${newLocation.parentId ?? "root"}/${newLocation.slot ?? "root"}/${newLocation.index}`;
    if (oldPosition !== newPosition) moved.push({ id, from: oldPosition, to: newPosition });

    const changed: Array<"props" | "visibility" | "componentVersion"> = [];
    if (stableStringify(oldLocation.block.props) !== stableStringify(newLocation.block.props)) changed.push("props");
    if (stableStringify(oldLocation.block.visibility ?? null) !== stableStringify(newLocation.block.visibility ?? null)) changed.push("visibility");
    if (oldLocation.block.componentVersion !== newLocation.block.componentVersion) changed.push("componentVersion");
    if (changed.length) updated.push({ id, changed });
  }

  return { added, removed, moved, updated };
}

export function createEmptyDocument(): StructuredDocument {
  return {
    formatVersion: 1,
    root: {
      id: "root",
      type: "page",
      componentVersion: 1,
      props: {},
      slots: { body: [] },
    },
  };
}

export function createBlock(type: string, props: Record<string, unknown> = {}, slots: Record<string, BlockNode[]> = {}): BlockNode {
  return {
    id: newId("content").replace("cnt_", "blk_"),
    type,
    componentVersion: 1,
    props: structuredClone(props),
    slots: structuredClone(slots),
  };
}

function requireString(props: Record<string, unknown>, keyName: string): string[] {
  return typeof props[keyName] === "string" ? [] : [`${keyName} must be a string`];
}

function optionalString(props: Record<string, unknown>, keyName: string): string[] {
  const value = props[keyName];
  return value === undefined || typeof value === "string" ? [] : [`${keyName} must be a string`];
}

function definition(
  type: string,
  title: string,
  validator: (props: Record<string, unknown>) => string[],
  allowedSlots: Readonly<Record<string, readonly string[] | "*">> = {},
): ComponentDefinition {
  return { type, version: 1, title, allowedSlots, validateProps: validator };
}

export function createDefaultComponentRegistry(): ComponentRegistry {
  const registry = new ComponentRegistry();
  registry.register(definition("page", "Page", () => [], { body: "*" }));
  registry.register(definition("heading", "Heading", (props) => {
    const errors = requireString(props, "text");
    const level = props.level;
    if (![1, 2, 3, 4, 5, 6].includes(level as number)) errors.push("level must be between 1 and 6");
    return errors;
  }));
  registry.register(definition("richText", "Rich Text", (props) => Array.isArray(props.paragraphs) && props.paragraphs.every((v) => typeof v === "string") ? [] : ["paragraphs must be an array of strings"]));
  registry.register(definition("image", "Image", (props) => [...requireString(props, "assetId"), ...optionalString(props, "alt")]));
  registry.register(definition("imageText", "Image and Text", (props) => [...requireString(props, "assetId"), ...requireString(props, "text"), ...optionalString(props, "alt")]));
  registry.register(definition("gallery", "Gallery", (props) => Array.isArray(props.assetIds) && props.assetIds.every((v) => typeof v === "string") ? [] : ["assetIds must be an array of strings"]));
  registry.register(definition("callToAction", "Call to Action", (props) => [...requireString(props, "label"), ...requireString(props, "targetContentId")]));
  registry.register(definition("table", "Table", (props) => Array.isArray(props.rows) ? [] : ["rows must be an array"]));
  registry.register(definition("fileDownload", "File Download", (props) => [...requireString(props, "assetId"), ...requireString(props, "label")]));
  registry.register(definition("safeEmbed", "Safe Embed", (props) => [...requireString(props, "provider"), ...requireString(props, "url")]));
  registry.register(definition("divider", "Divider", () => []));
  return registry;
}

export const BUILTIN_STARTER_HOME_HERO_ASSET_ID = "builtin:starter-home-hero";

export function isEmbeddedBuiltinAssetId(assetId: string): boolean {
  return assetId === BUILTIN_STARTER_HOME_HERO_ASSET_ID;
}

export interface DocumentAssetReference {
  assetId: string;
  blockId: string;
  fieldPath: string;
  usage: "image" | "gallery" | "download";
}

export function collectAssetReferences(document: StructuredDocument): DocumentAssetReference[] {
  const references: DocumentAssetReference[] = [];
  walk(document.root, undefined, undefined, (block) => {
    if (block.type === "image" || block.type === "imageText") {
      const assetId = block.props.assetId;
      if (typeof assetId === "string" && assetId.length > 0 && !isEmbeddedBuiltinAssetId(assetId)) {
        references.push({ assetId, blockId: block.id, fieldPath: "props.assetId", usage: "image" });
      }
    } else if (block.type === "gallery") {
      const assetIds = block.props.assetIds;
      if (Array.isArray(assetIds)) assetIds.forEach((assetId, index) => {
        if (typeof assetId === "string" && assetId.length > 0) references.push({ assetId, blockId: block.id, fieldPath: `props.assetIds[${index}]`, usage: "gallery" });
      });
    } else if (block.type === "fileDownload") {
      const assetId = block.props.assetId;
      if (typeof assetId === "string" && assetId.length > 0 && !isEmbeddedBuiltinAssetId(assetId)) {
        references.push({ assetId, blockId: block.id, fieldPath: "props.assetId", usage: "download" });
      }
    }
  });
  return references;
}
