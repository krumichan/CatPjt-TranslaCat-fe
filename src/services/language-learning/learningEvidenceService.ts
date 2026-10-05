import { learningEvidenceQuery } from "@/features/language-learning/history/evidenceQuery";
import { apiClient } from "@/lib/apiClient";
import { parseResponseBody } from "@/services/common/responseParser";
import type { LearningEvidenceFilter, LearningEvidencePage } from "@/types/language-learning/historyEvidence";

export const learningEvidenceService = {
    getPage: async (filter: LearningEvidenceFilter, cursor: string | null): Promise<LearningEvidencePage> => {
        const response = await apiClient(`/language-learning/history/evidence?${learningEvidenceQuery(filter, cursor)}`, { method: "GET" });
        const page = await parseResponseBody<LearningEvidencePage>(response, "LanguageLearningEvidence");

        // 구형 서버나 잘못된 응답을 빈 기록으로 바꾸지 않고 조회 실패로 표시한다.
        if (!page || !Array.isArray(page.items) || !(page.nextCursor === null || typeof page.nextCursor === "string")) {
            throw new Error("Invalid learning evidence page");
        }
        return page;
    },
};
