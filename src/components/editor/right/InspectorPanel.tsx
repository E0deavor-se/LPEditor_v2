"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { CSSProperties } from "react";
import {
  ArrowDown,
  ArrowUp,
  ChevronDown,
  Eye,
  GripVertical,
  LayoutGrid,
  MoreHorizontal,
  MousePointerClick,
  RotateCcw,
  Sparkles,
  Trash2,
  Type,
} from "lucide-react";
import {
  DndContext,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import type { DragEndEvent } from "@dnd-kit/core";
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useShallow } from "zustand/shallow";
import { useEditorStore, type EditorUIState } from "@/src/store/editorStore";
import InspectorHeader from "@/src/components/editor/right/InspectorHeader";
import InspectorTabs from "@/src/components/editor/right/InspectorTabs";
import ColorField from "@/src/components/editor/right/primitives/ColorField";
import FieldRow from "@/src/components/editor/right/primitives/FieldRow";
import NumberField from "@/src/components/editor/right/primitives/NumberField";
import SegmentedField from "@/src/components/editor/right/primitives/SegmentedField";
import SelectField from "@/src/components/editor/right/primitives/SelectField";
import ToggleField from "@/src/components/editor/right/primitives/ToggleField";
import PageStyleTypography from "@/src/components/editor/right/groups/PageStyleTypography";
import PageStyleColors from "@/src/components/editor/right/groups/PageStyleColors";
import PageStyleSpacing from "@/src/components/editor/right/groups/PageStyleSpacing";
import PageStyleLayout from "@/src/components/editor/right/groups/PageStyleLayout";
import PageStyleBackground from "@/src/components/editor/right/groups/PageStyleBackground";
import PageStyleSectionAnimation from "@/src/components/editor/right/groups/PageStyleSectionAnimation";
import PageMetaPanel from "./groups/PageMetaPanel";
import Accordion from "@/src/components/editor/right/primitives/Accordion";
import SectionCardPresetGallery from "@/src/components/editor/right/section/SectionCardPresetGallery";
import SectionStylePanel from "@/src/components/editor/right/section/SectionStylePanel";
import TextLineList from "@/src/components/editor/right/section/TextLineList";
import PrimaryLineEditor from "@/src/components/editor/right/section/PrimaryLineEditor";
import RichTextInput from "@/src/components/editor/right/section/RichTextInput";
import CsvImportPreviewModal from "@/src/components/editor/right/section/CsvImportPreviewModal";
import type {
  BackgroundSpec,
  ContentItem,
  ContentItemAnimation,
  ImageItem,
  ImageContentItem,
  ButtonContentItem,
  LegalNoteItem,
  PageBaseStyle,
  PrimaryLine,
  SectionBase,
  SectionCardPresetId,
  SectionStyle,
  SectionStylePatch,
  TextContentItem,
} from "@/src/types/project";
import { useI18n } from "@/src/i18n";
import { parseCsv } from "@/src/lib/csv";
import { buildCsvImportPreview } from "@/src/lib/csv/importSummary";
import {
  getStableLabelColor,
  getUniqueLabelColorMap,
} from "@/src/lib/stores/labelColors";
import {
  getSectionCardPreset,
  DEFAULT_SECTION_CARD_STYLE,
} from "@/src/lib/sections/sectionCardPresets";

const DEFAULT_PAGE_STYLE: PageBaseStyle = {
  typography: {
    fontFamily: "system-ui",
    baseSize: 16,
    lineHeight: 1.6,
    letterSpacing: 0,
    fontWeight: 400,
  },
  sectionAnimation: {
    type: "none",
    trigger: "onView",
    speed: 500,
    easing: "ease-out",
  },
  colors: {
    background: "#ffffff",
    text: "#111111",
    accent: "#1f6feb",
    border: "#e5e7eb",
  },
  spacing: {
    sectionPadding: {
      t: 32,
      r: 24,
      b: 32,
      l: 24,
    },
    sectionGap: 24,
  },
  layout: {
    maxWidth: 1200,
    align: "center",
    radius: 12,
    shadow: "sm",
  },
};

const TRUTHY_TOKENS = new Set([
  "対象",
  "〇",
  "○",
  "はい",
  "yes",
  "y",
  "true",
  "1",
  "on",
]);

type RankingRow = {
  id: string;
  values: string[];
};

type RankingColumn = {
  key: string;
  label: string;
};

type TabbedNotesItem = {
  id: string;
  text: string;
  bullet: "none" | "disc";
  tone: "normal" | "accent";
  bold: boolean;
  subItems: string[];
};

type TabbedNotesTab = {
  id: string;
  labelTop: string;
  labelBottom: string;
  intro: string;
  items: TabbedNotesItem[];
  footnote: string;
  ctaText: string;
  ctaLinkText: string;
  ctaLinkUrl: string;
  ctaTargetKind: "section" | "url";
  ctaSectionId: string;
  ctaImageUrl: string;
  ctaImageAlt: string;
  ctaImageAssetId: string;
  buttonText: string;
  buttonTargetKind: "section" | "url";
  buttonUrl: string;
  buttonSectionId: string;
};

type TabbedNotesStyle = {
  variant: "simple" | "sticky" | "underline" | "popout";
  inactiveBg: string;
  inactiveText: string;
  activeBg: string;
  activeText: string;
  border: string;
  contentBg: string;
  contentBorder: string;
  accent: string;
};

const isTruthyStoreFlag = (value: string) => {
  const normalized = value
    .normalize("NFKC")
    .trim()
    .toLowerCase();
  if (!normalized) {
    return false;
  }
  return TRUTHY_TOKENS.has(normalized);
};

type TabKey = "style" | "content" | "advanced";

const SIMPLE_GUIDE_STEPS = [
  {
    title: "1. セクションを確認",
    body: "左の一覧で並び順と表示を整えます。",
  },
  {
    title: "2. テキストを差し替え",
    body: "プレビューの文章をクリックして内容を編集します。",
  },
  {
    title: "3. 画像を差し替え",
    body: "画像エリアを選択して画像を入れ替えます。",
  },
  {
    title: "4. 仕上げと書き出し",
    body: "色・余白を調整したらZIPを書き出します。",
  },
];

export default function InspectorPanel() {
  const t = useI18n();
  const [activeTab, setActiveTab] = useState<TabKey>("style");
  const [isContentCardOpen, setIsContentCardOpen] = useState(false);
  const [isQuickStyleOpen, setIsQuickStyleOpen] = useState(false);
  const [isAnimationsOpen, setIsAnimationsOpen] = useState(false);
  const [isStoreDesignOpen, setIsStoreDesignOpen] = useState(false);
  const [isSimpleGuideOpen, setIsSimpleGuideOpen] = useState(true);
  const [simpleGuideStep, setSimpleGuideStep] = useState(0);
  const [inspectorScope, setInspectorScope] = useState<
    "page" | "section" | "element"
  >("page");
  const [openItemMenuId, setOpenItemMenuId] = useState<string | null>(null);
  const {
    selected,
    project,
    uiMode,
    selectedItemId,
    selectedLineId,
    selectedImageIds,
    setPageTypography,
    setPageColors,
    setPageSpacing,
    setPageLayout,
    setPageSectionAnimation,
    setPageBackground,
    setMvBackground,
    setPageMeta,
    updateSectionContent,
    updateSectionData,
    updateSectionStyle,
    updateSectionCardStyle,
    updateTargetStoresContent,
    addContentItem,
    removeContentItem,
    reorderContentItems,
    reorderTextLines,
    addTextLine,
    removeTextLine,
    updateTextLineText,
    updateTextLineMarks,
    updateContentItemText,
    updateTitleItemText,
    updateTitleItemMarks,
    updateTextLineAnimation,
    addImageToItem,
    setImageItemLayout,
    updateImageAnimation,
    updateButtonItem,
    updateContentItemAnimation,
    applyLineMarksToAllLines,
    promoteLineMarksToSectionTypography,
    applyCalloutToSelection,
    setSelectedSection,
    setSelectedItemId,
    setSelectedLineId,
    setSelectedImageIds,
    applySectionAppearanceToAll,
    toggleSectionLocked,
    toggleSectionVisible,
    duplicateSection,
    deleteSection,
    addAsset,
    csvImportDraft,
    isCsvImportModalOpen,
    setCsvImportDraft,
    setCsvImportModalOpen,
  } = useEditorStore(
    useShallow((state: EditorUIState) => ({
      selected: state.selected,
      project: state.project,
      uiMode: state.uiMode,
      selectedItemId: state.selectedItemId,
      selectedLineId: state.selectedLineId,
      selectedImageIds: state.selectedImageIds,
      setPageTypography: state.setPageTypography,
      setPageColors: state.setPageColors,
      setPageSpacing: state.setPageSpacing,
      setPageLayout: state.setPageLayout,
      setPageSectionAnimation: state.setPageSectionAnimation,
      setPageBackground: state.setPageBackground,
      setMvBackground: state.setMvBackground,
      setPageMeta: state.setPageMeta,
      updateSectionContent: state.updateSectionContent,
      updateSectionData: state.updateSectionData,
      updateSectionStyle: state.updateSectionStyle,
      updateSectionCardStyle: state.updateSectionCardStyle,
      updateTargetStoresContent: state.updateTargetStoresContent,
      addContentItem: state.addContentItem,
      removeContentItem: state.removeContentItem,
      reorderContentItems: state.reorderContentItems,
      reorderTextLines: state.reorderTextLines,
      addTextLine: state.addTextLine,
      removeTextLine: state.removeTextLine,
      updateTextLineText: state.updateTextLineText,
      updateTextLineMarks: state.updateTextLineMarks,
      updateContentItemText: state.updateContentItemText,
      updateTitleItemText: state.updateTitleItemText,
      updateTitleItemMarks: state.updateTitleItemMarks,
      updateTextLineAnimation: state.updateTextLineAnimation,
      addImageToItem: state.addImageToItem,
      setImageItemLayout: state.setImageItemLayout,
      updateImageAnimation: state.updateImageAnimation,
      updateButtonItem: state.updateButtonItem,
      updateContentItemAnimation: state.updateContentItemAnimation,
      applyLineMarksToAllLines: state.applyLineMarksToAllLines,
      promoteLineMarksToSectionTypography:
        state.promoteLineMarksToSectionTypography,
      applyCalloutToSelection: state.applyCalloutToSelection,
      setSelectedSection: state.setSelectedSection,
      setSelectedItemId: state.setSelectedItemId,
      setSelectedLineId: state.setSelectedLineId,
      setSelectedImageIds: state.setSelectedImageIds,
      applySectionAppearanceToAll: state.applySectionAppearanceToAll,
      toggleSectionLocked: state.toggleSectionLocked,
      toggleSectionVisible: state.toggleSectionVisible,
      duplicateSection: state.duplicateSection,
      deleteSection: state.deleteSection,
      addAsset: state.addAsset,
      csvImportDraft: state.csvImportDraft,
      isCsvImportModalOpen: state.isCsvImportModalOpen,
      setCsvImportDraft: state.setCsvImportDraft,
      setCsvImportModalOpen: state.setCsvImportModalOpen,
    }))
  );

  const selectedSection = useMemo(() => {
    if (selected.kind !== "section") {
      return undefined;
    }
    return project.sections.find(
      (section: SectionBase) => section.id === selected.id
    );
  }, [project.sections, selected]);

  const pageStyle = project.pageBaseStyle as PageBaseStyle;
  const pageMeta = project.settings?.pageMeta;
  const [backgroundTarget, setBackgroundTarget] = useState<
    "page" | "mv"
  >("page");
  const activeBackgroundSpec =
    backgroundTarget === "page"
      ? project.settings?.backgrounds?.page
      : project.settings?.backgrounds?.mv;
  const applyBackgroundSpec = (spec: BackgroundSpec) => {
    if (backgroundTarget === "page") {
      setPageBackground(spec);
    } else {
      setMvBackground(spec);
    }
  };
  const isSection = selected.kind === "section" && Boolean(selectedSection);
  const isSimpleMode = uiMode === "simple";
  const isLocked = Boolean(selectedSection?.locked);
  const isVisible = Boolean(selectedSection?.visible ?? true);
  const [imageUrlInput, setImageUrlInput] = useState("");
  const [imageAltInput, setImageAltInput] = useState("");
  const [csvError, setCsvError] = useState<string | null>(null);
  const isPageSelection = selected.kind === "page";
  const sectionType = selectedSection?.type ?? "";
  const isBrandBar = sectionType === "brandBar";
  const isHeroImage = sectionType === "heroImage";
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
  const isStoreCsvSection =
    isTargetStores || isExcludedStoresList || isExcludedBrandsList;
  const isItemlessSection =
    isBrandBar || isHeroImage || isCampaignPeriodBar;
  const hideStyleTab = isBrandBar || isHeroImage || (isSimpleMode && isSection);
  const guideStepIndex = Math.min(
    Math.max(simpleGuideStep, 0),
    SIMPLE_GUIDE_STEPS.length - 1
  );
  const guideStep = SIMPLE_GUIDE_STEPS[guideStepIndex];
  const formatBytes = (bytes?: number) => {
    if (!bytes || !Number.isFinite(bytes)) {
      return "";
    }
    const kb = bytes / 1024;
    if (kb < 1024) {
      return `${kb.toFixed(1)} KB`;
    }
    const mb = kb / 1024;
    return `${mb.toFixed(1)} MB`;
  };

  useEffect(() => {
    if (!isPageSelection) {
      return;
    }
    if (activeTab === "advanced") {
      setActiveTab("content");
    }
  }, [activeTab, isPageSelection]);

  useEffect(() => {
    if (!hideStyleTab) {
      return;
    }
    if (activeTab === "style") {
      setActiveTab("content");
    }
  }, [activeTab, hideStyleTab]);

  useEffect(() => {
    if (!isSimpleMode || isPageSelection) {
      return;
    }
    if (activeTab !== "content") {
      setActiveTab("content");
    }
  }, [activeTab, isPageSelection, isSimpleMode]);

  useEffect(() => {
    if (!isSimpleMode) {
      return;
    }
    setIsContentCardOpen(true);
    setIsQuickStyleOpen(true);
  }, [isSimpleMode]);

  useEffect(() => {
    if (selected.kind === "page") {
      setInspectorScope("page");
      return;
    }
    if (selected.kind === "section") {
      setInspectorScope((current) => (current === "page" ? "section" : current));
    }
  }, [selected.kind]);

  useEffect(() => {
    const activeSectionId = selectedSection?.id;
    if (!csvImportDraft || !activeSectionId) {
      return;
    }
    if (csvImportDraft.sectionId !== activeSectionId) {
      setCsvImportDraft(null);
      setCsvImportModalOpen(false);
    }
  }, [
    csvImportDraft,
    selectedSection?.id,
    setCsvImportDraft,
    setCsvImportModalOpen,
  ]);
  const [calloutScopeChoice, setCalloutScopeChoice] = useState<"line" | "item">(
    "line"
  );
  const assets = project.assets ?? {};
  const footerAssets = (selectedSection?.data?.footerAssets ?? {}) as Record<
    string,
    string | undefined
  >;
  const footerAssetSlots = [
    { key: "conditionsTitle", label: "利用条件: タイトル" },
    { key: "conditionsText", label: "利用条件: テキスト" },
    { key: "conditionsBg1", label: "利用条件 背景1" },
    { key: "conditionsBg2", label: "利用条件 背景2" },
    { key: "conditionsBg3", label: "利用条件 背景3" },
    { key: "conditionsBg4", label: "利用条件 背景4" },
    { key: "iconExclamation", label: "注意点アイコン" },
    { key: "bannerHeadTitle", label: "下部バナー: タイトル" },
    { key: "bannerMain", label: "下部バナー: メイン" },
    { key: "bannerMore", label: "下部バナー: 詳細" },
    { key: "bannerBg", label: "下部バナー: 背景" },
    { key: "magazineBanner", label: "マガジンバナー" },
    { key: "footerLogo", label: "フッター ロゴ" },
    { key: "appStore", label: "App Store" },
    { key: "googlePlay", label: "Google Play" },
    { key: "iconArrow", label: "矢印アイコン" },
    { key: "iconArrowRight", label: "矢印アイコン(赤)" },
  ];
  const brandBarInputRef = useRef<HTMLInputElement | null>(null);
  const heroPcInputRef = useRef<HTMLInputElement | null>(null);
  const heroSpInputRef = useRef<HTMLInputElement | null>(null);
  const paymentGuideImageInputRef = useRef<HTMLInputElement | null>(null);
  const csvInputRef = useRef<HTMLInputElement | null>(null);
  const imageImportInputRef = useRef<HTMLInputElement | null>(null);
  const footerAssetInputRefs = useRef<Record<string, HTMLInputElement | null>>(
    {}
  );
  const heroPcSlidesInputRef = useRef<HTMLInputElement | null>(null);
  const heroSpSlidesInputRef = useRef<HTMLInputElement | null>(null);
  const contentItems =
    (selectedSection?.content?.items ?? []) as ContentItem[];
  const selectedItem =
    contentItems.find((item) => item.id === selectedItemId) ?? contentItems[0];
  const selectedTitleItem =
    selectedItem?.type === "title" ? selectedItem : undefined;
  const selectedTextItem =
    selectedItem?.type === "text" ? selectedItem : undefined;
  const selectedImageItem =
    selectedItem?.type === "image" ? selectedItem : undefined;
  const selectedButtonItem =
    selectedItem?.type === "button" ? selectedItem : undefined;
  const selectedLine =
    selectedTextItem?.lines.find((line) => line.id === selectedLineId) ??
    selectedTextItem?.lines[0];
  const titleItem = contentItems.find((item) => item.type === "title");
  const buttonTargetKind = selectedButtonItem?.target.kind ?? "url";
  const buttonTargetSectionId =
    selectedButtonItem?.target.kind === "section"
      ? selectedButtonItem.target.sectionId
      : "";
  const buttonTargetUrl =
    selectedButtonItem?.target.kind === "url"
      ? selectedButtonItem.target.url
      : "";
  const periodBarStyle = (selectedSection?.data?.periodBarStyle ?? {}) as {
    bold?: boolean;
    color?: string;
    size?: number;
  };
  const periodBarBandColor = (() => {
    const defaultBandColor = "#EB5505";
    const style = selectedSection?.style;
    if (!style) {
      return defaultBandColor;
    }
    const background = style.background;
    const hasSurfaceOverride =
      background.type !== "solid" ||
      background.color1 !== "#f1f1f1" ||
      background.color2 !== "#ffffff" ||
      Boolean(style.border?.enabled) ||
      (style.shadow && style.shadow !== "none");
    if (!hasSurfaceOverride) {
      return defaultBandColor;
    }
    return background.color1 || defaultBandColor;
  })();
  const periodBarText =
    typeof selectedSection?.data?.periodBarText === "string"
      ? selectedSection.data.periodBarText
      : "";
  const periodBarAnimation = selectedSection?.data?.periodBarAnimation as
    | ContentItemAnimation
    | undefined;
  const heroAnimation = selectedSection?.data?.heroAnimation as
    | ContentItemAnimation
    | undefined;
  const heroPcMeta = selectedSection?.data?.heroPcMeta as
    | { filename?: string; relativePath?: string; size?: number }
    | undefined;
  const heroSpMeta = selectedSection?.data?.heroSpMeta as
    | { filename?: string; relativePath?: string; size?: number }
    | undefined;
  const heroSlidesPc = Array.isArray(selectedSection?.data?.heroSlidesPc)
    ? (selectedSection?.data?.heroSlidesPc as ImageItem[])
    : [];
  const heroSlidesSp = Array.isArray(selectedSection?.data?.heroSlidesSp)
    ? (selectedSection?.data?.heroSlidesSp as ImageItem[])
    : [];
  const heroPc = selectedSection?.data?.heroPc as
    | { w?: number; h?: number }
    | undefined;
  const heroSp = selectedSection?.data?.heroSp as
    | { w?: number; h?: number }
    | undefined;
  const brandImageMeta = selectedSection?.data?.brandImageMeta as
    | { filename?: string; relativePath?: string; w?: number; h?: number; size?: number }
    | undefined;
  const sectionCardStyle =
    selectedSection?.sectionCardStyle ?? DEFAULT_SECTION_CARD_STYLE;
  const storeCsv = selectedSection?.content?.storeCsv;
  const storeLabels = selectedSection?.content?.storeLabels ?? {};
  const storeFilters = selectedSection?.content?.storeFilters ?? {};
  const storeFilterOperator =
    selectedSection?.content?.storeFilterOperator === "OR" ? "OR" : "AND";
  const resolvedStoreCsv = useMemo(() => {
    if (storeCsv && Array.isArray(storeCsv.headers) && storeCsv.headers.length > 0) {
      return storeCsv;
    }
    if (project.stores?.columns?.length) {
      return {
        headers: project.stores.columns,
        rows: project.stores.rows ?? [],
      };
    }
    return undefined;
  }, [storeCsv, project.stores]);
  const storeHeaders = resolvedStoreCsv?.headers ?? [];
  const storeRows = resolvedStoreCsv?.rows ?? [];
  const targetStoresExtraColumns = useMemo(() => {
    if (!isTargetStores) {
      return [] as string[];
    }
    if (storeHeaders.length >= 5) {
      return storeHeaders.slice(5);
    }
    return [] as string[];
  }, [isTargetStores, storeHeaders]);
  const labelColorMap = useMemo(
    () => getUniqueLabelColorMap(targetStoresExtraColumns),
    [targetStoresExtraColumns]
  );
  const resolvedStoreLabels = useMemo(() => {
    const result: Record<
      string,
      {
        columnKey: string;
        displayName: string;
        color: string;
        trueText: string;
        falseText: string;
        valueDisplay: "toggle" | "raw";
        showAsFilter: boolean;
        showAsBadge: boolean;
      }
    > = {};
    targetStoresExtraColumns.forEach((column) => {
      const existing = storeLabels[column];
      const fallbackColor =
        labelColorMap[column] ?? getStableLabelColor(column);
      result[column] = {
        columnKey: column,
        displayName:
          typeof existing?.displayName === "string" &&
          existing.displayName.trim()
            ? existing.displayName
            : column,
        color:
          typeof existing?.color === "string" && existing.color.trim()
            ? existing.color
            : fallbackColor,
        trueText:
          typeof existing?.trueText === "string" && existing.trueText.trim()
            ? existing.trueText
            : "ON",
        falseText:
          typeof existing?.falseText === "string" && existing.falseText.trim()
            ? existing.falseText
            : "OFF",
        valueDisplay:
          existing?.valueDisplay === "raw" ? "raw" : "toggle",
        showAsFilter:
          typeof existing?.showAsFilter === "boolean"
            ? existing.showAsFilter
            : true,
        showAsBadge:
          typeof existing?.showAsBadge === "boolean"
            ? existing.showAsBadge
            : true,
      };
    });
    return result;
  }, [storeLabels, targetStoresExtraColumns, labelColorMap]);
  const selectedFilterLabels = useMemo(
    () =>
      Object.entries(storeFilters)
        .filter(([, value]) => value)
        .map(([key]) => resolvedStoreLabels[key]?.displayName ?? key)
        .filter((label) => typeof label === "string" && label.trim().length > 0),
    [storeFilters, resolvedStoreLabels]
  );
  const hasStoresData = storeRows.length > 0;
  const legalNotesTextItem = isLegalNotes
    ? (contentItems.find((item) => item.type === "text") as TextContentItem | undefined)
    : undefined;
  const legalNotesBullet =
    selectedSection?.data?.bullet === "none" ? "none" : "disc";
  const normalizeLegalNoteItems = (
    items: unknown,
    defaultBullet: "none" | "disc"
  ): LegalNoteItem[] => {
    if (!Array.isArray(items)) {
      return [];
    }
    return items.flatMap((item) => {
      if (typeof item === "string") {
        return [{ text: item, bullet: defaultBullet }];
      }
      if (!item || typeof item !== "object") {
        return [];
      }
      const entry = item as Record<string, unknown>;
      const text = typeof entry.text === "string" ? entry.text : "";
      const bullet =
        entry.bullet === "none" || entry.bullet === "disc"
          ? entry.bullet
          : defaultBullet;
      return [{ text, bullet }];
    });
  };
  const legalNotesLineItems = useMemo(
    () =>
      legalNotesTextItem?.lines.map((line) => ({
        text: line.text,
        bullet: line.marks?.bullet ?? legalNotesBullet,
      })) ?? [],
    [legalNotesTextItem?.lines, legalNotesBullet]
  );
  const legalNotesItems = isLegalNotes
    ? normalizeLegalNoteItems(selectedSection?.data?.items, legalNotesBullet)
    : [];
  const legalNotesWidth =
    typeof selectedSection?.data?.noteWidthPct === "number"
      ? selectedSection?.data?.noteWidthPct
      : 100;
  const rankingRankLabel = useMemo(() => {
    const data = selectedSection?.data ?? {};
    const headers = data.headers && typeof data.headers === "object"
      ? (data.headers as Record<string, unknown>)
      : {};
    return typeof data.rankLabel === "string"
      ? data.rankLabel
      : typeof headers.rank === "string"
      ? headers.rank
      : "順位";
  }, [selectedSection?.data]);
  const rankingColumns = useMemo<RankingColumn[]>(() => {
    const rawColumns = selectedSection?.data?.columns;
    if (Array.isArray(rawColumns) && rawColumns.length > 0) {
      return rawColumns.map((col, index) => {
        if (typeof col === "string") {
          return { key: `col_${index + 1}`, label: col };
        }
        const entry = col && typeof col === "object"
          ? (col as Record<string, unknown>)
          : {};
        return {
          key: typeof entry.key === "string" ? entry.key : `col_${index + 1}`,
          label: typeof entry.label === "string" ? entry.label : `列${index + 1}`,
        };
      });
    }
    const headers = selectedSection?.data?.headers;
    const fallback = headers && typeof headers === "object"
      ? (headers as Record<string, unknown>)
      : {};
    return [
      {
        key: "label",
        label: typeof fallback.label === "string" ? fallback.label : "項目",
      },
      {
        key: "value",
        label: typeof fallback.value === "string" ? fallback.value : "決済金額",
      },
    ];
  }, [selectedSection?.data]);
  const rankingMeta = useMemo(() => {
    const data = selectedSection?.data ?? {};
    const notes = Array.isArray(data.notes)
      ? data.notes.map((note: unknown) => String(note)).filter((note) => note.trim())
      : [];
    return {
      subtitle:
        typeof data.subtitle === "string" ? data.subtitle : "",
      period:
        typeof data.period === "string" ? data.period : "",
      date:
        typeof data.date === "string" ? data.date : "",
      notes,
    };
  }, [selectedSection?.data]);
  const rankingRows = useMemo<RankingRow[]>(() => {
    const rawRows = selectedSection?.data?.rows;
    if (!Array.isArray(rawRows)) {
      return [];
    }
    const columnCount = rankingColumns.length;
    return rawRows.map((row, index) => {
      if (Array.isArray(row)) {
        const values = row.map((value) => String(value));
        return {
          id: `rank_${index + 1}`,
          values: values
            .slice(0, columnCount)
            .concat(Array(Math.max(0, columnCount - values.length)).fill("")),
        };
      }
      const entry = row && typeof row === "object"
        ? (row as Record<string, unknown>)
        : {};
      const id =
        typeof entry.id === "string" && entry.id.trim().length > 0
          ? entry.id
          : `rank_${index + 1}`;
      const rawValues = Array.isArray(entry.values)
        ? entry.values.map((value) => String(value))
        : [String(entry.label ?? ""), String(entry.value ?? "")];
      return {
        id,
        values: rawValues
          .slice(0, columnCount)
          .concat(Array(Math.max(0, columnCount - rawValues.length)).fill("")),
      };
    });
  }, [rankingColumns.length, selectedSection?.data?.rows]);
  const rankingStyle = useMemo(() => {
    const data = selectedSection?.data ?? {};
    const style = data.tableStyle && typeof data.tableStyle === "object"
      ? (data.tableStyle as Record<string, unknown>)
      : {};
    return {
      headerBg: typeof style.headerBg === "string" ? style.headerBg : "#f8fafc",
      headerText: typeof style.headerText === "string" ? style.headerText : "#0f172a",
      cellBg: typeof style.cellBg === "string" ? style.cellBg : "#ffffff",
      cellText: typeof style.cellText === "string" ? style.cellText : "#0f172a",
      border: typeof style.border === "string" ? style.border : "#e2e8f0",
      rankBg: typeof style.rankBg === "string" ? style.rankBg : "#e2e8f0",
      rankText: typeof style.rankText === "string" ? style.rankText : "#0f172a",
      top1Bg: typeof style.top1Bg === "string" ? style.top1Bg : "#f59e0b",
      top2Bg: typeof style.top2Bg === "string" ? style.top2Bg : "#cbd5f5",
      top3Bg: typeof style.top3Bg === "string" ? style.top3Bg : "#fb923c",
      periodLabelBg:
        typeof style.periodLabelBg === "string" ? style.periodLabelBg : "#f1f5f9",
      periodLabelText:
        typeof style.periodLabelText === "string" ? style.periodLabelText : "#0f172a",
    };
  }, [selectedSection?.data]);
  const paymentGuideData = useMemo(() => {
    const data = selectedSection?.data ?? {};
    return {
      title: typeof data.title === "string" ? data.title : "決済履歴の確認方法",
      body: typeof data.body === "string" ? data.body : "",
      linkText: typeof data.linkText === "string" ? data.linkText : "",
      linkUrl: typeof data.linkUrl === "string" ? data.linkUrl : "",
      linkTargetKind:
        data.linkTargetKind === "section" ? "section" : "url",
      linkSectionId:
        typeof data.linkSectionId === "string" ? data.linkSectionId : "",
      linkSuffix: typeof data.linkSuffix === "string" ? data.linkSuffix : "",
      alert: typeof data.alert === "string" ? data.alert : "",
      imageUrl: typeof data.imageUrl === "string" ? data.imageUrl : "",
      imageAlt: typeof data.imageAlt === "string" ? data.imageAlt : "",
      imageAssetId:
        typeof data.imageAssetId === "string" ? data.imageAssetId : "",
    };
  }, [selectedSection?.data]);
  const tabbedNotesData = useMemo(() => {
    const data = selectedSection?.data ?? {};
    const rawTabs = Array.isArray(data.tabs) ? data.tabs : [];
    const tabs: TabbedNotesTab[] = rawTabs.map((tab, index) => {
      const entry = tab && typeof tab === "object"
        ? (tab as Record<string, unknown>)
        : {};
      const rawItems = Array.isArray(entry.items) ? entry.items : [];
      const items: TabbedNotesItem[] = rawItems.map((item, itemIndex) => {
        const itemEntry = item && typeof item === "object"
          ? (item as Record<string, unknown>)
          : {};
        const subItems = Array.isArray(itemEntry.subItems)
          ? itemEntry.subItems.map((value) => String(value))
          : [];
        return {
          id:
            typeof itemEntry.id === "string" && itemEntry.id.trim()
              ? itemEntry.id
              : `tab_item_${index + 1}_${itemIndex + 1}`,
          text: typeof itemEntry.text === "string" ? itemEntry.text : "",
          bullet: itemEntry.bullet === "none" ? "none" : "disc",
          tone: itemEntry.tone === "accent" ? "accent" : "normal",
          bold: Boolean(itemEntry.bold),
          subItems,
        };
      });
      return {
        id:
          typeof entry.id === "string" && entry.id.trim()
            ? entry.id
            : `tab_${index + 1}`,
        labelTop: typeof entry.labelTop === "string" ? entry.labelTop : "",
        labelBottom:
          typeof entry.labelBottom === "string" ? entry.labelBottom : "注意事項",
        intro: typeof entry.intro === "string" ? entry.intro : "",
        items,
        footnote: typeof entry.footnote === "string" ? entry.footnote : "",
        ctaText: typeof entry.ctaText === "string" ? entry.ctaText : "",
        ctaLinkText:
          typeof entry.ctaLinkText === "string" ? entry.ctaLinkText : "",
        ctaLinkUrl:
          typeof entry.ctaLinkUrl === "string" ? entry.ctaLinkUrl : "",
        ctaTargetKind:
          entry.ctaTargetKind === "section" ? "section" : "url",
        ctaSectionId:
          typeof entry.ctaSectionId === "string" ? entry.ctaSectionId : "",
        ctaImageUrl:
          typeof entry.ctaImageUrl === "string" ? entry.ctaImageUrl : "",
        ctaImageAlt:
          typeof entry.ctaImageAlt === "string" ? entry.ctaImageAlt : "",
        ctaImageAssetId:
          typeof entry.ctaImageAssetId === "string" ? entry.ctaImageAssetId : "",
        buttonText:
          typeof entry.buttonText === "string" ? entry.buttonText : "",
        buttonTargetKind:
          entry.buttonTargetKind === "section" ? "section" : "url",
        buttonUrl: typeof entry.buttonUrl === "string" ? entry.buttonUrl : "",
        buttonSectionId:
          typeof entry.buttonSectionId === "string" ? entry.buttonSectionId : "",
      };
    });
    const fallbackTabs: TabbedNotesTab[] = [
      {
        id: "tab_1",
        labelTop: "タブ1",
        labelBottom: "注意事項",
        intro: "",
        items: [],
        footnote: "",
        ctaText: "",
        ctaLinkText: "",
        ctaLinkUrl: "",
        ctaTargetKind: "url",
        ctaSectionId: "",
        ctaImageUrl: "",
        ctaImageAlt: "",
        ctaImageAssetId: "",
        buttonText: "",
        buttonTargetKind: "url",
        buttonUrl: "",
        buttonSectionId: "",
      },
      {
        id: "tab_2",
        labelTop: "タブ2",
        labelBottom: "注意事項",
        intro: "",
        items: [],
        footnote: "",
        ctaText: "",
        ctaLinkText: "",
        ctaLinkUrl: "",
        ctaTargetKind: "url",
        ctaSectionId: "",
        ctaImageUrl: "",
        ctaImageAlt: "",
        ctaImageAssetId: "",
        buttonText: "",
        buttonTargetKind: "url",
        buttonUrl: "",
        buttonSectionId: "",
      },
    ];
    const style =
      data.tabStyle && typeof data.tabStyle === "object"
        ? (data.tabStyle as Record<string, unknown>)
        : {};
    const rawVariant = typeof style.variant === "string" ? style.variant : "simple";
    const variant =
      rawVariant === "sticky" ||
      rawVariant === "underline" ||
      rawVariant === "popout"
        ? rawVariant
        : "simple";
    const tabStyle: TabbedNotesStyle = {
      variant,
      inactiveBg: typeof style.inactiveBg === "string" ? style.inactiveBg : "#DDDDDD",
      inactiveText:
        typeof style.inactiveText === "string" ? style.inactiveText : "#000000",
      activeBg: typeof style.activeBg === "string" ? style.activeBg : "#000000",
      activeText: typeof style.activeText === "string" ? style.activeText : "#FFFFFF",
      border: typeof style.border === "string" ? style.border : "#000000",
      contentBg:
        typeof style.contentBg === "string" ? style.contentBg : "#FFFFFF",
      contentBorder:
        typeof style.contentBorder === "string"
          ? style.contentBorder
          : "#000000",
      accent: typeof style.accent === "string" ? style.accent : "#EB5505",
    };
    return {
      title: typeof data.title === "string" ? data.title : "注意事項",
      tabs: tabs.length > 0 ? tabs : fallbackTabs,
      tabStyle,
    };
  }, [selectedSection?.data]);
  const designTargetSection = useMemo(() => {
    const excludeTypes = new Set(["brandBar", "heroImage", "footerHtml"]);
    return project.sections.find((section) => !excludeTypes.has(section.type));
  }, [project.sections]);
  const designTargetCardStyle =
    designTargetSection?.sectionCardStyle ?? DEFAULT_SECTION_CARD_STYLE;
  const designTargetBandSize =
    designTargetCardStyle.labelChipBg === "sm" ||
    designTargetCardStyle.labelChipBg === "lg"
      ? designTargetCardStyle.labelChipBg
      : "md";
  const designTargetBandAlign =
    designTargetCardStyle.labelChipTextColor === "center" ||
    designTargetCardStyle.labelChipTextColor === "right"
      ? designTargetCardStyle.labelChipTextColor
      : "left";

  const mergeSectionStyle = (
    base: SectionStyle,
    patch: SectionStylePatch
  ): SectionStyle => ({
    typography: { ...base.typography, ...(patch.typography ?? {}) },
    background: { ...base.background, ...(patch.background ?? {}) },
    border: { ...base.border, ...(patch.border ?? {}) },
    shadow: patch.shadow ?? base.shadow,
    layout: {
      ...base.layout,
      ...(patch.layout ?? {}),
      padding: {
        ...base.layout.padding,
        ...(patch.layout?.padding ?? {}),
      },
    },
    customCss: patch.customCss ?? base.customCss,
  });
  const mergeCardStyle = (
    base: SectionBase["sectionCardStyle"] | undefined,
    patch: Partial<NonNullable<SectionBase["sectionCardStyle"]>>
  ) => ({
    ...(base ?? DEFAULT_SECTION_CARD_STYLE),
    ...patch,
  });

  const applySectionDesignPreset = (
    presetId: SectionCardPresetId,
    options?: { reset?: boolean }
  ) => {
    if (!selectedSection) {
      return;
    }
    const preset = getSectionCardPreset(presetId);
    if (!preset) {
      return;
    }
    const reset = options?.reset ?? false;
    const currentCardStyle =
      selectedSection.sectionCardStyle ?? DEFAULT_SECTION_CARD_STYLE;
    const currentPreset = getSectionCardPreset(currentCardStyle.presetId);
    const nextCardStyle: typeof currentCardStyle = {
      ...currentCardStyle,
      presetId,
    };
    const patch: Record<string, unknown> = { presetId };
    const presetStyle = preset.cardStyle;

    (Object.keys(presetStyle) as (keyof typeof presetStyle)[]).forEach((key) => {
      if (key === "padding") {
        const currentPadding = currentCardStyle.padding;
        const priorPadding = currentPreset?.cardStyle?.padding;
        if (reset || currentPadding === priorPadding) {
          nextCardStyle.padding = { ...presetStyle.padding };
        }
        return;
      }
      const currentValue = currentCardStyle[key];
      const priorValue = currentPreset?.cardStyle?.[key];
      if (reset || currentValue === priorValue) {
        patch[key as string] = presetStyle[key];
      }
    });
    const mergedStyle = {
      ...nextCardStyle,
      ...(patch as typeof nextCardStyle),
    };
    updateSectionCardStyle(selectedSection.id, mergedStyle);

    if (preset.surfaceDefaults) {
      const currentStyle = selectedSection.style;
      const priorDefaults = currentPreset?.surfaceDefaults;
      const surfacePatch: SectionStylePatch = {};

      if (preset.surfaceDefaults.background) {
        const currentBg = currentStyle.background;
        const priorBg = priorDefaults?.background;
        const shouldApply =
          reset ||
          !priorBg ||
          (currentBg.type === priorBg.type &&
            currentBg.color1 === priorBg.color1 &&
            currentBg.color2 === priorBg.color2);
        if (shouldApply) {
          surfacePatch.background = preset.surfaceDefaults.background;
        }
      }

      if (preset.surfaceDefaults.border) {
        const currentBorder = currentStyle.border;
        const priorBorder = priorDefaults?.border;
        const shouldApply =
          reset ||
          !priorBorder ||
          (currentBorder.enabled === priorBorder.enabled &&
            currentBorder.width === priorBorder.width &&
            currentBorder.color === priorBorder.color);
        if (shouldApply) {
          surfacePatch.border = preset.surfaceDefaults.border;
        }
      }

      if (preset.surfaceDefaults.shadow) {
        const currentShadow = currentStyle.shadow;
        const priorShadow = priorDefaults?.shadow;
        const shouldApply =
          reset || !priorShadow || currentShadow === priorShadow;
        if (shouldApply) {
          surfacePatch.shadow = preset.surfaceDefaults.shadow;
        }
      }

      if (preset.surfaceDefaults.layout?.radius != null) {
        const currentRadius = currentStyle.layout.radius;
        const priorRadius = priorDefaults?.layout?.radius;
        const shouldApply =
          reset ||
          priorRadius == null ||
          currentRadius === priorRadius;
        if (shouldApply) {
          surfacePatch.layout = {
            ...(surfacePatch.layout ?? {}),
            radius: preset.surfaceDefaults.layout.radius,
          };
        }
      }

      if (Object.keys(surfacePatch).length > 0) {
        updateSectionStyle(selectedSection.id, surfacePatch);
      }
    }

    if (titleItem) {
      const hasCustomTitleMarks =
        titleItem.marks && Object.keys(titleItem.marks).length > 0;
      if (reset || !hasCustomTitleMarks) {
        updateTitleItemMarks(selectedSection.id, titleItem.id, preset.titleMarks);
      }
    }
  };

  const applySectionDesignPresetToAll = (
    presetId: SectionCardPresetId,
    options?: { reset?: boolean }
  ) => {
    if (!designTargetSection) {
      return;
    }
    const preset = getSectionCardPreset(presetId);
    if (!preset) {
      return;
    }
    const reset = options?.reset ?? false;
    const currentCardStyle = designTargetCardStyle;
    const currentPreset = getSectionCardPreset(currentCardStyle.presetId);
    const nextCardStyle: typeof currentCardStyle = {
      ...currentCardStyle,
      presetId,
    };
    const patch: Record<string, unknown> = { presetId };
    const presetStyle = preset.cardStyle;

    (Object.keys(presetStyle) as (keyof typeof presetStyle)[]).forEach((key) => {
      if (key === "padding") {
        const currentPadding = currentCardStyle.padding;
        const priorPadding = currentPreset?.cardStyle?.padding;
        if (reset || currentPadding === priorPadding) {
          nextCardStyle.padding = { ...presetStyle.padding };
        }
        return;
      }
      const currentValue = currentCardStyle[key];
      const priorValue = currentPreset?.cardStyle?.[key];
      if (reset || currentValue === priorValue) {
        patch[key as string] = presetStyle[key];
      }
    });
    const mergedCardStyle = {
      ...nextCardStyle,
      ...(patch as typeof nextCardStyle),
    };

    let nextStyle = designTargetSection.style;
    if (preset.surfaceDefaults) {
      const currentStyle = designTargetSection.style;
      const priorDefaults = currentPreset?.surfaceDefaults;
      const surfacePatch: SectionStylePatch = {};

      if (preset.surfaceDefaults.background) {
        const currentBg = currentStyle.background;
        const priorBg = priorDefaults?.background;
        const shouldApply =
          reset ||
          !priorBg ||
          (currentBg.type === priorBg.type &&
            currentBg.color1 === priorBg.color1 &&
            currentBg.color2 === priorBg.color2);
        if (shouldApply) {
          surfacePatch.background = preset.surfaceDefaults.background;
        }
      }

      if (preset.surfaceDefaults.border) {
        const currentBorder = currentStyle.border;
        const priorBorder = priorDefaults?.border;
        const shouldApply =
          reset ||
          !priorBorder ||
          (currentBorder.enabled === priorBorder.enabled &&
            currentBorder.width === priorBorder.width &&
            currentBorder.color === priorBorder.color);
        if (shouldApply) {
          surfacePatch.border = preset.surfaceDefaults.border;
        }
      }

      if (preset.surfaceDefaults.shadow) {
        const currentShadow = currentStyle.shadow;
        const priorShadow = priorDefaults?.shadow;
        const shouldApply =
          reset || !priorShadow || currentShadow === priorShadow;
        if (shouldApply) {
          surfacePatch.shadow = preset.surfaceDefaults.shadow;
        }
      }

      if (preset.surfaceDefaults.layout?.radius != null) {
        const currentRadius = currentStyle.layout.radius;
        const priorRadius = priorDefaults?.layout?.radius;
        const shouldApply =
          reset || priorRadius == null || currentRadius === priorRadius;
        if (shouldApply) {
          surfacePatch.layout = {
            ...(surfacePatch.layout ?? {}),
            radius: preset.surfaceDefaults.layout.radius,
          };
        }
      }

      if (Object.keys(surfacePatch).length > 0) {
        nextStyle = mergeSectionStyle(currentStyle, surfacePatch);
      }
    }

    applySectionAppearanceToAll(nextStyle, mergedCardStyle, {
      excludeTypes: ["brandBar", "heroImage", "footerHtml"],
    });
  };

  const applyStyleToAllSections = () => {
    if (!selectedSection) {
      return;
    }
    applySectionAppearanceToAll(
      selectedSection.style,
      selectedSection.sectionCardStyle ?? DEFAULT_SECTION_CARD_STYLE,
      { excludeTypes: ["brandBar", "heroImage", "footerHtml"] }
    );
  };
  const breadcrumb = useMemo(() => {
    const sectionLabel = selectedSection?.name ?? t.inspector.breadcrumb.untitled;
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

    if (selected.kind === "page") {
      return [t.inspector.breadcrumb.page];
    }
    if (selected.kind === "section" && selectedSection) {
      return [t.inspector.breadcrumb.page, sectionLabel];
    }
    if (selected.kind === "block") {
      return [t.inspector.breadcrumb.page, sectionLabel, elementLabel];
    }
    return [t.inspector.breadcrumb.page];
  }, [selected, selectedItem, selectedLine, selectedSection, t]);

  const sectionOptions = project.sections.map((section) => ({
    value: section.id,
    label: section.name ?? section.type,
  }));
  const isElementScope = inspectorScope === "element";
  const canSelectSection = project.sections.length > 0;
  const canSelectElement = contentItems.length > 0 && Boolean(selectedSection);

  const selectItemById = (itemId?: string) => {
    if (!selectedSection || !itemId) {
      setSelectedItemId(undefined);
      setSelectedLineId(undefined);
      setSelectedImageIds([]);
      return;
    }
    const item = contentItems.find((entry) => entry.id === itemId);
    if (!item) {
      return;
    }
    setSelectedItemId(item.id);
    if (item.type === "text") {
      setSelectedLineId(item.lines[0]?.id);
    } else {
      setSelectedLineId(undefined);
    }
    if (item.type === "image") {
      setSelectedImageIds(item.images[0] ? [item.images[0].id] : []);
    } else {
      setSelectedImageIds([]);
    }
  };

  const handleScopeChange = (nextScope: "page" | "section" | "element") => {
    if (nextScope === "page") {
      setSelectedSection(undefined);
      setInspectorScope("page");
      return;
    }
    const nextSectionId = selectedSection?.id ?? project.sections[0]?.id;
    if (!nextSectionId) {
      return;
    }
    if (nextScope === "section") {
      if (!selectedSection || selectedSection.id !== nextSectionId) {
        setSelectedSection(nextSectionId);
      }
      setSelectedItemId(undefined);
      setSelectedLineId(undefined);
      setSelectedImageIds([]);
      setInspectorScope("section");
      return;
    }
    if (!selectedSection || selectedSection.id !== nextSectionId) {
      setSelectedSection(nextSectionId);
    }
    const nextItemId = contentItems[0]?.id;
    if (nextItemId) {
      selectItemById(nextItemId);
    }
    setInspectorScope("element");
  };
  const isLockedDisplay = isLocked;
  const bodyClass = isSection && isLockedDisplay ? "pointer-events-none opacity-60" : "";
  const isContentReady = selected.kind === "section" && selectedSection;
  const cardClass =
    "min-w-0 rounded-md border border-[var(--ui-border)]/60 bg-[var(--ui-panel)]/70 backdrop-blur";
  const cardHeaderClass =
    "flex h-8 items-center justify-between border-b border-[var(--ui-border)]/50 px-3 text-[12px] font-semibold";
  const cardBodyClass = "min-w-0 px-3 py-2";
  const isLineScopeEnabled = Boolean(selectedLineId);
  const isItemScopeEnabled = Boolean(selectedItemId);
  const calloutScope = calloutScopeChoice;
  const isCalloutScopeEnabled =
    calloutScopeChoice === "line" ? isLineScopeEnabled : isItemScopeEnabled;
  const areLegalNoteItemsEqual = (left: LegalNoteItem[], right: LegalNoteItem[]) => {
    if (left.length !== right.length) {
      return false;
    }
    return left.every(
      (value, index) =>
        value.text === right[index]?.text && value.bullet === right[index]?.bullet
    );
  };
  const reorderStringArray = (values: string[], fromIndex: number, toIndex: number) => {
    const next = [...values];
    const [moved] = next.splice(fromIndex, 1);
    next.splice(toIndex, 0, moved ?? "");
    return next;
  };
  const reorderLinesArray = <T,>(values: T[], fromIndex: number, toIndex: number) => {
    const next = [...values];
    const [moved] = next.splice(fromIndex, 1);
    next.splice(toIndex, 0, moved as T);
    return next;
  };
  const createRankingColumnId = () =>
    `col_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
  const getCalloutDefaults = (variant?: "note" | "warn" | "info") => {
    if (variant === "warn") {
      return { bg: "#fff1f2", border: "#fecdd3" };
    }
    if (variant === "info") {
      return { bg: "#eff6ff", border: "#bfdbfe" };
    }
    return { bg: "#fff7ed", border: "#fed7aa" };
  };
  const calloutVariant = selectedLine?.marks?.callout?.variant ?? "note";
  const calloutDefaults = getCalloutDefaults(calloutVariant);
  const sensors = useSensors(useSensor(PointerSensor));
  const selectedSectionId = selectedSection?.id;
  useEffect(() => {
    setIsContentCardOpen(false);
    setIsQuickStyleOpen(false);
    setIsAnimationsOpen(false);
    setIsStoreDesignOpen(false);
  }, [selectedSectionId]);
  useEffect(() => {
    if (!isLegalNotes || !selectedSection || !legalNotesTextItem) {
      return;
    }
    const currentItems = legalNotesItems;
    if (areLegalNoteItemsEqual(legalNotesLineItems, currentItems)) {
      return;
    }
    updateSectionData(
      selectedSection.id,
      { items: legalNotesLineItems },
      { skipHistory: true }
    );
  }, [
    areLegalNoteItemsEqual,
    isLegalNotes,
    legalNotesLineItems,
    legalNotesTextItem,
    legalNotesItems,
    selectedSection,
    updateSectionData,
  ]);
  const quickRowClass = "grid grid-cols-[96px_1fr] items-center gap-x-3";
  const quickLabelClass = "text-[12px] text-[var(--ui-muted)]";
  const quickControlClass = "min-w-0 flex items-center gap-2 justify-end";
  const quickSegmentWrapClass =
    "inline-flex rounded-md border border-[var(--ui-border)]/60 bg-[var(--ui-panel)]/60 p-1";
  const quickSegmentButtonClass = "h-7 px-3 text-[12px] rounded-sm";
  const quickSegmentActiveClass =
    "bg-[var(--ui-panel)] border border-[var(--ui-border)]/70 shadow-sm text-[var(--ui-text)]";
  const quickSegmentInactiveClass = "text-[var(--ui-muted)]";
  const toSafeHexColor = (value: string) =>
    value && value.startsWith("#") ? value : "#000000";
  const QuickColorControl = ({
    value,
    onChange,
    ariaLabel,
  }: {
    value: string;
    onChange: (value: string) => void;
    ariaLabel?: string;
  }) => (
    <div className="flex items-center gap-2">
      <input
        type="color"
        className="h-8 w-8 cursor-pointer rounded border border-[var(--ui-border)] bg-transparent"
        value={toSafeHexColor(value)}
        aria-label={ariaLabel}
        onChange={(event) => onChange(event.target.value)}
      />
      <input
        type="text"
        className="ui-input h-8 w-[110px] text-[12px]"
        value={value}
        aria-label={ariaLabel}
        onChange={(event) => onChange(event.target.value)}
      />
    </div>
  );
  const textAlignValue =
    selectedLine?.marks?.textAlign ?? selectedSection?.style.typography.textAlign ?? "left";
  const isTextAlignEnabled = Boolean(
    selectedTextItem && (selectedLineId || selectedItemId)
  );
  const createNoticeId = () =>
    `notice_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
  const createTabId = () =>
    `tab_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
  const createTabItemId = () =>
    `tab_item_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
  const createRankingRowId = () =>
    `rank_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
  const createImageIdLocal = () =>
    `img_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
  const itemTypeLabels = {
    title: t.inspector.section.itemTypes.title,
    text: t.inspector.section.itemTypes.text,
    image: t.inspector.section.itemTypes.image,
    button: t.inspector.section.itemTypes.button,
  };
  const NOTICE_LINES = [
    "〇〇店、〇〇店は対象外です。",
    "一部休業中店舗がございます。詳細はHPをご確認ください。",
  ];
  const TARGET_STORES_NOTICE_LINES = [
    "ご注意ください！",
    "リストに記載があっても、店舗の休業・閉業・移転や、その他の事情により利用できない場合があります。",
  ];
  const isNoticeItem = (item: ContentItem) =>
    item.type === "text" &&
    NOTICE_LINES.every((line) =>
      item.lines.some((entry) => entry.text.trim() === line)
    );
  const isTargetStoresNoticeItem = (item: ContentItem): item is TextContentItem =>
    item.type === "text" &&
    item.lines.length > 0 &&
    item.lines.every((line) => Boolean(line.marks?.callout?.enabled));
  const buildTargetStoresNoticeItem = (): TextContentItem => ({
    id: createNoticeId(),
    type: "text",
    lines: TARGET_STORES_NOTICE_LINES.map((text) => ({
      id: createNoticeId(),
      text,
      marks: { callout: { enabled: true, variant: "note" as const } },
    })),
  });
  const getItemLabel = (item: ContentItem) =>
    isNoticeItem(item) || (isTargetStores && isTargetStoresNoticeItem(item))
      ? "注意文言"
      : itemTypeLabels[item.type];
  const itemOptions = contentItems.map((item) => ({
    value: item.id,
    label: getItemLabel(item),
  }));
  const headerTargetOptions =
    inspectorScope === "section"
      ? sectionOptions
      : inspectorScope === "element"
      ? itemOptions
      : [{ value: "page", label: "ページ全体" }];
  const headerTargetValue =
    inspectorScope === "section"
      ? selectedSection?.id ?? ""
      : inspectorScope === "element"
      ? selectedItem?.id ?? ""
      : "page";
  const isHeaderTargetDisabled =
    inspectorScope === "page" || headerTargetOptions.length === 0;
  const targetStoresImageItems = isTargetStores
    ? contentItems.filter(
        (item): item is ImageContentItem => item.type === "image"
      )
    : [];
  const targetStoresButtonItems = isTargetStores
    ? contentItems.filter(
        (item): item is ButtonContentItem => item.type === "button"
      )
    : [];
  const buttonPresetGroups = [
    {
      label: "基本",
      options: [
        { value: "default", label: "基本" },
        { value: "secondary", label: "セカンダリ" },
        { value: "couponFlow", label: "クーポン利用方法" },
        { value: "block", label: "ブロック" },
        { value: "pill", label: "ピル" },
      ],
    },
    {
      label: "モノトーン",
      options: [
        { value: "dark", label: "ダーク" },
        { value: "light", label: "ライト" },
        { value: "slate", label: "スレート" },
        { value: "ghost", label: "ゴースト" },
        { value: "outlineDark", label: "アウトライン(ダーク)" },
      ],
    },
    {
      label: "ステータス",
      options: [
        { value: "success", label: "成功" },
        { value: "warning", label: "警告" },
        { value: "danger", label: "危険" },
      ],
    },
    {
      label: "アクセント",
      options: [
        { value: "ocean", label: "オーシャン" },
        { value: "violet", label: "バイオレット" },
        { value: "rose", label: "ローズ" },
        { value: "lime", label: "ライム" },
      ],
    },
  ];
  const buttonPresetMap: Record<string, ButtonContentItem["style"]> = {
    default: {
      presetId: "default",
      backgroundColor: "var(--lp-accent)",
      textColor: "#ffffff",
      borderColor: "var(--lp-accent)",
      borderWidth: 1,
      radius: 8,
      align: "left",
    },
    secondary: {
      presetId: "secondary",
      backgroundColor: "#ffffff",
      textColor: "var(--lp-accent)",
      borderColor: "var(--lp-accent)",
      borderWidth: 1,
      radius: 8,
      align: "left",
    },
    couponFlow: {
      presetId: "couponFlow",
      backgroundColor: "#ea5504",
      textColor: "#ffffff",
      borderColor: "#ffffff",
      borderWidth: 2,
      radius: 999,
      align: "center",
    },
    dark: {
      presetId: "dark",
      backgroundColor: "#0f172a",
      textColor: "#ffffff",
      borderColor: "#0f172a",
      borderWidth: 1,
      radius: 8,
      align: "left",
    },
    light: {
      presetId: "light",
      backgroundColor: "#f8fafc",
      textColor: "#0f172a",
      borderColor: "#e2e8f0",
      borderWidth: 1,
      radius: 8,
      align: "left",
    },
    success: {
      presetId: "success",
      backgroundColor: "#16a34a",
      textColor: "#ffffff",
      borderColor: "#16a34a",
      borderWidth: 1,
      radius: 8,
      align: "left",
    },
    warning: {
      presetId: "warning",
      backgroundColor: "#f59e0b",
      textColor: "#111827",
      borderColor: "#f59e0b",
      borderWidth: 1,
      radius: 8,
      align: "left",
    },
    danger: {
      presetId: "danger",
      backgroundColor: "#dc2626",
      textColor: "#ffffff",
      borderColor: "#dc2626",
      borderWidth: 1,
      radius: 8,
      align: "left",
    },
    ghost: {
      presetId: "ghost",
      backgroundColor: "transparent",
      textColor: "var(--lp-accent)",
      borderColor: "var(--lp-accent)",
      borderWidth: 1,
      radius: 8,
      align: "left",
    },
    pill: {
      presetId: "pill",
      backgroundColor: "#0ea5e9",
      textColor: "#ffffff",
      borderColor: "#0ea5e9",
      borderWidth: 1,
      radius: 999,
      align: "center",
    },
    block: {
      presetId: "block",
      backgroundColor: "var(--lp-accent)",
      textColor: "#ffffff",
      borderColor: "var(--lp-accent)",
      borderWidth: 1,
      radius: 10,
      align: "center",
      fullWidth: true,
    },
    slate: {
      presetId: "slate",
      backgroundColor: "#334155",
      textColor: "#ffffff",
      borderColor: "#334155",
      borderWidth: 1,
      radius: 8,
      align: "left",
    },
    ocean: {
      presetId: "ocean",
      backgroundColor: "#0891b2",
      textColor: "#ffffff",
      borderColor: "#0891b2",
      borderWidth: 1,
      radius: 8,
      align: "left",
    },
    violet: {
      presetId: "violet",
      backgroundColor: "#7c3aed",
      textColor: "#ffffff",
      borderColor: "#7c3aed",
      borderWidth: 1,
      radius: 8,
      align: "left",
    },
    rose: {
      presetId: "rose",
      backgroundColor: "#e11d48",
      textColor: "#ffffff",
      borderColor: "#e11d48",
      borderWidth: 1,
      radius: 8,
      align: "left",
    },
    lime: {
      presetId: "lime",
      backgroundColor: "#84cc16",
      textColor: "#1f2937",
      borderColor: "#84cc16",
      borderWidth: 1,
      radius: 8,
      align: "left",
    },
    outlineDark: {
      presetId: "outlineDark",
      backgroundColor: "transparent",
      textColor: "#0f172a",
      borderColor: "#0f172a",
      borderWidth: 1,
      radius: 8,
      align: "left",
    },
  };
  const tabbedNotesBandPresets = [
    {
      id: "classic",
      label: "クラシック",
      activeBg: "#111111",
      inactiveBg: "#dddddd",
      activeText: "#ffffff",
      inactiveText: "#111111",
    },
    {
      id: "ocean",
      label: "オーシャン",
      activeBg: "#0f4c81",
      inactiveBg: "#d9e8f5",
      activeText: "#ffffff",
      inactiveText: "#0f4c81",
    },
    {
      id: "sunset",
      label: "サンセット",
      activeBg: "#ef6c00",
      inactiveBg: "#ffe3cc",
      activeText: "#ffffff",
      inactiveText: "#8a3d00",
    },
    {
      id: "forest",
      label: "フォレスト",
      activeBg: "#1b5e20",
      inactiveBg: "#dcedc8",
      activeText: "#ffffff",
      inactiveText: "#1b5e20",
    },
  ];
  const tabbedNotesDesignPresets = [
    { id: "simple", label: "シンプル" },
    { id: "sticky", label: "付箋風" },
    { id: "underline", label: "下線あり" },
    { id: "popout", label: "吹き出し風" },
  ] as const;
  const couponFlowImageItems = isCouponFlow
    ? contentItems.filter(
        (item): item is ImageContentItem => item.type === "image"
      )
    : [];
  const couponFlowButtonItems = isCouponFlow
    ? contentItems.filter(
        (item): item is ButtonContentItem => item.type === "button"
      )
    : [];
  const targetStoresNoticeItem = isTargetStores
    ? contentItems.find(isTargetStoresNoticeItem)
    : undefined;
  const handleItemDragEnd = (event: DragEndEvent) => {
    if (!selectedSectionId || isLocked) {
      return;
    }
    const { active, over } = event;
    if (!over || active.id === over.id) {
      return;
    }
    const activeId = String(active.id);
    const overId = String(over.id);
    const fromIndex = contentItems.findIndex((item) => item.id === activeId);
    const toIndex = contentItems.findIndex((item) => item.id === overId);
    if (fromIndex < 0 || toIndex < 0) {
      return;
    }
    reorderContentItems(selectedSectionId, fromIndex, toIndex);
  };

  const SortableItemRow = ({
    item,
    index,
  }: {
    item: ContentItem;
    index: number;
  }) => {
    const isSelected = item.id === selectedItem?.id;
    const activeSectionId = selectedSectionId ?? selectedSection?.id;
    const actualIndex = contentItems.findIndex((entry) => entry.id === item.id);
    const isDragDisabled = isLocked || item.type === "title";
    const isMenuOpen = openItemMenuId === item.id;
    const canMoveUp =
      actualIndex > 0 && !isDragDisabled && Boolean(activeSectionId) && !isLocked;
    const canMoveDown =
      actualIndex < contentItems.length - 1 &&
      !isDragDisabled &&
      Boolean(activeSectionId) &&
      !isLocked;
    const canDelete = item.type !== "title" && Boolean(activeSectionId) && !isLocked;
    const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
      useSortable({ id: item.id, disabled: isDragDisabled });
    const style: CSSProperties = {
      transform: CSS.Transform.toString(transform),
      transition,
      opacity: isDragging ? 0.6 : 1,
    };

    return (
      <div
        ref={setNodeRef}
        style={style}
        className={
          "flex h-8 min-w-0 items-center gap-2 rounded-md border px-2 text-[12px] " +
          (isSelected
            ? "border-[var(--ui-ring)] bg-[var(--ui-panel)]/80"
            : "border-[var(--ui-border)]/50 bg-[var(--ui-panel)]/60")
        }
      >
        {!isDragDisabled ? (
          <button
            type="button"
            className="ui-button h-7 w-7 shrink-0 px-0"
            {...attributes}
            {...listeners}
            aria-label="並び替え"
            title="並び替え"
          >
            <GripVertical size={14} />
          </button>
        ) : (
          <span className="inline-flex h-7 w-7 shrink-0 items-center justify-center text-[var(--ui-muted)]">
            <GripVertical size={14} />
          </span>
        )}
        <button
          type="button"
          className="min-w-0 flex-1 truncate overflow-hidden text-left"
          onClick={() => {
            selectItemById(item.id);
            setInspectorScope("element");
          }}
        >
          {getItemLabel(item)}
        </button>
        <div className="flex items-center gap-1">
          <button
            type="button"
            className="ui-button h-7 w-7 px-0"
            aria-label="要素を表示"
            title="要素を表示"
            onClick={() => {
              selectItemById(item.id);
              setInspectorScope("element");
            }}
          >
            <Eye size={14} />
          </button>
          <div className="relative">
            <button
              type="button"
              className="ui-button h-7 w-7 px-0"
              aria-label="メニュー"
              title="メニュー"
              onClick={() =>
                setOpenItemMenuId((current) =>
                  current === item.id ? null : item.id
                )
              }
            >
              <MoreHorizontal size={14} />
            </button>
            {isMenuOpen ? (
              <div className="absolute right-0 top-8 z-20 w-36 rounded-md border border-[var(--ui-border)]/60 bg-[var(--ui-panel)]/95 p-1 text-[11px] shadow-lg">
                <button
                  type="button"
                  className="ui-button h-7 w-full justify-start px-2 text-[11px]"
                  onClick={() => {
                    if (!activeSectionId) {
                      return;
                    }
                    reorderContentItems(
                      activeSectionId,
                      actualIndex,
                      Math.max(0, actualIndex - 1)
                    );
                    setOpenItemMenuId(null);
                  }}
                  disabled={!canMoveUp}
                >
                  上へ移動
                </button>
                <button
                  type="button"
                  className="ui-button h-7 w-full justify-start px-2 text-[11px]"
                  onClick={() => {
                    if (!activeSectionId) {
                      return;
                    }
                    reorderContentItems(
                      activeSectionId,
                      actualIndex,
                      actualIndex + 1
                    );
                    setOpenItemMenuId(null);
                  }}
                  disabled={!canMoveDown}
                >
                  下へ移動
                </button>
                <button
                  type="button"
                  className="ui-button h-7 w-full justify-start px-2 text-[11px] text-rose-500"
                  onClick={() => {
                    if (!activeSectionId) {
                      return;
                    }
                    removeContentItem(activeSectionId, item.id);
                    setOpenItemMenuId(null);
                  }}
                  disabled={!canDelete}
                >
                  削除
                </button>
              </div>
            ) : null}
          </div>
        </div>
      </div>
    );
  };

  const handleImageImport = (
    file: File,
    onComplete: (assetId: string, dataUrl: string) => void
  ) => {
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = typeof reader.result === "string" ? reader.result : "";
      if (!dataUrl) {
        return;
      }
      const assetId = addAsset({ filename: file.name, data: dataUrl });
      onComplete(assetId, dataUrl);
    };
    reader.readAsDataURL(file);
  };

  const handleImageImportWithMeta = (
    file: File,
    onComplete: (assetId: string, dataUrl: string, width: number, height: number) => void
  ) => {
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = typeof reader.result === "string" ? reader.result : "";
      if (!dataUrl) {
        return;
      }
      const assetId = addAsset({ filename: file.name, data: dataUrl });
      const image = new window.Image();
      image.onload = () => {
        onComplete(assetId, dataUrl, image.naturalWidth, image.naturalHeight);
      };
      image.src = dataUrl;
    };
    reader.readAsDataURL(file);
  };

  const handleImagesImportWithMeta = async (
    files: FileList | File[],
    onComplete: (entries: Array<{ assetId: string; dataUrl: string; width: number; height: number; file: File }>) => void
  ) => {
    const list = Array.from(files);
    if (list.length === 0) {
      return;
    }
    const entries = await Promise.all(
      list.map(
        (file) =>
          new Promise<{
            assetId: string;
            dataUrl: string;
            width: number;
            height: number;
            file: File;
          }>((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => {
              const dataUrl = typeof reader.result === "string" ? reader.result : "";
              if (!dataUrl) {
                reject(new Error("Invalid image data"));
                return;
              }
              const assetId = addAsset({ filename: file.name, data: dataUrl });
              const image = new window.Image();
              image.onload = () => {
                resolve({
                  assetId,
                  dataUrl,
                  width: image.naturalWidth,
                  height: image.naturalHeight,
                  file,
                });
              };
              image.onerror = () => reject(new Error("Failed to load image"));
              image.src = dataUrl;
            };
            reader.onerror = () => reject(new Error("Failed to read image"));
            reader.readAsDataURL(file);
          })
      )
    );
    onComplete(entries);
  };

  const handleAddNoticeItem = () => {
    if (!selectedSection) {
      return;
    }
    const existing = contentItems.find(isNoticeItem);
    if (existing) {
      setSelectedItemId(existing.id);
      if (existing.type === "text" && existing.lines[0]) {
        setSelectedLineId(existing.lines[0].id);
      }
      return;
    }
    const noticeItem: TextContentItem = {
      id: createNoticeId(),
      type: "text",
      lines: NOTICE_LINES.map((text) => ({ id: createNoticeId(), text })),
    };
    updateSectionContent(selectedSection.id, {
      items: [...contentItems, noticeItem],
    });
    setSelectedItemId(noticeItem.id);
    setSelectedLineId(noticeItem.lines[0]?.id);
  };

  const handleAddTargetStoresNoticeItem = () => {
    if (!selectedSection) {
      return;
    }
    const existing = contentItems.find(isTargetStoresNoticeItem);
    if (existing) {
      setSelectedItemId(existing.id);
      setSelectedLineId(existing.lines[0]?.id);
      return;
    }
    const noticeItem = buildTargetStoresNoticeItem();
    updateSectionContent(selectedSection.id, {
      items: [...contentItems, noticeItem],
    });
    setSelectedItemId(noticeItem.id);
    setSelectedLineId(noticeItem.lines[0]?.id);
  };

  const addTargetStoresNoticeLine = (itemId: string) => {
    if (!selectedSection || isLocked) {
      return;
    }
    const nextLine: PrimaryLine = {
      id: createNoticeId(),
      text: "",
      marks: { callout: { enabled: true, variant: "note" as const } },
    };
    const nextItems = contentItems.map((item) => {
      if (item.id !== itemId || item.type !== "text") {
        return item;
      }
      return {
        ...item,
        lines: [...item.lines, nextLine],
      };
    });
    updateSectionContent(selectedSection.id, {
      items: nextItems,
    });
    setSelectedItemId(itemId);
    setSelectedLineId(nextLine.id);
  };

  const applyTextAlignToSelection = (nextAlign: "left" | "center" | "right") => {
    if (!selectedSection || !selectedTextItem) {
      return;
    }
    if (selectedLineId && selectedLine) {
      updateTextLineMarks(selectedSection.id, selectedTextItem.id, selectedLine.id, {
        textAlign: nextAlign,
      });
      return;
    }
    if (!selectedItemId) {
      return;
    }
    const nextItems = contentItems.map((item) => {
      if (item.type !== "text" || item.id !== selectedTextItem.id) {
        return item;
      }
      return {
        ...item,
        lines: item.lines.map((line) => ({
          ...line,
          marks: { ...(line.marks ?? {}), textAlign: nextAlign },
        })),
      };
    });
    updateSectionContent(selectedSection.id, { items: nextItems });
  };

  const updateStoreLabelConfig = (
    column: string,
    patch: {
      displayName?: string;
      color?: string;
    }
  ) => {
    if (!selectedSection) {
      return;
    }
    const base = resolvedStoreLabels[column];
    if (!base) {
      return;
    }
    const nextLabels = {
      ...storeLabels,
      [column]: {
        ...base,
        ...patch,
        columnKey: column,
      },
    };
    updateTargetStoresContent(selectedSection.id, {
      storeLabels: nextLabels,
    });
  };

  const parseStoresCsv = async (file: File) => {
    if (!selectedSection) {
      return;
    }
    if (selectedSection.locked) {
      setCsvError("ロック中のセクションは更新できません。");
      return;
    }
    const text = await file.text();
    const parsed = parseCsv(text);
    const headers = parsed.headers.map((header) => header.trim()).filter(Boolean);
    if (headers.length === 0) {
      setCsvError("CSVヘッダーが見つかりません。");
      setCsvImportDraft(null);
      setCsvImportModalOpen(false);
      return;
    }
    const requiredHeaders = ["店舗ID", "店舗名", "郵便番号", "住所", "都道府県"];

    const [storeIdKey, storeNameKey, postalCodeKey, addressKey, prefectureKey] =
      requiredHeaders;
    const extraColumns = headers.slice(requiredHeaders.length);

    const rows = parsed.rows.map((row) => {
      const record: Record<string, string> = {};
      headers.forEach((header, index) => {
        record[header] = row[index] ?? "";
      });
      return record;
    });

    const existingLabels =
      (selectedSection.content?.storeLabels ?? {}) as Record<
        string,
        {
          columnKey?: string;
          displayName?: string;
          color?: string;
          trueText?: string;
          falseText?: string;
          valueDisplay?: "toggle" | "raw";
          showAsFilter?: boolean;
          showAsBadge?: boolean;
        }
      >;
    const nextLabels: Record<
      string,
      {
        columnKey: string;
        displayName: string;
        color: string;
        trueText: string;
        falseText: string;
        valueDisplay: "toggle" | "raw";
        showAsFilter: boolean;
        showAsBadge: boolean;
      }
    > = {};
    extraColumns.forEach((column) => {
      const existing = existingLabels[column];
      const fallbackColor = getStableLabelColor(column);
      nextLabels[column] = {
        columnKey: column,
        displayName:
          typeof existing?.displayName === "string" &&
          existing.displayName.trim()
            ? existing.displayName
            : column,
        color:
          typeof existing?.color === "string" && existing.color.trim()
            ? existing.color
            : fallbackColor,
        trueText: "ON",
        falseText: "OFF",
        valueDisplay: "toggle",
        showAsFilter: true,
        showAsBadge: true,
      };
    });
    const nextFilters: Record<string, boolean> = {};
    extraColumns.forEach((column) => {
      nextFilters[column] = false;
    });

    const preview = buildCsvImportPreview({
      headers,
      rows,
      requiredHeaders,
      previewSize: 20,
      previewHeaders: [
        "店舗ID",
        "店舗名",
        "郵便番号",
        "都道府県",
        "住所",
        ...extraColumns,
      ],
      isTruthy: isTruthyStoreFlag,
    });
    const canImport =
      preview.summary.missingRequiredHeaders.length === 0 &&
      preview.summary.headerOrderValid &&
      preview.summary.validRows > 0;
    const duplicateIds = preview.duplicates.map((entry) => entry.storeId);

    setCsvImportDraft({
      sectionId: selectedSection.id,
      fileName: file.name,
      headers,
      preview,
      canImport,
      storeCsv: {
        headers,
        rows,
        importedAt: new Date().toISOString(),
        stats: {
          totalRows: rows.length,
          duplicateCount: preview.summary.duplicateIdCount,
          duplicateIds,
        },
      },
      storeLabels: nextLabels,
      storeFilters: nextFilters,
    });
    setCsvError(null);
    setCsvImportModalOpen(true);
  };

  const handleConfirmCsvImport = () => {
    if (!selectedSection || !csvImportDraft) {
      return;
    }
    if (!csvImportDraft.canImport) {
      return;
    }
    if (csvImportDraft.sectionId !== selectedSection.id) {
      return;
    }
    updateTargetStoresContent(selectedSection.id, {
      storeCsv: csvImportDraft.storeCsv,
      storeLabels: csvImportDraft.storeLabels,
      storeFilters: csvImportDraft.storeFilters,
    });
    setCsvImportDraft(null);
    setCsvImportModalOpen(false);
  };

  const handleCancelCsvImport = () => {
    setCsvImportDraft(null);
    setCsvImportModalOpen(false);
  };

  return (
    <>
      <aside className="ui-panel flex h-full min-h-0 flex-col rounded-none border-y-0 border-r-0">
        <div className="flex-1 min-h-0 overflow-y-auto">
          <div className="sticky top-0 z-30 bg-[var(--ui-panel)]/95 backdrop-blur">
            <InspectorHeader
              breadcrumb={breadcrumb}
              scope={inspectorScope}
              canSelectSection={canSelectSection}
              canSelectElement={canSelectElement}
              targetLabel="編集対象"
              targetOptions={headerTargetOptions}
              targetValue={headerTargetValue}
              targetDisabled={isHeaderTargetDisabled}
              onScopeChange={handleScopeChange}
              onTargetChange={(value) => {
                if (inspectorScope === "section") {
                  setSelectedSection(value || undefined);
                  setSelectedItemId(undefined);
                  setSelectedLineId(undefined);
                  setSelectedImageIds([]);
                  setInspectorScope("section");
                  return;
                }
                if (inspectorScope === "element") {
                  selectItemById(value);
                  setInspectorScope("element");
                }
              }}
              isSection={Boolean(isSection)}
              isLocked={isLockedDisplay}
              isVisible={isVisible}
              disableLock={false}
              onToggleLock={() =>
                selectedSection && toggleSectionLocked(selectedSection.id)
              }
              onToggleVisible={() =>
                selectedSection && toggleSectionVisible(selectedSection.id)
              }
              onDuplicateSection={() =>
                selectedSection && duplicateSection(selectedSection.id)
              }
              onDeleteSection={() =>
                selectedSection && deleteSection(selectedSection.id)
              }
              onResetPage={() => {
                setPageTypography(DEFAULT_PAGE_STYLE.typography);
                setPageColors(DEFAULT_PAGE_STYLE.colors);
                setPageSpacing(DEFAULT_PAGE_STYLE.spacing);
                setPageLayout(DEFAULT_PAGE_STYLE.layout);
              }}
            />
            <div className="border-b border-[var(--ui-border)]/60 px-3 py-2">
              <InspectorTabs
                value={activeTab}
                onChange={setActiveTab}
                hideStyle={hideStyleTab}
                hideAdvanced={isPageSelection || isSimpleMode}
              />
            </div>
          </div>
          <div className="px-3 py-3">
            <div className="flex flex-col gap-3">
              {isSimpleMode ? (
                <div className="rounded-lg border border-[var(--ui-border)] bg-[var(--ui-panel)]/70 p-3">
                  <div className="flex items-center justify-between gap-2">
                    <div className="text-[12px] font-semibold text-[var(--ui-text)]">
                      シンプルガイド
                    </div>
                    <button
                      type="button"
                      className="ui-button h-6 px-2 text-[10px]"
                      onClick={() => setIsSimpleGuideOpen((current) => !current)}
                    >
                      {isSimpleGuideOpen ? "閉じる" : "開く"}
                    </button>
                  </div>
                  {isSimpleGuideOpen ? (
                    <div className="mt-2 space-y-2">
                      <div className="text-[12px] text-[var(--ui-text)]">
                        {guideStep.title}
                      </div>
                      <div className="text-[11px] text-[var(--ui-muted)]">
                        {guideStep.body}
                      </div>
                      <div className="mt-2 flex items-center gap-2">
                        <button
                          type="button"
                          className="ui-button h-6 px-2 text-[10px]"
                          disabled={guideStepIndex === 0}
                          onClick={() =>
                            setSimpleGuideStep((current) => Math.max(0, current - 1))
                          }
                        >
                          前へ
                        </button>
                        <button
                          type="button"
                          className="ui-button h-6 px-2 text-[10px]"
                          onClick={() =>
                            setSimpleGuideStep((current) =>
                              current >= SIMPLE_GUIDE_STEPS.length - 1
                                ? 0
                                : current + 1
                            )
                          }
                        >
                          {guideStepIndex >= SIMPLE_GUIDE_STEPS.length - 1
                            ? "最初へ"
                            : "次へ"}
                        </button>
                      </div>
                    </div>
                  ) : null}
                </div>
              ) : null}
              <div className={bodyClass}>
                {activeTab === "style" ? (
              <div className="flex flex-col gap-3">
                    <Accordion title="基本" defaultOpen>
                      <div className="flex flex-col gap-3">
                    {isElementScope && selectedSection ? (
                      <div className={cardClass}>
                        <div className={cardHeaderClass}>
                          <span>クイック装飾</span>
                          {selectedTextItem && selectedLine && !isLegalNotes ? (
                            <button
                              type="button"
                              className="ui-button h-7 px-2 text-[11px]"
                              onClick={() => {
                                const nextItems = contentItems.map((item) => {
                                  if (
                                    item.id !== selectedTextItem.id ||
                                    item.type !== "text"
                                  ) {
                                    return item;
                                  }
                                  return {
                                    ...item,
                                    lines: item.lines.map((line) =>
                                      line.id === selectedLine.id
                                        ? { ...line, marks: undefined }
                                        : line
                                    ),
                                  };
                                });
                                updateSectionContent(selectedSection.id, {
                                  items: nextItems,
                                });
                              }}
                              aria-label={t.inspector.header.reset}
                              title={t.inspector.header.reset}
                            >
                              <RotateCcw size={14} />
                            </button>
                          ) : null}
                        </div>
                        <div
                          className={
                            cardBodyClass +
                            (isContentReady ? "" : " pointer-events-none opacity-60")
                          }
                        >
                          {!isContentReady ? (
                            <div className="rounded-md border border-dashed border-[var(--ui-border)]/60 bg-[var(--ui-panel)]/60 px-3 py-2 text-[11px] text-[var(--ui-muted)]">
                              {t.inspector.section.placeholders.selectContent}
                            </div>
                          ) : selectedTextItem && selectedLine ? (
                            !isLegalNotes ? (
                              <div className="space-y-3">
                                <div className={quickRowClass}>
                                  <div className={quickLabelClass}>テキスト位置</div>
                                  <div className={quickControlClass}>
                                    <div className={quickSegmentWrapClass}>
                                      {[
                                        { id: "left", label: "左" },
                                        { id: "center", label: "中央" },
                                        { id: "right", label: "右" },
                                      ].map((option) => (
                                        <button
                                          key={option.id}
                                          type="button"
                                          className={
                                            quickSegmentButtonClass +
                                            " " +
                                            (textAlignValue === option.id
                                              ? quickSegmentActiveClass
                                              : quickSegmentInactiveClass)
                                          }
                                          onClick={() =>
                                            applyTextAlignToSelection(
                                              option.id as "left" | "center" | "right"
                                            )
                                          }
                                          disabled={!isTextAlignEnabled}
                                        >
                                          {option.label}
                                        </button>
                                      ))}
                                    </div>
                                  </div>
                                </div>
                                <div className={quickRowClass}>
                                  <div className={quickLabelClass}>
                                    {t.inspector.section.fields.bold}
                                  </div>
                                  <div className={quickControlClass}>
                                    <ToggleField
                                      value={Boolean(selectedLine?.marks?.bold)}
                                      ariaLabel={t.inspector.section.fields.bold}
                                      onChange={(next) =>
                                        updateTextLineMarks(
                                          selectedSection.id,
                                          selectedTextItem.id,
                                          selectedLine.id,
                                          { bold: next }
                                        )
                                      }
                                    />
                                  </div>
                                </div>
                                <div className={quickRowClass}>
                                  <div className={quickLabelClass}>
                                    {t.inspector.section.fields.textColor}
                                  </div>
                                  <div className={quickControlClass}>
                                    <QuickColorControl
                                      value={selectedLine?.marks?.color ?? "#111111"}
                                      ariaLabel={t.inspector.section.fields.textColor}
                                      onChange={(next) =>
                                        updateTextLineMarks(
                                          selectedSection.id,
                                          selectedTextItem.id,
                                          selectedLine.id,
                                          { color: next }
                                        )
                                      }
                                    />
                                  </div>
                                </div>
                                <div className={quickRowClass}>
                                  <div className={quickLabelClass}>
                                    {t.inspector.section.fields.size}
                                  </div>
                                  <div className={quickControlClass}>
                                    <input
                                      type="number"
                                      className="ui-input h-8 w-[96px] text-[12px] text-right"
                                      value={
                                        selectedLine?.marks?.size ??
                                        selectedSection.style.typography.fontSize
                                      }
                                      min={10}
                                      max={48}
                                      step={1}
                                      aria-label={t.inspector.section.fields.size}
                                      onChange={(event) =>
                                        updateTextLineMarks(
                                          selectedSection.id,
                                          selectedTextItem.id,
                                          selectedLine.id,
                                          { size: Number(event.target.value) }
                                        )
                                      }
                                    />
                                  </div>
                                </div>
                                <div className="grid grid-cols-2 gap-2">
                                  <button
                                    type="button"
                                    className="ui-button h-7 w-full px-2 text-[11px]"
                                    onClick={() =>
                                      applyLineMarksToAllLines(
                                        selectedSection.id,
                                        selectedTextItem.id,
                                        selectedLine.id
                                      )
                                    }
                                  >
                                    {t.inspector.section.buttons.applyLineStyleAll}
                                  </button>
                                  <button
                                    type="button"
                                    className="ui-button h-7 w-full px-2 text-[11px]"
                                    onClick={() =>
                                      promoteLineMarksToSectionTypography(
                                        selectedSection.id,
                                        selectedTextItem.id,
                                        selectedLine.id
                                      )
                                    }
                                  >
                                    {t.inspector.section.buttons.promoteLineStyle}
                                  </button>
                                </div>
                              </div>
                            ) : (
                              <div className="rounded-md border border-dashed border-[var(--ui-border)]/60 bg-[var(--ui-panel)]/60 px-3 py-2 text-[11px] text-[var(--ui-muted)]">
                                装飾は本文から編集できます。
                              </div>
                            )
                          ) : selectedTitleItem ? (
                            <div className="space-y-3">
                              <div className={quickRowClass}>
                                <div className={quickLabelClass}>
                                  {t.inspector.section.fields.bold}
                                </div>
                                <div className={quickControlClass}>
                                  <ToggleField
                                    value={Boolean(selectedTitleItem.marks?.bold)}
                                    ariaLabel={t.inspector.section.fields.bold}
                                    onChange={(next) =>
                                      updateTitleItemMarks(
                                        selectedSection.id,
                                        selectedTitleItem.id,
                                        {
                                          bold: next,
                                        }
                                      )
                                    }
                                  />
                                </div>
                              </div>
                              <div className={quickRowClass}>
                                <div className={quickLabelClass}>
                                  {t.inspector.section.fields.textColor}
                                </div>
                                <div className={quickControlClass}>
                                  <QuickColorControl
                                    value={selectedTitleItem.marks?.color ?? "#111111"}
                                    ariaLabel={t.inspector.section.fields.textColor}
                                    onChange={(next) =>
                                      updateTitleItemMarks(
                                        selectedSection.id,
                                        selectedTitleItem.id,
                                        {
                                          color: next,
                                        }
                                      )
                                    }
                                  />
                                </div>
                              </div>
                              <div className={quickRowClass}>
                                <div className={quickLabelClass}>
                                  {t.inspector.section.fields.size}
                                </div>
                                <div className={quickControlClass}>
                                  <input
                                    type="number"
                                    className="ui-input h-8 w-[96px] text-[12px] text-right"
                                    value={selectedTitleItem.marks?.size ?? 20}
                                    min={12}
                                    max={48}
                                    step={1}
                                    aria-label={t.inspector.section.fields.size}
                                    onChange={(event) =>
                                      updateTitleItemMarks(
                                        selectedSection.id,
                                        selectedTitleItem.id,
                                        {
                                          size: Number(event.target.value),
                                        }
                                      )
                                    }
                                  />
                                </div>
                              </div>
                            </div>
                          ) : (
                            <div className="rounded-md border border-dashed border-[var(--ui-border)]/60 bg-[var(--ui-panel)]/60 px-3 py-2 text-[11px] text-[var(--ui-muted)]">
                              {t.inspector.section.placeholders.selectContent}
                            </div>
                          )}
                        </div>
                      </div>
                    ) : null}
                    {selected.kind !== "page" &&
                    !isBrandBar &&
                    !isHeroImage &&
                    !isInquiry ? (
                      <div className={cardClass}>
                        <button
                          type="button"
                          className={cardHeaderClass + " w-full"}
                          aria-expanded={isQuickStyleOpen}
                          onClick={() => setIsQuickStyleOpen((current) => !current)}
                        >
                          <span>{t.inspector.section.cards.quickStyle}</span>
                          <ChevronDown
                            size={14}
                            className={
                              isQuickStyleOpen
                                ? "rotate-180 transition"
                                : "transition"
                            }
                          />
                        </button>
                        {isQuickStyleOpen ? (
                          <div
                            className={
                              cardBodyClass +
                              (isContentReady
                                ? ""
                                : " pointer-events-none opacity-60")
                            }
                          >
                            {!isContentReady ? (
                              <div className="rounded-md border border-dashed border-[var(--ui-border)]/60 bg-[var(--ui-panel)]/60 px-3 py-2 text-[11px] text-[var(--ui-muted)]">
                                {t.inspector.section.placeholders.selectContent}
                              </div>
                            ) : (
                              <>
                                {isCampaignPeriodBar ? (
                                  <div className="space-y-3">
                                    <div className={quickRowClass}>
                                      <div className={quickLabelClass}>
                                        {t.inspector.section.fields.lineText}
                                      </div>
                                      <div className={quickControlClass}>
                                        <input
                                          type="text"
                                          className="ui-input h-8 w-full text-[12px]"
                                          value={periodBarText}
                                          onChange={(event) =>
                                            updateSectionData(selectedSection.id, {
                                              periodBarText: event.target.value,
                                            })
                                          }
                                        />
                                      </div>
                                    </div>
                                    <div className={quickRowClass}>
                                      <div className={quickLabelClass}>
                                        {t.inspector.section.fields.bold}
                                      </div>
                                      <div className={quickControlClass}>
                                        <ToggleField
                                          value={Boolean(periodBarStyle.bold)}
                                          ariaLabel={t.inspector.section.fields.bold}
                                          onChange={(next) =>
                                            updateSectionData(selectedSection.id, {
                                              periodBarStyle: {
                                                ...periodBarStyle,
                                                bold: next,
                                              },
                                            })
                                          }
                                        />
                                      </div>
                                    </div>
                                    <div className={quickRowClass}>
                                      <div className={quickLabelClass}>
                                        {t.inspector.section.fields.textColor}
                                      </div>
                                      <div className={quickControlClass}>
                                        <QuickColorControl
                                          value={periodBarStyle.color ?? "#ffffff"}
                                          ariaLabel={t.inspector.section.fields.textColor}
                                          onChange={(next) =>
                                            updateSectionData(selectedSection.id, {
                                              periodBarStyle: {
                                                ...periodBarStyle,
                                                color: next,
                                              },
                                            })
                                          }
                                        />
                                      </div>
                                    </div>
                                    <div className={quickRowClass}>
                                      <div className={quickLabelClass}>
                                        {t.inspector.section.fields.size}
                                      </div>
                                      <div className={quickControlClass}>
                                        <input
                                          type="number"
                                          className="ui-input h-8 w-[96px] text-[12px] text-right"
                                          value={periodBarStyle.size ?? 14}
                                          min={10}
                                          max={32}
                                          step={1}
                                          aria-label={t.inspector.section.fields.size}
                                          onChange={(event) =>
                                            updateSectionData(selectedSection.id, {
                                              periodBarStyle: {
                                                ...periodBarStyle,
                                                size: Number(event.target.value),
                                              },
                                            })
                                          }
                                        />
                                      </div>
                                    </div>
                                  </div>
                                ) : selectedTextItem && selectedLine ? (
                                  <div className="space-y-3">
                                    <div className="rounded-md border border-[var(--ui-border)]/60 bg-[var(--ui-panel)]/60 p-3">
                                      <div className="mb-3 text-[12px] font-medium text-[var(--ui-text)]">
                                        付箋デザイン
                                      </div>
                                      <div className="space-y-3">
                                        <div className={quickRowClass}>
                                          <div className={quickLabelClass}>有効</div>
                                          <div className={quickControlClass}>
                                            <ToggleField
                                              value={Boolean(
                                                selectedLine.marks?.callout?.enabled
                                              )}
                                              ariaLabel="有効"
                                              onChange={(next) =>
                                                applyCalloutToSelection(
                                                  { enabled: next },
                                                  calloutScope
                                                )
                                              }
                                              disabled={!isCalloutScopeEnabled}
                                            />
                                          </div>
                                        </div>
                                        <div className={quickRowClass}>
                                          <div className={quickLabelClass}>適用範囲</div>
                                          <div className={quickControlClass}>
                                            <div className="inline-flex gap-2">
                                              <button
                                                type="button"
                                                className={
                                                  "ui-button h-6 px-2 text-[10px] " +
                                                  (calloutScopeChoice === "line"
                                                    ? " text-[var(--ui-text)]"
                                                    : " text-[var(--ui-muted)]")
                                                }
                                                onClick={() =>
                                                  setCalloutScopeChoice("line")
                                                }
                                                disabled={!isLineScopeEnabled}
                                              >
                                                行
                                              </button>
                                              <button
                                                type="button"
                                                className={
                                                  "ui-button h-6 px-2 text-[10px] " +
                                                  (calloutScopeChoice === "item"
                                                    ? " text-[var(--ui-text)]"
                                                    : " text-[var(--ui-muted)]")
                                                }
                                                onClick={() =>
                                                  setCalloutScopeChoice("item")
                                                }
                                                disabled={!isItemScopeEnabled}
                                              >
                                                アイテム
                                              </button>
                                            </div>
                                          </div>
                                        </div>
                                        <div className={quickRowClass}>
                                          <div className={quickLabelClass}>種別</div>
                                          <div className={quickControlClass}>
                                            <div className={quickSegmentWrapClass}>
                                              {[
                                                {
                                                  id: "note",
                                                  label: "Note",
                                                  accent: "bg-amber-500",
                                                },
                                                {
                                                  id: "warn",
                                                  label: "Warn",
                                                  accent: "bg-rose-500",
                                                },
                                                {
                                                  id: "info",
                                                  label: "Info",
                                                  accent: "bg-sky-500",
                                                },
                                              ].map((preset) => (
                                                <button
                                                  key={preset.id}
                                                  type="button"
                                                  className={
                                                    quickSegmentButtonClass +
                                                    " " +
                                                    (calloutVariant === preset.id
                                                      ? quickSegmentActiveClass
                                                      : quickSegmentInactiveClass)
                                                  }
                                                  onClick={() =>
                                                    applyCalloutToSelection(
                                                      {
                                                        enabled: true,
                                                        variant: preset.id as
                                                          | "note"
                                                          | "warn"
                                                          | "info",
                                                        bg: true,
                                                        border: true,
                                                        radius: 12,
                                                        padding: "md",
                                                        shadow: "none",
                                                      },
                                                      calloutScope
                                                    )
                                                  }
                                                  disabled={!isCalloutScopeEnabled}
                                                >
                                                  <span className="inline-flex items-center gap-1">
                                                    <span
                                                      className={`h-2 w-2 rounded-full ${preset.accent}`}
                                                    />
                                                    {preset.label}
                                                  </span>
                                                </button>
                                              ))}
                                            </div>
                                          </div>
                                        </div>
                                      </div>
                                    </div>
                                    <Accordion
                                      title="付箋デザイン詳細"
                                      defaultOpen={false}
                                    >
                                      <div
                                        className={
                                          "space-y-3 py-2" +
                                          (isCalloutScopeEnabled
                                            ? ""
                                            : " pointer-events-none opacity-60")
                                        }
                                      >
                                        <div className={quickRowClass}>
                                          <div className={quickLabelClass}>背景</div>
                                          <div className={quickControlClass}>
                                            <ToggleField
                                              value={Boolean(
                                                selectedLine.marks?.callout?.bg ?? true
                                              )}
                                              ariaLabel="背景"
                                              onChange={(next) =>
                                                applyCalloutToSelection(
                                                  { enabled: true, bg: next },
                                                  calloutScope
                                                )
                                              }
                                            />
                                          </div>
                                        </div>
                                        <div className={quickRowClass}>
                                          <div className={quickLabelClass}>背景色</div>
                                          <div className={quickControlClass}>
                                            <QuickColorControl
                                              value={
                                                selectedLine.marks?.callout?.bgColor ??
                                                calloutDefaults.bg
                                              }
                                              ariaLabel="背景色"
                                              onChange={(next) =>
                                                applyCalloutToSelection(
                                                  { bgColor: next },
                                                  calloutScope
                                                )
                                              }
                                            />
                                          </div>
                                        </div>
                                        <div className={quickRowClass}>
                                          <div className={quickLabelClass}>枠線</div>
                                          <div className={quickControlClass}>
                                            <ToggleField
                                              value={Boolean(
                                                selectedLine.marks?.callout?.border ??
                                                  true
                                              )}
                                              ariaLabel="枠線"
                                              onChange={(next) =>
                                                applyCalloutToSelection(
                                                  { enabled: true, border: next },
                                                  calloutScope
                                                )
                                              }
                                            />
                                          </div>
                                        </div>
                                        <div className={quickRowClass}>
                                          <div className={quickLabelClass}>枠線色</div>
                                          <div className={quickControlClass}>
                                            <QuickColorControl
                                              value={
                                                selectedLine.marks?.callout?.borderColor ??
                                                calloutDefaults.border
                                              }
                                              ariaLabel="枠線色"
                                              onChange={(next) =>
                                                applyCalloutToSelection(
                                                  { borderColor: next },
                                                  calloutScope
                                                )
                                              }
                                            />
                                          </div>
                                        </div>
                                        <div className={quickRowClass}>
                                          <div className={quickLabelClass}>角丸</div>
                                          <div className={quickControlClass}>
                                            <input
                                              type="number"
                                              className="ui-input h-8 w-[96px] text-[12px] text-right"
                                              value={
                                                selectedLine.marks?.callout?.radius ?? 12
                                              }
                                              min={0}
                                              max={32}
                                              step={1}
                                              aria-label="角丸"
                                              onChange={(event) =>
                                                applyCalloutToSelection(
                                                  {
                                                    enabled: true,
                                                    radius: Number(event.target.value),
                                                  },
                                                  calloutScope
                                                )
                                              }
                                            />
                                          </div>
                                        </div>
                                        <div className={quickRowClass}>
                                          <div className={quickLabelClass}>余白</div>
                                          <div className={quickControlClass}>
                                            <SegmentedField
                                              value={
                                                selectedLine.marks?.callout?.padding ?? "md"
                                              }
                                              ariaLabel="余白"
                                              options={[
                                                { value: "sm", label: "S" },
                                                { value: "md", label: "M" },
                                                { value: "lg", label: "L" },
                                              ]}
                                              onChange={(next) =>
                                                applyCalloutToSelection(
                                                  { enabled: true, padding: next },
                                                  calloutScope
                                                )
                                              }
                                            />
                                          </div>
                                        </div>
                                        <div className={quickRowClass}>
                                          <div className={quickLabelClass}>影</div>
                                          <div className={quickControlClass}>
                                            <SelectField
                                              value={
                                                selectedLine.marks?.callout?.shadow ?? "none"
                                              }
                                              ariaLabel="影"
                                              onChange={(next) =>
                                                applyCalloutToSelection(
                                                  {
                                                    enabled: true,
                                                    shadow: next as "none" | "sm" | "md",
                                                  },
                                                  calloutScope
                                                )
                                              }
                                            >
                                              <option value="none">なし</option>
                                              <option value="sm">小</option>
                                              <option value="md">中</option>
                                            </SelectField>
                                          </div>
                                        </div>
                                      </div>
                                    </Accordion>
                                  </div>
                                ) : selectedImageItem ? (
                                  <div className="rounded-md border border-dashed border-[var(--ui-border)]/60 bg-[var(--ui-panel)]/60 px-3 py-2 text-[11px] text-[var(--ui-muted)]">
                                    {t.inspector.section.placeholders.imageQuickStyle}
                                  </div>
                                ) : (
                                  <div className="rounded-md border border-dashed border-[var(--ui-border)]/60 bg-[var(--ui-panel)]/60 px-3 py-2 text-[11px] text-[var(--ui-muted)]">
                                    {t.inspector.section.placeholders.selectContent}
                                  </div>
                                )}
                              </>
                            )}
                          </div>
                        ) : null}
                      </div>
                    ) : null}
                {selected.kind === "page" ? (
                  <>
                    {!isSimpleMode ? (
                      <PageStyleBackground
                        target={backgroundTarget}
                        onTargetChange={setBackgroundTarget}
                        spec={activeBackgroundSpec}
                        onChange={applyBackgroundSpec}
                        resolveAssetUrl={(assetId) => assets?.[assetId]?.data}
                        onAddAsset={addAsset}
                      />
                    ) : null}
                    <PageStyleColors
                      value={pageStyle.colors}
                      onChange={setPageColors}
                    />
                    {!isSimpleMode && designTargetSection ? (
                      <Accordion
                        title="セクションデザイン"
                        icon={<LayoutGrid size={14} />}
                      >
                        <SectionCardPresetGallery
                          sectionStyle={designTargetSection.style}
                          currentStyle={designTargetCardStyle}
                          onSelect={applySectionDesignPresetToAll}
                          onReset={(presetId) =>
                            applySectionDesignPresetToAll(presetId, {
                              reset: true,
                            })
                          }
                        />
                      </Accordion>
                    ) : null}
                  </>
                ) : selectedSection ? (
                  isSimpleMode ? (
                    <div className="rounded-md border border-[var(--ui-border)]/60 bg-[var(--ui-panel)]/60 px-3 py-2 text-[12px] text-[var(--ui-muted)]">
                      スタイル編集は「内容」タブのクイック設定で行えます。
                    </div>
                  ) : (
                    <SectionStylePanel
                      style={selectedSection.style}
                      cardStyle={
                        selectedSection.sectionCardStyle ??
                        DEFAULT_SECTION_CARD_STYLE
                      }
                      showSectionDesign={!isInquiry}
                      showPeriodBarHeight={
                        selectedSection.type === "campaignPeriodBar"
                      }
                      hideGradient={isTabbedNotes}
                      hideTitleBand={isTabbedNotes}
                      surfaceExtras={
                        isTabbedNotes ? (
                          <div className="mt-2 rounded-md border border-[var(--ui-border)]/60 bg-[var(--ui-panel)]/60 px-2 py-2">
                            <div className="mb-2 text-[11px] font-semibold text-[var(--ui-text)]">
                              付箋タブ帯
                            </div>
                            <div className="mb-2 text-[11px] text-[var(--ui-muted)]">
                              デザイン
                            </div>
                            <div className="flex flex-wrap gap-2">
                              {tabbedNotesDesignPresets.map((preset) => {
                                const isActivePreset =
                                  tabbedNotesData.tabStyle.variant === preset.id;
                                return (
                                  <button
                                    key={preset.id}
                                    type="button"
                                    className={
                                      "rounded-full border px-3 py-1 text-[11px] transition " +
                                      (isActivePreset
                                        ? "border-[var(--ui-ring)] bg-[var(--ui-panel)]/80"
                                        : "border-[var(--ui-border)]/60 bg-[var(--ui-panel)]/60 hover:border-[var(--ui-border)]")
                                    }
                                    onClick={() =>
                                      updateSectionData(selectedSection.id, {
                                        tabStyle: {
                                          ...tabbedNotesData.tabStyle,
                                          variant: preset.id,
                                        },
                                      })
                                    }
                                  >
                                    {preset.label}
                                  </button>
                                );
                              })}
                            </div>
                            <div className="mb-2 text-[11px] text-[var(--ui-muted)]">
                              プリセット
                            </div>
                            <div className="flex flex-wrap gap-2">
                              {tabbedNotesBandPresets.map((preset) => {
                                const isActivePreset =
                                  tabbedNotesData.tabStyle.activeBg === preset.activeBg &&
                                  tabbedNotesData.tabStyle.inactiveBg ===
                                    preset.inactiveBg &&
                                  tabbedNotesData.tabStyle.activeText ===
                                    preset.activeText &&
                                  tabbedNotesData.tabStyle.inactiveText ===
                                    preset.inactiveText;
                                return (
                                  <button
                                    key={preset.id}
                                    type="button"
                                    className={
                                      "inline-flex items-center gap-2 rounded-full border px-3 py-1 text-[11px] transition " +
                                      (isActivePreset
                                        ? "border-[var(--ui-ring)] bg-[var(--ui-panel)]/80"
                                        : "border-[var(--ui-border)]/60 bg-[var(--ui-panel)]/60 hover:border-[var(--ui-border)]")
                                    }
                                    onClick={() =>
                                      updateSectionData(selectedSection.id, {
                                        tabStyle: {
                                          ...tabbedNotesData.tabStyle,
                                          activeBg: preset.activeBg,
                                          inactiveBg: preset.inactiveBg,
                                          activeText: preset.activeText,
                                          inactiveText: preset.inactiveText,
                                        },
                                      })
                                    }
                                  >
                                    <span className="font-semibold text-[var(--ui-text)]">
                                      {preset.label}
                                    </span>
                                    <span className="inline-flex overflow-hidden rounded-full border border-[var(--ui-border)]/60">
                                      <span
                                        className="px-2 py-0.5 text-[10px] font-semibold"
                                        style={{
                                          background: preset.activeBg,
                                          color: preset.activeText,
                                        }}
                                      >
                                        タブ
                                      </span>
                                      <span
                                        className="px-2 py-0.5 text-[10px] font-semibold"
                                        style={{
                                          background: preset.inactiveBg,
                                          color: preset.inactiveText,
                                        }}
                                      >
                                        タブ
                                      </span>
                                    </span>
                                  </button>
                                );
                              })}
                            </div>
                            <FieldRow label="帯背景1">
                              <ColorField
                                value={tabbedNotesData.tabStyle.activeBg}
                                ariaLabel="帯背景1"
                                onChange={(next) =>
                                  updateSectionData(selectedSection.id, {
                                    tabStyle: {
                                      ...tabbedNotesData.tabStyle,
                                      activeBg: next,
                                    },
                                  })
                                }
                              />
                            </FieldRow>
                            <FieldRow label="帯背景2">
                              <ColorField
                                value={tabbedNotesData.tabStyle.inactiveBg}
                                ariaLabel="帯背景2"
                                onChange={(next) =>
                                  updateSectionData(selectedSection.id, {
                                    tabStyle: {
                                      ...tabbedNotesData.tabStyle,
                                      inactiveBg: next,
                                    },
                                  })
                                }
                              />
                            </FieldRow>
                            <FieldRow label="帯文字1">
                              <ColorField
                                value={tabbedNotesData.tabStyle.activeText}
                                ariaLabel="帯文字1"
                                onChange={(next) =>
                                  updateSectionData(selectedSection.id, {
                                    tabStyle: {
                                      ...tabbedNotesData.tabStyle,
                                      activeText: next,
                                    },
                                  })
                                }
                              />
                            </FieldRow>
                            <FieldRow label="帯文字2">
                              <ColorField
                                value={tabbedNotesData.tabStyle.inactiveText}
                                ariaLabel="帯文字2"
                                onChange={(next) =>
                                  updateSectionData(selectedSection.id, {
                                    tabStyle: {
                                      ...tabbedNotesData.tabStyle,
                                      inactiveText: next,
                                    },
                                  })
                                }
                              />
                            </FieldRow>
                            <FieldRow label="境界線">
                              <ColorField
                                value={tabbedNotesData.tabStyle.border}
                                ariaLabel="境界線"
                                onChange={(next) =>
                                  updateSectionData(selectedSection.id, {
                                    tabStyle: {
                                      ...tabbedNotesData.tabStyle,
                                      border: next,
                                    },
                                  })
                                }
                              />
                            </FieldRow>
                            <FieldRow label="本文背景">
                              <ColorField
                                value={tabbedNotesData.tabStyle.contentBg}
                                ariaLabel="本文背景"
                                onChange={(next) =>
                                  updateSectionData(selectedSection.id, {
                                    tabStyle: {
                                      ...tabbedNotesData.tabStyle,
                                      contentBg: next,
                                    },
                                  })
                                }
                              />
                            </FieldRow>
                            <FieldRow label="本文枠線">
                              <ColorField
                                value={tabbedNotesData.tabStyle.contentBorder}
                                ariaLabel="本文枠線"
                                onChange={(next) =>
                                  updateSectionData(selectedSection.id, {
                                    tabStyle: {
                                      ...tabbedNotesData.tabStyle,
                                      contentBorder: next,
                                    },
                                  })
                                }
                              />
                            </FieldRow>
                            <FieldRow label="強調文字色">
                              <ColorField
                                value={tabbedNotesData.tabStyle.accent}
                                ariaLabel="強調文字色"
                                onChange={(next) =>
                                  updateSectionData(selectedSection.id, {
                                    tabStyle: {
                                      ...tabbedNotesData.tabStyle,
                                      accent: next,
                                    },
                                  })
                                }
                              />
                            </FieldRow>
                          </div>
                        ) : null
                      }
                      onStyleChange={(patch) =>
                        updateSectionStyle(selectedSection.id, patch)
                      }
                      onCardStyleChange={(patch) =>
                        updateSectionCardStyle(selectedSection.id, patch)
                      }
                      onApplyStyleToAll={applyStyleToAllSections}
                      onApplySectionDesignPreset={(presetId) =>
                        applySectionDesignPreset(presetId)
                      }
                      onResetSectionDesignPreset={(presetId) =>
                        applySectionDesignPreset(presetId, { reset: true })
                      }
                    />
                  )
                ) : (
                  <div className="rounded-md border border-[var(--ui-border)]/60 bg-[var(--ui-panel)]/60 px-3 py-2 text-[12px] text-[var(--ui-muted)]">
                    {t.inspector.placeholders.blockComingSoon}
                  </div>
                )}
                      </div>
                    </Accordion>
                    <Accordion title="詳細" defaultOpen={false}>
                      {selected.kind === "page" ? (
                        <>
                          <PageStyleTypography
                            value={pageStyle.typography}
                            onChange={setPageTypography}
                            defaultOpen
                          />
                          {!isSimpleMode && designTargetSection ? (
                            <Accordion title="サーフェス" icon={<LayoutGrid size={14} />}>
                              <FieldRow label={t.inspector.section.fields.gradient}>
                                <ToggleField
                                  value={
                                    designTargetSection.style.background.type ===
                                    "gradient"
                                  }
                                  ariaLabel={t.inspector.section.fields.gradient}
                                  onChange={(next) =>
                                    applySectionAppearanceToAll(
                                      mergeSectionStyle(designTargetSection.style, {
                                        background: {
                                          type: next ? "gradient" : "solid",
                                        },
                                      }),
                                      designTargetCardStyle,
                                      {
                                        excludeTypes: [
                                          "brandBar",
                                          "heroImage",
                                          "footerHtml",
                                        ],
                                      }
                                    )
                                  }
                                />
                              </FieldRow>
                              {designTargetSection.style.background.type ===
                              "gradient" ? (
                                <>
                                  <FieldRow label={t.inspector.section.fields.color1}>
                                    <ColorField
                                      value={designTargetSection.style.background.color1}
                                      ariaLabel={t.inspector.section.fields.color1}
                                      onChange={(next) =>
                                        applySectionAppearanceToAll(
                                          mergeSectionStyle(designTargetSection.style, {
                                            background: { color1: next },
                                          }),
                                          designTargetCardStyle,
                                          {
                                            excludeTypes: [
                                              "brandBar",
                                              "heroImage",
                                              "footerHtml",
                                            ],
                                          }
                                        )
                                      }
                                    />
                                  </FieldRow>
                                  <FieldRow label={t.inspector.section.fields.color2}>
                                    <ColorField
                                      value={designTargetSection.style.background.color2}
                                      ariaLabel={t.inspector.section.fields.color2}
                                      onChange={(next) =>
                                        applySectionAppearanceToAll(
                                          mergeSectionStyle(designTargetSection.style, {
                                            background: { color2: next },
                                          }),
                                          designTargetCardStyle,
                                          {
                                            excludeTypes: [
                                              "brandBar",
                                              "heroImage",
                                              "footerHtml",
                                            ],
                                          }
                                        )
                                      }
                                    />
                                  </FieldRow>
                                </>
                              ) : (
                                <FieldRow label={t.inspector.section.fields.background}>
                                  <ColorField
                                    value={designTargetSection.style.background.color1}
                                    ariaLabel={t.inspector.section.fields.background}
                                    onChange={(next) =>
                                      applySectionAppearanceToAll(
                                        mergeSectionStyle(designTargetSection.style, {
                                          background: { color1: next },
                                        }),
                                        designTargetCardStyle,
                                        {
                                          excludeTypes: [
                                            "brandBar",
                                            "heroImage",
                                            "footerHtml",
                                          ],
                                        }
                                      )
                                    }
                                  />
                                </FieldRow>
                              )}
                              <FieldRow label={t.inspector.section.fields.border}>
                                <ToggleField
                                  value={designTargetSection.style.border.enabled}
                                  ariaLabel={t.inspector.section.fields.border}
                                  onChange={(next) =>
                                    applySectionAppearanceToAll(
                                      mergeSectionStyle(designTargetSection.style, {
                                        border: { enabled: next },
                                      }),
                                      designTargetCardStyle,
                                      {
                                        excludeTypes: [
                                          "brandBar",
                                          "heroImage",
                                          "footerHtml",
                                        ],
                                      }
                                    )
                                  }
                                />
                              </FieldRow>
                              {designTargetSection.style.border.enabled ? (
                                <>
                                  <FieldRow
                                    label={t.inspector.section.fields.borderWidth}
                                  >
                                    <NumberField
                                      value={designTargetSection.style.border.width}
                                      min={0}
                                      max={12}
                                      step={1}
                                      ariaLabel={t.inspector.section.fields.borderWidth}
                                      onChange={(next) =>
                                        applySectionAppearanceToAll(
                                          mergeSectionStyle(designTargetSection.style, {
                                            border: { width: next },
                                          }),
                                          designTargetCardStyle,
                                          {
                                            excludeTypes: [
                                              "brandBar",
                                              "heroImage",
                                              "footerHtml",
                                            ],
                                          }
                                        )
                                      }
                                    />
                                  </FieldRow>
                                  <FieldRow
                                    label={t.inspector.section.fields.borderColor}
                                  >
                                    <ColorField
                                      value={designTargetSection.style.border.color}
                                      ariaLabel={t.inspector.section.fields.borderColor}
                                      onChange={(next) =>
                                        applySectionAppearanceToAll(
                                          mergeSectionStyle(designTargetSection.style, {
                                            border: { color: next },
                                          }),
                                          designTargetCardStyle,
                                          {
                                            excludeTypes: [
                                              "brandBar",
                                              "heroImage",
                                              "footerHtml",
                                            ],
                                          }
                                        )
                                      }
                                    />
                                  </FieldRow>
                                </>
                              ) : null}
                              <FieldRow label={t.inspector.section.fields.shadow}>
                                <SelectField
                                  value={designTargetSection.style.shadow}
                                  ariaLabel={t.inspector.section.fields.shadow}
                                  onChange={(next) =>
                                    applySectionAppearanceToAll(
                                      mergeSectionStyle(designTargetSection.style, {
                                        shadow: next as SectionBase["style"]["shadow"],
                                      }),
                                      designTargetCardStyle,
                                      {
                                        excludeTypes: [
                                          "brandBar",
                                          "heroImage",
                                          "footerHtml",
                                        ],
                                      }
                                    )
                                  }
                                >
                                  <option value="none">
                                    {t.inspector.section.shadowOptions.none}
                                  </option>
                                  <option value="sm">
                                    {t.inspector.section.shadowOptions.sm}
                                  </option>
                                  <option value="md">
                                    {t.inspector.section.shadowOptions.md}
                                  </option>
                                </SelectField>
                              </FieldRow>
                              <div className="mt-2 rounded-md border border-[var(--ui-border)]/60 bg-[var(--ui-panel)]/60 px-2 py-2">
                                <div className="mb-2 text-[11px] font-semibold text-[var(--ui-text)]">
                                  タイトル帯
                                </div>
                                <FieldRow label="帯背景色">
                                  <ColorField
                                    value={designTargetCardStyle.headerBgColor || "#5fc2f5"}
                                    ariaLabel="帯背景色"
                                    onChange={(next) =>
                                      applySectionAppearanceToAll(
                                        designTargetSection.style,
                                        mergeCardStyle(designTargetSection.sectionCardStyle, {
                                          headerBgColor: next,
                                        }),
                                        {
                                          excludeTypes: [
                                            "brandBar",
                                            "heroImage",
                                            "footerHtml",
                                          ],
                                        }
                                      )
                                    }
                                  />
                                </FieldRow>
                                <FieldRow label="帯文字色">
                                  <ColorField
                                    value={designTargetCardStyle.headerTextColor || "#ffffff"}
                                    ariaLabel="帯文字色"
                                    onChange={(next) =>
                                      applySectionAppearanceToAll(
                                        designTargetSection.style,
                                        mergeCardStyle(designTargetSection.sectionCardStyle, {
                                          headerTextColor: next,
                                        }),
                                        {
                                          excludeTypes: [
                                            "brandBar",
                                            "heroImage",
                                            "footerHtml",
                                          ],
                                        }
                                      )
                                    }
                                  />
                                </FieldRow>
                                <FieldRow label="帯高さ">
                                  <SegmentedField
                                    value={designTargetBandSize}
                                    ariaLabel="帯高さ"
                                    options={[
                                      { value: "sm", label: "S" },
                                      { value: "md", label: "M" },
                                      { value: "lg", label: "L" },
                                    ]}
                                    onChange={(next) =>
                                      applySectionAppearanceToAll(
                                        designTargetSection.style,
                                        mergeCardStyle(designTargetSection.sectionCardStyle, {
                                          labelChipBg: next,
                                        }),
                                        {
                                          excludeTypes: [
                                            "brandBar",
                                            "heroImage",
                                            "footerHtml",
                                          ],
                                        }
                                      )
                                    }
                                  />
                                </FieldRow>
                                <FieldRow label="帯位置">
                                  <SegmentedField
                                    value={
                                      designTargetCardStyle.labelChipEnabled
                                        ? "inset"
                                        : "top"
                                    }
                                    ariaLabel="帯位置"
                                    options={[
                                      { value: "top", label: "上" },
                                      { value: "inset", label: "内側" },
                                    ]}
                                    onChange={(next) =>
                                      applySectionAppearanceToAll(
                                        designTargetSection.style,
                                        mergeCardStyle(designTargetSection.sectionCardStyle, {
                                          labelChipEnabled: next === "inset",
                                        }),
                                        {
                                          excludeTypes: [
                                            "brandBar",
                                            "heroImage",
                                            "footerHtml",
                                          ],
                                        }
                                      )
                                    }
                                  />
                                </FieldRow>
                                <FieldRow label="テキスト位置">
                                  <SegmentedField
                                    value={designTargetBandAlign}
                                    ariaLabel="テキスト位置"
                                    options={[
                                      { value: "left", label: "左" },
                                      { value: "center", label: "中央" },
                                      { value: "right", label: "右" },
                                    ]}
                                    onChange={(next) =>
                                      applySectionAppearanceToAll(
                                        designTargetSection.style,
                                        mergeCardStyle(designTargetSection.sectionCardStyle, {
                                          labelChipTextColor: next,
                                        }),
                                        {
                                          excludeTypes: [
                                            "brandBar",
                                            "heroImage",
                                            "footerHtml",
                                          ],
                                        }
                                      )
                                    }
                                  />
                                </FieldRow>
                              </div>
                            </Accordion>
                          ) : null}
                          <PageStyleSpacing
                            value={pageStyle.spacing}
                            onChange={setPageSpacing}
                          />
                          {!isSimpleMode ? (
                            <>
                              <PageStyleLayout
                                value={pageStyle.layout}
                                onChange={setPageLayout}
                              />
                              <PageStyleSectionAnimation
                                value={pageStyle.sectionAnimation}
                                onChange={setPageSectionAnimation}
                              />
                            </>
                          ) : null}
                        </>
                      ) : (
                        <div className="px-1 py-2 text-[11px] text-[var(--ui-muted)]">
                          {t.inspector.placeholders.advancedComingSoon}
                        </div>
                      )}
                    </Accordion>
              </div>
            ) : activeTab === "content" ? (
              <div className="flex flex-col gap-3">
                <div className="text-[11px] font-semibold text-[var(--ui-muted)]">
                  基本
                </div>
                {selected.kind === "page" ? (
                  <PageMetaPanel
                    value={pageMeta}
                    onChange={setPageMeta}
                    assets={assets}
                    onAddAsset={addAsset}
                  />
                ) : null}
                {selected.kind !== "page" ? (
                  <>
                <div className={cardClass}>
                  <button
                    type="button"
                    className={cardHeaderClass + " w-full"}
                    aria-expanded={isContentCardOpen}
                    onClick={() => setIsContentCardOpen((current) => !current)}
                  >
                    <span>{t.inspector.section.cards.content}</span>
                    <ChevronDown
                      size={14}
                      className={
                        isContentCardOpen ? "rotate-180 transition" : "transition"
                      }
                    />
                  </button>
                  {isContentCardOpen ? (
                    <div
                      className={
                        cardBodyClass +
                        (isContentReady ? "" : " pointer-events-none opacity-60")
                      }
                    >
                      {!isContentReady ? (
                        <div className="rounded-md border border-dashed border-[var(--ui-border)]/60 bg-[var(--ui-panel)]/60 px-3 py-2 text-[11px] text-[var(--ui-muted)]">
                          {t.inspector.section.placeholders.selectContent}
                        </div>
                      ) : isInquiry ? (
                        <div className="flex flex-col gap-3">
                          <div className="text-[11px] text-[var(--ui-muted)]">
                            利用条件 / お問い合わせ / 下部バナー / フッターの画像を差し替えます。
                          </div>
                          <div className="flex flex-col gap-2">
                            {footerAssetSlots.map((slot) => {
                              const assetId = footerAssets[slot.key];
                              const assetName = assetId
                                ? assets[assetId]?.filename ?? "画像を選択済み"
                                : "未設定";
                              return (
                                <div
                                  key={slot.key}
                                  className="rounded-md border border-[var(--ui-border)]/60 bg-[var(--ui-panel)]/60 px-3 py-2"
                                >
                                  <div className="mb-2 text-[11px] font-semibold text-[var(--ui-text)]">
                                    {slot.label}
                                  </div>
                                  <input
                                    ref={(node) => {
                                      footerAssetInputRefs.current[slot.key] = node;
                                    }}
                                    type="file"
                                    accept="image/*"
                                    className="hidden"
                                    onChange={(event) => {
                                      const file = event.target.files?.[0];
                                      if (!file) {
                                        return;
                                      }
                                      handleImageImport(file, (nextAssetId) => {
                                        updateSectionData(selectedSection.id, {
                                          footerAssets: {
                                            ...footerAssets,
                                            [slot.key]: nextAssetId,
                                          },
                                        });
                                      });
                                      event.target.value = "";
                                    }}
                                  />
                                  <div className="flex flex-wrap items-center gap-2">
                                    <button
                                      type="button"
                                      className="ui-button h-7 px-2 text-[11px]"
                                      onClick={() =>
                                        footerAssetInputRefs.current[slot.key]?.click()
                                      }
                                    >
                                      画像を選択
                                    </button>
                                    {assetId ? (
                                      <button
                                        type="button"
                                        className="ui-button h-7 px-2 text-[11px]"
                                        onClick={() =>
                                          updateSectionData(selectedSection.id, {
                                            footerAssets: {
                                              ...footerAssets,
                                              [slot.key]: undefined,
                                            },
                                          })
                                        }
                                      >
                                        画像を削除
                                      </button>
                                    ) : null}
                                  </div>
                                  <div className="mt-2 text-[11px] text-[var(--ui-muted)]">
                                    {assetName}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      ) : (
                        <div className="flex flex-col gap-3">
                        {selectedTitleItem ? (
                          <div className="flex flex-col gap-2">
                            <FieldRow label={t.inspector.section.fields.title}>
                              <RichTextInput
                                value={selectedTitleItem.text}
                                onChange={(nextValue) =>
                                  updateTitleItemText(
                                    selectedSection.id,
                                    selectedTitleItem.id,
                                    nextValue
                                  )
                                }
                                disabled={isLocked}
                              />
                            </FieldRow>
                          </div>
                        ) : null}
                        {isBrandBar ? (
                          <div className="flex flex-col gap-2">
                            <div className="text-[11px] text-[var(--ui-muted)]">
                              ブランドバー画像
                            </div>
                            <div className="flex items-center justify-between rounded-md border border-[var(--ui-border)]/60 bg-[var(--ui-panel)]/60 px-3 py-2">
                              <div className="text-[12px] text-[var(--ui-text)]">
                                {t.inspector.section.fields.fullWidth}
                              </div>
                              <ToggleField
                                value={selectedSection.style.layout.fullWidth}
                                ariaLabel={t.inspector.section.fields.fullWidth}
                                onChange={(next) =>
                                  updateSectionStyle(selectedSection.id, {
                                    layout: { fullWidth: next },
                                  })
                                }
                              />
                            </div>
                            <input
                              ref={brandBarInputRef}
                              type="file"
                              accept="image/*"
                              className="hidden"
                              onChange={(event) => {
                                const file = event.target.files?.[0];
                                if (!file) {
                                  return;
                                }
                                handleImageImportWithMeta(
                                  file,
                                  (assetId, dataUrl, width, height) => {
                                    updateSectionData(selectedSection.id, {
                                      brandImageAssetId: assetId,
                                      brandImageUrl: dataUrl,
                                      brandImageMeta: {
                                        filename: file.name,
                                        relativePath: file.webkitRelativePath || "",
                                        w: width,
                                        h: height,
                                        size: file.size,
                                      },
                                    });
                                  }
                                );
                                event.target.value = "";
                              }}
                            />
                            <div className="flex flex-wrap items-center gap-2">
                              <button
                                type="button"
                                className="ui-button h-7 px-2 text-[11px]"
                                onClick={() => brandBarInputRef.current?.click()}
                              >
                                画像を選択
                              </button>
                              {selectedSection.data.brandImageAssetId ? (
                                <button
                                  type="button"
                                  className="ui-button h-7 px-2 text-[11px]"
                                  onClick={() =>
                                    updateSectionData(selectedSection.id, {
                                      brandImageAssetId: undefined,
                                      brandImageUrl: "",
                                      brandImageMeta: undefined,
                                    })
                                  }
                                >
                                  画像を削除
                                </button>
                              ) : null}
                            </div>
                            {selectedSection.data.brandImageAssetId ? (
                              <div className="text-[11px] text-[var(--ui-muted)]">
                                <div>
                                  File: {brandImageMeta?.filename ?? "未選択"}
                                </div>
                                <div>
                                  Location: {brandImageMeta?.relativePath || "local file"}
                                </div>
                                {brandImageMeta?.w && brandImageMeta?.h ? (
                                  <div>
                                    Size: {brandImageMeta.w} x {brandImageMeta.h}
                                  </div>
                                ) : null}
                                {brandImageMeta?.size ? (
                                  <div>File size: {formatBytes(brandImageMeta.size)}</div>
                                ) : null}
                              </div>
                            ) : null}
                          </div>
                        ) : null}
                        {isHeroImage ? (
                          <div className="flex flex-col gap-2">
                            <div className="text-[11px] text-[var(--ui-muted)]">
                              ヒーロー画像
                            </div>
                            <div className="flex items-center justify-between rounded-md border border-[var(--ui-border)]/60 bg-[var(--ui-panel)]/60 px-3 py-2">
                              <div className="text-[12px] text-[var(--ui-text)]">
                                {t.inspector.section.fields.heroFullSize}
                              </div>
                              <ToggleField
                                value={Boolean(selectedSection.data.heroFullSize)}
                                ariaLabel={t.inspector.section.fields.heroFullSize}
                                onChange={(next) =>
                                  updateSectionData(selectedSection.id, {
                                    heroFullSize: next,
                                  })
                                }
                              />
                            </div>
                            <input
                              ref={heroPcInputRef}
                              type="file"
                              accept="image/*"
                              className="hidden"
                              onChange={(event) => {
                                const file = event.target.files?.[0];
                                if (!file) {
                                  return;
                                }
                                handleImageImportWithMeta(
                                  file,
                                  (assetId, dataUrl, width, height) => {
                                    updateSectionData(selectedSection.id, {
                                      imageAssetIdPc: assetId,
                                      imageUrl: dataUrl,
                                      heroPc: {
                                        assetId,
                                        w: width,
                                        h: height,
                                      },
                                      heroPcMeta: {
                                        filename: file.name,
                                        relativePath: file.webkitRelativePath || "",
                                        size: file.size,
                                      },
                                    });
                                  }
                                );
                                event.target.value = "";
                              }}
                            />
                            <input
                              ref={heroSpInputRef}
                              type="file"
                              accept="image/*"
                              className="hidden"
                              onChange={(event) => {
                                const file = event.target.files?.[0];
                                if (!file) {
                                  return;
                                }
                                handleImageImportWithMeta(
                                  file,
                                  (assetId, dataUrl, width, height) => {
                                    updateSectionData(selectedSection.id, {
                                      imageAssetIdSp: assetId,
                                      imageUrlSp: dataUrl,
                                      heroSp: {
                                        assetId,
                                        w: width,
                                        h: height,
                                      },
                                      heroSpMeta: {
                                        filename: file.name,
                                        relativePath: file.webkitRelativePath || "",
                                        size: file.size,
                                      },
                                    });
                                  }
                                );
                                event.target.value = "";
                              }}
                            />
                            <div className="flex flex-col gap-2">
                              <button
                                type="button"
                                className="ui-button h-7 px-2 text-[11px]"
                                onClick={() => heroPcInputRef.current?.click()}
                              >
                                PC画像を選択
                              </button>
                              {selectedSection.data.imageAssetIdPc ? (
                                <div className="text-[11px] text-[var(--ui-muted)]">
                                  <div>
                                    File: {heroPcMeta?.filename ?? "未選択"}
                                  </div>
                                  <div>
                                    Location: {heroPcMeta?.relativePath || "local file"}
                                  </div>
                                  {heroPc?.w && heroPc?.h ? (
                                    <div>
                                      Size: {heroPc.w} x {heroPc.h}
                                    </div>
                                  ) : null}
                                  {heroPcMeta?.size ? (
                                    <div>File size: {formatBytes(heroPcMeta.size)}</div>
                                  ) : null}
                                </div>
                              ) : null}
                              {selectedSection.data.imageAssetIdPc ? (
                                <button
                                  type="button"
                                  className="ui-button h-7 px-2 text-[11px]"
                                  onClick={() =>
                                    updateSectionData(selectedSection.id, {
                                      imageAssetIdPc: undefined,
                                      imageUrl: "",
                                      heroPc: undefined,
                                      heroPcMeta: undefined,
                                    })
                                  }
                                >
                                  PC画像を削除
                                </button>
                              ) : null}
                            </div>
                            <div className="flex flex-col gap-2">
                              <button
                                type="button"
                                className="ui-button h-7 px-2 text-[11px]"
                                onClick={() => heroSpInputRef.current?.click()}
                              >
                                SP画像を選択
                              </button>
                              {selectedSection.data.imageAssetIdSp ? (
                                <div className="text-[11px] text-[var(--ui-muted)]">
                                  <div>
                                    File: {heroSpMeta?.filename ?? "未選択"}
                                  </div>
                                  <div>
                                    Location: {heroSpMeta?.relativePath || "local file"}
                                  </div>
                                  {heroSp?.w && heroSp?.h ? (
                                    <div>
                                      Size: {heroSp.w} x {heroSp.h}
                                    </div>
                                  ) : null}
                                  {heroSpMeta?.size ? (
                                    <div>File size: {formatBytes(heroSpMeta.size)}</div>
                                  ) : null}
                                </div>
                              ) : null}
                              {selectedSection.data.imageAssetIdSp ? (
                                <button
                                  type="button"
                                  className="ui-button h-7 px-2 text-[11px]"
                                  onClick={() =>
                                    updateSectionData(selectedSection.id, {
                                      imageAssetIdSp: undefined,
                                      imageUrlSp: "",
                                      heroSp: undefined,
                                      heroSpMeta: undefined,
                                    })
                                  }
                                >
                                  SP画像を削除
                                </button>
                              ) : null}
                            </div>
                          </div>
                        ) : null}
                        {isTargetStores ? (
                          <div className="flex flex-col gap-2">
                            <div className="text-[11px] text-[var(--ui-muted)]">
                              {t.inspector.section.labels.imageItems}
                            </div>
                            <div className="flex flex-wrap gap-2">
                              <button
                                type="button"
                                className="ui-button h-7 px-2 text-[11px]"
                                onClick={() =>
                                  addContentItem(selectedSection.id, "image")
                                }
                              >
                                {t.inspector.section.buttons.addImageItem}
                              </button>
                            </div>
                            {targetStoresImageItems.length === 0 ? (
                              <div className="rounded-md border border-dashed border-[var(--ui-border)]/60 bg-[var(--ui-panel)]/60 px-3 py-2 text-[11px] text-[var(--ui-muted)]">
                                {t.inspector.section.placeholders.noImages}
                              </div>
                            ) : (
                              <div className="flex flex-col gap-1">
                                {targetStoresImageItems.map((item, index) => {
                                  const isSelected = selectedItemId === item.id;
                                  return (
                                    <div
                                      key={item.id}
                                      className="flex items-center gap-2"
                                    >
                                      <button
                                        type="button"
                                        className={
                                          "flex h-8 flex-1 items-center rounded-md border px-2 text-left text-[12px] " +
                                          (isSelected
                                            ? "border-[var(--ui-ring)] bg-[var(--ui-panel)]/80"
                                            : "border-[var(--ui-border)]/50 bg-[var(--ui-panel)]/60")
                                        }
                                        onClick={() => setSelectedItemId(item.id)}
                                      >
                                        {`画像 ${index + 1}`}
                                      </button>
                                      <button
                                        type="button"
                                        className="ui-button h-7 w-7 px-0"
                                        onClick={() =>
                                          removeContentItem(selectedSection.id, item.id)
                                        }
                                        aria-label={t.inspector.section.buttons.deleteItem}
                                        title={t.inspector.section.buttons.deleteItem}
                                      >
                                        <Trash2 size={14} />
                                      </button>
                                    </div>
                                  );
                                })}
                              </div>
                            )}
                          </div>
                        ) : null}
                        {isExcludedStoresList || isExcludedBrandsList ? (
                          <div className="flex flex-col gap-2">
                            <FieldRow label="タイトル">
                              <input
                                type="text"
                                className="ui-input h-7 w-full text-[12px]"
                                value={String(selectedSection.data.title ?? "")}
                                onChange={(event) =>
                                  updateSectionData(selectedSection.id, {
                                    title: event.target.value,
                                  })
                                }
                                disabled={isLocked}
                              />
                            </FieldRow>
                            <FieldRow label="強調ラベル">
                              <input
                                type="text"
                                className="ui-input h-7 w-full text-[12px]"
                                value={String(
                                  selectedSection.data.highlightLabel ?? ""
                                )}
                                onChange={(event) =>
                                  updateSectionData(selectedSection.id, {
                                    highlightLabel: event.target.value,
                                  })
                                }
                                disabled={isLocked}
                              />
                            </FieldRow>
                            <FieldRow label="戻るボタンURL">
                              <input
                                type="text"
                                className="ui-input h-7 w-full text-[12px]"
                                value={String(selectedSection.data.returnUrl ?? "")}
                                onChange={(event) =>
                                  updateSectionData(selectedSection.id, {
                                    returnUrl: event.target.value,
                                  })
                                }
                                placeholder="https://example.com"
                                disabled={isLocked}
                              />
                            </FieldRow>
                            <FieldRow label="戻るボタン文言">
                              <input
                                type="text"
                                className="ui-input h-7 w-full text-[12px]"
                                value={String(selectedSection.data.returnLabel ?? "")}
                                onChange={(event) =>
                                  updateSectionData(selectedSection.id, {
                                    returnLabel: event.target.value,
                                  })
                                }
                                placeholder="キャンペーンページに戻る"
                                disabled={isLocked}
                              />
                            </FieldRow>
                          </div>
                        ) : null}
                        {isStoreCsvSection ? (
                          <div className="flex flex-col gap-2">
                            <div className="text-[11px] text-[var(--ui-muted)]">
                              店舗リスト(CSV)
                            </div>
                            <div className="text-[11px] text-[var(--ui-muted)]">
                              必須列: 店舗ID / 店舗名 / 郵便番号 / 住所 / 都道府県
                            </div>
                            <input
                              ref={csvInputRef}
                              type="file"
                              accept=".csv,text/csv"
                              className="hidden"
                              onChange={async (event) => {
                                const file = event.target.files?.[0];
                                if (!file) {
                                  return;
                                }
                                try {
                                  await parseStoresCsv(file);
                                } catch (error) {
                                  setCsvError("CSVの解析に失敗しました。");
                                }
                                event.target.value = "";
                              }}
                            />
                            <button
                              type="button"
                              className="ui-button h-7 px-2 text-[11px]"
                              onClick={() => csvInputRef.current?.click()}
                            >
                              CSVを選択
                            </button>
                            {csvError ? (
                              <div className="text-[11px] text-rose-600">
                                {csvError}
                              </div>
                            ) : null}
                          </div>
                        ) : null}
                        {isTargetStores ? (
                          <div className="flex flex-col gap-2">
                            <div className="text-[11px] text-[var(--ui-muted)]">
                              注意文言
                            </div>
                            {targetStoresNoticeItem ? (
                              <TextLineList
                                lines={targetStoresNoticeItem.lines}
                                selectedLineId={selectedLine?.id}
                                onSelect={(lineId) => {
                                  setSelectedItemId(targetStoresNoticeItem.id);
                                  setSelectedLineId(lineId);
                                }}
                                onChangeText={(lineId, value) =>
                                  updateTextLineText(
                                    selectedSection.id,
                                    targetStoresNoticeItem.id,
                                    lineId,
                                    value
                                  )
                                }
                                onChangeMarks={(lineId, patch) =>
                                  updateTextLineMarks(
                                    selectedSection.id,
                                    targetStoresNoticeItem.id,
                                    lineId,
                                    patch
                                  )
                                }
                                onAddLine={() =>
                                  addTargetStoresNoticeLine(
                                    targetStoresNoticeItem.id
                                  )
                                }
                                onReorderLine={(fromIndex, toIndex) =>
                                  reorderTextLines(
                                    selectedSection.id,
                                    targetStoresNoticeItem.id,
                                    fromIndex,
                                    toIndex
                                  )
                                }
                                onRemoveLine={(lineId) =>
                                  removeTextLine(
                                    selectedSection.id,
                                    targetStoresNoticeItem.id,
                                    lineId
                                  )
                                }
                                sectionId={selectedSection.id}
                                itemId={targetStoresNoticeItem.id}
                                disabled={isLocked}
                                onRemoveLast={() => {
                                  const lastLine =
                                    targetStoresNoticeItem.lines[
                                      targetStoresNoticeItem.lines.length - 1
                                    ];
                                  if (lastLine) {
                                    removeTextLine(
                                      selectedSection.id,
                                      targetStoresNoticeItem.id,
                                      lastLine.id
                                    );
                                  }
                                }}
                              />
                            ) : (
                              <button
                                type="button"
                                className="ui-button h-7 px-2 text-[11px]"
                                onClick={handleAddTargetStoresNoticeItem}
                              >
                                注意文言を追加
                              </button>
                            )}
                          </div>
                        ) : null}
                        {isTargetStores ? (
                          <div className="flex flex-col gap-2">
                            <div className="text-[11px] text-[var(--ui-muted)]">
                              {t.inspector.section.labels.button}
                            </div>
                            <div className="flex flex-wrap gap-2">
                              <button
                                type="button"
                                className="ui-button h-7 px-2 text-[11px]"
                                onClick={() =>
                                  addContentItem(selectedSection.id, "button")
                                }
                              >
                                {t.inspector.section.buttons.addButtonItem}
                              </button>
                            </div>
                            {targetStoresButtonItems.length === 0 ? (
                              <div className="rounded-md border border-dashed border-[var(--ui-border)]/60 bg-[var(--ui-panel)]/60 px-3 py-2 text-[11px] text-[var(--ui-muted)]">
                                ボタンがありません
                              </div>
                            ) : (
                              <div className="flex flex-col gap-1">
                                {targetStoresButtonItems.map((item, index) => {
                                  const isSelected = selectedItemId === item.id;
                                  const label = item.label?.trim() || `ボタン ${index + 1}`;
                                  return (
                                    <div
                                      key={item.id}
                                      className="flex items-center gap-2"
                                    >
                                      <button
                                        type="button"
                                        className={
                                          "flex h-8 flex-1 items-center rounded-md border px-2 text-left text-[12px] " +
                                          (isSelected
                                            ? "border-[var(--ui-ring)] bg-[var(--ui-panel)]/80"
                                            : "border-[var(--ui-border)]/50 bg-[var(--ui-panel)]/60")
                                        }
                                        onClick={() => setSelectedItemId(item.id)}
                                      >
                                        {label}
                                      </button>
                                      <button
                                        type="button"
                                        className="ui-button h-7 w-7 px-0"
                                        onClick={() =>
                                          removeContentItem(selectedSection.id, item.id)
                                        }
                                        aria-label={t.inspector.section.buttons.deleteItem}
                                        title={t.inspector.section.buttons.deleteItem}
                                      >
                                        <Trash2 size={14} />
                                      </button>
                                    </div>
                                  );
                                })}
                              </div>
                            )}
                          </div>
                        ) : null}
                        {isLegalNotes ? (
                          <div className="flex flex-col gap-2">
                            <FieldRow label="タイトル">
                              <input
                                type="text"
                                className="ui-input h-7 w-full text-[12px]"
                                value={String(selectedSection.data.title ?? "")}
                                onChange={(event) =>
                                  updateSectionData(selectedSection.id, {
                                    title: event.target.value,
                                  })
                                }
                              />
                            </FieldRow>
                            <FieldRow label="箇条書き">
                              <SegmentedField
                                value={legalNotesBullet}
                                ariaLabel="箇条書き"
                                options={[
                                  { value: "disc", label: "・あり" },
                                  { value: "none", label: "なし" },
                                ]}
                                onChange={(next) =>
                                  updateSectionData(selectedSection.id, {
                                    bullet: next,
                                  })
                                }
                              />
                            </FieldRow>
                            <FieldRow label="幅(%)">
                              <NumberField
                                value={legalNotesWidth}
                                min={40}
                                max={100}
                                step={5}
                                ariaLabel="注意文言の幅"
                                onChange={(next) =>
                                  updateSectionData(selectedSection.id, {
                                    noteWidthPct: next,
                                  })
                                }
                              />
                            </FieldRow>
                          </div>
                        ) : null}
                        {isLegalNotes ? (
                          <div className="flex flex-col gap-2">
                            <div className="text-[11px] text-[var(--ui-muted)]">
                              注意文言
                            </div>
                            {legalNotesTextItem ? (
                              <PrimaryLineEditor
                                lines={legalNotesTextItem.lines}
                                selectedLineId={selectedLine?.id}
                                showBulletToggle={true}
                                defaultBullet={legalNotesBullet}
                                onSelect={(lineId) => {
                                  setSelectedItemId(legalNotesTextItem.id);
                                  setSelectedLineId(lineId);
                                }}
                                onUpdateText={(lineId, value) =>
                                  updateTextLineText(
                                    selectedSection.id,
                                    legalNotesTextItem.id,
                                    lineId,
                                    value
                                  )
                                }
                                onChangeMarks={(lineId, patch) =>
                                  updateTextLineMarks(
                                    selectedSection.id,
                                    legalNotesTextItem.id,
                                    lineId,
                                    patch
                                  )
                                }
                                onAddLine={() =>
                                  addTextLine(selectedSection.id, legalNotesTextItem.id)
                                }
                                onRemoveLine={(lineId) =>
                                  removeTextLine(
                                    selectedSection.id,
                                    legalNotesTextItem.id,
                                    lineId
                                  )
                                }
                                onRemoveLast={() => {
                                  const lastLine =
                                    legalNotesTextItem.lines[
                                      legalNotesTextItem.lines.length - 1
                                    ];
                                  if (lastLine) {
                                    removeTextLine(
                                      selectedSection.id,
                                      legalNotesTextItem.id,
                                      lastLine.id
                                    );
                                  }
                                }}
                                defaultBullet={legalNotesBullet}
                                sectionId={selectedSection.id}
                                itemId={legalNotesTextItem.id}
                                disabled={isLocked}
                              />
                            ) : (
                              <button
                                type="button"
                                className="ui-button h-7 px-2 text-[11px]"
                                onClick={() =>
                                  addContentItem(selectedSection.id, "text")
                                }
                              >
                                注意文言を追加
                              </button>
                            )}
                          </div>
                        ) : null}
                        {isPaymentHistoryGuide ? (
                          <div className="flex flex-col gap-2">
                            <FieldRow label="タイトル">
                              <input
                                type="text"
                                className="ui-input h-7 w-full text-[12px]"
                                value={paymentGuideData.title}
                                onChange={(event) => {
                                  const nextTitle = event.target.value;
                                  if (titleItem?.type === "title") {
                                    updateTitleItemText(
                                      selectedSection.id,
                                      titleItem.id,
                                      nextTitle
                                    );
                                  }
                                  updateSectionData(selectedSection.id, {
                                    title: nextTitle,
                                  });
                                }}
                                disabled={isLocked}
                              />
                            </FieldRow>
                            <label className="ui-field">
                              <span className="ui-field-label">本文</span>
                              <textarea
                                className="ui-textarea min-h-[90px] text-[12px]"
                                value={paymentGuideData.body}
                                onChange={(event) =>
                                  updateSectionData(selectedSection.id, {
                                    body: event.target.value,
                                  })
                                }
                                disabled={isLocked}
                              />
                            </label>
                            <FieldRow label="リンクテキスト">
                              <input
                                type="text"
                                className="ui-input h-7 w-full text-[12px]"
                                value={paymentGuideData.linkText}
                                onChange={(event) =>
                                  updateSectionData(selectedSection.id, {
                                    linkText: event.target.value,
                                  })
                                }
                                disabled={isLocked}
                              />
                            </FieldRow>
                            <FieldRow label="リンク先">
                              <SegmentedField
                                value={paymentGuideData.linkTargetKind}
                                ariaLabel="リンク先"
                                options={[
                                  { value: "section", label: "セクション" },
                                  { value: "url", label: "URL" },
                                ]}
                                onChange={(next) => {
                                  if (next === "section") {
                                    const firstSectionId =
                                      project.sections[0]?.id ?? "";
                                    updateSectionData(selectedSection.id, {
                                      linkTargetKind: "section",
                                      linkSectionId: firstSectionId,
                                    });
                                  } else {
                                    updateSectionData(selectedSection.id, {
                                      linkTargetKind: "url",
                                    });
                                  }
                                }}
                              />
                            </FieldRow>
                            {paymentGuideData.linkTargetKind === "section" ? (
                              <FieldRow label="リンク先セクション">
                                <SelectField
                                  value={paymentGuideData.linkSectionId}
                                  ariaLabel="リンク先セクション"
                                  onChange={(next) =>
                                    updateSectionData(selectedSection.id, {
                                      linkSectionId: String(next),
                                    })
                                  }
                                >
                                  {project.sections.map((section: SectionBase) => (
                                    <option key={section.id} value={section.id}>
                                      {section.name ?? section.type}
                                    </option>
                                  ))}
                                </SelectField>
                              </FieldRow>
                            ) : (
                              <FieldRow label="リンクURL">
                                <input
                                  type="text"
                                  className="ui-input h-7 w-full text-[12px]"
                                  value={paymentGuideData.linkUrl}
                                  onChange={(event) =>
                                    updateSectionData(selectedSection.id, {
                                      linkUrl: event.target.value,
                                    })
                                  }
                                  disabled={isLocked}
                                />
                              </FieldRow>
                            )}
                            <FieldRow label="リンク後の文">
                              <input
                                type="text"
                                className="ui-input h-7 w-full text-[12px]"
                                value={paymentGuideData.linkSuffix}
                                onChange={(event) =>
                                  updateSectionData(selectedSection.id, {
                                    linkSuffix: event.target.value,
                                  })
                                }
                                disabled={isLocked}
                              />
                            </FieldRow>
                            <label className="ui-field">
                              <span className="ui-field-label">注意文（赤字）</span>
                              <textarea
                                className="ui-textarea min-h-[90px] text-[12px]"
                                value={paymentGuideData.alert}
                                onChange={(event) =>
                                  updateSectionData(selectedSection.id, {
                                    alert: event.target.value,
                                  })
                                }
                                disabled={isLocked}
                              />
                            </label>
                            <div className="text-[11px] text-[var(--ui-muted)]">
                              画像
                            </div>
                            <input
                              ref={paymentGuideImageInputRef}
                              type="file"
                              accept="image/*"
                              className="hidden"
                              onChange={(event) => {
                                const file = event.target.files?.[0];
                                if (!file) {
                                  return;
                                }
                                handleImageImport(file, (assetId, dataUrl) => {
                                  updateSectionData(selectedSection.id, {
                                    imageAssetId: assetId,
                                    imageUrl: dataUrl,
                                    imageAlt: paymentGuideData.imageAlt || file.name,
                                  });
                                });
                                event.target.value = "";
                              }}
                            />
                            <div className="flex flex-wrap items-center gap-2">
                              <button
                                type="button"
                                className="ui-button h-7 px-2 text-[11px]"
                                onClick={() =>
                                  paymentGuideImageInputRef.current?.click()
                                }
                                disabled={isLocked}
                              >
                                画像を選択
                              </button>
                              {paymentGuideData.imageUrl ||
                              paymentGuideData.imageAssetId ? (
                                <button
                                  type="button"
                                  className="ui-button h-7 px-2 text-[11px]"
                                  onClick={() =>
                                    updateSectionData(selectedSection.id, {
                                      imageAssetId: "",
                                      imageUrl: "",
                                      imageAlt: "",
                                    })
                                  }
                                  disabled={isLocked}
                                >
                                  画像を削除
                                </button>
                              ) : null}
                            </div>
                            <FieldRow label="画像URL">
                              <input
                                type="text"
                                className="ui-input h-7 w-full text-[12px]"
                                value={paymentGuideData.imageUrl}
                                onChange={(event) =>
                                  updateSectionData(selectedSection.id, {
                                    imageUrl: event.target.value,
                                  })
                                }
                                disabled={isLocked}
                              />
                            </FieldRow>
                            <FieldRow label="代替テキスト">
                              <input
                                type="text"
                                className="ui-input h-7 w-full text-[12px]"
                                value={paymentGuideData.imageAlt}
                                onChange={(event) =>
                                  updateSectionData(selectedSection.id, {
                                    imageAlt: event.target.value,
                                  })
                                }
                                disabled={isLocked}
                              />
                            </FieldRow>
                          </div>
                        ) : null}
                        {isTabbedNotes ? (
                          <div className="flex flex-col gap-3">
                            <div className="text-[11px] text-[var(--ui-muted)]">
                              タブ
                            </div>
                            <div className="flex flex-col gap-3">
                              {tabbedNotesData.tabs.map((tab, tabIndex) => (
                                <div
                                  key={tab.id}
                                  className="rounded-md border border-[var(--ui-border)]/60 bg-[var(--ui-panel)]/60 p-2"
                                >
                                  <div className="flex items-center gap-2">
                                    <input
                                      type="text"
                                      className="ui-input h-7 w-full text-[12px]"
                                      value={tab.labelTop}
                                      placeholder="タブラベル（上）"
                                      onChange={(event) => {
                                        const nextTabs = tabbedNotesData.tabs.map(
                                          (entry, idx) =>
                                            idx === tabIndex
                                              ? { ...entry, labelTop: event.target.value }
                                              : entry
                                        );
                                        updateSectionData(selectedSection.id, {
                                          tabs: nextTabs,
                                        });
                                      }}
                                      disabled={isLocked}
                                    />
                                    <input
                                      type="text"
                                      className="ui-input h-7 w-full text-[12px]"
                                      value={tab.labelBottom}
                                      placeholder="タブラベル（下）"
                                      onChange={(event) => {
                                        const nextTabs = tabbedNotesData.tabs.map(
                                          (entry, idx) =>
                                            idx === tabIndex
                                              ? { ...entry, labelBottom: event.target.value }
                                              : entry
                                        );
                                        updateSectionData(selectedSection.id, {
                                          tabs: nextTabs,
                                        });
                                      }}
                                      disabled={isLocked}
                                    />
                                    <button
                                      type="button"
                                      className="ui-button h-7 w-7 px-0"
                                      onClick={() => {
                                        if (tabbedNotesData.tabs.length <= 1) {
                                          return;
                                        }
                                        const nextTabs = tabbedNotesData.tabs.filter(
                                          (_entry, idx) => idx !== tabIndex
                                        );
                                        updateSectionData(selectedSection.id, {
                                          tabs: nextTabs,
                                        });
                                      }}
                                      disabled={isLocked || tabbedNotesData.tabs.length <= 1}
                                      aria-label={t.inspector.section.buttons.deleteItem}
                                      title={t.inspector.section.buttons.deleteItem}
                                    >
                                      <Trash2 size={14} />
                                    </button>
                                  </div>
                                  <label className="ui-field mt-2">
                                    <span className="ui-field-label">説明文</span>
                                    <textarea
                                      className="ui-textarea min-h-[70px] text-[12px]"
                                      value={tab.intro}
                                      onChange={(event) => {
                                        const nextTabs = tabbedNotesData.tabs.map(
                                          (entry, idx) =>
                                            idx === tabIndex
                                              ? { ...entry, intro: event.target.value }
                                              : entry
                                        );
                                        updateSectionData(selectedSection.id, {
                                          tabs: nextTabs,
                                        });
                                      }}
                                      disabled={isLocked}
                                    />
                                  </label>
                                  <div className="mt-2 text-[11px] text-[var(--ui-muted)]">
                                    注意文言
                                  </div>
                                  <div className="mt-2 flex flex-col gap-2">
                                    {tab.items.map((item, itemIndex) => (
                                      <div
                                        key={item.id}
                                        className="rounded-md border border-[var(--ui-border)]/50 bg-[var(--ui-panel)]/70 p-2"
                                      >
                                        <input
                                          type="text"
                                          className="ui-input h-7 w-full text-[12px]"
                                          value={item.text}
                                          placeholder="注意文言"
                                          onChange={(event) => {
                                            const nextTabs = tabbedNotesData.tabs.map(
                                              (entry, idx) => {
                                                if (idx !== tabIndex) {
                                                  return entry;
                                                }
                                                const nextItems = entry.items.map(
                                                  (itemEntry, itemIdx) =>
                                                    itemIdx === itemIndex
                                                      ? {
                                                          ...itemEntry,
                                                          text: event.target.value,
                                                        }
                                                      : itemEntry
                                                );
                                                return { ...entry, items: nextItems };
                                              }
                                            );
                                            updateSectionData(selectedSection.id, {
                                              tabs: nextTabs,
                                            });
                                          }}
                                          disabled={isLocked}
                                        />
                                        <div className="mt-2 flex flex-wrap items-center gap-2">
                                          <SelectField
                                            value={item.bullet}
                                            ariaLabel="記号"
                                            onChange={(next) => {
                                              const nextTabs = tabbedNotesData.tabs.map(
                                                (entry, idx) => {
                                                  if (idx !== tabIndex) {
                                                    return entry;
                                                  }
                                                  const nextItems = entry.items.map(
                                                    (itemEntry, itemIdx) =>
                                                      itemIdx === itemIndex
                                                        ? {
                                                            ...itemEntry,
                                                            bullet:
                                                              String(next) === "none"
                                                                ? "none"
                                                                : "disc",
                                                          }
                                                        : itemEntry
                                                  );
                                                  return { ...entry, items: nextItems };
                                                }
                                              );
                                              updateSectionData(selectedSection.id, {
                                                tabs: nextTabs,
                                              });
                                            }}
                                          >
                                            <option value="disc">・</option>
                                            <option value="none">なし</option>
                                          </SelectField>
                                          <SegmentedField
                                            value={item.tone}
                                            ariaLabel="強調"
                                            options={[
                                              { value: "normal", label: "通常" },
                                              { value: "accent", label: "強調" },
                                            ]}
                                            onChange={(next) => {
                                              const nextTabs = tabbedNotesData.tabs.map(
                                                (entry, idx) => {
                                                  if (idx !== tabIndex) {
                                                    return entry;
                                                  }
                                                  const nextItems = entry.items.map(
                                                    (itemEntry, itemIdx) =>
                                                      itemIdx === itemIndex
                                                        ? {
                                                            ...itemEntry,
                                                            tone:
                                                              next === "accent"
                                                                ? "accent"
                                                                : "normal",
                                                          }
                                                        : itemEntry
                                                  );
                                                  return { ...entry, items: nextItems };
                                                }
                                              );
                                              updateSectionData(selectedSection.id, {
                                                tabs: nextTabs,
                                              });
                                            }}
                                          />
                                          <ToggleField
                                            value={item.bold}
                                            ariaLabel="太字"
                                            onChange={(next) => {
                                              const nextTabs = tabbedNotesData.tabs.map(
                                                (entry, idx) => {
                                                  if (idx !== tabIndex) {
                                                    return entry;
                                                  }
                                                  const nextItems = entry.items.map(
                                                    (itemEntry, itemIdx) =>
                                                      itemIdx === itemIndex
                                                        ? { ...itemEntry, bold: next }
                                                        : itemEntry
                                                  );
                                                  return { ...entry, items: nextItems };
                                                }
                                              );
                                              updateSectionData(selectedSection.id, {
                                                tabs: nextTabs,
                                              });
                                            }}
                                          />
                                          <button
                                            type="button"
                                            className="ui-button h-7 w-7 px-0"
                                            onClick={() => {
                                              const nextTabs = tabbedNotesData.tabs.map(
                                                (entry, idx) => {
                                                  if (idx !== tabIndex) {
                                                    return entry;
                                                  }
                                                  const nextItems = entry.items.filter(
                                                    (_itemEntry, itemIdx) =>
                                                      itemIdx !== itemIndex
                                                  );
                                                  return { ...entry, items: nextItems };
                                                }
                                              );
                                              updateSectionData(selectedSection.id, {
                                                tabs: nextTabs,
                                              });
                                            }}
                                            disabled={isLocked}
                                            aria-label={t.inspector.section.buttons.deleteItem}
                                            title={t.inspector.section.buttons.deleteItem}
                                          >
                                            <Trash2 size={14} />
                                          </button>
                                        </div>
                                        <label className="ui-field mt-2">
                                          <span className="ui-field-label">子項目</span>
                                          <textarea
                                            className="ui-textarea min-h-[60px] text-[12px]"
                                            value={item.subItems.join("\n")}
                                            onChange={(event) => {
                                              const nextSubItems = event.target.value
                                                .split("\n")
                                                .map((line) => line.trim())
                                                .filter((line) => line.length > 0);
                                              const nextTabs = tabbedNotesData.tabs.map(
                                                (entry, idx) => {
                                                  if (idx !== tabIndex) {
                                                    return entry;
                                                  }
                                                  const nextItems = entry.items.map(
                                                    (itemEntry, itemIdx) =>
                                                      itemIdx === itemIndex
                                                        ? {
                                                            ...itemEntry,
                                                            subItems: nextSubItems,
                                                          }
                                                        : itemEntry
                                                  );
                                                  return { ...entry, items: nextItems };
                                                }
                                              );
                                              updateSectionData(selectedSection.id, {
                                                tabs: nextTabs,
                                              });
                                            }}
                                            disabled={isLocked}
                                          />
                                        </label>
                                      </div>
                                    ))}
                                  </div>
                                  <button
                                    type="button"
                                    className="ui-button mt-2 h-7 px-2 text-[11px]"
                                    onClick={() => {
                                      const nextTabs = tabbedNotesData.tabs.map(
                                        (entry, idx) => {
                                          if (idx !== tabIndex) {
                                            return entry;
                                          }
                                          return {
                                            ...entry,
                                            items: [
                                              ...entry.items,
                                              {
                                                id: createTabItemId(),
                                                text: "",
                                                bullet: "disc",
                                                tone: "normal",
                                                bold: false,
                                                subItems: [],
                                              },
                                            ],
                                          };
                                        }
                                      );
                                      updateSectionData(selectedSection.id, {
                                        tabs: nextTabs,
                                      });
                                    }}
                                    disabled={isLocked}
                                  >
                                    注意文言を追加
                                  </button>
                                  <FieldRow label="脚注">
                                    <input
                                      type="text"
                                      className="ui-input h-7 w-full text-[12px]"
                                      value={tab.footnote}
                                      onChange={(event) => {
                                        const nextTabs = tabbedNotesData.tabs.map(
                                          (entry, idx) =>
                                            idx === tabIndex
                                              ? { ...entry, footnote: event.target.value }
                                              : entry
                                        );
                                        updateSectionData(selectedSection.id, {
                                          tabs: nextTabs,
                                        });
                                      }}
                                      disabled={isLocked}
                                    />
                                  </FieldRow>
                                  <div className="mt-2 text-[11px] text-[var(--ui-muted)]">
                                    CTA
                                  </div>
                                  <FieldRow label="CTA文">
                                    <input
                                      type="text"
                                      className="ui-input h-7 w-full text-[12px]"
                                      value={tab.ctaText}
                                      onChange={(event) => {
                                        const nextTabs = tabbedNotesData.tabs.map(
                                          (entry, idx) =>
                                            idx === tabIndex
                                              ? { ...entry, ctaText: event.target.value }
                                              : entry
                                        );
                                        updateSectionData(selectedSection.id, {
                                          tabs: nextTabs,
                                        });
                                      }}
                                      disabled={isLocked}
                                    />
                                  </FieldRow>
                                  <FieldRow label="リンクテキスト">
                                    <input
                                      type="text"
                                      className="ui-input h-7 w-full text-[12px]"
                                      value={tab.ctaLinkText}
                                      onChange={(event) => {
                                        const nextTabs = tabbedNotesData.tabs.map(
                                          (entry, idx) =>
                                            idx === tabIndex
                                              ? { ...entry, ctaLinkText: event.target.value }
                                              : entry
                                        );
                                        updateSectionData(selectedSection.id, {
                                          tabs: nextTabs,
                                        });
                                      }}
                                      disabled={isLocked}
                                    />
                                  </FieldRow>
                                  <FieldRow label="リンク先">
                                    <SegmentedField
                                      value={tab.ctaTargetKind}
                                      ariaLabel="リンク先"
                                      options={[
                                        { value: "section", label: "セクション" },
                                        { value: "url", label: "URL" },
                                      ]}
                                      onChange={(next) => {
                                        const nextTabs = tabbedNotesData.tabs.map(
                                          (entry, idx) => {
                                            if (idx !== tabIndex) {
                                              return entry;
                                            }
                                            if (next === "section") {
                                              const firstSectionId =
                                                project.sections[0]?.id ?? "";
                                              return {
                                                ...entry,
                                                ctaTargetKind: "section",
                                                ctaSectionId: firstSectionId,
                                              };
                                            }
                                            return { ...entry, ctaTargetKind: "url" };
                                          }
                                        );
                                        updateSectionData(selectedSection.id, {
                                          tabs: nextTabs,
                                        });
                                      }}
                                    />
                                  </FieldRow>
                                  {tab.ctaTargetKind === "section" ? (
                                    <FieldRow label="リンク先セクション">
                                      <SelectField
                                        value={tab.ctaSectionId}
                                        ariaLabel="リンク先セクション"
                                        onChange={(next) => {
                                          const nextTabs = tabbedNotesData.tabs.map(
                                            (entry, idx) =>
                                              idx === tabIndex
                                                ? { ...entry, ctaSectionId: String(next) }
                                                : entry
                                          );
                                          updateSectionData(selectedSection.id, {
                                            tabs: nextTabs,
                                          });
                                        }}
                                      >
                                        {project.sections.map((section: SectionBase) => (
                                          <option key={section.id} value={section.id}>
                                            {section.name ?? section.type}
                                          </option>
                                        ))}
                                      </SelectField>
                                    </FieldRow>
                                  ) : (
                                    <FieldRow label="リンクURL">
                                      <input
                                        type="text"
                                        className="ui-input h-7 w-full text-[12px]"
                                        value={tab.ctaLinkUrl}
                                        onChange={(event) => {
                                          const nextTabs = tabbedNotesData.tabs.map(
                                            (entry, idx) =>
                                              idx === tabIndex
                                                ? { ...entry, ctaLinkUrl: event.target.value }
                                                : entry
                                          );
                                          updateSectionData(selectedSection.id, {
                                            tabs: nextTabs,
                                          });
                                        }}
                                        disabled={isLocked}
                                      />
                                    </FieldRow>
                                  )}
                                  <div className="mt-2 text-[11px] text-[var(--ui-muted)]">
                                    CTA画像
                                  </div>
                                  <input
                                    type="file"
                                    accept="image/*"
                                    className="ui-input h-7 text-[12px]"
                                    onChange={(event) => {
                                      const file = event.target.files?.[0];
                                      if (!file) {
                                        return;
                                      }
                                      handleImageImport(file, (assetId, dataUrl) => {
                                        const nextTabs = tabbedNotesData.tabs.map(
                                          (entry, idx) =>
                                            idx === tabIndex
                                              ? {
                                                  ...entry,
                                                  ctaImageAssetId: assetId,
                                                  ctaImageUrl: dataUrl,
                                                  ctaImageAlt: entry.ctaImageAlt || file.name,
                                                }
                                              : entry
                                        );
                                        updateSectionData(selectedSection.id, {
                                          tabs: nextTabs,
                                        });
                                      });
                                      event.target.value = "";
                                    }}
                                    disabled={isLocked}
                                  />
                                  <FieldRow label="CTA画像URL">
                                    <input
                                      type="text"
                                      className="ui-input h-7 w-full text-[12px]"
                                      value={tab.ctaImageUrl}
                                      onChange={(event) => {
                                        const nextTabs = tabbedNotesData.tabs.map(
                                          (entry, idx) =>
                                            idx === tabIndex
                                              ? { ...entry, ctaImageUrl: event.target.value }
                                              : entry
                                        );
                                        updateSectionData(selectedSection.id, {
                                          tabs: nextTabs,
                                        });
                                      }}
                                      disabled={isLocked}
                                    />
                                  </FieldRow>
                                  <FieldRow label="CTA代替テキスト">
                                    <input
                                      type="text"
                                      className="ui-input h-7 w-full text-[12px]"
                                      value={tab.ctaImageAlt}
                                      onChange={(event) => {
                                        const nextTabs = tabbedNotesData.tabs.map(
                                          (entry, idx) =>
                                            idx === tabIndex
                                              ? { ...entry, ctaImageAlt: event.target.value }
                                              : entry
                                        );
                                        updateSectionData(selectedSection.id, {
                                          tabs: nextTabs,
                                        });
                                      }}
                                      disabled={isLocked}
                                    />
                                  </FieldRow>
                                  <div className="mt-2 text-[11px] text-[var(--ui-muted)]">
                                    ボタン
                                  </div>
                                  <FieldRow label="ボタン文言">
                                    <input
                                      type="text"
                                      className="ui-input h-7 w-full text-[12px]"
                                      value={tab.buttonText}
                                      onChange={(event) => {
                                        const nextTabs = tabbedNotesData.tabs.map(
                                          (entry, idx) =>
                                            idx === tabIndex
                                              ? { ...entry, buttonText: event.target.value }
                                              : entry
                                        );
                                        updateSectionData(selectedSection.id, {
                                          tabs: nextTabs,
                                        });
                                      }}
                                      disabled={isLocked}
                                    />
                                  </FieldRow>
                                  <FieldRow label="ボタンリンク先">
                                    <SegmentedField
                                      value={tab.buttonTargetKind}
                                      ariaLabel="ボタンリンク先"
                                      options={[
                                        { value: "section", label: "セクション" },
                                        { value: "url", label: "URL" },
                                      ]}
                                      onChange={(next) => {
                                        const nextTabs = tabbedNotesData.tabs.map(
                                          (entry, idx) => {
                                            if (idx !== tabIndex) {
                                              return entry;
                                            }
                                            if (next === "section") {
                                              const firstSectionId =
                                                project.sections[0]?.id ?? "";
                                              return {
                                                ...entry,
                                                buttonTargetKind: "section",
                                                buttonSectionId: firstSectionId,
                                              };
                                            }
                                            return { ...entry, buttonTargetKind: "url" };
                                          }
                                        );
                                        updateSectionData(selectedSection.id, {
                                          tabs: nextTabs,
                                        });
                                      }}
                                    />
                                  </FieldRow>
                                  {tab.buttonTargetKind === "section" ? (
                                    <FieldRow label="ボタン先セクション">
                                      <SelectField
                                        value={tab.buttonSectionId}
                                        ariaLabel="ボタン先セクション"
                                        onChange={(next) => {
                                          const nextTabs = tabbedNotesData.tabs.map(
                                            (entry, idx) =>
                                              idx === tabIndex
                                                ? { ...entry, buttonSectionId: String(next) }
                                                : entry
                                          );
                                          updateSectionData(selectedSection.id, {
                                            tabs: nextTabs,
                                          });
                                        }}
                                      >
                                        {project.sections.map((section: SectionBase) => (
                                          <option key={section.id} value={section.id}>
                                            {section.name ?? section.type}
                                          </option>
                                        ))}
                                      </SelectField>
                                    </FieldRow>
                                  ) : (
                                    <FieldRow label="ボタンURL">
                                      <input
                                        type="text"
                                        className="ui-input h-7 w-full text-[12px]"
                                        value={tab.buttonUrl}
                                        onChange={(event) => {
                                          const nextTabs = tabbedNotesData.tabs.map(
                                            (entry, idx) =>
                                              idx === tabIndex
                                                ? { ...entry, buttonUrl: event.target.value }
                                                : entry
                                          );
                                          updateSectionData(selectedSection.id, {
                                            tabs: nextTabs,
                                          });
                                        }}
                                        disabled={isLocked}
                                      />
                                    </FieldRow>
                                  )}
                                </div>
                              ))}
                            </div>
                            <button
                              type="button"
                              className="ui-button h-7 px-2 text-[11px]"
                              onClick={() => {
                                const nextTabs = [
                                  ...tabbedNotesData.tabs,
                                  {
                                    id: createTabId(),
                                    labelTop: `タブ${tabbedNotesData.tabs.length + 1}`,
                                    labelBottom: "注意事項",
                                    intro: "",
                                    items: [],
                                    footnote: "",
                                    ctaText: "",
                                    ctaLinkText: "",
                                    ctaLinkUrl: "",
                                    ctaTargetKind: "url",
                                    ctaSectionId: "",
                                    ctaImageUrl: "",
                                    ctaImageAlt: "",
                                    ctaImageAssetId: "",
                                    buttonText: "",
                                    buttonTargetKind: "url",
                                    buttonUrl: "",
                                    buttonSectionId: "",
                                  },
                                ];
                                updateSectionData(selectedSection.id, {
                                  tabs: nextTabs,
                                });
                              }}
                              disabled={isLocked}
                            >
                              タブを追加
                            </button>
                          </div>
                        ) : null}
                        {isRankingTable ? (
                          <div className="flex flex-col gap-2">
                            {titleItem ? (
                              <FieldRow label="タイトル">
                                <RichTextInput
                                  value={
                                    titleItem.text ||
                                    String(selectedSection.data.title ?? "")
                                  }
                                  onChange={(nextTitle) => {
                                    updateTitleItemText(
                                      selectedSection.id,
                                      titleItem.id,
                                      nextTitle
                                    );
                                    updateSectionData(selectedSection.id, {
                                      title: nextTitle,
                                    });
                                  }}
                                  disabled={isLocked}
                                />
                              </FieldRow>
                            ) : null}
                            <FieldRow label="サブタイトル">
                              <input
                                type="text"
                                className="ui-input h-7 w-full text-[12px]"
                                value={rankingMeta.subtitle}
                                onChange={(event) =>
                                  updateSectionData(selectedSection.id, {
                                    subtitle: event.target.value,
                                  })
                                }
                                disabled={isLocked}
                              />
                            </FieldRow>
                            <FieldRow label="集計期間">
                              <input
                                type="text"
                                className="ui-input h-7 w-full text-[12px]"
                                value={rankingMeta.period}
                                onChange={(event) =>
                                  updateSectionData(selectedSection.id, {
                                    period: event.target.value,
                                  })
                                }
                                disabled={isLocked}
                              />
                            </FieldRow>
                            <FieldRow label="日付">
                              <input
                                type="text"
                                className="ui-input h-7 w-full text-[12px]"
                                value={rankingMeta.date}
                                onChange={(event) =>
                                  updateSectionData(selectedSection.id, {
                                    date: event.target.value,
                                  })
                                }
                                disabled={isLocked}
                              />
                            </FieldRow>
                            <label className="ui-field">
                              <span className="ui-field-label">注釈</span>
                              <textarea
                                className="ui-textarea min-h-[90px] text-[12px]"
                                value={rankingMeta.notes.join("\n")}
                                onChange={(event) => {
                                  const nextNotes = event.target.value
                                    .split("\n")
                                    .map((line) => line.trim())
                                    .filter((line) => line.length > 0);
                                  updateSectionData(selectedSection.id, {
                                    notes: nextNotes,
                                  });
                                }}
                                disabled={isLocked}
                              />
                            </label>
                            <div className="text-[11px] text-[var(--ui-muted)]">
                              テーブル
                            </div>
                            <FieldRow label="順位ラベル">
                              <input
                                type="text"
                                className="ui-input h-7 w-full text-[12px]"
                                value={rankingRankLabel}
                                onChange={(event) =>
                                  updateSectionData(selectedSection.id, {
                                    rankLabel: event.target.value,
                                  })
                                }
                                disabled={isLocked}
                              />
                            </FieldRow>
                            <div className="text-[11px] text-[var(--ui-muted)]">
                              列
                            </div>
                            {rankingColumns.length === 0 ? (
                              <div className="rounded-md border border-dashed border-[var(--ui-border)]/60 bg-[var(--ui-panel)]/60 px-3 py-2 text-[11px] text-[var(--ui-muted)]">
                                列がありません。
                              </div>
                            ) : (
                              <div className="flex flex-col gap-2">
                                {rankingColumns.map((column, columnIndex) => (
                                  <div key={column.key} className="flex items-center gap-2">
                                    <span className="w-5 text-right text-[11px] text-[var(--ui-muted)]">
                                      {columnIndex + 1}
                                    </span>
                                    <input
                                      type="text"
                                      className="ui-input h-7 w-full text-[12px]"
                                      value={column.label}
                                      placeholder={`列${columnIndex + 1}`}
                                      onChange={(event) => {
                                        const nextColumns = rankingColumns.map(
                                          (entry, idx) =>
                                            idx === columnIndex
                                              ? { ...entry, label: event.target.value }
                                              : entry
                                        );
                                        updateSectionData(selectedSection.id, {
                                          columns: nextColumns,
                                        });
                                      }}
                                      disabled={isLocked}
                                    />
                                    <button
                                      type="button"
                                      className="ui-button h-7 w-7 px-0"
                                      onClick={() => {
                                        if (rankingColumns.length <= 1) {
                                          return;
                                        }
                                        const nextColumns = rankingColumns.filter(
                                          (_entry, idx) => idx !== columnIndex
                                        );
                                        const nextRows = rankingRows.map((row) => ({
                                          ...row,
                                          values: row.values.filter(
                                            (_value, idx) => idx !== columnIndex
                                          ),
                                        }));
                                        updateSectionData(selectedSection.id, {
                                          columns: nextColumns,
                                          rows: nextRows,
                                        });
                                      }}
                                      aria-label={t.inspector.section.buttons.deleteItem}
                                      title={t.inspector.section.buttons.deleteItem}
                                      disabled={isLocked || rankingColumns.length <= 1}
                                    >
                                      <Trash2 size={14} />
                                    </button>
                                  </div>
                                ))}
                              </div>
                            )}
                            <button
                              type="button"
                              className="ui-button h-7 px-2 text-[11px]"
                              onClick={() => {
                                const nextColumns = [
                                  ...rankingColumns,
                                  {
                                    key: createRankingColumnId(),
                                    label: `列${rankingColumns.length + 1}`,
                                  },
                                ];
                                const nextRows = rankingRows.map((row) => ({
                                  ...row,
                                  values: [...row.values, ""],
                                }));
                                updateSectionData(selectedSection.id, {
                                  columns: nextColumns,
                                  rows: nextRows,
                                });
                              }}
                              disabled={isLocked}
                            >
                              列を追加
                            </button>
                            <div className="text-[11px] text-[var(--ui-muted)]">
                              ランキング行
                            </div>
                            {rankingRows.length === 0 ? (
                              <div className="rounded-md border border-dashed border-[var(--ui-border)]/60 bg-[var(--ui-panel)]/60 px-3 py-2 text-[11px] text-[var(--ui-muted)]">
                                行がありません。
                              </div>
                            ) : (
                              <div className="flex flex-col gap-2">
                                {rankingRows.map((row, index) => (
                                  <div key={row.id} className="flex items-center gap-2">
                                    <span className="w-5 text-right text-[11px] text-[var(--ui-muted)]">
                                      {index + 1}
                                    </span>
                                    <div className="flex flex-1 flex-wrap gap-2">
                                      {rankingColumns.map((column, columnIndex) => (
                                        <input
                                          key={`${row.id}_${column.key}`}
                                          type="text"
                                          className="ui-input h-7 min-w-[120px] flex-1 text-[12px]"
                                          value={row.values[columnIndex] ?? ""}
                                          placeholder={column.label || `列${columnIndex + 1}`}
                                          onChange={(event) => {
                                            const nextRows = rankingRows.map(
                                              (entry, rowIndex) => {
                                                if (rowIndex !== index) {
                                                  return entry;
                                                }
                                                const nextValues = entry.values.map(
                                                  (value, valueIndex) =>
                                                    valueIndex === columnIndex
                                                      ? event.target.value
                                                      : value
                                                );
                                                return { ...entry, values: nextValues };
                                              }
                                            );
                                            updateSectionData(selectedSection.id, {
                                              rows: nextRows,
                                            });
                                          }}
                                          disabled={isLocked}
                                        />
                                      ))}
                                    </div>
                                    <div className="flex items-center gap-1">
                                      <button
                                        type="button"
                                        className="ui-button h-7 w-7 px-0"
                                        onClick={() => {
                                          if (index === 0) {
                                            return;
                                          }
                                          updateSectionData(selectedSection.id, {
                                            rows: reorderLinesArray(
                                              rankingRows,
                                              index,
                                              index - 1
                                            ),
                                          });
                                        }}
                                        disabled={index === 0 || isLocked}
                                        aria-label="上へ"
                                        title="上へ"
                                      >
                                        <ArrowUp size={14} />
                                      </button>
                                      <button
                                        type="button"
                                        className="ui-button h-7 w-7 px-0"
                                        onClick={() => {
                                          if (index >= rankingRows.length - 1) {
                                            return;
                                          }
                                          updateSectionData(selectedSection.id, {
                                            rows: reorderLinesArray(
                                              rankingRows,
                                              index,
                                              index + 1
                                            ),
                                          });
                                        }}
                                        disabled={
                                          index >= rankingRows.length - 1 || isLocked
                                        }
                                        aria-label="下へ"
                                        title="下へ"
                                      >
                                        <ArrowDown size={14} />
                                      </button>
                                      <button
                                        type="button"
                                        className="ui-button h-7 w-7 px-0"
                                        onClick={() => {
                                          const nextRows = rankingRows.filter(
                                            (_entry, rowIndex) => rowIndex !== index
                                          );
                                          updateSectionData(selectedSection.id, {
                                            rows: nextRows,
                                          });
                                        }}
                                        aria-label={t.inspector.section.buttons.deleteItem}
                                        title={t.inspector.section.buttons.deleteItem}
                                        disabled={isLocked}
                                      >
                                        <Trash2 size={14} />
                                      </button>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}
                            <button
                              type="button"
                              className="ui-button h-7 px-2 text-[11px]"
                              onClick={() => {
                                const nextRows = [
                                  ...rankingRows,
                                  {
                                    id: createRankingRowId(),
                                    values: Array(rankingColumns.length).fill(""),
                                  },
                                ];
                                updateSectionData(selectedSection.id, {
                                  rows: nextRows,
                                });
                              }}
                              disabled={isLocked}
                            >
                              行を追加
                            </button>
                            <div className="text-[11px] text-[var(--ui-muted)]">
                              色
                            </div>
                            <FieldRow label="ヘッダー背景">
                              <ColorField
                                value={rankingStyle.headerBg}
                                ariaLabel="ヘッダー背景"
                                onChange={(next) =>
                                  updateSectionData(selectedSection.id, {
                                    tableStyle: {
                                      ...rankingStyle,
                                      headerBg: next,
                                    },
                                  })
                                }
                              />
                            </FieldRow>
                            <FieldRow label="ヘッダーテキスト">
                              <ColorField
                                value={rankingStyle.headerText}
                                ariaLabel="ヘッダーテキスト"
                                onChange={(next) =>
                                  updateSectionData(selectedSection.id, {
                                    tableStyle: {
                                      ...rankingStyle,
                                      headerText: next,
                                    },
                                  })
                                }
                              />
                            </FieldRow>
                            <FieldRow label="セル背景">
                              <ColorField
                                value={rankingStyle.cellBg}
                                ariaLabel="セル背景"
                                onChange={(next) =>
                                  updateSectionData(selectedSection.id, {
                                    tableStyle: {
                                      ...rankingStyle,
                                      cellBg: next,
                                    },
                                  })
                                }
                              />
                            </FieldRow>
                            <FieldRow label="セルテキスト">
                              <ColorField
                                value={rankingStyle.cellText}
                                ariaLabel="セルテキスト"
                                onChange={(next) =>
                                  updateSectionData(selectedSection.id, {
                                    tableStyle: {
                                      ...rankingStyle,
                                      cellText: next,
                                    },
                                  })
                                }
                              />
                            </FieldRow>
                            <FieldRow label="ボーダー">
                              <ColorField
                                value={rankingStyle.border}
                                ariaLabel="ボーダー"
                                onChange={(next) =>
                                  updateSectionData(selectedSection.id, {
                                    tableStyle: {
                                      ...rankingStyle,
                                      border: next,
                                    },
                                  })
                                }
                              />
                            </FieldRow>
                            <FieldRow label="順位背景">
                              <ColorField
                                value={rankingStyle.rankBg}
                                ariaLabel="順位背景"
                                onChange={(next) =>
                                  updateSectionData(selectedSection.id, {
                                    tableStyle: {
                                      ...rankingStyle,
                                      rankBg: next,
                                    },
                                  })
                                }
                              />
                            </FieldRow>
                            <FieldRow label="順位テキスト">
                              <ColorField
                                value={rankingStyle.rankText}
                                ariaLabel="順位テキスト"
                                onChange={(next) =>
                                  updateSectionData(selectedSection.id, {
                                    tableStyle: {
                                      ...rankingStyle,
                                      rankText: next,
                                    },
                                  })
                                }
                              />
                            </FieldRow>
                            <FieldRow label="1位背景">
                              <ColorField
                                value={rankingStyle.top1Bg}
                                ariaLabel="1位背景"
                                onChange={(next) =>
                                  updateSectionData(selectedSection.id, {
                                    tableStyle: {
                                      ...rankingStyle,
                                      top1Bg: next,
                                    },
                                  })
                                }
                              />
                            </FieldRow>
                            <FieldRow label="2位背景">
                              <ColorField
                                value={rankingStyle.top2Bg}
                                ariaLabel="2位背景"
                                onChange={(next) =>
                                  updateSectionData(selectedSection.id, {
                                    tableStyle: {
                                      ...rankingStyle,
                                      top2Bg: next,
                                    },
                                  })
                                }
                              />
                            </FieldRow>
                            <FieldRow label="3位背景">
                              <ColorField
                                value={rankingStyle.top3Bg}
                                ariaLabel="3位背景"
                                onChange={(next) =>
                                  updateSectionData(selectedSection.id, {
                                    tableStyle: {
                                      ...rankingStyle,
                                      top3Bg: next,
                                    },
                                  })
                                }
                              />
                            </FieldRow>
                            <FieldRow label="期間ラベル背景">
                              <ColorField
                                value={rankingStyle.periodLabelBg}
                                ariaLabel="期間ラベル背景"
                                onChange={(next) =>
                                  updateSectionData(selectedSection.id, {
                                    tableStyle: {
                                      ...rankingStyle,
                                      periodLabelBg: next,
                                    },
                                  })
                                }
                              />
                            </FieldRow>
                            <FieldRow label="期間ラベル文字">
                              <ColorField
                                value={rankingStyle.periodLabelText}
                                ariaLabel="期間ラベル文字"
                                onChange={(next) =>
                                  updateSectionData(selectedSection.id, {
                                    tableStyle: {
                                      ...rankingStyle,
                                      periodLabelText: next,
                                    },
                                  })
                                }
                              />
                            </FieldRow>
                          </div>
                        ) : null}
                        {isCampaignPeriodBar ? (
                          <div className="flex flex-col gap-2">
                            <FieldRow label="期間ラベル">
                              <input
                                type="text"
                                className="ui-input h-7 w-full text-[12px]"
                                value={
                                  String(
                                    selectedSection.data.periodLabel ??
                                      "キャンペーン期間"
                                  )
                                }
                                onChange={(event) =>
                                  updateSectionData(selectedSection.id, {
                                    periodLabel: event.target.value,
                                  })
                                }
                              />
                            </FieldRow>
                            <FieldRow label="開始日">
                              <input
                                type="date"
                                className="ui-input h-7 w-full text-[12px]"
                                value={String(selectedSection.data.startDate ?? "")}
                                onChange={(event) =>
                                  updateSectionData(selectedSection.id, {
                                    startDate: event.target.value,
                                  })
                                }
                              />
                            </FieldRow>
                            <FieldRow label="終了日">
                              <input
                                type="date"
                                className="ui-input h-7 w-full text-[12px]"
                                value={String(selectedSection.data.endDate ?? "")}
                                onChange={(event) =>
                                  updateSectionData(selectedSection.id, {
                                    endDate: event.target.value,
                                  })
                                }
                              />
                            </FieldRow>
                            {/* TODO: countdown timer support */}
                          </div>
                        ) : null}
                        {isCouponFlow ? (
                          <div className="flex flex-col gap-2">
                            <FieldRow label="リード">
                              <input
                                type="text"
                                className="ui-input h-7 w-full text-[12px]"
                                value={String(selectedSection.data.lead ?? "")}
                                onChange={(event) =>
                                  updateSectionData(selectedSection.id, {
                                    lead: event.target.value,
                                  })
                                }
                              />
                            </FieldRow>
                            <FieldRow label="注釈">
                              <input
                                type="text"
                                className="ui-input h-7 w-full text-[12px]"
                                value={String(selectedSection.data.note ?? "")}
                                onChange={(event) =>
                                  updateSectionData(selectedSection.id, {
                                    note: event.target.value,
                                  })
                                }
                              />
                            </FieldRow>
                          </div>
                        ) : null}
                        {isCouponFlow ? (
                          <div className="flex flex-col gap-2">
                            <div className="text-[11px] text-[var(--ui-muted)]">
                              スライド画像
                            </div>
                            {couponFlowImageItems.length === 0 ? (
                              <button
                                type="button"
                                className="ui-button h-7 px-2 text-[11px]"
                                onClick={() =>
                                  addContentItem(selectedSection.id, "image")
                                }
                              >
                                画像スライドを追加
                              </button>
                            ) : (
                              <div className="flex flex-col gap-1">
                                {couponFlowImageItems.map((item, index) => {
                                  const isSelected = selectedItemId === item.id;
                                  return (
                                    <div
                                      key={item.id}
                                      className="flex items-center gap-2"
                                    >
                                      <button
                                        type="button"
                                        className={
                                          "flex h-8 flex-1 items-center rounded-md border px-2 text-left text-[12px] " +
                                          (isSelected
                                            ? "border-[var(--ui-ring)] bg-[var(--ui-panel)]/80"
                                            : "border-[var(--ui-border)]/50 bg-[var(--ui-panel)]/60")
                                        }
                                        onClick={() => setSelectedItemId(item.id)}
                                      >
                                        {`スライド ${index + 1}`}
                                      </button>
                                      <button
                                        type="button"
                                        className="ui-button h-7 w-7 px-0"
                                        onClick={() =>
                                          removeContentItem(selectedSection.id, item.id)
                                        }
                                        aria-label={t.inspector.section.buttons.deleteItem}
                                        title={t.inspector.section.buttons.deleteItem}
                                      >
                                        <Trash2 size={14} />
                                      </button>
                                    </div>
                                  );
                                })}
                              </div>
                            )}
                          </div>
                        ) : null}
                        {isCouponFlow ? (
                          <div className="flex flex-col gap-2">
                            <div className="text-[11px] text-[var(--ui-muted)]">
                              {t.inspector.section.labels.button}
                            </div>
                            <div className="flex flex-wrap gap-2">
                              <button
                                type="button"
                                className="ui-button h-7 px-2 text-[11px]"
                                onClick={() =>
                                  addContentItem(selectedSection.id, "button")
                                }
                              >
                                {t.inspector.section.buttons.addButtonItem}
                              </button>
                            </div>
                            {couponFlowButtonItems.length === 0 ? (
                              <div className="rounded-md border border-dashed border-[var(--ui-border)]/60 bg-[var(--ui-panel)]/60 px-3 py-2 text-[11px] text-[var(--ui-muted)]">
                                ボタンがありません
                              </div>
                            ) : (
                              <div className="flex flex-col gap-1">
                                {couponFlowButtonItems.map((item, index) => {
                                  const isSelected = selectedItemId === item.id;
                                  const label = item.label?.trim() || `ボタン ${index + 1}`;
                                  return (
                                    <div
                                      key={item.id}
                                      className="flex items-center gap-2"
                                    >
                                      <button
                                        type="button"
                                        className={
                                          "flex h-8 flex-1 items-center rounded-md border px-2 text-left text-[12px] " +
                                          (isSelected
                                            ? "border-[var(--ui-ring)] bg-[var(--ui-panel)]/80"
                                            : "border-[var(--ui-border)]/50 bg-[var(--ui-panel)]/60")
                                        }
                                        onClick={() => setSelectedItemId(item.id)}
                                      >
                                        {label}
                                      </button>
                                      <button
                                        type="button"
                                        className="ui-button h-7 w-7 px-0"
                                        onClick={() =>
                                          removeContentItem(selectedSection.id, item.id)
                                        }
                                        aria-label={t.inspector.section.buttons.deleteItem}
                                        title={t.inspector.section.buttons.deleteItem}
                                      >
                                        <Trash2 size={14} />
                                      </button>
                                    </div>
                                  );
                                })}
                              </div>
                            )}
                          </div>
                        ) : null}
                        {!isItemlessSection &&
                        !isTargetStores &&
                        !isLegalNotes &&
                        !isCouponFlow &&
                        !isRankingTable &&
                        !isPaymentHistoryGuide &&
                        !isTabbedNotes ? (
                          <div className="flex flex-col gap-2">
                            <div className="text-[11px] text-[var(--ui-muted)]">
                              {t.inspector.section.labels.itemList}
                            </div>
                            <DndContext
                              sensors={sensors}
                              collisionDetection={closestCenter}
                              onDragEnd={handleItemDragEnd}
                            >
                              <SortableContext
                                items={contentItems.map((item) => item.id)}
                                strategy={verticalListSortingStrategy}
                              >
                                <div className="flex min-w-0 flex-col gap-1">
                                  {contentItems.map((item, index) => (
                                    <SortableItemRow
                                      key={item.id}
                                      item={item}
                                      index={index}
                                    />
                                  ))}
                                </div>
                              </SortableContext>
                            </DndContext>
                            <div className="flex flex-wrap gap-2">
                              <button
                                type="button"
                                className="ui-button h-7 px-2 text-[11px]"
                                onClick={() =>
                                  addContentItem(selectedSection.id, "text")
                                }
                              >
                                {t.inspector.section.buttons.addTextItem}
                              </button>
                              <button
                                type="button"
                                className="ui-button h-7 px-2 text-[11px]"
                                onClick={() =>
                                  addContentItem(selectedSection.id, "image")
                                }
                              >
                                {t.inspector.section.buttons.addImageItem}
                              </button>
                              <button
                                type="button"
                                className="ui-button h-7 px-2 text-[11px]"
                                onClick={() =>
                                  addContentItem(selectedSection.id, "button")
                                }
                              >
                                {t.inspector.section.buttons.addButtonItem}
                              </button>
                              {isCampaignOverview ? (
                                <button
                                  type="button"
                                  className="ui-button h-7 px-2 text-[11px]"
                                  onClick={handleAddNoticeItem}
                                >
                                  注意文言追加
                                </button>
                              ) : null}
                            </div>
                          </div>
                        ) : null}
                        {selectedTextItem &&
                        !isTargetStores &&
                        !isLegalNotes &&
                        !isBrandBar &&
                        !isHeroImage &&
                        !isRankingTable &&
                        !isPaymentHistoryGuide &&
                        !isTabbedNotes ? (
                          <div className="flex flex-col gap-2">
                            <div className="text-[11px] text-[var(--ui-muted)]">
                              {t.inspector.section.labels.textLines}
                            </div>
                            <TextLineList
                              lines={selectedTextItem.lines}
                              selectedLineId={selectedLine?.id}
                              onSelect={(lineId) => setSelectedLineId(lineId)}
                              onChangeText={(lineId, value) =>
                                updateTextLineText(
                                  selectedSection.id,
                                  selectedTextItem.id,
                                  lineId,
                                  value
                                )
                              }
                              onChangeMarks={(lineId, patch) =>
                                updateTextLineMarks(
                                  selectedSection.id,
                                  selectedTextItem.id,
                                  lineId,
                                  patch
                                )
                              }
                              onAddLine={() =>
                                addTextLine(selectedSection.id, selectedTextItem.id)
                              }
                              onReorderLine={(fromIndex, toIndex) =>
                                reorderTextLines(
                                  selectedSection.id,
                                  selectedTextItem.id,
                                  fromIndex,
                                  toIndex
                                )
                              }
                              onRemoveLine={(lineId) =>
                                removeTextLine(
                                  selectedSection.id,
                                  selectedTextItem.id,
                                  lineId
                                )
                              }
                              sectionId={selectedSection.id}
                              itemId={selectedTextItem.id}
                              disabled={isLocked}
                              onRemoveLast={() => {
                                const lastLine =
                                  selectedTextItem.lines[selectedTextItem.lines.length - 1];
                                if (lastLine) {
                                  removeTextLine(
                                    selectedSection.id,
                                    selectedTextItem.id,
                                    lastLine.id
                                  );
                                }
                              }}
                            />
                          </div>
                        ) : null}
                        {selectedImageItem &&
                        !isLegalNotes &&
                        !isRankingTable &&
                        !isPaymentHistoryGuide &&
                        !isTabbedNotes ? (
                          <div className="flex flex-col gap-2">
                            <div className="text-[11px] text-[var(--ui-muted)]">
                              {t.inspector.section.labels.imageItems}
                            </div>
                            <div className="flex flex-col gap-2">
                              <div className="flex items-center gap-2">
                                <button
                                  type="button"
                                  className="ui-button h-7 px-2 text-[11px]"
                                  onClick={() =>
                                    imageImportInputRef.current?.click()
                                  }
                                >
                                  画像をインポート
                                </button>
                                <input
                                  ref={imageImportInputRef}
                                  type="file"
                                  accept="image/*"
                                  multiple
                                  className="hidden"
                                  onChange={(event) => {
                                    const files = event.target.files;
                                    if (!files || files.length === 0) {
                                      return;
                                    }
                                    handleImagesImportWithMeta(files, (entries) => {
                                      entries.forEach((entry) => {
                                        addImageToItem(
                                          selectedSection.id,
                                          selectedImageItem.id,
                                          {
                                            src: entry.dataUrl,
                                            alt: imageAltInput || entry.file.name,
                                            assetId: entry.assetId,
                                          }
                                        );
                                      });
                                      setImageUrlInput("");
                                      setImageAltInput("");
                                    });
                                    event.target.value = "";
                                  }}
                                />
                              </div>
                              <FieldRow label={t.inspector.section.fields.imageSrc}>
                                <input
                                  type="text"
                                  className="ui-input h-7 w-full text-[12px]"
                                  value={imageUrlInput}
                                  onChange={(event) =>
                                    setImageUrlInput(event.target.value)
                                  }
                                />
                              </FieldRow>
                              <FieldRow label={t.inspector.section.fields.imageAlt}>
                                <input
                                  type="text"
                                  className="ui-input h-7 w-full text-[12px]"
                                  value={imageAltInput}
                                  onChange={(event) =>
                                    setImageAltInput(event.target.value)
                                  }
                                />
                              </FieldRow>
                              <button
                                type="button"
                                className="ui-button h-7 px-2 text-[11px]"
                                onClick={() => {
                                  addImageToItem(selectedSection.id, selectedImageItem.id, {
                                    src: imageUrlInput,
                                    alt: imageAltInput,
                                  });
                                  setImageUrlInput("");
                                  setImageAltInput("");
                                }}
                              >
                                {t.inspector.section.buttons.addImage}
                              </button>
                            </div>
                            <div className="flex flex-col gap-1">
                              {selectedImageItem.images.length === 0 ? (
                                <div className="rounded-md border border-dashed border-[var(--ui-border)]/60 bg-[var(--ui-panel)]/60 px-3 py-2 text-[11px] text-[var(--ui-muted)]">
                                  {t.inspector.section.placeholders.noImages}
                                </div>
                              ) : (
                                selectedImageItem.images.map((image) => {
                                  const isSelected = selectedImageIds.includes(image.id);
                                  return (
                                    <button
                                      key={image.id}
                                      type="button"
                                      className={
                                        "flex h-8 items-center rounded-md border px-2 text-left text-[12px] " +
                                        (isSelected
                                          ? "border-[var(--ui-ring)] bg-[var(--ui-panel)]/80"
                                          : "border-[var(--ui-border)]/50 bg-[var(--ui-panel)]/60")
                                      }
                                      onClick={() => {
                                        const nextIds = isSelected
                                          ? selectedImageIds.filter((id: string) => id !== image.id)
                                          : [...selectedImageIds, image.id];
                                        setSelectedImageIds(nextIds);
                                      }}
                                    >
                                      <span className="truncate">{image.src}</span>
                                    </button>
                                  );
                                })
                              )}
                            </div>
                            {selectedImageItem.images.length >= 2 ? (
                              <FieldRow label={t.inspector.section.fields.imageLayout}>
                                <SelectField
                                  value={selectedImageItem.layout ?? "auto"}
                                  ariaLabel={t.inspector.section.fields.imageLayout}
                                  onChange={(next) =>
                                    setImageItemLayout(
                                      selectedSection.id,
                                      selectedImageItem.id,
                                      next as
                                        | "auto"
                                        | "vertical"
                                        | "horizontal"
                                        | "columns2"
                                        | "columns3"
                                        | "grid"
                                        | "slideshow"
                                    )
                                  }
                                >
                                  <option value="auto">
                                    {t.inspector.section.imageLayouts.auto}
                                  </option>
                                  <option value="vertical">
                                    {t.inspector.section.imageLayouts.vertical}
                                  </option>
                                  <option value="horizontal">
                                    {t.inspector.section.imageLayouts.horizontal}
                                  </option>
                                  <option value="columns2">
                                    {t.inspector.section.imageLayouts.columns2}
                                  </option>
                                  <option value="columns3">
                                    {t.inspector.section.imageLayouts.columns3}
                                  </option>
                                  <option value="grid">
                                    {t.inspector.section.imageLayouts.grid}
                                  </option>
                                  <option value="slideshow">
                                    {t.inspector.section.imageLayouts.slideshow}
                                  </option>
                                </SelectField>
                              </FieldRow>
                            ) : null}
                          </div>
                        ) : null}
                        {selectedButtonItem && !isLegalNotes && !isRankingTable && !isTabbedNotes ? (
                          <div className="flex flex-col gap-2">
                            <div className="text-[11px] text-[var(--ui-muted)]">
                              {t.inspector.section.labels.button}
                            </div>
                            <FieldRow label={t.inspector.section.fields.buttonPreset}>
                              <SelectField
                                value={
                                  selectedButtonItem.style?.presetId ?? "default"
                                }
                                ariaLabel={t.inspector.section.fields.buttonPreset}
                                onChange={(next) => {
                                  const preset = buttonPresetMap[String(next)] ??
                                    buttonPresetMap.default;
                                  updateButtonItem(selectedSection.id, selectedButtonItem.id, {
                                    style: { ...preset },
                                  });
                                }}
                              >
                                {buttonPresetGroups.map((group) => (
                                  <optgroup key={group.label} label={group.label}>
                                    {group.options.map((option) => (
                                      <option key={option.value} value={option.value}>
                                        {option.label}
                                      </option>
                                    ))}
                                  </optgroup>
                                ))}
                              </SelectField>
                            </FieldRow>
                            <FieldRow label={t.inspector.section.fields.buttonLabel}>
                              <input
                                type="text"
                                className="ui-input h-7 w-full text-[12px]"
                                value={selectedButtonItem.label}
                                onChange={(event) =>
                                  updateButtonItem(selectedSection.id, selectedButtonItem.id, {
                                    label: event.target.value,
                                  })
                                }
                              />
                            </FieldRow>
                            <FieldRow label={t.inspector.section.fields.buttonAlign}>
                              <SegmentedField
                                value={selectedButtonItem.style?.align ?? "left"}
                                ariaLabel={t.inspector.section.fields.buttonAlign}
                                options={[
                                  {
                                    value: "left",
                                    label: t.inspector.section.alignOptions.left,
                                  },
                                  {
                                    value: "center",
                                    label: t.inspector.section.alignOptions.center,
                                  },
                                  {
                                    value: "right",
                                    label: t.inspector.section.alignOptions.right,
                                  },
                                ]}
                                onChange={(next) =>
                                  updateButtonItem(selectedSection.id, selectedButtonItem.id, {
                                    style: { align: next as "left" | "center" | "right" },
                                  })
                                }
                              />
                            </FieldRow>
                            <FieldRow label={t.inspector.section.fields.buttonWidthMode}>
                              <SegmentedField
                                value={
                                  selectedButtonItem.style?.fullWidth
                                    ? "full"
                                    : typeof selectedButtonItem.style?.width === "number" &&
                                      selectedButtonItem.style.width > 0
                                    ? "custom"
                                    : "auto"
                                }
                                ariaLabel={t.inspector.section.fields.buttonWidthMode}
                                options={[
                                  {
                                    value: "auto",
                                    label: t.inspector.section.widthOptions.auto,
                                  },
                                  {
                                    value: "custom",
                                    label: t.inspector.section.widthOptions.custom,
                                  },
                                  {
                                    value: "full",
                                    label: t.inspector.section.widthOptions.full,
                                  },
                                ]}
                                onChange={(next) => {
                                  if (next === "full") {
                                    updateButtonItem(
                                      selectedSection.id,
                                      selectedButtonItem.id,
                                      {
                                        style: { fullWidth: true, width: undefined },
                                      }
                                    );
                                    return;
                                  }
                                  if (next === "custom") {
                                    const fallbackWidth =
                                      typeof selectedButtonItem.style?.width === "number" &&
                                      selectedButtonItem.style.width > 0
                                        ? selectedButtonItem.style.width
                                        : 240;
                                    updateButtonItem(
                                      selectedSection.id,
                                      selectedButtonItem.id,
                                      {
                                        style: {
                                          fullWidth: false,
                                          width: fallbackWidth,
                                        },
                                      }
                                    );
                                    return;
                                  }
                                  updateButtonItem(
                                    selectedSection.id,
                                    selectedButtonItem.id,
                                    {
                                      style: { fullWidth: false, width: undefined },
                                    }
                                  );
                                }}
                              />
                            </FieldRow>
                            {typeof selectedButtonItem.style?.width === "number" &&
                            !selectedButtonItem.style.fullWidth ? (
                              <FieldRow label={t.inspector.section.fields.buttonWidth}>
                                <NumberField
                                  value={selectedButtonItem.style.width}
                                  min={60}
                                  max={720}
                                  step={1}
                                  ariaLabel={t.inspector.section.fields.buttonWidth}
                                  onChange={(next) =>
                                    updateButtonItem(selectedSection.id, selectedButtonItem.id, {
                                      style: { width: next },
                                    })
                                  }
                                />
                              </FieldRow>
                            ) : null}
                            <FieldRow label={t.inspector.section.fields.buttonRadius}>
                              <NumberField
                                value={selectedButtonItem.style?.radius ?? 8}
                                min={0}
                                max={60}
                                step={1}
                                ariaLabel={t.inspector.section.fields.buttonRadius}
                                onChange={(next) =>
                                  updateButtonItem(selectedSection.id, selectedButtonItem.id, {
                                    style: { radius: next },
                                  })
                                }
                              />
                            </FieldRow>
                            <FieldRow label={t.inspector.section.fields.buttonBgColor}>
                              <ColorField
                                value={
                                  selectedButtonItem.style?.backgroundColor ??
                                  "var(--lp-accent)"
                                }
                                ariaLabel={t.inspector.section.fields.buttonBgColor}
                                onChange={(next) =>
                                  updateButtonItem(selectedSection.id, selectedButtonItem.id, {
                                    style: { backgroundColor: next },
                                  })
                                }
                              />
                            </FieldRow>
                            <FieldRow label={t.inspector.section.fields.buttonTextColor}>
                              <ColorField
                                value={
                                  selectedButtonItem.style?.textColor ?? "#ffffff"
                                }
                                ariaLabel={t.inspector.section.fields.buttonTextColor}
                                onChange={(next) =>
                                  updateButtonItem(selectedSection.id, selectedButtonItem.id, {
                                    style: { textColor: next },
                                  })
                                }
                              />
                            </FieldRow>
                            <FieldRow label={t.inspector.section.fields.buttonBorderColor}>
                              <ColorField
                                value={
                                  selectedButtonItem.style?.borderColor ??
                                  "var(--lp-accent)"
                                }
                                ariaLabel={t.inspector.section.fields.buttonBorderColor}
                                onChange={(next) =>
                                  updateButtonItem(selectedSection.id, selectedButtonItem.id, {
                                    style: { borderColor: next },
                                  })
                                }
                              />
                            </FieldRow>
                            <FieldRow label={t.inspector.section.fields.buttonBorderWidth}>
                              <NumberField
                                value={selectedButtonItem.style?.borderWidth ?? 1}
                                min={0}
                                max={8}
                                step={1}
                                ariaLabel={t.inspector.section.fields.buttonBorderWidth}
                                onChange={(next) =>
                                  updateButtonItem(selectedSection.id, selectedButtonItem.id, {
                                    style: { borderWidth: next },
                                  })
                                }
                              />
                            </FieldRow>
                            <FieldRow label={t.inspector.section.fields.buttonTargetKind}>
                              <SegmentedField
                                value={buttonTargetKind}
                                ariaLabel={t.inspector.section.fields.buttonTargetKind}
                                options={[
                                  {
                                    value: "section",
                                    label:
                                      t.inspector.section.buttonTargets.section,
                                  },
                                  {
                                    value: "url",
                                    label: t.inspector.section.buttonTargets.url,
                                  },
                                ]}
                                onChange={(next) => {
                                  if (next === "section") {
                                    const firstSectionId =
                                      project.sections[0]?.id ?? "";
                                    updateButtonItem(
                                      selectedSection.id,
                                      selectedButtonItem.id,
                                      {
                                        target: {
                                          kind: "section",
                                          sectionId: firstSectionId,
                                        },
                                      }
                                    );
                                  } else {
                                    updateButtonItem(
                                      selectedSection.id,
                                      selectedButtonItem.id,
                                      {
                                        target: { kind: "url", url: "" },
                                      }
                                    );
                                  }
                                }}
                              />
                            </FieldRow>
                            {buttonTargetKind === "section" ? (
                              <FieldRow label={t.inspector.section.fields.buttonTargetSection}>
                                <SelectField
                                  value={buttonTargetSectionId}
                                  ariaLabel={t.inspector.section.fields.buttonTargetSection}
                                  onChange={(next) =>
                                    updateButtonItem(
                                      selectedSection.id,
                                      selectedButtonItem.id,
                                      {
                                        target: {
                                          kind: "section",
                                          sectionId: String(next),
                                        },
                                      }
                                    )
                                  }
                                >
                                  {project.sections.map((section: SectionBase) => (
                                    <option key={section.id} value={section.id}>
                                      {section.name ?? section.type}
                                    </option>
                                  ))}
                                </SelectField>
                              </FieldRow>
                            ) : (
                              <FieldRow label={t.inspector.section.fields.buttonTargetUrl}>
                                <input
                                  type="text"
                                  className="ui-input h-7 w-full text-[12px]"
                                  value={buttonTargetUrl}
                                  onChange={(event) =>
                                    updateButtonItem(
                                      selectedSection.id,
                                      selectedButtonItem.id,
                                      {
                                        target: {
                                          kind: "url",
                                          url: event.target.value,
                                        },
                                      }
                                    )
                                  }
                                />
                              </FieldRow>
                            )}
                          </div>
                        ) : null}
                        </div>
                      )}
                    </div>
                  ) : null}
                </div>
                {!isSimpleMode ? (
                  <>
                    {!isBrandBar && !isInquiry ? (
                      <div className={cardClass}>
                        <button
                          type="button"
                          className={cardHeaderClass + " w-full"}
                          aria-expanded={isAnimationsOpen}
                          onClick={() => setIsAnimationsOpen((current) => !current)}
                        >
                          <span>{t.inspector.section.cards.animations}</span>
                          <ChevronDown
                            size={14}
                            className={
                              isAnimationsOpen
                                ? "rotate-180 transition"
                                : "transition"
                            }
                          />
                        </button>
                        {isAnimationsOpen ? (
                          <div
                            className={
                              cardBodyClass +
                              (isContentReady ? "" : " pointer-events-none opacity-60")
                            }
                          >
                            {!isContentReady ? (
                              <div className="rounded-md border border-dashed border-[var(--ui-border)]/60 bg-[var(--ui-panel)]/60 px-3 py-2 text-[11px] text-[var(--ui-muted)]">
                                {t.inspector.section.placeholders.selectContent}
                              </div>
                            ) : isHeroImage ? (
                              <div className="flex flex-col gap-2">
                              <FieldRow label={t.inspector.section.fields.animationPreset}>
                                <SelectField
                                  value={heroAnimation?.preset ?? "none"}
                                  ariaLabel={t.inspector.section.fields.animationPreset}
                                  onChange={(next) => {
                                    if (next === "none") {
                                      updateSectionData(selectedSection.id, {
                                        heroAnimation: undefined,
                                      });
                                      return;
                                    }
                                    updateSectionData(selectedSection.id, {
                                      heroAnimation: {
                                        preset: next as "fade" | "slideUp" | "zoom",
                                        durationMs: heroAnimation?.durationMs ?? 400,
                                        delayMs: heroAnimation?.delayMs ?? 0,
                                      },
                                    });
                                  }}
                                >
                                  <option value="none">
                                    {t.inspector.section.animationOptions.none}
                                  </option>
                                  <option value="fade">
                                    {t.inspector.section.animationOptions.fade}
                                  </option>
                                  <option value="slideUp">
                                    {t.inspector.section.animationOptions.slideUp}
                                  </option>
                                  <option value="zoom">
                                    {t.inspector.section.animationOptions.zoom}
                                  </option>
                                </SelectField>
                              </FieldRow>
                              {heroAnimation ? (
                                <>
                                  <FieldRow label={t.inspector.section.fields.animationDuration}>
                                    <NumberField
                                      value={heroAnimation.durationMs ?? 400}
                                      min={100}
                                      max={5000}
                                      step={50}
                                      ariaLabel={t.inspector.section.fields.animationDuration}
                                      onChange={(next) =>
                                        updateSectionData(selectedSection.id, {
                                          heroAnimation: {
                                            ...heroAnimation,
                                            durationMs: next,
                                          },
                                        })
                                      }
                                    />
                                  </FieldRow>
                                  <FieldRow label={t.inspector.section.fields.animationDelay}>
                                    <NumberField
                                      value={heroAnimation.delayMs ?? 0}
                                      min={0}
                                      max={3000}
                                      step={50}
                                      ariaLabel={t.inspector.section.fields.animationDelay}
                                      onChange={(next) =>
                                        updateSectionData(selectedSection.id, {
                                          heroAnimation: {
                                            ...heroAnimation,
                                            delayMs: next,
                                          },
                                        })
                                      }
                                    />
                                  </FieldRow>
                                </>
                              ) : null}
                              <Accordion title="詳細" defaultOpen={false}>
                                <div className="px-1 py-2 text-[11px] text-[var(--ui-muted)]">
                                  {t.inspector.placeholders.advancedComingSoon}
                                </div>
                              </Accordion>
                            </div>
                          ) : isCampaignPeriodBar ? (
                            <div className="flex flex-col gap-2">
                              <FieldRow label={t.inspector.section.fields.animationPreset}>
                                <SelectField
                                  value={periodBarAnimation?.preset ?? "none"}
                                  ariaLabel={t.inspector.section.fields.animationPreset}
                                  onChange={(next) => {
                                    if (next === "none") {
                                      updateSectionData(selectedSection.id, {
                                        periodBarAnimation: undefined,
                                      });
                                      return;
                                    }
                                    updateSectionData(selectedSection.id, {
                                      periodBarAnimation: {
                                        preset: next as "fade" | "slideUp" | "zoom",
                                        durationMs: periodBarAnimation?.durationMs ?? 400,
                                        delayMs: periodBarAnimation?.delayMs ?? 0,
                                      },
                                    });
                                  }}
                                >
                                  <option value="none">
                                    {t.inspector.section.animationOptions.none}
                                  </option>
                                  <option value="fade">
                                    {t.inspector.section.animationOptions.fade}
                                  </option>
                                  <option value="slideUp">
                                    {t.inspector.section.animationOptions.slideUp}
                                  </option>
                                  <option value="zoom">
                                    {t.inspector.section.animationOptions.zoom}
                                  </option>
                                </SelectField>
                              </FieldRow>
                              {periodBarAnimation ? (
                                <>
                                  <FieldRow label={t.inspector.section.fields.animationDuration}>
                                    <NumberField
                                      value={periodBarAnimation.durationMs ?? 400}
                                      min={100}
                                      max={5000}
                                      step={50}
                                      ariaLabel={t.inspector.section.fields.animationDuration}
                                      onChange={(next) =>
                                        updateSectionData(selectedSection.id, {
                                          periodBarAnimation: {
                                            ...periodBarAnimation,
                                            durationMs: next,
                                          },
                                        })
                                      }
                                    />
                                  </FieldRow>
                                  <FieldRow label={t.inspector.section.fields.animationDelay}>
                                    <NumberField
                                      value={periodBarAnimation.delayMs ?? 0}
                                      min={0}
                                      max={3000}
                                      step={50}
                                      ariaLabel={t.inspector.section.fields.animationDelay}
                                      onChange={(next) =>
                                        updateSectionData(selectedSection.id, {
                                          periodBarAnimation: {
                                            ...periodBarAnimation,
                                            delayMs: next,
                                          },
                                        })
                                      }
                                    />
                                  </FieldRow>
                                </>
                              ) : null}
                            </div>
                          ) : (
                            <div className="flex flex-col gap-2">
                              <FieldRow label={t.inspector.section.fields.animationPreset}>
                                <SelectField
                                  value={
                                    selectedTitleItem?.animation?.preset ??
                                    selectedButtonItem?.animation?.preset ??
                                    selectedLine?.animation?.preset ??
                                    (selectedImageIds.length > 0 &&
                                    selectedImageItem?.images.find((image) =>
                                      selectedImageIds.includes(image.id)
                                    )?.animation?.preset
                                      ? selectedImageItem.images.find((image) =>
                                          selectedImageIds.includes(image.id)
                                        )?.animation?.preset
                                      : "none") ??
                                    "none"
                                  }
                                  ariaLabel={t.inspector.section.fields.animationPreset}
                                  onChange={(next) => {
                                    if (next === "none") {
                                      if (selectedLine && selectedTextItem) {
                                        updateTextLineAnimation(
                                          selectedSection.id,
                                          selectedTextItem.id,
                                          selectedLine.id,
                                          undefined
                                        );
                                        return;
                                      }
                                      if (selectedImageItem && selectedImageIds.length > 0) {
                                        updateImageAnimation(
                                          selectedSection.id,
                                          selectedImageItem.id,
                                          selectedImageIds,
                                          undefined
                                        );
                                        return;
                                      }
                                      if (selectedItem) {
                                        updateContentItemAnimation(
                                          selectedSection.id,
                                          selectedItem.id,
                                          undefined
                                        );
                                      }
                                      return;
                                    }
                                    if (selectedLine && selectedTextItem) {
                                      updateTextLineAnimation(
                                        selectedSection.id,
                                        selectedTextItem.id,
                                        selectedLine.id,
                                        { preset: next as "fade" | "slideUp" | "zoom" }
                                      );
                                      return;
                                    }
                                    if (selectedImageItem && selectedImageIds.length > 0) {
                                      updateImageAnimation(
                                        selectedSection.id,
                                        selectedImageItem.id,
                                        selectedImageIds,
                                        { preset: next as "fade" | "slideUp" | "zoom" }
                                      );
                                      return;
                                    }
                                    if (selectedItem) {
                                      updateContentItemAnimation(
                                        selectedSection.id,
                                        selectedItem.id,
                                        { preset: next as "fade" | "slideUp" | "zoom" }
                                      );
                                    }
                                  }}
                                >
                                  <option value="none">
                                    {t.inspector.section.animationOptions.none}
                                  </option>
                                  <option value="fade">
                                    {t.inspector.section.animationOptions.fade}
                                  </option>
                                  <option value="slideUp">
                                    {t.inspector.section.animationOptions.slideUp}
                                  </option>
                                  <option value="zoom">
                                    {t.inspector.section.animationOptions.zoom}
                                  </option>
                                </SelectField>
                              </FieldRow>
                              {(selectedLine?.animation ||
                                selectedImageItem?.images.find((image) =>
                                  selectedImageIds.includes(image.id)
                                )?.animation ||
                                selectedItem.animation) ? (
                                <>
                                  <FieldRow label={t.inspector.section.fields.animationDuration}>
                                    <NumberField
                                      value={
                                        selectedLine?.animation?.durationMs ??
                                        selectedImageItem?.images.find((image) =>
                                          selectedImageIds.includes(image.id)
                                        )?.animation?.durationMs ??
                                        selectedItem.animation?.durationMs ??
                                        400
                                      }
                                      min={100}
                                      max={5000}
                                      step={50}
                                      ariaLabel={t.inspector.section.fields.animationDuration}
                                      onChange={(next) =>
                                        {
                                          if (selectedLine && selectedTextItem) {
                                            updateTextLineAnimation(
                                              selectedSection.id,
                                              selectedTextItem.id,
                                              selectedLine.id,
                                              { durationMs: next }
                                            );
                                            return;
                                          }
                                          if (selectedImageItem && selectedImageIds.length > 0) {
                                            updateImageAnimation(
                                              selectedSection.id,
                                              selectedImageItem.id,
                                              selectedImageIds,
                                              { durationMs: next }
                                            );
                                            return;
                                          }
                                          if (selectedItem) {
                                            updateContentItemAnimation(
                                              selectedSection.id,
                                              selectedItem.id,
                                              { durationMs: next }
                                            );
                                          }
                                        }
                                      }
                                    />
                                  </FieldRow>
                                  <FieldRow label={t.inspector.section.fields.animationDelay}>
                                    <NumberField
                                      value={
                                        selectedLine?.animation?.delayMs ??
                                        selectedImageItem?.images.find((image) =>
                                          selectedImageIds.includes(image.id)
                                        )?.animation?.delayMs ??
                                        selectedItem.animation?.delayMs ??
                                        0
                                      }
                                      min={0}
                                      max={3000}
                                      step={50}
                                      ariaLabel={t.inspector.section.fields.animationDelay}
                                      onChange={(next) =>
                                        {
                                          if (selectedLine && selectedTextItem) {
                                            updateTextLineAnimation(
                                              selectedSection.id,
                                              selectedTextItem.id,
                                              selectedLine.id,
                                              { delayMs: next }
                                            );
                                            return;
                                          }
                                          if (selectedImageItem && selectedImageIds.length > 0) {
                                            updateImageAnimation(
                                              selectedSection.id,
                                              selectedImageItem.id,
                                              selectedImageIds,
                                              { delayMs: next }
                                            );
                                            return;
                                          }
                                          if (selectedItem) {
                                            updateContentItemAnimation(
                                              selectedSection.id,
                                              selectedItem.id,
                                              { delayMs: next }
                                            );
                                          }
                                        }
                                      }
                                    />
                                  </FieldRow>
                                </>
                              ) : null}
                            </div>
                            )}
                          </div>
                        ) : null}
                      </div>
                    ) : null}
                    {selectedSection && isTargetStores ? (
                      <div className={cardClass}>
                        <button
                          type="button"
                          className={cardHeaderClass + " w-full"}
                          aria-expanded={isStoreDesignOpen}
                          onClick={() => setIsStoreDesignOpen((current) => !current)}
                        >
                          <span>ストアデザイン</span>
                          <ChevronDown
                            size={14}
                            className={
                              isStoreDesignOpen
                                ? "rotate-180 transition"
                                : "transition"
                            }
                          />
                        </button>
                        {isStoreDesignOpen ? (
                          <div className={cardBodyClass}>
                            <div className="flex flex-col gap-3">
                              {!hasStoresData ? (
                                <div className="rounded-md border border-[var(--ui-border)] bg-[var(--ui-panel)] px-3 py-2 text-[11px] text-[var(--ui-muted)]">
                                  CSV取り込み後にラベル設定が表示されます。
                                </div>
                              ) : targetStoresExtraColumns.length === 0 ? (
                                <div className="rounded-md border border-[var(--ui-border)] bg-[var(--ui-panel)] px-3 py-2 text-[11px] text-[var(--ui-muted)]">
                                  自由列がありません。
                                </div>
                              ) : (
                                <div className="flex flex-col gap-3">
                                  <div className="rounded-md border border-[var(--ui-border)] bg-[var(--ui-panel)] p-3">
                                    <div className="text-[11px] font-semibold text-[var(--ui-text)]">
                                      ラベル条件
                                    </div>
                                    <div className="mt-2 flex flex-wrap items-center gap-2">
                                      <SegmentedField
                                        value={storeFilterOperator}
                                        ariaLabel="ラベル条件"
                                        options={[
                                          { value: "AND", label: "すべて満たす" },
                                          { value: "OR", label: "いずれか" },
                                        ]}
                                        onChange={(next) =>
                                          updateTargetStoresContent(selectedSection.id, {
                                            storeFilterOperator: next as "AND" | "OR",
                                          })
                                        }
                                      />
                                    </div>
                                    <div className="mt-2 text-[11px] text-[var(--ui-muted)]">
                                      {storeFilterOperator === "AND"
                                        ? "選択したラベルを“すべて”満たす店舗のみ表示"
                                        : "選択したラベルの“どれか1つ”でも満たす店舗を表示"}
                                    </div>
                                    {selectedFilterLabels.length >= 2 ? (
                                      <div className="mt-1 text-[11px] text-[var(--ui-muted)]">
                                        例: {selectedFilterLabels.slice(0, 2).join(
                                          storeFilterOperator === "AND" ? " ∧ " : " ∨ "
                                        )}
                                      </div>
                                    ) : null}
                                  </div>
                                  <div className="text-[11px] text-[var(--ui-muted)]">
                                    ラベル設定
                                  </div>
                                  {targetStoresExtraColumns.map((column) => {
                                    const label = resolvedStoreLabels[column];
                                    if (!label) {
                                      return null;
                                    }
                                    return (
                                      <div
                                        key={column}
                                        className="rounded-md border border-[var(--ui-border)] bg-[var(--ui-panel)] p-3"
                                      >
                                        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                                          <div className="flex-1">
                                            <div className="flex items-center gap-2">
                                              <span
                                                className="inline-flex items-center rounded-full border border-[var(--ui-border)] px-2 py-0.5 text-[11px] text-[var(--ui-text)]"
                                                style={{ backgroundColor: label.color }}
                                              >
                                                {label.displayName}
                                              </span>
                                            </div>
                                            <input
                                              type="text"
                                              className="ui-input mt-2 h-7 w-full text-[12px]"
                                              value={label.displayName}
                                              placeholder={label.columnKey}
                                              onChange={(event) =>
                                                updateStoreLabelConfig(column, {
                                                  displayName: event.target.value,
                                                })
                                              }
                                            />
                                            <div className="mt-1 text-[10px] text-[var(--ui-muted)]">
                                              元: {label.columnKey}
                                            </div>
                                          </div>
                                          <div className="flex items-center gap-2">
                                            <ColorField
                                              value={label.color}
                                              ariaLabel={`${label.displayName} の色`}
                                              onChange={(next) =>
                                                updateStoreLabelConfig(column, {
                                                  color: next,
                                                })
                                              }
                                            />
                                          </div>
                                        </div>
                                      </div>
                                    );
                                  })}
                                </div>
                              )}
                            </div>
                          </div>
                        ) : null}
                      </div>
                    ) : null}
                  </>
                ) : null}
                </>
                ) : null}
              </div>
            ) : selected.kind === "page" ? (
              <div className="flex flex-col gap-3">
                <div className={cardClass}>
                  <div className={cardHeaderClass}>背景URL</div>
                  <div className={cardBodyClass}>
                    <div className="flex flex-col gap-3">
                      <FieldRow label="適用先">
                        <SegmentedField
                          value={backgroundTarget}
                          ariaLabel="適用先"
                          options={[
                            { value: "page", label: "LP全体" },
                            { value: "mv", label: "MV" },
                          ]}
                          onChange={(next) =>
                            setBackgroundTarget(next as "page" | "mv")
                          }
                        />
                      </FieldRow>
                      {activeBackgroundSpec?.type === "image" ? (
                        <FieldRow label="画像URL">
                          <input
                            type="text"
                            className="ui-input h-7 w-full text-[12px]"
                            value={activeBackgroundSpec.assetId}
                            placeholder="https://..."
                            onChange={(event) =>
                              applyBackgroundSpec({
                                ...activeBackgroundSpec,
                                assetId: event.target.value,
                              })
                            }
                          />
                        </FieldRow>
                      ) : null}
                      {activeBackgroundSpec?.type === "video" ? (
                        <FieldRow label="動画URL">
                          <input
                            type="text"
                            className="ui-input h-7 w-full text-[12px]"
                            value={activeBackgroundSpec.assetId}
                            placeholder="https://..."
                            onChange={(event) =>
                              applyBackgroundSpec({
                                ...activeBackgroundSpec,
                                assetId: event.target.value,
                              })
                            }
                          />
                        </FieldRow>
                      ) : null}
                      {activeBackgroundSpec?.type !== "image" &&
                      activeBackgroundSpec?.type !== "video" ? (
                        <div className="rounded-md border border-[var(--ui-border)]/60 bg-[var(--ui-panel)]/60 px-3 py-2 text-[11px] text-[var(--ui-muted)]">
                          背景タイプが画像/動画のときにURLを設定できます。
                        </div>
                      ) : null}
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="rounded-md border border-[var(--ui-border)]/60 bg-[var(--ui-panel)]/60 px-3 py-2 text-[12px] text-[var(--ui-muted)]">
                {t.inspector.placeholders.advancedComingSoon}
              </div>
            )}
          </div>
        </div>
      </div>
      </div>
      </aside>
      {isCsvImportModalOpen && csvImportDraft ? (
        <CsvImportPreviewModal
          isOpen={isCsvImportModalOpen}
          fileName={csvImportDraft.fileName}
          preview={csvImportDraft.preview}
          canImport={csvImportDraft.canImport}
          onCancel={handleCancelCsvImport}
          onConfirm={handleConfirmCsvImport}
        />
      ) : null}
    </>
  );
}
