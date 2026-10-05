import { expect, test } from "@playwright/test";
import path from "node:path";
import type { ChatMessageListResponse } from "../../src/types/chat";
import type { WritingLearningHistoryDetail } from "../../src/types/language-learning/history";
import {
    closeLiveSessions, openLiveSession, readLiveConfiguration, readProtectedJson,
    responseBody, waitForChat, writeLiveEvidence, type LiveSession,
} from "../support/live-local-regression";

// 실제 공급자를 쓰는 이미 실행 중인 로컬 stack 전용이다. 자동 재시도로 유료 호출을 반복하지 않는다.
// 인증 정보를 담을 수 있는 trace/video 및 자동 실패 스크린샷은 수집하지 않는다.
test.use({ trace: "off", video: "off", screenshot: "off" });
test.describe.configure({ retries: 0, mode: "serial" });
test.skip(process.env.E2E_LOCAL_LIVE_REGRESSION !== "1", "Explicit local live regression opt-in is required.");

interface ChatFixture {
    directRoomId: number;
    openRoomId: number;
    aiRoomId: number;
    aiMemberId: number;
}

test("LIVE-CHAT profile save/restore, direct realtime, OPEN join and persisted real AI reply", async ({ browser }) => {
    test.setTimeout(180_000);

    // 준비: API 검증이 만든 방을 재사용하고 프로필과 세션은 각각 원복·종료한다.
    const configuration = readLiveConfiguration();
    const fixture = readProtectedJson<ChatFixture>(configuration.chatRoomsFile);
    const sessions: LiveSession[] = [];
    const suffix = Date.now().toString();
    const completed: string[] = [];
    let createdOpenRoomId: number | undefined;
    let aiMessageId: number | undefined;
    try {
        const owner = await openLiveSession(browser, configuration, "A");
        sessions.push(owner);
        const member = await openLiveSession(browser, configuration, "B");
        sessions.push(member);

        await test.step("Profile edits persist through the real UI and are restored", async () => {
            await owner.page.goto("/ko/settings/profile");
            await expect(owner.page.locator("#publicId")).toHaveValue(owner.account.publicId);
            const originalName = await owner.page.locator("#nickname").inputValue();
            const originalBio = await owner.page.locator("#bio").inputValue();
            try {
                await owner.page.locator("#nickname").fill("Live UI Verification");
                await owner.page.locator("#bio").fill("Temporary local browser regression");
                await owner.page.getByRole("button", { name: "저장", exact: true }).click();
                await expect(owner.page.getByText("프로필을 저장했습니다.")).toBeVisible();
                await owner.page.reload();
                await expect(owner.page.locator("#nickname")).toHaveValue("Live UI Verification");
                await expect(owner.page.locator("#bio")).toHaveValue("Temporary local browser regression");
            } finally {
                await owner.page.locator("#nickname").fill(originalName);
                await owner.page.locator("#bio").fill(originalBio);
                await owner.page.getByRole("button", { name: "저장", exact: true }).click();
                await expect(owner.page.getByText("프로필을 저장했습니다.")).toBeVisible();
            }
            completed.push("profile-save-reload-restore");
        });

        await test.step("Two actual browsers exchange direct messages and retain them after reload", async () => {
            for (const session of sessions) {
                await session.page.goto(`/ko/chat/rooms/${fixture.directRoomId}`);
                await waitForChat(session.page);
            }
            for (const [sender, receiver, content] of [
                [owner, member, `Live-UI-A-${suffix}`],
                [member, owner, `Live-UI-B-${suffix}`],
            ] as const) {
                await sender.page.getByPlaceholder("메시지를 입력하세요").fill(content);
                await sender.page.getByRole("button", { name: "메시지 전송", exact: true }).click();
                await expect(sender.page.getByText(content, { exact: true })).toBeVisible({ timeout: 30_000 });
                await expect(receiver.page.getByText(content, { exact: true })).toBeVisible({ timeout: 30_000 });
            }
            await member.page.reload();
            await waitForChat(member.page);
            await expect(member.page.getByText(`Live-UI-A-${suffix}`, { exact: true })).toHaveCount(1);
            await expect(member.page.getByText(`Live-UI-B-${suffix}`, { exact: true })).toHaveCount(1);
            await member.page.screenshot({ path: path.join(configuration.evidenceDirectory, "chat-direct-live.png"), fullPage: true });
            completed.push("direct-two-way-realtime-reload");
        });

        await test.step("An OPEN room is created, found in the directory and joined through the UI", async () => {
            const roomName = `Live-UI-Open-${suffix}`;
            await owner.page.goto("/ko/chat/open/new");
            await owner.page.getByLabel("방 이름", { exact: true }).fill(roomName);
            await owner.page.getByLabel("방 설명", { exact: true }).fill("Local browser regression room");
            await owner.page.getByLabel("최대 인원", { exact: true }).fill("5");
            await owner.page.getByLabel("방별 닉네임", { exact: true }).fill("Live UI Owner");
            await owner.page.getByTestId("open-chat-profile-submit").click();
            await owner.page.waitForURL(/\/chat\/rooms\/\d+$/);
            createdOpenRoomId = Number(owner.page.url().split("/").pop());
            expect(createdOpenRoomId).toBeGreaterThan(0);
            await waitForChat(owner.page);

            await member.page.goto("/ko/chat/open");
            await expect(member.page.getByTestId(`open-chat-room-card-${createdOpenRoomId}`)).toBeVisible();
            await member.page.getByTestId(`open-chat-room-card-${createdOpenRoomId}`).getByRole("link").click();
            await member.page.getByTestId("open-chat-join-button").click();
            await member.page.getByLabel("방별 닉네임").fill("Live UI Member");
            await member.page.getByTestId("open-chat-profile-submit").click();
            await expect(member.page).toHaveURL(new RegExp(`/chat/rooms/${createdOpenRoomId}$`));
            await waitForChat(member.page);
            completed.push("open-create-directory-join");
        });

        // 검증: API 작업이 받은 실제 AI 답변을 화면에서 확인하며 새 멘션을 만들지 않는다.
        await test.step("The separately generated real AI reply renders with its AI identity", async () => {
            const messages = await responseBody<{ messages: { id: number; senderType: string; aiMemberId?: number }[] }>(
                await owner.api.get(`chat/rooms/${fixture.aiRoomId}/messages`), "Existing AI reply lookup",
            );
            const reply = messages.messages.find((message) => message.senderType === "AI");
            expect(reply, "A real AI reply must already exist before this browser-only check").toBeDefined();
            aiMessageId = reply!.id;
            await owner.page.goto(`/ko/chat/rooms/${fixture.aiRoomId}`);
            await waitForChat(owner.page);
            await expect(owner.page.getByTestId(`chat-message-row-${aiMessageId}`)).toBeVisible();
            await expect(owner.page.getByTestId(`chat-ai-badge-${aiMessageId}`)).toBeVisible();
            await owner.page.reload();
            await expect(owner.page.getByTestId(`chat-message-row-${aiMessageId}`)).toHaveCount(1);
            completed.push("real-ai-reply-render-reload");
        });
        expect(sessions.flatMap((session) => session.failures)).toEqual([]);
    } finally {
        writeLiveEvidence(configuration, "chat-ui-result.json", {
            completed, directRoomId: fixture.directRoomId, createdOpenRoomId,
            aiRoomId: fixture.aiRoomId, aiMessageId,
            httpAndBrowserFailures: sessions.flatMap((session) => session.failures),
            authentication: "BE password login plus test-only NextAuth session; OAuth validated separately",
            provider: "real; AI generation reused from API regression",
        });
        await closeLiveSessions(sessions);
    }
});

test("LIVE-STORED-CHAT completed translations render without generating new messages", async ({ browser }) => {
    // 준비: 앞선 실제 송수신과 API AI 회귀에서 저장한 결과만 조회한다.
    const configuration = readLiveConfiguration();
    const fixture = readProtectedJson<ChatFixture>(configuration.chatRoomsFile);
    const sessions: LiveSession[] = [];
    const checked: { roomId: number; messageIds: number[]; translationCount: number }[] = [];
    try {
        const session = await openLiveSession(browser, configuration, "A");
        sessions.push(session);
        for (const roomId of [fixture.directRoomId, fixture.aiRoomId]) {
            const body = await responseBody<ChatMessageListResponse>(await session.api.get(`chat/rooms/${roomId}/messages`), "Stored translations lookup");
            const messages = body.messages.filter((message) => message.senderType === "AI" || message.content.startsWith("Live-UI-"));
            expect(messages.length).toBeGreaterThan(0);
            const translations = messages.flatMap((message) => message.translations);
            expect(translations.length).toBeGreaterThanOrEqual(messages.length);
            expect(translations.every((translation) => translation.status === "COMPLETED" && Boolean(translation.translatedContent))).toBe(true);

            // 실행·검증: 저장된 번역의 실제 DOM 표시를 확인하고 대표 화면만 수집한다.
            await session.page.goto(`/ko/chat/rooms/${roomId}`);
            await waitForChat(session.page);
            for (const message of messages) {
                const bubble = session.page.getByTestId(`chat-message-bubble-${message.id}`);
                await expect(bubble).toBeVisible();
                const translatedValues = message.translations.map((translation) => translation.translatedContent!);
                const displayed = await bubble.evaluate((element, values) => values.some((value) => element.textContent?.includes(value)), translatedValues);
                expect(displayed, `Persisted translation for message ${message.id} is visible`).toBe(true);
            }
            await session.page.screenshot({ path: path.join(configuration.evidenceDirectory, roomId === fixture.directRoomId ? "chat-direct-translated-live.png" : "chat-ai-live.png"), fullPage: true });
            checked.push({ roomId, messageIds: messages.map((message) => message.id), translationCount: translations.length });
        }
        expect(session.failures).toEqual([]);
    } finally {
        writeLiveEvidence(configuration, "chat-stored-ui-result.json", { checked, additionalMessages: 0, additionalModelRequests: 0 });
        await closeLiveSessions(sessions);
    }
});

interface LearningFixture {
    readingSetId: number;
    listeningSessionId: number;
    listeningItemId: number;
    speakingSessionId: number;
    speakingTurnId: number;
    speakingTurnIndex: number;
    writingType: "free" | "guided" | "translation";
    writingSetId?: number;
}

test("LIVE-LL dashboards, settings, practice entry and completed real model results render", async ({ browser }) => {
    test.setTimeout(180_000);

    // 준비: API 회귀에서 확정한 결과만 열며 생성·답변·재평가 버튼은 누르지 않는다.
    const configuration = readLiveConfiguration();
    const fixture = readProtectedJson<LearningFixture>(configuration.learningResultsFile ?? "");
    const sessions: LiveSession[] = [];
    const completed: string[] = [];
    const learningWrites: string[] = [];
    try {
        const session = await openLiveSession(browser, configuration, "DAILY");
        sessions.push(session);
        const entrySession = await openLiveSession(browser, configuration, "B");
        sessions.push(entrySession);
        for (const current of sessions) {
            current.page.on("request", (request) => {
                const pathname = new URL(request.url()).pathname;
                if (pathname.startsWith("/api/v1/language-learning/") && !["GET", "HEAD", "OPTIONS"].includes(request.method())) {
                    learningWrites.push(`${request.method()} ${pathname}`);
                }
            });
        }
        // 진입 정책은 실제 Level Test 완료 계정으로 검사하고 기존 API fixture의 gate를 우회하지 않는다.
        let page = entrySession.page;

        await test.step("Dashboard, saved settings and unified learning history display existing data", async () => {
            await page.goto("/ko/language-learning");
            await expect(page.getByTestId("language-learning-dashboard")).toBeVisible();
            await expect(page.getByTestId("dashboard-learning-profile")).toBeVisible();
            await page.screenshot({ path: path.join(configuration.evidenceDirectory, "ll-dashboard-live.png"), fullPage: true });
            completed.push("dashboard");

            await page.goto("/ko/language-learning/settings");
            await expect(page.getByTestId("language-learning-settings")).toBeVisible();
            await expect(page.getByRole("combobox", { name: "원문 언어", exact: true })).toHaveValue("ko");
            await expect(page.getByRole("combobox", { name: "학습 언어", exact: true })).toHaveValue("en");
            completed.push("settings");

            await page.goto("/ko/language-learning/history");
            await expect(page.locator('[data-testid^="history-activity-"]').first()).toBeVisible();
            await expect(page.getByRole("heading", { name: "학습 기록", exact: true })).toBeVisible();
            completed.push("unified-history");
        });

        await test.step("All practice entry screens load without starting another paid generation", async () => {
            await page.goto("/ko/language-learning/writing");
            await expect(page.getByTestId("daily-writing-type-selector")).toBeVisible();
            await page.goto("/ko/language-learning/reading");
            await expect(page.getByRole("heading", { name: "독해 문제", exact: true })).toBeVisible();
            await page.goto("/ko/language-learning/listening");
            await expect(page.getByTestId("listening-landing-page")).toBeVisible();
            await page.goto("/ko/language-learning/speaking");
            await expect(page.getByTestId("speaking-start-page")).toBeVisible();
            await page.goto("/ko/language-learning/vocabulary");
            await expect(page.getByRole("status").getByRole("heading", { name: "독립 Daily Vocabulary 신규 제공을 종료했습니다" })).toBeVisible();
            completed.push("writing-reading-listening-speaking-entry", "vocabulary-retirement-notice");
        });

        // 검증: API fixture 계정이 소유한 실제 Daily 결과는 완료된 세션 URL에서 별도로 검사한다.
        page = session.page;
        await test.step("Reading, Listening and Speaking reuse their real completed results", async () => {
            await page.goto(`/ko/language-learning/reading/session/${fixture.readingSetId}`);
            await expect(page.getByRole("heading", { name: "학습 결과", exact: true })).toBeVisible();
            completed.push("reading-completed");

            await page.goto(`/ko/language-learning/listening/session/${fixture.listeningSessionId}/result`);
            await expect(page.getByTestId("listening-result-page")).toBeVisible();
            await expect(page.getByTestId("listening-task-result-DICTATION")).toBeVisible();
            await expect(page.getByTestId("listening-task-result-INTERPRETATION")).toBeVisible();
            await expect(page.getByTestId("listening-result-evaluation-status")).toHaveCount(0);
            await expect(page.getByTestId("listening-result-partial-notice")).toHaveCount(0);
            await expect(page.getByTestId("listening-result-average-score")).toHaveText(/^\d+$/);
            const referencePlayer = page.getByTestId(`listening-result-reference-audio-${fixture.listeningItemId}`);
            const referenceResponse = page.waitForResponse((response) =>
                new URL(response.url()).pathname === `/api/v1/language-learning/listening/items/${fixture.listeningItemId}/audio`,
            );
            await referencePlayer.getByRole("button").click();
            expect((await referenceResponse).status()).toBe(200);
            const referenceAudio = referencePlayer.locator("audio");
            await expect(referenceAudio).toBeVisible();
            await referenceAudio.evaluate(async (element: HTMLAudioElement) => {
                element.muted = true;
                await element.play();
            });
            await expect.poll(() => referenceAudio.evaluate((element: HTMLAudioElement) => element.currentTime)).toBeGreaterThan(0);
            await referenceAudio.evaluate((element: HTMLAudioElement) => element.pause());
            completed.push("listening-completed");
            completed.push("stored-listening-audio-get-decode-playback");

            // 이미 저장된 사용자 음성만 재생한다. 새 TTS를 만들 수 있는 모범답안 음성은 요청하지 않는다.
            await page.goto(`/ko/language-learning/speaking/${fixture.speakingSessionId}`);
            const speakingTurn = page.getByTestId(`speaking-turn-${fixture.speakingTurnIndex}`);
            await expect(speakingTurn).toBeVisible();
            const userAudioResponse = page.waitForResponse((response) =>
                new URL(response.url()).pathname === `/api/v1/language-learning/speaking/sessions/${fixture.speakingSessionId}/turns/${fixture.speakingTurnId}/audio/user`,
            );
            await speakingTurn.getByRole("button", { name: "재생", exact: true }).first().click();
            expect((await userAudioResponse).status()).toBe(200);
            await expect(speakingTurn.getByRole("button", { name: "일시정지", exact: true })).toBeVisible();
            await speakingTurn.getByRole("button", { name: "일시정지", exact: true }).click();
            completed.push("stored-speaking-user-audio-get-playback");

            await page.goto(`/ko/language-learning/speaking/${fixture.speakingSessionId}/evaluation`);
            await expect(page.getByTestId("speaking-coaching-result")).toBeVisible();
            await page.reload();
            await expect(page.getByTestId("speaking-coaching-result")).toBeVisible();
            await page.screenshot({ path: path.join(configuration.evidenceDirectory, "ll-speaking-result-live.png"), fullPage: true });
            completed.push("speaking-coaching-completed-reload");
        });
        expect(sessions.flatMap((current) => current.failures)).toEqual([]);
        expect(learningWrites, "Completed-result browser checks must not write or submit learning data").toEqual([]);
    } finally {
        writeLiveEvidence(configuration, "learning-ui-result.json", {
            completed, fixtures: fixture, userId: sessions[0]?.account.userId,
            entryUserId: sessions[1]?.account.userId,
            baseline: "Entry uses real completed Level Test B; daily API fixture requires its own Level Test and is checked only by owned result URLs",
            additionalGenerationActions: 0, learningWrites,
            physicalMicrophoneAndHumanListening: "Not tested; stored generated test audio only",
            httpAndBrowserFailures: sessions.flatMap((session) => session.failures),
        });
        await closeLiveSessions(sessions);
    }
});

test("LIVE-WRITING-RESULT the completed real Writing result opens without another generation", async ({ browser }) => {
    // 준비: Writing 완료 여부는 독립 검증하여 다른 영역의 성공과 섞지 않는다.
    const configuration = readLiveConfiguration();
    const fixture = readProtectedJson<LearningFixture>(configuration.learningResultsFile ?? "");
    const sessions: LiveSession[] = [];
    let complete = false;
    const learningWrites: string[] = [];
    try {
        const session = await openLiveSession(browser, configuration, "DAILY");
        sessions.push(session);
        const page = session.page;
        page.on("request", (request) => {
            const pathname = new URL(request.url()).pathname;
            if (pathname.startsWith("/api/v1/language-learning/") && !["GET", "HEAD", "OPTIONS"].includes(request.method())) {
                learningWrites.push(`${request.method()} ${pathname}`);
            }
        });

        // 실행: 실제 완료된 세트만 공식 이력에서 선택한다. Daily 진입 정책이나 기존 synthetic 결과는 우회·재사용하지 않는다.
        expect(Number.isSafeInteger(fixture.writingSetId), "A completed real Writing set ID is required").toBe(true);
        const activityId = `WRITING:${fixture.writingSetId}`;
        const history = await responseBody<WritingLearningHistoryDetail>(
            await session.api.get(`language-learning/history/${encodeURIComponent(activityId)}`), "Real Writing result lookup",
        );
        expect(history.source).toBe("WRITING");
        expect(history.detail.dailySetId).toBe(fixture.writingSetId);
        expect(history.detail.writingType).toBe(fixture.writingType.toUpperCase());
        expect(history.detail.status).toBe("COMPLETED");
        expect(history.detail.items.length).toBeGreaterThan(0);
        expect(history.detail.items.every((item) => item.attempts.some((attempt) =>
            attempt.evaluationStatus === "SUCCESS" && Number.isFinite(attempt.evaluation?.overall),
        ))).toBe(true);

        await page.goto("/ko/language-learning/history");
        await page.getByTestId("history-source-WRITING").click();
        await page.getByTestId(`history-activity-${activityId}`).click();
        const writing = page.getByTestId("writing-history-detail");
        await expect(writing).toBeVisible();
        await expect(writing.locator("article")).toHaveCount(history.detail.items.length);
        await expect(writing.getByRole("heading", { name: "AI 평가 결과", exact: true }).first()).toBeVisible();

        // 검증: 저장된 실제 답안·평가가 DOM에 표시되는지만 비교하며 내용을 로그로 출력하지 않는다.
        const expectedValues = history.detail.items.flatMap((item) => item.attempts
            .filter((attempt) => attempt.evaluationStatus === "SUCCESS" && attempt.evaluation)
            .map((attempt) => ({ answer: attempt.answer, score: String(attempt.evaluation!.overall) })));
        await expect.poll(() => writing.evaluate((element, values) =>
            values.every((value) => element.textContent?.includes(value.answer) && element.textContent?.includes(value.score)),
        expectedValues)).toBe(true);
        await page.screenshot({ path: path.join(configuration.evidenceDirectory, "ll-writing-result-live.png"), fullPage: true });
        expect(session.failures).toEqual([]);
        expect(learningWrites).toEqual([]);
        complete = true;
    } finally {
        writeLiveEvidence(configuration, "writing-ui-result.json", {
            complete, writingType: fixture.writingType, writingSetId: fixture.writingSetId,
            userId: sessions[0]?.account.userId, route: "unified-history-owned-result",
            additionalGenerationActions: 0, learningWrites,
            httpAndBrowserFailures: sessions.flatMap((session) => session.failures),
        });
        await closeLiveSessions(sessions);
    }
});

test("LIVE-LEVEL-RESULT real twenty-question assessment and answer history render", async ({ browser }) => {
    // 준비: 새 실제 Level Test를 마친 B 계정을 Daily 기존 baseline 계정과 구분한다.
    const configuration = readLiveConfiguration();
    const fixture = readProtectedJson<{ levelTestSessionId: number }>(configuration.levelResultsFile ?? "");
    const sessions: LiveSession[] = [];
    let complete = false;
    try {
        const session = await openLiveSession(browser, configuration, "B");
        sessions.push(session);
        const page = session.page;

        // 실행·검증: 결과와 20개 실제 평가 이력을 읽고 새 테스트를 만들지 않는다.
        await page.goto(`/ko/language-learning/level-test/result/${fixture.levelTestSessionId}`);
        await expect(page.getByRole("heading", { name: "종합 레벨", exact: true })).toBeVisible();
        await expect(page.getByRole("heading", { name: "영역별 점수", exact: true })).toBeVisible();
        await page.screenshot({ path: path.join(configuration.evidenceDirectory, "ll-level-result-live.png"), fullPage: true });
        await page.goto(`/ko/language-learning/level-test/history/${fixture.levelTestSessionId}`);
        for (let number = 1; number <= 20; number += 1) {
            await expect(page.getByTestId(`level-test-history-item-${number}`)).toBeVisible();
        }
        await page.reload();
        await expect(page.getByTestId("level-test-history-item-20")).toBeVisible();
        await page.goto("/ko/language-learning");
        await expect(page.getByTestId("language-learning-dashboard")).toBeVisible();
        await expect(page.getByTestId("dashboard-learning-profile")).toBeVisible();
        await page.screenshot({ path: path.join(configuration.evidenceDirectory, "ll-level-dashboard-live.png"), fullPage: true });
        expect(session.failures).toEqual([]);
        complete = true;
    } finally {
        writeLiveEvidence(configuration, "level-ui-result.json", {
            complete, fixture, userId: sessions[0]?.account.userId, expectedAnswerCount: 20,
            additionalGenerationActions: 0,
            httpAndBrowserFailures: sessions.flatMap((session) => session.failures),
        });
        await closeLiveSessions(sessions);
    }
});

test("LIVE-WRITING-FAILURE inspect failed generation and the existing account entry gate without retry", async ({ browser }) => {
    // 준비: 실패 원인과 계정 선행 조건을 관찰하며 완료 결과 테스트를 대신 통과시키지 않는다.
    const configuration = readLiveConfiguration();
    const fixture = readProtectedJson<LearningFixture>(configuration.learningResultsFile ?? "");
    const sessions: LiveSession[] = [];
    const learningWrites: string[] = [];
    let observed = false;
    try {
        const session = await openLiveSession(browser, configuration, "DAILY");
        sessions.push(session);
        session.page.on("request", (request) => {
            const pathname = new URL(request.url()).pathname;
            if (pathname.startsWith("/api/v1/language-learning/") && !["GET", "HEAD", "OPTIONS"].includes(request.method())) {
                learningWrites.push(`${request.method()} ${pathname}`);
            }
        });
        const activityId = `WRITING:${fixture.writingSetId}`;
        const history = await responseBody<WritingLearningHistoryDetail>(
            await session.api.get(`language-learning/history/${encodeURIComponent(activityId)}`), "Failed Writing result lookup",
        );
        expect(history.detail.status).toBe("FAILED");
        expect(history.detail.items).toHaveLength(0);
        const level = await responseBody<{ profileState: string }>(
            await session.api.get("language-learning/level-test/status"), "Existing fixture entry status",
        );
        expect(level.profileState).toBe("LEVEL_TEST_REQUIRED");

        // 실행·검증: 공식 진입 안내와 소유 이력을 읽을 뿐 레벨 정책을 우회하거나 재생성을 요청하지 않는다.
        await session.page.goto("/ko/language-learning/writing");
        await expect(session.page.locator('main a[href="/ko/language-learning/level-test"]').last()).toBeVisible();
        await expect(session.page.getByTestId("daily-writing-type-selector")).toHaveCount(0);
        await session.page.screenshot({ path: path.join(configuration.evidenceDirectory, "ll-writing-prerequisite-live.png"), fullPage: true });
        await session.page.goto("/ko/language-learning/history");
        await session.page.getByTestId("history-source-WRITING").click();
        await session.page.getByTestId(`history-activity-${activityId}`).click();
        await expect(session.page.getByTestId("writing-history-detail")).toBeVisible();
        await expect(session.page.getByTestId("writing-history-detail").locator("article")).toHaveCount(0);
        expect(session.failures).toEqual([]);
        expect(learningWrites).toEqual([]);
        observed = true;
    } finally {
        writeLiveEvidence(configuration, "writing-failure-observation.json", {
            observed, writingSetId: fixture.writingSetId, status: "FAILED", itemCount: 0,
            completionResult: "blockedByGeneration",
            failedGenerationBannerAndRetryUi: "Not reached: existing user9 requires official initial Level Test; history has no item evaluation",
            gateBypassed: false, learningWrites, additionalGenerationActions: 0,
            httpAndBrowserFailures: sessions.flatMap((session) => session.failures),
        });
        await closeLiveSessions(sessions);
    }
});
