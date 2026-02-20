"use client";

import { useRef } from "react";
import { FileText, Sparkles } from "lucide-react";
import Accordion from "@/src/components/editor/right/primitives/Accordion";
import FieldRow from "@/src/components/editor/right/primitives/FieldRow";
import ToggleField from "@/src/components/editor/right/primitives/ToggleField";
import type { AssetRecord, PageMetaSettings } from "@/src/types/project";

type PageMetaPanelProps = {
  value?: PageMetaSettings;
  onChange: (patch: Partial<PageMetaSettings>) => void;
  assets?: Record<string, AssetRecord>;
  onAddAsset: (payload: { filename: string; data: string }) => string;
  defaultOpen?: boolean;
};

const DEFAULT_META: PageMetaSettings = {
  title: "",
  description: "",
  faviconUrl: "",
  faviconAssetId: "",
  ogpImageUrl: "",
  ogpImageAssetId: "",
  ogpTitle: "",
  ogpDescription: "",
  presets: {
    appendAuPayTitle: false,
    ogpFromMv: false,
    injectCampaignPeriod: false,
  },
};

export default function PageMetaPanel({
  value,
  onChange,
  assets,
  onAddAsset,
  defaultOpen,
}: PageMetaPanelProps) {
  const current = value ?? DEFAULT_META;
  const faviconInputRef = useRef<HTMLInputElement | null>(null);
  const ogpInputRef = useRef<HTMLInputElement | null>(null);

  const handleImageImport = (
    file: File,
    onComplete: (assetId: string, dataUrl: string) => void
  ) => {
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = typeof reader.result === "string" ? reader.result : "";
      if (!dataUrl) {
        return;
      }
      const assetId = onAddAsset({ filename: file.name, data: dataUrl });
      onComplete(assetId, dataUrl);
    };
    reader.readAsDataURL(file);
  };

  const faviconName = current.faviconAssetId
    ? assets?.[current.faviconAssetId]?.filename ?? "画像を選択済み"
    : "";
  const ogpName = current.ogpImageAssetId
    ? assets?.[current.ogpImageAssetId]?.filename ?? "画像を選択済み"
    : "";

  return (
    <Accordion title="ページ設定" icon={<FileText size={14} />} defaultOpen={defaultOpen}>
      <div className="flex flex-col gap-2">
        <div className="px-2 text-[11px] font-semibold text-[var(--ui-text)]">
          基本設定
        </div>
        <FieldRow label="ページタイトル">
          <input
            className="ui-input h-7 w-full text-[12px]"
            value={current.title}
            placeholder="検索結果やブラウザのタイトルに使用"
            onChange={(event) => onChange({ title: event.target.value })}
          />
        </FieldRow>
        <div className="px-2">
          <label className="ui-field">
            <span className="ui-field-label">meta description</span>
            <textarea
              className="ui-textarea min-h-[70px] text-[12px]"
              value={current.description}
              placeholder="検索結果の説明文"
              onChange={(event) => onChange({ description: event.target.value })}
            />
          </label>
        </div>
        <div className="px-2 text-[11px] font-semibold text-[var(--ui-text)]">
          ファビコン
        </div>
        <FieldRow label="URL">
          <input
            className="ui-input h-7 w-full text-[12px]"
            value={current.faviconUrl ?? ""}
            placeholder="https://... または画像"
            onChange={(event) =>
              onChange({ faviconUrl: event.target.value, faviconAssetId: "" })
            }
          />
        </FieldRow>
        <input
          ref={faviconInputRef}
          type="file"
          accept="image/*,.ico"
          className="hidden"
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (!file) {
              return;
            }
            handleImageImport(file, (assetId, dataUrl) => {
              onChange({ faviconAssetId: assetId, faviconUrl: dataUrl });
            });
            event.target.value = "";
          }}
        />
        <div className="flex flex-wrap items-center gap-2 px-2">
          <button
            type="button"
            className="ui-button h-7 px-2 text-[11px]"
            onClick={() => faviconInputRef.current?.click()}
          >
            画像を選択
          </button>
          {current.faviconAssetId || current.faviconUrl ? (
            <button
              type="button"
              className="ui-button h-7 px-2 text-[11px]"
              onClick={() => onChange({ faviconAssetId: "", faviconUrl: "" })}
            >
              削除
            </button>
          ) : null}
        </div>
        {faviconName ? (
          <div className="px-2 text-xs text-[var(--ui-muted)]">
            File: {faviconName}
          </div>
        ) : null}
        <div className="px-2 text-[11px] font-semibold text-[var(--ui-text)]">
          OGP
        </div>
        <FieldRow label="OGPタイトル">
          <input
            className="ui-input h-7 w-full text-[12px]"
            value={current.ogpTitle ?? ""}
            placeholder="検索結果やSNSのタイトルに使用"
            onChange={(event) => onChange({ ogpTitle: event.target.value })}
          />
        </FieldRow>
        <div className="px-2">
          <label className="ui-field">
            <span className="ui-field-label">OGP説明文</span>
            <textarea
              className="ui-textarea min-h-[70px] text-[12px]"
              value={current.ogpDescription ?? ""}
              placeholder="検索結果やSNSのmeta descriptionに使用"
              onChange={(event) => onChange({ ogpDescription: event.target.value })}
            />
          </label>
        </div>
        <FieldRow label="OGP画像URL">
          <input
            className="ui-input h-7 w-full text-[12px]"
            value={current.ogpImageUrl ?? ""}
            placeholder="https://... または画像"
            onChange={(event) =>
              onChange({ ogpImageUrl: event.target.value, ogpImageAssetId: "" })
            }
          />
        </FieldRow>
        <input
          ref={ogpInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (!file) {
              return;
            }
            handleImageImport(file, (assetId, dataUrl) => {
              onChange({ ogpImageAssetId: assetId, ogpImageUrl: dataUrl });
            });
            event.target.value = "";
          }}
        />
        <div className="flex flex-wrap items-center gap-2 px-2">
          <button
            type="button"
            className="ui-button h-7 px-2 text-[11px]"
            onClick={() => ogpInputRef.current?.click()}
          >
            画像を選択
          </button>
          {current.ogpImageAssetId || current.ogpImageUrl ? (
            <button
              type="button"
              className="ui-button h-7 px-2 text-[11px]"
              onClick={() => onChange({ ogpImageAssetId: "", ogpImageUrl: "" })}
            >
              削除
            </button>
          ) : null}
        </div>
        {ogpName ? (
          <div className="px-2 text-xs text-[var(--ui-muted)]">
            File: {ogpName}
          </div>
        ) : null}
        <div className="mt-1 px-2 text-[11px] font-semibold text-[var(--ui-text)]">
          KDDIプリセット
        </div>
        <div className="rounded-md border border-[var(--ui-border)]/60 bg-[var(--ui-panel)]/60 px-2 py-2">
          <FieldRow label="タイトル末尾設定">
            <ToggleField
              value={Boolean(current.presets?.appendAuPayTitle)}
              ariaLabel="タイトル末尾にau PAYキャンペーンを追加"
              onChange={(next) =>
                onChange({ presets: { appendAuPayTitle: next } })
              }
            />
          </FieldRow>
          <FieldRow label="OGP画像をMVから取得">
            <ToggleField
              value={Boolean(current.presets?.ogpFromMv)}
              ariaLabel="OGP画像をMV画像から取得"
              onChange={(next) => onChange({ presets: { ogpFromMv: next } })}
            />
          </FieldRow>
          <FieldRow label="期間を説明に追加">
            <ToggleField
              value={Boolean(current.presets?.injectCampaignPeriod)}
              ariaLabel="キャンペーン期間をdescriptionに追加"
              onChange={(next) =>
                onChange({ presets: { injectCampaignPeriod: next } })
              }
            />
          </FieldRow>
          <div className="mt-1 flex items-center gap-2 text-xs text-[var(--ui-muted)]">
            <Sparkles size={12} />
            ONの場合のみ適用されます。
          </div>
        </div>
      </div>
    </Accordion>
  );
}

