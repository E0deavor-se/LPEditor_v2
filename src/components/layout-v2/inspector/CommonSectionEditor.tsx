"use client";

import InspectorSection from "@/src/components/inspector/InspectorSection";
import InspectorField from "@/src/components/inspector/InspectorField";
import InspectorFieldRow from "@/src/components/inspector/InspectorFieldRow";
import InspectorInput from "@/src/components/inspector/InspectorInput";
import InspectorColorInput from "@/src/components/inspector/InspectorColorInput";
import type { SectionBase } from "@/src/types/project";

type CommonSectionEditorProps = {
  section: SectionBase;
  disabled: boolean;
  onPatchStyle: (patch: Partial<SectionBase["style"]>) => void;
  onPatchCardStyle: (patch: Partial<NonNullable<SectionBase["sectionCardStyle"]>>) => void;
  onApplyAll: () => void;
};

export default function CommonSectionEditor({
  section,
  disabled,
  onPatchStyle,
  onPatchCardStyle,
  onApplyAll,
}: CommonSectionEditorProps) {
  const style = section.style;
  const card = section.sectionCardStyle;

  return (
    <div className="border-t border-[var(--ui-border)]/60">
      <InspectorSection title="基本">
        <InspectorField label="背景色">
          <InspectorColorInput
            value={style.background.color1 || "#ffffff"}
            onChange={(event) =>
              onPatchStyle({
                background: {
                  ...style.background,
                  type: "solid",
                  color1: event.target.value,
                  color2: event.target.value,
                },
              })
            }
            disabled={disabled}
          />
        </InspectorField>
        <InspectorField label="文字色">
          <InspectorColorInput
            value={style.typography.textColor || "#111111"}
            onChange={(event) =>
              onPatchStyle({
                typography: {
                  ...style.typography,
                  textColor: event.target.value,
                },
              })
            }
            disabled={disabled}
          />
        </InspectorField>
        <InspectorFieldRow>
          <InspectorField label="余白 上">
            <InspectorInput
              type="number"
              value={style.layout.padding.t}
              min={0}
              step={1}
              onChange={(event) =>
                onPatchStyle({
                  layout: {
                    ...style.layout,
                    padding: {
                      ...style.layout.padding,
                      t: Number(event.target.value || 0),
                    },
                  },
                })
              }
              disabled={disabled}
            />
          </InspectorField>
          <InspectorField label="余白 下">
            <InspectorInput
              type="number"
              value={style.layout.padding.b}
              min={0}
              step={1}
              onChange={(event) =>
                onPatchStyle({
                  layout: {
                    ...style.layout,
                    padding: {
                      ...style.layout.padding,
                      b: Number(event.target.value || 0),
                    },
                  },
                })
              }
              disabled={disabled}
            />
          </InspectorField>
        </InspectorFieldRow>
        <InspectorFieldRow>
          <InspectorField label="最小高">
            <InspectorInput
              type="number"
              value={style.layout.minHeight}
              min={0}
              step={1}
              onChange={(event) =>
                onPatchStyle({
                  layout: {
                    ...style.layout,
                    minHeight: Number(event.target.value || 0),
                  },
                })
              }
              disabled={disabled}
            />
          </InspectorField>
          <InspectorField label="角丸">
            <InspectorInput
              type="number"
              value={style.layout.radius}
              min={0}
              step={1}
              onChange={(event) =>
                onPatchStyle({
                  layout: {
                    ...style.layout,
                    radius: Number(event.target.value || 0),
                  },
                })
              }
              disabled={disabled}
            />
          </InspectorField>
        </InspectorFieldRow>
      </InspectorSection>

      <InspectorSection title="帯・枠線">
        <InspectorField label="帯背景">
          <InspectorColorInput
            value={card?.headerBgColor ?? "#EB5505"}
            onChange={(event) => onPatchCardStyle({ headerBgColor: event.target.value })}
            disabled={disabled}
          />
        </InspectorField>
        <InspectorField label="帯文字">
          <InspectorColorInput
            value={card?.headerTextColor ?? "#ffffff"}
            onChange={(event) => onPatchCardStyle({ headerTextColor: event.target.value })}
            disabled={disabled}
          />
        </InspectorField>
        <InspectorFieldRow>
          <InspectorField label="枠線幅">
            <InspectorInput
              type="number"
              value={style.border.width}
              min={0}
              step={1}
              onChange={(event) =>
                onPatchStyle({
                  border: {
                    ...style.border,
                    width: Number(event.target.value || 0),
                    enabled: Number(event.target.value || 0) > 0,
                  },
                })
              }
              disabled={disabled}
            />
          </InspectorField>
          <InspectorField label="枠線色">
            <InspectorColorInput
              value={style.border.color || "#d1d5db"}
              onChange={(event) =>
                onPatchStyle({
                  border: {
                    ...style.border,
                    color: event.target.value,
                    enabled: true,
                  },
                })
              }
              disabled={disabled}
            />
          </InspectorField>
        </InspectorFieldRow>
      </InspectorSection>

      <div className="px-3 py-3">
        <button
          type="button"
          className="ui-button h-8 w-full text-[11px]"
          onClick={onApplyAll}
          disabled={disabled}
        >
          この見た目を全セクションに適用
        </button>
      </div>
    </div>
  );
}
