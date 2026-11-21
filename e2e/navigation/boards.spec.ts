import type { Page } from "@playwright/test";

import type { BoardEntry } from "../../src/types/board";
import { expect, installMockAuthCookie, test } from "../fixtures/mock-test";
import {
    fulfillJson,
    mockCommonPageDependencies,
    mockIdleWebSocket,
} from "../support/api-mocks";
import { responseDto } from "../support/mock-data";
import { TEST_USERS } from "../support/test-users";

const POST: BoardEntry = {
    id: "bbbbbbbb-0000-4000-8000-000000000001",
    locked: false,
    secret: false,
    mine: false,
    author: "TranslaCat",
    createdAt: "2026-11-18T12:00:00Z",
    updatedAt: "2026-11-18T12:00:00Z",
    title: "Android test build and installation notes",
    content: null,
    translatedTitle: "안드로이드 테스트 빌드와 설치 안내",
    translatedContent: null,
    translating: false,
    attachments: [],
};
const LOCKED_POST: BoardEntry = {
    ...POST,
    id: "bbbbbbbb-0000-4000-8000-000000000002",
    locked: true,
    secret: true,
    author: null,
    title: null,
    translatedTitle: null,
};
const LONG_TITLE = "TranslaCatMobileCompatibilityTestBuild".repeat(5);

// 게시판 목록의 페이지와 권한 경계를 앱과 같은 응답 형식으로 재현한다.
async function mockBoardLists(page: Page) {
    await page.route(/\/boards\/(MEMBER|ANONYMOUS|ADMIN)\/posts\?/, (route) => {
        const url = new URL(route.request().url());
        if (url.pathname.includes("/ANONYMOUS/")) {
            return fulfillJson(route, responseDto({ items: [{ ...POST, author: null }], hasMore: false }));
        }

        if (url.pathname.includes("/ADMIN/")) {
            return fulfillJson(route, responseDto({
                items: [{ ...POST, title: LONG_TITLE, translatedTitle: null }, LOCKED_POST],
                hasMore: false,
            }));
        }

        if (url.searchParams.get("page") === "1") {
            return fulfillJson(route, responseDto({ items: [LOCKED_POST], hasMore: false }));
        }

        return fulfillJson(route, responseDto({ items: [POST, LOCKED_POST], hasMore: true }));
    });
    await page.route(/\/boards\/MEMBER\/posts\/[^/?]+\/replies\?/, (route) =>
        fulfillJson(route, responseDto({ items: [], hasMore: false })),
    );
    await page.route(/\/boards\/MEMBER\/posts\/[^/?]+\?/, (route) =>
        fulfillJson(route, responseDto({ ...POST, content: "Build installation notes." })),
    );
}

test("홈 게시판 카드에서 글 목록, 번역과 상세 화면으로 이동한다", async ({ page }) => {
    // 준비: 일반 회원의 홈에서 여러 페이지에 걸친 게시글을 연다.
    await mockCommonPageDependencies(page);
    await mockIdleWebSocket(page);
    await mockBoardLists(page);
    await page.goto("/ko");

    // 실행: 홈 카드로 이동한 뒤 원문, 다음 페이지, 이전 페이지를 차례로 연다.
    await page.getByTestId("service-card-boards").click();
    const list = page.getByRole("region", { name: "일반 회원" });
    const tabs = page.locator("header").getByRole("navigation", { name: "게시판" });
    await expect(tabs.getByRole("link", { name: "일반 회원" })).toHaveAttribute("aria-current", "page");
    await expect(tabs.getByRole("link", { name: "관리자 전용" })).toHaveCount(0);
    await expect(list.getByRole("link", { name: /안드로이드 테스트 빌드/ })).toBeVisible();
    await page.screenshot({ path: test.info().outputPath("boards-desktop.png") });

    await list.getByRole("button", { name: "원문 보기" }).click();
    await expect(list.getByRole("link", { name: /Android test build/ })).toBeVisible();
    await list.getByRole("button", { name: "다음" }).click();
    await expect(list.getByText("2페이지")).toBeVisible();
    await expect(list.getByRole("button", { name: "다음" })).toBeDisabled();
    await list.getByRole("button", { name: "이전" }).click();

    // 검증: 목록에서 상세로 들어갔다가 같은 게시판으로 돌아온다.
    await list.getByRole("link", { name: /Android test build/ }).click();
    await expect(page).toHaveURL(new RegExp(`[?&]post=${POST.id}$`));
    await page.getByRole("link", { name: "목록으로" }).click();
    await expect(page).toHaveURL(/[?&]board=MEMBER$/);
});

test("모바일에서도 관리자 글 목록을 읽고 익명 게시판으로 전환한다", async ({ page, context }) => {
    // 준비: 좁은 화면에 관리자 전용 글과 제목 없는 비밀글을 배치한다.
    await page.setViewportSize({ width: 360, height: 800 });
    await installMockAuthCookie(context, "ADMIN");
    await mockCommonPageDependencies(page, TEST_USERS.A, "ADMIN");
    await mockIdleWebSocket(page);
    await mockBoardLists(page);
    await page.addInitScript(() => {
        localStorage.setItem("theme", "dark");
    });

    // 실행: 관리자 탭을 링크로 열고 글 목록 레이아웃을 읽는다.
    await page.goto("/ko/boards?board=ADMIN");
    const admin = page.getByRole("region", { name: "관리자 전용" });
    const longRow = admin.getByRole("link", { name: new RegExp(LONG_TITLE) });
    await expect(longRow).toBeVisible();
    await expect(admin.getByRole("link", { name: /비밀 게시글/ })).not.toContainText("TranslaCat");
    await expect(admin.getByRole("button", { name: "다음" })).toHaveCount(0);

    // 검증: 긴 제목이 화면을 넘지 않고 익명 게시판에서 이름을 표시하지 않는다.
    const overflow = await longRow.evaluate((row) => row.scrollWidth > row.clientWidth);
    expect(overflow).toBe(false);
    await page.screenshot({ path: test.info().outputPath("boards-mobile.png") });
    await page.locator("header").getByRole("link", { name: "익명 게시판", exact: true }).click();
    await expect(page).toHaveURL(/[?&]board=ANONYMOUS$/);
    const anonymous = page.getByRole("region", { name: "익명 게시판" });
    await expect(anonymous.getByText("익명", { exact: true })).toBeVisible();
});
