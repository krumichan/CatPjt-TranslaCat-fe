import { test, expect, installMockAuthCookie } from "../fixtures/mock-test";
import { fulfillApiJson, fulfillJson, mockCommonPageDependencies, mockIdleWebSocket } from "../support/api-mocks";
import { responseDto } from "../support/mock-data";
import { TEST_USERS } from "../support/test-users";

const workId = "11054822662896759076";
const episodeId = "11054822662896857470";
const nextEpisodeId = "11054822662896857471";
const unit = () => ({ rawJa: "猫の話", ja: "<ruby>猫<rt>ねこ</rt></ruby>の話", ko: "고양이 이야기" });
const source = () => ({ revision: "kakuyomu-revision", segmentationVersion: "v1", title: unit(),
    pagerInfo: { prevIdentifier: null, nextIdentifier: nextEpisodeId, listIdentifier: workId },
    segments: [{ id: "kakuyomu-s0", paragraphId: "p0", order: 0, paragraphIndex: 0, startOffset: 0, endOffset: 3,
        rawJa: "猫だ。", plainJa: "猫だ。", ko: "고양이다.", status: "SUCCEEDED", errorCode: null,
        rubyTokens: [{ startOffset: 0, endOffset: 1, text: "猫", reading: "ねこ" }] },
        { id: "kakuyomu-blank", paragraphId: "p1", order: 1, paragraphIndex: 1, startOffset: 0, endOffset: 2,
            rawJa: "\n\n", plainJa: "\n\n", ko: "", status: "SUCCEEDED", errorCode: null }],
    totalSegments: 2, completedSegments: 2, state: "SUCCEEDED", jobId: "kakuyomu-job", eventSequence: 1, durableComplete: true });

function silentWavFixture() {
    // UI 재생 이벤트만 검증하는 유료 호출 없는 PCM fixture다. 실제 OpenAI 음성 검증과 구분한다.
    const pcm = Buffer.alloc(44 + 320_000);
    pcm.write("RIFF", 0); pcm.writeUInt32LE(pcm.length - 8, 4); pcm.write("WAVEfmt ", 8);
    pcm.writeUInt32LE(16, 16); pcm.writeUInt16LE(1, 20); pcm.writeUInt16LE(1, 22);
    pcm.writeUInt32LE(16000, 24); pcm.writeUInt32LE(32000, 28); pcm.writeUInt16LE(2, 32); pcm.writeUInt16LE(16, 34);
    pcm.write("data", 36); pcm.writeUInt32LE(pcm.length - 44, 40);
    return pcm.toString("base64");
}

test.beforeEach(async ({ page, context }) => {
    await installMockAuthCookie(context, "ADMIN");
    await mockCommonPageDependencies(page, TEST_USERS.A, "ADMIN");
    await mockIdleWebSocket(page);
});

for (const kind of ["RANKING", "SEARCH"] as const) {
    test(`NOVEL-KAKUYOMU-${kind} 공통 카드·목차·reader와 전체 읽기를 문자열 ID로 연결한다`, async ({ page }, testInfo) => {
        // 준비: 단편도 별도 회차 ID를 가지며 기간 목록은 플랫폼 API의 응답만 표시한다.
        const providerPaths: string[] = [];
        const audioRequests: { segmentId: string; language: string; path: string }[] = [];
        await page.route("**/kakuyomu/ranking/periods", route => fulfillJson(route, responseDto([
            { code: "DAILY", label: "일간" }, { code: "WEEKLY", label: "주간" },
        ])));
        await page.route("**/kakuyomu/novels/catalog", route => {
            providerPaths.push(new URL(route.request().url()).pathname);
            const selector = route.request().postDataJSON();
            return fulfillJson(route, responseDto({ snapshotId: "kakuyomu-catalog", eventSequence: 1, state: "SUCCEEDED",
                total: 1, ready: 1, failed: 0, pageInfo: null, selector,
                items: [{ itemId: "kakuyomu-card", identifier: workId, rank: kind === "RANKING" ? 7 : null, sourcePosition: 0,
                    status: "READY", title: unit(), author: unit(), synopsis: unit(), statusText: unit(), genreText: "現代ファンタジー",
                    isShortStory: true, arrivalSequence: 0, errorCode: null, cached: true }] }));
        });
        await page.route(`**/kakuyomu/novels/${workId}?page=1`, route => fulfillApiJson(route, responseDto({
            title: unit(), author: unit(), synopsis: unit(),
            pageInfo: { firstPage: null, prevPage: null, nextPage: null, lastPage: null, currentPage: 1, pages: [1] },
            episodes: [{ sequence: 1, identifier: episodeId, title: unit() }],
        })));
        await page.route("**/recent-views", route => fulfillJson(route, responseDto({})));
        await page.route(`**/kakuyomu/${workId}/episodes/${episodeId}/reader`, route => fulfillJson(route, responseDto(source())));
        await page.route(`**/kakuyomu/${workId}/episodes/${episodeId}/audio`, route => {
            const request = route.request().postDataJSON();
            audioRequests.push({ segmentId: request.segmentId, language: request.language, path: new URL(route.request().url()).pathname });
            return fulfillJson(route, responseDto({ ...request, partCount: 1, audioBase64: silentWavFixture(), contentType: "audio/wav", provider: "openai" }));
        });
        await page.setViewportSize({ width: 390, height: 844 });

        // 실행: 두 진입 경로가 같은 내장 catalog를 통해 작품 소개·목차로 이어진다.
        await page.goto(kind === "RANKING" ? "/learning/novel/kakuyomu/genres/fantasy?period=daily"
            : "/learning/novel/kakuyomu/search/novels?keyword=猫");
        const card = page.getByTestId("novel-catalog-card");
        await expect(card).toHaveAttribute("data-identifier", workId);
        await expect(card.getByTestId("novel-card-title").locator("ruby rt")).toHaveText("ねこ");
        await expect(card.getByTestId("novel-card-title").locator("[lang=ko]")).toHaveText("고양이 이야기");
        await expect(page.getByRole("combobox", { name: "번역 언어", exact: true })).toBeVisible();
        if (kind === "RANKING") {
            await expect(page.getByRole("button", { name: "일간", exact: true })).toBeVisible();
            await expect(page.getByRole("button", { name: "분기", exact: true })).toHaveCount(0);
        }
        await expect(card.getByRole("link")).toHaveAttribute("href", `/learning/novel/kakuyomu/novels/${workId}`);
        await page.screenshot({ path: testInfo.outputPath("kakuyomu-catalog-mobile.png"), fullPage: true });
        await card.getByRole("link").click();
        await expect(page.getByRole("heading", { level: 1 }).locator("ruby rt")).toHaveText("ねこ");
        await expect(page.getByRole("heading", { level: 1 }).locator("[lang=ko]")).toHaveText("고양이 이야기");
        await expect(page.locator("#episode-list ruby rt")).toHaveText("ねこ");
        await page.screenshot({ path: testInfo.outputPath("kakuyomu-detail-mobile.png"), fullPage: true });
        await page.locator("#episode-list [lang=ko]").click();

        // 검증: 고유 회차 ID와 공통 후리가나·번역·footer 전체 읽기를 보존하며 진입만으로 음성을 요청하지 않는다.
        await expect(page).toHaveURL(new RegExp(`/kakuyomu/novels/${workId}/episode/${episodeId}$`));
        const sentences = page.getByTestId("novel-sentence");
        const sentence = sentences.first();
        const blank = sentences.nth(1);
        await expect(sentences).toHaveCount(2);
        await expect(page.getByRole("heading", { level: 1 }).locator("..")).not.toContainText(episodeId);
        await expect(sentence.locator("ruby rt")).toHaveText("ねこ");
        await expect(sentence.locator("p[lang=ko]")).toHaveText("고양이다.");
        expect(await blank.locator("p[lang=ja]").textContent()).toBe("\n\n");
        await expect(blank).not.toContainText(/원문 · 번역 대기|번역 실패 · 원문/);
        await expect(blank.getByRole("button")).toHaveCount(0);
        expect(audioRequests).toHaveLength(0);
        expect(providerPaths).toEqual(["/api/v1/kakuyomu/novels/catalog"]);
        await page.getByRole("button", { name: "OPEN", exact: true }).click();
        await expect(page.getByRole("button", { name: "원문 전체 읽기", exact: true })).toBeVisible();
        await expect(page.getByRole("button", { name: "번역문 전체 읽기", exact: true })).toBeVisible();
        await expect(sentence.getByRole("button")).toHaveCount(0);
        await page.getByRole("button", { name: "원문 전체 읽기", exact: true }).click();
        await expect(page.getByTestId("novel-playback-state")).toHaveAttribute("data-state", "playing");
        expect(audioRequests[0]).toEqual({ segmentId: "kakuyomu-s0", language: "ja", path: `/api/v1/kakuyomu/${workId}/episodes/${episodeId}/audio` });
        await page.getByRole("button", { name: "정지", exact: true }).click();
        await expect(page.getByTestId("novel-playback-state")).toHaveAttribute("data-state", "idle");
        await page.getByRole("button", { name: "번역문 전체 읽기", exact: true }).click();
        await expect(page.getByTestId("novel-playback-state")).toHaveAttribute("data-state", "playing");
        expect(audioRequests[1]).toEqual({ segmentId: "kakuyomu-s0", language: "ko", path: `/api/v1/kakuyomu/${workId}/episodes/${episodeId}/audio` });
        await page.getByRole("button", { name: "정지", exact: true }).click();
        await page.getByRole("button", { name: "원문 전체 읽기", exact: true }).click();
        await expect(page.getByTestId("novel-playback-state")).toHaveAttribute("data-state", "playing");
        expect(audioRequests).toHaveLength(2);
        await page.getByRole("button", { name: "정지", exact: true }).click();
        await page.screenshot({ path: testInfo.outputPath("kakuyomu-reader-mobile.png"), fullPage: true });
    });
}
