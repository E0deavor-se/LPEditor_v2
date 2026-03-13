"use client";

import type { CreativeVariant } from "@/src/features/creative/types/variant";

type Props = {
  variant: CreativeVariant;
  index: number;
  selected: boolean;
  regenerating: boolean;
  onSelect: (variantId: string) => void;
  onEdit: (variantId: string) => void;
  onRegenerate: (variantId: string) => void;
};

export default function VariantCard({ variant, index, selected, regenerating, onSelect, onEdit, onRegenerate }: Props) {
  const preview = variant.variantJson;
  const subtitle = variant.strategySubtitle ?? variant.generationMeta?.strategySubtitle ?? "";

  return (
    <article
      role="button"
      tabIndex={0}
      onClick={() => onSelect(variant.id)}
      onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") onSelect(variant.id); }}
      className={`group relative cursor-pointer rounded-lg border p-3 transition-all ${
        selected
          ? "border-[var(--ui-primary)] ring-2 ring-[var(--ui-primary)]/30 bg-[var(--ui-panel)]"
          : "border-[var(--ui-border)] bg-[var(--ui-panel)] hover:border-[var(--ui-primary)]/50 hover:shadow-md"
      }`}
    >
      {/* Badge */}
      <div className="mb-2 flex items-center gap-2">
        <span className={`inline-flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-bold ${
          selected ? "bg-[var(--ui-primary)] text-white" : "bg-[var(--ui-panel-muted)] text-[var(--ui-muted)]"
        }`}>
          {index + 1}
        </span>
        <div className="min-w-0">
          <span className="block truncate text-[11px] font-medium text-[var(--ui-text)]">{variant.strategyLabel}</span>
          {subtitle ? (
            <span className="block truncate text-[10px] text-[var(--ui-muted)]">{subtitle}</span>
          ) : null}
        </div>
        {selected && (
          <span className="ml-auto text-[10px] font-medium text-[var(--ui-primary)]">&#x2713; 選択中</span>
        )}
      </div>

      {/* Preview */}
      <div
        className="relative mb-3 overflow-hidden rounded border border-[var(--ui-border)]"
        style={{ aspectRatio: "1200 / 628", background: preview.background.color ?? "#ffffff" }}
      >
        {preview.background.imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={preview.background.imageUrl} alt="variant background" className="absolute inset-0 h-full w-full object-cover" />
        ) : null}
        {preview.layers.map((layer) => {
          if (layer.type === "text") {
            return (
              <div
                key={layer.id}
                className="absolute line-clamp-2 overflow-hidden"
                style={{
                  left: `${(layer.x / preview.width) * 100}%`,
                  top: `${(layer.y / preview.height) * 100}%`,
                  width: `${(layer.width / preview.width) * 100}%`,
                  height: `${(layer.height / preview.height) * 100}%`,
                  color: layer.color,
                  fontSize: `${Math.max(9, (layer.fontSize / 1200) * 500)}px`,
                  fontWeight: layer.fontWeight ?? 600,
                }}
              >
                {layer.text}
              </div>
            );
          }
          return (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              key={layer.id}
              src={layer.imageUrl}
              alt={layer.type}
              className="absolute object-cover"
              style={{
                left: `${(layer.x / preview.width) * 100}%`,
                top: `${(layer.y / preview.height) * 100}%`,
                width: `${(layer.width / preview.width) * 100}%`,
                height: `${(layer.height / preview.height) * 100}%`,
              }}
            />
          );
        })}
      </div>

      {/* Actions */}
      <div className="flex gap-1.5">
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); onEdit(variant.id); }}
          className="h-7 flex-1 rounded bg-[var(--ui-primary)] text-[11px] font-medium text-white transition-opacity hover:opacity-90"
        >
          編集
        </button>
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); onRegenerate(variant.id); }}
          disabled={regenerating}
          className="h-7 rounded border border-[var(--ui-border)] px-3 text-[11px] text-[var(--ui-text)] transition-colors hover:bg-[color-mix(in_srgb,var(--ui-text)_8%,transparent)]"
        >
          {regenerating ? "再生成中..." : "再生成"}
        </button>
      </div>
    </article>
  );
}
