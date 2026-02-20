"use client";

import { RotateCcw } from "lucide-react";
import ColorField from "@/src/components/editor/right/primitives/ColorField";
import FieldRow from "@/src/components/editor/right/primitives/FieldRow";
import NumberField from "@/src/components/editor/right/primitives/NumberField";
import ToggleField from "@/src/components/editor/right/primitives/ToggleField";
import { useI18n } from "@/src/i18n";
import type { PrimaryLine } from "@/src/types/project";

type QuickLineStylePanelProps = {
  selectedLine?: PrimaryLine;
  fallbackSize: number;
  disabledMessage?: string;
  onUpdateMarks: (patch: { bold?: boolean; color?: string; size?: number }) => void;
  onResetMarks: () => void;
  onApplyToAll?: () => void;
  onPromoteToSection?: () => void;
};

export default function QuickLineStylePanel({
  selectedLine,
  fallbackSize,
  disabledMessage,
  onUpdateMarks,
  onResetMarks,
  onApplyToAll,
  onPromoteToSection,
}: QuickLineStylePanelProps) {
  const t = useI18n();
  const isDisabled = !selectedLine;
  const colorValue = selectedLine?.marks?.color ?? "#111111";
  const sizeValue = selectedLine?.marks?.size ?? fallbackSize;

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between text-xs text-[var(--ui-muted)]">
        <span>{t.inspector.section.quickStyle.title}</span>
        <button
          type="button"
          className="ui-button ui-button-secondary h-8 px-2 text-[11px]"
          onClick={onResetMarks}
          disabled={isDisabled}
          aria-label={t.inspector.header.reset}
          title={t.inspector.header.reset}
        >
          <RotateCcw size={14} />
        </button>
      </div>
      {isDisabled ? (
        <div className="rounded-md border border-dashed border-[var(--ui-border)]/60 bg-[var(--surface)] px-3 py-2 text-xs text-[var(--ui-muted)]">
          {disabledMessage ?? t.inspector.section.quickStyle.hint}
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          <FieldRow label={t.inspector.section.fields.bold}>
            <ToggleField
              value={Boolean(selectedLine?.marks?.bold)}
              ariaLabel={t.inspector.section.fields.bold}
              onChange={(next) => onUpdateMarks({ bold: next })}
            />
          </FieldRow>
          <FieldRow label={t.inspector.section.fields.textColor}>
            <ColorField
              value={colorValue}
              ariaLabel={t.inspector.section.fields.textColor}
              onChange={(next) => onUpdateMarks({ color: next })}
            />
          </FieldRow>
          <FieldRow label={t.inspector.section.fields.size}>
            <NumberField
              value={sizeValue}
              min={10}
              max={48}
              step={1}
              ariaLabel={t.inspector.section.fields.size}
              onChange={(next) => onUpdateMarks({ size: next })}
            />
          </FieldRow>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              className="ui-button ui-button-secondary h-8 px-2 text-[11px]"
              onClick={onApplyToAll}
              disabled={!onApplyToAll}
            >
              {t.inspector.section.buttons.applyLineStyleAll}
            </button>
            <button
              type="button"
              className="ui-button ui-button-secondary h-8 px-2 text-[11px]"
              onClick={onPromoteToSection}
              disabled={!onPromoteToSection}
            >
              {t.inspector.section.buttons.promoteLineStyle}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

