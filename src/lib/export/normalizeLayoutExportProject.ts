import type { ProjectState } from "@/src/types/project";

/**
 * Resolve a project snapshot for Layout export from editorDocuments.layoutDocument.
 *
 * Compatibility policy:
 * - Prefer editorDocuments.layoutDocument as canonical source for Layout export.
 * - Keep legacy root fields for read compatibility only.
 */
export const normalizeLayoutExportProject = (
  project: ProjectState
): ProjectState => {
  const layoutDocument = project.editorDocuments?.layoutDocument ?? null;
  if (!layoutDocument) {
    return project;
  }

  return {
    ...project,
    settings: layoutDocument.settings,
    sections: layoutDocument.sections,
    pageBaseStyle: layoutDocument.pageBaseStyle,
    stores: layoutDocument.stores,
    assets: layoutDocument.assets,
    schemaVersion: layoutDocument.schemaVersion,
    appVersion: layoutDocument.appVersion,
    globalSettings: layoutDocument.globalSettings,
    assetMeta: layoutDocument.assetMeta,
    storeListSpec: layoutDocument.storeListSpec,
    themeSpec: layoutDocument.themeSpec,
    animationRegistry: layoutDocument.animationRegistry,
  };
};
