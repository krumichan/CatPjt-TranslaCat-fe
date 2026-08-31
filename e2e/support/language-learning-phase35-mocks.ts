import type { Page } from "@playwright/test";

import { fulfillApiJson } from "./api-mocks";
import { responseDto } from "./mock-data";

export const LEVEL_TEST_STATUS = {
    profileState: "ACTIVE",
    initialLevelTestCompleted: true,
    recheckRecommended: true,
    activeSessionId: null,
    currentQuestionNumber: null,
    baseLevelScore: 76,
    proficiencyBand: "UPPER_INTERMEDIATE",
};

export const LEVEL_TEST_SESSION = {
    sessionId: 3101,
    sessionType: "RECHECK",
    assessmentVersion: "MULTI_SKILL",
    status: "IN_PROGRESS",
    totalQuestions: 20,
    currentQuestionNumber: 1,
    currentComplexityBand: 4,
    baseLevelScore: 76,
    proficiencyBand: "UPPER_INTERMEDIATE",
    startedAt: "2026-08-29T10:00:00",
    completedAt: null,
};

export const LEVEL_TEST_QUESTION = {
    sessionId: 3101,
    sessionType: "RECHECK",
    itemId: 3201,
    questionNumber: 1,
    totalQuestions: 20,
    domain: "VOCABULARY",
    itemType: "VOCAB_CONTEXT_CHOICE",
    complexityBand: 4,
    instruction: "문맥에 가장 자연스러운 표현을 선택하세요.",
    instructionLanguage: "ko",
    answerMode: "CHOICE",
    answerLanguage: null,
    promptText: "会議の予定が変更になったので、参加者に___してください。",
    options: [
        { key: "A", text: "連絡" },
        { key: "B", text: "睡眠" },
        { key: "C", text: "料理" },
        { key: "D", text: "散歩" },
    ],
    emphasisText: null,
    taskGuidance: null,
    referenceAudioAvailable: false,
    maxAnswerLength: null,
    maxAudioSeconds: null,
    status: "READY",
    evaluationReasonCode: null,
};

export const LEVEL_TEST_SENTENCE_ORDER = {
    ...LEVEL_TEST_QUESTION,
    itemId: 3206,
    questionNumber: 6,
    domain: "GRAMMAR",
    itemType: "GRAMMAR_SENTENCE_ORDER",
    // The backend persists the completed sentence for scoring/history, but an active
    // Sentence Order response must never expose it as a visible question prompt.
    promptText: "昨日、友達と映画を見ました。",
    options: [
        { key: "A", text: "昨日、" },
        { key: "B", text: "友達と" },
        { key: "C", text: "映画を" },
        { key: "D", text: "見ました。" },
    ],
};

export const LEVEL_TEST_READING_DISCOURSE = {
    ...LEVEL_TEST_QUESTION,
    itemId: 3209,
    questionNumber: 9,
    domain: "READING",
    itemType: "READING_DISCOURSE_FUNCTION",
    promptText: "売上が前年同期比で減少し、競合製品の台頭も確認された。これは、新たな戦略が必要であることを示している。今後は顧客層を再定義し、施策を見直す必要がある。\n\n上記の強調部分は文章全体でどのような役割を果たしているか。",
    emphasisText: "これは、新たな戦略が必要であることを示している。",
};

export const LEVEL_TEST_LISTENING = {
    ...LEVEL_TEST_QUESTION,
    itemId: 3211,
    questionNumber: 11,
    domain: "LISTENING",
    itemType: "LISTENING_GIST_CHOICE",
    promptText: "들은 내용의 요지를 선택하세요.",
    referenceAudioAvailable: true,
};

export const LEVEL_TEST_DICTATION = {
    ...LEVEL_TEST_QUESTION,
    itemId: 3213,
    questionNumber: 13,
    domain: "LISTENING",
    itemType: "LISTENING_DICTATION",
    answerMode: "TEXT",
    answerLanguage: "ja",
    promptText: "들은 문장을 그대로 적어 주세요.",
    options: [],
    referenceAudioAvailable: true,
    maxAnswerLength: 300,
};

export const LEVEL_TEST_INTERPRETATION = {
    ...LEVEL_TEST_DICTATION,
    itemId: 3214,
    questionNumber: 14,
    itemType: "LISTENING_INTERPRETATION",
    answerLanguage: "ko",
    promptText: "들은 내용의 의미를 한국어로 적어 주세요.",
};

export const LEVEL_TEST_WRITING = {
    ...LEVEL_TEST_QUESTION,
    itemId: 3217,
    questionNumber: 17,
    domain: "WRITING",
    itemType: "WRITING_SHORT_PARAGRAPH",
    answerMode: "TEXT",
    answerLanguage: "ja",
    instruction: "아래 조건을 포함하여 일본어로 작성하세요.",
    promptText: "現在、同じ顧客情報を三つのファイルに入力しています。入力先を一つに統合し、自動集計を使う提案文を書いてください。",
    options: [],
    taskGuidance: {
        providedFacts: ["같은 고객 정보를 세 개의 파일에 중복 입력하고 있음", "입력 파일을 하나로 통합할 예정"],
        requiredIntents: ["현재 문제점 설명", "통합 방안 제안"],
        responseConstraints: ["기대되는 효과를 한 가지 포함"],
    },
    maxAnswerLength: 800,
};

export const LEVEL_TEST_SPEAKING = {
    ...LEVEL_TEST_QUESTION,
    itemId: 3218,
    questionNumber: 18,
    domain: "SPEAKING",
    itemType: "SPEAKING_REPEAT",
    answerMode: "AUDIO",
    answerLanguage: "ja",
    promptText: "音声を聞いて、そのまま繰り返してください。",
    options: [],
    referenceAudioAvailable: true,
    maxAudioSeconds: 30,
};

export const LEVEL_TEST_RESULT = {
    sessionId: 3101,
    assessmentVersion: "MULTI_SKILL",
    sessionType: "RECHECK",
    overallScore: 81,
    proficiencyBand: "UPPER_INTERMEDIATE",
    domainScores: {
        vocabulary: 86,
        grammar: 80,
        reading: 84,
        listening: 78,
        writing: 79,
        speaking: 77,
    },
    recommendedDifficulty: "MY_LEVEL",
    completedAt: "2026-08-29T10:24:00",
};

export const LEVEL_TEST_HISTORY = [
    {
        sessionId: 3101,
        assessmentVersion: "MULTI_SKILL",
        sessionType: "RECHECK",
        overallScore: 81,
        proficiencyBand: "UPPER_INTERMEDIATE",
        domainScores: LEVEL_TEST_RESULT.domainScores,
        completedAt: "2026-08-29T10:24:00",
    },
    {
        sessionId: 1101,
        assessmentVersion: "WRITING_ONLY",
        sessionType: "INITIAL",
        overallScore: 72,
        proficiencyBand: "INTERMEDIATE",
        domainScores: null,
        completedAt: "2026-07-01T09:20:00",
    },
];

export const LEVEL_TEST_HISTORY_DETAIL = {
    summary: LEVEL_TEST_HISTORY[0],
    items: [
        {
            questionNumber: 1,
            domain: "VOCABULARY",
            itemType: "VOCAB_CONTEXT_CHOICE",
            complexityBand: 4,
            promptText: LEVEL_TEST_QUESTION.promptText,
            selectedOptionKey: "A",
            selectedOptionKeys: [],
            textAnswer: null,
            audioSubmitted: false,
            evaluable: true,
            score: 100,
            confidence: 1,
            metrics: [],
            strengths: ["문맥에 맞는 어휘를 정확히 선택했습니다."],
            improvements: [],
            reasonCode: null,
        },
        {
            questionNumber: 18,
            domain: "SPEAKING",
            itemType: "SPEAKING_REPEAT",
            complexityBand: 4,
            promptText: LEVEL_TEST_SPEAKING.promptText,
            selectedOptionKey: null,
            selectedOptionKeys: [],
            textAnswer: null,
            audioSubmitted: true,
            evaluable: true,
            score: 77,
            confidence: 0.88,
            metrics: [{ metric: "PRONUNCIATION", score: 78 }],
            strengths: ["문장 전체를 끝까지 말했습니다."],
            improvements: ["억양을 조금 더 자연스럽게 연결해 보세요."],
            reasonCode: null,
        },
    ],
};

export async function mockLanguageLearningPhase35(
    page: Page,
    question = LEVEL_TEST_QUESTION,
) {
    await page.route("**/language-learning/level-test/status", (route) =>
        fulfillApiJson(route, responseDto(LEVEL_TEST_STATUS)),
    );
    await page.route("**/language-learning/level-test/sessions", (route) =>
        fulfillApiJson(route, responseDto(LEVEL_TEST_SESSION)),
    );
    await page.route("**/language-learning/level-test/sessions/3101", (route) =>
        fulfillApiJson(route, responseDto(LEVEL_TEST_SESSION)),
    );
    await page.route("**/language-learning/level-test/sessions/3101/current-item", (route) =>
        fulfillApiJson(route, responseDto(question)),
    );
    await page.route("**/language-learning/level-test/items/*/reference-audio", (route) =>
        route.fulfill({ status: 200, contentType: "audio/wav", body: "mock-level-audio" }),
    );
    await page.route("**/language-learning/level-test/sessions/3101/items/*/answers", (route) =>
        fulfillApiJson(
            route,
            responseDto({
                sessionId: 3101,
                itemId: question.itemId,
                questionNumber: question.questionNumber,
                evaluable: true,
                score: 88,
                reasonCode: null,
                completed: false,
                nextQuestion: null,
            }),
        ),
    );
    await page.route("**/language-learning/level-test/sessions/3101/items/*/answers/audio?**", (route) =>
        fulfillApiJson(
            route,
            responseDto({
                sessionId: 3101,
                itemId: question.itemId,
                questionNumber: question.questionNumber,
                evaluable: true,
                score: 82,
                reasonCode: null,
                completed: false,
                nextQuestion: null,
                retentionUntil: "2026-09-05T10:00:00",
            }),
        ),
    );
    await page.route("**/language-learning/level-test/sessions/3101/items/*/evaluation/retry", (route) =>
        fulfillApiJson(
            route,
            responseDto({
                sessionId: 3101,
                itemId: question.itemId,
                questionNumber: question.questionNumber,
                evaluable: true,
                score: 80,
                reasonCode: null,
                completed: false,
                nextQuestion: null,
            }),
        ),
    );
    await page.route("**/language-learning/level-test/sessions/3101/result", (route) =>
        fulfillApiJson(route, responseDto(LEVEL_TEST_RESULT)),
    );
    await page.route("**/language-learning/level-test/history", (route) =>
        fulfillApiJson(route, responseDto(LEVEL_TEST_HISTORY)),
    );
    await page.route("**/language-learning/level-test/history/3101", (route) =>
        fulfillApiJson(route, responseDto(LEVEL_TEST_HISTORY_DETAIL)),
    );
    await page.route("**/language-learning/level-test/history/1101", (route) =>
        fulfillApiJson(
            route,
            responseDto({ summary: LEVEL_TEST_HISTORY[1], items: [] }),
        ),
    );
    await page.route("**/language-learning/history?**", (route) =>
        fulfillApiJson(
            route,
            responseDto([
                {
                    activityId: "LEVEL_TEST:3101",
                    source: "LEVEL_TEST",
                    learningDate: "2026-08-29",
                    title: "Language Level Test",
                    topic: "RECHECK",
                    durationSeconds: 1440,
                    overallScore: 81,
                    completionStatus: "COMPLETED",
                    evaluationStatus: "COMPLETED",
                },
            ]),
        ),
    );
    await page.route("**/language-learning/history/LEVEL_TEST%3A3101", (route) =>
        fulfillApiJson(
            route,
            responseDto({
                activityId: "LEVEL_TEST:3101",
                source: "LEVEL_TEST",
                detail: LEVEL_TEST_HISTORY_DETAIL,
            }),
        ),
    );
}
