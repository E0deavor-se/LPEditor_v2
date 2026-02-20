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
    <div className="flex items-center gap-1 rounded-lg border border-[var(--ui-border)] bg-[var(--surface-2)] p-1 text-[11px]">
      {tabs.map((tab) => (
        <button
          key={tab.key}
          type="button"
          className={
            "h-8 flex-1 rounded-md px-2 font-semibold tracking-wide transition-colors duration-150 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color-mix(in_oklab,var(--ui-primary-base)_30%,transparent)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--background)] " +
            (value === tab.key
              ? " bg-[var(--surface)] text-[var(--ui-text)] shadow-sm"
              : " text-[var(--ui-muted)] hover:bg-[var(--surface)] hover:text-[var(--ui-text)]")
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
