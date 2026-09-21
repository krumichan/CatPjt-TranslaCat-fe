import type { PracticeSet } from "@/types/language-learning/practice";

export interface ReadingPassageExpression {
    passageId: string;
    expression: string;
    sourceQuotes: string[];
}

/** Optional display only. Missing/malformed enrichment never changes completion. */
export function readingPassageExpressions(set: PracticeSet, passageId?: string | null): ReadingPassageExpression[] {
    if (set.domain !== "READING") return [];
    const result: ReadingPassageExpression[] = [];
    for (const [id, orders] of [["p1", [1, 2, 3]], ["p2", [4, 5]]] as const) {
        if (passageId && id !== passageId) continue;
        const questions = orders.map((order) => set.questions.filter((question) => question.order === order));
        if (questions.some((matches) => matches.length !== 1 || !matches[0].answered || matches[0].passageId !== id)) continue;
        const completed = questions.map(([question]) => question);
        const passage = completed[0].passageText;
        if (!passage || completed.some((question) => question.passageText !== passage)) continue;
        const candidates = completed.flatMap((question) => Array.isArray(question.vocabularyCandidates) ? question.vocabularyCandidates : []);
        const seen = new Set<string>();
        for (const candidate of candidates) {
            if (typeof candidate !== "string") continue;
            const expression = candidate.trim();
            if (!expression || seen.has(expression) || !passage.includes(expression)) continue;
            seen.add(expression);
            // Preserve all matching original paragraphs, not a guessed single offset.
            const sourceQuotes = [...new Set(passage.split(/\r?\n\s*\r?\n/).filter((quote) => quote.includes(expression)))];
            result.push({ passageId: id, expression, sourceQuotes });
            if (seen.size === 3) break;
        }
    }
    return result;
}
