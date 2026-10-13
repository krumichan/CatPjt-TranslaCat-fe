import { WRITING_PREPARATION_REASONS, type WritingPreparation } from "@/types/language-learning/writingPreparation";

export const PREPARATION_CONTRACT_ERROR = "WRITING_PREPARATION_CONTRACT_INVALID";
const keys = ["requestKey", "preparationId", "status", "policyVersion", "catalogId", "reviewStatus", "qaOnly", "failureCode", "provider", "model", "requiresReconciliation", "writingType", "targetBand", "topicKey", "repairOfRequestKey", "repairNotes", "repairMode", "canRepair", "repairBlockedReason", "quality", "candidate"];
function check(value: unknown): asserts value { if (!value) throw new Error(PREPARATION_CONTRACT_ERROR); }
function object(value: unknown, expected: string[]): asserts value is Record<string, unknown> {
    check(value && typeof value === "object" && !Array.isArray(value));
    check(Object.keys(value).sort().join("|") === [...expected].sort().join("|"));
}
const text = (value: unknown, max = 5000) => typeof value === "string" && value.trim().length > 0 && value.length <= max;
const key = (value: unknown) => typeof value === "string" && /^[a-zA-Z0-9._-]{1,80}$/.test(value);
const topic = (value: unknown) => typeof value === "string" && /^[a-z0-9][a-z0-9-]{2,79}$/.test(value);

export function validateWritingPreparation(raw: unknown): WritingPreparation {
    // 서버의 출고·검수 상태를 확대 해석하지 않는다. 예상하지 않은 답안/점수 필드도 거절한다.
    object(raw, keys);
    check(key(raw.requestKey) && text(raw.preparationId, 80) && topic(raw.catalogId));
    check(["RUNNING", "GENERATED", "SUCCEEDED", "FAILED", "UNCERTAIN"].includes(String(raw.status)));
    check(["curated-writing-generation-v1", "curated-writing-generation-v2"].includes(String(raw.policyVersion)));
    check(raw.qaOnly === true && raw.reviewStatus === "DRAFT");
    check(["TRANSLATION", "GUIDED", "FREE"].includes(String(raw.writingType)));
    check(typeof raw.targetBand === "number" && Number.isInteger(raw.targetBand) && raw.targetBand >= 1 && raw.targetBand <= 5 && topic(raw.topicKey));
    check(raw.repairMode === (raw.writingType === "TRANSLATION" && raw.targetBand === 2 ? "CORE_REPLACEMENT" : "CONTENT_REPAIR"));
    check((raw.repairOfRequestKey === null && raw.repairNotes === null) || (key(raw.repairOfRequestKey) && raw.repairOfRequestKey !== raw.requestKey && text(raw.repairNotes, 2000)));
    check(raw.failureCode === null || (typeof raw.failureCode === "string" && /^[A-Z][A-Z0-9_]{0,79}$/.test(raw.failureCode)));
    check(raw.provider === null || text(raw.provider, 80));
    check(raw.model === null || text(raw.model, 120));
    check(raw.requiresReconciliation === ["RUNNING", "UNCERTAIN"].includes(String(raw.status)));
    check(typeof raw.canRepair === "boolean");
    check(raw.canRepair ? raw.repairBlockedReason === null && raw.repairOfRequestKey === null && ["SUCCEEDED", "FAILED"].includes(String(raw.status)) :
        ["NOT_FINISHED", "NO_SAVED_CONTENT", "REPAIR_LIMIT", "CONTENT_EXHAUSTED"].includes(String(raw.repairBlockedReason)));
    const q = raw.quality;
    object(q, ["contractStatus", "semanticStatus", "humanReview", "releaseStatus", "reasonCodes"]);
    check(q.contractStatus === (raw.status === "SUCCEEDED" ? "PASSED" : raw.status === "FAILED" ? "FAILED" : "PENDING"));
    check(q.semanticStatus === "NOT_REVIEWED" && q.humanReview === "NOT_PERFORMED" && q.releaseStatus === "QA_ONLY");
    check(Array.isArray(q.reasonCodes) && q.reasonCodes.includes("AUTOMATED_CHECK_ONLY") && new Set(q.reasonCodes).size === q.reasonCodes.length);
    check(q.reasonCodes.every((reason) => WRITING_PREPARATION_REASONS.includes(reason)));
    check(q.reasonCodes.includes("CORE_CONTENT_FIXED") === (raw.repairMode === "CORE_REPLACEMENT"));
    check(q.reasonCodes.includes("EXECUTION_UNCERTAIN") === raw.requiresReconciliation);

    // 성공 후보의 공개 요구만 허용하며 참고 답안은 제출 경로에서만 제공한다.
    if (raw.status !== "SUCCEEDED") check(raw.candidate === null);
    else {
        check(raw.failureCode === null);
        const candidate = raw.candidate;
        object(candidate, ["catalogId", "contentHash", "writingType", "targetBand", "topicKey", "prompt", "providedFacts", "requiredIntents", "responseConstraints", "visibleRequirements"]);
        check(candidate.catalogId === raw.catalogId && candidate.writingType === raw.writingType && candidate.targetBand === raw.targetBand);
        check(typeof candidate.contentHash === "string" && /^[a-f0-9]{64}$/.test(candidate.contentHash));
        check(topic(candidate.topicKey) && text(candidate.prompt, 2000));
        for (const name of ["providedFacts", "requiredIntents", "responseConstraints", "visibleRequirements"]) {
            const lines = candidate[name];
            check(Array.isArray(lines) && lines.length <= 8 && lines.every((line) => text(line)));
            check(name === "visibleRequirements" ? lines.length > 0 : raw.writingType === "GUIDED" ? lines.length > 0 : lines.length === 0);
        }
    }
    return raw as unknown as WritingPreparation;
}
