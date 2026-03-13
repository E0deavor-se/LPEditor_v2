import type { ReactNode } from "react";
import { INSPECTOR_TOKENS } from "@/src/components/inspector/inspectorTokens";

type InspectorShellProps = {
  children: ReactNode;
  width?: number;
  className?: string;
  scrollable?: boolean;
};

export default function InspectorShell({
  children,
  width = INSPECTOR_TOKENS.inspectorWidth,
  className = "",
  scrollable = true,
}: InspectorShellProps) {
  return (
    <aside
      className={
        "flex h-full min-h-0 flex-col border-l border-[var(--ui-border)] bg-[var(--ui-panel)] text-[var(--ui-text)] " +
        (scrollable ? "overflow-y-auto " : "") +
        className
      }
      style={{ width }}
    >
      {children}
    </aside>
  );
}
