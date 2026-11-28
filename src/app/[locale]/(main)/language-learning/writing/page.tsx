import { LanguageLearningWritingPage } from "@/components/language-learning/writing/LanguageLearningWritingPage";
import type { PreparedWritingSelection } from "@/hooks/language-learning/useDailyWritingPageController";

/** 自動出題のリンクは学習日とタイプを既存の読取画面に渡す。 */
export default async function LanguageLearningWritingRoutePage({
    searchParams,
}: { searchParams: Promise<{ preparedDate?: string | string[]; preparedType?: string | string[] }> }) {
    const { preparedDate, preparedType } = await searchParams;
    const validType = preparedType === "TRANSLATION" || preparedType === "GUIDED" || preparedType === "FREE";
    const prepared: PreparedWritingSelection | undefined =
        typeof preparedDate === "string" && /^\d{4}-\d{2}-\d{2}$/.test(preparedDate) && validType
        ? { date: preparedDate, type: preparedType }
        : undefined;
    return <LanguageLearningWritingPage prepared={prepared} />;
}
