import type { AssetRecord } from "@/src/types/project";

export type AssetRef = {
  id?: string;
  path: string;
  kind?: "image" | "video" | "font" | "data" | "other";
};

export type RenderResult = {
  html: string;
  css: string[];
  assets: AssetRef[];
};

export type RendererAssets = Record<string, AssetRecord>;

export type RenderDevice = "desktop" | "mobile";
