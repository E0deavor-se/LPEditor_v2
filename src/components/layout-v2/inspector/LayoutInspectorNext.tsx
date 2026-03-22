"use client";

import { useMemo, useState } from "react";
import {
  AlertTriangle,
  Copy,
  Eye,
  EyeOff,
  Image as ImageIcon,
  LayoutGrid,
  Lock,
  Store,
  Trash2,
  Type,
  Unlock,
} from "lucide-react";
import { useInspectorCore } from "@/src/components/editor/right/useInspectorCore";
import InspectorHeader from "@/src/components/inspector/InspectorHeader";
import InspectorPrimaryTabs from "@/src/components/inspector/InspectorPrimaryTabs";
import InspectorSecondaryTabs from "@/src/components/inspector/InspectorSecondaryTabs";
import CommonSectionEditor from "@/src/components/layout-v2/inspector/CommonSectionEditor";
import PageGlobalSettingsEditor from "@/src/components/layout-v2/inspector/PageGlobalSettingsEditor";
import SectionAppearanceEditor from "@/src/components/layout-v2/inspector/sectionSpecific/SectionAppearanceEditor";
import SectionExtensionsEditor from "@/src/components/layout-v2/inspector/sectionSpecific/SectionExtensionsEditor";
import {
  getBalanceLabel,
  getIntensityLabel,
  getLayoutModeLabel,
  getPageMoodLabel,
} from "@/src/lib/layout/layoutSuggestions";
import {
  getSectionStructureHint,
  getSectionStructureRole,
} from "@/src/structures/sectionStructure";
import { getStructureRoleUi } from "@/src/structures/structureRoleUi";
import {
  buildRequiredSectionDeleteWarningMessage,
  resolveStructureSlotLabel,
} from "@/src/structures/structureWarningMessages";
import {
  renderSectionSpecificEditor,
} from "@/src/components/layout-v2/inspector/sectionArchitecture/SectionSpecificEditorMap";

type ScopeTab = "page" | "section";
type SubTab = "content" | "style" | "decoration" | "extensions";

const SECTION_TYPE_LABELS: Record<string, string> = {
  brandBar: "Brand Bar",
  heroImage: "Main Visual",
  campaignPeriodBar: "Campaign Period",
  campaignOverview: "Campaign Overview",
  couponFlow: "Coupon Flow",
  targetStores: "Target Stores",
  legalNotes: "Legal Notes",
  footerHtml: "Contact",
  rankingTable: "Ranking Table",
  paymentHistoryGuide: "Payment Guide",
  excludedStoresList: "Excluded Stores",
  excludedBrandsList: "Excluded Brands",
  tabbedNotes: "Tabbed Notes",
  imageOnly: "Image Only",
  image: "Image",
  stickyNote: "Sticky Note",
  contact: "Contact (New)",
  footer: "Footer",
};

const sectionTypeIcon = (type: string) => {
  if (type === "heroImage" || type === "imageOnly" || type === "image") {
    return <ImageIcon size={14} />;
  }
  if (
    type === "targetStores" ||
    type === "excludedStoresList" ||
    type === "excludedBrandsList"
  ) {
    return <Store size={14} />;
  }
  if (type === "brandBar" || type === "campaignPeriodBar") {
    return <Type size={14} />;
  }
  return <LayoutGrid size={14} />;
};

const supportsSectionExtensions = (type: string) => {
  return !["brandBar", "heroImage", "imageOnly", "footerHtml"].includes(type);
};

export default function LayoutInspectorNext() {
  // NOTE:
  // Legacy inspector fallback is intentionally handled only in LayoutV2Inspector.
  // Keep this component focused on Layout v2 editors wired by SectionSpecificEditorMap.
  const core = useInspectorCore();
  const [scope, setScope] = useState<ScopeTab>(
    core.selected.kind === "page" ? "page" : "section"
  );
  const [tab, setTab] = useState<SubTab>("content");

  const section = core.selectedSection;
  const isSection = core.selected.kind === "section" && Boolean(section);
  const selectedSectionId = section?.id;
  const structureRole = getSectionStructureRole(section);
  const roleUi = getStructureRoleUi(structureRole);
  const sectionTypeLabel =
    (section ? SECTION_TYPE_LABELS[section.type] : undefined) ?? section?.type;
  const sectionName = section?.name?.trim() || sectionTypeLabel || "Section";
  const resolvedScope: ScopeTab =
    core.selected.kind === "page"
      ? "page"
      : scope === "page"
      ? "section"
      : scope;

  const subtitle = useMemo(() => core.breadcrumb.join(" / "), [core.breadcrumb]);

  if (resolvedScope !== "page" && !section) {
    return (
      <div className="flex h-full items-center justify-center px-3 text-[11px] text-[var(--ui-muted)]">
        セクションを選択してください。
      </div>
    );
  }

  return (
    <div className="flex h-full min-h-0 flex-col bg-[var(--surface)]">
      <InspectorHeader
        title={core.targetName}
        subtitle={subtitle}
        actions={
          isSection ? (
            <>
              <button
                type="button"
                className="ui-button ui-button-ghost h-7 w-7 px-0"
                onClick={() => {
                  if (!selectedSectionId) return;
                  core.duplicateSection(selectedSectionId);
                }}
                title="複製"
              >
                <Copy size={14} />
              </button>
              <button
                type="button"
                className="ui-button ui-button-ghost h-7 w-7 px-0"
                onClick={() => {
                  if (!selectedSectionId) return;
                  core.toggleSectionVisible(selectedSectionId);
                }}
                title={core.isVisible ? "非表示" : "表示"}
              >
                {core.isVisible ? <Eye size={14} /> : <EyeOff size={14} />}
              </button>
              <button
                type="button"
                className="ui-button ui-button-ghost h-7 w-7 px-0"
                onClick={() => {
                  if (!selectedSectionId) return;
                  core.toggleSectionLocked(selectedSectionId);
                }}
                title={core.isLocked ? "ロック解除" : "ロック"}
              >
                {core.isLocked ? <Lock size={14} /> : <Unlock size={14} />}
              </button>
              <button
                type="button"
                className={
                  "ui-button ui-button-ghost h-7 w-7 px-0 text-rose-500 " +
                  (structureRole === "fixed" ? "cursor-not-allowed opacity-40" : "")
                }
                onClick={() => {
                  if (!selectedSectionId || !section) return;
                  const role = getSectionStructureRole(section);
                  if (role === "fixed") {
                    window.alert("固定セクションは削除できません。");
                    return;
                  }
                  if (
                    role === "required" &&
                    !window.confirm(
                      buildRequiredSectionDeleteWarningMessage({
                        campaignType: core.project.meta.campaignType,
                        slotLabel: resolveStructureSlotLabel({
                          slotId: getSectionStructureHint(section)?.slotId,
                          sectionType: section.type,
                          blueprintLabel: getSectionStructureHint(section)?.label,
                        }),
                      })
                    )
                  ) {
                    return;
                  }
                  core.deleteSection(selectedSectionId);
                }}
                title={structureRole === "fixed" ? "固定セクションは削除できません" : "削除"}
                disabled={structureRole === "fixed"}
              >
                <Trash2 size={14} />
              </button>
            </>
          ) : null
        }
        bottom={
          <div className="space-y-2.5">
            <InspectorPrimaryTabs
              value={resolvedScope}
              options={[
                { key: "page", label: "ページ" },
                { key: "section", label: "セクション" },
              ]}
              onChange={(next) => {
                setScope(next);
                if (next === "page") {
                  core.setSelectedSection(undefined);
                }
              }}
            />
            {resolvedScope === "section" ? (
              <div className="space-y-2">
                {section ? (
                  <div
                    className={
                      "rounded-md border bg-[var(--surface)] px-2.5 py-2 " +
                      (structureRole === "fixed"
                        ? "border-[color-mix(in_srgb,var(--ui-accent)_45%,var(--ui-border))]"
                        : structureRole === "required"
                        ? "border-[color-mix(in_srgb,var(--ui-warning)_45%,var(--ui-border))]"
                        : "border-[var(--ui-border)]/70")
                    }
                  >
                    <div className="mb-1.5 flex items-center gap-1.5 text-[var(--ui-text)]">
                      <span className="text-[var(--ui-muted)]">
                        {sectionTypeIcon(section.type)}
                      </span>
                      <span className="truncate text-[12px] font-semibold">
                        Section: {sectionName}
                      </span>
                    </div>
                    <div className="truncate text-[10px] text-[var(--ui-muted)]">
                      Type: <span className="font-mono">{section.type}</span>
                    </div>
                    {roleUi.label ? (
                      <div className="mt-1">
                        <span className={roleUi.chipClassName + " text-[10px]"}>
                          {structureRole === "fixed" ? <Lock size={10} /> : null}
                          {structureRole === "required" ? <AlertTriangle size={10} /> : null}
                          {roleUi.label}
                        </span>
                      </div>
                    ) : null}
                    {section.aiLayoutSuggestion ? (
                      <div className="mt-2 rounded-md border border-[var(--ui-border)]/60 bg-[var(--surface-elevated)] px-2 py-2">
                        <div className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-[var(--ui-muted)]">
                          AI Layout Suggestion
                        </div>
                        <div className="text-[11px] text-[var(--ui-text)]">
                          {getLayoutModeLabel(section.aiLayoutSuggestion.layoutMode)} / {getBalanceLabel(section.aiLayoutSuggestion.contentBalance)}
                        </div>
                        <div className="mt-1 flex flex-wrap gap-1.5">
                          <span className="ui-chip px-2 py-0.5 text-[10px]">
                            CTA {getIntensityLabel(section.aiLayoutSuggestion.ctaEmphasis)}
                          </span>
                          <span className="ui-chip px-2 py-0.5 text-[10px]">
                            余白 {section.aiLayoutSuggestion.spacingScale}
                          </span>
                          <span className="ui-chip px-2 py-0.5 text-[10px]">
                            カード {section.aiLayoutSuggestion.cardStyleHint ?? "auto"}
                          </span>
                        </div>
                      </div>
                    ) : null}
                  </div>
                ) : null}
                <InspectorSecondaryTabs
                  value={tab}
                  options={[
                    { key: "content", label: "Content" },
                    { key: "style", label: "Style" },
                    { key: "decoration", label: "Decoration" },
                    { key: "extensions", label: "Extensions" },
                  ]}
                  onChange={(next) => setTab(next)}
                />
              </div>
            ) : null}
          </div>
        }
      />

      <div className="min-h-0 flex-1 overflow-y-auto px-2 pb-3 pt-2">
        {resolvedScope === "page" ? (
          <>
            {core.project.layoutSuggestion ? (
              <div className="mb-3 rounded-md border border-[var(--ui-border)]/70 bg-[var(--surface-elevated)] px-3 py-3">
                <div className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-[var(--ui-muted)]">
                  AI Page Suggestion
                </div>
                <div className="text-[11px] text-[var(--ui-text)]">
                  {getPageMoodLabel(core.project.layoutSuggestion.pageMood)} / {core.project.layoutSuggestion.campaignFamily}
                </div>
                <div className="mt-1 flex flex-wrap gap-1.5">
                  {core.project.meta.campaignType ? (
                    <span className="ui-chip px-2 py-0.5 text-[10px]">
                      施策 {core.project.meta.campaignType}
                    </span>
                  ) : null}
                  {core.project.meta.structurePresetId ? (
                    <span className="ui-chip px-2 py-0.5 text-[10px]">
                      構造 {core.project.meta.structurePresetId}
                    </span>
                  ) : null}
                  <span className="ui-chip px-2 py-0.5 text-[10px]">
                    余白 {core.project.layoutSuggestion.spacingScale}
                  </span>
                  <span className="ui-chip px-2 py-0.5 text-[10px]">
                    密度 {core.project.layoutSuggestion.visualWeight}
                  </span>
                </div>
              </div>
            ) : null}
            <PageGlobalSettingsEditor
              pageStyle={core.pageStyle}
              pageBackground={core.project.settings?.backgrounds?.page}
              currentThemeId={core.project.themeSpec?.themeId}
              onPatchColors={core.setPageColors}
              onPatchSpacing={core.setPageSpacing}
              onPatchLayout={core.setPageLayout}
              onPatchBackground={core.setPageBackground}
              onApplyTheme={core.applyProjectTheme}
            />
          </>
        ) : null}

        {resolvedScope === "section" && tab === "content"
          ? section
            ? (
              <>
                <div className="mb-2 px-1 text-[10px] font-semibold uppercase tracking-wide text-[var(--ui-muted)]">
                  Content
                </div>
                {renderSectionSpecificEditor({ section, core })}
              </>
            )
            : null
          : null}

        {resolvedScope === "section" && tab === "style" && section ? (
          <>
            <div className="mb-2 px-1 text-[10px] font-semibold uppercase tracking-wide text-[var(--ui-muted)]">
              Style
            </div>
            <CommonSectionEditor
              section={section}
              disabled={core.isLocked}
              onPatchStyle={(patch) => core.updateSectionStyle(section.id, patch)}
              onPatchCardStyle={(patch) => core.updateSectionCardStyle(section.id, patch)}
              onApplyAll={() => {
                const card = section.sectionCardStyle;
                if (!card) {
                  return;
                }
                core.applySectionAppearanceToAll(section.style, card, {
                  excludeTypes: ["footerHtml"],
                });
              }}
            />
          </>
        ) : null}

        {resolvedScope === "section" && tab === "decoration" && section ? (
          <>
            <div className="mb-2 px-1 text-[10px] font-semibold uppercase tracking-wide text-[var(--ui-muted)]">
              Decoration
            </div>
            <div className="mb-2 px-1 text-[11px] text-[var(--ui-muted)]">
              見出し帯やアクセント色など、セクション装飾を調整します。
            </div>
            <SectionAppearanceEditor
              section={section}
              disabled={core.isLocked}
              onPatchData={(patch) => core.updateSectionData(section.id, patch)}
              syncTargetStoresLegacyFields={section.type === "targetStores"}
            />
            <div className="border-t border-[var(--ui-border)]/60 px-3 py-3">
              {section.type === "campaignPeriodBar" ? (
                <>
                  <div className="mb-2 text-[11px] font-semibold text-[var(--ui-text)]">
                    期間バーアニメーション
                  </div>
                  <div className="flex flex-col gap-2">
                    <label className="text-[11px] text-[var(--ui-muted)]">
                      プリセット
                      <select
                        className="ui-input mt-1 h-7 w-full text-[11px]"
                        value={String(
                          ((section.data as Record<string, unknown>).periodBarAnimation as {
                            preset?: string;
                          } | undefined)?.preset ?? "none"
                        )}
                        onChange={(event) => {
                          const current =
                            ((section.data as Record<string, unknown>).periodBarAnimation as {
                              durationMs?: number;
                              delayMs?: number;
                            } | undefined) ?? {};
                          const preset = event.target.value;
                          core.updateSectionData(section.id, {
                            periodBarAnimation:
                              preset === "none"
                                ? undefined
                                : {
                                    preset,
                                    durationMs: current.durationMs ?? 400,
                                    delayMs: current.delayMs ?? 0,
                                  },
                          });
                        }}
                        disabled={core.isLocked}
                      >
                        <option value="none">なし</option>
                        <option value="fade">fade</option>
                        <option value="slideUp">slideUp</option>
                        <option value="zoom">zoom</option>
                      </select>
                    </label>

                    {(() => {
                      const current =
                        ((section.data as Record<string, unknown>).periodBarAnimation as {
                          durationMs?: number;
                          delayMs?: number;
                        } | undefined) ?? undefined;
                      if (!current) {
                        return null;
                      }
                      return (
                        <>
                          <label className="text-[11px] text-[var(--ui-muted)]">
                            再生時間(ms)
                            <input
                              type="number"
                              className="ui-input mt-1 h-7 w-full text-[11px]"
                              min={100}
                              max={5000}
                              step={50}
                              value={current.durationMs ?? 400}
                              onChange={(event) => {
                                const value = Number(event.target.value);
                                core.updateSectionData(section.id, {
                                  periodBarAnimation: {
                                    ...current,
                                    durationMs: Number.isFinite(value) ? value : 400,
                                  },
                                });
                              }}
                              disabled={core.isLocked}
                            />
                          </label>
                          <label className="text-[11px] text-[var(--ui-muted)]">
                            遅延(ms)
                            <input
                              type="number"
                              className="ui-input mt-1 h-7 w-full text-[11px]"
                              min={0}
                              max={3000}
                              step={50}
                              value={current.delayMs ?? 0}
                              onChange={(event) => {
                                const value = Number(event.target.value);
                                core.updateSectionData(section.id, {
                                  periodBarAnimation: {
                                    ...current,
                                    delayMs: Number.isFinite(value) ? value : 0,
                                  },
                                });
                              }}
                              disabled={core.isLocked}
                            />
                          </label>
                        </>
                      );
                    })()}
                  </div>
                </>
              ) : section.type === "couponFlow" ? (
                <>
                  <div className="mb-2 text-[11px] font-semibold text-[var(--ui-text)]">
                    クーポンフローアニメーション
                  </div>
                  <div className="flex flex-col gap-2">
                    <label className="text-[11px] text-[var(--ui-muted)]">
                      プリセット
                      <select
                        className="ui-input mt-1 h-7 w-full text-[11px]"
                        value={String(
                          ((section.data as Record<string, unknown>).couponFlowAnimation as {
                            preset?: string;
                          } | undefined)?.preset ?? "none"
                        )}
                        onChange={(event) => {
                          const current =
                            ((section.data as Record<string, unknown>).couponFlowAnimation as {
                              durationMs?: number;
                              delayMs?: number;
                            } | undefined) ?? {};
                          const preset = event.target.value;
                          core.updateSectionData(section.id, {
                            couponFlowAnimation:
                              preset === "none"
                                ? undefined
                                : {
                                    preset,
                                    durationMs: current.durationMs ?? 500,
                                    delayMs: current.delayMs ?? 0,
                                  },
                          });
                        }}
                        disabled={core.isLocked}
                      >
                        <option value="none">なし</option>
                        <option value="fade">fade</option>
                        <option value="slideUp">slideUp</option>
                        <option value="zoom">zoom</option>
                      </select>
                    </label>

                    {(() => {
                      const current =
                        ((section.data as Record<string, unknown>).couponFlowAnimation as {
                          durationMs?: number;
                          delayMs?: number;
                        } | undefined) ?? undefined;
                      if (!current) {
                        return null;
                      }
                      return (
                        <>
                          <label className="text-[11px] text-[var(--ui-muted)]">
                            再生時間(ms)
                            <input
                              type="number"
                              className="ui-input mt-1 h-7 w-full text-[11px]"
                              min={100}
                              max={5000}
                              step={50}
                              value={current.durationMs ?? 500}
                              onChange={(event) => {
                                const value = Number(event.target.value);
                                core.updateSectionData(section.id, {
                                  couponFlowAnimation: {
                                    ...current,
                                    durationMs: Number.isFinite(value) ? value : 500,
                                  },
                                });
                              }}
                              disabled={core.isLocked}
                            />
                          </label>
                          <label className="text-[11px] text-[var(--ui-muted)]">
                            遅延(ms)
                            <input
                              type="number"
                              className="ui-input mt-1 h-7 w-full text-[11px]"
                              min={0}
                              max={3000}
                              step={50}
                              value={current.delayMs ?? 0}
                              onChange={(event) => {
                                const value = Number(event.target.value);
                                core.updateSectionData(section.id, {
                                  couponFlowAnimation: {
                                    ...current,
                                    delayMs: Number.isFinite(value) ? value : 0,
                                  },
                                });
                              }}
                              disabled={core.isLocked}
                            />
                          </label>
                        </>
                      );
                    })()}
                  </div>
                </>
              ) : (
                <div className="text-[11px] text-[var(--ui-muted)]">
                  このセクションには動作設定がありません。
                </div>
              )}
            </div>
          </>
        ) : null}

        {resolvedScope === "section" && tab === "extensions" && section ? (
          supportsSectionExtensions(section.type) ? (
            <>
              <div className="mb-2 px-1 text-[10px] font-semibold uppercase tracking-wide text-[var(--ui-muted)]">
                Extensions
              </div>
              <div className="mb-2 px-1 text-[11px] text-[var(--ui-muted)]">
                追加ボタンや補助画像など、任意ブロックを拡張できます。
              </div>
              <SectionExtensionsEditor
                section={section}
                disabled={core.isLocked}
                onPatchData={(patch) => core.updateSectionData(section.id, patch)}
              />
            </>
          ) : (
            <div className="rounded-md border border-[var(--ui-border)]/70 bg-[var(--surface-2)] px-3 py-3 text-[11px] text-[var(--ui-muted)]">
              このセクションは拡張ブロック非対応です。必要な編集は Content / Style / Decoration で行えます。
            </div>
          )
        ) : null}
      </div>
    </div>
  );
}
