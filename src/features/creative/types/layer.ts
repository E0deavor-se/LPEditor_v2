export type CreativeLayerKind = "text" | "logo" | "image";

export type CreativeLayerBase = {
  id: string;
  type: CreativeLayerKind;
  x: number;
  y: number;
  width: number;
  height: number;
  zIndex: number;
};

export type CreativeTextLayer = CreativeLayerBase & {
  type: "text";
  text: string;
  color: string;
  fontSize: number;
  fontWeight?: number;
};

export type CreativeImageLayer = CreativeLayerBase & {
  type: "logo" | "image";
  imageUrl: string;
};

export type CreativeLayer = CreativeTextLayer | CreativeImageLayer;

export type CreativeBackground = {
  color?: string;
  imageUrl?: string;
};

export type CreativeVariantJson = {
  width: number;
  height: number;
  background: CreativeBackground;
  layers: CreativeLayer[];
};
