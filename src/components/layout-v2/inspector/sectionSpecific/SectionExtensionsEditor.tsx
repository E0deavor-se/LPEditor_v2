"use client";

import InspectorSection from "@/src/components/inspector/InspectorSection";
import InspectorField from "@/src/components/inspector/InspectorField";
import InspectorFieldRow from "@/src/components/inspector/InspectorFieldRow";
import InspectorInput from "@/src/components/inspector/InspectorInput";
import type { SectionBase, SectionExtensions } from "@/src/types/project";

type SectionExtensionsEditorProps = {
  section: SectionBase;
  disabled?: boolean;
  onPatchData: (patch: Record<string, unknown>) => void;
};

const createId = (prefix: string) => `${prefix}_${Math.random().toString(36).slice(2, 8)}`;

const normalizeExtensions = (data: Record<string, unknown>): SectionExtensions => {
  const rawExtra = data.extra && typeof data.extra === "object"
    ? (data.extra as Record<string, unknown>)
    : {};
  const rawExtensions = data.extensions && typeof data.extensions === "object"
    ? (data.extensions as Record<string, unknown>)
    : {};

  const buttons = Array.isArray(rawExtra.buttons)
    ? rawExtra.buttons
    : Array.isArray(rawExtensions.buttons)
    ? rawExtensions.buttons
    : [];
  const images = Array.isArray(rawExtra.images)
    ? rawExtra.images
    : Array.isArray(rawExtensions.images)
    ? rawExtensions.images
    : [];

  return {
    buttons: buttons
      .filter((entry) => entry && typeof entry === "object")
      .map((entry) => {
        const item = entry as Record<string, unknown>;
        return {
          id: typeof item.id === "string" && item.id ? item.id : createId("btn"),
          label: typeof item.label === "string" ? item.label : "",
          href: typeof item.href === "string" ? item.href : "",
          variant:
            item.variant === "secondary" || item.variant === "link" ? item.variant : "primary",
        };
      }),
    images: images
      .filter((entry) => entry && typeof entry === "object")
      .map((entry) => {
        const item = entry as Record<string, unknown>;
        return {
          id: typeof item.id === "string" && item.id ? item.id : createId("img"),
          imageUrl: typeof item.imageUrl === "string" ? item.imageUrl : "",
          alt: typeof item.alt === "string" ? item.alt : "",
          caption: typeof item.caption === "string" ? item.caption : "",
          width:
            typeof item.width === "number" && Number.isFinite(item.width) ? item.width : 100,
          align:
            item.align === "left" || item.align === "right" ? item.align : "center",
        };
      }),
  };
};

export default function SectionExtensionsEditor({
  section,
  disabled = false,
  onPatchData,
}: SectionExtensionsEditorProps) {
  const data = section.data as Record<string, unknown>;
  const extensions = normalizeExtensions(data);
  const buttons = extensions.buttons ?? [];
  const images = extensions.images ?? [];

  const patchExtensions = (next: SectionExtensions) => {
    onPatchData({
      extra: next,
      extensions: next,
    });
  };

  return (
    <div className="border-t border-[var(--ui-border)]/60">
      <InspectorSection title="追加ボタン">
        <div className="flex flex-col gap-2">
          {buttons.map((button, index) => (
            <div key={button.id} className="rounded-md border border-[var(--ui-border)]/60 p-2">
              <InspectorFieldRow>
                <InspectorField label={`ラベル ${index + 1}`}>
                  <InspectorInput
                    type="text"
                    value={button.label}
                    onChange={(event) => {
                      const next = [...buttons];
                      next[index] = { ...button, label: event.target.value };
                      patchExtensions({ ...extensions, buttons: next });
                    }}
                    disabled={disabled}
                  />
                </InspectorField>
                <InspectorField label="種別">
                  <select
                    className="ui-input h-7 w-full text-[11px]"
                    value={button.variant ?? "primary"}
                    onChange={(event) => {
                      const variant =
                        event.target.value === "secondary" || event.target.value === "link"
                          ? event.target.value
                          : "primary";
                      const next = [...buttons];
                      next[index] = { ...button, variant };
                      patchExtensions({ ...extensions, buttons: next });
                    }}
                    disabled={disabled}
                  >
                    <option value="primary">primary</option>
                    <option value="secondary">secondary</option>
                    <option value="link">link</option>
                  </select>
                </InspectorField>
              </InspectorFieldRow>
              <InspectorField label="リンク先URL">
                <InspectorInput
                  type="text"
                  value={button.href}
                  onChange={(event) => {
                    const next = [...buttons];
                    next[index] = { ...button, href: event.target.value };
                    patchExtensions({ ...extensions, buttons: next });
                  }}
                  disabled={disabled}
                />
              </InspectorField>
              <button
                type="button"
                className="ui-button ui-button-ghost mt-2 h-7 w-full text-[11px] text-rose-500"
                onClick={() => {
                  patchExtensions({
                    ...extensions,
                    buttons: buttons.filter((entry) => entry.id !== button.id),
                  });
                }}
                disabled={disabled}
              >
                このボタンを削除
              </button>
            </div>
          ))}

          <button
            type="button"
            className="ui-button h-8 text-[11px]"
            onClick={() => {
              patchExtensions({
                ...extensions,
                buttons: [
                  ...buttons,
                  { id: createId("btn"), label: "ボタン", href: "#", variant: "primary" },
                ],
              });
            }}
            disabled={disabled}
          >
            ボタンを追加
          </button>
        </div>
      </InspectorSection>

      <InspectorSection title="追加画像" defaultOpen={false}>
        <div className="flex flex-col gap-2">
          {images.map((image, index) => (
            <div key={image.id} className="rounded-md border border-[var(--ui-border)]/60 p-2">
              <InspectorField label={`画像URL ${index + 1}`}>
                <InspectorInput
                  type="text"
                  value={image.imageUrl}
                  onChange={(event) => {
                    const next = [...images];
                    next[index] = { ...image, imageUrl: event.target.value };
                    patchExtensions({ ...extensions, images: next });
                  }}
                  disabled={disabled}
                />
              </InspectorField>
              <InspectorFieldRow>
                <InspectorField label="横幅(%)">
                  <InspectorInput
                    type="number"
                    value={image.width ?? 100}
                    min={20}
                    max={100}
                    step={1}
                    onChange={(event) => {
                      const next = [...images];
                      next[index] = {
                        ...image,
                        width: Math.max(20, Math.min(100, Number(event.target.value || 100))),
                      };
                      patchExtensions({ ...extensions, images: next });
                    }}
                    disabled={disabled}
                  />
                </InspectorField>
                <InspectorField label="寄せ">
                  <select
                    className="ui-input h-7 w-full text-[11px]"
                    value={image.align ?? "center"}
                    onChange={(event) => {
                      const align =
                        event.target.value === "left" || event.target.value === "right"
                          ? event.target.value
                          : "center";
                      const next = [...images];
                      next[index] = { ...image, align };
                      patchExtensions({ ...extensions, images: next });
                    }}
                    disabled={disabled}
                  >
                    <option value="left">left</option>
                    <option value="center">center</option>
                    <option value="right">right</option>
                  </select>
                </InspectorField>
              </InspectorFieldRow>
              <InspectorField label="代替テキスト">
                <InspectorInput
                  type="text"
                  value={image.alt ?? ""}
                  onChange={(event) => {
                    const next = [...images];
                    next[index] = { ...image, alt: event.target.value };
                    patchExtensions({ ...extensions, images: next });
                  }}
                  disabled={disabled}
                />
              </InspectorField>
              <InspectorField label="キャプション">
                <InspectorInput
                  type="text"
                  value={image.caption ?? ""}
                  onChange={(event) => {
                    const next = [...images];
                    next[index] = { ...image, caption: event.target.value };
                    patchExtensions({ ...extensions, images: next });
                  }}
                  disabled={disabled}
                />
              </InspectorField>
              <button
                type="button"
                className="ui-button ui-button-ghost mt-2 h-7 w-full text-[11px] text-rose-500"
                onClick={() => {
                  patchExtensions({
                    ...extensions,
                    images: images.filter((entry) => entry.id !== image.id),
                  });
                }}
                disabled={disabled}
              >
                この画像を削除
              </button>
            </div>
          ))}

          <button
            type="button"
            className="ui-button h-8 text-[11px]"
            onClick={() => {
              patchExtensions({
                ...extensions,
                images: [
                  ...images,
                  {
                    id: createId("img"),
                    imageUrl: "",
                    alt: "",
                    caption: "",
                    width: 100,
                    align: "center",
                  },
                ],
              });
            }}
            disabled={disabled}
          >
            画像を追加
          </button>
        </div>
      </InspectorSection>
    </div>
  );
}
