import type { CreativeInputValues } from "@/src/features/creative/types/document";
import type { CreativeVariantJson } from "@/src/features/creative/types/layer";
import type {
  CompositionArchetype,
  StrategyPlan,
} from "@/src/features/creative/ai/imageProvider";

export const STRATEGY_PLANS: StrategyPlan[] = [
  {
    strategy: "benefit_push",
    label: "Benefit Push",
    subtitle: "reward-first",
    compositionArchetype: "left_visual_right_text",
    visualDensity: "high",
    energyLevel: "high",
    whitespaceProfile: "balanced",
    composition: "left-weighted campaign focal cluster with a protected right-side text zone",
    visualDirection: "bold retail promo atmosphere with strong chroma transitions and campaign momentum",
    safeAreaHint: "reserve right 42% as cleaner overlay-safe space with moderate gradient only",
  },
  {
    strategy: "urgency_push",
    label: "Urgency Push",
    subtitle: "limited-time energy",
    compositionArchetype: "right_visual_left_text",
    visualDensity: "high",
    energyLevel: "high",
    whitespaceProfile: "compact",
    composition: "right-driven diagonal motion field with left-side readable path for urgent copy",
    visualDirection: "time-sensitive directional streaks, sharper contrast pockets, stronger visual tension",
    safeAreaHint: "preserve left 38% readable lane while keeping dynamic motion on right and diagonal axis",
  },
  {
    strategy: "trust_push",
    label: "Trust Push",
    subtitle: "clean / reliable",
    compositionArchetype: "premium_clean_split",
    visualDensity: "low",
    energyLevel: "low",
    whitespaceProfile: "wide",
    composition: "premium split composition with calm structural balance and open breathing room",
    visualDirection: "brand-safe premium look, restrained texture, soft elegant gradients",
    safeAreaHint: "maintain generous center-right whitespace for headline and supporting details",
  },
  {
    strategy: "simple_cta",
    label: "Simple CTA",
    subtitle: "minimal / clear",
    compositionArchetype: "minimal_full_background",
    visualDensity: "low",
    energyLevel: "medium",
    whitespaceProfile: "wide",
    composition: "minimal full-background field with one soft focal anchor and dominant clean area",
    visualDirection: "clean modern restraint with low clutter and CTA-oriented hierarchy",
    safeAreaHint: "preserve a broad center-safe zone spanning roughly 60% of canvas",
  },
];

export const resolveStrategyPlans = (
  preferredStrategies?: StrategyPlan["strategy"][],
): StrategyPlan[] => {
  const cloned = STRATEGY_PLANS.map((entry) => ({ ...entry }));
  if (!Array.isArray(preferredStrategies) || preferredStrategies.length === 0) {
    return cloned;
  }

  const rank = new Map<StrategyPlan["strategy"], number>();
  preferredStrategies.forEach((strategy, index) => {
    if (!rank.has(strategy)) {
      rank.set(strategy, index);
    }
  });

  return cloned.sort((a, b) => {
    const aRank = rank.get(a.strategy);
    const bRank = rank.get(b.strategy);
    if (aRank == null && bRank == null) {
      return 0;
    }
    if (aRank == null) {
      return 1;
    }
    if (bRank == null) {
      return -1;
    }
    return aRank - bRank;
  });
};

export const resolveStrategyPlanByKey = (
  strategy: StrategyPlan["strategy"],
  overrides?: Partial<Pick<StrategyPlan, "compositionArchetype">>,
): StrategyPlan => {
  const found = STRATEGY_PLANS.find((entry) => entry.strategy === strategy);
  if (!found) {
    throw new Error(`Unknown strategy: ${strategy}`);
  }
  const overrideArchetype = overrides?.compositionArchetype;
  const compositionArchetype: CompositionArchetype = overrideArchetype ?? found.compositionArchetype;
  return {
    ...found,
    compositionArchetype,
  };
};

const textLayer = (params: {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  zIndex: number;
  text: string;
  color: string;
  fontSize: number;
  fontWeight?: number;
}) => ({
  type: "text" as const,
  ...params,
});

const logoLayer = (params: {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  zIndex: number;
}) => ({
  id: params.id,
  type: "logo" as const,
  x: params.x,
  y: params.y,
  width: params.width,
  height: params.height,
  zIndex: params.zIndex,
  imageUrl: "https://dummyimage.com/420x180/111827/ffffff&text=AURBIT+LOGO",
});

export const buildVariantJsonForStrategy = (
  input: CreativeInputValues,
  strategy: StrategyPlan["strategy"],
  imageUrl: string,
  width = 1365,
  height = 768,
): CreativeVariantJson => {
  const primary = input.brandPrimaryColor;
  const secondary = input.brandSecondaryColor;
  const neutral = "#0f172a";

  if (strategy === "benefit_push") {
    return {
      width,
      height,
      background: { color: "#ffffff", imageUrl },
      layers: [
        textLayer({ id: "benefit-headline", x: 64, y: 72, width: 640, height: 84, zIndex: 4, text: input.mainCopy, color: neutral, fontSize: 48, fontWeight: 800 }),
        textLayer({ id: "benefit-reward", x: 64, y: 184, width: 680, height: 124, zIndex: 4, text: input.rewardText, color: primary, fontSize: 76, fontWeight: 900 }),
        textLayer({ id: "benefit-detail", x: 64, y: 334, width: 700, height: 50, zIndex: 4, text: `${input.limitText} | ${input.periodText}`, color: secondary, fontSize: 28, fontWeight: 600 }),
        logoLayer({ id: "benefit-logo", x: width - 280, y: 40, width: 220, height: 88, zIndex: 5 }),
      ],
    };
  }

  if (strategy === "urgency_push") {
    return {
      width,
      height,
      background: { color: "#fff7ed", imageUrl },
      layers: [
        textLayer({ id: "urgency-badge", x: 64, y: 52, width: 260, height: 50, zIndex: 5, text: "LIMITED TIME", color: "#ffffff", fontSize: 24, fontWeight: 800 }),
        textLayer({ id: "urgency-headline", x: 64, y: 134, width: 760, height: 86, zIndex: 4, text: input.periodText, color: "#b91c1c", fontSize: 56, fontWeight: 900 }),
        textLayer({ id: "urgency-reward", x: 64, y: 244, width: 560, height: 80, zIndex: 4, text: input.rewardText, color: "#ea580c", fontSize: 44, fontWeight: 800 }),
        textLayer({ id: "urgency-detail", x: 64, y: 342, width: 720, height: 52, zIndex: 4, text: `${input.mainCopy} / ${input.limitText}`, color: neutral, fontSize: 26, fontWeight: 600 }),
        logoLayer({ id: "urgency-logo", x: width - 280, y: 46, width: 220, height: 84, zIndex: 5 }),
      ],
    };
  }

  if (strategy === "trust_push") {
    return {
      width,
      height,
      background: { color: "#f8fafc", imageUrl },
      layers: [
        logoLayer({ id: "trust-logo", x: 72, y: 66, width: 300, height: 110, zIndex: 5 }),
        textLayer({ id: "trust-headline", x: 72, y: 218, width: 760, height: 76, zIndex: 4, text: input.mainCopy, color: secondary, fontSize: 44, fontWeight: 700 }),
        textLayer({ id: "trust-message", x: 72, y: 316, width: 760, height: 54, zIndex: 4, text: `${input.companyName} trusted campaign | ${input.periodText}`, color: "#334155", fontSize: 25, fontWeight: 500 }),
        textLayer({ id: "trust-reward", x: 72, y: 408, width: 480, height: 60, zIndex: 4, text: input.rewardText, color: primary, fontSize: 35, fontWeight: 700 }),
      ],
    };
  }

  return {
    width,
    height,
    background: { color: "#ffffff", imageUrl },
    layers: [
      textLayer({ id: "simple-headline", x: 104, y: 166, width: 860, height: 104, zIndex: 4, text: input.mainCopy, color: neutral, fontSize: 58, fontWeight: 800 }),
      textLayer({ id: "simple-cta", x: 104, y: 320, width: 380, height: 80, zIndex: 4, text: input.rewardText, color: primary, fontSize: 36, fontWeight: 800 }),
      logoLayer({ id: "simple-logo", x: width - 230, y: 40, width: 170, height: 64, zIndex: 5 }),
    ],
  };
};
