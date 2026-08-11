import { expect, test } from "../fixtures/mock-test";
import {
    fulfillApiJson,
    mockCommonPageDependencies,
    mockIdleWebSocket,
} from "../support/api-mocks";
import { responseDto } from "../support/mock-data";

for (const locale of ["ko", "ja"] as const) {
    test(`BASE i18n ${locale} 주요 Social/Chat 화면이 번역 오류 없이 렌더링된다`, async ({ page }) => {
        await mockCommonPageDependencies(page);
        await mockIdleWebSocket(page);
        await page.route("**/friends", (route) =>
            fulfillApiJson(route, responseDto([])),
        );
        await page.route("**/blocks", (route) =>
            fulfillApiJson(route, responseDto([])),
        );
        await page.route("**/chat/rooms", (route) =>
            fulfillApiJson(route, responseDto({ chatRooms: [] })),
        );

        const errors: string[] = [];
        page.on("console", (message) => {
            if (
                message.type() === "error" &&
                /MISSING_MESSAGE|FORMATTING_ERROR|IntlError/.test(
                    message.text(),
                )
            ) {
                errors.push(message.text());
            }
        });

        const prefix = locale === "ko" ? "" : "/ja";
        await page.goto(`${prefix}/friends`);
        await expect(page.locator("main").last()).toBeVisible();

        await page.goto(`${prefix}/chat`);
        await expect(page.locator("main").last()).toBeVisible();

        expect(errors).toEqual([]);
    });
}
