import type { SectionBase, SectionContent, SectionStyle } from "@/src/types/project";

export type SectionTemplate = {
  id: string;
  title: string;
  description: string;
  tags: string[];
  category: "recommended" | "basic" | "promo" | "info" | "future";
  sectionType: string;
  create: () => SectionBase;
};

const createId = (type: string) =>
  `sec_${type}_${Math.random().toString(36).slice(2, 8)}`;

const createItemId = () =>
  `item_${Math.random().toString(36).slice(2, 8)}`;

const createLineId = () =>
  `line_${Math.random().toString(36).slice(2, 8)}`;

const createRowId = () =>
  `row_${Math.random().toString(36).slice(2, 8)}`;

const createTabId = () =>
  `tab_${Math.random().toString(36).slice(2, 8)}`;

const createTabItemId = () =>
  `tab_item_${Math.random().toString(36).slice(2, 8)}`;

const createDefaultContent = (): SectionContent => ({
  title: "",
  items: [
    {
      id: createItemId(),
      type: "text",
      lines: [{ id: createLineId(), text: "" }],
    },
  ],
});

const createDefaultStyle = (): SectionStyle => ({
  typography: {
    fontFamily: "system-ui",
    fontSize: 16,
    fontWeight: 400,
    lineHeight: 1.6,
    letterSpacing: 0,
    textAlign: "left",
    textColor: "#111111",
  },
  background: {
    type: "solid",
    color1: "#ffffff",
    color2: "#f1f5f9",
  },
  border: {
    enabled: false,
    width: 1,
    color: "#e5e7eb",
  },
  shadow: "none",
  layout: {
    padding: { t: 32, r: 24, b: 32, l: 24 },
    maxWidth: 1200,
    align: "center",
    radius: 12,
    fullWidth: false,
    minHeight: 0,
  },
});

export const templates: SectionTemplate[] = [
  {
    id: "tpl_text_block",
    title: "テキスト（見出し+本文）",
    description: "短い見出しと本文でストーリーを補足します。",
    tags: ["見出し", "本文", "汎用"],
    category: "recommended",
    sectionType: "textBlock",
    create: () => ({
      id: createId("textBlock"),
      type: "textBlock",
      visible: true,
      locked: false,
      data: {
        title: "セクション見出し",
        body: "本文テキストを入力してください。",
      },
      content: createDefaultContent(),
      style: createDefaultStyle(),
    }),
  },
  {
    id: "tpl_image_text",
    title: "画像+テキスト",
    description: "ビジュアルと説明を並べて魅力を伝えます。",
    tags: ["画像", "説明", "訴求"],
    category: "basic",
    sectionType: "imageText",
    create: () => ({
      id: createId("imageText"),
      type: "imageText",
      visible: true,
      locked: false,
      data: {
        title: "画像と説明",
        body: "ここに説明文を追加します。",
        imageUrl: "",
        align: "left",
      },
      content: createDefaultContent(),
      style: createDefaultStyle(),
    }),
  },
  {
    id: "tpl_cta",
    title: "CTAボタン",
    description: "アクションを促す主要ボタンを配置します。",
    tags: ["CTA", "ボタン", "コンバージョン"],
    category: "promo",
    sectionType: "cta",
    create: () => ({
      id: createId("cta"),
      type: "cta",
      visible: true,
      locked: false,
      data: {
        headline: "今すぐ申し込む",
        subtext: "期間限定キャンペーン",
        buttonText: "申し込む",
        buttonUrl: "",
      },
      content: createDefaultContent(),
      style: createDefaultStyle(),
    }),
  },
  {
    id: "tpl_faq",
    title: "FAQ",
    description: "よくある質問をまとめて不安を解消します。",
    tags: ["FAQ", "Q&A", "安心"],
    category: "info",
    sectionType: "faq",
    create: () => ({
      id: createId("faq"),
      type: "faq",
      visible: true,
      locked: false,
      data: {
        title: "よくある質問",
        items: [
          { q: "利用条件はありますか？", a: "条件はありません。" },
          { q: "いつまでですか？", a: "2026/03/31までです。" },
        ],
      },
      content: createDefaultContent(),
      style: createDefaultStyle(),
    }),
  },
  {
    id: "tpl_ranking_table",
    title: "ランキング表",
    description: "順位と数値をカード型で見やすく見せます。",
    tags: ["ランキング", "比較", "実績"],
    category: "recommended",
    sectionType: "rankingTable",
    create: () => ({
      id: createId("rankingTable"),
      type: "rankingTable",
      visible: true,
      locked: false,
      data: {
        title: "決済金額ランキング",
        subtitle: "最新順位はこちら",
        period: "2025/10/1～2025/12/14",
        date: "2025/12/14時点",
        notes: [
          "※同一順位の場合は期間中の決済回数が多い方が上位となります。",
          "※決済合計額と決済回数の両方が同一の場合初回決済時間が早い方が上位となります。",
        ],
        rankLabel: "順位",
        columns: [
          { key: "amount", label: "決済金額" },
          { key: "count", label: "品数" },
        ],
        rows: [
          { id: createRowId(), values: ["368,330円", "940品以上"] },
          { id: createRowId(), values: ["308,000円", "790品以上"] },
          { id: createRowId(), values: ["246,940円", "630品以上"] },
        ],
      },
      content: { title: "", items: [] },
      style: createDefaultStyle(),
    }),
  },
  {
    id: "tpl_payment_history_guide",
    title: "決済履歴の確認方法",
    description: "アプリ内の履歴確認方法を案内するセクションです。",
    tags: ["案内", "決済", "履歴"],
    category: "info",
    sectionType: "paymentHistoryGuide",
    create: () => ({
      id: createId("paymentHistoryGuide"),
      type: "paymentHistoryGuide",
      visible: true,
      locked: false,
      data: {
        title: "決済履歴の確認方法",
        body:
          "現在の決済金額については、au PAY アプリ内の「取引履歴」をご確認ください。",
        linkText: "こちら",
        linkUrl: "#contact",
        linkTargetKind: "url",
        linkSectionId: "",
        linkSuffix: "までお問い合わせください。",
        alert:
          "なお、店頭や問い合わせ窓口での現在の順位や金額、当選結果についてのご質問にはお答えできません。",
        imageUrl: "/footer-defaults/img-02.png",
        imageAlt: "決済履歴の確認方法",
      },
      content: { title: "", items: [] },
      style: createDefaultStyle(),
    }),
  },
  {
    id: "tpl_tabbed_notes",
    title: "付箋タブセクション",
    description: "付箋タブで注意事項を切り替えて表示します。",
    tags: ["注意事項", "タブ", "付箋"],
    category: "info",
    sectionType: "tabbedNotes",
    create: () => ({
      id: createId("tabbedNotes"),
      type: "tabbedNotes",
      visible: true,
      locked: false,
      data: {
        title: "注意事項",
        tabs: [
          {
            id: createTabId(),
            labelTop: "事前獲得クーポン",
            labelBottom: "注意事項",
            intro: "",
            items: [
              {
                id: createTabItemId(),
                text:
                  "＊レジで表示されているお買上げ金額は割引表示されません。割引後の金額はau PAY アプリの「履歴」をご確認ください。",
                bullet: "none",
                tone: "accent",
                bold: false,
                subItems: [],
              },
              {
                id: createTabItemId(),
                text:
                  "クーポンは1回20,000円（税込）以上のお支払いにご利用いただけます。",
                bullet: "disc",
                tone: "normal",
                bold: false,
                subItems: [],
              },
              {
                id: createTabItemId(),
                text:
                  "キャンペーン期間中でも、クーポンの割引総額が所定の金額に達した場合、配布終了となり獲得済みクーポンのご利用は不可となります。",
                bullet: "disc",
                tone: "accent",
                bold: true,
                subItems: [],
              },
            ],
            footnote: "※2026年2月6日時点の情報です。",
            ctaText: "",
            ctaLinkText: "",
            ctaLinkUrl: "",
            ctaTargetKind: "url",
            ctaSectionId: "",
            ctaImageUrl: "",
            ctaImageAlt: "",
            ctaImageAssetId: "",
            buttonText: "",
            buttonTargetKind: "url",
            buttonUrl: "",
            buttonSectionId: "",
          },
          {
            id: createTabId(),
            labelTop: "クイックチャンス",
            labelBottom: "注意事項",
            intro: "",
            items: [
              {
                id: createTabItemId(),
                text:
                  "クーポンの利用方法は以下の通りとなります。",
                bullet: "disc",
                tone: "normal",
                bold: false,
                subItems: [
                  "①クーポン画面を表示します。",
                  "②クーポン利用の旨をお申し出いただき、クーポン画面を提示します。",
                  "③「利用する」ボタンを押下してください。",
                ],
              },
              {
                id: createTabItemId(),
                text:
                  "クーポンの利用期限前であっても、予告なく終了する場合があります。",
                bullet: "disc",
                tone: "normal",
                bold: false,
                subItems: [],
              },
              {
                id: createTabItemId(),
                text:
                  "本キャンペーンは予告なく変更・終了する場合があります。",
                bullet: "disc",
                tone: "accent",
                bold: true,
                subItems: [],
              },
            ],
            footnote: "※2026年2月6日時点の情報です。",
            ctaText: "",
            ctaLinkText: "",
            ctaLinkUrl: "",
            ctaTargetKind: "url",
            ctaSectionId: "",
            ctaImageUrl: "",
            ctaImageAlt: "",
            ctaImageAssetId: "",
            buttonText: "",
            buttonTargetKind: "url",
            buttonUrl: "",
            buttonSectionId: "",
          },
        ],
        tabStyle: {
          variant: "simple",
          inactiveBg: "#DDDDDD",
          inactiveText: "#000000",
          activeBg: "#000000",
          activeText: "#FFFFFF",
          border: "#000000",
          contentBg: "#FFFFFF",
          contentBorder: "#000000",
          accent: "#EB5505",
        },
      },
      content: { title: "", items: [] },
      style: createDefaultStyle(),
    }),
  },
  {
    id: "tpl_divider",
    title: "区切り（セパレーター）",
    description: "セクション間の区切りを作ります。",
    tags: ["区切り", "装飾"],
    category: "basic",
    sectionType: "divider",
    create: () => ({
      id: createId("divider"),
      type: "divider",
      visible: true,
      locked: false,
      data: {
        label: "",
      },
      content: createDefaultContent(),
      style: createDefaultStyle(),
    }),
  },
];
