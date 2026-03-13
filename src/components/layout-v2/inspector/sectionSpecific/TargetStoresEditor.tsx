"use client";

import { useMemo, useRef, useState } from "react";
import InspectorSection from "@/src/components/inspector/InspectorSection";
import InspectorField from "@/src/components/inspector/InspectorField";
import InspectorInput from "@/src/components/inspector/InspectorInput";
import InspectorTextarea from "@/src/components/inspector/InspectorTextarea";
import InspectorColorInput from "@/src/components/inspector/InspectorColorInput";
import SectionAppearanceEditor from "@/src/components/layout-v2/inspector/sectionSpecific/SectionAppearanceEditor";
import { parseCsv } from "@/src/lib/csv";
import { buildCsvImportPreview, type CsvImportPreview } from "@/src/lib/csv/importSummary";
import { getStableLabelColor } from "@/src/lib/stores/labelColors";
import CsvImportPreviewModal from "@/src/components/editor/right/section/CsvImportPreviewModal";
import type { SectionBase, StoreFilters, StoreLabels } from "@/src/types/project";

type CsvDraft = {
  sectionId: string;
  fileName: string;
  preview: CsvImportPreview;
  canImport: boolean;
  storeCsv: {
    headers: string[];
    rows: Record<string, string>[];
    importedAt: string;
    stats: {
      totalRows: number;
      duplicateCount: number;
      duplicateIds: string[];
    };
  };
  storeLabels: StoreLabels;
  storeFilters: StoreFilters;
};

type TargetStoresEditorProps = {
  section: SectionBase;
  disabled: boolean;
  onPatchData: (patch: Record<string, unknown>) => void;
  onPatchTargetStores: (patch: {
    storeCsv?: {
      headers: string[];
      rows: Record<string, string>[];
      importedAt?: string;
      stats?: {
        totalRows: number;
        duplicateCount?: number;
        duplicateIds?: string[];
      };
    };
    storeLabels?: StoreLabels;
    storeFilters?: StoreFilters;
    storeFilterOperator?: "AND" | "OR";
  }) => void;
  onRenameSection: (name: string) => void;
};

const EMPTY_STORE_LABELS: StoreLabels = {};

const TRUTHY_TOKENS = new Set(["対象", "〇", "○", "はい", "yes", "y", "true", "1", "on"]);
const isTruthyStoreFlag = (value: string) => {
  const normalized = value.normalize("NFKC").trim().toLowerCase();
  if (!normalized) return false;
  return TRUTHY_TOKENS.has(normalized);
};

const CARD_PRESETS = {
  standard: {
    cardVariant: "outlined",
    cardBg: "#ffffff",
    titleBandColor: "#ffffff",
    titleTextColor: "#1d4ed8",
    cardBorderColor: "#d1d5db",
    cardRadius: 12,
    cardShadow: "none",
  },
  elevated: {
    cardVariant: "elevated",
    cardBg: "#ffffff",
    titleBandColor: "#eb5505",
    titleTextColor: "#ffffff",
    cardBorderColor: "#e2e8f0",
    cardRadius: 12,
    cardShadow: "0 8px 18px rgba(15, 23, 42, 0.12)",
  },
  minimal: {
    cardVariant: "flat",
    cardBg: "#ffffff",
    titleBandColor: "#ffffff",
    titleTextColor: "#0f172a",
    cardBorderColor: "#e5e7eb",
    cardRadius: 0,
    cardShadow: "none",
  },
} as const;

type DisplayVariant = "searchCards" | "cardsOnly" | "simpleList";

const normalizeDisplayVariant = (value: unknown): DisplayVariant => {
  const next = String(value ?? "searchCards");
  if (next === "cardsOnly" || next === "simpleList") {
    return next;
  }
  return "searchCards";
};

const formatImportedAt = (value: string): string => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "-";
  }
  return date.toISOString().replace("T", " ").slice(0, 19);
};

export default function TargetStoresEditor({
  section,
  disabled,
  onPatchData,
  onPatchTargetStores,
  onRenameSection,
}: TargetStoresEditorProps) {
  const csvInputRef = useRef<HTMLInputElement | null>(null);
  const [csvError, setCsvError] = useState<string | null>(null);
  const [draft, setDraft] = useState<CsvDraft | null>(null);
  const [open, setOpen] = useState(false);

  const data = section.data as Record<string, unknown>;
  const storeCsv = section.content?.storeCsv;
  const storeLabels = (section.content?.storeLabels ?? EMPTY_STORE_LABELS) as StoreLabels;

  const importedRows = storeCsv?.stats?.totalRows ?? storeCsv?.rows?.length ?? 0;
  const importedAt = typeof storeCsv?.importedAt === "string" ? storeCsv.importedAt : "";
  const displayVariant = normalizeDisplayVariant(data.variant);
  const csvStatus = csvError
    ? "エラー"
    : draft
    ? "確認待ち"
    : importedRows > 0
    ? "取込済み"
    : "未取込";

  const parseStoresCsv = async (file: File) => {
    if (section.locked) {
      setCsvError("ロック中のセクションは更新できません。");
      return;
    }
    const text = await file.text();
    const parsed = parseCsv(text);
    const headers = parsed.headers.map((header) => header.trim()).filter(Boolean);
    if (headers.length === 0) {
      setCsvError("CSVヘッダーが見つかりません。");
      return;
    }

    const requiredHeaders = ["店舗ID", "店舗名", "郵便番号", "住所", "都道府県"];
    const extra = headers.slice(requiredHeaders.length);
    const rows = parsed.rows.map((row) => {
      const record: Record<string, string> = {};
      headers.forEach((header, index) => {
        record[header] = row[index] ?? "";
      });
      return record;
    });

    const nextLabels: StoreLabels = {};
    extra.forEach((column) => {
      const existing = storeLabels[column];
      nextLabels[column] = {
        columnKey: column,
        displayName:
          typeof existing?.displayName === "string" && existing.displayName.trim()
            ? existing.displayName
            : column,
        color:
          typeof existing?.color === "string" && existing.color.trim()
            ? existing.color
            : getStableLabelColor(column),
        trueText:
          typeof existing?.trueText === "string" && existing.trueText.trim()
            ? existing.trueText
            : "ON",
        falseText:
          typeof existing?.falseText === "string" && existing.falseText.trim()
            ? existing.falseText
            : "OFF",
        valueDisplay: existing?.valueDisplay === "raw" ? "raw" : "toggle",
        showAsFilter: typeof existing?.showAsFilter === "boolean" ? existing.showAsFilter : true,
        showAsBadge: typeof existing?.showAsBadge === "boolean" ? existing.showAsBadge : true,
      };
    });

    const nextFilters: StoreFilters = {};
    extra.forEach((column) => {
      nextFilters[column] = false;
    });

    const preview = buildCsvImportPreview({
      headers,
      rows,
      requiredHeaders,
      previewSize: 20,
      previewHeaders: ["店舗ID", "店舗名", "郵便番号", "都道府県", "住所", ...extra],
      isTruthy: isTruthyStoreFlag,
    });

    const canImport =
      preview.summary.missingRequiredHeaders.length === 0 &&
      preview.summary.headerOrderValid &&
      preview.summary.validRows > 0;

    setDraft({
      sectionId: section.id,
      fileName: file.name,
      preview,
      canImport,
      storeCsv: {
        headers,
        rows,
        importedAt: new Date().toISOString(),
        stats: {
          totalRows: rows.length,
          duplicateCount: preview.summary.duplicateIdCount,
          duplicateIds: preview.duplicates.map((entry) => entry.storeId),
        },
      },
      storeLabels: nextLabels,
      storeFilters: nextFilters,
    });
    setCsvError(null);
    setOpen(true);
  };

  const detailSummary = useMemo(() => {
    const parts: string[] = [];
    const placeholder = String(data.searchPlaceholder ?? "").trim();
    if (placeholder) {
      parts.push("検索文言");
    }
    const emptyMessage = String(data.emptyMessage ?? "").trim();
    if (emptyMessage) {
      parts.push("空文言");
    }
    const hasPagerText =
      String(data.pagerPrevLabel ?? "").trim() || String(data.pagerNextLabel ?? "").trim();
    if (hasPagerText) {
      parts.push("ページャ文言");
    }
    if (data.showRegionFilter === false) {
      parts.push("都道府県フィルタOFF");
    }
    return parts.length > 0 ? `${parts.length}項目設定済み` : "未設定";
  }, [
    data.emptyMessage,
    data.pagerNextLabel,
    data.pagerPrevLabel,
    data.searchPlaceholder,
    data.showRegionFilter,
  ]);

  return (
    <div className="border-t border-[var(--ui-border)]/60">
      <InspectorSection title="1. 基本">
        <InspectorField label="セクション名">
          <InspectorInput
            type="text"
            value={String(section.name ?? "")}
            onChange={(event) => onRenameSection(event.target.value)}
            disabled={disabled}
          />
        </InspectorField>
        <InspectorField label="見出し">
          <InspectorInput
            type="text"
            value={String(data.title ?? "対象店舗")}
            onChange={(event) => onPatchData({ title: event.target.value })}
            disabled={disabled}
          />
        </InspectorField>
        <InspectorField label="説明文">
          <InspectorInput
            type="text"
            value={String(data.description ?? "条件を指定して対象店舗を検索できます。")}
            onChange={(event) => onPatchData({ description: event.target.value })}
            disabled={disabled}
          />
        </InspectorField>
        <InspectorField label="注意文言（改行可）">
          <InspectorTextarea
            rows={3}
            value={String(
              data.note ??
                "ご注意ください！\nリストに記載があっても、店舗の休業・閉業・移転や、その他の事情により利用できない場合があります。"
            )}
            onChange={(event) => onPatchData({ note: event.target.value })}
            disabled={disabled}
          />
        </InspectorField>
      </InspectorSection>

      <InspectorSection title="2. CSVデータ">
        <input
          ref={csvInputRef}
          type="file"
          accept=".csv,text/csv"
          className="hidden"
          onChange={async (event) => {
            const file = event.target.files?.[0];
            if (!file) return;
            try {
              await parseStoresCsv(file);
            } catch {
              setCsvError("CSVの解析に失敗しました。");
            }
            event.target.value = "";
          }}
        />

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            className="ui-button h-7 px-2 text-[11px]"
            onClick={() => csvInputRef.current?.click()}
            disabled={disabled}
          >
            CSVファイル選択
          </button>
          <button
            type="button"
            className="ui-button h-7 px-2 text-[11px]"
            onClick={() => setOpen(true)}
            disabled={disabled || !draft}
          >
            CSV確認画面を開く
          </button>
          <button
            type="button"
            className="ui-button h-7 px-2 text-[11px]"
            onClick={() => csvInputRef.current?.click()}
            disabled={disabled}
          >
            再取込
          </button>
        </div>

        <div className="grid grid-cols-2 gap-2 text-[11px]">
          <div className="rounded border border-[var(--ui-border)]/60 px-2 py-1">
            <div className="text-[var(--ui-muted)]">取込件数</div>
            <div className="font-semibold text-[var(--ui-text)]">{importedRows}件</div>
          </div>
          <div className="rounded border border-[var(--ui-border)]/60 px-2 py-1">
            <div className="text-[var(--ui-muted)]">最終更新</div>
            <div className="font-semibold text-[var(--ui-text)]">
              {importedAt ? formatImportedAt(importedAt) : "-"}
            </div>
          </div>
          <div className="col-span-2 rounded border border-[var(--ui-border)]/60 px-2 py-1">
            <div className="text-[var(--ui-muted)]">読み込みステータス</div>
            <div className="font-semibold text-[var(--ui-text)]">{csvStatus}</div>
          </div>
        </div>

        {csvError ? <div className="text-[11px] text-rose-600">{csvError}</div> : null}
      </InspectorSection>

      <InspectorSection title="3. 表示設定">
        <InspectorField label="表示形式">
          <select
            className="ui-input h-7 w-full text-[11px]"
            value={displayVariant}
            onChange={(event) => {
              const next = normalizeDisplayVariant(event.target.value);
              if (next === "searchCards") {
                onPatchData({
                  variant: next,
                  showSearchBox: true,
                  showRegionFilter: true,
                  showLabelFilters: true,
                  showResultCount: true,
                  showPager: true,
                });
                return;
              }
              if (next === "cardsOnly") {
                onPatchData({
                  variant: next,
                  showSearchBox: false,
                  showRegionFilter: false,
                  showLabelFilters: false,
                  showResultCount: true,
                  showPager: true,
                });
                return;
              }
              onPatchData({
                variant: next,
                cardVariant: "flat",
                showSearchBox: false,
                showRegionFilter: false,
                showLabelFilters: false,
                showResultCount: true,
                showPager: false,
              });
            }}
            disabled={disabled}
          >
            <option value="searchCards">検索付き一覧</option>
            <option value="cardsOnly">店舗カード</option>
            <option value="simpleList">簡易一覧</option>
          </select>
        </InspectorField>

        <div className="grid grid-cols-2 gap-2 text-[11px]">
          <label className="flex items-center justify-between rounded border border-[var(--ui-border)]/60 px-2 py-1">
            <span>検索表示</span>
            <input
              type="checkbox"
              checked={data.showSearchBox !== false}
              onChange={(event) => onPatchData({ showSearchBox: event.target.checked })}
              disabled={disabled}
            />
          </label>
          <label className="flex items-center justify-between rounded border border-[var(--ui-border)]/60 px-2 py-1">
            <span>都道府県フィルタ</span>
            <input
              type="checkbox"
              checked={data.showRegionFilter !== false}
              onChange={(event) => onPatchData({ showRegionFilter: event.target.checked })}
              disabled={disabled}
            />
          </label>
          <label className="flex items-center justify-between rounded border border-[var(--ui-border)]/60 px-2 py-1">
            <span>フィルタ表示</span>
            <input
              type="checkbox"
              checked={data.showLabelFilters !== false}
              onChange={(event) => onPatchData({ showLabelFilters: event.target.checked })}
              disabled={disabled}
            />
          </label>
          <label className="flex items-center justify-between rounded border border-[var(--ui-border)]/60 px-2 py-1">
            <span>件数表示</span>
            <input
              type="checkbox"
              checked={data.showResultCount !== false}
              onChange={(event) => onPatchData({ showResultCount: event.target.checked })}
              disabled={disabled}
            />
          </label>
          <label className="flex items-center justify-between rounded border border-[var(--ui-border)]/60 px-2 py-1">
            <span>ページャ表示</span>
            <input
              type="checkbox"
              checked={data.showPager !== false}
              onChange={(event) => onPatchData({ showPager: event.target.checked })}
              disabled={disabled}
            />
          </label>
        </div>

        <InspectorField label="1ページ件数">
          <InspectorInput
            type="number"
            value={String(data.pageSize ?? 10)}
            onChange={(event) => {
              const value = Number(event.target.value);
              onPatchData({ pageSize: Number.isFinite(value) && value > 0 ? value : 10 });
            }}
            disabled={disabled}
          />
        </InspectorField>
      </InspectorSection>

      <InspectorSection title="4. カードデザイン">
        <InspectorField label="preset">
          <select
            className="ui-input h-7 w-full text-[11px]"
            value={String(data.cardPreset ?? "standard")}
            onChange={(event) => {
              const presetKey =
                event.target.value === "elevated" || event.target.value === "minimal"
                  ? event.target.value
                  : "standard";
              const preset = CARD_PRESETS[presetKey];
              onPatchData({
                cardPreset: presetKey,
                cardVariant: preset.cardVariant,
                cardBg: preset.cardBg,
                titleBandColor: preset.titleBandColor,
                titleTextColor: preset.titleTextColor,
                cardBorderColor: preset.cardBorderColor,
                cardRadius: preset.cardRadius,
                cardShadow: preset.cardShadow,
              });
            }}
            disabled={disabled}
          >
            <option value="standard">standard</option>
            <option value="elevated">elevated</option>
            <option value="minimal">minimal</option>
          </select>
        </InspectorField>

        <InspectorField label="タイトル帯色">
          <div className="flex items-center gap-2">
            <InspectorColorInput
              value={String(data.titleBandColor ?? "#f8fafc")}
              onChange={(event) => onPatchData({ titleBandColor: event.target.value })}
              disabled={disabled}
            />
            <InspectorInput
              type="text"
              value={String(data.titleBandColor ?? "#f8fafc")}
              onChange={(event) => onPatchData({ titleBandColor: event.target.value })}
              disabled={disabled}
            />
          </div>
        </InspectorField>

        <InspectorField label="背景色">
          <div className="flex items-center gap-2">
            <InspectorColorInput
              value={String(data.cardBg ?? "#ffffff")}
              onChange={(event) => onPatchData({ cardBg: event.target.value })}
              disabled={disabled}
            />
            <InspectorInput
              type="text"
              value={String(data.cardBg ?? "#ffffff")}
              onChange={(event) => onPatchData({ cardBg: event.target.value })}
              disabled={disabled}
            />
          </div>
        </InspectorField>

        <InspectorField label="タイトル文字色">
          <div className="flex items-center gap-2">
            <InspectorColorInput
              value={String(data.titleTextColor ?? "#0f172a")}
              onChange={(event) => onPatchData({ titleTextColor: event.target.value })}
              disabled={disabled}
            />
            <InspectorInput
              type="text"
              value={String(data.titleTextColor ?? "#0f172a")}
              onChange={(event) => onPatchData({ titleTextColor: event.target.value })}
              disabled={disabled}
            />
          </div>
        </InspectorField>

        <InspectorField label="枠線色">
          <div className="flex items-center gap-2">
            <InspectorColorInput
              value={String(data.cardBorderColor ?? "#d1d5db")}
              onChange={(event) => onPatchData({ cardBorderColor: event.target.value })}
              disabled={disabled}
            />
            <InspectorInput
              type="text"
              value={String(data.cardBorderColor ?? "#d1d5db")}
              onChange={(event) => onPatchData({ cardBorderColor: event.target.value })}
              disabled={disabled}
            />
          </div>
        </InspectorField>

        <InspectorField label="角丸">
          <InspectorInput
            type="number"
            value={String(data.cardRadius ?? 10)}
            onChange={(event) => {
              const value = Number(event.target.value);
              onPatchData({ cardRadius: Number.isFinite(value) ? value : 10 });
            }}
            disabled={disabled}
          />
        </InspectorField>

        <InspectorField label="影">
          <InspectorInput
            type="text"
            value={String(data.cardShadow ?? "none")}
            onChange={(event) => onPatchData({ cardShadow: event.target.value })}
            disabled={disabled}
          />
        </InspectorField>
      </InspectorSection>

      <InspectorSection title="5. 詳細設定" defaultOpen={false} summary={detailSummary}>
        <InspectorField label="プレースホルダ">
          <InspectorInput
            type="text"
            value={String(data.searchPlaceholder ?? "店舗名・住所など")}
            onChange={(event) => onPatchData({ searchPlaceholder: event.target.value })}
            disabled={disabled}
          />
        </InspectorField>
        <InspectorField label="空データ文言">
          <InspectorInput
            type="text"
            value={String(data.emptyMessage ?? "条件に一致する対象店舗が見つかりませんでした。")}
            onChange={(event) => onPatchData({ emptyMessage: event.target.value })}
            disabled={disabled}
          />
        </InspectorField>
        <InspectorField label="前へ文言">
          <InspectorInput
            type="text"
            value={String(data.pagerPrevLabel ?? "前へ")}
            onChange={(event) => onPatchData({ pagerPrevLabel: event.target.value })}
            disabled={disabled}
          />
        </InspectorField>
        <InspectorField label="次へ文言">
          <InspectorInput
            type="text"
            value={String(data.pagerNextLabel ?? "次へ")}
            onChange={(event) => onPatchData({ pagerNextLabel: event.target.value })}
            disabled={disabled}
          />
        </InspectorField>
        <InspectorField label="フィルタ見出し">
          <InspectorInput
            type="text"
            value={String(data.filterHeading ?? "絞り込み")}
            onChange={(event) => onPatchData({ filterHeading: event.target.value })}
            disabled={disabled}
          />
        </InspectorField>
        <InspectorField label="件数ラベル">
          <InspectorInput
            type="text"
            value={String(data.resultCountLabel ?? "表示件数")}
            onChange={(event) => onPatchData({ resultCountLabel: event.target.value })}
            disabled={disabled}
          />
        </InspectorField>
        <InspectorField label="戻る文言">
          <InspectorInput
            type="text"
            value={String(data.returnLabel ?? "")}
            onChange={(event) => onPatchData({ returnLabel: event.target.value })}
            disabled={disabled}
          />
        </InspectorField>
        <InspectorField label="戻るURL">
          <InspectorInput
            type="text"
            value={String(data.returnUrl ?? "")}
            onChange={(event) => onPatchData({ returnUrl: event.target.value })}
            disabled={disabled}
          />
        </InspectorField>
      </InspectorSection>

      <SectionAppearanceEditor
        section={section}
        disabled={disabled}
        onPatchData={onPatchData}
        syncTargetStoresLegacyFields
      />

      <CsvImportPreviewModal
        isOpen={open && Boolean(draft)}
        fileName={draft?.fileName ?? ""}
        preview={
          draft?.preview ?? {
            summary: {
              totalRows: 0,
              validRows: 0,
              invalidRows: 0,
              duplicateIdCount: 0,
              duplicateRowCount: 0,
              missingRequiredHeaders: [],
              headerOrderValid: true,
            },
            labelStats: [],
            duplicates: [],
            previewHeaders: [],
            previewRows: [],
            invalidRowIndices: [],
          }
        }
        canImport={Boolean(draft?.canImport)}
        onCancel={() => {
          setOpen(false);
        }}
        onConfirm={() => {
          if (!draft || !draft.canImport || draft.sectionId !== section.id) {
            return;
          }
          onPatchTargetStores({
            storeCsv: draft.storeCsv,
            storeLabels: draft.storeLabels,
            storeFilters: draft.storeFilters,
          });
          onPatchData({
            csvStatus: "imported",
            csvLastFileName: draft.fileName,
          });
          setOpen(false);
          setDraft(null);
        }}
      />
    </div>
  );
}
