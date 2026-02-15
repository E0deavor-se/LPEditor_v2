import JSZip from "jszip";
import type { ProjectState, StoresTable } from "@/src/types/project";

const TARGET_STORES_CONFIG_PLACEHOLDER = "__TARGET_STORES_CONFIG__";

const str = (value: unknown) =>
  typeof value === "string" ? value : value == null ? "" : String(value);

const escapeHtml = (value: string) =>
  value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#39;");

const formatDate = (value?: unknown) =>
  typeof value === "string" && value
    ? value.replaceAll("-", "/")
    : "";

const resolveTargetStoresConfig = (project: ProjectState) => {
  const section = project.sections.find(
    (entry) => entry.type === "targetStores"
  );
  const config = (section?.data?.targetStoresConfig ?? {}) as {
    labelKeys?: string[];
    filterKeys?: string[];
    pageSize?: number;
  };
  return {
    labelKeys: Array.isArray(config.labelKeys) ? config.labelKeys : [],
    filterKeys: Array.isArray(config.filterKeys) ? config.filterKeys : [],
    pageSize: typeof config.pageSize === "number" ? config.pageSize : 10,
  };
};

const ensureStoresData = (project: ProjectState): StoresTable => {
  if (!project.stores || !project.stores.canonical) {
    throw new Error("店舗データがありません。");
  }
  return project.stores;
};

export const buildIndexHtml = (project: ProjectState): string => {
  const sections = project.sections.filter((section) => section.visible);
  const sectionHtml = sections
    .map((section) => {
      switch (section.type) {
        case "brandBar":
          return `
            <section class="brand">
              <div class="container">${escapeHtml(
                String(section.data.logoText ?? "")
              )}</div>
            </section>
          `;
        case "heroImage":
          return `
            <section class="hero container">
              ${
                section.data.imageUrl
                  ? `<img src="${escapeHtml(
                      String(section.data.imageUrl)
                    )}" alt="${escapeHtml(
                      String(section.data.alt ?? "")
                    )}" />`
                  : `<div class="hero-placeholder">ヒーロー画像</div>`
              }
            </section>
          `;
        case "campaignPeriodBar":
          return `
            <section class="period">
              <div class="container">${escapeHtml(
                `${formatDate(section.data.startDate)} - ${formatDate(
                  section.data.endDate
                )}`
              )}</div>
            </section>
          `;
        case "campaignOverview":
          return `
            <section class="container">
              <h2>${escapeHtml(
                String(section.data.title ?? "キャンペーン概要")
              )}</h2>
              <p>${escapeHtml(String(section.data.body ?? ""))}</p>
            </section>
          `;
        case "paymentHistoryGuide": {
          const data = section.data ?? {};
          const title = escapeHtml(str(data.title || "決済履歴の確認方法"));
          const body = escapeHtml(str(data.body || ""));
          const linkText = escapeHtml(str(data.linkText || ""));
          const linkUrl = escapeHtml(str(data.linkUrl || ""));
          const linkTargetKind =
            data.linkTargetKind === "section" ? "section" : "url";
          const linkSectionId = str(data.linkSectionId || "");
          const resolvedLinkUrl =
            linkTargetKind === "section" && linkSectionId
              ? `#sec-${linkSectionId}`
              : linkUrl;
          const linkSuffix = escapeHtml(str(data.linkSuffix || ""));
          const alert = escapeHtml(str(data.alert || ""));
          const imageUrl = str(data.imageUrl || "");
          const imageAlt = escapeHtml(str(data.imageAlt || ""));
          const imageAssetId = str(data.imageAssetId || "");
          const resolvedImage =
            imageAssetId && project.assets?.[imageAssetId]?.data
              ? project.assets[imageAssetId].data
              : imageUrl;
          const bodyHtml = body.replace(/\n/g, "<br />");
          const alertHtml = alert.replace(/\n/g, "<br />");
          const linkHtml = linkText && resolvedLinkUrl
            ? ` <a class="payment-guide__link" href="${resolvedLinkUrl}">${linkText}</a>${linkSuffix}`
            : "";
          return `
            <section class="container payment-guide">
              <h2>${title}</h2>
              ${bodyHtml ? `<p class="payment-guide__body">${bodyHtml}${linkHtml}</p>` : ""}
              ${alertHtml ? `<p class="payment-guide__alert">${alertHtml}</p>` : ""}
              ${
                resolvedImage
                  ? `<div class="payment-guide__image"><img src="${escapeHtml(
                      str(resolvedImage)
                    )}" alt="${imageAlt}" /></div>`
                  : `<div class="payment-guide__image payment-guide__image--placeholder">画像を追加してください</div>`
              }
            </section>
          `;
        }
        case "tabbedNotes": {
          const data = section.data ?? {};
          const rawTabs = Array.isArray(data.tabs) ? data.tabs : [];
          const tabs = rawTabs.map((tab, index) => {
            const entry = tab && typeof tab === "object"
              ? (tab as Record<string, unknown>)
              : {};
            const rawItems = Array.isArray(entry.items) ? entry.items : [];
            const items = rawItems.map((item, itemIndex) => {
              const itemEntry = item && typeof item === "object"
                ? (item as Record<string, unknown>)
                : {};
              const subItems = Array.isArray(itemEntry.subItems)
                ? itemEntry.subItems.map((value) => str(value))
                : [];
              return {
                id:
                  typeof itemEntry.id === "string" && itemEntry.id.trim()
                    ? itemEntry.id
                    : `tab_item_${index + 1}_${itemIndex + 1}`,
                text: str(itemEntry.text ?? ""),
                bullet: itemEntry.bullet === "none" ? "none" : "disc",
                tone: itemEntry.tone === "accent" ? "accent" : "normal",
                bold: Boolean(itemEntry.bold),
                subItems,
              };
            });
            const ctaTargetKind =
              entry.ctaTargetKind === "section" ? "section" : "url";
            const ctaSectionId = str(entry.ctaSectionId ?? "");
            const ctaLinkUrl = str(entry.ctaLinkUrl ?? "");
            const resolvedCtaUrl =
              ctaTargetKind === "section" && ctaSectionId
                ? `#sec-${ctaSectionId}`
                : ctaLinkUrl;
            const ctaImageUrl = str(entry.ctaImageUrl ?? "");
            const ctaImageAlt = escapeHtml(str(entry.ctaImageAlt ?? ""));
            const ctaImageAssetId = str(entry.ctaImageAssetId ?? "");
            const resolvedCtaImage =
              ctaImageAssetId && project.assets?.[ctaImageAssetId]?.data
                ? project.assets[ctaImageAssetId].data
                : ctaImageUrl;
            const buttonTargetKind =
              entry.buttonTargetKind === "section" ? "section" : "url";
            const buttonSectionId = str(entry.buttonSectionId ?? "");
            const buttonUrl = str(entry.buttonUrl ?? "");
            const resolvedButtonUrl =
              buttonTargetKind === "section" && buttonSectionId
                ? `#sec-${buttonSectionId}`
                : buttonUrl;
            return {
              id:
                typeof entry.id === "string" && entry.id.trim()
                  ? entry.id
                  : `tab_${index + 1}`,
              labelTop: escapeHtml(str(entry.labelTop ?? "")),
              labelBottom: escapeHtml(str(entry.labelBottom ?? "注意事項")),
              intro: escapeHtml(str(entry.intro ?? "")),
              items,
              footnote: escapeHtml(str(entry.footnote ?? "")),
              ctaText: escapeHtml(str(entry.ctaText ?? "")),
              ctaLinkText: escapeHtml(str(entry.ctaLinkText ?? "")),
              resolvedCtaUrl,
              resolvedCtaImage,
              ctaImageAlt,
              buttonText: escapeHtml(str(entry.buttonText ?? "")),
              resolvedButtonUrl,
            };
          });
          const rawStyle = data.tabStyle && typeof data.tabStyle === "object"
            ? (data.tabStyle as Record<string, unknown>)
            : {};
          const rawVariant = typeof rawStyle.variant === "string"
            ? rawStyle.variant
            : "simple";
          const variant =
            rawVariant === "sticky" ||
            rawVariant === "underline" ||
            rawVariant === "popout"
              ? rawVariant
              : "simple";
          const tabStyle = {
            variant,
            inactiveBg: typeof rawStyle.inactiveBg === "string" ? rawStyle.inactiveBg : "#DDDDDD",
            inactiveText:
              typeof rawStyle.inactiveText === "string" ? rawStyle.inactiveText : "#000000",
            activeBg: typeof rawStyle.activeBg === "string" ? rawStyle.activeBg : "#000000",
            activeText:
              typeof rawStyle.activeText === "string" ? rawStyle.activeText : "#FFFFFF",
            border: typeof rawStyle.border === "string" ? rawStyle.border : "#000000",
            contentBg:
              typeof rawStyle.contentBg === "string" ? rawStyle.contentBg : "#FFFFFF",
            contentBorder:
              typeof rawStyle.contentBorder === "string"
                ? rawStyle.contentBorder
                : "#000000",
            accent: typeof rawStyle.accent === "string" ? rawStyle.accent : "#EB5505",
          };
          const styleVars = [
            `--tab-inactive-bg:${escapeHtml(str(tabStyle.inactiveBg))}`,
            `--tab-inactive-text:${escapeHtml(str(tabStyle.inactiveText))}`,
            `--tab-active-bg:${escapeHtml(str(tabStyle.activeBg))}`,
            `--tab-active-text:${escapeHtml(str(tabStyle.activeText))}`,
            `--tab-border:${escapeHtml(str(tabStyle.border))}`,
            `--tab-content-bg:${escapeHtml(str(tabStyle.contentBg))}`,
            `--tab-content-border:${escapeHtml(str(tabStyle.contentBorder))}`,
            `--tab-accent:${escapeHtml(str(tabStyle.accent))}`,
          ].join(";");
          const tabName = `tab-${section.id}`;
          const tabHtml = tabs
            .map((tab, index) => {
              const tabId = `${tabName}-${index + 1}`;
              const itemsHtml = tab.items
                .map((item) => {
                  const itemClass = [
                    "tabbed-notes__item",
                    item.bullet === "disc" ? "is-disc" : "",
                    item.tone === "accent" ? "is-accent" : "",
                    item.bold ? "is-bold" : "",
                  ]
                    .filter(Boolean)
                    .join(" ");
                  const subList = item.subItems.length > 0
                    ? `<ul class="tabbed-notes__sublist">${item.subItems
                        .map((sub) => `<li>${escapeHtml(sub)}</li>`)
                        .join("")}</ul>`
                    : "";
                  return `<li class="${itemClass}">${escapeHtml(item.text)}${subList}</li>`;
                })
                .join("");
              const ctaHtml =
                tab.ctaText || tab.ctaLinkText || tab.resolvedCtaImage
                  ? `
                    <div class="tabbed-notes__cta">
                      ${tab.ctaText ? `<p class="tabbed-notes__cta-text">${tab.ctaText}</p>` : ""}
                      ${tab.ctaLinkText && tab.resolvedCtaUrl ? `<a class="tabbed-notes__cta-link" href="${tab.resolvedCtaUrl}">${tab.ctaLinkText}</a>` : ""}
                      ${tab.resolvedCtaImage ? `<a class="tabbed-notes__cta-image" href="${tab.resolvedCtaUrl || "#"}"><img src="${escapeHtml(str(tab.resolvedCtaImage))}" alt="${tab.ctaImageAlt}" /></a>` : ""}
                    </div>
                  `
                  : "";
              const buttonHtml =
                tab.buttonText && tab.resolvedButtonUrl
                  ? `
                    <div class="tabbed-notes__button">
                      <a class="tabbed-notes__button-link" href="${tab.resolvedButtonUrl}">${tab.buttonText}</a>
                    </div>
                  `
                  : "";
              return `
                <input id="${tabId}" type="radio" name="${tabName}" class="tabbed-notes__switch" ${
                  index === 0 ? "checked=\"checked\"" : ""
                }>
                <label class="tabbed-notes__label" for="${tabId}">
                  ${tab.labelTop ? `<span class="tabbed-notes__label-top">${tab.labelTop}</span>` : ""}
                  <span class="tabbed-notes__label-bottom">${tab.labelBottom}</span>
                </label>
                <div class="tabbed-notes__content">
                  <div class="tabbed-notes__panel">
                    ${tab.intro ? `<p class="tabbed-notes__intro">${tab.intro}</p>` : ""}
                    <ul class="tabbed-notes__list">${itemsHtml}</ul>
                    ${tab.footnote ? `<p class="tabbed-notes__footnote">${tab.footnote}</p>` : ""}
                    ${ctaHtml}
                    ${buttonHtml}
                  </div>
                </div>
              `;
            })
            .join("");
          return `
            <section class="container tabbed-notes tabbed-notes--${tabStyle.variant}" style="${styleVars}">
              <div class="tabbed-notes__wrap">
                ${tabHtml}
              </div>
            </section>
          `;
        }
        case "targetStores":
          return `
            <section class="container">
              <h2>${escapeHtml(
                String(section.data.title ?? "対象店舗")
              )}</h2>
              <p>${escapeHtml(
                String(section.data.note ?? "")
              )}</p>
              <a class="stores-link" href="stores/target-stores.html">対象店舗検索へ</a>
            </section>
          `;
        case "legalNotes":
          {
            const items = Array.isArray(section.data?.items)
              ? section.data.items
              : [];
          return `
            <section class="container">
              <h2>${escapeHtml(
                String(section.data.title ?? "注意事項")
              )}</h2>
              <ul>
                ${items
                  .map((item: string) => `<li>${escapeHtml(item)}</li>`)
                  .join("")}
              </ul>
            </section>
          `;
        }
        case "rankingTable": {
          const data = section.data ?? {};
          const headers =
            data && typeof data.headers === "object"
              ? (data.headers as Record<string, unknown>)
              : {};
          const rankLabel = escapeHtml(
            str(data.rankLabel || headers.rank || "順位")
          );
          const rawColumns = data.columns;
          const columns = Array.isArray(rawColumns) && rawColumns.length > 0
            ? rawColumns.map((col, index) => {
                if (typeof col === "string") {
                  return { key: `col_${index + 1}`, label: col };
                }
                const entry = col && typeof col === "object"
                  ? (col as Record<string, unknown>)
                  : {};
                return {
                  key: typeof entry.key === "string" ? entry.key : `col_${index + 1}`,
                  label:
                    typeof entry.label === "string"
                      ? entry.label
                      : `列${index + 1}`,
                };
              })
            : [
                {
                  key: "label",
                  label: typeof headers.label === "string" ? headers.label : "項目",
                },
                {
                  key: "value",
                  label: typeof headers.value === "string" ? headers.value : "決済金額",
                },
              ];
          const columnCount = columns.length;
          const rows = Array.isArray(data?.rows)
            ? (data.rows as Array<Record<string, unknown>>)
            : [];
          const normalizedRows = rows.map((row, index) => {
            if (Array.isArray(row)) {
              const values = row.map((value) => String(value));
              return {
                id: `rank_${index + 1}`,
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
              : [String(entry.label ?? ""), String(entry.value ?? "")];
            return {
              id:
                typeof entry.id === "string" && entry.id.trim()
                  ? entry.id
                  : `rank_${index + 1}`,
              values: rawValues
                .slice(0, columnCount)
                .concat(Array(Math.max(0, columnCount - rawValues.length)).fill("")),
            };
          });
          const title = escapeHtml(str(data.title || "ランキング"));
          const subtitle = escapeHtml(str(data.subtitle || ""));
          const period = escapeHtml(str(data.period || ""));
          const dateText = escapeHtml(str(data.date || ""));
          const notes = Array.isArray(data?.notes)
            ? data.notes.map((note: string) => escapeHtml(str(note)))
            : [];
          const rawStyle = data.tableStyle && typeof data.tableStyle === "object"
            ? (data.tableStyle as Record<string, unknown>)
            : {};
          const tableStyle = {
            headerBg:
              typeof rawStyle.headerBg === "string" ? rawStyle.headerBg : "#f8fafc",
            headerText:
              typeof rawStyle.headerText === "string" ? rawStyle.headerText : "#0f172a",
            cellBg: typeof rawStyle.cellBg === "string" ? rawStyle.cellBg : "#ffffff",
            cellText:
              typeof rawStyle.cellText === "string" ? rawStyle.cellText : "#0f172a",
            border: typeof rawStyle.border === "string" ? rawStyle.border : "#e2e8f0",
            rankBg: typeof rawStyle.rankBg === "string" ? rawStyle.rankBg : "#e2e8f0",
            rankText:
              typeof rawStyle.rankText === "string" ? rawStyle.rankText : "#0f172a",
            top1Bg: typeof rawStyle.top1Bg === "string" ? rawStyle.top1Bg : "#f59e0b",
            top2Bg: typeof rawStyle.top2Bg === "string" ? rawStyle.top2Bg : "#cbd5f5",
            top3Bg: typeof rawStyle.top3Bg === "string" ? rawStyle.top3Bg : "#fb923c",
            periodLabelBg:
              typeof rawStyle.periodLabelBg === "string"
                ? rawStyle.periodLabelBg
                : "#f1f5f9",
            periodLabelText:
              typeof rawStyle.periodLabelText === "string"
                ? rawStyle.periodLabelText
                : "#0f172a",
          };
          const headerHtml = columns
            .map((column) => `<th>${escapeHtml(str(column.label))}</th>`)
            .join("");
          const rowsHtml = normalizedRows
            .map((row, index) => {
              const rank = index + 1;
              const topClass = rank <= 3 ? ` is-top-${rank}` : "";
              const valueCells = row.values
                .map((value) => {
                  const cellText = value.trim() ? value : "-";
                  return `<td class="ranking-table__cell">${escapeHtml(cellText)}</td>`;
                })
                .join("");
              return `
                <tr>
                  <td class="ranking-table__rank">
                    <span class="ranking-table__rank-badge${topClass}">${rank}</span>
                  </td>
                  ${valueCells}
                </tr>
              `;
            })
            .join("");
          const notesHtml = notes.length
            ? `
              <ul class="ranking-table__notes">
                ${notes.map((note) => `<li>${note}</li>`).join("")}
              </ul>
            `
            : "";
          const styleVars = [
            `--ranking-header-bg:${escapeHtml(str(tableStyle.headerBg))}`,
            `--ranking-header-text:${escapeHtml(str(tableStyle.headerText))}`,
            `--ranking-cell-bg:${escapeHtml(str(tableStyle.cellBg))}`,
            `--ranking-cell-text:${escapeHtml(str(tableStyle.cellText))}`,
            `--ranking-border:${escapeHtml(str(tableStyle.border))}`,
            `--ranking-rank-bg:${escapeHtml(str(tableStyle.rankBg))}`,
            `--ranking-rank-text:${escapeHtml(str(tableStyle.rankText))}`,
            `--ranking-top1-bg:${escapeHtml(str(tableStyle.top1Bg))}`,
            `--ranking-top2-bg:${escapeHtml(str(tableStyle.top2Bg))}`,
            `--ranking-top3-bg:${escapeHtml(str(tableStyle.top3Bg))}`,
            `--ranking-period-label-bg:${escapeHtml(str(tableStyle.periodLabelBg))}`,
            `--ranking-period-label-text:${escapeHtml(
              str(tableStyle.periodLabelText)
            )}`,
          ].join(";");
          return `
            <section class="container ranking-table">
              <h2>${title}</h2>
              ${subtitle ? `<p class="ranking-table__subtitle">${subtitle}</p>` : ""}
              ${
                period
                  ? `<div class="ranking-table__period"><span class="ranking-table__period-label">集計期間</span><span>${period}</span></div>`
                  : ""
              }
              ${dateText ? `<div class="ranking-table__date">${dateText}</div>` : ""}
              <div class="ranking-table__table-wrap">
                <table class="ranking-table__table" style="${styleVars}">
                  <thead>
                    <tr>
                      <th>${rankLabel}</th>
                      ${headerHtml}
                    </tr>
                  </thead>
                  <tbody>${rowsHtml}</tbody>
                </table>
              </div>
              ${notesHtml}
            </section>
          `;
        }
        case "footerHtml":
          return `
            <footer class="footer">
              <div class="container">${String(section.data.html ?? "")}</div>
            </footer>
          `;
        default:
          return "";
      }
    })
    .join("");

  return `<!doctype html>
<html lang="ja">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${escapeHtml(project.meta.projectName || "キャンペーンLP")}</title>
    <link rel="stylesheet" href="assets/main.css" />
  </head>
  <body>
    ${sectionHtml}
  </body>
</html>`;
};

export const buildTargetStoresHtml = (): string => {
  return `<!doctype html>
<html lang="ja">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>対象店舗</title>
    <link rel="stylesheet" href="../assets/target-stores.css" />
  </head>
  <body>
    <main class="stores-wrapper">
      <header class="stores-header">
        <h1>対象店舗</h1>
        <p>条件を指定して対象店舗を検索できます。</p>
      </header>
      <section class="stores-controls">
        <div class="stores-row">
          <label for="stores-keyword">キーワード</label>
          <input id="stores-keyword" type="text" placeholder="店舗名・住所など" />
          <label for="stores-prefecture">都道府県</label>
          <select id="stores-prefecture"></select>
        </div>
        <div class="stores-filter-chips" id="stores-filter-chips"></div>
        <div class="stores-filter-groups" id="stores-filter-groups"></div>
      </section>
      <section class="stores-meta">
        <div id="stores-count"></div>
        <div class="stores-pager" id="stores-pager"></div>
      </section>
      <section class="stores-cards" id="stores-cards"></section>
      <section class="stores-empty" id="stores-empty"></section>
    </main>
    <script>
      window.__TARGET_STORES_CONFIG__ = ${TARGET_STORES_CONFIG_PLACEHOLDER};
    </script>
    <script src="../assets/target-stores.js"></script>
  </body>
</html>`;
};

export const buildTargetStoresCss = (): string => `
:root {
  color-scheme: light;
  font-family: "Noto Sans JP", "Hiragino Kaku Gothic ProN", "Yu Gothic", sans-serif;
  color: #1f2937;
  background: #f8fafc;
}
body {
  margin: 0;
  background: #f8fafc;
}
.stores-wrapper {
  max-width: 980px;
  margin: 0 auto;
  padding: 32px 20px 48px;
}
.stores-header h1 {
  margin: 0 0 8px;
  font-size: 22px;
}
.stores-header p {
  margin: 0 0 16px;
  font-size: 13px;
  color: #64748b;
}
.stores-controls {
  border: 1px solid #e2e8f0;
  background: #ffffff;
  border-radius: 12px;
  padding: 16px;
  margin-bottom: 16px;
}
.stores-row {
  display: flex;
  flex-wrap: wrap;
  gap: 8px 12px;
  align-items: center;
}
.stores-row label {
  font-size: 12px;
  color: #475569;
}
.stores-row input,
.stores-row select {
  height: 32px;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  padding: 0 10px;
  font-size: 12px;
  min-width: 200px;
}
.stores-filter-chips,
.stores-filter-groups {
  margin-top: 12px;
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}
.filter-chip {
  display: inline-flex;
  gap: 6px;
  align-items: center;
  border-radius: 999px;
  border: 1px solid #e2e8f0;
  padding: 4px 10px;
  font-size: 11px;
  background: #f8fafc;
}
.filter-chip button {
  border: none;
  background: none;
  color: #94a3b8;
  cursor: pointer;
}
.filter-group {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  align-items: center;
}
.filter-group strong {
  font-size: 11px;
  color: #475569;
}
.filter-toggle {
  border: 1px solid #e2e8f0;
  border-radius: 999px;
  padding: 4px 10px;
  font-size: 11px;
  background: #ffffff;
  cursor: pointer;
}
.filter-toggle.active {
  border-color: #2563eb;
  background: #eff6ff;
  color: #1d4ed8;
}
.stores-meta {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 12px;
  color: #64748b;
  margin-bottom: 12px;
}
.stores-pager button {
  border: 1px solid #e2e8f0;
  background: #ffffff;
  border-radius: 6px;
  padding: 4px 10px;
  font-size: 11px;
  margin-right: 6px;
}
.stores-pager button:disabled {
  color: #cbd5f5;
}
.stores-cards {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 12px;
}
.store-card {
  border: 1px solid #e2e8f0;
  background: #ffffff;
  border-radius: 12px;
  padding: 14px;
  box-shadow: 0 1px 0 rgba(15, 23, 42, 0.04);
}
.store-card .badges {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-bottom: 8px;
}
.store-card .badge {
  border-radius: 999px;
  background: #f1f5f9;
  padding: 3px 8px;
  font-size: 11px;
  color: #475569;
}
.store-card h3 {
  margin: 0 0 6px;
  font-size: 14px;
}
.store-card p {
  margin: 0;
  font-size: 12px;
  color: #64748b;
}
.stores-empty {
  text-align: center;
  padding: 24px;
  border: 1px dashed #e2e8f0;
  border-radius: 12px;
  color: #94a3b8;
}
@media (max-width: 640px) {
  .stores-row input,
  .stores-row select {
    width: 100%;
  }
  .stores-meta {
    flex-direction: column;
    align-items: flex-start;
    gap: 8px;
  }
}
`;

export const buildMainCss = (): string => `
:root {
  font-family: "Noto Sans JP", "Hiragino Kaku Gothic ProN", "Yu Gothic", sans-serif;
  color: #0f172a;
  background: #ffffff;
}
body {
  margin: 0;
  background: #ffffff;
}
.container {
  max-width: 960px;
  margin: 0 auto;
  padding: 0 20px;
}
.brand {
  background: #f8fafc;
  padding: 12px 0;
  font-size: 14px;
  font-weight: 600;
}
.hero img {
  width: 100%;
  height: 320px;
  object-fit: cover;
  border-radius: 16px;
}
.hero-placeholder {
  height: 280px;
  border-radius: 16px;
  border: 1px solid #e2e8f0;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #94a3b8;
  background: #f1f5f9;
}
.period {
  background: #fff7ed;
  padding: 10px 0;
  font-size: 13px;
  color: #92400e;
}
h2 {
  font-size: 20px;
  margin: 24px 0 12px;
}
p {
  font-size: 14px;
  color: #475569;
  line-height: 1.6;
}
ul {
  padding-left: 18px;
  color: #475569;
  font-size: 14px;
}
.stores-link {
  display: inline-block;
  margin-top: 12px;
  padding: 8px 14px;
  border-radius: 999px;
  background: #1d4ed8;
  color: #ffffff;
  text-decoration: none;
  font-size: 12px;
}
.ranking-table {
  margin-top: 16px;
}
.ranking-table__subtitle {
  margin: 6px 0 0;
  text-align: center;
  font-size: 13px;
  font-weight: 600;
  color: #64748b;
}
.ranking-table__period {
  margin-top: 8px;
  display: flex;
  justify-content: center;
  gap: 8px;
  font-size: 13px;
  font-weight: 600;
  color: #64748b;
}
.ranking-table__period-label {
  background: var(--ranking-period-label-bg, #f1f5f9);
  color: var(--ranking-period-label-text, #0f172a);
  padding: 2px 8px;
  border-radius: 4px;
}
.ranking-table__date {
  margin-top: 10px;
  text-align: center;
  font-size: 18px;
  font-weight: 800;
  color: #0f172a;
}
.ranking-table__table-wrap {
  margin-top: 12px;
  overflow-x: auto;
}
.ranking-table__table {
  width: 100%;
  border-collapse: separate;
  border-spacing: 8px;
  color: #0f172a;
  font-weight: 700;
}
.ranking-table__table th {
  background: var(--ranking-header-bg, #f8fafc);
  color: var(--ranking-header-text, #0f172a);
  border: 1px solid var(--ranking-border, #e2e8f0);
  padding: 8px 10px;
  border-radius: 6px;
  font-size: 12px;
  text-align: center;
}
.ranking-table__table td {
  background: var(--ranking-cell-bg, #ffffff);
  color: var(--ranking-cell-text, #0f172a);
  border: 1px solid var(--ranking-border, #e2e8f0);
  padding: 8px 10px;
  border-radius: 6px;
  font-size: 14px;
  text-align: center;
}
.ranking-table__rank {
  text-align: center;
  font-size: 18px;
  font-weight: 800;
}
.ranking-table__rank-badge {
  display: inline-flex;
  min-width: 28px;
  min-height: 28px;
  align-items: center;
  justify-content: center;
  border-radius: 999px;
  padding: 0 8px;
  background: var(--ranking-rank-bg, #e2e8f0);
  color: var(--ranking-rank-text, #0f172a);
}
.ranking-table__rank-badge.is-top-1 {
  background: var(--ranking-top1-bg, #f59e0b);
}
.ranking-table__rank-badge.is-top-2 {
  background: var(--ranking-top2-bg, #cbd5f5);
}
.ranking-table__rank-badge.is-top-3 {
  background: var(--ranking-top3-bg, #fb923c);
}
.ranking-table__notes {
  margin: 12px 0 0;
  padding-left: 1em;
  text-indent: -1em;
  color: #64748b;
  font-size: 12px;
}
.payment-guide {
  margin-top: 16px;
}
.payment-guide__body {
  margin-top: 8px;
  text-align: center;
  font-size: 14px;
  line-height: 1.7;
  font-weight: 600;
}
.payment-guide__link {
  color: #bf1d20;
  text-decoration: underline;
  font-weight: 700;
}
.payment-guide__alert {
  margin-top: 12px;
  text-align: center;
  font-size: 14px;
  font-weight: 700;
  color: #bf1d20;
  line-height: 1.7;
}
.payment-guide__image {
  margin-top: 12px;
  text-align: center;
}
.payment-guide__image img {
  max-width: 240px;
  width: 100%;
  height: auto;
  display: inline-block;
}
.payment-guide__image--placeholder {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 180px;
  border: 1px dashed #e2e8f0;
  color: #64748b;
  border-radius: 6px;
}
.tabbed-notes {
  margin-top: 16px;
}
.tabbed-notes__wrap {
  display: flex;
  flex-wrap: wrap;
  margin: 0 0 4px;
  border-bottom: 1px solid var(--tab-border, #000000);
}
.tabbed-notes__label {
  color: var(--tab-inactive-text, #000000);
  background: var(--tab-inactive-bg, #dddddd);
  font-size: 16px;
  font-weight: 600;
  white-space: nowrap;
  text-align: center;
  padding: 10px 8px;
  order: -1;
  position: relative;
  z-index: 1;
  cursor: pointer;
  border-radius: 16px 16px 0 0;
  flex: 1;
}
.tabbed-notes__label:not(:last-of-type) {
  border-right: 1px solid var(--tab-border, #000000);
}
.tabbed-notes__label-top {
  display: block;
  font-size: 12px;
  line-height: 1.2;
}
.tabbed-notes__label-bottom {
  display: block;
  line-height: 1.2;
}
.tabbed-notes--sticky .tabbed-notes__wrap {
  border-bottom: none;
  gap: 6px;
}
.tabbed-notes--sticky .tabbed-notes__label {
  border: 1px solid var(--tab-border, #000000);
  border-radius: 10px 10px 4px 4px;
  box-shadow: 0 2px 0 rgba(0, 0, 0, 0.08);
}
.tabbed-notes--sticky .tabbed-notes__label:not(:last-of-type) {
  border-right: none;
}
.tabbed-notes--underline .tabbed-notes__wrap {
  gap: 12px;
  border-bottom: 1px solid var(--tab-border, #000000);
}
.tabbed-notes--underline .tabbed-notes__label {
  background: transparent;
  border-radius: 0;
  padding: 8px 4px;
}
.tabbed-notes--underline .tabbed-notes__label:not(:last-of-type) {
  border-right: none;
}
.tabbed-notes--underline .tabbed-notes__switch:checked + .tabbed-notes__label {
  background: transparent;
  color: var(--tab-active-bg, #000000);
  box-shadow: inset 0 -2px 0 var(--tab-active-bg, #000000);
}
.tabbed-notes--popout .tabbed-notes__wrap {
  gap: 8px;
}
.tabbed-notes--popout .tabbed-notes__label {
  border: 1px solid var(--tab-border, #000000);
  border-bottom: 1px solid var(--tab-border, #000000);
  border-radius: 14px 14px 0 0;
}
.tabbed-notes--popout .tabbed-notes__label:not(:last-of-type) {
  border-right: none;
}
.tabbed-notes--popout .tabbed-notes__switch:checked + .tabbed-notes__label {
  border-bottom-color: var(--tab-content-bg, #ffffff);
  margin-bottom: -1px;
}
.tabbed-notes--popout .tabbed-notes__switch:checked + .tabbed-notes__label::after {
  content: "";
  position: absolute;
  left: 50%;
  bottom: -8px;
  transform: translateX(-50%);
  border-width: 8px 8px 0;
  border-style: solid;
  border-color: var(--tab-active-bg, #000000) transparent transparent;
}
.tabbed-notes__content {
  width: 100%;
  height: 0;
  overflow: hidden;
  opacity: 0;
}
.tabbed-notes__switch:checked + .tabbed-notes__label {
  color: var(--tab-active-text, #ffffff);
  background-color: var(--tab-active-bg, #000000);
}
.tabbed-notes__switch:checked + .tabbed-notes__label + .tabbed-notes__content {
  height: auto;
  overflow: auto;
  opacity: 1;
  transition: 0.5s opacity;
}
.tabbed-notes__switch {
  display: none;
}
.tabbed-notes__panel {
  background-color: var(--tab-content-bg, #ffffff);
  border: 1px solid var(--tab-content-border, #000000);
  border-radius: 0;
  padding: 0 36px 36px;
}
.tabbed-notes__intro {
  margin: 20px 0 0;
  text-align: center;
  font-size: 14px;
}
.tabbed-notes__list {
  list-style: none;
  margin: 18px 0 0;
  padding: 0;
}
.tabbed-notes__item {
  position: relative;
  padding-left: 1em;
  text-indent: -1em;
  font-size: 14px;
  line-height: 1.6;
}
.tabbed-notes__item + .tabbed-notes__item {
  margin-top: 6px;
}
.tabbed-notes__item.is-disc::before {
  content: "・";
}
.tabbed-notes__item.is-accent {
  color: var(--tab-accent, #eb5505);
}
.tabbed-notes__item.is-bold {
  font-weight: 700;
}
.tabbed-notes__sublist {
  margin-top: 6px;
  padding-left: 1em;
  list-style: none;
}
.tabbed-notes__sublist li {
  padding-left: 1em;
  text-indent: -1em;
  font-size: 13px;
  line-height: 1.6;
}
.tabbed-notes__footnote {
  margin-top: 12px;
  font-size: 12px;
  color: #64748b;
}
.tabbed-notes__cta {
  margin-top: 18px;
  text-align: center;
}
.tabbed-notes__cta-text {
  margin: 0 0 8px;
  font-size: 14px;
}
.tabbed-notes__cta-link {
  color: var(--tab-accent, #eb5505);
  text-decoration: underline;
  font-weight: 700;
}
.tabbed-notes__cta-image {
  display: block;
  margin: 12px auto 0;
  max-width: 65%;
}
.tabbed-notes__cta-image img {
  display: block;
  width: 100%;
  height: auto;
}
.tabbed-notes__button {
  margin-top: 16px;
  text-align: center;
}
.tabbed-notes__button-link {
  display: inline-block;
  padding: 10px 24px;
  border-radius: 999px;
  background: var(--tab-active-bg, #000000);
  color: var(--tab-active-text, #ffffff);
  text-decoration: none;
  font-weight: 700;
  font-size: 14px;
}
@media (max-width: 640px) {
  .ranking-table__date {
    font-size: 16px;
  }
  .ranking-table__table th,
  .ranking-table__table td {
    font-size: 12px;
  }
  .payment-guide__body,
  .payment-guide__alert {
    font-size: 12px;
  }
  .tabbed-notes__label {
    font-size: 14px;
  }
  .tabbed-notes__panel {
    padding: 0 20px 24px;
  }
  .tabbed-notes__cta-image {
    max-width: 100%;
  }
}
.footer {
  margin-top: 32px;
  padding: 16px 0;
  background: #f8fafc;
  font-size: 12px;
  color: #64748b;
}
`;

export const buildTargetStoresJs = (): string => `
(function () {
  const config = window.__TARGET_STORES_CONFIG__ || {};
  const state = {
    keyword: "",
    prefecture: "",
    filters: {},
    page: 1,
    pageSize: Number(config.pageSize) || 10,
    data: null,
    columns: [],
    canonicalKeys: null,
    labelKeys: [],
    filterKeys: []
  };

  const elements = {
    keyword: document.getElementById("stores-keyword"),
    prefecture: document.getElementById("stores-prefecture"),
    filterChips: document.getElementById("stores-filter-chips"),
    filterGroups: document.getElementById("stores-filter-groups"),
    count: document.getElementById("stores-count"),
    pager: document.getElementById("stores-pager"),
    cards: document.getElementById("stores-cards"),
    empty: document.getElementById("stores-empty")
  };

  const uniqueValues = (rows, key) => {
    const set = new Set();
    rows.forEach((row) => {
      const value = row.raw[key];
      if (value) {
        set.add(value);
      }
    });
    return Array.from(set);
  };

  const computeConfig = () => {
    const canonicalKeys = state.canonicalKeys;
    const requiredKeys = [
      canonicalKeys.storeNameKey,
      canonicalKeys.postalCodeKey,
      canonicalKeys.addressKey,
      canonicalKeys.prefectureKey
    ];
    const optional = state.columns.filter((col) => !requiredKeys.includes(col));
    state.labelKeys = (config.labelKeys && config.labelKeys.length)
      ? config.labelKeys.filter((key) => state.columns.includes(key))
      : optional.slice(0, 2);
    state.filterKeys = (config.filterKeys && config.filterKeys.length)
      ? config.filterKeys.filter((key) => optional.includes(key))
      : optional;
    state.filterKeys.forEach((key) => {
      if (!state.filters[key]) {
        state.filters[key] = new Set();
      }
    });
  };

  const filterRows = () => {
    if (!state.data) {
      return [];
    }
    return state.data.filter((row) => {
      const keyword = state.keyword.toLowerCase();
      if (keyword) {
        if (
          !row.storeName.toLowerCase().includes(keyword) &&
          !row.address.toLowerCase().includes(keyword) &&
          !row.postalCode.toLowerCase().includes(keyword)
        ) {
          return false;
        }
      }
      if (state.prefecture && row.prefecture !== state.prefecture) {
        return false;
      }
      for (const key of state.filterKeys) {
        const selected = state.filters[key];
        if (selected && selected.size > 0) {
          const value = row.raw[key] || "";
          if (!selected.has(value)) {
            return false;
          }
        }
      }
      return true;
    });
  };

  const renderPrefectureSelect = (rows) => {
    const options = Array.from(new Set(rows.map((row) => row.prefecture))).filter(Boolean);
    options.sort((a, b) => a.localeCompare(b, "ja"));
    elements.prefecture.innerHTML = "<option value=\"\">すべて</option>";
    options.forEach((pref) => {
      const option = document.createElement("option");
      option.value = pref;
      option.textContent = pref;
      elements.prefecture.appendChild(option);
    });
    elements.prefecture.value = state.prefecture;
  };

  const renderFilterGroups = (rows) => {
    elements.filterGroups.innerHTML = "";
    state.filterKeys.forEach((key) => {
      const values = uniqueValues(rows, key).slice(0, 40);
      if (values.length === 0) {
        return;
      }
      const group = document.createElement("div");
      group.className = "filter-group";
      const label = document.createElement("strong");
      label.textContent = key;
      group.appendChild(label);
      values.forEach((value) => {
        const button = document.createElement("button");
        button.type = "button";
        button.className = "filter-toggle";
        if (state.filters[key].has(value)) {
          button.classList.add("active");
        }
        button.textContent = value;
        button.addEventListener("click", () => {
          if (state.filters[key].has(value)) {
            state.filters[key].delete(value);
          } else {
            state.filters[key].add(value);
          }
          state.page = 1;
          render();
        });
        group.appendChild(button);
      });
      elements.filterGroups.appendChild(group);
    });
  };

  const renderFilterChips = () => {
    elements.filterChips.innerHTML = "";
    if (state.prefecture) {
      const chip = document.createElement("span");
      chip.className = "filter-chip";
      chip.textContent = state.prefecture;
      const btn = document.createElement("button");
      btn.type = "button";
      btn.textContent = "x";
      btn.addEventListener("click", () => {
        state.prefecture = "";
        elements.prefecture.value = "";
        state.page = 1;
        render();
      });
      chip.appendChild(btn);
      elements.filterChips.appendChild(chip);
    }
    state.filterKeys.forEach((key) => {
      state.filters[key].forEach((value) => {
        const chip = document.createElement("span");
        chip.className = "filter-chip";
        chip.textContent = key + ": " + value;
        const btn = document.createElement("button");
        btn.type = "button";
        btn.textContent = "x";
        btn.addEventListener("click", () => {
          state.filters[key].delete(value);
          state.page = 1;
          render();
        });
        chip.appendChild(btn);
        elements.filterChips.appendChild(chip);
      });
    });
  };

  const renderPager = (total, totalPages) => {
    elements.pager.innerHTML = "";
    const prev = document.createElement("button");
    prev.type = "button";
    prev.textContent = "前へ";
    prev.disabled = state.page <= 1;
    prev.addEventListener("click", () => {
      state.page = Math.max(1, state.page - 1);
      render();
    });
    const next = document.createElement("button");
    next.type = "button";
    next.textContent = "次へ";
    next.disabled = state.page >= totalPages;
    next.addEventListener("click", () => {
      state.page = Math.min(totalPages, state.page + 1);
      render();
    });
    const indicator = document.createElement("span");
    indicator.textContent = state.page + "/" + totalPages;
    elements.pager.appendChild(prev);
    elements.pager.appendChild(indicator);
    elements.pager.appendChild(next);
    elements.count.textContent = "該当件数: " + total + "件";
  };

  const renderCards = (rows) => {
    elements.cards.innerHTML = "";
    if (rows.length === 0) {
      elements.empty.textContent = "該当する店舗がありません";
      return;
    }
    elements.empty.textContent = "";
    rows.forEach((row) => {
      const card = document.createElement("div");
      card.className = "store-card";
      const badges = document.createElement("div");
      badges.className = "badges";
      const labelValues = [];
      state.labelKeys.forEach((key) => {
        const value = row.raw[key];
        if (value) {
          labelValues.push(value);
        }
      });
      const visible = labelValues.slice(0, 3);
      visible.forEach((value) => {
        const badge = document.createElement("span");
        badge.className = "badge";
        badge.textContent = value;
        badges.appendChild(badge);
      });
      if (labelValues.length > 3) {
        const more = document.createElement("span");
        more.className = "badge";
        more.textContent = "+" + (labelValues.length - 3);
        badges.appendChild(more);
      }
      const title = document.createElement("h3");
      title.textContent = row.storeName || "-";
      const address = document.createElement("p");
      address.textContent = (row.postalCode ? row.postalCode + " " : "") + row.address;
      card.appendChild(badges);
      card.appendChild(title);
      card.appendChild(address);
      elements.cards.appendChild(card);
    });
  };

  const render = () => {
    if (!state.data) {
      return;
    }
    const filtered = filterRows();
    const totalPages = Math.max(1, Math.ceil(filtered.length / state.pageSize));
    if (state.page > totalPages) {
      state.page = totalPages;
    }
    const start = (state.page - 1) * state.pageSize;
    const pageRows = filtered.slice(start, start + state.pageSize);
    renderFilterGroups(state.data);
    renderFilterChips();
    renderPager(filtered.length, totalPages);
    renderCards(pageRows);
  };

  const init = async () => {
    const response = await fetch("stores.json");
    const json = await response.json();
    state.data = json.rows || [];
    state.columns = json.columns || [];
    state.canonicalKeys = json.canonicalKeys;
    computeConfig();
    renderPrefectureSelect(state.data);
    renderFilterGroups(state.data);

    elements.keyword.addEventListener("input", (event) => {
      state.keyword = event.target.value || "";
      state.page = 1;
      render();
    });
    elements.prefecture.addEventListener("change", (event) => {
      state.prefecture = event.target.value || "";
      state.page = 1;
      render();
    });

    render();
  };

  init().catch((error) => {
    elements.empty.textContent = "データの読み込みに失敗しました";
    console.error(error);
  });
})();
`;

export const buildStoresJson = (project: ProjectState): string => {
  const stores = ensureStoresData(project);
  const rows = stores.rows.map((row) => {
    const storeName = str(row[stores.canonical.storeNameKey]).trim();
    const postalCode = str(row[stores.canonical.postalCodeKey]).trim();
    const address = str(row[stores.canonical.addressKey]).trim();
    const prefecture = str(row[stores.canonical.prefectureKey]).trim();
    if (!storeName || !address || !prefecture) {
      throw new Error("Required store fields are missing.");
    }
    return {
      storeName,
      postalCode,
      address,
      prefecture,
      raw: row,
    };
  });

  return JSON.stringify(
    {
      meta: {
        generatedAt: new Date().toISOString(),
        count: rows.length,
      },
      canonicalKeys: { ...stores.canonical },
      columns: stores.columns,
      rows,
    },
    null,
    2
  );
};

export const exportProjectAsZip = async (
  project: ProjectState
): Promise<Blob> => {
  const zip = new JSZip();
  const config = resolveTargetStoresConfig(project);
  const configJson = JSON.stringify(config);

  const indexHtml = buildIndexHtml(project);
  const targetStoresHtml = buildTargetStoresHtml().replace(
    TARGET_STORES_CONFIG_PLACEHOLDER,
    configJson
  );
  const storesJson = buildStoresJson(project);

  zip.file("index.html", indexHtml);
  zip.folder("assets")?.file("main.css", buildMainCss());
  zip.folder("assets")?.file("target-stores.css", buildTargetStoresCss());
  zip.folder("assets")?.file("target-stores.js", buildTargetStoresJs());
  zip.folder("stores")?.file("target-stores.html", targetStoresHtml);
  zip.folder("stores")?.file("stores.json", storesJson);
  zip.folder("assets")?.file("images/.keep", "");

  return zip.generateAsync({ type: "blob" });
};

export const triggerZipDownload = (blob: Blob, filename: string) => {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
};
