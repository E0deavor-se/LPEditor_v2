import type { SectionBase, StoresTable } from "@/src/types/project";
import type { RenderDevice, RendererAssets } from "@/src/lib/renderers/shared/types";
import {
  resolveAssetUrl,
  resolveHeroImageWithFallback,
} from "@/src/lib/renderers/shared/renderResponsiveImage";
import { buildFooterHtml } from "@/src/lib/footerTemplate";
import { renderFromSectionRendererMap } from "@/src/lib/renderers/layout/sectionArchitecture/SectionRendererMap";
import {
  resolveSectionAppearance,
  resolveSectionDecorationFromData,
} from "@/src/lib/sections/sectionAppearance";

const esc = (value: string) =>
  value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#39;");

const str = (value: unknown) =>
  typeof value === "string" ? value : value == null ? "" : String(value);

const resolveSectionAppearanceFromSection = (
  section: SectionBase,
  fallback: {
    headerBackgroundColor: string;
    titleTextColor: string;
    accentColor: string;
    borderColor: string;
    headerStyle?: "band" | "ribbon" | "plain";
    showHeaderBand?: boolean;
  }
) =>
  {
    const data = section.data as Record<string, unknown>;
    const cardStyle = section.sectionCardStyle;
    return resolveSectionDecorationFromData(data, {
      headerBackgroundColor:
        typeof data.titleBandColor === "string"
          ? data.titleBandColor
          : typeof cardStyle?.headerBgColor === "string" && cardStyle.headerBgColor
          ? cardStyle.headerBgColor
          : fallback.headerBackgroundColor,
      titleTextColor:
        typeof data.titleTextColor === "string"
          ? data.titleTextColor
          : typeof cardStyle?.headerTextColor === "string" && cardStyle.headerTextColor
          ? cardStyle.headerTextColor
          : fallback.titleTextColor,
      accentColor:
        typeof data.accentColor === "string"
          ? data.accentColor
          : typeof cardStyle?.headerBgColor === "string" && cardStyle.headerBgColor
          ? cardStyle.headerBgColor
          : fallback.accentColor,
      borderColor:
        typeof data.cardBorderColor === "string"
          ? data.cardBorderColor
          : typeof cardStyle?.borderColor === "string" && cardStyle.borderColor
          ? cardStyle.borderColor
          : fallback.borderColor,
    headerStyle: fallback.headerStyle ?? "band",
    showHeaderBand: fallback.showHeaderBand ?? true,
    });
  };

const UNIFIED_SECTION_BAND_MAX_WIDTH = 820;
const UNIFIED_SECTION_BAND_TITLE_SIZE = 22;
const UNIFIED_SECTION_BAND_PADDING = "10px 14px";

const resolveUnifiedBandStyles = (
  appearance: ReturnType<typeof resolveSectionAppearance>
) => {
  const headerBg = appearance.showHeaderBand
    ? appearance.headerBackgroundColor
    : "transparent";
  const titleColor = appearance.showHeaderBand
    ? appearance.titleTextColor
    : appearance.accentColor;
  const headerRadius = appearance.headerStyle === "ribbon" ? "12px 12px 0 0" : "0";
  const headerShadow =
    appearance.headerStyle === "ribbon" && appearance.showHeaderBand
      ? "box-shadow:0 8px 18px rgba(15,23,42,0.14);"
      : "";

  return {
    headerBg,
    titleColor,
    headerRadius,
    headerShadow,
    headerPadding: appearance.showHeaderBand ? UNIFIED_SECTION_BAND_PADDING : "0 14px 10px",
    titleSizePx: UNIFIED_SECTION_BAND_TITLE_SIZE,
    maxWidthPx: UNIFIED_SECTION_BAND_MAX_WIDTH,
  };
};

const sanitizeInlineStyle = (value: string) => {
  const allowed = value
    .split(";")
    .map((entry) => entry.trim())
    .filter(Boolean)
    .filter((entry) => {
      return (
        /^color:\s*#[0-9a-fA-F]{3,8}$/.test(entry) ||
        /^font-size:\s*[0-9]{1,3}px$/.test(entry) ||
        /^text-decoration:\s*underline$/.test(entry) ||
        /^font-weight:\s*(bold|[1-9]00)$/.test(entry) ||
        /^text-align:\s*(left|center|right)$/.test(entry) ||
        /^display:\s*(inline|block)$/.test(entry)
      );
    });
  return allowed.join(";");
};

const renderRichInline = (value: unknown, multiline = false) => {
  let html = esc(str(value));

  html = html.replace(/&lt;(\/?)(strong|b|u|em|i)&gt;/gi, "<$1$2>");
  html = html.replace(/&lt;br\s*\/?&gt;/gi, "<br />");
  html = html.replace(/&lt;\/span&gt;/gi, "</span>");
  html = html.replace(/&lt;\/a&gt;/gi, "</a>");

  html = html.replace(/&lt;span style=&quot;([^&]*)&quot;&gt;/gi, (_, rawStyle: string) => {
    const safeStyle = sanitizeInlineStyle(rawStyle);
    return safeStyle ? `<span style="${safeStyle}">` : "<span>";
  });

  html = html.replace(/&lt;a href=&quot;([^&]*)&quot;&gt;/gi, (_, rawHref: string) => {
    const href = rawHref.trim();
    if (/^(https?:\/\/|mailto:|#)/i.test(href)) {
      return `<a href="${esc(href)}">`;
    }
    return "<a href=\"#\">";
  });

  if (multiline) {
    html = html.replace(/\r?\n/g, "<br />");
  }

  return html;
};

const buildContentAnimationStyle = (value: unknown, disableMotion = false) => {
  if (disableMotion) {
    return "";
  }
  if (!value || typeof value !== "object") {
    return "";
  }
  const animation = value as Record<string, unknown>;
  const preset = animation.preset;
  if (preset !== "fade" && preset !== "slideUp" && preset !== "zoom") {
    return "";
  }
  const name =
    preset === "slideUp" ? "lpSlideUp" : preset === "zoom" ? "lpZoomIn" : "lpFadeIn";
  const durationMs =
    typeof animation.durationMs === "number" && Number.isFinite(animation.durationMs)
      ? animation.durationMs
      : 400;
  const delayMs =
    typeof animation.delayMs === "number" && Number.isFinite(animation.delayMs)
      ? animation.delayMs
      : 0;
  return `animation:${name} ${Math.max(0, durationMs)}ms ease ${Math.max(0, delayMs)}ms both;`;
};

const REGION_GROUPS = [
  {
    region: "北海道・東北",
    items: [
      { name: "北海道", label: "北海道", id: "hokkaido" },
      { name: "青森県", label: "青森", id: "aomori" },
      { name: "岩手県", label: "岩手", id: "iwate" },
      { name: "宮城県", label: "宮城", id: "miyagi" },
      { name: "秋田県", label: "秋田", id: "akita" },
      { name: "山形県", label: "山形", id: "yamagata" },
      { name: "福島県", label: "福島", id: "fukushima" },
    ],
  },
  {
    region: "関東",
    items: [
      { name: "茨城県", label: "茨城", id: "ibaraki" },
      { name: "栃木県", label: "栃木", id: "tochigi" },
      { name: "群馬県", label: "群馬", id: "gunma" },
      { name: "埼玉県", label: "埼玉", id: "saitama" },
      { name: "千葉県", label: "千葉", id: "chiba" },
      { name: "東京都", label: "東京", id: "tokyo" },
      { name: "神奈川県", label: "神奈川", id: "kanagawa" },
    ],
  },
  {
    region: "中部",
    items: [
      { name: "新潟県", label: "新潟", id: "niigata" },
      { name: "富山県", label: "富山", id: "toyama" },
      { name: "石川県", label: "石川", id: "ishikawa" },
      { name: "福井県", label: "福井", id: "fukui" },
      { name: "山梨県", label: "山梨", id: "yamanashi" },
      { name: "長野県", label: "長野", id: "nagano" },
      { name: "岐阜県", label: "岐阜", id: "gifu" },
      { name: "静岡県", label: "静岡", id: "shizuoka" },
      { name: "愛知県", label: "愛知", id: "aichi" },
    ],
  },
  {
    region: "近畿",
    items: [
      { name: "三重県", label: "三重", id: "mie" },
      { name: "滋賀県", label: "滋賀", id: "shiga" },
      { name: "京都府", label: "京都", id: "kyoto" },
      { name: "大阪府", label: "大阪", id: "osaka" },
      { name: "兵庫県", label: "兵庫", id: "hyogo" },
      { name: "奈良県", label: "奈良", id: "nara" },
      { name: "和歌山県", label: "和歌山", id: "wakayama" },
    ],
  },
  {
    region: "中国・四国",
    items: [
      { name: "鳥取県", label: "鳥取", id: "tottori" },
      { name: "島根県", label: "島根", id: "shimane" },
      { name: "岡山県", label: "岡山", id: "okayama" },
      { name: "広島県", label: "広島", id: "hiroshima" },
      { name: "山口県", label: "山口", id: "yamaguchi" },
      { name: "徳島県", label: "徳島", id: "tokushima" },
      { name: "香川県", label: "香川", id: "kagawa" },
      { name: "愛媛県", label: "愛媛", id: "ehime" },
      { name: "高知県", label: "高知", id: "kouchi" },
    ],
  },
  {
    region: "九州・沖縄",
    items: [
      { name: "福岡県", label: "福岡", id: "fukuoka" },
      { name: "佐賀県", label: "佐賀", id: "saga" },
      { name: "長崎県", label: "長崎", id: "nagasaki" },
      { name: "熊本県", label: "熊本", id: "kumamoto" },
      { name: "大分県", label: "大分", id: "oita" },
      { name: "宮崎県", label: "宮崎", id: "miyazaki" },
      { name: "鹿児島県", label: "鹿児島", id: "kagoshima" },
      { name: "沖縄県", label: "沖縄", id: "okinawa" },
    ],
  },
];

const PREFECTURE_ORDER = REGION_GROUPS.flatMap((group) =>
  group.items.map((item) => item.name)
);

const PREFECTURE_ID_MAP = new Map(
  REGION_GROUPS.flatMap((group) =>
    group.items.map((item) => [item.name, item.id] as const)
  )
);

const resolvePrefectureId = (prefecture: string, fallbackIndex: number) =>
  PREFECTURE_ID_MAP.get(prefecture) ?? `pref-${fallbackIndex}`;

const renderExcludedStoresNav = () => {
  const rows = REGION_GROUPS.map((group) => {
    const links = group.items
      .map(
        (item) =>
          `<a href="#${item.id}" class="excluded-region-link">${esc(item.label)}</a>`
      )
      .join("");
    return `<tr><th class="excluded-region-th"><strong>${esc(
      group.region
    )}</strong></th><td class="excluded-region-td">${links}</td></tr>`;
  });
  return `<table class="excluded-region-table"><tbody>${rows.join("")}</tbody></table>`;
};

const renderExcludedStoresList = (stores: StoresTable | null) => {
  if (!stores || stores.rows.length === 0) {
    return `<div class="excluded-empty">CSVを取り込むと、対象外店舗の一覧が表示されます。</div>`;
  }
  const canonical = stores.canonical;
  const groups = new Map<string, Array<{ name: string; address: string }>>();
  stores.rows.forEach((row) => {
    const name = str(row[canonical.storeNameKey]).trim();
    const address = str(row[canonical.addressKey]).trim();
    const pref = str(row[canonical.prefectureKey]).trim();
    const key = pref || "未分類";
    const list = groups.get(key) ?? [];
    list.push({ name, address });
    groups.set(key, list);
  });
  const orderMap = new Map(
    PREFECTURE_ORDER.map((prefecture, index) => [prefecture, index])
  );
  const sortedGroups = Array.from(groups.entries())
    .map(([prefecture, entries]) => ({ prefecture, entries }))
    .sort((a, b) => {
      const orderA = orderMap.get(a.prefecture) ?? Number.MAX_SAFE_INTEGER;
      const orderB = orderMap.get(b.prefecture) ?? Number.MAX_SAFE_INTEGER;
      return orderA - orderB;
    });
  const blocks = sortedGroups
    .map((group, index) => {
      const rows = group.entries
        .map(
          (entry) =>
            `<div class="tenpo_list"><span class="tenpo_list_shop">${esc(
              entry.name || "店舗名"
            )}</span><span class="tenpo_list_add">${esc(entry.address)}</span></div>`
        )
        .join("");
      const prefId = resolvePrefectureId(group.prefecture, index + 1);
      return `<div><div class="tenpo_list_title"><h2 id="${prefId}">${esc(
        group.prefecture
      )}</h2></div>${rows}</div>`;
    })
    .join("");
  return `<div class="tenpo-container">${blocks}</div>`;
};

const pickHeader = (headers: string[], candidates: string[]) =>
  candidates.find((candidate) => headers.includes(candidate)) ?? "";

const buildBrandAnchorId = (label: string, index: number, used: Set<string>) => {
  const trimmed = label.trim();
  const base = trimmed ? trimmed.replace(/\s+/g, "-") : `brand-${index + 1}`;
  let next = base;
  let counter = 1;
  while (used.has(next)) {
    next = `${base}-${counter}`;
    counter += 1;
  }
  used.add(next);
  return next;
};

const buildExcludedBrandGroupsFromStores = (stores: StoresTable | null) => {
  if (!stores || stores.rows.length === 0) {
    return [] as Array<{
      brand: string;
      id: string;
      entries: Array<{ name: string; address: string }>;
    }>;
  }
  const headers = [...(stores.columns ?? []), ...(stores.extraColumns ?? [])];
  const brandKey = pickHeader(headers, ["ブランド名", "ブランド", "グループ", "チェーン名"]);
  const canonical = stores.canonical;
  const storeNameKey = canonical.storeNameKey;
  const addressKey = canonical.addressKey;
  const order: string[] = [];
  const groups = new Map<string, Array<{ name: string; address: string }>>();
  stores.rows.forEach((row) => {
    const brand = str(row[brandKey]).trim();
    const name = str(row[storeNameKey]).trim();
    const address = str(row[addressKey]).trim();
    if (!brand && !name && !address) {
      return;
    }
    const key = brand || "未分類";
    if (!groups.has(key)) {
      order.push(key);
      groups.set(key, []);
    }
    groups.get(key)?.push({ name, address });
  });
  const usedIds = new Set<string>();
  return order.map((brand, index) => ({
    brand,
    entries: groups.get(brand) ?? [],
    id: buildBrandAnchorId(brand, index, usedIds),
  }));
};

const renderExcludedBrandsNav = (groups: Array<{ brand: string; id: string }>) => {
  if (groups.length === 0) {
    return "";
  }
  return `<ul class="excluded-brand-list">${groups
    .map(
      (group) =>
        `<li><span class="excluded-brand-marker">▼</span><a class="excluded-brand-link" href="#${esc(
          group.id
        )}">${esc(group.brand)}</a></li>`
    )
    .join("")}</ul>`;
};

const renderExcludedBrandsList = (
  groups: Array<{ brand: string; id: string; entries: Array<{ name: string; address: string }> }>
) => {
  if (groups.length === 0) {
    return `<div class="excluded-empty">CSVを取り込むと、対象外ブランドの一覧が表示されます。</div>`;
  }
  const blocks = groups
    .map((group) => {
      const rows = group.entries
        .map(
          (entry) =>
            `<div class="tenpo_list"><span class="tenpo_list_shop">${esc(
              entry.name || "ブランド名"
            )}</span><span class="tenpo_list_add">${esc(entry.address)}</span></div>`
        )
        .join("");
      return `<div><div class="tenpo_list_title"><h2 id="${esc(group.id)}">${esc(
        group.brand
      )}</h2></div>${rows}</div>`;
    })
    .join("");
  return `<div class="tenpo-container">${blocks}</div>`;
};

const resolveExcludedFooterLinks = (footerLinksRaw: unknown) => {
  const footerLinks = Array.isArray(footerLinksRaw)
    ? footerLinksRaw
        .map((entry) => {
          if (!entry || typeof entry !== "object") {
            return null;
          }
          const row = entry as { label?: unknown; url?: unknown };
          const label = typeof row.label === "string" ? row.label : "";
          const url = typeof row.url === "string" ? row.url : "";
          if (!label || !url) {
            return null;
          }
          return { label, url };
        })
        .filter((entry): entry is { label: string; url: string } => entry != null)
    : [];

  return footerLinks.length
    ? footerLinks
    : [
        { label: "サイトポリシー", url: "#" },
        { label: "会社概要", url: "#" },
        { label: "動作環境", url: "#" },
        { label: "Cookie情報の利用", url: "#" },
        { label: "広告配信などについて", url: "#" },
      ];
};

const renderExcludedStoresSection = (section: SectionBase, stores: StoresTable | null) => {
  const rawTitleTemplate = str(section.data.title || "対象外店舗一覧");
  const rawHighlight = str(section.data.highlightLabel || "対象外");
  const highlight = esc(rawHighlight);
  const returnUrl = esc(str(section.data.returnUrl || "#"));
  const returnLabel = esc(str(section.data.returnLabel || "キャンペーンページに戻る"));
  const footerCopy = esc(
    str(section.data.footerCopy || "COPYRIGHT © KDDI CORPORATION. ALL RIGHTS RESERVED.")
  );
  const resolvedFooterLinks = resolveExcludedFooterLinks(section.data.footerLinks);
  const hasHighlightPlaceholder = highlight && rawTitleTemplate.includes("{highlight}");
  const titleParts = rawTitleTemplate.split("{highlight}");
  const titleHtml = hasHighlightPlaceholder
    ? `<span class=\"excluded-title__text\">${esc(titleParts[0])}</span><span class=\"excluded-title__badge\">${highlight}</span><span class=\"excluded-title__text\">${esc(
        titleParts.slice(1).join("{highlight}")
      )}</span>`
    : `<span class=\"excluded-title__text\">${esc(rawTitleTemplate)}</span>${
        highlight ? `<span class=\"excluded-title__badge\">${highlight}</span>` : ""
      }`;

  return `<section class=\"excluded-stores\"><div class=\"excluded-wrap\"><h1 class=\"excluded-title\">${titleHtml}</h1>${renderExcludedStoresNav()}${renderExcludedStoresList(
    stores
  )}<div class=\"excluded-footer\"><a class=\"excluded-return\" href=\"${returnUrl}\"><span class=\"excluded-return__label\">${returnLabel}</span><span class=\"excluded-return__arrow\" aria-hidden=\"true\"></span></a><div class=\"excluded-footer__links\">${resolvedFooterLinks
    .map((link) => `<a href=\"${esc(link.url)}\">${esc(link.label)}</a>`)
    .join("")}</div><div class=\"excluded-footer__copy\">${footerCopy}</div></div></div></section>`;
};

const renderExcludedBrandsSection = (section: SectionBase, stores: StoresTable | null) => {
  const brandGroups = buildExcludedBrandGroupsFromStores(stores);
  const rawTitleTemplate = str(section.data.title || "対象外ブランド一覧");
  const rawHighlight = str(section.data.highlightLabel || "対象外");
  const highlight = esc(rawHighlight);
  const returnUrl = esc(str(section.data.returnUrl || "#"));
  const returnLabel = esc(str(section.data.returnLabel || "キャンペーンページに戻る"));
  const footerCopy = esc(
    str(section.data.footerCopy || "COPYRIGHT © KDDI CORPORATION. ALL RIGHTS RESERVED.")
  );
  const resolvedFooterLinks = resolveExcludedFooterLinks(section.data.footerLinks);
  const hasHighlightPlaceholder = highlight && rawTitleTemplate.includes("{highlight}");
  const titleParts = rawTitleTemplate.split("{highlight}");
  const titleHtml = hasHighlightPlaceholder
    ? `<span class=\"excluded-title__text\">${esc(titleParts[0])}</span><span class=\"excluded-title__badge\">${highlight}</span><span class=\"excluded-title__text\">${esc(
        titleParts.slice(1).join("{highlight}")
      )}</span>`
    : `<span class=\"excluded-title__text\">${esc(rawTitleTemplate)}</span>${
        highlight ? `<span class=\"excluded-title__badge\">${highlight}</span>` : ""
      }`;

  return `<section class=\"excluded-stores\"><div class=\"excluded-wrap\"><h1 class=\"excluded-title\">${titleHtml}</h1>${renderExcludedBrandsNav(
    brandGroups
  )}${renderExcludedBrandsList(brandGroups)}<div class=\"excluded-footer\"><a class=\"excluded-return\" href=\"${returnUrl}\"><span class=\"excluded-return__label\">${returnLabel}</span><span class=\"excluded-return__arrow\" aria-hidden=\"true\"></span></a><div class=\"excluded-footer__links\">${resolvedFooterLinks
    .map((link) => `<a href=\"${esc(link.url)}\">${esc(link.label)}</a>`)
    .join("")}</div><div class=\"excluded-footer__copy\">${footerCopy}</div></div></div></section>`;
};

const renderBrandBar = (section: SectionBase, assets: RendererAssets) => {
  const data = section.data as Record<string, unknown>;
  const assetId = str(data.brandImageAssetId);
  const imageUrl = resolveAssetUrl(assets, assetId, str(data.brandImageUrl));
  const alt = esc(str(data.logoText || "ブランドバー"));
  if (imageUrl) {
    return `<section class="brand"><div class="container lp-brandbar" data-sticky="true"><div class="lp-brandbar-inner"><img src="${esc(imageUrl)}" alt="${alt}" class="lp-brandbar-image" /></div></div></section>`;
  }
  return `<section class="brand"><div class="container lp-brandbar" data-sticky="true"><div class="lp-brandbar-inner"><div class="w-full text-sm font-semibold">${alt}</div></div></div></section>`;
};

export const renderMainVisual = (
  section: SectionBase,
  assets: RendererAssets,
  device: RenderDevice,
  disableMotion = false
) => {
  const data = section.data as Record<string, unknown>;
  const { url } = resolveHeroImageWithFallback(data, assets, device);
  const alt = esc(str(data.alt || data.altText));
  const animationStyle = buildContentAnimationStyle(data.heroAnimation, disableMotion);
  const imageStyleAttr = animationStyle ? ` style="${animationStyle}"` : "";
  if (!url) {
    return `<section class="hero container"><div class="lp-hero"><div class="hero-placeholder">ヒーロー画像</div></div></section>`;
  }
  return `<section class="hero container"><div class="lp-hero"><img src="${esc(url)}" alt="${alt}" class="lp-hero-image"${imageStyleAttr} /></div></section>`;
};

export const renderTargetStores = (section: SectionBase) => {
  const title = esc(str((section.data as Record<string, unknown>).title || "対象店舗"));
  const note = esc(str((section.data as Record<string, unknown>).note || ""));
  return `<section class="container"><h2>${title}</h2><p>${note}</p><a class="stores-link" href="stores/target-stores.html">対象店舗検索へ</a></section>`;
};

const formatDate = (value: unknown) => str(value).replaceAll("-", "/");

const WEEKDAYS = ["日", "月", "火", "水", "木", "金", "土"];

const parseIsoDate = (value: unknown) => {
  const raw = str(value).trim();
  if (!raw) {
    return null;
  }
  const match = raw.match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})$/);
  if (!match) {
    return null;
  }
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  if (!Number.isFinite(year) || !Number.isFinite(month) || !Number.isFinite(day)) {
    return null;
  }
  const date = new Date(year, month - 1, day);
  if (
    date.getFullYear() !== year ||
    date.getMonth() + 1 !== month ||
    date.getDate() !== day
  ) {
    return null;
  }
  return date;
};

const getDateParts = (date: Date) => ({
  year: date.getFullYear(),
  month: date.getMonth() + 1,
  day: date.getDate(),
  weekday: WEEKDAYS[date.getDay()],
});

const sanitizeAdvancedPeriodStyle = (value: unknown) => {
  const raw = str(value).trim();
  if (!raw) {
    return "";
  }
  const declarations = raw
    .split(";")
    .map((entry) => entry.trim())
    .filter(Boolean)
    .filter((entry) => {
      const [propRaw, ...rest] = entry.split(":");
      if (!propRaw || rest.length === 0) {
        return false;
      }
      const prop = propRaw.trim();
      const val = rest.join(":").trim();
      return /^[a-zA-Z-]+$/.test(prop) && /^[#(),.%\s\w\-"']+$/.test(val);
    });
  return declarations.join(";");
};

const lightenHexColor = (value: string, amount = 0.12) => {
  const raw = str(value).trim();
  const match = raw.match(/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/);
  if (!match) {
    return raw;
  }
  const hex = match[1].length === 3
    ? match[1]
        .split("")
        .map((c) => c + c)
        .join("")
    : match[1];
  const clamp = (channel: number) => Math.max(0, Math.min(255, channel));
  const toHex = (channel: number) => channel.toString(16).padStart(2, "0");
  const blend = (channel: number) =>
    clamp(Math.round(channel + (255 - channel) * Math.max(0, Math.min(1, amount))));
  const r = blend(Number.parseInt(hex.slice(0, 2), 16));
  const g = blend(Number.parseInt(hex.slice(2, 4), 16));
  const b = blend(Number.parseInt(hex.slice(4, 6), 16));
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
};

const renderCampaignPeriodBar = (section: SectionBase, disableMotion = false) => {
  const data = section.data as Record<string, unknown>;
  const periodText = str(data.periodBarText).trim();
  const periodLabel =
    str(data.periodLabel ?? data.periodBarLabel ?? data.label).trim() ||
    "キャンペーン期間";
  const startDateRaw = str(data.startDate);
  const endDateRaw = str(data.endDate);
  const showWeekday =
    (typeof data.showWeekday === "boolean"
      ? data.showWeekday
      : typeof data.showDayOfWeek === "boolean"
      ? data.showDayOfWeek
      : true) !== false;
  const allowWrap = data.allowWrap !== false;
  const fullWidth = data.fullWidth !== false;

  const rawStyle =
    data.periodBarStyle && typeof data.periodBarStyle === "object"
      ? (data.periodBarStyle as Record<string, unknown>)
      : {};
  const textColor = str(rawStyle.color || "#FFFFFF");
  const bgColor = str(rawStyle.background || "#EB5505");
  const appearance = resolveSectionAppearanceFromSection(section, {
    headerBackgroundColor: bgColor,
    titleTextColor: textColor,
    accentColor: "#eb5505",
    borderColor: "#e5e7eb",
    headerStyle: "band",
    showHeaderBand: true,
  });
  const band = resolveUnifiedBandStyles(appearance);
  const bgTopColor = lightenHexColor(bgColor, 0.12);
  const labelColor = str(rawStyle.labelColor || appearance.titleTextColor || "#FFFFFF");
  const size =
    typeof rawStyle.size === "number" && Number.isFinite(rawStyle.size)
      ? Math.max(10, Math.min(32, rawStyle.size))
      : 14;
  const bold = rawStyle.bold !== false;
  const paddingX =
    typeof rawStyle.paddingX === "number" && Number.isFinite(rawStyle.paddingX)
      ? Math.max(0, Math.min(48, rawStyle.paddingX))
      : 18;
  const paddingY =
    typeof rawStyle.paddingY === "number" && Number.isFinite(rawStyle.paddingY)
      ? Math.max(0, Math.min(24, rawStyle.paddingY))
      : 0;
  const shadow = str(rawStyle.shadow || "none") === "soft"
    ? "0 3px 10px rgba(0, 0, 0, 0.12)"
    : "0 2px 6px rgba(0, 0, 0, 0.08)";
  const advancedStyle = sanitizeAdvancedPeriodStyle(rawStyle.advancedStyleText);

  const animationStyle = buildContentAnimationStyle(data.periodBarAnimation, disableMotion);
  const startDate = parseIsoDate(startDateRaw);
  const endDate = parseIsoDate(endDateRaw);
  const startParts = startDate ? getDateParts(startDate) : null;
  const endParts = endDate ? getDateParts(endDate) : null;
  const sameYear = startParts?.year === endParts?.year;

  const periodAlign =
    (
      section.style as {
        titleBand?: {
          textAlign?: "left" | "center" | "right";
        };
      }
    )?.titleBand?.textAlign ?? "center";
  const justify =
    periodAlign === "left"
      ? "flex-start"
      : periodAlign === "right"
      ? "flex-end"
      : "center";

  const fallbackLabel =
    periodText.length > 0
      ? periodText
      : `${formatDate(startDateRaw)} - ${formatDate(endDateRaw)}`;

  const dateHtml =
    startParts && endParts
      ? `${
          sameYear
            ? ""
            : `<span class=\"lp-periodbar__pair\"><span class=\"lp-periodbar__num\">${startParts.year}</span><span class=\"lp-periodbar__unit\">年</span></span>`
        }<span class=\"lp-periodbar__pair\"><span class=\"lp-periodbar__num\">${startParts.month}</span><span class=\"lp-periodbar__unit\">月</span></span><span class=\"lp-periodbar__pair\"><span class=\"lp-periodbar__num\">${startParts.day}</span><span class=\"lp-periodbar__unit\">日</span></span>${
          showWeekday
            ? `<span class=\"lp-periodbar__badge\">${startParts.weekday}</span>`
            : ""
        }<span class=\"lp-periodbar__sep\">～</span>${
          sameYear
            ? ""
            : `<span class=\"lp-periodbar__pair\"><span class=\"lp-periodbar__num\">${endParts.year}</span><span class=\"lp-periodbar__unit\">年</span></span>`
        }<span class=\"lp-periodbar__pair\"><span class=\"lp-periodbar__num\">${endParts.month}</span><span class=\"lp-periodbar__unit\">月</span></span><span class=\"lp-periodbar__pair\"><span class=\"lp-periodbar__num\">${endParts.day}</span><span class=\"lp-periodbar__unit\">日</span></span>${
          showWeekday
            ? `<span class=\"lp-periodbar__badge\">${endParts.weekday}</span>`
            : ""
        }`
      : `<span class=\"lp-periodbar__num\">${esc(fallbackLabel)}</span>`;

  const rootStyle = [
    `--lp-periodbar-bg:${esc(appearance.headerBackgroundColor)}`,
    `--lp-periodbar-bg-top:${esc(bgTopColor || "#ff6a1a")}`,
    `--lp-periodbar-bg-bottom:${esc(appearance.headerBackgroundColor)}`,
    `--lp-periodbar-text:${esc(appearance.titleTextColor)}`,
    `--lp-periodbar-band:${esc(appearance.headerBackgroundColor)}`,
    `--lp-periodbar-label:${esc(labelColor)}`,
    `--lp-periodbar-pad-x:${paddingX}px`,
    `--lp-periodbar-pad-y:${paddingY}px`,
    `--lp-periodbar-shadow:${esc(shadow)}`,
    advancedStyle,
    animationStyle,
  ]
    .filter(Boolean)
    .join(";");
  const textStyle = `font-weight:${bold ? 700 : 600};font-size:calc(${Math.max(12, Math.max(size + 4, band.titleSizePx))}px * var(--lp-font-scale, 1));`;
  const centerMaxWidth = fullWidth ? "100%" : `${band.maxWidthPx}px`;

  return `<section class=\"lp-periodbar lp-periodbar--responsive ${allowWrap ? "" : "lp-periodbar--nowrap"}\" data-testid=\"campaign-period-bar\" style=\"${rootStyle}\"><div class=\"lp-periodbar__center\" style=\"justify-content:${justify};text-align:${periodAlign};max-width:${centerMaxWidth};margin:0 auto;padding:${band.headerPadding};\"><div class=\"lp-periodbar__label\">${esc(periodLabel)}</div><div class=\"lp-periodbar__date\" style=\"${textStyle}\">${dateHtml}</div></div></section>`;
};

const renderSectionOptionalBlocks = (section: SectionBase) => {
  const data = section.data as Record<string, unknown>;
  const sectionExtra =
    data.extra && typeof data.extra === "object"
      ? (data.extra as Record<string, unknown>)
      : {};
  const sectionExtensions =
    data.extensions && typeof data.extensions === "object"
      ? (data.extensions as Record<string, unknown>)
      : {};
  const content = section.content as
    | {
        buttons?: Array<{
          label?: unknown;
          href?: unknown;
          variant?: unknown;
        }>;
        media?: Array<{
          imageUrl?: unknown;
          alt?: unknown;
          caption?: unknown;
          width?: unknown;
          align?: unknown;
        }>;
      }
    | undefined;

  const rawButtons = Array.isArray(sectionExtra.buttons)
    ? sectionExtra.buttons
    : Array.isArray(sectionExtensions.buttons)
    ? sectionExtensions.buttons
    : Array.isArray(content?.buttons)
    ? content.buttons
    : [];
  const rawMedia = Array.isArray(sectionExtra.images)
    ? sectionExtra.images
    : Array.isArray(sectionExtensions.images)
    ? sectionExtensions.images
    : Array.isArray(content?.media)
    ? content.media
    : [];
  const buttons = rawButtons as Array<{
    label?: unknown;
    href?: unknown;
    variant?: unknown;
  }>;
  const media = rawMedia as Array<{
    imageUrl?: unknown;
    alt?: unknown;
    caption?: unknown;
    width?: unknown;
    align?: unknown;
  }>;
  if (buttons.length === 0 && media.length === 0) {
    return "";
  }

  const buttonsHtml = buttons
    .map((button) => {
      const label = str(button.label).trim();
      const href = esc(str(button.href || "#").trim() || "#");
      const rawVariant = str(button.variant);
      const variant =
        rawVariant === "secondary" || rawVariant === "link"
          ? rawVariant
          : "primary";
      if (!label) {
        return "";
      }
      const style =
        variant === "link"
          ? "background:transparent;color:#ea5504;border:none;text-decoration:underline;padding:0;"
          :
        variant === "secondary"
          ? "background:#ffffff;color:#ea5504;border:1px solid #ea5504;"
          : "background:#ea5504;color:#ffffff;border:1px solid #ea5504;";
      return `<a href=\"${href}\" style=\"display:inline-flex;align-items:center;justify-content:center;padding:10px 18px;border-radius:999px;text-decoration:none;font-weight:700;font-size:14px;${style}\">${renderRichInline(label)}</a>`;
    })
    .join("");

  const mediaHtml = media
    .map((item) => {
      const imageUrl = esc(str(item.imageUrl).trim());
      if (!imageUrl) {
        return "";
      }
      const alt = esc(str(item.alt));
      const caption = str(item.caption).trim();
      const align = str(item.align) === "left" || str(item.align) === "right" ? str(item.align) : "center";
      const widthRaw = Number(item.width);
      const width = Number.isFinite(widthRaw) ? Math.max(20, Math.min(100, widthRaw)) : 100;
      const textAlign = align === "left" ? "left" : align === "right" ? "right" : "center";
      const margin = align === "left" ? "0 auto 0 0" : align === "right" ? "0 0 0 auto" : "0 auto";
      return `<figure style=\"margin:0;max-width:${width}%;text-align:${textAlign};\"><img src=\"${imageUrl}\" alt=\"${alt}\" style=\"display:block;width:100%;height:auto;border-radius:10px;margin:${margin};\"/>${
        caption
          ? `<figcaption style=\"margin-top:8px;font-size:12px;line-height:1.6;color:#4b5563;\">${renderRichInline(caption, true)}</figcaption>`
          : ""
      }</figure>`;
    })
    .join("");

  if (!buttonsHtml && !mediaHtml) {
    return "";
  }

  return `<div class=\"lp-optional-blocks\" style=\"margin-top:16px;display:flex;flex-direction:column;gap:12px;\">${
    buttonsHtml
      ? `<div class=\"lp-optional-blocks__buttons\" style=\"display:flex;flex-wrap:wrap;gap:10px;justify-content:center;\">${buttonsHtml}</div>`
      : ""
  }${mediaHtml ? `<div class=\"lp-optional-blocks__media\" style=\"display:flex;flex-direction:column;gap:12px;\">${mediaHtml}</div>` : ""}</div>`;
};

const renderCampaignOverview = (section: SectionBase) => {
  const data = section.data as Record<string, unknown>;
  const appearance = resolveSectionAppearanceFromSection(section, {
    headerBackgroundColor: "#ea5504",
    titleTextColor: "#ffffff",
    accentColor: "#eb5505",
    borderColor: "#e5e7eb",
    headerStyle: "band",
    showHeaderBand: true,
  });
  const contentTitle =
    section.content && typeof section.content.title === "string" ? section.content.title : "";
  const title = renderRichInline(contentTitle || data.title || "キャンペーン概要");
  const bodyWidthPctRaw =
    typeof data.bodyWidthPct === "number" && Number.isFinite(data.bodyWidthPct)
      ? data.bodyWidthPct
      : 100;
  const bodyWidthPct = Math.max(70, Math.min(100, bodyWidthPctRaw));
  const noticeEnabled = data.noticeEnabled !== false;
  const noticeBg = esc(str(data.noticeBg || "#fff7ed"));
  const noticeBorder = esc(str(data.noticeBorderColor || "#fed7aa"));
  const noticePaddingRaw =
    typeof data.noticePaddingPx === "number" && Number.isFinite(data.noticePaddingPx)
      ? data.noticePaddingPx
      : 14;
  const noticePadding = Math.max(8, Math.min(32, noticePaddingRaw));
  const bodyTextSizeRaw =
    typeof data.bodyTextSizePx === "number" && Number.isFinite(data.bodyTextSizePx)
      ? data.bodyTextSizePx
      : 14;
  const bodyTextSize = Math.max(10, Math.min(28, bodyTextSizeRaw));
  const bodyTextColor = esc(str(data.bodyTextColor || "#111827"));
  const noticeTextSizeRaw =
    typeof data.noticeTextSizePx === "number" && Number.isFinite(data.noticeTextSizePx)
      ? data.noticeTextSizePx
      : 13;
  const noticeTextSize = Math.max(10, Math.min(24, noticeTextSizeRaw));
  const noticeTextColor = esc(str(data.noticeTextColor || "#92400e"));

  const contentItems = Array.isArray(section.content?.items) ? section.content.items : [];
  const textItems = contentItems.filter((item) => item.type === "text");
  const noticeTextItem = textItems.find(
    (item) =>
      item.type === "text" &&
      item.lines.length > 0 &&
      item.lines.every((line) => Boolean(line.marks?.callout?.enabled))
  );
  const bodyTextItem = textItems.find((item) => item.id !== noticeTextItem?.id) ?? textItems[0];

  const bodyLines =
    bodyTextItem && bodyTextItem.type === "text" && bodyTextItem.lines.length > 0
      ? bodyTextItem.lines.map((line) => str(line.text || "")).filter((line) => line.trim())
      : str(data.body || "")
          .split(/\r?\n/)
          .map((line) => line.trim())
          .filter((line) => line.length > 0);

  const noticeLines =
    noticeTextItem && noticeTextItem.type === "text" && noticeTextItem.lines.length > 0
      ? noticeTextItem.lines.map((line) => str(line.text || "")).filter((line) => line.trim())
      : Array.isArray(data.noticeLines)
      ? data.noticeLines.map((line) => str(line)).filter((line) => line.trim())
      : [];

  const bodyHtml = bodyLines
    .map(
      (line) =>
        `<p style="margin:0;text-align:center;font-size:${bodyTextSize}px;line-height:1.8;font-weight:700;color:${bodyTextColor};">${renderRichInline(line, true)}</p>`
    )
    .join("");
  const noticeHtml = noticeLines
    .map(
      (line) =>
        `<p style="margin:0;font-size:${noticeTextSize}px;line-height:1.75;color:${noticeTextColor};">${renderRichInline(line, true)}</p>`
    )
    .join("");
  const optionalBlocksHtml = renderSectionOptionalBlocks(section);
  const band = resolveUnifiedBandStyles(appearance);

  return `<section class="container campaign-overview"><div class="lp-section-shell" style="padding:0;"><div class="lp-section-card" style="max-width:${band.maxWidthPx}px;margin:0 auto;overflow:visible;background:transparent;border:none;box-shadow:none;"><div class="lp-section-header" style="background:${band.headerBg};padding:${band.headerPadding};border-radius:${band.headerRadius};${band.headerShadow}"><h2 class="lp-section-title" style="color:${band.titleColor};font-size:${band.titleSizePx}px;font-weight:700;margin:0;text-align:center;">${title}</h2></div><div class="lp-section-body" style="padding:0;background:transparent;"><div style="width:min(100%, ${bodyWidthPct}%);max-width:${band.maxWidthPx}px;margin:0 auto;background:#ffffff;border:1px solid ${appearance.borderColor};border-radius:12px;padding:24px;box-shadow:0 8px 20px rgba(15,23,42,0.08);display:flex;flex-direction:column;gap:12px;">${bodyHtml}${
    noticeEnabled && noticeHtml
      ? `<div style="margin-top:4px;background:${noticeBg};border:1px solid ${noticeBorder};border-radius:10px;padding:${noticePadding}px;display:flex;flex-direction:column;gap:8px;">${noticeHtml}</div>`
      : ""
  }${optionalBlocksHtml}</div></div></div></div></section>`;
};

const renderPaymentHistoryGuide = (
  section: SectionBase,
  assets: RendererAssets
) => {
  const data = section.data as Record<string, unknown>;
  const appearance = resolveSectionAppearanceFromSection(section, {
    headerBackgroundColor: "#ea5504",
    titleTextColor: "#ffffff",
    accentColor: "#eb5505",
    borderColor: "#e5e7eb",
    headerStyle: "band",
    showHeaderBand: true,
  });
  const body = str(data.body || "");
  const linkText = str(data.linkText || "");
  const linkUrl = esc(str(data.linkUrl || ""));
  const linkTargetKind = data.linkTargetKind === "section" ? "section" : "url";
  const linkSectionId = str(data.linkSectionId || "");
  const resolvedLinkUrl =
    linkTargetKind === "section" && linkSectionId
      ? `#sec-${linkSectionId}`
      : linkUrl;
  const linkSuffix = str(data.linkSuffix || "");
  const alert = str(data.alert || "");
  const imageUrl = str(data.imageUrl || "");
  const imageAlt = esc(str(data.imageAlt || ""));
  const imageAssetId = str(data.imageAssetId || "");
  const resolvedImage = resolveAssetUrl(assets, imageAssetId, imageUrl);
  const bodyHtml = renderRichInline(body, true);
  const alertHtml = renderRichInline(alert, true);
  const optionalBlocksHtml = renderSectionOptionalBlocks(section);
  const linkHtml =
    linkText && resolvedLinkUrl
      ? `<a class="payment-guide__link" href="${resolvedLinkUrl}" style="color:${appearance.accentColor};">${renderRichInline(linkText)}</a>`
      : "";
  const bodyWithLink = `${bodyHtml}${linkHtml ? ` ${linkHtml}` : ""}${renderRichInline(linkSuffix)}`;

  return `<section class="payment-guide" style="border:1px solid ${appearance.borderColor};border-radius:12px;padding:14px;">${
    bodyWithLink ? `<p class="payment-guide__body">${bodyWithLink}</p>` : ""
  }${
    alertHtml
      ? `<p class="payment-guide__alert" style="border-left:4px solid ${appearance.accentColor};padding-left:10px;">${alertHtml}</p>`
      : ""
  }${
    resolvedImage
      ? `<div class="payment-guide__image"><img src="${esc(
          resolvedImage
        )}" alt="${imageAlt}" /></div>`
      : `<div class="payment-guide__image payment-guide__image--placeholder">画像を追加してください</div>`
  }${optionalBlocksHtml}</section>`;
};

export const renderRankingTable = (section: SectionBase) => {
  const data = (section.data ?? {}) as Record<string, unknown>;
  const appearance = resolveSectionAppearanceFromSection(section, {
    headerBackgroundColor: "#ea5504",
    titleTextColor: "#ffffff",
    accentColor: "#eb5505",
    borderColor: "#d5dbe5",
    headerStyle: "band",
    showHeaderBand: true,
  });
  const rankHeaderLabel = "順位";
  const rawColumns = Array.isArray(data.columns) ? data.columns : [];
  const columns = (rawColumns.length > 0 ? rawColumns : [
    { key: "amount", label: "決済金額" },
    { key: "count", label: "品数" },
  ])
    .map((col, index) => {
      if (typeof col === "string") {
        return { key: `col_${index + 1}`, label: col };
      }
      const entry = col && typeof col === "object"
        ? (col as Record<string, unknown>)
        : {};
      return {
        key: typeof entry.key === "string" ? entry.key : `col_${index + 1}`,
        label: typeof entry.label === "string" ? entry.label : `列${index + 1}`,
      };
    });
  const columnCount = columns.length;

  const rows = Array.isArray(data.rows) ? (data.rows as Array<Record<string, unknown>>) : [];
  const normalizedRows = rows.map((row, index) => {
    if (Array.isArray(row)) {
      const values = row.map((value) => String(value));
      return {
        id: `rank_${index + 1}`,
        rank: String(index + 1),
        values: values
          .slice(0, columnCount)
          .concat(Array(Math.max(0, columnCount - values.length)).fill("")),
      };
    }
    const entry = row && typeof row === "object"
      ? (row as Record<string, unknown>)
      : {};
    const rawValues = Array.isArray(entry.values)
      ? entry.values.map((value) => String(value))
      : [
          String(entry.product ?? entry.label ?? ""),
          String(entry.description ?? entry.value ?? ""),
        ];
    return {
      id:
        typeof entry.id === "string" && entry.id.trim()
          ? entry.id
          : `rank_${index + 1}`,
      rank: str(entry.rank ?? index + 1),
      values: rawValues
        .slice(0, columnCount)
        .concat(Array(Math.max(0, columnCount - rawValues.length)).fill("")),
    };
  });

  const title = renderRichInline(data.title || "ランキング");
  const latestLabel = renderRichInline(data.subtitle || "最新順位はこちら");
  const period = renderRichInline(data.period || "");
  const dateText = renderRichInline(data.date || "");
  const notes = Array.isArray(data.notes)
    ? data.notes.map((note) => renderRichInline(note))
    : [];

  const headerCells = columns
    .map(
      (column) =>
        `<div style="padding:10px;border:1px solid #d5dbe5;border-radius:4px;background:#eceff4;text-align:center;font-weight:700;color:#1f2937;">${esc(
          str(column.label)
        )}</div>`
    )
    .join("");

  const rowsHtml = normalizedRows
    .map((row, index) => {
      const rankText = esc(str(row.rank || index + 1));
      const rankNum = Number.parseInt(str(row.rank || index + 1), 10);
      const badgeBg =
        rankNum === 1
          ? appearance.accentColor
          : rankNum === 2
          ? "#bfcbe9"
          : rankNum === 3
          ? "#f6a04a"
          : "#d1d5db";
      const valueCells = row.values
        .map((value) => {
          const cellText = value.trim() ? value : "-";
          return `<div style="padding:10px;border:1px solid #d5dbe5;border-radius:4px;background:#f8fafc;text-align:center;font-weight:700;color:#1f2937;">${renderRichInline(
            cellText
          )}</div>`;
        })
        .join("");
      return `<div style="display:grid;grid-template-columns:clamp(72px,12vw,160px) repeat(${Math.max(
        1,
        columnCount
      )}, minmax(0, 1fr));gap:8px;"><div style="padding:8px;border:1px solid #d5dbe5;border-radius:4px;background:#f8fafc;display:flex;justify-content:center;align-items:center;"><span style="display:inline-flex;justify-content:center;align-items:center;width:30px;height:30px;border-radius:999px;background:${badgeBg};font-weight:800;color:#111827;">${rankText}</span></div>${valueCells}</div>`;
    })
    .join("");

  const notesHtml = notes.length
    ? `<ul style="margin:14px 0 0;padding:0;list-style:none;color:#6b7280;font-size:13px;line-height:1.6;">${notes
        .map((note) => `<li>※${note.replace(/^※+/, "")}</li>`)
        .join("")}</ul>`
    : "";
  const band = resolveUnifiedBandStyles(appearance);

  return `<section class="container ranking-table"><div class="lp-section-shell" style="padding:0;"><div class="lp-section-card" style="max-width:${band.maxWidthPx}px;margin:0 auto;overflow:visible;background:transparent;border:none;box-shadow:none;"><div class="lp-section-header" style="background:${band.headerBg};padding:${band.headerPadding};border-radius:${band.headerRadius};${band.headerShadow}"><h2 class="lp-section-title" style="color:${band.titleColor};font-size:${band.titleSizePx}px;font-weight:700;margin:0;text-align:center;">${title}</h2></div><div class="lp-section-body" style="padding:0;background:transparent;"><div style="width:100%;max-width:${band.maxWidthPx}px;margin:0 auto;background:#ffffff;border:1px solid ${appearance.borderColor};border-radius:12px;padding:clamp(12px,2vw,28px);box-shadow:0 8px 20px rgba(15,23,42,0.08);"><div style="text-align:center;margin-bottom:16px;"><div style="font-size:clamp(16px,2vw,30px);font-weight:700;color:#5f6368;">${latestLabel}</div>${
    period
      ? `<div style="display:inline-flex;gap:8px;align-items:center;background:#f1f5f9;border-radius:4px;padding:4px 10px;margin-top:8px;flex-wrap:wrap;justify-content:center;"><span style="font-size:clamp(14px,1.5vw,24px);font-weight:700;color:#111827;">集計期間</span><span style="font-size:clamp(14px,1.5vw,24px);color:#6b7280;">${period}</span></div>`
      : ""
  }${dateText ? `<div style="margin-top:8px;font-size:clamp(20px,3.2vw,50px);font-weight:800;color:#111827;">${dateText}</div>` : ""}</div><div style="display:grid;grid-template-columns:clamp(72px,12vw,160px) repeat(${Math.max(
    1,
    columnCount
  )}, minmax(0, 1fr));gap:8px;">` +
  `<div style="padding:10px;border:1px solid #d5dbe5;border-radius:4px;background:#eceff4;text-align:center;font-weight:700;color:#1f2937;">${rankHeaderLabel}</div>${headerCells}</div>` +
  `<div style="display:flex;flex-direction:column;gap:8px;margin-top:8px;">${rowsHtml}</div>${notesHtml}</div></div></div></div></section>`;
};

export const renderCouponFlow = (
  section: SectionBase,
  assets: RendererAssets,
  disableMotion = false
) => {
  const data = (section.data ?? {}) as Record<string, unknown>;
  const appearance = resolveSectionAppearanceFromSection(section, {
    headerBackgroundColor: "#ea5504",
    titleTextColor: "#ffffff",
    accentColor: "#eb5505",
    borderColor: "#d1d5db",
    headerStyle: "band",
    showHeaderBand: true,
  });
  const rawVariant = str(data.variant ?? "slideshow");
  const variant =
    rawVariant === "stepCards" || rawVariant === "timeline" || rawVariant === "simpleList"
      ? rawVariant
      : "slideshow";

  const lead = renderRichInline(
    data.lead || "＊必ずクーポンを獲得してからau PAY（コード支払い）でお支払いください。",
    true
  );
  const note = renderRichInline(data.note || "※画面はイメージです。", true);

  const rawSteps = Array.isArray(data.steps) ? data.steps : [];
  const steps = rawSteps.map((step, index) => {
    const entry = step && typeof step === "object"
      ? (step as Record<string, unknown>)
      : {};
    const imageUrl = resolveAssetUrl(
      assets,
      str(entry.imageAssetId),
      str(entry.imageUrl)
    );
    const iconUrl = resolveAssetUrl(
      assets,
      str(entry.iconAssetId),
      str(entry.iconUrl)
    );
    return {
      stepNo: esc(str(entry.stepNo ?? index + 1)),
      title: renderRichInline(entry.title ?? "", true),
      description: renderRichInline(entry.description ?? "", true),
      supplement: renderRichInline(entry.supplement ?? "", true),
      imageUrl,
      imageAlt: esc(str(entry.imageAlt ?? "")),
      iconUrl,
      buttonText: renderRichInline(entry.buttonText ?? ""),
      buttonUrl: esc(str(entry.buttonUrl ?? "")),
    };
  });

  const ctaEnabled = data.ctaEnabled !== false;
  const buttonPreset = str(data.buttonPreset || "couponFlow");
  const buttonVariant = str(data.buttonVariant || "primary") === "secondary" ? "secondary" : "primary";
  const buttonLabel = esc(str(data.buttonLabel || "クーポンを獲得する"));
  const buttonUrl = esc(str(data.buttonUrl || "#"));
  const buttonBg = esc(
    str(data.buttonBg || (buttonPreset === "couponFlow" ? appearance.headerBackgroundColor : appearance.accentColor))
  );
  const buttonTextColor = esc(str(data.buttonTextColor || "#ffffff"));
  const buttonBorderColor = esc(
    str(data.buttonBorderColor || (buttonPreset === "couponFlow" ? "#ffffff" : appearance.accentColor))
  );
  const buttonBorderWidth =
    buttonPreset === "couponFlow" ? 2 : 1;
  const buttonRadius =
    typeof data.buttonRadius === "number" && Number.isFinite(data.buttonRadius)
      ? data.buttonRadius
      : 999;
  const buttonShadow = esc(str(data.buttonShadow || "0 6px 14px rgba(0, 0, 0, 0.18)"));

  const rawDesign =
    data.design && typeof data.design === "object"
      ? (data.design as Record<string, unknown>)
      : {};
  const styleVars = [
    `--coupon-step-number-color:${esc(str(rawDesign.stepNumberColor ?? "#ffffff"))}`,
    `--coupon-step-number-bg:${esc(str(rawDesign.stepNumberBg ?? appearance.accentColor))}`,
    `--coupon-card-bg:${esc(str(rawDesign.cardBg ?? "#ffffff"))}`,
    `--coupon-card-text:${esc(str(rawDesign.cardText ?? "#0f172a"))}`,
    `--coupon-card-border:${esc(str(rawDesign.borderColor ?? appearance.borderColor))}`,
    `--coupon-card-radius:${esc(str(rawDesign.radius ?? 12))}px`,
    `--coupon-card-shadow:${esc(str(rawDesign.shadow ?? "0 8px 20px rgba(15, 23, 42, 0.08)"))}`,
    `--coupon-step-gap:${esc(str(rawDesign.gap ?? 16))}px`,
  ].join(";");

  const animStyle = buildContentAnimationStyle(data.couponFlowAnimation, disableMotion);
  const animAttr = animStyle ? ` style=\"${animStyle}\"` : "";

  const stepsHtml =
    steps.length === 0
      ? `<div class=\"coupon-flow__placeholder\">ステップを追加してください</div>`
      : steps
          .map(
            (step) => `<article class=\"coupon-flow__step-card\"><div class=\"coupon-flow__step-head\"><span class=\"coupon-flow__step-no\">${step.stepNo}</span></div>${
              step.imageUrl
                ? `<img class=\"coupon-flow__step-image\" src=\"${esc(str(step.imageUrl))}\" alt=\"${step.imageAlt}\" />`
                : ""
            }${step.description ? `<p class=\"coupon-flow__step-description\">${step.description}</p>` : ""}</article>`
          )
          .join("");

  const ctaHtml =
    ctaEnabled && buttonLabel
      ? `<a class=\"coupon-flow__cta\" href=\"${buttonUrl}\" style=\"background:${
          buttonVariant === "secondary" ? "transparent" : buttonBg
        };color:${buttonTextColor};border-color:${buttonBorderColor};border-width:${buttonBorderWidth}px;border-radius:${buttonRadius}px;box-shadow:${buttonShadow};\">${buttonLabel}</a>`
      : "";
  const optionalBlocksHtml = renderSectionOptionalBlocks(section);

  if (variant === "slideshow") {
    const hasMultiple = steps.length > 1;
    const slidesHtml =
      steps.length === 0
        ? `<div class=\"lp-couponflow__slide is-active\"><div class=\"lp-couponflow__placeholder\">画像を追加してください</div></div>`
        : steps
            .map((step, index) => {
              const slideImage = step.imageUrl
                ? `<img src=\"${esc(str(step.imageUrl))}\" alt=\"${step.imageAlt}\" class=\"lp-couponflow__image\" />`
                : `<div class=\"lp-couponflow__placeholder\">画像を追加してください</div>`;
              return `<div class=\"lp-couponflow__slide${index === 0 ? " is-active" : ""}\" data-coupon-slide-index=\"${index}\">${slideImage}</div>`;
            })
            .join("");
    const navHtml = hasMultiple
      ? `<button type=\"button\" class=\"lp-couponflow__nav lp-couponflow__nav--prev\" aria-label=\"前へ\" data-coupon-nav=\"prev\"></button><button type=\"button\" class=\"lp-couponflow__nav lp-couponflow__nav--next\" aria-label=\"次へ\" data-coupon-nav=\"next\"></button>`
      : "";
    const dotsHtml = hasMultiple
      ? `<div class=\"lp-couponflow__dots\">${steps
          .map((_, index) =>
            `<button type=\"button\" class=\"lp-couponflow__dot${index === 0 ? " is-active" : ""}\" data-coupon-dot=\"${index}\" aria-label=\"スライド${index + 1}\"></button>`
          )
          .join("")}</div>`
      : "";
    const slideshowCtaHtml =
      ctaEnabled && buttonLabel
        ? `<a class=\"lp-couponflow__cta\" href=\"${buttonUrl}\" style=\"background:${
            buttonVariant === "secondary" ? "transparent" : buttonBg
          };color:${buttonTextColor};border-color:${buttonBorderColor};border-width:${buttonBorderWidth}px;border-radius:${buttonRadius}px;box-shadow:${buttonShadow};\">${buttonLabel}</a>`
        : "";

    return `<section class=\"lp-couponflow\" data-section-type=\"couponFlow\" data-coupon-variant=\"slideshow\" data-coupon-slideshow=\"true\"><div class=\"lp-couponflow__body\">${
      lead ? `<p class=\"lp-couponflow__lead\">${lead}</p>` : ""
    }<div class=\"lp-couponflow__slider\"><div class=\"lp-couponflow__frame\">${slidesHtml}</div>${navHtml}${dotsHtml}</div>${note ? `<p class=\"lp-couponflow__note\">${note}</p>` : ""}${slideshowCtaHtml}${optionalBlocksHtml}</div></section>`;
  }

  if (variant === "stepCards") {
    return `<section class=\"coupon-flow coupon-flow--stepCards\" style=\"${styleVars}\"><div class=\"coupon-flow__body\"${animAttr}>${
      lead ? `<p class=\"coupon-flow__lead\">${lead}</p>` : ""
    }<div class=\"coupon-flow__steps coupon-flow__steps--cards\">${stepsHtml}</div>${note ? `<p class=\"coupon-flow__note\">${note}</p>` : ""}${ctaHtml}${optionalBlocksHtml}</div></section>`;
  }

  if (variant === "timeline") {
    const timelineHtml =
      steps.length === 0
        ? `<div class=\"coupon-flow__placeholder\">ステップを追加してください</div>`
        : steps
            .map(
              (step) => `<article class=\"coupon-flow__timeline-item\"><div class=\"coupon-flow__timeline-dot\">${step.stepNo}</div><div class=\"coupon-flow__timeline-content\">${
                step.imageUrl
                  ? `<img class=\"coupon-flow__step-image\" src=\"${esc(str(step.imageUrl))}\" alt=\"${step.imageAlt}\" />`
                  : ""
              }${step.description ? `<p class=\"coupon-flow__step-description\">${step.description}</p>` : ""}</div></article>`
            )
            .join("");
    return `<section class=\"coupon-flow coupon-flow--timeline\" style=\"${styleVars}\"><div class=\"coupon-flow__body\"${animAttr}>${
      lead ? `<p class=\"coupon-flow__lead\">${lead}</p>` : ""
    }<div class=\"coupon-flow__timeline\">${timelineHtml}</div>${note ? `<p class=\"coupon-flow__note\">${note}</p>` : ""}${ctaHtml}${optionalBlocksHtml}</div></section>`;
  }

  const simpleListHtml =
    steps.length === 0
      ? `<li class=\"coupon-flow__simple-item\">ステップを追加してください</li>`
      : steps
          .map(
            (step) => `<li class=\"coupon-flow__simple-item\"><span class=\"coupon-flow__simple-no\">${step.stepNo}.</span><span class=\"coupon-flow__simple-text\">${step.description || step.title || ""}</span></li>`
          )
          .join("");
  return `<section class=\"coupon-flow coupon-flow--simpleList\" style=\"${styleVars}\"><div class=\"coupon-flow__body\"${animAttr}>${
    lead ? `<p class=\"coupon-flow__lead\">${lead}</p>` : ""
  }<ol class=\"coupon-flow__simple-list\">${simpleListHtml}</ol>${note ? `<p class=\"coupon-flow__note\">${note}</p>` : ""}${ctaHtml}${optionalBlocksHtml}</div></section>`;
};

export const renderTabbedNotes = (section: SectionBase, assets: RendererAssets) => {
  void assets;
  const data = (section.data ?? {}) as Record<string, unknown>;
  const appearance = resolveSectionAppearanceFromSection(section, {
    headerBackgroundColor: "#000000",
    titleTextColor: "#ffffff",
    accentColor: "#EB5505",
    borderColor: "#000000",
    headerStyle: "band",
    showHeaderBand: true,
  });
  const rawTabs = Array.isArray(data.tabs) ? data.tabs : [];
  const tabs = rawTabs.map((tab, index) => {
    const entry = tab && typeof tab === "object"
      ? (tab as Record<string, unknown>)
      : {};
    const legacyItems = Array.isArray(entry.items) ? entry.items : [];
    const notes = Array.isArray(entry.notes)
      ? entry.notes.map((note) => str(note)).filter((note) => note.trim().length > 0)
      : [
          ...legacyItems.map((item) => {
            const itemEntry = item && typeof item === "object"
              ? (item as Record<string, unknown>)
              : {};
            return str(itemEntry.text ?? "");
          }),
          str(entry.footnote ?? ""),
        ].filter((note) => note.trim().length > 0);

    return {
      id: typeof entry.id === "string" && entry.id.trim() ? entry.id : `tab_${index + 1}`,
      label: esc(str(entry.label ?? entry.labelTop ?? entry.labelBottom ?? `タブ${index + 1}`)),
      contentTitle: esc(str(entry.contentTitle ?? entry.intro ?? "")),
      notes,
    };
  });
  const safeTabs =
    tabs.length > 0
      ? tabs
      : [
          {
            id: "tab_1",
            label: "タブ1",
            contentTitle: "",
            notes: ["注意文言を追加してください。"],
          },
        ];

  const initialTabIndexRaw =
    typeof data.initialTabIndex === "number" && Number.isFinite(data.initialTabIndex)
      ? Math.floor(data.initialTabIndex)
      : 0;
  const initialTabIndex = Math.max(0, Math.min(safeTabs.length - 1, initialTabIndexRaw));

  const rawStyle = data.tabStyle && typeof data.tabStyle === "object"
    ? (data.tabStyle as Record<string, unknown>)
    : {};
  const rawVariant = typeof rawStyle.variant === "string" ? rawStyle.variant : "simple";
  const variant =
    rawVariant === "sticky" || rawVariant === "underline" || rawVariant === "popout"
      ? rawVariant
      : "simple";
  const tabStyle = {
    variant,
    showBorder: rawStyle.showBorder !== false,
    inactiveBg: typeof rawStyle.inactiveBg === "string" ? rawStyle.inactiveBg : "#DDDDDD",
    inactiveText:
      typeof rawStyle.inactiveText === "string" ? rawStyle.inactiveText : "#000000",
    activeBg:
      typeof rawStyle.activeBg === "string"
        ? rawStyle.activeBg
        : appearance.showHeaderBand
        ? appearance.headerBackgroundColor
        : appearance.accentColor,
    activeText:
      typeof rawStyle.activeText === "string"
        ? rawStyle.activeText
        : appearance.titleTextColor,
    border: typeof rawStyle.border === "string" ? rawStyle.border : appearance.borderColor,
    contentBg: typeof rawStyle.contentBg === "string" ? rawStyle.contentBg : "#FFFFFF",
    contentBorder:
      typeof rawStyle.contentBorder === "string"
        ? rawStyle.contentBorder
        : appearance.borderColor,
    accent:
      typeof rawStyle.accent === "string" ? rawStyle.accent : appearance.accentColor,
  };
  const borderColor = tabStyle.showBorder ? tabStyle.border : "transparent";
  const contentBorderColor = tabStyle.showBorder ? tabStyle.contentBorder : "transparent";
  const styleVars = [
    `--tab-inactive-bg:${esc(str(tabStyle.inactiveBg))}`,
    `--tab-inactive-text:${esc(str(tabStyle.inactiveText))}`,
    `--tab-active-bg:${esc(str(tabStyle.activeBg))}`,
    `--tab-active-text:${esc(str(tabStyle.activeText))}`,
    `--tab-border:${esc(str(borderColor))}`,
    `--tab-content-bg:${esc(str(tabStyle.contentBg))}`,
    `--tab-content-border:${esc(str(contentBorderColor))}`,
    `--tab-accent:${esc(str(tabStyle.accent))}`,
  ].join(";");

  const tabName = `tab-${section.id}`;
  const tabHtml = safeTabs
    .map((tab, index) => {
      const tabId = `${tabName}-${index + 1}`;
      const notesHtml = tab.notes
        .map((note) => {
          const useBullet = !note.trim().startsWith("※");
          return `<li class=\"tabbed-notes__item ${useBullet ? "is-disc" : ""}\">${renderRichInline(note, true)}</li>`;
        })
        .join("");

      const intro = tab.contentTitle.trim() === "注意事項" ? "" : tab.contentTitle;
      return `<input id=\"${tabId}\" type=\"radio\" name=\"${tabName}\" class=\"tabbed-notes__switch\" ${
        index === initialTabIndex ? "checked=\"checked\"" : ""
      }><label class=\"tabbed-notes__label\" for=\"${tabId}\">${
        ""
      }<span class=\"tabbed-notes__label-bottom\">${tab.label}</span></label><div class=\"tabbed-notes__content\"><div class=\"tabbed-notes__panel\">${
        intro ? `<p class=\"tabbed-notes__intro\">${intro}</p>` : ""
      }<ul class=\"tabbed-notes__list\">${notesHtml}</ul></div></div>`;
    })
    .join("");

  const scope = `#sec-${esc(section.id)}`;
  const scopedStyle = `<style>${scope} .tabbed-notes{margin:16px auto 0;max-width:820px;}${scope} .tabbed-notes__wrap{display:flex;flex-wrap:wrap;margin:0 0 4px;border-bottom:1px solid var(--tab-border,#000000);}${scope} .tabbed-notes__label{color:var(--tab-inactive-text,#000000);background:var(--tab-inactive-bg,#dddddd);font-size:16px;font-weight:600;white-space:nowrap;text-align:center;padding:10px 8px;order:-1;position:relative;z-index:1;cursor:pointer;border-radius:16px 16px 0 0;flex:1;}${scope} .tabbed-notes__label:not(:last-of-type){border-right:1px solid var(--tab-border,#000000);}${scope} .tabbed-notes__label-bottom{display:block;line-height:1.2;}${scope} .tabbed-notes__content{width:100%;height:0;overflow:hidden;opacity:0;}${scope} .tabbed-notes__switch{display:none;}${scope} .tabbed-notes__switch:checked + .tabbed-notes__label{color:var(--tab-active-text,#ffffff);background-color:var(--tab-active-bg,#000000);}${scope} .tabbed-notes__switch:checked + .tabbed-notes__label + .tabbed-notes__content{height:auto;overflow:auto;opacity:1;transition:0.5s opacity;}${scope} .tabbed-notes__panel{background-color:var(--tab-content-bg,#ffffff);border:1px solid var(--tab-content-border,#000000);padding:0 36px 36px;}${scope} .tabbed-notes__intro{margin:20px 0 0;text-align:center;font-size:14px;}${scope} .tabbed-notes__list{list-style:none;margin:18px 0 0;padding:0;}${scope} .tabbed-notes__item{position:relative;padding-left:1em;text-indent:-1em;font-size:14px;line-height:1.6;}${scope} .tabbed-notes__item + .tabbed-notes__item{margin-top:6px;}${scope} .tabbed-notes__item.is-disc::before{content:"・";}${scope} .tabbed-notes--sticky .tabbed-notes__wrap{border-bottom:none;gap:6px;}${scope} .tabbed-notes--sticky .tabbed-notes__label{border:1px solid var(--tab-border,#000000);border-radius:10px 10px 4px 4px;box-shadow:0 2px 0 rgba(0,0,0,0.08);}${scope} .tabbed-notes--sticky .tabbed-notes__label:not(:last-of-type){border-right:none;}${scope} .tabbed-notes--underline .tabbed-notes__wrap{gap:12px;border-bottom:1px solid var(--tab-border,#000000);}${scope} .tabbed-notes--underline .tabbed-notes__label{background:transparent;border-radius:0;padding:8px 4px;}${scope} .tabbed-notes--underline .tabbed-notes__label:not(:last-of-type){border-right:none;}${scope} .tabbed-notes--underline .tabbed-notes__switch:checked + .tabbed-notes__label{background:transparent;color:var(--tab-active-bg,#000000);box-shadow:inset 0 -2px 0 var(--tab-active-bg,#000000);}${scope} .tabbed-notes--popout .tabbed-notes__wrap{gap:8px;}${scope} .tabbed-notes--popout .tabbed-notes__label{border:1px solid var(--tab-border,#000000);border-bottom:1px solid var(--tab-border,#000000);border-radius:14px 14px 0 0;}${scope} .tabbed-notes--popout .tabbed-notes__label:not(:last-of-type){border-right:none;}${scope} .tabbed-notes--popout .tabbed-notes__switch:checked + .tabbed-notes__label{border-bottom-color:var(--tab-content-bg,#ffffff);margin-bottom:-1px;}${scope} .tabbed-notes--popout .tabbed-notes__switch:checked + .tabbed-notes__label::after{content:"";position:absolute;left:50%;bottom:-8px;transform:translateX(-50%);border-width:8px 8px 0;border-style:solid;border-color:var(--tab-active-bg,#000000) transparent transparent;}</style>`;

  return `${scopedStyle}<section class=\"container tabbed-notes tabbed-notes--${tabStyle.variant}\" style=\"${styleVars}\"><div class=\"tabbed-notes__wrap\">${tabHtml}</div></section>`;
};

const renderLegalNotes = (section: SectionBase) => {
  const appearance = resolveSectionAppearanceFromSection(section, {
    headerBackgroundColor: "#ea5504",
    titleTextColor: "#ffffff",
    accentColor: "#eb5505",
    borderColor: "#e5e7eb",
    headerStyle: "band",
    showHeaderBand: true,
  });
  const title = esc(str(section.data?.title ?? "注意事項"));
  const bulletEnabled = !(section.data?.bullet === false || section.data?.bullet === "none");
  const defaultBullet: "none" | "disc" = bulletEnabled ? "disc" : "none";
  const noteWidthPctRaw =
    typeof section.data?.noteWidthPct === "number" && Number.isFinite(section.data.noteWidthPct)
      ? section.data.noteWidthPct
      : 100;
  const noteWidthPct = Math.max(70, Math.min(100, noteWidthPctRaw));
  const noteBg = esc(str(section.data?.noteBg || "#ffffff"));
  const noteBorderColor = esc(str(section.data?.noteBorderColor || "#e5e7eb"));
  const notePaddingRaw =
    typeof section.data?.notePaddingPx === "number" && Number.isFinite(section.data.notePaddingPx)
      ? section.data.notePaddingPx
      : 24;
  const notePadding = Math.max(8, Math.min(40, notePaddingRaw));
  const noteTextSizeRaw =
    typeof section.data?.noteTextSizePx === "number" && Number.isFinite(section.data.noteTextSizePx)
      ? section.data.noteTextSizePx
      : 14;
  const noteTextSize = Math.max(10, Math.min(24, noteTextSizeRaw));
  const noteTextColor = esc(str(section.data?.noteTextColor || "#111827"));
  const rawItems = Array.isArray(section.data?.items) ? section.data.items : [];

  const legalTextItem = Array.isArray(section.content?.items)
    ? section.content.items.find((item) => item.type === "text")
    : undefined;

  const contentItems = Array.isArray((legalTextItem as { lines?: unknown[] } | undefined)?.lines) &&
    ((legalTextItem as { lines?: unknown[] } | undefined)?.lines?.length ?? 0) > 0
    ? ((legalTextItem as { lines: Array<{ text?: unknown; marks?: { bullet?: "none" | "disc" } }> }).lines).map(
        (line) => ({
          text: str(line.text ?? ""),
          bullet: line.marks?.bullet ?? defaultBullet,
        })
      )
    : [];

  const dataItems = rawItems
    .map((item: unknown) => {
      if (typeof item === "string") {
        return { text: item, bullet: defaultBullet };
      }
      if (!item || typeof item !== "object") {
        return null;
      }
      const entry = item as Record<string, unknown>;
      const text = str(entry.text ?? "");
      const bullet =
        entry.bullet === "none" || entry.bullet === "disc"
          ? entry.bullet
          : defaultBullet;
      return { text, bullet };
    })
    .filter((item): item is { text: string; bullet: "none" | "disc" } => Boolean(item));

  const items = (contentItems.length > 0 ? contentItems : dataItems).filter(
    (item) => item.text.trim().length > 0
  );

  const renderNoteText = (value: string) => renderRichInline(value, true);
  const isNoBulletItem = (value: string) => value.trim().startsWith("※");

  const contentHtml = bulletEnabled
    ? `<div style=\"display:flex;flex-direction:column;gap:8px;margin:0;font-size:${noteTextSize}px;line-height:1.8;color:${noteTextColor};\">${items
        .map((item) => {
          if (item.bullet === "none" || isNoBulletItem(item.text)) {
            return `<p style=\"margin:0;\">${renderNoteText(item.text)}</p>`;
          }
          return `<ul style=\"list-style:none;padding-left:1.2em;margin:0;\"><li style=\"display:flex;align-items:flex-start;gap:0.45em\"><span style=\"flex-shrink:0;margin-top:0.55em;width:0.38em;height:0.38em;border-radius:50%;background:currentColor;display:inline-block\"></span><span>${renderNoteText(
            item.text
          )}</span></li></ul>`;
        })
        .join("")}</div>`
    : `<div style=\"display:flex;flex-direction:column;gap:8px;margin:0;font-size:${noteTextSize}px;line-height:1.8;color:${noteTextColor};\">${items
        .map((item) => `<p style=\"margin:0;\">${renderNoteText(item.text)}</p>`)
        .join("")}</div>`;
  const optionalBlocksHtml = renderSectionOptionalBlocks(section);
  const band = resolveUnifiedBandStyles(appearance);

  return `<section class=\"container legal-notes\"><div class=\"lp-section-shell\" style=\"padding:0;\"><div class=\"lp-section-card\" style=\"max-width:${band.maxWidthPx}px;margin:0 auto;overflow:visible;background:transparent;border:none;box-shadow:none;\"><div class=\"lp-section-header\" style=\"background:${band.headerBg};padding:${band.headerPadding};border-radius:${band.headerRadius};${band.headerShadow}\"><h2 class=\"lp-section-title\" style=\"color:${band.titleColor};font-size:${band.titleSizePx}px;font-weight:700;margin:0;text-align:center;\">${title}</h2></div><div class=\"lp-section-body\" style=\"padding:0;background:transparent;\"><div style=\"width:min(100%, ${noteWidthPct}%);max-width:${band.maxWidthPx}px;margin:0 auto;background:${noteBg};border:1px solid ${appearance.borderColor || noteBorderColor};border-radius:12px;padding:${notePadding}px;box-shadow:0 8px 20px rgba(15,23,42,0.08);\">${contentHtml}${optionalBlocksHtml}</div></div></div></div></section>`;
};

const renderImageOnly = (section: SectionBase, assets: RendererAssets) => {
  const data = section.data as Record<string, unknown>;
  const assetId = str(data.imageOnlyAssetId);
  const imageUrl = resolveAssetUrl(assets, assetId, str(data.imageOnlyUrl));
  const imageAlt = esc(str(data.imageOnlyAlt));
  const sizeMode =
    data.imageOnlySizeMode === "auto" || data.imageOnlySizeMode === "custom"
      ? data.imageOnlySizeMode
      : "fit";
  const imageWidth =
    typeof data.imageOnlyWidth === "number" && data.imageOnlyWidth > 0
      ? data.imageOnlyWidth
      : undefined;
  const imageMaxWidth =
    typeof data.imageOnlyMaxWidth === "number" && data.imageOnlyMaxWidth > 0
      ? data.imageOnlyMaxWidth
      : undefined;
  const imageFit = data.imageOnlyFit === "cover" ? "cover" : "contain";
  const imageAlign =
    data.imageOnlyAlign === "left" || data.imageOnlyAlign === "right"
      ? data.imageOnlyAlign
      : "center";
  const justifyContent =
    imageAlign === "left"
      ? "flex-start"
      : imageAlign === "right"
      ? "flex-end"
      : "center";
  const widthStyle =
    sizeMode === "fit"
      ? "width:100%;"
      : sizeMode === "custom" && imageWidth
      ? `width:${imageWidth}px;`
      : "";
  const maxWidthStyle = imageMaxWidth ? `max-width:${imageMaxWidth}px;` : "max-width:100%;";

  if (imageUrl) {
    return `<section class="w-full"><div class="lp-image-only" style="display:flex;justify-content:${justifyContent};"><img src="${esc(imageUrl)}" alt="${imageAlt}" data-asset-id="${esc(assetId)}" style="${widthStyle}${maxWidthStyle}height:auto;object-fit:${imageFit};" /></div></section>`;
  }

  return `<section class="w-full"><div class="lp-image-only" style="display:flex;justify-content:${justifyContent};"><div class="image-only-placeholder" style="${maxWidthStyle}">画像を追加してください</div></div></section>`;
};

const renderFooterHtml = (
  section: SectionBase,
  assets: RendererAssets,
  allSections?: SectionBase[]
) => {
  const data = section.data as Record<string, unknown>;
  const rawHtml = str(data.html);
  if (rawHtml.trim()) {
    return `<footer class="footer"><div class="container">${rawHtml}</div></footer>`;
  }
  const brandBarSection = allSections?.find(
    (entry) => entry.type === "brandBar" && entry.visible
  );
  const brandBarAssetId =
    typeof brandBarSection?.data?.brandImageAssetId === "string"
      ? brandBarSection.data.brandImageAssetId
      : undefined;
  const footerAssets =
    typeof data.footerAssets === "object" && data.footerAssets
      ? (data.footerAssets as Record<string, string | undefined>)
      : undefined;

  return `<section class="w-full">${buildFooterHtml(assets, footerAssets, {
    brandBarAssetId,
    hideFooterLogo: !brandBarSection,
  })}</section>`;
};

export const renderLayoutSection = (
  section: SectionBase,
  assets: RendererAssets,
  device: RenderDevice,
  context?: {
    allSections?: SectionBase[];
    stores?: StoresTable | null;
    disableMotion?: boolean;
  }
): string | null => {
  const disableMotion = context?.disableMotion === true;
  const mapped = renderFromSectionRendererMap({
    section,
    assets,
    device,
    legacy: {
      renderMainVisual: () =>
        renderMainVisual(section, assets, device, disableMotion),
      renderRankingTable: () => renderRankingTable(section),
      renderCouponFlow: () => renderCouponFlow(section, assets, disableMotion),
      renderTabbedNotes: () => renderTabbedNotes(section, assets),
    },
  });
  if (mapped != null) {
    return mapped;
  }

  switch (section.type) {
    case "brandBar":
      return renderBrandBar(section, assets);
    case "campaignPeriodBar":
      return renderCampaignPeriodBar(section, disableMotion);
    case "campaignOverview":
      return renderCampaignOverview(section);
    case "paymentHistoryGuide":
      return renderPaymentHistoryGuide(section, assets);
    case "legalNotes":
      return renderLegalNotes(section);
    case "excludedStoresList":
      return renderExcludedStoresSection(section, context?.stores ?? null);
    case "excludedBrandsList":
      return renderExcludedBrandsSection(section, context?.stores ?? null);
    case "imageOnly":
      return renderImageOnly(section, assets);
    case "footerHtml":
      return renderFooterHtml(section, assets, context?.allSections);
    default:
      return null;
  }
};
