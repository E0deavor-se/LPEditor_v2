import { useEditorStore } from "@/src/store/editorStore";
import { getDb } from "@/src/db/db";
import { serializeProjectForPersistence } from "@/src/lib/editorProject";
import type { CreativeVariant } from "@/src/features/creative/types/variant";

export const publishVariantToLp = async (
  variantId: string,
): Promise<{ success: boolean; imageUrl?: string }> => {
  try {
    const response = await fetch(`/api/creative/variants/${variantId}/publish-to-lp`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
    });
    if (response.ok) {
      const data = (await response.json()) as { success?: boolean; imageUrl?: string };
      return {
        success: data.success ?? true,
        imageUrl: data.imageUrl,
      };
    }
  } catch {
    // Fall back to client-side apply.
  }

  return { success: true };
};

export const applyVariantToLpHero = (
  variant: CreativeVariant,
  imageUrl: string,
  sectionId?: string | null,
): { applied: boolean; sectionId?: string } => {
  const {
    getActiveLayoutDocument,
    updateSectionData,
    addAsset,
    setSelectedSection,
    selectedSectionId,
    getProject,
  } = useEditorStore.getState();
  const sections = getActiveLayoutDocument().sections;
  const heroSection =
    (sectionId
      ? sections.find((section) => section.id === sectionId && section.type === "heroImage")
      : undefined) ??
    (selectedSectionId
      ? sections.find(
          (section) => section.id === selectedSectionId && section.type === "heroImage",
        )
      : undefined) ??
    sections.find((section) => section.type === "heroImage");

  if (!heroSection) {
    if (process.env.NODE_ENV === "development") {
      console.warn("[creative-apply] no hero section found", {
        requestedSectionId: sectionId ?? null,
        selectedSectionId: selectedSectionId ?? null,
        availableSectionTypes: sections.map((section) => section.type),
      });
    }
    return { applied: false };
  }

  const mimeMatch = imageUrl.match(/^data:(image\/[a-zA-Z0-9+.-]+);/);
  const mime = mimeMatch?.[1] ?? (imageUrl.includes(".webp") ? "image/webp" : "image/png");
  const ext = mime === "image/webp" ? "webp" : "png";
  const assetIdPc = addAsset({
    filename: `ai-hero-pc.${ext}`,
    data: imageUrl,
  });
  const assetIdSp = addAsset({
    filename: `ai-hero-sp.${ext}`,
    data: imageUrl,
  });

  const sectionData = (heroSection.data ?? {}) as Record<string, unknown>;
  const existingSlidesPc = Array.isArray(sectionData.heroSlidesPc)
    ? (sectionData.heroSlidesPc as Array<Record<string, unknown>>)
    : [];
  const existingSlidesSp = Array.isArray(sectionData.heroSlidesSp)
    ? (sectionData.heroSlidesSp as Array<Record<string, unknown>>)
    : [];
  const baseAlt = `${variant.strategyLabel} creative`;

  const heroSlidesPc =
    existingSlidesPc.length > 0
      ? existingSlidesPc.map((slide, index) =>
          index === 0
            ? {
                ...slide,
                assetId: assetIdPc,
                src: imageUrl,
                alt: typeof slide.alt === "string" && slide.alt.trim() ? slide.alt : baseAlt,
              }
            : slide,
        )
      : [];

  const heroSlidesSp =
    existingSlidesSp.length > 0
      ? existingSlidesSp.map((slide, index) =>
          index === 0
            ? {
                ...slide,
                assetId: assetIdSp,
                src: imageUrl,
                alt: typeof slide.alt === "string" && slide.alt.trim() ? slide.alt : baseAlt,
              }
            : slide,
        )
      : [];

  const width = Math.max(1, Math.round(variant.variantJson.width || 1200));
  const height = Math.max(1, Math.round(variant.variantJson.height || 628));
  const nextPatch: Record<string, unknown> = {
    // Primary keys consumed by renderers/export and MainVisualEditor.
    imageAssetId: assetIdPc,
    imageAssetIdPc: assetIdPc,
    imageAssetIdSp: assetIdSp,
    imageUrl,
    imageUrlSp: imageUrl,
    heroPc: { assetId: assetIdPc, w: width, h: height },
    heroSp: { assetId: assetIdSp, w: width, h: height },
    alt: `${variant.strategyLabel} creative`,
    altText: `${variant.strategyLabel} creative`,
  };

  if (existingSlidesPc.length > 0) {
    nextPatch.heroSlidesPc = heroSlidesPc;
  }
  if (existingSlidesSp.length > 0) {
    nextPatch.heroSlidesSp = heroSlidesSp;
  }

  updateSectionData(heroSection.id, nextPatch);

  setSelectedSection(heroSection.id);

  // Persist immediately so /editor reload does not restore stale snapshot from IndexedDB.
  void (async () => {
    try {
      const db = await getDb();
      const normalizedProject = serializeProjectForPersistence(getProject());
      await db.projects.put({
        id: "project_default",
        data: normalizedProject,
        updatedAt: Date.now(),
      });
      if (process.env.NODE_ENV === "development") {
        console.info("[creative-apply] project persisted", {
          targetSectionId: heroSection.id,
          updatedAt: normalizedProject.meta.updatedAt,
        });
      }
    } catch (error) {
      if (process.env.NODE_ENV === "development") {
        console.warn("[creative-apply] persist failed", {
          targetSectionId: heroSection.id,
          message: error instanceof Error ? error.message : String(error),
        });
      }
    }
  })();

  if (process.env.NODE_ENV === "development") {
    console.info("[creative-apply] hero updated", {
      formatMime: mime,
      extension: ext,
      targetSectionId: heroSection.id,
      targetSectionType: heroSection.type,
      usedSectionIdHint: sectionId ?? null,
      exportedPngUrlSample: imageUrl.slice(0, 48),
      updatedKeys: [
        "imageAssetId",
        "imageAssetIdPc",
        "imageAssetIdSp",
        "imageUrl",
        "imageUrlSp",
        "heroPc",
        "heroSp",
        "alt",
        "altText",
      ],
      finalMergedData: {
        imageAssetIdPc: String(nextPatch.imageAssetIdPc ?? ""),
        imageAssetIdSp: String(nextPatch.imageAssetIdSp ?? ""),
        imageUrl: String(nextPatch.imageUrl ?? ""),
        imageUrlSp: String(nextPatch.imageUrlSp ?? ""),
        hasHeroSlidesPc: Array.isArray(nextPatch.heroSlidesPc),
        hasHeroSlidesSp: Array.isArray(nextPatch.heroSlidesSp),
      },
    });
  }

  return { applied: true, sectionId: heroSection.id };
};
