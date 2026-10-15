import { test, expect, installMockAuthCookie } from "../fixtures/mock-test";
import { fulfillJson, mockCommonPageDependencies, mockIdleWebSocket } from "../support/api-mocks";
import { responseDto } from "../support/mock-data";
import { TEST_USERS } from "../support/test-users";

test("dictionary registration shows failure, retries normalized input, and reloads reader ruby", async ({ page, context }) => {
    // 준비: 첫 저장은 실패시키고 재시도 성공 후 같은 회차의 발음을 바꾼다.
    await installMockAuthCookie(context, "ADMIN");
    await mockCommonPageDependencies(page, TEST_USERS.A, "ADMIN");
    await mockIdleWebSocket(page);
    let registered = false;
    let readerReads = 0;
    const posts: { surface: string; reading: string }[] = [];
    await page.route("**/episodes/2/reader", route => {
        readerReads++;
        return fulfillJson(route, responseDto({
            revision: "revision1", segmentationVersion: "v1",
            title: { rawJa: "猫の一日", ja: "猫の一日", ko: "고양이의 하루" },
            pagerInfo: { prevIdentifier: null, nextIdentifier: null, listIdentifier: "n-test" },
            segments: [{ id: "one", order: 0, paragraphId: "p0", paragraphIndex: 0,
                startOffset: 0, endOffset: 3, rawJa: "猫だ。", plainJa: "猫だ。", ko: "고양이다.",
                status: "SUCCEEDED", errorCode: null,
                rubyTokens: [{ startOffset: 0, endOffset: 1, text: "猫", reading: registered ? "まお" : "ねこ" }] }],
            totalSegments: 1, completedSegments: 1, state: "SUCCEEDED", jobId: "job1",
            eventSequence: 1, durableComplete: true,
        }));
    });
    await page.route("**/dictionary/register", route => {
        posts.push(route.request().postDataJSON());
        if (posts.length === 1) return fulfillJson(route, responseDto(null), 500);
        registered = true;
        return fulfillJson(route, responseDto(true));
    });

    // 실행: 공백이 있는 선택어를 등록하다 실패한 뒤 같은 값으로 재시도한다.
    await page.goto("/learning/novel/syosyetu/novels/n-test/episode/2");
    await expect(page.getByTestId("novel-sentence").first().locator("rt")).toHaveText("ねこ");
    await page.getByRole("button", { name: "OPEN", exact: true }).click();
    await page.getByRole("button", { name: "Dict Reg." }).click();
    await page.getByPlaceholder("ex) 漢字").fill("  猫  ");
    await page.getByPlaceholder("ex) かんじ").fill("  まお  ");
    await page.getByRole("button", { name: "Register" }).click();
    await expect(page.getByRole("alert").filter({ hasText: "사전 등록에 실패했습니다" })).toBeVisible();
    await page.getByRole("button", { name: "Register" }).click();

    // 검증: 실패를 숨기지 않고, 저장한 표면형 그대로 새 GET의 ruby가 나타난다.
    await expect(page.getByTestId("novel-sentence").first().locator("rt")).toHaveText("まお");
    expect(readerReads).toBeGreaterThanOrEqual(2);
    expect(posts).toEqual([{ surface: "猫", reading: "まお" }, { surface: "猫", reading: "まお" }]);
});
