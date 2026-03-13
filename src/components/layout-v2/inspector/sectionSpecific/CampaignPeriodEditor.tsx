"use client";

import InspectorSection from "@/src/components/inspector/InspectorSection";
import InspectorField from "@/src/components/inspector/InspectorField";
import InspectorFieldRow from "@/src/components/inspector/InspectorFieldRow";
import InspectorInput from "@/src/components/inspector/InspectorInput";
import InspectorColorInput from "@/src/components/inspector/InspectorColorInput";
import InspectorTextarea from "@/src/components/inspector/InspectorTextarea";
import SectionAppearanceEditor from "@/src/components/layout-v2/inspector/sectionSpecific/SectionAppearanceEditor";
import type { SectionBase } from "@/src/types/project";

type CampaignPeriodEditorProps = {
  section: SectionBase;
  disabled: boolean;
  onPatchData: (patch: Record<string, unknown>) => void;
  onRenameSection?: (name: string) => void;
};

export default function CampaignPeriodEditor({
  section,
  disabled,
  onPatchData,
  onRenameSection,
}: CampaignPeriodEditorProps) {
  const data = section.data as Record<string, unknown>;
  const periodBarText = typeof data.periodBarText === "string" ? data.periodBarText : "";
  const periodLabel = typeof data.periodLabel === "string" ? data.periodLabel : "キャンペーン期間";
  const startDate = typeof data.startDate === "string" ? data.startDate : "";
  const endDate = typeof data.endDate === "string" ? data.endDate : "";
  const showWeekday = data.showWeekday !== false;
  const allowWrap = data.allowWrap !== false;
  const fullWidth = data.fullWidth !== false;
  const periodBarStyle =
    (data.periodBarStyle as {
      bold?: boolean;
      color?: string;
      background?: string;
      labelColor?: string;
      size?: number;
      paddingX?: number;
      paddingY?: number;
      shadow?: "none" | "soft";
      advancedStyleText?: string;
    }) ?? {};

  return (
    <div className="border-t border-[var(--ui-border)]/60">
      <InspectorSection title="基本">
        <InspectorField label="セクション名">
          <InspectorInput
            type="text"
            value={String(section.name ?? "")}
            onChange={(event) => onRenameSection?.(event.target.value)}
            disabled={disabled}
          />
        </InspectorField>
        <InspectorField label="期間ラベル">
          <InspectorInput
            type="text"
            value={periodLabel}
            onChange={(event) => onPatchData({ periodLabel: event.target.value })}
            disabled={disabled}
          />
        </InspectorField>
      </InspectorSection>

      <InspectorSection title="期間">
        <InspectorFieldRow>
          <InspectorField label="開始日">
            <InspectorInput
              type="date"
              value={startDate}
              onChange={(event) => onPatchData({ startDate: event.target.value })}
              disabled={disabled}
            />
          </InspectorField>
          <InspectorField label="終了日">
            <InspectorInput
              type="date"
              value={endDate}
              onChange={(event) => onPatchData({ endDate: event.target.value })}
              disabled={disabled}
            />
          </InspectorField>
        </InspectorFieldRow>
      </InspectorSection>

      <InspectorSection title="表示">
        <InspectorFieldRow>
          <InspectorField label="曜日表示">
            <input
              type="checkbox"
              className="h-4 w-4"
              checked={showWeekday}
              onChange={(event) =>
                onPatchData({ showWeekday: event.target.checked })
              }
              disabled={disabled}
            />
          </InspectorField>
          <InspectorField label="折り返し許可">
            <input
              type="checkbox"
              className="h-4 w-4"
              checked={allowWrap}
              onChange={(event) => onPatchData({ allowWrap: event.target.checked })}
              disabled={disabled}
            />
          </InspectorField>
        </InspectorFieldRow>
        <InspectorField label="フル幅">
          <input
            type="checkbox"
            className="h-4 w-4"
            checked={fullWidth}
            onChange={(event) => onPatchData({ fullWidth: event.target.checked })}
            disabled={disabled}
          />
        </InspectorField>
      </InspectorSection>

      <InspectorSection title="デザイン">
        <InspectorFieldRow>
          <InspectorField label="背景色">
            <InspectorColorInput
              value={periodBarStyle.background ?? "#EB5505"}
              onChange={(event) =>
                onPatchData({ periodBarStyle: { ...periodBarStyle, background: event.target.value } })
              }
              disabled={disabled}
            />
          </InspectorField>
          <InspectorField label="文字色">
            <InspectorColorInput
              value={periodBarStyle.color ?? "#FFFFFF"}
              onChange={(event) =>
                onPatchData({ periodBarStyle: { ...periodBarStyle, color: event.target.value } })
              }
              disabled={disabled}
            />
          </InspectorField>
        </InspectorFieldRow>
        <InspectorField label="ラベル文字色">
          <InspectorColorInput
            value={periodBarStyle.labelColor ?? periodBarStyle.color ?? "#FFFFFF"}
            onChange={(event) =>
              onPatchData({ periodBarStyle: { ...periodBarStyle, labelColor: event.target.value } })
            }
            disabled={disabled}
          />
        </InspectorField>
      </InspectorSection>

      <InspectorSection title="詳細設定" defaultOpen={false}>
        <InspectorFieldRow>
          <InspectorField label="左右余白(px)">
            <InspectorInput
              type="number"
              value={periodBarStyle.paddingX ?? 18}
              min={0}
              max={48}
              step={1}
              onChange={(event) =>
                onPatchData({
                  periodBarStyle: {
                    ...periodBarStyle,
                    paddingX: Number(event.target.value || 0),
                  },
                })
              }
              disabled={disabled}
            />
          </InspectorField>
          <InspectorField label="上下余白(px)">
            <InspectorInput
              type="number"
              value={periodBarStyle.paddingY ?? 0}
              min={0}
              max={24}
              step={1}
              onChange={(event) =>
                onPatchData({
                  periodBarStyle: {
                    ...periodBarStyle,
                    paddingY: Number(event.target.value || 0),
                  },
                })
              }
              disabled={disabled}
            />
          </InspectorField>
        </InspectorFieldRow>
        <InspectorFieldRow>
          <InspectorField label="影">
            <select
              className="ui-input h-7 w-full text-[12px]"
              value={periodBarStyle.shadow ?? "none"}
              onChange={(event) =>
                onPatchData({
                  periodBarStyle: {
                    ...periodBarStyle,
                    shadow: event.target.value === "soft" ? "soft" : "none",
                  },
                })
              }
              disabled={disabled}
            >
              <option value="none">なし</option>
              <option value="soft">薄く</option>
            </select>
          </InspectorField>
          <InspectorField label="文字サイズ(px)">
            <InspectorInput
              type="number"
              value={periodBarStyle.size ?? 14}
              min={10}
              max={32}
              step={1}
              onChange={(event) =>
                onPatchData({
                  periodBarStyle: {
                    ...periodBarStyle,
                    size: Number(event.target.value || 14),
                  },
                })
              }
              disabled={disabled}
            />
          </InspectorField>
        </InspectorFieldRow>
        <InspectorField label="periodBarText フォールバック">
          <InspectorInput
            type="text"
            value={periodBarText}
            onChange={(event) => onPatchData({ periodBarText: event.target.value })}
            disabled={disabled}
          />
        </InspectorField>
        <InspectorField label="高度な style (宣言を;区切り)">
          <InspectorTextarea
            rows={4}
            value={periodBarStyle.advancedStyleText ?? ""}
            onChange={(event) =>
              onPatchData({
                periodBarStyle: {
                  ...periodBarStyle,
                  advancedStyleText: event.target.value,
                },
              })
            }
            disabled={disabled}
          />
        </InspectorField>
      </InspectorSection>

      <SectionAppearanceEditor
        section={section}
        disabled={disabled}
        onPatchData={onPatchData}
      />
    </div>
  );
}
