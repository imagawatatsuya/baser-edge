export const TRIAL_INLINE_MAX_ASSETS = 3 as const;
export const TRIAL_INLINE_MAX_BYTES_PER_OBJECT = 2 * 1024 * 1024;
export const TRIAL_INLINE_CLIENT_MAX_SOURCE_BYTES = 15 * 1024 * 1024;
export const TRIAL_INLINE_MAX_EDGE_PX = 1920;

export const TRIAL_INLINE_IMAGE_MEDIA_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
] as const;

export type TrialInlineImageMediaType = (typeof TRIAL_INLINE_IMAGE_MEDIA_TYPES)[number];

export type TrialInlineMediaPolicy = {
  mode: "trial-inline-d1";
  maxAssets: typeof TRIAL_INLINE_MAX_ASSETS;
  maxBytesPerObject: typeof TRIAL_INLINE_MAX_BYTES_PER_OBJECT;
};

export const TRIAL_INLINE_MEDIA_POLICY: TrialInlineMediaPolicy = {
  mode: "trial-inline-d1",
  maxAssets: TRIAL_INLINE_MAX_ASSETS,
  maxBytesPerObject: TRIAL_INLINE_MAX_BYTES_PER_OBJECT,
};

export function trialInlineImageMediaTypeSet(): ReadonlySet<string> {
  return new Set(TRIAL_INLINE_IMAGE_MEDIA_TYPES);
}
