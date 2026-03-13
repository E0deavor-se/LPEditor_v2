import type { ReactNode } from "react";
import { INSPECTOR_TOKENS } from "@/src/components/inspector/inspectorTokens";

type InspectorHeaderProps = {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
  bottom?: ReactNode;
};

export default function InspectorHeader({ title, subtitle, actions, bottom }: InspectorHeaderProps) {
  return (
    <div className="shrink-0 border-b border-[var(--ui-border)] bg-[var(--surface-2)]">
      <div className="flex items-center justify-between px-3 py-2">
        <div className="min-w-0">
          <div className="truncate text-[13px] font-semibold text-[var(--ui-text)]">{title}</div>
          {subtitle ? (
            <div className="mt-0.5 truncate text-[10px] text-[var(--ui-muted)]">{subtitle}</div>
          ) : null}
        </div>
        {actions ? <div className="flex items-center gap-1">{actions}</div> : null}
      </div>
      {bottom ? <div className="px-3 pb-2">{bottom}</div> : null}
    </div>
  );
}
