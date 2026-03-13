"use client";

import { useMemo, useRef } from "react";
import InspectorSection from "@/src/components/inspector/InspectorSection";
import InspectorField from "@/src/components/inspector/InspectorField";
import InspectorInput from "@/src/components/inspector/InspectorInput";
import type { SectionBase } from "@/src/types/project";

type BrandBarEditorProps = {
  section: SectionBase;
  disabled: boolean;
  onPatchData: (patch: Record<string, unknown>) => void;
  onPatchStyle: (patch: Partial<SectionBase["style"]>) => void;
  addAsset: (asset: { filename: string; data: string }) => string;
};

const readFileAsDataUrl = (file: File) =>
  new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result ?? ""));
    reader.onerror = () => reject(reader.error ?? new Error("Failed to read file"));
    reader.readAsDataURL(file);
  });

const getImageSize = (dataUrl: string) =>
  new Promise<{ w: number; h: number }>((resolve) => {
    const img = new Image();
    img.onload = () => resolve({ w: img.naturalWidth || 0, h: img.naturalHeight || 0 });
    img.onerror = () => resolve({ w: 0, h: 0 });
    img.src = dataUrl;
  });

export default function BrandBarEditor({
  section,
  disabled,
  onPatchData,
  onPatchStyle,
  addAsset,
}: BrandBarEditorProps) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const data = section.data as Record<string, unknown>;

  const meta = useMemo(
    () =>
      (data.brandImageMeta as
        | { filename?: string; relativePath?: string; w?: number; h?: number; size?: number }
        | undefined) ?? {},
    [data.brandImageMeta]
  );

  const handleUpload = async (file: File) => {
    const dataUrl = await readFileAsDataUrl(file);
    const dim = await getImageSize(dataUrl);
    const assetId = addAsset({ filename: file.name, data: dataUrl });
    onPatchData({
      brandImageAssetId: assetId,
      brandImageUrl: dataUrl,
      brandImageMeta: {
        filename: file.name,
        relativePath: file.webkitRelativePath || "",
        w: dim.w,
        h: dim.h,
        size: file.size,
      },
    });
  };

  return (
    <div className="border-t border-[var(--ui-border)]/60">
      <InspectorSection title="ブランド">
        <InspectorField label="表示名">
          <InspectorInput
            type="text"
            value={String(data.brandText ?? "")}
            onChange={(event) => onPatchData({ brandText: event.target.value })}
            disabled={disabled}
          />
        </InspectorField>
        <InspectorField label="ロゴ文言">
          <InspectorInput
            type="text"
            value={String(data.logoText ?? "")}
            onChange={(event) => onPatchData({ logoText: event.target.value })}
            disabled={disabled}
          />
        </InspectorField>
      </InspectorSection>

      <InspectorSection title="画像">
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={async (event) => {
            const file = event.target.files?.[0];
            if (!file) return;
            await handleUpload(file);
            event.target.value = "";
          }}
        />
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            className="ui-button h-7 px-2 text-[11px]"
            onClick={() => inputRef.current?.click()}
            disabled={disabled}
          >
            画像を選択
          </button>
          {data.brandImageAssetId ? (
            <button
              type="button"
              className="ui-button h-7 px-2 text-[11px]"
              onClick={() =>
                onPatchData({
                  brandImageAssetId: undefined,
                  brandImageUrl: "",
                  brandImageMeta: undefined,
                })
              }
              disabled={disabled}
            >
              画像を削除
            </button>
          ) : null}
        </div>
        {data.brandImageAssetId ? (
          <div className="text-[11px] text-[var(--ui-muted)]">
            <div>File: {meta.filename ?? "-"}</div>
            <div>Location: {meta.relativePath || "local file"}</div>
            <div>
              Size: {meta.w ?? 0} x {meta.h ?? 0}
            </div>
          </div>
        ) : null}
      </InspectorSection>

      <InspectorSection title="レイアウト">
        <label className="flex items-center justify-between text-[11px]">
          <span className="text-[var(--ui-muted)]">フル幅</span>
          <input
            type="checkbox"
            className="h-4 w-4"
            checked={Boolean(section.style.layout.fullWidth)}
            onChange={(event) =>
              onPatchStyle({ layout: { ...section.style.layout, fullWidth: event.target.checked } })
            }
            disabled={disabled}
          />
        </label>
      </InspectorSection>
    </div>
  );
}
