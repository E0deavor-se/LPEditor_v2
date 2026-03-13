"use client";

import CreativeInputForm from "@/src/features/creative/components/input/CreativeInputForm";
import type { CreativeInputValues } from "@/src/features/creative/types/document";

type Props = {
  initialValues: CreativeInputValues;
  isSubmitting: boolean;
  onSubmit: (values: CreativeInputValues) => void;
  campaignDirectionHint?: string | null;
};

export default function CreativeInputPage({
  initialValues,
  isSubmitting,
  onSubmit,
  campaignDirectionHint,
}: Props) {
  return (
    <section className="mx-auto w-full max-w-3xl rounded-lg border border-[var(--ui-border)] bg-[var(--ui-panel)] p-5">
      <h1 className="text-[13px] font-semibold text-[var(--ui-text)]">クリエイティブ生成</h1>
      <p className="mt-0.5 text-[11px] text-[var(--ui-muted)]">入力情報からバナー案を4パターン生成します。</p>
      {campaignDirectionHint ? (
        <div className="mt-3 rounded border border-[var(--ui-border)] bg-[var(--surface-2)] px-2.5 py-1.5 text-[10px] text-[var(--ui-muted)]">
          {campaignDirectionHint}
        </div>
      ) : null}
      <div className="mt-4">
        <CreativeInputForm initialValues={initialValues} isSubmitting={isSubmitting} onSubmit={onSubmit} />
      </div>
    </section>
  );
}
