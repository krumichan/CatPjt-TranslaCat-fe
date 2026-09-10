import type { LanguageLearningKeyword } from "@/types/language-learning/keyword";

function sortKeywords(keywords: LanguageLearningKeyword[]) {
    return [...keywords].sort(
        (left, right) =>
            (left.sortOrder ?? 0) - (right.sortOrder ?? 0) ||
            left.id - right.id,
    );
}

export function groupSystemKeywords(input: LanguageLearningKeyword[]) {
    const keywords = sortKeywords(input);
    const topics = keywords.filter((keyword) =>
        keyword.type === "TOPIC" && (keyword.parentKeywordId ?? null) === null,
    );
    const topicIds = new Set(topics.map((topic) => topic.id));
    const ungrouped = keywords.filter((keyword) =>
        !topicIds.has(keyword.id)
        && (!keyword.parentKeywordId || !topicIds.has(keyword.parentKeywordId)),
    );
    return { keywords, topics, ungrouped };
}
