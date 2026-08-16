import type { BrowserContext, Page } from "@playwright/test";

import {
    expect,
    installMockAuthCookie,
    test,
} from "../fixtures/mock-test";
import {
    fulfillJson,
    mockCommonPageDependencies,
} from "../support/api-mocks";
import { responseDto } from "../support/mock-data";
import { TEST_USERS } from "../support/test-users";

type UserRole = "USER" | "ADMIN";

async function mockRole(
    page: Page,
    context: BrowserContext,
    role: UserRole,
): Promise<void> {
    await installMockAuthCookie(context, role);
    await mockCommonPageDependencies(
        page,
        TEST_USERS.A,
        role,
    );
}

test.describe("Novel ADMIN-only access", () => {
    test("NOVEL-ADMIN-01 ADMIN은 Novel 진입점·최근 활동·페이지를 그대로 이용한다", async ({
        page,
        context,
    }) => {
        await mockRole(page, context, "ADMIN");

        let recentRequestCount = 0;
        page.on("request", (request) => {
            if (request.url().includes("/recent/top10")) {
                recentRequestCount += 1;
            }
        });

        await page.route("**/recent/top10**", (route) =>
            fulfillJson(
                route,
                responseDto([
                    {
                        id: 901,
                        platformCode: "SYOSYETU",
                        type: "NOVEL",
                        novelId: "n-admin",
                        title: {
                            rawJa: "管理者専用小説",
                            ja: "管理者専用小説",
                            ko: "관리자 전용 소설",
                        },
                        viewedAt: "2026-08-16T10:00:00",
                    },
                ]),
            ),
        );
        await page.route("**/platforms", (route) =>
            fulfillJson(
                route,
                responseDto([
                    {
                        id: 1,
                        code: "SYOSYETU",
                        nameJa: "小説家になろう",
                        nameKo: "소설가가 되자",
                    },
                ]),
            ),
        );

        await page.setViewportSize({ width: 1440, height: 900 });
        await page.goto("/");

        await expect(
            page.getByRole("link", {
                name: "웹소설",
                exact: true,
            }),
        ).toBeVisible();
        await expect(
            page.getByTestId("service-card-novel"),
        ).toBeVisible();
        await expect(
            page.getByText("관리자 전용 소설").first(),
        ).toBeVisible();
        await expect.poll(() => recentRequestCount).toBeGreaterThan(0);

        await page.getByTestId("service-card-novel").click();

        await expect(page).toHaveURL(/\/novel$/);
        await expect(
            page.getByRole("heading", {
                name: "플랫폼 선택",
            }),
        ).toBeVisible();

        await page.goto("/settings");
        await expect(
            page.getByRole("heading", {
                name: "소설 설정",
            }),
        ).toBeVisible();
    });

    test("NOVEL-ADMIN-02 USER에게 Novel 메뉴·카드·설정·최근 활동을 노출하거나 조회하지 않는다", async ({
        page,
        context,
    }) => {
        await mockRole(page, context, "USER");

        let recentRequestCount = 0;
        page.on("request", (request) => {
            if (request.url().includes("/recent/top10")) {
                recentRequestCount += 1;
            }
        });

        await page.setViewportSize({ width: 1440, height: 900 });
        await page.goto("/");

        await page.getByTestId("user-menu-toggle").click();
        await expect(
            page.getByText(TEST_USERS.A.nickname),
        ).toBeVisible();

        await expect(
            page.getByRole("link", {
                name: "웹소설",
                exact: true,
            }),
        ).toHaveCount(0);
        await expect(
            page.getByTestId("service-card-novel"),
        ).toHaveCount(0);
        await expect(
            page.getByText("최근 활동"),
        ).toHaveCount(0);
        expect(recentRequestCount).toBe(0);

        await page.goto("/settings");
        await expect(
            page.getByRole("heading", {
                name: "소설 설정",
            }),
        ).toHaveCount(0);
        expect(recentRequestCount).toBe(0);
    });

    test("NOVEL-ADMIN-03 USER가 Novel 하위 URL을 직접 열면 API 호출 없이 Next.js 404를 반환한다", async ({
        page,
        context,
    }) => {
        await mockRole(page, context, "USER");

        const novelApiRequests: string[] = [];
        page.on("request", (request) => {
            if (!["fetch", "xhr"].includes(request.resourceType())) {
                return;
            }

            const url = request.url();
            if (
                url.includes("/platforms") ||
                url.includes("/novels/") ||
                url.includes("/episodes/") ||
                url.includes("/search/novels")
            ) {
                novelApiRequests.push(url);
            }
        });

        const response = await page.goto(
            "/novel/syosyetu/novels/n1234/episode/1",
        );

        expect(response?.status()).toBe(404);
        await expect(page.locator("body")).toContainText("404");
        expect(novelApiRequests).toEqual([]);
    });
});
