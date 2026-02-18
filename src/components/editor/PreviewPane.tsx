"use client";

import { useEffect, useRef, useState } from "react";
import { useEditorStore } from "@/src/store/editorStore";

const busyReasonLabel = {
  render: "プレビューを描画中",
  ai: "文章を生成中",
  import: "アセットを読み込み中",
  stores: "データを統合中",
  assets: "アセットを読み込み中",
  responsive: "レスポンシブを適用中",
} as const;

const PREVIEW_READY = "CLP_PREVIEW_READY";
const PROJECT_UPDATE = "CLP_PROJECT_UPDATE";
const SECTION_HOVER = "CLP_SECTION_HOVER";
const SECTION_SELECT = "CLP_SECTION_SELECT";
const EDITOR_SELECT_SECTION = "CLP_EDITOR_SELECT_SECTION";
const PREVIEW_UPDATE_TARGET_STORES_FILTERS =
  "CLP_PREVIEW_UPDATE_TARGET_STORES_FILTERS";

type PreviewTargetStoresFiltersUpdate = {
  storeFilters?: Record<string, boolean>;
};

type PreviewPaneProps = {
  /** 外部からiframeRefを渡すことでスクリーンショット等に利用できる */
  iframeRef?: React.RefObject<HTMLIFrameElement | null>;
};

export default function PreviewPane({ iframeRef: externalIframeRef }: PreviewPaneProps) {
  const previewMode = useEditorStore((state) => state.previewMode);
  const previewAspect = useEditorStore((state) => state.previewAspect);
  const previewDesktopWidth = useEditorStore(
    (state) => state.previewDesktopWidth
  );
  const previewMobileWidth = useEditorStore((state) => state.previewMobileWidth);
  const previewGuidesEnabled = useEditorStore(
    (state) => state.previewGuidesEnabled
  );
  const previewSafeAreaEnabled = useEditorStore(
    (state) => state.previewSafeAreaEnabled
  );
  const previewSectionBoundsEnabled = useEditorStore(
    (state) => state.previewSectionBoundsEnabled
  );
  const previewScrollSnapEnabled = useEditorStore(
    (state) => state.previewScrollSnapEnabled
  );
  const previewFontScale = useEditorStore((state) => state.previewFontScale);
  const previewContrastWarningsEnabled = useEditorStore(
    (state) => state.previewContrastWarningsEnabled
  );
  const isPreviewBusy = useEditorStore((state) => state.isPreviewBusy);
  const previewBusyReason = useEditorStore((state) => state.previewBusyReason);
  const project = useEditorStore((state) => state.project);
  const selectedSectionId = useEditorStore((state) => state.selectedSectionId);
  const stickyTopPx = useEditorStore((state) => state.stickyTopPx);
  const previewKey = useEditorStore((state) => state.previewKey);
  const setSelectedSection = useEditorStore((state) => state.setSelectedSection);
  const setHoveredSection = useEditorStore((state) => state.setHoveredSection);
  const setStickyTopPx = useEditorStore((state) => state.setStickyTopPx);
  const updateTargetStoresContent = useEditorStore(
    (state) => state.updateTargetStoresContent
  );

  const [showBusy, setShowBusy] = useState(false);
  const [isPreviewReady, setIsPreviewReady] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const sendTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  const frameContainerRef = useRef<HTMLDivElement | null>(null);
  const previewScrollRef = useRef<HTMLElement | null>(null);
  const stickyTopRef = useRef(0);
  const [frameSize, setFrameSize] = useState({ width: 0, height: 0 });

  // 外部 iframeRef と内部 iframeRef を同期
  const setIframeRef = (el: HTMLIFrameElement | null) => {
    iframeRef.current = el;
    if (externalIframeRef) {
      (externalIframeRef as React.MutableRefObject<HTMLIFrameElement | null>).current = el;
    }
  };

  useEffect(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }

    if (isPreviewBusy) {
      timerRef.current = setTimeout(() => setShowBusy(true), 150);
    } else {
      timerRef.current = setTimeout(() => setShowBusy(false), 0);
    }

    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [isPreviewBusy]);

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.origin !== window.location.origin) {
        return;
      }
      const data = event.data as {
        type?: string;
        id?: string | null;
        sectionId?: string;
        payload?: PreviewTargetStoresFiltersUpdate;
      };
      if (data?.type === PREVIEW_READY) {
        setIsPreviewReady(true);
      }
      if (data?.type === SECTION_HOVER) {
        setHoveredSection(data.id ?? undefined);
      }
      if (data?.type === SECTION_SELECT) {
        setSelectedSection(data.id ?? undefined);
      }
      if (data?.type === PREVIEW_UPDATE_TARGET_STORES_FILTERS) {
        if (data.sectionId && data.payload?.storeFilters) {
          updateTargetStoresContent(data.sectionId, {
            storeFilters: data.payload.storeFilters,
          });
        }
      }
    };

    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, [setHoveredSection, setSelectedSection, updateTargetStoresContent]);

  useEffect(() => {
    if (!isPreviewReady) {
      return;
    }

    if (sendTimerRef.current) {
      clearTimeout(sendTimerRef.current);
    }

    sendTimerRef.current = setTimeout(() => {
      if (!iframeRef.current?.contentWindow) {
        return;
      }
      iframeRef.current.contentWindow.postMessage(
        {
          type: PROJECT_UPDATE,
          payload: {
            ui: {
              previewMode,
              previewAspect,
              showGuides: previewGuidesEnabled,
              showSafeArea: previewSafeAreaEnabled,
              showSectionBounds: previewSectionBoundsEnabled,
              showScrollSnap: previewScrollSnapEnabled,
              fontScale: previewFontScale,
              showContrastWarnings: previewContrastWarningsEnabled,
            },
            project,
          },
        },
        window.location.origin
      );
    }, 50);
  }, [
    isPreviewReady,
    previewMode,
    previewAspect,
    previewGuidesEnabled,
    previewSafeAreaEnabled,
    previewSectionBoundsEnabled,
    previewScrollSnapEnabled,
    previewFontScale,
    previewContrastWarningsEnabled,
    project,
  ]);

  useEffect(() => {
    if (!isPreviewReady || !iframeRef.current?.contentWindow) {
      return;
    }

    iframeRef.current.contentWindow.postMessage(
      {
        type: EDITOR_SELECT_SECTION,
        id: selectedSectionId ?? null,
      },
      window.location.origin
    );
  }, [isPreviewReady, selectedSectionId]);

  useEffect(() => {
    stickyTopRef.current = stickyTopPx;
  }, [stickyTopPx]);

  useEffect(() => {
    const resetTimer = setTimeout(() => setIsPreviewReady(false), 0);
    previewScrollRef.current = null;
    if (stickyTopRef.current !== 0) {
      setStickyTopPx(0);
    }
    return () => clearTimeout(resetTimer);
  }, [previewKey, setStickyTopPx]);

  useEffect(() => {
    if (!isPreviewReady) {
      previewScrollRef.current = null;
      return;
    }
    const scrollEl = iframeRef.current?.contentDocument?.scrollingElement;
    if (scrollEl instanceof HTMLElement) {
      previewScrollRef.current = scrollEl;
      return;
    }
    const frameDoc = iframeRef.current?.contentDocument;
    const fallback = frameDoc?.documentElement ?? frameDoc?.body ?? null;
    previewScrollRef.current =
      fallback instanceof HTMLElement ? fallback : null;
  }, [isPreviewReady, previewKey]);

  const scrollToSection = (id: string, behavior: ScrollBehavior) => {
    const frameDoc = iframeRef.current?.contentDocument;
    if (!frameDoc) {
      return;
    }
    const target = frameDoc.getElementById(`sec-${id}`);
    if (!(target instanceof HTMLElement)) {
      return;
    }
    const container = previewScrollRef.current;
    const offset = stickyTopRef.current + 12;
    if (container) {
      const containerRect = container.getBoundingClientRect();
      const targetRect = target.getBoundingClientRect();
      const nextTop =
        container.scrollTop + (targetRect.top - containerRect.top) - offset;
      container.scrollTo({ top: Math.max(0, nextTop), behavior });
      return;
    }
    target.scrollIntoView({ behavior, block: "start" });
    if (frameDoc.defaultView) {
      frameDoc.defaultView.scrollBy({ top: -offset, behavior });
    }
  };

  useEffect(() => {
    if (!isPreviewReady || !selectedSectionId) {
      return;
    }
    scrollToSection(selectedSectionId, "smooth");
  }, [isPreviewReady, selectedSectionId]);

  useEffect(() => {
    if (!isPreviewReady || !selectedSectionId) {
      return;
    }
    scrollToSection(selectedSectionId, "auto");
  }, [isPreviewReady, previewKey, selectedSectionId]);

  useEffect(() => {
    if (!isPreviewReady) {
      return;
    }
    const frameDoc = iframeRef.current?.contentDocument;
    if (!frameDoc || !frameDoc.body) {
      return;
    }

    let resizeObserver: ResizeObserver | null = null;
    let mutationObserver: MutationObserver | null = null;

    const measureSticky = () => {
      const stickyNodes = Array.from(
        frameDoc.querySelectorAll('[data-sticky="true"]')
      );
      const total = stickyNodes.reduce((sum, node) => {
        if (!(node instanceof HTMLElement)) {
          return sum;
        }
        return sum + node.getBoundingClientRect().height;
      }, 0);
      const next = Math.max(0, Math.round(total));
      if (next !== stickyTopRef.current) {
        setStickyTopPx(next);
      }
    };

    const attachObservers = () => {
      if (resizeObserver) {
        resizeObserver.disconnect();
      }
      const stickyNodes = Array.from(
        frameDoc.querySelectorAll('[data-sticky="true"]')
      );
      resizeObserver = new ResizeObserver(() => measureSticky());
      stickyNodes.forEach((node) => {
        if (node instanceof HTMLElement) {
          resizeObserver?.observe(node);
        }
      });
      measureSticky();
    };

    attachObservers();
    mutationObserver = new MutationObserver(() => attachObservers());
    mutationObserver.observe(frameDoc.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ["data-sticky"],
    });

    return () => {
      resizeObserver?.disconnect();
      mutationObserver?.disconnect();
    };
  }, [isPreviewReady, previewKey, setStickyTopPx]);

  useEffect(() => {
    return () => {
      if (sendTimerRef.current) {
        clearTimeout(sendTimerRef.current);
        sendTimerRef.current = null;
      }
    };
  }, []);

  const busyText = previewBusyReason
    ? busyReasonLabel[previewBusyReason]
    : "繝励Ξ繝薙Η繝ｼ繧呈ｺ門ｙ荳ｭ";

  useEffect(() => {
    const container = frameContainerRef.current;
    if (!container) {
      return;
    }

    const aspectMap: Record<Exclude<typeof previewAspect, "free">, number> = {
      "16:9": 16 / 9,
      "4:3": 4 / 3,
      "1:1": 1,
    };

    const updateSize = () => {
      const availW = container.clientWidth;
      const availH = container.clientHeight;
      if (availW === 0 || availH === 0) {
        return;
      }

      if (previewMode === "mobile") {
        setFrameSize({
          width: Math.floor(availW),
          height: Math.floor(availH),
        });
        return;
      }

      if (previewAspect === "free") {
        const width = Math.min(availW, previewDesktopWidth);
        setFrameSize({
          width: Math.floor(width),
          height: Math.floor(availH),
        });
        return;
      }

      const maxWidth = previewDesktopWidth;
      const ratio = aspectMap[previewAspect];
      let width = Math.min(availW, maxWidth);
      let height = width / ratio;

      if (height > availH) {
        height = availH;
        width = height * ratio;
      }

      setFrameSize({
        width: Math.floor(width),
        height: Math.floor(height),
      });
    };

    updateSize();
    const observer = new ResizeObserver(() => updateSize());
    observer.observe(container);

    return () => observer.disconnect();
  }, [previewAspect, previewMode, previewDesktopWidth, previewMobileWidth]);

  const frameStyle = { width: frameSize.width, height: frameSize.height };
  const isDev =
    process.env.NODE_ENV === "development" ||
    process.env.NEXT_PUBLIC_APP_ENV === "development";
  const frameClassName =
    "relative flex h-full w-full flex-col overflow-hidden rounded-lg border border-slate-300 bg-white" +
    (isDev ? " outline outline-1 outline-dashed outline-blue-300" : "");
  const scrollClassName =
    "h-full w-full overflow-y-auto overflow-x-hidden" +
    (isDev ? " outline outline-1 outline-dashed outline-emerald-300" : "");
  const iframeClassName = "h-full w-full border-0";

  const handleIframeLoad = () => {
    setIsPreviewReady(true);
  };

  return (
    <section className="relative flex min-h-0 min-w-0 flex-1 flex-col bg-[var(--ui-panel-muted)]">
      {showBusy ? (
        <div className="absolute left-0 right-0 top-0 z-10 h-0.5 bg-[var(--ui-primary)]/70 animate-pulse" />
      ) : null}
      <div className="flex min-h-0 flex-1 items-center justify-center p-3">
        {previewMode === "mobile" ? (
          <div className="flex min-h-0 h-full w-full items-center justify-center">
            <div
              className="flex min-h-0 h-full max-h-[calc(100vh-56px-16px)] max-w-full flex-col rounded-[32px] border border-[var(--ui-border)] bg-[var(--ui-panel-muted)] shadow-[var(--ui-shadow-sm)]"
              style={{ width: previewMobileWidth }}
            >
              <div className="flex items-center justify-center px-6 py-3">
                <div className="h-1.5 w-16 rounded-full bg-slate-300" />
              </div>
              <div className="flex min-h-0 flex-1 items-center justify-center px-3 pb-4">
                <div
                  ref={frameContainerRef}
                  className={
                    "relative flex h-full w-full items-center justify-center rounded-[24px] bg-white overflow-hidden" +
                    (isDev ? " outline outline-1 outline-dashed outline-purple-300" : "")
                  }
                >
                  <div className={frameClassName} style={frameStyle}>
                    <div className={scrollClassName}>
                      <iframe
                        key={`preview-${previewKey}-${previewMode}`}
                        ref={setIframeRef}
                        onLoad={handleIframeLoad}
                        title="プレビュー"
                        className={iframeClassName}
                        src="/preview"
                      />
                    </div>
                    {showBusy ? (
                      <div className="pointer-events-none absolute inset-0 flex items-center justify-center rounded-lg bg-white/70">
                        <div className="flex flex-col items-center gap-3 text-[var(--ui-text)]">
                          <div className="h-10 w-10 animate-spin rounded-full border-2 border-[var(--ui-border)] border-t-[var(--ui-primary)]" />
                          <div className="text-sm">{busyText}</div>
                        </div>
                      </div>
                    ) : null}
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex min-h-0 h-full w-full items-center justify-center">
            <div className="flex min-h-0 h-full w-full max-w-[1400px] max-h-[calc(100vh-56px-16px)] flex-col overflow-hidden rounded-lg border border-[var(--ui-border)] bg-white">
              <div className="flex items-center gap-2 border-b border-[var(--ui-border)] bg-[var(--ui-panel-muted)] px-3 py-2">
                <span
                  className="h-2.5 w-2.5 rounded-full bg-[var(--ui-border)]"
                  aria-hidden="true"
                />
                <span
                  className="h-2.5 w-2.5 rounded-full bg-[var(--ui-border)]"
                  aria-hidden="true"
                />
                <span
                  className="h-2.5 w-2.5 rounded-full bg-[var(--ui-border)]"
                  aria-hidden="true"
                />
              </div>
              <div
                ref={frameContainerRef}
                className={
                  "relative flex min-h-0 flex-1 items-center justify-center bg-white p-2" +
                  (isDev ? " outline outline-1 outline-dashed outline-purple-300" : "")
                }
              >
                <div className={frameClassName} style={frameStyle}>
                  <div className={scrollClassName}>
                    <iframe
                      key={`preview-${previewKey}-${previewMode}`}
                      ref={setIframeRef}
                      onLoad={handleIframeLoad}
                      title="プレビュー"
                      className={iframeClassName}
                      src="/preview"
                    />
                  </div>
                  {showBusy ? (
                    <div className="pointer-events-none absolute inset-0 flex items-center justify-center rounded-lg bg-white/70">
                      <div className="flex flex-col items-center gap-3 text-[var(--ui-text)]">
                        <div className="h-10 w-10 animate-spin rounded-full border-2 border-[var(--ui-border)] border-t-[var(--ui-primary)]" />
                        <div className="text-sm">{busyText}</div>
                      </div>
                    </div>
                  ) : null}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
