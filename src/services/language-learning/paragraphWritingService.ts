import { apiClient } from "@/lib/apiClient";
import { parseResponseBody } from "@/services/common/responseParser";
import { validateParagraphConfig, validateParagraphPlan, validateParagraphPreview } from "@/features/language-learning/writing/paragraphWritingContract";
import type { DailyWritingType } from "@/types/language-learning/common";
import type { ParagraphWritingConfig, ParagraphWritingPlan, ParagraphWritingPreview } from "@/types/language-learning/paragraphWriting";

const root = "/language-learning/writing/curated/plans";
const post = (body: object): RequestInit => ({ method: "POST", body: JSON.stringify(body) });

async function plan(path: string, init: RequestInit): Promise<ParagraphWritingPlan> {
    return validateParagraphPlan(await parseResponseBody<ParagraphWritingPlan>(await apiClient(`${root}${path}`, init), "ParagraphWritingPlan"));
}

export const paragraphWritingService = {
    config: async () => validateParagraphConfig(await parseResponseBody<ParagraphWritingConfig>(
        await apiClient(`${root}/config`, { method: "GET" }), "ParagraphWritingConfig",
    )),
    preview: async (writingType: DailyWritingType, targetItemCount: number, rePractice: boolean) => validateParagraphPreview(
        await parseResponseBody<ParagraphWritingPreview>(await apiClient(`${root}/preview`, post({ writingType, targetItemCount, rePractice })), "ParagraphWritingPreview"),
    ),
    start: (writingType: DailyWritingType, targetItemCount: number, rePractice: boolean, allowPartial: boolean) =>
        plan("", post({ writingType, targetItemCount, rePractice, allowPartial })),
    get: (setId: number) => plan(`/${setId}`, { method: "GET" }),
    history: (date: string, writingType: DailyWritingType) => plan(`/history/${encodeURIComponent(date)}?writingType=${writingType}`, { method: "GET" }),
    expand: (setId: number, targetItemCount: number, planRevision: number) => plan(`/${setId}/target`, post({ targetItemCount, planRevision })),
    restore: (setId: number, planRevision: number) => plan(`/${setId}/restore`, post({ planRevision })),
    submit: (itemId: number, answer: string, contentRevision: string) => plan(`/items/${itemId}/answers`, post({ answer, contentRevision })),
    retryFeedback: (answerId: number) => plan(`/answers/${answerId}/feedback/retry`, post({})),
};
