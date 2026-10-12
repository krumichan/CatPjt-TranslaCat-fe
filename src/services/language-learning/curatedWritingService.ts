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

export function createCuratedWritingService(loginSessionId: string) {
    if (!loginSessionId) throw new Error("WRITING_LOGIN_SESSION_REQUIRED");
    // 화면을 연 로그인에 모든 요청을 묶어 계정 전환 뒤 이전 문항을 새 계정으로 전송하지 않는다.
    const request = (path: string, init: RequestInit) => apiClient(`${root}${path}`, init, loginSessionId);
    return {
        start: async (writingType: DailyWritingType, rePractice = false) => read(await request("/sets", {
            method: "POST", body: JSON.stringify({ writingType, rePractice }),
        })),
        get: async (setId: number) => read(await request(`/sets/${setId}`, { method: "GET" })),
        history: async (date: string, writingType: DailyWritingType) => read(await request(
            `/history/${encodeURIComponent(date)}?writingType=${writingType}`, { method: "GET" },
        )),
        submit: async (itemId: number, answer: string, contentRevision: string) => read(await request(
            `/items/${itemId}/answers`, {
                method: "POST", body: JSON.stringify({ answer, contentRevision }),
            },
        )),
        replace: async (setId: number, rePractice = false) => read(await request(
            `/sets/${setId}/replace`, {
                method: "POST", body: JSON.stringify({ rePractice }),
            },
        )),
    };
}
