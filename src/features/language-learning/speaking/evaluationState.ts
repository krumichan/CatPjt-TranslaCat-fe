import type {
    SpeakingEvaluation,
    SpeakingReadAloudProblemEvaluation,
    SpeakingSessionDetail,
} from "@/types/language-learning/speaking";

export function isSpeakingEvaluationPending(status: string | null | undefined): boolean {
    return status === "PENDING" || status === "EVALUATING";
}

export function shouldPollSpeakingSession(detail: SpeakingSessionDetail | null | undefined): boolean {
    if (!detail) return true;
    return isSpeakingEvaluationPending(detail.session.evaluationStatus)
        || detail.readAloudProblemEvaluations.some((item) => isSpeakingEvaluationPending(item.status));
}

export function shouldPollSpeakingEvaluation(
    evaluation: SpeakingEvaluation | null | undefined,
    detail: SpeakingSessionDetail | null | undefined,
): boolean {
    if (evaluation) return isSpeakingEvaluationPending(evaluation.status);
    if (!detail) return true;
    const status = detail.session.evaluationStatus;
    // A status/detail request can finish just before the newly committed result request does.
    return isSpeakingEvaluationPending(status) || status === "EVALUATED" || status === "INSUFFICIENT_EVIDENCE";
}

export function canRetryReadAloudEvaluation(item: SpeakingReadAloudProblemEvaluation): boolean {
    return item.status === "FAILED" && (item.manualRetryCount ?? 0) < (item.manualRetryLimit ?? 1);
}

export function readAloudEvaluationStatusKey(status: string): string {
    return ["PENDING", "EVALUATING", "EVALUATED", "INSUFFICIENT_EVIDENCE", "FAILED", "NOT_REQUESTED"].includes(status)
        ? status
        : "UNKNOWN";
}
