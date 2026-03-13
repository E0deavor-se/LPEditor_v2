"use client";

import VariantCard from "@/src/features/creative/components/compare/VariantCard";
import type { CreativeVariant } from "@/src/features/creative/types/variant";

type Props = {
  variants: CreativeVariant[];
  selectedVariantId: string | null;
  regeneratingMap: Record<string, boolean>;
  onSelect: (variantId: string) => void;
  onEdit: (variantId: string) => void;
  onRegenerate: (variantId: string) => void;
};

export default function CreativeCompareBoard({
  variants,
  selectedVariantId,
  regeneratingMap,
  onSelect,
  onEdit,
  onRegenerate,
}: Props) {
  return (
    <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
      {variants.map((variant, index) => (
        <VariantCard
          key={variant.id}
          variant={variant}
          index={index}
          selected={variant.id === selectedVariantId}
          regenerating={Boolean(regeneratingMap[variant.id])}
          onSelect={onSelect}
          onEdit={onEdit}
          onRegenerate={onRegenerate}
        />
      ))}
    </div>
  );
}
