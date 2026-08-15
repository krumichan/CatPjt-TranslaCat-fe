import type { Page } from "@playwright/test";

import { fulfillApiJson, mockCommonPageDependencies } from "./api-mocks";
import { responseDto } from "./mock-data";

export const LANGUAGE_LEARNING_SETTING = {
    originLanguage: "ko",
    learningLanguage: "ja",
    timezone: "Asia/Tokyo",
    dailySentenceCount: 5,
    pendingOriginLanguage: null,
    pendingLearningLanguage: null,
    pendingTimezone: null,
    pendingDailySentenceCount: null,
    pendingEffectiveDate: null,
    minDailySentenceCount: 1,
    maxDailySentenceCount: 20,
    configured: true,
};

export const LANGUAGE_LEARNING_LEVEL_STATUS = {
    profileState: "ACTIVE",
    initialLevelTestCompleted: true,
    recheckRecommended: false,
    activeSessionId: null,
    currentQuestionNumber: null,
    baseLevelScore: 72.5,
};

export const LANGUAGE_LEARNING_EVALUATION = {
    evaluationId: 9001,
    context: "DAILY",
    overall: 84,
    meaning: 90,
    grammar: 82,
    vocabulary: 80,
    naturalness: 86,
    expression: 76,
    strengths: [
        { originText: "의미가 잘 전달되었습니다.", learningText: "意味がよく伝わりました。" },
    ],
    weaknesses: [
        { originText: "조사의 선택을 확인해 보세요.", learningText: "助詞の選択を確認しましょう。" },
    ],
    corrections: [
        {
            original: "昨日友達会いました",
            corrected: "昨日、友達に会いました",
            category: "particle",
            explanation: {
                originText: "만나는 대상에는 に를 사용합니다.",
                learningText: "会う相手には「に」を使います。",
            },
        },
    ],
    recommendedAnswers: [
        "昨日、友達に会いました。",
        "昨日は友達と会いました。",
    ],
    explanation: {
        originText: "전체적으로 의미 전달이 좋습니다.",
        learningText: "全体的に意味伝達が良好です。",
    },
    evaluationRubricVersion: "writing-rubric-v1",
    scoringPolicyVersion: "writing-score-v1",
    promptVersion: "writing-eval-v1",
    evaluatedAt: "2026-08-13T12:00:00",
};

export const LANGUAGE_LEARNING_DAILY_SET = {
    dailySetId: 101,
    learningDate: "2026-08-13",
    snapshotId: "snapshot-e2e",
    status: "READY",
    sentenceCount: 5,
    regenerationCount: 0,
    promptVersion: "daily-writing-v1",
    reviewAvailable: true,
    items: [
        {
            itemId: 1001,
            order: 1,
            difficulty: "REVIEW",
            originText: "나는 어제 친구를 만났다.",
            keywords: ["friend"],
            focusMetrics: ["GRAMMAR"],
            focusReason: "past tense",
            answered: true,
            answeredToday: true,
            canSubmit: false,
            attempts: [
                {
                    answerId: 5001,
                    attemptDate: "2026-08-13",
                    answer: "昨日、友達に会いました。",
                    submittedAt: "2026-08-13T12:00:00",
                    evaluation: LANGUAGE_LEARNING_EVALUATION,
                },
            ],
        },
        ...[2, 3, 4, 5].map((order) => ({
            itemId: 1000 + order,
            order,
            difficulty: order === 5 ? "CHALLENGE" : "NORMAL",
            originText: `E2E Writing 문제 ${order}`,
            keywords: ["IT"],
            focusMetrics: ["MEANING", "NATURALNESS"],
            focusReason: "adaptive",
            answered: false,
            answeredToday: false,
            canSubmit: true,
            attempts: [],
        })),
    ],
};

export const LANGUAGE_LEARNING_PROFILE = {
    profileVersion: "profile-v1",
    state: "ACTIVE",
    baseLevelScore: 72.5,
    calibrationStartedDate: "2026-08-01",
    calibrationCompletedDate: "2026-08-07",
    skillScores: {
        meaning: 82,
        grammar: 74,
        vocabulary: 78,
        naturalness: 76,
        expression: 70,
    },
    difficultyPerformance: { review: 91, normal: 79, challenge: 63 },
    confidence: 88,
    trend: "improving",
    keywordMasteries: [
        { canonicalKey: "IT", score: 81, evaluationCount: 8, selectedCount: 12, lastSelectedDate: "2026-08-13" },
        { canonicalKey: "BUSINESS", score: 68, evaluationCount: 5, selectedCount: 8, lastSelectedDate: "2026-08-12" },
    ],
    grammarWeaknesses: [{ key: "particle", occurrenceCount: 4 }],
    errorPatterns: [{ key: "unnatural-collocation", occurrenceCount: 2 }],
    strengths: [{ key: "meaning", occurrenceCount: 7 }],
    weaknesses: [{ key: "particle", occurrenceCount: 4 }],
    recommendedFocus: [{ key: "naturalness", occurrenceCount: 3 }],
};

export const LANGUAGE_LEARNING_DASHBOARD = {
    todayCompleted: 1,
    todayTotal: 5,
    currentStreak: 6,
    totalStudySentenceCount: 123,
    weeklyAverageScore: 80.4,
    monthlyAverageScore: 78.8,
    skillRadar: LANGUAGE_LEARNING_PROFILE.skillScores,
    metricTrend: [
        { date: "2026-08-11", overall: 74, meaning: 80, grammar: 68, vocabulary: 72, naturalness: 74, expression: 70 },
        { date: "2026-08-12", overall: 79, meaning: 84, grammar: 72, vocabulary: 76, naturalness: 78, expression: 72 },
        { date: "2026-08-13", overall: 84, meaning: 90, grammar: 82, vocabulary: 80, naturalness: 86, expression: 76 },
    ],
    difficultyPerformance: LANGUAGE_LEARNING_PROFILE.difficultyPerformance,
    keywordMastery: LANGUAGE_LEARNING_PROFILE.keywordMasteries,
    grammarWeaknesses: LANGUAGE_LEARNING_PROFILE.grammarWeaknesses,
    errorPatterns: LANGUAGE_LEARNING_PROFILE.errorPatterns,
    recentLearningHistory: [
        { learningDate: "2026-08-13", sentenceCount: 5, status: "READY", averageScore: 84 },
    ],
    monthlyReport: {
        month: "2026-08",
        evaluatedSentenceCount: 42,
        overallAverage: 78.8,
        strongestMetric: "MEANING",
        weakestMetric: "EXPRESSION",
    },
};

export async function mockLanguageLearningBase(page: Page) {
    await mockCommonPageDependencies(page);
    await page.route("**/language-learning/settings", (route) =>
        fulfillApiJson(route, responseDto(LANGUAGE_LEARNING_SETTING)),
    );
    await page.route("**/language-learning/level-test/status", (route) =>
        fulfillApiJson(route, responseDto(LANGUAGE_LEARNING_LEVEL_STATUS)),
    );
    await page.route("**/language-learning/dashboard", (route) =>
        fulfillApiJson(route, responseDto(LANGUAGE_LEARNING_DASHBOARD)),
    );
    await page.route("**/language-learning/profile", (route) =>
        fulfillApiJson(route, responseDto(LANGUAGE_LEARNING_PROFILE)),
    );
    await page.route("**/language-learning/keywords", (route) =>
        fulfillApiJson(
            route,
            responseDto({
                systemKeywords: [
                    { id: 1, text: "IT", source: "SYSTEM", type: "TOPIC", canonicalKey: "IT", active: true, selected: true, pendingEffectiveDate: null },
                ],
                customKeywords: [
                    { id: 10, text: "deployment", source: "CUSTOM", type: "VOCABULARY", canonicalKey: "DEPLOYMENT", active: true, selected: true, pendingEffectiveDate: null },
                ],
            }),
        ),
    );
}
