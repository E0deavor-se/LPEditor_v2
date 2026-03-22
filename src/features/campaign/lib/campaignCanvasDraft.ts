import {
  createButtonLayer,
  createDefaultCanvasDocument,
  createTextLayer,
  flattenSectionsToLayers,
  type CanvasDocument,
  type CanvasLayer,
  type CanvasSection,
} from "@/src/types/canvas";
import type { CampaignBuilderHandoff } from "@/src/features/campaign/types/campaign";

type CampaignCanvasSectionKey =
  | "hero"
  | "campaignPeriod"
  | "overview"
  | "targetStores"
  | "howToUse"
  | "notes"
  | "cta";

const LP_STRUCTURE_TO_CANVAS_KEY: Partial<Record<string, CampaignCanvasSectionKey>> = {
  campaign_period: "campaignPeriod",
  campaign_overview: "overview",
  target_stores: "targetStores",
  faq: "howToUse",
  notes: "notes",
  cta: "cta",
};

const SECTION_LABEL: Record<CampaignCanvasSectionKey, string> = {
  hero: "Hero",
  campaignPeriod: "Campaign period",
  overview: "Overview",
  targetStores: "Target stores",
  howToUse: "How to use",
  notes: "Notes",
  cta: "CTA",
};

const setLayerZ = (layers: CanvasLayer[]) => {
  layers.forEach((layer, index) => {
    const z = index + 1;
    layer.variants.pc.z = z;
    layer.variants.sp.z = z;
  });
  return layers;
};

const buildPeriodText = (handoff: CampaignBuilderHandoff) => {
  const { periodStart, periodEnd } = handoff.sourceInput;
  if (!periodStart && !periodEnd) {
    return "期間はキャンペーンページでご確認ください。";
  }
  if (periodStart && periodEnd) {
    return `${periodStart} - ${periodEnd}`;
  }
  return periodStart || periodEnd || "";
};

const createSection = (
  key: CampaignCanvasSectionKey,
  layers: CanvasLayer[],
  minHeight = 320,
): CanvasSection => ({
  id: `campaign_${key}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`,
  name: SECTION_LABEL[key],
  title: SECTION_LABEL[key],
  background: { type: "solid", color: "#ffffff" },
  paddingTop: 24,
  paddingBottom: 24,
  gap: 24,
  minHeight,
  layers: setLayerZ(layers),
});

const createHeroSection = (handoff: CampaignBuilderHandoff): CanvasSection => {
  const title = createTextLayer(handoff.heroHeadline || "キャンペーンに参加しよう", {
    x: 80,
    y: 0,
    w: 1040,
    h: 72,
  });
  title.name = "Hero headline";
  title.style.fontSize = 48;
  title.style.fontWeight = 700;

  const subcopy = createTextLayer(handoff.heroSubcopy || "おトクな情報をご確認ください", {
    x: 80,
    y: 96,
    w: 1040,
    h: 88,
  });
  subcopy.name = "Hero subcopy";
  subcopy.style.fontSize = 24;
  subcopy.style.fontWeight = 500;

  const cta = createButtonLayer(handoff.cta || "今すぐ参加", "#", {
    x: 80,
    y: 212,
    w: 320,
    h: 56,
  });
  cta.name = "Hero CTA";

  return createSection("hero", [title, subcopy, cta], 360);
};

const createCampaignPeriodSection = (handoff: CampaignBuilderHandoff): CanvasSection => {
  const period = createTextLayer(`キャンペーン期間: ${buildPeriodText(handoff)}`, {
    x: 80,
    y: 0,
    w: 1040,
    h: 56,
  });
  period.name = "Period";
  period.style.fontSize = 30;
  period.style.fontWeight = 700;
  return createSection("campaignPeriod", [period], 180);
};

const createOverviewSection = (handoff: CampaignBuilderHandoff): CanvasSection => {
  const input = handoff.sourceInput;
  const summary = `${input.campaignName} / ${input.brandName}`;
  const conditions = input.conditions?.trim() || "条件はキャンペーンページをご確認ください。";

  const title = createTextLayer("キャンペーン概要", {
    x: 80,
    y: 0,
    w: 1040,
    h: 56,
  });
  title.style.fontSize = 34;
  title.style.fontWeight = 700;

  const body = createTextLayer(`${summary}\n${conditions}`, {
    x: 80,
    y: 72,
    w: 1040,
    h: 140,
  });
  body.style.fontSize = 22;
  body.style.fontWeight = 500;

  return createSection("overview", [title, body], 300);
};

const createTargetStoresSection = (): CanvasSection => {
  const title = createTextLayer("対象店舗", {
    x: 80,
    y: 0,
    w: 1040,
    h: 56,
  });
  title.style.fontSize = 34;
  title.style.fontWeight = 700;

  const body = createTextLayer("対象店舗情報は順次更新されます。", {
    x: 80,
    y: 72,
    w: 1040,
    h: 72,
  });
  body.style.fontSize = 22;

  return createSection("targetStores", [title, body], 260);
};

const createHowToUseSection = (): CanvasSection => {
  const title = createTextLayer("利用方法", {
    x: 80,
    y: 0,
    w: 1040,
    h: 56,
  });
  title.style.fontSize = 34;
  title.style.fontWeight = 700;

  const steps = createTextLayer("1. キャンペーン条件を確認\n2. 対象店舗で購入\n3. 特典を受け取る", {
    x: 80,
    y: 72,
    w: 1040,
    h: 132,
  });
  steps.style.fontSize = 22;

  return createSection("howToUse", [title, steps], 300);
};

const createNotesSection = (handoff: CampaignBuilderHandoff): CanvasSection => {
  const noteLines = [handoff.sourceInput.limit, "詳細条件はキャンペーンページをご確認ください。"]
    .map((entry) => entry?.trim() ?? "")
    .filter((entry) => entry.length > 0)
    .join("\n");

  const title = createTextLayer("注意事項", {
    x: 80,
    y: 0,
    w: 1040,
    h: 56,
  });
  title.style.fontSize = 34;
  title.style.fontWeight = 700;

  const body = createTextLayer(noteLines || "詳細条件はキャンペーンページをご確認ください。", {
    x: 80,
    y: 72,
    w: 1040,
    h: 132,
  });
  body.style.fontSize = 20;

  return createSection("notes", [title, body], 300);
};

const createCtaSection = (handoff: CampaignBuilderHandoff): CanvasSection => {
  const title = createTextLayer("今すぐ参加", {
    x: 80,
    y: 0,
    w: 1040,
    h: 56,
  });
  title.style.fontSize = 34;
  title.style.fontWeight = 700;

  const button = createButtonLayer(handoff.cta || "参加する", "#", {
    x: 80,
    y: 84,
    w: 320,
    h: 56,
  });

  return createSection("cta", [title, button], 240);
};

const buildSectionOrder = (handoff: CampaignBuilderHandoff): CampaignCanvasSectionKey[] => {
  const order: CampaignCanvasSectionKey[] = ["hero"];
  const mapped = handoff.lpStructure
    .map((entry) => LP_STRUCTURE_TO_CANVAS_KEY[entry])
    .filter((entry): entry is CampaignCanvasSectionKey => Boolean(entry));

  for (const key of mapped) {
    if (!order.includes(key)) {
      order.push(key);
    }
  }

  const requiredTail: CampaignCanvasSectionKey[] = [
    "campaignPeriod",
    "overview",
    "targetStores",
    "howToUse",
    "notes",
    "cta",
  ];

  for (const key of requiredTail) {
    if (!order.includes(key)) {
      order.push(key);
    }
  }

  return order;
};

export const buildCampaignCanvasDraftDocument = (
  handoff: CampaignBuilderHandoff,
): CanvasDocument => {
  const doc = createDefaultCanvasDocument();
  doc.mode = "sections";

  const sections = buildSectionOrder(handoff).map((key) => {
    if (key === "hero") return createHeroSection(handoff);
    if (key === "campaignPeriod") return createCampaignPeriodSection(handoff);
    if (key === "overview") return createOverviewSection(handoff);
    if (key === "targetStores") return createTargetStoresSection();
    if (key === "howToUse") return createHowToUseSection();
    if (key === "notes") return createNotesSection(handoff);
    return createCtaSection(handoff);
  });

  doc.sections = { sections };
  doc.layers = flattenSectionsToLayers(sections, "pc", doc.meta.size.pc.width);
  doc.selectedNodeIds = [];
  return doc;
};
