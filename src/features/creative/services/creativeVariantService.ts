import { getCreativeDocumentInput } from "@/src/features/creative/services/creativeDocumentService";
import {
  buildVariantStrategies,
  getStrategyVariantLayouts,
} from "@/src/features/creative/services/creativeGenerationService";
import type { CreativeInputValues } from "@/src/features/creative/types/document";
import type { CreativeVariant } from "@/src/features/creative/types/variant";

const strategyLabelMap = {
  benefit_push: "Benefit Push",
  urgency_push: "Urgency Push",
  trust_push: "Trust Push",
  simple_cta: "Simple CTA",
} as const;

const resolveStrategies = (documentId: string, input: CreativeInputValues) => {
  return getStrategyVariantLayouts(documentId) ?? buildVariantStrategies(input);
};

const buildStrategyVariants = (
  documentId: string,
  input: CreativeInputValues,
  sourceVariants?: CreativeVariant[],
): CreativeVariant[] => {
  const strategies = resolveStrategies(documentId, input);
  return strategies.slice(0, 4).map((entry, index) => ({
    id:
      sourceVariants?.[index]?.id ??
      `variant_${index + 1}_${Math.random().toString(36).slice(2, 8)}`,
    documentId,
    strategyLabel: strategyLabelMap[entry.strategy],
    thumbnailUrl: sourceVariants?.[index]?.thumbnailUrl ?? "",
    variantJson: {
      width: entry.layout.width,
      height: entry.layout.height,
      background: {
        color: entry.layout.background.color,
        imageUrl: entry.layout.background.imageUrl,
      },
      layers: entry.layout.layers.map((layer) => ({ ...layer })),
    },
    createdAt: sourceVariants?.[index]?.createdAt ?? new Date().toISOString(),
  }));
};

export const fetchDocumentVariants = async (documentId: string): Promise<CreativeVariant[]> => {
  try {
    const response = await fetch(`/api/creative/documents/${documentId}/variants`, {
      method: "GET",
      cache: "no-store",
    });
    if (response.ok) {
      const data = (await response.json()) as { variants: CreativeVariant[] } | CreativeVariant[];
      const variants = Array.isArray(data) ? data : data.variants;
      if (variants.length > 0) {
        return variants;
      }
      const input = getCreativeDocumentInput(documentId);
      if (!input) {
        return variants;
      }
      return buildStrategyVariants(documentId, input, variants);
    }
  } catch {
    // Use mock data for MVP fallback.
  }

  const input = getCreativeDocumentInput(documentId);
  if (!input) {
    throw new Error("Creative input is missing for mock variant generation.");
  }

  return buildStrategyVariants(documentId, input);
};

export const regenerateVariant = async (
  variantId: string,
  input: CreativeInputValues,
): Promise<CreativeVariant> => {
  const response = await fetch(`/api/creative/variants/${variantId}/regenerate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      input,
      preserveCompositionArchetype: true,
    }),
  });

  if (!response.ok) {
    let message = `Failed to regenerate variant (status: ${response.status}).`;
    try {
      const payload = (await response.json()) as { error?: string };
      if (typeof payload.error === "string" && payload.error.trim().length > 0) {
        message = payload.error;
      }
    } catch {
      // Keep fallback message.
    }
    throw new Error(message);
  }

  const payload = (await response.json()) as { variant?: CreativeVariant };
  if (!payload.variant) {
    throw new Error("Regeneration response did not include variant data.");
  }
  return payload.variant;
};
