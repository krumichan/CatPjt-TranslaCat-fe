import { apiClient } from "@/lib/apiClient";
import { parseResponseBody } from "@/services/common/responseParser";
import { validateWritingPreparation } from "@/features/language-learning/writing/writingPreparationContract";
import type { WritingPreparationRequest } from "@/types/language-learning/writingPreparation";

export function createWritingPreparationService(loginSessionId: string) {
    if (!loginSessionId) throw new Error("WRITING_LOGIN_SESSION_REQUIRED");
    const root = "/language-learning/writing/curated/preparations";
    const read = async (path: string, init: RequestInit) => validateWritingPreparation(
        await parseResponseBody<unknown>(await apiClient(`${root}${path}`, init, loginSessionId), "WritingPreparation"),
    );
    // 유료 명령의 자동 재시도는 없다. 조회와 명시적 명령을 호출부에서도 구분한다.
    return {
        get: (requestKey: string) => read(`/${encodeURIComponent(requestKey)}`, { method: "GET" }),
        prepare: (body: WritingPreparationRequest) => read("", { method: "POST", body: JSON.stringify(body) }),
    };
}
