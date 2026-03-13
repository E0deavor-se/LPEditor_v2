import type { CreativeInputValues } from "@/src/features/creative/types/document";

export type CreativeStrategyKey =
  | "benefit_push"
  | "urgency_push"
  | "trust_push"
  | "simple_cta";

export type CompositionArchetype =
  | "left_visual_right_text"
  | "right_visual_left_text"
  | "centered_focus_with_safe_text_zone"
  | "minimal_full_background"
  | "premium_clean_split";

export type VisualDensity = "low" | "medium" | "high";
export type EnergyLevel = "low" | "medium" | "high";
export type WhitespaceProfile = "wide" | "balanced" | "compact";

export type PromptFragments = {
  compositionPrompt: string;
  moodPrompt: string;
  densityPrompt: string;
  shapePrompt: string;
  whitespacePrompt: string;
  contrastPrompt: string;
  safeAreaPrompt: string;
  tonePrompt: string;
  negativeAdditions: string[];
};

export type StrategyPlan = {
  strategy: CreativeStrategyKey;
  label: string;
  subtitle: string;
  compositionArchetype: CompositionArchetype;
  visualDensity: VisualDensity;
  energyLevel: EnergyLevel;
  whitespaceProfile: WhitespaceProfile;
  composition: string;
  visualDirection: string;
  safeAreaHint: string;
};

export type PromptPayload = {
  prompt: string;
  negativePrompt: string;
  fragments: PromptFragments;
};

export type GenerationMode = "initial" | "regeneration";

export type RegenerationContext = {
  mode: "regeneration";
  variantId: string;
  regenerationCount: number;
  previousSeed?: number;
  preserveCompositionArchetype?: CompositionArchetype;
};

export type GeneratedImage = {
  imageUrl: string;
  strategy: CreativeStrategyKey;
  strategySubtitle?: string;
  prompt: string;
  negativePrompt: string;
  promptFragments?: PromptFragments;
  model: string;
  seed?: number;
  width: number;
  height: number;
};

export type ProviderGenerateParams = {
  documentId: string;
  input: CreativeInputValues;
  plans: StrategyPlan[];
  width: number;
  height: number;
  regeneration?: RegenerationContext;
};

export type ImageProvider = {
  name: string;
  generateStrategyImages: (params: ProviderGenerateParams) => Promise<GeneratedImage[]>;
};
