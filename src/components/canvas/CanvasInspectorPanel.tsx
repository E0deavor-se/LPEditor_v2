/* ───────────────────────────────────────────────
   Canvas Inspector Panel – 右パネル
   選択レイヤーのプロパティ編集
   ─────────────────────────────────────────────── */

"use client";

import { useMemo, useCallback, useEffect, useRef, useState, type KeyboardEvent as ReactKeyboardEvent } from "react";
import { useCanvasEditorStore } from "@/src/store/canvasEditorStore";
import type { CanvasLayer, LayerStyle, CanvasLayout } from "@/src/types/canvas";
import { getLayout } from "@/src/types/canvas";

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
  const selection = useCanvasEditorStore((s) => s.selection);
  const updateLayerLayout = useCanvasEditorStore((s) => s.updateLayerLayout);
  const updateLayerStyle = useCanvasEditorStore((s) => s.updateLayerStyle);
  const updateLayerContent = useCanvasEditorStore((s) => s.updateLayerContent);
  const pushSnapshot = useCanvasEditorStore((s) => s.pushSnapshot);

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

  const selectedLayer: CanvasLayer | undefined = useMemo(
    () => doc.layers.find((l) => l.id === selection.primaryId),
    [doc.layers, selection.primaryId]
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

  if (!selectedLayer || !layout || !style) {
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
          </>
        ) : null}

        {/* ---- シャドウ ---- */}
        <SectionHead title="シャドウ" />
        <label className="flex items-center gap-1 text-[11px]">
          <span className="w-10 flex-shrink-0 text-[var(--ui-muted)]">値</span>
          <input
            type="text"
            className="w-full rounded border border-[var(--ui-border)] bg-[var(--surface)] px-1.5 py-0.5 text-[11px]"
            placeholder="0 2px 8px rgba(0,0,0,0.15)"
            value={style.shadow ?? ""}
            onChange={(e) => patchStyle({ shadow: e.target.value })}
          />
        </label>
      </div>
    </aside>
  );
}
