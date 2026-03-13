/* ───────────────────────────────────────────────
   LayoutV2Shell
   Canvas EditorPage と同系統の外枠。
   SharedEditorShell の上に Layout 固有の中身を載せる。
   ─────────────────────────────────────────────── */

"use client";

import type { RefObject } from "react";
import SharedEditorShell from "@/src/components/shared/SharedEditorShell";
import LayoutV2LeftSidebar from "@/src/components/layout-v2/LayoutV2LeftSidebar";
import LayoutV2StageContainer from "@/src/components/layout-v2/LayoutV2StageContainer";
import LayoutV2Inspector from "@/src/components/layout-v2/LayoutV2Inspector";
import TopTextToolbar from "../editor/TopTextToolbar";
import { TextSelectionProvider } from "@/src/components/editor/TextSelectionContext";

type LayoutV2ShellProps = {
  previewIframeRef: RefObject<HTMLIFrameElement | null>;
};

export default function LayoutV2Shell({ previewIframeRef }: LayoutV2ShellProps) {
  return (
    <TextSelectionProvider>
      {/* Text editing toolbar (Layout-specific) */}
      <TopTextToolbar />

      <SharedEditorShell
        sidebar={<LayoutV2LeftSidebar />}
        stage={<LayoutV2StageContainer iframeRef={previewIframeRef} />}
        inspector={<LayoutV2Inspector />}
      />
    </TextSelectionProvider>
  );
}
