"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  CAMPAIGN_BUILDER_HANDOFF_STORAGE_KEY,
  useCampaignStore,
} from "@/src/features/campaign/stores/useCampaignStore";
import { useEditorStore } from "@/src/store/editorStore";
import type { SectionContent } from "@/src/types/project";

const LP_STRUCTURE_TO_SECTION_TYPE: Partial<Record<string, string>> = {
  campaign_period: "campaignPeriodBar",
  campaign_overview: "campaignOverview",
  target_stores: "targetStores",
  faq: "tabbedNotes",
  notes: "legalNotes",
  cta: "contact",
};

const SECTION_TYPE_LABEL: Record<string, string> = {
  campaignPeriodBar: "キャンペーン期間",
  campaignOverview: "キャンペーン概要",
  targetStores: "対象店舗",
  tabbedNotes: "FAQ",
  legalNotes: "注意事項",
  contact: "CTA",
};

const hasEquivalentSection = (sectionType: string, existingTypes: Set<string>) => {
  if (sectionType === "contact") {
    return existingTypes.has("contact") || existingTypes.has("footerHtml");
  }
  if (sectionType === "tabbedNotes") {
    return existingTypes.has("tabbedNotes") || existingTypes.has("faq");
  }
  return existingTypes.has(sectionType);
};

const formatDateTime = (value: string) => {
  if (!value) {
    return "";
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "";
  }
  return date.toLocaleString("ja-JP", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const formatYmd = (value: string) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "";
  }
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}/${m}/${d}`;
};

const compactLines = (values: Array<string | undefined>) =>
  values
    .map((entry) => entry?.trim() ?? "")
    .filter((entry) => entry.length > 0);

const CAMPAIGN_TYPE_LABEL: Record<string, string> = {
  reward: "還元",
  coupon: "クーポン",
  lottery: "抽選",
  quick_chance: "抽選",
  municipality: "自治体",
  collaboration: "コラボ",
};

const REWARD_TYPE_LABEL: Record<string, string> = {
  points: "ポイント還元",
  discount: "割引",
  cashback: "キャッシュバック",
  gift: "特典",
};

const createDraftItemId = () =>
  `handoff_item_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;

const createDraftLineId = () =>
  `handoff_line_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;

const buildOverviewSummaryLine = (input: {
  rewardValue?: string;
  rewardType?: string;
  campaignType?: string;
  campaignName?: string;
  brandName?: string;
}) => {
  const rewardValue = input.rewardValue?.trim() ?? "";
  const rewardTypeLabel = REWARD_TYPE_LABEL[input.rewardType ?? ""] ?? "特典";
  const campaignTypeLabel = CAMPAIGN_TYPE_LABEL[input.campaignType ?? ""] ?? "キャンペーン";
  const name = input.campaignName?.trim() || input.brandName?.trim() || "今回";

  if (rewardValue) {
    return `最大${rewardValue}の${rewardTypeLabel}が受けられる${campaignTypeLabel}です。`;
  }
  return `${name}のおトクな${campaignTypeLabel}です。`;
};

const buildNewSectionDraftPatch = (
  sectionType: string,
  sectionData: Record<string, unknown> | undefined,
  handoff: NonNullable<ReturnType<typeof useCampaignStore.getState>["builderHandoff"]>,
) => {
  const input = handoff.sourceInput;
  const periodStart = input.periodStart?.trim() ?? "";
  const periodEnd = input.periodEnd?.trim() ?? "";
  const periodStartLabel = formatYmd(periodStart);
  const periodEndLabel = formatYmd(periodEnd);
  const periodText =
    periodStartLabel && periodEndLabel
      ? `${periodStartLabel} - ${periodEndLabel}`
      : periodStartLabel || periodEndLabel || "";

  if (sectionType === "campaignPeriodBar") {
    return {
      dataPatch: {
        periodLabel: "キャンペーン期間",
        startDate: periodStart || undefined,
        endDate: periodEnd || undefined,
        periodBarText: periodText,
      },
    };
  }

  if (sectionType === "campaignOverview") {
    const summaryLine = buildOverviewSummaryLine({
      rewardValue: input.rewardValue,
      rewardType: input.rewardType,
      campaignType: input.campaignType,
      campaignName: input.campaignName,
      brandName: input.brandName,
    });
    const conditionLine = input.conditions?.trim()
      ? `${input.conditions.trim()}で対象です。`
      : "対象条件はキャンペーン詳細をご確認ください。";
    const noticeLines = compactLines([
      input.limit?.trim() ? `上限: ${input.limit.trim()}` : undefined,
      "詳細条件はキャンペーンページをご確認ください。",
    ]);

    const contentPatch: Partial<SectionContent> = {
      title: "キャンペーン概要",
      items: [
        {
          id: createDraftItemId(),
          type: "text",
          lines: [summaryLine, conditionLine].map((text) => ({
            id: createDraftLineId(),
            text,
            marks: { bold: true, textAlign: "center" },
          })),
        },
        {
          id: createDraftItemId(),
          type: "text",
          lines: noticeLines.map((text) => ({
            id: createDraftLineId(),
            text,
            marks: { callout: { enabled: true, variant: "note" } },
          })),
        },
      ],
    };

    return {
      dataPatch: {
        title: "キャンペーン概要",
        body: [summaryLine, conditionLine].join("\n"),
        noticeLines,
      },
      contentPatch,
    };
  }

  if (sectionType === "legalNotes") {
    const legalItems = compactLines([
      input.conditions?.trim() ? `条件: ${input.conditions.trim()}` : undefined,
      input.limit?.trim() ? `上限: ${input.limit.trim()}` : undefined,
      "詳細条件はキャンペーンページをご確認ください。",
    ]);
    return {
      dataPatch: {
        title: "注意事項",
        items: legalItems,
      },
    };
  }

  if (sectionType === "contact") {
    const buttonLabel = handoff.cta?.trim() || "今すぐ参加";
    return {
      dataPatch: {
        title: "キャンペーンに参加する",
        description:
          input.campaignName?.trim() || input.brandName?.trim()
            ? `${input.campaignName?.trim() || input.brandName?.trim()}の参加ページからお申し込みください。`
            : "参加ページからお申し込みください。",
        buttonLabel,
      },
    };
  }

  if (sectionType === "targetStores") {
    return {
      dataPatch: {
        title: "対象店舗",
        note: "対象店舗は順次更新されます。",
        description: "条件を指定して対象店舗を検索できます。",
      },
    };
  }

  if (sectionType === "tabbedNotes") {
    const currentTabs = Array.isArray(sectionData?.tabs)
      ? (sectionData?.tabs as Array<Record<string, unknown>>)
      : [];
    const firstTabId =
      typeof currentTabs[0]?.id === "string" && currentTabs[0].id.trim().length > 0
        ? currentTabs[0].id
        : "tab_campaign_faq_seed";

    return {
      dataPatch: {
        title: "FAQ",
        initialTabIndex: 0,
        tabs: [
          {
            id: firstTabId,
            label: "対象条件",
            contentTitle: "",
            notes: [
              "Q. キャンペーンの対象条件は？",
              "A. 詳細は各条件をご確認ください。",
            ],
          },
        ],
      },
    };
  }

  return null;
};

export default function CampaignHandoffPanel() {
  const router = useRouter();
  const handoff = useCampaignStore((state) => state.builderHandoff);
  const refreshBuilderHandoff = useCampaignStore((state) => state.refreshBuilderHandoff);
  const saveCreativeDirectionForBuilder = useCampaignStore(
    (state) => state.saveCreativeDirectionForBuilder,
  );
  const layoutSections = useEditorStore((state) => state.getActiveLayoutDocument().sections);
  const updateSectionData = useEditorStore((state) => state.updateSectionData);
  const updateSectionContent = useEditorStore((state) => state.updateSectionContent);
  const insertSectionAfter = useEditorStore((state) => state.insertSectionAfter);
  const [dismissed, setDismissed] = useState(false);
  const [isClientReady, setIsClientReady] = useState(false);
  const [isApplyingHero, setIsApplyingHero] = useState(false);
  const [isAddingSections, setIsAddingSections] = useState(false);
  const [isSavingDirection, setIsSavingDirection] = useState(false);
  const [isCreatingDraft, setIsCreatingDraft] = useState(false);
  const [actionMessage, setActionMessage] = useState<{
    kind: "success" | "error" | "info";
    text: string;
  } | null>(null);

  useEffect(() => {
    setIsClientReady(true);
  }, []);

  useEffect(() => {
    refreshBuilderHandoff();
  }, [refreshBuilderHandoff]);

  useEffect(() => {
    const onStorage = (event: StorageEvent) => {
      if (event.key !== CAMPAIGN_BUILDER_HANDOFF_STORAGE_KEY) {
        return;
      }
      refreshBuilderHandoff();
      setDismissed(false);
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, [refreshBuilderHandoff]);

  const generatedAtLabel = useMemo(
    () => formatDateTime(handoff?.generatedAt ?? ""),
    [handoff?.generatedAt],
  );

  const hasHeroSection = useMemo(
    () => layoutSections.some((section) => section.type === "heroImage"),
    [layoutSections],
  );

  const applyHeroCopy = ({ silent = false }: { silent?: boolean } = {}) => {
    if (!handoff) {
      return false;
    }
    const heroSection = useEditorStore
      .getState()
      .getActiveLayoutDocument()
      .sections.find((section) => section.type === "heroImage");
    if (!heroSection) {
      if (!silent) {
        setActionMessage({
          kind: "error",
          text: "Main Visual セクションが見つからないため、Heroコピーを反映できません。",
        });
      }
      return false;
    }
    setIsApplyingHero(true);
    updateSectionData(heroSection.id, {
      title: handoff.heroHeadline,
      subtitle: handoff.heroSubcopy,
      ctaText: handoff.cta,
    });
    setIsApplyingHero(false);
    if (!silent) {
      setActionMessage({
        kind: "success",
        text: "Heroコピーを Main Visual に反映しました。",
      });
    }
    return true;
  };

  const addRecommendedSections = ({ silent = false }: { silent?: boolean } = {}) => {
    if (!handoff) {
      return [] as Array<{ id: string; type: string; data?: Record<string, unknown> }>;
    }
    setIsAddingSections(true);
    const currentSections = useEditorStore.getState().getActiveLayoutDocument().sections;
    const existingTypes = new Set(currentSections.map((section) => section.type));

    const mapped = handoff.lpStructure
      .map((key) => LP_STRUCTURE_TO_SECTION_TYPE[key])
      .filter((value): value is string => Boolean(value));

    const targetTypes: string[] = [];
    for (const sectionType of mapped) {
      if (targetTypes.includes(sectionType)) {
        continue;
      }
      if (hasEquivalentSection(sectionType, existingTypes)) {
        continue;
      }
      targetTypes.push(sectionType);
      existingTypes.add(sectionType);
    }

    if (targetTypes.length === 0) {
      setIsAddingSections(false);
      if (!silent) {
        setActionMessage({
          kind: "info",
          text: "追加対象の基本構成はすでに揃っています。",
        });
      }
      return [] as Array<{ id: string; type: string; data?: Record<string, unknown> }>;
    }

    const heroSectionId = currentSections.find((section) => section.type === "heroImage")?.id;
    if (heroSectionId) {
      [...targetTypes].reverse().forEach((sectionType) => {
        insertSectionAfter(heroSectionId, sectionType);
      });
    } else {
      targetTypes.forEach((sectionType) => {
        insertSectionAfter(undefined, sectionType);
      });
    }

    const afterSections = useEditorStore.getState().getActiveLayoutDocument().sections;
    const expectedIds = new Set(targetTypes);
    const newSections = afterSections.filter(
      (section) => expectedIds.has(section.type) && !currentSections.some((current) => current.id === section.id),
    );

    setIsAddingSections(false);
    if (!silent) {
      setActionMessage({
        kind: "success",
        text: `基本構成を追加しました（${targetTypes
          .map((type) => SECTION_TYPE_LABEL[type] ?? type)
          .join(" / ")}）。`,
      });
    }
    return newSections;
  };

  const initializeDraftContent = (
    sections: Array<{ id: string; type: string; data?: Record<string, unknown> }>,
    { silent = false }: { silent?: boolean } = {},
  ) => {
    if (!handoff || sections.length === 0) {
      return false;
    }

    sections.forEach((section) => {
      const draftPatch = buildNewSectionDraftPatch(section.type, section.data, handoff);
      if (!draftPatch) {
        return;
      }
      if (draftPatch.dataPatch) {
        updateSectionData(section.id, draftPatch.dataPatch);
      }
      if (draftPatch.contentPatch) {
        updateSectionContent(section.id, draftPatch.contentPatch);
      }
    });

    if (!silent) {
      setActionMessage({
        kind: "success",
        text: "追加したセクションにドラフトを初期化しました。",
      });
    }
    return true;
  };

  const saveDirection = ({ silent = false }: { silent?: boolean } = {}) => {
    setIsSavingDirection(true);
    const ok = saveCreativeDirectionForBuilder();
    setIsSavingDirection(false);
    if (!ok) {
      if (!silent) {
        setActionMessage({
          kind: "error",
          text: "保存対象の creativeDirection がありません。",
        });
      }
      return false;
    }
    if (!silent) {
      setActionMessage({
        kind: "success",
        text: "MV生成方針を保存しました。次の AI Main Visual 生成で再利用できます。",
      });
    }
    return true;
  };

  const createLpDraft = () => {
    if (!handoff) {
      return;
    }
    setIsCreatingDraft(true);

    applyHeroCopy({ silent: true });
    const newSections = addRecommendedSections({ silent: true });
    initializeDraftContent(newSections, { silent: true });
    saveDirection({ silent: true });

    setIsCreatingDraft(false);
    setActionMessage({
      kind: "success",
      text: "LP草案を作成しました。Builderで編集できます。",
    });
  };

  if (!isClientReady || !handoff || dismissed) {
    return null;
  }

  const summary = handoff.sourceInput;

  return (
    <section className="border-b border-[var(--ui-border)] bg-[var(--surface)] px-3 py-3">
      <div className="rounded-lg border border-[var(--ui-border)] bg-[var(--ui-panel)] p-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <div className="inline-flex items-center rounded-full border border-[var(--ui-border)] bg-[var(--surface-2)] px-2 py-0.5 text-[10px] font-semibold text-[var(--ui-muted)]">
              Campaign Handoff
            </div>
            <h2 className="mt-1 text-[13px] font-semibold text-[var(--ui-text)]">Builder Preview</h2>
            {generatedAtLabel ? (
              <p className="mt-0.5 text-[10px] text-[var(--ui-muted)]">生成日時: {generatedAtLabel}</p>
            ) : null}
          </div>
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              className="h-7 rounded border border-[var(--ui-border)] px-2.5 text-[11px] text-[var(--ui-text)] transition-colors hover:bg-[color-mix(in_srgb,var(--ui-text)_8%,transparent)]"
              onClick={() => router.push("/campaign")}
            >
              Campaignへ戻る
            </button>
            <button
              type="button"
              className="h-7 rounded border border-[var(--ui-border)] px-2.5 text-[11px] text-[var(--ui-muted)] transition-colors hover:bg-[color-mix(in_srgb,var(--ui-text)_8%,transparent)]"
              onClick={() => setDismissed(true)}
            >
              閉じる
            </button>
          </div>
        </div>

        <div className="mt-3 grid gap-3 lg:grid-cols-2">
          <section className="rounded border border-[var(--ui-border)] bg-[var(--surface-2)] p-2.5">
            <h3 className="text-[11px] font-semibold text-[var(--ui-text)]">Campaign Summary</h3>
            <div className="mt-2 grid gap-1 text-[11px] text-[var(--ui-text)] sm:grid-cols-2">
              <div><span className="text-[var(--ui-muted)]">campaignName:</span> {summary.campaignName}</div>
              <div><span className="text-[var(--ui-muted)]">brandName:</span> {summary.brandName}</div>
              <div><span className="text-[var(--ui-muted)]">industry:</span> {summary.industry}</div>
              <div><span className="text-[var(--ui-muted)]">campaignType:</span> {summary.campaignType}</div>
              <div><span className="text-[var(--ui-muted)]">goal:</span> {summary.goal}</div>
            </div>
          </section>

          <section className="rounded border border-[var(--ui-border)] bg-[var(--surface-2)] p-2.5">
            <h3 className="text-[11px] font-semibold text-[var(--ui-text)]">Proposed Structure</h3>
            <ol className="mt-2 space-y-1 text-[11px] text-[var(--ui-text)]">
              {handoff.lpStructure.map((entry, index) => (
                <li key={`${entry}_${index}`} className="flex items-center gap-2">
                  <span className="inline-flex h-4.5 w-4.5 items-center justify-center rounded-full bg-[var(--ui-primary)]/15 text-[10px] font-semibold text-[var(--ui-primary)]">
                    {index + 1}
                  </span>
                  <span>{entry}</span>
                </li>
              ))}
            </ol>
          </section>

          <section className="rounded border border-[var(--ui-border)] bg-[var(--surface-2)] p-2.5">
            <h3 className="text-[11px] font-semibold text-[var(--ui-text)]">Hero Copy Draft</h3>
            <div className="mt-2 grid gap-1.5 text-[11px] text-[var(--ui-text)]">
              <div>
                <div className="text-[10px] text-[var(--ui-muted)]">heroHeadline</div>
                <div className="mt-0.5">{handoff.heroHeadline}</div>
              </div>
              <div>
                <div className="text-[10px] text-[var(--ui-muted)]">heroSubcopy</div>
                <div className="mt-0.5">{handoff.heroSubcopy}</div>
              </div>
              <div>
                <div className="text-[10px] text-[var(--ui-muted)]">cta</div>
                <div className="mt-0.5">{handoff.cta}</div>
              </div>
            </div>
          </section>

          <section className="rounded border border-[var(--ui-border)] bg-[var(--surface-2)] p-2.5">
            <h3 className="text-[11px] font-semibold text-[var(--ui-text)]">Creative Direction</h3>
            <div className="mt-2 grid gap-1 text-[11px] text-[var(--ui-text)]">
              <div><span className="text-[var(--ui-muted)]">tone:</span> {handoff.creativeDirection.tone}</div>
              <div><span className="text-[var(--ui-muted)]">style:</span> {handoff.creativeDirection.style}</div>
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="text-[var(--ui-muted)]">preferredStrategies:</span>
                {handoff.creativeDirection.preferredStrategies.map((entry) => (
                  <span key={entry} className="rounded-full border border-[var(--ui-border)] px-2 py-0.5 text-[10px] text-[var(--ui-text)]">
                    {entry}
                  </span>
                ))}
              </div>
            </div>
          </section>
        </div>

        <section className="mt-3 rounded border border-[var(--ui-border)] bg-[var(--surface-2)] p-2.5">
          <h3 className="text-[11px] font-semibold text-[var(--ui-text)]">Builder Actions</h3>
          <div className="mt-2 rounded border border-[var(--ui-border)] bg-[var(--ui-panel)] p-2">
            <p className="text-[11px] font-semibold text-[var(--ui-text)]">LP草案を作成</p>
            <p className="mt-0.5 text-[10px] text-[var(--ui-muted)]">
              キャンペーン内容からLPの草案を作成します。
            </p>
            <button
              type="button"
              disabled={isCreatingDraft || isApplyingHero || isAddingSections || isSavingDirection}
              className="mt-2 h-8 rounded bg-[var(--ui-primary)] px-3 text-[11px] font-semibold text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-45"
              onClick={createLpDraft}
            >
              {isCreatingDraft ? "作成中..." : "LP草案を作成"}
            </button>
          </div>
          <div className="mt-2 flex flex-wrap items-center gap-1.5">
            <button
              type="button"
              disabled={!hasHeroSection || isApplyingHero}
              className="h-7 rounded border border-[var(--ui-border)] px-2.5 text-[11px] text-[var(--ui-text)] transition-colors hover:bg-[color-mix(in_srgb,var(--ui-text)_8%,transparent)] disabled:cursor-not-allowed disabled:opacity-45"
              onClick={() => {
                applyHeroCopy();
              }}
            >
              {isApplyingHero ? "反映中..." : "Heroコピーを反映"}
            </button>
            <button
              type="button"
              disabled={isAddingSections}
              className="h-7 rounded border border-[var(--ui-border)] px-2.5 text-[11px] text-[var(--ui-text)] transition-colors hover:bg-[color-mix(in_srgb,var(--ui-text)_8%,transparent)] disabled:cursor-not-allowed disabled:opacity-45"
              onClick={() => {
                const sections = addRecommendedSections();
                initializeDraftContent(sections);
              }}
            >
              {isAddingSections ? "追加中..." : "基本構成を追加"}
            </button>
            <button
              type="button"
              disabled={isSavingDirection}
              className="h-7 rounded border border-[var(--ui-border)] px-2.5 text-[11px] text-[var(--ui-text)] transition-colors hover:bg-[color-mix(in_srgb,var(--ui-text)_8%,transparent)] disabled:cursor-not-allowed disabled:opacity-45"
              onClick={() => {
                saveDirection();
              }}
            >
              {isSavingDirection ? "保存中..." : "MV生成方針を保存"}
            </button>
          </div>
          {!hasHeroSection ? (
            <p className="mt-2 text-[10px] text-amber-600">
              Main Visual セクションが存在しないため、Heroコピー反映は利用できません。
            </p>
          ) : null}
          {actionMessage ? (
            <p
              className={`mt-2 text-[10px] ${
                actionMessage.kind === "error"
                  ? "text-rose-600"
                  : actionMessage.kind === "success"
                  ? "text-emerald-600"
                  : "text-[var(--ui-muted)]"
              }`}
            >
              {actionMessage.text}
            </p>
          ) : null}
        </section>
      </div>
    </section>
  );
}
