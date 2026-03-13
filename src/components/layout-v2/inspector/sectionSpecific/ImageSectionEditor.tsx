"use client";

import Inspector2Block from "@/src/components/layout-v2/inspector/Inspector2Block";
import InspectorField from "@/src/components/inspector/InspectorField";
import InspectorInput from "@/src/components/inspector/InspectorInput";
import InspectorTextarea from "@/src/components/inspector/InspectorTextarea";
import SectionAssetPicker from "@/src/features/ai-assets/components/SectionAssetPicker";
import SectionCommonFields from "@/src/components/layout-v2/inspector/sectionSpecific/SectionCommonFields";
import type { SectionBase } from "@/src/types/project";

type ImageSectionEditorProps = {
  section: SectionBase;
  disabled: boolean;
  onPatchData: (patch: Record<string, unknown>) => void;
  addAsset: (asset: { filename: string; data: string }) => string;
  onRenameSection?: (name: string) => void;
  onToggleVisible?: () => void;
};

const asNumber = (value: unknown, fallback: number) =>
  typeof value === "number" && Number.isFinite(value) ? value : fallback;

export default function ImageSectionEditor({
  section,
  disabled,
  onPatchData,
  addAsset,
  onRenameSection,
  onToggleVisible,
}: ImageSectionEditorProps) {
  const data = section.data as Record<string, unknown>;
  const alignment =
    data.alignment === "left" || data.alignment === "right" ? data.alignment : "center";

  return (
    <div className="border-t border-[var(--ui-border)]/60">
      <SectionAssetPicker
        section={section}
        disabled={disabled}
        addAsset={addAsset}
        onPatchData={onPatchData}
      />

      <SectionCommonFields
        section={section}
        disabled={disabled}
        onRenameSection={onRenameSection}
        onToggleVisible={onToggleVisible}
        onPatchData={onPatchData}
      />

      <Inspector2Block block="content">
        <InspectorField label="画像URL">
          <InspectorInput
            type="text"
            value={String(data.imageUrl ?? "")}
            onChange={(event) => onPatchData({ imageUrl: event.target.value })}
            disabled={disabled}
            placeholder="https://..."
          />
        </InspectorField>
        <InspectorField label="alt">
          <InspectorInput
            type="text"
            value={String(data.alt ?? "")}
            onChange={(event) => onPatchData({ alt: event.target.value })}
            disabled={disabled}
          />
        </InspectorField>
        <InspectorField label="キャプション">
          <InspectorTextarea
            rows={2}
            autoGrow
            className="min-h-[44px] resize-none text-[12px]"
            value={String(data.caption ?? "")}
            onChange={(event) => onPatchData({ caption: event.target.value })}
            disabled={disabled}
          />
        </InspectorField>
      </Inspector2Block>

      <Inspector2Block block="display">
        <label className="flex items-center justify-between text-[11px]">
          <span className="text-[var(--ui-muted)]">配置</span>
          <select
            className="ui-input h-7 w-[120px] text-[11px]"
            value={alignment}
            onChange={(event) => onPatchData({ alignment: event.target.value })}
            disabled={disabled}
          >
            <option value="left">左</option>
            <option value="center">中央</option>
            <option value="right">右</option>
          </select>
        </label>
        <InspectorField label="幅(px)">
          <InspectorInput
            type="number"
            min={120}
            max={1600}
            step={1}
            value={String(asNumber(data.width, 720))}
            onChange={(event) => onPatchData({ width: Math.max(120, Number(event.target.value) || 120) })}
            disabled={disabled}
          />
        </InspectorField>
        <InspectorField label="角丸(px)">
          <InspectorInput
            type="number"
            min={0}
            max={80}
            step={1}
            value={String(asNumber(data.borderRadius, 12))}
            onChange={(event) => onPatchData({ borderRadius: Math.max(0, Number(event.target.value) || 0) })}
            disabled={disabled}
          />
        </InspectorField>
      </Inspector2Block>
    </div>
  );
}
