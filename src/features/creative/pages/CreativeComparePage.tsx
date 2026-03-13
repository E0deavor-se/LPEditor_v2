"use client";

import CreativeCompareBoard from "@/src/features/creative/components/compare/CreativeCompareBoard";
import type { CreativeVariant } from "@/src/features/creative/types/variant";

type Props = {
  variants: CreativeVariant[];
  selectedVariantId: string | null;
  regeneratingMap: Record<string, boolean>;
  onSelect: (variantId: string) => void;
  onEdit: (variantId: string) => void;
  onRegenerate: (variantId: string) => void;
  onGoEditSelected: () => void;
};

export default function CreativeComparePage({
  variants,
  selectedVariantId,
  regeneratingMap,
  onSelect,
  onEdit,
  onRegenerate,
  onGoEditSelected,
}: Props) {
  return (
    <section className="mx-auto w-full max-w-6xl rounded-lg border border-[var(--ui-border)] bg-[var(--ui-bg)] p-5">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h2 className="text-[13px] font-semibold text-[var(--ui-text)]">バリアント比較</h2>
          <p className="mt-0.5 text-[11px] text-[var(--ui-muted)]">4案を比較して編集対象を選択してください。</p>
        </div>
        <button
          type="button"
          onClick={onGoEditSelected}
          className="h-7 rounded bg-[var(--ui-primary)] px-3 text-[11px] font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-40"
          disabled={!selectedVariantId}
        >
          選択したバリアントを編集 &rarr;
        </button>
      </div>
      <CreativeCompareBoard
        variants={variants}
        selectedVariantId={selectedVariantId}
        regeneratingMap={regeneratingMap}
        onSelect={onSelect}
        onEdit={onEdit}
        onRegenerate={onRegenerate}
      />
    </section>
  );
}
