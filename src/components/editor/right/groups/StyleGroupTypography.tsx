"use client";

import Accordion from "@/src/components/editor/right/primitives/Accordion";
import FieldRow from "@/src/components/editor/right/primitives/FieldRow";
import NumberField from "@/src/components/editor/right/primitives/NumberField";
import SelectField from "@/src/components/editor/right/primitives/SelectField";
import type { PageBaseStyle } from "@/src/types/project";

type StyleGroupTypographyProps = {
  value: PageBaseStyle["typography"];
  onChange: (patch: Partial<PageBaseStyle["typography"]>) => void;
  defaultOpen?: boolean;
};

export default function StyleGroupTypography({
  value,
  onChange,
  defaultOpen,
}: StyleGroupTypographyProps) {
  return (
    <Accordion title="タイポグラフィ" defaultOpen={defaultOpen}>
      <FieldRow label="フォント">
        <SelectField
          value={value.fontFamily}
          ariaLabel="フォント"
          onChange={(next) => onChange({ fontFamily: next })}
        >
          <option value="system-ui">システム</option>
          <option value="Inter">Inter</option>
          <option value="Noto Sans JP">Noto Sans JP</option>
        </SelectField>
      </FieldRow>
      <FieldRow label="基本サイズ">
        <NumberField
          value={value.baseSize}
          ariaLabel="基本サイズ"
          onChange={(next) => onChange({ baseSize: next })}
        />
      </FieldRow>
      <FieldRow label="行間">
        <NumberField
          value={value.lineHeight}
          step={0.1}
          ariaLabel="行間"
          onChange={(next) => onChange({ lineHeight: next })}
        />
      </FieldRow>
      <FieldRow label="字間">
        <NumberField
          value={value.letterSpacing}
          step={0.1}
          ariaLabel="字間"
          onChange={(next) => onChange({ letterSpacing: next })}
        />
      </FieldRow>
      <FieldRow label="太さ">
        <SelectField
          value={value.fontWeight}
          ariaLabel="太さ"
          onChange={(next) => onChange({ fontWeight: Number(next) })}
        >
          <option value="400">400</option>
          <option value="500">500</option>
          <option value="600">600</option>
          <option value="700">700</option>
        </SelectField>
      </FieldRow>
    </Accordion>
  );
}
