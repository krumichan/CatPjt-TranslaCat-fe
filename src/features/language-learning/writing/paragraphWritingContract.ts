import {
    PARAGRAPH_WRITING_POLICY,
    type ParagraphWritingConfig,
    type ParagraphWritingPlan,
    type ParagraphWritingPreview,
} from "@/types/language-learning/paragraphWriting";

const difficulties = ["REVIEW", "NORMAL", "CHALLENGE"] as const;
const types = ["TRANSLATION", "GUIDED", "FREE"];
export const PARAGRAPH_CONTRACT_ERROR = "WRITING_PARAGRAPH_CONTRACT_INVALID";

function requireContract(value: unknown): asserts value {
    if (!value) throw new Error(PARAGRAPH_CONTRACT_ERROR);
}

function integer(value: unknown, minimum = 0): value is number {
    return typeof value === "number" && Number.isSafeInteger(value) && value >= minimum;
}

export function parseParagraphTarget(value: string, min: number, max: number): number | null {
    if (!/^\d+$/.test(value)) return null;
    const number = Number(value);
    return integer(number, min) && number <= max ? number : null;
}

export function validateParagraphConfig(config: ParagraphWritingConfig): ParagraphWritingConfig {
    // 서버의 실행 한도를 사용한다. 100은 프런트의 영구적인 정책 상한이 아니다.
    requireContract(config && config.policyVersion === PARAGRAPH_WRITING_POLICY);
    requireContract(integer(config.minTargetItemCount, 1) && integer(config.maxTargetItemCount, config.minTargetItemCount));
    requireContract(integer(config.defaultTargetItemCount, config.minTargetItemCount) && config.defaultTargetItemCount <= config.maxTargetItemCount);
    requireContract(integer(config.pageSize, 1) && integer(config.workerBatchSize, 1) && integer(config.answerMaxLength, 1));
    requireContract(config.qaOnly === true && config.distribution?.REVIEW === 20 && config.distribution.NORMAL === 60 && config.distribution.CHALLENGE === 20);
    requireContract(typeof config.personalizedFeedbackEnabled === "boolean");
    return config;
}

function validateCounts(value: ParagraphWritingPreview | ParagraphWritingPlan) {
    requireContract(value && value.policyVersion === PARAGRAPH_WRITING_POLICY && value.resultPolicy === "REFERENCE_ONLY");
    requireContract(types.includes(value.writingType) && integer(value.baseBand, 1) && value.baseBand <= 5);
    requireContract(integer(value.targetItemCount, 1) && integer(value.acquiredItemCount) && integer(value.remainingItemCount));
    requireContract(value.targetItemCount === value.acquiredItemCount + value.remainingItemCount);

    // 목표·실제 분포와 부족 수를 따로 보존하고, 일부 확보를 전체 성공으로 표시하지 않는다.
    let desired = 0;
    let actual = 0;
    for (const difficulty of difficulties) {
        const target = value.desiredDistribution?.[difficulty];
        const acquired = value.actualDistribution?.[difficulty];
        requireContract(integer(target) && integer(acquired));
        requireContract(value.distributionDeviation?.[difficulty] === acquired - target);
        desired += target;
        actual += acquired;
    }
    requireContract(desired === value.targetItemCount && actual === value.acquiredItemCount);
    requireContract(Array.isArray(value.shortages));
    const missing = value.shortages.reduce((sum, shortage) => {
        requireContract(difficulties.includes(shortage.difficulty) && integer(shortage.targetBand, 1) && shortage.targetBand <= 5);
        requireContract(integer(shortage.missingCount, 1));
        return sum + shortage.missingCount;
    }, 0);
    requireContract(missing === value.remainingItemCount);
}

export function validateParagraphPreview(preview: ParagraphWritingPreview): ParagraphWritingPreview {
    validateCounts(preview);
    requireContract(preview.qaOnly === true && typeof preview.canStart === "boolean" && typeof preview.rePractice === "boolean");
    requireContract(preview.requiresPartialConsent === (preview.remainingItemCount > 0));
    requireContract(!("items" in preview) && !("reference" in preview));
    return preview;
}

export function validateParagraphPlan(plan: ParagraphWritingPlan): ParagraphWritingPlan {
    validateCounts(plan);
    requireContract(integer(plan.planRevision, 1) && Number.isSafeInteger(plan.dailySetId));
    requireContract(plan.sentenceCount === plan.targetItemCount && plan.generatedItemCount === plan.acquiredItemCount);
    requireContract(integer(plan.submittedItemCount) && plan.submittedItemCount <= plan.acquiredItemCount);
    requireContract(["ACTIVE_QA", "DISABLED_PENDING_QUALITY_GATE"].includes(plan.personalizedFeedbackStatus));
    requireContract(integer(plan.feedbackCompletedItemCount) && plan.feedbackCompletedItemCount <= plan.submittedItemCount);
    requireContract(["READY", "PARTIAL", "COMPLETED", "BLOCKED"].includes(plan.status));
    requireContract(plan.status !== "COMPLETED" || (plan.remainingItemCount === 0 && plan.submittedItemCount === plan.targetItemCount));
    requireContract(plan.remainingItemCount === 0 || ["PARTIAL", "BLOCKED"].includes(plan.status));
    requireContract(Array.isArray(plan.items) && plan.items.length === plan.acquiredItemCount);

    // 공개 본문과 제출 후 참고 자료의 경계를 검사한다. 공식 평가를 이 화면에 섞지 않는다.
    const ids = new Set<number>();
    const orders = new Set<number>();
    const actualByDifficulty = { REVIEW: 0, NORMAL: 0, CHALLENGE: 0 };
    let submitted = 0;
    let feedbackCompleted = 0;
    for (const item of plan.items) {
        requireContract(Number.isSafeInteger(item.itemId) && !ids.has(item.itemId));
        requireContract(integer(item.order, 1) && item.order <= plan.targetItemCount && !orders.has(item.order));
        ids.add(item.itemId);
        orders.add(item.order);
        requireContract(difficulties.includes(item.difficulty) && integer(item.targetBand, 1) && item.targetBand <= 5);
        actualByDifficulty[item.difficulty] += 1;
        requireContract(typeof item.contentRevision === "string" && item.contentRevision.length > 0);
        requireContract(typeof item.originText === "string" && typeof item.answered === "boolean" && typeof item.canSubmit === "boolean");
        requireContract([item.providedFacts, item.requiredIntents, item.responseConstraints].every((lines) => Array.isArray(lines) && lines.every((line) => typeof line === "string")));
        requireContract(!("referenceAnswers" in item) && !("checklist" in item) && !("hiddenAnswerKey" in item) && !("score" in item) && !("evaluation" in item));
        requireContract(item.answered || item.reference == null);
        requireContract(integer(item.workload?.sourceCharacterCount) && item.workload.estimatedAnswerCharacters === null && item.workload.estimateStatus === "NOT_SPECIFIED");
        requireContract(Array.isArray(item.attempts));
        for (const attempt of item.attempts) {
            requireContract(attempt.resultPolicy === "REFERENCE_ONLY" && attempt.evaluation === null && typeof attempt.answer === "string");
            if (plan.personalizedFeedbackStatus === "ACTIVE_QA") {
                const feedback = attempt.feedback;
                requireContract(feedback && ["PENDING", "PROCESSING", "SUCCEEDED", "FAILED", "UNCERTAIN"].includes(feedback.status));
                requireContract(typeof feedback.canRetry === "boolean" && (feedback.failureCode === null || typeof feedback.failureCode === "string"));
                requireContract(feedback.status === "SUCCEEDED" ? feedback.result !== null : feedback.result === null);
                requireContract(!feedback.canRetry || ["FAILED", "PROCESSING"].includes(feedback.status));
                if (feedback.result) {
                    const result = feedback.result;
                    requireContract(result.policyVersion === "curated-writing-feedback-v1" && result.resultPolicy === "REFERENCE_ONLY");
                    requireContract(Array.isArray(result.observations) && Array.isArray(result.necessaryCorrections) && Array.isArray(result.optionalAlternatives) && Array.isArray(result.uncertainties));
                    requireContract(result.observations.length === item.reference?.checklist.length);
                    const requirementIds = new Set(result.observations.map((row) => row.requirementId));
                    requireContract(requirementIds.size === result.observations.length);
                    for (const row of result.observations) {
                        requireContract(["MET", "UNMET", "UNCERTAIN"].includes(row.status) && Array.isArray(row.answerQuotes));
                        requireContract(row.answerQuotes.every((quote) => typeof quote === "string" && attempt.answer.includes(quote)));
                    }
                    for (const row of [...result.necessaryCorrections, ...result.optionalAlternatives]) {
                        requireContract(attempt.answer.includes(row.original) && typeof row.replacement === "string" && row.replacement.length > 0);
                    }
                }
            } else requireContract(attempt.feedback === undefined);
        }
        requireContract(item.answered === (item.attempts.length > 0));
        if (item.reference) {
            requireContract(item.reference.isOnlyCorrectAnswer === false);
            requireContract([item.reference.checklist, item.reference.referenceAnswers].every((lines) => Array.isArray(lines) && lines.every((line) => typeof line === "string")));
        }
        if (item.answered) submitted += 1;
        if (item.attempts.at(-1)?.feedback?.status === "SUCCEEDED") feedbackCompleted += 1;
    }
    requireContract(submitted === plan.submittedItemCount);
    requireContract(feedbackCompleted === plan.feedbackCompletedItemCount);
    requireContract(difficulties.every((difficulty) => actualByDifficulty[difficulty] === plan.actualDistribution[difficulty]));
    return plan;
}
