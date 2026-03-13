"use client";

import Inspector2Block from "@/src/components/layout-v2/inspector/Inspector2Block";
import InspectorField from "@/src/components/inspector/InspectorField";
import InspectorInput from "@/src/components/inspector/InspectorInput";
import InspectorTextarea from "@/src/components/inspector/InspectorTextarea";
import SectionCommonFields from "@/src/components/layout-v2/inspector/sectionSpecific/SectionCommonFields";
import type { SectionBase } from "@/src/types/project";

type StickyNoteEditorProps = {
  section: SectionBase;
  disabled: boolean;
  onPatchData: (patch: Record<string, unknown>) => void;
  onRenameSection?: (name: string) => void;
  onToggleVisible?: () => void;
};

const asNumber = (value: unknown, fallback: number) =>
  typeof value === "number" && Number.isFinite(value) ? value : fallback;

export default function StickyNoteEditor({
  section,
  disabled,
  onPatchData,
  onRenameSection,
  onToggleVisible,
}: StickyNoteEditorProps) {
  const data = section.data as Record<string, unknown>;

  return (
    <div className="border-t border-[var(--ui-border)]/60">
      <SectionCommonFields
        section={section}
        disabled={disabled}
        onRenameSection={onRenameSection}
        onToggleVisible={onToggleVisible}
        onPatchData={onPatchData}
      />

      <Inspector2Block block="content">
        <InspectorField label="タイトル">
          <InspectorInput
            type="text"
            value={String(data.title ?? "")}
            onChange={(event) => onPatchData({ title: event.target.value })}
            disabled={disabled}
          />
        </InspectorField>
        <InspectorField label="本文">
          <InspectorTextarea
            rows={3}
            autoGrow
            className="min-h-[64px] resize-none text-[12px]"
            value={String(data.body ?? "")}
            onChange={(event) => onPatchData({ body: event.target.value })}
            disabled={disabled}
          />
        </InspectorField>
        <InspectorField label="アイコン (任意)">
          <InspectorInput
            type="text"
            value={String(data.icon ?? "")}
            onChange={(event) => onPatchData({ icon: event.target.value })}
            disabled={disabled}
            placeholder="例: 📌"
          />
        </InspectorField>
      </Inspector2Block>

      <Inspector2Block block="design">
        <label className="flex items-center justify-between text-[11px]">
          <span className="text-[var(--ui-muted)]">テーマ色</span>
          <InspectorInput
            type="color"
            value={String(data.themeColor ?? data.presetColor ?? "#f59e0b")}
            onChange={(event) => onPatchData({ themeColor: event.target.value })}
            disabled={disabled}
          />
        </label>
        <label className="flex items-center justify-between text-[11px]">
          <span className="text-[var(--ui-muted)]">影</span>
          <select
            className="ui-input h-7 w-[120px] text-[11px]"
            value={String(data.shadow ?? "soft")}
            onChange={(event) => onPatchData({ shadow: event.target.value })}
            disabled={disabled}
          >
            <option value="none">なし</option>
            <option value="soft">弱</option>
            <option value="strong">強</option>
          </select>
        </label>
        <InspectorField label="角丸(px)">
          <InspectorInput
            type="number"
            min={0}
            max={80}
            step={1}
            value={String(asNumber(data.borderRadius, 14))}
            onChange={(event) => onPatchData({ borderRadius: Math.max(0, Number(event.target.value) || 0) })}
            disabled={disabled}
          />
        </InspectorField>
      </Inspector2Block>
    </div>
  );
}
