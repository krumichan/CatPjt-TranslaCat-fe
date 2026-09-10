import type { SpeakingSessionDetail, SpeakingTurn } from "@/types/language-learning/speaking";

import { LANGUAGE_LEARNING_SPEAKING_DETAIL, LANGUAGE_LEARNING_SPEAKING_TURNS } from "./language-learning-mocks";

/** Current READ_ALOUD policy: five problems, two required attempts, optional third. */
export function createReadAloudDetail(attemptCount: 0 | 1 | 2 | 3 = 2): SpeakingSessionDetail {
    const detail = structuredClone(LANGUAGE_LEARNING_SPEAKING_DETAIL);
    const scriptText = "明日は友達と映画を見に行きます。";
    const turns: SpeakingTurn[] = Array.from({ length: attemptCount }, (_, index) => ({
        ...structuredClone(LANGUAGE_LEARNING_SPEAKING_TURNS[0]),
        id: 401 + index,
        turnIndex: index + 1,
        problemIndex: 1,
        attemptIndex: index + 1,
        recordingRevision: 0,
        durationSeconds: 4,
        transcript: scriptText,
        assistanceUsage: [],
        userAudioUrl: `/api/v1/language-learning/speaking/sessions/301/turns/${401 + index}/audio/user`,
        // The next problem prompt must be ready before submitting the current problem.
        assistantText: "駅まで一緒に歩きましょう。",
        promptGuide: { scriptText: "駅まで一緒に歩きましょう。", providedFacts: [], requiredIntents: [], responseConstraints: [] },
    }));
    return {
        ...detail,
        session: {
            ...detail.session,
            practiceMode: "READ_ALOUD",
            goal: null,
            persona: null,
            completedTurns: attemptCount,
            totalDurationSeconds: 4 * attemptCount,
            openingAssistantText: scriptText,
            openingPromptGuide: { scriptText, providedFacts: [], requiredIntents: [], responseConstraints: [] },
        },
        turns,
        readAloudProblemEvaluations: [],
        evaluationEligibility: {
            ...detail.evaluationEligibility,
            validUserTurns: attemptCount,
            validUserSpeechSeconds: 4 * attemptCount,
            validSttTurnRatio: attemptCount > 0 ? 1 : 0,
            requiredUserTurns: 10,
            requiredUserSpeechSeconds: 0,
            eligible: false,
            missingRequirements: ["VALID_USER_TURNS"],
        },
    };
}
