"use client";

import { Ruler } from "lucide-react";
import Accordion from "@/src/components/editor/right/primitives/Accordion";
import FieldRow from "@/src/components/editor/right/primitives/FieldRow";
import NumberField from "@/src/components/editor/right/primitives/NumberField";
import type { PageBaseStyle } from "@/src/types/project";
import { useI18n } from "@/src/i18n";

type PageStyleSpacingProps = {
  value: PageBaseStyle["spacing"];
  onChange: (patch: Partial<PageBaseStyle["spacing"]>) => void;
  defaultOpen?: boolean;
};

export default function PageStyleSpacing({
  value,
  onChange,
  defaultOpen,
}: PageStyleSpacingProps) {
  const t = useI18n();
  return (
    <Accordion
      title={t.inspector.page.groups.spacing}
      icon={<Ruler size={14} />}
      defaultOpen={defaultOpen}
    >
      <div className="flex items-start gap-2 px-2 text-[12px]">
        <div className="mt-1 w-[110px] shrink-0 text-[12px] text-[var(--ui-muted)]">
          {t.inspector.page.fields.sectionPadding}
        </div>
        <div className="grid flex-1 grid-cols-2 gap-2">
          <div className="flex items-center gap-2">
            <span className="w-6 text-[11px] text-[var(--ui-muted)]">
              {t.inspector.page.paddingLabels.top}
            </span>
            <NumberField
              value={value.sectionPadding.t}
              min={0}
              max={128}
              step={1}
              ariaLabel={t.inspector.page.paddingLabels.top}
              onChange={(next) =>
                onChange({
                  sectionPadding: { ...value.sectionPadding, t: next },
                })
              }
            />
          </div>
          <div className="flex items-center gap-2">
            <span className="w-6 text-[11px] text-[var(--ui-muted)]">
              {t.inspector.page.paddingLabels.right}
            </span>
            <NumberField
              value={value.sectionPadding.r}
              min={0}
              max={128}
              step={1}
              ariaLabel={t.inspector.page.paddingLabels.right}
              onChange={(next) =>
                onChange({
                  sectionPadding: { ...value.sectionPadding, r: next },
                })
              }
            />
          </div>
          <div className="flex items-center gap-2">
            <span className="w-6 text-[11px] text-[var(--ui-muted)]">
              {t.inspector.page.paddingLabels.bottom}
            </span>
            <NumberField
              value={value.sectionPadding.b}
              min={0}
              max={128}
              step={1}
              ariaLabel={t.inspector.page.paddingLabels.bottom}
              onChange={(next) =>
                onChange({
                  sectionPadding: { ...value.sectionPadding, b: next },
                })
              }
            />
          </div>
          <div className="flex items-center gap-2">
            <span className="w-6 text-[11px] text-[var(--ui-muted)]">
              {t.inspector.page.paddingLabels.left}
            </span>
            <NumberField
              value={value.sectionPadding.l}
              min={0}
              max={128}
              step={1}
              ariaLabel={t.inspector.page.paddingLabels.left}
              onChange={(next) =>
                onChange({
                  sectionPadding: { ...value.sectionPadding, l: next },
                })
              }
            />
          </div>
        </div>
      </div>
      <FieldRow label={t.inspector.page.fields.sectionGap}>
        <NumberField
          value={value.sectionGap}
          min={0}
          max={128}
          step={1}
          ariaLabel={t.inspector.page.fields.sectionGap}
          onChange={(next) => onChange({ sectionGap: next })}
        />
      </FieldRow>
    </Accordion>
  );
}
