import type {
  AiAssetCampaignFamily,
  BuildAssetPromptInput,
} from "@/src/features/ai-assets/types";

type CampaignFamilySource = "explicit" | "inferred" | "fallback";

type CampaignFamilyInferenceResult = {
  family: AiAssetCampaignFamily;
  source: CampaignFamilySource;
};

type Signal = {
  text: string;
  field: "name" | "summary" | "benefit" | "reward" | "keywords" | "section";
  fieldWeight: number;
};

type FamilyRule = {
  strong: string[];
  weak: string[];
  regexStrong?: RegExp[];
  regexWeak?: RegExp[];
};

const FAMILY_ORDER: AiAssetCampaignFamily[] = [
  "cashback",
  "point",
  "coupon",
  "discount",
  "present",
  "entry",
  "new_opening",
  "seasonal",
  "branding",
  "awareness",
  "generic",
];

const FAMILY_RULES: Record<AiAssetCampaignFamily, FamilyRule> = {
  coupon: {
    strong: ["クーポン", "割引クーポン", "配布クーポン", "利用クーポン", "限定クーポン", "coupon"],
    weak: ["クーポン配布", "クーポン利用", "coupon campaign"],
  },
  point: {
    strong: [
      "ポイント還元",
      "ポイント進呈",
      "ポイント付与",
      "pontaポイント",
      "ポイントアップ",
      "point back",
      "point up",
    ],
    weak: ["ポイント", "point"],
    regexStrong: [/\d+\s*倍\s*ポイント/u],
  },
  cashback: {
    strong: ["キャッシュバック", "cashback", "cash back", "現金還元", "実質還元", "後日還元"],
    weak: ["還元"],
  },
  discount: {
    strong: ["割引", "値引き", "円引き", "%off", "off", "プライスダウン"],
    weak: ["セール", "特価", "お得", "discount"],
    regexStrong: [/\d+\s*%\s*off/u, /\d+\s*円\s*引/u],
  },
  present: {
    strong: ["プレゼント", "ギフト", "景品", "当たる", "抽選で", "gift", "present"],
    weak: ["進呈", "もらえる", "抽選"],
  },
  entry: {
    strong: ["エントリー", "要エントリー", "応募", "キャンペーン参加", "entry"],
    weak: ["参加", "条件達成", "応募すると"],
  },
  seasonal: {
    strong: [
      "春",
      "夏",
      "秋",
      "冬",
      "新生活",
      "年末年始",
      "ゴールデンウィーク",
      "gw",
      "母の日",
      "父の日",
      "ハロウィン",
      "クリスマス",
    ],
    weak: ["季節", "season", "seasonal"],
  },
  new_opening: {
    strong: [
      "オープン記念",
      "グランドオープン",
      "リニューアルオープン",
      "新店",
      "開店",
      "開業",
    ],
    weak: ["オープン", "open", "new opening"],
  },
  awareness: {
    strong: ["認知", "知ってもらう", "はじめて", "デビュー", "まずは知る"],
    weak: ["お試し", "体験", "awareness"],
  },
  branding: {
    strong: ["ブランド", "世界観", "上質", "こだわり", "ストーリー", "コンセプト", "ラグジュアリー"],
    weak: ["プレミアム", "branding", "brand"],
  },
  generic: {
    strong: [],
    weak: [],
  },
};

const normalizeCampaignText = (value: string) => value.normalize("NFKC").toLowerCase();

const asText = (value: unknown) => (typeof value === "string" ? value.trim() : "");

const collectCampaignFamilySignals = (input: BuildAssetPromptInput): Signal[] => {
  const campaign = input.campaign;
  const section = input.section;

  const keywordText = Array.isArray(campaign?.keywords)
    ? campaign.keywords.filter((entry): entry is string => typeof entry === "string").join(" ")
    : "";

  const raw: Signal[] = [
    { text: asText(campaign?.name), field: "name", fieldWeight: 3.0 },
    { text: asText(campaign?.summary), field: "summary", fieldWeight: 2.2 },
    { text: asText(campaign?.benefitText), field: "benefit", fieldWeight: 2.4 },
    { text: asText(campaign?.rewardText), field: "reward", fieldWeight: 2.8 },
    { text: asText(keywordText), field: "keywords", fieldWeight: 1.4 },
    { text: asText(section?.title), field: "section", fieldWeight: 1.0 },
  ];

  return raw
    .map((entry) => ({ ...entry, text: normalizeCampaignText(entry.text) }))
    .filter((entry) => entry.text.length > 0);
};

const scoreCampaignFamily = (
  signals: Signal[],
): Record<AiAssetCampaignFamily, number> => {
  const scores: Record<AiAssetCampaignFamily, number> = {
    coupon: 0,
    point: 0,
    cashback: 0,
    discount: 0,
    present: 0,
    entry: 0,
    seasonal: 0,
    new_opening: 0,
    awareness: 0,
    branding: 0,
    generic: 0,
  };

  for (const family of Object.keys(FAMILY_RULES) as AiAssetCampaignFamily[]) {
    if (family === "generic") {
      continue;
    }
    const rule = FAMILY_RULES[family];

    for (const signal of signals) {
      const strongHit = rule.strong.some((token) => signal.text.includes(normalizeCampaignText(token)));
      if (strongHit) {
        scores[family] += 3.0 * signal.fieldWeight;
      }

      const weakHit = rule.weak.some((token) => signal.text.includes(normalizeCampaignText(token)));
      if (weakHit) {
        scores[family] += 1.3 * signal.fieldWeight;
      }

      if (rule.regexStrong?.some((exp) => exp.test(signal.text))) {
        scores[family] += 3.2 * signal.fieldWeight;
      }
      if (rule.regexWeak?.some((exp) => exp.test(signal.text))) {
        scores[family] += 1.0 * signal.fieldWeight;
      }
    }
  }

  // Small combination bias for practical LP patterns.
  const wholeText = signals.map((entry) => entry.text).join(" ");
  if (wholeText.includes("ポイント") && wholeText.includes("還元")) {
    scores.point += 3.0;
  }
  if (wholeText.includes("キャッシュバック")) {
    scores.cashback += 3.8;
  }
  if (wholeText.includes("抽選") && (wholeText.includes("プレゼント") || wholeText.includes("景品"))) {
    scores.present += 2.6;
  }
  if (wholeText.includes("オープン記念")) {
    scores.new_opening += 3.0;
  }
  if (wholeText.includes("セール") && wholeText.includes("新生活")) {
    scores.seasonal += 1.4;
    scores.discount += 1.4;
  }

  return scores;
};

const pickTopFamily = (scores: Record<AiAssetCampaignFamily, number>) => {
  const sorted = FAMILY_ORDER.filter((family) => family !== "generic")
    .map((family) => ({ family, score: scores[family] }))
    .sort((a, b) => {
      if (a.score !== b.score) {
        return b.score - a.score;
      }
      return FAMILY_ORDER.indexOf(a.family) - FAMILY_ORDER.indexOf(b.family);
    });

  return {
    first: sorted[0],
    second: sorted[1],
  };
};

export const inferCampaignFamily = (
  input: BuildAssetPromptInput,
): CampaignFamilyInferenceResult => {
  if (input.campaign?.family) {
    return {
      family: input.campaign.family,
      source: "explicit",
    };
  }

  const signals = collectCampaignFamilySignals(input);
  if (signals.length === 0) {
    return {
      family: "generic",
      source: "fallback",
    };
  }

  const scores = scoreCampaignFamily(signals);
  const { first, second } = pickTopFamily(scores);
  const topScore = first?.score ?? 0;
  const secondScore = second?.score ?? 0;
  const scoreGap = topScore - secondScore;

  // Conservative fallback: uncertain cases should stay generic.
  if (topScore < 4.5) {
    return {
      family: "generic",
      source: "fallback",
    };
  }

  if (scoreGap < 1.8 && topScore < 8.5) {
    return {
      family: "generic",
      source: "fallback",
    };
  }

  return {
    family: first.family,
    source: "inferred",
  };
};
