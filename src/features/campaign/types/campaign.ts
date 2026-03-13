export type CampaignIndustry =
  | "retail"
  | "food"
  | "beauty"
  | "electronics"
  | "finance"
  | "public";

export type CampaignType =
  | "reward"
  | "coupon"
  | "lottery"
  | "quick_chance"
  | "municipality"
  | "collaboration";

export type CampaignGoal =
  | "acquisition"
  | "retention"
  | "store_visit"
  | "sales";

export type CampaignRewardType = "points" | "discount" | "gift" | "cashback";

export type CampaignTone =
  | "friendly"
  | "premium"
  | "corporate"
  | "energetic"
  | "seasonal";

export type CampaignInput = {
  campaignName: string;
  brandName: string;
  industry: CampaignIndustry;
  campaignType: CampaignType;
  goal: CampaignGoal;
  rewardType: CampaignRewardType;
  rewardValue: string;
  conditions: string;
  periodStart: string;
  periodEnd: string;
  limit?: string;
  targetAudience?: string;
  tone?: CampaignTone;
  colorPreference?: string;
  referenceLpUrl?: string;
};

export type CampaignPlan = {
  campaignSummary: {
    campaignType: CampaignType;
    industry: CampaignIndustry;
    goal: CampaignGoal;
  };
  lpStructure: string[];
  copyDraft: {
    heroHeadline: string;
    heroSubcopy: string;
    cta: string;
  };
  creativeDirection: {
    tone: CampaignTone;
    style: string;
    preferredStrategies: Array<
      "benefit_push" | "urgency_push" | "trust_push" | "simple_cta"
    >;
  };
};

export type CampaignBuilderHandoff = {
  lpStructure: string[];
  heroHeadline: string;
  heroSubcopy: string;
  cta: string;
  creativeDirection: CampaignPlan["creativeDirection"];
  sourceInput: CampaignInput;
  generatedAt: string;
};

export type CampaignStep = "input" | "analyze" | "review" | "apply";

export const DEFAULT_CAMPAIGN_INPUT: CampaignInput = {
  campaignName: "",
  brandName: "",
  industry: "retail",
  campaignType: "reward",
  goal: "store_visit",
  rewardType: "points",
  rewardValue: "",
  conditions: "",
  periodStart: "",
  periodEnd: "",
  limit: "",
  targetAudience: "",
  tone: "friendly",
  colorPreference: "",
  referenceLpUrl: "",
};
