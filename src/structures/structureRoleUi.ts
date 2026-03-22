import type { CampaignStructureSectionRole } from "@/src/structures/campaignStructurePresets";

type StructureRoleUi = {
  label: string | null;
  chipClassName: string;
  rowClassName: string;
  dotClassName: string;
};

const CHIP_BASE =
  "inline-flex items-center gap-1 rounded-full border px-1.5 py-0 text-[9px] font-semibold uppercase tracking-wide";

const CHIP_FIXED =
  CHIP_BASE +
  " border-[color-mix(in_srgb,var(--ui-accent)_38%,var(--ui-border))] bg-[color-mix(in_srgb,var(--ui-accent)_14%,transparent)] text-[var(--ui-accent)]";

const CHIP_REQUIRED =
  CHIP_BASE +
  " border-[color-mix(in_srgb,var(--ui-warning)_38%,var(--ui-border))] bg-[color-mix(in_srgb,var(--ui-warning)_14%,transparent)] text-[color-mix(in_srgb,var(--ui-warning)_82%,#6b4f00)]";

const CHIP_OPTIONAL =
  CHIP_BASE +
  " border-[var(--ui-border)] bg-[var(--surface-elevated)] text-[var(--ui-muted)]";

const ROW_FIXED =
  "bg-[color-mix(in_srgb,var(--ui-accent)_7%,transparent)]";

const ROW_REQUIRED =
  "bg-[color-mix(in_srgb,var(--ui-warning)_8%,transparent)]";

const ROW_OPTIONAL = "";

const DOT_FIXED = "h-1.5 w-1.5 rounded-full bg-[var(--ui-accent)]";
const DOT_REQUIRED =
  "h-1.5 w-1.5 rounded-full bg-[color-mix(in_srgb,var(--ui-warning)_88%,#8a6a00)]";
const DOT_OPTIONAL = "hidden";

export const getStructureRoleUi = (
  role?: CampaignStructureSectionRole,
  options?: { showOptional?: boolean },
): StructureRoleUi => {
  const showOptional = Boolean(options?.showOptional);
  if (role === "fixed") {
    return {
      label: "FIXED",
      chipClassName: CHIP_FIXED,
      rowClassName: ROW_FIXED,
      dotClassName: DOT_FIXED,
    };
  }
  if (role === "required") {
    return {
      label: "REQUIRED",
      chipClassName: CHIP_REQUIRED,
      rowClassName: ROW_REQUIRED,
      dotClassName: DOT_REQUIRED,
    };
  }
  return {
    label: showOptional ? "OPTIONAL" : null,
    chipClassName: CHIP_OPTIONAL,
    rowClassName: ROW_OPTIONAL,
    dotClassName: DOT_OPTIONAL,
  };
};
