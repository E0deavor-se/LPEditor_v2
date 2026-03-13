/* ───────────────────────────────────────────────
   LayoutV2StageContainer
   Canvas CanvasStage と同系統の中央ステージ外枠。
   中身は既存の PreviewPane をそのまま表示する。
   ─────────────────────────────────────────────── */

"use client";

import type { RefObject } from "react";
import PreviewPane from "@/src/components/editor/PreviewPane";

type LayoutV2StageContainerProps = {
  iframeRef: RefObject<HTMLIFrameElement | null>;
};

export default function LayoutV2StageContainer({ iframeRef }: LayoutV2StageContainerProps) {
  return (
    <div className="relative flex min-h-0 min-w-0 flex-1 flex-col bg-[var(--ui-canvas-outer)]">
      <PreviewPane iframeRef={iframeRef} />
    </div>
  );
}
