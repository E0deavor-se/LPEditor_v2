"use client";

import { Palette } from "lucide-react";
import Accordion from "@/src/components/editor/right/primitives/Accordion";
import ColorField from "@/src/components/editor/right/primitives/ColorField";
import FieldRow from "@/src/components/editor/right/primitives/FieldRow";
import type { PageBaseStyle } from "@/src/types/project";
import { useI18n } from "@/src/i18n";

type PageStyleColorsProps = {
  value: PageBaseStyle["colors"];
  onChange: (patch: Partial<PageBaseStyle["colors"]>) => void;
  defaultOpen?: boolean;
};

export default function PageStyleColors({
  value,
  onChange,
  defaultOpen,
}: PageStyleColorsProps) {
  const t = useI18n();
  return (
    <Accordion
      title={t.inspector.page.groups.colors}
      icon={<Palette size={14} />}
      defaultOpen={defaultOpen}
    >
      <FieldRow label={t.inspector.page.fields.background}>
        <ColorField
          value={value.background}
          ariaLabel={t.inspector.page.fields.background}
          onChange={(next) => onChange({ background: next })}
        />
      </FieldRow>
      <FieldRow label={t.inspector.page.fields.text}>
        <ColorField
          value={value.text}
          ariaLabel={t.inspector.page.fields.text}
          onChange={(next) => onChange({ text: next })}
        />
      </FieldRow>
      <FieldRow label={t.inspector.page.fields.accent}>
        <ColorField
          value={value.accent}
          ariaLabel={t.inspector.page.fields.accent}
          onChange={(next) => onChange({ accent: next })}
        />
      </FieldRow>
      <FieldRow label={t.inspector.page.fields.border}>
        <ColorField
          value={value.border}
          ariaLabel={t.inspector.page.fields.border}
          onChange={(next) => onChange({ border: next })}
        />
      </FieldRow>
    </Accordion>
  );
}
