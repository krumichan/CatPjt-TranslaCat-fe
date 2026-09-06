import { apiClient } from "@/lib/apiClient";
import { parseResponseBody } from "@/services/common/responseParser";
import type {
    ListeningActiveSession,
    ListeningAssistanceType,
    ListeningAssistanceUsage,
    ListeningAttempt,
    ListeningAudioUpload,
    ListeningDailyModeStatus,
    ListeningDailySet,
    ListeningDailySetCreateRequest,
    ListeningEvaluationReport,
    ListeningEvaluationReportRequest,
    ListeningItem,
    ListeningPolicy,
    ListeningPlaybackRequest,
    ListeningPracticeAttemptRequest,
    ListeningResponseUpsertRequest,
    ListeningRetryRequest,
    ListeningRevealAnswer,
    ListeningSession,
    ListeningSessionCreateRequest,
    ListeningSessionResult,
    ListeningSkipRequest,
    ListeningSubmitRequest,
    ListeningTask,
    ListeningTaskType,
} from "@/types/language-learning/listening";

function jsonBody(value: unknown): RequestInit {
    return { method: "POST", body: JSON.stringify(value) };
}

export const listeningService = {
    getTodayStatus: async (): Promise<ListeningDailyModeStatus[]> => {
        const response = await apiClient("/language-learning/listening/today/status", { method: "GET" });
        return parseResponseBody<ListeningDailyModeStatus[]>(response, "ListeningTodayStatus");
    },

    getToday: async (): Promise<ListeningDailySet> => {
        const response = await apiClient("/language-learning/listening/today", { method: "GET" });
        return parseResponseBody<ListeningDailySet>(response, "ListeningToday");
    },

    createDailySet: async (request: ListeningDailySetCreateRequest = {}): Promise<ListeningDailySet> => {
        const response = await apiClient("/language-learning/listening/daily-sets", jsonBody(request));
        return parseResponseBody<ListeningDailySet>(response, "ListeningDailySet");
    },

    retryGeneration: async (dailySetId: number): Promise<ListeningDailySet> => {
        const response = await apiClient(`/language-learning/listening/daily-sets/${dailySetId}/retry-generation`, { method: "POST" });
        return parseResponseBody<ListeningDailySet>(response, "ListeningRetryGeneration");
    },

    retryTts: async (itemId: number): Promise<ListeningDailySet> => {
        const response = await apiClient(`/language-learning/listening/items/${itemId}/retry-tts`, { method: "POST" });
        return parseResponseBody<ListeningDailySet>(response, "ListeningRetryTts");
    },

    referenceAudioUrl: (itemId: number) => `/language-learning/listening/items/${itemId}/audio`,

    fetchReferenceAudio: async (itemId: number): Promise<Blob> => {
        const response = await apiClient(`/language-learning/listening/items/${itemId}/audio`, { method: "GET" });
        if (!response.ok) throw new Error(`Reference audio request failed. status=${response.status}`);
        return response.blob();
    },

    getPolicy: async (): Promise<ListeningPolicy> => {
        const response = await apiClient("/language-learning/listening/policy", { method: "GET" });
        return parseResponseBody<ListeningPolicy>(response, "ListeningPolicy");
    },

    createSession: async (request: ListeningSessionCreateRequest): Promise<ListeningSession> => {
        const response = await apiClient("/language-learning/listening/sessions", jsonBody(request));
        return parseResponseBody<ListeningSession>(response, "ListeningSession");
    },

    getActiveSession: async (): Promise<ListeningActiveSession> => {
        const response = await apiClient("/language-learning/listening/sessions/active", { method: "GET" });
        return parseResponseBody<ListeningActiveSession>(response, "ListeningActiveSession");
    },

    getSession: async (sessionId: number): Promise<ListeningSession> => {
        const response = await apiClient(`/language-learning/listening/sessions/${sessionId}`, { method: "GET" });
        return parseResponseBody<ListeningSession>(response, "ListeningSession");
    },

    resumeSession: async (sessionId: number): Promise<ListeningSession> => {
        const response = await apiClient(`/language-learning/listening/sessions/${sessionId}/resume`, { method: "POST" });
        return parseResponseBody<ListeningSession>(response, "ListeningResume");
    },

    getItem: async (sessionId: number, itemId: number): Promise<ListeningItem> => {
        const response = await apiClient(`/language-learning/listening/sessions/${sessionId}/items/${itemId}`, { method: "GET" });
        return parseResponseBody<ListeningItem>(response, "ListeningItem");
    },


    recordPlayback: async (
        sessionId: number,
        itemId: number,
        request: ListeningPlaybackRequest,
    ): Promise<void> => {
        const response = await apiClient(
            `/language-learning/listening/sessions/${sessionId}/items/${itemId}/playbacks`,
            jsonBody(request),
        );
        if (!response.ok) {
            await parseResponseBody<never>(response, "ListeningPlayback");
        }
    },

    saveText: async (
        attemptId: number,
        taskType: ListeningTaskType,
        request: ListeningResponseUpsertRequest,
    ): Promise<ListeningTask> => {
        const response = await apiClient(`/language-learning/listening/attempts/${attemptId}/responses/${taskType}`, jsonBody(request));
        return parseResponseBody<ListeningTask>(response, "ListeningResponse");
    },

    saveAssistance: async (
        attemptId: number,
        taskType: ListeningTaskType,
        usage: ListeningAssistanceUsage[],
    ): Promise<ListeningTask> => {
        const response = await apiClient(`/language-learning/listening/attempts/${attemptId}/responses/${taskType}/assistance`, jsonBody(usage));
        return parseResponseBody<ListeningTask>(response, "ListeningAssistance");
    },

    useAttemptAssistance: async (
        attemptId: number,
        assistanceType: ListeningAssistanceType,
    ): Promise<ListeningAttempt> => {
        const response = await apiClient(
            `/language-learning/listening/attempts/${attemptId}/assistance/${assistanceType}`,
            { method: "POST" },
        );
        return parseResponseBody<ListeningAttempt>(response, "ListeningAttemptAssistance");
    },

    uploadAudio: async (
        attemptId: number,
        audio: Blob,
        durationMs: number,
    ): Promise<ListeningAudioUpload> => {
        const formData = new FormData();
        formData.append("audio", audio, "listening-repeat.webm");
        const response = await apiClient(
            `/language-learning/listening/attempts/${attemptId}/audio-upload?durationMs=${Math.max(0, Math.round(durationMs))}`,
            { method: "POST", body: formData },
        );
        return parseResponseBody<ListeningAudioUpload>(response, "ListeningAudioUpload");
    },

    submit: async (attemptId: number, request: ListeningSubmitRequest): Promise<ListeningAttempt> => {
        const response = await apiClient(`/language-learning/listening/attempts/${attemptId}/submit`, jsonBody(request));
        return parseResponseBody<ListeningAttempt>(response, "ListeningSubmit");
    },

    retryEvaluation: async (attemptId: number, request: ListeningRetryRequest): Promise<ListeningAttempt> => {
        const response = await apiClient(`/language-learning/listening/attempts/${attemptId}/retry-evaluation`, jsonBody(request));
        return parseResponseBody<ListeningAttempt>(response, "ListeningRetryEvaluation");
    },

    revealAnswer: async (attemptId: number): Promise<ListeningRevealAnswer> => {
        const response = await apiClient(`/language-learning/listening/attempts/${attemptId}/answer`, { method: "POST" });
        return parseResponseBody<ListeningRevealAnswer>(response, "ListeningRevealAnswer");
    },

    createPractice: async (
        sessionId: number,
        itemId: number,
        request: ListeningPracticeAttemptRequest,
    ): Promise<ListeningAttempt> => {
        const response = await apiClient(`/language-learning/listening/sessions/${sessionId}/items/${itemId}/practice-attempts`, jsonBody(request));
        return parseResponseBody<ListeningAttempt>(response, "ListeningPracticeAttempt");
    },

    skip: async (attemptId: number, request: ListeningSkipRequest): Promise<ListeningAttempt> => {
        const response = await apiClient(`/language-learning/listening/attempts/${attemptId}/skip`, jsonBody(request));
        return parseResponseBody<ListeningAttempt>(response, "ListeningSkip");
    },

    fetchUserAudio: async (taskResponseId: number): Promise<Blob> => {
        const response = await apiClient(`/language-learning/listening/responses/${taskResponseId}/audio`, { method: "GET" });
        if (!response.ok) {
            await parseResponseBody<never>(response, "ListeningUserAudio");
            throw new Error("Listening user audio request failed.");
        }
        return response.blob();
    },

    report: async (taskResponseId: number, request: ListeningEvaluationReportRequest): Promise<ListeningEvaluationReport> => {
        const response = await apiClient(`/language-learning/listening/responses/${taskResponseId}/reports`, jsonBody(request));
        return parseResponseBody<ListeningEvaluationReport>(response, "ListeningEvaluationReport");
    },

    complete: async (sessionId: number, actualDurationMs: number): Promise<ListeningSessionResult> => {
        const response = await apiClient(`/language-learning/listening/sessions/${sessionId}/complete`, jsonBody({ actualDurationMs }));
        return parseResponseBody<ListeningSessionResult>(response, "ListeningComplete");
    },

    getResult: async (sessionId: number): Promise<ListeningSessionResult> => {
        const response = await apiClient(`/language-learning/listening/sessions/${sessionId}/result`, { method: "GET" });
        return parseResponseBody<ListeningSessionResult>(response, "ListeningResult");
    },

    dismissRecommendation: async (recommendationId: number): Promise<void> => {
        const response = await apiClient(`/language-learning/recommendations/${recommendationId}/dismiss`, { method: "POST" });
        if (!response.ok) throw new Error(`Dismiss recommendation failed. status=${response.status}`);
    },
};
