import { hasCompleteItemCoverage, isGenerationPending } from "@/features/language-learning/generationState";
import type { PracticeQuestion, PracticeSet } from "@/types/language-learning/practice";

export interface PracticeSelection {
    context: string;
    answer: string[];
}

export function firstWorkingIndex(set: PracticeSet): number {
    const unanswered = set.questions.findIndex((item) => !item.answered);
    if (unanswered >= 0) return unanswered;
    const retryable = set.questions.findIndex((item) => item.canRetry && !item.correct);
    if (retryable >= 0) return retryable;
    return Math.max(0, set.questions.length - 1);
}

export function getPracticeCurrentAnswer(question: PracticeQuestion | null): string[] {
    return question?.attempts.at(-1)?.answer ?? [];
}

/** A new response object alone is not a new editing context. */
export function getPracticeSelectionContext(setId: number, question: PracticeQuestion | null): string {
    return JSON.stringify([
        setId,
        question?.questionId,
        question?.canRetry,
        question?.attempts.length,
        question?.attempts.at(-1)?.attemptId,
        getPracticeCurrentAnswer(question),
    ]);
}

export function resolvePracticeSelection(selection: PracticeSelection | null, context: string, initial: string[]): string[] {
    return selection?.context === context ? selection.answer : initial;
}

export function canSubmitPracticeAnswer(question: PracticeQuestion | null, answer: string[], submitting: boolean): boolean {
    return Boolean(question) && !submitting && answer.length > 0 && !question?.correct
        && (question?.attempts.length === 0 || question?.canRetry === true);
}

export function isPracticeComplete(set: PracticeSet | null): boolean {
    return set !== null && set.status === "COMPLETED" && !isGenerationPending(set.generationStatus)
        && hasCompleteItemCoverage(set.questions.map((item) => item.questionId), set.questionCount)
        && set.questions.every((item) => item.answered);
}

export function getWrongOfficialPracticeQuestions(set: PracticeSet) {
    return set.questions.map((q, index) => ({ q, index }))
        .filter(({ q }) => q.attempts.find((attempt) => attempt.official)?.correct === false);
}
