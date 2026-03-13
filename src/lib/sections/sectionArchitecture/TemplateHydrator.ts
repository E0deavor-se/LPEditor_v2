import type { SectionBase } from "@/src/types/project";

type TemplateHydrator = (section: SectionBase) => void;

const str = (value: unknown) =>
  typeof value === "string" ? value : value == null ? "" : String(value);

const DEFAULT_TARGET_STORES_NOTICE =
  "ご注意ください！\nリストに記載があっても、店舗の休業・閉業・移転や、その他の事情により利用できない場合があります。";

const DEFAULT_LEGAL_NOTES_LINES = [
  "割引額は、小数点以下切り捨てとなります。",
  "＊レジで表示されているお買上げ金額は割引表示されません。割引後の金額はau PAY アプリの「履歴」をご確認ください。",
  "クーポンは〇回〇〇〇〇円（税込）以上のお支払いにご利用いただけます。クーポン適用前のお支払い額が〇〇〇〇円（税込）未満となる場合はクーポンが適用されず、クーポン適用前の金額で決済されます。",
  "キャンペーン期間中でも、クーポンの割引総額が所定の金額に達した場合、クーポン配布終了（au PAY アプリ内クーポン一覧非表示）となり、獲得済みクーポンのご利用は不可となります。",
  "au PAYが提供する他の割引とクーポンは併用できません。",
  "1つの店舗に対してクーポンが2つ以上発行されている場合、クーポン適用の優先順位は下記の通りです。",
  "①利用期限までの日数が少ないクーポンが優先されます。",
  "②利用期限までの日数が同じ場合、割引上限金額が大きいクーポンが優先されます（割引率には関係なく、割引上限金額が大きい方が優先されます）。",
  "クーポンはいかなる場合においても一切譲渡・換金できません。",
  "クーポンを使用した決済をキャンセルした場合、お客様がお支払いされた金額のみを返金するものとし、クーポンで割引された額については返金いたしません。",
  "クーポンを利用した決済の後に、一部キャンセルした場合は、クーポンの再発行は一切行いません。",
  "KDDIが不正と判断した場合は、クーポンは無効となります。",
  "掲載期間内であっても今後も同一又は更におトクなクーポンを提供する場合があります。",
  "本キャンペーンは予告なく変更・終了する場合があります。",
  "202〇年〇月〇日時点の情報です。",
];

const DEFAULT_CAMPAIGN_OVERVIEW_BODY_LINES = [
  "期間中、「〇〇〇」の対象店舗で 1回〇〇〇円（税込）以上の",
  "au PAY（コード支払い）で 使える最大〇〇％割引クーポンをau PAY アプリにてプレゼント！",
];

const DEFAULT_CAMPAIGN_OVERVIEW_NOTICE_LINES = [
  "〇〇店、〇〇店は対象外です。",
  "一部休業中店舗がございます。詳細はHPをご確認ください。",
];

const createId = (prefix: string) => `${prefix}_${Math.random().toString(36).slice(2, 10)}`;

const resolveBoolean = (value: unknown, fallback: boolean) =>
  typeof value === "boolean" ? value : fallback;

const normalizeIsoDate = (value: unknown) => {
  const raw = str(value).trim();
  if (!raw) {
    return "";
  }
  const match = raw.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})$/);
  if (!match) {
    return "";
  }
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  if (!Number.isFinite(year) || !Number.isFinite(month) || !Number.isFinite(day)) {
    return "";
  }
  if (month < 1 || month > 12 || day < 1 || day > 31) {
    return "";
  }
  const date = new Date(year, month - 1, day);
  if (
    date.getFullYear() !== year ||
    date.getMonth() + 1 !== month ||
    date.getDate() !== day
  ) {
    return "";
  }
  return `${year.toString().padStart(4, "0")}-${month
    .toString()
    .padStart(2, "0")}-${day.toString().padStart(2, "0")}`;
};

const hydrateHeroImage: TemplateHydrator = (section) => {
  section.data.imageAssetIdPc = str(section.data.imageAssetIdPc ?? section.data.imageAssetId ?? "");
  section.data.imageAssetIdSp = str(section.data.imageAssetIdSp ?? section.data.imageAssetId ?? "");
  section.data.imageUrl = str(section.data.imageUrl ?? "");
  section.data.imageUrlSp = str(section.data.imageUrlSp ?? section.data.imageUrl ?? "");
  section.data.alt = str(section.data.alt ?? section.data.altText ?? "");
  section.data.altText = str(section.data.altText ?? section.data.alt ?? "");
};

const hydrateTargetStores: TemplateHydrator = (section) => {
  const legacyConfig =
    section.data.targetStoresConfig && typeof section.data.targetStoresConfig === "object"
      ? (section.data.targetStoresConfig as {
          pageSize?: unknown;
          filterKeys?: unknown;
          labelKeys?: unknown;
          columnConfig?: unknown;
        })
      : undefined;
  const variant = str(section.data.variant ?? "searchCards");
  section.data.variant = variant === "cardsOnly" || variant === "simpleList" ? variant : "searchCards";
  section.data.title = str(section.data.title ?? "対象店舗");
  section.data.description = str(
    section.data.description ?? "条件を指定して対象店舗を検索できます。"
  );
  section.data.note = str(section.data.note ?? DEFAULT_TARGET_STORES_NOTICE);
  section.data.searchPlaceholder = str(section.data.searchPlaceholder ?? "店舗名・住所など");
  section.data.resultCountLabel = str(section.data.resultCountLabel ?? "表示件数");
  section.data.filterHeading = str(section.data.filterHeading ?? "絞り込み");
  section.data.emptyMessage = str(
    section.data.emptyMessage ?? "条件に一致する対象店舗が見つかりませんでした。"
  );
  section.data.pagerPrevLabel = str(section.data.pagerPrevLabel ?? "前へ");
  section.data.pagerNextLabel = str(section.data.pagerNextLabel ?? "次へ");

  const legacyFilterKeys = Array.isArray(legacyConfig?.filterKeys)
    ? legacyConfig?.filterKeys.filter((entry): entry is string => typeof entry === "string" && entry.trim().length > 0)
    : [];
  const legacyLabelKeys = Array.isArray(legacyConfig?.labelKeys)
    ? legacyConfig?.labelKeys.filter((entry): entry is string => typeof entry === "string" && entry.trim().length > 0)
    : [];
  const legacyColumnConfig =
    legacyConfig?.columnConfig && typeof legacyConfig.columnConfig === "object"
      ? (legacyConfig.columnConfig as Record<string, unknown>)
      : {};

  section.data.showSearchBox = resolveBoolean(section.data.showSearchBox, true);
  section.data.showRegionFilter = resolveBoolean(section.data.showRegionFilter, true);
  section.data.showLabelFilters = resolveBoolean(
    section.data.showLabelFilters,
    legacyFilterKeys.length > 0 || Object.keys(legacyColumnConfig).length > 0
  );
  section.data.showResultCount = resolveBoolean(section.data.showResultCount, true);
  section.data.showPager = resolveBoolean(section.data.showPager, true);

  // Keep legacy config data available so renderer can preserve older project intent.
  section.data.targetStoresConfig = {
    pageSize:
      typeof legacyConfig?.pageSize === "number" && Number.isFinite(legacyConfig.pageSize)
        ? legacyConfig.pageSize
        : 10,
    filterKeys: legacyFilterKeys,
    labelKeys: legacyLabelKeys,
    columnConfig: legacyColumnConfig,
  };

  section.data.legacyFilterKeys = legacyFilterKeys;
  section.data.legacyLabelKeys = legacyLabelKeys;

  section.data.cardPreset = str(section.data.cardPreset ?? "standard");

  const normalizedPreset =
    section.data.cardPreset === "elevated" || section.data.cardPreset === "minimal"
      ? section.data.cardPreset
      : "standard";
  section.data.cardPreset = normalizedPreset;

  const cardDefaults =
    normalizedPreset === "elevated"
      ? {
          cardVariant: "elevated",
          titleBandColor: "#eb5505",
          titleTextColor: "#ffffff",
          cardBorderColor: "#e2e8f0",
          cardRadius: 12,
          cardShadow: "0 8px 18px rgba(15, 23, 42, 0.12)",
        }
      : normalizedPreset === "minimal"
      ? {
          cardVariant: "flat",
          titleBandColor: "#ffffff",
          titleTextColor: "#0f172a",
          cardBorderColor: "#e5e7eb",
          cardRadius: 0,
          cardShadow: "none",
        }
      : {
          cardVariant: "outlined",
          titleBandColor: "#ffffff",
          titleTextColor: "#1d4ed8",
          cardBorderColor: "#d1d5db",
          cardRadius: 12,
          cardShadow: "none",
        };

  section.data.cardVariant = str(section.data.cardVariant ?? cardDefaults.cardVariant);
  section.data.cardBg = str(section.data.cardBg ?? "#ffffff");
  section.data.titleBandColor = str(section.data.titleBandColor ?? cardDefaults.titleBandColor);
  section.data.titleTextColor = str(section.data.titleTextColor ?? cardDefaults.titleTextColor);
  section.data.cardBorderColor = str(section.data.cardBorderColor ?? cardDefaults.cardBorderColor);
  section.data.cardShadow = str(section.data.cardShadow ?? cardDefaults.cardShadow);
  section.data.cardRadius =
    typeof section.data.cardRadius === "number" && Number.isFinite(section.data.cardRadius)
      ? section.data.cardRadius
      : cardDefaults.cardRadius;
  section.data.pageSize =
    typeof section.data.pageSize === "number" && Number.isFinite(section.data.pageSize)
      ? section.data.pageSize
      : typeof legacyConfig?.pageSize === "number" && Number.isFinite(legacyConfig.pageSize)
      ? legacyConfig.pageSize
      : 10;
};

const hydrateRankingTable: TemplateHydrator = (section) => {
  section.data.title = str(section.data.title ?? "ランキング");
  section.data.subtitle = str(section.data.subtitle ?? "最新順位はこちら");
  section.data.period = str(section.data.period ?? "");
  section.data.date = str(section.data.date ?? "");
  section.data.notes = Array.isArray(section.data.notes)
    ? section.data.notes.map((note) => str(note)).filter(Boolean)
    : [];
  section.data.columns = Array.isArray(section.data.columns) && section.data.columns.length > 0
    ? section.data.columns
    : [
        { key: "amount", label: "決済金額" },
        { key: "count", label: "品数" },
      ];
  section.data.rows = Array.isArray(section.data.rows)
    ? section.data.rows
    : [];

  delete section.data.rankLabel;
  delete section.data.headers;
  delete section.data.tableStyle;
  delete section.data.mobileDisplayMode;
  delete section.data.showCrown;
};

const hydrateCampaignPeriodBar: TemplateHydrator = (section) => {
  section.data.periodLabel = str(section.data.periodLabel ?? "キャンペーン期間");
  section.data.periodBarText = str(section.data.periodBarText ?? "");

  let startDate = normalizeIsoDate(section.data.startDate);
  let endDate = normalizeIsoDate(section.data.endDate);
  if (startDate && endDate && startDate > endDate) {
    const tmp = startDate;
    startDate = endDate;
    endDate = tmp;
  }
  section.data.startDate = startDate;
  section.data.endDate = endDate;

  section.data.showWeekday = resolveBoolean(section.data.showWeekday, true);
  section.data.allowWrap = resolveBoolean(section.data.allowWrap, true);

  const rawStyle =
    section.data.periodBarStyle && typeof section.data.periodBarStyle === "object"
      ? (section.data.periodBarStyle as Record<string, unknown>)
      : {};

  const sizeRaw =
    typeof rawStyle.size === "number" && Number.isFinite(rawStyle.size)
      ? rawStyle.size
      : 14;
  const paddingXRaw =
    typeof rawStyle.paddingX === "number" && Number.isFinite(rawStyle.paddingX)
      ? rawStyle.paddingX
      : 18;
  const paddingYRaw =
    typeof rawStyle.paddingY === "number" && Number.isFinite(rawStyle.paddingY)
      ? rawStyle.paddingY
      : 0;
  const shadowRaw = str(rawStyle.shadow ?? "none");

  section.data.periodBarStyle = {
    bold: resolveBoolean(rawStyle.bold, true),
    color: str(rawStyle.color ?? "#FFFFFF"),
    background: str(rawStyle.background ?? "#EB5505"),
    labelColor: str(rawStyle.labelColor ?? rawStyle.color ?? "#FFFFFF"),
    size: Math.max(10, Math.min(32, sizeRaw)),
    paddingX: Math.max(0, Math.min(48, paddingXRaw)),
    paddingY: Math.max(0, Math.min(24, paddingYRaw)),
    shadow: shadowRaw === "soft" || shadowRaw === "none" ? shadowRaw : "none",
    advancedStyleText: str(rawStyle.advancedStyleText ?? ""),
  };
};

const hydrateCampaignOverview: TemplateHydrator = (section) => {
  const contentTitle =
    section.content && typeof section.content.title === "string"
      ? section.content.title
      : "";
  const contentItems = Array.isArray(section.content?.items) ? section.content.items : [];
  const legacyTitleItem = contentItems.find(
    (item) => item.type === "title" && typeof (item as { text?: unknown }).text === "string"
  ) as { text?: string } | undefined;
  const title = str(contentTitle || section.data.title || legacyTitleItem?.text || "キャンペーン概要");
  const textItems = contentItems.filter((item) => item.type === "text");

  const isNoticeTextItem = (item: { lines?: Array<{ marks?: { callout?: { enabled?: unknown } } }> }) =>
    Array.isArray(item.lines) &&
    item.lines.length > 0 &&
    item.lines.every((line) => Boolean(line.marks?.callout?.enabled));

  const noticeTextItem = textItems.find((item) => isNoticeTextItem(item));
  const bodyTextItem =
    textItems.find((item) => item.id !== noticeTextItem?.id) ?? textItems[0];

  const normalizeLines = (
    source: unknown,
    fallback: string[]
  ) => {
    if (Array.isArray(source)) {
      const list = source
        .map((entry) => {
          if (typeof entry === "string") {
            return entry;
          }
          if (entry && typeof entry === "object") {
            return str((entry as Record<string, unknown>).text ?? "");
          }
          return "";
        })
        .map((text) => text.trim())
        .filter((text) => text.length > 0);
      if (list.length > 0) {
        return list;
      }
    }
    return [...fallback];
  };

  const bodyFromDataLines = normalizeLines(
    section.data.bodyLines,
    DEFAULT_CAMPAIGN_OVERVIEW_BODY_LINES
  );
  const bodyFromDataText = str(section.data.body ?? "")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0);
  const bodyFromContent = normalizeLines(
    bodyTextItem && bodyTextItem.type === "text"
      ? bodyTextItem.lines.map((line) => line.text)
      : [],
    []
  );
  const bodyLines =
    bodyFromContent.length > 0
      ? bodyFromContent
      : bodyFromDataLines.length > 0
      ? bodyFromDataLines
      : bodyFromDataText.length > 0
      ? bodyFromDataText
      : [...DEFAULT_CAMPAIGN_OVERVIEW_BODY_LINES];

  const noticeFromContent = normalizeLines(
    noticeTextItem && noticeTextItem.type === "text"
      ? noticeTextItem.lines.map((line) => line.text)
      : [],
    []
  );
  const noticeFromData = normalizeLines(
    section.data.noticeLines,
    DEFAULT_CAMPAIGN_OVERVIEW_NOTICE_LINES
  );
  const noticeLines =
    noticeFromContent.length > 0
      ? noticeFromContent
      : noticeFromData.length > 0
      ? noticeFromData
      : [...DEFAULT_CAMPAIGN_OVERVIEW_NOTICE_LINES];

  const noticeEnabled =
    typeof section.data.noticeEnabled === "boolean"
      ? section.data.noticeEnabled
      : noticeLines.length > 0;

  const nextBodyItem = {
    id:
      bodyTextItem && bodyTextItem.type === "text" && typeof bodyTextItem.id === "string"
        ? bodyTextItem.id
        : createId("item"),
    type: "text" as const,
    lines: bodyLines.map((line, index) => ({
      id:
        bodyTextItem &&
        bodyTextItem.type === "text" &&
        typeof bodyTextItem.lines[index]?.id === "string"
          ? bodyTextItem.lines[index].id
          : createId("line"),
      text: line,
      marks: {
        ...(bodyTextItem && bodyTextItem.type === "text" && bodyTextItem.lines[index]?.marks
          ? bodyTextItem.lines[index].marks
          : {}),
      },
    })),
  };

  const nextNoticeItem = {
    id:
      noticeTextItem && noticeTextItem.type === "text" && typeof noticeTextItem.id === "string"
        ? noticeTextItem.id
        : createId("item"),
    type: "text" as const,
    lines: noticeLines.map((line, index) => ({
      id:
        noticeTextItem &&
        noticeTextItem.type === "text" &&
        typeof noticeTextItem.lines[index]?.id === "string"
          ? noticeTextItem.lines[index].id
          : createId("line"),
      text: line,
      marks: {
        ...(noticeTextItem && noticeTextItem.type === "text" && noticeTextItem.lines[index]?.marks
          ? noticeTextItem.lines[index].marks
          : {}),
        callout: {
          enabled: true,
          variant: "note" as const,
        },
      },
    })),
  };

  section.content = {
    ...(section.content ?? {}),
    title,
    items: [nextBodyItem, nextNoticeItem],
  };

  const bodyWidthRaw =
    typeof section.data.bodyWidthPct === "number" && Number.isFinite(section.data.bodyWidthPct)
      ? section.data.bodyWidthPct
      : 100;
  const noticePaddingRaw =
    typeof section.data.noticePaddingPx === "number" && Number.isFinite(section.data.noticePaddingPx)
      ? section.data.noticePaddingPx
      : 14;

  section.data.title = title;
  section.data.body = bodyLines.join("\n");
  section.data.bodyLines = bodyLines;
  section.data.noticeLines = noticeLines;
  section.data.noticeEnabled = noticeEnabled;
  section.data.bodyWidthPct = Math.max(70, Math.min(100, bodyWidthRaw));
  section.data.noticeBg = str(section.data.noticeBg ?? "#fff7ed");
  section.data.noticeBorderColor = str(section.data.noticeBorderColor ?? "#fed7aa");
  section.data.noticePaddingPx = Math.max(8, Math.min(32, noticePaddingRaw));
};

const hydrateCouponFlow: TemplateHydrator = (section) => {
  const variant = str(section.data.variant ?? "slideshow");
  section.data.variant =
    variant === "stepCards" || variant === "timeline" || variant === "simpleList"
      ? variant
      : "slideshow";
  section.data.title = str(section.data.title ?? "クーポン利用の流れ");
  section.data.lead = str(
    section.data.lead ??
      "＊必ずクーポンを獲得してからau PAY（コード支払い）でお支払いください。"
  );
  section.data.note = str(section.data.note ?? "※画面はイメージです。");
  section.data.ctaEnabled = section.data.ctaEnabled !== false;
  section.data.buttonLabel = str(section.data.buttonLabel ?? "クーポンを獲得する");
  section.data.buttonUrl = str(section.data.buttonUrl ?? "");
  section.data.buttonPreset = str(section.data.buttonPreset ?? "couponFlow");
  section.data.buttonVariant =
    str(section.data.buttonVariant ?? "primary") === "secondary"
      ? "secondary"
      : "primary";
  section.data.buttonBg = str(
    section.data.buttonBg ??
      (section.data.buttonPreset === "couponFlow" ? "#ea5504" : "#eb5505")
  );
  section.data.buttonTextColor = str(section.data.buttonTextColor ?? "#ffffff");
  section.data.buttonBorderColor = str(
    section.data.buttonBorderColor ??
      (section.data.buttonPreset === "couponFlow" ? "#ffffff" : "#eb5505")
  );
  section.data.buttonRadius =
    typeof section.data.buttonRadius === "number" && Number.isFinite(section.data.buttonRadius)
      ? section.data.buttonRadius
      : 999;
  section.data.buttonShadow = str(
    section.data.buttonShadow ?? "0 6px 14px rgba(0, 0, 0, 0.18)"
  );

  const slideshow =
    section.data.slideshow && typeof section.data.slideshow === "object"
      ? (section.data.slideshow as Record<string, unknown>)
      : {};
  section.data.slideshow = {
    autoplay: slideshow.autoplay !== false,
    intervalMs:
      typeof slideshow.intervalMs === "number" && Number.isFinite(slideshow.intervalMs)
        ? slideshow.intervalMs
        : 3500,
    loop: slideshow.loop !== false,
    showArrows: slideshow.showArrows !== false,
    showDots: slideshow.showDots !== false,
    allowSwipe: slideshow.allowSwipe !== false,
  };
};

const hydrateTabbedNotes: TemplateHydrator = (section) => {
  section.data.title = str(section.data.title ?? "注意事項");
  const tabs = Array.isArray(section.data.tabs) ? section.data.tabs : [];
  section.data.tabs = tabs.map((tab, index) => {
    const entry = tab && typeof tab === "object" ? (tab as Record<string, unknown>) : {};
    const rawNotes = Array.isArray(entry.notes)
      ? entry.notes
      : [
          ...(Array.isArray(entry.items)
            ? entry.items.map((item) => {
                const itemEntry = item && typeof item === "object"
                  ? (item as Record<string, unknown>)
                  : {};
                return str(itemEntry.text ?? "");
              })
            : []),
          str(entry.footnote ?? ""),
        ];
    return {
      id: str(entry.id ?? `tab_${index + 1}`),
      label: str(entry.label ?? entry.labelTop ?? entry.labelBottom ?? `タブ${index + 1}`),
      contentTitle: str(entry.contentTitle ?? entry.intro ?? ""),
      notes: rawNotes.map((note) => str(note)).filter((note) => note.trim().length > 0),
    };
  });

  const tabCount = (section.data.tabs as unknown[]).length;
  const rawInitial =
    typeof section.data.initialTabIndex === "number" && Number.isFinite(section.data.initialTabIndex)
      ? Math.floor(section.data.initialTabIndex)
      : 0;
  section.data.initialTabIndex = tabCount <= 0 ? 0 : Math.max(0, Math.min(tabCount - 1, rawInitial));

  const rawStyle =
    section.data.tabStyle && typeof section.data.tabStyle === "object"
      ? (section.data.tabStyle as Record<string, unknown>)
      : {};
  section.data.tabStyle = {
    variant:
      rawStyle.variant === "sticky" ||
      rawStyle.variant === "underline" ||
      rawStyle.variant === "popout"
        ? rawStyle.variant
        : "simple",
    showBorder: rawStyle.showBorder !== false,
    inactiveBg: str(rawStyle.inactiveBg ?? "#DDDDDD"),
    activeBg: str(rawStyle.activeBg ?? "#000000"),
    contentBg: str(rawStyle.contentBg ?? "#FFFFFF"),
  };
};

const hydratePaymentHistoryGuide: TemplateHydrator = (section) => {
  section.data.title = str(section.data.title ?? "決済履歴の確認方法");
  section.data.body = str(
    section.data.body ??
      "現在の決済金額については、au PAY アプリ内の「取引履歴」をご確認ください。"
  );
  section.data.linkText = str(section.data.linkText ?? "こちら");
  section.data.linkUrl = str(section.data.linkUrl ?? "#contact");
  section.data.linkTargetKind =
    section.data.linkTargetKind === "section" ? "section" : "url";
  section.data.linkSectionId = str(section.data.linkSectionId ?? "");
  section.data.linkSuffix = str(section.data.linkSuffix ?? "までお問い合わせください。");
  section.data.alert = str(
    section.data.alert ??
      "なお、店頭や問い合わせ窓口での現在の順位や金額、当選結果についてのご質問にはお答えできません。"
  );
  section.data.imageUrl = str(section.data.imageUrl ?? "/footer-defaults/img-02.png");
  section.data.imageAlt = str(section.data.imageAlt ?? "決済履歴の確認方法");
  section.data.imageAssetId = str(section.data.imageAssetId ?? "");
};

const hydrateLegalNotes: TemplateHydrator = (section) => {
  const bulletEnabled = !(section.data.bullet === false || section.data.bullet === "none");
  const defaultBullet: "none" | "disc" = bulletEnabled ? "disc" : "none";
  const rawItems = Array.isArray(section.data.items) ? section.data.items : [];

  const normalizedDataItems =
    rawItems.length > 0
      ? rawItems
          .map((entry) => {
            if (typeof entry === "string") {
              return { text: str(entry), bullet: defaultBullet };
            }
            if (!entry || typeof entry !== "object") {
              return null;
            }
            const item = entry as Record<string, unknown>;
            return {
              text: str(item.text ?? ""),
              bullet:
                item.bullet === "none" || item.bullet === "disc"
                  ? item.bullet
                  : defaultBullet,
            };
          })
          .filter(
            (entry): entry is { text: string; bullet: "none" | "disc" } =>
              entry !== null && entry.text.trim().length > 0
          )
      : [];

  const contentItems = Array.isArray(section.content?.items) ? section.content.items : [];
  const textItemIndex = contentItems.findIndex((item) => item.type === "text");
  const textItem = textItemIndex >= 0 ? contentItems[textItemIndex] : undefined;
  const textLines =
    textItem && textItem.type === "text" && Array.isArray(textItem.lines)
      ? textItem.lines
      : [];

  const normalizedFromContent = textLines
    .map((line) => ({
      text: str(line.text ?? ""),
      bullet: line.marks?.bullet === "none" ? "none" : defaultBullet,
    }))
    .filter((line) => line.text.trim().length > 0);

  const finalItems =
    normalizedFromContent.length > 0
      ? normalizedFromContent
      : normalizedDataItems.length > 0
      ? normalizedDataItems
      : DEFAULT_LEGAL_NOTES_LINES.map((text) => ({ text, bullet: defaultBullet }));

  const nextTextItem = {
    id:
      textItem && textItem.type === "text" && typeof textItem.id === "string"
        ? textItem.id
        : createId("item"),
    type: "text" as const,
    lines: finalItems.map((entry, index) => {
      const source = textLines[index];
      const sourceId = source && typeof source.id === "string" ? source.id : "";
      return {
        id: sourceId || createId("line"),
        text: entry.text,
        marks: {
          ...(source?.marks ?? {}),
          bullet: entry.bullet,
        },
      };
    }),
  };

  const existingTitleItem = contentItems.find((item) => item.type === "title");
  const nextTitle = str(section.data.title ?? "注意事項");
  const nextTitleItem =
    existingTitleItem && existingTitleItem.type === "title"
      ? { ...existingTitleItem, text: nextTitle }
      : {
          id: createId("item"),
          type: "title" as const,
          text: nextTitle,
        };

  const withoutTitleAndText = contentItems.filter(
    (item) => item.type !== "title" && item.type !== "text"
  );
  section.content = {
    ...(section.content ?? {}),
    items: [nextTitleItem, nextTextItem, ...withoutTitleAndText],
  };

  section.data.title = nextTitle;
  section.data.bullet = bulletEnabled;
  section.data.items = finalItems;
  const rawWidth =
    typeof section.data.noteWidthPct === "number" && Number.isFinite(section.data.noteWidthPct)
      ? section.data.noteWidthPct
      : 100;
  section.data.noteWidthPct = Math.max(40, Math.min(100, rawWidth));
  section.data.noteBg = str(section.data.noteBg ?? "#ffffff");
  section.data.noteBorderColor = str(section.data.noteBorderColor ?? "#e5e7eb");
  const rawPadding =
    typeof section.data.notePaddingPx === "number" && Number.isFinite(section.data.notePaddingPx)
      ? section.data.notePaddingPx
      : 24;
  section.data.notePaddingPx = Math.max(8, Math.min(40, rawPadding));
};

const hydrateImageSection: TemplateHydrator = (section) => {
  section.data.imageUrl = str(section.data.imageUrl ?? "");
  section.data.alt = str(section.data.alt ?? "");
  section.data.caption = str(section.data.caption ?? "");
  section.data.alignment =
    section.data.alignment === "left" || section.data.alignment === "right"
      ? section.data.alignment
      : "center";
  const width =
    typeof section.data.width === "number" && Number.isFinite(section.data.width)
      ? section.data.width
      : 720;
  section.data.width = Math.max(120, Math.min(2000, width));
  const borderRadius =
    typeof section.data.borderRadius === "number" && Number.isFinite(section.data.borderRadius)
      ? section.data.borderRadius
      : 12;
  section.data.borderRadius = Math.max(0, Math.min(80, borderRadius));
  section.data.backgroundColor = str(section.data.backgroundColor ?? "#ffffff");
  section.data.textColor = str(section.data.textColor ?? "#111111");
  section.data.paddingTop =
    typeof section.data.paddingTop === "number" && Number.isFinite(section.data.paddingTop)
      ? Math.max(0, Math.min(240, section.data.paddingTop))
      : 24;
  section.data.paddingBottom =
    typeof section.data.paddingBottom === "number" && Number.isFinite(section.data.paddingBottom)
      ? Math.max(0, Math.min(240, section.data.paddingBottom))
      : 24;
};

const hydrateStickyNote: TemplateHydrator = (section) => {
  section.data.title = str(section.data.title ?? "");
  section.data.body = str(section.data.body ?? "");
  section.data.themeColor = str(section.data.themeColor ?? "#f59e0b");
  section.data.presetColor = str(section.data.presetColor ?? "#fef3c7");
  section.data.icon = str(section.data.icon ?? "");
  section.data.shadow =
    section.data.shadow === "none" || section.data.shadow === "strong"
      ? section.data.shadow
      : "soft";
  section.data.borderRadius =
    typeof section.data.borderRadius === "number" && Number.isFinite(section.data.borderRadius)
      ? Math.max(0, Math.min(80, section.data.borderRadius))
      : 14;
  section.data.backgroundColor = str(section.data.backgroundColor ?? "#fff7d6");
  section.data.textColor = str(section.data.textColor ?? "#3f2f10");
  section.data.paddingTop =
    typeof section.data.paddingTop === "number" && Number.isFinite(section.data.paddingTop)
      ? Math.max(0, Math.min(240, section.data.paddingTop))
      : 20;
  section.data.paddingBottom =
    typeof section.data.paddingBottom === "number" && Number.isFinite(section.data.paddingBottom)
      ? Math.max(0, Math.min(240, section.data.paddingBottom))
      : 20;
};

const hydrateContactSection: TemplateHydrator = (section) => {
  const legacyTitle = str(section.data.heading ?? "");
  const legacyNote = str(section.data.businessHours ?? "");
  const resolvedTitle = str(section.data.title ?? "").trim() || legacyTitle || "本キャンペーンに関するお問い合わせ先";
  const resolvedNote = str(section.data.note ?? "").trim() || legacyNote || "";
  section.data.title = str(resolvedTitle);
  section.data.description = str(
    section.data.description ?? "チャット形式でかんたんにお問い合わせいただけます。"
  );
  section.data.buttonLabel = str(section.data.buttonLabel ?? "お問い合わせ先はこちら");
  section.data.buttonUrl = str(
    section.data.buttonUrl ?? "https://www.au.com/support/inquiry/message/"
  );
  section.data.note = str(resolvedNote);
  section.data.textAlign =
    section.data.textAlign === "left" || section.data.textAlign === "right"
      ? section.data.textAlign
      : "center";
  section.data.backgroundColor = str(section.data.backgroundColor ?? "#000000");
  section.data.buttonColor = str(section.data.buttonColor ?? "#fa5902");
  section.data.textColor = str(section.data.textColor ?? "#ffffff");
  section.data.paddingTop =
    typeof section.data.paddingTop === "number" && Number.isFinite(section.data.paddingTop)
      ? Math.max(0, Math.min(240, section.data.paddingTop))
      : 45;
  section.data.paddingBottom =
    typeof section.data.paddingBottom === "number" && Number.isFinite(section.data.paddingBottom)
      ? Math.max(0, Math.min(240, section.data.paddingBottom))
      : 50;

  // Drop legacy contact detail fields after migration to CTA-style schema.
  delete section.data.heading;
  delete section.data.contactName;
  delete section.data.email;
  delete section.data.phone;
  delete section.data.businessHours;
};

const hydrateFooterSection: TemplateHydrator = (section) => {
  section.data.companyName = str(section.data.companyName ?? "");
  section.data.copyrightText = str(section.data.copyrightText ?? "");
  section.data.linksText = str(section.data.linksText ?? section.data.subText ?? "");
  section.data.subText = str(section.data.subText ?? section.data.linksText ?? "");
  section.data.backgroundColor = str(section.data.backgroundColor ?? "#111827");
  section.data.textColor = str(section.data.textColor ?? "#f9fafb");
  section.data.paddingTop =
    typeof section.data.paddingTop === "number" && Number.isFinite(section.data.paddingTop)
      ? Math.max(0, Math.min(240, section.data.paddingTop))
      : 20;
  section.data.paddingBottom =
    typeof section.data.paddingBottom === "number" && Number.isFinite(section.data.paddingBottom)
      ? Math.max(0, Math.min(240, section.data.paddingBottom))
      : 20;
};

const templateHydratorMap: Partial<Record<string, TemplateHydrator>> = {
  heroImage: hydrateHeroImage,
  campaignPeriodBar: hydrateCampaignPeriodBar,
  campaignOverview: hydrateCampaignOverview,
  targetStores: hydrateTargetStores,
  rankingTable: hydrateRankingTable,
  couponFlow: hydrateCouponFlow,
  paymentHistoryGuide: hydratePaymentHistoryGuide,
  paymentUsageGuide: hydratePaymentHistoryGuide,
  legalNotes: hydrateLegalNotes,
  tabbedNotes: hydrateTabbedNotes,
  image: hydrateImageSection,
  stickyNote: hydrateStickyNote,
  contact: hydrateContactSection,
  footer: hydrateFooterSection,
};

export const applyTemplateHydrator = (section: SectionBase) => {
  const hydrator = templateHydratorMap[section.type];
  if (!hydrator) {
    return false;
  }
  hydrator(section);
  return true;
};
