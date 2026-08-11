import { expect, test } from "../fixtures/mock-test";
import {
    fulfillJson,
    mockCommonPageDependencies,
    mockIdleWebSocket,
    requestBody,
} from "../support/api-mocks";
import { responseDto, toProfile } from "../support/mock-data";
import { TEST_USERS } from "../support/test-users";

test.describe("Profile", () => {
    test.beforeEach(async ({ page }) => {
        await mockCommonPageDependencies(page);
        await mockIdleWebSocket(page);
    });

    test("SOCIAL-01 내 프로필을 조회해 표시한다", async ({ page }) => {
        await page.route("**/users/me/profile", (route) =>
            fulfillJson(route, responseDto(toProfile(TEST_USERS.A))),
        );

        await page.goto("/settings/profile");

        await expect(page.locator("#publicId")).toHaveValue(
            TEST_USERS.A.publicId,
        );
        await expect(page.locator("#nickname")).toHaveValue(
            TEST_USERS.A.nickname,
        );
        await expect(page.locator("#bio")).toHaveValue(
            `${TEST_USERS.A.nickname} bio`,
        );
    });

    test("SOCIAL-02 프로필 수정 요청과 성공 상태를 확인한다", async ({ page }) => {
        const initial = toProfile(TEST_USERS.A);
        const updated = {
            ...initial,
            nickname: "E2E Updated",
            bio: "updated bio",
        };
        let patchBody: unknown = null;

        await page.route("**/users/me/profile", async (route) => {
            if (route.request().method() === "PATCH") {
                patchBody = requestBody(route);
                return fulfillJson(route, responseDto(updated));
            }
            return fulfillJson(route, responseDto(initial));
        });

        await page.goto("/settings/profile");
        await page.locator("#nickname").fill("E2E Updated");
        await page.locator("#bio").fill("updated bio");
        await page.getByRole("button", { name: "저장", exact: true }).click();

        await expect(page.locator("#nickname")).toHaveValue("E2E Updated");
        await expect(page.getByText("프로필을 저장했습니다.")).toBeVisible();
        expect(patchBody).toMatchObject({
            nickname: "E2E Updated",
            bio: "updated bio",
        });
    });

    test("SOCIAL-03 빈 닉네임은 클라이언트 검증으로 차단한다", async ({ page }) => {
        let patchCount = 0;
        await page.route("**/users/me/profile", async (route) => {
            if (route.request().method() === "PATCH") patchCount += 1;
            return fulfillJson(route, responseDto(toProfile(TEST_USERS.A)));
        });

        await page.goto("/settings/profile");
        await page.locator("#nickname").fill("   ");
        await page.getByRole("button", { name: "저장", exact: true }).click();

        await expect(page.getByText("닉네임을 입력해 주세요.")).toBeVisible();
        expect(patchCount).toBe(0);
    });

    test("SOCIAL-04 프로필 조회 실패 후 다시 불러온다", async ({ page }) => {
        let count = 0;
        await page.route("**/users/me/profile", async (route) => {
            count += 1;
            if (count === 1) {
                return fulfillJson(route, { message: "failed" }, 500);
            }
            return fulfillJson(route, responseDto(toProfile(TEST_USERS.A)));
        });

        await page.goto("/settings/profile");
        const reload = page.getByRole("button", { name: "다시 불러오기" });
        await expect(reload).toBeVisible();
        await reload.click();
        await expect(page.locator("#publicId")).toHaveValue(
            TEST_USERS.A.publicId,
        );
    });
});
