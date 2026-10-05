"use client";

import { DailyWritingSmartPage } from "@/components/language-learning/writing/DailyWritingSmartPage";
import { CuratedWritingSmartPage } from "@/components/language-learning/writing/CuratedWritingSmartPage";

export function LanguageLearningWritingPage() {
    return process.env.NEXT_PUBLIC_WRITING_CURATED_QA === "true"
        ? <CuratedWritingSmartPage />
        : <DailyWritingSmartPage />;
}
