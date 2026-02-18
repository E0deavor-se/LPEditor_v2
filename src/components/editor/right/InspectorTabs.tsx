"use client";

import { useI18n } from "@/src/i18n";

type TabKey = "style" | "content" | "advanced";

type InspectorTabsProps = {
  value: TabKey;
  onChange: (value: TabKey) => void;
  hideStyle?: boolean;
  hideContent?: boolean;
  hideAdvanced?: boolean;
};

export default function InspectorTabs({
  value,
  onChange,
  hideStyle,
  hideContent,
  hideAdvanced,
}: InspectorTabsProps) {
  const t = useI18n();
  const tabs: Array<{ key: TabKey; label: string }> = [
    ...(hideContent
      ? []
      : [{ key: "content" as const, label: t.inspector.tabs.content }]),
    ...(hideStyle
      ? []
      : [{ key: "style" as const, label: t.inspector.tabs.style }]),
    ...(hideAdvanced
      ? []
      : [{ key: "advanced" as const, label: t.inspector.tabs.advanced }]),
  ];

  return (
    <div className="flex items-center gap-1 rounded-lg border border-[var(--ui-border)]/70 bg-[var(--ui-panel-muted)]/70 p-1 text-[11px]">
      {tabs.map((tab) => (
        <button
          key={tab.key}
          type="button"
          className={
            "h-7 flex-1 rounded-md px-2 font-semibold tracking-wide transition " +
            (value === tab.key
              ? " bg-[var(--ui-panel)] text-[var(--ui-text)] shadow-sm"
              : " text-[var(--ui-muted)] hover:bg-[var(--ui-panel)]/70 hover:text-[var(--ui-text)]")
          }
          aria-pressed={value === tab.key}
          onClick={() => onChange(tab.key)}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}
