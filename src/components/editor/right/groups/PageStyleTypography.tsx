"use client";

import { Type } from "lucide-react";
import Accordion from "@/src/components/editor/right/primitives/Accordion";
import FieldRow from "@/src/components/editor/right/primitives/FieldRow";
import NumberField from "@/src/components/editor/right/primitives/NumberField";
import SelectField from "@/src/components/editor/right/primitives/SelectField";
import type { PageBaseStyle } from "@/src/types/project";
import { useI18n } from "@/src/i18n";
import { FONT_OPTIONS } from "@/src/lib/fontOptions";

type PageStyleTypographyProps = {
  value: PageBaseStyle["typography"];
  onChange: (patch: Partial<PageBaseStyle["typography"]>) => void;
  defaultOpen?: boolean;
};

export default function PageStyleTypography({
  value,
  onChange,
  defaultOpen,
}: PageStyleTypographyProps) {
  const t = useI18n();
  return (
    <Accordion
      title={t.inspector.page.groups.typography}
      icon={<Type size={14} />}
      defaultOpen={defaultOpen}
    >
      <FieldRow label={t.inspector.page.fields.font}>
        <SelectField
          value={value.fontFamily}
          ariaLabel={t.inspector.page.fields.font}
          onChange={(next) => onChange({ fontFamily: next })}
        >
          {FONT_OPTIONS.map((font) => (
            <option key={font.value} value={font.value}>
              {font.label}
            </option>
          ))}
        </SelectField>
      </FieldRow>
      <FieldRow label={t.inspector.page.fields.baseSize}>
        <NumberField
          value={value.baseSize}
          min={10}
          max={24}
          step={1}
          ariaLabel={t.inspector.page.fields.baseSize}
          onChange={(next) => onChange({ baseSize: next })}
        />
      </FieldRow>
      <FieldRow label={t.inspector.page.fields.lineHeight}>
        <NumberField
          value={value.lineHeight}
          min={1.0}
          max={2.2}
          step={0.05}
          ariaLabel={t.inspector.page.fields.lineHeight}
          onChange={(next) => onChange({ lineHeight: next })}
        />
      </FieldRow>
      <FieldRow label={t.inspector.page.fields.letterSpacing}>
        <NumberField
          value={value.letterSpacing}
          min={-1}
          max={5}
          step={0.1}
          ariaLabel={t.inspector.page.fields.letterSpacing}
          onChange={(next) => onChange({ letterSpacing: next })}
        />
      </FieldRow>
      <FieldRow label={t.inspector.page.fields.weight}>
        <SelectField
          value={value.fontWeight}
          ariaLabel={t.inspector.page.fields.weight}
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
