import type { WebAiSchedule } from "@/features/language-learning/web-ai/webAiSchedule";

export interface WebAiPlan extends WebAiSchedule {
    revision: number;
    enabled: boolean;
    updatedAt: string;
}

export type WebAiPlanRequest = Omit<WebAiSchedule, "id" | "originLanguage" | "learningLanguage" | "feedbackLanguage"> & {
    id?: string;
    enabled: boolean;
    revision?: number;
};

export interface WebAiConnection {
    token: string;
    planId: string;
    promptUrl: string;
    resultUrl: string;
    bootstrapPrompt: string;
}

export interface WebAiRun {
    id: string;
    planId: string;
    executionKey: string;
    prompt: string;
    createdAt: string;
}

export interface WebAiSubmittedItem {
    itemId: string;
    areaCode: string;
    difficulty: "EASY" | "STANDARD" | "HARD";
    promptText: string;
    answerText: string;
    passageText?: string | null;
    sourceText?: string | null;
    requiredIntents: string[];
    externalScore?: number | null;
    externalFeedbackMarkdown: string;
    keywordKeys: string[];
}

export interface WebAiResultImport {
    runId: string;
    submissionId: string;
    originalFeedbackMarkdown: string;
    items: WebAiSubmittedItem[];
}

export interface WebAiFeedback {
    summary?: string;
    strengths?: string[];
    improvements?: string[];
    corrections?: { original: string; corrected: string; category?: string; explanation: string }[];
    recommendedAnswers?: string[];
    explanation?: string;
}

export interface WebAiVerifiedItem {
    item: WebAiSubmittedItem;
    status: string;
    officialScore: number | null;
    feedback: WebAiFeedback;
    reason?: string | null;
    metrics: { code: string; value: number }[];
}

export interface WebAiResult {
    id: string;
    runId: string;
    status: string;
    originalFeedbackMarkdown: string;
    items: WebAiVerifiedItem[];
    createdAt: string;
    updatedAt: string;
    originLanguage: string;
    learningLanguage: string;
    feedbackLanguage: string;
    planName: string;
    learningDate?: string;
}
