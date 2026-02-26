import {
  createButtonLayer,
  createDefaultCanvasDocument,
  createShapeLayer,
  createTableLayer,
  createTextLayer,
  type CanvasDocument,
  type CanvasLayer,
} from "@/src/types/canvas";

export type CanvasTemplateOption = {
  id: string;
  label: string;
  description: string;
};

export const CANVAS_TEMPLATES: CanvasTemplateOption[] = [
  {
    id: "hero-cta",
    label: "Hero + CTA",
    description: "見出し、説明文、CTA ボタンのシンプル構成",
  },
  {
    id: "features-3",
    label: "3 Features",
    description: "3つの特徴を縦積みで訴求する構成",
  },
  {
    id: "pricing-table",
    label: "Pricing + CTA",
    description: "料金テーブルと申込ボタンの構成",
  },
];

const centerX = (canvasWidth: number, layerWidth: number) =>
  Math.max(0, Math.round((canvasWidth - layerWidth) / 2));

const placeLayer = (
  layer: CanvasLayer,
  {
    pc,
    sp,
  }: {
    pc?: Partial<CanvasLayer["variants"]["pc"]>;
    sp?: Partial<CanvasLayer["variants"]["sp"]>;
  }
): CanvasLayer => {
  layer.variants.pc = { ...layer.variants.pc, ...pc };
  layer.variants.sp = { ...layer.variants.sp, ...sp };
  return layer;
};

const makeHeroCtaLayers = (pcWidth: number, spWidth: number): CanvasLayer[] => {
  const title = placeLayer(createTextLayer("最短で成果につながるLPを作成"), {
    pc: { w: Math.min(920, pcWidth - 120), y: 160, x: centerX(pcWidth, Math.min(920, pcWidth - 120)) },
    sp: { w: Math.min(335, spWidth - 32), y: 100, x: centerX(spWidth, Math.min(335, spWidth - 32)) },
  });

  const desc = placeLayer(createTextLayer("テンプレートを選んで、必要な要素だけ編集すれば公開できます。"), {
    pc: { w: Math.min(760, pcWidth - 200), y: 250, h: 80, x: centerX(pcWidth, Math.min(760, pcWidth - 200)) },
    sp: { w: Math.min(335, spWidth - 32), y: 190, h: 90, x: centerX(spWidth, Math.min(335, spWidth - 32)) },
  });
  desc.style.fontSize = 18;
  desc.style.fontWeight = 400;

  const cta = placeLayer(createButtonLayer("無料で相談する", "#"), {
    pc: { w: 300, h: 56, y: 360, x: centerX(pcWidth, 300) },
    sp: { w: Math.min(295, spWidth - 40), h: 52, y: 320, x: centerX(spWidth, Math.min(295, spWidth - 40)) },
  });

  return [title, desc, cta];
};

const makeFeaturesLayers = (pcWidth: number, spWidth: number): CanvasLayer[] => {
  const heading = placeLayer(createTextLayer("このサービスが選ばれる理由"), {
    pc: { w: Math.min(840, pcWidth - 120), y: 120, x: centerX(pcWidth, Math.min(840, pcWidth - 120)) },
    sp: { w: Math.min(335, spWidth - 32), y: 80, x: centerX(spWidth, Math.min(335, spWidth - 32)) },
  });

  const cards: CanvasLayer[] = [0, 1, 2].map((index) => {
    const card = createShapeLayer("rect", { w: Math.min(900, pcWidth - 120), h: 120 });
    card.style.fill = "#f5f7fb";
    card.style.radius = 12;
    return placeLayer(card, {
      pc: { y: 230 + index * 150, x: centerX(pcWidth, Math.min(900, pcWidth - 120)) },
      sp: {
        w: Math.min(335, spWidth - 32),
        h: 110,
        y: 170 + index * 130,
        x: centerX(spWidth, Math.min(335, spWidth - 32)),
      },
    });
  });

  const labels: CanvasLayer[] = [
    "導入が早い",
    "運用しやすい",
    "成果を追いやすい",
  ].map((text, index) => {
    const label = createTextLayer(`• ${text}`);
    label.style.fontSize = 24;
    label.style.fontWeight = 700;
    return placeLayer(label, {
      pc: { w: Math.min(760, pcWidth - 180), y: 270 + index * 150, x: centerX(pcWidth, Math.min(760, pcWidth - 180)) },
      sp: {
        w: Math.min(295, spWidth - 40),
        y: 205 + index * 130,
        x: centerX(spWidth, Math.min(295, spWidth - 40)),
      },
    });
  });

  return [heading, ...cards, ...labels];
};

const makePricingLayers = (pcWidth: number, spWidth: number): CanvasLayer[] => {
  const heading = placeLayer(createTextLayer("料金プラン"), {
    pc: { w: 420, y: 120, x: centerX(pcWidth, 420) },
    sp: { w: Math.min(300, spWidth - 32), y: 80, x: centerX(spWidth, Math.min(300, spWidth - 32)) },
  });

  const table = placeLayer(
    createTableLayer([
      [{ text: "プラン" }, { text: "月額" }, { text: "主な内容" }],
      [{ text: "Starter" }, { text: "¥9,800" }, { text: "基本機能" }],
      [{ text: "Business" }, { text: "¥29,800" }, { text: "分析・自動化" }],
      [{ text: "Enterprise" }, { text: "お問い合わせ" }, { text: "個別対応" }],
    ]),
    {
      pc: { w: Math.min(980, pcWidth - 120), h: 260, y: 220, x: centerX(pcWidth, Math.min(980, pcWidth - 120)) },
      sp: { w: Math.min(343, spWidth - 24), h: 240, y: 160, x: centerX(spWidth, Math.min(343, spWidth - 24)) },
    }
  );

  const cta = placeLayer(createButtonLayer("見積もりを依頼する", "#"), {
    pc: { w: 320, h: 56, y: 530, x: centerX(pcWidth, 320) },
    sp: { w: Math.min(295, spWidth - 40), h: 52, y: 430, x: centerX(spWidth, Math.min(295, spWidth - 40)) },
  });

  return [heading, table, cta];
};

export const buildDocumentFromTemplate = (
  templateId: string,
  pcWidth = 1200,
  spWidth = 375
): CanvasDocument | null => {
  const doc = createDefaultCanvasDocument();
  doc.meta.size.pc.width = Math.max(320, Math.round(pcWidth));
  doc.meta.size.sp.width = Math.max(320, Math.round(spWidth));
  doc.meta.size.pc.height = 2400;
  doc.meta.size.sp.height = 1800;

  let layers: CanvasLayer[];
  if (templateId === "hero-cta") {
    layers = makeHeroCtaLayers(doc.meta.size.pc.width, doc.meta.size.sp.width);
    doc.background = { type: "solid", color: "#ffffff" };
  } else if (templateId === "features-3") {
    layers = makeFeaturesLayers(doc.meta.size.pc.width, doc.meta.size.sp.width);
    doc.background = { type: "solid", color: "#ffffff" };
  } else if (templateId === "pricing-table") {
    layers = makePricingLayers(doc.meta.size.pc.width, doc.meta.size.sp.width);
    doc.background = { type: "solid", color: "#ffffff" };
  } else {
    return null;
  }

  layers.forEach((layer, index) => {
    const z = index + 1;
    layer.variants.pc.z = z;
    layer.variants.sp.z = z;
  });

  doc.mode = "free";
  doc.free = { layers };
  doc.layers = layers;
  return doc;
};
