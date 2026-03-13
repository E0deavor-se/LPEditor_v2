"use client";

import { useRef, useState } from "react";
import InspectorSection from "@/src/components/inspector/InspectorSection";
import InspectorField from "@/src/components/inspector/InspectorField";
import InspectorInput from "@/src/components/inspector/InspectorInput";
import { parseCsv } from "@/src/lib/csv";
import { buildCsvImportPreview, type CsvImportPreview } from "@/src/lib/csv/importSummary";
import CsvImportPreviewModal from "@/src/components/editor/right/section/CsvImportPreviewModal";
import type { SectionBase } from "@/src/types/project";

type ExcludedListEditorProps = {
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
  }) => void;
};

type CsvDraft = {
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
};

const isTruthy = (value: string) => value.trim().length > 0;

export default function ExcludedListEditor({
  section,
  disabled,
  onPatchData,
  onPatchTargetStores,
}: ExcludedListEditorProps) {
  const csvRef = useRef<HTMLInputElement | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<CsvDraft | null>(null);
  const data = section.data as Record<string, unknown>;

  const parseExcludedCsv = async (file: File) => {
    const text = await file.text();
    const parsed = parseCsv(text);
    const headers = parsed.headers.map((h) => h.trim()).filter(Boolean);
    if (headers.length === 0) {
      setError("CSVヘッダーが見つかりません。");
      return;
    }
    const requiredHeaders = ["店舗ID", "店舗名", "郵便番号", "住所", "都道府県"];
    const rows = parsed.rows.map((row) => {
      const record: Record<string, string> = {};
      headers.forEach((header, index) => {
        record[header] = row[index] ?? "";
      });
      return record;
    });

    const preview = buildCsvImportPreview({
      headers,
      rows,
      requiredHeaders,
      previewSize: 20,
      previewHeaders: headers,
      isTruthy,
    });

    const canImport =
      preview.summary.missingRequiredHeaders.length === 0 &&
      preview.summary.headerOrderValid &&
      preview.summary.validRows > 0;

    setDraft({
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
          duplicateIds: preview.duplicates.map((d) => d.storeId),
        },
      },
    });
    setOpen(true);
    setError(null);
  };

  return (
    <div className="border-t border-[var(--ui-border)]/60">
      <InspectorSection title="一覧設定">
        <InspectorField label="タイトル">
          <InspectorInput
            type="text"
            value={String(data.title ?? "")}
            onChange={(event) => onPatchData({ title: event.target.value })}
            disabled={disabled}
          />
        </InspectorField>
        <InspectorField label="強調ラベル">
          <InspectorInput
            type="text"
            value={String(data.highlightLabel ?? "対象外")}
            onChange={(event) => onPatchData({ highlightLabel: event.target.value })}
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
        <InspectorField label="戻る文言">
          <InspectorInput
            type="text"
            value={String(data.returnLabel ?? "")}
            onChange={(event) => onPatchData({ returnLabel: event.target.value })}
            disabled={disabled}
          />
        </InspectorField>
      </InspectorSection>

      <InspectorSection title="CSV">
        <input
          ref={csvRef}
          type="file"
          accept=".csv,text/csv"
          className="hidden"
          onChange={async (event) => {
            const file = event.target.files?.[0];
            if (!file) return;
            try {
              await parseExcludedCsv(file);
            } catch {
              setError("CSVの解析に失敗しました。");
            }
            event.target.value = "";
          }}
        />
        <button
          type="button"
          className="ui-button h-7 px-2 text-[11px]"
          onClick={() => csvRef.current?.click()}
          disabled={disabled}
        >
          CSVを選択
        </button>
        {error ? <div className="text-[11px] text-rose-600">{error}</div> : null}
      </InspectorSection>

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
          setDraft(null);
        }}
        onConfirm={() => {
          if (!draft || !draft.canImport) {
            return;
          }
          onPatchTargetStores({ storeCsv: draft.storeCsv });
          setOpen(false);
          setDraft(null);
        }}
      />
    </div>
  );
}
