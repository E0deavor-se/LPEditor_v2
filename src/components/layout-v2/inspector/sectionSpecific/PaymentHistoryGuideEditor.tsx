"use client";

import { useRef, type SyntheticEvent } from "react";
import InspectorSection from "@/src/components/inspector/InspectorSection";
import InspectorField from "@/src/components/inspector/InspectorField";
import InspectorInput from "@/src/components/inspector/InspectorInput";
import SectionAppearanceEditor from "@/src/components/layout-v2/inspector/sectionSpecific/SectionAppearanceEditor";
import SectionOptionalBlocksEditor from "@/src/components/layout-v2/inspector/sectionSpecific/SectionOptionalBlocksEditor";
import { useTextSelection } from "@/src/components/editor/TextSelectionContext";
import type { ContentItem, SectionBase } from "@/src/types/project";

type PaymentHistoryGuideEditorProps = {
  section: SectionBase;
  disabled: boolean;
  onPatchData: (patch: Record<string, unknown>) => void;
  onPatchContent: (patch: {
    items?: ContentItem[];
    buttons?: Array<{ id: string; label: string; href: string; variant?: "primary" | "secondary" }>;
    media?: Array<{ id: string; imageUrl: string; alt?: string; caption?: string; width?: number; align?: "left" | "center" | "right" }>;
  }) => void;
  addAsset: (asset: { filename: string; data: string }) => string;
  sectionOptions: Array<{ value: string; label: string }>;
  onRenameSection?: (name: string) => void;
};

const createId = (prefix: string) => `${prefix}_${Math.random().toString(36).slice(2, 10)}`;

const readFileAsDataUrl = (file: File) =>
  new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result ?? ""));
    reader.onerror = () => reject(reader.error ?? new Error("Failed to read file"));
    reader.readAsDataURL(file);
  });

export default function PaymentHistoryGuideEditor({
  section,
  disabled,
  onPatchData,
  onPatchContent,
  addAsset,
  sectionOptions,
  onRenameSection,
}: PaymentHistoryGuideEditorProps) {
  const { saveSelection } = useTextSelection();
  const fileRef = useRef<HTMLInputElement | null>(null);
  const data = section.data as Record<string, unknown>;
  const items = section.content?.items ?? [];
  const titleItem = items.find((item) => item.type === "title");
  const linkTargetKind = data.linkTargetKind === "section" ? "section" : "url";

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
          <span className="ui-field-label">本文前半</span>
          <textarea
            className="ui-textarea min-h-[90px] text-[12px]"
            value={String(data.body ?? "")}
            onChange={(event) => onPatchData({ body: event.target.value })}
            disabled={disabled}
          />
        </label>
      </InspectorSection>

      <InspectorSection title="リンク">
        <InspectorField label="リンク文言">
          <InspectorInput
            type="text"
            value={String(data.linkText ?? "")}
            onChange={(event) => onPatchData({ linkText: event.target.value })}
            disabled={disabled}
          />
        </InspectorField>
        <label className="flex items-center justify-between text-[11px]">
            <span className="text-[var(--ui-muted)]">リンク先</span>
          <select
            className="ui-input h-7 w-[120px] text-[11px]"
            value={linkTargetKind}
            onChange={(event) => {
              const kind = event.target.value === "section" ? "section" : "url";
              if (kind === "section") {
                onPatchData({
                  linkTargetKind: "section",
                  linkSectionId: sectionOptions[0]?.value ?? "",
                });
                return;
              }
              onPatchData({ linkTargetKind: "url" });
            }}
            disabled={disabled}
          >
            <option value="section">セクション</option>
            <option value="url">URL</option>
          </select>
        </label>

        {linkTargetKind === "section" ? (
          <label className="flex items-center justify-between text-[11px]">
            <span className="text-[var(--ui-muted)]">遷移先セクション</span>
            <select
              className="ui-input h-7 w-[180px] text-[11px]"
              value={String(data.linkSectionId ?? "")}
              onChange={(event) => onPatchData({ linkSectionId: event.target.value })}
              disabled={disabled}
            >
              {sectionOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </label>
        ) : (
          <InspectorField label="リンク先">
            <InspectorInput
              type="text"
              value={String(data.linkUrl ?? "")}
              onChange={(event) => onPatchData({ linkUrl: event.target.value })}
              disabled={disabled}
            />
          </InspectorField>
        )}

        <InspectorField label="後続文">
          <InspectorInput
            type="text"
            value={String(data.linkSuffix ?? "")}
            onChange={(event) => onPatchData({ linkSuffix: event.target.value })}
            disabled={disabled}
          />
        </InspectorField>
      </InspectorSection>

      <InspectorSection title="注意文言">
        <label className="ui-field">
          <span className="ui-field-label">注意文言</span>
          <textarea
            className="ui-textarea min-h-[80px] text-[12px]"
            value={String(data.alert ?? "")}
            onChange={(event) => onPatchData({ alert: event.target.value })}
            disabled={disabled}
          />
        </label>
      </InspectorSection>

      <InspectorSection title="画像">
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={async (event) => {
            const file = event.target.files?.[0];
            if (!file) return;
            const dataUrl = await readFileAsDataUrl(file);
            const assetId = addAsset({ filename: file.name, data: dataUrl });
            onPatchData({ imageAssetId: assetId, imageUrl: dataUrl, imageAlt: file.name });
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
          {(data.imageUrl || data.imageAssetId) ? (
            <button
              type="button"
              className="ui-button h-7 px-2 text-[11px]"
              onClick={() => onPatchData({ imageAssetId: "", imageUrl: "", imageAlt: "" })}
              disabled={disabled}
            >
              画像を削除
            </button>
          ) : null}
        </div>
        <InspectorField label="alt">
          <InspectorInput
            type="text"
            value={String(data.imageAlt ?? "")}
            onChange={(event) => onPatchData({ imageAlt: event.target.value })}
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
