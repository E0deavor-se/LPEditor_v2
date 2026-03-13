"use client";

import Inspector2Block from "@/src/components/layout-v2/inspector/Inspector2Block";
import SectionCommonFields from "@/src/components/layout-v2/inspector/sectionSpecific/SectionCommonFields";
import InspectorField from "@/src/components/inspector/InspectorField";
import InspectorInput from "@/src/components/inspector/InspectorInput";
import InspectorTextarea from "@/src/components/inspector/InspectorTextarea";
import type { SectionBase } from "@/src/types/project";

type ContactSectionEditorProps = {
  section: SectionBase;
  disabled: boolean;
  onPatchData: (patch: Record<string, unknown>) => void;
  onRenameSection?: (name: string) => void;
  onToggleVisible?: () => void;
};

export default function ContactSectionEditor({
  section,
  disabled,
  onPatchData,
  onRenameSection,
  onToggleVisible,
}: ContactSectionEditorProps) {
  const data = section.data as Record<string, unknown>;
  const textAlign =
    data.textAlign === "left" || data.textAlign === "right" ? data.textAlign : "center";

  return (
    <div className="border-t border-[var(--ui-border)]/60">
      <SectionCommonFields
        section={section}
        disabled={disabled}
        onRenameSection={onRenameSection}
        onToggleVisible={onToggleVisible}
        onPatchData={onPatchData}
        options={{
          showBackgroundColor: false,
          showTextColor: false,
          showPadding: false,
        }}
      />

      <Inspector2Block block="basic" summary="見出し">
        <InspectorField label="見出し">
          <InspectorInput
            type="text"
            value={String(data.title ?? "")}
            onChange={(event) => onPatchData({ title: event.target.value })}
            disabled={disabled}
          />
        </InspectorField>
      </Inspector2Block>

      <Inspector2Block block="content" summary="説明">
        <InspectorField label="説明">
          <InspectorTextarea
            rows={3}
            autoGrow
            className="min-h-[44px] resize-none text-[12px]"
            value={String(data.description ?? "")}
            onChange={(event) => onPatchData({ description: event.target.value })}
            disabled={disabled}
          />
        </InspectorField>
      </Inspector2Block>

      <Inspector2Block block="content" summary="ボタン">
        <InspectorField label="ボタン文言">
          <InspectorInput
            type="text"
            value={String(data.buttonLabel ?? "")}
            onChange={(event) => onPatchData({ buttonLabel: event.target.value })}
            disabled={disabled}
          />
        </InspectorField>
        <InspectorField label="リンクURL">
          <InspectorInput
            type="url"
            value={String(data.buttonUrl ?? "")}
            onChange={(event) => onPatchData({ buttonUrl: event.target.value })}
            disabled={disabled}
          />
        </InspectorField>
      </Inspector2Block>

      <Inspector2Block block="content" summary="補足">
        <InspectorField label="補足">
          <InspectorTextarea
            rows={2}
            autoGrow
            className="min-h-[44px] resize-none text-[12px]"
            value={String(data.note ?? "")}
            onChange={(event) => onPatchData({ note: event.target.value })}
            disabled={disabled}
          />
        </InspectorField>
      </Inspector2Block>

      <Inspector2Block block="display" summary="テキスト配置">
        <InspectorField label="テキスト配置">
          <select
            className="ui-input h-7 w-full text-[11px]"
            value={textAlign}
            onChange={(event) => onPatchData({ textAlign: event.target.value })}
            disabled={disabled}
          >
            <option value="left">left</option>
            <option value="center">center</option>
            <option value="right">right</option>
          </select>
        </InspectorField>
      </Inspector2Block>

      <Inspector2Block block="design">
        <label className="flex items-center justify-between text-[11px]">
          <span className="text-[var(--ui-muted)]">背景色</span>
          <InspectorInput
            type="color"
            value={String(data.backgroundColor ?? "#000000")}
            onChange={(event) => onPatchData({ backgroundColor: event.target.value })}
            disabled={disabled}
          />
        </label>

        <label className="flex items-center justify-between text-[11px]">
          <span className="text-[var(--ui-muted)]">ボタン色</span>
          <InspectorInput
            type="color"
            value={String(data.buttonColor ?? "#fa5902")}
            onChange={(event) => onPatchData({ buttonColor: event.target.value })}
            disabled={disabled}
          />
        </label>

        <label className="flex items-center justify-between text-[11px]">
          <span className="text-[var(--ui-muted)]">文字色</span>
          <InspectorInput
            type="color"
            value={String(data.textColor ?? "#ffffff")}
            onChange={(event) => onPatchData({ textColor: event.target.value })}
            disabled={disabled}
          />
        </label>
      </Inspector2Block>
    </div>
  );
}
