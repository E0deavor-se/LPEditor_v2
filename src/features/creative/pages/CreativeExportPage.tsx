"use client";

import type { CreativeVariant } from "@/src/features/creative/types/variant";
import type { CreativeExportStatus, CreativePublishStatus } from "@/src/features/creative/types/export";

type Props = {
  variant: CreativeVariant | null;
  exportStatus: CreativeExportStatus;
  publishStatus: CreativePublishStatus;
  downloadUrl: string | null;
  errorMessage: string | null;
  onBack: () => void;
  onExportPng: () => void;
  onExportWebp: () => void;
  onPublishToLp: () => void;
};

const btnPrimary =
  "h-7 rounded bg-[var(--ui-primary)] px-3 text-[11px] font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-40";
const btnGhost =
  "h-7 rounded border border-[var(--ui-border)] px-3 text-[11px] font-medium text-[var(--ui-text)] transition-colors hover:bg-[color-mix(in_srgb,var(--ui-text)_8%,transparent)]";

function statusBadge(label: string, status: string) {
  const colors: Record<string, string> = {
    idle: "bg-[var(--ui-panel-muted)] text-[var(--ui-muted)]",
    exporting: "bg-amber-100 text-amber-700",
    publishing: "bg-amber-100 text-amber-700",
    success: "bg-green-100 text-green-700",
    failed: "bg-red-100 text-red-700",
  };
  const cls = colors[status] ?? colors.idle;
  const labelMap: Record<string, string> = {
    idle: "待機中",
    exporting: "書き出し中...",
    publishing: "反映中...",
    success: "✓ 完了",
    failed: "✗ 失敗",
  };
  return (
    <div className="flex items-center justify-between rounded border border-[var(--ui-border)] px-3 py-2">
      <span className="text-[11px] text-[var(--ui-text)]">{label}</span>
      <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium ${cls}`}>
        {(status === "exporting" || status === "publishing") && (
          <span className="inline-block h-3 w-3 animate-spin rounded-full border-2 border-current/30 border-t-current" />
        )}
        {labelMap[status] ?? status}
      </span>
    </div>
  );
}

export default function CreativeExportPage({
  variant,
  exportStatus,
  publishStatus,
  downloadUrl,
  errorMessage,
  onBack,
  onExportPng,
  onExportWebp,
  onPublishToLp,
}: Props) {
  return (
    <section className="mx-auto w-full max-w-2xl rounded-lg border border-[var(--ui-border)] bg-[var(--ui-bg)] p-5">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h2 className="text-[13px] font-semibold text-[var(--ui-text)]">エクスポート & 公開</h2>
          <p className="mt-0.5 text-[11px] text-[var(--ui-muted)]">PNG/WebP出力とLP Hero反映を実行します。</p>
        </div>
        <button type="button" onClick={onBack} className={btnGhost}>
          ← 編集に戻る
        </button>
      </div>

      {/* Selected variant info */}
      <div className="mb-4 rounded border border-[var(--ui-border)] bg-[var(--ui-panel-muted)] px-3 py-2 text-[11px]">
        <span className="text-[var(--ui-muted)]">選択中: </span>
        <span className="font-medium text-[var(--ui-text)]">{variant?.strategyLabel ?? "未選択"}</span>
      </div>

      {/* Actions */}
      <div className="mb-4 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={onExportPng}
          disabled={exportStatus === "exporting"}
          className={btnPrimary}
        >
          PNG書き出し
        </button>
        <button
          type="button"
          onClick={onExportWebp}
          disabled={exportStatus === "exporting"}
          className={btnPrimary}
        >
          WebP書き出し
        </button>
        <button
          type="button"
          onClick={onPublishToLp}
          disabled={publishStatus === "publishing"}
          className={btnGhost}
        >
          LP Heroに反映
        </button>
      </div>

      {/* Status */}
      <div className="space-y-1.5">
        {statusBadge("エクスポート", exportStatus)}
        {statusBadge("LP反映", publishStatus)}
      </div>

      {/* Error */}
      {errorMessage && (
        <div className="mt-3 rounded border border-red-200 bg-red-50 p-2.5 text-[11px] text-red-700">
          {errorMessage}
        </div>
      )}

      {/* Download link */}
      {downloadUrl && (
        <div className="mt-3 rounded border border-green-200 bg-green-50 p-2.5">
          <a
            className="text-[11px] font-medium text-green-700 underline underline-offset-2"
            href={downloadUrl}
            download
          >
            ↓ ファイルをダウンロード
          </a>
        </div>
      )}
    </section>
  );
}
