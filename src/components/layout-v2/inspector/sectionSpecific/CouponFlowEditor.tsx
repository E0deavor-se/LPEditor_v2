"use client";

import { useRef, useState, type SyntheticEvent } from "react";
import InspectorSection from "@/src/components/inspector/InspectorSection";
import InspectorField from "@/src/components/inspector/InspectorField";
import InspectorInput from "@/src/components/inspector/InspectorInput";
import InspectorSelect from "@/src/components/inspector/InspectorSelect";
import InspectorColorInput from "@/src/components/inspector/InspectorColorInput";
import SectionAppearanceEditor from "@/src/components/layout-v2/inspector/sectionSpecific/SectionAppearanceEditor";
import SectionOptionalBlocksEditor from "@/src/components/layout-v2/inspector/sectionSpecific/SectionOptionalBlocksEditor";
import { useTextSelection } from "@/src/components/editor/TextSelectionContext";
import type { ButtonContentItem, ContentItem, SectionBase } from "@/src/types/project";

type CouponFlowVariant = "slideshow" | "stepCards" | "timeline" | "simpleList";

type CouponFlowStep = {
  id: string;
  stepNo: string;
  title: string;
  description: string;
  imageUrl: string;
  imageAlt: string;
  imageAssetId: string;
};

type CouponFlowEditorProps = {
  section: SectionBase;
  disabled: boolean;
  onPatchData: (patch: Record<string, unknown>) => void;
  onPatchContent: (patch: {
    items?: ContentItem[];
    buttons?: Array<{ id: string; label: string; href: string; variant?: "primary" | "secondary" }>;
    media?: Array<{ id: string; imageUrl: string; alt?: string; caption?: string; width?: number; align?: "left" | "center" | "right" }>;
  }) => void;
  onPatchButtonItem: (itemId: string, patch: Partial<ButtonContentItem>) => void;
  addAsset: (asset: { filename: string; data: string }) => string;
  onRenameSection?: (name: string) => void;
};

const createId = (prefix: string) => `${prefix}_${Math.random().toString(36).slice(2, 10)}`;
const reorderArray = <T,>(arr: T[], from: number, to: number) => {
  const next = [...arr];
  const [moved] = next.splice(from, 1);
  next.splice(to, 0, moved);
  return next;
};

const readFileAsDataUrl = (file: File) =>
  new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result ?? ""));
    reader.onerror = () => reject(reader.error ?? new Error("Failed to read file"));
    reader.readAsDataURL(file);
  });

const BUTTON_PRESET_OPTIONS = [
  { value: "default", label: "基本" },
  { value: "secondary", label: "セカンダリ" },
  { value: "couponFlow", label: "クーポン利用方法" },
  { value: "block", label: "ブロック" },
  { value: "pill", label: "ピル" },
  { value: "dark", label: "ダーク" },
  { value: "light", label: "ライト" },
  { value: "slate", label: "スレート" },
  { value: "ghost", label: "ゴースト" },
  { value: "outlineDark", label: "アウトライン(ダーク)" },
  { value: "success", label: "成功" },
  { value: "warning", label: "警告" },
  { value: "danger", label: "危険" },
  { value: "ocean", label: "オーシャン" },
  { value: "violet", label: "バイオレット" },
  { value: "rose", label: "ローズ" },
  { value: "lime", label: "ライム" },
];

const BUTTON_PRESET_VISUALS: Record<
  string,
  { bg: string; text: string; border: string; radius: number }
> = {
  default: { bg: "#eb5505", text: "#ffffff", border: "#eb5505", radius: 999 },
  secondary: { bg: "transparent", text: "#eb5505", border: "#eb5505", radius: 999 },
  couponFlow: { bg: "#ea5504", text: "#ffffff", border: "#ffffff", radius: 999 },
  block: { bg: "#eb5505", text: "#ffffff", border: "#eb5505", radius: 10 },
  pill: { bg: "#0ea5e9", text: "#ffffff", border: "#0ea5e9", radius: 999 },
  dark: { bg: "#0f172a", text: "#ffffff", border: "#0f172a", radius: 8 },
  light: { bg: "#f8fafc", text: "#0f172a", border: "#e2e8f0", radius: 8 },
  slate: { bg: "#334155", text: "#ffffff", border: "#334155", radius: 8 },
  ghost: { bg: "transparent", text: "#eb5505", border: "#eb5505", radius: 8 },
  outlineDark: { bg: "transparent", text: "#0f172a", border: "#0f172a", radius: 8 },
  success: { bg: "#16a34a", text: "#ffffff", border: "#16a34a", radius: 8 },
  warning: { bg: "#f59e0b", text: "#111827", border: "#f59e0b", radius: 8 },
  danger: { bg: "#dc2626", text: "#ffffff", border: "#dc2626", radius: 8 },
  ocean: { bg: "#0891b2", text: "#ffffff", border: "#0891b2", radius: 8 },
  violet: { bg: "#7c3aed", text: "#ffffff", border: "#7c3aed", radius: 8 },
  rose: { bg: "#e11d48", text: "#ffffff", border: "#e11d48", radius: 8 },
  lime: { bg: "#84cc16", text: "#1f2937", border: "#84cc16", radius: 8 },
};

const resolvePresetVisual = (presetId: string) =>
  BUTTON_PRESET_VISUALS[presetId] ?? BUTTON_PRESET_VISUALS.default;

export default function CouponFlowEditor({
  section,
  disabled,
  onPatchData,
  onPatchContent,
  onPatchButtonItem,
  addAsset,
  onRenameSection,
}: CouponFlowEditorProps) {
  const { saveSelection } = useTextSelection();
  const data = section.data as Record<string, unknown>;
  const items = section.content?.items ?? [];
  const titleItem = items.find((item) => item.type === "title");
  const primaryButton = items.find((item) => item.type === "button") as ButtonContentItem | undefined;

  const rawVariant = String(data.variant ?? "slideshow");
  const variant: CouponFlowVariant =
    rawVariant === "stepCards" || rawVariant === "timeline" || rawVariant === "simpleList"
      ? rawVariant
      : "slideshow";

  const steps: CouponFlowStep[] = Array.isArray(data.steps)
    ? (data.steps as Array<Record<string, unknown>>).map((step, index) => ({
        id: String(step.id ?? createId("coupon_step")),
        stepNo: String(step.stepNo ?? index + 1),
        title: String(step.title ?? `ステップ${index + 1}`),
        description: String(step.description ?? ""),
        imageUrl: String(step.imageUrl ?? ""),
        imageAlt: String(step.imageAlt ?? ""),
        imageAssetId: String(step.imageAssetId ?? ""),
      }))
    : [];

  const patchSteps = (nextSteps: CouponFlowStep[]) => {
    const normalized = nextSteps.map((step, index) => ({
      ...step,
      stepNo: String(index + 1),
      title: step.title || `ステップ${index + 1}`,
    }));
    onPatchData({ steps: normalized });
  };

  const patchStep = (index: number, patch: Partial<CouponFlowStep>) => {
    patchSteps(steps.map((entry, idx) => (idx === index ? { ...entry, ...patch } : entry)));
  };

  const uploadRef = useRef<HTMLInputElement | null>(null);
  const [uploadingStepIndex, setUploadingStepIndex] = useState<number | null>(null);

  const ctaEnabled = data.ctaEnabled !== false;
  const buttonLabel = String(data.buttonLabel ?? primaryButton?.label ?? "クーポンを獲得する");
  const buttonUrl = String(
    data.buttonUrl ??
      (primaryButton?.target.kind === "url" ? primaryButton.target.url : "")
  );
  const buttonPreset = String(data.buttonPreset ?? primaryButton?.style?.presetId ?? "couponFlow");
  const buttonVariant =
    String(data.buttonVariant ?? primaryButton?.variant ?? "primary") === "secondary"
      ? "secondary"
      : "primary";
  const buttonBg = String(data.buttonBg ?? primaryButton?.style?.backgroundColor ?? "#ea5504");
  const buttonTextColor = String(data.buttonTextColor ?? primaryButton?.style?.textColor ?? "#ffffff");
  const buttonBorderColor = String(data.buttonBorderColor ?? primaryButton?.style?.borderColor ?? "#ffffff");
  const buttonRadius = Number(data.buttonRadius ?? primaryButton?.style?.radius ?? 999);
  const buttonShadow = String(data.buttonShadow ?? "0 6px 14px rgba(0, 0, 0, 0.18)");

  const patchButtonData = (patch: Record<string, unknown>) => onPatchData(patch);

  const patchHeading = (nextHeading: string) => {
    onPatchData({ title: nextHeading });
    if (titleItem && titleItem.type === "title") {
      onPatchContent({
        items: items.map((item) =>
          item.id === titleItem.id && item.type === "title"
            ? { ...item, text: nextHeading }
            : item
        ),
      });
      return;
    }
    onPatchContent({
      items: [
        {
          id: createId("item"),
          type: "title",
          text: nextHeading,
        },
        ...items,
      ],
    });
  };

  const syncPrimaryButton = (patch: Partial<ButtonContentItem>) => {
    if (!primaryButton) {
      return;
    }
    onPatchButtonItem(primaryButton.id, patch);
    if (patch.label || patch.target) {
      onPatchContent({
        items: items.map((item) =>
          item.id === primaryButton.id && item.type === "button" ? { ...item, ...patch } : item
        ),
      });
    }
  };

  const slideshow =
    data.slideshow && typeof data.slideshow === "object"
      ? (data.slideshow as Record<string, unknown>)
      : {};
  const animation =
    data.couponFlowAnimation && typeof data.couponFlowAnimation === "object"
      ? (data.couponFlowAnimation as Record<string, unknown>)
      : {};

  const captureSelection = (event: SyntheticEvent<HTMLDivElement>) => {
    saveSelection(section.id, event.target as EventTarget | null);
  };

  return (
    <div
      className="border-t border-[var(--ui-border)]/60"
      onMouseUpCapture={captureSelection}
      onKeyUpCapture={captureSelection}
    >
      <InspectorSection title="基本">
        <InspectorField label="セクション名">
          <InspectorInput
            type="text"
            value={String(section.name ?? "")}
            onChange={(event) => onRenameSection?.(event.target.value)}
            disabled={disabled}
          />
        </InspectorField>
        <InspectorField label="見出し">
          <InspectorInput
            type="text"
            value={
              titleItem && titleItem.type === "title"
                ? String(titleItem.text ?? "")
                : String(data.title ?? "")
            }
            onChange={(event) => patchHeading(event.target.value)}
            disabled={disabled}
          />
        </InspectorField>
        <label className="ui-field">
          <span className="ui-field-label">リード文</span>
          <textarea
            className="ui-textarea min-h-[90px] text-[12px]"
            value={String(data.lead ?? "")}
            onChange={(event) => onPatchData({ lead: event.target.value })}
            disabled={disabled}
          />
        </label>
        <InspectorField label="注意文言">
          <InspectorInput
            type="text"
            value={String(data.note ?? "")}
            onChange={(event) => onPatchData({ note: event.target.value })}
            disabled={disabled}
          />
        </InspectorField>
      </InspectorSection>

      <InspectorSection title="表示形式">
        <InspectorField label="表示タイプ">
          <InspectorSelect
            value={variant}
            onChange={(event) => onPatchData({ variant: event.target.value })}
            disabled={disabled}
          >
            <option value="slideshow">スライドショー</option>
            <option value="stepCards">手順カード</option>
            <option value="timeline">タイムライン</option>
            <option value="simpleList">簡易一覧</option>
          </InspectorSelect>
        </InspectorField>
      </InspectorSection>

      <InspectorSection title="ステップ">
        <input
          ref={uploadRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={async (event) => {
            const file = event.target.files?.[0];
            if (!file || uploadingStepIndex == null) {
              return;
            }
            const dataUrl = await readFileAsDataUrl(file);
            const assetId = addAsset({ filename: file.name, data: dataUrl });
            patchStep(uploadingStepIndex, {
              imageUrl: dataUrl,
              imageAssetId: assetId,
              imageAlt: file.name,
            });
            setUploadingStepIndex(null);
            event.target.value = "";
          }}
        />

        <button
          type="button"
          className="ui-button h-7 px-2 text-[11px]"
          onClick={() =>
            patchSteps([
              ...steps,
              {
                id: createId("coupon_step"),
                stepNo: String(steps.length + 1),
                title: `ステップ${steps.length + 1}`,
                description: "",
                imageUrl: "",
                imageAlt: "",
                imageAssetId: "",
              },
            ])
          }
          disabled={disabled}
        >
          ステップを追加
        </button>

        <div className="mt-2 space-y-2">
          {steps.length === 0 ? (
            <div className="text-[11px] text-[var(--ui-muted)]">ステップがありません。</div>
          ) : (
            steps.map((step, index) => (
              <div key={step.id} className="rounded-md border border-[var(--ui-border)]/60 p-2">
                <div className="mb-2 flex items-center justify-between">
                  <span className="text-[11px] text-[var(--ui-muted)]">ステップ {index + 1}</span>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      className="ui-button h-6 w-6 px-0"
                      onClick={() => patchSteps(reorderArray(steps, index, index - 1))}
                      disabled={disabled || index === 0}
                    >
                      ↑
                    </button>
                    <button
                      type="button"
                      className="ui-button h-6 w-6 px-0"
                      onClick={() => patchSteps(reorderArray(steps, index, index + 1))}
                      disabled={disabled || index >= steps.length - 1}
                    >
                      ↓
                    </button>
                    <button
                      type="button"
                      className="ui-button h-6 w-6 px-0"
                      onClick={() => patchSteps(steps.filter((_entry, idx) => idx !== index))}
                      disabled={disabled}
                    >
                      ×
                    </button>
                  </div>
                </div>

                <div className="mb-2 rounded border border-[var(--ui-border)]/60 p-2 text-[11px]">
                  <div className="mb-1 text-[var(--ui-muted)]">画像</div>
                  <div className="mb-1 truncate text-[var(--ui-text)]">{step.imageUrl || "未設定"}</div>
                  <button
                    type="button"
                    className="ui-button h-7 px-2 text-[11px]"
                    onClick={() => {
                      setUploadingStepIndex(index);
                      uploadRef.current?.click();
                    }}
                    disabled={disabled}
                  >
                    画像を選択
                  </button>
                </div>

                <label className="ui-field">
                  <span className="ui-field-label">説明文</span>
                  <textarea
                    className="ui-textarea min-h-[70px] text-[12px]"
                    value={step.description}
                    onChange={(event) => patchStep(index, { description: event.target.value })}
                    disabled={disabled}
                  />
                </label>
              </div>
            ))
          )}
        </div>
      </InspectorSection>

      <InspectorSection title="ボタン">
        <label className="flex items-center justify-between rounded border border-[var(--ui-border)]/60 px-2 py-1 text-[11px]">
          <span className="text-[var(--ui-muted)]">表示</span>
          <input
            type="checkbox"
            className="h-4 w-4"
            checked={ctaEnabled}
            onChange={(event) => patchButtonData({ ctaEnabled: event.target.checked })}
            disabled={disabled}
          />
        </label>

        <InspectorField label="文言">
          <InspectorInput
            type="text"
            value={buttonLabel}
            onChange={(event) => {
              patchButtonData({ buttonLabel: event.target.value });
              syncPrimaryButton({ label: event.target.value });
            }}
            disabled={disabled}
          />
        </InspectorField>

        <InspectorField label="リンク">
          <InspectorInput
            type="text"
            value={buttonUrl}
            onChange={(event) => {
              patchButtonData({ buttonUrl: event.target.value });
              syncPrimaryButton({ target: { kind: "url", url: event.target.value } });
            }}
            disabled={disabled}
          />
        </InspectorField>

        <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
          <InspectorField label="デザイン">
            <InspectorSelect
              value={buttonPreset}
              onChange={(event) => {
                const nextPreset = event.target.value;
                const visual = resolvePresetVisual(nextPreset);
                patchButtonData({
                  buttonPreset: nextPreset,
                  buttonBg: visual.bg,
                  buttonTextColor: visual.text,
                  buttonBorderColor: visual.border,
                  buttonRadius: visual.radius,
                });
                if (primaryButton) {
                  onPatchButtonItem(primaryButton.id, {
                    style: {
                      ...(primaryButton.style ?? {}),
                      presetId: nextPreset,
                      backgroundColor: visual.bg,
                      textColor: visual.text,
                      borderColor: visual.border,
                      radius: visual.radius,
                    },
                  });
                }
              }}
              disabled={disabled}
            >
              {BUTTON_PRESET_OPTIONS.map((preset) => (
                <option key={preset.value} value={preset.value}>
                  {preset.label}
                </option>
              ))}
            </InspectorSelect>
          </InspectorField>

          <InspectorField label="バリアント">
            <InspectorSelect
              value={buttonVariant}
              onChange={(event) => {
                const next = event.target.value === "secondary" ? "secondary" : "primary";
                patchButtonData({ buttonVariant: next });
                syncPrimaryButton({ variant: next });
              }}
              disabled={disabled}
            >
              <option value="primary">primary</option>
              <option value="secondary">secondary</option>
            </InspectorSelect>
          </InspectorField>
        </div>
      </InspectorSection>

      <InspectorSection title="詳細設定" defaultOpen={false}>
        <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
          <label className="flex items-center justify-between rounded border border-[var(--ui-border)]/60 px-2 py-1 text-[11px]">
            <span className="text-[var(--ui-muted)]">autoplay</span>
            <input
              type="checkbox"
              className="h-4 w-4"
              checked={slideshow.autoplay !== false}
              onChange={(event) =>
                onPatchData({ slideshow: { ...slideshow, autoplay: event.target.checked } })
              }
              disabled={disabled}
            />
          </label>
          <label className="flex items-center justify-between rounded border border-[var(--ui-border)]/60 px-2 py-1 text-[11px]">
            <span className="text-[var(--ui-muted)]">loop</span>
            <input
              type="checkbox"
              className="h-4 w-4"
              checked={slideshow.loop !== false}
              onChange={(event) =>
                onPatchData({ slideshow: { ...slideshow, loop: event.target.checked } })
              }
              disabled={disabled}
            />
          </label>
          <label className="flex items-center justify-between rounded border border-[var(--ui-border)]/60 px-2 py-1 text-[11px]">
            <span className="text-[var(--ui-muted)]">dots</span>
            <input
              type="checkbox"
              className="h-4 w-4"
              checked={slideshow.showDots !== false}
              onChange={(event) =>
                onPatchData({ slideshow: { ...slideshow, showDots: event.target.checked } })
              }
              disabled={disabled}
            />
          </label>
          <label className="flex items-center justify-between rounded border border-[var(--ui-border)]/60 px-2 py-1 text-[11px]">
            <span className="text-[var(--ui-muted)]">arrows</span>
            <input
              type="checkbox"
              className="h-4 w-4"
              checked={slideshow.showArrows !== false}
              onChange={(event) =>
                onPatchData({ slideshow: { ...slideshow, showArrows: event.target.checked } })
              }
              disabled={disabled}
            />
          </label>
        </div>

        <InspectorField label="animation">
          <InspectorSelect
            value={String(animation.preset ?? "none")}
            onChange={(event) => {
              const preset = event.target.value;
              onPatchData({
                couponFlowAnimation:
                  preset === "none"
                    ? undefined
                    : {
                        preset,
                        durationMs:
                          typeof animation.durationMs === "number" ? animation.durationMs : 500,
                        delayMs: typeof animation.delayMs === "number" ? animation.delayMs : 0,
                      },
              });
            }}
            disabled={disabled}
          >
            <option value="none">なし</option>
            <option value="fade">fade</option>
            <option value="slideUp">slideUp</option>
            <option value="zoom">zoom</option>
          </InspectorSelect>
        </InspectorField>

        <InspectorField label="カード角丸">
          <InspectorInput
            type="number"
            value={Number((data.design as Record<string, unknown> | undefined)?.radius ?? 12)}
            min={0}
            step={1}
            onChange={(event) => {
              const current =
                data.design && typeof data.design === "object"
                  ? (data.design as Record<string, unknown>)
                  : {};
              onPatchData({
                design: { ...current, radius: Number(event.target.value || 0) },
              });
            }}
            disabled={disabled}
          />
        </InspectorField>

        <InspectorField label="ボタン背景色">
          <div className="flex items-center gap-2">
            <InspectorColorInput
              value={buttonBg}
              onChange={(event) => patchButtonData({ buttonBg: event.target.value })}
              disabled={disabled}
            />
            <InspectorInput
              type="text"
              value={buttonBg}
              onChange={(event) => patchButtonData({ buttonBg: event.target.value })}
              disabled={disabled}
            />
          </div>
        </InspectorField>

        <InspectorField label="ボタン文字色">
          <div className="flex items-center gap-2">
            <InspectorColorInput
              value={buttonTextColor}
              onChange={(event) => patchButtonData({ buttonTextColor: event.target.value })}
              disabled={disabled}
            />
            <InspectorInput
              type="text"
              value={buttonTextColor}
              onChange={(event) => patchButtonData({ buttonTextColor: event.target.value })}
              disabled={disabled}
            />
          </div>
        </InspectorField>

        <InspectorField label="ボタン枠線色">
          <div className="flex items-center gap-2">
            <InspectorColorInput
              value={buttonBorderColor}
              onChange={(event) => patchButtonData({ buttonBorderColor: event.target.value })}
              disabled={disabled}
            />
            <InspectorInput
              type="text"
              value={buttonBorderColor}
              onChange={(event) => patchButtonData({ buttonBorderColor: event.target.value })}
              disabled={disabled}
            />
          </div>
        </InspectorField>

        <InspectorField label="ボタン角丸">
          <InspectorInput
            type="number"
            value={buttonRadius}
            min={0}
            step={1}
            onChange={(event) => patchButtonData({ buttonRadius: Number(event.target.value || 0) })}
            disabled={disabled}
          />
        </InspectorField>

        <InspectorField label="ボタン影">
          <InspectorInput
            type="text"
            value={buttonShadow}
            onChange={(event) => patchButtonData({ buttonShadow: event.target.value })}
            disabled={disabled}
          />
        </InspectorField>
      </InspectorSection>

      <SectionOptionalBlocksEditor
        section={section}
        disabled={disabled}
        onPatchContent={onPatchContent}
      />

      <SectionAppearanceEditor
        section={section}
        disabled={disabled}
        onPatchData={onPatchData}
      />
    </div>
  );
}
