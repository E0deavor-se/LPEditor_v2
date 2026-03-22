/**
 * AI Canvas Engine – 最小構成
 *
 * Canvasモードで section 単位の背景・画像を AI 生成する中核ロジック。
 * 既存の /api/ai-assets/generate → /api/ai-assets/jobs/[jobId] 導線を再利用する。
 *
 * 設計方針:
 * - 既存 buildAssetPrompt() を再利用してプロンプトを組み立てる
 * - 生成物は editorStore.addAsset() で登録 → Canvas layer or section 背景として挿入
 * - 新しい scene graph や独自 schema は最小限
 * - Campaign Structure Engine との整合: campaignType / themeId を生成コンテキストに使う
 */

import type {
  AiAssetPromptTarget,
  AiAssetSectionPromptType,
  AiAssetGenerationJob,
  AiAssetCampaignFamily,
  AiAssetRole,
  AiAssetDensity,
  AiAssetOverlayPosition,
  AiAssetTone,
} from "@/src/features/ai-assets/types";
import { buildAssetPrompt } from "@/src/features/ai-assets/lib/buildAssetPrompt";
import { resolveThemeColors } from "@/src/lib/theme/applyTheme";

// ── Canvas AI が扱うターゲット（既存 AiAssetPromptTarget のサブセット） ──────
export type CanvasAiActionTarget =
  | "heroImage"
  | "heroBackground"
  | "sectionBackground"
  | "sectionImage";

export type CanvasAiDecorationKind = "badge" | "ribbon" | "icon" | "shape";

/** UI ラベルマップ */
export const CANVAS_AI_TARGET_LABELS: Record<CanvasAiActionTarget, string> = {
  heroImage: "Hero 画像を生成",
  heroBackground: "Hero 背景を生成",
  sectionBackground: "セクション背景を生成",
  sectionImage: "セクション画像を生成",
};

export const CANVAS_AI_DECORATION_LABELS: Record<CanvasAiDecorationKind, string> = {
  badge: "バッジを生成",
  ribbon: "リボンを生成",
  icon: "アイコン装飾を生成",
  shape: "shape 装飾を生成",
};

// ── セクション名から AiAssetSectionPromptType を推定 ─────────────────────────

const SECTION_NAME_PATTERNS: [RegExp, AiAssetSectionPromptType][] = [
  [/ヒーロー|トップ|メイン|hero|main/i, "hero"],
  [/cta|cv|コンバージョン|申込|応募|エントリー|entry/i, "cv"],
  [/特典|ベネフィット|benefit|お得/i, "benefit"],
  [/特徴|フィーチャー|feature|ポイント(?!還元)/i, "feature"],
  [/理由|reason|なぜ|選ばれ/i, "reason"],
  [/使い方|ステップ|step|手順/i, "step"],
  [/ランキング|ranking/i, "feature"],
  [/期間|period|スケジュール/i, "campaignPeriod"],
  [/faq|よくある質問/i, "faq"],
  [/注意|notice|免責/i, "notice"],
  [/フッター|footer|店舗|store/i, "storeList"],
  [/事例|usecase/i, "useCase"],
];

export const inferSectionTypeFromName = (name: string): AiAssetSectionPromptType => {
  for (const [pattern, type] of SECTION_NAME_PATTERNS) {
    if (pattern.test(name)) {
      return type;
    }
  }
  return "unknown";
};

// ── 生成パラメータ ────────────────────────────────────────────────────────────

export type CanvasAiGenerateParams = {
  target: CanvasAiActionTarget;
  /** 選択中の Canvas セクション名（プロンプト推定に使う） */
  sectionName?: string;
  /** 選択中の Canvas セクション ID（API sectionId として使う） */
  sectionId?: string;
  /** project.meta.campaignType */
  campaignType?: string;
  /** project.meta.themeId */
  themeId?: string;
  /** theme のブランドカラー */
  brandPrimaryColor?: string;
  /** Canvas の PC 設計幅 */
  pcWidth: number;
};

export type CanvasAiDecorationGenerateParams = Omit<CanvasAiGenerateParams, "target"> & {
  decorationKind: CanvasAiDecorationKind;
  brandSecondaryColor?: string;
  visualWeight?: "low" | "medium" | "high";
  spacingScale?: "compact" | "normal" | "relaxed";
};

const CAMPAIGN_FAMILY_MAP: Partial<Record<string, AiAssetCampaignFamily>> = {
  coupon: "coupon",
  pointReward: "point",
  ranking: "point",
  generic: "generic",
};

const buildDimensions = (target: CanvasAiActionTarget, pcWidth: number) => {
  const safeWidth = Math.min(1365, Math.max(256, pcWidth));
  if (target === "heroImage" || target === "heroBackground") {
    return { width: safeWidth, height: Math.round(safeWidth * 0.56) };
  }
  if (target === "sectionBackground") {
    return { width: safeWidth, height: Math.round(safeWidth * 0.4) };
  }
  // sectionImage
  return { width: 900, height: 600 };
};

const buildDecorationDimensions = (kind: CanvasAiDecorationKind) => {
  if (kind === "ribbon") {
    return { width: 720, height: 240 };
  }
  if (kind === "shape") {
    return { width: 640, height: 360 };
  }
  return { width: 512, height: 512 };
};

type CanvasDecorationProfile = "hero" | "cta" | "ranking" | "couponGuide" | "benefit" | "quiet" | "generic";

const inferDecorationProfile = (sectionName: string): CanvasDecorationProfile => {
  if (/ヒーロー|トップ|メイン|hero|main/i.test(sectionName)) return "hero";
  if (/cta|cv|コンバージョン|申込|応募|エントリー|entry/i.test(sectionName)) return "cta";
  if (/ランキング|ranking|順位|王冠/i.test(sectionName)) return "ranking";
  if (/使い方|guide|coupon|クーポン|手順|ステップ/i.test(sectionName)) return "couponGuide";
  if (/benefit|feature|reason|特典|特徴|理由|ベネフィット/i.test(sectionName)) return "benefit";
  if (/faq|notice|店舗|store|footer|フッター|注意/i.test(sectionName)) return "quiet";
  return "generic";
};

// ── AI セット識別 ─────────────────────────────────────────────────────────────

export type CanvasAiSetType =
  | "heroSet"
  | "ctaSet"
  | "benefitSet"
  | "featureSet"
  | "rankingSet"
  | "couponGuideSet"
  | "genericSet";

export const CANVAS_AI_SET_LABELS: Record<CanvasAiSetType, string> = {
  heroSet:        "AI Hero セット",
  ctaSet:         "AI CTA セット",
  benefitSet:     "AI Benefit セット",
  featureSet:     "AI Feature セット",
  rankingSet:     "AI Ranking セット",
  couponGuideSet: "AI Coupon セット",
  genericSet:     "AI セット",
};

/** 一意な AI バッチ識別子を生成する */
export const generateAiBatchId = (): string =>
  `aibatch_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`;

/** セクション名から AI セット種別を推定する */
export const inferAiSetType = (sectionName: string): CanvasAiSetType => {
  const profile = inferDecorationProfile(sectionName);
  const map: Record<CanvasDecorationProfile, CanvasAiSetType> = {
    hero:        "heroSet",
    cta:         "ctaSet",
    ranking:     "rankingSet",
    couponGuide: "couponGuideSet",
    benefit:     "benefitSet",
    quiet:       "genericSet",
    generic:     "genericSet",
  };
  return map[profile];
};

const buildDecorationKeywords = (kind: CanvasAiDecorationKind, sectionName: string): string[] => {
  const profile = inferDecorationProfile(sectionName);
  const base = [`decoration:${kind}`, `profile:${profile}`];

  if (kind === "badge") {
    base.push("badge", "sticker", "promotional accent");
  } else if (kind === "ribbon") {
    base.push("ribbon", "banner accent", "heading-side accent");
  } else if (kind === "icon") {
    base.push("icon", "campaign motif", "small decorative mark");
  } else {
    base.push("shape", "abstract accent", "highlight shape");
  }

  if (profile === "ranking") {
    base.push("crown", "gold accent", "rank emphasis");
  } else if (profile === "couponGuide") {
    base.push("ticket", "coupon motif", "campaign guide accent");
  } else if (profile === "cta") {
    base.push("cta support", "conversion accent");
  } else if (profile === "hero") {
    base.push("hero support decoration", "campaign highlight");
  }

  return base;
};

const inferDecorationTone = (kind: CanvasAiDecorationKind, sectionName: string): AiAssetTone => {
  const profile = inferDecorationProfile(sectionName);
  if (profile === "ranking") return "premium";
  if (profile === "hero" && kind === "ribbon") return "energetic";
  if (profile === "cta") return "pop";
  if (kind === "shape") return "minimal";
  return "clean";
};

const inferDecorationDensity = (kind: CanvasAiDecorationKind, sectionName: string): AiAssetDensity => {
  const profile = inferDecorationProfile(sectionName);
  if (profile === "hero" && kind !== "shape") return "medium";
  if (profile === "quiet") return "low";
  if (kind === "shape") return "low";
  return "medium";
};

const inferDecorationOverlayPosition = (kind: CanvasAiDecorationKind): AiAssetOverlayPosition => {
  if (kind === "ribbon") return "top";
  return "center";
};

export type CanvasAiDecorationPlacement = {
  x: number;
  y: number;
  w: number;
  h: number;
  z: number;
};

export const buildCanvasDecorationPlacement = (
  kind: CanvasAiDecorationKind,
  sectionName: string,
  pcWidth: number,
  visualWeight: "low" | "medium" | "high" = "medium",
): CanvasAiDecorationPlacement => {
  const profile = inferDecorationProfile(sectionName);
  const scale = visualWeight === "high" ? 1.08 : visualWeight === "low" ? 0.88 : 1;
  const scaled = (value: number) => Math.round(value * scale);

  if (profile === "hero") {
    if (kind === "badge") return { x: 28, y: 12, w: scaled(164), h: scaled(164), z: 18 };
    if (kind === "ribbon") return { x: Math.max(24, pcWidth - scaled(320)), y: 18, w: scaled(280), h: scaled(92), z: 17 };
    if (kind === "icon") return { x: Math.max(24, pcWidth - scaled(150)), y: 128, w: scaled(104), h: scaled(104), z: 16 };
    return { x: Math.max(24, pcWidth - scaled(280)), y: 86, w: scaled(220), h: scaled(150), z: 14 };
  }

  if (profile === "cta") {
    if (kind === "badge") return { x: Math.max(24, pcWidth - scaled(156)), y: 12, w: scaled(136), h: scaled(136), z: 18 };
    if (kind === "icon") return { x: 28, y: 24, w: scaled(88), h: scaled(88), z: 16 };
    if (kind === "ribbon") return { x: 24, y: 12, w: scaled(220), h: scaled(76), z: 16 };
    return { x: 20, y: 18, w: scaled(180), h: scaled(96), z: 14 };
  }

  if (profile === "ranking") {
    if (kind === "badge") return { x: Math.max(24, pcWidth - scaled(170)), y: 14, w: scaled(148), h: scaled(148), z: 18 };
    if (kind === "icon") return { x: Math.max(24, pcWidth - scaled(132)), y: 112, w: scaled(92), h: scaled(92), z: 17 };
    if (kind === "ribbon") return { x: 24, y: 12, w: scaled(244), h: scaled(84), z: 16 };
    return { x: 18, y: 18, w: scaled(200), h: scaled(108), z: 14 };
  }

  if (profile === "benefit") {
    if (kind === "badge") return { x: Math.max(24, pcWidth - scaled(136)), y: 12, w: scaled(112), h: scaled(112), z: 15 };
    if (kind === "ribbon") return { x: 24, y: 16, w: scaled(210), h: scaled(68), z: 14 };
    if (kind === "icon") return { x: 20, y: 20, w: scaled(80), h: scaled(80), z: 14 };
    return { x: Math.max(24, pcWidth - scaled(220)), y: 12, w: scaled(180), h: scaled(84), z: 12 };
  }

  if (profile === "quiet") {
    return { x: Math.max(24, pcWidth - scaled(210)), y: 12, w: scaled(170), h: scaled(76), z: 10 };
  }

  return kind === "badge"
    ? { x: Math.max(24, pcWidth - scaled(152)), y: 12, w: scaled(128), h: scaled(128), z: 15 }
    : kind === "ribbon"
      ? { x: 24, y: 12, w: scaled(220), h: scaled(72), z: 14 }
      : kind === "icon"
        ? { x: 24, y: 24, w: scaled(88), h: scaled(88), z: 14 }
        : { x: Math.max(24, pcWidth - scaled(220)), y: 14, w: scaled(180), h: scaled(90), z: 12 };
};

const POLL_INTERVAL_MS = 1500;
const POLL_TIMEOUT_MS = 90000;

// ── メイン: 生成 → ポーリング → imageUrl を返す ──────────────────────────────

/**
 * AI 画像生成を実行し、完成した imageUrl を返す。
 * 描画への挿入は呼び出し側で行う（addAsset + addLayer or updateSection）。
 */
export const runCanvasAiGenerate = async (
  params: CanvasAiGenerateParams,
): Promise<{ imageUrl: string }> => {
  const {
    target,
    sectionName = "",
    sectionId,
    campaignType,
    themeId,
    brandPrimaryColor,
    pcWidth,
  } = params;

  const sectionType = inferSectionTypeFromName(sectionName);
  const campaignFamily = campaignType ? CAMPAIGN_FAMILY_MAP[campaignType] : undefined;
  const dims = buildDimensions(target, pcWidth);

  const built = buildAssetPrompt({
    target: target as AiAssetPromptTarget,
    campaign: {
      family: campaignFamily ?? undefined,
    },
    section: {
      id: sectionId,
      type: sectionType,
      title: sectionName || undefined,
    },
    brand: {
      primaryColor: brandPrimaryColor,
      styleKeywords: themeId ? [themeId] : undefined,
    },
    options: {
      locale: "ja",
      preferJapaneseLpStyle: true,
    },
  });

  const role: AiAssetRole =
    target === "heroImage" || target === "heroBackground" ? "heroPc" : "sectionImage";

  // Canvas セクション ID を Layout モードの sectionId と衝突させないよう prefix を付ける
  const canonicalSectionId = sectionId
    ? `canvas_${sectionId}`
    : `canvas_${target}_${Date.now()}`;

  const generateRes = await fetch("/api/ai-assets/generate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      sectionId: canonicalSectionId,
      sectionType,
      role,
      prompt: built.prompt,
      negativePrompt: built.negativePrompt,
      width: dims.width,
      height: dims.height,
    }),
  });

  if (!generateRes.ok) {
    const errorBody = (await generateRes.json().catch(() => ({}))) as { error?: string };
    throw new Error(errorBody.error ?? "AI生成を開始できませんでした。");
  }

  const { jobId } = (await generateRes.json()) as { jobId: string };

  // ── ポーリング ──────────────────────────────────────────────────────────
  const start = Date.now();
  while (Date.now() - start < POLL_TIMEOUT_MS) {
    await new Promise<void>((resolve) => window.setTimeout(resolve, POLL_INTERVAL_MS));

    const jobRes = await fetch(`/api/ai-assets/jobs/${jobId}`, { cache: "no-store" });
    if (!jobRes.ok) {
      const errorBody = (await jobRes.json().catch(() => ({}))) as { error?: string; message?: string };
      throw new Error(errorBody.error ?? errorBody.message ?? "AI生成の状況を確認できませんでした。");
    }
    const job = (await jobRes.json()) as AiAssetGenerationJob;

    if (job.status === "succeeded") {
      const imageUrl = job.generatedAsset?.imageUrl;
      if (!imageUrl) {
        throw new Error("生成された画像のURLを取得できませんでした。");
      }
      return { imageUrl };
    }

    if (job.status === "failed") {
      throw new Error(job.error ?? "AI生成に失敗しました。");
    }
  }

  throw new Error("AI生成がタイムアウトしました。もう一度お試しください。");
};

export const runCanvasAiDecorationGenerate = async (
  params: CanvasAiDecorationGenerateParams,
): Promise<{ imageUrl: string; kind: CanvasAiDecorationKind }> => {
  const {
    decorationKind,
    sectionName = "",
    sectionId,
    campaignType,
    themeId,
    brandPrimaryColor,
    brandSecondaryColor,
  } = params;

  const sectionType = inferSectionTypeFromName(sectionName);
  const campaignFamily = campaignType ? CAMPAIGN_FAMILY_MAP[campaignType] : undefined;
  const themeColors = resolveThemeColors(themeId);
  const dims = buildDecorationDimensions(decorationKind);

  const built = buildAssetPrompt({
    target: "sectionIcon",
    campaign: {
      family: campaignFamily ?? undefined,
    },
    section: {
      id: sectionId,
      type: sectionType,
      title: sectionName || undefined,
      keywords: buildDecorationKeywords(decorationKind, sectionName),
    },
    creative: {
      tone: inferDecorationTone(decorationKind, sectionName),
      textOverlay: "none",
      textOverlaySourceHint: "explicit",
      density: inferDecorationDensity(decorationKind, sectionName),
      densitySourceHint: "explicit",
      overlayPosition: inferDecorationOverlayPosition(decorationKind),
      overlayPositionSourceHint: "explicit",
    },
    brand: {
      primaryColor: brandPrimaryColor ?? themeColors?.accent,
      secondaryColor: brandSecondaryColor ?? themeColors?.border,
      styleKeywords: [themeId, `decoration-${decorationKind}`].filter(Boolean) as string[],
    },
    options: {
      locale: "ja",
      preferJapaneseLpStyle: true,
      strictTextSafety: true,
    },
  });

  const canonicalSectionId = sectionId
    ? `canvas_${sectionId}_decoration`
    : `canvas_decoration_${decorationKind}_${Date.now()}`;

  const generateRes = await fetch("/api/ai-assets/generate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      sectionId: canonicalSectionId,
      sectionType,
      role: "sectionIcon" as AiAssetRole,
      prompt: built.prompt,
      negativePrompt: built.negativePrompt,
      width: dims.width,
      height: dims.height,
    }),
  });

  if (!generateRes.ok) {
    const errorBody = (await generateRes.json().catch(() => ({}))) as { error?: string };
    throw new Error(errorBody.error ?? "装飾AI生成を開始できませんでした。");
  }

  const { jobId } = (await generateRes.json()) as { jobId: string };

  const start = Date.now();
  while (Date.now() - start < POLL_TIMEOUT_MS) {
    await new Promise<void>((resolve) => window.setTimeout(resolve, POLL_INTERVAL_MS));

    const jobRes = await fetch(`/api/ai-assets/jobs/${jobId}`, { cache: "no-store" });
    if (!jobRes.ok) {
      const errorBody = (await jobRes.json().catch(() => ({}))) as { error?: string; message?: string };
      throw new Error(errorBody.error ?? errorBody.message ?? "装飾AI生成の状況を確認できませんでした。");
    }
    const job = (await jobRes.json()) as AiAssetGenerationJob;

    if (job.status === "succeeded") {
      const imageUrl = job.generatedAsset?.imageUrl;
      if (!imageUrl) {
        throw new Error("生成された装飾画像のURLを取得できませんでした。");
      }
      return { imageUrl, kind: decorationKind };
    }

    if (job.status === "failed") {
      throw new Error(job.error ?? "装飾AI生成に失敗しました。");
    }
  }

  throw new Error("装飾AI生成がタイムアウトしました。もう一度お試しください。");
};

// ── セクションデザイン一発適用 ─────────────────────────────────────────────────

/**
 * sectionType ごとに「何をまとめて生成するか」を決めるマップ。
 * backgroundTarget : 背景として updateSection に適用するターゲット
 * imageTargets     : image layer として addLayer する追加ターゲット（0~2本）
 */
const SECTION_DESIGN_PLANS: Record<
  AiAssetSectionPromptType | "_default",
  { backgroundTarget: CanvasAiActionTarget; imageTargets: CanvasAiActionTarget[] }
> = {
  hero:           { backgroundTarget: "heroBackground",    imageTargets: ["heroImage"] },
  cv:             { backgroundTarget: "sectionBackground", imageTargets: ["sectionImage"] },
  benefit:        { backgroundTarget: "sectionBackground", imageTargets: ["sectionImage"] },
  feature:        { backgroundTarget: "sectionBackground", imageTargets: ["sectionImage"] },
  reason:         { backgroundTarget: "sectionBackground", imageTargets: ["sectionImage"] },
  step:           { backgroundTarget: "sectionBackground", imageTargets: ["sectionImage"] },
  useCase:        { backgroundTarget: "sectionBackground", imageTargets: ["sectionImage"] },
  storeList:      { backgroundTarget: "sectionBackground", imageTargets: [] },
  campaignPeriod: { backgroundTarget: "sectionBackground", imageTargets: ["sectionImage"] },
  faq:            { backgroundTarget: "sectionBackground", imageTargets: [] },
  notice:         { backgroundTarget: "sectionBackground", imageTargets: [] },
  cta:            { backgroundTarget: "sectionBackground", imageTargets: ["sectionImage"] },
  free:           { backgroundTarget: "sectionBackground", imageTargets: ["sectionImage"] },
  unknown:        { backgroundTarget: "sectionBackground", imageTargets: ["sectionImage"] },
  _default:       { backgroundTarget: "sectionBackground", imageTargets: ["sectionImage"] },
};

export type CanvasSectionDesignPlan = {
  backgroundTarget: CanvasAiActionTarget;
  imageTargets: CanvasAiActionTarget[];
};

export type CanvasSectionDecorationPlan = {
  decorationKinds: CanvasAiDecorationKind[];
};

/** sectionType → 一発適用計画を返す */
export const buildCanvasSectionDesignPlan = (
  sectionName: string,
): CanvasSectionDesignPlan => {
  const sectionType = inferSectionTypeFromName(sectionName);
  return SECTION_DESIGN_PLANS[sectionType] ?? SECTION_DESIGN_PLANS._default;
};

export const buildCanvasDecorationPlan = (
  sectionName: string,
  visualWeight: "low" | "medium" | "high" = "medium",
): CanvasSectionDecorationPlan => {
  const profile = inferDecorationProfile(sectionName);
  const decorationKinds = (() => {
    if (profile === "hero") return ["badge", "ribbon"] as CanvasAiDecorationKind[];
    if (profile === "cta") return ["badge", "shape"] as CanvasAiDecorationKind[];
    if (profile === "ranking") return ["badge", "icon"] as CanvasAiDecorationKind[];
    if (profile === "couponGuide") return ["icon", "badge"] as CanvasAiDecorationKind[];
    if (profile === "benefit") {
      return visualWeight === "high"
        ? (["badge", "shape"] as CanvasAiDecorationKind[])
        : (["badge"] as CanvasAiDecorationKind[]);
    }
    if (profile === "quiet") return ["shape"] as CanvasAiDecorationKind[];
    return visualWeight === "low"
      ? (["shape"] as CanvasAiDecorationKind[])
      : (["badge"] as CanvasAiDecorationKind[]);
  })();

  return { decorationKinds };
};

/**
 * 一発適用の結果型。
 * Promise.allSettled を使うので部分成功を許容する。
 */
export type CanvasAiSectionDesignResult = {
  /** 背景生成の結果（undefined = 対象なし or 失敗） */
  background?: { imageUrl: string; target: CanvasAiActionTarget };
  /** 画像 layer として追加する生成結果（0本以上） */
  images: { imageUrl: string; target: CanvasAiActionTarget }[];
  /** 装飾 layer として追加する生成結果 */
  decorations: { imageUrl: string; kind: CanvasAiDecorationKind }[];
  /** 失敗した生成のエラー情報 */
  errors: { target: CanvasAiActionTarget | CanvasAiDecorationKind; error: string }[];
};

/**
 * セクションデザイン一発適用: sectionType に基づき背景＋画像を並列生成してまとめて返す。
 * 描画への適用（addAsset / addLayer / updateSection）は呼び出し側で行う。
 *
 * 設計方針:
 * - 既存 runCanvasAiGenerate() を再利用して個別生成を並列起動
 * - Promise.allSettled で部分成功を許容（背景だけ成功、でも OK）
 * - Campaign Structure / theme は params 経由で渡す（このファイルは store に触らない）
 */
export const runCanvasAiSectionDesign = async (
  params: Omit<CanvasAiGenerateParams, "target"> & {
    visualWeight?: "low" | "medium" | "high";
    spacingScale?: "compact" | "normal" | "relaxed";
    brandSecondaryColor?: string;
  },
): Promise<CanvasAiSectionDesignResult> => {
  const plan = buildCanvasSectionDesignPlan(params.sectionName ?? "");
  const decorationPlan = buildCanvasDecorationPlan(params.sectionName ?? "", params.visualWeight);

  const allTargets: CanvasAiActionTarget[] = [
    plan.backgroundTarget,
    ...plan.imageTargets,
  ];

  const settled = await Promise.allSettled(
    allTargets.map((target) =>
      runCanvasAiGenerate({ ...params, target }).then((r) => ({
        target,
        imageUrl: r.imageUrl,
      })),
    ),
  );

  const decorationSettled = await Promise.allSettled(
    decorationPlan.decorationKinds.map((kind) =>
      runCanvasAiDecorationGenerate({
        ...params,
        decorationKind: kind,
        brandSecondaryColor: params.brandSecondaryColor,
      }),
    ),
  );

  const result: CanvasAiSectionDesignResult = { images: [], decorations: [], errors: [] };

  for (let i = 0; i < settled.length; i += 1) {
    const item = settled[i];
    const target = allTargets[i];
    if (item.status === "fulfilled") {
      if (i === 0) {
        // 先頭は背景
        result.background = { imageUrl: item.value.imageUrl, target };
      } else {
        result.images.push({ imageUrl: item.value.imageUrl, target });
      }
    } else {
      result.errors.push({
        target,
        error: item.reason instanceof Error ? item.reason.message : "生成に失敗しました",
      });
    }
  }

  for (let i = 0; i < decorationSettled.length; i += 1) {
    const item = decorationSettled[i];
    const kind = decorationPlan.decorationKinds[i];
    if (item.status === "fulfilled") {
      result.decorations.push({ imageUrl: item.value.imageUrl, kind: item.value.kind });
    } else {
      result.errors.push({
        target: kind,
        error: item.reason instanceof Error ? item.reason.message : "生成に失敗しました",
      });
    }
  }

  return result;
};
