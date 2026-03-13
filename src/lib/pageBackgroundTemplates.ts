import type { BackgroundSpec } from "@/src/types/project";

export type PageBackgroundTemplate = {
  id: string;
  label: string;
  spec: BackgroundSpec;
};

export const PAGE_BACKGROUND_TEMPLATES: PageBackgroundTemplate[] = [
  { id: "solid", label: "solid", spec: { type: "solid", color: "#ffffff" } },
  {
    id: "softGradient",
    label: "softGradient",
    spec: {
      type: "gradient",
      angle: 140,
      stops: [
        { color: "#fff7ed", pos: 0 },
        { color: "#ffedd5", pos: 100 },
      ],
    },
  },
  {
    id: "warmGradient",
    label: "warmGradient",
    spec: {
      type: "gradient",
      angle: 145,
      stops: [
        { color: "#ffe4e6", pos: 0 },
        { color: "#fde68a", pos: 100 },
      ],
    },
  },
  {
    id: "dotPattern",
    label: "dotPattern",
    spec: {
      type: "pattern",
      patternId: "dots",
      foreground: "#f59e0b",
      background: "#fffaf0",
      size: 18,
      opacity: 0.16,
    },
  },
  {
    id: "stripePattern",
    label: "stripePattern",
    spec: {
      type: "pattern",
      patternId: "stripes",
      foreground: "#fb923c",
      background: "#fff7ed",
      size: 14,
      opacity: 0.14,
    },
  },
  {
    id: "subtleGrid",
    label: "subtleGrid",
    spec: {
      type: "pattern",
      patternId: "grid",
      foreground: "#cbd5e1",
      background: "#ffffff",
      size: 24,
      opacity: 0.22,
    },
  },
  {
    id: "campaignConfetti",
    label: "campaignConfetti",
    spec: {
      type: "layers",
      backgroundColor: "#fff7ed",
      layers: [
        {
          type: "pattern",
          patternId: "stars",
          foreground: "#f97316",
          background: "transparent",
          size: 20,
          opacity: 0.18,
        },
        {
          type: "pattern",
          patternId: "candy",
          foreground: "#ec4899",
          background: "transparent",
          size: 20,
          opacity: 0.14,
        },
      ],
    },
  },
  {
    id: "geometricAccent",
    label: "geometricAccent",
    spec: {
      type: "pattern",
      patternId: "ribbon",
      foreground: "#fb7185",
      background: "#fff1f2",
      size: 24,
      opacity: 0.14,
    },
  },
  {
    id: "corporateClean",
    label: "corporateClean",
    spec: {
      type: "gradient",
      angle: 160,
      stops: [
        { color: "#f8fafc", pos: 0 },
        { color: "#e2e8f0", pos: 100 },
      ],
    },
  },
];

export const BackgroundTemplateMap = Object.fromEntries(
  PAGE_BACKGROUND_TEMPLATES.map((template) => [template.id, template])
) as Record<string, PageBackgroundTemplate>;

export const getPageBackgroundTemplateById = (id: string) =>
  PAGE_BACKGROUND_TEMPLATES.find((template) => template.id === id) ??
  (id === "corporate-clean"
    ? PAGE_BACKGROUND_TEMPLATES.find((template) => template.id === "corporateClean")
    : undefined);
