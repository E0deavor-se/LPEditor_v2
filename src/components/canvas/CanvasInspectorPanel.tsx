/* ───────────────────────────────────────────────
   Canvas Inspector Panel – 右パネル
   選択レイヤーのプロパティ編集
   ─────────────────────────────────────────────── */

"use client";

import { useMemo, useCallback, useEffect, useRef, useState, type KeyboardEvent as ReactKeyboardEvent } from "react";
import { useCanvasEditorStore } from "@/src/store/canvasEditorStore";
import type { CanvasLayer, LayerStyle, CanvasLayout, LayerShadow } from "@/src/types/canvas";
import { getDocumentMode, getLayout } from "@/src/types/canvas";
import { parseLayerShadow } from "@/src/lib/canvas/shadow";

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
    <label className="flex items-center gap-1 text-[11px]">
      <span className="w-10 flex-shrink-0 text-[var(--ui-muted)]">{label}</span>
      <input
        type="number"
        className="w-full rounded border border-[var(--ui-border)] bg-[var(--surface)] px-1.5 py-0.5 text-[11px]"
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
      {unit ? <span className="text-[var(--ui-muted)] text-[10px]">{unit}</span> : null}
    </label>
  );
};

type ColorFieldProps = {
  label: string;
  value: string;
  onChange: (v: string) => void;
};

const ColorField = ({ label, value, onChange }: ColorFieldProps) => (
  <label className="flex items-center gap-1 text-[11px]">
    <span className="w-10 flex-shrink-0 text-[var(--ui-muted)]">{label}</span>
    <input
      type="color"
      className="h-6 w-6 cursor-pointer rounded border border-[var(--ui-border)]"
      value={value}
      onChange={(e) => onChange(e.target.value)}
    />
    <input
      type="text"
      className="w-full rounded border border-[var(--ui-border)] bg-[var(--surface)] px-1.5 py-0.5 text-[11px]"
      value={value}
      onChange={(e) => onChange(e.target.value)}
    />
  </label>
);

const TextField = ({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) => (
  <label className="flex items-start gap-1 text-[11px]">
    <span className="w-10 flex-shrink-0 pt-1 text-[var(--ui-muted)]">{label}</span>
    <textarea
      className="w-full rounded border border-[var(--ui-border)] bg-[var(--surface)] px-1.5 py-1 text-[11px]"
      rows={3}
      value={value}
      onChange={(e) => onChange(e.target.value)}
    />
  </label>
);

const SelectField = ({ label, value, options, onChange }: {
  label: string;
  value: string;
  options: { value: string; label: string }[];
  onChange: (v: string) => void;
}) => (
  <label className="flex items-center gap-1 text-[11px]">
    <span className="w-10 flex-shrink-0 text-[var(--ui-muted)]">{label}</span>
    <select
      className="w-full rounded border border-[var(--ui-border)] bg-[var(--surface)] px-1.5 py-0.5 text-[11px]"
      value={value}
      onChange={(e) => onChange(e.target.value)}
    >
      {options.map((o) => (
        <option key={o.value} value={o.value}>{o.label}</option>
      ))}
    </select>
  </label>
);

/* ---- Section heading ---- */

const SectionHead = ({ title }: { title: string }) => (
  <div className="mt-3 mb-1 border-b border-[var(--ui-border)] pb-1 text-[10px] font-semibold uppercase tracking-wider text-[var(--ui-muted)]">
    {title}
  </div>
);

/* ====================== Inspector ====================== */

export default function CanvasInspectorPanel() {
  const doc = useCanvasEditorStore((s) => s.document);
  const device = useCanvasEditorStore((s) => s.device);
  const getRenderableLayers = useCanvasEditorStore((s) => s.getRenderableLayers);
  const selection = useCanvasEditorStore((s) => s.selection);
  const updateLayerLayout = useCanvasEditorStore((s) => s.updateLayerLayout);
  const updateLayerStyle = useCanvasEditorStore((s) => s.updateLayerStyle);
  const updateLayerConstraints = useCanvasEditorStore((s) => s.updateLayerConstraints);
  const updateImageLayerSettings = useCanvasEditorStore((s) => s.updateImageLayerSettings);
  const updateLayerContent = useCanvasEditorStore((s) => s.updateLayerContent);
  const pushSnapshot = useCanvasEditorStore((s) => s.pushSnapshot);
  const selectedSectionId = useCanvasEditorStore((s) => s.selectedSectionId);
  const updateSection = useCanvasEditorStore((s) => s.updateSection);

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
        <aside
          className="flex h-full min-h-0 flex-col border-l border-[var(--ui-border)] bg-[var(--ui-panel)] text-[var(--ui-text)] overflow-y-auto"
          style={{ width: 300 }}
        >
          <div className="px-3 py-2 border-b border-[var(--ui-border)] bg-[var(--surface-2)]">
            <span className="text-[13px] font-semibold">セクション設定</span>
          </div>
          <div className="space-y-1 px-3 py-2">
            <SectionHead title="基本" />
            <label className="flex items-center gap-1 text-[11px]">
              <span className="w-10 flex-shrink-0 text-[var(--ui-muted)]">名前</span>
              <input
                type="text"
                className="w-full rounded border border-[var(--ui-border)] bg-[var(--surface)] px-1.5 py-0.5 text-[11px]"
                value={selectedSection.name ?? ""}
                onChange={(e) => patchSectionProp({ name: e.target.value })}
              />
            </label>
            <ColorField
              label="背景"
              value={selectedSectionBg}
              onChange={(v) => patchSectionProp({ background: v })}
            />

            <SectionHead title="余白・間隔" />
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

            <SectionHead title="情報" />
            <div className="text-[11px] text-[var(--ui-muted)]">
              レイヤー数: {selectedSection.layers.length}
            </div>
          </div>
        </aside>
      );
    }

    return (
      <aside
        className="flex h-full min-h-0 flex-col border-l border-[var(--ui-border)] bg-[var(--ui-panel)] text-[var(--ui-text)]"
        style={{ width: 300 }}
      >
        <div className="px-3 py-2 border-b border-[var(--ui-border)] bg-[var(--surface-2)]">
          <span className="text-[13px] font-semibold">インスペクター</span>
        </div>
        <div className="flex-1 flex items-center justify-center text-[12px] text-[var(--ui-muted)]">
          レイヤーを選択してください
        </div>
      </aside>
    );
  }

  const content = selectedLayer.content;
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
  const patchShadow = (patch: Partial<LayerShadow>) => {
    patchStyle({ shadow: { ...shadowModel, ...patch } });
  };

  return (
    <aside
      className="flex h-full min-h-0 flex-col border-l border-[var(--ui-border)] bg-[var(--ui-panel)] text-[var(--ui-text)] overflow-y-auto"
      style={{ width: 300 }}
    >
      {/* Header */}
      <div className="px-3 py-2 border-b border-[var(--ui-border)] bg-[var(--surface-2)]">
        <span className="text-[13px] font-semibold">{selectedLayer.name}</span>
        <span className="ml-2 text-[10px] text-[var(--ui-muted)]">{device.toUpperCase()}</span>
      </div>

      <div className="space-y-1 px-3 py-2">
        {/* ---- 配置 ---- */}
        <SectionHead title="配置" />
        <div className="grid grid-cols-2 gap-1">
          <NumField label="X" value={layout.x} onChange={(v) => patchLayout({ x: v })} />
          <NumField label="Y" value={layout.y} onChange={(v) => patchLayout({ y: v })} />
          <NumField label="W" value={layout.w} min={10} onChange={(v) => patchLayout({ w: v })} />
          <NumField label="H" value={layout.h} min={10} onChange={(v) => patchLayout({ h: v })} />
          <NumField label="回転" value={layout.r} unit="°" shiftStep={15} onChange={(v) => patchLayout({ r: v })} />
          <NumField label="Z" value={layout.z} onChange={(v) => patchLayout({ z: v })} />
        </div>

        {/* ---- スタイル ---- */}
        <SectionHead title="スタイル" />
        <NumField label="透過" value={style.opacity} min={0} max={1} step={0.05} onChange={(v) => patchStyle({ opacity: v })} />

        {content.kind === "shape" ? (
          <>
            <ColorField label="塗り" value={style.fill ?? "#cccccc"} onChange={(v) => patchStyle({ fill: v })} />
            <ColorField label="線" value={style.stroke ?? "#000000"} onChange={(v) => patchStyle({ stroke: v })} />
            <NumField label="線幅" value={style.strokeWidth ?? 0} min={0} onChange={(v) => patchStyle({ strokeWidth: v })} />
            <NumField label="角丸" value={style.radius ?? 0} min={0} onChange={(v) => patchStyle({ radius: v })} />

            <SectionHead title="横幅制約" />
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
          </>
        ) : null}

        {/* ---- テキスト固有 ---- */}
        {content.kind === "text" ? (
          <>
            <SectionHead title="テキスト" />
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
          </>
        ) : null}

        {/* ---- ボタン固有 ---- */}
        {content.kind === "button" ? (
          <>
            <SectionHead title="ボタン" />
            <TextField label="ラベル" value={content.label} onChange={(v) => patchContent({ label: v })} />
            <label className="flex items-center gap-1 text-[11px]">
              <span className="w-10 flex-shrink-0 text-[var(--ui-muted)]">URL</span>
              <input
                type="text"
                className="w-full rounded border border-[var(--ui-border)] bg-[var(--surface)] px-1.5 py-0.5 text-[11px]"
                value={content.href}
                onChange={(e) => patchContent({ href: e.target.value })}
              />
            </label>
            <ColorField label="背景" value={style.buttonBgColor ?? "#1f6feb"} onChange={(v) => patchStyle({ buttonBgColor: v })} />
            <ColorField label="文字" value={style.buttonTextColor ?? "#ffffff"} onChange={(v) => patchStyle({ buttonTextColor: v })} />
            <NumField label="角丸" value={style.buttonRadius ?? 8} min={0} onChange={(v) => patchStyle({ buttonRadius: v })} />
          </>
        ) : null}

        {/* ---- 画像固有 ---- */}
        {content.kind === "image" ? (
          <>
            <SectionHead title="画像" />
            <label className="flex items-center gap-1 text-[11px]">
              <span className="w-10 flex-shrink-0 text-[var(--ui-muted)]">AssetID</span>
              <input
                type="text"
                className="w-full rounded border border-[var(--ui-border)] bg-[var(--surface)] px-1.5 py-0.5 text-[11px]"
                value={content.assetId}
                onChange={(e) => {
                  const next = e.target.value.trim();
                  if (!next) return;
                  patchContent({ assetId: next });
                }}
              />
            </label>
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
          </>
        ) : null}

        {/* ---- シャドウ ---- */}
        <SectionHead title="シャドウ" />
        <label className="flex items-center gap-2 text-[11px]">
          <span className="w-16 flex-shrink-0 text-[var(--ui-muted)]">有効</span>
          <input
            type="checkbox"
            checked={shadowModel.enabled}
            onChange={(e) => patchShadow({ enabled: e.target.checked })}
          />
        </label>
        <div className="grid grid-cols-2 gap-1">
          <NumField label="X" value={shadowModel.x} step={1} onChange={(v) => patchShadow({ x: v })} />
          <NumField label="Y" value={shadowModel.y} step={1} onChange={(v) => patchShadow({ y: v })} />
          <NumField label="Blur" value={shadowModel.blur} min={0} step={1} onChange={(v) => patchShadow({ blur: v })} />
          <NumField label="Spread" value={shadowModel.spread} step={1} onChange={(v) => patchShadow({ spread: v })} />
        </div>
        <ColorField label="色" value={shadowModel.color} onChange={(v) => patchShadow({ color: v })} />
        <NumField
          label="透明"
          value={shadowModel.opacity}
          min={0}
          max={1}
          step={0.05}
          onChange={(v) => patchShadow({ opacity: v })}
        />
      </div>
    </aside>
  );
}
