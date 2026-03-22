import type { CampaignType } from "@/src/types/project";

const CAMPAIGN_TYPE_LABELS: Record<CampaignType, string> = {
  coupon: "クーポン施策",
  pointReward: "ポイント還元施策",
  ranking: "ランキング施策",
  generic: "汎用施策",
};

const SLOT_LABELS: Record<string, string> = {
  hero: "ヒーロー",
  campaignPeriodBar: "キャンペーン期間バー",
  campaignDescription: "キャンペーン説明",
  targetStores: "対象店舗",
  campaignPeriod: "キャンペーン期間",
  pointRewardTiming: "ポイント還元時期",
  rankingTable: "ランキング表",
  paymentHistoryGuide: "決済履歴ガイド",
  couponDistributionPeriod: "クーポン配布期間",
  couponUsageGuide: "クーポン利用方法",
  campaignNotes: "注意事項",
  couponNotes: "クーポン注意事項",
  auPayConditions: "au PAY 条件",
  contact: "お問い合わせ",
};

const SECTION_TYPE_LABELS: Record<string, string> = {
  heroImage: "ヒーロー",
  campaignPeriodBar: "キャンペーン期間バー",
  campaignOverview: "キャンペーン説明",
  targetStores: "対象店舗",
  paymentHistoryGuide: "ポイント還元時期",
  rankingTable: "ランキング表",
  couponFlow: "クーポン利用方法",
  legalNotes: "注意事項",
  tabbedNotes: "au PAY 条件",
  contact: "お問い合わせ",
};

export const resolveCampaignTypeLabel = (campaignType?: CampaignType): string => {
  if (!campaignType) {
    return CAMPAIGN_TYPE_LABELS.generic;
  }
  return CAMPAIGN_TYPE_LABELS[campaignType] ?? CAMPAIGN_TYPE_LABELS.generic;
};

export const resolveStructureSlotLabel = (params: {
  slotId?: string;
  sectionType?: string;
  blueprintLabel?: string;
}): string => {
  if (params.slotId && SLOT_LABELS[params.slotId]) {
    return SLOT_LABELS[params.slotId];
  }
  if (params.blueprintLabel && params.blueprintLabel.trim().length > 0) {
    return params.blueprintLabel;
  }
  if (params.sectionType && SECTION_TYPE_LABELS[params.sectionType]) {
    return SECTION_TYPE_LABELS[params.sectionType];
  }
  return params.slotId || params.sectionType || "セクション";
};

export const buildRequiredSectionDeleteWarningMessage = (params: {
  campaignType?: CampaignType;
  slotLabel: string;
}): string => {
  const campaignLabel = resolveCampaignTypeLabel(params.campaignType);
  return `${campaignLabel}では${params.slotLabel}は必須です。削除すると必要構成が不足します。`;
};

export const buildMissingRequiredStructureWarningMessage = (params: {
  campaignType?: CampaignType;
  slotLabel: string;
}): string => {
  const campaignLabel = resolveCampaignTypeLabel(params.campaignType);
  return `${campaignLabel}に必要な「${params.slotLabel}」が不足しています。`;
};

export const buildMissingFixedStructureWarningMessage = (params: {
  campaignType?: CampaignType;
  slotLabel: string;
}): string => {
  const campaignLabel = resolveCampaignTypeLabel(params.campaignType);
  return `${campaignLabel}の固定セクション「${params.slotLabel}」が不足しています。`;
};
