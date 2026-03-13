import type {
  AiAssetSectionPromptType,
  BuildAssetPromptInput,
} from "@/src/features/ai-assets/types";

type SectionTypeSource = "explicit" | "inferred" | "fallback";

type SectionTypeInferenceResult = {
  sectionType: AiAssetSectionPromptType;
  source: SectionTypeSource;
};

type SignalField =
  | "title"
  | "description"
  | "caption"
  | "name"
  | "label"
  | "keywords"
  | "campaign";

type Signal = {
  text: string;
  field: SignalField;
  fieldWeight: number;
};

type SectionRule = {
  strong: string[];
  weak: string[];
  regexStrong?: RegExp[];
};

const SECTION_TYPE_ORDER: AiAssetSectionPromptType[] = [
  "hero",
  "campaignPeriod",
  "cv",
  "benefit",
  "feature",
  "reason",
  "step",
  "useCase",
  "storeList",
  "faq",
  "notice",
  "cta",
  "free",
  "unknown",
];

const SECTION_TYPE_RULES: Record<Exclude<AiAssetSectionPromptType, "free" | "unknown">, SectionRule> = {
  hero: {
    strong: ["メイン", "キービジュアル", "メインビジュアル", "ファーストビュー", "fv", "ヒーロー", "冒頭", "hero"],
    weak: ["main visual", "first view"],
  },
  campaignPeriod: {
    strong: ["開催期間", "実施期間", "キャンペーン期間", "対象期間", "何月何日まで"],
    weak: ["期間", "日程", "いつまで", "期限"],
    regexStrong: [/\d{1,2}\s*月\s*\d{1,2}\s*日/u, /\d{4}\s*[\/.年-]\s*\d{1,2}/u],
  },
  cv: {
    strong: ["参加方法", "ご利用方法", "適用条件", "達成条件", "利用条件", "応募条件"],
    weak: ["利用方法", "方法", "条件", "エントリー方法", "申し込み方法"],
  },
  benefit: {
    strong: ["特典", "ベネフィット", "還元内容", "プレゼント内容", "もらえる", "受け取れる"],
    weak: ["お得", "メリット", "付与", "進呈"],
  },
  feature: {
    strong: ["注目ポイント", "おすすめポイント", "できること", "機能", "魅力", "feature"],
    weak: ["特徴", "特長", "ポイント"],
  },
  reason: {
    strong: ["選ばれる理由", "支持される理由", "なぜ", "信頼", "納得"],
    weak: ["理由", "根拠", "安心"],
  },
  step: {
    strong: ["ご利用の流れ", "3ステップ", "かんたん", "簡単", "まずは"],
    weak: ["ステップ", "手順", "流れ", "使い方", "step"],
    regexStrong: [/[0-9一二三四五]\s*ステップ/u],
  },
  useCase: {
    strong: ["利用シーン", "活用例", "おすすめの使い方", "こんな方に", "こういう人に"],
    weak: ["こんなとき", "シーン", "ケース", "ユースケース", "use case"],
  },
  storeList: {
    strong: ["対象店舗", "店舗一覧", "対象ショップ", "利用可能店舗", "使えるお店", "ショップ一覧"],
    weak: ["対象店", "店名", "店舗", "ショップ"],
  },
  faq: {
    strong: ["よくある質問", "faq", "q&a", "qa", "お問い合わせ前に"],
    weak: ["質問", "疑問", "q a"],
  },
  notice: {
    strong: ["注意事項", "留意事項", "免責", "対象外", "条件詳細"],
    weak: ["ご注意", "注意", "但し", "注記"],
  },
  cta: {
    strong: ["今すぐ", "エントリーはこちら", "詳しくはこちら", "申し込む", "参加する", "クーポンを取得", "cta"],
    weak: ["申込", "応募する", "ボタン", "こちら"],
  },
};

const normalizeSectionText = (value: string) => value.normalize("NFKC").toLowerCase();

const asText = (value: unknown) => (typeof value === "string" ? value.trim() : "");

const collectSectionTypeSignals = (input: BuildAssetPromptInput): Signal[] => {
  const section = input.section;
  const campaign = input.campaign;

  const keywordText = Array.isArray(section?.keywords)
    ? section.keywords.filter((entry): entry is string => typeof entry === "string").join(" ")
    : "";

  const campaignText = [campaign?.name, campaign?.summary].map((entry) => asText(entry)).filter(Boolean).join(" ");

  const raw: Signal[] = [
    { text: asText(section?.title), field: "title", fieldWeight: 3.2 },
    { text: asText(section?.description), field: "description", fieldWeight: 2.4 },
    { text: asText(section?.caption), field: "caption", fieldWeight: 1.9 },
    { text: asText(section?.name), field: "name", fieldWeight: 1.8 },
    { text: asText(section?.label), field: "label", fieldWeight: 1.6 },
    { text: asText(keywordText), field: "keywords", fieldWeight: 1.4 },
    { text: asText(campaignText), field: "campaign", fieldWeight: 0.7 },
  ];

  return raw
    .map((entry) => ({ ...entry, text: normalizeSectionText(entry.text) }))
    .filter((entry) => entry.text.length > 0);
};

const emptyScores = (): Record<AiAssetSectionPromptType, number> => ({
  hero: 0,
  campaignPeriod: 0,
  cv: 0,
  benefit: 0,
  feature: 0,
  reason: 0,
  step: 0,
  useCase: 0,
  storeList: 0,
  faq: 0,
  notice: 0,
  cta: 0,
  free: 0,
  unknown: 0,
});

const scoreSectionType = (signals: Signal[]): Record<AiAssetSectionPromptType, number> => {
  const scores = emptyScores();

  for (const sectionType of Object.keys(SECTION_TYPE_RULES) as Array<Exclude<AiAssetSectionPromptType, "free" | "unknown">>) {
    const rule = SECTION_TYPE_RULES[sectionType];

    for (const signal of signals) {
      const strongHit = rule.strong.some((token) => signal.text.includes(normalizeSectionText(token)));
      if (strongHit) {
        scores[sectionType] += 3.1 * signal.fieldWeight;
      }

      const weakHit = rule.weak.some((token) => signal.text.includes(normalizeSectionText(token)));
      if (weakHit) {
        scores[sectionType] += 1.25 * signal.fieldWeight;
      }

      if (rule.regexStrong?.some((pattern) => pattern.test(signal.text))) {
        scores[sectionType] += 3.3 * signal.fieldWeight;
      }
    }
  }

  const wholeText = signals.map((entry) => entry.text).join(" ");
  if (wholeText.includes("特典") && (wholeText.includes("条件") || wholeText.includes("利用方法"))) {
    scores.benefit += 1.0;
    scores.cv += 1.3;
  }
  if (wholeText.includes("期間") && (wholeText.includes("注意") || wholeText.includes("対象外"))) {
    scores.campaignPeriod += 0.8;
    scores.notice += 0.8;
  }
  if (wholeText.includes("流れ") && (wholeText.includes("対象店舗") || wholeText.includes("店舗"))) {
    scores.step += 0.8;
    scores.storeList += 0.8;
  }
  if ((wholeText.includes("faq") || wholeText.includes("よくある質問")) && wholeText.includes("注意")) {
    scores.faq += 1.0;
    scores.notice += 1.0;
  }

  return scores;
};

const pickTopSectionType = (scores: Record<AiAssetSectionPromptType, number>) => {
  const sorted = SECTION_TYPE_ORDER.filter((entry) => entry !== "free" && entry !== "unknown")
    .map((sectionType) => ({ sectionType, score: scores[sectionType] }))
    .sort((a, b) => {
      if (a.score !== b.score) {
        return b.score - a.score;
      }
      return SECTION_TYPE_ORDER.indexOf(a.sectionType) - SECTION_TYPE_ORDER.indexOf(b.sectionType);
    });

  return {
    first: sorted[0],
    second: sorted[1],
    closeCount: sorted.filter((entry) => sorted[0] && sorted[0].score - entry.score < 1.2 && entry.score > 0).length,
  };
};

const safeFallbackSectionType = (signals: Signal[], topScore: number, secondScore: number, closeCount: number): AiAssetSectionPromptType => {
  if (signals.length === 0) {
    return "unknown";
  }

  const textVolume = signals.reduce((sum, entry) => sum + entry.text.length, 0);
  const scoreGap = topScore - secondScore;

  if (topScore < 4.2) {
    return textVolume >= 10 ? "free" : "unknown";
  }

  if (closeCount >= 3 && topScore < 10.0) {
    return textVolume >= 16 ? "free" : "unknown";
  }

  if (scoreGap < 1.6 && topScore < 8.8) {
    return textVolume >= 12 ? "free" : "unknown";
  }

  return "unknown";
};

export const inferSectionType = (input: BuildAssetPromptInput): SectionTypeInferenceResult => {
  const explicitSectionType = input.section?.type;
  if (explicitSectionType && explicitSectionType !== "unknown") {
    return {
      sectionType: explicitSectionType,
      source: "explicit",
    };
  }

  const signals = collectSectionTypeSignals(input);
  if (signals.length === 0) {
    return {
      sectionType: "unknown",
      source: "fallback",
    };
  }

  const scores = scoreSectionType(signals);
  const { first, second, closeCount } = pickTopSectionType(scores);
  const topScore = first?.score ?? 0;
  const secondScore = second?.score ?? 0;

  if (!first || topScore <= 0) {
    return {
      sectionType: safeFallbackSectionType(signals, topScore, secondScore, closeCount),
      source: "fallback",
    };
  }

  const fallbackType = safeFallbackSectionType(signals, topScore, secondScore, closeCount);
  if (fallbackType !== "unknown") {
    if (topScore < 4.2 || (topScore - secondScore < 1.6 && topScore < 8.8) || closeCount >= 3) {
      return {
        sectionType: fallbackType,
        source: "fallback",
      };
    }
  } else if (topScore < 4.2 || (topScore - secondScore < 1.6 && topScore < 8.8) || closeCount >= 3) {
    return {
      sectionType: "unknown",
      source: "fallback",
    };
  }

  return {
    sectionType: first.sectionType,
    source: "inferred",
  };
};