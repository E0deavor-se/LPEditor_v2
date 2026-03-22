/* ───────────────────────────────────────────────
   LayoutV2Inspector
   Canvas InspectorPanel と同系統の右パネル。
   V2 が InspectorShell を提供し、InspectorPanel は
   skipShell で本体だけ描画する。
   ─────────────────────────────────────────────── */

"use client";

import dynamic from "next/dynamic";
import { useMemo } from "react";
import InspectorShell from "@/src/components/inspector/InspectorShell";
import { SHARED_TOKENS } from "@/src/components/shared/sharedTokens";
import { useEditorStore } from "@/src/store/editorStore";
import { getLayoutSections } from "@/src/lib/editorProject";
import { shouldUseNextInspector } from "@/src/components/layout-v2/inspector/sectionArchitecture/SectionSpecificEditorMap";

const InspectorPanelLegacy = dynamic(
  () => import("@/src/components/editor/right/InspectorPanel"),
  {
    ssr: false,
    loading: () => (
      <div className="flex items-center justify-center p-4 text-[11px] text-[var(--ui-muted)]">
        Loading…
      </div>
    ),
  }
);

const LayoutInspectorNext = dynamic(
  () => import("@/src/components/layout-v2/inspector/LayoutInspectorNext"),
  {
    ssr: false,
    loading: () => (
      <div className="flex items-center justify-center p-4 text-[11px] text-[var(--ui-muted)]">
        Loading…
      </div>
    ),
  }
);

export default function LayoutV2Inspector() {
  const selected = useEditorStore((s) => s.selected);
  const project = useEditorStore((s) => s.project);
  const sections = useMemo(() => getLayoutSections(project), [project]);

  const selectedSectionType = useMemo(() => {
    if (selected.kind !== "section") {
      return undefined;
    }
    return sections.find((section) => section.id === selected.id)?.type;
  }, [sections, selected]);

  const useNextInspector = shouldUseNextInspector(
    selected.kind,
    selectedSectionType
  );
  // Legacy fallback policy:
  // - Temporary compatibility path only.
  // - Default is OFF; enabled only when flag is explicitly "true".
  // - New section editors must be implemented in SectionSpecificEditorMap.
  // - Remove this fallback once section coverage is complete.
  const enableLegacyFallback =
    process.env.NEXT_PUBLIC_ENABLE_LEGACY_INSPECTOR_FALLBACK === "true";

  return (
    <InspectorShell
      width={SHARED_TOKENS.inspectorWidth}
      scrollable={false}
      className="hidden xl:flex"
    >
      {useNextInspector ? <LayoutInspectorNext /> : null}
      {!useNextInspector && enableLegacyFallback ? <InspectorPanelLegacy skipShell /> : null}
      {!useNextInspector && !enableLegacyFallback ? (
        <div className="p-4 text-[11px] text-[var(--ui-muted)]">
          このセクション種別は Layout V2 Inspector 未対応です。
        </div>
      ) : null}
    </InspectorShell>
  );
}
