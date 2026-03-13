"use client";

import Inspector2Block from "@/src/components/layout-v2/inspector/Inspector2Block";
import InspectorField from "@/src/components/inspector/InspectorField";
import InspectorInput from "@/src/components/inspector/InspectorInput";
import type { SectionBase } from "@/src/types/project";

type SectionCommonFieldsProps = {
  section: SectionBase;
  disabled: boolean;
  onRenameSection?: (name: string) => void;
  onToggleVisible?: () => void;
  onPatchData: (patch: Record<string, unknown>) => void;
  options?: {
    showName?: boolean;
    showVisibility?: boolean;
    showBackgroundColor?: boolean;
    showTextColor?: boolean;
    showPadding?: boolean;
    labels?: {
      backgroundColor?: string;
      textColor?: string;
      paddingTop?: string;
      paddingBottom?: string;
    };
  };
};

const asNumber = (value: unknown, fallback: number) =>
  typeof value === "number" && Number.isFinite(value) ? value : fallback;

export default function SectionCommonFields({
  section,
  disabled,
  onRenameSection,
  onToggleVisible,
  onPatchData,
  options,
}: SectionCommonFieldsProps) {
  const showName = options?.showName !== false;
  const showVisibility = options?.showVisibility !== false;
  const showBackgroundColor = options?.showBackgroundColor !== false;
  const showTextColor = options?.showTextColor !== false;
  const showPadding = options?.showPadding !== false;

  return (
    <Inspector2Block block="basic">
      {showName ? (
        <InspectorField label="セクション名">
          <InspectorInput
            type="text"
            value={String(section.name ?? "")}
            onChange={(event) => onRenameSection?.(event.target.value)}
            disabled={disabled}
          />
        </InspectorField>
      ) : null}

      {showVisibility ? (
        <label className="flex items-center justify-between text-[11px]">
          <span className="text-[var(--ui-muted)]">表示</span>
          <input
            type="checkbox"
            className="h-4 w-4"
            checked={section.visible !== false}
            onChange={() => onToggleVisible?.()}
            disabled={disabled || !onToggleVisible}
          />
        </label>
      ) : null}

      {showBackgroundColor ? (
        <label className="flex items-center justify-between text-[11px]">
          <span className="text-[var(--ui-muted)]">
            {options?.labels?.backgroundColor ?? "背景色"}
          </span>
          <InspectorInput
            type="color"
            value={String((section.data as Record<string, unknown>).backgroundColor ?? "#ffffff")}
            onChange={(event) => onPatchData({ backgroundColor: event.target.value })}
            disabled={disabled}
          />
        </label>
      ) : null}

      {showTextColor ? (
        <label className="flex items-center justify-between text-[11px]">
          <span className="text-[var(--ui-muted)]">
            {options?.labels?.textColor ?? "文字色"}
          </span>
          <InspectorInput
            type="color"
            value={String((section.data as Record<string, unknown>).textColor ?? "#111111")}
            onChange={(event) => onPatchData({ textColor: event.target.value })}
            disabled={disabled}
          />
        </label>
      ) : null}

      {showPadding ? (
        <>
          <InspectorField label={options?.labels?.paddingTop ?? "上余白"}>
            <InspectorInput
              type="number"
              min={0}
              max={240}
              step={1}
              value={String(asNumber((section.data as Record<string, unknown>).paddingTop, 24))}
              onChange={(event) =>
                onPatchData({ paddingTop: Math.max(0, Number(event.target.value) || 0) })
              }
              disabled={disabled}
            />
          </InspectorField>
          <InspectorField label={options?.labels?.paddingBottom ?? "下余白"}>
            <InspectorInput
              type="number"
              min={0}
              max={240}
              step={1}
              value={String(asNumber((section.data as Record<string, unknown>).paddingBottom, 24))}
              onChange={(event) =>
                onPatchData({ paddingBottom: Math.max(0, Number(event.target.value) || 0) })
              }
              disabled={disabled}
            />
          </InspectorField>
        </>
      ) : null}
    </Inspector2Block>
  );
}
