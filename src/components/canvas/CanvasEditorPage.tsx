/* ───────────────────────────────────────────────
   Canvas Editor Page – 全体レイアウト
   TopBar + LayersPanel + CanvasStage + InspectorPanel
   ─────────────────────────────────────────────── */

"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  Monitor, Smartphone, Columns2, Grid3X3, Magnet,
  ZoomIn, ZoomOut, Undo2, Redo2, Type, Image, Square, MousePointer2,
  Wand2, Eye, EyeOff, Ruler, LayoutTemplate, Maximize, ALargeSmall,
  AlignStartVertical, AlignCenterVertical, AlignEndVertical,
  AlignStartHorizontal, AlignCenterHorizontal, AlignEndHorizontal,
  AlignHorizontalSpaceAround, AlignVerticalSpaceAround,
} from "lucide-react";
import { useCanvasEditorStore } from "@/src/store/canvasEditorStore";
import { useEditorStore } from "@/src/store/editorStore";
import CanvasStage from "@/src/components/canvas/CanvasStage";
import CanvasLayersPanel from "@/src/components/canvas/LayersPanel";
import CanvasInspectorPanel from "@/src/components/canvas/CanvasInspectorPanel";
import {
  createTextLayer,
  createShapeLayer,
  createButtonLayer,
  createImageLayer,
} from "@/src/types/canvas";
import { AUTO_LAYOUT_PRESETS, type AutoLayoutPreset } from "@/src/lib/canvas/autoLayout";

const BTN = "h-7 px-2 rounded text-[11px] font-medium flex items-center gap-1 transition-colors";
const BTN_ACTIVE = "bg-[var(--ui-text)] text-[var(--ui-bg)]";
const BTN_GHOST = "hover:bg-[color-mix(in_srgb,var(--ui-text)_8%,transparent)] text-[var(--ui-text)]";

type CanvasEditorPageProps = {
  canvasPageId?: string | null;
};

export default function CanvasEditorPage({ canvasPageId }: CanvasEditorPageProps = {}) {
  const device = useCanvasEditorStore((s) => s.device);
  const viewMode = useCanvasEditorStore((s) => s.viewMode);
  const zoom = useCanvasEditorStore((s) => s.zoom);
  const gridEnabled = useCanvasEditorStore((s) => s.gridEnabled);
  const snapEnabled = useCanvasEditorStore((s) => s.snapEnabled);
  const canUndo = useCanvasEditorStore((s) => s.canUndo);
  const canRedo = useCanvasEditorStore((s) => s.canRedo);

  const setDevice = useCanvasEditorStore((s) => s.setDevice);
  const setViewMode = useCanvasEditorStore((s) => s.setViewMode);
  const setZoom = useCanvasEditorStore((s) => s.setZoom);
  const toggleGrid = useCanvasEditorStore((s) => s.toggleGrid);
  const toggleSnap = useCanvasEditorStore((s) => s.toggleSnap);
  const undo = useCanvasEditorStore((s) => s.undo);
  const redo = useCanvasEditorStore((s) => s.redo);
  const addLayer = useCanvasEditorStore((s) => s.addLayer);
  const removeLayer = useCanvasEditorStore((s) => s.removeLayer);
  const duplicateLayer = useCanvasEditorStore((s) => s.duplicateLayer);
  const selection = useCanvasEditorStore((s) => s.selection);
  const moveSelectedLayers = useCanvasEditorStore((s) => s.moveSelectedLayers);
  const pushSnapshot = useCanvasEditorStore((s) => s.pushSnapshot);
  const generateSpFromPc = useCanvasEditorStore((s) => s.generateSpFromPc);
  const canvasDoc = useCanvasEditorStore((s) => s.document);
  const setDocument = useCanvasEditorStore((s) => s.setDocument);
  const dirty = useCanvasEditorStore((s) => s.dirty);

  // Align / Distribute / Guides
  const guidesVisible = useCanvasEditorStore((s) => s.guidesVisible);
  const toggleGuidesVisible = useCanvasEditorStore((s) => s.toggleGuidesVisible);
  const alignSelected = useCanvasEditorStore((s) => s.alignSelected);
  const distributeSelected = useCanvasEditorStore((s) => s.distributeSelected);
  const addGuide = useCanvasEditorStore((s) => s.addGuide);
  const removeGuide = useCanvasEditorStore((s) => s.removeGuide);
  const applyAutoLayout = useCanvasEditorStore((s) => s.applyAutoLayout);
  const applyFitTextToSelection = useCanvasEditorStore((s) => s.applyFitTextToSelection);
  const bringForward = useCanvasEditorStore((s) => s.bringForward);
  const sendBackward = useCanvasEditorStore((s) => s.sendBackward);
  const clearSelection = useCanvasEditorStore((s) => s.clearSelection);
  const groupSelectedLayers = useCanvasEditorStore((s) => s.groupSelectedLayers);
  const ungroupSelectedLayers = useCanvasEditorStore((s) => s.ungroupSelectedLayers);

  const [autoLayoutOpen, setAutoLayoutOpen] = useState(false);

  // Fit Text: 選択レイヤーに text/button が含まれるか判定
  const hasTextSelection = selection.ids.length > 0 && canvasDoc.layers.some(
    (l) => selection.ids.includes(l.id) && (l.content.kind === "text" || l.content.kind === "button"),
  );
  const hasGroupSelection = selection.ids.some((id) => {
    const layer = canvasDoc.layers.find((l) => l.id === id);
    return layer?.content.kind === "group";
  });

  const updateCanvasPage = useEditorStore((s) => s.updateCanvasPage);
  const addAsset = useEditorStore((s) => s.addAsset);
  const project = useEditorStore((s) => s.project);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [toast, setToast] = useState<string | null>(null);

  const showToast = useCallback((message: string) => {
    setToast(message);
    window.setTimeout(() => setToast(null), 2600);
  }, []);

  /* ---- Sync: load from project ---- */
  const loadedPageIdRef = useRef<string | null>(null);
  useEffect(() => {
    if (!canvasPageId) return;
    if (loadedPageIdRef.current === canvasPageId) return;
    const page = (project.canvasPages ?? []).find((p) => p.id === canvasPageId);
    if (page) {
      setDocument(page.canvas);
      loadedPageIdRef.current = canvasPageId;
    }
  }, [canvasPageId, project.canvasPages, setDocument]);

  /* ---- Sync: save back to project on change ---- */
  useEffect(() => {
    if (!canvasPageId || !dirty) return;
    updateCanvasPage(canvasPageId, canvasDoc);
  }, [canvasPageId, dirty, canvasDoc, updateCanvasPage]);

  /* ---- Keyboard shortcuts ---- */
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const ctrl = e.ctrlKey || e.metaKey;
      const tag = (e.target as HTMLElement).tagName;
      const isInput = tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT";

      // Undo/Redo (always available)
      if (ctrl && e.key === "z" && !e.shiftKey) { e.preventDefault(); undo(); return; }
      if (ctrl && e.key === "z" && e.shiftKey) { e.preventDefault(); redo(); return; }
      if (ctrl && e.key === "y") { e.preventDefault(); redo(); return; }

      // Below: skip if in input
      if (isInput) return;

      // Escape: deselect
      if (e.key === "Escape") { clearSelection(); return; }

      // Duplicate
      if (ctrl && e.key === "d") {
        e.preventDefault();
        if (selection.primaryId) duplicateLayer(selection.primaryId);
        return;
      }

      // Group / Ungroup
      if (ctrl && e.key.toLowerCase() === "g" && !e.shiftKey) {
        e.preventDefault();
        groupSelectedLayers();
        return;
      }
      if (ctrl && e.key.toLowerCase() === "g" && e.shiftKey) {
        e.preventDefault();
        ungroupSelectedLayers();
        return;
      }

      // Delete
      if (e.key === "Delete" || e.key === "Backspace") {
        e.preventDefault();
        if (selection.primaryId) removeLayer(selection.primaryId);
        return;
      }

      // Z-order: Ctrl+] / Ctrl+[
      if (ctrl && e.key === "]" && selection.primaryId) {
        e.preventDefault(); bringForward(selection.primaryId); return;
      }
      if (ctrl && e.key === "[" && selection.primaryId) {
        e.preventDefault(); sendBackward(selection.primaryId); return;
      }

      // Arrow keys: move layers
      if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(e.key)) {
        e.preventDefault();
        const step = e.shiftKey ? 10 : 1;
        pushSnapshot();
        switch (e.key) {
          case "ArrowUp": moveSelectedLayers(0, -step); break;
          case "ArrowDown": moveSelectedLayers(0, step); break;
          case "ArrowLeft": moveSelectedLayers(-step, 0); break;
          case "ArrowRight": moveSelectedLayers(step, 0); break;
        }
      }
    };

    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [undo, redo, selection.primaryId, duplicateLayer, removeLayer, moveSelectedLayers, pushSnapshot, clearSelection, bringForward, sendBackward, groupSelectedLayers, ungroupSelectedLayers]);

  /* ---- Add layer helpers ---- */
  const handleAddText = () => addLayer(createTextLayer("テキスト"));
  const handleAddShape = () => addLayer(createShapeLayer("rect"));
  const handleAddButton = () => addLayer(createButtonLayer("ボタン", "#"));
  const handleAddImage = () => fileInputRef.current?.click();

  const handleImageFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.currentTarget.value = "";
    if (!file) return;

    const isAccepted =
      file.type === "image/png" ||
      file.type === "image/jpeg" ||
      file.type === "image/webp" ||
      file.type === "image/svg+xml" ||
      /\.(png|jpe?g|webp|svg)$/i.test(file.name);

    if (!isAccepted) {
      showToast("画像形式は png / jpg / webp / svg のみ対応です");
      return;
    }

    try {
      const dataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
          const result = typeof reader.result === "string" ? reader.result : "";
          if (!result) {
            reject(new Error("画像の読み込みに失敗しました"));
            return;
          }
          resolve(result);
        };
        reader.onerror = () => reject(new Error("画像の読み込みに失敗しました"));
        reader.readAsDataURL(file);
      });

      const natural = await new Promise<{ w: number; h: number }>((resolve, reject) => {
        const img = new window.Image();
        img.onload = () => {
          const w = Math.max(1, img.naturalWidth || 320);
          const h = Math.max(1, img.naturalHeight || 240);
          resolve({ w, h });
        };
        img.onerror = () => reject(new Error("画像サイズの取得に失敗しました"));
        img.src = dataUrl;
      });

      const assetId = addAsset({ filename: file.name, data: dataUrl });

      const makeLayout = (canvasW: number, canvasH: number) => {
        const maxW = Math.min(600, canvasW - 40);
        const scale = Math.min(1, maxW / natural.w);
        const w = Math.max(40, Math.round(natural.w * scale));
        const h = Math.max(40, Math.round(natural.h * scale));
        return {
          w,
          h,
          x: Math.round((canvasW - w) / 2),
          y: Math.round((canvasH - h) / 2),
        };
      };

      const pcSize = canvasDoc.meta.size.pc;
      const spSize = canvasDoc.meta.size.sp;
      const pcLayout = makeLayout(pcSize.width, pcSize.height);
      const spLayout = makeLayout(spSize.width, spSize.height);

      const layer = createImageLayer(assetId, file.name, pcLayout);
      layer.name = file.name || "画像";
      layer.variants.pc = { ...layer.variants.pc, ...pcLayout };
      layer.variants.sp = { ...layer.variants.sp, ...spLayout };
      addLayer(layer);
      showToast("画像を追加しました");
    } catch (err) {
      console.error("[canvas] image import failed", err);
      showToast("画像の追加に失敗しました。別ファイルで再試行してください");
    }
  };

  return (
    <div className="flex h-full flex-col bg-[var(--ui-bg)] text-[var(--ui-text)]">
      {/* ===== TopBar ===== */}
      <div className="flex items-center gap-2 border-b border-[var(--ui-border)] bg-[var(--surface-2)] px-3 py-1.5">
        <input
          ref={fileInputRef}
          type="file"
          className="hidden"
          accept="image/png,image/jpeg,image/webp,image/svg+xml,.png,.jpg,.jpeg,.webp,.svg"
          onChange={handleImageFileChange}
        />
        {/* Device switch */}
        <div className="flex items-center gap-0.5 rounded-md border border-[var(--ui-border)] p-0.5">
          <button type="button" className={`${BTN} ${device === "pc" ? BTN_ACTIVE : BTN_GHOST}`} onClick={() => setDevice("pc")}>
            <Monitor size={14} /> PC
          </button>
          <button type="button" className={`${BTN} ${device === "sp" ? BTN_ACTIVE : BTN_GHOST}`} onClick={() => setDevice("sp")}>
            <Smartphone size={14} /> SP
          </button>
        </div>

        {/* Split */}
        <button
          type="button"
          className={`${BTN} ${viewMode === "split" ? BTN_ACTIVE : BTN_GHOST}`}
          onClick={() => setViewMode(viewMode === "split" ? "single" : "split")}
        >
          <Columns2 size={14} /> Split
        </button>

        <div className="mx-1 h-5 w-px bg-[var(--ui-border)]" />

        {/* Zoom */}
        <button type="button" className={`${BTN} ${BTN_GHOST}`} onClick={() => setZoom(zoom - 0.1)}>
          <ZoomOut size={14} />
        </button>
        <span className="text-[11px] w-10 text-center tabular-nums">{Math.round(zoom * 100)}%</span>
        <button type="button" className={`${BTN} ${BTN_GHOST}`} onClick={() => setZoom(zoom + 0.1)}>
          <ZoomIn size={14} />
        </button>
        <button type="button" className={`${BTN} ${BTN_GHOST}`} onClick={() => setZoom(1)} title="100%にリセット">
          <Maximize size={14} />
        </button>

        <div className="mx-1 h-5 w-px bg-[var(--ui-border)]" />

        {/* Grid / Snap */}
        <button type="button" className={`${BTN} ${gridEnabled ? BTN_ACTIVE : BTN_GHOST}`} onClick={toggleGrid}>
          <Grid3X3 size={14} /> Grid
        </button>
        <button type="button" className={`${BTN} ${snapEnabled ? BTN_ACTIVE : BTN_GHOST}`} onClick={toggleSnap}>
          <Magnet size={14} /> Snap
        </button>

        {/* Guides */}
        <button type="button" className={`${BTN} ${guidesVisible ? BTN_ACTIVE : BTN_GHOST}`} onClick={toggleGuidesVisible} title="ガイド表示切替">
          {guidesVisible ? <Eye size={14} /> : <EyeOff size={14} />}
        </button>
        <button type="button" className={`${BTN} ${BTN_GHOST}`} onClick={() => addGuide("x")} title="縦ガイド追加">
          <Ruler size={14} className="rotate-90" /> <span className="text-[10px]">|</span>
        </button>
        <button type="button" className={`${BTN} ${BTN_GHOST}`} onClick={() => addGuide("y")} title="横ガイド追加">
          <Ruler size={14} /> <span className="text-[10px]">—</span>
        </button>

        <div className="mx-1 h-5 w-px bg-[var(--ui-border)]" />

        {/* Align / Distribute (visible when 2+ selected) */}
        {selection.ids.length >= 2 && (
          <>
            <button type="button" className={`${BTN} ${BTN_GHOST}`} onClick={() => alignSelected("left")} title="左揃え">
              <AlignStartVertical size={14} />
            </button>
            <button type="button" className={`${BTN} ${BTN_GHOST}`} onClick={() => alignSelected("centerH")} title="水平中央揃え">
              <AlignCenterVertical size={14} />
            </button>
            <button type="button" className={`${BTN} ${BTN_GHOST}`} onClick={() => alignSelected("right")} title="右揃え">
              <AlignEndVertical size={14} />
            </button>
            <button type="button" className={`${BTN} ${BTN_GHOST}`} onClick={() => alignSelected("top")} title="上揃え">
              <AlignStartHorizontal size={14} />
            </button>
            <button type="button" className={`${BTN} ${BTN_GHOST}`} onClick={() => alignSelected("centerV")} title="垂直中央揃え">
              <AlignCenterHorizontal size={14} />
            </button>
            <button type="button" className={`${BTN} ${BTN_GHOST}`} onClick={() => alignSelected("bottom")} title="下揃え">
              <AlignEndHorizontal size={14} />
            </button>
            {selection.ids.length >= 3 && (
              <>
                <div className="mx-0.5 h-4 w-px bg-[var(--ui-border)]" />
                <button type="button" className={`${BTN} ${BTN_GHOST}`} onClick={() => distributeSelected("horizontal")} title="水平等間隔に分布">
                  <AlignHorizontalSpaceAround size={14} />
                </button>
                <button type="button" className={`${BTN} ${BTN_GHOST}`} onClick={() => distributeSelected("vertical")} title="垂直等間隔に分布">
                  <AlignVerticalSpaceAround size={14} />
                </button>
              </>
            )}
          </>
        )}

        <div className="mx-1 h-5 w-px bg-[var(--ui-border)]" />

        {/* Add */}
        <button type="button" className={`${BTN} ${BTN_GHOST}`} onClick={handleAddText} title="テキスト追加">
          <Type size={14} />
        </button>
        <button type="button" className={`${BTN} ${BTN_GHOST}`} onClick={handleAddImage} title="画像追加">
          <Image size={14} />
        </button>
        <button type="button" className={`${BTN} ${BTN_GHOST}`} onClick={handleAddShape} title="図形追加">
          <Square size={14} />
        </button>
        <button type="button" className={`${BTN} ${BTN_GHOST}`} onClick={handleAddButton} title="ボタン追加">
          <MousePointer2 size={14} />
        </button>

        <button
          type="button"
          className={`${BTN} ${BTN_GHOST}`}
          onClick={groupSelectedLayers}
          title="グループ化 (Ctrl/Cmd+G)"
          disabled={selection.ids.length < 2}
        >
          グループ化
        </button>
        <button
          type="button"
          className={`${BTN} ${BTN_GHOST}`}
          onClick={ungroupSelectedLayers}
          title="グループ解除 (Ctrl/Cmd+Shift+G)"
          disabled={!hasGroupSelection}
        >
          解除
        </button>

        {/* Fit Text (visible when text/button selected) */}
        {hasTextSelection && (
          <button type="button" className={`${BTN} ${BTN_GHOST}`} onClick={applyFitTextToSelection} title="枠にフィット (Fit Text)">
            <ALargeSmall size={14} /> Fit
          </button>
        )}

        <div className="mx-1 h-5 w-px bg-[var(--ui-border)]" />

        {/* PC→SP */}
        <button type="button" className={`${BTN} ${BTN_GHOST}`} onClick={generateSpFromPc} title="PC→SP自動生成">
          <Wand2 size={14} /> PC→SP
        </button>

        {/* Auto Layout */}
        <div className="relative">
          <button
            type="button"
            className={`${BTN} ${BTN_GHOST}`}
            onClick={() => setAutoLayoutOpen((v) => !v)}
            title="自動レイアウト"
          >
            <LayoutTemplate size={14} /> 自動レイアウト
          </button>
          {autoLayoutOpen && (
            <div className="absolute left-0 top-full z-50 mt-1 w-52 rounded-md border border-[var(--ui-border)] bg-[var(--surface-2)] shadow-lg py-1">
              {AUTO_LAYOUT_PRESETS.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  className="w-full text-left px-3 py-1.5 text-[12px] hover:bg-[color-mix(in_srgb,var(--ui-text)_8%,transparent)] flex flex-col"
                  onClick={() => {
                    applyAutoLayout(p.id);
                    setAutoLayoutOpen(false);
                  }}
                >
                  <span className="font-medium">{p.label}</span>
                  <span className="text-[10px] opacity-60">{p.description}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Undo / Redo */}
        <div className="ml-auto flex items-center gap-1">
          {toast ? <span className="text-[11px] text-[var(--ui-muted)] mr-2">{toast}</span> : null}
          <button type="button" className={`${BTN} ${BTN_GHOST}`} disabled={!canUndo} onClick={undo}>
            <Undo2 size={14} />
          </button>
          <button type="button" className={`${BTN} ${BTN_GHOST}`} disabled={!canRedo} onClick={redo}>
            <Redo2 size={14} />
          </button>
        </div>
      </div>

      {/* ===== Body ===== */}
      <div className="flex min-h-0 flex-1">
        {/* Left – Layers */}
        <CanvasLayersPanel />

        {/* Center – Stage(s) */}
        {viewMode === "split" ? (
          <div className="flex flex-1 min-h-0">
            <CanvasStage targetDevice="pc" className="flex-1 border-r border-[var(--ui-border)]" />
            <CanvasStage targetDevice="sp" className="flex-1" />
          </div>
        ) : (
          <CanvasStage className="flex-1" />
        )}

        {/* Right – Inspector */}
        <CanvasInspectorPanel />
      </div>
    </div>
  );
}
