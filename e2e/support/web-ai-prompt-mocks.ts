import type { WebAiPlan } from "../../src/types/language-learning/webAi";

/** LL WebAiPrompt의 회차 식별자·상세 피드백·결과 계약을 가진 합성 테스트 응답이다. */
export function mockWebAiRunPrompt(plan: WebAiPlan, runId: string): string {
    return [
        "You are my language learning tutor. Follow these settings throughout this learning session.",
        `Source language: ${plan.originLanguage}`,
        `Learning language: ${plan.learningLanguage}`,
        `Explanation and feedback language: ${plan.feedbackLanguage}`,
        `Plan: ${plan.name}; Run ID: ${runId}`,
        `QUESTION ALLOCATION: ${JSON.stringify(plan.areas)}`,
        `KEYWORDS: ${JSON.stringify(plan.keywords)}`,
        "FEEDBACK AFTER EACH SUBMISSION: Give detailed feedback and an original expression | suggested expression | reason table.",
        "TRANSLACAT RESULT TRANSFER: POST /api/v1/language-learning/web-ai/external/results only with a separately supplied plan token and an HTTP tool.",
        "Otherwise output a JSON code block for the user to import in TranslaCat's Web AI learning plans page.",
        "Submit only answered items, at most 10 per request. Reuse submissionId and exact payload on network retry.",
        "JSON FORMAT:",
        JSON.stringify({
            runId,
            submissionId: "a-unique-batch-id",
            originalFeedbackMarkdown: "full original detailed feedback in Markdown",
            items: [{
                itemId: "WRITING_TRANSLATION:STANDARD:1",
                areaCode: "WRITING_TRANSLATION",
                difficulty: "STANDARD",
                promptText: "complete task instructions",
                sourceText: "complete source text",
                passageText: null,
                requiredIntents: [],
                answerText: "learner's unmodified answer",
                externalScore: null,
                externalFeedbackMarkdown: "full feedback for this item",
                keywordKeys: [],
            }],
        }, null, 2),
    ].join("\n\n");
}
