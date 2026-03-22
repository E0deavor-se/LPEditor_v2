/* ───────────────────────────────────────────────
   useInspectorCore
   Inspector 共通の Store 接続 + 派生ステートを集約。
   InspectorPanel / LayoutV2Inspector 両方から利用可能。
   ─────────────────────────────────────────────── */

import { useMemo } from "react";
import { useShallow } from "zustand/react/shallow";
import { useEditorStore, type EditorUIState } from "@/src/store/editorStore";
import { useI18n } from "@/src/i18n";
import { getLayoutSections } from "@/src/lib/editorProject";
import type {
  ContentItem,
  PageBaseStyle,
  SectionBase,
} from "@/src/types/project";

/* ---------- Store selector (42+ actions) ---------- */

const storeSelector = (state: EditorUIState) => ({
  selected: state.selected,
  project: state.project,
  uiMode: state.uiMode,
  selectedItemId: state.selectedItemId,
  selectedLineId: state.selectedLineId,
  selectedImageIds: state.selectedImageIds,

  // Page setters
  setPageTypography: state.setPageTypography,
  setPageColors: state.setPageColors,
  setPageSpacing: state.setPageSpacing,
  setPageLayout: state.setPageLayout,
  applyProjectTheme: state.applyProjectTheme,
  setPageSectionAnimation: state.setPageSectionAnimation,
  setPageBackground: state.setPageBackground,
  setMvBackground: state.setMvBackground,
  setPageMeta: state.setPageMeta,

  // Section content actions
  updateSectionContent: state.updateSectionContent,
  updateSectionData: state.updateSectionData,
  updateSectionStyle: state.updateSectionStyle,
  updateSectionCardStyle: state.updateSectionCardStyle,
  updateTargetStoresContent: state.updateTargetStoresContent,
  addContentItem: state.addContentItem,
  removeContentItem: state.removeContentItem,
  reorderContentItems: state.reorderContentItems,

  // Text line actions
  reorderTextLines: state.reorderTextLines,
  addTextLine: state.addTextLine,
  removeTextLine: state.removeTextLine,
  updateTextLineText: state.updateTextLineText,
  updateTextLineMarks: state.updateTextLineMarks,
  updateContentItemText: state.updateContentItemText,
  updateTitleItemText: state.updateTitleItemText,
  updateTitleItemMarks: state.updateTitleItemMarks,
  updateTextLineAnimation: state.updateTextLineAnimation,

  // Image actions
  addImageToItem: state.addImageToItem,
  removeImageFromItem: state.removeImageFromItem,
  updateImageInItem: state.updateImageInItem,
  setImageItemLayout: state.setImageItemLayout,
  updateImageAnimation: state.updateImageAnimation,

  // Button / animation / style
  updateButtonItem: state.updateButtonItem,
  updateContentItemAnimation: state.updateContentItemAnimation,
  applyLineMarksToAllLines: state.applyLineMarksToAllLines,
  promoteLineMarksToSectionTypography: state.promoteLineMarksToSectionTypography,
  applyCalloutToSelection: state.applyCalloutToSelection,
  applySectionAppearanceToAll: state.applySectionAppearanceToAll,

  // Selection
  setSelectedSection: state.setSelectedSection,
  setSelectedItemId: state.setSelectedItemId,
  setSelectedLineId: state.setSelectedLineId,
  setSelectedImageIds: state.setSelectedImageIds,

  // Section ops
  toggleSectionLocked: state.toggleSectionLocked,
  toggleSectionVisible: state.toggleSectionVisible,
  duplicateSection: state.duplicateSection,
  deleteSection: state.deleteSection,
  renameSection: state.renameSection,

  // Assets / CSV
  addAsset: state.addAsset,
  csvImportDraft: state.csvImportDraft,
  isCsvImportModalOpen: state.isCsvImportModalOpen,
  setCsvImportDraft: state.setCsvImportDraft,
  setCsvImportModalOpen: state.setCsvImportModalOpen,
});

/* ---------- Hook ---------- */

export function useInspectorCore() {
  const t = useI18n();
  const store = useEditorStore(useShallow(storeSelector));

  /* ---- selectedSection ---- */
  const selectedSection = useMemo(() => {
    if (store.selected.kind !== "section") return undefined;
    const sId = store.selected.id;
    return getLayoutSections(store.project).find(
      (s: SectionBase) => s.id === sId,
    );
  }, [store.project, store.selected]);

  /* ---- page-level derived ---- */
  const pageStyle = store.project.pageBaseStyle as PageBaseStyle;
  const pageMeta = store.project.settings?.pageMeta;

  /* ---- selection flags ---- */
  const isPageSelection = store.selected.kind === "page";
  const isSection = store.selected.kind === "section" && Boolean(selectedSection);
  const isSimpleMode = store.uiMode === "simple";
  const isLocked = Boolean(selectedSection?.locked);
  const isVisible = Boolean(selectedSection?.visible ?? true);

  /* ---- section type flags ---- */
  const sectionType = selectedSection?.type ?? "";
  const isBrandBar = sectionType === "brandBar";
  const isHeroImage = sectionType === "heroImage";
  const isImageOnly = sectionType === "imageOnly";
  const isTargetStores = sectionType === "targetStores";
  const isExcludedStoresList = sectionType === "excludedStoresList";
  const isExcludedBrandsList = sectionType === "excludedBrandsList";
  const isLegalNotes = sectionType === "legalNotes";
  const isInquiry = sectionType === "footerHtml";
  const isCampaignPeriodBar = sectionType === "campaignPeriodBar";
  const isCampaignOverview = sectionType === "campaignOverview";
  const isCouponFlow = sectionType === "couponFlow";
  const isRankingTable = sectionType === "rankingTable";
  const isPaymentHistoryGuide = sectionType === "paymentHistoryGuide";
  const isTabbedNotes = sectionType === "tabbedNotes";

  /* ---- composite flags ---- */
  const isStoreCsvSection =
    isTargetStores || isExcludedStoresList || isExcludedBrandsList;
  const isItemlessSection =
    isBrandBar || isHeroImage || isCampaignPeriodBar || isImageOnly;
  const hideStyleTab =
    isBrandBar || isHeroImage || isImageOnly || (isSimpleMode && isSection);

  /* ---- content items ---- */
  const contentItems = (selectedSection?.content?.items ?? []) as ContentItem[];
  const selectedItem =
    contentItems.find((item) => item.id === store.selectedItemId) ??
    contentItems[0];
  const selectedTitleItem =
    selectedItem?.type === "title" ? selectedItem : undefined;
  const selectedTextItem =
    selectedItem?.type === "text" ? selectedItem : undefined;
  const selectedImageItem =
    selectedItem?.type === "image" ? selectedItem : undefined;
  const selectedButtonItem =
    selectedItem?.type === "button" ? selectedItem : undefined;
  const selectedLine =
    selectedTextItem?.lines.find((l) => l.id === store.selectedLineId) ??
    selectedTextItem?.lines[0];
  const titleItem = contentItems.find((item) => item.type === "title");

  /* ---- breadcrumb / targetName ---- */
  const breadcrumb = useMemo(() => {
    const sectionLabel =
      selectedSection?.name ?? t.inspector.breadcrumb.untitled;
    const lineLabel = selectedLine?.text?.trim();
    const itemLabel = selectedItem
      ? (
          {
            title: t.inspector.section.itemTypes.title,
            text: t.inspector.section.itemTypes.text,
            image: t.inspector.section.itemTypes.image,
            button: t.inspector.section.itemTypes.button,
          } as Record<string, string>
        )[selectedItem.type] ?? t.inspector.breadcrumb.block
      : t.inspector.breadcrumb.block;
    const elementLabel = lineLabel || itemLabel;

    if (store.selected.kind === "page") return [t.inspector.breadcrumb.page];
    if (store.selected.kind === "section" && selectedSection)
      return [t.inspector.breadcrumb.page, sectionLabel];
    if (store.selected.kind === "block")
      return [t.inspector.breadcrumb.page, sectionLabel, elementLabel];
    return [t.inspector.breadcrumb.page];
  }, [store.selected, selectedItem, selectedLine, selectedSection, t]);

  const targetName =
    breadcrumb[breadcrumb.length - 1] ?? t.inspector.breadcrumb.page;

  const sectionOptions = getLayoutSections(store.project).map((section: SectionBase) => ({
    value: section.id,
    label: section.name ?? section.type,
  }));

  const canSelectSection = getLayoutSections(store.project).length > 0;
  const canSelectElement =
    contentItems.length > 0 && Boolean(selectedSection);

  return {
    // Pass-through store actions
    ...store,

    // Derived state
    selectedSection,
    pageStyle,
    pageMeta,

    // Selection flags
    isPageSelection,
    isSection,
    isSimpleMode,
    isLocked,
    isVisible,

    // Section type flags
    sectionType,
    isBrandBar,
    isHeroImage,
    isImageOnly,
    isTargetStores,
    isExcludedStoresList,
    isExcludedBrandsList,
    isLegalNotes,
    isInquiry,
    isCampaignPeriodBar,
    isCampaignOverview,
    isCouponFlow,
    isRankingTable,
    isPaymentHistoryGuide,
    isTabbedNotes,

    // Composite flags
    isStoreCsvSection,
    isItemlessSection,
    hideStyleTab,

    // Content items
    contentItems,
    selectedItem,
    selectedTitleItem,
    selectedTextItem,
    selectedImageItem,
    selectedButtonItem,
    selectedLine,
    titleItem,

    // Header helpers
    breadcrumb,
    targetName,
    sectionOptions,
    canSelectSection,
    canSelectElement,

    // i18n
    t,
  } as const;
}

export type InspectorCoreState = ReturnType<typeof useInspectorCore>;
