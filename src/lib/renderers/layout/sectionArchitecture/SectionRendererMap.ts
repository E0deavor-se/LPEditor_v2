import type { SectionBase } from "@/src/types/project";
import type { RenderDevice, RendererAssets } from "@/src/lib/renderers/shared/types";
import { resolveSectionDecorationFromData } from "@/src/lib/sections/sectionAppearance";

type LegacyRenderers = {
  renderMainVisual: () => string | null;
  renderRankingTable: () => string | null;
  renderCouponFlow: () => string | null;
  renderTabbedNotes: () => string | null;
};

type SectionRendererContext = {
  section: SectionBase;
  assets: RendererAssets;
  device: RenderDevice;
  legacy: LegacyRenderers;
};

type SectionRenderer = (context: SectionRendererContext) => string | null;

const str = (value: unknown) =>
  typeof value === "string" ? value : value == null ? "" : String(value);

const esc = (value: string) =>
  value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#39;");

const renderMultilineText = (value: string) =>
  esc(value)
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
    .join("<br />");

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

  const rawButtons = Array.isArray(sectionExtra.buttons)
    ? sectionExtra.buttons
    : Array.isArray(sectionExtensions.buttons)
    ? sectionExtensions.buttons
    : Array.isArray(section.content?.buttons)
    ? section.content.buttons
    : [];

  const rawImages = Array.isArray(sectionExtra.images)
    ? sectionExtra.images
    : Array.isArray(sectionExtensions.images)
    ? sectionExtensions.images
    : Array.isArray(section.content?.media)
    ? section.content.media
    : [];

  const buttonsHtml = (rawButtons as Array<Record<string, unknown>>)
    .map((entry) => {
      const label = str(entry.label).trim();
      if (!label) {
        return "";
      }
      const href = esc(str(entry.href || "#"));
      const variant =
        entry.variant === "secondary" || entry.variant === "link"
          ? entry.variant
          : "primary";
      const style =
        variant === "link"
          ? "background:transparent;color:#ea5504;border:none;text-decoration:underline;padding:0;"
          : variant === "secondary"
          ? "background:#ffffff;color:#ea5504;border:1px solid #ea5504;"
          : "background:#ea5504;color:#ffffff;border:1px solid #ea5504;";
      return `<a href="${href}" style="display:inline-flex;align-items:center;justify-content:center;padding:10px 18px;border-radius:999px;text-decoration:none;font-weight:700;font-size:14px;${style}">${esc(label)}</a>`;
    })
    .join("");

  const imagesHtml = (rawImages as Array<Record<string, unknown>>)
    .map((entry) => {
      const imageUrl = esc(str(entry.imageUrl).trim());
      if (!imageUrl) {
        return "";
      }
      const alt = esc(str(entry.alt || ""));
      const caption = str(entry.caption || "").trim();
      const widthRaw = Number(entry.width);
      const width = Number.isFinite(widthRaw) ? Math.max(20, Math.min(100, widthRaw)) : 100;
      const align = entry.align === "left" || entry.align === "right" ? entry.align : "center";
      const margin = align === "left" ? "0 auto 0 0" : align === "right" ? "0 0 0 auto" : "0 auto";
      return `<figure style="margin:0;max-width:${width}%;text-align:${align};"><img src="${imageUrl}" alt="${alt}" style="display:block;width:100%;height:auto;border-radius:10px;margin:${margin};"/>${
        caption
          ? `<figcaption style="margin-top:8px;font-size:12px;line-height:1.6;color:#4b5563;">${esc(caption)}</figcaption>`
          : ""
      }</figure>`;
    })
    .join("");

  if (!buttonsHtml && !imagesHtml) {
    return "";
  }

  return `<div style="margin-top:16px;display:flex;flex-direction:column;gap:12px;">${
    buttonsHtml
      ? `<div style="display:flex;flex-wrap:wrap;gap:10px;justify-content:center;">${buttonsHtml}</div>`
      : ""
  }${imagesHtml ? `<div style="display:flex;flex-direction:column;gap:12px;">${imagesHtml}</div>` : ""}</div>`;
};

const TRUTHY_TOKENS = new Set([
  "対象",
  "〇",
  "○",
  "はい",
  "yes",
  "y",
  "true",
  "1",
  "on",
]);

const isTruthyStoreFlag = (value: string) => {
  const normalized = value.normalize("NFKC").trim().toLowerCase();
  if (!normalized) {
    return false;
  }
  return TRUTHY_TOKENS.has(normalized);
};

const DEFAULT_TARGET_STORES_NOTICE_LINES = [
  "ご注意ください！",
  "リストに記載があっても、店舗の休業・閉業・移転や、その他の事情により利用できない場合があります。",
];

const resolveTargetStoresNoticeLines = (section: SectionBase, noteText?: unknown) => {
  if (typeof noteText === "string") {
    const noteLines = noteText
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter((line) => line.length > 0);
    return noteLines;
  }

  const items = Array.isArray(section.content?.items) ? section.content.items : [];
  const rows: string[] = [];
  items.forEach((item) => {
    if (!item || typeof item !== "object") {
      return;
    }
    const textItem = item as {
      type?: unknown;
      lines?: Array<{ text?: unknown; marks?: { callout?: { enabled?: unknown } } }>;
    };
    if (textItem.type !== "text" || !Array.isArray(textItem.lines)) {
      return;
    }
    textItem.lines.forEach((line) => {
      if (!line || typeof line !== "object") {
        return;
      }
      if (line.marks?.callout?.enabled !== true) {
        return;
      }
      const text = str(line.text).trim();
      if (text) {
        rows.push(text);
      }
    });
  });
  if (rows.length > 0) {
    return rows;
  }
  return DEFAULT_TARGET_STORES_NOTICE_LINES;
};

const renderTargetStores = (section: SectionBase) => {
  const data = section.data as Record<string, unknown>;
  const appearance = resolveSectionDecorationFromData(data, {
    headerBackgroundColor: "#ffffff",
    titleTextColor: "#1d4ed8",
    accentColor: "#2563eb",
    borderColor: "#e2e8f0",
    headerStyle: "band",
    showHeaderBand: true,
  });
  const storeCsv = section.content?.storeCsv;
  const storeLabels =
    section.content?.storeLabels && typeof section.content.storeLabels === "object"
      ? section.content.storeLabels
      : {};
  const title = esc(str(data.title || "対象店舗"));
  const description = esc(str(data.description || "条件を指定して対象店舗を検索できます。"));
  const variantRaw = str(data.variant || "searchCards");
  const variant =
    variantRaw === "cardsOnly" || variantRaw === "simpleList"
      ? variantRaw
      : "searchCards";
  const pageSize =
    typeof data.pageSize === "number" && Number.isFinite(data.pageSize) && data.pageSize > 0
      ? data.pageSize
      : typeof (data.targetStoresConfig as { pageSize?: unknown } | undefined)?.pageSize ===
          "number" &&
        Number.isFinite((data.targetStoresConfig as { pageSize?: number }).pageSize)
      ? (data.targetStoresConfig as { pageSize?: number }).pageSize ?? 10
      : 10;

  const legacyConfig =
    data.targetStoresConfig && typeof data.targetStoresConfig === "object"
      ? (data.targetStoresConfig as {
          filterKeys?: unknown;
          labelKeys?: unknown;
          columnConfig?: unknown;
        })
      : undefined;

  const legacyFilterKeys = Array.isArray(legacyConfig?.filterKeys)
    ? legacyConfig.filterKeys.filter(
        (entry): entry is string => typeof entry === "string" && entry.trim().length > 0
      )
    : [];

  const legacyLabelKeys = Array.isArray(legacyConfig?.labelKeys)
    ? legacyConfig.labelKeys.filter(
        (entry): entry is string => typeof entry === "string" && entry.trim().length > 0
      )
    : [];

  const legacyColumnConfig =
    legacyConfig?.columnConfig && typeof legacyConfig.columnConfig === "object"
      ? (legacyConfig.columnConfig as Record<string, { showAsLabel?: unknown; enableFilter?: unknown; label?: unknown; filterLabel?: unknown }>)
      : {};
  const showSearchBox = typeof data.showSearchBox === "boolean" ? data.showSearchBox : variant === "searchCards";
  const showRegionFilter =
    typeof data.showRegionFilter === "boolean"
      ? data.showRegionFilter
      : variant === "searchCards";
  const showLabelFilters =
    typeof data.showLabelFilters === "boolean"
      ? data.showLabelFilters
      : variant === "searchCards";
  const showResultCount =
    typeof data.showResultCount === "boolean" ? data.showResultCount : true;
  const showPager =
    typeof data.showPager === "boolean" ? data.showPager : variant !== "simpleList";
  const searchPlaceholder = esc(str(data.searchPlaceholder || "店舗名・住所など"));
  const resultCountLabel = esc(str(data.resultCountLabel || "表示件数"));
  const emptyMessage = esc(
    str(data.emptyMessage || "条件に一致する対象店舗が見つかりませんでした。")
  );
  const pagerPrevLabel = esc(str(data.pagerPrevLabel || "前へ"));
  const pagerNextLabel = esc(str(data.pagerNextLabel || "次へ"));
  const cardVariant = variant === "simpleList" ? "flat" : str(data.cardVariant || "outlined");
  const cardBg = esc(str(data.cardBg || "#ffffff"));
  const titleBandColor = esc(
    appearance.showHeaderBand ? appearance.headerBackgroundColor : "transparent"
  );
  const titleTextColor = esc(
    appearance.showHeaderBand ? appearance.titleTextColor : appearance.accentColor
  );
  const cardBorderColor = esc(appearance.borderColor);
  const cardRadius =
    typeof data.cardRadius === "number" && Number.isFinite(data.cardRadius)
      ? data.cardRadius
      : 12;

  const rows = Array.isArray(storeCsv?.rows) ? storeCsv.rows : [];
  const headers = Array.isArray(storeCsv?.headers) ? storeCsv.headers : [];
  const idKey = headers.find((entry) => entry === "店舗ID") ?? headers[0] ?? "店舗ID";
  const nameKey = headers.find((entry) => entry === "店舗名") ?? headers[1] ?? "店舗名";
  const postalKey = headers.find((entry) => entry === "郵便番号") ?? headers[2] ?? "郵便番号";
  const addressKey = headers.find((entry) => entry === "住所") ?? headers[3] ?? "住所";
  const regionKey = headers.find((entry) => entry === "都道府県") ?? headers[4] ?? "都道府県";
  const regions = regionKey
    ? Array.from(new Set(rows.map((row) => str(row[regionKey]).trim()).filter(Boolean)))
    : [];

  const labelSourceKeys = Object.keys(storeLabels).length
    ? Object.keys(storeLabels)
    : Array.from(
        new Set([
          ...legacyLabelKeys,
          ...legacyFilterKeys,
          ...Object.keys(legacyColumnConfig),
        ])
      );

  const labelKeys = labelSourceKeys.filter(
    (columnKey) => ![idKey, nameKey, postalKey, addressKey, regionKey].includes(columnKey)
  );

  const activeFilters =
    section.content?.storeFilters && typeof section.content.storeFilters === "object"
      ? (section.content.storeFilters as Record<string, boolean>)
      : {};
  const filterOperator = section.content?.storeFilterOperator === "OR" ? "OR" : "AND";

  const initialFilteredIndexes: number[] = [];
  rows.forEach((row, index) => {
    const selectedKeys = labelKeys.filter((key) => activeFilters[key]);
    if (selectedKeys.length === 0) {
      initialFilteredIndexes.push(index);
      return;
    }
    if (filterOperator === "OR") {
      if (selectedKeys.some((key) => isTruthyStoreFlag(str(row[key])))) {
        initialFilteredIndexes.push(index);
      }
      return;
    }
    if (selectedKeys.every((key) => isTruthyStoreFlag(str(row[key])))) {
      initialFilteredIndexes.push(index);
    }
  });
  const initialVisibleIndexes = new Set(
    initialFilteredIndexes.slice(0, Math.max(1, pageSize))
  );
  const initialFilteredRows = initialFilteredIndexes.map((index) => rows[index]);
  const totalPages = Math.max(
    1,
    Math.ceil(initialFilteredIndexes.length / Math.max(1, pageSize))
  );
  const cardRows =
    variant === "searchCards"
      ? rows
      : initialFilteredRows.slice(0, Math.max(1, pageSize));
  const optionalBlocksHtml = renderSectionOptionalBlocks(section);
  const noticeLines = resolveTargetStoresNoticeLines(section, data.note);
  const noticeHtml =
    noticeLines.length > 0
      ? `<section class="target-stores__notice" style="margin-bottom:12px;"><div style="border:1px solid #fed7aa;background:#fff7ed;border-radius:12px;padding:10px 12px;"><div style="font-weight:700;color:#d9480f;font-size:13px;margin-bottom:4px;">${esc(
          noticeLines[0] ?? ""
        )}</div>${noticeLines
          .slice(1)
          .map(
            (line) =>
              `<div style="font-size:12px;color:#92400e;line-height:1.5;">● ${esc(line)}</div>`
          )
          .join("")}</div></section>`
      : "";

  const resolveLabelDisplayName = (columnKey: string) => {
    const mapped = storeLabels[columnKey];
    if (mapped?.displayName && mapped.displayName.trim()) {
      return mapped.displayName;
    }
    const legacy = legacyColumnConfig[columnKey];
    if (legacy?.filterLabel && typeof legacy.filterLabel === "string" && legacy.filterLabel.trim()) {
      return legacy.filterLabel;
    }
    if (legacy?.label && typeof legacy.label === "string" && legacy.label.trim()) {
      return legacy.label;
    }
    return columnKey;
  };

  const cards = cardRows.map((row, index) => {
    const storeId = esc(str(row[idKey] || `store-${index + 1}`));
    const storeName = esc(str(row[nameKey] || "店舗名未設定"));
    const postalCode = esc(str(row[postalKey] || ""));
    const prefecture = esc(str(row[regionKey] || ""));
    const address = esc(str(row[addressKey] || ""));
    const activeLabelKeys = labelKeys.filter((key) => isTruthyStoreFlag(str(row[key])));
    const labelKeysAttr = esc(activeLabelKeys.join(","));
    const keywordAttr = esc(
      [str(row[nameKey]), str(row[addressKey]), str(row[postalKey])]
        .join(" ")
        .toLowerCase()
    );
    const initialVisible =
      variant === "searchCards"
        ? initialVisibleIndexes.has(index)
        : index < Math.max(1, pageSize);

    const badges = labelKeys
      .map((columnKey) => {
        const label = storeLabels[columnKey];
        if (label && !label.showAsBadge) {
          return "";
        }
        const raw = str(row[columnKey]);
        const active = isTruthyStoreFlag(raw);
        if (!active) {
          return "";
        }
        return `<span class="target-stores__badge" style="display:inline-flex;align-items:center;gap:4px;border-radius:999px;background:#f1f5f9;padding:3px 8px;font-size:11px;line-height:1.3;color:#475569;font-weight:600;">${esc(
          resolveLabelDisplayName(columnKey)
        )}</span>`;
      })
      .filter(Boolean)
      .join("");

    if (variant === "simpleList") {
      return `<article class="target-stores__row" data-store-id="${storeId}" style="display:flex;gap:10px;padding:10px 0;border-bottom:1px solid #e2e8f0;"><strong style="min-width:180px;color:#1d4ed8;">${storeName}</strong><span style="color:#475569;">${
        postalCode ? `〒${postalCode} ` : ""
      }${prefecture}${address}</span></article>`;
    }

    return `<article class="target-stores__card target-stores__card--${esc(
      cardVariant
    )}" data-store-id="${storeId}" data-store-search-text="${keywordAttr}" data-store-prefecture="${prefecture}" data-store-label-keys="${labelKeysAttr}" style="display:${
      initialVisible ? "block" : "none"
    };background:${cardBg};border:1px solid ${cardBorderColor};border-radius:${Math.max(
      0,
      cardRadius
    )}px;box-shadow:0 1px 0 rgba(15,23,42,0.04);padding:14px;"><div style="margin-bottom:8px;display:flex;flex-wrap:wrap;gap:6px;">${badges}</div><h3 class="target-stores__name" style="margin:0 0 6px;background:${titleBandColor};color:${titleTextColor};font-size:14px;line-height:1.4;font-weight:700;">${storeName}</h3><p class="target-stores__address" style="margin:0;color:#64748b;font-size:12px;line-height:1.6;">${
      postalCode ? `〒${postalCode} ` : ""
    }${prefecture}${address}</p></article>`;
  });

  const filtersHtml = showLabelFilters
    ? `<div class="target-stores__filters" style="display:flex;flex-wrap:wrap;gap:6px;margin-top:12px;"><div class="target-stores__chips" style="display:flex;flex-wrap:wrap;gap:6px;">${labelKeys
        .map((columnKey) => {
          const label = storeLabels[columnKey];
          if (label && !label.showAsFilter) {
            return "";
          }
          const active = activeFilters[columnKey] === true;
          return `<button class="target-stores__chip" type="button" data-store-filter-key="${esc(
            columnKey
          )}" data-store-filter-active="${active ? "true" : "false"}" style="border:1px solid ${
            active ? appearance.accentColor : appearance.borderColor
          };background:${active ? "#eff6ff" : "#ffffff"};color:${
            active ? appearance.accentColor : "#334155"
          };border-radius:999px;padding:4px 10px;font-size:11px;line-height:1.2;font-weight:600;cursor:pointer;">${esc(
            resolveLabelDisplayName(columnKey)
          )}</button>`;
        })
        .filter(Boolean)
        .join("")}</div></div>`
    : "";

  const regionHtml = showRegionFilter
    ? `<div class="target-stores__region" style="margin-top:12px;"><label style="display:block;font-size:12px;color:#475569;margin-bottom:4px;">都道府県</label><select class="target-stores__select" data-store-prefecture style="width:100%;height:32px;border:1px solid #e2e8f0;border-radius:8px;padding:0 10px;font-size:12px;background:#fff;"><option value="">すべて</option>${regions
        .map((region) => `<option value="${esc(region)}">${esc(region)}</option>`)
        .join("")}</select></div>`
    : "";

  if (variant !== "searchCards") {
    return `<section class="container target-stores target-stores--${variant}" data-page-size="${Math.max(
      1,
      pageSize
    )}"><h2>${title}</h2>${description ? `<p class="target-stores__description">${description}</p>` : ""}${
      showSearchBox
        ? `<div class="target-stores__search" style="margin:10px 0;"><input type="search" placeholder="${searchPlaceholder}" style="width:100%;height:42px;border:1px solid #d1d5db;border-radius:10px;padding:0 12px;" /></div>`
        : ""
    }${
      showResultCount
        ? `<div class="target-stores__result-count" style="margin-bottom:10px;color:#334155;">${resultCountLabel}: ${initialFilteredIndexes.length}</div>`
        : ""
    }<div class="target-stores__cards" style="display:${variant === "simpleList" ? "block" : "grid"};grid-template-columns:repeat(2,minmax(0,1fr));gap:12px;">${
      cards.length > 0
        ? cards.join("")
        : `<div class="target-stores__empty" style="padding:20px;border:1px dashed #d1d5db;border-radius:10px;text-align:center;">${emptyMessage}</div>`
    }</div>${optionalBlocksHtml}</section>`;
  }

  return `<section class="container target-stores target-stores--searchCards" data-page-size="${Math.max(
    1,
    pageSize
  )}" data-store-filter-operator="${filterOperator}" style="padding:0;background:#f8fafc;"><header class="target-stores__header" style="margin-bottom:12px;"><h2 style="margin:0 0 8px;font-size:22px;font-weight:700;color:${esc(
    appearance.accentColor
  )};">${title}</h2>${
    description
      ? `<p class="target-stores__description" style="margin:0;color:#64748b;font-size:13px;line-height:1.5;">${description}</p>`
      : ""
  }</header>${noticeHtml}<section class="target-stores__controls" style="background:#ffffff;border:1px solid #e2e8f0;border-radius:12px;padding:16px;margin-bottom:16px;">${
    showSearchBox
      ? `<div class="target-stores__search" style="display:flex;flex-wrap:wrap;gap:8px 12px;align-items:center;"><label style="font-size:12px;color:#475569;">キーワード</label><input type="search" data-store-keyword-input placeholder="${searchPlaceholder}" style="height:32px;border:1px solid #e2e8f0;border-radius:8px;padding:0 10px;font-size:12px;min-width:200px;flex:1 1 260px;background:#fff;" /></div>`
      : ""
  }${regionHtml}${filtersHtml}</section><section class="target-stores__meta" style="display:flex;justify-content:space-between;align-items:center;font-size:12px;color:#64748b;gap:12px;margin-bottom:12px;">${
    showResultCount
      ? `<div class="target-stores__result-count" data-store-count data-store-count-label="${resultCountLabel}" style="font-size:12px;color:#64748b;font-weight:400;">${resultCountLabel}: ${initialFilteredIndexes.length}件</div>`
      : "<div></div>"
  }${
    showPager
      ? `<div class="target-stores__pager" style="display:flex;align-items:center;"><button type="button" data-store-prev disabled style="border:1px solid #e2e8f0;background:#ffffff;border-radius:6px;padding:4px 10px;font-size:11px;margin-right:6px;color:#cbd5f5;">${pagerPrevLabel}</button><span data-store-page style="font-size:12px;color:#64748b;margin-right:6px;">1/${totalPages}</span><button type="button" data-store-next style="border:1px solid #e2e8f0;background:#ffffff;border-radius:6px;padding:4px 10px;font-size:11px;margin-right:6px;color:#334155;">${pagerNextLabel}</button></div>`
      : ""
  }</section><section class="target-stores__cards" data-store-cards style="display:grid;grid-template-columns:repeat(auto-fit,minmax(280px,1fr));gap:12px;">${
    cards.length > 0 ? cards.join("") : ""
  }</section><section class="target-stores__empty-wrap" style="margin-top:12px;">${
    `<div class="target-stores__empty" data-store-empty style="display:${
      initialFilteredIndexes.length === 0 ? "block" : "none"
    };text-align:center;padding:24px;border:1px dashed #e2e8f0;border-radius:12px;color:#94a3b8;background:#fff;">${emptyMessage}</div>`
  }</section>${optionalBlocksHtml}</section>`;
};

const renderImageSection = (section: SectionBase) => {
  const data = section.data as Record<string, unknown>;
  const imageUrl = esc(str(data.imageUrl || "").trim());
  const alt = esc(str(data.alt || ""));
  const caption = esc(str(data.caption || ""));
  const alignment =
    data.alignment === "left" || data.alignment === "right"
      ? data.alignment
      : "center";
  const width =
    typeof data.width === "number" && Number.isFinite(data.width)
      ? Math.max(120, Math.min(2000, data.width))
      : 720;
  const radius =
    typeof data.borderRadius === "number" && Number.isFinite(data.borderRadius)
      ? Math.max(0, Math.min(80, data.borderRadius))
      : 12;
  const bg = esc(str(data.backgroundColor || "#ffffff"));
  const textColor = esc(str(data.textColor || "#111111"));
  const paddingTop =
    typeof data.paddingTop === "number" && Number.isFinite(data.paddingTop)
      ? Math.max(0, Math.min(240, data.paddingTop))
      : 24;
  const paddingBottom =
    typeof data.paddingBottom === "number" && Number.isFinite(data.paddingBottom)
      ? Math.max(0, Math.min(240, data.paddingBottom))
      : 24;

  const imageHtml = imageUrl
    ? `<img src="${imageUrl}" alt="${alt}" loading="lazy" style="display:block;width:min(100%,${width}px);height:auto;border-radius:${radius}px;" />`
    : `<div style="display:flex;align-items:center;justify-content:center;width:min(100%,${width}px);min-height:180px;border-radius:${radius}px;border:1px dashed #cbd5e1;background:#f8fafc;color:#64748b;font-size:12px;">画像未設定</div>`;

  return `<section class="container" style="background:${bg};padding:${paddingTop}px 0 ${paddingBottom}px;"><div style="display:flex;flex-direction:column;align-items:${
    alignment === "left" ? "flex-start" : alignment === "right" ? "flex-end" : "center"
  };gap:8px;">${imageHtml}${
    caption
      ? `<p style="margin:0;width:min(100%,${width}px);text-align:${alignment};font-size:13px;line-height:1.6;color:${textColor};">${caption}</p>`
      : ""
  }</div></section>`;
};

const renderStickyNoteSection = (section: SectionBase) => {
  const data = section.data as Record<string, unknown>;
  const title = esc(str(data.title || ""));
  const body = renderMultilineText(str(data.body || ""));
  const icon = esc(str(data.icon || ""));
  const bg = esc(str(data.backgroundColor || data.presetColor || "#fff7d6"));
  const textColor = esc(str(data.textColor || "#3f2f10"));
  const themeColor = esc(str(data.themeColor || "#f59e0b"));
  const radius =
    typeof data.borderRadius === "number" && Number.isFinite(data.borderRadius)
      ? Math.max(0, Math.min(80, data.borderRadius))
      : 14;
  const shadow =
    data.shadow === "none"
      ? "none"
      : data.shadow === "strong"
      ? "0 12px 20px rgba(15,23,42,0.18)"
      : "0 8px 16px rgba(15,23,42,0.12)";
  const paddingTop =
    typeof data.paddingTop === "number" && Number.isFinite(data.paddingTop)
      ? Math.max(0, Math.min(240, data.paddingTop))
      : 20;
  const paddingBottom =
    typeof data.paddingBottom === "number" && Number.isFinite(data.paddingBottom)
      ? Math.max(0, Math.min(240, data.paddingBottom))
      : 20;

  return `<section class="container" style="padding:${paddingTop}px 0 ${paddingBottom}px;"><div style="background:${bg};border-left:6px solid ${themeColor};border-radius:${radius}px;box-shadow:${shadow};padding:14px 16px;color:${textColor};"><div style="display:flex;align-items:flex-start;gap:8px;"><span style="font-size:16px;line-height:1.4;">${
    icon || "📝"
  }</span><div style="flex:1;min-width:0;"><h3 style="margin:0 0 6px;font-size:16px;line-height:1.45;word-break:break-word;">${
    title || "メモ"
  }</h3><div style="font-size:13px;line-height:1.7;word-break:break-word;">${
    body || " "
  }</div></div></div></div></section>`;
};

const renderContactSection = (section: SectionBase) => {
  const data = section.data as Record<string, unknown>;
  const title = esc(str(data.title || "本キャンペーンに関するお問い合わせ先"));
  const description = renderMultilineText(str(data.description || ""));
  const buttonLabel = esc(str(data.buttonLabel || "お問い合わせ先はこちら"));
  const buttonUrl = esc(str(data.buttonUrl || "#"));
  const note = renderMultilineText(str(data.note || ""));
  const textAlign =
    data.textAlign === "left" || data.textAlign === "right" ? data.textAlign : "center";
  const bg = esc(str(data.backgroundColor || "#000000"));
  const buttonColor = esc(str(data.buttonColor || "#fa5902"));
  const textColor = esc(str(data.textColor || "#ffffff"));
  const paddingTop =
    typeof data.paddingTop === "number" && Number.isFinite(data.paddingTop)
      ? Math.max(0, Math.min(240, data.paddingTop))
      : 45;
  const paddingBottom =
    typeof data.paddingBottom === "number" && Number.isFinite(data.paddingBottom)
      ? Math.max(0, Math.min(240, data.paddingBottom))
      : 50;
  const optionalBlocksHtml = renderSectionOptionalBlocks(section);

  return `<section class="container lp-contact" style="background:${bg};color:${textColor};padding:${paddingTop}px 0 ${paddingBottom}px;text-align:${textAlign};"><div style="max-width:900px;margin:0 auto;padding:0 20px;"><h2 style="margin:0;font-size:30px;line-height:1.35;font-weight:700;">${title}</h2>${
    description
      ? `<p style="margin:18px 0 0;font-size:16px;line-height:1.7;opacity:0.96;">${description}</p>`
      : ""
  }<div style="margin-top:30px;"><a href="${buttonUrl}" class="lp-contact__cta" style="display:inline-block;background:${buttonColor};color:#ffffff;text-decoration:none;font-size:20px;font-weight:700;line-height:1.4;border-radius:999px;padding:14px 34px;max-width:100%;">${buttonLabel}</a></div>${
    note
      ? `<p style="margin:18px 0 0;font-size:15px;line-height:1.8;opacity:0.95;white-space:normal;">${note}</p>`
      : ""
  }${optionalBlocksHtml}</div></section>`;
};

const renderFooterSection = (section: SectionBase) => {
  const data = section.data as Record<string, unknown>;
  const appearance = resolveSectionDecorationFromData(data, {
    headerBackgroundColor: "#111827",
    titleTextColor: "#f9fafb",
    accentColor: "#eb5505",
    borderColor: "#374151",
    headerStyle: "band",
    showHeaderBand: true,
  });
  const company = esc(str(data.companyName || ""));
  const copyrightText = esc(str(data.copyrightText || ""));
  const linksText = renderMultilineText(str(data.linksText || data.subText || ""));
  const bg = esc(str(data.backgroundColor || "#111827"));
  const textColor = esc(str(data.textColor || "#f9fafb"));
  const paddingTop =
    typeof data.paddingTop === "number" && Number.isFinite(data.paddingTop)
      ? Math.max(0, Math.min(240, data.paddingTop))
      : 20;
  const paddingBottom =
    typeof data.paddingBottom === "number" && Number.isFinite(data.paddingBottom)
      ? Math.max(0, Math.min(240, data.paddingBottom))
      : 20;
  const optionalBlocksHtml = renderSectionOptionalBlocks(section);

  return `<footer class="container" style="background:${bg};color:${textColor};padding:${paddingTop}px 0 ${paddingBottom}px;border-top:4px solid ${appearance.accentColor};"><div style="display:flex;flex-direction:column;gap:6px;text-align:center;"><div style="font-weight:700;line-height:1.5;color:${appearance.titleTextColor};">${
    company || " "
  }</div><div style="font-size:12px;line-height:1.6;opacity:0.92;">${
    copyrightText || ""
  }</div>${
    linksText
      ? `<div style="font-size:12px;line-height:1.7;opacity:0.85;">${linksText}</div>`
      : ""
  }${optionalBlocksHtml}</div></footer>`;
};

export const sectionRendererMap: Partial<Record<string, SectionRenderer>> = {
  heroImage: ({ legacy }) => legacy.renderMainVisual(),
  rankingTable: ({ legacy }) => legacy.renderRankingTable(),
  couponFlow: ({ legacy }) => legacy.renderCouponFlow(),
  tabbedNotes: ({ legacy }) => legacy.renderTabbedNotes(),
  targetStores: ({ section }) => renderTargetStores(section),
  image: ({ section }) => renderImageSection(section),
  stickyNote: ({ section }) => renderStickyNoteSection(section),
  contact: ({ section }) => renderContactSection(section),
  footer: ({ section }) => renderFooterSection(section),
};

export const renderFromSectionRendererMap = (context: SectionRendererContext) => {
  const renderer = sectionRendererMap[context.section.type];
  return renderer ? renderer(context) : null;
};
