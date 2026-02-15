export type SectionCapabilities = {
  text: boolean;
  typography: boolean;
  colors: boolean;
  layout: boolean;
  decorations: boolean;
  animation: boolean;
  allowBackgroundGradient: boolean;
};

const baseEnabled: SectionCapabilities = {
  text: true,
  typography: true,
  colors: true,
  layout: true,
  decorations: true,
  animation: true,
  allowBackgroundGradient: true,
};

export const SECTION_CAPABILITIES: Record<string, SectionCapabilities> = {
  brandBar: {
    ...baseEnabled,
    decorations: false,
  },
  heroImage: {
    text: false,
    typography: false,
    colors: true,
    layout: true,
    decorations: true,
    animation: true,
    allowBackgroundGradient: true,
  },
  campaignPeriodBar: {
    text: false,
    typography: true,
    colors: true,
    layout: true,
    decorations: false,
    animation: false,
    allowBackgroundGradient: false,
  },
  campaignOverview: {
    ...baseEnabled,
  },
  couponFlow: {
    text: false,
    typography: false,
    colors: false,
    layout: true,
    decorations: false,
    animation: false,
    allowBackgroundGradient: false,
  },
  targetStores: {
    text: false,
    typography: true,
    colors: true,
    layout: true,
    decorations: false,
    animation: true,
    allowBackgroundGradient: false,
  },
  legalNotes: {
    ...baseEnabled,
    allowBackgroundGradient: false,
  },
  footerHtml: {
    text: false,
    typography: false,
    colors: false,
    layout: false,
    decorations: false,
    animation: false,
    allowBackgroundGradient: false,
  },
  textBlock: {
    ...baseEnabled,
  },
  imageText: {
    ...baseEnabled,
  },
  cta: {
    ...baseEnabled,
  },
  faq: {
    ...baseEnabled,
  },
  divider: {
    text: false,
    typography: false,
    colors: true,
    layout: true,
    decorations: false,
    animation: false,
    allowBackgroundGradient: false,
  },
  rankingTable: {
    ...baseEnabled,
  },
  paymentHistoryGuide: {
    ...baseEnabled,
  },
  tabbedNotes: {
    ...baseEnabled,
  },
  excludedStoresList: {
    text: false,
    typography: true,
    colors: true,
    layout: true,
    decorations: false,
    animation: false,
    allowBackgroundGradient: false,
  },
  excludedBrandsList: {
    text: false,
    typography: true,
    colors: true,
    layout: true,
    decorations: false,
    animation: false,
    allowBackgroundGradient: false,
  },
};

export const getSectionCapabilities = (type: string): SectionCapabilities =>
  SECTION_CAPABILITIES[type] ?? baseEnabled;
