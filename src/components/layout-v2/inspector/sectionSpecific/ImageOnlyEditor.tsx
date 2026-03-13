"use client";

import { useMemo, useRef } from "react";
import InspectorSection from "@/src/components/inspector/InspectorSection";
import InspectorField from "@/src/components/inspector/InspectorField";
import InspectorInput from "@/src/components/inspector/InspectorInput";
import SectionAssetPicker from "@/src/features/ai-assets/components/SectionAssetPicker";
import type { SectionBase } from "@/src/types/project";

type ImageOnlyEditorProps = {
  section: SectionBase;
  disabled: boolean;
  onPatchData: (patch: Record<string, unknown>) => void;
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

const formatBytes = (bytes?: number) => {
  if (!bytes || bytes <= 0) return "-";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

export default function ImageOnlyEditor({
  section,
  disabled,
  onPatchData,
  addAsset,
}: ImageOnlyEditorProps) {
  const fileRef = useRef<HTMLInputElement | null>(null);
  const data = section.data as Record<string, unknown>;

  const imageMeta = useMemo(
    () =>
      (data.imageOnlyMeta as
        | { filename?: string; relativePath?: string; w?: number; h?: number; size?: number }
        | undefined) ?? {},
    [data.imageOnlyMeta]
  );

  const sizeMode =
    data.imageOnlySizeMode === "auto" || data.imageOnlySizeMode === "custom"
      ? data.imageOnlySizeMode
      : "fit";
  const align = data.imageOnlyAlign === "left" || data.imageOnlyAlign === "right"
    ? data.imageOnlyAlign
    : "center";
  const fit = data.imageOnlyFit === "cover" ? "cover" : "contain";
  const width = typeof data.imageOnlyWidth === "number" ? data.imageOnlyWidth : 640;
  const maxWidth =
    typeof data.imageOnlyMaxWidth === "number" ? data.imageOnlyMaxWidth : 980;

  return (
    <div className="border-t border-[var(--ui-border)]/60">
      <SectionAssetPicker
        section={section}
        disabled={disabled}
        addAsset={addAsset}
        onPatchData={onPatchData}
      />

      <InspectorSection title="画像のみセクション">
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={async (event) => {
            const file = event.target.files?.[0];
            if (!file) return;

            const dataUrl = await readFileAsDataUrl(file);
            const dim = await getImageSize(dataUrl);
            const assetId = addAsset({ filename: file.name, data: dataUrl });

            onPatchData({
              imageOnlyAssetId: assetId,
              imageOnlyUrl: dataUrl,
              imageOnlyMeta: {
                filename: file.name,
                relativePath: file.webkitRelativePath || "",
                w: dim.w,
                h: dim.h,
                size: file.size,
              },
            });
            event.target.value = "";
          }}
        />
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            className="ui-button h-7 px-2 text-[11px]"
            onClick={() => fileRef.current?.click()}
            disabled={disabled}
          >
            画像を選択
          </button>
          {data.imageOnlyAssetId ? (
            <button
              type="button"
              className="ui-button h-7 px-2 text-[11px]"
              onClick={() =>
                onPatchData({
                  imageOnlyAssetId: "",
                  imageOnlyUrl: "",
                  imageOnlyMeta: undefined,
                })
              }
              disabled={disabled}
            >
              画像を削除
            </button>
          ) : null}
        </div>

        {data.imageOnlyAssetId ? (
          <div className="text-[11px] text-[var(--ui-muted)]">
            <div>File: {imageMeta.filename ?? "-"}</div>
            <div>Location: {imageMeta.relativePath || "local file"}</div>
            {imageMeta.w && imageMeta.h ? <div>Size: {imageMeta.w} x {imageMeta.h}</div> : null}
            <div>File size: {formatBytes(imageMeta.size)}</div>
          </div>
        ) : null}

        <InspectorField label="代替テキスト">
          <InspectorInput
            type="text"
            value={String(data.imageOnlyAlt ?? "")}
            onChange={(event) => onPatchData({ imageOnlyAlt: event.target.value })}
            disabled={disabled}
          />
        </InspectorField>
      </InspectorSection>

      <InspectorSection title="表示設定">
        <label className="flex items-center justify-between text-[11px]">
          <span className="text-[var(--ui-muted)]">サイズ</span>
          <select
            className="ui-input h-7 w-[120px] text-[11px]"
            value={sizeMode}
            onChange={(event) => onPatchData({ imageOnlySizeMode: event.target.value })}
            disabled={disabled}
          >
            <option value="fit">フィット</option>
            <option value="auto">自動</option>
            <option value="custom">指定</option>
          </select>
        </label>

        {sizeMode === "custom" ? (
          <InspectorField label="幅(px)">
            <InspectorInput
              type="number"
              value={String(width)}
              min={1}
              max={2400}
              step={1}
              onChange={(event) => onPatchData({ imageOnlyWidth: Number(event.target.value) || 1 })}
              disabled={disabled}
            />
          </InspectorField>
        ) : null}

        <InspectorField label="最大幅(px)">
          <InspectorInput
            type="number"
            value={String(maxWidth)}
            min={0}
            max={2400}
            step={1}
            onChange={(event) => onPatchData({ imageOnlyMaxWidth: Number(event.target.value) || 0 })}
            disabled={disabled}
          />
        </InspectorField>

        <label className="flex items-center justify-between text-[11px]">
          <span className="text-[var(--ui-muted)]">配置</span>
          <select
            className="ui-input h-7 w-[120px] text-[11px]"
            value={align}
            onChange={(event) => onPatchData({ imageOnlyAlign: event.target.value })}
            disabled={disabled}
          >
            <option value="left">左</option>
            <option value="center">中央</option>
            <option value="right">右</option>
          </select>
        </label>

        <label className="flex items-center justify-between text-[11px]">
          <span className="text-[var(--ui-muted)]">表示方法</span>
          <select
            className="ui-input h-7 w-[120px] text-[11px]"
            value={fit}
            onChange={(event) => onPatchData({ imageOnlyFit: event.target.value })}
            disabled={disabled}
          >
            <option value="contain">全体表示</option>
            <option value="cover">トリミング</option>
          </select>
        </label>
      </InspectorSection>
    </div>
  );
}
