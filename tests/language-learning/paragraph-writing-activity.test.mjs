import assert from "node:assert/strict";
import test from "node:test";
import { validateParagraphPlan } from "../../src/features/language-learning/writing/paragraphWritingContract.ts";

function plan() {
    const policyVersion = "curated-writing-variable-n-v1";
    return {
        policyVersion, resultPolicy: "REFERENCE_ONLY", writingType: "FREE", baseBand: 3,
        dailySetId: -10, learningDate: "2026-10-11", releaseId: "activity-fixture", originLanguage: "ko", learningLanguage: "ja",
        targetItemCount: 2, acquiredItemCount: 1, remainingItemCount: 1,
        desiredDistribution: { REVIEW: 0, NORMAL: 2, CHALLENGE: 0 }, actualDistribution: { REVIEW: 0, NORMAL: 1, CHALLENGE: 0 },
        distributionDeviation: { REVIEW: 0, NORMAL: -1, CHALLENGE: 0 }, shortages: [{ difficulty: "NORMAL", targetBand: 3, missingCount: 1 }],
        status: "PARTIAL", sentenceCount: 2, generatedItemCount: 1, submittedItemCount: 1, feedbackCompletedItemCount: 0,
        planRevision: 1, personalizedFeedbackStatus: "DISABLED_PENDING_QUALITY_GATE",
        activity: { referenceId: "curated-plan:-10", status: "IN_PROGRESS", learningDate: "2026-10-11", metadata: {
            activityUnit: "PLAN", planId: -10, policyVersion, resultPolicy: "REFERENCE_ONLY", writingType: "FREE",
            originLanguage: "ko", learningLanguage: "ja", targetItemCount: 2, acquiredItemCount: 1, submittedItemCount: 1, durationStatus: "NOT_MEASURED",
        } },
        items: [{ itemId: -1, order: 1, difficulty: "NORMAL", targetBand: 3, contentRevision: "revision",
            originText: "자유롭게 작성하세요.", answered: true, canSubmit: false, providedFacts: [], requiredIntents: [], responseConstraints: [],
            workload: { sourceCharacterCount: 10, estimatedAnswerCharacters: null, estimateStatus: "NOT_SPECIFIED" },
            attempts: [{ answerId: -1, answer: "私は学びます。", resultPolicy: "REFERENCE_ONLY", evaluation: null }],
        }],
    };
}

test("a partial non-scoring plan carries stored activity progress without feedback completion", () => {
    // 준비 / 실행 / 검증
    const value = plan();
    assert.equal(validateParagraphPlan(value).activity.metadata.submittedItemCount, 1);
    assert.equal(value.feedbackCompletedItemCount, 0);
    assert.equal(value.activity.status, "IN_PROGRESS");
});

test("activity cannot claim another plan, changed language, inflated progress or premature completion", () => {
    // 준비 / 실행 / 검증: 동일 응답의 계획 snapshot과 다른 활동은 거절한다.
    for (const mutate of [
        (v) => { v.activity.referenceId = "curated-plan:-11"; },
        (v) => { v.activity.metadata.planId = -11; },
        (v) => { v.activity.metadata.learningLanguage = "en"; },
        (v) => { v.activity.metadata.submittedItemCount = 2; },
        (v) => { v.activity.status = "COMPLETED"; },
        (v) => { v.activity.metadata.durationStatus = "MODEL_WAIT"; },
    ]) {
        const value = plan();
        mutate(value);
        assert.throws(() => validateParagraphPlan(value), /CONTRACT_INVALID/);
    }
});

test("legacy saved plans are readable without silently inventing activity", () => {
    // 준비 / 실행 / 검증
    const value = plan();
    value.activity = null;
    assert.equal(validateParagraphPlan(value).activity, null);
});
