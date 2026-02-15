"use client";

import Accordion from "@/src/components/editor/right/primitives/Accordion";
import FieldRow from "@/src/components/editor/right/primitives/FieldRow";
import NumberField from "@/src/components/editor/right/primitives/NumberField";
import SelectField from "@/src/components/editor/right/primitives/SelectField";
import type { PageBaseStyle } from "@/src/types/project";

type StyleGroupLayoutProps = {
  value: PageBaseStyle["layout"];
  onChange: (patch: Partial<PageBaseStyle["layout"]>) => void;
  defaultOpen?: boolean;
};

export default function StyleGroupLayout({
  value,
  onChange,
  defaultOpen,
}: StyleGroupLayoutProps) {
  return (
    <Accordion title="レイアウト" defaultOpen={defaultOpen}>
      <FieldRow label="最大幅">
        <NumberField
          value={value.maxWidth}
          ariaLabel="最大幅"
          onChange={(next) => onChange({ maxWidth: next })}
        />
      </FieldRow>
      <FieldRow label="配置">
        <SelectField
          value={value.align}
          ariaLabel="配置"
          onChange={(next) =>
            onChange({ align: next as PageBaseStyle["layout"]["align"] })
          }
        >
          <option value="left">左</option>
          <option value="center">中央</option>
        </SelectField>
      </FieldRow>
      <FieldRow label="角丸">
        <NumberField
          value={value.radius}
          ariaLabel="角丸"
          onChange={(next) => onChange({ radius: next })}
        />
      </FieldRow>
      <FieldRow label="影">
        <SelectField
          value={value.shadow}
          ariaLabel="影"
          onChange={(next) =>
            onChange({ shadow: next as PageBaseStyle["layout"]["shadow"] })
          }
        >
          <option value="none">なし</option>
          <option value="sm">小</option>
          <option value="md">中</option>
        </SelectField>
      </FieldRow>
    </Accordion>
  );
}
