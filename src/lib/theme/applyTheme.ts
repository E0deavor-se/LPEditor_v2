import type { BackgroundSpec, PageBaseStyle, ProjectState, ProjectSettings } from "@/src/types/project";
import {
  DEFAULT_BUILDER_THEME_ID,
  getBuilderThemePreset,
  type BuilderThemeId,
} from "@/src/themes/themePresets";
import { getLayoutDocument } from "@/src/lib/editorProject";

const DEFAULT_THEME_SPEC = {
  mode: "light" as const,
  accent: "aupay-orange" as const,
};

const DEFAULT_PAGE_BASE_STYLE: PageBaseStyle = {
  typography: {
    fontFamily: "system-ui",
    baseSize: 16,
    lineHeight: 1.6,
    letterSpacing: 0,
    fontWeight: 400,
  },
  sectionAnimation: {
    type: "none",
    trigger: "onView",
    speed: 500,
    easing: "ease-out",
  },
  colors: {
    background: "#ffffff",
    text: "#111111",
    accent: "#1f6feb",
    border: "#e5e7eb",
  },
  spacing: {
    sectionPadding: { t: 32, r: 24, b: 32, l: 24 },
    sectionGap: 24,
  },
  layout: {
    maxWidth: 1200,
    align: "center",
    radius: 12,
    shadow: "sm",
  },
};

const mergePageBaseStyle = (
  base: PageBaseStyle | undefined,
  patch: Partial<PageBaseStyle>,
): PageBaseStyle => {
  const current = base ?? DEFAULT_PAGE_BASE_STYLE;
  return {
    typography: {
      ...current.typography,
      ...patch.typography,
    },
    sectionAnimation: {
      ...current.sectionAnimation,
      ...patch.sectionAnimation,
    },
    colors: {
      ...current.colors,
      ...patch.colors,
    },
    spacing: {
      ...current.spacing,
      ...patch.spacing,
      sectionPadding: {
        ...current.spacing.sectionPadding,
        ...patch.spacing?.sectionPadding,
      },
    },
    layout: {
      ...current.layout,
      ...patch.layout,
    },
  };
};

const mergeSettingsBackgrounds = (
  settings: ProjectSettings,
  backgrounds: { page?: BackgroundSpec; mv?: BackgroundSpec },
): ProjectSettings => ({
  ...settings,
  backgrounds: {
    ...settings.backgrounds,
    ...(backgrounds.page ? { page: backgrounds.page } : {}),
    ...(backgrounds.mv ? { mv: backgrounds.mv } : {}),
  },
});

export const resolveThemeColors = (themeId?: string) =>
  getBuilderThemePreset(themeId).pageStyle.colors;

export const applyThemeToPageStyle = (
  base: PageBaseStyle | undefined,
  themeId?: string,
): PageBaseStyle => mergePageBaseStyle(base, getBuilderThemePreset(themeId).pageStyle);

export const applyThemeToProject = (
  project: ProjectState,
  themeId?: string,
): ProjectState => {
  const resolvedThemeId = (themeId ?? DEFAULT_BUILDER_THEME_ID) as BuilderThemeId;
  const preset = getBuilderThemePreset(resolvedThemeId);
  const layoutDocument = getLayoutDocument(project);
  const nextPageBaseStyle = applyThemeToPageStyle(layoutDocument.pageBaseStyle ?? project.pageBaseStyle, preset.id);
  const nextSettings = mergeSettingsBackgrounds(layoutDocument.settings ?? project.settings, preset.backgrounds);
  const nextThemeSpec = {
    ...DEFAULT_THEME_SPEC,
    ...layoutDocument.themeSpec,
    ...project.themeSpec,
    themeId: preset.id,
    templateId:
      layoutDocument.themeSpec?.templateId ??
      project.themeSpec?.templateId ??
      project.meta.templateId,
  };
  const nextLayoutDocument = {
    ...layoutDocument,
    settings: nextSettings,
    pageBaseStyle: nextPageBaseStyle,
    themeSpec: nextThemeSpec,
  };

  return {
    ...project,
    settings: nextSettings,
    pageBaseStyle: nextPageBaseStyle,
    themeSpec: nextThemeSpec,
    editorDocuments: project.editorDocuments
      ? {
          ...project.editorDocuments,
          layoutDocument: nextLayoutDocument,
        }
      : project.editorDocuments,
  };
};
