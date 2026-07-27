function requireString(props: Record<string, unknown>, keyName: string): string[] {
  return typeof props[keyName] === "string" ? [] : [`${keyName} must be a string`];
}

function requireTrimmedString(props: Record<string, unknown>, keyName: string): string[] {
  const value = props[keyName];
  if (typeof value !== "string" || value.trim().length === 0) return [`${keyName} must be a non-empty string`];
  return [];
}

function optionalString(props: Record<string, unknown>, keyName: string): string[] {
  const value = props[keyName];
  return value === undefined || typeof value === "string" ? [] : [`${keyName} must be a string`];
}

function requireBoolean(props: Record<string, unknown>, keyName: string): string[] {
  return typeof props[keyName] === "boolean" ? [] : [`${keyName} must be a boolean`];
}

function validateAccessibleImageProps(props: Record<string, unknown>): string[] {
  const errors = [...requireString(props, "assetId"), ...requireBoolean(props, "decorative")];
  const decorative = props.decorative === true;
  if (!decorative) errors.push(...requireTrimmedString(props, "alt"));
  else errors.push(...optionalString(props, "alt"));
  errors.push(...optionalString(props, "caption"));
  return errors;
}

export function validateImageV2Props(props: Record<string, unknown>): string[] {
  return validateAccessibleImageProps(props);
}

export function validateImageTextV2Props(props: Record<string, unknown>): string[] {
  const errors = [...requireString(props, "assetId"), ...requireString(props, "text"), ...requireBoolean(props, "decorative")];
  const decorative = props.decorative === true;
  if (!decorative) errors.push(...requireTrimmedString(props, "alt"));
  else errors.push(...optionalString(props, "alt"));
  return errors;
}

export function validateGalleryV2Props(props: Record<string, unknown>): string[] {
  const items = props.items;
  if (!Array.isArray(items) || items.length === 0) return ["items must be a non-empty array"];
  const errors: string[] = [];
  items.forEach((item, index) => {
    if (!item || typeof item !== "object") {
      errors.push(`items[${index}] must be an object`);
      return;
    }
    validateAccessibleImageProps(item as Record<string, unknown>).forEach((message) => {
      errors.push(`items[${index}]: ${message}`);
    });
  });
  return errors;
}

export function validateTableV2Props(props: Record<string, unknown>): string[] {
  const errors = [...requireTrimmedString(props, "caption")];
  const headers = props.columnHeaders;
  if (!Array.isArray(headers) || headers.length === 0 || !headers.every((value) => typeof value === "string" && value.trim().length > 0)) {
    errors.push("columnHeaders must be a non-empty array of non-empty strings");
  }
  const rows = props.rows;
  if (!Array.isArray(rows)) {
    errors.push("rows must be an array");
    return errors;
  }
  const rowHeaderColumn = props.rowHeaderColumn === true;
  const expectedCells = (Array.isArray(headers) ? headers.length : 0) + (rowHeaderColumn ? 1 : 0);
  rows.forEach((row, index) => {
    if (!Array.isArray(row) || row.length !== expectedCells || !row.every((cell) => typeof cell === "string")) {
      errors.push(`rows[${index}] must be an array of ${expectedCells} strings`);
    }
  });
  if (props.rowHeaderColumn !== undefined && typeof props.rowHeaderColumn !== "boolean") {
    errors.push("rowHeaderColumn must be a boolean");
  }
  return errors;
}

export function validateSafeEmbedV2Props(props: Record<string, unknown>): string[] {
  return [...requireString(props, "provider"), ...requireString(props, "url"), ...requireTrimmedString(props, "title"), ...optionalString(props, "transcriptUrl")];
}

export const A11Y_V2_COMPONENT_TYPES = new Set(["image", "imageText", "gallery", "table", "safeEmbed"]);

export function defaultComponentVersion(type: string): number {
  return A11Y_V2_COMPONENT_TYPES.has(type) ? 2 : 1;
}
