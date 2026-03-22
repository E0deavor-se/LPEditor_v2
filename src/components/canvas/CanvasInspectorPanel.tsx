/* ───────────────────────────────────────────────
   Canvas Inspector Panel – 右パネル
   選択レイヤーのプロパティ編集
   ─────────────────────────────────────────────── */

"use client";

import { useMemo, useCallback, useEffect, useRef, useState, type KeyboardEvent as ReactKeyboardEvent } from "react";
import { Sparkles, ImageIcon, Loader2 } from "lucide-react";
import { useCanvasEditorStore } from "@/src/store/canvasEditorStore";
import { useEditorStore } from "@/src/store/editorStore";
import type { CanvasLayer, LayerStyle, CanvasLayout, LayerShadow, CanvasBackground } from "@/src/types/canvas";
import { getDocumentMode, getLayout, createImageLayer, getSectionContentYOffset } from "@/src/types/canvas";
import { parseLayerShadow } from "@/src/lib/canvas/shadow";
import {
  runCanvasAiGenerate,
  runCanvasAiDecorationGenerate,
  runCanvasAiSectionDesign,
  buildCanvasSectionDesignPlan,
  buildCanvasDecorationPlan,
  buildCanvasDecorationPlacement,
  inferSectionTypeFromName,
  generateAiBatchId,
  inferAiSetType,
  CANVAS_AI_TARGET_LABELS,
  CANVAS_AI_DECORATION_LABELS,
  CANVAS_AI_SET_LABELS,
  type CanvasAiActionTarget,
  type CanvasAiDecorationKind,
  type CanvasAiSetType,
} from "@/src/features/canvas-ai/canvasAiEngine";
import InspectorShell from "@/src/components/inspector/InspectorShell";
import InspectorHeader from "@/src/components/inspector/InspectorHeader";
import InspectorField from "@/src/components/inspector/InspectorField";
import InspectorSection from "@/src/components/inspector/InspectorSection";
import InspectorFieldRow from "@/src/components/inspector/InspectorFieldRow";
import InspectorInput from "@/src/components/inspector/InspectorInput";
import InspectorTextarea from "@/src/components/inspector/InspectorTextarea";
import InspectorSelect from "@/src/components/inspector/InspectorSelect";
import InspectorColorInput from "@/src/components/inspector/InspectorColorInput";
import { buildAiBatchSummaries, buildAiBatchSummaryMap } from "@/src/lib/canvas/aiSetCompare";

/* ---------- 再利用フィールド ---------- */

type NumFieldProps = {
  label: string;
  value: number;
  onChange: (v: number) => void;
  min?: number;
  max?: number;
  step?: number;
  unit?: string;
  /** Shift+Arrow の倍率（default=10） */
  shiftStep?: number;
};

const NumField = ({ label, value, onChange, min, max, step = 1, unit, shiftStep = 10 }: NumFieldProps) => {
  const [draft, setDraft] = useState<string | null>(null);

  const commit = (raw: string) => {
    const n = Number(raw);
    if (!Number.isNaN(n)) {
      let clamped = n;
      if (min !== undefined) clamped = Math.max(min, clamped);
      if (max !== undefined) clamped = Math.min(max, clamped);
      onChange(clamped);
    }
    setDraft(null);
  };

  const handleKeyDown = (e: ReactKeyboardEvent<HTMLInputElement>) => {
    if (e.key === "ArrowUp" || e.key === "ArrowDown") {
      e.preventDefault();
      e.stopPropagation();
      const mult = e.shiftKey ? shiftStep : 1;
      const delta = (e.key === "ArrowUp" ? 1 : -1) * step * mult;
      let next = value + delta;
      // round to step precision to avoid floating-point drift
      const precision = step < 1 ? Math.ceil(-Math.log10(step)) : 0;
      next = Number(next.toFixed(precision));
      if (min !== undefined) next = Math.max(min, next);
      if (max !== undefined) next = Math.min(max, next);
      onChange(next);
      setDraft(null);
      return;
    }
    if (e.key === "Enter") {
      commit((e.target as HTMLInputElement).value);
    }
  };

  return (
    <InspectorField label={label} helper={unit}>
      <InspectorInput
        type="number"
        value={draft ?? value}
        min={min}
        max={max}
        step={step}
        onChange={(e) => {
          const raw = e.target.value;
          setDraft(raw);
          const n = Number(raw);
          if (!Number.isNaN(n)) {
            let clamped = n;
            if (min !== undefined) clamped = Math.max(min, clamped);
            if (max !== undefined) clamped = Math.min(max, clamped);
            onChange(clamped);
          }
        }}
        onBlur={(e) => commit(e.target.value)}
        onKeyDown={handleKeyDown}
      />
    </InspectorField>
  );
};

type ColorFieldProps = {
  label: string;
  value: string;
  onChange: (v: string) => void;
};

const ColorField = ({ label, value, onChange }: ColorFieldProps) => (
  <InspectorField label={label}>
    <div className="flex items-center gap-1.5">
      <InspectorColorInput value={value} onChange={(e) => onChange(e.target.value)} />
      <InspectorInput type="text" value={value} onChange={(e) => onChange(e.target.value)} />
    </div>
  </InspectorField>
);

const TextField = ({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) => (
  <InspectorField label={label}>
    <InspectorTextarea
      rows={3}
      value={value}
      onChange={(e) => onChange(e.target.value)}
    />
  </InspectorField>
);

const SelectField = ({ label, value, options, onChange }: {
  label: string;
  value: string;
  options: { value: string; label: string }[];
  onChange: (v: string) => void;
}) => (
  <InspectorField label={label}>
    <InspectorSelect value={value} onChange={(e) => onChange(e.target.value)}>
      {options.map((o) => (
        <option key={o.value} value={o.value}>{o.label}</option>
      ))}
    </InspectorSelect>
  </InspectorField>
);

/* ====================== AI Section Composer Panel ====================== */

function CanvasAiActionPanel({
  sectionId,
  sectionName,
}: {
  sectionId: string;
  sectionName: string;
}) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [statusMsg, setStatusMsg] = useState<string | null>(null);

  const doc = useCanvasEditorStore((s) => s.document);
  const device = useCanvasEditorStore((s) => s.device);
  const updateSection = useCanvasEditorStore((s) => s.updateSection);
  const addLayer = useCanvasEditorStore((s) => s.addLayer);
  const updateLayerLayout = useCanvasEditorStore((s) => s.updateLayerLayout);
  const withHistoryBatch = useCanvasEditorStore((s) => s.withHistoryBatch);
  const addAsset = useEditorStore((s) => s.addAsset);
  const project = useEditorStore((s) => s.project);

  const meta = project.meta as Record<string, unknown>;
  const themeId = project.themeSpec?.themeId ?? (meta?.themeId as string | undefined);
  const designWidth = device === "pc" ? doc.meta.size.pc.width : doc.meta.size.sp.width;
  const pcWidth = doc.meta.size.pc.width;
  const visualWeight = project.layoutSuggestion?.visualWeight ?? "medium";
  const spacingScale = project.layoutSuggestion?.spacingScale ?? "normal";

  const buildCommonParams = () => ({
    sectionName,
    sectionId,
    campaignType: meta?.campaignType as string | undefined,
    themeId,
    pcWidth,
  });

  const insertDecorationAsset = (imageUrl: string, kind: CanvasAiDecorationKind, batchId?: string, setType?: CanvasAiSetType) => {
    const assetId = addAsset({
      filename: `canvas-ai-decoration-${kind}-${Date.now()}.png`,
      data: imageUrl,
    });
    const placement = buildCanvasDecorationPlacement(kind, sectionName, designWidth, visualWeight);
    const baseLayer = createImageLayer(assetId, `[AI] ${CANVAS_AI_DECORATION_LABELS[kind]}`, {
      w: placement.w,
      h: placement.h,
    });
    const layer = batchId
      ? { ...baseLayer, insertedByAi: true as const, aiBatchId: batchId, aiSetType: setType, aiSetLabel: setType ? CANVAS_AI_SET_LABELS[setType] : undefined }
      : { ...baseLayer, insertedByAi: true as const };
    addLayer(layer);
    const contentYOffset = getSectionContentYOffset(doc.sections?.sections ?? [], sectionId, device);
    updateLayerLayout(layer.id, {
      x: placement.x,
      y: contentYOffset + placement.y,
      w: placement.w,
      h: placement.h,
      z: placement.z,
    });
  };

  /** 個別アクション（セクション背景を生成 / 画像を配置 など） */
  const handleGenerate = async (target: CanvasAiActionTarget) => {
    setIsGenerating(true);
    setStatusMsg("生成中…");
    try {
      const { imageUrl } = await runCanvasAiGenerate({
        target,
        ...buildCommonParams(),
      });

      const assetId = addAsset({
        filename: `canvas-ai-${target}-${Date.now()}.png`,
        data: imageUrl,
      });

      await withHistoryBatch(async () => {
        if (target === "sectionBackground" || target === "heroBackground") {
          updateSection(sectionId, {
            background: { type: "image", assetId } as CanvasBackground,
          });
          setStatusMsg("背景を設定しました");
        } else {
          const imgW = Math.min(800, pcWidth - 80);
          const imgH = Math.round(imgW * (target === "heroImage" ? 0.56 : 0.5));
          const singleBatchId = generateAiBatchId();
          const singleSetType = inferAiSetType(sectionName);
          const baseLayer = createImageLayer(assetId, `[AI] ${CANVAS_AI_TARGET_LABELS[target]}`, {
            w: imgW,
            h: imgH,
          });
          const layer = { ...baseLayer, insertedByAi: true as const, aiBatchId: singleBatchId, aiSetType: singleSetType, aiSetLabel: CANVAS_AI_SET_LABELS[singleSetType] };
          addLayer(layer);
          setStatusMsg("画像を追加しました");
        }
      });

      window.setTimeout(() => setStatusMsg(null), 2400);
    } catch (err) {
      setStatusMsg(err instanceof Error ? err.message : "生成に失敗しました");
      window.setTimeout(() => setStatusMsg(null), 3500);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleDecorationGenerate = async (kind: CanvasAiDecorationKind) => {
    setIsGenerating(true);
    setStatusMsg("装飾を生成中…");
    const batchId = generateAiBatchId();
    const setType = inferAiSetType(sectionName);
    try {
      const { imageUrl } = await runCanvasAiDecorationGenerate({
        ...buildCommonParams(),
        decorationKind: kind,
        visualWeight,
        spacingScale,
      });
      await withHistoryBatch(async () => {
        insertDecorationAsset(imageUrl, kind, batchId, setType);
      });
      setStatusMsg("装飾を追加しました");
      window.setTimeout(() => setStatusMsg(null), 2400);
    } catch (err) {
      setStatusMsg(err instanceof Error ? err.message : "装飾生成に失敗しました");
      window.setTimeout(() => setStatusMsg(null), 3500);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleDecorationAll = async () => {
    setIsGenerating(true);
    const batchId = generateAiBatchId();
    const setType = inferAiSetType(sectionName);
    const decorationPlan = buildCanvasDecorationPlan(sectionName, visualWeight);
    setStatusMsg(`装飾を生成中… (0/${decorationPlan.decorationKinds.length})`);
    try {
      const settled = await Promise.allSettled(
        decorationPlan.decorationKinds.map((kind) =>
          runCanvasAiDecorationGenerate({
            ...buildCommonParams(),
            decorationKind: kind,
            visualWeight,
            spacingScale,
          }),
        ),
      );
      let applied = 0;
      await withHistoryBatch(async () => {
        for (const item of settled) {
          if (item.status === "fulfilled") {
            insertDecorationAsset(item.value.imageUrl, item.value.kind, batchId, setType);
            applied += 1;
          }
        }
      });
      setStatusMsg(applied > 0 ? `装飾を追加しました (${applied}/${decorationPlan.decorationKinds.length})` : "装飾生成に失敗しました");
      window.setTimeout(() => setStatusMsg(null), 3000);
    } catch (err) {
      setStatusMsg(err instanceof Error ? err.message : "装飾生成に失敗しました");
      window.setTimeout(() => setStatusMsg(null), 4000);
    } finally {
      setIsGenerating(false);
    }
  };

  /**
   * 一発適用: sectionType に基づき背景＋画像をまとめて生成・適用する。
   * 背景は updateSection、画像は addLayer で追加。部分成功を許容。
   */
  const handleDesignAll = async () => {
    setIsGenerating(true);
    const sectionType = inferSectionTypeFromName(sectionName);
    const plan = buildCanvasSectionDesignPlan(sectionName);
    const decorationPlan = buildCanvasDecorationPlan(sectionName, visualWeight);
    const totalCount = 1 + plan.imageTargets.length + decorationPlan.decorationKinds.length;
    const batchId = generateAiBatchId();
    const setType = inferAiSetType(sectionName);
    setStatusMsg(`デザインを生成中… (0/${totalCount})`);

    try {
      const result = await runCanvasAiSectionDesign({
        ...buildCommonParams(),
        visualWeight,
        spacingScale,
      });

      let applied = 0;
      await withHistoryBatch(async () => {
        // 背景を適用
        if (result.background) {
          const bgAssetId = addAsset({
            filename: `canvas-ai-bg-${sectionType}-${Date.now()}.png`,
            data: result.background.imageUrl,
          });
          updateSection(sectionId, {
            background: { type: "image", assetId: bgAssetId } as CanvasBackground,
          });
          applied += 1;
        }

        // 画像 layer を適用
        for (const img of result.images) {
          const imgAssetId = addAsset({
            filename: `canvas-ai-img-${img.target}-${Date.now()}.png`,
            data: img.imageUrl,
          });
          const imgW = Math.min(800, pcWidth - 80);
          const imgH = Math.round(imgW * (img.target === "heroImage" ? 0.56 : 0.5));
          const baseImgLayer = createImageLayer(
            imgAssetId,
            `[AI] ${CANVAS_AI_TARGET_LABELS[img.target]}`,
            { w: imgW, h: imgH },
          );
          const imgLayer = { ...baseImgLayer, insertedByAi: true as const, aiBatchId: batchId, aiSetType: setType, aiSetLabel: CANVAS_AI_SET_LABELS[setType] };
          addLayer(imgLayer);
          applied += 1;
        }

        for (const decoration of result.decorations) {
          insertDecorationAsset(decoration.imageUrl, decoration.kind, batchId, setType);
          applied += 1;
        }
      });

      if (result.errors.length === 0) {
        setStatusMsg(`適用完了 (${applied}/${totalCount})`);
      } else if (applied > 0) {
        setStatusMsg(`一部適用済み (${applied}/${totalCount})`);
      } else {
        setStatusMsg("生成に失敗しました");
      }
      window.setTimeout(() => setStatusMsg(null), 3000);
    } catch (err) {
      setStatusMsg(err instanceof Error ? err.message : "生成に失敗しました");
      window.setTimeout(() => setStatusMsg(null), 4000);
    } finally {
      setIsGenerating(false);
    }
  };

  const INDIVIDUAL_TARGETS: CanvasAiActionTarget[] = [
    "sectionBackground",
    "sectionImage",
    "heroImage",
    "heroBackground",
  ];
  const DECORATION_TARGETS: CanvasAiDecorationKind[] = ["badge", "ribbon", "icon", "shape"];

  return (
    <InspectorSection title="AI 生成" defaultOpen={false}>
      <div className="space-y-1.5 pb-1">
        {/* ─── 一発適用 ─── */}
        <button
          type="button"
          disabled={isGenerating}
          className="w-full flex items-center justify-center gap-1.5 px-2 py-2 text-[11px] font-semibold rounded bg-[color-mix(in_srgb,var(--ui-accent,#6366f1)_12%,transparent)] border border-[color-mix(in_srgb,var(--ui-accent,#6366f1)_30%,transparent)] text-[var(--ui-text)] hover:bg-[color-mix(in_srgb,var(--ui-accent,#6366f1)_20%,transparent)] disabled:opacity-40 transition-colors"
          onClick={() => { void handleDesignAll(); }}
        >
          {isGenerating ? (
            <Loader2 size={11} className="animate-spin flex-shrink-0" />
          ) : (
            <Sparkles size={11} className="flex-shrink-0" />
          )}
          このセクションをAIデザイン
        </button>

        <button
          type="button"
          disabled={isGenerating}
          className="w-full flex items-center justify-center gap-1.5 px-2 py-2 text-[11px] font-semibold rounded border border-[var(--ui-border)] hover:bg-[color-mix(in_srgb,var(--ui-text)_6%,transparent)] disabled:opacity-40 transition-colors"
          onClick={() => { void handleDecorationAll(); }}
        >
          {isGenerating ? (
            <Loader2 size={11} className="animate-spin flex-shrink-0" />
          ) : (
            <Sparkles size={11} className="flex-shrink-0" />
          )}
          このセクションの装飾をAI生成
        </button>

        <div className="flex items-center gap-1 py-0.5">
          <div className="flex-1 h-px bg-[var(--ui-border)]" />
          <span className="text-[9px] text-[var(--ui-muted)] uppercase tracking-wider">装飾</span>
          <div className="flex-1 h-px bg-[var(--ui-border)]" />
        </div>

        {DECORATION_TARGETS.map((kind) => (
          <button
            key={kind}
            type="button"
            disabled={isGenerating}
            className="w-full flex items-center gap-1.5 px-2 py-1.5 text-[11px] rounded border border-[var(--ui-border)] hover:bg-[color-mix(in_srgb,var(--ui-text)_6%,transparent)] disabled:opacity-40 transition-colors"
            onClick={() => { void handleDecorationGenerate(kind); }}
          >
            <Sparkles size={10} className="flex-shrink-0 opacity-60" />
            {CANVAS_AI_DECORATION_LABELS[kind]}
          </button>
        ))}

        {/* ─── 個別アクション ─── */}
        <div className="flex items-center gap-1 py-0.5">
          <div className="flex-1 h-px bg-[var(--ui-border)]" />
          <span className="text-[9px] text-[var(--ui-muted)] uppercase tracking-wider">個別生成</span>
          <div className="flex-1 h-px bg-[var(--ui-border)]" />
        </div>

        {INDIVIDUAL_TARGETS.map((target) => (
          <button
            key={target}
            type="button"
            disabled={isGenerating}
            className="w-full flex items-center gap-1.5 px-2 py-1.5 text-[11px] rounded border border-[var(--ui-border)] hover:bg-[color-mix(in_srgb,var(--ui-text)_6%,transparent)] disabled:opacity-40 transition-colors"
            onClick={() => { void handleGenerate(target); }}
          >
            <ImageIcon size={10} className="flex-shrink-0 opacity-50" />
            {CANVAS_AI_TARGET_LABELS[target]}
          </button>
        ))}

        {statusMsg && (
          <p className="text-[10px] text-[var(--ui-muted)] pt-0.5">{statusMsg}</p>
        )}
        <p className="text-[10px] text-[var(--ui-muted)] pt-0.5 leading-tight">
          キャンペーン情報・テーマを生成に反映します
        </p>
      </div>
    </InspectorSection>
  );
}

/* ====================== Inspector ====================== */

export default function CanvasInspectorPanel() {
  const doc = useCanvasEditorStore((s) => s.document);
  const device = useCanvasEditorStore((s) => s.device);
  const getRenderableLayers = useCanvasEditorStore((s) => s.getRenderableLayers);
  const selection = useCanvasEditorStore((s) => s.selection);
  const addLayer = useCanvasEditorStore((s) => s.addLayer);
  const removeAiBatch = useCanvasEditorStore((s) => s.removeAiBatch);
  const getLayersByAiBatch = useCanvasEditorStore((s) => s.getLayersByAiBatch);
  const updateLayerLayout = useCanvasEditorStore((s) => s.updateLayerLayout);
  const updateLayerStyle = useCanvasEditorStore((s) => s.updateLayerStyle);
  const updateLayerConstraints = useCanvasEditorStore((s) => s.updateLayerConstraints);
  const updateImageLayerSettings = useCanvasEditorStore((s) => s.updateImageLayerSettings);
  const updateLayerContent = useCanvasEditorStore((s) => s.updateLayerContent);
  const selectAiBatch = useCanvasEditorStore((s) => s.selectAiBatch);
  const isAiBatchSelected = useCanvasEditorStore((s) => s.isAiBatchSelected);
  const withHistoryBatch = useCanvasEditorStore((s) => s.withHistoryBatch);
  const pushSnapshot = useCanvasEditorStore((s) => s.pushSnapshot);
  const selectedSectionId = useCanvasEditorStore((s) => s.selectedSectionId);
  const updateSection = useCanvasEditorStore((s) => s.updateSection);
  const addAsset = useEditorStore((s) => s.addAsset);
  const project = useEditorStore((s) => s.project);
  const [isAiSetBusy, setIsAiSetBusy] = useState(false);
  const [aiSetStatusMsg, setAiSetStatusMsg] = useState<string | null>(null);

  const historyOpenRef = useRef<{ layout: boolean; style: boolean; content: boolean }>({
    layout: false,
    style: false,
    content: false,
  });
  const historyTimerRef = useRef<{ layout: number | null; style: number | null; content: number | null }>({
    layout: null,
    style: null,
    content: null,
  });

  const beginHistoryBurst = useCallback((kind: "layout" | "style" | "content") => {
    if (!historyOpenRef.current[kind]) {
      pushSnapshot();
      historyOpenRef.current[kind] = true;
    }
    const timer = historyTimerRef.current[kind];
    if (timer) window.clearTimeout(timer);
    historyTimerRef.current[kind] = window.setTimeout(() => {
      historyOpenRef.current[kind] = false;
      historyTimerRef.current[kind] = null;
    }, 180);
  }, [pushSnapshot]);

  useEffect(() => () => {
    const timers = historyTimerRef.current;
    if (timers.layout) window.clearTimeout(timers.layout);
    if (timers.style) window.clearTimeout(timers.style);
    if (timers.content) window.clearTimeout(timers.content);
  }, []);

  const renderableLayers = getRenderableLayers(device).filter((l) => !l.id.startsWith("section-bg:"));
  const aiBatchSummaries = useMemo(
    () => buildAiBatchSummaries(renderableLayers),
    [renderableLayers],
  );
  const aiBatchSummaryMap = useMemo(
    () => buildAiBatchSummaryMap(renderableLayers),
    [renderableLayers],
  );
  const selectedLayer: CanvasLayer | undefined = useMemo(
    () => renderableLayers.find((l) => l.id === selection.primaryId),
    [renderableLayers, selection.primaryId]
  );

  const layout: CanvasLayout | undefined = selectedLayer ? getLayout(selectedLayer, device) : undefined;
  const style: LayerStyle | undefined = selectedLayer?.style;

  /* --- generic patch helpers --- */
  const patchLayout = useCallback(
    (patch: Partial<CanvasLayout>) => {
      if (!selectedLayer) return;
      beginHistoryBurst("layout");
      updateLayerLayout(selectedLayer.id, patch);
    },
    [selectedLayer, updateLayerLayout, beginHistoryBurst]
  );

  const patchStyle = useCallback(
    (patch: Partial<LayerStyle>) => {
      if (!selectedLayer) return;
      beginHistoryBurst("style");
      updateLayerStyle(selectedLayer.id, patch);
    },
    [selectedLayer, updateLayerStyle, beginHistoryBurst]
  );

  const patchContent = useCallback(
    (patch: Record<string, unknown>) => {
      if (!selectedLayer) return;
      beginHistoryBurst("content");
      updateLayerContent(selectedLayer.id, patch);
    },
    [selectedLayer, updateLayerContent, beginHistoryBurst]
  );

  const patchConstraints = useCallback(
    (patch: { horizontal?: "fixed" | "left" | "right" | "stretch"; marginLeft?: number; marginRight?: number }) => {
      if (!selectedLayer) return;
      beginHistoryBurst("layout");
      updateLayerConstraints(selectedLayer.id, patch);
    },
    [selectedLayer, updateLayerConstraints, beginHistoryBurst]
  );

  const patchImageSettings = useCallback(
    (patch: { lockAspect?: boolean; fitMode?: "contain" | "cover"; focalPoint?: { x?: number; y?: number } }) => {
      if (!selectedLayer || selectedLayer.content.kind !== "image") return;
      beginHistoryBurst("content");
      const current = selectedLayer.imageSettings ?? {
        lockAspect: true,
        fitMode: "cover" as const,
        focalPoint: { x: 0.5, y: 0.5 },
      };
      updateImageLayerSettings(selectedLayer.id, {
        ...(patch.lockAspect !== undefined ? { lockAspect: patch.lockAspect } : {}),
        ...(patch.fitMode !== undefined ? { fitMode: patch.fitMode } : {}),
        ...(patch.focalPoint
          ? {
              focalPoint: {
                x: patch.focalPoint.x !== undefined ? Math.max(0, Math.min(1, patch.focalPoint.x)) : current.focalPoint.x,
                y: patch.focalPoint.y !== undefined ? Math.max(0, Math.min(1, patch.focalPoint.y)) : current.focalPoint.y,
              },
            }
          : {}),
      });
    },
    [selectedLayer, updateImageLayerSettings, beginHistoryBurst]
  );

  /* --- Section editing helpers --- */
  const canvasMode = getDocumentMode(doc);
  const sections = useMemo(() => doc.sections?.sections ?? [], [doc.sections?.sections]);
  const selectedSection = useMemo(
    () => sections.find((s) => s.id === selectedSectionId),
    [sections, selectedSectionId]
  );

  const patchSectionProp = useCallback(
    (patch: Record<string, unknown>) => {
      if (!selectedSectionId) return;
      beginHistoryBurst("style");
      updateSection(selectedSectionId, patch);
    },
    [selectedSectionId, updateSection, beginHistoryBurst]
  );

  const selectedSectionBg =
    selectedSection && typeof selectedSection.background === "string"
      ? selectedSection.background
      : "#f5f5f5";

  if (!selectedLayer || !layout || !style) {
    // --- Section Inspector ---
    if (canvasMode === "sections" && selectedSection) {
      return (
        <InspectorShell width={300}>
          <InspectorHeader title="セクション設定" />
          <div className="space-y-1 px-3 py-2">
            <InspectorSection title="基本" defaultOpen={true}>
              <InspectorField label="名前">
                <InspectorInput
                  type="text"
                  value={selectedSection.name ?? ""}
                  onChange={(e) => patchSectionProp({ name: e.target.value })}
                />
              </InspectorField>
              <ColorField
                label="背景"
                value={selectedSectionBg}
                onChange={(v) => patchSectionProp({ background: v })}
              />
            </InspectorSection>

            <InspectorSection title="余白・間隔" defaultOpen={true}>
              <NumField
                label="上余白"
                value={selectedSection.paddingTop ?? 24}
                min={0}
                onChange={(v) => patchSectionProp({ paddingTop: v })}
                unit="px"
              />
              <NumField
                label="下余白"
                value={selectedSection.paddingBottom ?? 24}
                min={0}
                onChange={(v) => patchSectionProp({ paddingBottom: v })}
                unit="px"
              />
              <NumField
                label="間隔"
                value={selectedSection.gap ?? 24}
                min={0}
                onChange={(v) => patchSectionProp({ gap: v })}
                unit="px"
              />
              <NumField
                label="最小高"
                value={selectedSection.minHeight ?? 320}
                min={0}
                onChange={(v) => patchSectionProp({ minHeight: v })}
                unit="px"
              />
            </InspectorSection>

            <InspectorSection title="情報" defaultOpen={true}>
              <div className="text-[11px] text-[var(--ui-muted)]">
                レイヤー数: {selectedSection.layers.length}
              </div>
            </InspectorSection>

            <CanvasAiActionPanel sectionId={selectedSection.id} sectionName={selectedSection.name} />
          </div>
        </InspectorShell>
      );
    }

    return (
      <InspectorShell width={300} scrollable={false}>
        <InspectorHeader title="インスペクター" />
        <div className="flex-1 flex items-center justify-center text-[12px] text-[var(--ui-muted)]">
          レイヤーを選択してください
        </div>
      </InspectorShell>
    );
  }

  const content = selectedLayer.content;
  const selectedLayerBatchId = selectedLayer.aiBatchId;
  const aiBatchLayers = selectedLayerBatchId
    ? getLayersByAiBatch(selectedLayerBatchId)
    : [];
  const currentAiBatchSummary = selectedLayerBatchId
    ? aiBatchSummaryMap.get(selectedLayerBatchId)
    : undefined;
  const sameTypeSummaries = currentAiBatchSummary?.setType
    ? aiBatchSummaries.filter((summary) => summary.setType === currentAiBatchSummary.setType)
    : currentAiBatchSummary
      ? [currentAiBatchSummary]
      : [];
  const alternativeCount = Math.max(0, sameTypeSummaries.length - 1);
  const aiBatchCount = aiBatchLayers.length;
  const aiBatchFullySelected = selectedLayerBatchId
    ? isAiBatchSelected(selectedLayerBatchId)
    : false;
  const meta = project.meta as Record<string, unknown>;
  const themeId = project.themeSpec?.themeId ?? (meta?.themeId as string | undefined);
  const visualWeight = project.layoutSuggestion?.visualWeight ?? "medium";
  const spacingScale = project.layoutSuggestion?.spacingScale ?? "normal";
  const constraints = {
    horizontal: selectedLayer.constraints?.horizontal ?? "fixed",
    marginLeft: selectedLayer.constraints?.marginLeft ?? 0,
    marginRight: selectedLayer.constraints?.marginRight ?? 0,
  };
  const imageSettings = {
    lockAspect: selectedLayer.imageSettings?.lockAspect ?? true,
    fitMode: selectedLayer.imageSettings?.fitMode ?? "cover",
    focalPoint: {
      x: selectedLayer.imageSettings?.focalPoint?.x ?? 0.5,
      y: selectedLayer.imageSettings?.focalPoint?.y ?? 0.5,
    },
  };
  const shadowModel = parseLayerShadow(style.shadow);
  const deviceLabel = device === "pc" ? "デスクトップ" : "モバイル";
  const patchShadow = (patch: Partial<LayerShadow>) => {
    patchStyle({ shadow: { ...shadowModel, ...patch } });
  };

  const setAiSetStatus = (msg: string) => {
    setAiSetStatusMsg(msg);
    window.setTimeout(() => setAiSetStatusMsg(null), 2600);
  };

  const insertRegeneratedDecoration = (
    imageUrl: string,
    kind: CanvasAiDecorationKind,
    batchId: string,
    setType: CanvasAiSetType,
  ) => {
    if (!selectedSection) return;
    const designWidth = device === "pc" ? doc.meta.size.pc.width : doc.meta.size.sp.width;
    const assetId = addAsset({
      filename: `canvas-ai-regenerate-decoration-${kind}-${Date.now()}.png`,
      data: imageUrl,
    });
    const placement = buildCanvasDecorationPlacement(kind, selectedSection.name ?? "", designWidth, visualWeight);
    const baseLayer = createImageLayer(assetId, `[AI] ${CANVAS_AI_DECORATION_LABELS[kind]}`, {
      w: placement.w,
      h: placement.h,
    });
    const layer = {
      ...baseLayer,
      insertedByAi: true as const,
      aiBatchId: batchId,
      aiSetType: setType,
      aiSetLabel: CANVAS_AI_SET_LABELS[setType],
    };
    addLayer(layer);
    const contentYOffset = getSectionContentYOffset(doc.sections?.sections ?? [], selectedSection.id, device);
    updateLayerLayout(layer.id, {
      x: placement.x,
      y: contentYOffset + placement.y,
      w: placement.w,
      h: placement.h,
      z: placement.z,
    });
  };

  const handleRemoveAiSet = () => {
    if (!selectedLayerBatchId || aiBatchCount <= 0) return;
    const label = currentAiBatchSummary?.displayLabel ?? selectedLayer.aiSetLabel ?? "AIセット";
    const ok = window.confirm(`${label}（${aiBatchCount}枚）を削除しますか？`);
    if (!ok) return;
    void withHistoryBatch(async () => {
      removeAiBatch(selectedLayerBatchId);
    });
    setAiSetStatus("AIセットを削除しました");
  };

  const handleRegenerateAiSet = async () => {
    if (!selectedSection) {
      setAiSetStatus("セクションを選択してから実行してください");
      return;
    }
    setIsAiSetBusy(true);
    setAiSetStatusMsg("別案を生成中…");
    try {
      const setType = (selectedLayer.aiSetType ?? inferAiSetType(selectedSection.name ?? "")) as CanvasAiSetType;
      const batchId = generateAiBatchId();
      const result = await runCanvasAiSectionDesign({
        sectionName: selectedSection.name,
        sectionId: selectedSection.id,
        campaignType: meta?.campaignType as string | undefined,
        themeId,
        pcWidth: doc.meta.size.pc.width,
        visualWeight,
        spacingScale,
      });

      let applied = 0;
      await withHistoryBatch(async () => {
        for (const img of result.images) {
          const imgAssetId = addAsset({
            filename: `canvas-ai-regenerate-img-${img.target}-${Date.now()}.png`,
            data: img.imageUrl,
          });
          const imgW = Math.min(900, doc.meta.size.pc.width - 80);
          const imgH = Math.round(imgW * (img.target === "heroImage" ? 0.56 : 0.5));
          const baseLayer = createImageLayer(imgAssetId, `[AI] ${CANVAS_AI_TARGET_LABELS[img.target]}`, {
            w: imgW,
            h: imgH,
          });
          const layer = {
            ...baseLayer,
            insertedByAi: true as const,
            aiBatchId: batchId,
            aiSetType: setType,
            aiSetLabel: CANVAS_AI_SET_LABELS[setType],
          };
          addLayer(layer);
          applied += 1;
        }

        for (const decoration of result.decorations) {
          insertRegeneratedDecoration(decoration.imageUrl, decoration.kind, batchId, setType);
          applied += 1;
        }
      });

      if (applied > 0) {
        setAiSetStatus(`別案を追加しました (${applied}件)`);
      } else {
        setAiSetStatus("別案生成に失敗しました");
      }
    } catch (err) {
      setAiSetStatus(err instanceof Error ? err.message : "別案生成に失敗しました");
    } finally {
      setIsAiSetBusy(false);
    }
  };

  return (
    <InspectorShell width={300}>
      <InspectorHeader title={selectedLayer.name} subtitle={deviceLabel} />

      <div className="space-y-1 px-3 py-2">
        {selectedLayer.insertedByAi ? (
          <InspectorSection title="AIセット" defaultOpen={true}>
            <div className="text-[11px] text-[var(--ui-muted)]">
              {currentAiBatchSummary?.displayLabel ?? selectedLayer.aiSetLabel ?? "AI生成レイヤー"}
            </div>
            {selectedLayerBatchId && (
              <div className="text-[10px] text-[var(--ui-muted)] mt-0.5 space-y-0.5">
                <div>
                同セット: {aiBatchCount}枚
                </div>
                <div>
                  同種別の別案: {alternativeCount}件{alternativeCount > 0 ? " (別案あり)" : ""}
                </div>
              </div>
            )}
            {selectedLayerBatchId && (
              <div className="mt-1.5 space-y-1">
                <button
                  type="button"
                  data-testid="canvas-ai-set-select-all"
                  className="w-full rounded border border-[var(--ui-border)] px-2 py-1 text-[10px] font-medium hover:bg-[color-mix(in_srgb,var(--ui-text)_6%,transparent)]"
                  onClick={() => selectAiBatch(selectedLayerBatchId, selectedLayer.id)}
                  disabled={isAiSetBusy}
                >
                  このセットをすべて選択
                </button>
                <button
                  type="button"
                  data-testid="canvas-ai-set-regenerate"
                  className="w-full rounded border border-[var(--ui-border)] px-2 py-1 text-[10px] font-medium hover:bg-[color-mix(in_srgb,var(--ui-text)_6%,transparent)] disabled:opacity-40"
                  onClick={handleRegenerateAiSet}
                  disabled={isAiSetBusy}
                >
                  このセットをもう一案生成
                </button>
                <button
                  type="button"
                  data-testid="canvas-ai-set-remove"
                  className="w-full rounded border border-red-300 px-2 py-1 text-[10px] font-medium text-red-500 hover:bg-red-50/50 disabled:opacity-40"
                  onClick={handleRemoveAiSet}
                  disabled={isAiSetBusy}
                >
                  このセットを削除
                </button>
                {sameTypeSummaries.length > 1 ? (
                  <div className="rounded border border-[var(--ui-border)] p-1">
                    <div className="px-1 pb-1 text-[10px] text-[var(--ui-muted)]">同種別の案を選択</div>
                    <div className="space-y-1">
                      {sameTypeSummaries.map((summary) => {
                        const isCurrent = summary.batchId === selectedLayerBatchId;
                        return (
                          <button
                            key={summary.batchId}
                            type="button"
                            className={
                              "w-full rounded px-2 py-1 text-left text-[10px] border " +
                              (isCurrent
                                ? "border-[var(--ui-text)] bg-[color-mix(in_srgb,var(--ui-text)_9%,transparent)]"
                                : "border-[var(--ui-border)] hover:bg-[color-mix(in_srgb,var(--ui-text)_6%,transparent)]")
                            }
                            disabled={isAiSetBusy || isCurrent}
                            onClick={() => selectAiBatch(summary.batchId, summary.layerIds[0])}
                          >
                            {summary.displayLabel} ({summary.layerCount}枚)
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ) : null}
                {aiBatchFullySelected ? (
                  <div className="text-[10px] text-[var(--ui-muted)]">
                    同セットを選択中
                  </div>
                ) : null}
                {aiSetStatusMsg ? (
                  <div className="text-[10px] text-[var(--ui-muted)]">
                    {aiSetStatusMsg}
                  </div>
                ) : null}
              </div>
            )}
          </InspectorSection>
        ) : null}
        <InspectorSection title="配置" defaultOpen={true}>
          <InspectorFieldRow>
            <NumField label="X" value={layout.x} onChange={(v) => patchLayout({ x: v })} />
            <NumField label="Y" value={layout.y} onChange={(v) => patchLayout({ y: v })} />
            <NumField label="W" value={layout.w} min={10} onChange={(v) => patchLayout({ w: v })} />
            <NumField label="H" value={layout.h} min={10} onChange={(v) => patchLayout({ h: v })} />
            <NumField label="回転" value={layout.r} unit="°" shiftStep={15} onChange={(v) => patchLayout({ r: v })} />
            <NumField label="Z" value={layout.z} onChange={(v) => patchLayout({ z: v })} />
          </InspectorFieldRow>
        </InspectorSection>

        <InspectorSection title="スタイル" defaultOpen={true}>
          <NumField label="透過" value={style.opacity} min={0} max={1} step={0.05} onChange={(v) => patchStyle({ opacity: v })} />
        </InspectorSection>

        {content.kind === "shape" ? (
          <InspectorSection title="シェイプ" defaultOpen={true}>
            <ColorField label="塗り" value={style.fill ?? "#cccccc"} onChange={(v) => patchStyle({ fill: v })} />
            <ColorField label="線" value={style.stroke ?? "#000000"} onChange={(v) => patchStyle({ stroke: v })} />
            <NumField label="線幅" value={style.strokeWidth ?? 0} min={0} onChange={(v) => patchStyle({ strokeWidth: v })} />
            <NumField label="角丸" value={style.radius ?? 0} min={0} onChange={(v) => patchStyle({ radius: v })} />

            <div className="mt-1 mb-1 border-b border-[var(--ui-border)]/50 pb-1 text-[10px] font-semibold uppercase tracking-wider text-[var(--ui-muted)]">
              横幅制約
            </div>
            <SelectField
              label="横幅"
              value={constraints.horizontal}
              options={[
                { value: "fixed", label: "固定" },
                { value: "stretch", label: "伸縮(フル幅)" },
              ]}
              onChange={(v) => patchConstraints({ horizontal: v as "fixed" | "stretch" })}
            />
            {constraints.horizontal === "stretch" ? (
              <>
                <NumField label="左余白" value={constraints.marginLeft} min={0} onChange={(v) => patchConstraints({ marginLeft: v })} />
                <NumField label="右余白" value={constraints.marginRight} min={0} onChange={(v) => patchConstraints({ marginRight: v })} />
              </>
            ) : null}
          </InspectorSection>
        ) : null}

        {content.kind === "text" ? (
          <InspectorSection title="テキスト" defaultOpen={true}>
            <TextField label="内容" value={content.text} onChange={(v) => patchContent({ text: v })} />
            <SelectField
              label="書体"
              value={style.fontFamily ?? "system-ui"}
              options={[
                { value: "system-ui", label: "System" },
                { value: "'Noto Sans JP', sans-serif", label: "Noto Sans JP" },
                { value: "'Noto Serif JP', serif", label: "Noto Serif JP" },
                { value: "sans-serif", label: "Sans-serif" },
                { value: "serif", label: "Serif" },
                { value: "monospace", label: "Monospace" },
              ]}
              onChange={(v) => patchStyle({ fontFamily: v })}
            />
            <NumField label="サイズ" value={style.fontSize ?? 16} min={8} max={200} onChange={(v) => patchStyle({ fontSize: v })} />
            <NumField label="太さ" value={style.fontWeight ?? 400} min={100} max={900} step={100} onChange={(v) => patchStyle({ fontWeight: v })} />
            <NumField label="行高" value={style.lineHeight ?? 1.6} min={0.8} max={4} step={0.1} onChange={(v) => patchStyle({ lineHeight: v })} />
            <NumField label="字間" value={style.letterSpacing ?? 0} step={0.5} onChange={(v) => patchStyle({ letterSpacing: v })} />
            <SelectField
              label="揃え"
              value={style.textAlign ?? "left"}
              options={[
                { value: "left", label: "左" },
                { value: "center", label: "中央" },
                { value: "right", label: "右" },
              ]}
              onChange={(v) => patchStyle({ textAlign: v as "left" | "center" | "right" })}
            />
            <ColorField label="文字色" value={style.textColor ?? "#111111"} onChange={(v) => patchStyle({ textColor: v })} />
          </InspectorSection>
        ) : null}

        {content.kind === "button" ? (
          <InspectorSection title="ボタン" defaultOpen={true}>
            <TextField label="ラベル" value={content.label} onChange={(v) => patchContent({ label: v })} />
            <InspectorField label="URL">
              <InspectorInput
                type="text"
                value={content.href}
                onChange={(e) => patchContent({ href: e.target.value })}
              />
            </InspectorField>
            <ColorField label="背景" value={style.buttonBgColor ?? "#1f6feb"} onChange={(v) => patchStyle({ buttonBgColor: v })} />
            <ColorField label="文字" value={style.buttonTextColor ?? "#ffffff"} onChange={(v) => patchStyle({ buttonTextColor: v })} />
            <NumField label="角丸" value={style.buttonRadius ?? 8} min={0} onChange={(v) => patchStyle({ buttonRadius: v })} />
          </InspectorSection>
        ) : null}

        {content.kind === "image" ? (
          <InspectorSection title="画像" defaultOpen={true}>
            <InspectorField label="AssetID">
              <InspectorInput
                type="text"
                value={content.assetId}
                onChange={(e) => {
                  const next = e.target.value.trim();
                  if (!next) return;
                  patchContent({ assetId: next });
                }}
              />
            </InspectorField>
            <NumField label="角丸" value={style.radius ?? 0} min={0} onChange={(v) => patchStyle({ radius: v })} />

            <label className="flex items-center gap-2 text-[11px]">
              <span className="w-20 flex-shrink-0 text-[var(--ui-muted)]">比率固定</span>
              <input
                type="checkbox"
                checked={imageSettings.lockAspect}
                onChange={(e) => patchImageSettings({ lockAspect: e.target.checked })}
              />
            </label>
            <SelectField
              label="フィット"
              value={imageSettings.fitMode}
              options={[
                { value: "cover", label: "cover" },
                { value: "contain", label: "contain" },
              ]}
              onChange={(v) => patchImageSettings({ fitMode: v as "cover" | "contain" })}
            />
            <NumField label="焦点X" value={imageSettings.focalPoint.x} min={0} max={1} step={0.05} onChange={(v) => patchImageSettings({ focalPoint: { x: v } })} />
            <NumField label="焦点Y" value={imageSettings.focalPoint.y} min={0} max={1} step={0.05} onChange={(v) => patchImageSettings({ focalPoint: { y: v } })} />
          </InspectorSection>
        ) : null}

        <InspectorSection title="シャドウ" defaultOpen={true}>
          <label className="flex items-center gap-2 text-[11px]">
            <span className="w-16 flex-shrink-0 text-[var(--ui-muted)]">有効</span>
            <input
              type="checkbox"
              checked={shadowModel.enabled}
              onChange={(e) => patchShadow({ enabled: e.target.checked })}
            />
          </label>
          <InspectorFieldRow>
            <NumField label="X" value={shadowModel.x} step={1} onChange={(v) => patchShadow({ x: v })} />
            <NumField label="Y" value={shadowModel.y} step={1} onChange={(v) => patchShadow({ y: v })} />
            <NumField label="Blur" value={shadowModel.blur} min={0} step={1} onChange={(v) => patchShadow({ blur: v })} />
            <NumField label="Spread" value={shadowModel.spread} step={1} onChange={(v) => patchShadow({ spread: v })} />
          </InspectorFieldRow>
          <ColorField label="色" value={shadowModel.color} onChange={(v) => patchShadow({ color: v })} />
          <NumField
            label="透明"
            value={shadowModel.opacity}
            min={0}
            max={1}
            step={0.05}
            onChange={(v) => patchShadow({ opacity: v })}
          />
        </InspectorSection>
      </div>
    </InspectorShell>
  );
}
