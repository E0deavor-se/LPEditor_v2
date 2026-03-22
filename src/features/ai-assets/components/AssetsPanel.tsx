"use client";

import { useMemo, useState } from "react";
import type {
  AiAssetGenerationJob,
  AiAssetRole,
  AiGeneratedAsset,
} from "@/src/features/ai-assets/types";

type AssetsPanelProps = {
  assets: AiGeneratedAsset[];
  selectedAssetId?: string | null;
  roleFilter?: AiAssetRole;
  defaultRoleFilter?: AiAssetRole;
  currentSectionLabel?: string;
  currentBoundAssetIdByRole?: Partial<Record<AiAssetRole, string>>;
  currentJob?: AiAssetGenerationJob | null;
  onSelectAsset: (assetId: string) => void;
  onBindAsset: (asset: AiGeneratedAsset) => Promise<void>;
  onRegenerateFromAsset?: (asset: AiGeneratedAsset) => Promise<void>;
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
  defaultRoleFilter,
  currentSectionLabel,
  currentBoundAssetIdByRole,
  currentJob,
  onSelectAsset,
  onBindAsset,
  onRegenerateFromAsset,
  bindingAssetId,
}: AssetsPanelProps) {
  const [showInUseOnly, setShowInUseOnly] = useState(false);
  const [showUnboundOnly, setShowUnboundOnly] = useState(false);
  const [roleView, setRoleView] = useState<AiAssetRole | "all">(
    roleFilter ?? defaultRoleFilter ?? "all",
  );

  const boundByRole = useMemo(
    () => currentBoundAssetIdByRole ?? {},
    [currentBoundAssetIdByRole],
  );

  const childCountByParentId = useMemo(() => {
    const counts: Record<string, number> = {};
    assets.forEach((asset) => {
      const parentId = asset.generationMeta.derivedFromAssetId;
      if (!parentId) {
        return;
      }
      counts[parentId] = (counts[parentId] ?? 0) + 1;
    });
    return counts;
  }, [assets]);

  const sortAssetsForComparison = useMemo(() => {
    const byId = new Map(assets.map((asset) => [asset.id, asset]));
    const childrenByParent = new Map<string, AiGeneratedAsset[]>();

    assets.forEach((asset) => {
      const parentId = asset.generationMeta.derivedFromAssetId;
      if (!parentId || !byId.has(parentId)) {
        return;
      }
      const list = childrenByParent.get(parentId) ?? [];
      list.push(asset);
      childrenByParent.set(parentId, list);
    });

    const roots = assets
      .filter((asset) => {
        const parentId = asset.generationMeta.derivedFromAssetId;
        return !parentId || !byId.has(parentId);
      })
      .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));

    const ordered: AiGeneratedAsset[] = [];
    const visited = new Set<string>();

    const pushWithChildren = (asset: AiGeneratedAsset) => {
      if (visited.has(asset.id)) {
        return;
      }
      visited.add(asset.id);
      ordered.push(asset);
      const children = (childrenByParent.get(asset.id) ?? []).sort((a, b) =>
        a.createdAt < b.createdAt ? 1 : -1,
      );
      children.forEach((child) => pushWithChildren(child));
    };

    roots.forEach((root) => pushWithChildren(root));
    assets.forEach((asset) => pushWithChildren(asset));

    return ordered;
  }, [assets]);

  const visibleAssets = useMemo(() => {
    const byRole = roleView !== "all"
      ? sortAssetsForComparison.filter((entry) => entry.role === roleView)
      : sortAssetsForComparison;

    return byRole.filter((asset) => {
      const isInUse = boundByRole[asset.role] === asset.id;
      const hasBindingHistory = asset.bindHistory.length > 0;
      if (showInUseOnly && !isInUse) {
        return false;
      }
      if (showUnboundOnly && (isInUse || hasBindingHistory)) {
        return false;
      }
      return true;
    });
  }, [boundByRole, roleView, showInUseOnly, showUnboundOnly, sortAssetsForComparison]);

  const roleFilterDisabled = Boolean(roleFilter);

  return (
    <div className="space-y-2">
      <div className="rounded-md border border-[var(--ui-border)]/60 bg-[var(--ui-panel)] px-2 py-1.5 text-[10px] text-[var(--ui-muted)]">
        <div className="mb-1 flex flex-wrap items-center gap-1.5">
          <label className="inline-flex items-center gap-1">
            <span>役割</span>
            <select
              className="ui-input h-6 min-w-[92px] px-1 text-[10px]"
              value={roleFilter ?? roleView}
              onChange={(event) => setRoleView(event.target.value as AiAssetRole | "all")}
              disabled={roleFilterDisabled}
            >
              <option value="all">すべて</option>
              <option value="heroPc">ヒーローPC</option>
              <option value="heroSp">ヒーローSP</option>
              <option value="imageOnly">画像のみ</option>
              <option value="sectionImage">画像</option>
              <option value="sectionIcon">アイコン</option>
            </select>
          </label>
          <button
            type="button"
            className="ui-button h-6 px-2 text-[10px]"
            onClick={() => setShowInUseOnly((prev) => !prev)}
          >
            {showInUseOnly ? "採用中のみ: ON" : "採用中のみ"}
          </button>
          <button
            type="button"
            className="ui-button h-6 px-2 text-[10px]"
            onClick={() => setShowUnboundOnly((prev) => !prev)}
          >
            {showUnboundOnly ? "未使用のみ: ON" : "未使用のみ"}
          </button>
        </div>
        <div>{visibleAssets.length} 件表示</div>
      </div>

      {visibleAssets.length === 0 ? (
        <div className="rounded-md border border-dashed border-[var(--ui-border)]/70 px-2.5 py-3 text-[11px] text-[var(--ui-muted)]">
          まだAI生成アセットがありません。上の「AI生成」から作成してください。
        </div>
      ) : null}

      {visibleAssets.map((asset) => {
        const isSelected = selectedAssetId === asset.id;
        const isBinding = bindingAssetId === asset.id;
        const isInUse = boundByRole[asset.role] === asset.id;
        const hasBindingHistory = asset.bindHistory.length > 0;
        const isGeneratingForRole =
          currentJob?.role === asset.role &&
          (currentJob.status === "queued" || currentJob.status === "running");
        const parentId = asset.generationMeta.derivedFromAssetId;
        const hasParent = typeof parentId === "string" && parentId.length > 0;
        const childCount = childCountByParentId[asset.id] ?? 0;
        const hasSeries = hasParent || childCount > 0;
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
              <div className="flex flex-wrap items-center gap-1">
                <span className="rounded bg-[var(--surface-elevated)] px-1.5 py-0.5 text-[var(--ui-muted)]">
                  {roleLabel[asset.role]}
                </span>
                {isInUse ? (
                  <span className="rounded bg-emerald-100 px-1.5 py-0.5 text-emerald-700">採用中</span>
                ) : null}
                {isBinding ? (
                  <span className="rounded bg-amber-100 px-1.5 py-0.5 text-amber-700">反映中</span>
                ) : null}
                {isGeneratingForRole ? (
                  <span className="rounded bg-blue-100 px-1.5 py-0.5 text-blue-700">生成中</span>
                ) : null}
                <span className="rounded bg-[var(--surface-elevated)] px-1.5 py-0.5 text-[var(--ui-muted)]">
                  {hasBindingHistory ? "バインド済み" : "未使用"}
                </span>
                {asset.bindHistory.length > 1 ? (
                  <span className="rounded bg-[var(--surface-elevated)] px-1.5 py-0.5 text-[var(--ui-muted)]">
                    再採用 {asset.bindHistory.length}回
                  </span>
                ) : null}
                {hasParent ? (
                  <span className="rounded bg-violet-100 px-1.5 py-0.5 text-violet-700">派生</span>
                ) : childCount > 0 ? (
                  <span className="rounded bg-indigo-100 px-1.5 py-0.5 text-indigo-700">元画像</span>
                ) : null}
              </div>
              <span className="text-[var(--ui-muted)]">
                {new Date(asset.createdAt).toLocaleString("ja-JP")}
              </span>
            </div>
            <div className="mb-1 flex flex-wrap gap-1 text-[10px]">
              <span className="rounded border border-[var(--ui-border)]/70 px-1.5 py-0.5 text-[var(--ui-muted)]">
                状態: {isGeneratingForRole ? "生成中" : "生成済み"}
              </span>
              <span className="rounded border border-[var(--ui-border)]/70 px-1.5 py-0.5 text-[var(--ui-muted)]">
                セクション: {currentSectionLabel ?? asset.sectionId}
              </span>
              <span className="rounded border border-[var(--ui-border)]/70 px-1.5 py-0.5 text-[var(--ui-muted)]">
                種別: {asset.sourceType === "generated" ? "AI生成" : "アップロード"}
              </span>
              {hasParent ? (
                <span className="rounded border border-[var(--ui-border)]/70 px-1.5 py-0.5 text-[var(--ui-muted)]">
                  元あり
                </span>
              ) : null}
              {hasSeries ? (
                <span className="rounded border border-[var(--ui-border)]/70 px-1.5 py-0.5 text-[var(--ui-muted)]">
                  同系候補 {hasParent ? (childCountByParentId[parentId ?? ""] ?? 0) + 1 : childCount + 1}件
                </span>
              ) : null}
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
              {onRegenerateFromAsset ? (
                <button
                  type="button"
                  className="ui-button h-6 flex-1 px-2 text-[10px]"
                  onClick={() => void onRegenerateFromAsset(asset)}
                  disabled={isGeneratingForRole}
                >
                  {isGeneratingForRole ? "生成中..." : "この画像から再生成"}
                </button>
              ) : null}
            </div>
          </div>
        );
      })}
    </div>
  );
}
