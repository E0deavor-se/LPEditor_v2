import {
  createEmptyProjectAiAssets,
  normalizeProjectAiAssets,
  type AiAssetBindingRecord,
  type AiAssetPromptPreset,
  type AiAssetRole,
  type ProjectAiAssets,
} from "@/src/features/ai-assets/types";
import type { ProjectState, SectionBase } from "@/src/types/project";

const isObject = (value: unknown): value is Record<string, unknown> =>
  Boolean(value) && typeof value === "object";

const isRole = (value: unknown): value is AiAssetRole =>
  value === "heroPc" ||
  value === "heroSp" ||
  value === "imageOnly" ||
  value === "sectionImage" ||
  value === "sectionIcon";

const bindingKey = (sectionId: string, role: AiAssetRole) => `${sectionId}::${role}`;

const toLegacyBindingMap = (
  sectionId: string,
  aiAssets: ProjectAiAssets | undefined,
): Record<string, unknown> => {
  const map: Record<string, unknown> = {};
  const bindings = aiAssets?.bindings ?? [];
  for (const binding of bindings) {
    if (binding.sectionId !== sectionId) {
      continue;
    }
    map[binding.role] = {
      assetId: binding.assetId,
      sourceGeneratedAssetId: binding.sourceGeneratedAssetId,
      boundAt: binding.boundAt,
      provider: binding.provider,
      model: binding.model,
      prompt: binding.prompt,
      width: binding.width,
      height: binding.height,
    };
  }
  return map;
};

const parseLegacyBindingEntry = (
  sectionId: string,
  role: string,
  value: unknown,
): AiAssetBindingRecord | null => {
  if (!isRole(role) || !isObject(value)) {
    return null;
  }
  const assetId = typeof value.assetId === "string" ? value.assetId : "";
  const sourceGeneratedAssetId =
    typeof value.sourceGeneratedAssetId === "string" ? value.sourceGeneratedAssetId : "";
  if (!assetId || !sourceGeneratedAssetId) {
    return null;
  }
  return {
    sectionId,
    role,
    assetId,
    sourceGeneratedAssetId,
    boundAt:
      typeof value.boundAt === "string" && value.boundAt.trim()
        ? value.boundAt
        : new Date().toISOString(),
    provider: typeof value.provider === "string" ? value.provider : undefined,
    model: typeof value.model === "string" ? value.model : undefined,
    prompt: typeof value.prompt === "string" ? value.prompt : undefined,
    width: typeof value.width === "number" ? value.width : undefined,
    height: typeof value.height === "number" ? value.height : undefined,
  };
};

const dedupeGeneratedAssets = (aiAssets: ProjectAiAssets): ProjectAiAssets["generatedAssets"] => {
  const seen = new Set<string>();
  const next: ProjectAiAssets["generatedAssets"] = [];
  for (const asset of aiAssets.generatedAssets) {
    if (!asset?.id || seen.has(asset.id)) {
      continue;
    }
    seen.add(asset.id);
    next.push(asset);
  }
  return next;
};

const dedupeJobs = (aiAssets: ProjectAiAssets): ProjectAiAssets["jobs"] => {
  const seen = new Set<string>();
  const next: ProjectAiAssets["jobs"] = [];
  for (const job of aiAssets.jobs) {
    if (!job?.jobId || seen.has(job.jobId)) {
      continue;
    }
    seen.add(job.jobId);
    next.push(job);
  }
  return next;
};

const dedupeAndValidateBindings = (
  project: Pick<ProjectState, "sections" | "assets">,
  aiAssets: ProjectAiAssets,
): ProjectAiAssets["bindings"] => {
  const sectionIds = new Set(project.sections.map((section) => section.id));
  const assetIds = new Set(Object.keys(project.assets ?? {}));
  const generatedAssetIds = new Set(aiAssets.generatedAssets.map((entry) => entry.id));
  const seen = new Set<string>();
  const next: ProjectAiAssets["bindings"] = [];

  for (const binding of aiAssets.bindings) {
    if (!binding.sectionId || !isRole(binding.role)) {
      continue;
    }
    if (!sectionIds.has(binding.sectionId)) {
      continue;
    }
    if (!binding.assetId || !assetIds.has(binding.assetId)) {
      continue;
    }
    // Keep only bindings that can still resolve to generated asset identity.
    if (!binding.sourceGeneratedAssetId || !generatedAssetIds.has(binding.sourceGeneratedAssetId)) {
      continue;
    }
    const key = bindingKey(binding.sectionId, binding.role);
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);
    next.push(binding);
  }

  return next;
};

const promptPresetKey = (sectionId: string, target: string) => `${sectionId}::${target}`;

const dedupeAndValidatePromptPresets = (
  project: Pick<ProjectState, "sections">,
  aiAssets: ProjectAiAssets,
): ProjectAiAssets["promptPresets"] => {
  const sectionIds = new Set(project.sections.map((section) => section.id));
  const byKey = new Map<string, AiAssetPromptPreset>();

  for (const preset of aiAssets.promptPresets) {
    if (!preset.sectionId || !sectionIds.has(preset.sectionId)) {
      continue;
    }
    if (!preset.overlayPosition && !preset.textOverlay && !preset.density) {
      continue;
    }
    const key = promptPresetKey(preset.sectionId, preset.target);
    byKey.set(key, preset);
  }

  return Array.from(byKey.values());
};

export const deriveSectionAiBindingsFromProject = (
  sectionId: string,
  aiAssets: ProjectAiAssets | undefined,
): Record<string, unknown> => {
  return toLegacyBindingMap(sectionId, aiAssets);
};

export const migrateLegacyAiBindingsFromSections = (
  sections: SectionBase[],
  aiAssetsInput: ProjectAiAssets | undefined,
): {
  aiAssets: ProjectAiAssets;
  migratedCount: number;
} => {
  const aiAssets = normalizeProjectAiAssets(aiAssetsInput) ?? createEmptyProjectAiAssets();
  const currentByKey = new Map<string, AiAssetBindingRecord>();
  aiAssets.bindings.forEach((binding) => {
    if (!binding.sectionId || !isRole(binding.role)) {
      return;
    }
    currentByKey.set(bindingKey(binding.sectionId, binding.role), binding);
  });

  let migratedCount = 0;

  for (const section of sections) {
    const raw = isObject(section.data) ? section.data.aiAssetBindings : undefined;
    if (!isObject(raw)) {
      continue;
    }
    for (const [role, value] of Object.entries(raw)) {
      const parsed = parseLegacyBindingEntry(section.id, role, value);
      if (!parsed) {
        continue;
      }
      const key = bindingKey(parsed.sectionId, parsed.role);
      // project.aiAssets is source of truth: only fill when project side is absent.
      if (currentByKey.has(key)) {
        continue;
      }
      currentByKey.set(key, parsed);
      migratedCount += 1;
    }
  }

  return {
    aiAssets: {
      ...aiAssets,
      bindings: Array.from(currentByKey.values()),
    },
    migratedCount,
  };
};

export const ensureProjectAiAssetsConsistency = (project: ProjectState): ProjectState => {
  const normalizedAiAssets = normalizeProjectAiAssets(project.aiAssets) ?? createEmptyProjectAiAssets();

  const migrated = migrateLegacyAiBindingsFromSections(project.sections, normalizedAiAssets);

  const normalizedAfterMigration: ProjectAiAssets = {
    generatedAssets: dedupeGeneratedAssets(migrated.aiAssets),
    jobs: dedupeJobs(migrated.aiAssets),
    bindings: migrated.aiAssets.bindings,
    promptPresets: migrated.aiAssets.promptPresets,
  };

  const finalAiAssets: ProjectAiAssets = {
    ...normalizedAfterMigration,
    bindings: dedupeAndValidateBindings(project, normalizedAfterMigration),
    promptPresets: dedupeAndValidatePromptPresets(project, normalizedAfterMigration),
  };

  const nextSections = project.sections.map((section) => {
    const currentData = isObject(section.data) ? section.data : {};
    const legacyBindings = deriveSectionAiBindingsFromProject(section.id, finalAiAssets);
    if (Object.keys(legacyBindings).length === 0) {
      if (!("aiAssetBindings" in currentData)) {
        return section;
      }
      const { aiAssetBindings: _removed, ...rest } = currentData;
      return {
        ...section,
        data: rest,
      };
    }
    return {
      ...section,
      data: {
        ...currentData,
        // Compatibility mirror. Source of truth is always project.aiAssets.bindings.
        aiAssetBindings: legacyBindings,
      },
    };
  });

  const nextEditorDocuments = project.editorDocuments
    ? {
        ...project.editorDocuments,
        layoutDocument: project.editorDocuments.layoutDocument
          ? {
              ...project.editorDocuments.layoutDocument,
              sections: nextSections,
              aiAssets: finalAiAssets,
            }
          : project.editorDocuments.layoutDocument,
        lpDocument: project.editorDocuments.lpDocument
          ? {
              ...project.editorDocuments.lpDocument,
              sections: nextSections,
              aiAssets: finalAiAssets,
            }
          : project.editorDocuments.lpDocument,
      }
    : project.editorDocuments;

  return {
    ...project,
    sections: nextSections,
    aiAssets: finalAiAssets,
    editorDocuments: nextEditorDocuments,
  };
};
