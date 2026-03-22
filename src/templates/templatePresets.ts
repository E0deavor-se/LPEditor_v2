import type { ProjectState } from "@/src/types/project";
import type { BuilderThemeId } from "@/src/themes/themePresets";
import type { CampaignType } from "@/src/types/project";

export type BuilderTemplatePreset = {
  id: string;
  title: string;
  description: string;
  templateType: ProjectState["meta"]["templateType"];
  campaignType?: CampaignType;
  structurePresetId?: string;
  sectionOrder: string[];
  defaultThemeId: BuilderThemeId;
};

export const BUILDER_TEMPLATE_PRESETS: BuilderTemplatePreset[] = [
  {
    id: "campaign",
    title: "クーポン",
    description: "クーポン施策向けの標準LP構成",
    templateType: "coupon",
    campaignType: "coupon",
    structurePresetId: "coupon-v1",
    defaultThemeId: "orangeCampaign",
    sectionOrder: [
      "brandBar",
      "heroImage",
      "campaignPeriodBar",
      "campaignOverview",
      "targetStores",
      "couponFlow",
      "legalNotes",
      "footerHtml",
    ],
  },
  {
    id: "point",
    title: "ポイント施策",
    description: "ポイント還元向けの標準LP構成",
    templateType: "point",
    campaignType: "pointReward",
    structurePresetId: "pointReward-v1",
    defaultThemeId: "blueCorporate",
    sectionOrder: [
      "brandBar",
      "heroImage",
      "campaignPeriodBar",
      "campaignOverview",
      "targetStores",
      "legalNotes",
      "footerHtml",
    ],
  },
  {
    id: "ranking",
    title: "ランキング施策",
    description: "ランキング訴求向けのLP構成",
    templateType: "quickchance",
    campaignType: "ranking",
    structurePresetId: "ranking-v1",
    defaultThemeId: "darkModern",
    sectionOrder: [
      "brandBar",
      "heroImage",
      "campaignPeriodBar",
      "campaignOverview",
      "rankingTable",
      "paymentHistoryGuide",
      "targetStores",
      "legalNotes",
      "footerHtml",
    ],
  },
  {
    id: "excluded-stores",
    title: "対象外店舗一覧",
    description: "対象外店舗の一覧ページ",
    templateType: "target",
    campaignType: "generic",
    structurePresetId: "generic-v1",
    defaultThemeId: "minimalWhite",
    sectionOrder: ["brandBar", "excludedStoresList"],
  },
  {
    id: "excluded-brands",
    title: "対象外ブランド一覧",
    description: "対象外ブランドの一覧ページ",
    templateType: "target",
    campaignType: "generic",
    structurePresetId: "generic-v1",
    defaultThemeId: "minimalWhite",
    sectionOrder: ["brandBar", "excludedBrandsList"],
  },
];

export const getBuilderTemplatePreset = (templateId?: string): BuilderTemplatePreset | null =>
  BUILDER_TEMPLATE_PRESETS.find((preset) => preset.id === templateId) ?? null;
