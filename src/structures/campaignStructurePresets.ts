import type { CampaignType } from "@/src/types/project";
import type { BuilderThemeId } from "@/src/themes/themePresets";

export type CampaignStructureSectionRole = "fixed" | "required" | "optional";

export type CampaignStructureSectionBlueprint = {
  slotId: string;
  label: string;
  sectionType: string;
  role: CampaignStructureSectionRole;
};

export type CampaignStructurePreset = {
  id: string;
  campaignType: CampaignType;
  label: string;
  requiredSections: string[];
  optionalSections: string[];
  fixedSections: string[];
  defaultTemplateId: string;
  defaultThemeId: BuilderThemeId;
  sections: CampaignStructureSectionBlueprint[];
  sectionOrder: string[];
};

const createPreset = (
  preset: Omit<CampaignStructurePreset, "sectionOrder">,
): CampaignStructurePreset => ({
  ...preset,
  sectionOrder: preset.sections.map((section) => section.sectionType),
});

export const CAMPAIGN_STRUCTURE_PRESETS: CampaignStructurePreset[] = [
  createPreset({
    id: "coupon-v1",
    campaignType: "coupon",
    label: "クーポン施策",
    defaultTemplateId: "campaign",
    defaultThemeId: "orangeCampaign",
    requiredSections: [
      "hero",
      "campaignPeriodBar",
      "campaignDescription",
      "couponDistributionPeriod",
      "targetStores",
      "couponUsageGuide",
      "couponNotes",
    ],
    optionalSections: [],
    fixedSections: ["auPayConditions", "contact"],
    sections: [
      {
        slotId: "hero",
        label: "ヒーロー",
        sectionType: "heroImage",
        role: "required",
      },
      {
        slotId: "campaignPeriodBar",
        label: "キャンペーン期間バー",
        sectionType: "campaignPeriodBar",
        role: "required",
      },
      {
        slotId: "campaignDescription",
        label: "キャンペーン説明",
        sectionType: "campaignOverview",
        role: "required",
      },
      {
        slotId: "couponDistributionPeriod",
        label: "クーポン配布期間",
        sectionType: "campaignPeriodBar",
        role: "required",
      },
      {
        slotId: "targetStores",
        label: "対象店舗",
        sectionType: "targetStores",
        role: "required",
      },
      {
        slotId: "couponUsageGuide",
        label: "クーポン利用ガイド",
        sectionType: "couponFlow",
        role: "required",
      },
      {
        slotId: "couponNotes",
        label: "クーポン注意事項",
        sectionType: "legalNotes",
        role: "required",
      },
      {
        slotId: "auPayConditions",
        label: "au PAY 条件",
        sectionType: "tabbedNotes",
        role: "fixed",
      },
      {
        slotId: "contact",
        label: "お問い合わせ",
        sectionType: "contact",
        role: "fixed",
      },
    ],
  }),
  createPreset({
    id: "pointReward-v1",
    campaignType: "pointReward",
    label: "ポイント還元施策",
    defaultTemplateId: "point",
    defaultThemeId: "blueCorporate",
    requiredSections: [
      "hero",
      "campaignPeriodBar",
      "campaignDescription",
      "targetStores",
      "campaignPeriod",
      "pointRewardTiming",
      "campaignNotes",
    ],
    optionalSections: [],
    fixedSections: ["auPayConditions", "contact"],
    sections: [
      {
        slotId: "hero",
        label: "ヒーロー",
        sectionType: "heroImage",
        role: "required",
      },
      {
        slotId: "campaignPeriodBar",
        label: "キャンペーン期間バー",
        sectionType: "campaignPeriodBar",
        role: "required",
      },
      {
        slotId: "campaignDescription",
        label: "キャンペーン説明",
        sectionType: "campaignOverview",
        role: "required",
      },
      {
        slotId: "targetStores",
        label: "対象店舗",
        sectionType: "targetStores",
        role: "required",
      },
      {
        slotId: "campaignPeriod",
        label: "キャンペーン期間",
        sectionType: "campaignPeriodBar",
        role: "required",
      },
      {
        slotId: "pointRewardTiming",
        label: "還元タイミング",
        sectionType: "paymentHistoryGuide",
        role: "required",
      },
      {
        slotId: "campaignNotes",
        label: "注意事項",
        sectionType: "legalNotes",
        role: "required",
      },
      {
        slotId: "auPayConditions",
        label: "au PAY 条件",
        sectionType: "tabbedNotes",
        role: "fixed",
      },
      {
        slotId: "contact",
        label: "お問い合わせ",
        sectionType: "contact",
        role: "fixed",
      },
    ],
  }),
  createPreset({
    id: "ranking-v1",
    campaignType: "ranking",
    label: "ランキング施策",
    defaultTemplateId: "ranking",
    defaultThemeId: "darkModern",
    requiredSections: [
      "hero",
      "campaignPeriodBar",
      "campaignDescription",
      "campaignPeriod",
      "pointRewardTiming",
      "rankingTable",
      "paymentHistoryGuide",
      "targetStores",
      "campaignNotes",
    ],
    optionalSections: [],
    fixedSections: ["auPayConditions", "contact"],
    sections: [
      {
        slotId: "hero",
        label: "ヒーロー",
        sectionType: "heroImage",
        role: "required",
      },
      {
        slotId: "campaignPeriodBar",
        label: "キャンペーン期間バー",
        sectionType: "campaignPeriodBar",
        role: "required",
      },
      {
        slotId: "campaignDescription",
        label: "キャンペーン説明",
        sectionType: "campaignOverview",
        role: "required",
      },
      {
        slotId: "campaignPeriod",
        label: "キャンペーン期間",
        sectionType: "campaignPeriodBar",
        role: "required",
      },
      {
        slotId: "pointRewardTiming",
        label: "還元タイミング",
        sectionType: "paymentHistoryGuide",
        role: "required",
      },
      {
        slotId: "rankingTable",
        label: "ランキング",
        sectionType: "rankingTable",
        role: "required",
      },
      {
        slotId: "paymentHistoryGuide",
        label: "決済履歴ガイド",
        sectionType: "paymentHistoryGuide",
        role: "required",
      },
      {
        slotId: "targetStores",
        label: "対象店舗",
        sectionType: "targetStores",
        role: "required",
      },
      {
        slotId: "campaignNotes",
        label: "注意事項",
        sectionType: "legalNotes",
        role: "required",
      },
      {
        slotId: "auPayConditions",
        label: "au PAY 条件",
        sectionType: "tabbedNotes",
        role: "fixed",
      },
      {
        slotId: "contact",
        label: "お問い合わせ",
        sectionType: "contact",
        role: "fixed",
      },
    ],
  }),
  createPreset({
    id: "generic-v1",
    campaignType: "generic",
    label: "汎用施策",
    defaultTemplateId: "campaign",
    defaultThemeId: "orangeCampaign",
    requiredSections: ["hero", "campaignDescription"],
    optionalSections: ["targetStores"],
    fixedSections: ["contact"],
    sections: [
      {
        slotId: "hero",
        label: "ヒーロー",
        sectionType: "heroImage",
        role: "required",
      },
      {
        slotId: "campaignDescription",
        label: "キャンペーン説明",
        sectionType: "campaignOverview",
        role: "required",
      },
      {
        slotId: "targetStores",
        label: "対象店舗",
        sectionType: "targetStores",
        role: "optional",
      },
      {
        slotId: "contact",
        label: "お問い合わせ",
        sectionType: "contact",
        role: "fixed",
      },
    ],
  }),
];

const TEMPLATE_TO_CAMPAIGN_TYPE: Record<string, CampaignType> = {
  campaign: "coupon",
  point: "pointReward",
  ranking: "ranking",
  "excluded-stores": "generic",
  "excluded-brands": "generic",
};

export const deriveCampaignTypeFromTemplateId = (
  templateId?: string,
): CampaignType => {
  if (!templateId) {
    return "generic";
  }
  return TEMPLATE_TO_CAMPAIGN_TYPE[templateId] ?? "generic";
};

export const getCampaignStructurePresetById = (
  presetId?: string,
): CampaignStructurePreset | null =>
  CAMPAIGN_STRUCTURE_PRESETS.find((preset) => preset.id === presetId) ?? null;

export const getCampaignStructurePresetByType = (
  campaignType?: CampaignType,
): CampaignStructurePreset | null =>
  CAMPAIGN_STRUCTURE_PRESETS.find((preset) => preset.campaignType === campaignType) ??
  null;

export const resolveCampaignStructurePreset = (params: {
  campaignType?: CampaignType;
  structurePresetId?: string;
  templateId?: string;
}): CampaignStructurePreset => {
  const byId = getCampaignStructurePresetById(params.structurePresetId);
  if (byId) {
    return byId;
  }
  const byType = getCampaignStructurePresetByType(params.campaignType);
  if (byType) {
    return byType;
  }
  const inferredCampaignType = deriveCampaignTypeFromTemplateId(params.templateId);
  return (
    getCampaignStructurePresetByType(inferredCampaignType) ??
    CAMPAIGN_STRUCTURE_PRESETS.find((preset) => preset.campaignType === "generic") ??
    CAMPAIGN_STRUCTURE_PRESETS[0]
  );
};
