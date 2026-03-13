"use client";

import type { AiAssetRole, AiGeneratedAsset } from "@/src/features/ai-assets/types";

type AssetsPanelProps = {
  assets: AiGeneratedAsset[];
  selectedAssetId?: string | null;
  roleFilter?: AiAssetRole;
  onSelectAsset: (assetId: string) => void;
  onBindAsset: (asset: AiGeneratedAsset) => Promise<void>;
  bindingAssetId?: string | null;
};

const roleLabel: Record<AiAssetRole, string> = {
  heroPc: "ヒーローPC",
  heroSp: "ヒーローSP",
  imageOnly: "画像のみ",
  sectionImage: "画像",
  sectionIcon: "アイコン",
};

const truncate = (value: string, max: number) => {
  if (value.length <= max) {
    return value;
  }
  return `${value.slice(0, max)}...`;
};

export default function AssetsPanel({
  assets,
  selectedAssetId,
  roleFilter,
  onSelectAsset,
  onBindAsset,
  bindingAssetId,
}: AssetsPanelProps) {
  const filtered = roleFilter ? assets.filter((entry) => entry.role === roleFilter) : assets;

  return (
    <div className="space-y-2">
      {filtered.length === 0 ? (
        <div className="rounded-md border border-dashed border-[var(--ui-border)]/70 px-2.5 py-3 text-[11px] text-[var(--ui-muted)]">
          まだAI生成アセットがありません。上の「AI生成」から作成してください。
        </div>
      ) : null}

      {filtered.map((asset) => {
        const isSelected = selectedAssetId === asset.id;
        const isBinding = bindingAssetId === asset.id;
        return (
          <div
            key={asset.id}
            className={`rounded-md border p-2 ${
              isSelected
                ? "border-[var(--ui-accent)]/70 bg-[var(--ui-accent)]/5"
                : "border-[var(--ui-border)]/60"
            }`}
          >
            <div className="mb-2 overflow-hidden rounded border border-[var(--ui-border)]/60 bg-white">
              <img
                src={asset.imageUrl}
                alt="generated asset"
                className="h-[104px] w-full object-cover"
                loading="lazy"
              />
            </div>
            <div className="mb-1 flex items-center justify-between gap-2 text-[10px]">
              <span className="rounded bg-[var(--surface-elevated)] px-1.5 py-0.5 text-[var(--ui-muted)]">
                {roleLabel[asset.role]}
              </span>
              <span className="text-[var(--ui-muted)]">
                {new Date(asset.createdAt).toLocaleString("ja-JP")}
              </span>
            </div>
            <div className="mb-2 text-[10px] text-[var(--ui-muted)]">
              {truncate(asset.generationMeta.prompt, 70)}
            </div>
            <div className="flex gap-1.5">
              <button
                type="button"
                className="ui-button h-6 flex-1 px-2 text-[10px]"
                onClick={() => onSelectAsset(asset.id)}
              >
                選択
              </button>
              <button
                type="button"
                className="ui-button h-6 flex-1 px-2 text-[10px]"
                onClick={() => void onBindAsset(asset)}
                disabled={isBinding}
              >
                {isBinding ? "反映中..." : "セクションに反映"}
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
