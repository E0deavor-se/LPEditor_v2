"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import { MoreHorizontal, Plus } from "lucide-react";

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

export default function LeftPanel({ width, onWidthPreset: _onWidthPreset }: LeftPanelProps) {
  const glassClass = "backdrop-blur-xl";
  const [isAddMenuOpen, setIsAddMenuOpen] = useState(false);
  const [isBulkMenuOpen, setIsBulkMenuOpen] = useState(false);

  return (
    <aside
      className={
        "ui-panel relative flex h-full min-h-0 flex-col rounded-none border-y-0 border-l-0 text-[var(--ui-text)] bg-[var(--sidebar-grad)] " +
        glassClass
      }
      style={{ width, minWidth: 260, maxWidth: 420 }}
      tabIndex={0}
    >
      <div className="relative border-b border-[var(--ui-border)] bg-[var(--surface-2)] px-3 py-2">
        <div className="flex items-center justify-between gap-2">
          <div className="text-[13px] font-semibold text-[var(--ui-text)]">
            レイヤー
          </div>
          <div className="flex items-center gap-1">
            <button
              type="button"
              className="ui-button ui-button-ghost h-7 w-7 px-0 text-[10px]"
              aria-label="セクション追加"
              title="セクション追加"
              onClick={() => setIsAddMenuOpen(true)}
            >
              <Plus size={14} />
            </button>
            <button
              type="button"
              className="ui-button ui-button-ghost h-7 w-7 px-0 text-[10px]"
              aria-label="一括操作"
              title="一括操作"
              onClick={() => setIsBulkMenuOpen((current) => !current)}
            >
              <MoreHorizontal size={14} />
            </button>
            {isBulkMenuOpen ? (
              <div className="absolute right-2 top-full z-20 mt-1 w-40 rounded-md border border-[var(--ui-border)] bg-[var(--surface)]/95 p-1 text-[11px] text-[var(--ui-text)] shadow-[var(--ui-shadow-md)] backdrop-blur">
                <button
                  type="button"
                  className="ui-menu-item cursor-not-allowed text-[var(--ui-muted)]"
                  disabled={true}
                >
                  一括操作は準備中です
                </button>
              </div>
            ) : null}
          </div>
        </div>
      </div>
      <div className="lp-layer-scroll flex-1 min-h-0 overflow-y-auto">
        <SectionPanel
          isAddMenuOpen={isAddMenuOpen}
          onAddMenuOpenChange={setIsAddMenuOpen}
        />
      </div>
    </aside>
  );
}
