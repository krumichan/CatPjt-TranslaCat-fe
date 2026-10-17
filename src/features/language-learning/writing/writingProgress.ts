import type { DailyWritingType } from "@/types/language-learning/common";
import type { LearningHistoryItem } from "@/types/language-learning/history";
import type {
    DailyWritingItem,
    WritingAnswerAttempt,
    WritingEvaluationStatus,
} from "@/types/language-learning/daily";
import type { DailyWritingTypeProgress } from "@/types/language-learning/writingProgress";

const WRITING_TYPES: DailyWritingType[] = ["TRANSLATION", "GUIDED", "FREE"];

export function currentWritingHistory(
    history: readonly LearningHistoryItem[],
    learningDate: string,
    originLanguage: string | null | undefined,
    learningLanguage: string | null | undefined,
): LearningHistoryItem[] {
    if (!originLanguage || !learningLanguage) return [];

    // 시간대 전환으로 학습일이 겹쳐도 이전 언어·언어 미상 기록은 현재 작문 진행에 섞지 않는다.
    return history.filter((item) =>
        item.source === "WRITING" && item.learningDate === learningDate &&
        item.originLanguage === originLanguage && item.learningLanguage === learningLanguage,
    );
}

export function resolveHistoryWritingType(
    topic: string | null,
    title: string,
): DailyWritingType | null {
    const candidates = [topic, title.split("·").at(-1)?.trim() ?? null];
    return (
        candidates.find(
            (value): value is DailyWritingType =>
                value != null &&
                WRITING_TYPES.includes(value as DailyWritingType),
        ) ?? null
    );
}

export function createEmptyWritingTypeProgress(): Record<
    DailyWritingType,
    DailyWritingTypeProgress
> {
    return {
        TRANSLATION: {
            state: "NOT_STARTED",
            overallScore: null,
            activityId: null,
        },
        GUIDED: {
            state: "NOT_STARTED",
            overallScore: null,
            activityId: null,
        },
        FREE: {
            state: "NOT_STARTED",
            overallScore: null,
            activityId: null,
        },
    };
}

export function latestAttempt(item: DailyWritingItem): WritingAnswerAttempt | null {
    return item.attempts.at(-1) ?? null;
}

export function latestEvaluationStatus(
    item: DailyWritingItem,
): WritingEvaluationStatus | null {
    return latestAttempt(item)?.evaluationStatus ?? null;
}
