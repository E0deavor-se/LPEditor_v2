import type {
  AiAssetCampaignFamily,
  AiAssetDensity,
  AiAssetDensitySource,
  AiAssetOverlayPosition,
  AiAssetOverlayPositionSource,
  AiAssetPromptTarget,
  AiAssetSectionPromptType,
  AiAssetTextOverlayLevel,
  AiAssetTextOverlaySource,
  AiAssetTone,
} from "@/src/features/ai-assets/types";

const CAMPAIGN_FAMILY_LABELS: Record<AiAssetCampaignFamily, string> = {
  coupon: "クーポン訴求",
  point: "ポイント訴求",
  cashback: "還元訴求",
  discount: "割引訴求",
  present: "プレゼント訴求",
  entry: "参加訴求",
  seasonal: "季節訴求",
  new_opening: "新店訴求",
  awareness: "認知訴求",
  branding: "ブランド訴求",
  generic: "汎用訴求",
};

const SECTION_TYPE_LABELS: Record<AiAssetSectionPromptType, string> = {
  hero: "メインビジュアル向け",
  campaignPeriod: "期間案内向け",
  cv: "参加・利用案内向け",
  benefit: "特典訴求向け",
  feature: "特徴訴求向け",
  reason: "理由説明向け",
  step: "手順説明向け",
  useCase: "利用シーン向け",
  storeList: "対象店舗向け",
  faq: "FAQ向け",
  notice: "注意事項向け",
  cta: "CTA向け",
  free: "汎用セクション向け",
  unknown: "未判定",
};

const TARGET_LABELS: Record<AiAssetPromptTarget, string> = {
  heroImage: "ヒーロー画像",
  heroBackground: "ヒーロー背景",
  sectionBackground: "セクション背景",
  sectionImage: "セクション画像",
  sectionIcon: "セクションアイコン",
  bannerImage: "バナー画像",
  mainVisual: "メインビジュアル",
};

const TEXT_OVERLAY_LABELS: Record<AiAssetTextOverlayLevel, string> = {
  none: "余白なし",
  light: "少し余白",
  medium: "標準余白",
  strong: "しっかり余白",
};

const OVERLAY_POSITION_LABELS: Record<AiAssetOverlayPosition, string> = {
  left: "左に文字余白",
  right: "右に文字余白",
  top: "上に文字余白",
  bottom: "下に文字余白",
  center: "中央を空ける",
};

const DENSITY_LABELS: Record<AiAssetDensity, string> = {
  low: "すっきり",
  medium: "標準",
  high: "情報多め",
};

const SOURCE_LABELS: Record<
  AiAssetDensitySource | AiAssetTextOverlaySource | AiAssetOverlayPositionSource | "explicit" | "inferred" | "fallback",
  string
> = {
  explicit: "手動指定",
  preset: "既定値",
  inferred: "自動推定",
  fallback: "安全補完",
};

const TONE_LABELS: Record<AiAssetTone, string> = {
  clean: "クリーン",
  premium: "プレミアム",
  pop: "ポップ",
  energetic: "エネルギッシュ",
  natural: "ナチュラル",
  minimal: "ミニマル",
  luxury: "ラグジュアリー",
  friendly: "フレンドリー",
  trust: "信頼感",
  seasonal: "季節感",
};

const RULE_EXACT_LABELS: Record<string, string> = {
  "base:lp-usable": "LP向けの使いやすい構図",
  "base:locale": "日本向けトーン",
  "safety:strict-text": "文字安全性を強める",
  "safety:default": "文字安全性を維持",
  "copy-space-left": "左に文字を置きやすい構図",
  "copy-space-right": "右に文字を置きやすい構図",
  "low-noise-background": "背景を控えめにして可読性を確保",
  "first-view-impact": "メイン訴求向けの強い見せ方",
};

export const labelCampaignFamily = (value: AiAssetCampaignFamily) =>
  CAMPAIGN_FAMILY_LABELS[value] ?? value;

export const labelSectionType = (value: AiAssetSectionPromptType) =>
  SECTION_TYPE_LABELS[value] ?? value;

export const labelTarget = (value: AiAssetPromptTarget) =>
  TARGET_LABELS[value] ?? value;

export const labelTextOverlay = (value: AiAssetTextOverlayLevel) =>
  TEXT_OVERLAY_LABELS[value] ?? value;

export const labelOverlayPosition = (value: AiAssetOverlayPosition) =>
  OVERLAY_POSITION_LABELS[value] ?? value;

export const labelDensity = (value: AiAssetDensity) =>
  DENSITY_LABELS[value] ?? value;

export const labelSource = (
  value:
    | AiAssetDensitySource
    | AiAssetTextOverlaySource
    | AiAssetOverlayPositionSource
    | "explicit"
    | "inferred"
    | "fallback"
    | undefined,
) => (value ? SOURCE_LABELS[value] ?? value : "");

export const labelTone = (value: AiAssetTone) =>
  TONE_LABELS[value] ?? value;

export const formatAppliedRuleLabel = (value: string): string => {
  const rule = value.trim();
  if (!rule) {
    return "";
  }

  if (RULE_EXACT_LABELS[rule]) {
    return RULE_EXACT_LABELS[rule];
  }

  if (rule.startsWith("campaign-family:")) {
    return labelCampaignFamily(rule.slice("campaign-family:".length) as AiAssetCampaignFamily);
  }
  if (rule.startsWith("section-type:")) {
    return labelSectionType(rule.slice("section-type:".length) as AiAssetSectionPromptType);
  }
  if (rule.startsWith("target:")) {
    return `${labelTarget(rule.slice("target:".length) as AiAssetPromptTarget)}向け`;
  }
  if (rule.startsWith("target-bg:")) {
    return `${labelSectionType(rule.slice("target-bg:".length) as AiAssetSectionPromptType)}の背景向け補正`;
  }
  if (rule.startsWith("target-image:")) {
    return `${labelSectionType(rule.slice("target-image:".length) as AiAssetSectionPromptType)}の補助画像向け補正`;
  }
  if (rule.startsWith("text-overlay:")) {
    return `${labelTextOverlay(rule.slice("text-overlay:".length) as AiAssetTextOverlayLevel)}を優先`;
  }
  if (rule.startsWith("overlay-position:")) {
    return labelOverlayPosition(rule.slice("overlay-position:".length) as AiAssetOverlayPosition);
  }
  if (rule.startsWith("density:")) {
    return `${labelDensity(rule.slice("density:".length) as AiAssetDensity)}の画面密度`;
  }
  if (rule.startsWith("tone:")) {
    return `${labelTone(rule.slice("tone:".length) as AiAssetTone)}トーン`;
  }

  return rule.replace(/_/g, " ");
};
