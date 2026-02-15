import { useEffect, useMemo, useRef, useState } from "react";
import type { CsvImportPreview } from "@/src/lib/csv/importSummary";

type CsvImportPreviewModalProps = {
  isOpen: boolean;
  fileName: string;
  preview: CsvImportPreview;
  canImport: boolean;
  onCancel: () => void;
  onConfirm: () => void;
};

export default function CsvImportPreviewModal({
  isOpen,
  fileName,
  preview,
  canImport,
  onCancel,
  onConfirm,
}: CsvImportPreviewModalProps) {
  const modalRef = useRef<HTMLDivElement | null>(null);
  const closeButtonRef = useRef<HTMLButtonElement | null>(null);

  const summary = preview.summary;
  const hasRequiredWarnings =
    summary.missingRequiredHeaders.length > 0 || !summary.headerOrderValid;
  const hasDuplicates = summary.duplicateIdCount > 0;
  const duplicateIds = preview.duplicates.map((entry) => entry.storeId);
  const [showAllLabels, setShowAllLabels] = useState(false);
  const labelStats = useMemo(() => {
    const sorted = [...preview.labelStats].sort(
      (left, right) => right.truthyCount - left.truthyCount
    );
    if (showAllLabels) {
      return sorted;
    }
    return sorted.slice(0, 6);
  }, [preview.labelStats, showAllLabels]);

  const handleCopyDuplicates = async () => {
    if (duplicateIds.length === 0) {
      return;
    }
    try {
      await navigator.clipboard.writeText(duplicateIds.join("\n"));
    } catch {
      // ignore
    }
  };

  const handleDownloadDuplicates = () => {
    if (duplicateIds.length === 0) {
      return;
    }
    const content = "店舗ID\n" + duplicateIds.join("\n");
    const blob = new Blob([content], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "duplicate-store-ids.csv";
    link.click();
    URL.revokeObjectURL(url);
  };

  useEffect(() => {
    if (!isOpen) {
      return;
    }
    closeButtonRef.current?.focus();
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onCancel();
        return;
      }
      if (event.key !== "Tab") {
        return;
      }
      const focusable = modalRef.current?.querySelectorAll<HTMLElement>(
        "button, [href], input, select, textarea, [tabindex]:not([tabindex='-1'])"
      );
      if (!focusable || focusable.length === 0) {
        return;
      }
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey) {
        if (document.activeElement === first) {
          event.preventDefault();
          last.focus();
        }
      } else if (document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onCancel]);

  if (!isOpen) {
    return null;
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onClick={(event) => {
        if (event.target === event.currentTarget) {
          onCancel();
        }
      }}
    >
      <div
        ref={modalRef}
        role="dialog"
        aria-modal="true"
        className="flex max-h-[90vh] w-full max-w-[900px] flex-col overflow-hidden rounded-2xl border border-[var(--ui-border)] bg-[var(--ui-panel)] shadow-md"
      >
        <div className="flex items-center justify-between gap-3 border-b border-[var(--ui-border)]/60 px-5 py-4">
          <div>
            <div className="text-sm font-semibold text-[var(--ui-text)]">
              CSVインポート確認
            </div>
            <div className="text-[11px] text-[var(--ui-muted)]">{fileName}</div>
          </div>
          <button
            type="button"
            className="text-[12px] text-[var(--ui-muted)]"
            onClick={onCancel}
            ref={closeButtonRef}
          >
            閉じる
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-5 py-4">
          {hasRequiredWarnings ? (
            <div className="rounded-xl border border-amber-200 bg-amber-50/60 px-4 py-3 text-[12px] text-amber-900">
              <div className="font-semibold">必須列の警告</div>
              {!summary.headerOrderValid ? (
                <div className="mt-1">
                  先頭5列は「店舗ID / 店舗名 / 郵便番号 / 住所 / 都道府県」の順である必要があります。
                </div>
              ) : null}
              {summary.missingRequiredHeaders.length > 0 ? (
                <div className="mt-1">
                  不足している列: {summary.missingRequiredHeaders.join(" / ")}
                </div>
              ) : null}
            </div>
          ) : null}

          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <div className="rounded-xl border border-[var(--ui-border)]/60 bg-[var(--ui-panel-muted)]/40 p-3">
              <div className="text-[11px] text-[var(--ui-muted)]">総行数</div>
              <div className="text-sm font-semibold text-[var(--ui-text)]">
                {summary.totalRows}件
              </div>
            </div>
            <div className="rounded-xl border border-[var(--ui-border)]/60 bg-[var(--ui-panel-muted)]/40 p-3">
              <div className="text-[11px] text-[var(--ui-muted)]">有効行数</div>
              <div className="text-sm font-semibold text-[var(--ui-text)]">
                {summary.validRows}件
              </div>
            </div>
            <div className="rounded-xl border border-[var(--ui-border)]/60 bg-[var(--ui-panel-muted)]/40 p-3">
              <div className="text-[11px] text-[var(--ui-muted)]">無効行数</div>
              <div className="text-sm font-semibold text-[var(--ui-text)]">
                {summary.invalidRows}件
              </div>
            </div>
            <div className="rounded-xl border border-[var(--ui-border)]/60 bg-[var(--ui-panel-muted)]/40 p-3">
              <div className="text-[11px] text-[var(--ui-muted)]">
                重複店舗ID
              </div>
              <div className="text-sm font-semibold text-[var(--ui-text)]">
                {summary.duplicateIdCount}件
              </div>
              <div className="text-[11px] text-[var(--ui-muted)]">
                重複行 {summary.duplicateRowCount}件
              </div>
              {duplicateIds.length > 0 ? (
                <div className="mt-1 text-[10px] text-[var(--ui-muted)]">
                  {duplicateIds.slice(0, 50).join(", ")}
                  {duplicateIds.length > 50 ? " ほか" : ""}
                </div>
              ) : null}
            </div>
          </div>

          <div className="mt-5">
            <div className="text-[12px] font-semibold text-[var(--ui-text)]">
              ラベル別カウント
            </div>
            {preview.labelStats.length === 0 ? (
              <div className="mt-2 text-[11px] text-[var(--ui-muted)]">
                自由列がありません。
              </div>
            ) : (
              <>
                <div className="mt-2 grid gap-2 sm:grid-cols-2">
                  {labelStats.map((stat) => (
                  <details
                    key={stat.column}
                    className="rounded-xl border border-[var(--ui-border)]/60 bg-[var(--ui-panel-muted)]/30 p-3"
                  >
                    <summary className="cursor-pointer text-[12px] font-medium text-[var(--ui-text)]">
                      {stat.column} / TRUE {stat.truthyCount}件
                    </summary>
                    <div className="mt-2 text-[11px] text-[var(--ui-muted)]">
                      空/false {stat.falseyCount}件 / 合計 {stat.totalCount}件
                    </div>
                  </details>
                  ))}
                </div>
                {preview.labelStats.length > 6 ? (
                  <button
                    type="button"
                    className="mt-2 text-[11px] text-[var(--ui-muted)] underline"
                    onClick={() => setShowAllLabels((current) => !current)}
                  >
                    {showAllLabels ? "上位のみ表示" : "すべて表示"}
                  </button>
                ) : null}
              </>
            )}
          </div>

          <div className="mt-5">
            <div className="text-[12px] font-semibold text-[var(--ui-text)]">
              重複店舗ID
            </div>
            {preview.duplicates.length === 0 ? (
              <div className="mt-2 text-[11px] text-[var(--ui-muted)]">
                重複はありません。
              </div>
            ) : (
              <>
                <div className="mt-2 flex flex-wrap items-center gap-2 text-[11px] text-[var(--ui-muted)]">
                  <span>重複ID: {duplicateIds.length}件</span>
                  <button
                    type="button"
                    className="underline"
                    onClick={handleCopyDuplicates}
                  >
                    コピー
                  </button>
                  <button
                    type="button"
                    className="underline"
                    onClick={handleDownloadDuplicates}
                  >
                    CSVダウンロード
                  </button>
                </div>
                <div className="mt-2 overflow-x-auto rounded-xl border border-[var(--ui-border)]/60">
                  <table className="min-w-full text-[11px]">
                    <thead className="bg-[var(--ui-panel-muted)]/60">
                      <tr>
                        <th className="px-3 py-2 text-left font-medium text-[var(--ui-text)]">
                          店舗ID
                        </th>
                        <th className="px-3 py-2 text-left font-medium text-[var(--ui-text)]">
                          件数
                        </th>
                        <th className="px-3 py-2 text-left font-medium text-[var(--ui-text)]">
                          代表店舗名
                        </th>
                        <th className="px-3 py-2 text-left font-medium text-[var(--ui-text)]">
                          代表住所
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {preview.duplicates.map((entry) => (
                        <tr key={entry.storeId}>
                          <td className="border-t border-[var(--ui-border)]/60 px-3 py-2">
                            {entry.storeId}
                          </td>
                          <td className="border-t border-[var(--ui-border)]/60 px-3 py-2">
                            {entry.count}
                          </td>
                          <td className="border-t border-[var(--ui-border)]/60 px-3 py-2">
                            {entry.sampleName}
                          </td>
                          <td className="border-t border-[var(--ui-border)]/60 px-3 py-2">
                            {entry.sampleAddress}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </div>

          <div className="mt-5">
            <div className="text-[12px] font-semibold text-[var(--ui-text)]">
              CSVプレビュー（先頭{preview.previewRows.length}行）
            </div>
            <div className="mt-2 overflow-x-auto rounded-xl border border-[var(--ui-border)]/60">
              <table className="min-w-full text-[11px]">
                <thead className="bg-[var(--ui-panel-muted)]/60">
                  <tr>
                    {preview.previewHeaders.map((header, colIndex) => (
                      <th
                        key={`preview-head-${colIndex}`}
                        className="whitespace-nowrap px-3 py-2 text-left font-medium text-[var(--ui-text)]"
                      >
                        {header}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {preview.previewRows.map((row, rowIndex) => {
                    const isInvalid = preview.invalidRowIndices.includes(rowIndex);
                    return (
                      <tr
                        key={`csv-preview-${rowIndex}`}
                        className={isInvalid ? "bg-amber-50/60" : ""}
                      >
                        {row.map((cell, colIndex) => (
                          <td
                            key={`preview-cell-${rowIndex}-${colIndex}`}
                            className="max-w-[180px] whitespace-nowrap truncate border-t border-[var(--ui-border)]/60 px-3 py-2 text-[var(--ui-text)]"
                          >
                            {cell}
                          </td>
                        ))}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
        <div className="border-t border-[var(--ui-border)]/60 px-5 py-4">
          {hasDuplicates ? (
            <div className="mb-3 rounded-lg border border-amber-200 bg-amber-50/60 px-3 py-2 text-[11px] text-amber-900">
              重複店舗IDがあります。インポートは可能ですが、確認してください。
            </div>
          ) : null}
          <div className="flex items-center justify-between gap-2">
            <button
              type="button"
              className="ui-button h-9 px-4 text-[12px]"
              onClick={onCancel}
            >
              キャンセル
            </button>
            <button
              type="button"
              className="ui-button h-9 px-4 text-[12px]"
              onClick={onConfirm}
              disabled={!canImport}
            >
              この内容でインポート
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
