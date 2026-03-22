import { BUILDER_TEMPLATE_PRESETS } from "@/src/templates/templatePresets";
import type { ProjectState } from "@/src/types/project";

export type TemplateOption = {
  id: string;
  title: string;
  description: string;
  templateType: ProjectState["meta"]["templateType"];
  sectionOrder: string[];
};

export const TEMPLATE_STORAGE_KEY = "lp-editor.template";

export const TEMPLATE_OPTIONS: TemplateOption[] = BUILDER_TEMPLATE_PRESETS.map((preset) => ({
  id: preset.id,
  title: preset.title,
  description: preset.description,
  templateType: preset.templateType,
  sectionOrder: preset.sectionOrder,
}));
