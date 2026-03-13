import type { SectionBase } from "@/src/types/project";

const esc = (value: string) =>
  value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#39;");

/**
 * Shared fallback for unhandled layout section types.
 * This keeps Preview / Export / API export behavior aligned and traceable.
 */
export const renderUnhandledLayoutSectionFallback = (
  section: Pick<SectionBase, "id" | "type">
): string => {
  const sectionType = esc(String(section.type));
  const sectionId = esc(String(section.id));
  return (
    `<!-- unhandled-layout-section:${sectionType}:${sectionId} -->` +
    `<section class="renderer-miss-placeholder" data-unhandled-section="${sectionType}" data-unhandled-section-id="${sectionId}" style="margin:12px auto;padding:10px;max-width:1100px;border:1px dashed #f59e0b;border-radius:8px;background:#fffbeb;color:#92400e;font-size:12px;line-height:1.5;">` +
    `未対応セクション: ${sectionType}` +
    `</section>`
  );
};
