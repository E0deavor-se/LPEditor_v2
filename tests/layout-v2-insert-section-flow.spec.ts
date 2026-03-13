import { test, expect, type Page, type FrameLocator } from "@playwright/test";

test.use({ viewport: { width: 1600, height: 900 } });

const dismissTemplateOverlay = async (page: Page) => {
  for (let i = 0; i < 3; i += 1) {
    const overlay = page.locator("div.ui-modal-overlay").first();
    if (!(await overlay.isVisible().catch(() => false))) {
      return;
    }

    const openTemplateButton = overlay
      .getByRole("button", { name: "このテンプレートで開く" })
      .first();
    const backToEditorButton = overlay
      .getByRole("button", { name: "編集画面に戻る" })
      .first();

    if (await openTemplateButton.isVisible().catch(() => false)) {
      await openTemplateButton.click();
    } else if (await backToEditorButton.isVisible().catch(() => false)) {
      await backToEditorButton.click();
    }

    await expect(overlay).toBeHidden({ timeout: 15_000 });
  }
};

const getPreviewFrame = async (page: Page): Promise<FrameLocator> => {
  const iframe = page.locator('iframe[data-testid="preview-iframe"]').first();
  await expect(iframe).toBeVisible({ timeout: 30_000 });
  const frame = page.frameLocator('iframe[data-testid="preview-iframe"]');
  await expect(frame.locator('[data-testid="preview-root"]')).toBeVisible({
    timeout: 30_000,
  });
  return frame;
};

test("Layout v2 between-section insert keeps selection and inspector sync", async ({
  page,
}) => {
  await page.goto("/editor");
  await dismissTemplateOverlay(page);
  await dismissTemplateOverlay(page);

  await expect(page.getByText("Layout Loading…")).toBeHidden({ timeout: 30_000 });

  const frame = await getPreviewFrame(page);

  const sections = frame.locator("[data-section-id]");
  await expect
    .poll(async () => sections.count(), { timeout: 30_000 })
    .toBeGreaterThan(1);
  const initialCount = await sections.count();

  const anchorSection = sections.first();
  const anchorSectionId = await anchorSection.getAttribute("data-section-id");
  expect(anchorSectionId).toBeTruthy();

  // Insert controls are shown when the preceding section is hovered.
  await anchorSection.dispatchEvent("mousemove");

  const quickAddType = "imageOnly";
  const quickAddButton = frame
    .locator(
      `[data-add-after-id="${anchorSectionId}"][data-add-type="${quickAddType}"]`
    )
    .first();

  await expect(quickAddButton).toBeVisible({ timeout: 10_000 });
  await quickAddButton.evaluate((element) => {
    (element as HTMLButtonElement).click();
  });

  await expect
    .poll(async () => frame.locator("[data-section-id]").count(), {
      timeout: 20_000,
    })
    .toBe(initialCount + 1);

  const selectedSections = frame.locator('[data-preview-selected="true"]');
  await expect(selectedSections).toHaveCount(1, { timeout: 20_000 });

  const selectedSectionId = await selectedSections.first().getAttribute("data-section-id");
  expect(selectedSectionId).toBeTruthy();
  expect(selectedSectionId).not.toBe(anchorSectionId);

  // Section selection keeps inspector in section mode (not page mode).
  await expect(page.locator('button[title="複製"]').first()).toBeVisible({ timeout: 10_000 });
  await expect(page.getByText("背景テンプレート")).toHaveCount(0);

  // Inserted quick-add type should drive inspector content.
  await expect(page.getByText("画像のみセクション")).toBeVisible({ timeout: 10_000 });

  // Stability: preview remains rendered and selection sync remains active.
  await expect(frame.locator('[data-testid="preview-root"]')).toBeVisible();
  await expect(frame.locator("[data-section-id]").first()).toBeVisible();
});
