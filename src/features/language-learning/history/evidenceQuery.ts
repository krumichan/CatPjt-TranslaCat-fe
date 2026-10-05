import type { LearningEvidenceFilter } from "@/types/language-learning/historyEvidence";

export function learningEvidenceQuery(filter: LearningEvidenceFilter, cursor: string | null): string {
    // owner는 인증 세션에서 결정한다. 화면의 조회 조건만 읽기 요청에 전달한다.
    const params = new URLSearchParams({ from: filter.from, to: filter.to, limit: "25" });
    if (filter.source !== "ALL") params.set("source", filter.source);
    if (filter.learningLanguage.trim()) params.set("learningLanguage", filter.learningLanguage.trim());
    if (filter.resultKind) params.set("resultKind", filter.resultKind);
    if (filter.policyVersion.trim()) params.set("policyVersion", filter.policyVersion.trim());
    if (cursor) params.set("cursor", cursor);
    return params.toString();
}

export function initialLearningEvidenceFilter(now = new Date()): LearningEvidenceFilter {
    // 조회 창의 기본값만 브라우저 날짜로 준비하며 과거 기록의 저장 날짜·시간대는 변경하지 않는다.
    const day = (value: Date) => [value.getFullYear(), String(value.getMonth() + 1).padStart(2, "0"), String(value.getDate()).padStart(2, "0")].join("-");
    const start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 29);
    return { source: "ALL", learningLanguage: "", from: day(start), to: day(now), resultKind: "", policyVersion: "" };
}
