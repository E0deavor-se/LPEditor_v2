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

type PreviewPayload = {
  ui?: {
    previewMode?: string;
    previewAspect?: string;
    isPreviewBusy?: boolean;
    previewBusyReason?: string;
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
            @keyframes lpPreviewFlash {
              from { box-shadow: 0 0 0 0 rgba(37, 99, 235, 0.5); }
              to { box-shadow: 0 0 0 12px rgba(37, 99, 235, 0); }
            }
          `,
        }}
      />
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
