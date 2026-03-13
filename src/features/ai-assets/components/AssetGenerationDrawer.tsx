"use client";

import { useEffect, useMemo, useState } from "react";
import type {
  AiAssetDensity,
  AiAssetOverlayPosition,
  AiAssetRole,
  AiAssetTextOverlayLevel,
} from "@/src/features/ai-assets/types";
import { buildMetaSummary } from "@/src/features/ai-assets/lib/promptRuleSummary";
import {
  labelDensity,
  labelOverlayPosition,
  labelTextOverlay,
} from "@/src/features/ai-assets/lib/promptDisplayLabels";

type AssetGenerationDrawerProps = {
  open: boolean;
  disabled?: boolean;
  allowedRoles: AiAssetRole[];
  defaultRole: AiAssetRole;
  initialPromptByRole?: Partial<Record<AiAssetRole, string>>;
  initialNegativePromptByRole?: Partial<Record<AiAssetRole, string>>;
  initialMetaByRole?: Partial<Record<AiAssetRole, import("@/src/features/ai-assets/types").BuiltAssetPrompt["meta"]>>;
  initialDensityByRole?: Partial<Record<AiAssetRole, AiAssetDensity>>;
  initialTextOverlayByRole?: Partial<Record<AiAssetRole, AiAssetTextOverlayLevel>>;
  initialOverlayPositionByRole?: Partial<Record<AiAssetRole, AiAssetOverlayPosition>>;
  densityEnabledRoles?: AiAssetRole[];
  textOverlayEnabledRoles?: AiAssetRole[];
  overlayPositionEnabledRoles?: AiAssetRole[];
  onClose: () => void;
  onGenerate: (params: {
    role: AiAssetRole;
    prompt: string;
    negativePrompt?: string;
    density?: AiAssetDensity;
    textOverlay?: AiAssetTextOverlayLevel;
    overlayPosition?: AiAssetOverlayPosition;
  }) => Promise<void>;
};

type OverlayPositionOption = AiAssetOverlayPosition | "auto";
type TextOverlayOption = AiAssetTextOverlayLevel | "auto";
type DensityUiOption = "auto" | "minimal" | "balanced" | "rich";

const mapDensityUiToPrompt = (value: DensityUiOption): AiAssetDensity | undefined => {
  if (value === "minimal") return "low";
  if (value === "balanced") return "medium";
  if (value === "rich") return "high";
  return undefined;
};

const mapPromptDensityToUi = (value: AiAssetDensity | undefined): DensityUiOption => {
  if (value === "low") return "minimal";
  if (value === "high") return "rich";
  if (value === "medium") return "balanced";
  return "balanced";
};

const mapDensityUiToJa = (value: DensityUiOption): string => {
  if (value === "minimal") return "すっきり";
  if (value === "rich") return "情報多め";
  return "標準";
};

const roleLabel: Record<AiAssetRole, string> = {
  heroPc: "ヒーロー画像 (PC)",
  heroSp: "ヒーロー画像 (SP)",
  imageOnly: "画像のみセクション",
  sectionImage: "セクション画像",
  sectionIcon: "セクションアイコン",
};

export default function AssetGenerationDrawer({
  open,
  disabled,
  allowedRoles,
  defaultRole,
  initialPromptByRole,
  initialNegativePromptByRole,
  initialMetaByRole,
  initialDensityByRole,
  initialTextOverlayByRole,
  initialOverlayPositionByRole,
  densityEnabledRoles,
  textOverlayEnabledRoles,
  overlayPositionEnabledRoles,
  onClose,
  onGenerate,
}: AssetGenerationDrawerProps) {
  const [role, setRole] = useState<AiAssetRole>(defaultRole);
  const [prompt, setPrompt] = useState("");
  const [negativePrompt, setNegativePrompt] = useState("");
  const [density, setDensity] = useState<DensityUiOption>("auto");
  const [textOverlay, setTextOverlay] = useState<TextOverlayOption>("auto");
  const [overlayPosition, setOverlayPosition] = useState<OverlayPositionOption>("auto");
  const [submitting, setSubmitting] = useState(false);

  const selectedRole = useMemo(
    () => (allowedRoles.includes(role) ? role : defaultRole),
    [allowedRoles, defaultRole, role],
  );

  const defaultPrompt = useMemo(
    () => initialPromptByRole?.[selectedRole] ?? "",
    [initialPromptByRole, selectedRole],
  );

  const defaultNegativePrompt = useMemo(
    () => initialNegativePromptByRole?.[selectedRole] ?? "",
    [initialNegativePromptByRole, selectedRole],
  );

  const autoMetaSummary = useMemo(() => {
    const meta = initialMetaByRole?.[selectedRole];
    return meta ? buildMetaSummary(meta) : null;
  }, [initialMetaByRole, selectedRole]);

  const canOverrideOverlayPosition = useMemo(
    () => (overlayPositionEnabledRoles?.includes(selectedRole) ?? false),
    [overlayPositionEnabledRoles, selectedRole],
  );

  const canOverrideDensity = useMemo(
    () => (densityEnabledRoles?.includes(selectedRole) ?? false),
    [densityEnabledRoles, selectedRole],
  );

  const initialDensity = useMemo(
    () => initialDensityByRole?.[selectedRole],
    [initialDensityByRole, selectedRole],
  );

  const canOverrideTextOverlay = useMemo(
    () => (textOverlayEnabledRoles?.includes(selectedRole) ?? false),
    [textOverlayEnabledRoles, selectedRole],
  );

  const initialTextOverlay = useMemo(
    () => initialTextOverlayByRole?.[selectedRole],
    [initialTextOverlayByRole, selectedRole],
  );

  const initialOverlayPosition = useMemo(
    () => initialOverlayPositionByRole?.[selectedRole],
    [initialOverlayPositionByRole, selectedRole],
  );

  useEffect(() => {
    if (prompt.trim().length === 0 && defaultPrompt) {
      setPrompt(defaultPrompt);
    }
    if (negativePrompt.trim().length === 0 && defaultNegativePrompt) {
      setNegativePrompt(defaultNegativePrompt);
    }
  }, [defaultNegativePrompt, defaultPrompt, negativePrompt, prompt]);

  useEffect(() => {
    setDensity("auto");
    setTextOverlay("auto");
    setOverlayPosition("auto");
  }, [selectedRole]);

  if (!open) {
    return null;
  }

  return (
    <div className="rounded-md border border-[var(--ui-border)]/60 bg-[var(--surface)] p-3">
      <div className="mb-2 flex items-center justify-between">
        <div className="text-[12px] font-semibold text-[var(--ui-text)]">AI生成設定</div>
        <button
          type="button"
          className="ui-button h-6 px-2 text-[10px]"
          onClick={onClose}
          disabled={disabled || submitting}
        >
          閉じる
        </button>
      </div>

      <label className="mb-2 block text-[11px] text-[var(--ui-muted)]">
        生成対象
        <select
          className="ui-input mt-1 h-7 w-full text-[11px]"
          value={selectedRole}
          onChange={(event) => setRole(event.target.value as AiAssetRole)}
          disabled={disabled || submitting}
        >
          {allowedRoles.map((entry) => (
            <option key={entry} value={entry}>
              {roleLabel[entry]}
            </option>
          ))}
        </select>
      </label>

      {canOverrideDensity ? (
        <label className="mb-2 block text-[11px] text-[var(--ui-muted)]">
          画面密度
          <select
            className="ui-input mt-1 h-7 w-full text-[11px]"
            value={density}
            onChange={(event) => setDensity(event.target.value as DensityUiOption)}
            disabled={disabled || submitting}
          >
            <option value="auto">自動 (既存推定)</option>
            <option value="minimal">すっきり</option>
            <option value="balanced">標準</option>
            <option value="rich">情報多め</option>
          </select>
          <div className="mt-1 text-[10px] text-[var(--ui-muted)]">
            現在の推定: {density === "auto"
              ? labelDensity(initialDensity ?? autoMetaSummary?.density ?? "medium")
              : mapDensityUiToJa(density)}
          </div>
        </label>
      ) : null}

      {canOverrideTextOverlay ? (
        <label className="mb-2 block text-[11px] text-[var(--ui-muted)]">
          文字余白強度
          <select
            className="ui-input mt-1 h-7 w-full text-[11px]"
            value={textOverlay}
            onChange={(event) => setTextOverlay(event.target.value as TextOverlayOption)}
            disabled={disabled || submitting}
          >
            <option value="auto">自動 (既存推定)</option>
            <option value="none">なし</option>
            <option value="light">弱め</option>
            <option value="medium">標準</option>
            <option value="strong">強め</option>
          </select>
          <div className="mt-1 text-[10px] text-[var(--ui-muted)]">
            現在の推定: {labelTextOverlay(initialTextOverlay ?? autoMetaSummary?.textOverlay ?? "medium")}
          </div>
        </label>
      ) : null}

      {canOverrideOverlayPosition ? (
        <label className="mb-2 block text-[11px] text-[var(--ui-muted)]">
          文字余白位置
          <select
            className="ui-input mt-1 h-7 w-full text-[11px]"
            value={overlayPosition}
            onChange={(event) => setOverlayPosition(event.target.value as OverlayPositionOption)}
            disabled={disabled || submitting}
          >
            <option value="auto">自動 (既存推定)</option>
            <option value="left">左に文字余白</option>
            <option value="right">右に文字余白</option>
            <option value="top">上に文字余白</option>
            <option value="bottom">下に文字余白</option>
            <option value="center">中央を空ける</option>
          </select>
          <div className="mt-1 text-[10px] text-[var(--ui-muted)]">
            現在の推定: {labelOverlayPosition(initialOverlayPosition ?? autoMetaSummary?.overlayPosition ?? "right")}
          </div>
        </label>
      ) : null}

      {autoMetaSummary ? (
        <div className="mb-2 rounded border border-[var(--ui-border)]/70 bg-[var(--ui-panel)] px-2 py-2 text-[10px] text-[var(--ui-muted)]">
          <div className="mb-1 flex items-center justify-between">
            <span className="font-semibold text-[var(--ui-text)]">AI補完あり</span>
            <span>ルール {autoMetaSummary.ruleCount}件</span>
          </div>
          <div className="mb-1 flex flex-wrap gap-1">
            <span className="rounded border border-[var(--ui-border)] px-1.5 py-0.5">対象: {autoMetaSummary.targetLabel}</span>
            <span className="rounded border border-[var(--ui-border)] px-1.5 py-0.5">トーン: {autoMetaSummary.toneLabel}</span>
            <span className="rounded border border-[var(--ui-border)] px-1.5 py-0.5">密度: {autoMetaSummary.densityLabel}</span>
            <span className="rounded border border-[var(--ui-border)] px-1.5 py-0.5">余白強度: {autoMetaSummary.textOverlayLabel}</span>
            <span className="rounded border border-[var(--ui-border)] px-1.5 py-0.5">余白位置: {autoMetaSummary.overlayPositionLabel}</span>
            <span className="rounded border border-[var(--ui-border)] px-1.5 py-0.5">訴求: {autoMetaSummary.campaignFamilyLabel}</span>
            <span className="rounded border border-[var(--ui-border)] px-1.5 py-0.5">セクション: {autoMetaSummary.sectionTypeLabel}</span>
          </div>
          {autoMetaSummary.sourceSummary.length > 0 ? (
            <div className="mb-1 text-[10px] text-[var(--ui-muted)]">
              判定: {autoMetaSummary.sourceSummary.join(" / ")}
            </div>
          ) : null}
          {autoMetaSummary.rules.length > 0 ? (
            <div className="flex flex-wrap gap-1">
              {autoMetaSummary.rules.map((rule) => (
                <span key={rule} className="rounded bg-[var(--surface-2)] px-1.5 py-0.5 text-[10px] text-[var(--ui-text)]">
                  {rule}
                </span>
              ))}
              {autoMetaSummary.hiddenRuleCount > 0 ? (
                <span className="rounded bg-[var(--surface-2)] px-1.5 py-0.5 text-[10px] text-[var(--ui-muted)]">
                  他 {autoMetaSummary.hiddenRuleCount} 件
                </span>
              ) : null}
            </div>
          ) : null}
        </div>
      ) : null}

      <label className="mb-2 block text-[11px] text-[var(--ui-muted)]">
        プロンプト
        <textarea
          className="ui-input mt-1 min-h-[76px] w-full resize-y px-2 py-1.5 text-[11px]"
          value={prompt}
          onChange={(event) => setPrompt(event.target.value)}
          placeholder="例: 春らしい背景で、視認性が高い明るいヒーロービジュアル"
          disabled={disabled || submitting}
        />
      </label>

      <label className="mb-3 block text-[11px] text-[var(--ui-muted)]">
        ネガティブプロンプト (任意)
        <input
          className="ui-input mt-1 h-7 w-full text-[11px]"
          value={negativePrompt}
          onChange={(event) => setNegativePrompt(event.target.value)}
          placeholder="例: ぼやけ, 低解像度, 読めない文字"
          disabled={disabled || submitting}
        />
      </label>

      <button
        type="button"
        className="ui-button h-7 w-full px-2 text-[11px]"
        disabled={disabled || submitting || prompt.trim().length === 0}
        onClick={async () => {
          setSubmitting(true);
          try {
            await onGenerate({
              role: selectedRole,
              prompt: prompt.trim(),
              negativePrompt: negativePrompt.trim() || undefined,
              density:
                canOverrideDensity
                  ? mapDensityUiToPrompt(density)
                  : undefined,
              textOverlay:
                canOverrideTextOverlay && textOverlay !== "auto"
                  ? textOverlay
                  : undefined,
              overlayPosition:
                canOverrideOverlayPosition && overlayPosition !== "auto"
                  ? overlayPosition
                  : undefined,
            });
            setPrompt("");
            setNegativePrompt("");
          } finally {
            setSubmitting(false);
          }
        }}
      >
        {submitting ? "生成開始中..." : "生成を開始"}
      </button>
    </div>
  );
}
