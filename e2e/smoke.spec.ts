import { expect, test } from "@playwright/test";

test.describe("TranslaCat smoke", () => {
    test("root route renders without server error", async ({ page }) => {
        const response = await page.goto("/", {
            waitUntil: "domcontentloaded",
        });

        expect(response?.status(), "root route should not return an error status").toBeLessThan(400);
        await expect(page.locator("body")).toBeVisible();

        const bodyText = await page.locator("body").innerText();
        expect(bodyText.trim().length, "root route should render visible content").toBeGreaterThan(0);
    });

    for (const locale of ["ko", "ja"]) {
        test(`${locale} locale route renders`, async ({ page }) => {
            const response = await page.goto(`/${locale}`, {
                waitUntil: "domcontentloaded",
            });

            expect(response?.status(), `${locale} route should not return an error status`).toBeLessThan(400);
            await expect(page.locator("body")).toBeVisible();

            const bodyText = await page.locator("body").innerText();
            expect(bodyText.trim().length, `${locale} route should render visible content`).toBeGreaterThan(0);
        });
    }
});
