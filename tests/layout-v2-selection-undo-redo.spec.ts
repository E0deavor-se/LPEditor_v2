import { test, expect, type Page } from "@playwright/test";

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

test("Layout v2 selection and undo/redo after duplicate", async ({ page }) => {
  await page.goto("/editor");
  await dismissTemplateOverlay(page);
  await dismissTemplateOverlay(page);

  await expect(page.getByText("Layout Loading…")).toBeHidden({ timeout: 30_000 });

  const duplicateButtons = page.locator('button[title="複製"]');
  await expect
    .poll(async () => duplicateButtons.count(), { timeout: 30_000 })
    .toBeGreaterThan(0);
  const initialCount = await duplicateButtons.count();
  expect(initialCount).toBeGreaterThan(0);

  const duplicateButton = duplicateButtons.first();
  await duplicateButton.evaluate((element) => {
    (element as HTMLButtonElement).click();
  });

  const afterDuplicate = await page.locator('button[title="複製"]').count();
  expect(afterDuplicate).toBeGreaterThan(initialCount);

  const undoButton = page.getByRole("button", { name: "元に戻す" }).first();
  await expect(undoButton).toBeEnabled({ timeout: 10_000 });
  await undoButton.evaluate((element) => {
    (element as HTMLButtonElement).click();
  });

  await expect
    .poll(async () => page.locator('button[title="複製"]').count())
    .toBeLessThan(afterDuplicate);

  const redoButton = page.getByRole("button", { name: "やり直し" }).first();
  await expect(redoButton).toBeEnabled({ timeout: 10_000 });
  await redoButton.evaluate((element) => {
    (element as HTMLButtonElement).click();
  });

  await expect
    .poll(async () => page.locator('button[title="複製"]').count())
    .toBe(afterDuplicate);
});
