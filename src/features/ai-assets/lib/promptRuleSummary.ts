import type { BuiltAssetPrompt } from "@/src/features/ai-assets/types";
import {
  formatAppliedRuleLabel,
  labelCampaignFamily,
  labelDensity,
  labelOverlayPosition,
  labelSectionType,
  labelSource,
  labelTarget,
  labelTextOverlay,
  labelTone,
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

  const sourceSummary = [
    meta.campaignFamilySource ? `訴求: ${labelSource(meta.campaignFamilySource)}` : "",
    meta.sectionTypeSource ? `セクション: ${labelSource(meta.sectionTypeSource)}` : "",
    meta.densitySource ? `密度: ${labelSource(meta.densitySource)}` : "",
    meta.textOverlaySource ? `余白強度: ${labelSource(meta.textOverlaySource)}` : "",
    meta.overlayPositionSource ? `余白位置: ${labelSource(meta.overlayPositionSource)}` : "",
  ].filter(Boolean);

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
    sourceSummary,
    rules: summarized.rules,
    ruleCount: summarized.total,
    hiddenRuleCount: summarized.hiddenCount,
  };
};
