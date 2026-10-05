import type { LearningSource, LearningHistorySourceFilter } from "@/types/language-learning/history";

export type LearningEvidenceResultKind = "SCORED_EVALUATION" | "SESSION_COACHING" | "UNKNOWN";

export interface LearningEvidenceItem {
    activityId: string;
    source: LearningSource;
    learningDate: string;
    learningLanguage: string | null;
    originLanguage: string | null;
    title: string;
    resultKind: LearningEvidenceResultKind;
    policyVersion: string | null;
    status: string;
    resultStatus: string | null;
    // 목록의 저장 metadata 완전성이다. 현재 원문/코칭 근거의 유효성은 상세에서 따로 확인한다.
    availability: "AVAILABLE" | "LIMITED";
    limitations: string[];
    // 상세 조회 연결 제공 여부이며 현재 사용자의 접근 허가나 원문 유효성을 보증하지 않는다.
    detailAvailable: boolean;
}

export interface LearningEvidencePage {
    items: LearningEvidenceItem[];
    nextCursor: string | null;
}

export interface LearningEvidenceFilter {
    source: LearningHistorySourceFilter;
    learningLanguage: string;
    from: string;
    to: string;
    resultKind: "" | LearningEvidenceResultKind;
    policyVersion: string;
}
