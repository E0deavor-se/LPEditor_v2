import type {
  LayoutCampaignFamily,
  ProjectLayoutSuggestion,
  ProjectState,
  SectionBase,
  SectionLayoutSuggestion,
  SectionTextAlign,
} from "@/src/types/project";

const deriveCampaignFamily = (project: ProjectState): LayoutCampaignFamily => {
  const templateId = project.meta.templateId ?? project.themeSpec?.templateId;
  if (templateId === "campaign") {
    return "coupon";
  }
  if (templateId === "point") {
    return "points";
  }
  if (templateId === "ranking") {
    return "ranking";
  }
  if (templateId === "excluded-stores" || templateId === "excluded-brands") {
    return "store";
  }
  switch (project.meta.templateType) {
    case "coupon":
      return "coupon";
    case "point":
      return "points";
    case "quickchance":
      return "ranking";
    case "target":
      return "store";
    default:
      return "generic";
  }
};

export const buildProjectLayoutSuggestion = (
  project: ProjectState,
): ProjectLayoutSuggestion => {
  const campaignFamily = deriveCampaignFamily(project);
  const themeId = project.themeSpec?.themeId;
  const templateId = project.meta.templateId ?? project.themeSpec?.templateId;

  const pageMood = (() => {
    if (campaignFamily === "coupon") {
      return "benefit" as const;
    }
    if (campaignFamily === "points") {
      return "trust" as const;
    }
    if (campaignFamily === "ranking") {
      return "comparison" as const;
    }
    return "informational" as const;
  })();

  const spacingScale = (() => {
    if (themeId === "minimalWhite") {
      return "relaxed" as const;
    }
    if (themeId === "darkModern") {
      return "compact" as const;
    }
    return "normal" as const;
  })();

  const visualWeight = (() => {
    if (themeId === "darkModern" || campaignFamily === "ranking") {
      return "high" as const;
    }
    if (themeId === "minimalWhite") {
      return "low" as const;
    }
    return "medium" as const;
  })();

  return {
    templateId,
    themeId,
    campaignFamily,
    pageMood,
    spacingScale,
    visualWeight,
  };
};

const countContentLines = (section: SectionBase) => {
  const items = Array.isArray(section.content?.items) ? section.content?.items : [];
  return items.reduce((sum, item) => {
    if (item.type === "text") {
      return sum + item.lines.length;
    }
    if (item.type === "title") {
      return sum + 1;
    }
    return sum;
  }, 0);
};

const resolveExplicitAlignment = (section: SectionBase): SectionTextAlign | undefined => {
  const align = section.style?.typography?.textAlign;
  if (align === "center" || align === "right") {
    return align;
  }
  return undefined;
};

const buildFallbackSuggestion = (): SectionLayoutSuggestion => ({
  layoutMode: "stacked",
  contentBalance: "balanced",
  visualWeight: "medium",
  textAlignment: "left",
  imagePlacementHint: "top",
  cardStyleHint: "flat",
  spacingScale: "normal",
  backgroundIntensity: "low",
  ctaEmphasis: "medium",
  badgeEmphasis: "low",
  sourceHints: ["fallback"],
});

const applyTemplateLayoutPreset = (
  suggestion: SectionLayoutSuggestion,
  projectSuggestion: ProjectLayoutSuggestion,
  section: SectionBase,
): SectionLayoutSuggestion => {
  const next = { ...suggestion, sourceHints: [...(suggestion.sourceHints ?? [])] };
  switch (projectSuggestion.templateId) {
    case "campaign":
      if (section.type === "heroImage") {
        next.layoutMode = "heroTextLeft";
        next.badgeEmphasis = "high";
        next.ctaEmphasis = "high";
      }
      if (section.type === "couponFlow") {
        next.layoutMode = "centeredCta";
        next.ctaEmphasis = "high";
      }
      break;
    case "point":
      if (section.type === "heroImage") {
        next.layoutMode = "heroSplit";
        next.contentBalance = "balanced";
      }
      if (section.type === "campaignOverview") {
        next.contentBalance = "textHeavy";
      }
      break;
    case "ranking":
      if (section.type === "heroImage") {
        next.layoutMode = "heroTextRight";
      }
      if (section.type === "rankingTable") {
        next.layoutMode = "cardGrid";
        next.visualWeight = "high";
      }
      break;
    case "excluded-stores":
    case "excluded-brands":
      next.layoutMode = "infoList";
      next.spacingScale = "compact";
      break;
    default:
      break;
  }
  next.sourceHints?.push(`template:${projectSuggestion.templateId ?? "none"}`);
  return next;
};

const applyThemeLayoutBias = (
  suggestion: SectionLayoutSuggestion,
  projectSuggestion: ProjectLayoutSuggestion,
): SectionLayoutSuggestion => {
  const next = { ...suggestion, sourceHints: [...(suggestion.sourceHints ?? [])] };
  switch (projectSuggestion.themeId) {
    case "orangeCampaign":
      next.badgeEmphasis = next.badgeEmphasis === "low" ? "medium" : next.badgeEmphasis;
      next.backgroundIntensity = next.backgroundIntensity === "low" ? "medium" : next.backgroundIntensity;
      break;
    case "blueCorporate":
      next.cardStyleHint = next.cardStyleHint === "raised" ? "outlined" : next.cardStyleHint;
      next.visualWeight = next.visualWeight === "high" ? "medium" : next.visualWeight;
      break;
    case "darkModern":
      next.visualWeight = "high";
      next.backgroundIntensity = "high";
      next.cardStyleHint = "raised";
      break;
    case "minimalWhite":
      next.spacingScale = "relaxed";
      next.cardStyleHint = "flat";
      next.backgroundIntensity = "low";
      break;
    default:
      break;
  }
  next.sourceHints?.push(`theme:${projectSuggestion.themeId ?? "none"}`);
  return next;
};

const applySectionTypeSuggestion = (
  suggestion: SectionLayoutSuggestion,
  section: SectionBase,
  projectSuggestion: ProjectLayoutSuggestion,
): SectionLayoutSuggestion => {
  const next = { ...suggestion, sourceHints: [...(suggestion.sourceHints ?? [])] };
  const lineCount = countContentLines(section);
  switch (section.type) {
    case "heroImage":
      next.layoutMode = next.layoutMode === "stacked" ? "heroSplit" : next.layoutMode;
      next.imagePlacementHint = next.layoutMode === "heroTextRight" ? "left" : "right";
      next.contentBalance = section.data?.heroFullSize ? "visualHeavy" : "balanced";
      next.backgroundIntensity = projectSuggestion.campaignFamily === "coupon" ? "medium" : next.backgroundIntensity;
      break;
    case "couponFlow":
    case "paymentHistoryGuide":
    case "contact":
      next.layoutMode = "centeredCta";
      next.ctaEmphasis = "high";
      next.visualWeight = "high";
      next.cardStyleHint = "raised";
      break;
    case "targetStores":
    case "rankingTable":
      next.layoutMode = "cardGrid";
      next.cardStyleHint = "outlined";
      next.contentBalance = "visualHeavy";
      next.spacingScale = "normal";
      break;
    case "campaignOverview":
      next.layoutMode = "stacked";
      next.contentBalance = lineCount >= 4 ? "textHeavy" : "balanced";
      next.spacingScale = lineCount >= 4 ? "relaxed" : next.spacingScale;
      break;
    case "legalNotes":
    case "tabbedNotes":
    case "footerHtml":
    case "excludedStoresList":
    case "excludedBrandsList":
      next.layoutMode = "compactNotice";
      next.contentBalance = "textHeavy";
      next.visualWeight = "low";
      next.spacingScale = "compact";
      next.ctaEmphasis = "low";
      break;
    case "brandBar":
      next.layoutMode = "infoList";
      next.visualWeight = "low";
      next.spacingScale = "compact";
      break;
    case "imageOnly":
    case "image":
      next.layoutMode = "stacked";
      next.contentBalance = "visualHeavy";
      next.imagePlacementHint = "center";
      next.visualWeight = "high";
      break;
    default:
      break;
  }
  next.sourceHints?.push(`section:${section.type}`);
  return next;
};

const applyManualStyleBias = (
  suggestion: SectionLayoutSuggestion,
  section: SectionBase,
): SectionLayoutSuggestion => {
  const next = { ...suggestion, sourceHints: [...(suggestion.sourceHints ?? [])] };
  const explicitAlignment = resolveExplicitAlignment(section);
  if (explicitAlignment) {
    next.textAlignment = explicitAlignment;
    next.sourceHints?.push("manual:textAlign");
  }

  if (section.sectionCardStyle) {
    const hasBorder = section.sectionCardStyle.borderWidth > 0;
    const hasShadow = section.sectionCardStyle.shadowEnabled;
    next.cardStyleHint = hasShadow ? "raised" : hasBorder ? "outlined" : "flat";
    next.sourceHints?.push("manual:cardStyle");
  }

  const verticalPadding =
    (section.style.layout.padding.t + section.style.layout.padding.b) / 2;
  if (verticalPadding <= 20) {
    next.spacingScale = "compact";
    next.sourceHints?.push("manual:spacingCompact");
  } else if (verticalPadding >= 40) {
    next.spacingScale = "relaxed";
    next.sourceHints?.push("manual:spacingRelaxed");
  }

  return next;
};

export const buildSectionLayoutSuggestion = (
  project: ProjectState,
  section: SectionBase,
  projectSuggestion?: ProjectLayoutSuggestion,
): SectionLayoutSuggestion => {
  const pageSuggestion = projectSuggestion ?? buildProjectLayoutSuggestion(project);
  const fallback = buildFallbackSuggestion();
  const withTemplate = applyTemplateLayoutPreset(fallback, pageSuggestion, section);
  const withTheme = applyThemeLayoutBias(withTemplate, pageSuggestion);
  const withSection = applySectionTypeSuggestion(withTheme, section, pageSuggestion);
  return applyManualStyleBias(withSection, section);
};

export const applyLayoutSuggestionsToProject = (
  project: ProjectState,
): ProjectState => {
  const projectSuggestion = buildProjectLayoutSuggestion(project);
  const nextSections = (project.sections ?? []).map((section) => ({
    ...section,
    aiLayoutSuggestion: buildSectionLayoutSuggestion(project, section, projectSuggestion),
  }));
  const nextLayoutDocument = project.editorDocuments?.layoutDocument
    ? {
        ...project.editorDocuments.layoutDocument,
        sections: nextSections,
        layoutSuggestion: projectSuggestion,
      }
    : null;

  return {
    ...project,
    sections: nextSections,
    layoutSuggestion: projectSuggestion,
    editorDocuments: project.editorDocuments
      ? {
          ...project.editorDocuments,
          layoutDocument: nextLayoutDocument,
        }
      : project.editorDocuments,
  };
};

export const getLayoutModeLabel = (
  mode: SectionLayoutSuggestion["layoutMode"],
): string => {
  switch (mode) {
    case "heroSplit":
      return "ヒーロー分割";
    case "heroTextLeft":
      return "左テキスト優先";
    case "heroTextRight":
      return "右テキスト優先";
    case "cardGrid":
      return "カード一覧";
    case "centeredCta":
      return "CTA集中";
    case "infoList":
      return "情報リスト";
    case "compactNotice":
      return "注記コンパクト";
    case "stacked":
    default:
      return "積み上げ";
  }
};

export const getBalanceLabel = (
  balance: SectionLayoutSuggestion["contentBalance"],
): string => {
  switch (balance) {
    case "textHeavy":
      return "テキスト重視";
    case "visualHeavy":
      return "ビジュアル重視";
    case "balanced":
    default:
      return "バランス";
  }
};

export const getIntensityLabel = (
  intensity: "low" | "medium" | "high",
): string => {
  switch (intensity) {
    case "low":
      return "弱め";
    case "high":
      return "強め";
    case "medium":
    default:
      return "標準";
  }
};

export const getPageMoodLabel = (
  mood: ProjectLayoutSuggestion["pageMood"],
): string => {
  switch (mood) {
    case "benefit":
      return "訴求重視";
    case "trust":
      return "信頼重視";
    case "comparison":
      return "比較重視";
    case "informational":
    default:
      return "情報整理";
  }
};
