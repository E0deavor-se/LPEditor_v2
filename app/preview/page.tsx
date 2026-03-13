"use client";

import { useEffect, useMemo, useRef, useState, type MouseEvent } from "react";
import PreviewSsr from "@/src/preview/PreviewSsr";
import type { ProjectState } from "@/src/types/project";
import dynamic from "next/dynamic";
import { getLayoutSections } from "@/src/lib/editorProject";

const CanvasRenderer = dynamic(
  () => import("@/src/components/canvas/CanvasRenderer"),
  { ssr: false }
);

const PREVIEW_READY = "CLP_PREVIEW_READY";
const PROJECT_UPDATE = "CLP_PROJECT_UPDATE";
const SECTION_HOVER = "CLP_SECTION_HOVER";
const SECTION_SELECT = "CLP_SECTION_SELECT";
const EDITOR_SELECT_SECTION = "CLP_EDITOR_SELECT_SECTION";
const PREVIEW_INSERT_SECTION_AFTER = "CLP_PREVIEW_INSERT_SECTION_AFTER";
const PREVIEW_SECTION_ACTION = "CLP_PREVIEW_SECTION_ACTION";
const SCREENSHOT_REQUEST = "CLP_SCREENSHOT_REQUEST";
const SCREENSHOT_RESULT = "CLP_SCREENSHOT_RESULT";
const TRANSPARENT_PIXEL =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVQIW2NgYGD4DwABBAEAH5Y8FQAAAABJRU5ErkJggg==";

type PreviewPayload = {
  ui?: {
    editorMode?: "layout" | "canvas";
    previewMode?: string;
    previewAspect?: string;
    isPreviewBusy?: boolean;
    previewBusyReason?: string;
    showGuides?: boolean;
    showSafeArea?: boolean;
    showSectionBounds?: boolean;
    showScrollSnap?: boolean;
    fontScale?: number;
    showContrastWarnings?: boolean;
  };
  project?: ProjectState;
};

export default function PreviewPage() {
  const [project, setProject] = useState<ProjectState | null>(null);
  const [uiState, setUiState] = useState<PreviewPayload["ui"] | null>(null);
  const [hoveredSectionId, setHoveredSectionId] = useState<string | null>(null);
  const [selectedSectionId, setSelectedSectionId] = useState<string | null>(null);
  const [flashIds, setFlashIds] = useState<string[]>([]);
  const [pulseIds, setPulseIds] = useState<string[]>([]);
  const rootRef = useRef<HTMLDivElement | null>(null);
  const flashTimeoutsRef = useRef<Record<string, ReturnType<typeof setTimeout>>>(
    {}
  );
  const pulseTimeoutsRef = useRef<Record<string, ReturnType<typeof setTimeout>>>(
    {}
  );
  const sectionSignatureRef = useRef<Record<string, string>>({});
  const ui = useMemo(() => uiState ?? undefined, [uiState]);
  const layoutSections = useMemo(
    () => (project ? getLayoutSections(project) : []),
    [project]
  );

  const waitForFonts = async (doc: Document) => {
    const fontFaceSet = (doc as Document & { fonts?: FontFaceSet }).fonts;
    if (!fontFaceSet?.ready) {
      return;
    }
    await fontFaceSet.ready;
  };

  const waitForImages = async (root: HTMLElement) => {
    const images = Array.from(root.querySelectorAll("img"));
    if (images.length === 0) {
      return;
    }
    await Promise.all(
      images.map(
        (img) =>
          new Promise<void>((resolve) => {
            if (img.complete && img.naturalWidth > 0) {
              resolve();
              return;
            }
            const handleLoad = () => {
              cleanup();
              resolve();
            };
            const handleError = () => {
              cleanup();
              resolve();
            };
            const cleanup = () => {
              img.removeEventListener("load", handleLoad);
              img.removeEventListener("error", handleError);
            };
            img.addEventListener("load", handleLoad);
            img.addEventListener("error", handleError);
          })
      )
    );
  };

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.origin !== window.location.origin) {
        return;
      }
      const data = event.data as { type?: string; payload?: PreviewPayload; id?: string | null };
      if (data?.type === PROJECT_UPDATE) {
        setProject(data.payload?.project ?? null);
        setUiState(data.payload?.ui ?? null);
        return;
      }
      if (data?.type === EDITOR_SELECT_SECTION) {
        setSelectedSectionId(data.id ?? null);
      }
      if (data?.type === SCREENSHOT_REQUEST) {
        const requestId =
          (data as { type: string; requestId?: string }).requestId ?? "";
        const backgroundColor =
          (data as { backgroundColor?: string }).backgroundColor ?? "#ffffff";
        const pixelRatio = (data as { pixelRatio?: number }).pixelRatio ?? 2;
        import("html-to-image")
          .then(async ({ toPng }) => {
            const target =
              document.getElementById("__lp_root__") ?? rootRef.current;
            if (!target) {
              window.parent.postMessage(
                { type: SCREENSHOT_RESULT, requestId, error: "No preview element" },
                window.location.origin
              );
              return;
            }
            await waitForFonts(document);
            await waitForImages(target);
            const scrollHeight = Math.max(
              document.body.scrollHeight,
              document.documentElement.scrollHeight,
              target.scrollHeight
            );
            const scrollWidth = Math.max(
              document.body.scrollWidth,
              document.documentElement.scrollWidth,
              target.scrollWidth
            );
            const pngPromise = toPng(target, {
              backgroundColor,
              pixelRatio,
              cacheBust: true,
              width: scrollWidth,
              height: scrollHeight,
              imagePlaceholder: TRANSPARENT_PIXEL,
              filter: (node) => {
                if (!(node instanceof HTMLElement)) {
                  return true;
                }
                const tag = node.tagName.toLowerCase();
                return tag !== "video" && tag !== "iframe";
              },
            });
            const timeoutPromise = new Promise<string>((_, reject) => {
              window.setTimeout(
                () => reject(new Error("iframe内の画像生成がタイムアウトしました。")),
                12000
              );
            });

            Promise.race([pngPromise, timeoutPromise])
              .then((dataUrl: string) => {
                window.parent.postMessage(
                  { type: SCREENSHOT_RESULT, requestId, dataUrl },
                  window.location.origin
                );
              })
              .catch((err) => {
                window.parent.postMessage(
                  { type: SCREENSHOT_RESULT, requestId, error: String(err) },
                  window.location.origin
                );
              });
          })
          .catch((err) => {
            window.parent.postMessage(
              { type: SCREENSHOT_RESULT, requestId, error: String(err) },
              window.location.origin
            );
          });
      }
    };

    window.addEventListener("message", handleMessage);
    window.parent.postMessage({ type: PREVIEW_READY }, window.location.origin);
    return () => window.removeEventListener("message", handleMessage);
  }, []);

  useEffect(() => {
    if (layoutSections.length === 0) {
      return;
    }
    const nextSignature: Record<string, string> = {};
    layoutSections.forEach((section) => {
      const signature = JSON.stringify({
        data: section.data,
        style: section.style,
      });
      nextSignature[section.id] = signature;
      const prevSignature = sectionSignatureRef.current[section.id];
      if (prevSignature && prevSignature !== signature) {
        if (flashTimeoutsRef.current[section.id]) {
          clearTimeout(flashTimeoutsRef.current[section.id]);
        }
        setFlashIds((current) =>
          current.includes(section.id) ? current : [...current, section.id]
        );
        flashTimeoutsRef.current[section.id] = setTimeout(() => {
          setFlashIds((current) => current.filter((id) => id !== section.id));
          delete flashTimeoutsRef.current[section.id];
        }, 150);
      }
    });
    sectionSignatureRef.current = nextSignature;
  }, [layoutSections]);

  useEffect(() => {
    if (!selectedSectionId) {
      return;
    }
    const targetId = `sec-${selectedSectionId}`;
    const runScroll = () => {
      const node = document.getElementById(targetId);
      if (!node) {
        return;
      }
      const scrollRoot =
        document.scrollingElement || document.documentElement || document.body;
      const rect = node.getBoundingClientRect();
      const offset = 12;
      const nextTop = Math.max(0, rect.top + scrollRoot.scrollTop - offset);
      scrollRoot.scrollTo({ top: nextTop, behavior: "smooth" });
    };
    const raf = window.requestAnimationFrame(runScroll);
    const retry = window.setTimeout(runScroll, 120);
    return () => {
      window.cancelAnimationFrame(raf);
      window.clearTimeout(retry);
    };
  }, [selectedSectionId, layoutSections.length]);

  useEffect(() => {
    if (!rootRef.current) {
      return;
    }
    const nodes = rootRef.current.querySelectorAll<HTMLElement>("[data-section-id]");
    nodes.forEach((node) => {
      const id = node.dataset.sectionId ?? "";
      node.dataset.previewHovered = id && id === hoveredSectionId ? "true" : "false";
      node.dataset.previewSelected = id && id === selectedSectionId ? "true" : "false";
      node.dataset.previewFlash = id && flashIds.includes(id) ? "true" : "false";
      node.dataset.previewPulse = id && pulseIds.includes(id) ? "true" : "false";
    });
  }, [
    hoveredSectionId,
    selectedSectionId,
    flashIds,
    pulseIds,
    layoutSections.length,
  ]);

  useEffect(() => {
    const enabled = Boolean(uiState?.showScrollSnap);
    const snapValue = enabled ? "y proximity" : "";
    document.documentElement.style.scrollSnapType = snapValue;
    document.body.style.scrollSnapType = snapValue;
    return () => {
      document.documentElement.style.scrollSnapType = "";
      document.body.style.scrollSnapType = "";
    };
  }, [uiState?.showScrollSnap]);

  useEffect(() => {
    window.parent.postMessage(
      { type: SECTION_HOVER, id: hoveredSectionId ?? null },
      window.location.origin
    );
  }, [hoveredSectionId]);

  const handlePointerMove = (event: MouseEvent<HTMLDivElement>) => {
    const target = (event.target as HTMLElement | null)?.closest("[data-section-id]");
    const nextId = target?.getAttribute("data-section-id") ?? null;
    setHoveredSectionId((current) => (current === nextId ? current : nextId));
  };

  const handlePointerLeave = () => {
    setHoveredSectionId(null);
  };

  const handleClick = (event: MouseEvent<HTMLDivElement>) => {
    const sectionAction = (event.target as HTMLElement | null)?.closest(
      "[data-section-action][data-section-target-id]"
    );
    if (sectionAction instanceof HTMLElement) {
      const sectionId =
        sectionAction.getAttribute("data-section-target-id") ?? "";
      const action = sectionAction.getAttribute("data-section-action") ?? "";
      if (sectionId && (action === "duplicate" || action === "delete")) {
        window.parent.postMessage(
          {
            type: PREVIEW_SECTION_ACTION,
            actionPayload: {
              sectionId,
              action,
            },
          },
          window.location.origin
        );
      }
      return;
    }

    const addAction = (event.target as HTMLElement | null)?.closest(
      "[data-add-after-id][data-add-type]"
    );
    if (addAction instanceof HTMLElement) {
      const afterId = addAction.getAttribute("data-add-after-id") ?? "";
      const type = addAction.getAttribute("data-add-type") ?? "";
      if (type) {
        window.parent.postMessage(
          {
            type: PREVIEW_INSERT_SECTION_AFTER,
            insert: {
              afterId,
              type,
            },
          },
          window.location.origin
        );
      }
      return;
    }

    const couponFlowArea = (event.target as HTMLElement | null)?.closest(
      '[data-coupon-slideshow="true"]'
    );
    if (couponFlowArea) {
      return;
    }

    const interactiveTarget = (event.target as HTMLElement | null)?.closest(
      "button, a, input, select, textarea, label, [role='button'], [data-coupon-nav], [data-coupon-dot]"
    );
    if (interactiveTarget) {
      return;
    }

    const target = (event.target as HTMLElement | null)?.closest("[data-section-id]");
    const nextId = target?.getAttribute("data-section-id") ?? null;
    if (!nextId) {
      return;
    }
    if (pulseTimeoutsRef.current[nextId]) {
      clearTimeout(pulseTimeoutsRef.current[nextId]);
    }
    setPulseIds((current) =>
      current.includes(nextId) ? current : [...current, nextId]
    );
    pulseTimeoutsRef.current[nextId] = setTimeout(() => {
      setPulseIds((current) => current.filter((id) => id !== nextId));
      delete pulseTimeoutsRef.current[nextId];
    }, 180);
    setSelectedSectionId(nextId);
    window.parent.postMessage(
      { type: SECTION_SELECT, id: nextId },
      window.location.origin
    );
  };

  const activeMode = uiState?.editorMode ?? "layout";
  const activeCanvasDocument =
    project?.editorDocuments?.canvasDocument ?? project?.canvasPages?.[0]?.canvas;

  return (
    <div
      ref={rootRef}
      className="relative min-h-screen"
      data-testid="preview-root"
      data-preview-guides={uiState?.showGuides ? "true" : "false"}
      data-preview-safe-area={uiState?.showSafeArea ? "true" : "false"}
      data-preview-bounds={uiState?.showSectionBounds ? "true" : "false"}
      data-preview-snap={uiState?.showScrollSnap ? "true" : "false"}
      data-preview-contrast={uiState?.showContrastWarnings ? "true" : "false"}
      onMouseMove={handlePointerMove}
      onMouseLeave={handlePointerLeave}
      onClick={handleClick}
    >
      <style
        dangerouslySetInnerHTML={{
          __html: `
            [data-section-id] {
              position: relative;
            }
            [data-preview-hovered="true"] {
              outline: 2px solid color-mix(in oklab, var(--lp-accent, #2563eb) 45%, transparent);
              outline-offset: -1px;
              box-shadow: 0 10px 24px rgba(15, 23, 42, 0.08);
              background-color: color-mix(in oklab, var(--lp-accent, #2563eb) 10%, transparent);
            }
            [data-preview-hovered="true"]::after {
              content: "";
              position: absolute;
              left: 8px;
              right: 8px;
              bottom: -2px;
              height: 2px;
              border-radius: 999px;
              background: color-mix(in oklab, var(--lp-accent, #2563eb) 70%, #dbeafe);
              opacity: 0.45;
              pointer-events: none;
            }
            [data-preview-selected="true"] {
              outline: 3px solid color-mix(in oklab, var(--lp-accent, #2563eb) 92%, #dbeafe);
              outline-offset: -1px;
              box-shadow: 0 0 0 2px rgba(219, 234, 254, 0.95), 0 14px 28px rgba(37, 99, 235, 0.24);
              background-color: color-mix(in oklab, var(--lp-accent, #2563eb) 16%, transparent);
            }
            [data-preview-pulse="true"] {
              animation: lpPreviewPulse 180ms ease-out;
            }
            [data-preview-flash="true"] {
              animation: lpPreviewFlash 150ms ease-out;
            }
            [data-preview-bounds="true"] [data-section-id] {
              outline: 1px dashed rgba(100, 116, 139, 0.35);
              outline-offset: -1px;
            }
            [data-preview-contrast="true"] [data-contrast-warning="true"] {
              box-shadow: inset 0 0 0 2px rgba(244, 63, 94, 0.7);
            }
            [data-preview-snap="true"] [data-section-id] {
              scroll-snap-align: start;
            }
            .lp-preview-insert-slot {
              position: relative;
              height: 0;
              margin: 0;
              z-index: 12;
            }
            .lp-preview-insert-separator {
              position: absolute;
              left: 12px;
              right: 12px;
              top: 0;
              height: 1px;
              background: linear-gradient(
                90deg,
                transparent,
                color-mix(in oklab, var(--lp-accent, #2563eb) 30%, #cbd5e1) 40%,
                color-mix(in oklab, var(--lp-accent, #2563eb) 30%, #cbd5e1) 60%,
                transparent
              );
              opacity: 0;
              transition: opacity 140ms ease;
            }
            .lp-preview-insert-slot:hover .lp-preview-insert-separator,
            [data-preview-hovered="true"] + .lp-preview-insert-slot .lp-preview-insert-separator {
              opacity: 0.75;
            }
            .lp-preview-insert-actions {
              position: absolute;
              left: 50%;
              top: 0;
              transform: translate(-50%, -50%);
              display: flex;
              flex-wrap: wrap;
              gap: 6px;
              opacity: 0;
              pointer-events: none;
              transition: opacity 140ms ease, transform 140ms ease;
            }
            .lp-preview-insert-slot:hover .lp-preview-insert-actions,
            [data-preview-hovered="true"] + .lp-preview-insert-slot .lp-preview-insert-actions {
              opacity: 1;
              pointer-events: auto;
              transform: translate(-50%, -52%);
            }
            .lp-preview-insert-btn {
              border: 1px solid color-mix(in oklab, var(--lp-accent, #2563eb) 45%, #bfdbfe);
              background: color-mix(in oklab, white 86%, var(--lp-accent, #2563eb) 14%);
              color: color-mix(in oklab, #1e3a8a 78%, var(--lp-accent, #2563eb));
              border-radius: 999px;
              height: 27px;
              padding: 0 11px;
              font-size: 11px;
              font-weight: 700;
              line-height: 1;
              cursor: pointer;
              white-space: nowrap;
              box-shadow: 0 4px 12px rgba(30, 58, 138, 0.16);
              transition: transform 120ms ease, box-shadow 120ms ease, background 120ms ease;
            }
            .lp-preview-insert-btn:hover {
              transform: translateY(-1px) scale(1.01);
              box-shadow: 0 8px 16px rgba(30, 58, 138, 0.2);
              background: color-mix(in oklab, white 80%, var(--lp-accent, #2563eb) 20%);
            }
            .lp-preview-section-actions {
              position: absolute;
              right: 8px;
              top: 8px;
              z-index: 20;
              display: flex;
              gap: 8px;
              opacity: 0;
              pointer-events: none;
              transform: translateY(-3px);
              transition: opacity 130ms ease, transform 130ms ease;
            }
            [data-preview-hovered="true"] .lp-preview-section-actions,
            [data-preview-selected="true"] .lp-preview-section-actions {
              opacity: 1;
              pointer-events: auto;
              transform: translateY(0);
            }
            .lp-preview-section-action-btn {
              height: 28px;
              width: 28px;
              display: inline-flex;
              align-items: center;
              justify-content: center;
              border-radius: 8px;
              border: 1px solid color-mix(in oklab, var(--lp-accent, #2563eb) 35%, #cbd5e1);
              background: color-mix(in oklab, #ffffff 92%, var(--lp-accent, #2563eb) 8%);
              color: #1e3a8a;
              padding: 0;
              cursor: pointer;
              box-shadow: 0 2px 8px rgba(15, 23, 42, 0.12);
              transition: background 120ms ease, box-shadow 120ms ease, transform 120ms ease;
            }
            .lp-preview-section-action-btn:hover {
              background: color-mix(in oklab, #ffffff 84%, var(--lp-accent, #2563eb) 16%);
              box-shadow: 0 6px 14px rgba(15, 23, 42, 0.16);
              transform: translateY(-1px);
            }
            .lp-preview-section-action-btn--danger {
              border-color: color-mix(in oklab, #ef4444 45%, #fecaca);
              color: #b91c1c;
              background: color-mix(in oklab, #ffffff 92%, #ef4444 8%);
            }
            .lp-preview-section-action-btn--danger:hover {
              background: color-mix(in oklab, #ffffff 86%, #ef4444 14%);
            }
            .lp-preview-guides {
              position: fixed;
              inset: 0;
              pointer-events: none;
              opacity: 0;
              background-image:
                linear-gradient(
                  to right,
                  rgba(37, 99, 235, 0.08) 1px,
                  transparent 1px
                ),
                linear-gradient(
                  to bottom,
                  rgba(37, 99, 235, 0.08) 1px,
                  transparent 1px
                );
              background-size: 24px 24px;
              mix-blend-mode: multiply;
              z-index: 10;
            }
            [data-preview-guides="true"] .lp-preview-guides {
              opacity: 1;
            }
            .lp-preview-safearea {
              position: fixed;
              inset: 16px;
              border: 1px dashed rgba(248, 113, 113, 0.7);
              pointer-events: none;
              opacity: 0;
              z-index: 11;
            }
            [data-preview-safe-area="true"] .lp-preview-safearea {
              opacity: 1;
            }
            @keyframes lpPreviewFlash {
              from { box-shadow: 0 0 0 0 rgba(37, 99, 235, 0.5); }
              to { box-shadow: 0 0 0 12px rgba(37, 99, 235, 0); }
            }
            @keyframes lpPreviewPulse {
              0% {
                outline-color: color-mix(in oklab, var(--primary) 60%, transparent);
                background-color: color-mix(in oklab, var(--primary) 24%, transparent);
              }
              100% {
                outline-color: color-mix(in oklab, var(--primary) 40%, transparent);
                background-color: var(--primary-soft);
              }
            }
          `,
        }}
      />
      <div className="lp-preview-guides" aria-hidden="true" />
      <div className="lp-preview-safearea" aria-hidden="true" />
      {project ? (
        <>
          {activeMode === "canvas" && activeCanvasDocument ? (
            <CanvasRenderer
              document={activeCanvasDocument}
              device={(ui?.previewMode === "mobile" ? "sp" : "pc") as "pc" | "sp"}
              resolveAsset={(assetId: string) => {
                const assets = project.assets ?? {};
                return assets[assetId]?.data ?? assetId;
              }}
              interactive={false}
            />
          ) : (
            <PreviewSsr project={project} ui={ui} />
          )}
        </>
      ) : (
        <div className="min-h-screen bg-white px-6 py-8 text-sm text-slate-500">
          プレビューを待機しています…
        </div>
      )}
    </div>
  );
}
