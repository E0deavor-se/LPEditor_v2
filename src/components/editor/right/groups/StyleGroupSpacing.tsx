"use client";

import Accordion from "@/src/components/editor/right/primitives/Accordion";
import FieldRow from "@/src/components/editor/right/primitives/FieldRow";
import NumberField from "@/src/components/editor/right/primitives/NumberField";
import type { PageBaseStyle } from "@/src/types/project";

type StyleGroupSpacingProps = {
  value: PageBaseStyle["spacing"];
  onChange: (patch: Partial<PageBaseStyle["spacing"]>) => void;
  defaultOpen?: boolean;
};

export default function StyleGroupSpacing({
  value,
  onChange,
  defaultOpen,
}: StyleGroupSpacingProps) {
  return (
    <Accordion title="スペーシング" defaultOpen={defaultOpen}>
      <div className="px-2">
        <div className="grid grid-cols-2 gap-2">
          <FieldRow label="上">
            <NumberField
              value={value.sectionPadding.t}
              ariaLabel="上"
              onChange={(next) =>
                onChange({
                  sectionPadding: { ...value.sectionPadding, t: next },
                })
              }
            />
          </FieldRow>
          <FieldRow label="右">
            <NumberField
              value={value.sectionPadding.r}
              ariaLabel="右"
              onChange={(next) =>
                onChange({
                  sectionPadding: { ...value.sectionPadding, r: next },
                })
              }
            />
          </FieldRow>
          <FieldRow label="下">
            <NumberField
              value={value.sectionPadding.b}
              ariaLabel="下"
              onChange={(next) =>
                onChange({
                  sectionPadding: { ...value.sectionPadding, b: next },
                })
              }
            />
          </FieldRow>
          <FieldRow label="左">
            <NumberField
              value={value.sectionPadding.l}
              ariaLabel="左"
              onChange={(next) =>
                onChange({
                  sectionPadding: { ...value.sectionPadding, l: next },
                })
              }
            />
          </FieldRow>
        </div>
      </div>
      <FieldRow label="セクション間隔">
        <NumberField
          value={value.sectionGap}
          ariaLabel="セクション間隔"
          onChange={(next) => onChange({ sectionGap: next })}
        />
      </FieldRow>
    </Accordion>
  );
}
