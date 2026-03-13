"use client";

import { useRef } from "react";
import InspectorSection from "@/src/components/inspector/InspectorSection";
import InspectorTextarea from "@/src/components/inspector/InspectorTextarea";
import type { AssetRecord, SectionBase } from "@/src/types/project";

type FooterHtmlEditorProps = {
  section: SectionBase;
  disabled: boolean;
  onPatchData: (patch: Record<string, unknown>) => void;
  addAsset: (asset: { filename: string; data: string }) => string;
  assets: Record<string, AssetRecord>;
};

const FOOTER_ASSET_SLOTS = [
  { key: "conditionsTitle", label: "利用条件: タイトル" },
  { key: "conditionsText", label: "利用条件: テキスト" },
  { key: "conditionsBg1", label: "利用条件 背景1" },
  { key: "conditionsBg2", label: "利用条件 背景2" },
  { key: "conditionsBg3", label: "利用条件 背景3" },
  { key: "conditionsBg4", label: "利用条件 背景4" },
  { key: "iconExclamation", label: "注意点アイコン" },
  { key: "bannerHeadTitle", label: "下部バナー: タイトル" },
  { key: "bannerMain", label: "下部バナー: メイン" },
  { key: "bannerMore", label: "下部バナー: 詳細" },
  { key: "bannerBg", label: "下部バナー: 背景" },
  { key: "magazineBanner", label: "マガジンバナー" },
  { key: "footerLogo", label: "フッター ロゴ" },
  { key: "appStore", label: "App Store" },
  { key: "googlePlay", label: "Google Play" },
  { key: "iconArrow", label: "矢印アイコン" },
  { key: "iconArrowRight", label: "矢印アイコン(赤)" },
] as const;

const readFileAsDataUrl = (file: File) =>
  new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result ?? ""));
    reader.onerror = () => reject(reader.error ?? new Error("Failed to read file"));
    reader.readAsDataURL(file);
  });

export default function FooterHtmlEditor({
  section,
  disabled,
  onPatchData,
  addAsset,
  assets,
}: FooterHtmlEditorProps) {
  const fileRefs = useRef<Record<string, HTMLInputElement | null>>({});
  const data = section.data as Record<string, unknown>;
  const footerAssets = (data.footerAssets ?? {}) as Record<string, string | undefined>;

  return (
    <div className="border-t border-[var(--ui-border)]/60">
      <InspectorSection title="問い合わせフッター画像">
        <div className="mb-2 text-[11px] text-[var(--ui-muted)]">
          利用条件 / お問い合わせ / 下部バナー / フッターの画像を差し替えます。
        </div>
        <div className="space-y-2">
          {FOOTER_ASSET_SLOTS.map((slot) => {
            const assetId = footerAssets[slot.key];
            const assetName = assetId
              ? assets[assetId]?.filename ?? "画像を選択済み"
              : "未設定";

            return (
              <div
                key={slot.key}
                className="rounded-md border border-[var(--ui-border)]/60 bg-[var(--ui-panel)]/60 px-3 py-2"
              >
                <div className="mb-2 text-[11px] font-semibold text-[var(--ui-text)]">
                  {slot.label}
                </div>
                <input
                  ref={(node) => {
                    fileRefs.current[slot.key] = node;
                  }}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={async (event) => {
                    const file = event.target.files?.[0];
                    if (!file) return;
                    const dataUrl = await readFileAsDataUrl(file);
                    const nextAssetId = addAsset({ filename: file.name, data: dataUrl });
                    onPatchData({
                      footerAssets: {
                        ...footerAssets,
                        [slot.key]: nextAssetId,
                      },
                    });
                    event.target.value = "";
                  }}
                />
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    className="ui-button h-7 px-2 text-[11px]"
                    onClick={() => fileRefs.current[slot.key]?.click()}
                    disabled={disabled}
                  >
                    画像を選択
                  </button>
                  {assetId ? (
                    <button
                      type="button"
                      className="ui-button h-7 px-2 text-[11px]"
                      onClick={() =>
                        onPatchData({
                          footerAssets: {
                            ...footerAssets,
                            [slot.key]: undefined,
                          },
                        })
                      }
                      disabled={disabled}
                    >
                      画像を削除
                    </button>
                  ) : null}
                </div>
                <div className="mt-2 text-[11px] text-[var(--ui-muted)]">{assetName}</div>
              </div>
            );
          })}
        </div>
      </InspectorSection>

      <InspectorSection title="HTML(任意)">
        <InspectorTextarea
          autoGrow
          minAutoGrowHeight={120}
          className="min-h-[120px] resize-none text-[12px]"
          value={String(data.html ?? "")}
          onChange={(event) => onPatchData({ html: event.target.value })}
          disabled={disabled}
          placeholder="必要な場合のみHTMLを入力"
        />
      </InspectorSection>
    </div>
  );
}
