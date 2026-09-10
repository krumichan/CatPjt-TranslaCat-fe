import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import {
    LANGUAGE_LEARNING_PROFILE,
    LANGUAGE_LEARNING_DASHBOARD,
    LANGUAGE_LEARNING_SPEAKING_DETAIL,
    mockLanguageLearningBase,
    mockLanguageLearningListening,
    mockLanguageLearningSpeaking,
} from "../../e2e/support/language-learning-mocks.ts";
import * as level from "../../e2e/support/language-learning-level-test-mocks.ts";
import { createReadAloudDetail } from "../../e2e/support/language-learning-read-aloud-mocks.ts";

// Captures the real helper registrations and calls their real handlers. This
// is not a browser / locator simulation and does not replace Playwright E2E.
function capturePage() {
    const routes = new Map();
    const sockets = [];
    return {
        routes, sockets,
        async route(pattern, handler) { routes.set(pattern, handler); },
        async routeWebSocket(pattern, handler) { sockets.push({ pattern, handler }); },
        async respond(pattern, body = null, resourceType = "fetch", url = "http://localhost/api/v1/test") {
            const handler = routes.get(pattern);
            assert.ok(handler, `Missing mocked route: ${pattern}`);
            let response;
            await handler({
                request: () => ({ resourceType: () => resourceType, postDataJSON: () => body, url: () => url, method: () => body === null ? "GET" : "POST" }),
                fulfill: async (value) => { response = value; },
                fallback: async () => { response = { fallback: true }; },
            });
            assert.ok(response, `No response from: ${pattern}`);
            return response.fallback ? response : JSON.parse(response.body).body;
        },
    };
}

test("profile fixture contains the required vocabulary mastery summary with consistent counts", () => {
    const summary = LANGUAGE_LEARNING_PROFILE.vocabularyMastery;
    assert.ok(summary);
    assert.equal(summary.total, summary.newCount + summary.learningCount + summary.familiarCount + summary.strongCount + summary.masteredCount);
    assert.equal(summary.weakest.length, 2);
    assert.equal(summary.averageScore, 68);
});

test("FREE speaking fixture includes the new READ_ALOUD collection and turn metadata", () => {
    const detail = LANGUAGE_LEARNING_SPEAKING_DETAIL;
    assert.equal(detail.session.practiceMode, "FREE");
    assert.deepEqual(detail.readAloudProblemEvaluations, []);
    assert.equal(detail.session.completedTurns, detail.turns.length);
    assert.equal(detail.session.totalDurationSeconds, detail.turns.reduce((sum, turn) => sum + turn.durationSeconds, 0));
    for (const turn of detail.turns) {
        assert.equal(turn.problemIndex, null);
        assert.equal(turn.attemptIndex, null);
        assert.equal(turn.recordingRevision, 0);
    }
});

test("dashboard fixture uses current widget data rather than a deleted speakingSummary marker", () => {
    assert.equal(Object.hasOwn(LANGUAGE_LEARNING_DASHBOARD, "speakingSummary"), false);
    assert.ok(LANGUAGE_LEARNING_DASHBOARD.trends.sourceMetrics);
    assert.ok(LANGUAGE_LEARNING_DASHBOARD.activityPerformance.speaking);
});

for (const locale of ["ko", "ja", "learning"]) {
    test(`dashboard source selector has translated labels for every source in ${locale}`, async () => {
        const messages = JSON.parse(await readFile(new URL(`../../messages/${locale}/languageLearning.json`, import.meta.url), "utf8"));
        for (const source of ["ALL", "WRITING", "SPEAKING", "LISTENING", "READING", "VOCABULARY"]) {
            assert.equal(typeof messages.LanguageLearning.dashboard.source[source], "string", `Missing ${locale}: dashboard.source.${source}`);
            assert.ok(messages.LanguageLearning.dashboard.source[source].length);
        }
    });

    test(`Level Test microphone errors cover recorder failure reasons in ${locale}`, async () => {
        const messages = JSON.parse(await readFile(new URL(`../../messages/${locale}/languageLearning.json`, import.meta.url), "utf8"));
        const errors = messages.LanguageLearning.levelTest.session.speaking.error;
        for (const reason of ["DENIED", "NO_DEVICE", "DEVICE_BUSY", "UNSUPPORTED", "UNKNOWN"]) {
            assert.equal(typeof errors[reason], "string", `Missing ${locale}: levelTest.session.speaking.error.${reason}`);
            assert.ok(errors[reason].length);
        }
        assert.equal(Object.hasOwn(errors, "IN_USE"), false, `${locale}: stale IN_USE key should not replace DEVICE_BUSY`);
    });
}

const questions = [
    level.LEVEL_TEST_QUESTION, level.LEVEL_TEST_SENTENCE_ORDER,
    level.LEVEL_TEST_READING_DISCOURSE, level.LEVEL_TEST_LISTENING,
    level.LEVEL_TEST_DICTATION, level.LEVEL_TEST_INTERPRETATION,
    level.LEVEL_TEST_WRITING, level.LEVEL_TEST_SPEAKING,
    level.LEVEL_TEST_SPEAKING_AUDIO_ONLY, level.LEVEL_TEST_SPEAKING_OPEN,
];
for (const question of questions) {
    test(`level fixture synchronizes session/current/answer/retry for ${question.itemId}:${question.itemType}`, async () => {
        const page = capturePage();
        await level.mockLanguageLearningLevelTest(page, question);
        const root = "**/api/v1/language-learning/level-test/sessions";
        for (const path of [root, `${root}/3101`]) {
            const session = await page.respond(path);
            assert.equal(session.currentQuestionNumber, question.questionNumber);
            assert.equal(session.sessionId, question.sessionId);
        }
        assert.deepEqual(await page.respond(`${root}/3101/current-item`), question);
        for (const path of ["answers", "answers/audio?**", "evaluation/retry"]) {
            const result = await page.respond(`${root}/3101/items/*/${path}`);
            assert.equal(result.itemId, question.itemId);
            assert.equal(result.questionNumber, question.questionNumber);
            assert.equal(result.sessionId, question.sessionId);
        }
    });
}

for (const [name, mock] of [
    ["base", mockLanguageLearningBase],
    ["listening", mockLanguageLearningListening],
    ["speaking", mockLanguageLearningSpeaking],
    ["level test", level.mockLanguageLearningLevelTest],
]) {
    test(`${name} mocks register language-learning routes only in the API namespace`, async () => {
        const page = capturePage();
        await mock(page);
        const routes = [...page.routes.keys()].filter((pattern) => typeof pattern === "string" && pattern.includes("/language-learning/"));
        assert.ok(routes.length > 0, "An empty mock is not coverage");
        for (const pattern of routes) assert.match(pattern, /^\*\*\/api\/v1\/(?:admin\/)?language-learning\//);
    });
}

test("language-learning base mocks isolate live backend WebSocket connections", async () => {
    const page = capturePage();
    await mockLanguageLearningBase(page);
    assert.equal(page.sockets.length, 1);
    assert.ok(page.sockets[0].pattern.test("ws://localhost:8080/ws"));
});

test("API fixture still passes document navigation through instead of serving JSON as a page", async () => {
    const page = capturePage();
    await mockLanguageLearningBase(page);
    assert.deepEqual(await page.respond("**/api/v1/language-learning/settings", null, "document"), { fallback: true });
});

test("speaking submitted turn survives the subsequent detail refresh without duplicate append", async () => {
    const page = capturePage();
    await mockLanguageLearningSpeaking(page);
    const root = "**/api/v1/language-learning/speaking/sessions/301";
    const turn = await page.respond(`${root}/turns`, {});
    assert.equal(turn.id, 406);
    await page.respond(`${root}/turns`, {});
    const detail = await page.respond(root);
    assert.equal(detail.turns.length, 6);
    assert.equal(detail.session.completedTurns, 6);
    assert.equal(detail.turns.filter((item) => item.id === 406).length, 1);
    assert.equal(detail.turns.at(-1).transcript, "新しい回答です。");
    // Factories must not mutate shared defaults across tests.
    assert.equal(LANGUAGE_LEARNING_SPEAKING_DETAIL.turns.length, 5);
});

for (const attemptCount of [0, 1, 2, 3]) {
    test(`READ_ALOUD fixture ${attemptCount} attempts uses problem/attempt identity and the current duration policy`, () => {
        const detail = createReadAloudDetail(attemptCount);
        assert.equal(detail.session.practiceMode, "READ_ALOUD");
        assert.equal(detail.turns.length, attemptCount);
        assert.equal(detail.session.completedTurns, attemptCount);
        assert.equal(detail.evaluationEligibility.requiredUserTurns, 10);
        assert.equal(detail.evaluationEligibility.requiredUserSpeechSeconds, 0);
        assert.equal(detail.evaluationEligibility.eligible, false);
        assert.deepEqual(detail.turns.map((turn) => turn.attemptIndex), Array.from({ length: attemptCount }, (_, index) => index + 1));
        assert.ok(detail.turns.every((turn) => turn.problemIndex === 1 && turn.recordingRevision === 0));
    });
}
