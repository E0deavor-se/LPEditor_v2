/* ───────────────────────────────────────────────
   Canvas Renderer – Preview & Export 共用
   CanvasDocument → React DOM (absolute配置)
   ─────────────────────────────────────────────── */

"use client";

import { type CSSProperties, useMemo } from "react";
import type {
  CanvasDocument,
  CanvasLayer,
  CanvasLayout,
  CanvasBackground,
  CanvasDevice,
  LayerStyle,
} from "@/src/types/canvas";
import type { JSX } from "react";
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
      const url = resolveAsset?.(bg.assetId) ?? bg.assetId;
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
  layout,
  resolveAsset,
  interactive,
}: {
  layer: CanvasLayer;
  layout: CanvasLayout;
  resolveAsset?: (id: string) => string;
  interactive?: boolean;
}) => {
  const { content, style } = layer;

  const wrapperStyle: CSSProperties = {
    position: "absolute",
    left: layout.x,
    top: layout.y,
    width: layout.w,
    height: layout.h,
    transform: layout.r ? `rotate(${layout.r}deg)` : undefined,
    zIndex: layout.z,
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
      const src = resolveAsset?.(content.assetId) ?? content.assetId;
      return (
        <div style={wrapperStyle} data-layer-id={layer.id}>
          <img
            src={src}
            alt={content.alt ?? ""}
            style={{ width: "100%", height: "100%", objectFit: "cover", borderRadius: style.radius ?? 0 }}
            draggable={false}
          />
        </div>
      );
    }
    case "shape": {
      return (
        <div style={wrapperStyle} data-layer-id={layer.id}>
          {renderShapeSvg(content.shape, layout.w, layout.h, style)}
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
  const size = device === "pc" ? doc.meta.size.pc : doc.meta.size.sp;
  const bgStyle = useMemo(() => bgToStyle(doc.background, resolveAsset), [doc.background, resolveAsset]);

  const visibleLayers = useMemo(
    () =>
      doc.layers
        .filter((l) => !l.hidden)
        .filter((l) => l.content.kind !== "group")
        .filter((l) => !l.visibleOn || l.visibleOn.includes(device))
        .sort((a, b) => (device === "pc" ? a.variants.pc.z : a.variants.sp.z) - (device === "pc" ? b.variants.pc.z : b.variants.sp.z)),
    [doc.layers, device]
  );

  const rootStyle: CSSProperties = {
    position: "relative",
    width: size.width,
    height: size.height,
    ...bgStyle,
    overflow: "hidden",
    transformOrigin: "top left",
    transform: scale !== 1 ? `scale(${scale})` : undefined,
    ...outerStyle,
  };

  return (
    <div className={className} style={rootStyle} data-canvas-device={device}>
      {visibleLayers.map((layer) => (
        <LayerElement
          key={layer.id}
          layer={layer}
          layout={device === "pc" ? layer.variants.pc : layer.variants.sp}
          resolveAsset={resolveAsset}
          interactive={interactive}
        />
      ))}
    </div>
  );
}
