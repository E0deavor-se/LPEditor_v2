import type {
  CreativeExportFormat,
  CreativeExportResult,
} from "@/src/features/creative/types/export";
import { useCreativeVariantStore } from "@/src/features/creative/stores/useCreativeVariantStore";
import type { CreativeVariantJson } from "@/src/features/creative/types/layer";

const mimeByFormat: Record<CreativeExportFormat, string> = {
  png: "image/png",
  webp: "image/webp",
};

const isValidExportUrlForFormat = (url: string, format: CreativeExportFormat): boolean => {
  const lower = url.toLowerCase();
  const mime = mimeByFormat[format];
  if (lower.startsWith("data:")) {
    return lower.startsWith(`data:${mime}`);
  }
  if (lower.includes(".svg")) {
    return false;
  }
  if (format === "png") {
    return lower.includes(".png") || lower.includes("format=png") || lower.includes("fm=png");
  }
  return lower.includes(".webp") || lower.includes("format=webp") || lower.includes("fm=webp");
};

const loadImage = (url: string): Promise<HTMLImageElement> =>
  new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`Failed to load image: ${url}`));
    img.src = url;
  });

const renderVariantToRasterDataUrl = async (
  variantJson: CreativeVariantJson,
  format: CreativeExportFormat,
): Promise<string> => {
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(variantJson.width));
  canvas.height = Math.max(1, Math.round(variantJson.height));
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    throw new Error("Canvas 2D context is unavailable.");
  }

  ctx.fillStyle = variantJson.background.color || "#ffffff";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  const backgroundUrl = variantJson.background.imageUrl?.trim();
  if (backgroundUrl) {
    try {
      const bg = await loadImage(backgroundUrl);
      ctx.drawImage(bg, 0, 0, canvas.width, canvas.height);
    } catch {
      // Keep solid background when background image is not available.
    }
  }

  const layers = [...variantJson.layers].sort((a, b) => a.zIndex - b.zIndex);
  for (const layer of layers) {
    if (layer.type === "text") {
      const fontWeight = layer.fontWeight ?? 600;
      ctx.fillStyle = layer.color || "#0f172a";
      ctx.font = `${fontWeight} ${Math.max(10, layer.fontSize)}px sans-serif`;
      ctx.textBaseline = "top";
      const lineHeight = Math.max(12, layer.fontSize * 1.15);
      const rawLines = String(layer.text || "").split("\n");
      let y = layer.y;
      for (const line of rawLines) {
        ctx.fillText(line, layer.x, y, layer.width);
        y += lineHeight;
        if (y > layer.y + layer.height) {
          break;
        }
      }
      continue;
    }

    try {
      const img = await loadImage(layer.imageUrl);
      ctx.drawImage(img, layer.x, layer.y, layer.width, layer.height);
    } catch {
      // Skip unavailable external image and continue drawing remaining layers.
    }
  }

  const mime = mimeByFormat[format];
  return canvas.toDataURL(mime, 0.92);
};

const buildMockDataUrl = async (
  variantId: string,
  format: CreativeExportFormat,
): Promise<string> => {
  const state = useCreativeVariantStore.getState();
  const variant = state.variants.find((entry) => entry.id === variantId);
  if (variant) {
    return renderVariantToRasterDataUrl(variant.variantJson, format);
  }

  const fallback: CreativeVariantJson = {
    width: 1200,
    height: 628,
    background: { color: "#0f172a" },
    layers: [
      {
        id: "fallback-title",
        type: "text",
        x: 60,
        y: 150,
        width: 900,
        height: 80,
        zIndex: 2,
        text: "AURBIT Creative",
        color: "#ffffff",
        fontSize: 64,
        fontWeight: 700,
      },
      {
        id: "fallback-subtitle",
        type: "text",
        x: 60,
        y: 260,
        width: 900,
        height: 56,
        zIndex: 2,
        text: `${variantId} ${format.toUpperCase()}`,
        color: "#f97316",
        fontSize: 42,
        fontWeight: 700,
      },
    ],
  };
  return renderVariantToRasterDataUrl(fallback, format);
};

export const exportCreativeVariant = async (
  variantId: string,
  format: CreativeExportFormat,
): Promise<CreativeExportResult> => {
  const expectedMime = mimeByFormat[format];
  try {
    const response = await fetch(`/api/creative/variants/${variantId}/export`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ format }),
    });

    if (response.ok) {
      const data = (await response.json()) as { downloadUrl: string };
      if (typeof data.downloadUrl === "string" && isValidExportUrlForFormat(data.downloadUrl, format)) {
        if (process.env.NODE_ENV === "development") {
          console.info("[creative-export] api", {
            variantId,
            format,
            mime: expectedMime,
            urlSample: data.downloadUrl.slice(0, 48),
          });
        }
        return {
          format,
          downloadUrl: data.downloadUrl,
        };
      }
      if (process.env.NODE_ENV === "development") {
        console.warn("[creative-export] invalid API export format, fallback to raster", {
          variantId,
          format,
          urlSample: String(data.downloadUrl ?? "").slice(0, 48),
        });
      }
    }
  } catch {
    // Use client-only mock image URL fallback.
  }

  const downloadUrl = await buildMockDataUrl(variantId, format);
  if (process.env.NODE_ENV === "development") {
    console.info("[creative-export] fallback-raster", {
      variantId,
      format,
      mime: expectedMime,
      urlSample: downloadUrl.slice(0, 48),
    });
  }

  return {
    format,
    downloadUrl,
  };
};
