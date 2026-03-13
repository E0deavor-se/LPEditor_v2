import { exportCanvasHtml } from "@/src/lib/canvas/exportCanvasHtml";
import type { CanvasDocument } from "@/src/types/canvas";
import type { RenderResult } from "@/src/lib/renderers/shared/types";

export const renderCanvasDocument = (
  canvasDocument: CanvasDocument,
  resolveAsset?: (assetId: string) => string
): RenderResult => {
  const rendered = exportCanvasHtml(canvasDocument, { resolveAsset });
  return {
    html: rendered.html,
    css: [rendered.css],
    assets: [],
  };
};
