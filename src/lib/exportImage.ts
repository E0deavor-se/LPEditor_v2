"use client";

import { toPng } from "html-to-image";

type ExportPreviewOptions = {
  selector?: string;
  pixelRatio?: number;
  backgroundColor?: string;
  filename?: string;
  timeoutMs?: number;
};

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

const getCaptureSize = (node: HTMLElement | null, doc: Document) => {
  if (node) {
    return {
      width: Math.max(node.scrollWidth, node.clientWidth, 1),
      height: Math.max(node.scrollHeight, node.clientHeight, 1),
    };
  }
  const root = doc.documentElement;
  const body = doc.body;
  return {
    width: Math.max(root?.scrollWidth ?? 0, body?.scrollWidth ?? 0, 1),
    height: Math.max(root?.scrollHeight ?? 0, body?.scrollHeight ?? 0, 1),
  };
};

const resolvePixelRatio = (desired: number, width: number, height: number) => {
  const area = width * height;
  let next = desired;
  if (area >= 30000000) {
    next = Math.min(next, 0.6);
  } else if (area >= 20000000) {
    next = Math.min(next, 0.75);
  } else if (area >= 12000000) {
    next = Math.min(next, 1);
  }
  return Math.max(0.5, next);
};

const resolveTargetNode = (doc: Document, selectors: string[]) => {
  for (const selector of selectors) {
    if (!selector) {
      continue;
    }
    const node = doc.querySelector(selector);
    if (node instanceof HTMLElement) {
      return node;
    }
  }
  if (doc.body instanceof HTMLElement) {
    return doc.body;
  }
  if (doc.documentElement instanceof HTMLElement) {
    return doc.documentElement;
  }
  return null;
};

const waitForTargetNode = async (doc: Document, selectors: string[]) => {
  const start = Date.now();
  const timeoutMs = 3000;
  while (Date.now() - start < timeoutMs) {
    const node = resolveTargetNode(doc, selectors);
    if (node && node.childElementCount > 0) {
      return node;
    }
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  return resolveTargetNode(doc, selectors);
};

const waitForIframeReady = async (iframe: HTMLIFrameElement) => {
  const doc = iframe.contentDocument;
  if (doc?.readyState === "complete") {
    return;
  }
  await new Promise<void>((resolve, reject) => {
    const timeout = window.setTimeout(() => {
      cleanup();
      reject(new Error("iframeの読み込みが完了していません。"));
    }, 5000);
    const handleLoad = () => {
      cleanup();
      resolve();
    };
    const cleanup = () => {
      window.clearTimeout(timeout);
      iframe.removeEventListener("load", handleLoad);
    };
    iframe.addEventListener("load", handleLoad);
  });
};

const SCREENSHOT_REQUEST = "CLP_SCREENSHOT_REQUEST";
const SCREENSHOT_RESULT = "CLP_SCREENSHOT_RESULT";

const requestScreenshotFromIframe = (
  iframe: HTMLIFrameElement,
  options: ExportPreviewOptions
) => {
  const frameWindow = iframe.contentWindow;
  if (!frameWindow) {
    throw new Error("iframeの内容にアクセスできません。同一オリジンを確認してください。");
  }
  const requestId = `shot_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

  return new Promise<string>((resolve, reject) => {
    const timeoutMs = options.timeoutMs ?? 20000;
    const timeout = window.setTimeout(() => {
      cleanup();
      reject(new Error("画像キャプチャがタイムアウトしました。"));
    }, timeoutMs);
    const handleMessage = (event: MessageEvent) => {
      if (event.origin !== window.location.origin) {
        return;
      }
      const data = event.data as {
        type?: string;
        requestId?: string;
        dataUrl?: string;
        error?: string;
      };
      if (data?.type !== SCREENSHOT_RESULT || data.requestId !== requestId) {
        return;
      }
      cleanup();
      if (data.error) {
        reject(new Error(data.error));
        return;
      }
      if (!data.dataUrl) {
        reject(new Error("キャプチャ結果が取得できません。"));
        return;
      }
      resolve(data.dataUrl);
    };
    const cleanup = () => {
      window.clearTimeout(timeout);
      window.removeEventListener("message", handleMessage);
    };
    window.addEventListener("message", handleMessage);
    frameWindow.postMessage(
      {
        type: SCREENSHOT_REQUEST,
        requestId,
        backgroundColor: options.backgroundColor ?? "#ffffff",
        pixelRatio: options.pixelRatio ?? 2,
      },
      window.location.origin
    );
  });
};

const downloadDataUrl = (dataUrl: string, filename: string) => {
  const anchor = document.createElement("a");
  anchor.href = dataUrl;
  anchor.download = filename;
  anchor.click();
};

export const exportPreviewToPng = async (
  iframe: HTMLIFrameElement,
  options: ExportPreviewOptions = {}
) => {
  await waitForIframeReady(iframe);
  const doc = iframe.contentDocument;
  if (!doc) {
    throw new Error("iframeの内容にアクセスできません。同一オリジンを確認してください。");
  }

  const selectors = [
    options.selector,
    "#__lp_root__",
    "[data-export='1']",
  ].filter(Boolean) as string[];
  const target = await waitForTargetNode(doc, selectors);
  if (!target) {
    const { width, height } = getCaptureSize(null, doc);
    const desiredRatio = options.pixelRatio ?? 2;
    const pixelRatio = resolvePixelRatio(desiredRatio, width, height);
    const dataUrl = await requestScreenshotFromIframe(iframe, {
      ...options,
      pixelRatio,
      timeoutMs: Math.max(options.timeoutMs ?? 20000, 45000),
    });
    downloadDataUrl(dataUrl, options.filename ?? "lp-preview.png");
    return;
  }

  const scrollEl =
    doc.scrollingElement || doc.documentElement || doc.body || undefined;
  const prevScrollTop = scrollEl?.scrollTop ?? 0;
  const prevScrollLeft = scrollEl?.scrollLeft ?? 0;

  try {
    if (scrollEl) {
      scrollEl.scrollTop = 0;
      scrollEl.scrollLeft = 0;
    }
    await new Promise((resolve) => requestAnimationFrame(resolve));

    await waitForFonts(doc);
    await waitForImages(target);

    const { width, height } = getCaptureSize(target, doc);
    const desiredRatio = options.pixelRatio ?? 2;
    const pixelRatio = resolvePixelRatio(desiredRatio, width, height);
    const dataUrl = await toPng(target, {
      pixelRatio,
      backgroundColor: options.backgroundColor ?? "#ffffff",
      cacheBust: true,
    });

    downloadDataUrl(dataUrl, options.filename ?? "lp-preview.png");
  } finally {
    if (scrollEl) {
      scrollEl.scrollTop = prevScrollTop;
      scrollEl.scrollLeft = prevScrollLeft;
    }
  }
};
