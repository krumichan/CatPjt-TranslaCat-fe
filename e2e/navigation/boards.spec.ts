import type { Page } from "@playwright/test";

import type { BoardEntry, BoardForum, BoardReaction } from "../../src/types/board";
import { expect, installMockAuthCookie, test } from "../fixtures/mock-test";
import {
    fulfillJson,
    mockCommonPageDependencies,
    mockIdleWebSocket,
} from "../support/api-mocks";
import { responseDto } from "../support/mock-data";
import { TEST_USERS } from "../support/test-users";

const QUESTIONS: BoardForum = { id: "bbbbbbbb-0000-4000-8000-000000000009", type: "MEMBER", name: "질문 게시판" };
const FEEDBACK: BoardForum = { id: "bbbbbbbb-0000-4000-8000-000000000010", type: "MEMBER", name: "의견 게시판" };
const CREATED: BoardForum = { id: "bbbbbbbb-0000-4000-8000-000000000011", type: "ANONYMOUS", name: "익명 상담" };
const TRAVEL: BoardForum = { id: "bbbbbbbb-0000-4000-8000-000000000012", type: "MEMBER", name: "여행" };
const LEGACY_ADMIN: BoardForum = {
    id: "bbbbbbbb-0000-4000-8000-000000000013", type: "ADMIN", name: "기존 운영 기록",
};
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
    viewCount: 4,
    reactions: { likes: 3, dislikes: 0, mine: "NONE" },
};
const LOCKED_POST: BoardEntry = {
    ...POST,
    id: "bbbbbbbb-0000-4000-8000-000000000002",
    locked: true,
    secret: true,
    author: null,
    title: null,
    translatedTitle: null,
    viewCount: null,
    reactions: null,
};
const LONG_TITLE = "TranslaCatMobileCompatibilityTestBuild".repeat(5);
const QUESTION = {
    ...POST,
    id: "bbbbbbbb-0000-4000-8000-000000000003",
    translatedTitle: "질문 게시판의 첫 글",
};
const OPINION = {
    ...POST,
    id: "bbbbbbbb-0000-4000-8000-000000000004",
    translatedTitle: "의견 게시판의 첫 글",
};

// 유형은 같아도 게시판 ID마다 목록이 다르고 관리자 게시판은 역할에 따라 노출된다.
async function mockBoardLists(page: Page, administrator = false) {
    const directory: BoardForum[] = [
        { id: "MEMBER", type: "MEMBER", name: null },
        { id: "ANONYMOUS", type: "ANONYMOUS", name: null },
        QUESTIONS,
        FEEDBACK,
    ];
    if (administrator) {
        directory.push({ id: "ADMIN", type: "ADMIN", name: null }, LEGACY_ADMIN);
    }

    const creations: unknown[] = [];
    await page.route(/\/api\/v1\/boards$/, (route) => {
        if (route.request().method() === "POST") {
            const body = route.request().postDataJSON() as Pick<BoardForum, "name" | "type">;
            creations.push(body);
            const created = body.type === "MEMBER" ? TRAVEL : CREATED;
            directory.push(created);
            return fulfillJson(route, responseDto(created), 201);
        }
        return fulfillJson(route, responseDto(directory));
    });

    await page.route(/\/api\/v1\/boards\/[^/]+\/posts\?/, (route) => {
        const url = new URL(route.request().url());
        const id = url.pathname.split("/").at(-2);
        const popular = url.searchParams.get("sort") === "POPULAR";
        if (id === QUESTIONS.id) {
            return fulfillJson(route, responseDto({ items: popular ? [QUESTION] : [QUESTION, LOCKED_POST], hasMore: false }));
        }
        if (id === FEEDBACK.id) {
            return fulfillJson(route, responseDto({ items: [OPINION], hasMore: false }));
        }
        if (id === CREATED.id || id === TRAVEL.id) {
            return fulfillJson(route, responseDto({ items: [], hasMore: false }));
        }
        if (id === "ANONYMOUS") {
            return fulfillJson(route, responseDto({ items: [{ ...POST, author: null }], hasMore: false }));
        }
        if (id === "ADMIN") {
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
    await page.route(/\/api\/v1\/boards\/[^/]+\/posts\/[^/?]+\/replies\?/, (route) =>
        fulfillJson(route, responseDto({ items: [], hasMore: false })),
    );
    await page.route(/\/api\/v1\/boards\/[^/]+\/posts\/[^/?]+\?/, (route) => {
        const id = new URL(route.request().url()).pathname.split("/").at(-1);
        const item = id === QUESTION.id ? QUESTION : POST;
        return fulfillJson(route, responseDto({ ...item, content: "Build installation notes." }));
    });
    await page.route(/\/api\/v1\/boards\/[^/]+\/posts\/[^/?]+\/views$/, (route) =>
        fulfillJson(route, responseDto(5)),
    );
    return creations;
}

test("홈 게시판 카드에서 글 목록, 번역과 상세 화면으로 이동한다", async ({ page }) => {
    // 준비: 일반 회원의 홈에서 여러 페이지에 걸친 게시글을 연다.
    await mockCommonPageDependencies(page);
    await mockIdleWebSocket(page);
    await mockBoardLists(page);
    await page.goto("/ko");

    // 실행: 홈 카드로 이동한 뒤 원문, 다음 페이지, 이전 페이지를 차례로 연다.
    await page.getByTestId("service-card-boards").click();
    await expect(page).toHaveURL(/\/ko\/boards$/, { timeout: 35_000 });
    const groups = page.getByRole("navigation", { name: "게시판 유형" });
    await expect(groups.getByRole("link", { name: "일반", exact: true })).toHaveAttribute("aria-current", "page");
    await expect(groups.getByRole("link", { name: "관리자", exact: true })).toHaveCount(0);
    await expect(page.getByRole("link", { name: "게시판 관리", exact: true })).toHaveCount(0);
    await expect(page.getByRole("button", { name: "카테고리 추가" })).toHaveCount(0);

    // 기본 게시판을 선택하면 목록과 원문 보기 버튼이 같은 화면에서 열린다.
    await page.getByRole("link", { name: "일반 게시판", exact: true }).click();
    const list = page.getByRole("region", { name: "일반 게시판" });
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
    await expect(page).toHaveURL(/[?&]forum=MEMBER$/);
});

test("같은 회원 유형의 게시판도 최신글과 인기글을 각각 조회한다", async ({ page }) => {
    // 준비: 두 게시판의 글을 분리하고 실제 화면이 보낸 투표와 조회 요청을 기록한다.
    await mockCommonPageDependencies(page);
    await mockIdleWebSocket(page);
    await mockBoardLists(page);
    const reactions: BoardReaction[] = [];
    let views = 0;
    await page.route(/\/posts\/[^/?]+\/views$/, (route) => {
        views++;
        return fulfillJson(route, responseDto(5));
    });
    await page.route(/\/posts\/[^/?]+\/vote$/, (route) => {
        const { reaction } = route.request().postDataJSON() as { reaction: BoardReaction };
        reactions.push(reaction);
        return fulfillJson(route, responseDto({
            likes: reaction === "LIKE" ? 4 : 3,
            dislikes: reaction === "DISLIKE" ? 1 : 0,
            mine: reaction,
        }));
    });
    await page.goto(`/ko/boards?forum=${QUESTIONS.id}`);
    const questions = page.getByRole("region", { name: QUESTIONS.name! });
    const popular = page.getByRole("link", { name: "인기글", exact: true });

    // 실행: 질문의 최신글에서 비밀글을 확인하고 인기글에서 공개 글만 연다.
    await expect(questions.getByRole("link", { name: /비밀 게시글/ })).toBeVisible();
    await expect(questions.getByRole("link", { name: /의견 게시판의 첫 글/ })).toHaveCount(0);
    await popular.click();
    await expect(popular).toHaveAttribute("aria-current", "page");
    const question = questions.getByRole("link", { name: /질문 게시판의 첫 글/ });
    await expect(question).toBeVisible();
    await expect(questions.getByRole("link", { name: /비밀 게시글/ })).toHaveCount(0);
    expect(views).toBe(0);

    // 검증: 한 표를 전환·취소한 후에도 돌아온 목록은 질문 게시판의 인기글이다.
    await question.click();
    await expect(page.getByText("조회 5", { exact: true })).toBeVisible();
    await page.getByRole("button", { name: "좋아요 3" }).click();
    await expect(page.getByRole("button", { name: "좋아요 4" })).toHaveAttribute("aria-pressed", "true");
    await page.getByRole("button", { name: "싫어요 0" }).click();
    await expect(page.getByRole("button", { name: "싫어요 1" })).toHaveAttribute("aria-pressed", "true");
    await page.getByRole("button", { name: "싫어요 1" }).click();
    await expect(page.getByRole("button", { name: "싫어요 0" })).toHaveAttribute("aria-pressed", "false");
    expect(reactions).toEqual(["LIKE", "DISLIKE", "NONE"]);
    expect(views).toBe(1);
    await page.getByRole("link", { name: "목록으로" }).click();
    await expect(page).toHaveURL(new RegExp(`forum=${QUESTIONS.id}&sort=POPULAR$`));

    // 의견 게시판에서는 선택 상태를 새 목록으로 초기화하고 해당 게시판의 인기글만 보여준다.
    await questions.getByRole("link", { name: "뒤로가기" }).click();
    await expect(page.getByRole("navigation", { name: "게시판 유형" })).toBeVisible();
    await page.getByRole("link", { name: "의견 게시판", exact: true }).click();
    await expect(page).toHaveURL(new RegExp(`forum=${FEEDBACK.id}$`));
    await popular.click();
    await expect(popular).toHaveAttribute("aria-current", "page");
    const feedback = page.getByRole("region", { name: FEEDBACK.name! });
    await expect(feedback.getByRole("link", { name: /의견 게시판의 첫 글/ })).toBeVisible();
    await expect(feedback.getByRole("link", { name: /질문 게시판의 첫 글/ })).toHaveCount(0);
});

test("이전 주소에서 전환된 게시판의 글을 연다", async ({ page }) => {
    // 준비: 기존 일반 회원 URL을 질문 게시판으로 전환된 글에 연결한다.
    await mockCommonPageDependencies(page);
    await mockIdleWebSocket(page);
    await mockBoardLists(page);
    await page.route(/\/api\/v1\/boards\/MEMBER\/posts\/[^/]+\/location$/, (route) =>
        fulfillJson(route, responseDto({ id: QUESTIONS.id })),
    );

    // 실행
    await page.goto(`/ko/boards?board=MEMBER&post=${QUESTION.id}`);

    // 검증: 해당 게시판에서 본문을 읽고 돌아가는 링크도 게시판 ID를 사용한다.
    const questions = page.getByRole("region", { name: QUESTIONS.name! });
    await expect(questions.getByRole("heading", { name: QUESTION.translatedTitle })).toBeVisible();
    await expect(questions.getByRole("link", { name: "목록으로" }))
        .toHaveAttribute("href", `/ko/boards?forum=${QUESTIONS.id}`);
});

test("관리자 설정에서 일반과 익명에 각각 카테고리를 추가한다", async ({ page, context }) => {
    // 준비: 게시판 상단의 관리자 설정 바로가기를 열어 두 유형의 추가 요청을 기록한다.
    await installMockAuthCookie(context, "ADMIN");
    await mockCommonPageDependencies(page, TEST_USERS.A, "ADMIN");
    await mockIdleWebSocket(page);
    const creations = await mockBoardLists(page, true);
    await page.goto("/ko/boards");
    await expect(page.getByRole("link", { name: "관리자", exact: true })).toBeVisible();
    await page.getByRole("link", { name: "게시판 관리", exact: true }).click();
    await expect(page).toHaveURL(/\/ko\/settings\/admin\/boards$/);
    const general = page.getByRole("region", { name: "일반 카테고리" });
    const anonymous = page.getByRole("region", { name: "익명 카테고리" });

    // 실행: 일반과 익명에 이름을 하나씩 추가하고 두 결과가 같은 설정에 남는지 확인한다.
    await general.getByLabel("카테고리 이름").fill("여행");
    await general.getByRole("button", { name: "카테고리 추가" }).click();
    await expect(general.getByRole("link", { name: "여행" })).toBeVisible();
    await anonymous.getByLabel("카테고리 이름").fill("익명 상담");
    await anonymous.getByRole("button", { name: "카테고리 추가" }).click();
    await expect(anonymous.getByRole("link", { name: "익명 상담" })).toBeVisible();

    // 검증: 각 요청에 그룹이 지정되며, 기존 관리자 게시판에는 열람 링크만 제공한다.
    expect(creations).toEqual([{ name: "여행", type: "MEMBER" }, { name: "익명 상담", type: "ANONYMOUS" }]);
    const legacy = page.getByRole("region", { name: "기존 관리자 게시판" });
    await expect(legacy.getByRole("link", { name: "기존 운영 기록" })).toBeVisible();
    await expect(legacy.getByRole("button", { name: "카테고리 추가" })).toHaveCount(0);

    await anonymous.getByRole("link", { name: "익명 상담" }).click();
    await expect(page).toHaveURL(new RegExp(`forum=${CREATED.id}$`));
    const forum = page.getByRole("region", { name: CREATED.name! });
    await expect(forum.getByText("아직 게시글이 없습니다.")).toBeVisible();
    await forum.getByRole("link", { name: "뒤로가기" }).click();
    await expect(page).toHaveURL(/[?&]group=ANONYMOUS$/);
    await expect(page.getByRole("link", { name: "익명 상담" })).toBeVisible();
    await expect(page.getByRole("link", { name: "여행", exact: true })).toHaveCount(0);
});

test("일반 회원은 관리자 게시판 설정 링크와 추가 폼을 볼 수 없다", async ({ page }) => {
    // 준비: 관리자 권한이 없는 세션에서 설정과 직접 주소를 확인한다.
    await mockCommonPageDependencies(page);
    await mockIdleWebSocket(page);
    await mockBoardLists(page);
    await page.goto("/ko/settings");

    // 검증: 설정 카드가 없고 직접 열어도 카테고리 추가 폼을 사용할 수 없다.
    await expect(page.getByRole("heading", { name: "설정", exact: true })).toBeVisible();
    await expect(page.getByRole("link", { name: /게시판 관리/ })).toHaveCount(0);
    await page.goto("/ko/settings/admin/boards");
    await expect(page.getByRole("alert").filter({ hasText: "접근할 수 없습니다" })).toBeVisible();
    await expect(page.getByRole("button", { name: "카테고리 추가" })).toHaveCount(0);
});

test("모바일에서도 관리자 글 목록을 읽고 익명 게시판으로 전환한다", async ({ page, context }) => {
    // 준비: 좁은 화면에 관리자 전용 글과 제목 없는 비밀글을 배치한다.
    await page.setViewportSize({ width: 360, height: 800 });
    await installMockAuthCookie(context, "ADMIN");
    await mockCommonPageDependencies(page, TEST_USERS.A, "ADMIN");
    await mockIdleWebSocket(page);
    await mockBoardLists(page, true);
    await page.addInitScript(() => {
        localStorage.setItem("theme", "dark");
    });

    // 실행: 관리자 탭은 별도 카테고리 화면 없이 글 목록을 직접 연다.
    await page.goto("/ko/boards");
    const groups = page.getByRole("navigation", { name: "게시판 유형" });
    await groups.getByRole("link", { name: "관리자", exact: true }).click();
    await expect(page).toHaveURL(/[?&]forum=ADMIN$/);
    const admin = page.getByRole("region", { name: "관리자 전용" });
    const longRow = admin.getByRole("link", { name: new RegExp(LONG_TITLE) });
    await expect(longRow).toBeVisible();
    await expect(admin.getByRole("link", { name: /비밀 게시글/ })).not.toContainText("TranslaCat");
    await expect(admin.getByRole("button", { name: "다음" })).toHaveCount(0);

    // 검증: 긴 제목이 화면을 넘지 않고 익명 게시판에서 이름을 표시하지 않는다.
    const overflow = await longRow.evaluate((row) => row.scrollWidth > row.clientWidth);
    expect(overflow).toBe(false);
    await page.screenshot({ path: test.info().outputPath("boards-mobile.png") });
    await admin.getByRole("link", { name: "뒤로가기" }).click();
    await groups.getByRole("link", { name: "익명", exact: true }).click();
    await expect(page).toHaveURL(/[?&]group=ANONYMOUS$/);
    await page.getByRole("link", { name: "익명 게시판", exact: true }).click();
    await expect(page).toHaveURL(/[?&]forum=ANONYMOUS$/);
    const anonymous = page.getByRole("region", { name: "익명 게시판" });
    await expect(anonymous.getByText("익명", { exact: true })).toBeVisible();
});
