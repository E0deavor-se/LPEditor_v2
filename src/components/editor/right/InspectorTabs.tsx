"use client";

import { useI18n } from "@/src/i18n";
import InspectorSecondaryTabs from "@/src/components/inspector/InspectorSecondaryTabs";

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

  return <InspectorSecondaryTabs value={value} options={tabs} onChange={onChange} />;
}
