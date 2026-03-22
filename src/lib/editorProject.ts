import { createDefaultCanvasDocument } from "@/src/types/canvas";
import type { CanvasDocument } from "@/src/types/canvas";
import type { LPDocument, ProjectState, SectionBase } from "@/src/types/project";
import { ensureProjectAiAssetsConsistency } from "@/src/features/ai-assets/lib/projectAiAssets";
import { applyLayoutSuggestionsToProject } from "@/src/lib/layout/layoutSuggestions";

const isDev = process.env.NODE_ENV !== "production";

const buildLayoutDocumentFromLegacyRoot = (project: ProjectState): LPDocument => ({
  settings: project.settings,
  sections: Array.isArray(project.sections) ? project.sections : [],
  pageBaseStyle: project.pageBaseStyle,
  stores: project.stores,
  assets: project.assets,
  aiAssets: project.aiAssets,
  schemaVersion: project.schemaVersion,
  appVersion: project.appVersion,
  globalSettings: project.globalSettings,
  assetMeta: project.assetMeta,
  storeListSpec: project.storeListSpec,
  themeSpec: project.themeSpec,
  layoutSuggestion: project.layoutSuggestion,
  animationRegistry: project.animationRegistry,
});

export const getLayoutDocument = (project: ProjectState): LPDocument => {
  const current = project.editorDocuments;
  return (
    current?.layoutDocument ??
    current?.lpDocument ??
    buildLayoutDocumentFromLegacyRoot(project)
  );
};

export const getLayoutSections = (project: ProjectState): SectionBase[] =>
  getLayoutDocument(project).sections ?? [];

export const getCanvasDocument = (project: ProjectState): CanvasDocument => {
  const current = project.editorDocuments;
  return (
    current?.canvasDocument ??
    project.canvasPages?.[0]?.canvas ??
    createDefaultCanvasDocument()
  );
};

export const warnLegacyProjectState = (
  project: ProjectState,
  context: string
) => {
  if (!isDev) {
    return;
  }
  const docs = project.editorDocuments;
  const layoutSections = docs?.layoutDocument?.sections ?? [];
  const legacySections = Array.isArray(project.sections) ? project.sections : [];
  if (docs?.lpDocument) {
    console.warn(`[EditorProject:${context}] legacy lpDocument detected`);
  }
  if (project.canvasPages && project.canvasPages.length > 0) {
    console.warn(`[EditorProject:${context}] legacy canvasPages detected`);
  }
  const mismatch =
    legacySections.length !== layoutSections.length ||
    legacySections.some((section, index) => section.id !== layoutSections[index]?.id);
  if (mismatch) {
    console.warn(`[EditorProject:${context}] legacy sections mismatch with layoutDocument.sections`);
  }
};

export const normalizeProjectDocuments = (project: ProjectState): ProjectState => {
  const consistentProject = ensureProjectAiAssetsConsistency(project);
  const docs = consistentProject.editorDocuments;
  const mode = docs?.mode === "canvas" ? "canvas" : "layout";
  const activeDevice =
    docs?.activeDevice === "pc" || docs?.activeDevice === "sp"
      ? docs.activeDevice
      : consistentProject.globalSettings?.ui?.previewMode === "mobile"
      ? "sp"
      : "pc";
  const layoutDocument = getLayoutDocument(consistentProject);
  const canvasDocument = getCanvasDocument(consistentProject);

  const normalizedProject: ProjectState = {
    ...consistentProject,
    settings: layoutDocument.settings,
    sections: layoutDocument.sections,
    pageBaseStyle: layoutDocument.pageBaseStyle,
    stores: layoutDocument.stores,
    assets: layoutDocument.assets,
    aiAssets: layoutDocument.aiAssets,
    schemaVersion: layoutDocument.schemaVersion,
    appVersion: layoutDocument.appVersion,
    globalSettings: layoutDocument.globalSettings,
    assetMeta: layoutDocument.assetMeta,
    storeListSpec: layoutDocument.storeListSpec,
    themeSpec: layoutDocument.themeSpec,
    layoutSuggestion: layoutDocument.layoutSuggestion,
    animationRegistry: layoutDocument.animationRegistry,
    editorDocuments: {
      mode,
      activeDevice,
      layoutDocument,
      canvasDocument,
    },
  };

  return applyLayoutSuggestionsToProject(normalizedProject);
};

export const serializeProjectForPersistence = (project: ProjectState): ProjectState => {
  const normalized = normalizeProjectDocuments(project);
  const editorDocuments = normalized.editorDocuments
    ? {
        mode: normalized.editorDocuments.mode,
        activeDevice: normalized.editorDocuments.activeDevice,
        layoutDocument: normalized.editorDocuments.layoutDocument,
        canvasDocument: normalized.editorDocuments.canvasDocument,
      }
    : normalized.editorDocuments;

  return {
    ...normalized,
    editorDocuments,
    canvasPages: undefined,
  };
};
