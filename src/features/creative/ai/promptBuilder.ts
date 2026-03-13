import type { CreativeInputValues } from "@/src/features/creative/types/document";
import type {
  GenerationMode,
  PromptFragments,
  PromptPayload,
  StrategyPlan,
} from "@/src/features/creative/ai/imageProvider";

type BuildPromptOptions = {
  mode?: GenerationMode;
  regenerationCount?: number;
  previousSeed?: number;
};

const NEGATIVE = [
  "text",
  "typography",
  "letters",
  "numbers",
  "logo",
  "brand mark",
  "watermark",
  "signature",
  "ui elements",
  "distorted geometry",
  "low quality",
  "blurry",
  "deformed",
].join(", ");

const buildStrategyFragments = (plan: StrategyPlan): PromptFragments => {
  const baseSafeArea = `Safe text space requirement: ${plan.safeAreaHint}.`;

  if (plan.strategy === "benefit_push") {
    return {
      compositionPrompt:
        "Use a left_visual_right_text archetype with the left side carrying campaign focal visuals and the right side intentionally calmer.",
      moodPrompt:
        "Promotional, uplifting, reward-focused campaign atmosphere.",
      densityPrompt: "Visual density should be high on focal side and medium elsewhere.",
      shapePrompt: "Use layered gradient swells, soft geometric flares, and energetic shape overlaps.",
      whitespacePrompt: "Keep balanced whitespace with protected right-side readability.",
      contrastPrompt: "Use strong color transitions and clear local contrast around focal cluster.",
      safeAreaPrompt: baseSafeArea,
      tonePrompt: "Benefit-first marketing intent with confident and clear conversion mood.",
      negativeAdditions: ["flat monotone background", "uniform composition"],
    };
  }

  if (plan.strategy === "urgency_push") {
    return {
      compositionPrompt:
        "Use a right_visual_left_text archetype with diagonal directional movement flowing into a left-side readable lane.",
      moodPrompt:
        "Time-sensitive, urgent campaign energy with dynamic directional motion.",
      densityPrompt: "High visual density near motion vectors and focal bursts.",
      shapePrompt:
        "Use angular streaks, diagonal beams, and sharper segmented gradients to imply speed.",
      whitespacePrompt: "Keep compact whitespace except for a protected left text lane.",
      contrastPrompt: "Higher contrast with sharper light-dark separation for urgency cues.",
      safeAreaPrompt: baseSafeArea,
      tonePrompt: "Limited-time push tone with high conversion pressure but still premium quality.",
      negativeAdditions: ["calm static composition", "soft low-contrast only"],
    };
  }

  if (plan.strategy === "trust_push") {
    return {
      compositionPrompt:
        "Use a premium_clean_split archetype with stable balance, refined spacing, and uncluttered visual rhythm.",
      moodPrompt: "Reliable, calm, professional brand-safe atmosphere.",
      densityPrompt: "Low to medium density, avoiding noisy or busy texture.",
      shapePrompt: "Use subtle smooth gradients and restrained soft forms.",
      whitespacePrompt: "Wide whitespace with clear breathing room and clean hierarchy.",
      contrastPrompt: "Moderate contrast with polished premium tonal balance.",
      safeAreaPrompt: baseSafeArea,
      tonePrompt: "Trust-building campaign expression for dependable enterprise-like communication.",
      negativeAdditions: ["chaotic high-noise background", "aggressive dramatic effects"],
    };
  }

  return {
    compositionPrompt:
      "Use a minimal_full_background archetype with one gentle center anchor and very large clean overlay-safe field.",
    moodPrompt: "Minimal, clear, conversion-focused CTA support atmosphere.",
    densityPrompt: "Low density with minimal decorative elements.",
    shapePrompt: "Simple large-scale gradients, minimal shapes, no visual clutter.",
    whitespacePrompt: "Very wide whitespace around the main safe text zone.",
    contrastPrompt: "Clean readable contrast without harsh visual noise.",
    safeAreaPrompt: baseSafeArea,
    tonePrompt: "Straightforward CTA intent with modern simplicity and clarity.",
    negativeAdditions: ["busy collage", "over-detailed texture"],
  };
};

export const buildPromptPayload = (
  input: CreativeInputValues,
  plan: StrategyPlan,
  options?: BuildPromptOptions,
): PromptPayload => {
  const fragments = buildStrategyFragments(plan);
  const mode = options?.mode ?? "initial";
  const isRegeneration = mode === "regeneration";
  const regenerationHint = isRegeneration
    ? `Regeneration request: produce a NEW alternative within the SAME strategy direction and SAME composition family (${plan.compositionArchetype}). Avoid near-duplicate of previous sample.`
    : "";
  const regenerationFineTune = isRegeneration
    ? `Within-strategy variation: adjust shape rhythm, gradient paths, focal offsets, and micro-contrast while preserving text-safe zones and LP hero usability. Regeneration count: ${Math.max(1, options?.regenerationCount ?? 1)}.`
    : "";
  const previousSeedHint =
    isRegeneration && typeof options?.previousSeed === "number"
      ? `Previous seed was ${options.previousSeed}. Use a different latent direction.`
      : "";

  const prompt = [
    "Create a high-quality hero background image for a Japanese campaign landing page.",
    "This image is background-only and will receive text overlay later.",
    `Campaign context: ${input.industry} / ${input.campaignType}.`,
    `Tone: ${input.tone}. Design taste: ${input.designTaste}.`,
    input.stylePreset ? `Campaign style preset: ${input.stylePreset}.` : "",
    `Primary color accent: ${input.brandPrimaryColor}. Secondary accent: ${input.brandSecondaryColor}.`,
    `Strategy: ${plan.label}.`,
    `Strategy subtitle: ${plan.subtitle}.`,
    `Composition archetype: ${plan.compositionArchetype}.`,
    `Energy level: ${plan.energyLevel}. Visual density: ${plan.visualDensity}. Whitespace profile: ${plan.whitespaceProfile}.`,
    `Composition: ${plan.composition}.`,
    `Visual direction: ${plan.visualDirection}.`,
    fragments.compositionPrompt,
    fragments.moodPrompt,
    fragments.densityPrompt,
    fragments.shapePrompt,
    fragments.whitespacePrompt,
    fragments.contrastPrompt,
    fragments.safeAreaPrompt,
    fragments.tonePrompt,
    regenerationHint,
    regenerationFineTune,
    previousSeedHint,
    "Japanese marketing LP aesthetic, modern, polished, conversion-focused.",
    "No embedded copy in image.",
  ].join(" ");

  const negativePrompt = [NEGATIVE, ...fragments.negativeAdditions]
    .map((entry) => entry.trim())
    .filter((entry) => entry.length > 0)
    .join(", ");

  return {
    prompt,
    negativePrompt,
    fragments,
  };
};
