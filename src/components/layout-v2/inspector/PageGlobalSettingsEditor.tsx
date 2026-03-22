"use client";

import InspectorSection from "@/src/components/inspector/InspectorSection";
import InspectorField from "@/src/components/inspector/InspectorField";
import InspectorInput from "@/src/components/inspector/InspectorInput";
import type { BackgroundSpec, PageBaseStyle } from "@/src/types/project";
import {
  PAGE_BACKGROUND_TEMPLATES,
  getPageBackgroundTemplateById,
} from "@/src/lib/pageBackgroundTemplates";
import { BUILDER_THEME_PRESETS } from "@/src/themes/themePresets";

type PageGlobalSettingsEditorProps = {
  pageStyle?: PageBaseStyle;
  pageBackground?: BackgroundSpec;
  currentThemeId?: string;
  onPatchColors: (patch: Partial<PageBaseStyle["colors"]>) => void;
  onPatchSpacing: (patch: Partial<PageBaseStyle["spacing"]>) => void;
  onPatchLayout: (patch: Partial<PageBaseStyle["layout"]>) => void;
  onPatchBackground: (spec: BackgroundSpec) => void;
  onApplyTheme: (themeId: string) => void;
};

const CONTAINER_WIDTH_PRESETS = [
  { id: "narrow", label: "Narrow (920)", value: 920 },
  { id: "standard", label: "Standard (1080)", value: 1080 },
  { id: "wide", label: "Wide (1200)", value: 1200 },
  { id: "xwide", label: "Extra Wide (1360)", value: 1360 },
] as const;

const defaultPageStyle: PageBaseStyle = {
  typography: {
    fontFamily: "'Noto Sans JP', sans-serif",
    baseSize: 16,
    lineHeight: 1.8,
    letterSpacing: 0,
    fontWeight: 400,
  },
  sectionAnimation: { type: "none", trigger: "onView", speed: 1, easing: "ease" },
  colors: {
    background: "#ffffff",
    text: "#111827",
    accent: "#eb5505",
    border: "#e5e7eb",
  },
  spacing: {
    sectionPadding: { t: 24, r: 24, b: 24, l: 24 },
    sectionGap: 24,
  },
  layout: {
    maxWidth: 1200,
    align: "center",
    radius: 10,
    shadow: "none",
  },
};

const asNumber = (value: unknown, fallback: number) =>
  typeof value === "number" && Number.isFinite(value) ? value : fallback;

export default function PageGlobalSettingsEditor({
  pageStyle,
  pageBackground,
  currentThemeId,
  onPatchColors,
  onPatchSpacing,
  onPatchLayout,
  onPatchBackground,
  onApplyTheme,
}: PageGlobalSettingsEditorProps) {
  const colors = pageStyle?.colors ?? defaultPageStyle.colors;
  const spacing = pageStyle?.spacing ?? defaultPageStyle.spacing;
  const layout = pageStyle?.layout ?? defaultPageStyle.layout;
  const currentTemplateId =
    pageBackground?.type === "preset" && typeof pageBackground.presetId === "string"
      ? pageBackground.presetId
      : "";

  return (
    <div className="border-t border-[var(--ui-border)]/60">
      <InspectorSection title="ページベース">
        <InspectorField label="Theme">
          <select
            className="ui-input h-7 w-full text-[11px]"
            value={currentThemeId ?? "orangeCampaign"}
            onChange={(event) => onApplyTheme(event.target.value)}
          >
            {BUILDER_THEME_PRESETS.map((theme) => (
              <option key={theme.id} value={theme.id}>
                {theme.label}
              </option>
            ))}
          </select>
        </InspectorField>
        <InspectorField label="ページ背景色">
          <InspectorInput
            type="color"
            value={String(colors.background || "#ffffff")}
            onChange={(event) => onPatchColors({ background: event.target.value })}
          />
        </InspectorField>
        <InspectorField label="本文色">
          <InspectorInput
            type="color"
            value={String(colors.text || "#111827")}
            onChange={(event) => onPatchColors({ text: event.target.value })}
          />
        </InspectorField>
        <InspectorField label="アクセント色">
          <InspectorInput
            type="color"
            value={String(colors.accent || "#eb5505")}
            onChange={(event) => onPatchColors({ accent: event.target.value })}
          />
        </InspectorField>
      </InspectorSection>

      <InspectorSection title="背景テンプレート">
        <InspectorField label="テンプレート">
          <select
            className="ui-input h-7 w-full text-[11px]"
            value={currentTemplateId}
            onChange={(event) => {
              const template = getPageBackgroundTemplateById(event.target.value);
              if (!template) {
                onPatchBackground({ type: "solid", color: colors.background || "#ffffff" });
                return;
              }
              onPatchBackground({ type: "preset", presetId: template.id, overrides: template.spec });
            }}
          >
            <option value="">なし（単色）</option>
            {PAGE_BACKGROUND_TEMPLATES.map((template) => (
              <option key={template.id} value={template.id}>
                {template.label}
              </option>
            ))}
          </select>
        </InspectorField>
      </InspectorSection>

      <InspectorSection title="レイアウト">
        <InspectorField label="コンテナ幅プリセット">
          <select
            className="ui-input h-7 w-full text-[11px]"
            value={String(asNumber(layout.maxWidth, 1200))}
            onChange={(event) => onPatchLayout({ maxWidth: Number(event.target.value) || 1200 })}
          >
            {CONTAINER_WIDTH_PRESETS.map((preset) => (
              <option key={preset.id} value={preset.value}>
                {preset.label}
              </option>
            ))}
          </select>
        </InspectorField>
        <InspectorField label="ページ最大幅(px)">
          <InspectorInput
            type="number"
            min={720}
            max={1920}
            step={10}
            value={String(asNumber(layout.maxWidth, 1200))}
            onChange={(event) =>
              onPatchLayout({
                maxWidth: Math.max(720, Number(event.target.value) || 720),
              })
            }
          />
        </InspectorField>
        <InspectorField label="デフォルト section gap(px)">
          <InspectorInput
            type="number"
            min={0}
            max={160}
            step={1}
            value={String(asNumber(spacing.sectionGap, 24))}
            onChange={(event) =>
              onPatchSpacing({
                sectionGap: Math.max(0, Number(event.target.value) || 0),
              })
            }
          />
        </InspectorField>
      </InspectorSection>
    </div>
  );
}
