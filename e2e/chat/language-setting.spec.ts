import type { Locator, Page } from "@playwright/test";
import { expect, test } from "../fixtures/mock-test";
import {
    fulfillJson,
    mockCommonPageDependencies,
    mockIdleWebSocket,
} from "../support/api-mocks";
import { mockChatRoomBase } from "../support/chat-mocks";
import { makeLanguageSettings, responseDto } from "../support/mock-data";

function languageSettingsModal(page: Page): Locator {
    return page
        .locator("div.fixed.inset-0")
        .filter({
            has: page.getByRole("button", { name: "저장", exact: true }),
        })
        .first();
}

test.describe("Chat language settings", () => {
    test.beforeEach(async ({ page }) => {
        await mockCommonPageDependencies(page);
        await mockIdleWebSocket(page);
    });

    test("LANG-01~02 설정 조회 후 모달을 열고 닫는다", async ({ page }) => {
        await mockChatRoomBase(page);
        await page.goto("/chat/rooms/501");

        await page.getByTestId("chat-language-settings-button").click();

        const modal = languageSettingsModal(page);
        await expect(modal).toBeVisible();
        await expect(
            modal.getByRole("button", { name: "저장", exact: true }),
        ).toBeVisible();

        await modal.getByRole("button", { name: "닫기", exact: true }).click();
        await expect(modal).toBeHidden();
    });

    test("LANG-03 언어 설정 저장 요청 body를 확인한다", async ({ page }) => {
        const initial = makeLanguageSettings();

        await mockChatRoomBase(page, { languageSettings: initial });
        await page.route("**/chat/rooms/501/language-settings", async (route) => {
            if (route.request().method() === "PATCH") {
                return fulfillJson(
                    route,
                    responseDto({
                        ...initial,
                        translationLanguageCode: "en",
                        source: "ROOM_OVERRIDE",
                    }),
                );
            }

            return fulfillJson(
                route,
                responseDto({
                    ...initial,
                    source: "ROOM_OVERRIDE",
                }),
            );
        });

        await page.goto("/chat/rooms/501");
        await page.getByTestId("chat-language-settings-button").click();

        const modal = languageSettingsModal(page);
        const selects = modal.locator("select");
        await expect(selects).toHaveCount(2);
        await selects.nth(1).selectOption("en");

        const requestPromise = page.waitForRequest((request) => {
            const pathname = new URL(request.url()).pathname;
            return (
                request.method() === "PATCH" &&
                pathname.endsWith("/chat/rooms/501/language-settings")
            );
        });

        await modal
            .getByRole("button", { name: "저장", exact: true })
            .click();

        const request = await requestPromise;
        const body = request.postDataJSON();

        expect(body).toMatchObject({
            originalLanguageCode: "ko",
            translationLanguageCode: "en",
        });
    });

    test("LANG-04 저장 실패 메시지를 표시한다", async ({ page }) => {
        const initial = makeLanguageSettings();

        await mockChatRoomBase(page, { languageSettings: initial });
        await page.route("**/chat/rooms/501/language-settings", async (route) => {
            if (route.request().method() === "PATCH") {
                return fulfillJson(route, { message: "failed" }, 500);
            }

            return fulfillJson(
                route,
                responseDto({
                    ...initial,
                    source: "ROOM_OVERRIDE",
                }),
            );
        });

        await page.goto("/chat/rooms/501");
        await page.getByTestId("chat-language-settings-button").click();

        const modal = languageSettingsModal(page);
        await modal
            .getByRole("button", { name: "저장", exact: true })
            .click();

        await expect(
            modal.getByText("언어 설정 저장에 실패했습니다.", { exact: true }),
        ).toBeVisible();
    });
});
