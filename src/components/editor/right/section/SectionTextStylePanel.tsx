"use client";

import { Type } from "lucide-react";
import Accordion from "@/src/components/editor/right/primitives/Accordion";
import ColorField from "@/src/components/editor/right/primitives/ColorField";
import FieldRow from "@/src/components/editor/right/primitives/FieldRow";
import NumberField from "@/src/components/editor/right/primitives/NumberField";
import SegmentedField from "@/src/components/editor/right/primitives/SegmentedField";
import SelectField from "@/src/components/editor/right/primitives/SelectField";
import ToggleField from "@/src/components/editor/right/primitives/ToggleField";
import { useI18n } from "@/src/i18n";
import type {
  SectionStyle,
  SectionStylePatch,
  SectionTextAlign,
} from "@/src/types/project";

type SectionTextStylePanelProps = {
  style: SectionStyle;
  onStyleChange: (patch: SectionStylePatch) => void;
  defaultOpen?: boolean;
};

const FONT_OPTIONS = ["system-ui", "Inter", "Noto Sans JP"];

export default function SectionTextStylePanel({
  style,
  onStyleChange,
  defaultOpen,
}: SectionTextStylePanelProps) {
  const t = useI18n();
  const isBold = style.typography.fontWeight >= 700;

  const handleToggleBold = (next: boolean) => {
    const nextWeight = next ? 700 : 400;
    onStyleChange({ typography: { fontWeight: nextWeight } });
  };

  return (
    <Accordion
      title={t.inspector.section.groups.text}
      icon={<Type size={14} />}
      defaultOpen={defaultOpen}
    >
      <FieldRow label={t.inspector.section.fields.font}>
        <SelectField
          value={style.typography.fontFamily}
          ariaLabel={t.inspector.section.fields.font}
          onChange={(next) => onStyleChange({ typography: { fontFamily: next } })}
        >
          {FONT_OPTIONS.map((font) => (
            <option key={font} value={font}>
              {font}
            </option>
          ))}
        </SelectField>
      </FieldRow>
      <FieldRow label={t.inspector.section.fields.size}>
        <NumberField
          value={style.typography.fontSize}
          min={10}
          max={40}
          step={1}
          ariaLabel={t.inspector.section.fields.size}
          onChange={(next) => onStyleChange({ typography: { fontSize: next } })}
        />
      </FieldRow>
      <FieldRow label={t.inspector.section.fields.weight}>
        <SelectField
          value={style.typography.fontWeight}
          ariaLabel={t.inspector.section.fields.weight}
          onChange={(next) =>
            onStyleChange({ typography: { fontWeight: Number(next) } })
          }
        >
          <option value="400">400</option>
          <option value="500">500</option>
          <option value="600">600</option>
          <option value="700">700</option>
        </SelectField>
      </FieldRow>
      <FieldRow label={t.inspector.section.fields.bold}>
        <ToggleField
          value={isBold}
          ariaLabel={t.inspector.section.fields.bold}
          onChange={handleToggleBold}
        />
      </FieldRow>
      <FieldRow label={t.inspector.section.fields.textColor}>
        <ColorField
          value={style.typography.textColor}
          ariaLabel={t.inspector.section.fields.textColor}
          onChange={(next) => onStyleChange({ typography: { textColor: next } })}
        />
      </FieldRow>
      <FieldRow label={t.inspector.section.fields.lineHeight}>
        <NumberField
          value={style.typography.lineHeight}
          min={1}
          max={2.4}
          step={0.05}
          ariaLabel={t.inspector.section.fields.lineHeight}
          onChange={(next) => onStyleChange({ typography: { lineHeight: next } })}
        />
      </FieldRow>
      <FieldRow label={t.inspector.section.fields.letterSpacing}>
        <NumberField
          value={style.typography.letterSpacing}
          min={-1}
          max={6}
          step={0.1}
          ariaLabel={t.inspector.section.fields.letterSpacing}
          onChange={(next) =>
            onStyleChange({ typography: { letterSpacing: next } })
          }
        />
      </FieldRow>
      <FieldRow label={t.inspector.section.fields.align}>
        <SegmentedField
          value={style.typography.textAlign}
          ariaLabel={t.inspector.section.fields.align}
          options={[
            { value: "left", label: t.inspector.section.alignOptions.left },
            { value: "center", label: t.inspector.section.alignOptions.center },
            { value: "right", label: t.inspector.section.alignOptions.right },
          ]}
          onChange={(next) =>
            onStyleChange({ typography: { textAlign: next as SectionTextAlign } })
          }
        />
      </FieldRow>
    </Accordion>
  );
}
