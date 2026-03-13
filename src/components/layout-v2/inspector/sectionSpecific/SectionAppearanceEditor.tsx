"use client";

import Inspector2Block from "@/src/components/layout-v2/inspector/Inspector2Block";
import InspectorField from "@/src/components/inspector/InspectorField";
import InspectorInput from "@/src/components/inspector/InspectorInput";
import type { SectionBase } from "@/src/types/project";
import { resolveSectionDecorationFromData } from "@/src/lib/sections/sectionAppearance";

type SectionAppearanceEditorProps = {
  section: SectionBase;
  disabled?: boolean;
  onPatchData: (patch: Record<string, unknown>) => void;
  syncTargetStoresLegacyFields?: boolean;
};

export default function SectionAppearanceEditor({
  section,
  disabled = false,
  onPatchData,
  syncTargetStoresLegacyFields = false,
}: SectionAppearanceEditorProps) {
  const data = section.data as Record<string, unknown>;
  const appearance = resolveSectionDecorationFromData(data, {
    headerBackgroundColor: "#ea5504",
    titleTextColor: "#ffffff",
    accentColor: "#eb5505",
    borderColor: "#e5e7eb",
    headerStyle: "band",
    showHeaderBand: true,
  });

  const patchAppearance = (patch: Partial<typeof appearance>) => {
    const next = { ...appearance, ...patch };
    const dataPatch: Record<string, unknown> = {
      decoration: next,
      appearance: next,
    };
    if (syncTargetStoresLegacyFields) {
      dataPatch.titleBandColor = next.headerBackgroundColor;
      dataPatch.titleTextColor = next.titleTextColor;
      dataPatch.cardBorderColor = next.borderColor;
      dataPatch.accentColor = next.accentColor;
    }
    onPatchData(dataPatch);
  };

  const resolveHeaderStyle = (value: string) =>
    value === "band" || value === "ribbon" || value === "plain"
      ? value
      : appearance.headerStyle;

  return (
    <Inspector2Block block="design" summary="見出し装飾">
      <InspectorField label="帯スタイル">
        <select
          className="ui-input h-7 w-full text-[11px]"
          value={appearance.headerStyle}
          onChange={(event) =>
            patchAppearance({ headerStyle: resolveHeaderStyle(event.target.value) })
          }
          disabled={disabled}
        >
          <option value="band">band</option>
          <option value="ribbon">ribbon</option>
          <option value="plain">plain</option>
        </select>
      </InspectorField>

      <label className="flex items-center justify-between text-[11px]">
        <span className="text-[var(--ui-muted)]">帯を表示</span>
        <input
          type="checkbox"
          className="h-4 w-4"
          checked={appearance.showHeaderBand}
          onChange={(event) => patchAppearance({ showHeaderBand: event.target.checked })}
          disabled={disabled}
        />
      </label>

      <label className="flex items-center justify-between text-[11px]">
        <span className="text-[var(--ui-muted)]">見出し背景色</span>
        <InspectorInput
          type="color"
          value={appearance.headerBackgroundColor}
          onChange={(event) =>
            patchAppearance({ headerBackgroundColor: event.target.value })
          }
          disabled={disabled}
        />
      </label>

      <label className="flex items-center justify-between text-[11px]">
        <span className="text-[var(--ui-muted)]">見出し文字色</span>
        <InspectorInput
          type="color"
          value={appearance.titleTextColor}
          onChange={(event) => patchAppearance({ titleTextColor: event.target.value })}
          disabled={disabled}
        />
      </label>

      <label className="flex items-center justify-between text-[11px]">
        <span className="text-[var(--ui-muted)]">アクセント色</span>
        <InspectorInput
          type="color"
          value={appearance.accentColor}
          onChange={(event) => patchAppearance({ accentColor: event.target.value })}
          disabled={disabled}
        />
      </label>

      <label className="flex items-center justify-between text-[11px]">
        <span className="text-[var(--ui-muted)]">境界線色</span>
        <InspectorInput
          type="color"
          value={appearance.borderColor}
          onChange={(event) => patchAppearance({ borderColor: event.target.value })}
          disabled={disabled}
        />
      </label>
    </Inspector2Block>
  );
}
