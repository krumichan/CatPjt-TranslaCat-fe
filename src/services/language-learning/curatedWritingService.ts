import { apiClient } from "@/lib/apiClient";
import { parseResponseBody } from "@/services/common/responseParser";
import type { DailyWritingType } from "@/types/language-learning/common";
import type { CuratedWritingSet } from "@/types/language-learning/curatedWriting";

const root = "/language-learning/writing/curated";

function complete(set: CuratedWritingSet): CuratedWritingSet {
    // 새 정책의 부분/미지 응답은 화면에서 정상 학습 세트로 취급하지 않는다.
    if (set.policyVersion !== "curated-writing-v1" || set.resultPolicy !== "REFERENCE_ONLY" ||
        set.sentenceCount !== 5 || set.generatedItemCount !== 5 || set.items.length !== 5) {
        throw new Error("WRITING_CURATED_CONTRACT_INVALID");
    }
    return set;
}

async function read(response: Response): Promise<CuratedWritingSet> {
    return complete(await parseResponseBody<CuratedWritingSet>(response, "CuratedWritingSet"));
}

export const curatedWritingService = {
    start: async (writingType: DailyWritingType, rePractice = false) => read(await apiClient(`${root}/sets`, {
        method: "POST", body: JSON.stringify({ writingType, rePractice }),
    })),
    get: async (setId: number) => read(await apiClient(`${root}/sets/${setId}`, { method: "GET" })),
    history: async (date: string, writingType: DailyWritingType) => read(await apiClient(
        `${root}/history/${encodeURIComponent(date)}?writingType=${writingType}`, { method: "GET" },
    )),
    submit: async (itemId: number, answer: string, contentRevision: string) => read(await apiClient(
        `${root}/items/${itemId}/answers`, {
            method: "POST", body: JSON.stringify({ answer, contentRevision }),
        },
    )),
    replace: async (setId: number, rePractice = false) => read(await apiClient(
        `${root}/sets/${setId}/replace`, {
            method: "POST", body: JSON.stringify({ rePractice }),
        },
    )),
};
