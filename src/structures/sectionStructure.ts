import type { SectionBase } from "@/src/types/project";
import type { CampaignStructureSectionRole } from "@/src/structures/campaignStructurePresets";

export type SectionStructureHint = {
  slotId?: string;
  role?: CampaignStructureSectionRole;
  label?: string;
  presetId?: string;
  campaignType?: string;
};

const isRole = (value: unknown): value is CampaignStructureSectionRole =>
  value === "fixed" || value === "required" || value === "optional";

const toRecord = (value: unknown): Record<string, unknown> | null =>
  value && typeof value === "object" ? (value as Record<string, unknown>) : null;

export const getSectionStructureHint = (
  section?: Pick<SectionBase, "data"> | null,
): SectionStructureHint | null => {
  const data = toRecord(section?.data);
  if (!data) {
    return null;
  }
  const raw = toRecord(data.__structure);
  if (!raw) {
    return null;
  }
  const role = isRole(raw.role) ? raw.role : undefined;
  return {
    slotId: typeof raw.slotId === "string" ? raw.slotId : undefined,
    role,
    label: typeof raw.label === "string" ? raw.label : undefined,
    presetId: typeof raw.presetId === "string" ? raw.presetId : undefined,
    campaignType: typeof raw.campaignType === "string" ? raw.campaignType : undefined,
  };
};

export const getSectionStructureRole = (
  section?: Pick<SectionBase, "data"> | null,
): CampaignStructureSectionRole | undefined => getSectionStructureHint(section)?.role;

export const isFixedStructureSection = (
  section?: Pick<SectionBase, "data"> | null,
): boolean => getSectionStructureRole(section) === "fixed";

export const isRequiredStructureSection = (
  section?: Pick<SectionBase, "data"> | null,
): boolean => getSectionStructureRole(section) === "required";

export const getSectionStructureRoleLabel = (
  role?: CampaignStructureSectionRole,
): string | null => {
  if (role === "fixed") {
    return "FIXED";
  }
  if (role === "required") {
    return "REQUIRED";
  }
  if (role === "optional") {
    return "OPTIONAL";
  }
  return null;
};
