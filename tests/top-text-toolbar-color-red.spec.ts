import { test, expect, type Page } from "@playwright/test";

test.use({ viewport: { width: 1600, height: 900 } });

const dismissTemplateOverlay = async (page: Page) => {
  const overlay = page.locator("div.ui-modal-overlay").first();
  if (!(await overlay.isVisible().catch(() => false))) {
    return;
  }

  const openTemplateButton = overlay.getByRole("button", { name: "このテンプレートで開く" }).first();
  const backToEditorButton = overlay.getByRole("button", { name: "編集画面に戻る" }).first();

  if (await openTemplateButton.isVisible().catch(() => false)) {
    await openTemplateButton.click();
  } else if (await backToEditorButton.isVisible().catch(() => false)) {
    await backToEditorButton.click();
  }

  await expect(overlay).toBeHidden({ timeout: 15_000 });
};

const selectSectionUntilTextareaAppears = async (page: Page, sectionLabel: string) => {
  const rows = page.locator("div[role='button']").filter({ hasText: sectionLabel });
  const count = await rows.count();
  for (let i = 0; i < count; i += 1) {
    const row = rows.nth(i);
    await row.evaluate((element) => {
      (element as HTMLElement).click();
    });

    const textarea = page.locator("textarea").first();
    if (await textarea.isVisible().catch(() => false)) {
      return;
    }
  }

  throw new Error(`Could not activate section editor for: ${sectionLabel}`);
};

test("TopTextToolbar applies red to selected text", async ({ page }) => {
  await page.goto("/editor");
  await dismissTemplateOverlay(page);
  await expect(page.locator('[data-debug-red-color="true"]')).toBeVisible({ timeout: 20_000 });
  await dismissTemplateOverlay(page);

  await selectSectionUntilTextareaAppears(page, "キャンペーン概要");

  const textarea = page.locator("textarea").first();
  await expect(textarea).toBeVisible({ timeout: 15_000 });

  await textarea.click();
  await textarea.fill("abcdef");
  await textarea.evaluate((element) => {
    const target = element as HTMLTextAreaElement;
    target.focus();
    target.setSelectionRange(1, 4);
    target.dispatchEvent(new KeyboardEvent("keyup", { key: "ArrowRight", bubbles: true }));
  });

  const redButton = page.locator('[data-debug-red-color="true"]');
  await expect(redButton).toBeEnabled({ timeout: 10_000 });
  await redButton.evaluate((element) => {
    (element as HTMLButtonElement).click();
  });

  await expect(textarea).toHaveValue(/<span style=\"color:#ef4444;\">bcd<\/span>/);
});
