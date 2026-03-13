"use client";

import Inspector2Block from "@/src/components/layout-v2/inspector/Inspector2Block";
import SectionAppearanceEditor from "@/src/components/layout-v2/inspector/sectionSpecific/SectionAppearanceEditor";
import InspectorField from "@/src/components/inspector/InspectorField";
import InspectorInput from "@/src/components/inspector/InspectorInput";
import InspectorTextarea from "@/src/components/inspector/InspectorTextarea";
import SectionCommonFields from "@/src/components/layout-v2/inspector/sectionSpecific/SectionCommonFields";
import type { SectionBase } from "@/src/types/project";

type FooterSectionEditorProps = {
  section: SectionBase;
  disabled: boolean;
  onPatchData: (patch: Record<string, unknown>) => void;
  onRenameSection?: (name: string) => void;
  onToggleVisible?: () => void;
};

export default function FooterSectionEditor({
  section,
  disabled,
  onPatchData,
  onRenameSection,
  onToggleVisible,
}: FooterSectionEditorProps) {
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
        <InspectorField label="会社名">
          <InspectorInput
            type="text"
            value={String(data.companyName ?? "")}
            onChange={(event) => onPatchData({ companyName: event.target.value })}
            disabled={disabled}
          />
        </InspectorField>
        <InspectorField label="コピーライト">
          <InspectorInput
            type="text"
            value={String(data.copyrightText ?? "")}
            onChange={(event) => onPatchData({ copyrightText: event.target.value })}
            disabled={disabled}
          />
        </InspectorField>
        <InspectorField label="リンク/補足">
          <InspectorTextarea
            rows={2}
            autoGrow
            className="min-h-[44px] resize-none text-[12px]"
            value={String(data.linksText ?? data.subText ?? "")}
            onChange={(event) => onPatchData({ linksText: event.target.value })}
            disabled={disabled}
          />
        </InspectorField>
      </Inspector2Block>

      <SectionAppearanceEditor
        section={section}
        disabled={disabled}
        onPatchData={onPatchData}
      />
    </div>
  );
}
