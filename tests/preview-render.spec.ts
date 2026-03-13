import { expect, test } from "@playwright/test";
import { createProjectFromTemplate } from "../src/store/editorStore";
import { getLayoutSections } from "../src/lib/editorProject";
import { renderLayoutSection } from "../src/lib/renderers/layout/renderLayoutSection";

test("Preview renderer regression (layout section pipeline)", () => {
  const project = createProjectFromTemplate("coupon", "Preview Regression");
  const baseSections = getLayoutSections(project);

  const campaignSection = baseSections.find(
    (section) => section.type === "campaignOverview"
  );
  const heroSection = baseSections.find((section) => section.type === "heroImage");

  expect(campaignSection).toBeTruthy();
  expect(heroSection).toBeTruthy();

  const patchedCampaignSection = {
    ...campaignSection!,
    data: {
      ...campaignSection!.data,
      title: "キャンペーン概要",
      decoration: {
        headerBackgroundColor: "#0088ff",
        titleTextColor: "#ffffff",
        accentColor: "#0088ff",
        borderColor: "#d1d5db",
        headerStyle: "band",
        showHeaderBand: true,
      },
      extra: {
        buttons: [
          {
            id: "btn_preview_regression",
            label: "プレビューCTA",
            href: "#preview-cta",
            variant: "primary",
          },
        ],
        images: [
          {
            id: "img_preview_regression",
            imageUrl: "https://example.com/preview-regression.png",
            alt: "preview regression",
            caption: "preview regression caption",
            width: 100,
            align: "center",
          },
        ],
      },
    },
    content: {
      ...(campaignSection!.content ?? {}),
      items: [
        {
          id: "item_preview_regression_body",
          type: "text" as const,
          lines: [
            {
              id: "line_preview_regression_body",
              text: "プレビュー回帰テスト本文",
              marks: { bold: true, textAlign: "center" as const },
            },
          ],
        },
      ],
    },
  };

  const desktopHtml = renderLayoutSection(
    patchedCampaignSection,
    {},
    "desktop",
    {
      allSections: baseSections,
      stores: null,
      disableMotion: false,
    }
  );

  expect(desktopHtml).toBeTruthy();
  const desktopOutput = desktopHtml ?? "";

  expect(desktopOutput).toContain("キャンペーン概要");
  expect(desktopOutput).toContain("#0088ff");
  expect(desktopOutput).toContain("プレビュー回帰テスト本文");
  expect(desktopOutput).toContain("プレビューCTA");
  expect(desktopOutput).toContain("https://example.com/preview-regression.png");
  expect(desktopOutput).toContain("lp-optional-blocks");

  const desktopHeroHtml = renderLayoutSection(heroSection!, {}, "desktop", {
    allSections: baseSections,
    stores: null,
    disableMotion: false,
  });
  const mobileHeroHtml = renderLayoutSection(heroSection!, {}, "mobile", {
    allSections: baseSections,
    stores: null,
    disableMotion: false,
  });

  expect(desktopHeroHtml).toBeTruthy();
  expect(mobileHeroHtml).toBeTruthy();
  expect(desktopHeroHtml ?? "").toContain("lp-hero");
  expect(mobileHeroHtml ?? "").toContain("lp-hero");
});
