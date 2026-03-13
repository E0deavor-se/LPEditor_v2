import type {
  AiAssetCampaignFamily,
  AiAssetDensity,
  AiAssetDensitySource,
  AiAssetOverlayPosition,
  AiAssetOverlayPositionSource,
  AiAssetSectionPromptType,
  AiAssetTextOverlaySource,
  AiAssetTextOverlayLevel,
  AiAssetTone,
  BuildAssetPromptInput,
  BuiltAssetPrompt,
} from "@/src/features/ai-assets/types";
import { inferCampaignFamily } from "@/src/features/ai-assets/lib/campaignFamilyInference";
import { inferSectionType } from "@/src/features/ai-assets/lib/sectionTypeInference";

type PartBuildResult = {
  parts: string[];
  rules: string[];
};

const uniq = (values: string[]) => Array.from(new Set(values.map((v) => v.trim()).filter(Boolean)));

const CAMPAIGN_FAMILY_RULES: Record<AiAssetCampaignFamily, string[]> = {
  coupon: [
    "clear and easy-to-understand value communication",
    "promotional visual momentum suitable for coupon redemption",
  ],
  point: [
    "reward and point-back impression with trust",
    "stable and readable campaign composition",
  ],
  cashback: [
    "strong return-on-spend impression with financial clarity",
    "credible and safe commercial look",
  ],
  discount: [
    "highly readable discount-focused promotion mood",
    "value-first campaign communication",
  ],
  present: [
    "special and celebratory atmosphere",
    "friendly excitement suitable for gift campaign",
  ],
  entry: [
    "easy-to-join participation mood",
    "simple conversion-oriented visual communication",
  ],
  seasonal: [
    "season-aware campaign expression",
    "balanced decorative mood without reducing readability",
  ],
  new_opening: [
    "fresh opening announcement mood",
    "positive and inviting first-visit impression",
  ],
  awareness: [
    "brand recall oriented visual storytelling",
    "memorable but usable LP hero composition",
  ],
  branding: [
    "brand identity oriented premium composition",
    "recognizable and clean brand-safe visual style",
  ],
  generic: [
    "general-purpose Japanese promotional LP usability",
    "balanced conversion-friendly composition",
  ],
};

const SECTION_TYPE_RULES: Record<AiAssetSectionPromptType, string[]> = {
  hero: [
    "first-view impact with clear headline-safe area",
    "avoid placing key subject in the text overlay zone",
  ],
  campaignPeriod: ["subtle supportive background that does not distract period text"],
  cv: ["visual flow that supports conversion action"],
  benefit: ["explanatory and trustworthy support visual"],
  feature: ["structured and readable feature-support atmosphere"],
  reason: ["logic-friendly and convincing visual support"],
  step: ["sequential and process-friendly visual clarity"],
  useCase: ["practical and relatable use-case supportive mood"],
  storeList: ["quiet low-noise composition for data-heavy sections"],
  faq: ["calm and readable support visual with low distraction"],
  notice: ["minimal and neutral support visual"],
  cta: ["attention-guiding composition that supports CTA readability"],
  free: ["flexible generic LP section support visual"],
  unknown: ["generic campaign LP compatibility"],
};

const TONE_RULES: Record<AiAssetTone, string[]> = {
  clean: ["bright and organized promotional tone", "clean contrast and tidy layout"],
  premium: ["polished premium commercial finish", "refined restrained texture"],
  pop: ["lively colorful atmosphere", "playful and upbeat campaign energy"],
  energetic: ["dynamic visual rhythm", "active and high-attention promotional mood"],
  natural: ["soft natural atmosphere", "comfortable and approachable mood"],
  minimal: ["minimal composition with generous whitespace", "reduced clutter"],
  luxury: ["high-end and elegant expression", "controlled contrast and sophistication"],
  friendly: ["approachable and warm campaign tone", "easy and welcoming visual style"],
  trust: ["stable trustworthy atmosphere", "safe and dependable visual language"],
  seasonal: ["seasonal cues with commercial readability", "timely campaign mood"],
};

const OVERLAY_RULES: Record<AiAssetTextOverlayLevel, string[]> = {
  none: ["no strict text-safe area required"],
  light: ["reserve a light text-safe zone with moderate cleanliness"],
  medium: ["reserve a clear text-safe zone and keep local detail controlled"],
  strong: [
    "reserve a large clean text-safe zone for headline and CTA",
    "do not place key objects inside the text overlay region",
  ],
};

const OVERLAY_POSITION_RULES: Record<AiAssetOverlayPosition, string> = {
  left: "keep left side cleaner for text overlay",
  right: "keep right side cleaner for text overlay",
  top: "keep top area cleaner for text overlay",
  bottom: "keep bottom area cleaner for text overlay",
  center: "keep center area readable for text overlay",
};

const OVERLAY_POSITION_RULES_WHEN_NO_TEXT: Record<AiAssetOverlayPosition, string> = {
  left: "left side can remain slightly cleaner, but strict text-safe space is not required",
  right: "right side can remain slightly cleaner, but strict text-safe space is not required",
  top: "top area can remain slightly cleaner, but strict text-safe space is not required",
  bottom: "bottom area can remain slightly cleaner, but strict text-safe space is not required",
  center: "center area can remain moderately readable, but strict text-safe space is not required",
};

const DENSITY_RULES: Record<AiAssetDensity, string[]> = {
  low: [
    "minimal visual noise with generous breathing room",
    "fewer compositional elements and restrained texture",
  ],
  medium: [
    "balanced visual detail with clear hierarchy",
    "moderate richness suitable for readable campaign LP composition",
  ],
  high: [
    "richer supporting detail and stronger decorative energy",
    "maintain commercial usability while increasing visual complexity",
  ],
};

const TARGET_RULES: Record<BuildAssetPromptInput["target"], string[]> = {
  heroImage: [
    "hero-grade first-view visual impact with conversion awareness",
  ],
  heroBackground: [
    "hero background style composition that supports headline readability",
  ],
  sectionBackground: [
    "background-support visual role, not a main subject",
    "prioritize text readability with low-noise composition",
    "keep contrast and detail restrained for Japanese promotional LP sections",
    "preserve spacious breathing room and avoid dominant foreground objects",
  ],
  sectionImage: [
    "section support image that improves content understanding",
    "meaningful but calm composition, less dominant than hero visuals",
    "friendly and clear Japanese promotional LP explanatory style",
  ],
  sectionIcon: [
    "icon-like simple visual clarity",
  ],
  bannerImage: [
    "horizontal promotion banner readability",
  ],
  mainVisual: [
    "main visual composition with campaign-wide consistency",
  ],
};

const normalizeTone = (input: BuildAssetPromptInput): AiAssetTone => {
  return input.creative?.tone ?? "clean";
};

const normalizeOverlay = (
  input: BuildAssetPromptInput,
): { level: AiAssetTextOverlayLevel; source: AiAssetTextOverlaySource } => {
  const textOverlay = input.creative?.textOverlay;
  if (textOverlay) {
    const sourceHint = input.creative?.textOverlaySourceHint;
    return {
      level: textOverlay,
      source: sourceHint ?? "inferred",
    };
  }
  return {
    level: "medium",
    source: "fallback",
  };
};

const normalizeOverlayPosition = (
  input: BuildAssetPromptInput,
): { position: AiAssetOverlayPosition; source: AiAssetOverlayPositionSource } => {
  const position = input.creative?.overlayPosition;
  if (position) {
    const sourceHint = input.creative?.overlayPositionSourceHint;
    return {
      position,
      source: sourceHint ?? "inferred",
    };
  }
  return {
    position: "right",
    source: "fallback",
  };
};

const inferDensityByTarget = (
  target: BuildAssetPromptInput["target"],
  sectionType: AiAssetSectionPromptType,
): AiAssetDensity => {
  if (target === "heroImage") {
    return "medium";
  }
  if (target === "sectionBackground") {
    return "low";
  }
  if (target === "sectionImage") {
    if (
      sectionType === "step" ||
      sectionType === "faq" ||
      sectionType === "notice" ||
      sectionType === "storeList" ||
      sectionType === "campaignPeriod"
    ) {
      return "low";
    }
    return "medium";
  }
  return "medium";
};

const normalizeDensity = (
  input: BuildAssetPromptInput,
  sectionType: AiAssetSectionPromptType,
  textOverlay: AiAssetTextOverlayLevel,
): { density: AiAssetDensity; source: AiAssetDensitySource } => {
  const explicit = input.creative?.density;
  if (explicit) {
    const hintedSource = input.creative?.densitySourceHint ?? "inferred";
    if (input.target === "sectionBackground" && explicit === "high") {
      return { density: "medium", source: hintedSource };
    }
    if (textOverlay === "strong" && explicit === "high") {
      return { density: "medium", source: hintedSource };
    }
    return { density: explicit, source: hintedSource };
  }

  const inferred = inferDensityByTarget(input.target, sectionType);
  if (textOverlay === "strong" && inferred === "high") {
    return { density: "medium", source: "inferred" };
  }
  return { density: inferred, source: "fallback" };
};

const buildTargetParts = (
  input: BuildAssetPromptInput,
  sectionType: AiAssetSectionPromptType,
): PartBuildResult => {
  const target = input.target;
  const parts = [...TARGET_RULES[target]];

  if (target === "sectionBackground") {
    if (
      sectionType === "faq" ||
      sectionType === "notice" ||
      sectionType === "storeList" ||
      sectionType === "campaignPeriod"
    ) {
      parts.push(
        "very subtle and quiet background treatment with minimal visual assertiveness",
      );
    }
    if (sectionType === "cta" || sectionType === "cv") {
      parts.push(
        "support eye guidance toward action area without stealing attention from CTA text",
      );
    }
  }

  if (target === "sectionImage") {
    if (sectionType === "benefit") {
      parts.push("visual should help users quickly grasp concrete benefits");
    } else if (sectionType === "feature") {
      parts.push("visual should reinforce feature understanding with structured clarity");
    } else if (sectionType === "reason") {
      parts.push("visual should support trust and rationale with calm credibility");
    } else if (sectionType === "useCase") {
      parts.push("visual should evoke practical usage scenes in an approachable way");
    } else if (sectionType === "step") {
      parts.push("visual should feel simple, ordered, and process-friendly");
    } else if (sectionType === "free" || sectionType === "unknown") {
      parts.push("use a generic but safe section-support composition suitable for LP reading flow");
    }
  }

  return {
    parts,
    rules: [
      `target:${target}`,
      ...(target === "sectionBackground" ? [`target-bg:${sectionType}`] : []),
      ...(target === "sectionImage" ? [`target-image:${sectionType}`] : []),
    ],
  };
};

const buildBaseParts = (input: BuildAssetPromptInput): PartBuildResult => {
  const locale = input.options?.locale ?? "ja-JP";
  const parts = [
    "Create a high-quality campaign LP image for commercial use.",
    "Use composition and detail levels that stay readable after text overlay.",
    locale === "ja-JP" || input.options?.preferJapaneseLpStyle !== false
      ? "Use Japanese promotion LP-friendly visual direction."
      : "Use clear promotion LP visual direction.",
  ];
  return { parts, rules: ["base:lp-usable", "base:locale"] };
};

const buildCampaignParts = (input: BuildAssetPromptInput, family: AiAssetCampaignFamily): PartBuildResult => {
  const campaign = input.campaign;
  const dynamicParts = [
    campaign?.name ? `Campaign name context: ${campaign.name}.` : "",
    campaign?.brandName ? `Brand: ${campaign.brandName}.` : "",
    campaign?.industry ? `Industry context: ${campaign.industry}.` : "",
    campaign?.summary ? `Campaign summary: ${campaign.summary}.` : "",
    campaign?.benefitText ? `Benefit focus: ${campaign.benefitText}.` : "",
    campaign?.rewardText ? `Reward expression: ${campaign.rewardText}.` : "",
    campaign?.season ? `Season context: ${campaign.season}.` : "",
    campaign?.keywords?.length ? `Campaign keywords: ${campaign.keywords.join(", ")}.` : "",
  ].filter(Boolean);

  return {
    parts: [...CAMPAIGN_FAMILY_RULES[family], ...dynamicParts],
    rules: [`campaign-family:${family}`],
  };
};

const buildSectionParts = (input: BuildAssetPromptInput, sectionType: AiAssetSectionPromptType): PartBuildResult => {
  const section = input.section;
  const dynamicParts = [
    section?.title ? `Section title context: ${section.title}.` : "",
    section?.description ? `Section description context: ${section.description}.` : "",
    section?.caption ? `Section caption context: ${section.caption}.` : "",
    section?.name ? `Section name context: ${section.name}.` : "",
    section?.keywords?.length ? `Section keywords: ${section.keywords.join(", ")}.` : "",
  ].filter(Boolean);

  return {
    parts: [...SECTION_TYPE_RULES[sectionType], ...dynamicParts],
    rules: [`section-type:${sectionType}`],
  };
};

const buildToneParts = (input: BuildAssetPromptInput, tone: AiAssetTone): PartBuildResult => {
  const brandParts = [
    input.brand?.primaryColor ? `Primary accent color hint: ${input.brand.primaryColor}.` : "",
    input.brand?.secondaryColor ? `Secondary accent color hint: ${input.brand.secondaryColor}.` : "",
    input.brand?.styleKeywords?.length
      ? `Brand style keywords: ${input.brand.styleKeywords.join(", ")}.`
      : "",
  ].filter(Boolean);

  return {
    parts: [...TONE_RULES[tone], ...brandParts],
    rules: [`tone:${tone}`],
  };
};

const buildLayoutParts = (
  input: BuildAssetPromptInput,
  textOverlay: AiAssetTextOverlayLevel,
  textOverlaySource: AiAssetTextOverlaySource,
  density: AiAssetDensity,
  densitySource: AiAssetDensitySource,
  overlayPosition: AiAssetOverlayPosition,
  overlayPositionSource: AiAssetOverlayPositionSource,
): PartBuildResult => {
  const aspectRatio = input.creative?.aspectRatio;
  const parts = [
    ...OVERLAY_RULES[textOverlay],
    textOverlay === "none"
      ? OVERLAY_POSITION_RULES_WHEN_NO_TEXT[overlayPosition]
      : OVERLAY_POSITION_RULES[overlayPosition],
    ...DENSITY_RULES[density],
    aspectRatio ? `Preferred aspect ratio: ${aspectRatio}.` : "",
    `Visual density preference: ${density}.`,
  ].filter(Boolean);

  if (textOverlaySource === "explicit") {
    if (textOverlay === "none") {
      parts.push("text-safe area is optional; do not force unnatural empty lanes");
    } else {
      parts.push("strictly follow the requested text overlay strength");
    }
  }

  if (input.target === "sectionBackground") {
    parts.push(
      "maintain broad clean areas for text readability",
      "avoid dramatic perspective or high-frequency detail that competes with copy",
    );
    if (overlayPositionSource === "explicit") {
      parts.push("strictly enforce the requested text-safe region for section background readability");
    }
    if (density === "high") {
      parts.push("avoid hero-like dense scene build and keep background-support readability");
    }
  }

  if (input.target === "heroImage") {
    if (overlayPositionSource === "explicit") {
      parts.push("strictly prioritize the requested overlay-safe side for headline and CTA");
    }
  }

  if (input.target === "sectionImage") {
    parts.push(
      "keep visual hierarchy clear for quick section-level understanding",
      "avoid hero-like cinematic framing and keep composition supportive",
    );
    if (overlayPositionSource === "explicit") {
      parts.push("gently respect the requested overlay-safe area while keeping subject clarity");
    }
    if (density === "high") {
      parts.push("keep added detail moderate and avoid overpowering section copy");
    }
  }

  if (densitySource === "explicit") {
    parts.push("respect the requested visual density while preserving LP readability");
  }

  return {
    parts,
    rules: [`text-overlay:${textOverlay}`, `density:${density}`, `overlay-position:${overlayPosition}`],
  };
};

const buildSafetyParts = (input: BuildAssetPromptInput): PartBuildResult => {
  const strictTextSafety = input.options?.strictTextSafety === true;
  const parts = [
    "Keep composition commercially safe and broadly usable.",
    strictTextSafety
      ? "Strongly avoid embedded text, logos, numbers, and typographic marks inside the generated image."
      : "Avoid obvious embedded text and logos in the generated image.",
    input.creative?.safety?.avoidFaceCloseups ? "Avoid close-up face-focused composition." : "",
    input.creative?.safety?.avoidBodyFocus ? "Avoid body-part focused framing." : "",
  ].filter(Boolean);

  if (input.target === "sectionBackground") {
    parts.push(
      "avoid clutter, busy composition, and distracting foreground subjects",
      "avoid contrast spikes that reduce overlaid text readability",
    );
  }

  if (input.target === "sectionImage") {
    parts.push(
      "avoid unrelated symbolic metaphors that confuse section meaning",
      "avoid uncanny hyper-real human closeups and over-dramatic tension",
    );
  }

  return {
    parts,
    rules: [strictTextSafety ? "safety:strict-text" : "safety:default"],
  };
};

const buildNegativePrompt = (input: BuildAssetPromptInput): string => {
  const strictTextSafety = input.options?.strictTextSafety === true;
  const base = [
    "embedded text",
    "letters",
    "numbers",
    "logo",
    "watermark",
    "low quality",
    "blurry",
    "overly cluttered composition",
    "chaotic dense layout",
    "unnatural face",
    "distorted hands",
    "body deformation",
    "uncanny realism",
    "heavy visual noise",
  ];

  if (strictTextSafety) {
    base.push(
      "any readable typography",
      "headline-like text shapes",
      "text blocks in safe area",
    );
  }

  const overlay = normalizeOverlay(input).level;
  if (overlay === "strong") {
    base.push("subject occupying text-safe area", "dense details in overlay zone");
  }

  if (input.target === "sectionBackground") {
    base.push(
      "busy composition",
      "clutter",
      "distracting foreground objects",
      "unreadable background",
      "excessive contrast that harms text readability",
      "high-detail noise",
    );
  }

  if (input.target === "sectionImage") {
    base.push(
      "too dramatic",
      "unrelated subject",
      "confusing visual metaphor",
      "overly realistic uncanny human depiction",
      "composition too heavy for section support image",
    );
  }

  return uniq(base).join(", ");
};

export const buildAssetPrompt = (input: BuildAssetPromptInput): BuiltAssetPrompt => {
  const campaignFamilyResult = inferCampaignFamily(input);
  const campaignFamily = campaignFamilyResult.family;
  const sectionTypeResult = inferSectionType(input);
  const sectionType = sectionTypeResult.sectionType;
  const tone = normalizeTone(input);
  const textOverlayResult = normalizeOverlay(input);
  const textOverlay = textOverlayResult.level;
  const densityResult = normalizeDensity(input, sectionType, textOverlay);
  const overlayPositionResult = normalizeOverlayPosition(input);
  const overlayPosition = overlayPositionResult.position;

  const base = buildBaseParts(input);
  const target = buildTargetParts(input, sectionType);
  const campaign = buildCampaignParts(input, campaignFamily);
  const section = buildSectionParts(input, sectionType);
  const toneParts = buildToneParts(input, tone);
  const layout = buildLayoutParts(
    input,
    textOverlay,
    textOverlayResult.source,
    densityResult.density,
    densityResult.source,
    overlayPosition,
    overlayPositionResult.source,
  );
  const safety = buildSafetyParts(input);

  const orderedParts = uniq([
    ...base.parts,
    ...target.parts,
    ...campaign.parts,
    ...section.parts,
    ...toneParts.parts,
    ...layout.parts,
    ...safety.parts,
  ]);

  const prompt = orderedParts.join(" ");
  const includeNegativePrompt = input.options?.includeNegativePrompt !== false;

  return {
    prompt,
    negativePrompt: includeNegativePrompt ? buildNegativePrompt(input) : undefined,
    meta: {
      target: input.target,
      campaignFamily,
      campaignFamilySource: campaignFamilyResult.source,
      sectionType,
      sectionTypeSource: sectionTypeResult.source,
      tone,
      textOverlay,
      textOverlaySource: textOverlayResult.source,
      density: densityResult.density,
      densitySource: densityResult.source,
      overlayPosition,
      overlayPositionSource: overlayPositionResult.source,
      appliedRules: uniq([
        ...base.rules,
        ...target.rules,
        ...campaign.rules,
        ...section.rules,
        ...toneParts.rules,
        ...layout.rules,
        ...safety.rules,
      ]),
    },
    debug: {
      baseParts: base.parts,
      targetParts: target.parts,
      campaignParts: campaign.parts,
      sectionParts: section.parts,
      toneParts: toneParts.parts,
      layoutParts: layout.parts,
      safetyParts: safety.parts,
    },
  };
};
