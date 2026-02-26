"use client";

import { useMemo, useState } from "react";
import type { ProjectState, SectionContent, StoreCsvData } from "@/src/types/project";

const toText = (value: unknown) =>
  typeof value === "string" ? value : value == null ? "" : String(value);

export type TargetStoresSectionData = {
  id: string;
  content?: Pick<
    SectionContent,
    "items" | "storeCsv" | "storeLabels" | "storeFilters" | "storeFilterOperator"
  >;
};

export type TargetStoresSectionProps = {
  section: TargetStoresSectionData;
  stores?: ProjectState["stores"];
  assets?: ProjectState["assets"];
  displayMode?: "pc" | "sp" | "auto";
  onUpdateTargetStoresFilters?: (
    sectionId: string,
    filters: Record<string, boolean>
  ) => void;
};

const resolveStoreCsv = (
  section: TargetStoresSectionData,
  stores?: ProjectState["stores"],
): StoreCsvData | undefined => {
  const csv = section.content?.storeCsv;
  if (csv?.headers?.length) return csv;
  if (stores?.columns?.length) {
    return {
      headers: stores.columns,
      rows: stores.rows ?? [],
    };
  }
  return undefined;
};

export default function TargetStoresSection({ section, stores }: TargetStoresSectionProps) {
  const csv = useMemo(() => resolveStoreCsv(section, stores), [section, stores]);
  const headers = useMemo(() => csv?.headers ?? [], [csv]);
  const rows = useMemo(() => csv?.rows ?? [], [csv]);

  const storeNameKey = headers[1] ?? "店舗名";
  const postalCodeKey = headers[2] ?? "郵便番号";
  const addressKey = headers[3] ?? "住所";
  const prefectureKey = headers[4] ?? "都道府県";

  const [keyword, setKeyword] = useState("");
  const [prefecture, setPrefecture] = useState("");

  const prefectures = useMemo(() => {
    const set = new Set<string>();
    rows.forEach((row) => {
      const value = toText(row[prefectureKey]).trim();
      if (value) set.add(value);
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b, "ja"));
  }, [rows, prefectureKey]);

  const filtered = useMemo(() => {
    const needle = keyword.trim().toLowerCase();
    return rows.filter((row) => {
      if (needle) {
        const joined = [
          toText(row[storeNameKey]),
          toText(row[addressKey]),
          toText(row[postalCodeKey]),
        ]
          .join(" ")
          .toLowerCase();
        if (!joined.includes(needle)) return false;
      }
      if (prefecture && toText(row[prefectureKey]).trim() !== prefecture) {
        return false;
      }
      return true;
    });
  }, [rows, keyword, prefecture, storeNameKey, addressKey, postalCodeKey, prefectureKey]);

  return (
    <section className="mx-auto mt-3 w-full max-w-5xl space-y-4" data-target-stores="true" data-section-id={section.id}>
      <div className="rounded-2xl border border-orange-300 bg-white p-4 shadow-md md:p-5">
        <div className="mx-auto grid w-full max-w-4xl gap-3 md:grid-cols-[2fr_1fr] md:items-center">
          <label className="text-sm font-medium text-gray-600">
            キーワード
            <input
              className="mt-2 w-full rounded-xl border border-gray-200 px-4 py-3 text-[14px] text-[var(--lp-text)]"
              type="text"
              value={keyword}
              placeholder="店舗名・住所・郵便番号で検索"
              onChange={(event) => setKeyword(event.target.value)}
            />
          </label>
          <label className="text-sm font-medium text-gray-600">
            都道府県
            <select
              className="mt-2 w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-[14px] text-[var(--lp-text)]"
              value={prefecture}
              onChange={(event) => setPrefecture(event.target.value)}
            >
              <option value="">すべて</option>
              {prefectures.map((value) => (
                <option key={value} value={value}>
                  {value}
                </option>
              ))}
            </select>
          </label>
        </div>
        <p className="mt-3 text-sm text-gray-600">該当件数: {filtered.length}件</p>
      </div>

      {filtered.length === 0 ? (
        <div className="rounded-xl border border-dashed border-orange-200 p-5 text-center text-sm text-gray-500">
          該当する店舗がありません
        </div>
      ) : (
        <div className="mt-6 grid gap-6 md:grid-cols-2" data-store-cards>
          {filtered.map((row, index) => (
            <div key={`store-card-${index}`} className="rounded-2xl border border-orange-200 bg-white p-5 shadow-sm">
              <div className="mb-1 text-lg font-bold text-blue-600">{toText(row[storeNameKey])}</div>
              <div className="text-sm text-gray-500">
                〒{toText(row[postalCodeKey])} {toText(row[addressKey])}
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
