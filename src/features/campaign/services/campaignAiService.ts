import type {
  CampaignGoal,
  CampaignInput,
  CampaignPlan,
  CampaignTone,
  CampaignType,
} from "@/src/features/campaign/types/campaign";

const structureByType: Record<CampaignType, string[]> = {
  reward: [
    "hero",
    "campaign_period",
    "campaign_overview",
    "target_stores",
    "how_to_use",
    "notes",
    "cta",
  ],
  coupon: [
    "hero",
    "campaign_period",
    "coupon_overview",
    "how_to_use",
    "target_stores",
    "notes",
    "cta",
  ],
  lottery: [
    "hero",
    "campaign_period",
    "participation_conditions",
    "benefit_overview",
    "how_to_use",
    "notes",
    "cta",
  ],
  quick_chance: [
    "hero",
    "campaign_period",
    "campaign_overview",
    "how_to_use",
    "notes",
    "cta",
  ],
  municipality: [
    "hero",
    "campaign_period",
    "target_area",
    "target_stores",
    "how_to_use",
    "faq",
    "notes",
    "cta",
  ],
  collaboration: [
    "hero",
    "campaign_period",
    "collaboration_overview",
    "campaign_overview",
    "notes",
    "cta",
  ],
};

const toneByGoal: Record<CampaignGoal, CampaignTone> = {
  acquisition: "energetic",
  retention: "friendly",
  store_visit: "friendly",
  sales: "premium",
};

const styleByIndustry: Record<CampaignInput["industry"], string> = {
  retail: "retail_campaign",
  food: "lifestyle_food",
  beauty: "beauty_clean",
  electronics: "tech_modern",
  finance: "trust_finance",
  public: "public_information",
};

const preferredStrategies = (input: CampaignInput): CampaignPlan["creativeDirection"]["preferredStrategies"] => {
  if (input.campaignType === "lottery" || input.campaignType === "quick_chance") {
    return ["urgency_push", "benefit_push"];
  }
  if (input.campaignType === "municipality" || input.industry === "public") {
    return ["trust_push", "simple_cta"];
  }
  if (input.tone === "premium" || input.industry === "finance") {
    return ["trust_push", "benefit_push"];
  }
  return ["benefit_push", "trust_push"];
};

const buildHeadline = (input: CampaignInput) => {
  const rewardText = input.rewardValue.trim() || "特典";
  if (input.rewardType === "discount") {
    return `${rewardText}オフ`;
  }
  if (input.rewardType === "cashback") {
    return `${rewardText}還元`;
  }
  if (input.rewardType === "gift") {
    return `${rewardText}プレゼント`;
  }
  return `${rewardText}ポイント還元`;
};

const buildSubcopy = (input: CampaignInput) => {
  const brand = input.brandName.trim() || "AURBIT";
  const goalCopy: Record<CampaignGoal, string> = {
    acquisition: "新規参加を促進する",
    retention: "リピート利用を後押しする",
    store_visit: "来店を後押しする",
    sales: "購買を加速する",
  };
  return `${brand}の${goalCopy[input.goal]}キャンペーン。${input.conditions.trim() || "参加条件をご確認ください。"}`;
};

const buildCta = (input: CampaignInput) => {
  if (input.goal === "store_visit") {
    return "対象店舗を確認する";
  }
  if (input.goal === "acquisition") {
    return "今すぐ参加する";
  }
  if (input.goal === "sales") {
    return "キャンペーンを利用する";
  }
  return "キャンペーン詳細を見る";
};

export const generateCampaignPlan = async (
  input: CampaignInput,
): Promise<CampaignPlan> => {
  const tone = input.tone ?? toneByGoal[input.goal];
  const plan: CampaignPlan = {
    campaignSummary: {
      campaignType: input.campaignType,
      industry: input.industry,
      goal: input.goal,
    },
    lpStructure: structureByType[input.campaignType],
    copyDraft: {
      heroHeadline: buildHeadline(input),
      heroSubcopy: buildSubcopy(input),
      cta: buildCta(input),
    },
    creativeDirection: {
      tone,
      style: styleByIndustry[input.industry],
      preferredStrategies: preferredStrategies(input),
    },
  };

  return plan;
};
