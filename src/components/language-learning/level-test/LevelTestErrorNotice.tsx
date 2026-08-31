"use client";

import { useTranslations } from "next-intl";

interface LevelTestErrorNoticeProps {
    errorCode: string | null;
}

const KNOWN_CODES = new Set([
    "LEVEL_TEST_DAILY_LIMIT_REACHED",
    "LEVEL_TEST_MIC_REQUIRED",
    "LEVEL_TEST_AUDIO_INVALID",
    "LEVEL_TEST_EVALUATION_FAILED",
    "LEVEL_TEST_ITEM_REFRESHED",
    "LEVEL_TEST_NEXT_QUESTION_REFRESH_FAILED",
    "CONTENT_DIVERSITY_EXHAUSTED",
]);

export function LevelTestErrorNotice({ errorCode }: LevelTestErrorNoticeProps) {
    const t = useTranslations("LanguageLearning.levelTest.errors");
    if (!errorCode) return null;
    const key = KNOWN_CODES.has(errorCode) ? errorCode : "UNKNOWN";
    const isPostAnswerNavigationFailure =
        errorCode === "LEVEL_TEST_NEXT_QUESTION_REFRESH_FAILED";

    return (
        <p
            role={isPostAnswerNavigationFailure ? "status" : "alert"}
            className={
                isPostAnswerNavigationFailure
                    ? "rounded-xl bg-amber-50 px-4 py-3 text-sm font-bold text-amber-800 dark:bg-amber-500/10 dark:text-amber-200"
                    : "rounded-xl bg-rose-50 px-4 py-3 text-sm font-bold text-rose-700 dark:bg-rose-500/10 dark:text-rose-200"
            }
        >
            {t(key)}
        </p>
    );
}
