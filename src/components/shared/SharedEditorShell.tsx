/* ───────────────────────────────────────────────
   SharedEditorShell – Layout / Canvas 共通外枠
   ─────────────────────────────────────────────── */

import type { ReactNode } from "react";

type SharedEditorShellProps = {
  toolbar?: ReactNode;
  sidebar?: ReactNode;
  stage: ReactNode;
  inspector?: ReactNode;
  className?: string;
};

/**
 * Layout / Canvas 共通の 3ペイン＋ツールバー構成。
 * 中身だけモードごとに差し替える。
 */
export default function SharedEditorShell({
  toolbar,
  sidebar,
  stage,
  inspector,
  className = "",
}: SharedEditorShellProps) {
  return (
    <div className={"flex min-h-0 flex-1 flex-col " + className}>
      {toolbar}
      <div className="flex min-h-0 flex-1">
        {sidebar}
        {stage}
        {inspector}
      </div>
    </div>
  );
}
