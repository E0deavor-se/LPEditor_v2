/* ───────────────────────────────────────────────
   Canvas Renderer – Preview & Export 共用
   CanvasDocument → React DOM (absolute配置)
   ─────────────────────────────────────────────── */

"use client";

import { type CSSProperties, useEffect, useMemo, useRef, useState } from "react";
import type {
  CanvasDocument,
  CanvasLayer,
  CanvasBackground,
  CanvasDevice,
  LayerStyle,
} from "@/src/types/canvas";
import { getLayout, getLayerStyle, getRenderableLayersForDocument, resolveLayerLayout } from "@/src/types/canvas";
import { layerShadowToCss } from "@/src/lib/canvas/shadow";

/* ---------- Props ---------- */

export type CanvasRendererProps = {
  document: CanvasDocument;
  device: CanvasDevice;
  /** アセット解決。assetId → data URL or path */
  resolveAsset?: (assetId: string) => string;
  /** プレビューモード（クリック非活性等） */
  interactive?: boolean;
  className?: string;
  style?: CSSProperties;
  /** scale factor（エディタ zoom 反映用） */
  scale?: number;
};

/* ---------- Background → CSS ---------- */

const bgToStyle = (bg: CanvasBackground, resolveAsset?: (id: string) => string): CSSProperties => {
  switch (bg.type) {
    case "solid":
      return { backgroundColor: bg.color };
    case "gradient": {
      const stops = bg.stops.map((s) => `${s.color} ${s.pos}%`).join(", ");
      return { background: `linear-gradient(${bg.angle}deg, ${stops})` };
    }
    case "image": {
      const url = (resolveAsset?.(bg.assetId) ?? bg.assetId ?? "").trim();
      if (!url) return { backgroundColor: "#ffffff" };
      return {
        backgroundImage: `url("${url}")`,
        backgroundSize: "cover",
        backgroundPosition: "center",
      };
    }
    default:
      return { backgroundColor: "#ffffff" };
  }
};

/* ---------- Shape SVG ---------- */

const renderShapeSvg = (
  shape: string,
  w: number,
  h: number,
  style: LayerStyle
): React.JSX.Element => {
  const fill = style.fill ?? "#cccccc";
  const stroke = style.stroke ?? "none";
  const strokeWidth = style.strokeWidth ?? 0;

  switch (shape) {
    case "circle":
      return (
        <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} xmlns="http://www.w3.org/2000/svg">
          <ellipse
            cx={w / 2}
            cy={h / 2}
            rx={w / 2 - strokeWidth}
            ry={h / 2 - strokeWidth}
            fill={fill}
            stroke={stroke}
            strokeWidth={strokeWidth}
          />
        </svg>
      );
    case "triangle":
      return (
        <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} xmlns="http://www.w3.org/2000/svg">
          <polygon
            points={`${w / 2},${strokeWidth} ${w - strokeWidth},${h - strokeWidth} ${strokeWidth},${h - strokeWidth}`}
            fill={fill}
            stroke={stroke}
            strokeWidth={strokeWidth}
          />
        </svg>
      );
    case "star": {
      const cx = w / 2;
      const cy = h / 2;
      const outer = Math.min(w, h) / 2 - strokeWidth;
      const inner = outer * 0.4;
      const pts: string[] = [];
      for (let i = 0; i < 10; i++) {
        const r = i % 2 === 0 ? outer : inner;
        const angle = (Math.PI / 5) * i - Math.PI / 2;
        pts.push(`${cx + r * Math.cos(angle)},${cy + r * Math.sin(angle)}`);
      }
      return (
        <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} xmlns="http://www.w3.org/2000/svg">
          <polygon points={pts.join(" ")} fill={fill} stroke={stroke} strokeWidth={strokeWidth} />
        </svg>
      );
    }
    case "line":
      return (
        <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} xmlns="http://www.w3.org/2000/svg">
          <line
            x1={0}
            y1={h / 2}
            x2={w}
            y2={h / 2}
            stroke={stroke || fill}
            strokeWidth={strokeWidth || 2}
          />
        </svg>
      );
    default: // rect
      return (
        <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} xmlns="http://www.w3.org/2000/svg">
          <rect
            x={strokeWidth / 2}
            y={strokeWidth / 2}
            width={w - strokeWidth}
            height={h - strokeWidth}
            rx={style.radius ?? 0}
            fill={fill}
            stroke={stroke}
            strokeWidth={strokeWidth}
          />
        </svg>
      );
  }
};

/* ---------- Layer → DOM ---------- */

const LayerElement = ({
  layer,
  device,
  canvasWidth,
  resolveAsset,
  interactive,
}: {
  layer: CanvasLayer;
  device: CanvasDevice;
  canvasWidth: number;
  resolveAsset?: (id: string) => string;
  interactive?: boolean;
}) => {
  const { content } = layer;
  const style = getLayerStyle(layer, device);
  const effectiveLayout = resolveLayerLayout(layer, device, canvasWidth);

  const wrapperStyle: CSSProperties = {
    position: "absolute",
    left: effectiveLayout.x,
    top: effectiveLayout.y,
    width: effectiveLayout.w,
    height: effectiveLayout.h,
    transform: effectiveLayout.r ? `rotate(${effectiveLayout.r}deg)` : undefined,
    zIndex: effectiveLayout.z,
    opacity: style.opacity,
    pointerEvents: layer.locked || !interactive ? "none" : "auto",
    overflow: "hidden",
  };

  const shadowCss = layerShadowToCss(style.shadow);
  if (shadowCss) {
    wrapperStyle.boxShadow = shadowCss;
  }

  switch (content.kind) {
    case "text": {
      const textStyle: CSSProperties = {
        fontFamily: style.fontFamily ?? "system-ui",
        fontSize: style.fontSize ?? 16,
        fontWeight: style.fontWeight ?? 400,
        lineHeight: style.lineHeight ?? 1.6,
        letterSpacing: style.letterSpacing ?? 0,
        textAlign: (style.textAlign as CSSProperties["textAlign"]) ?? "left",
        color: style.textColor ?? "#111",
        width: "100%",
        height: "100%",
        margin: 0,
        padding: 4,
        wordBreak: "break-word",
        whiteSpace: "pre-wrap",
      };
      return (
        <div style={wrapperStyle} data-layer-id={layer.id}>
          <div style={textStyle}>{content.text}</div>
        </div>
      );
    }
    case "image": {
      const src = (resolveAsset?.(content.assetId) ?? content.assetId ?? "").trim();
      const fitMode = layer.imageSettings?.fitMode ?? "cover";
      const focalX = Math.max(0, Math.min(1, layer.imageSettings?.focalPoint?.x ?? 0.5));
      const focalY = Math.max(0, Math.min(1, layer.imageSettings?.focalPoint?.y ?? 0.5));
      const objectFit: CSSProperties["objectFit"] = fitMode;
      return (
        <div style={wrapperStyle} data-layer-id={layer.id}>
          {src ? (
            <img
              src={src}
              alt={content.alt ?? ""}
              style={{
                width: "100%",
                height: "100%",
                objectFit,
                objectPosition: `${Math.round(focalX * 100)}% ${Math.round(focalY * 100)}%`,
                borderRadius: style.radius ?? 0,
              }}
              draggable={false}
            />
          ) : (
            <div
              style={{
                width: "100%",
                height: "100%",
                border: "1px dashed rgba(148,163,184,0.8)",
                borderRadius: style.radius ?? 0,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "rgba(100,116,139,0.9)",
                fontSize: 12,
                backgroundColor: "rgba(248,250,252,0.9)",
              }}
            >
              画像未設定
            </div>
          )}
        </div>
      );
    }
    case "shape": {
      return (
        <div style={wrapperStyle} data-layer-id={layer.id}>
          {renderShapeSvg(content.shape, effectiveLayout.w, effectiveLayout.h, style)}
        </div>
      );
    }
    case "button": {
      const btnStyle: CSSProperties = {
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        width: "100%",
        height: "100%",
        backgroundColor: style.buttonBgColor ?? "#1f6feb",
        color: style.buttonTextColor ?? "#ffffff",
        borderRadius: style.buttonRadius ?? 8,
        fontFamily: style.fontFamily ?? "system-ui",
        fontSize: style.fontSize ?? 16,
        fontWeight: style.fontWeight ?? 700,
        lineHeight: style.lineHeight ?? 1.4,
        letterSpacing: style.letterSpacing ?? 0,
        textDecoration: "none",
        cursor: interactive ? "pointer" : "default",
        border: "none",
      };
      const Tag = interactive ? "a" : "div";
      const linkProps = interactive ? { href: content.href, target: "_blank", rel: "noopener" } : {};
      return (
        <div style={wrapperStyle} data-layer-id={layer.id}>
          <Tag style={btnStyle} {...linkProps}>
            {content.label}
          </Tag>
        </div>
      );
    }
    case "svg": {
      return (
        <div
          style={wrapperStyle}
          data-layer-id={layer.id}
          dangerouslySetInnerHTML={{ __html: content.svg }}
        />
      );
    }
    default:
      return <div style={wrapperStyle} data-layer-id={layer.id} />;
  }
};

/* ---------- Main Renderer ---------- */

export default function CanvasRenderer({
  document: doc,
  device,
  resolveAsset,
  interactive = false,
  className,
  style: outerStyle,
  scale = 1,
}: CanvasRendererProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [fitScale, setFitScale] = useState(1);
  const size = device === "pc" ? doc.meta.size.pc : doc.meta.size.sp;
  const renderScale = scale * fitScale;
  const bgStyle = useMemo(() => bgToStyle(doc.background, resolveAsset), [doc.background, resolveAsset]);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const recompute = () => {
      const rect = el.getBoundingClientRect();
      const next = Math.min(1, rect.width / Math.max(1, size.width));
      setFitScale(next);
    };
    recompute();
    const observer = new ResizeObserver(() => recompute());
    observer.observe(el);
    return () => observer.disconnect();
  }, [size.width]);

  const visibleLayers = useMemo(
    () =>
      getRenderableLayersForDocument(doc, device, size.width)
        .filter((l) => !l.hidden)
        .filter((l) => l.content.kind !== "group")
        .filter((l) => !l.visibleOn || l.visibleOn.includes(device))
        .sort((a, b) => getLayout(a, device).z - getLayout(b, device).z),
    [doc, device, size.width]
  );

  const rootStyle: CSSProperties = {
    position: "relative",
    width: size.width,
    height: size.height,
    ...bgStyle,
    overflow: "hidden",
    transformOrigin: "top left",
    transform: renderScale !== 1 ? `scale(${renderScale})` : undefined,
    ...outerStyle,
  };

  return (
    <div ref={containerRef} className={className} style={{ width: "100%", height: size.height * renderScale }}>
      <div style={rootStyle} data-canvas-device={device}>
        {visibleLayers.map((layer) => (
          <LayerElement
            key={layer.id}
            layer={layer}
            device={device}
            canvasWidth={size.width}
            resolveAsset={resolveAsset}
            interactive={interactive}
          />
        ))}
      </div>
    </div>
  );
}
