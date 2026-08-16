import type { LanguageLearningKeyword } from "@/types/language-learning/keyword";

export function getKeywordPrimaryText(
    keyword: LanguageLearningKeyword,
): string {
    return keyword.displayName?.trim() || keyword.text;
}

export function getKeywordSecondaryText(
    keyword: LanguageLearningKeyword,
): string | null {
    const primary = getKeywordPrimaryText(keyword);
    const secondary = keyword.secondaryDisplayName?.trim();

    if (!secondary || secondary === primary) return null;
    return secondary;
}

export function getKeywordSelectText(
    keyword: LanguageLearningKeyword,
): string {
    const primary = getKeywordPrimaryText(keyword);
    const secondary = getKeywordSecondaryText(keyword);

    return secondary ? `${primary} / ${secondary}` : primary;
}
