import assert from "node:assert/strict";
import test from "node:test";
import { parseParagraphTarget, validateParagraphConfig, validateParagraphPlan, validateParagraphPreview } from "../../src/features/language-learning/writing/paragraphWritingContract.ts";
import { paragraphDraftKey, readParagraphDraft, writeParagraphDraft } from "../../src/features/language-learning/writing/paragraphWritingDrafts.ts";

const policyVersion = "curated-writing-variable-n-v1";
const config = { policyVersion, defaultTargetItemCount: 5, minTargetItemCount: 1, maxTargetItemCount: 100, workerBatchSize: 20, pageSize: 10, answerMaxLength: 10000, qaOnly: true, personalizedFeedbackEnabled: false, distribution: { REVIEW: 20, NORMAL: 60, CHALLENGE: 20 } };

function plan(target = 5, acquired = target, submitted = 0) {
    const desiredDistribution = { REVIEW: 0, NORMAL: target, CHALLENGE: 0 };
    const actualDistribution = { REVIEW: 0, NORMAL: acquired, CHALLENGE: 0 };
    return {
        policyVersion, resultPolicy: "REFERENCE_ONLY", writingType: "TRANSLATION", baseBand: 3,
        dailySetId: 10, learningDate: "2026-10-04", releaseId: "fixture", originLanguage: "ko", learningLanguage: "en",
        targetItemCount: target, acquiredItemCount: acquired, remainingItemCount: target - acquired,
        desiredDistribution, actualDistribution, distributionDeviation: { REVIEW: 0, NORMAL: acquired - target, CHALLENGE: 0 },
        shortages: target === acquired ? [] : [{ difficulty: "NORMAL", targetBand: 3, missingCount: target - acquired }],
        status: acquired < target ? "PARTIAL" : submitted === target ? "COMPLETED" : "READY",
        sentenceCount: target, generatedItemCount: acquired, submittedItemCount: submitted, feedbackCompletedItemCount: 0,
        planRevision: 1, replacementCount: 0, rePractice: false, reviewAvailable: true,
        personalizedFeedbackStatus: "DISABLED_PENDING_QUALITY_GATE", supplyStopReason: null,
        items: Array.from({ length: acquired }, (_, index) => ({
            itemId: index + 1, order: index + 1, difficulty: "NORMAL", targetBand: 3,
            catalogId: `fixture-${index}`, catalogVersion: 1, contentRevision: `revision-${index}`,
            originText: "첫 문단입니다.\n\n두 번째 문단입니다.", providedFacts: [], requiredIntents: [], responseConstraints: [], topicKey: "fixture",
            answered: index < submitted, canSubmit: index >= submitted,
            workload: { sourceCharacterCount: "첫 문단입니다.\n\n두 번째 문단입니다.".length, estimatedAnswerCharacters: null, estimateStatus: "NOT_SPECIFIED" },
            attempts: index < submitted ? [{ answerId: 100 + index, attemptDate: "2026-10-04", answer: "First paragraph.\n\nSecond paragraph.", submittedAt: "2026-10-04T00:00:00Z", resultPolicy: "REFERENCE_ONLY", evaluation: null }] : [],
        })),
    };
}

for (const count of [1, 2, 3, 5, 10, 20, 30, 50, 100]) {
    test(`target N=${count} is independent from page size and sentence count inside a prompt`, () => {
        // 준비 / 실행
        const value = plan(count);
        const result = validateParagraphPlan(value);

        // 검증
        assert.equal(result.targetItemCount, count);
        assert.equal(result.items.length, count);
        assert.equal(parseParagraphTarget(String(count), 1, 100), count);
        assert.match(result.items[0].originText, /\n\n/);
    });
}

test("target input rejects fractions, coercion, overflow and configured bounds", () => {
    for (const invalid of ["", " ", "0", "-1", "2.5", "1e2", "100x", "101", "9007199254740992"]) {
        assert.equal(parseParagraphTarget(invalid, 1, 100), null, invalid);
    }
    assert.equal(parseParagraphTarget("200", 1, 250), 200);
    assert.equal(validateParagraphConfig({ ...config, maxTargetItemCount: 250 }).maxTargetItemCount, 250);
});

test("27/30 remains partial and restoration preserves all acquired revisions and answers", () => {
    // 준비
    const partial = plan(30, 27, 2);
    const restored = plan(30, 30, 2);

    // 실행 / 검증
    assert.equal(validateParagraphPlan(partial).remainingItemCount, 3);
    assert.equal(validateParagraphPlan(restored).remainingItemCount, 0);
    assert.deepEqual(restored.items.slice(0, 27), partial.items);
    assert.throws(() => validateParagraphPlan({ ...partial, status: "COMPLETED" }), /CONTRACT_INVALID/);
});

test("10 to 30 expansion preserves first ten answers and independent counts", () => {
    const original = plan(10, 10, 10);
    const expanded = { ...plan(30, 30, 10), planRevision: 2 };
    assert.deepEqual(validateParagraphPlan(expanded).items.slice(0, 10), original.items);
    assert.equal(expanded.submittedItemCount, 10);
    assert.equal(expanded.feedbackCompletedItemCount, 0);
    assert.equal(expanded.status, "READY");
});

test("completion is reference submission, never fabricated AI feedback", () => {
    assert.equal(validateParagraphPlan(plan(3, 3, 3)).status, "COMPLETED");
    assert.throws(() => validateParagraphPlan({ ...plan(), feedbackCompletedItemCount: 5 }), /CONTRACT_INVALID/);
    assert.throws(() => validateParagraphPlan({ ...plan(), policyVersion: "curated-writing-v1" }), /CONTRACT_INVALID/);
});

test("active feedback counts only stored success and rejects invented original quotes", () => {
    // 준비: 실제 LL 피드백 상태와 비점수 결과를 가진 답안.
    const value = plan(1, 1, 1);
    value.personalizedFeedbackStatus = "ACTIVE_QA";
    value.feedbackCompletedItemCount = 1;
    value.items[0].attempts[0].answer = "欠席した生徒も増えていました。";
    value.items[0].reference = { checklist: ["증가 전달"], referenceAnswers: ["欠席者が増えました。"], alternativeNote: "다른 표현도 가능", isOnlyCorrectAnswer: false };
    const result = {
        policyVersion: "curated-writing-feedback-v1", resultPolicy: "REFERENCE_ONLY",
        observations: [{ requirementId: "C1", status: "MET", segmentIds: ["S1"], answerQuotes: ["欠席した生徒も増えていました。"], originText: "증가를 전달했습니다.", learningText: "増加を伝えました。" }],
        necessaryCorrections: [], optionalAlternatives: [], uncertainties: [],
    };
    value.items[0].attempts[0].feedback = { status: "SUCCEEDED", result, failureCode: null, canRetry: false };

    // 실행·검증: 성공 결과는 표시하고 존재하지 않는 오타 인용·공식 평가 혼입은 거절한다.
    assert.equal(validateParagraphPlan(value).feedbackCompletedItemCount, 1);
    result.necessaryCorrections.push({ requirementId: "C1", segmentId: "S1", original: "増っていました", replacement: "増えていました", originText: "교정", learningText: "修正" });
    assert.throws(() => validateParagraphPlan(value), /CONTRACT_INVALID/);
    result.necessaryCorrections.length = 0;
    value.items[0].attempts[0].evaluation = 0;
    assert.throws(() => validateParagraphPlan(value), /CONTRACT_INVALID/);
});

test("preview is metadata only and requires explicit shortage consent", () => {
    const value = plan(30, 27);
    const { policyVersion, resultPolicy, writingType, baseBand, targetItemCount, acquiredItemCount, remainingItemCount, desiredDistribution, actualDistribution, distributionDeviation, shortages, rePractice } = value;
    const preview = { policyVersion, resultPolicy, writingType, baseBand, targetItemCount, acquiredItemCount, remainingItemCount, desiredDistribution, actualDistribution, distributionDeviation, shortages, rePractice, qaOnly: true, canStart: false, requiresPartialConsent: true };
    assert.equal(validateParagraphPreview(preview).acquiredItemCount, 27);
    assert.throws(() => validateParagraphPreview({ ...preview, requiresPartialConsent: false }), /CONTRACT_INVALID/);
    assert.throws(() => validateParagraphPreview({ ...preview, items: value.items }), /CONTRACT_INVALID/);
});

test("unsubmitted reference, hidden checklist and official evaluations are rejected", () => {
    for (const field of [{ reference: { checklist: [], referenceAnswers: ["secret"], isOnlyCorrectAnswer: false } }, { checklist: ["secret"] }, { referenceAnswers: ["secret"] }, { hiddenAnswerKey: "secret" }, { evaluation: { score: 80 } }]) {
        const value = plan();
        Object.assign(value.items[0], field);
        assert.throws(() => validateParagraphPlan(value), /CONTRACT_INVALID/);
    }
    const submitted = plan(1, 1, 1);
    submitted.items[0].reference = { checklist: ["condition"], referenceAnswers: ["Example.\n\nAlternative."], alternativeNote: "Other expressions are possible.", isOnlyCorrectAnswer: false };
    assert.equal(validateParagraphPlan(submitted).items[0].reference.referenceAnswers.length, 1);
});

test("unknown or inconsistent counts, item order and shortages fail closed", () => {
    for (const modify of [
        (value) => { value.acquiredItemCount = 4; },
        (value) => { value.items[1].itemId = value.items[0].itemId; },
        (value) => { value.items[1].order = value.items[0].order; },
        (value) => { value.items[0].answered = true; },
        (value) => { value.shortages = [{ difficulty: "NORMAL", targetBand: 3, missingCount: 1 }]; },
    ]) {
        const value = plan();
        modify(value);
        assert.throws(() => validateParagraphPlan(value), /CONTRACT_INVALID/);
    }
});

test("draft scope separates owners, plans and revisions, preserving multiline text", () => {
    // 준비
    const values = new Map();
    const storage = { getItem: (key) => values.get(key), setItem: (key, value) => values.set(key, value), removeItem: (key) => values.delete(key) };
    const key = paragraphDraftKey("owner-a", 10, 1, "r1");
    const answer = " First paragraph.\n\nSecond paragraph. ";

    // 실행
    writeParagraphDraft(storage, key, answer);

    // 검증
    assert.equal(readParagraphDraft(storage, key), answer);
    assert.equal(readParagraphDraft(storage, paragraphDraftKey("owner-b", 10, 1, "r1")), "");
    assert.equal(readParagraphDraft(storage, paragraphDraftKey("owner-a", 10, 1, "r2")), "");
    assert.equal(readParagraphDraft(storage, paragraphDraftKey("owner-a", 11, 1, "r1")), "");
    writeParagraphDraft(storage, key, "");
    assert.equal(readParagraphDraft(storage, key), "");
});
