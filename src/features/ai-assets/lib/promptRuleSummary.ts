import type { BuiltAssetPrompt } from "@/src/features/ai-assets/types";
import {
  formatAppliedRuleLabel,
  labelCampaignFamily,
  labelDensity,
  labelOverlayPosition,
  labelSectionType,
  labelSource,
  labelSourceField,
  labelTarget,
  labelTextOverlay,
  labelTone,
  normalizePromptSource,
} from "@/src/features/ai-assets/lib/promptDisplayLabels";

type PromptMeta = BuiltAssetPrompt["meta"];

const PRIORITY_PREFIX = [
  "target:",
  "target-bg:",
  "target-image:",
  "tone:",
  "text-overlay:",
  "density:",
  "overlay-position:",
  "section-type:",
  "campaign-family:",
] as const;

const formatRule = (value: string) => {
  const rule = value.trim();
  if (!rule) {
    return "";
  }
  return formatAppliedRuleLabel(rule);
};

const rulePriority = (rule: string) => {
  const index = PRIORITY_PREFIX.findIndex((prefix) => rule.startsWith(prefix));
  return index < 0 ? PRIORITY_PREFIX.length + 1 : index;
};

const SOURCE_IMPORTANCE = {
  explicit: 1,
  preset: 2,
  inferred: 3,
  fallback: 4,
} as const;

const SOURCE_FIELD_PRIORITY = {
  overlayPositionSource: 1,
  textOverlaySource: 2,
  densitySource: 3,
  sectionTypeSource: 4,
  campaignFamilySource: 5,
} as const;

const buildSourceHighlights = (meta: PromptMeta, maxLines = 3) => {
  const entries = [
    {
      key: "overlayPositionSource" as const,
      source: normalizePromptSource(meta.overlayPositionSource),
    },
    {
      key: "textOverlaySource" as const,
      source: normalizePromptSource(meta.textOverlaySource),
    },
    {
      key: "densitySource" as const,
      source: normalizePromptSource(meta.densitySource),
    },
    {
      key: "sectionTypeSource" as const,
      source: normalizePromptSource(meta.sectionTypeSource),
    },
    {
      key: "campaignFamilySource" as const,
      source: normalizePromptSource(meta.campaignFamilySource),
    },
  ]
    .filter((entry): entry is { key: keyof typeof SOURCE_FIELD_PRIORITY; source: keyof typeof SOURCE_IMPORTANCE } => Boolean(entry.source))
    .sort((a, b) => SOURCE_FIELD_PRIORITY[a.key] - SOURCE_FIELD_PRIORITY[b.key]);

  if (entries.length === 0) {
    return [];
  }

  const grouped = entries.reduce<Record<string, Array<keyof typeof SOURCE_FIELD_PRIORITY>>>((acc, entry) => {
    const key = entry.source;
    if (!acc[key]) {
      acc[key] = [];
    }
    acc[key].push(entry.key);
    return acc;
  }, {});

  return Object.entries(grouped)
    .sort((a, b) => {
      const [aSource, aKeys] = a as [keyof typeof SOURCE_IMPORTANCE, Array<keyof typeof SOURCE_FIELD_PRIORITY>];
      const [bSource, bKeys] = b as [keyof typeof SOURCE_IMPORTANCE, Array<keyof typeof SOURCE_FIELD_PRIORITY>];
      const aScore = SOURCE_IMPORTANCE[aSource] * 10 + Math.min(...aKeys.map((key) => SOURCE_FIELD_PRIORITY[key]));
      const bScore = SOURCE_IMPORTANCE[bSource] * 10 + Math.min(...bKeys.map((key) => SOURCE_FIELD_PRIORITY[key]));
      return aScore - bScore;
    })
    .slice(0, maxLines)
    .map(([source, keys]) => {
      const sortedKeys = (keys as Array<keyof typeof SOURCE_FIELD_PRIORITY>).sort(
        (a, b) => SOURCE_FIELD_PRIORITY[a] - SOURCE_FIELD_PRIORITY[b],
      );
      const visibleKeys = sortedKeys.slice(0, 2);
      const hiddenCount = Math.max(0, sortedKeys.length - visibleKeys.length);
      const keyLabel = visibleKeys.map((key) => labelSourceField(key)).join("・");
      const restLabel = hiddenCount > 0 ? ` 他${hiddenCount}` : "";
      return `${labelSource(source as "explicit" | "preset" | "inferred" | "fallback")}: ${keyLabel}${restLabel}`;
    });
};

export const summarizeAppliedRules = (appliedRules: string[], maxItems = 4) => {
  const uniq = Array.from(
    new Set(appliedRules.map((entry) => entry.trim()).filter(Boolean)),
  );

  const sorted = [...uniq].sort((a, b) => {
    const ap = rulePriority(a);
    const bp = rulePriority(b);
    if (ap !== bp) {
      return ap - bp;
    }
    return a.localeCompare(b);
  });

  const top = sorted.slice(0, Math.max(1, maxItems)).map(formatRule).filter(Boolean);
  return {
    rules: top,
    total: uniq.length,
    hiddenCount: Math.max(0, uniq.length - top.length),
  };
};

export const buildMetaSummary = (meta: PromptMeta) => {
  const summarized = summarizeAppliedRules(meta.appliedRules, 4);
  const sourceHighlights = buildSourceHighlights(meta, 3);

  return {
    target: meta.target,
    targetLabel: labelTarget(meta.target),
    tone: meta.tone,
    toneLabel: labelTone(meta.tone),
    textOverlay: meta.textOverlay,
    textOverlayLabel: labelTextOverlay(meta.textOverlay),
    density: meta.density,
    densityLabel: labelDensity(meta.density),
    overlayPosition: meta.overlayPosition,
    overlayPositionLabel: labelOverlayPosition(meta.overlayPosition),
    campaignFamily: meta.campaignFamily,
    campaignFamilyLabel: labelCampaignFamily(meta.campaignFamily),
    sectionType: meta.sectionType,
    sectionTypeLabel: labelSectionType(meta.sectionType),
    sourceHighlights,
    rules: summarized.rules,
    ruleCount: summarized.total,
    hiddenRuleCount: summarized.hiddenCount,
  };
};
