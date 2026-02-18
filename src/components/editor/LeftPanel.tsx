"use client";

import dynamic from "next/dynamic";
import { useThemeStore } from "@/src/store/themeStore";

const SectionPanel = dynamic(
  () => import("@/src/components/editor/left/SectionPanel"),
  {
    ssr: false,
    loading: () => (
      <div className="text-[12px] text-[var(--ui-muted)]">Loading...</div>
    ),
  }
);

type LeftPanelProps = {
  width: number;
  onWidthPreset?: (nextWidth: number) => void;
  onAddOpenChange?: (isOpen: boolean) => void;
};

export default function LeftPanel({ width, onWidthPreset }: LeftPanelProps) {
  const surfaceStyle = useThemeStore((state) => state.surfaceStyle);
  const glassClass = surfaceStyle === "glass" ? "backdrop-blur-xl" : "";

  return (
    <aside
      className={
        "ui-panel relative flex h-full min-h-0 flex-col rounded-none border-y-0 border-l-0 text-[var(--ui-text)] bg-[linear-gradient(180deg,rgba(255,255,255,0.06),rgba(255,255,255,0))] " +
        glassClass
      }
      style={{ width, minWidth: 260, maxWidth: 420 }}
      tabIndex={0}
    >
      <div className="border-b border-[var(--ui-border)] bg-[var(--ui-panel-muted)] px-[var(--ui-space-3)] py-[var(--ui-space-2)]">
        <div className="flex items-center justify-between gap-2">
          <div>
            <div className="text-[13px] font-semibold text-[var(--ui-text)]">
              セクション
            </div>
            <div className="text-[10px] text-[var(--ui-muted)]">
              並び替え・表示切替
            </div>
          </div>
          <div className="flex items-center gap-1 text-[10px] text-[var(--ui-muted)]">
            <span>幅</span>
            {[
              { label: "S", value: 300 },
              { label: "M", value: 360 },
              { label: "L", value: 420 },
            ].map((preset) => (
              <button
                key={preset.label}
                type="button"
                className="ui-button h-7 px-2 text-[10px]"
                aria-label={`パネル幅 ${preset.label}`}
                onClick={() => onWidthPreset?.(preset.value)}
              >
                {preset.label}
              </button>
            ))}
          </div>
        </div>
      </div>
      <div className="flex-1 min-h-0 overflow-y-auto px-[var(--ui-space-4)] py-[var(--ui-space-3)]">
        <SectionPanel />
      </div>
    </aside>
  );
}
