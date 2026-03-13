import { createDefaultCanvasDocument } from "@/src/types/canvas";
import type { CanvasDocument } from "@/src/types/canvas";
import type { LPDocument } from "@/src/types/project";

export const createEmptyLPDocument = (): LPDocument => ({
  settings: {},
  sections: [],
});

export const createEmptyCanvasDocument = (): CanvasDocument =>
  createDefaultCanvasDocument();

// TODO: Implement LP -> Canvas conversion strategy.
export const convertLpDocumentToCanvasDocument = (
  _lpDocument: LPDocument
): CanvasDocument => {
  throw new Error("Not implemented");
};

// TODO: Implement Canvas -> LP conversion strategy.
export const convertCanvasDocumentToLpDocument = (
  _canvasDocument: CanvasDocument
): LPDocument => {
  throw new Error("Not implemented");
};

// Backward-compatible aliases for future call sites.
export const convertLpToCanvas = convertLpDocumentToCanvasDocument;
export const convertCanvasToLp = convertCanvasDocumentToLpDocument;
