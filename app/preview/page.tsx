"use client";

import { useEffect, useMemo, useRef, useState, type MouseEvent } from "react";
import PreviewSsr from "@/src/preview/PreviewSsr";
import type { ProjectState } from "@/src/types/project";

const PREVIEW_READY = "CLP_PREVIEW_READY";
const PROJECT_UPDATE = "CLP_PROJECT_UPDATE";
const SECTION_HOVER = "CLP_SECTION_HOVER";
const SECTION_SELECT = "CLP_SECTION_SELECT";
const EDITOR_SELECT_SECTION = "CLP_EDITOR_SELECT_SECTION";
const PREVIEW_UPDATE_TARGET_STORES_FILTERS = "CLP_PREVIEW_UPDATE_TARGET_STORES_FILTERS";
const SCREENSHOT_REQUEST = "CLP_SCREENSHOT_REQUEST";
const SCREENSHOT_RESULT = "CLP_SCREENSHOT_RESULT";

type PreviewPayload = {
  ui?: {
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
  const rootRef = useRef<HTMLDivElement | null>(null);
  const flashTimeoutsRef = useRef<Record<string, ReturnType<typeof setTimeout>>>(
    {}
  );
  const sectionSignatureRef = useRef<Record<string, string>>({});

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
        // html2canvas を動的インポートしてキャプチャ
        const requestId = (data as { type: string; requestId?: string }).requestId ?? "";
        import("html2canvas").then(({ default: html2canvas }) => {
          const target = rootRef.current;
          if (!target) {
            window.parent.postMessage(
              { type: SCREENSHOT_RESULT, requestId, error: "No preview element" },
              window.location.origin
            );
            return;
          }
          // スクロール全体をキャプチャするためにbodyの高さを使う
          const scrollHeight = Math.max(
            document.body.scrollHeight,
            document.documentElement.scrollHeight,
            target.scrollHeight
          );
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          html2canvas(target, {
            useCORS: true,
            allowTaint: true,
            background: "#ffffff",
            height: scrollHeight,
            logging: false,
          } as Record<string, unknown>).then((canvas: HTMLCanvasElement) => {
            const dataUrl = canvas.toDataURL("image/png");
            window.parent.postMessage(
              { type: SCREENSHOT_RESULT, requestId, dataUrl },
              window.location.origin
            );
          }).catch((err) => {
            window.parent.postMessage(
              { type: SCREENSHOT_RESULT, requestId, error: String(err) },
              window.location.origin
            );
          });
        }).catch((err) => {
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
    if (!project?.sections?.length) {
      return;
    }
    const nextSignature: Record<string, string> = {};
    project.sections.forEach((section) => {
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
  }, [project?.sections]);

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
  }, [selectedSectionId, project?.sections?.length]);

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
    });
  }, [hoveredSectionId, selectedSectionId, flashIds, project?.sections?.length]);

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
    const target = (event.target as HTMLElement | null)?.closest("[data-section-id]");
    const nextId = target?.getAttribute("data-section-id") ?? null;
    if (!nextId) {
      return;
    }
    setSelectedSectionId(nextId);
    window.parent.postMessage(
      { type: SECTION_SELECT, id: nextId },
      window.location.origin
    );
  };

  const ui = useMemo(() => uiState ?? undefined, [uiState]);

  return (
    <div
      ref={rootRef}
      className="relative min-h-screen"
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
            [data-preview-hovered="true"] {
              outline: 1px solid rgba(100, 116, 139, 0.5);
              background-color: color-mix(in oklab, var(--lp-surface) 70%, transparent);
            }
            [data-preview-selected="true"] {
              outline: 2px solid var(--lp-accent, #2563eb);
              background-color: color-mix(in oklab, var(--lp-surface) 80%, transparent);
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
          `,
        }}
      />
      <div className="lp-preview-guides" aria-hidden="true" />
      <div className="lp-preview-safearea" aria-hidden="true" />
      {project ? (
        <PreviewSsr
          project={project}
          ui={ui}
          onUpdateTargetStoresFilters={(
            sectionId: string,
            filters: Record<string, boolean>
          ) => {
            window.parent.postMessage(
              {
                type: PREVIEW_UPDATE_TARGET_STORES_FILTERS,
                sectionId,
                payload: { storeFilters: filters },
              },
              window.location.origin
            );
          }}
        />
      ) : (
        <div className="min-h-screen bg-white px-6 py-8 text-sm text-slate-500">
          プレビューを待機しています…
        </div>
      )}
    </div>
  );
}
