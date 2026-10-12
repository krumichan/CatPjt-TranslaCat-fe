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

test("grounded feedback distinguishes missing requirements from learner quotes and hypothetical suggestions", () => {
    // 준비: 필수 이유가 빠진 답안의 누락 설명은 인용 없이 표시한다.
    const value = plan(1, 1, 1);
    value.personalizedFeedbackStatus = "ACTIVE_QA";
    value.feedbackCompletedItemCount = 1;
    const item = value.items[0];
    item.taskRequirements = ["자신의 사정을 설명하세요."];
    item.reference = { checklist: ["이유 설명"], referenceAnswers: ["参考例"], alternativeNote: "다른 이유도 가능", isOnlyCorrectAnswer: false };
    const result = {
        policyVersion: "curated-writing-feedback-v2", resultPolicy: "REFERENCE_ONLY",
        observations: [{ requirementId: "C1", status: "UNMET", evidenceKind: "MISSING_REQUIREMENT", segmentIds: [], answerQuotes: [], originText: "자신의 사정을 더해 주세요.", learningText: "ご自身の事情を補ってください。" }],
        necessaryCorrections: [], optionalAlternatives: [], uncertainties: [],
    };
    item.attempts[0].feedback = { status: "SUCCEEDED", result, failureCode: null, canRetry: false };

    // 실행·검증: 설명은 보존하고 누락된 이유를 임의의 교정으로 만드는 응답은 거절한다.
    assert.equal(validateParagraphPlan(value).items[0].taskRequirements.length, 1);
    result.policyVersion = "curated-writing-feedback-v3";
    assert.equal(validateParagraphPlan(value).items[0].taskRequirements.length, 1);
    const rewrite = { requirementId: "C1", segmentId: "S1", original: item.attempts[0].answer, replacement: "出張のため変更してください。", originText: "예시", learningText: "例" };
    result.necessaryCorrections.push(rewrite);
    assert.throws(() => validateParagraphPlan(value), /CONTRACT_INVALID/);
    result.necessaryCorrections.length = 0;
    result.observations[0].answerQuotes.push(item.attempts[0].answer);
    assert.throws(() => validateParagraphPlan(value), /CONTRACT_INVALID/);
    result.observations[0].answerQuotes.length = 0;

    // 검증: 가상 예시는 선택 제안에 분류를 붙여야 하며 이전 사실로 변환하지 않는다.
    const alternative = { segmentId: rewrite.segmentId, original: rewrite.original, replacement: rewrite.replacement, originText: rewrite.originText, learningText: rewrite.learningText };
    result.optionalAlternatives.push({ ...alternative, suggestionKind: "HYPOTHETICAL_EXAMPLE" });
    assert.equal(validateParagraphPlan(value).items[0].attempts[0].feedback.result.optionalAlternatives[0].suggestionKind, "HYPOTHETICAL_EXAMPLE");
    delete result.optionalAlternatives[0].suggestionKind;
    assert.throws(() => validateParagraphPlan(value), /CONTRACT_INVALID/);
});

test("visible requirements reject malformed content without requiring a pre-submit answer key", () => {
    // 준비·실행: 새 후보의 공개 필수 조건은 참고 답안을 공개하지 않는다.
    const value = plan(1);
    value.items[0].taskRequirements = ["변경을 요청하세요."];
    assert.equal(validateParagraphPlan(value).items[0].reference, undefined);

    // 검증
    for (const malformed of [null, [""], [{ answer: "private" }]]) {
        value.items[0].taskRequirements = malformed;
        assert.throws(() => validateParagraphPlan(value), /CONTRACT_INVALID/);
    }
});

function typedFeedbackPlan() {
    const value = plan(1, 1, 1);
    value.personalizedFeedbackStatus = "ACTIVE_QA";
    value.feedbackCompletedItemCount = 1;
    const item = value.items[0];
    const answer = "午前九時に始まります。";
    item.attempts[0].answer = answer;
    item.reference = { checklist: ["시작 시각 전달"], referenceAnswers: [answer], alternativeNote: "다른 표현도 가능", isOnlyCorrectAnswer: false };
    item.attempts[0].feedback = { status: "SUCCEEDED", canRetry: false, failureCode: null, result: {
        policyVersion: "curated-writing-feedback-v4", resultPolicy: "REFERENCE_ONLY",
        observations: [{ requirementId: "C1", status: "MET", evidenceKind: "LEARNER_TEXT", segmentIds: ["S1"], answerQuotes: [answer], originText: "요구를 전달했습니다.", learningText: "条件を伝えています。",
            relationChecks: { causality: "NOT_APPLICABLE", chronology: "PRESERVED", specificity: "PRESERVED", stance: "NOT_APPLICABLE" } }],
        necessaryCorrections: [], optionalAlternatives: [], uncertainties: [],
    } };
    return value;
}

test("v4 preserves observations but rejects missing and contradictory relation evidence", () => {
    // 준비·실행: 정상 관계 판정은 그대로 표시한다.
    const value = typedFeedbackPlan();
    const observation = value.items[0].attempts[0].feedback.result.observations[0];
    assert.equal(validateParagraphPlan(value).feedbackCompletedItemCount, 1);

    // 검증: 시간 충돌·불확실을 충족으로 중계하지 않는다.
    for (const invalid of [undefined, "UNKNOWN", "CONFLICT", "UNCERTAIN"]) {
        observation.relationChecks.chronology = invalid;
        assert.throws(() => validateParagraphPlan(value), /CONTRACT_INVALID/);
    }
    observation.relationChecks.chronology = "UNCERTAIN";
    observation.status = "UNCERTAIN";
    assert.equal(validateParagraphPlan(value).feedbackCompletedItemCount, 1);
    observation.status = "UNMET";
    assert.throws(() => validateParagraphPlan(value), /CONTRACT_INVALID/);
});

test("v4 fact correction requires a task fact and a conflicting learner observation", () => {
    // 준비: 문항의 명시 사실과 충돌하는 인용을 교정한다.
    const value = typedFeedbackPlan();
    const result = value.items[0].attempts[0].feedback.result;
    result.observations[0].status = "UNMET";
    result.observations[0].relationChecks.chronology = "CONFLICT";
    const correction = { requirementId: "C1", segmentId: "S1", original: "午前九時", replacement: "午前十時", originText: "주어진 시각을 확인하세요.", learningText: "指定時刻を確認してください。", issueType: "TASK_FACT_CONFLICT", sourceFactId: "T1", formReason: "NONE" };
    result.necessaryCorrections.push(correction);

    // 실행·검증: 원래 교정은 통과하고, 개인 사실·불명확한 분류는 거절한다.
    assert.equal(validateParagraphPlan(value).feedbackCompletedItemCount, 1);
    for (const sourceFactId of ["", "C1", "T0", undefined]) {
        correction.sourceFactId = sourceFactId;
        assert.throws(() => validateParagraphPlan(value), /CONTRACT_INVALID/);
    }
    correction.sourceFactId = "T1";
    result.observations[0].relationChecks.chronology = "PRESERVED";
    assert.throws(() => validateParagraphPlan(value), /CONTRACT_INVALID/);
});

test("v4 language correction allows actual form repair but rejects punctuation-only obligations", () => {
    // 준비: 인용 안의 실제 활용형 변경과 가독성 쉼표를 구분한다.
    const value = typedFeedbackPlan();
    const result = value.items[0].attempts[0].feedback.result;
    const correction = { requirementId: "C1", segmentId: "S1", original: "始まります", replacement: "始まりました", originText: "활용형을 확인하세요.", learningText: "活用を確認してください。", issueType: "LANGUAGE_FORM", sourceFactId: "", formReason: "INFLECTION" };
    result.necessaryCorrections.push(correction);

    // 실행·검증
    assert.equal(validateParagraphPlan(value).feedbackCompletedItemCount, 1);
    correction.replacement = "始まります、";
    assert.throws(() => validateParagraphPlan(value), /CONTRACT_INVALID/);
    correction.replacement = "始まりました";
    correction.formReason = "NONE";
    assert.throws(() => validateParagraphPlan(value), /CONTRACT_INVALID/);
    correction.formReason = "INFLECTION";
    correction.sourceFactId = "T1";
    assert.throws(() => validateParagraphPlan(value), /CONTRACT_INVALID/);
});

test("v4 missing requirement cannot invent relations in absent learner text", () => {
    // 준비
    const value = typedFeedbackPlan();
    const observation = value.items[0].attempts[0].feedback.result.observations[0];
    Object.assign(observation, { status: "UNMET", evidenceKind: "MISSING_REQUIREMENT", segmentIds: [], answerQuotes: [], relationChecks: { causality: "NOT_APPLICABLE", chronology: "NOT_APPLICABLE", specificity: "NOT_APPLICABLE", stance: "NOT_APPLICABLE" } });

    // 실행·검증
    assert.equal(validateParagraphPlan(value).feedbackCompletedItemCount, 1);
    observation.relationChecks.stance = "CONFLICT";
    assert.throws(() => validateParagraphPlan(value), /CONTRACT_INVALID/);
});

test("v5 expression alternatives require complete and preserved relations", () => {
    // 준비: 사실은 유지하고 같은 시각의 표현만 바꾼다.
    const value = typedFeedbackPlan();
    const result = value.items[0].attempts[0].feedback.result;
    result.policyVersion = "curated-writing-feedback-v5";
    const alternative = { suggestionKind: "EXPRESSION_ONLY", segmentId: "S1", original: "午前九時に始まります。", replacement: "開始は午前九時です。", originText: "같은 시각의 다른 표현입니다.", learningText: "同じ時刻の別の表現です。",
        relationChecks: { causality: "NOT_APPLICABLE", chronology: "PRESERVED", specificity: "PRESERVED", stance: "NOT_APPLICABLE" } };
    result.optionalAlternatives.push(alternative);

    // 실행·검증: 추가 사실·불확실·잘못된 enum·필수 관계 누락은 거절한다.
    assert.equal(validateParagraphPlan(value).feedbackCompletedItemCount, 1);
    for (const invalid of [undefined, "UNKNOWN", "CONFLICT", "UNCERTAIN"]) {
        alternative.relationChecks.specificity = invalid;
        assert.throws(() => validateParagraphPlan(value), /CONTRACT_INVALID/);
    }
    alternative.relationChecks.specificity = "PRESERVED";
    delete alternative.relationChecks.stance;
    assert.throws(() => validateParagraphPlan(value), /CONTRACT_INVALID/);
});

test("v5 hypothetical alternatives keep explicit meaning-change classification", () => {
    // 준비: 실제 답안에 없던 조건은 가정 예시로 분류한다.
    const value = typedFeedbackPlan();
    const result = value.items[0].attempts[0].feedback.result;
    result.policyVersion = "curated-writing-feedback-v5";
    const alternative = { suggestionKind: "HYPOTHETICAL_EXAMPLE", segmentId: "S1", original: "午前九時に始まります。", replacement: "遅れる場合は午前十時に始まります。", originText: "지연을 가정한 예시입니다.", learningText: "遅れる場合の例です。",
        relationChecks: { causality: "UNCERTAIN", chronology: "CONFLICT", specificity: "CONFLICT", stance: "NOT_APPLICABLE" } };
    result.optionalAlternatives.push(alternative);

    // 실행·검증: 가정 분류는 유지하지만 필수 관계 구조 누락은 허용하지 않는다.
    assert.equal(validateParagraphPlan(value).items[0].attempts[0].feedback.result.optionalAlternatives[0].suggestionKind, "HYPOTHETICAL_EXAMPLE");
    delete alternative.relationChecks.chronology;
    assert.throws(() => validateParagraphPlan(value), /CONTRACT_INVALID/);
});

test("stored v4 alternatives remain readable without new v5 fields", () => {
    // 준비: 이전 저장 결과의 선택 제안에는 관계 객체가 없다.
    const value = typedFeedbackPlan();
    const result = value.items[0].attempts[0].feedback.result;
    result.optionalAlternatives.push({ suggestionKind: "EXPRESSION_ONLY", segmentId: "S1", original: "午前九時に始まります。", replacement: "開始は午前九時です。", originText: "같은 내용의 표현입니다.", learningText: "同じ内容の表現です。" });

    // 실행·검증
    assert.equal(validateParagraphPlan(value).feedbackCompletedItemCount, 1);
    assert.equal(result.policyVersion, "curated-writing-feedback-v4");
    assert.equal(result.optionalAlternatives[0].relationChecks, undefined);
});

function structuredFeedbackPlan() {
    const value = typedFeedbackPlan();
    const item = value.items[0];
    item.taskRequirements = ["시각 전달"];
    const result = item.attempts[0].feedback.result;
    result.policyVersion = "curated-writing-feedback-v6";
    result.observations[0].requirementParts = [{ requirementQuote: "시각 전달", status: "PRESENT",
        evidence: [{ segmentId: "S1", quote: "午前九時に始まります。" }], taskFactIds: ["T1"] }];
    return value;
}

function structuredAlternative(value) {
    const alternative = { requirementId: "C1", suggestionKind: "EXPRESSION_ONLY", segmentId: "S1",
        original: "午前九時に始まります。", replacement: "九時に始まります。", originText: "같은 내용의 표현입니다.", learningText: "同じ内容の表現です。",
        patch: { original: "午前", replacement: "" },
        relationChecks: { causality: "NOT_APPLICABLE", chronology: "PRESERVED", specificity: "PRESERVED", stance: "NOT_APPLICABLE" } };
    value.items[0].attempts[0].feedback.result.optionalAlternatives.push(alternative);
    return alternative;
}

test("v6 requirement parts cover the complete condition and quote actual learner text", () => {
    // 준비·실행
    const value = structuredFeedbackPlan();
    const part = value.items[0].attempts[0].feedback.result.observations[0].requirementParts[0];
    assert.equal(validateParagraphPlan(value).feedbackCompletedItemCount, 1);

    // 검증: 조건 일부 누락·발명한 인용·근거 없는 PRESENT를 거절한다.
    part.requirementQuote = "시각";
    assert.throws(() => validateParagraphPlan(value), /CONTRACT_INVALID/);
    part.requirementQuote = "시각 전달";
    part.evidence[0].quote = "午後十時";
    assert.throws(() => validateParagraphPlan(value), /CONTRACT_INVALID/);
    part.evidence = [];
    assert.throws(() => validateParagraphPlan(value), /CONTRACT_INVALID/);
});

test("v7 reads restored source coverage and still requires exact public quotes", () => {
    // 준비: LL이 공백을 원문대로 복원한 공개 결과를 읽는다.
    const value = structuredFeedbackPlan();
    const result = value.items[0].attempts[0].feedback.result;
    result.policyVersion = "curated-writing-feedback-v7";
    const first = result.observations[0].requirementParts[0];
    first.requirementQuote = "시각 ";
    result.observations[0].requirementParts.push({ requirementQuote: "전달", status: "PRESENT", evidence: [{ segmentId: "S1", quote: "始まります" }], taskFactIds: [] });

    // 실행·검증: 프런트는 공백 누락을 임의 보정하지 않고 정확한 공개 coverage를 검사한다.
    assert.equal(validateParagraphPlan(value).feedbackCompletedItemCount, 1);
    for (const invalid of ["시각", "시각x ", "시각 시각 "]) {
        first.requirementQuote = invalid;
        assert.throws(() => validateParagraphPlan(value), /CONTRACT_INVALID/);
    }
    first.requirementQuote = "시각 ";
    assert.equal(validateParagraphPlan(value).feedbackCompletedItemCount, 1);
});

test("v7 keeps single patch composition and optional relation checks", () => {
    // 준비: 새 버전에서도 원문 밖을 바꾸지 않는 선택 표현만 전달한다.
    const value = structuredFeedbackPlan();
    value.items[0].attempts[0].feedback.result.policyVersion = "curated-writing-feedback-v7";
    const alternative = structuredAlternative(value);

    // 실행·검증
    assert.equal(validateParagraphPlan(value).feedbackCompletedItemCount, 1);
    alternative.replacement = "九時に終わります。";
    assert.throws(() => validateParagraphPlan(value), /CONTRACT_INVALID/);
    alternative.replacement = "九時に始まります。";
    alternative.relationChecks.stance = "CONFLICT";
    assert.throws(() => validateParagraphPlan(value), /CONTRACT_INVALID/);
});

test("v6 partial missing retains present and uncertain part evidence with an unmet aggregate", () => {
    // 준비: 일부 요소만 없는 경우 실제 정상 부분의 인용과 누락을 구분한다.
    const value = structuredFeedbackPlan();
    const observation = value.items[0].attempts[0].feedback.result.observations[0];
    Object.assign(observation, { status: "UNMET", evidenceKind: "LEARNER_TEXT" });
    observation.requirementParts[0].requirementQuote = "시각 ";
    observation.requirementParts.push({ requirementQuote: "전달", status: "ABSENT", evidence: [], taskFactIds: [] });

    // 실행·검증: 누락과 불확실이 함께 있어도 누락 우선 집계이며 관계 enum과 연결돼야 한다.
    assert.equal(validateParagraphPlan(value).feedbackCompletedItemCount, 1);
    observation.status = "MET";
    assert.throws(() => validateParagraphPlan(value), /CONTRACT_INVALID/);
    observation.status = "UNMET";
    observation.requirementParts[0].status = "UNCERTAIN";
    observation.relationChecks.chronology = "UNCERTAIN";
    assert.equal(validateParagraphPlan(value).feedbackCompletedItemCount, 1);
    observation.relationChecks.chronology = "PRESERVED";
    assert.throws(() => validateParagraphPlan(value), /CONTRACT_INVALID/);
});

test("v6 all-absent requirements cannot borrow a learner quote", () => {
    // 준비: 전체 요소가 없는 경우에만 관찰의 인용도 비운다.
    const value = structuredFeedbackPlan();
    const observation = value.items[0].attempts[0].feedback.result.observations[0];
    Object.assign(observation, { status: "UNMET", evidenceKind: "MISSING_REQUIREMENT", segmentIds: [], answerQuotes: [],
        relationChecks: { causality: "NOT_APPLICABLE", chronology: "NOT_APPLICABLE", specificity: "NOT_APPLICABLE", stance: "NOT_APPLICABLE" } });
    observation.requirementParts[0].status = "ABSENT";
    observation.requirementParts[0].evidence = [];

    // 실행·검증
    assert.equal(validateParagraphPlan(value).feedbackCompletedItemCount, 1);
    observation.answerQuotes.push("午前九時に始まります。");
    assert.throws(() => validateParagraphPlan(value), /CONTRACT_INVALID/);
});

test("v6 patch preserves outside text and permits a deletion replacement", () => {
    // 준비·실행: 삭제 패치의 빈 교체문은 허용한다.
    const value = structuredFeedbackPlan();
    const alternative = structuredAlternative(value);
    assert.equal(validateParagraphPlan(value).feedbackCompletedItemCount, 1);

    // 검증: 패치 외부의 변경과 누락된 patch는 거절한다.
    alternative.replacement = "九時に終わります。";
    assert.throws(() => validateParagraphPlan(value), /CONTRACT_INVALID/);
    alternative.replacement = "九時に始まります。";
    delete alternative.patch;
    assert.throws(() => validateParagraphPlan(value), /CONTRACT_INVALID/);
});

test("v6 fact patch must use evidence of its conflicting fact part", () => {
    // 준비: 같은 문장 안에서 충돌한 시각과 정상 동작의 근거를 분리한다.
    const value = structuredFeedbackPlan();
    const result = value.items[0].attempts[0].feedback.result;
    const observation = result.observations[0];
    observation.status = "UNMET";
    observation.relationChecks.chronology = "CONFLICT";
    observation.requirementParts = [
        { requirementQuote: "시각 ", status: "CONFLICT", evidence: [{ segmentId: "S1", quote: "午前九時" }], taskFactIds: ["T1"] },
        { requirementQuote: "전달", status: "PRESENT", evidence: [{ segmentId: "S1", quote: "始まります" }], taskFactIds: ["T2"] },
    ];
    const correction = { requirementId: "C1", segmentId: "S1", original: "午前九時に始まります。", replacement: "午後十時に始まります。",
        issueType: "TASK_FACT_CONFLICT", sourceFactId: "T1", formReason: "NONE", patch: { original: "午前九時", replacement: "午後十時" },
        originText: "주어진 시각을 확인하세요.", learningText: "指定時刻を確認してください。" };
    result.necessaryCorrections.push(correction);

    // 실행·검증: 다른 사실의 ID나 다른 정상 부분의 인용을 교정 권한으로 사용하지 않는다.
    assert.equal(validateParagraphPlan(value).feedbackCompletedItemCount, 1);
    correction.sourceFactId = "T2";
    assert.throws(() => validateParagraphPlan(value), /CONTRACT_INVALID/);
    Object.assign(correction, { sourceFactId: "T1", replacement: "午前九時に始まりました。", patch: { original: "始まります", replacement: "始まりました" } });
    assert.throws(() => validateParagraphPlan(value), /CONTRACT_INVALID/);
});

test("v6 patch cannot select an ambiguous repeated source", () => {
    // 준비: 원문의 같은 부분이 두 번 있으면 교체 위치가 모호하다.
    const value = structuredFeedbackPlan();
    const answer = "午前九時に始まります。午前九時に始まります。";
    value.items[0].attempts[0].answer = answer;
    value.items[0].attempts[0].feedback.result.observations[0].answerQuotes = [answer];
    const alternative = structuredAlternative(value);
    alternative.original = answer;
    alternative.replacement = "九時に始まります。午前九時に始まります。";

    // 실행·검증
    assert.throws(() => validateParagraphPlan(value), /CONTRACT_INVALID/);
});

test("v6 expression alternatives cannot compete with required corrections or rewrite unmet requirements", () => {
    // 준비: 필수 교정과 선택 제안이 같은 구간을 동시에 바꾼다.
    const value = structuredFeedbackPlan();
    const result = value.items[0].attempts[0].feedback.result;
    const alternative = structuredAlternative(value);
    result.necessaryCorrections.push({ requirementId: "C1", segmentId: "S1", original: "午前九時に始まります。", replacement: "午前九時に始まりました。",
        issueType: "LANGUAGE_FORM", sourceFactId: "", formReason: "INFLECTION", patch: { original: "始まります", replacement: "始まりました" }, originText: "활용형을 확인하세요.", learningText: "活用を確認してください。" });

    // 실행·검증: 충돌 action은 거절하고 가정 예시는 별도 분류를 유지한다.
    assert.throws(() => validateParagraphPlan(value), /CONTRACT_INVALID/);
    result.optionalAlternatives = [];
    assert.equal(validateParagraphPlan(value).feedbackCompletedItemCount, 1);
    result.necessaryCorrections = [];
    result.optionalAlternatives = [alternative];
    result.observations[0].status = "UNMET";
    result.observations[0].requirementParts[0].status = "CONFLICT";
    result.observations[0].relationChecks.chronology = "CONFLICT";
    assert.throws(() => validateParagraphPlan(value), /CONTRACT_INVALID/);
    alternative.suggestionKind = "HYPOTHETICAL_EXAMPLE";
    assert.equal(validateParagraphPlan(value).feedbackCompletedItemCount, 1);
    alternative.requirementId = "C9";
    assert.throws(() => validateParagraphPlan(value), /CONTRACT_INVALID/);
});

function prescribedFeedbackPlan() {
    const value = structuredFeedbackPlan();
    value.writingType = "GUIDED";
    value.items[0].requiredIntents = ["", "원래 예정 시각임을 나타낸다.", "원래 예정 시각임을 나타낸다.", "변경 결정을 나타낸다."];
    const result = value.items[0].attempts[0].feedback.result;
    result.policyVersion = "curated-writing-feedback-v8";
    result.observations[0].requirementParts[0].taskConditionIds = ["P1", "P2"];
    return value;
}

function conditionCorrection(value) {
    const result = value.items[0].attempts[0].feedback.result;
    const observation = result.observations[0];
    observation.status = "UNMET";
    observation.relationChecks.chronology = "CONFLICT";
    observation.requirementParts[0].status = "CONFLICT";
    const correction = { requirementId: "C1", segmentId: "S1", original: "午前九時に始まります。", replacement: "午前九時に始まる予定でした。",
        issueType: "TASK_CONDITION_CONFLICT", sourceFactId: "", sourceAuthorityId: "P1", formReason: "NONE",
        patch: { original: "始まります", replacement: "始まる予定でした" },
        originText: "과제에 명시된 원래 예정 시각으로 전달하세요.", learningText: "課題の指示に従って元の予定として伝えてください。" };
    result.necessaryCorrections.push(correction);
    return correction;
}

test("v8 guided condition authority stays distinct from facts and language form", () => {
    // 준비: 명시 지시는 학습자의 사실이나 활용형 오류가 아니다.
    const value = prescribedFeedbackPlan();
    const correction = conditionCorrection(value);
    assert.equal(validateParagraphPlan(value).feedbackCompletedItemCount, 1);

    // 검증: 세 권한을 혼합하거나 P 대신 다른 종류의 ID를 쓰면 거절한다.
    correction.sourceFactId = "T1";
    assert.throws(() => validateParagraphPlan(value), /CONTRACT_INVALID/);
    Object.assign(correction, { sourceFactId: "", formReason: "INFLECTION" });
    assert.throws(() => validateParagraphPlan(value), /CONTRACT_INVALID/);
    Object.assign(correction, { formReason: "NONE", sourceAuthorityId: "T1" });
    assert.throws(() => validateParagraphPlan(value), /CONTRACT_INVALID/);
});

test("v9 server-assembled result keeps the v8 authority and patch guard", () => {
    // 준비: 저장 결과의 구조는 유지하고 정책 버전만 새 계약으로 둔다.
    const value = prescribedFeedbackPlan();
    const result = value.items[0].attempts[0].feedback.result;
    result.policyVersion = "curated-writing-feedback-v9";
    conditionCorrection(value);

    // 실행·검증: 실제 P1을 표시하고 가짜 권한 연결은 거절한다.
    assert.equal(validateParagraphPlan(value).feedbackCompletedItemCount, 1);
    result.observations[0].requirementParts[0].taskConditionIds = ["P2"];
    assert.throws(() => validateParagraphPlan(value), /CONTRACT_INVALID/);
});

test("v8 condition IDs use distinct nonblank guided intents without unknown or duplicate authority", () => {
    // 준비: 빈 값과 중복 제거 후 P1/P2만 남는다.
    const value = prescribedFeedbackPlan();
    const part = value.items[0].attempts[0].feedback.result.observations[0].requirementParts[0];
    part.taskConditionIds = ["P1", "P2"];
    assert.equal(validateParagraphPlan(value).feedbackCompletedItemCount, 1);

    // 검증: 새 필드 생략·중복·다른 namespace나 없는 번호는 통과하지 않는다.
    for (const invalid of [undefined, ["P0"], ["P3"], ["T1"], ["C1"], [""], ["P1", "P1"], ["P2"]]) {
        part.taskConditionIds = invalid;
        assert.throws(() => validateParagraphPlan(value), /CONTRACT_INVALID/);
    }
});

test("v8 FREE and TRANSLATION cannot acquire prescribed-condition authority", () => {
    // 준비: requiredIntents가 있어도 개인 선택이나 번역에는 GUIDED P 권한이 생기지 않는다.
    for (const writingType of ["FREE", "TRANSLATION"]) {
        const value = prescribedFeedbackPlan();
        value.writingType = writingType;
        conditionCorrection(value);
        assert.throws(() => validateParagraphPlan(value), /CONTRACT_INVALID/);

        // 실행·검증: 권한을 사용하지 않은 관찰은 계속 읽을 수 있다.
        const result = value.items[0].attempts[0].feedback.result;
        result.necessaryCorrections = [];
        result.observations[0].requirementParts[0].taskConditionIds = [];
        assert.equal(validateParagraphPlan(value).feedbackCompletedItemCount, 1);
    }
});

test("v8 condition patch requires the same conflicting part and actual evidence", () => {
    // 준비: 같은 문장의 정상 시각과 잘못된 현재/과거 표현의 근거를 분리한다.
    const value = prescribedFeedbackPlan();
    const correction = conditionCorrection(value);
    const observation = value.items[0].attempts[0].feedback.result.observations[0];
    observation.requirementParts = [
        { requirementQuote: "시각 ", status: "PRESENT", evidence: [{ segmentId: "S1", quote: "午前九時" }], taskFactIds: ["T1"], taskConditionIds: ["P2"] },
        { requirementQuote: "전달", status: "CONFLICT", evidence: [{ segmentId: "S1", quote: "始まります" }], taskFactIds: [], taskConditionIds: ["P1"] },
    ];
    assert.equal(validateParagraphPlan(value).feedbackCompletedItemCount, 1);

    // 검증: 존재하는 다른 조건이나 정상 부분의 quote를 빌려 교정하지 않는다.
    correction.sourceAuthorityId = "P2";
    assert.throws(() => validateParagraphPlan(value), /CONTRACT_INVALID/);
    Object.assign(correction, { sourceAuthorityId: "P1", replacement: "午後十時に始まります。", patch: { original: "午前九時", replacement: "午後十時" } });
    assert.throws(() => validateParagraphPlan(value), /CONTRACT_INVALID/);
});

test("v8 language and fact corrections require an explicit empty condition authority", () => {
    // 준비: 기존 교정 종류는 새 조건 권한을 사용하지 않는다.
    const value = prescribedFeedbackPlan();
    const correction = conditionCorrection(value);
    Object.assign(correction, { issueType: "TASK_FACT_CONFLICT", sourceFactId: "T1", sourceAuthorityId: "" });
    assert.equal(validateParagraphPlan(value).feedbackCompletedItemCount, 1);
    correction.sourceAuthorityId = "P1";
    assert.throws(() => validateParagraphPlan(value), /CONTRACT_INVALID/);

    // 실행·검증: 언어 오류는 권한 두 필드가 모두 비어야 한다.
    Object.assign(correction, { issueType: "LANGUAGE_FORM", sourceFactId: "", sourceAuthorityId: "", formReason: "INFLECTION" });
    assert.equal(validateParagraphPlan(value).feedbackCompletedItemCount, 1);
    delete correction.sourceAuthorityId;
    assert.throws(() => validateParagraphPlan(value), /CONTRACT_INVALID/);
});

test("v8 compound missing remains UNMET and cannot authorize invented content", () => {
    // 준비: 답안에 있는 부분과 없는 부분을 별도 상태·인용으로 보존한다.
    const value = prescribedFeedbackPlan();
    const observation = value.items[0].attempts[0].feedback.result.observations[0];
    observation.status = "UNMET";
    observation.requirementParts[0].requirementQuote = "시각 ";
    observation.requirementParts[0].taskConditionIds = ["P2"];
    observation.requirementParts.push({ requirementQuote: "전달", status: "ABSENT", evidence: [], taskFactIds: [], taskConditionIds: ["P1"] });
    assert.equal(validateParagraphPlan(value).feedbackCompletedItemCount, 1);

    // 검증: 누락을 충족으로 바꾸거나 실제 다른 부분의 인용을 대신 사용하지 않는다.
    observation.status = "MET";
    assert.throws(() => validateParagraphPlan(value), /CONTRACT_INVALID/);
    observation.status = "UNMET";
    conditionCorrection(value);
    assert.throws(() => validateParagraphPlan(value), /CONTRACT_INVALID/);
});

test("v8 still requires exact server-restored coverage and a public requirement ID", () => {
    // 준비·실행: 모델의 원문 재생산을 없애도 서버 저장 결과는 정확한 원문이어야 한다.
    const value = prescribedFeedbackPlan();
    assert.equal(validateParagraphPlan(value).feedbackCompletedItemCount, 1);
    const observation = value.items[0].attempts[0].feedback.result.observations[0];

    // 검증: 복원 문자열이나 요구 ID가 원문에서 벗어나면 표시하지 않는다.
    observation.requirementParts[0].requirementQuote = "시각을 전달함";
    assert.throws(() => validateParagraphPlan(value), /CONTRACT_INVALID/);
    observation.requirementParts[0].requirementQuote = "시각 전달";
    observation.requirementId = "C9";
    assert.throws(() => validateParagraphPlan(value), /CONTRACT_INVALID/);
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
