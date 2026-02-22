/* ───────────────────────────────────────────────
   Canvas Stage  EエチE��タ中央のキャンバス面
   ドラチE��/リサイズ/回転/選択をDOM+CSS transformで実裁E
   ─────────────────────────────────────────────── */

"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type MouseEvent as ReactMouseEvent,
  type PointerEvent as ReactPointerEvent,
} from "react";
import { useCanvasEditorStore } from "@/src/store/canvasEditorStore";
import { useEditorStore } from "@/src/store/editorStore";
import type { CanvasDevice, CanvasGuide } from "@/src/types/canvas";
import type { CanvasLayer, CanvasLayout } from "@/src/types/canvas";
import { getLayout } from "@/src/types/canvas";
import {
  buildSnapEdges,
  computeSnapForMove,
  computeSnapForResize,
  type ActiveGuide,
  type SnapHysteresis,
} from "@/src/lib/canvas/snapEngine";
import { layerShadowToCss } from "@/src/lib/canvas/shadow";

/* ---------- 定数 ---------- */

const HANDLE_SIZE = 8;
const ROTATION_HANDLE_OFFSET = 28;
const MIN_SIZE = 10;
const GUIDE_COLOR = "#1f6feb";
const SNAP_GUIDE_COLOR = "#f43f5e";

type HandleDir =
  | "nw" | "n" | "ne"
  | "w" | "e"
  | "sw" | "s" | "se";

const HANDLE_DIRS: HandleDir[] = ["nw", "n", "ne", "w", "e", "sw", "s", "se"];

const cursorMap: Record<HandleDir, string> = {
  nw: "nwse-resize",
  n: "ns-resize",
  ne: "nesw-resize",
  w: "ew-resize",
  e: "ew-resize",
  sw: "nesw-resize",
  s: "ns-resize",
  se: "nwse-resize",
};

/* ---------- CanvasStage ---------- */

type CanvasStageProps = {
  targetDevice?: CanvasDevice;
  className?: string;
};

export default function CanvasStage({ targetDevice, className }: CanvasStageProps) {
  const doc = useCanvasEditorStore((s) => s.document);
  const storeDevice = useCanvasEditorStore((s) => s.device);
  const device = targetDevice ?? storeDevice;
  const zoom = useCanvasEditorStore((s) => s.zoom);
  const selection = useCanvasEditorStore((s) => s.selection);
  const gridEnabled = useCanvasEditorStore((s) => s.gridEnabled);
  const snapEnabled = useCanvasEditorStore((s) => s.snapEnabled);
  const guidesVisible = useCanvasEditorStore((s) => s.guidesVisible);
  const gridSize = useCanvasEditorStore((s) => s.gridSize);

  const select = useCanvasEditorStore((s) => s.select);
  const clearSelection = useCanvasEditorStore((s) => s.clearSelection);
  const updateLayerLayout = useCanvasEditorStore((s) => s.updateLayerLayout);
  const pushSnapshot = useCanvasEditorStore((s) => s.pushSnapshot);
  const setDevice = useCanvasEditorStore((s) => s.setDevice);
  const updateGuidePosition = useCanvasEditorStore((s) => s.updateGuidePosition);
  const setZoom = useCanvasEditorStore((s) => s.setZoom);
  const assets = useEditorStore((s) => s.project.assets);

  const stageRef = useRef<HTMLDivElement>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);

  /* ---- viewport (pan) ---- */
  const [panOffset, setPanOffset] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [spaceHeld, setSpaceHeld] = useState(false);
  const panStartRef = useRef({ x: 0, y: 0, ox: 0, oy: 0 });

  /* ---- hover ---- */
  const [hoveredLayerId, setHoveredLayerId] = useState<string | null>(null);

  /* ---- drag state (layers) ---- */
  type DragState = {
    type: "move" | "resize" | "rotate";
    layerId: string;
    startX: number;
    startY: number;
    startLayout: CanvasLayout;
    /** 複数選択移動のための全選択レイヤーの開始位置 */
    startLayouts?: Map<string, CanvasLayout>;
    handleDir?: HandleDir;
  };
  const [dragState, setDragState] = useState<DragState | null>(null);

  /* ---- guide drag state ---- */
  const [guideDrag, setGuideDrag] = useState<{
    guideId: string;
    startPos: number;
    startClientX: number;
    startClientY: number;
    axis: "x" | "y";
  } | null>(null);

  /* ---- active snap guides (visual) ---- */
  const [activeGuides, setActiveGuides] = useState<ActiveGuide[]>([]);

  /* ---- snap hysteresis (persists across pointermove frames) ---- */
  const snapHysteresisRef = useRef<SnapHysteresis>({ x: null, y: null });

  const size = device === "pc" ? doc.meta.size.pc : doc.meta.size.sp;
  const guides: CanvasGuide[] = doc.guides ?? [];

  const resolveAsset = useCallback(
    (assetId: string) => assets?.[assetId]?.data ?? assetId,
    [assets]
  );

  /* ---- visible layers ---- */
  const visibleLayers = useMemo(
    () =>
      doc.layers
        .filter((l) => !l.hidden)
        .filter((l) => l.content.kind !== "group")
        .filter((l) => !l.visibleOn || l.visibleOn.includes(device))
        .sort((a, b) => getLayout(a, device).z - getLayout(b, device).z),
    [doc.layers, device]
  );

  /* ---- Background style ---- */
  const bgStyle = useMemo((): CSSProperties => {
    const bg = doc.background;
    switch (bg.type) {
      case "solid":
        return { backgroundColor: bg.color };
      case "gradient": {
        const stops = bg.stops.map((s) => `${s.color} ${s.pos}%`).join(", ");
        return { background: `linear-gradient(${bg.angle}deg, ${stops})` };
      }
      case "image":
        return {
          backgroundImage: `url("${resolveAsset(bg.assetId)}")`,
          backgroundSize: "cover",
          backgroundPosition: "center",
        };
      default:
        return { backgroundColor: "#ffffff" };
    }
  }, [doc.background, resolveAsset]);

  /* ---- Space key for pan mode ---- */
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.code === "Space" && !(e.target instanceof HTMLInputElement) && !(e.target instanceof HTMLTextAreaElement)) {
        e.preventDefault();
        setSpaceHeld(true);
      }
    };
    const onKeyUp = (e: KeyboardEvent) => {
      if (e.code === "Space") setSpaceHeld(false);
    };
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
    };
  }, []);

  /* ---- Ctrl+Wheel zoom ---- */
  useEffect(() => {
    const el = wrapperRef.current;
    if (!el) return;
    const handler = (e: WheelEvent) => {
      if (e.ctrlKey || e.metaKey) {
        e.preventDefault();
        const delta = e.deltaY > 0 ? -0.05 : 0.05;
        setZoom(Math.max(0.25, Math.min(4, zoom + delta)));
      }
    };
    el.addEventListener("wheel", handler, { passive: false });
    return () => el.removeEventListener("wheel", handler);
  }, [zoom, setZoom]);

  /* ---- Pan pointer handlers ---- */
  const handleWrapperPointerDown = (e: ReactPointerEvent) => {
    if (spaceHeld) {
      e.preventDefault();
      e.stopPropagation();
      setIsPanning(true);
      panStartRef.current = { x: e.clientX, y: e.clientY, ox: panOffset.x, oy: panOffset.y };
    }
  };

  useEffect(() => {
    if (!isPanning) return;
    const onMove = (e: PointerEvent) => {
      const dx = e.clientX - panStartRef.current.x;
      const dy = e.clientY - panStartRef.current.y;
      setPanOffset({ x: panStartRef.current.ox + dx, y: panStartRef.current.oy + dy });
    };
    const onUp = () => setIsPanning(false);
    document.addEventListener("pointermove", onMove);
    document.addEventListener("pointerup", onUp);
    return () => {
      document.removeEventListener("pointermove", onMove);
      document.removeEventListener("pointerup", onUp);
    };
  }, [isPanning]);

  /* ---- Click background to deselect ---- */
  const handleStageClick = (e: ReactMouseEvent) => {
    if (isPanning) return;
    if (e.target === stageRef.current) {
      clearSelection();
    }
    // Split 表示時にクリチE��した方のチE��イスをアクチE��ブに
    if (targetDevice && targetDevice !== storeDevice) {
      setDevice(targetDevice);
    }
  };

  /* ---- Layer click ---- */
  const handleLayerPointerDown = (e: ReactPointerEvent, layer: CanvasLayer) => {
    e.stopPropagation();
    if (spaceHeld) { handleWrapperPointerDown(e); return; }
    if (layer.locked) return;
    if (targetDevice && targetDevice !== storeDevice) {
      setDevice(targetDevice);
    }

    const isShift = e.shiftKey;
    let currentIds: string[];
    if (isShift) {
      currentIds = selection.ids.includes(layer.id)
        ? selection.ids.filter((id) => id !== layer.id)
        : [...selection.ids, layer.id];
      select(currentIds, layer.id);
    } else if (!selection.ids.includes(layer.id)) {
      currentIds = [layer.id];
      select(currentIds, layer.id);
    } else {
      currentIds = selection.ids;
    }

    // Start move drag — record all selected layers' start positions
    pushSnapshot();
    const layout = getLayout(layer, device);
    const startLayouts = new Map<string, CanvasLayout>();
    const activeDragIds = currentIds.length > 0 ? currentIds : [layer.id];
    for (const id of activeDragIds) {
      const l = doc.layers.find((ll) => ll.id === id);
      if (l && !l.locked) {
        startLayouts.set(id, { ...getLayout(l, device) });
      }
    }

    setDragState({
      type: "move",
      layerId: layer.id,
      startX: e.clientX,
      startY: e.clientY,
      startLayout: { ...layout },
      startLayouts,
    });
  };

  /* ---- Resize handle ---- */
  const handleResizePointerDown = (e: ReactPointerEvent, layerId: string, dir: HandleDir) => {
    e.stopPropagation();
    const layer = doc.layers.find((l) => l.id === layerId);
    if (!layer || layer.locked) return;
    pushSnapshot();
    const layout = getLayout(layer, device);
    setDragState({
      type: "resize",
      layerId,
      startX: e.clientX,
      startY: e.clientY,
      startLayout: { ...layout },
      handleDir: dir,
    });
  };

  /* ---- Rotation handle ---- */
  const handleRotatePointerDown = (e: ReactPointerEvent, layerId: string) => {
    e.stopPropagation();
    const layer = doc.layers.find((l) => l.id === layerId);
    if (!layer || layer.locked) return;
    pushSnapshot();
    const layout = getLayout(layer, device);
    setDragState({
      type: "rotate",
      layerId,
      startX: e.clientX,
      startY: e.clientY,
      startLayout: { ...layout },
    });
  };

  /* ---- Guide pointer down ---- */
  const handleGuidePointerDown = (e: ReactPointerEvent, guide: CanvasGuide) => {
    e.stopPropagation();
    pushSnapshot();
    setGuideDrag({
      guideId: guide.id,
      startPos: guide.position,
      startClientX: e.clientX,
      startClientY: e.clientY,
      axis: guide.axis,
    });
  };

  /* ---- Build snap edges excluding drag targets ---- */
  const buildSnapEdgesForDrag = useCallback(
    (dragLayerIds: string[]) => {
      const otherLayouts = doc.layers
        .filter((l) => !l.hidden && !dragLayerIds.includes(l.id))
        .map((l) => getLayout(l, device));
      return buildSnapEdges(size, otherLayouts, guides);
    },
    [doc.layers, device, size, guides],
  );

  /* ---- Pointer move / up (document level) ---- */
  useEffect(() => {
    if (!dragState) return;

    const handlePointerMove = (e: PointerEvent) => {
      const dx = (e.clientX - dragState.startX) / zoom;
      const dy = (e.clientY - dragState.startY) / zoom;
      const sl = dragState.startLayout;

      if (dragState.type === "move") {
        const activeDragIds = dragState.startLayouts
          ? Array.from(dragState.startLayouts.keys())
          : [dragState.layerId];

        // Shift = axis-lock (constrain to dominant direction)
        let adx = dx;
        let ady = dy;
        if (e.shiftKey) {
          if (Math.abs(dx) >= Math.abs(dy)) ady = 0;
          else adx = 0;
        }

        // Primary layer candidate position
        let nx = sl.x + adx;
        let ny = sl.y + ady;

        if (gridEnabled) {
          nx = Math.round(nx / gridSize) * gridSize;
          ny = Math.round(ny / gridSize) * gridSize;
        }

        // Snap
        let snapGuides: ActiveGuide[] = [];
        if (snapEnabled) {
          const edges = buildSnapEdgesForDrag(activeDragIds);
          const candidate: CanvasLayout = { ...sl, x: nx, y: ny };
          const snap = computeSnapForMove(candidate, edges, undefined, snapHysteresisRef.current);
          nx = snap.layout.x;
          ny = snap.layout.y;
          snapGuides = snap.activeGuides;
          snapHysteresisRef.current = snap.hysteresis;
        } else {
          snapHysteresisRef.current = { x: null, y: null };
        }

        // 整数丸め (grid OFF 時)
        if (!gridEnabled) {
          nx = Math.round(nx);
          ny = Math.round(ny);
        }
        setActiveGuides(snapGuides);

        // Apply delta to all selected layers
        const finalDx = nx - sl.x;
        const finalDy = ny - sl.y;
        for (const id of activeDragIds) {
          const start = dragState.startLayouts?.get(id);
          if (start) {
            updateLayerLayout(id, { x: start.x + finalDx, y: start.y + finalDy });
          }
        }
        return;
      }

      if (dragState.type === "resize" && dragState.handleDir) {
        const dir = dragState.handleDir;
        let { x, y, w, h } = sl;

        if (dir.includes("e")) w = Math.max(MIN_SIZE, sl.w + dx);
        if (dir.includes("w")) {
          w = Math.max(MIN_SIZE, sl.w - dx);
          x = sl.x + sl.w - w;
        }
        if (dir.includes("s")) h = Math.max(MIN_SIZE, sl.h + dy);
        if (dir.includes("n")) {
          h = Math.max(MIN_SIZE, sl.h - dy);
          y = sl.y + sl.h - h;
        }

        // Shift = aspect-ratio lock
        if (e.shiftKey && sl.w > 0 && sl.h > 0) {
          const ratio = sl.w / sl.h;
          const isCorner = dir.length === 2;
          if (isCorner) {
            // determine from w-change
            const newH = Math.max(MIN_SIZE, w / ratio);
            if (dir.includes("n")) y = sl.y + sl.h - newH;
            h = newH;
          } else if (dir === "e" || dir === "w") {
            h = Math.max(MIN_SIZE, w / ratio);
          } else {
            w = Math.max(MIN_SIZE, h * ratio);
          }
        }

        if (gridEnabled) {
          w = Math.round(w / gridSize) * gridSize || gridSize;
          h = Math.round(h / gridSize) * gridSize || gridSize;
        }

        // Snap resize
        let snapGuides: ActiveGuide[] = [];
        if (snapEnabled) {
          const edges = buildSnapEdgesForDrag([dragState.layerId]);
          const candidate: CanvasLayout = { ...sl, x, y, w, h };
          const snap = computeSnapForResize(candidate, dir, edges, undefined, snapHysteresisRef.current);
          x = snap.layout.x;
          y = snap.layout.y;
          w = snap.layout.w;
          h = snap.layout.h;
          snapGuides = snap.activeGuides;
          snapHysteresisRef.current = snap.hysteresis;
        } else {
          snapHysteresisRef.current = { x: null, y: null };
        }

        // 整数丸め (grid OFF 時)
        if (!gridEnabled) {
          x = Math.round(x);
          y = Math.round(y);
          w = Math.round(w);
          h = Math.round(h);
        }
        setActiveGuides(snapGuides);

        updateLayerLayout(dragState.layerId, { x, y, w, h });
        return;
      }

      if (dragState.type === "rotate") {
        const stageRect = stageRef.current?.getBoundingClientRect();
        if (!stageRect) return;
        const cx = (sl.x + sl.w / 2) * zoom + stageRect.left;
        const cy = (sl.y + sl.h / 2) * zoom + stageRect.top;
        const angle = Math.atan2(e.clientY - cy, e.clientX - cx) * (180 / Math.PI) + 90;
        let r = Math.round(angle);
        if (e.shiftKey) {
          r = Math.round(r / 15) * 15;
        }
        updateLayerLayout(dragState.layerId, { r });
      }
    };

    const handlePointerUp = () => {
      setDragState(null);
      setActiveGuides([]);
      snapHysteresisRef.current = { x: null, y: null };
    };

    document.addEventListener("pointermove", handlePointerMove);
    document.addEventListener("pointerup", handlePointerUp);
    return () => {
      document.removeEventListener("pointermove", handlePointerMove);
      document.removeEventListener("pointerup", handlePointerUp);
    };
  }, [dragState, zoom, gridEnabled, snapEnabled, gridSize, selection.ids, doc.layers, device, updateLayerLayout, buildSnapEdgesForDrag]);

  /* ---- Pointer move / up — guide drag ---- */
  useEffect(() => {
    if (!guideDrag) return;

    const handlePointerMove = (e: PointerEvent) => {
      const delta = guideDrag.axis === "x"
        ? (e.clientX - guideDrag.startClientX) / zoom
        : (e.clientY - guideDrag.startClientY) / zoom;
      updateGuidePosition(guideDrag.guideId, Math.round(guideDrag.startPos + delta));
    };

    const handlePointerUp = () => {
      setGuideDrag(null);
    };

    document.addEventListener("pointermove", handlePointerMove);
    document.addEventListener("pointerup", handlePointerUp);
    return () => {
      document.removeEventListener("pointermove", handlePointerMove);
      document.removeEventListener("pointerup", handlePointerUp);
    };
  }, [guideDrag, zoom, updateGuidePosition]);

  /* ---- Grid overlay ---- */
  const gridOverlay = gridEnabled ? (
    <svg
      style={{
        position: "absolute",
        inset: 0,
        width: size.width,
        height: size.height,
        pointerEvents: "none",
        opacity: 0.08,
      }}
    >
      <defs>
        <pattern id={`grid-${device}`} width={gridSize} height={gridSize} patternUnits="userSpaceOnUse">
          <path d={`M ${gridSize} 0 L 0 0 0 ${gridSize}`} fill="none" stroke="#000" strokeWidth="0.5" />
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill={`url(#grid-${device})`} />
    </svg>
  ) : null;

  /* ---- User guide lines overlay ---- */
  const guideOverlay = guidesVisible && guides.length > 0 ? (
    <>
      {guides.map((g) => {
        const isVertical = g.axis === "x";
        return (
          <div
            key={g.id}
            style={{
              position: "absolute",
              left: isVertical ? g.position : 0,
              top: isVertical ? 0 : g.position,
              width: isVertical ? 0 : size.width,
              height: isVertical ? size.height : 0,
              borderLeft: isVertical ? `1px dashed ${GUIDE_COLOR}` : undefined,
              borderTop: !isVertical ? `1px dashed ${GUIDE_COLOR}` : undefined,
              zIndex: 10000,
              cursor: isVertical ? "ew-resize" : "ns-resize",
              padding: isVertical ? "0 3px" : "3px 0",
              margin: isVertical ? "0 -3px" : "-3px 0",
            }}
            onPointerDown={(e) => handleGuidePointerDown(e, g)}
          />
        );
      })}
    </>
  ) : null;

  /* ---- Snap guide lines overlay (active during drag) ---- */
  const snapGuideOverlay = activeGuides.length > 0 ? (
    <svg
      style={{
        position: "absolute",
        inset: 0,
        width: size.width,
        height: size.height,
        pointerEvents: "none",
        zIndex: 10001,
      }}
    >
      {activeGuides.map((g, i) =>
        g.axis === "x" ? (
          <line key={`sg-${i}`} x1={g.position} y1={0} x2={g.position} y2={size.height} stroke={SNAP_GUIDE_COLOR} strokeWidth={1} strokeDasharray="4 3" />
        ) : (
          <line key={`sg-${i}`} x1={0} y1={g.position} x2={size.width} y2={g.position} stroke={SNAP_GUIDE_COLOR} strokeWidth={1} strokeDasharray="4 3" />
        ),
      )}
    </svg>
  ) : null;

  /* ---------- Render layer ---------- */
  const renderLayer = (layer: CanvasLayer) => {
    const layout = getLayout(layer, device);
    const isSelected = selection.ids.includes(layer.id);

    const wrapperStyle: CSSProperties = {
      position: "absolute",
      left: layout.x,
      top: layout.y,
      width: layout.w,
      height: layout.h,
      transform: layout.r ? `rotate(${layout.r}deg)` : undefined,
      zIndex: layout.z,
      opacity: layer.style.opacity,
      cursor: spaceHeld ? (isPanning ? "grabbing" : "grab") : layer.locked ? "default" : dragState?.type === "move" ? "grabbing" : "grab",
      outline: isSelected ? "2px solid #1f6feb" : (hoveredLayerId === layer.id && !layer.locked) ? "1px solid rgba(31,111,235,0.45)" : undefined,
      outlineOffset: isSelected ? 1 : 0,
      userSelect: "none",
      overflow: "hidden",
    };

    const shadowCss = layerShadowToCss(layer.style.shadow);
    if (shadowCss) {
      wrapperStyle.boxShadow = shadowCss;
    }

    const content = layer.content;
    let inner: React.JSX.Element | null = null;

    switch (content.kind) {
      case "text": {
        const ts: CSSProperties = {
          fontFamily: layer.style.fontFamily ?? "system-ui",
          fontSize: layer.style.fontSize ?? 16,
          fontWeight: layer.style.fontWeight ?? 400,
          lineHeight: layer.style.lineHeight ?? 1.6,
          letterSpacing: layer.style.letterSpacing ?? 0,
          textAlign: (layer.style.textAlign as CSSProperties["textAlign"]) ?? "left",
          color: layer.style.textColor ?? "#111",
          width: "100%",
          height: "100%",
          padding: 4,
          wordBreak: "break-word",
          whiteSpace: "pre-wrap",
          margin: 0,
        };
        inner = <div style={ts}>{content.text}</div>;
        break;
      }
      case "image": {
        const src = resolveAsset(content.assetId);
        inner = (
          <img
            src={src}
            alt={content.alt ?? ""}
            style={{ width: "100%", height: "100%", objectFit: "cover", borderRadius: layer.style.radius ?? 0 }}
            draggable={false}
          />
        );
        break;
      }
      case "shape": {
        const fill = layer.style.fill ?? "#cccccc";
        const stroke = layer.style.stroke ?? "none";
        const sw = layer.style.strokeWidth ?? 0;
        const r = layer.style.radius ?? 0;
        switch (content.shape) {
          case "circle":
            inner = (
              <svg width="100%" height="100%" viewBox={`0 0 ${layout.w} ${layout.h}`} preserveAspectRatio="none">
                <ellipse cx={layout.w/2} cy={layout.h/2} rx={layout.w/2-sw} ry={layout.h/2-sw} fill={fill} stroke={stroke} strokeWidth={sw} />
              </svg>
            );
            break;
          case "triangle":
            inner = (
              <svg width="100%" height="100%" viewBox={`0 0 ${layout.w} ${layout.h}`} preserveAspectRatio="none">
                <polygon points={`${layout.w/2},${sw} ${layout.w-sw},${layout.h-sw} ${sw},${layout.h-sw}`} fill={fill} stroke={stroke} strokeWidth={sw} />
              </svg>
            );
            break;
          default:
            inner = (
              <svg width="100%" height="100%" viewBox={`0 0 ${layout.w} ${layout.h}`} preserveAspectRatio="none">
                <rect x={sw/2} y={sw/2} width={layout.w-sw} height={layout.h-sw} rx={r} fill={fill} stroke={stroke} strokeWidth={sw} />
              </svg>
            );
        }
        break;
      }
      case "button": {
        const btnS: CSSProperties = {
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          width: "100%",
          height: "100%",
          backgroundColor: layer.style.buttonBgColor ?? "#1f6feb",
          color: layer.style.buttonTextColor ?? "#ffffff",
          borderRadius: layer.style.buttonRadius ?? 8,
          fontFamily: layer.style.fontFamily ?? "system-ui",
          fontSize: layer.style.fontSize ?? 16,
          fontWeight: layer.style.fontWeight ?? 700,
          border: "none",
        };
        inner = <div style={btnS}>{content.label}</div>;
        break;
      }
      default:
        inner = null;
    }

    return (
      <div
        key={layer.id}
        style={wrapperStyle}
        onPointerDown={(e) => handleLayerPointerDown(e, layer)}
        onPointerEnter={() => setHoveredLayerId(layer.id)}
        onPointerLeave={() => setHoveredLayerId((prev) => prev === layer.id ? null : prev)}
        data-layer-id={layer.id}
      >
        {inner}
        {/* Selection label */}
        {isSelected && !layer.locked ? (
          <>
            <div style={{
              position: "absolute", top: -18, left: 0,
              fontSize: 9, lineHeight: "14px", padding: "0 4px",
              background: "#1f6feb", color: "#fff", borderRadius: "3px 3px 0 0",
              whiteSpace: "nowrap", pointerEvents: "none",
            }}>{layer.name}</div>
            {HANDLE_DIRS.map((dir) => {
              const pos = handlePosition(dir, layout.w, layout.h);
              return (
                <div
                  key={dir}
                  style={{
                    position: "absolute",
                    left: pos.x - HANDLE_SIZE / 2,
                    top: pos.y - HANDLE_SIZE / 2,
                    width: HANDLE_SIZE,
                    height: HANDLE_SIZE,
                    backgroundColor: "#fff",
                    border: "2px solid #1f6feb",
                    borderRadius: 2,
                    cursor: cursorMap[dir],
                    zIndex: 9999,
                  }}
                  onPointerDown={(e) => handleResizePointerDown(e, layer.id, dir)}
                />
              );
            })}
            {/* Rotation handle */}
            <div
              style={{
                position: "absolute",
                left: layout.w / 2 - 6,
                top: -ROTATION_HANDLE_OFFSET,
                width: 12,
                height: 12,
                borderRadius: "50%",
                backgroundColor: "#1f6feb",
                cursor: "crosshair",
                zIndex: 9999,
              }}
              onPointerDown={(e) => handleRotatePointerDown(e, layer.id)}
            />
            <div
              style={{
                position: "absolute",
                left: layout.w / 2 - 0.5,
                top: -ROTATION_HANDLE_OFFSET + 12,
                width: 1,
                height: ROTATION_HANDLE_OFFSET - 12,
                backgroundColor: "#1f6feb",
                zIndex: 9998,
              }}
            />
          </>
        ) : null}
      </div>
    );
  };

  return (
    <div
      ref={wrapperRef}
      className={className}
      style={{
        display: "flex",
        alignItems: "flex-start",
        justifyContent: "center",
        overflow: "hidden",
        flex: 1,
        padding: 40,
        backgroundColor: "var(--ui-bg, #f3f4f6)",
        cursor: spaceHeld ? (isPanning ? "grabbing" : "grab") : undefined,
      }}
      onPointerDown={handleWrapperPointerDown}
    >
      <div
        ref={stageRef}
        style={{
          position: "relative",
          width: size.width,
          height: size.height,
          ...bgStyle,
          transformOrigin: "top left",
          transform: `translate(${panOffset.x}px, ${panOffset.y}px) scale(${zoom})`,
          boxShadow: "0 2px 24px rgba(0,0,0,0.12)",
          flexShrink: 0,
        }}
        onClick={handleStageClick}
      >
        {gridOverlay}
        {guideOverlay}
        {snapGuideOverlay}
        {visibleLayers.map(renderLayer)}
      </div>
    </div>
  );
}

/* ---- Handle position helper ---- */

function handlePosition(dir: HandleDir, w: number, h: number) {
  const map: Record<HandleDir, { x: number; y: number }> = {
    nw: { x: 0, y: 0 },
    n: { x: w / 2, y: 0 },
    ne: { x: w, y: 0 },
    w: { x: 0, y: h / 2 },
    e: { x: w, y: h / 2 },
    sw: { x: 0, y: h },
    s: { x: w / 2, y: h },
    se: { x: w, y: h },
  };
  return map[dir];
}
