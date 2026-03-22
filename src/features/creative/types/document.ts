export type CreativeScreen = "input" | "generating" | "compare" | "edit" | "export";

export type CampaignType = "coupon" | "points" | "cashback" | "event";
export type CreativeTone = "formal" | "friendly" | "bold" | "premium";
export type CreativeDesignTaste = "clean" | "playful" | "minimal" | "impact";
export type CreativeStrategyPreference =
  | "benefit_push"
  | "urgency_push"
  | "trust_push"
  | "simple_cta";

export type CreativeInputValues = {
  campaignType: CampaignType;
  industry: string;
  companyName: string;
  mainCopy: string;
  rewardText: string;
  limitText: string;
  periodText: string;
  tone: CreativeTone;
  designTaste: CreativeDesignTaste;
  stylePreset?: string;
  preferredStrategies?: CreativeStrategyPreference[];
  brandPrimaryColor: string;
  brandSecondaryColor: string;
  templateId?: string;
  themeId?: string;
};

export type CreativeDocument = {
  id: string;
  input: CreativeInputValues;
  createdAt: string;
};

export const DEFAULT_CREATIVE_INPUT: CreativeInputValues = {
  campaignType: "points",
  industry: "retail",
  companyName: "AURBIT",
  mainCopy: "春の新生活キャンペーン",
  rewardText: "最大20%還元",
  limitText: "上限3,000ポイント",
  periodText: "3/1 - 3/31",
  tone: "friendly",
  designTaste: "clean",
  stylePreset: "",
  preferredStrategies: [],
  brandPrimaryColor: "#eb5505",
  brandSecondaryColor: "#1e3a8a",
  templateId: "campaign",
  themeId: "orangeCampaign",
};
