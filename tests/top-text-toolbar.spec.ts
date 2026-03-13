import { test, expect } from "@playwright/test";

test("TopTextToolbar bold button click reaches onClick", async ({ page }) => {
  await page.goto("/editor");

  // If template chooser overlay is shown, close it to unblock toolbar clicks.
  const blockingOverlay = page.locator("div.ui-modal-overlay").first();
  if (await blockingOverlay.isVisible().catch(() => false)) {
    const openTemplateButton = blockingOverlay
      .getByRole("button", { name: "このテンプレートで開く" })
      .first();
    const backToEditorButton = blockingOverlay.getByRole("button", {
      name: "編集画面に戻る",
    });

    if (await openTemplateButton.isVisible().catch(() => false)) {
      await openTemplateButton.click();
    } else if (await backToEditorButton.isVisible().catch(() => false)) {
      await backToEditorButton.click();
    }

    await expect(blockingOverlay).toBeHidden({ timeout: 15_000 });
  }

  const boldButton = page.locator('[data-debug-bold-button="true"]');
  await expect(boldButton).toBeVisible();
  await expect(boldButton).toHaveAttribute("aria-pressed", "false");

  await boldButton.evaluate((element) => {
    (element as HTMLButtonElement).click();
  });

  // Clicking bold should toggle local toolbar state as a minimal event-path proof.
  await expect(boldButton).toHaveAttribute("aria-pressed", "true");
});
