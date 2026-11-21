import registryJson from "../../showcase-data/image-registry.json";
import { z } from "zod";
import { withBasePath, withBasePathSrcSet } from "@/lib/base-path";

/**
 * Photo slots for the showcase.
 * A frame points at a slot slug. New files slot in by editing this registry
 * only: add a slot, then point frames or highlights at it.
 */
const SlotSchema = z.object({
  kind: z.enum(["photo", "placeholder", "empty"]),
  file: z.string(),
  src: z.string(),
  thumb: z.string(),
  width: z.number().int(),
  height: z.number().int(),
  alt: z.object({
    en: z.string(),
    "zh-CN": z.string(),
  }),
  srcSet: z.string().optional(),
});

const RegistrySchema = z.object({
  schema: z.literal("aiglasses.lifelog.showcase.images"),
  version: z.literal(1),
  slots: z.record(z.string(), SlotSchema),
  frames: z.record(z.string(), z.string().nullable()),
  highlights: z.array(z.string()),
});

const registry = RegistrySchema.parse(registryJson);

export type FrameAsset = {
  slot: string;
  src: string;
  thumb: string;
  width: number;
  height: number;
  alt: { en: string; "zh-CN": string };
  srcSet?: string;
};

export function frameAsset(frameId: string | null | undefined): FrameAsset | null {
  if (!frameId) return null;
  const slot = registry.frames[frameId];
  if (!slot) return null;
  const image = registry.slots[slot];
  if (!image) return null;
  return { slot, src: withBasePath(image.src), thumb: withBasePath(image.thumb), width: image.width, height: image.height, alt: image.alt, srcSet: image.srcSet ? withBasePathSrcSet(image.srcSet) : undefined };
}

export function frameSrc(frameId: string | null | undefined, variant: "full" | "thumb" = "full"): string | null {
  const asset = frameAsset(frameId);
  if (!asset) return null;
  return variant === "thumb" ? asset.thumb : asset.src;
}

export function firstFrameInSlot(slot: string): string | null {
  const found = Object.entries(registry.frames).find(([, name]) => name === slot);
  return found?.[0] ?? null;
}

export function highlightSlots(): FrameAsset[] {
  return registry.highlights.flatMap((slot) => {
    const image = registry.slots[slot];
    if (!image) return [];
    return [{ slot, src: withBasePath(image.src), thumb: withBasePath(image.thumb), width: image.width, height: image.height, alt: image.alt, srcSet: image.srcSet ? withBasePathSrcSet(image.srcSet) : undefined }];
  });
}

export function frameIdFromMediaUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  const match = url.match(/frm_[0-9A-Z]{26}/);
  return match?.[0] ?? null;
}
