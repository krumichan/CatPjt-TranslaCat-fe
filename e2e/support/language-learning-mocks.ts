import type { Page } from "@playwright/test";

import { fulfillApiJson, mockCommonPageDependencies } from "./api-mocks";
import { responseDto } from "./mock-data";

export const LANGUAGE_LEARNING_SETTING = {
    originLanguage: "ko",
    learningLanguage: "ja",
    timezone: "Asia/Tokyo",
    dailySentenceCount: 5,
    dailySpeakingGoalMinutes: 5,
    speakingVoiceId: "Aoede",
    speakingPlaybackSpeed: "NORMAL",
    dailyListeningGoalCount: 5,
    defaultListeningTaskTypes: ["DICTATION"],
    pendingOriginLanguage: null,
    pendingLearningLanguage: null,
    pendingTimezone: null,
    pendingDailySentenceCount: null,
    pendingDailySpeakingGoalMinutes: null,
    pendingDailyListeningGoalCount: null,
    pendingEffectiveDate: null,
    minDailySentenceCount: 1,
    maxDailySentenceCount: 20,
    minDailySpeakingGoalMinutes: 3,
    maxDailySpeakingGoalMinutes: 20,
    minDailyListeningGoalCount: 1,
    maxDailyListeningGoalCount: 20,
    configured: true,
};

export const LANGUAGE_LEARNING_LEVEL_STATUS = {
    profileState: "ACTIVE",
    initialLevelTestCompleted: true,
    recheckRecommended: false,
    activeSessionId: null,
    currentQuestionNumber: null,
    baseLevelScore: 72.5,
    proficiencyBand: "UPPER_INTERMEDIATE",
};

export const LANGUAGE_LEARNING_KEYWORDS = {
    systemKeywords: [
        {
            id: 1,
            text: "IT",
            displayName: "IT",
            secondaryDisplayName: null,
            source: "SYSTEM",
            type: "TOPIC",
            canonicalKey: "IT",
            parentKeywordId: null,
            parentCanonicalKey: null,
            sortOrder: 600,
            active: true,
            selected: true,
            pendingEffectiveDate: null,
        },
        {
            id: 2,
            text: "deployment",
            displayName: "배포",
            secondaryDisplayName: null,
            source: "SYSTEM",
            type: "VOCABULARY",
            canonicalKey: "IT_DEPLOYMENT",
            parentKeywordId: 1,
            parentCanonicalKey: "IT",
            sortOrder: 640,
            active: true,
            selected: false,
            pendingEffectiveDate: null,
        },
        {
            id: 3,
            text: "Shopping",
            displayName: "쇼핑",
            secondaryDisplayName: null,
            source: "SYSTEM",
            type: "TOPIC",
            canonicalKey: "SHOPPING",
            parentKeywordId: null,
            parentCanonicalKey: null,
            sortOrder: 400,
            active: true,
            selected: false,
            pendingEffectiveDate: null,
        },
        {
            id: 4,
            text: "price",
            displayName: "가격",
            secondaryDisplayName: null,
            source: "SYSTEM",
            type: "VOCABULARY",
            canonicalKey: "SHOPPING_PRICE",
            parentKeywordId: 3,
            parentCanonicalKey: "SHOPPING",
            sortOrder: 410,
            active: true,
            selected: true,
            pendingEffectiveDate: null,
        },
    ],
    customKeywords: [
        {
            id: 10,
            text: "deployment",
            displayName: null,
            secondaryDisplayName: null,
            source: "CUSTOM",
            type: "VOCABULARY",
            canonicalKey: "DEPLOYMENT",
            parentKeywordId: 1,
            parentCanonicalKey: "IT",
            sortOrder: 0,
            active: true,
            selected: true,
            pendingEffectiveDate: null,
        },
    ],
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
    learningLanguage: "ja",
    from: "2026-08-01",
    to: "2026-08-23",
    source: "ALL",
    integratedAbility: {
        overall: 79,
        confidence: "HIGH",
        measuredMetricCount: 8,
        totalMetricCount: 10,
        groups: [
            { group: "COMPREHENSION", score: 82, measuredMetricCount: 3 },
            { group: "EXPRESSION", score: 77, measuredMetricCount: 2 },
            { group: "ACCURACY", score: 78, measuredMetricCount: 2 },
            { group: "SPEECH", score: 76, measuredMetricCount: 3 },
        ],
        metrics: [
            { metric: "MEANING", score: 83, sampleCount: 8, confidence: "HIGH", collectingData: false },
            { metric: "GRAMMAR", score: 78, sampleCount: 7, confidence: "HIGH", collectingData: false },
            { metric: "VOCABULARY", score: 80, sampleCount: 8, confidence: "HIGH", collectingData: false },
            { metric: "PRONUNCIATION", score: 76, sampleCount: 5, confidence: "MEDIUM", collectingData: false },
            { metric: "LISTENING_INDEPENDENCE", score: 75, sampleCount: 5, confidence: "MEDIUM", collectingData: false },
        ],
    },
    activityPerformance: {
        writing: { recentScore: 84, coverage: { evaluated: 5, total: 5 }, today: { completed: 5, target: 5, unit: "문장" }, sampleCount: 12, collectingData: false },
        speaking: { recentScore: 81, coverage: { evaluated: 8, total: 8 }, today: { completed: 4, target: 5, unit: "분" }, sampleCount: 6, collectingData: false },
        listening: { recentScore: 84, coverage: { evaluated: 2, total: 3 }, today: { completed: 3, target: 5, unit: "문제" }, sampleCount: 10, collectingData: false },
        reading: { recentScore: null, coverage: { evaluated: 0, total: 0 }, today: { completed: 0, target: 0, unit: "문제" }, sampleCount: 0, collectingData: true },
    },
    growth: [
        { metric: "LISTENING_RECOGNITION", source: "LISTENING", taskType: "DICTATION", previousAverage: 72, recentAverage: 78, delta: 6, previousSampleCount: 5, recentSampleCount: 5 },
    ],
    weaknesses: [
        { key: "PRONUNCIATION", state: "IMPROVING", evidenceCount: 3, recentScore: 69, sources: ["LISTENING", "SPEAKING"], recommendedFocus: "따라 말하기" },
    ],
    recommendations: [
        { recommendationId: 501, targetMetric: "PRONUNCIATION", recommendedActivity: "LISTENING", recommendedTask: "REPEAT_AFTER_AUDIO", reason: "발음 재현 연습을 이어가 보세요.", ctaLabel: "따라 말하기 시작", priority: 1, status: "ACTIVE", expiresAt: "2026-08-30T12:00:00" },
    ],
    trends: {
        sourceMetrics: {
            source: "ALL",
            sampleCount: 10,
            confidence: 0.88,
            collectingData: false,
            metrics: {
                GRAMMAR: [{ date: "2026-08-22", score: 78 }],
                FLUENCY: [{ date: "2026-08-22", score: 79 }],
                PRONUNCIATION: [{ date: "2026-08-22", score: 76 }],
                LISTENING_RECOGNITION: [{ date: "2026-08-23", score: 84 }],
            },
        },
        listeningTasks: [
            { taskType: "DICTATION", date: "2026-08-23", averageScore: 88, sampleCount: 5 },
            { taskType: "REPEAT_AFTER_AUDIO", date: "2026-08-23", averageScore: 80, sampleCount: 5 },
        ],
        listeningMetrics: [
            { taskType: "DICTATION", metric: "LISTENING_RECOGNITION", date: "2026-08-23", averageScore: 88, sampleCount: 5 },
            { taskType: "REPEAT_AFTER_AUDIO", metric: "PRONUNCIATION", date: "2026-08-23", averageScore: 80, sampleCount: 5 },
        ],
    },
    // Keep the Phase 2 widget-isolation regression payload marker.
    speakingSummary: { sessions: 4 },
};

export async function mockLanguageLearningBase(page: Page) {
    await mockCommonPageDependencies(page);
    await page.route("**/language-learning/settings", (route) =>
        fulfillApiJson(route, responseDto(LANGUAGE_LEARNING_SETTING)),
    );
    await page.route("**/language-learning/level-test/status", (route) =>
        fulfillApiJson(route, responseDto(LANGUAGE_LEARNING_LEVEL_STATUS)),
    );
    await page.route("**/language-learning/level-test/history", (route) =>
        fulfillApiJson(route, responseDto([])),
    );
    await page.route("**/language-learning/dashboard**", (route) =>
        fulfillApiJson(route, responseDto(LANGUAGE_LEARNING_DASHBOARD)),
    );
    await page.route("**/language-learning/profile", (route) =>
        fulfillApiJson(route, responseDto(LANGUAGE_LEARNING_PROFILE)),
    );
    await page.route("**/language-learning/history?**", (route) =>
        fulfillApiJson(route, responseDto([{ activityId: "WRITING:101", source: "WRITING", learningDate: "2026-08-13", title: "Daily Writing", topic: null, durationSeconds: 0, overallScore: 84, completionStatus: "COMPLETED", evaluationStatus: "EVALUATED" }])),
    );
    await page.route("**/language-learning/history/WRITING%3A101", (route) =>
        fulfillApiJson(route, responseDto({ activityId: "WRITING:101", source: "WRITING", detail: LANGUAGE_LEARNING_DAILY_SET })),
    );
    await page.route("**/language-learning/keywords", (route) =>
        fulfillApiJson(
            route,
            responseDto(LANGUAGE_LEARNING_KEYWORDS),
        ),
    );
}

export const LANGUAGE_LEARNING_LISTENING_POLICY = {
    enabled: true,
    defaultItemCount: 5,
    minItemCount: 1,
    maxItemCount: 20,
    hardItemLimit: 30,
    resumeHours: 2,
    referenceAudioRetentionDays: 7,
    userAudioRetentionDays: 7,
    reportedAudioRetentionDays: 30,
    automaticRetryLimit: 2,
    manualRetryLimit: 1,
    practiceAttemptLimit: 1,
    profilePolicyVersion: "listening-profile-v1",
    modelConfigVersion: "listening-model-v1",
    referenceTtsRegenerationEnabled: false,
};

export const LANGUAGE_LEARNING_LISTENING_DAILY_SET = {
    dailySetId: 701,
    learningDate: "2026-08-23",
    originLanguage: "ko",
    learningLanguage: "ja",
    difficulty: "MY_LEVEL",
    status: "READY",
    targetItemCount: 5,
    physicalItemCount: 5,
    readyItemCount: 5,
    completedItemCount: 1,
    failureReason: null,
    items: [1, 2, 3, 4, 5].map((itemIndex) => ({
        itemId: 710 + itemIndex,
        itemIndex,
        replacementSequence: 0,
        status: "READY",
        playable: true,
        audioDurationMs: 8000,
    })),
};

const LISTENING_AUDIO_AVAILABILITY = {
    available: true,
    expired: false,
    retentionUntil: "2026-08-30T12:00:00",
    deletedAt: null,
};

export const LANGUAGE_LEARNING_LISTENING_ATTEMPT = {
    attemptId: 801,
    itemId: 711,
    attemptNo: 1,
    evaluationPurpose: "OFFICIAL",
    status: "IN_PROGRESS",
    answerRevealed: false,
    contentOverallScore: null,
    listeningIndependenceScore: null,
    overallScore: null,
    playbackSummary: {
        normalPlaybackCount: 0,
        slowPlaybackCount: 0,
        policyVersion: null,
    },
    evaluatedTaskCount: 0,
    coverage: 0,
    errorCode: null,
    tasks: [
        {
            taskResponseId: 901,
            taskType: "DICTATION",
            status: "IN_PROGRESS",
            answerText: null,
            audioUploaded: false,
            audioDurationMs: null,
            audioAvailability: null,
            rerecordCount: 0,
            assistanceLevel: "INDEPENDENT",
            assistanceUsage: [],
            evaluationErrorCode: null,
            evaluation: null,
        },
        {
            taskResponseId: 902,
            taskType: "INTERPRETATION",
            status: "NOT_SELECTED",
            answerText: null,
            audioUploaded: false,
            audioDurationMs: null,
            audioAvailability: null,
            rerecordCount: 0,
            assistanceLevel: "INDEPENDENT",
            assistanceUsage: [],
            evaluationErrorCode: null,
            evaluation: null,
        },
        {
            taskResponseId: 903,
            taskType: "REPEAT_AFTER_AUDIO",
            status: "IN_PROGRESS",
            answerText: null,
            audioUploaded: false,
            audioDurationMs: null,
            audioAvailability: LISTENING_AUDIO_AVAILABILITY,
            rerecordCount: 0,
            assistanceLevel: "INDEPENDENT",
            assistanceUsage: [],
            evaluationErrorCode: null,
            evaluation: null,
        },
    ],
};

export const LANGUAGE_LEARNING_LISTENING_SESSION = {
    sessionId: 702,
    dailySetId: 701,
    status: "IN_PROGRESS",
    selectedTaskTypes: ["DICTATION", "REPEAT_AFTER_AUDIO"],
    completedItemCount: 1,
    evaluatedItemCount: 1,
    actualDurationMs: 52000,
    startedAt: "2026-08-23T11:55:00",
    lastActivityAt: "2026-08-23T12:00:00",
    resumableUntil: "2026-08-23T14:00:00",
    attempts: [LANGUAGE_LEARNING_LISTENING_ATTEMPT],
};

export const LANGUAGE_LEARNING_LISTENING_ITEM = {
    sessionId: 702,
    itemId: 711,
    itemIndex: 1,
    status: "READY",
    playable: true,
    referenceAudioPath: "/api/v1/language-learning/listening/items/711/audio",
    audioDurationMs: 8000,
    topicHint: "週末の予定",
    keywordHints: ["友達", "映画"],
    sourceText: null,
    referenceMeanings: null,
    attempt: LANGUAGE_LEARNING_LISTENING_ATTEMPT,
};

const LISTENING_DICTATION_EVALUATION = {
    evaluationId: 9501,
    taskType: "DICTATION",
    evaluable: true,
    score: 88,
    confidence: 0.92,
    reasonCode: null,
    metrics: [
        { metric: "LISTENING_RECOGNITION", score: 90 },
        { metric: "ORTHOGRAPHY", score: 86 },
    ],
    strengths: ["핵심 단어를 정확히 들었습니다."],
    improvements: ["장음 표기를 조금 더 확인해 보세요."],
    recommendedAnswers: ["明日は友達と映画を見に行きます。"],
    evaluatedAt: "2026-08-23T12:03:00",
};

const LISTENING_REPEAT_EVALUATION = {
    evaluationId: 9502,
    taskType: "REPEAT_AFTER_AUDIO",
    evaluable: true,
    score: 80,
    confidence: 0.88,
    reasonCode: null,
    metrics: [
        { metric: "PRONUNCIATION", score: 79 },
        { metric: "FLUENCY", score: 81 },
    ],
    strengths: ["문장 전체를 끊기지 않고 말했습니다."],
    improvements: ["억양의 높낮이를 조금 더 살려 보세요."],
    recommendedAnswers: [],
    evaluatedAt: "2026-08-23T12:03:00",
};

export const LANGUAGE_LEARNING_LISTENING_RESULT = {
    sessionId: 702,
    status: "COMPLETED",
    learnedItemCount: 5,
    evaluatedItemCount: 5,
    averageScore: 84,
    coverage: 2 / 3,
    attempts: [
        {
            ...LANGUAGE_LEARNING_LISTENING_ATTEMPT,
            status: "EVALUATED",
            contentOverallScore: 86,
            listeningIndependenceScore: 75,
            overallScore: 84,
            playbackSummary: {
                normalPlaybackCount: 2,
                slowPlaybackCount: 1,
                policyVersion: "listening-independence-v1",
            },
            evaluatedTaskCount: 2,
            coverage: 2 / 3,
            tasks: [
                {
                    ...LANGUAGE_LEARNING_LISTENING_ATTEMPT.tasks[0],
                    status: "EVALUATED",
                    answerText: "明日は友達と映画を見に行きます。",
                    evaluation: LISTENING_DICTATION_EVALUATION,
                },
                LANGUAGE_LEARNING_LISTENING_ATTEMPT.tasks[1],
                {
                    ...LANGUAGE_LEARNING_LISTENING_ATTEMPT.tasks[2],
                    status: "EVALUATED",
                    audioUploaded: true,
                    audioDurationMs: 8200,
                    audioAvailability: LISTENING_AUDIO_AVAILABILITY,
                    evaluation: LISTENING_REPEAT_EVALUATION,
                },
            ],
        },
    ],
};

export const LANGUAGE_LEARNING_LISTENING_HISTORY_DETAIL = {
    session: { ...LANGUAGE_LEARNING_LISTENING_SESSION, status: "COMPLETED" },
    attempts: [
        {
            itemId: 711,
            itemIndex: 1,
            sourceText: "明日は友達と映画を見に行きます。",
            referenceMeanings: ["내일 친구와 영화를 보러 갑니다."],
            referenceAudio: LISTENING_AUDIO_AVAILABILITY,
            attempt: LANGUAGE_LEARNING_LISTENING_RESULT.attempts[0],
        },
    ],
};

export async function mockLanguageLearningPhase3(page: Page) {
    await page.route("**/language-learning/listening/policy", (route) =>
        fulfillApiJson(route, responseDto(LANGUAGE_LEARNING_LISTENING_POLICY)),
    );
    await page.route("**/language-learning/listening/today", (route) =>
        fulfillApiJson(route, responseDto(LANGUAGE_LEARNING_LISTENING_DAILY_SET)),
    );
    await page.route("**/language-learning/listening/daily-sets", (route) =>
        fulfillApiJson(route, responseDto(LANGUAGE_LEARNING_LISTENING_DAILY_SET)),
    );
    await page.route("**/language-learning/listening/sessions", (route) =>
        fulfillApiJson(route, responseDto(LANGUAGE_LEARNING_LISTENING_SESSION)),
    );
    await page.route("**/language-learning/listening/sessions/active", (route) =>
        fulfillApiJson(route, responseDto({ active: false, session: null })),
    );
    await page.route("**/language-learning/listening/sessions/702", (route) =>
        fulfillApiJson(route, responseDto(LANGUAGE_LEARNING_LISTENING_SESSION)),
    );
    await page.route("**/language-learning/listening/sessions/702/resume", (route) =>
        fulfillApiJson(route, responseDto(LANGUAGE_LEARNING_LISTENING_SESSION)),
    );
    await page.route("**/language-learning/listening/sessions/702/items/711", (route) =>
        fulfillApiJson(route, responseDto(LANGUAGE_LEARNING_LISTENING_ITEM)),
    );
    await page.route("**/language-learning/listening/sessions/702/items/711/playbacks", (route) =>
        fulfillApiJson(route, responseDto(null)),
    );
    await page.route("**/language-learning/listening/items/711/audio", async (route) => {
        if (route.request().resourceType() === "document") return route.fallback();
        await route.fulfill({ status: 200, contentType: "audio/webm", body: "mock-audio" });
    });
    await page.route("**/language-learning/listening/attempts/801/responses/**", (route) => {
        const url = route.request().url();
        const taskType = url.includes("REPEAT_AFTER_AUDIO") ? "REPEAT_AFTER_AUDIO" : url.includes("INTERPRETATION") ? "INTERPRETATION" : "DICTATION";
        const task = LANGUAGE_LEARNING_LISTENING_ATTEMPT.tasks.find((item) => item.taskType === taskType) ?? LANGUAGE_LEARNING_LISTENING_ATTEMPT.tasks[0];
        return fulfillApiJson(route, responseDto({ ...task, status: "IN_PROGRESS" }));
    });
    await page.route("**/language-learning/listening/attempts/801/audio-upload**", (route) =>
        fulfillApiJson(route, responseDto({ taskResponseId: 903, durationMs: 8200, rerecordCount: 1, retentionUntil: "2026-08-30T12:00:00" })),
    );
    await page.route("**/language-learning/listening/attempts/801/answer", (route) =>
        fulfillApiJson(route, responseDto({ attemptId: 801, sourceText: "明日は友達と映画を見に行きます。", referenceMeanings: ["내일 친구와 영화를 보러 갑니다."], excludedFromProgress: true, excludedFromProfile: true })),
    );
    await page.route("**/language-learning/listening/attempts/801/submit", (route) =>
        fulfillApiJson(route, responseDto({ ...LANGUAGE_LEARNING_LISTENING_ATTEMPT, status: "EVALUATING" })),
    );
    await page.route("**/language-learning/listening/attempts/801/retry-evaluation", (route) =>
        fulfillApiJson(route, responseDto({ ...LANGUAGE_LEARNING_LISTENING_RESULT.attempts[0], status: "EVALUATING" })),
    );
    await page.route("**/language-learning/listening/sessions/702/items/711/practice-attempts", (route) =>
        fulfillApiJson(route, responseDto({ ...LANGUAGE_LEARNING_LISTENING_ATTEMPT, attemptId: 802, attemptNo: 2, evaluationPurpose: "PRACTICE" })),
    );
    await page.route("**/language-learning/listening/attempts/801/skip", (route) =>
        fulfillApiJson(route, responseDto({ ...LANGUAGE_LEARNING_LISTENING_ATTEMPT, status: "SKIPPED" })),
    );
    await page.route("**/language-learning/listening/responses/**/audio", async (route) => {
        await route.fulfill({ status: 200, contentType: "audio/webm", body: "mock-user-audio" });
    });
    await page.route("**/language-learning/listening/responses/**/reports", (route) =>
        fulfillApiJson(route, responseDto({ reportId: 9901, taskResponseId: 903, status: "OPEN", consentToRetainAudio: false, audioRetentionUntil: "2026-08-30T12:00:00" })),
    );
    await page.route("**/language-learning/listening/sessions/702/complete", (route) =>
        fulfillApiJson(route, responseDto(LANGUAGE_LEARNING_LISTENING_RESULT)),
    );
    await page.route("**/language-learning/listening/sessions/702/result", (route) =>
        fulfillApiJson(route, responseDto(LANGUAGE_LEARNING_LISTENING_RESULT)),
    );
    await page.route("**/language-learning/history?**", (route) =>
        fulfillApiJson(route, responseDto([
            { activityId: "LISTENING:702", source: "LISTENING", learningDate: "2026-08-23", title: "AI Listening", topic: "週末", durationSeconds: 320, overallScore: 84, completionStatus: "COMPLETED", evaluationStatus: "EVALUATED", taskTypes: ["DICTATION", "REPEAT_AFTER_AUDIO"] },
            { activityId: "WRITING:101", source: "WRITING", learningDate: "2026-08-13", title: "Daily Writing", topic: null, durationSeconds: 0, overallScore: 84, completionStatus: "COMPLETED", evaluationStatus: "EVALUATED" },
        ])),
    );
    await page.route("**/language-learning/history/LISTENING%3A702", (route) =>
        fulfillApiJson(route, responseDto({ activityId: "LISTENING:702", source: "LISTENING", detail: LANGUAGE_LEARNING_LISTENING_HISTORY_DETAIL })),
    );
    await page.route("**/language-learning/recommendations/**/dismiss", (route) =>
        fulfillApiJson(route, responseDto(null)),
    );
}

export const LANGUAGE_LEARNING_SPEAKING_TOPICS = [
    {
        id: 201,
        topicCode: "DAILY_WEEKEND",
        category: "DAILY",
        title: "週末の予定",
        description: "週末の予定について自然に会話します。",
        originLanguage: "ko",
        learningLanguage: "ja",
        recommendedLevel: "B1",
        recommendedStartMode: "AI_FIRST",
        sortOrder: 1,
        version: 1,
    },
    {
        id: 202,
        topicCode: "TRAVEL_HOTEL",
        category: "TRAVEL",
        title: "ホテルチェックイン",
        description: "ホテルのチェックイン場面を練習します。",
        originLanguage: "ko",
        learningLanguage: "ja",
        recommendedLevel: "A2",
        recommendedStartMode: "TOPIC_RECOMMENDED",
        sortOrder: 2,
        version: 1,
    },
];

export const LANGUAGE_LEARNING_SPEAKING_SESSION = {
    id: 301,
    learningDate: "2026-08-15",
    topicId: 201,
    topicTitle: "週末の予定",
    topicCategory: "DAILY",
    topicVersion: 1,
    customTopic: null,
    goal: "自然に質問を続ける",
    persona: null,
    originLanguage: "ko",
    learningLanguage: "ja",
    status: "IN_PROGRESS",
    evaluationStatus: "NOT_REQUESTED",
    conversationStartMode: "AI_FIRST",
    resolvedStartMode: "AI_FIRST",
    correctionMode: "CONVERSATION",
    targetMinutes: 5,
    maxTurns: 20,
    completedTurns: 5,
    totalDurationSeconds: 72,
    voiceId: "Aoede",
    playbackSpeed: "NORMAL",
    openingAssistantText: "今週末は何をする予定ですか？",
    openingAssistantAudioUrl: "/api/v1/language-learning/speaking/sessions/301/audio/opening",
    sessionSummary: "週末の予定について会話中",
    startedAt: "2026-08-15T08:00:00",
    completedAt: null,
    lastActivityAt: "2026-08-15T08:05:00",
};

export const LANGUAGE_LEARNING_SPEAKING_TURNS = Array.from({ length: 5 }, (_, index) => ({
    id: 401 + index,
    turnIndex: index + 1,
    status: "READY",
    durationSeconds: index === 0 ? 16 : 14,
    transcript: index === 0 ? "友達と映画を見に行く予定です。" : `E2E Speaking answer ${index + 1}`,
    sttConfidence: 0.94,
    userAudioUrl: `/api/v1/language-learning/speaking/sessions/301/turns/${401 + index}/audio/user`,
    assistantText: index === 0 ? "いいですね。どんな映画を見る予定ですか？" : `AI response ${index + 1}`,
    assistantAudioUrl: `/api/v1/language-learning/speaking/sessions/301/turns/${401 + index}/audio`,
    assistanceUsage:
        index === 0
            ? ["REPLAY", "HINT", "HINT", "SAMPLE_ANSWER"]
            : index === 1
              ? ["TRANSLATION"]
              : [],
    excludedFromEvaluation: false,
    failedStage: null,
    errorCode: null,
    errorMessage: null,
    manualRetryCount: 0,
    completedAt: "2026-08-15T08:05:00",
}));

export const LANGUAGE_LEARNING_SPEAKING_ELIGIBILITY = {
    validUserTurns: 5,
    validUserSpeechSeconds: 72,
    validSttTurnRatio: 1,
    requiredUserTurns: 5,
    requiredUserSpeechSeconds: 60,
    requiredSttTurnRatio: 0.8,
    requiredEvaluationConfidence: 0.7,
    eligible: true,
    missingRequirements: [],
};

export const LANGUAGE_LEARNING_SPEAKING_DETAIL = {
    session: LANGUAGE_LEARNING_SPEAKING_SESSION,
    dailyUsage: {
        sessionCount: 1,
        usedMinutes: 4,
        dailySessionLimit: 5,
        dailySpeakingHardLimitMinutes: 30,
        dailyGoalMinutes: 5,
    },
    turns: LANGUAGE_LEARNING_SPEAKING_TURNS,
    evaluationEligibility: LANGUAGE_LEARNING_SPEAKING_ELIGIBILITY,
    resumable: true,
};

export const LANGUAGE_LEARNING_SPEAKING_EVALUATION = {
    evaluationId: 501,
    sessionId: 301,
    status: "EVALUATED",
    overallScore: 82,
    evaluationConfidence: 0.88,
    metrics: [
        ["GRAMMAR", 84], ["VOCABULARY", 80], ["NATURALNESS", 81], ["MEANING", 88],
        ["EXPRESSIVENESS", 76], ["FLUENCY", 79], ["PRONUNCIATION", 78], ["INTERACTION", 86],
    ].map(([metricType, score], index) => ({
        metricType,
        state: "EVALUATED",
        score,
        confidence: 0.86,
        summary: `${metricType} feedback`,
        notEvaluableReason: null,
        evidenceJson: JSON.stringify([{ turnId: String(401 + Math.min(index, 4)), startMs: 0, endMs: 1200, message: "Evidence phrase" }]),
    })),
    strengthsJson: JSON.stringify(["질문에 자연스럽게 반응했습니다."]),
    improvementsJson: JSON.stringify(["조금 더 다양한 연결 표현을 사용해 보세요."]),
    recommendedExpressionsJson: JSON.stringify([{ original: "映画を見る", recommended: "映画を観に行く", explanation: "상황에 더 자연스러운 표현입니다." }]),
    pronunciationPracticeJson: JSON.stringify([{ target: "予定です", practicePhrase: "週末の予定です。", reason: "장음을 의식해서 천천히 연습해 보세요.", evidenceTurnIds: ["401"] }]),
    eligibilityJson: JSON.stringify({ validTurns: 5, speakingSeconds: 72, sttValidRatio: 1 }),
    evaluationVersion: "speaking-eval-v1",
    scoringPolicyVersion: "speaking-score-v1",
    promptVersion: "speaking-eval-prompt-v1",
    evaluatedAt: "2026-08-15T08:10:00",
};

export const LANGUAGE_LEARNING_UNIFIED_HISTORY = [
    {
        activityId: "SPEAKING:301",
        source: "SPEAKING",
        learningDate: "2026-08-15",
        title: "週末の予定",
        topic: "DAILY",
        durationSeconds: 72,
        overallScore: 82,
        completionStatus: "COMPLETED",
        evaluationStatus: "EVALUATED",
    },
    {
        activityId: "WRITING:101",
        source: "WRITING",
        learningDate: "2026-08-13",
        title: "Daily Writing",
        topic: null,
        durationSeconds: 0,
        overallScore: 84,
        completionStatus: "COMPLETED",
        evaluationStatus: "EVALUATED",
    },
];

export const LANGUAGE_LEARNING_ADMIN_SETTING = {
    defaultDailySentenceCount: 5,
    minDailySentenceCount: 1,
    maxDailySentenceCount: 20,
    dailyKeywordMaxCount: 5,
    reviewAvailableDays: 7,
    levelRecheckRecommendationDays: 30,
    adaptiveWritingEnabled: true,
    aiEvaluationEnabled: true,
    speakingEnabled: true,
    speakingEvaluationEnabled: true,
    defaultDailySpeakingGoalMinutes: 5,
    minDailySpeakingGoalMinutes: 3,
    maxDailySpeakingGoalMinutes: 20,
    dailySpeakingHardLimitMinutes: 30,
    dailySpeakingSessionLimit: 5,
    maxSessionMinutes: 10,
    maxTurnsPerSession: 20,
    minValidAudioSeconds: 1,
    maxTurnAudioSeconds: 60,
    maxAudioFileBytes: 10485760,
    rawAudioRetentionDays: 7,
    reportedAudioRetentionDays: 30,
    activeSessionResumeHours: 2,
    automaticRetryLimitPerStage: 2,
    manualRetryLimitPerStage: 1,
    sttTimeoutSeconds: 30,
    ttsTimeoutSeconds: 30,
    evaluationTimeoutSeconds: 60,
};

export async function mockLanguageLearningPhase2(page: Page) {
    await page.route("**/language-learning/speaking/topics**", (route) =>
        fulfillApiJson(route, responseDto(LANGUAGE_LEARNING_SPEAKING_TOPICS)),
    );
    await page.route("**/language-learning/speaking/sessions/active", (route) =>
        fulfillApiJson(route, responseDto(null)),
    );
    await page.route("**/language-learning/speaking/sessions/301/evaluation/retry", (route) =>
        fulfillApiJson(route, responseDto(null)),
    );
    await page.route("**/language-learning/speaking/sessions/301/evaluation", (route) =>
        fulfillApiJson(route, responseDto(LANGUAGE_LEARNING_SPEAKING_EVALUATION)),
    );
    await page.route("**/language-learning/speaking/sessions/301/turns/upload-url", (route) =>
        fulfillApiJson(route, responseDto({ turnId: 406, turnIndex: 6, uploadToken: "upload-token", uploadUrl: "/mock-upload", expiresAt: "2026-08-15T09:00:00" })),
    );
    await page.route("**/language-learning/speaking/sessions/301/turns", (route) =>
        fulfillApiJson(route, responseDto({ ...LANGUAGE_LEARNING_SPEAKING_TURNS[0], id: 406, turnIndex: 6, transcript: "新しい回答です。" })),
    );
    await page.route("**/language-learning/speaking/sessions/301/turns/*/retry", (route) =>
        fulfillApiJson(route, responseDto(LANGUAGE_LEARNING_SPEAKING_TURNS[0])),
    );
    await page.route("**/language-learning/speaking/sessions/301/turns/*/exclude", (route) =>
        fulfillApiJson(route, responseDto({ ...LANGUAGE_LEARNING_SPEAKING_TURNS[0], excludedFromEvaluation: true, status: "EXCLUDED" })),
    );
    await page.route("**/language-learning/speaking/sessions/301/turns/*/stt-reports", (route) =>
        fulfillApiJson(route, responseDto({ id: 701, reportReference: "STT-701", sessionId: 301, turnId: 401, reportType: "WRONG_TEXT", reportStatus: "OPEN", expectedText: null, audioAnalysisConsent: true, audioRetentionUntil: "2026-09-14T08:05:00", supportRequested: false, supportReference: null, resolvedAt: null })),
    );
    await page.route("**/language-learning/speaking/stt-reports/701/support", (route) =>
        fulfillApiJson(route, responseDto({ id: 701, reportReference: "STT-701", sessionId: 301, turnId: 401, reportType: "WRONG_TEXT", reportStatus: "OPEN", expectedText: null, audioAnalysisConsent: true, audioRetentionUntil: "2026-09-14T08:05:00", supportRequested: true, supportReference: "SUP-701", resolvedAt: null })),
    );
    await page.route("**/language-learning/speaking/sessions/301/assistance", async (route) => {
        const request = route.request().postDataJSON() as { type: string };
        const payloads: Record<string, { content: string | null; audioUrl: string | null; playbackRate: number }> = {
            REPLAY: { content: null, audioUrl: LANGUAGE_LEARNING_SPEAKING_TURNS[4].assistantAudioUrl, playbackRate: 1 },
            SLOW_PLAYBACK: { content: null, audioUrl: LANGUAGE_LEARNING_SPEAKING_TURNS[4].assistantAudioUrl, playbackRate: 0.75 },
            SHOW_QUESTION: { content: LANGUAGE_LEARNING_SPEAKING_TURNS[4].assistantText, audioUrl: null, playbackRate: 1 },
            HINT: { content: "친구와 무엇을 할지 나타내는 동사를 떠올려 보세요.", audioUrl: null, playbackRate: 1 },
            TRANSLATION: { content: "주말에 무엇을 할 예정인가요?", audioUrl: null, playbackRate: 1 },
            SAMPLE_ANSWER: { content: "今週末は友達と映画を観に行く予定です。", audioUrl: null, playbackRate: 1 },
        };
        await fulfillApiJson(
            route,
            responseDto({
                type: request.type,
                targetTurnId: 405,
                appliesToTurnIndex: 6,
                ...payloads[request.type],
            }),
        );
    });
    await page.route("**/language-learning/speaking/sessions/301/complete", async (route) => {
        const request = route.request().postDataJSON() as { skipEvaluation?: boolean };
        await fulfillApiJson(
            route,
            responseDto({
                ...LANGUAGE_LEARNING_SPEAKING_SESSION,
                status: request.skipEvaluation ? "COMPLETED" : "EVALUATING",
                evaluationStatus: request.skipEvaluation ? "NOT_REQUESTED" : "PENDING",
                completedAt: "2026-08-15T08:08:00",
            }),
        );
    });
    await page.route("**/language-learning/speaking/sessions/301", (route) =>
        fulfillApiJson(route, responseDto(LANGUAGE_LEARNING_SPEAKING_DETAIL)),
    );
    await page.route("**/language-learning/speaking/sessions", (route) =>
        fulfillApiJson(route, responseDto(LANGUAGE_LEARNING_SPEAKING_SESSION)),
    );
    await page.route("**/language-learning/history?**", (route) =>
        fulfillApiJson(route, responseDto(LANGUAGE_LEARNING_UNIFIED_HISTORY)),
    );
    await page.route("**/language-learning/history/SPEAKING%3A301", (route) =>
        fulfillApiJson(route, responseDto({ activityId: "SPEAKING:301", source: "SPEAKING", detail: { session: LANGUAGE_LEARNING_SPEAKING_SESSION, turns: LANGUAGE_LEARNING_SPEAKING_TURNS, evaluation: LANGUAGE_LEARNING_SPEAKING_EVALUATION } })),
    );
    await page.route("**/language-learning/history/WRITING%3A101", (route) =>
        fulfillApiJson(route, responseDto({ activityId: "WRITING:101", source: "WRITING", detail: LANGUAGE_LEARNING_DAILY_SET })),
    );
    await page.route("**/admin/language-learning/settings", (route) =>
        fulfillApiJson(route, responseDto(LANGUAGE_LEARNING_ADMIN_SETTING)),
    );
}
