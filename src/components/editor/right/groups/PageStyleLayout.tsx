"use client";

import { LayoutTemplate } from "lucide-react";
import Accordion from "@/src/components/editor/right/primitives/Accordion";
import FieldRow from "@/src/components/editor/right/primitives/FieldRow";
import NumberField from "@/src/components/editor/right/primitives/NumberField";
import SelectField from "@/src/components/editor/right/primitives/SelectField";
import SegmentedField from "@/src/components/editor/right/primitives/SegmentedField";
import type { PageBaseStyle } from "@/src/types/project";
import { useI18n } from "@/src/i18n";

type PageStyleLayoutProps = {
  value: PageBaseStyle["layout"];
  onChange: (patch: Partial<PageBaseStyle["layout"]>) => void;
  defaultOpen?: boolean;
};

export default function PageStyleLayout({
  value,
  onChange,
  defaultOpen,
}: PageStyleLayoutProps) {
  const t = useI18n();
  return (
    <Accordion
      title={t.inspector.page.groups.layout}
      icon={<LayoutTemplate size={14} />}
      defaultOpen={defaultOpen}
    >
      <FieldRow label={t.inspector.page.fields.maxWidth}>
        <NumberField
          value={value.maxWidth}
          min={320}
          max={1600}
          step={10}
          ariaLabel={t.inspector.page.fields.maxWidth}
          onChange={(next) => onChange({ maxWidth: next })}
        />
      </FieldRow>
      <FieldRow label={t.inspector.page.fields.alignment}>
        <SegmentedField
          value={value.align}
          ariaLabel={t.inspector.page.fields.alignment}
          options={[
            { value: "left", label: t.inspector.page.alignOptions.left },
            { value: "center", label: t.inspector.page.alignOptions.center },
          ]}
          onChange={(next) =>
            onChange({ align: next as PageBaseStyle["layout"]["align"] })
          }
        />
      </FieldRow>
      <FieldRow label={t.inspector.page.fields.radius}>
        <NumberField
          value={value.radius}
          min={0}
          max={32}
          step={1}
          ariaLabel={t.inspector.page.fields.radius}
          onChange={(next) => onChange({ radius: next })}
        />
      </FieldRow>
      <FieldRow label={t.inspector.page.fields.shadow}>
        <SelectField
          value={value.shadow}
          ariaLabel={t.inspector.page.fields.shadow}
          onChange={(next) =>
            onChange({ shadow: next as PageBaseStyle["layout"]["shadow"] })
          }
        >
          <option value="none">{t.inspector.page.shadowOptions.none}</option>
          <option value="sm">{t.inspector.page.shadowOptions.sm}</option>
          <option value="md">{t.inspector.page.shadowOptions.md}</option>
        </SelectField>
      </FieldRow>
    </Accordion>
  );
}
