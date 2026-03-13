"use client";

import InspectorField from "@/src/components/inspector/InspectorField";
import InspectorInput from "@/src/components/inspector/InspectorInput";
import InspectorTextarea from "@/src/components/inspector/InspectorTextarea";
import Inspector2Block from "@/src/components/layout-v2/inspector/Inspector2Block";
import type { SectionBase } from "@/src/types/project";

type OptionalButton = {
  id: string;
  label: string;
  href: string;
  variant?: "primary" | "secondary";
};

type OptionalMedia = {
  id: string;
  imageUrl: string;
  alt?: string;
  caption?: string;
  width?: number;
  align?: "left" | "center" | "right";
};

type SectionOptionalBlocksEditorProps = {
  section: SectionBase;
  disabled: boolean;
  onPatchContent: (patch: {
    buttons?: OptionalButton[];
    media?: OptionalMedia[];
  }) => void;
};

const createId = (prefix: string) => `${prefix}_${Math.random().toString(36).slice(2, 10)}`;

const normalizeButtons = (value: unknown): OptionalButton[] =>
  Array.isArray(value)
    ? value
        .map((entry, index) => {
          const item = entry && typeof entry === "object" ? (entry as Record<string, unknown>) : {};
          return {
            id: String(item.id ?? `btn_${index + 1}`),
            label: String(item.label ?? ""),
            href: String(item.href ?? ""),
            variant: item.variant === "secondary" ? "secondary" : "primary",
          } as OptionalButton;
        })
        .filter((entry) => entry.label.trim().length > 0 || entry.href.trim().length > 0)
    : [];

const normalizeMedia = (value: unknown): OptionalMedia[] =>
  Array.isArray(value)
    ? value
        .map((entry, index) => {
          const item = entry && typeof entry === "object" ? (entry as Record<string, unknown>) : {};
          const align = item.align === "left" || item.align === "right" ? item.align : "center";
          const width =
            typeof item.width === "number" && Number.isFinite(item.width)
              ? Math.max(120, Math.min(1600, item.width))
              : 720;
          return {
            id: String(item.id ?? `media_${index + 1}`),
            imageUrl: String(item.imageUrl ?? ""),
            alt: String(item.alt ?? ""),
            caption: String(item.caption ?? ""),
            width,
            align,
          } as OptionalMedia;
        })
        .filter((entry) => entry.imageUrl.trim().length > 0 || entry.caption?.trim().length)
    : [];

export default function SectionOptionalBlocksEditor({
  section,
  disabled,
  onPatchContent,
}: SectionOptionalBlocksEditorProps) {
  const buttons = normalizeButtons(section.content?.buttons);
  const media = normalizeMedia(section.content?.media);

  const patchButton = (index: number, patch: Partial<OptionalButton>) => {
    const next = buttons.map((entry, idx) => (idx === index ? { ...entry, ...patch } : entry));
    onPatchContent({ buttons: next });
  };

  const patchMedia = (index: number, patch: Partial<OptionalMedia>) => {
    const next = media.map((entry, idx) => (idx === index ? { ...entry, ...patch } : entry));
    onPatchContent({ media: next });
  };

  return (
    <>
      <Inspector2Block block="details" summary="追加CTAボタン">
        <button
          type="button"
          className="ui-button h-7 px-2 text-[11px]"
          disabled={disabled}
          onClick={() =>
            onPatchContent({
              buttons: [
                ...buttons,
                { id: createId("btn"), label: "ボタン", href: "", variant: "primary" },
              ],
            })
          }
        >
          + ボタン追加
        </button>

        <div className="mt-2 space-y-2">
          {buttons.map((button, index) => (
            <div key={button.id} className="rounded border border-[var(--ui-border)]/60 p-2">
              <div className="mb-2 flex items-center justify-between">
                <span className="text-[11px] text-[var(--ui-muted)]">CTA {index + 1}</span>
                <button
                  type="button"
                  className="ui-button h-6 w-6 px-0 text-[12px]"
                  disabled={disabled}
                  onClick={() => onPatchContent({ buttons: buttons.filter((_, i) => i !== index) })}
                >
                  ×
                </button>
              </div>
              <InspectorField label="ラベル">
                <InspectorInput
                  type="text"
                  value={button.label}
                  disabled={disabled}
                  onChange={(event) => patchButton(index, { label: event.target.value })}
                />
              </InspectorField>
              <InspectorField label="リンク">
                <InspectorInput
                  type="text"
                  value={button.href}
                  disabled={disabled}
                  onChange={(event) => patchButton(index, { href: event.target.value })}
                />
              </InspectorField>
              <InspectorField label="variant">
                <select
                  className="ui-input h-7 w-full text-[11px]"
                  value={button.variant === "secondary" ? "secondary" : "primary"}
                  disabled={disabled}
                  onChange={(event) =>
                    patchButton(index, {
                      variant: event.target.value === "secondary" ? "secondary" : "primary",
                    })
                  }
                >
                  <option value="primary">primary</option>
                  <option value="secondary">secondary</option>
                </select>
              </InspectorField>
            </div>
          ))}
        </div>
      </Inspector2Block>

      <Inspector2Block block="details" summary="追加画像ブロック">
        <button
          type="button"
          className="ui-button h-7 px-2 text-[11px]"
          disabled={disabled}
          onClick={() =>
            onPatchContent({
              media: [
                ...media,
                {
                  id: createId("media"),
                  imageUrl: "",
                  alt: "",
                  caption: "",
                  width: 720,
                  align: "center",
                },
              ],
            })
          }
        >
          + 画像追加
        </button>

        <div className="mt-2 space-y-2">
          {media.map((item, index) => (
            <div key={item.id} className="rounded border border-[var(--ui-border)]/60 p-2">
              <div className="mb-2 flex items-center justify-between">
                <span className="text-[11px] text-[var(--ui-muted)]">画像 {index + 1}</span>
                <button
                  type="button"
                  className="ui-button h-6 w-6 px-0 text-[12px]"
                  disabled={disabled}
                  onClick={() => onPatchContent({ media: media.filter((_, i) => i !== index) })}
                >
                  ×
                </button>
              </div>
              <InspectorField label="画像URL">
                <InspectorInput
                  type="text"
                  value={item.imageUrl}
                  disabled={disabled}
                  onChange={(event) => patchMedia(index, { imageUrl: event.target.value })}
                />
              </InspectorField>
              <InspectorField label="alt">
                <InspectorInput
                  type="text"
                  value={String(item.alt ?? "")}
                  disabled={disabled}
                  onChange={(event) => patchMedia(index, { alt: event.target.value })}
                />
              </InspectorField>
              <InspectorField label="caption">
                <InspectorTextarea
                  rows={2}
                  autoGrow
                  className="min-h-[44px] resize-none text-[12px]"
                  value={String(item.caption ?? "")}
                  disabled={disabled}
                  onChange={(event) => patchMedia(index, { caption: event.target.value })}
                />
              </InspectorField>
              <InspectorField label="幅(px)">
                <InspectorInput
                  type="number"
                  min={120}
                  max={1600}
                  step={1}
                  value={String(item.width ?? 720)}
                  disabled={disabled}
                  onChange={(event) =>
                    patchMedia(index, {
                      width: Math.max(120, Number(event.target.value) || 120),
                    })
                  }
                />
              </InspectorField>
              <InspectorField label="配置">
                <select
                  className="ui-input h-7 w-full text-[11px]"
                  value={item.align === "left" || item.align === "right" ? item.align : "center"}
                  disabled={disabled}
                  onChange={(event) =>
                    patchMedia(index, {
                      align:
                        event.target.value === "left" || event.target.value === "right"
                          ? event.target.value
                          : "center",
                    })
                  }
                >
                  <option value="left">left</option>
                  <option value="center">center</option>
                  <option value="right">right</option>
                </select>
              </InspectorField>
            </div>
          ))}
        </div>
      </Inspector2Block>
    </>
  );
}
