"use client";

import type { CreativeJobStatus } from "@/src/features/creative/types/job";
import { getAiGenerationStatusLabel } from "@/src/lib/userMessageCatalog";

type Props = {
  status: CreativeJobStatus;
  progress: number;
  message?: string | null;
};

export default function CreativeGeneratingPage({ status, progress, message }: Props) {
  const isFailed = status === "failed";

  return (
    <section className="mx-auto w-full max-w-lg rounded-lg border border-[var(--ui-border)] bg-[var(--ui-bg)] p-8 text-center">
      {/* Spinner */}
      {!isFailed && (
        <div className="mx-auto mb-5 h-10 w-10 animate-spin rounded-full border-3 border-[var(--ui-border)] border-t-[var(--ui-primary)]" />
      )}

      <h2 className="text-[13px] font-semibold text-[var(--ui-text)]">
        {isFailed ? "生成に失敗しました" : "クリエイティブバリアントを生成中"}
      </h2>
      <p className="mt-1 text-[11px] text-[var(--ui-muted)]">
        {isFailed ? "再度お試しください。" : "AI画像を生成し、比較可能な4案を準備しています。"}
      </p>

      {/* Progress bar */}
      {!isFailed && (
        <div className="mt-5">
          <div className="h-2 w-full overflow-hidden rounded-full bg-[var(--ui-panel-muted)]">
            <div
              className="h-full rounded-full bg-[var(--ui-primary)] transition-all duration-300 ease-out"
              style={{ width: `${Math.max(0, Math.min(100, progress))}%` }}
            />
          </div>
          <div className="mt-2 flex items-center justify-between text-[10px] text-[var(--ui-muted)]">
            <span>{getAiGenerationStatusLabel(status)}</span>
            <span>{progress}%</span>
          </div>
        </div>
      )}

      {/* Error message */}
      {isFailed && message && (
        <div className="mt-4 rounded border border-red-200 bg-red-50 p-3 text-[11px] text-red-700">
          {message}
        </div>
      )}
    </section>
  );
}
