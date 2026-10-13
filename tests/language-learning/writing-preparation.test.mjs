import assert from "node:assert/strict";
import test from "node:test";
import { validateWritingPreparation, PREPARATION_CONTRACT_ERROR } from "../../src/features/language-learning/writing/writingPreparationContract.ts";
import { paragraphDraftKey, removeParagraphPlanDrafts } from "../../src/features/language-learning/writing/paragraphWritingDrafts.ts";

const candidate = () => ({ catalogId: "gen-test-123", contentHash: "a".repeat(64), writingType: "TRANSLATION", targetBand: 2,
    topicKey: "library-use", prompt: "도서관에서 책을 빌렸어요.", providedFacts: [], requiredIntents: [], responseConstraints: [], visibleRequirements: ["빌린 사실을 전달한다."] });
const ready = () => ({ requestKey: "test-123", preparationId: "prep-123", status: "SUCCEEDED", policyVersion: "curated-writing-generation-v2",
    catalogId: "gen-test-123", reviewStatus: "DRAFT", qaOnly: true, failureCode: null, provider: "openai", model: "gpt-5.6-luna",
    requiresReconciliation: false, writingType: "TRANSLATION", targetBand: 2, topicKey: "library-use", repairOfRequestKey: null, repairNotes: null,
    repairMode: "CORE_REPLACEMENT", canRepair: true, repairBlockedReason: null,
    quality: { contractStatus: "PASSED", semanticStatus: "NOT_REVIEWED", humanReview: "NOT_PERFORMED", releaseStatus: "QA_ONLY", reasonCodes: ["AUTOMATED_CHECK_ONLY", "CORE_CONTENT_FIXED"] },
    candidate: candidate() });

test("준비된 B2 후보와 다른 주제 대체를 승인으로 바꾸지 않고 받는다", () => {
    // 준비 / 실행
    const original = ready();
    const replacement = { ...ready(), requestKey: "repair-123", repairOfRequestKey: "test-123", repairNotes: "다른 상황을 원합니다.", canRepair: false, repairBlockedReason: "REPAIR_LIMIT" };
    replacement.candidate.topicKey = "home-task";
    // 검증
    assert.equal(validateWritingPreparation(original), original);
    assert.equal(validateWritingPreparation(replacement), replacement);
});

for (const [name, mutate] of [
    ["의미 검토를 승인으로 바꿈", (v) => { v.quality.semanticStatus = "APPROVED"; }],
    ["사람 검수로 가장", (v) => { v.quality.humanReview = "APPROVED"; }],
    ["일반 공개 상태 주입", (v) => { v.qaOnly = false; }],
    ["숨긴 참고 답안 누출", (v) => { v.candidate.referenceAnswers = ["図書館です。"]; }],
    ["공식 점수 주입", (v) => { v.score = 80; }],
    ["타 후보 identity 혼입", (v) => { v.candidate.catalogId = "gen-foreign"; }],
    ["다른 band 혼입", (v) => { v.candidate.targetBand = 3; }],
    ["임의 서버 사유 주입", (v) => { v.quality.reasonCodes.push("SEMANTIC_PASS"); }],
    ["실행 불명 상태에서 후보 표시", (v) => { v.status = "UNCERTAIN"; v.requiresReconciliation = true; v.quality.contractStatus = "PENDING"; v.quality.reasonCodes.push("EXECUTION_UNCERTAIN"); }],
    ["수정 후 또 수정 허용", (v) => { v.repairOfRequestKey = "original"; v.repairNotes = "변경"; }],
    ["수정 원본과 사유 쌍 누락", (v) => { v.repairOfRequestKey = "original"; }],
    ["B2 고정 코어를 자유 생성으로 표시", (v) => { v.repairMode = "CONTENT_REPAIR"; }],
]) {
    test(`잘못된 계약 거절: ${name}`, () => {
        // 준비
        const value = ready();
        mutate(value);
        // 실행 / 검증
        assert.throws(() => validateWritingPreparation(value), { message: PREPARATION_CONTRACT_ERROR });
    });
}

test("실행 불명은 후보 없이 복구 필요 상태로 유지한다", () => {
    // 준비
    const value = ready();
    Object.assign(value, { status: "UNCERTAIN", candidate: null, failureCode: "MODEL_EXECUTION_TRANSPORT", requiresReconciliation: true, canRepair: false, repairBlockedReason: "NOT_FINISHED" });
    value.quality.contractStatus = "PENDING";
    value.quality.reasonCodes.push("EXECUTION_UNCERTAIN");
    // 실행 / 검증
    assert.equal(validateWritingPreparation(value), value);
});

test("계획 삭제는 교체 전후 초안만 지우고 다른 계정과 계획은 보존한다", () => {
    // 준비
    const removed = [paragraphDraftKey("owner:one", 1, 11, "old"), paragraphDraftKey("owner:one", 1, 11, "new")];
    const retained = [paragraphDraftKey("owner:two", 1, 11, "old"), paragraphDraftKey("owner:one", 10, 11, "old")];
    const values = new Map([...removed, ...retained].map((key) => [key, "저장된 초안"]));
    const storage = { get length() { return values.size; }, key: (index) => [...values.keys()][index] ?? null, removeItem: (key) => values.delete(key) };
    // 실행
    removeParagraphPlanDrafts(storage, "owner:one", 1);
    // 검증
    assert.deepEqual([...values.keys()], retained);
});
