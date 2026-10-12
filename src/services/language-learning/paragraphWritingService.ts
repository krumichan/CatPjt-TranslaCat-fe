import { apiClient } from "@/lib/apiClient";
import { parseResponseBody } from "@/services/common/responseParser";
import { validateParagraphConfig, validateParagraphPlan, validateParagraphPreview } from "@/features/language-learning/writing/paragraphWritingContract";
import type { DailyWritingType } from "@/types/language-learning/common";
import type { ParagraphWritingConfig, ParagraphWritingPlan, ParagraphWritingPreview } from "@/types/language-learning/paragraphWriting";

const root = "/language-learning/writing/curated/plans";
const post = (body: object): RequestInit => ({ method: "POST", body: JSON.stringify(body) });

export function createParagraphWritingService(loginSessionId: string) {
    if (!loginSessionId) throw new Error("WRITING_LOGIN_SESSION_REQUIRED");

    // 화면을 연 로그인에 요청을 묶어, 계정 전환 뒤의 늦은 동작을 새 계정으로 전송하지 않는다.
    const request = (path: string, init: RequestInit) => apiClient(`${root}${path}`, init, loginSessionId);
    const plan = async (path: string, init: RequestInit): Promise<ParagraphWritingPlan> =>
        validateParagraphPlan(await parseResponseBody<ParagraphWritingPlan>(await request(path, init), "ParagraphWritingPlan"));

    return {
        config: async () => validateParagraphConfig(await parseResponseBody<ParagraphWritingConfig>(
            await request("/config", { method: "GET" }), "ParagraphWritingConfig",
        )),
        preview: async (writingType: DailyWritingType, targetItemCount: number, rePractice: boolean) => validateParagraphPreview(
            await parseResponseBody<ParagraphWritingPreview>(await request("/preview", post({ writingType, targetItemCount, rePractice })), "ParagraphWritingPreview"),
        ),
        start: (writingType: DailyWritingType, targetItemCount: number, rePractice: boolean, allowPartial: boolean) =>
            plan("", post({ writingType, targetItemCount, rePractice, allowPartial })),
        get: (setId: number) => plan(`/${setId}`, { method: "GET" }),
        history: (date: string, writingType: DailyWritingType) => plan(`/history/${encodeURIComponent(date)}?writingType=${writingType}`, { method: "GET" }),
        expand: (setId: number, targetItemCount: number, planRevision: number) => plan(`/${setId}/target`, post({ targetItemCount, planRevision })),
        restore: (setId: number, planRevision: number) => plan(`/${setId}/restore`, post({ planRevision })),
        delete: async (setId: number, planRevision: number) => {
            const result = await parseResponseBody<{ dailySetId: number; deleted: boolean }>(
                await request(`/${setId}/delete`, post({ planRevision })), "ParagraphWritingDeletion",
            );
            if (String(result.dailySetId) !== String(setId) || result.deleted !== true) throw new Error("WRITING_PARAGRAPH_CONTRACT_INVALID");
            return result;
        },
        submit: (itemId: number, answer: string, contentRevision: string) => plan(`/items/${itemId}/answers`, post({ answer, contentRevision })),
        retryFeedback: (answerId: number) => plan(`/answers/${answerId}/feedback/retry`, post({})),
    };
}
