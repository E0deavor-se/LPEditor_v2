import type { CreativeVariantJson } from "@/src/features/creative/types/layer";
import type {
  CompositionArchetype,
  EnergyLevel,
  PromptFragments,
  VisualDensity,
  WhitespaceProfile,
} from "@/src/features/creative/ai/imageProvider";

export type CreativeVariant = {
  id: string;
  documentId: string;
  strategyLabel: string;
  strategySubtitle?: string;
  thumbnailUrl?: string;
  variantJson: CreativeVariantJson;
  generationMeta?: {
    strategy?: string;
    strategySubtitle?: string;
    compositionArchetype?: CompositionArchetype;
    visualDensity?: VisualDensity;
    energyLevel?: EnergyLevel;
    whitespaceProfile?: WhitespaceProfile;
    provider?: string;
    model?: string;
    prompt?: string;
    negativePrompt?: string;
    promptFragments?: PromptFragments;
    regenerationMode?: "initial" | "regeneration";
    regenerationCount?: number;
    regeneratedFromVariantId?: string;
    previousSeed?: number;
    currentSeed?: number;
    regeneratedAt?: string;
    seed?: number;
    width?: number;
    height?: number;
  };
  createdAt: string;
};
