"use client";

import type { ReactNode } from "react";
import { LayoutGrid, Paintbrush } from "lucide-react";
import Accordion from "@/src/components/editor/right/primitives/Accordion";
import ColorField from "@/src/components/editor/right/primitives/ColorField";
import FieldRow from "@/src/components/editor/right/primitives/FieldRow";
import NumberField from "@/src/components/editor/right/primitives/NumberField";
import SegmentedField from "@/src/components/editor/right/primitives/SegmentedField";
import SelectField from "@/src/components/editor/right/primitives/SelectField";
import ToggleField from "@/src/components/editor/right/primitives/ToggleField";
import { useI18n } from "@/src/i18n";
import type { SectionStyle, SectionStylePatch } from "@/src/types/project";
import type {
  SectionCardPresetId,
  SectionCardStyle,
  SectionCardStylePatch,
} from "@/src/types/project";
import SectionCardPresetGallery from "@/src/components/editor/right/section/SectionCardPresetGallery";

type SectionStylePanelProps = {
  style: SectionStyle;
  cardStyle: SectionCardStyle;
  showSectionDesign?: boolean;
  showPeriodBarHeight?: boolean;
  surfaceExtras?: ReactNode;
  hideGradient?: boolean;
  hideTitleBand?: boolean;
  onStyleChange: (patch: SectionStylePatch) => void;
  onCardStyleChange: (patch: SectionCardStylePatch) => void;
  onApplyStyleToAll: () => void;
  onApplySectionDesignPreset: (presetId: SectionCardPresetId) => void;
  onResetSectionDesignPreset: (presetId: SectionCardPresetId) => void;
};

export default function SectionStylePanel({
  style,
  cardStyle,
  showSectionDesign = true,
  showPeriodBarHeight = false,
  surfaceExtras,
  hideGradient = false,
  hideTitleBand = false,
  onStyleChange,
  onCardStyleChange,
  onApplyStyleToAll,
  onApplySectionDesignPreset,
  onResetSectionDesignPreset,
}: SectionStylePanelProps) {
  const t = useI18n();
  const isGradient = style.background.type === "gradient";
  const bandSize =
    cardStyle.labelChipBg === "sm" || cardStyle.labelChipBg === "lg"
      ? cardStyle.labelChipBg
      : "md";
  const bandAlign =
    cardStyle.labelChipTextColor === "center" ||
    cardStyle.labelChipTextColor === "right"
      ? cardStyle.labelChipTextColor
      : "left";
  const bandPosition = cardStyle.labelChipEnabled ? "inset" : "top";

  return (
    <div className="flex flex-col gap-2">
      <div className="px-2">
        <button
          type="button"
          className="ui-button h-7 px-2 text-[11px]"
          onClick={onApplyStyleToAll}
        >
          全セクションに一括適用
        </button>
      </div>
      <Accordion title={t.inspector.section.groups.surface} icon={<Paintbrush size={14} />}>
        <FieldRow label="背景を透明にする">
          <ToggleField
            value={!!style.backgroundTransparent}
            ariaLabel="背景を透明にする"
            onChange={(next) => onStyleChange({ backgroundTransparent: next })}
          />
        </FieldRow>
        {!style.backgroundTransparent && (
          hideGradient ? (
            <FieldRow label={t.inspector.section.fields.background}>
              <ColorField
                value={style.background.color1}
                ariaLabel={t.inspector.section.fields.background}
                onChange={(next) =>
                  onStyleChange({ background: { color1: next } })
                }
              />
            </FieldRow>
          ) : (
            <>
              <FieldRow label={t.inspector.section.fields.gradient}>
                <ToggleField
                  value={isGradient}
                  ariaLabel={t.inspector.section.fields.gradient}
                  onChange={(next) =>
                    onStyleChange({
                      background: {
                        type: next ? "gradient" : "solid",
                      },
                    })
                  }
                />
              </FieldRow>
              {isGradient ? (
                <>
                  <FieldRow label={t.inspector.section.fields.color1}>
                    <ColorField
                      value={style.background.color1}
                      ariaLabel={t.inspector.section.fields.color1}
                      onChange={(next) =>
                        onStyleChange({ background: { color1: next } })
                      }
                    />
                  </FieldRow>
                  <FieldRow label={t.inspector.section.fields.color2}>
                    <ColorField
                      value={style.background.color2}
                      ariaLabel={t.inspector.section.fields.color2}
                      onChange={(next) =>
                        onStyleChange({ background: { color2: next } })
                      }
                    />
                  </FieldRow>
                </>
              ) : (
                <FieldRow label={t.inspector.section.fields.background}>
                  <ColorField
                    value={style.background.color1}
                    ariaLabel={t.inspector.section.fields.background}
                    onChange={(next) =>
                      onStyleChange({ background: { color1: next } })
                    }
                  />
                </FieldRow>
              )}
            </>
          )
        )}
        <FieldRow label={t.inspector.section.fields.border}>
          <ToggleField
            value={style.border.enabled}
            ariaLabel={t.inspector.section.fields.border}
            onChange={(next) => onStyleChange({ border: { enabled: next } })}
          />
        </FieldRow>
        {style.border.enabled ? (
          <>
            <FieldRow label={t.inspector.section.fields.borderWidth}>
              <NumberField
                value={style.border.width}
                min={0}
                max={12}
                step={1}
                ariaLabel={t.inspector.section.fields.borderWidth}
                onChange={(next) =>
                  onStyleChange({ border: { width: next } })
                }
              />
            </FieldRow>
            <FieldRow label={t.inspector.section.fields.borderColor}>
              <ColorField
                value={style.border.color}
                ariaLabel={t.inspector.section.fields.borderColor}
                onChange={(next) =>
                  onStyleChange({ border: { color: next } })
                }
              />
            </FieldRow>
          </>
        ) : null}
        <FieldRow label={t.inspector.section.fields.shadow}>
          <SelectField
            value={style.shadow}
            ariaLabel={t.inspector.section.fields.shadow}
            onChange={(next) =>
              onStyleChange({ shadow: next as SectionStyle["shadow"] })
            }
          >
            <option value="none">{t.inspector.section.shadowOptions.none}</option>
            <option value="sm">{t.inspector.section.shadowOptions.sm}</option>
            <option value="md">{t.inspector.section.shadowOptions.md}</option>
          </SelectField>
        </FieldRow>
        {hideTitleBand ? null : (
          <div className="mt-2 rounded-md border border-[var(--ui-border)]/60 bg-[var(--ui-panel)]/60 px-2 py-2">
            <div className="mb-2 text-[11px] font-semibold text-[var(--ui-text)]">
              タイトル帯
            </div>
            <FieldRow label="帯背景色">
              <ColorField
                value={cardStyle.headerBgColor || "#5fc2f5"}
                ariaLabel="帯背景色"
                onChange={(next) => onCardStyleChange({ headerBgColor: next })}
              />
            </FieldRow>
            <FieldRow label="帯文字色">
              <ColorField
                value={cardStyle.headerTextColor || "#ffffff"}
                ariaLabel="帯文字色"
                onChange={(next) => onCardStyleChange({ headerTextColor: next })}
              />
            </FieldRow>
            <FieldRow label="帯高さ">
              <SegmentedField
                value={bandSize}
                ariaLabel="帯高さ"
                options={[
                  { value: "sm", label: "S" },
                  { value: "md", label: "M" },
                  { value: "lg", label: "L" },
                ]}
                onChange={(next) => onCardStyleChange({ labelChipBg: next })}
              />
            </FieldRow>
            <FieldRow label="帯位置">
              <SegmentedField
                value={bandPosition}
                ariaLabel="帯位置"
                options={[
                  { value: "top", label: "上" },
                  { value: "inset", label: "内側" },
                ]}
                onChange={(next) =>
                  onCardStyleChange({ labelChipEnabled: next === "inset" })
                }
              />
            </FieldRow>
            <FieldRow label="テキスト位置">
              <SegmentedField
                value={bandAlign}
                ariaLabel="テキスト位置"
                options={[
                  { value: "left", label: "左" },
                  { value: "center", label: "中央" },
                  { value: "right", label: "右" },
                ]}
                onChange={(next) =>
                  onCardStyleChange({ labelChipTextColor: next })
                }
              />
            </FieldRow>
          </div>
        )}
        {surfaceExtras}
      </Accordion>

      {showSectionDesign ? (
        <Accordion title="セクションデザイン" icon={<LayoutGrid size={14} />}>
          <SectionCardPresetGallery
            sectionStyle={style}
            currentStyle={cardStyle}
            onSelect={onApplySectionDesignPreset}
            onReset={onResetSectionDesignPreset}
          />
        </Accordion>
      ) : null}

      <Accordion
        title={t.inspector.section.groups.layout}
        icon={<LayoutGrid size={14} />}
      >
        <FieldRow label={t.inspector.section.fields.fullWidth}>
          <ToggleField
            value={style.layout.fullWidth}
            ariaLabel={t.inspector.section.fields.fullWidth}
            onChange={(next) => onStyleChange({ layout: { fullWidth: next } })}
          />
        </FieldRow>
        <FieldRow label={t.inspector.section.fields.maxWidth}>
          <NumberField
            value={style.layout.maxWidth}
            min={320}
            max={1600}
            step={10}
            ariaLabel={t.inspector.section.fields.maxWidth}
            onChange={(next) => onStyleChange({ layout: { maxWidth: next } })}
          />
        </FieldRow>
        <FieldRow label={t.inspector.section.fields.align}>
          <SegmentedField
            value={style.layout.align}
            ariaLabel={t.inspector.section.fields.align}
            options={[
              { value: "left", label: t.inspector.section.alignOptions.left },
              { value: "center", label: t.inspector.section.alignOptions.center },
            ]}
            onChange={(next) =>
              onStyleChange({
                layout: { align: next as SectionStyle["layout"]["align"] },
              })
            }
          />
        </FieldRow>
        <FieldRow label={t.inspector.section.fields.radius}>
          <NumberField
            value={style.layout.radius}
            min={0}
            max={48}
            step={1}
            ariaLabel={t.inspector.section.fields.radius}
            onChange={(next) => onStyleChange({ layout: { radius: next } })}
          />
        </FieldRow>
        {showPeriodBarHeight ? (
          <FieldRow label="期間バー高さ">
            <NumberField
              value={style.layout.minHeight}
              min={0}
              max={200}
              step={2}
              ariaLabel="期間バー高さ"
              onChange={(next) =>
                onStyleChange({ layout: { minHeight: next } })
              }
            />
          </FieldRow>
        ) : null}
        <FieldRow label={t.inspector.section.fields.paddingTop}>
          <NumberField
            value={style.layout.padding.t}
            min={0}
            max={120}
            step={2}
            ariaLabel={t.inspector.section.fields.paddingTop}
            onChange={(next) =>
              onStyleChange({
                layout: { padding: { ...style.layout.padding, t: next } },
              })
            }
          />
        </FieldRow>
        <FieldRow label={t.inspector.section.fields.paddingRight}>
          <NumberField
            value={style.layout.padding.r}
            min={0}
            max={120}
            step={2}
            ariaLabel={t.inspector.section.fields.paddingRight}
            onChange={(next) =>
              onStyleChange({
                layout: { padding: { ...style.layout.padding, r: next } },
              })
            }
          />
        </FieldRow>
        <FieldRow label={t.inspector.section.fields.paddingBottom}>
          <NumberField
            value={style.layout.padding.b}
            min={0}
            max={120}
            step={2}
            ariaLabel={t.inspector.section.fields.paddingBottom}
            onChange={(next) =>
              onStyleChange({
                layout: { padding: { ...style.layout.padding, b: next } },
              })
            }
          />
        </FieldRow>
        <FieldRow label={t.inspector.section.fields.paddingLeft}>
          <NumberField
            value={style.layout.padding.l}
            min={0}
            max={120}
            step={2}
            ariaLabel={t.inspector.section.fields.paddingLeft}
            onChange={(next) =>
              onStyleChange({
                layout: { padding: { ...style.layout.padding, l: next } },
              })
            }
          />
        </FieldRow>
      </Accordion>

    </div>
  );
}
