"use client";

import Accordion from "@/src/components/editor/right/primitives/Accordion";
import ColorField from "@/src/components/editor/right/primitives/ColorField";
import FieldRow from "@/src/components/editor/right/primitives/FieldRow";
import type { PageBaseStyle } from "@/src/types/project";

type StyleGroupColorsProps = {
  value: PageBaseStyle["colors"];
  onChange: (patch: Partial<PageBaseStyle["colors"]>) => void;
  defaultOpen?: boolean;
};

export default function StyleGroupColors({
  value,
  onChange,
  defaultOpen,
}: StyleGroupColorsProps) {
  return (
    <Accordion title="カラー" defaultOpen={defaultOpen}>
      <FieldRow label="背景">
        <ColorField
          value={value.background}
          ariaLabel="背景"
          onChange={(next) => onChange({ background: next })}
        />
      </FieldRow>
      <FieldRow label="テキスト">
        <ColorField
          value={value.text}
          ariaLabel="テキスト"
          onChange={(next) => onChange({ text: next })}
        />
      </FieldRow>
      <FieldRow label="アクセント">
        <ColorField
          value={value.accent}
          ariaLabel="アクセント"
          onChange={(next) => onChange({ accent: next })}
        />
      </FieldRow>
      <FieldRow label="境界">
        <ColorField
          value={value.border}
          ariaLabel="境界"
          onChange={(next) => onChange({ border: next })}
        />
      </FieldRow>
    </Accordion>
  );
}
