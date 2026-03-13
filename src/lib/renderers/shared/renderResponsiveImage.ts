import type { RendererAssets, RenderDevice } from "@/src/lib/renderers/shared/types";

const str = (value: unknown) =>
  typeof value === "string" ? value : value == null ? "" : String(value);

export const resolveAssetUrl = (
  assets: RendererAssets,
  assetId?: string,
  fallback?: string
) => {
  const id = str(assetId);
  if (id && assets[id]?.data) {
    return assets[id].data;
  }
  return str(fallback);
};

export const resolveHeroImageWithFallback = (
  data: Record<string, unknown>,
  assets: RendererAssets,
  device: RenderDevice
) => {
  const isMobile = device === "mobile";

  const readSlides = (value: unknown) =>
    Array.isArray(value)
      ? value.filter((entry): entry is Record<string, unknown> =>
          Boolean(entry && typeof entry === "object")
        )
      : [];

  const slideUrl = (slide?: Record<string, unknown>) => {
    if (!slide) {
      return "";
    }
    const slideAssetId = str(slide.assetId);
    return resolveAssetUrl(assets, slideAssetId, str(slide.src));
  };

  const slidesPc = readSlides(data.heroSlidesPc);
  const slidesSp = readSlides(data.heroSlidesSp);
  const primarySlides = isMobile ? slidesSp : slidesPc;
  const fallbackSlides = isMobile ? slidesPc : slidesSp;
  const primarySlideUrl = slideUrl(primarySlides[0]);
  const fallbackSlideUrl = slideUrl(fallbackSlides[0]);

  const pcId = str(data.imageAssetIdPc || data.imageAssetId);
  const spId = str(data.imageAssetIdSp);
  const pcUrl = resolveAssetUrl(assets, pcId, str(data.imageUrl));
  const spUrl = resolveAssetUrl(assets, spId, str(data.imageUrlSp));
  const url =
    primarySlideUrl || fallbackSlideUrl || (isMobile ? spUrl || pcUrl : pcUrl || spUrl);
  const assetId = isMobile ? spId || pcId : pcId || spId;
  return { url, assetId };
};
