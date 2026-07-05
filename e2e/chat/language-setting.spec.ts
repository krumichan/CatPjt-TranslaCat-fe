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
    const heading = page.getByRole("heading", {
        name: "언어 설정",
        exact: true,
    });

    return heading.locator(
        "xpath=ancestor::div[contains(concat(' ', normalize-space(@class), ' '), ' fixed ') and contains(concat(' ', normalize-space(@class), ' '), ' inset-0 ')][1]",
    );
}

test.describe("Chat language settings", () => {
    test.beforeEach(async ({ page }) => {
        await mockCommonPageDependencies(page);
        await mockIdleWebSocket(page);
    });

    test("LANG-01~02 설정 조회 후 모달을 열고 닫는다", async ({ page }) => {
        await mockChatRoomBase(page);
        await page.goto("/chat/rooms/501");
        await page.getByRole("button", { name: "언어", exact: true }).click();

        const modal = languageSettingsModal(page);
        await expect(
            modal.getByRole("heading", { name: "언어 설정", exact: true }),
        ).toBeVisible();
        await modal.getByRole("button", { name: "닫기", exact: true }).click();
        await expect(modal).toBeHidden();
    });

    test("LANG-03 언어 설정 저장 요청 body를 확인한다", async ({ page }) => {
        const initial = makeLanguageSettings();

        await mockChatRoomBase(page, { languageSettings: initial });
        await page.route(
            "**/chat/rooms/501/members/me/language",
            async (route) => {
                if (route.request().method() === "PATCH") {
                    return fulfillJson(
                        route,
                        responseDto({
                            ...initial,
                            translationLanguageCode: "en",
                        }),
                    );
                }
                return fulfillJson(route, responseDto(initial));
            },
        );

        await page.goto("/chat/rooms/501");
        await page.getByRole("button", { name: "언어", exact: true }).click();

        const modal = languageSettingsModal(page);
        const selects = modal.locator("select");
        await expect(selects).toHaveCount(2);
        await selects.nth(1).selectOption("en");

        const requestPromise = page.waitForRequest((request) => {
            const pathname = new URL(request.url()).pathname;
            return (
                request.method() === "PATCH" &&
                pathname.endsWith(
                    "/chat/rooms/501/members/me/language",
                )
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
        await page.route(
            "**/chat/rooms/501/members/me/language",
            async (route) => {
                if (route.request().method() === "PATCH") {
                    return fulfillJson(route, { message: "failed" }, 500);
                }
                return fulfillJson(route, responseDto(initial));
            },
        );

        await page.goto("/chat/rooms/501");
        await page.getByRole("button", { name: "언어", exact: true }).click();

        const modal = languageSettingsModal(page);
        await modal
            .getByRole("button", { name: "저장", exact: true })
            .click();
        await expect(
            modal.getByText("언어 설정 저장에 실패했습니다.", {
                exact: true,
            }),
        ).toBeVisible();
    });
});
