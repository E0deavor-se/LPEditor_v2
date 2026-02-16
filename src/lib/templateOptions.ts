import type { ProjectState } from "@/src/types/project";

export type TemplateOption = {
  id: string;
  title: string;
  description: string;
  templateType: ProjectState["meta"]["templateType"];
  sectionOrder: string[];
};

export const TEMPLATE_STORAGE_KEY = "lp-editor.template";

export const TEMPLATE_OPTIONS: TemplateOption[] = [
  {
    id: "campaign",
    title: "クーポン",
    description: "クーポン施策向けの標準LP構成",
    templateType: "coupon",
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
    description: "ポイント付与向けの標準LP構成",
    templateType: "point",
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
    sectionOrder: ["brandBar", "excludedStoresList"],
  },
  {
    id: "excluded-brands",
    title: "対象外ブランド一覧",
    description: "対象外ブランドの一覧ページ",
    templateType: "target",
    sectionOrder: ["brandBar", "excludedBrandsList"],
  },
];
