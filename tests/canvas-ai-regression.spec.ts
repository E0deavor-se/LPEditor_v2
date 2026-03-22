import { expect, test, type Page } from "@playwright/test";

const setupAiApiMocks = async (page: Page) => {
  let seq = 0;

  await page.route("**/api/ai-assets/generate", async (route) => {
    seq += 1;
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ jobId: `job_${seq}` }),
    });
  });

  await page.route("**/api/ai-assets/jobs/**", async (route) => {
    const url = route.request().url();
    const jobId = url.split("/").pop()?.split("?")[0] ?? "job_unknown";
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        id: jobId,
        status: "succeeded",
        generatedAsset: {
          imageUrl: `https://example.com/${jobId}.png`,
        },
      }),
    });
  });
};

const dismissTemplateOverlayIfNeeded = async (page: Page) => {
  const backToEditorButton = page.getByRole("button", { name: "編集画面に戻る" });
  const openTemplateButton = page.getByRole("button", { name: "このテンプレートで開く" });

  for (let i = 0; i < 12; i += 1) {
    if (await backToEditorButton.first().isVisible().catch(() => false)) {
      await backToEditorButton.first().click();
      await page.waitForTimeout(250);
      continue;
    }
    if (await openTemplateButton.first().isVisible().catch(() => false)) {
      await openTemplateButton.first().click();
      await page.waitForTimeout(250);
      continue;
    }
    await page.waitForTimeout(250);
  }

  await expect(backToEditorButton.first()).toBeHidden({ timeout: 15_000 }).catch(() => undefined);
  await expect(openTemplateButton.first()).toBeHidden({ timeout: 15_000 }).catch(() => undefined);
};

const openCanvasAndPrepare = async (page: Page) => {
  await setupAiApiMocks(page);
  await page.goto("/editor?mode=canvas&e2e=1");
  await dismissTemplateOverlayIfNeeded(page);
  const canvasModeButton = page.getByRole("button", { name: "Canvas" });
  await expect(canvasModeButton).toBeVisible();
  for (let i = 0; i < 4; i += 1) {
    if (await page.getByTestId("canvas-ai-menu-toggle").isVisible().catch(() => false)) {
      return;
    }
    await canvasModeButton.first().evaluate((element) => {
      (element as HTMLButtonElement).click();
    });
    await page.waitForTimeout(500);
  }
  await expect(page.getByTestId("canvas-ai-menu-toggle")).toBeVisible({ timeout: 20_000 });
};

const clickByTestId = async (page: Page, testId: string) => {
  const target = page.getByTestId(testId);
  await expect(target).toBeVisible();
  await target.evaluate((element) => {
    (element as HTMLButtonElement).click();
  });
};

const clickAiActionAndWaitForGenerate = async (page: Page, testId: string) => {
  await Promise.all([
    page.waitForRequest((request) => request.url().includes("/api/ai-assets/generate"), {
      timeout: 10_000,
    }),
    clickByTestId(page, testId),
  ]);
};

const selectAnyAiLayerFromPanel = async (page: Page) => {
  const aiLayerRow = page.getByTestId("canvas-ai-layer-row").first();
  const aiImage = page.locator('img[alt^="[AI]"], img[alt^="AI生成:"]').first();

  await expect
    .poll(
      async () => {
        const rowVisible = await aiLayerRow.isVisible().catch(() => false);
        const imageVisible = await aiImage.isVisible().catch(() => false);
        return rowVisible || imageVisible;
      },
      { timeout: 20_000 },
    )
    .toBeTruthy();

  if (await aiLayerRow.isVisible().catch(() => false)) {
    await aiLayerRow.click();
    return;
  }

  await aiImage.click();
};

const clickToolbarButton = async (page: Page, name: string) => {
  const button = page.getByRole("button", { name }).first();
  await expect(button).toBeVisible();
  await button.click();
};

test("Canvas AI section design is applied and undo/redo grouped", async ({ page }) => {
  await openCanvasAndPrepare(page);
  await dismissTemplateOverlayIfNeeded(page);

  await clickByTestId(page, "canvas-ai-menu-toggle");
  await clickAiActionAndWaitForGenerate(page, "canvas-ai-design-all");
  await selectAnyAiLayerFromPanel(page);

  const setSelectAllButton = page.getByTestId("canvas-ai-set-select-all");
  await expect(setSelectAllButton).toBeVisible({ timeout: 20_000 });

  await clickToolbarButton(page, "元に戻す");
  await expect(setSelectAllButton).toBeHidden({ timeout: 10_000 });

  await clickToolbarButton(page, "やり直し");
  await selectAnyAiLayerFromPanel(page);
  await expect(setSelectAllButton).toBeVisible({ timeout: 10_000 });
});

test("Canvas AI set selection and batch delete works", async ({ page }) => {
  await openCanvasAndPrepare(page);
  await dismissTemplateOverlayIfNeeded(page);

  await clickByTestId(page, "canvas-ai-menu-toggle");
  await clickAiActionAndWaitForGenerate(page, "canvas-ai-design-all");
  await selectAnyAiLayerFromPanel(page);

  const setSelectAllButton = page.getByTestId("canvas-ai-set-select-all");
  await expect(setSelectAllButton).toBeVisible({ timeout: 20_000 });
  await clickByTestId(page, "canvas-ai-set-select-all");
  await expect(page.getByText("同セットを選択中")).toBeVisible();

  page.on("dialog", (dialog) => dialog.accept());
  await clickByTestId(page, "canvas-ai-set-remove");

  await expect(setSelectAllButton).toBeHidden({ timeout: 10_000 });
});

test("Canvas AI regenerate adds same-type alternative and compare labels", async ({ page }) => {
  await openCanvasAndPrepare(page);
  await dismissTemplateOverlayIfNeeded(page);

  await clickByTestId(page, "canvas-ai-menu-toggle");
  await clickAiActionAndWaitForGenerate(page, "canvas-ai-design-all");
  await selectAnyAiLayerFromPanel(page);

  await expect(page.getByTestId("canvas-ai-set-select-all")).toBeVisible({ timeout: 20_000 });
  await expect(page.getByTestId("canvas-ai-set-regenerate")).toBeVisible();
  await clickByTestId(page, "canvas-ai-set-regenerate");

  await expect(page.getByTestId("canvas-ai-set-select-all")).toBeVisible({ timeout: 20_000 });
  await expect(page.getByTestId("canvas-ai-set-regenerate")).toBeVisible({ timeout: 20_000 });
  await expect(page.getByText(/同セット:\s*\d+枚/)).toBeVisible({ timeout: 20_000 });
  await expect(page.getByText(/同種別の別案:\s*\d+件/)).toBeVisible({ timeout: 20_000 });
});
