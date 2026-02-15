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
    ...(hideStyle
      ? []
      : [{ key: "style" as const, label: t.inspector.tabs.style }]),
    ...(hideContent
      ? []
      : [{ key: "content" as const, label: t.inspector.tabs.content }]),
    ...(hideAdvanced
      ? []
      : [{ key: "advanced" as const, label: t.inspector.tabs.advanced }]),
  ];

  return (
    <div className="flex items-center gap-1 rounded-md border border-[var(--ui-border)]/60 bg-[var(--ui-panel)]/70 p-1 text-[12px]">
      {tabs.map((tab) => (
        <button
          key={tab.key}
          type="button"
          className={
            "h-7 flex-1 rounded-md px-2 transition " +
            (value === tab.key
              ? " bg-[var(--ui-panel)] text-[var(--ui-text)]"
              : " text-[var(--ui-muted)] hover:text-[var(--ui-text)]")
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
