import { expect, test } from "@playwright/test";
import { createProjectFromTemplate } from "../src/store/editorStore";
import { getLayoutSections } from "../src/lib/editorProject";

test("Layout export uses canonical renderer pipeline", async ({ request }) => {
  const project = createProjectFromTemplate("coupon", "Export Regression");

  project.settings = {
    ...project.settings,
    backgrounds: {
      ...(project.settings.backgrounds ?? {}),
      page: {
        type: "gradient",
        angle: 145,
        stops: [
          { color: "#fff7ed", pos: 0 },
          { color: "#ffedd5", pos: 100 },
        ],
      },
    },
  };

  const sections = getLayoutSections(project).map((section) => {
    if (section.type === "campaignOverview") {
      return {
        ...section,
        data: {
          ...section.data,
          title: "キャンペーン概要",
          decoration: {
            headerBackgroundColor: "#0099cc",
            titleTextColor: "#ffffff",
            accentColor: "#0099cc",
            borderColor: "#d1d5db",
            headerStyle: "band",
            showHeaderBand: true,
          },
          extra: {
            buttons: [
              {
                id: "btn_regression",
                label: "回帰CTA",
                href: "#cta",
                variant: "primary",
              },
            ],
            images: [
              {
                id: "img_regression",
                imageUrl: "https://example.com/reg-image.png",
                alt: "regression image",
                caption: "regression caption",
                width: 100,
                align: "center",
              },
            ],
          },
        },
        content: {
          ...(section.content ?? {}),
          items: [
            {
              id: "item_export_regression_body",
              type: "text",
              lines: [
                {
                  id: "line_export_regression_body",
                  text: "回帰テスト本文",
                  marks: { bold: true, textAlign: "center" as const },
                },
              ],
            },
          ],
        },
      };
    }
    return section;
  });

  const requestProject = {
    ...project,
    sections,
    editorDocuments: project.editorDocuments
      ? {
          ...project.editorDocuments,
          layoutDocument: project.editorDocuments.layoutDocument
            ? {
                ...project.editorDocuments.layoutDocument,
                sections,
                settings: project.settings,
              }
            : project.editorDocuments.layoutDocument,
        }
      : project.editorDocuments,
  };

  const response = await request.post("/api/export-html", {
    data: {
      project: requestProject,
      ui: { previewMode: "desktop" },
    },
  });

  expect(response.ok()).toBeTruthy();
  const json = (await response.json()) as { html?: string; error?: string };
  expect(json.error).toBeFalsy();
  expect(json.html).toBeTruthy();

  const output = json.html ?? "";

  // Canonical export path: api/export-html -> renderProjectToHtml(exportZip.ts) -> renderLayoutSection.
  expect(output).toContain("lp-periodbar");
  expect(output).toContain("キャンペーン概要");
  expect(output).toContain("回帰テスト本文");
  expect(output).toContain("#0099cc");
  expect(output).toContain("回帰CTA");
  expect(output).toContain("https://example.com/reg-image.png");
  expect(output).toContain("lp-optional-blocks");
  expect(output).toContain("background:");
  expect(output).toContain("data-target-stores=\"true\"");
  expect(output).toContain("data-store-prefecture");
  expect(output).toContain("data-store-prev");
  expect(output).toContain("data-store-next");
  expect(output).toContain("data-store-page");

  // Preview/editor-only controls must never leak into export HTML.
  expect(output).not.toContain("lp-preview-section-actions");
  expect(output).not.toContain("data-preview-section-actions");
  expect(output).not.toContain("lp-preview-insert-slot");
  expect(output).not.toContain("data-preview-insert-slot");
  expect(output).not.toContain('data-section-action="duplicate"');
  expect(output).not.toContain('data-section-action="delete"');
  expect(output).not.toContain("data-add-after-id");
  expect(output).not.toContain("data-add-type");
  expect(output).not.toContain("AI提案");
  expect(output).not.toContain("data-preview-selected");
  expect(output).not.toContain("data-preview-hovered");
});
