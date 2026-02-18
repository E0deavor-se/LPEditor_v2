export type SectionTextAlign = "left" | "center" | "right";

export type SectionTypography = {
  fontFamily: string;
  fontSize: number;
  fontWeight: number;
  lineHeight: number;
  letterSpacing: number;
  textAlign: SectionTextAlign;
  textColor: string;
};

export type BackgroundPatternId =
  | "dots"
  | "diagonal"
  | "grid"
  | "zigzag"
  | "noise"
  | "checker"
  | "cross"
  | "stripes"
  | "waves"
  | "stars"
  | "hearts"
  | "ribbon"
  | "clouds"
  | "candy"
  | "balloons"
  | "flowers"
  | "bow"
  | "yume";

export type BackgroundPatternSpec = {
  type: "pattern";
  patternId: BackgroundPatternId;
  foreground: string;
  background: string;
  size: number;
  opacity: number;
};

export type BackgroundLayerSpec = {
  type: "layers";
  layers: BackgroundSpec[];
  backgroundColor?: string;
};

export type BackgroundSpec =
  | { type: "solid"; color: string }
  | {
      type: "gradient";
      angle: number;
      stops: { color: string; pos: number }[];
    }
  | BackgroundPatternSpec
  | BackgroundLayerSpec
  | {
      type: "image";
      assetId: string;
      repeat: string;
      size: string;
      position: string;
      attachment: string;
      opacity: number;
      blur?: number;
      brightness?: number;
      saturation?: number;
      overlayColor?: string;
      overlayOpacity?: number;
      overlayBlendMode?: "normal" | "multiply" | "screen" | "overlay";
    }
  | {
      type: "video";
      assetId: string;
      overlayColor?: string;
      opacity?: number;
      blur?: number;
      brightness?: number;
      saturation?: number;
      autoPlay?: boolean;
      loop?: boolean;
      muted?: boolean;
      playsInline?: boolean;
    }
  | { type: "preset"; presetId: string; overrides?: Partial<BackgroundSpec> };

export type SectionBackground = {
  type: "solid" | "gradient";
  color1: string;
  color2: string;
};

export type SectionBorder = {
  enabled: boolean;
  width: number;
  color: string;
};

export type SectionShadow = "none" | "sm" | "md";

export type SectionCardPresetId =
  | "au PAY"
  | "box01"
  | "box02"
  | "box03"
  | "box04"
  | "box05"
  | "box06"
  | "box07"
  | "box08"
  | "box09"
  | "box10"
  | "box11"
  | "box12"
  | "box13"
  | "box14"
  | "box15"
  | "box16"
  | "box17"
  | "box18"
  | "box19"
  | "box20"
  | "box21"
  | "box22"
  | "box23"
  | "box24"
  | "box25"
  | "box26";

export type SectionCardHeaderStyle = "bandBold" | "box26";

export type SectionCardStyle = {
  presetId: SectionCardPresetId;
  borderColor: string;
  borderWidth: number;
  radius: number;
  padding: { t: number; r: number; b: number; l: number };
  headerStyle: SectionCardHeaderStyle;
  headerBgColor: string;
  headerTextColor: string;
  labelChipEnabled: boolean;
  labelChipBg: string;
  labelChipTextColor: string;
  shadowEnabled: boolean;
  shadowOpacity: number;
  innerBgColor: string;
  textColor: string;
};

export type SectionCardStylePatch = Partial<SectionCardStyle> & {
  padding?: Partial<SectionCardStyle["padding"]>;
};

export type SectionStyle = {
  typography: SectionTypography;
  background: SectionBackground;
  backgroundSpec?: BackgroundSpec;
  border: SectionBorder;
  shadow: SectionShadow;
  layout: {
    padding: { t: number; r: number; b: number; l: number };
    maxWidth: number;
    align: "left" | "center";
    radius: number;
    fullWidth: boolean;
    minHeight: number;
  };
  customCss?: string;
};

export type SectionStylePatch = {
  typography?: Partial<SectionTypography>;
  background?: Partial<SectionBackground>;
  border?: Partial<SectionBorder>;
  shadow?: SectionShadow;
  layout?: Partial<SectionStyle["layout"]>;
  customCss?: string;
};

export type LineMarks = {
  bold?: boolean;
  color?: string;
  size?: number;
  textAlign?: "left" | "center" | "right";
  callout?: {
    enabled?: boolean;
    variant?: "note" | "warn" | "info";
    bg?: boolean;
    border?: boolean;
    bgColor?: string;
    borderColor?: string;
    radius?: number;
    padding?: "sm" | "md" | "lg";
    shadow?: "none" | "sm" | "md";
  };
};

export type PrimaryLine = {
  id: string;
  text: string;
  marks?: LineMarks;
  animation?: ContentItemAnimation;
};

export type ContentItemAnimation = {
  preset: "fade" | "slideUp" | "zoom";
  durationMs: number;
  delayMs: number;
};

export type SectionAnimation = {
  type:
    | "none"
    | "fade"
    | "slide"
    | "slideDown"
    | "slideLeft"
    | "slideRight"
    | "zoom"
    | "bounce"
    | "flip"
    | "flipY"
    | "rotate"
    | "blur"
    | "pop"
    | "swing"
    | "float"
    | "pulse"
    | "shake"
    | "wobble"
    | "skew"
    | "roll"
    | "tilt"
    | "zoomOut"
    | "stretch"
    | "compress"
    | "glide";
  trigger: "onView" | "onScroll";
  speed: number;
  easing: "linear" | "ease" | "ease-in" | "ease-out" | "ease-in-out";
};

export type TextContentItem = {
  id: string;
  type: "text";
  lines: PrimaryLine[];
  animation?: ContentItemAnimation;
};

export type TitleContentItem = {
  id: string;
  type: "title";
  text: string;
  marks?: LineMarks;
  animation?: ContentItemAnimation;
};

export type ImageItem = {
  id: string;
  src: string;
  assetId?: string;
  alt?: string;
  w?: number;
  h?: number;
  animation?: ContentItemAnimation;
};

export type ImageContentItem = {
  id: string;
  type: "image";
  images: ImageItem[];
  layout?:
    | "auto"
    | "vertical"
    | "horizontal"
    | "columns2"
    | "columns3"
    | "grid"
    | "slideshow";
  animation?: ContentItemAnimation;
};

export type ButtonTarget =
  | { kind: "section"; sectionId: string }
  | { kind: "url"; url: string };

export type ButtonStyle = {
  presetId?: "default" | "secondary" | "couponFlow" | string;
  align?: "left" | "center" | "right";
  fullWidth?: boolean;
  width?: number;
  radius?: number;
  backgroundColor?: string;
  textColor?: string;
  borderColor?: string;
  borderWidth?: number;
};

export type ButtonContentItem = {
  id: string;
  type: "button";
  label: string;
  target: ButtonTarget;
  variant?: "primary" | "secondary";
  style?: ButtonStyle;
  animation?: ContentItemAnimation;
};

export type ContentItem =
  | TitleContentItem
  | TextContentItem
  | ImageContentItem
  | ButtonContentItem;

export type StoreCsvData = {
  headers: string[];
  rows: Record<string, string>[];
  importedAt?: string;
  stats?: {
    totalRows: number;
    duplicateCount?: number;
    duplicateIds?: string[];
  };
};

export type StoreLabelConfig = {
  columnKey: string;
  displayName: string;
  color: string;
  trueText: string;
  falseText: string;
  valueDisplay?: "toggle" | "raw";
  showAsFilter: boolean;
  showAsBadge: boolean;
};

export type StoreLabels = Record<string, StoreLabelConfig>;
export type StoreFilters = Record<string, boolean>;
export type StoreFilterOperator = "AND" | "OR";

export type SectionContent = {
  title?: string;
  items?: ContentItem[];
  primaryText?: string;
  primaryLines?: PrimaryLine[];
  image?: { src: string; alt?: string };
  button?: { label: string; href: string; variant?: "primary" | "secondary" };
  storeCsv?: StoreCsvData;
  storeLabels?: StoreLabels;
  storeFilters?: StoreFilters;
  storeFilterOperator?: StoreFilterOperator;
};

export type SectionBase = {
  id: string;
  type: string;
  visible: boolean;
  locked: boolean;
  name?: string;
  data: Record<string, unknown>;
  content?: SectionContent;
  style: SectionStyle;
  sectionCardStyle?: SectionCardStyle;
};

export type PageBaseStyle = {
  typography: {
    fontFamily: string;
    baseSize: number;
    lineHeight: number;
    letterSpacing: number;
    fontWeight: number;
  };
  sectionAnimation: SectionAnimation;
  colors: {
    background: string;
    text: string;
    accent: string;
    border: string;
  };
  spacing: {
    sectionPadding: {
      t: number;
      r: number;
      b: number;
      l: number;
    };
    sectionGap: number;
  };
  layout: {
    maxWidth: number;
    align: "left" | "center";
    radius: number;
    shadow: "none" | "sm" | "md";
  };
};

export type PageMetaPresets = {
  appendAuPayTitle?: boolean;
  ogpFromMv?: boolean;
  injectCampaignPeriod?: boolean;
};

export type PageMetaSettings = {
  title: string;
  description: string;
  faviconUrl?: string;
  faviconAssetId?: string;
  ogpImageUrl?: string;
  ogpImageAssetId?: string;
  ogpTitle?: string;
  ogpDescription?: string;
  presets?: PageMetaPresets;
};

export type ProjectSettings = {
  backgrounds?: {
    page?: BackgroundSpec;
    mv?: BackgroundSpec;
  };
  pageMeta?: PageMetaSettings;
  [key: string]: unknown;
};

export type ProjectState = {
  meta: {
    projectName: string;
    templateType: "coupon" | "point" | "quickchance" | "target";
    version: string;
    createdAt: string;
    updatedAt: string;
  };
  settings: ProjectSettings;
  sections: SectionBase[];
  pageBaseStyle?: PageBaseStyle;
  stores?: StoresTable;
  assets?: Record<string, AssetRecord>;
  schemaVersion?: string;
  appVersion?: string;
  globalSettings?: GlobalSettings;
  assetMeta?: AssetMeta[];
  storeListSpec?: StoreListSpec;
  themeSpec?: ThemeSpec;
  animationRegistry?: AnimationSpec[];
};

export type AssetRecord = {
  id: string;
  filename: string;
  data: string;
};

export type AssetKind = "image" | "video" | "font" | "data" | "other";

export type AssetMeta = {
  id: string;
  filename: string;
  path: string;
  kind: AssetKind;
  mimeType?: string;
  size?: number;
  hash?: string;
};

export type AnimationSpec = {
  id: string;
  type: string;
  trigger: "onLoad" | "onView" | "hover" | "scroll";
  delay: number;
  duration: number;
  easing: string;
  once: boolean;
  threshold?: number;
};

export type StoreListSpec = {
  filterMode: "AND" | "OR";
  filters: Record<string, boolean>;
  labelColors: Record<string, string>;
  visibleColumns: string[];
  sortState: Record<string, unknown>;
  uiState: {
    pageSize: number;
    collapsed: boolean;
  };
};

export type ThemeSpec = {
  mode: "light" | "dark" | "system";
  surfaceStyle: "flat" | "glass";
  presetId: "classic" | "premium" | "midnight" | "ivory" | "mint";
};

export type GlobalSettings = {
  ui?: {
    previewMode?: "desktop" | "mobile";
    previewAspect?: "free" | "16:9" | "4:3" | "1:1";
  };
  i18n?: {
    locale: string;
  };
};

export type ProjectFile = {
  schemaVersion: string;
  appVersion: string;
  globalSettings: GlobalSettings;
  meta?: ProjectState["meta"];
  settings?: ProjectState["settings"];
  pageBaseStyle?: PageBaseStyle;
  sections: SectionBase[];
  assets: AssetMeta[];
  storeListSpec?: StoreListSpec;
  themeSpec?: ThemeSpec;
  animationRegistry?: AnimationSpec[];
};

export type StoresTable = {
  columns: string[];
  extraColumns?: string[];
  rows: Record<string, string>[];
  canonical: {
    storeIdKey?: string;
    storeNameKey: string;
    postalCodeKey: string;
    addressKey: string;
    prefectureKey: string;
  };
};
