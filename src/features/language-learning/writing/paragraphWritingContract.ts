import {
    PARAGRAPH_WRITING_POLICY,
    type ParagraphWritingConfig,
    type ParagraphWritingPlan,
    type ParagraphWritingPreview,
    type ParagraphFeedbackResult,
    type ParagraphFeedbackPatch,
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

function validateRequirementParts(row: ParagraphFeedbackResult["observations"][number], answer: string, requirements?: string[], conditionIds?: Set<string>): void {
    // 부분 누락에서도 정상 요소의 근거는 남기고, 전체 상태는 요소의 존재 판정으로 집계한다.
    const parts = row.requirementParts;
    requireContract(Array.isArray(parts) && parts.length > 0 && /^C[1-9]\d*$/.test(row.requirementId));
    const statuses = new Set<string>();
    const segments = new Set<string>();
    let coverage = "";
    for (const part of parts) {
        requireContract(part && typeof part.requirementQuote === "string" && part.requirementQuote.length > 0);
        requireContract(["PRESENT", "ABSENT", "CONFLICT", "UNCERTAIN"].includes(part.status));
        requireContract(Array.isArray(part.evidence) && Array.isArray(part.taskFactIds));
        coverage += part.requirementQuote;
        statuses.add(part.status);
        requireContract((part.status === "ABSENT") === (part.evidence.length === 0));
        for (const evidence of part.evidence) {
            requireContract(evidence && /^S[1-9]\d*$/.test(evidence.segmentId) && typeof evidence.quote === "string"
                && evidence.quote.trim().length > 0 && answer.includes(evidence.quote));
            segments.add(evidence.segmentId);
        }
        requireContract(part.taskFactIds.every((id) => typeof id === "string" && /^T[1-9]\d*$/.test(id)));
        if (conditionIds) {
            // 가이드의 명시 지시만 P 권한이다. 개인 선택이나 제공 사실 T와 섞지 않는다.
            requireContract(Array.isArray(part.taskConditionIds));
            requireContract(new Set(part.taskConditionIds).size === part.taskConditionIds.length
                && part.taskConditionIds.every((id) => typeof id === "string" && conditionIds.has(id)));
        }
    }
    if (requirements?.length) {
        const index = Number(row.requirementId.slice(1)) - 1;
        requireContract(Number.isSafeInteger(index) && index >= 0 && coverage === requirements[index]);
    }

    // 관계 enum과 부분 근거의 일관성을 검사한다. 의미 판정 자체를 클라이언트가 새로 만들지 않는다.
    const absent = statuses.has("ABSENT");
    const conflict = statuses.has("CONFLICT");
    const uncertain = statuses.has("UNCERTAIN");
    const missing = segments.size === 0;
    requireContract(row.status === (absent || conflict ? "UNMET" : uncertain ? "UNCERTAIN" : "MET"));
    requireContract(row.evidenceKind === (missing ? "MISSING_REQUIREMENT" : "LEARNER_TEXT"));
    const checks = row.relationChecks;
    const relations = [checks?.causality, checks?.chronology, checks?.specificity, checks?.stance];
    requireContract(relations.every((value) => value && ["PRESERVED", "CONFLICT", "NOT_APPLICABLE", "UNCERTAIN"].includes(value)));
    requireContract(relations.includes("CONFLICT") === conflict && relations.includes("UNCERTAIN") === uncertain);
    if (!missing) {
        requireContract(row.segmentIds.length === segments.size && row.segmentIds.every((id, index) => id === [...segments][index]));
        for (const part of parts) {
            for (const evidence of part.evidence) {
                const index = row.segmentIds.indexOf(evidence.segmentId);
                requireContract(index >= 0 && row.answerQuotes[index]?.includes(evidence.quote));
            }
        }
    }
}

function validatePatch(row: { original: string; replacement: string; patch?: ParagraphFeedbackPatch }): void {
    // 패치 밖의 원문은 한 글자도 바뀌지 않아야 하며 삭제 패치는 빈 교체문을 허용한다.
    const patch = row.patch;
    requireContract(patch && typeof patch.original === "string" && patch.original.length > 0 && typeof patch.replacement === "string");
    requireContract(typeof row.original === "string" && typeof row.replacement === "string" && row.replacement.trim().length > 0 && row.replacement.length <= 4000);
    const index = row.original.indexOf(patch.original);
    requireContract(index >= 0 && index === row.original.lastIndexOf(patch.original) && patch.original !== patch.replacement);
    requireContract(row.replacement === row.original.slice(0, index) + patch.replacement + row.original.slice(index + patch.original.length));
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
    // 과거 계획의 활동은 조회 때 backfill하지 않는다. 새 활동은 저장 계획의 단위·언어·진행과 일치해야 한다.
    if (plan.activity != null) {
        const activity = plan.activity;
        const metadata = activity.metadata;
        requireContract(activity.referenceId === `curated-plan:${plan.dailySetId}` && activity.learningDate === plan.learningDate);
        requireContract(activity.status === (plan.status === "COMPLETED" ? "COMPLETED" : "IN_PROGRESS"));
        requireContract(metadata?.activityUnit === "PLAN" && metadata.planId === plan.dailySetId);
        requireContract(metadata.policyVersion === plan.policyVersion && metadata.resultPolicy === "REFERENCE_ONLY");
        requireContract(metadata.writingType === plan.writingType && metadata.originLanguage === plan.originLanguage && metadata.learningLanguage === plan.learningLanguage);
        requireContract(metadata.targetItemCount === plan.targetItemCount && metadata.acquiredItemCount === plan.acquiredItemCount && metadata.submittedItemCount === plan.submittedItemCount);
        requireContract(metadata.submittedItemCount > 0 && metadata.durationStatus === "NOT_MEASURED");
    }
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
        requireContract(item.preparationRequestKey == null ||
            (typeof item.preparationRequestKey === "string" && /^[a-zA-Z0-9._-]{1,80}$/.test(item.preparationRequestKey)));
        requireContract(typeof item.originText === "string" && typeof item.answered === "boolean" && typeof item.canSubmit === "boolean");
        requireContract([item.providedFacts, item.requiredIntents, item.responseConstraints].every((lines) => Array.isArray(lines) && lines.every((line) => typeof line === "string")));
        requireContract(item.taskRequirements === undefined || (Array.isArray(item.taskRequirements) && item.taskRequirements.every((line) => typeof line === "string" && line.trim().length > 0)));
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
                    requireContract(["curated-writing-feedback-v1", "curated-writing-feedback-v2", "curated-writing-feedback-v3", "curated-writing-feedback-v4", "curated-writing-feedback-v5", "curated-writing-feedback-v6", "curated-writing-feedback-v7", "curated-writing-feedback-v8", "curated-writing-feedback-v9", "curated-writing-feedback-v10"].includes(result.policyVersion) && result.resultPolicy === "REFERENCE_ONLY");
                    const grounded = result.policyVersion !== "curated-writing-feedback-v1";
                    const typed = ["curated-writing-feedback-v4", "curated-writing-feedback-v5", "curated-writing-feedback-v6", "curated-writing-feedback-v7", "curated-writing-feedback-v8", "curated-writing-feedback-v9", "curated-writing-feedback-v10"].includes(result.policyVersion);
                    const prescribed = result.policyVersion === "curated-writing-feedback-v8" || result.policyVersion === "curated-writing-feedback-v9" || result.policyVersion === "curated-writing-feedback-v10";
                    const structured = result.policyVersion === "curated-writing-feedback-v6" || result.policyVersion === "curated-writing-feedback-v7" || prescribed;
                    const conditionIds = new Set(plan.writingType === "GUIDED"
                        ? [...new Set(item.requiredIntents.filter((text) => text.trim().length > 0))].map((_, index) => `P${index + 1}`) : []);
                    requireContract(Array.isArray(result.observations) && Array.isArray(result.necessaryCorrections) && Array.isArray(result.optionalAlternatives) && Array.isArray(result.uncertainties));
                    requireContract(result.observations.length === item.reference?.checklist.length);
                    const requirementIds = new Set(result.observations.map((row) => row.requirementId));
                    requireContract(requirementIds.size === result.observations.length);
                    const referencedConditions = new Set<string>();
                    for (const row of result.observations) {
                        requireContract(["MET", "UNMET", "UNCERTAIN"].includes(row.status) && Array.isArray(row.answerQuotes));
                        requireContract(row.answerQuotes.every((quote) => typeof quote === "string" && attempt.answer.includes(quote)));
                        // 옛 저장 결과는 변환하지 않는다. 새 계약에서만 누락과 실제 원문 근거를 구분한다.
                        if (grounded) {
                            requireContract(row.evidenceKind === "LEARNER_TEXT" || row.evidenceKind === "MISSING_REQUIREMENT");
                            requireContract(Array.isArray(row.segmentIds));
                            if (row.evidenceKind === "MISSING_REQUIREMENT") requireContract(row.status === "UNMET" && row.segmentIds.length === 0 && row.answerQuotes.length === 0);
                            else requireContract(row.segmentIds.length > 0 && row.answerQuotes.length === row.segmentIds.length);
                        }
                        if (structured) validateRequirementParts(row, attempt.answer, item.taskRequirements, prescribed ? conditionIds : undefined);
                        else if (typed) {
                            // v4는 인용 유무뿐 아니라 관계 판정과 관찰 상태의 모순도 중계하지 않는다.
                            const checks = row.relationChecks;
                            const relations = [checks?.causality, checks?.chronology, checks?.specificity, checks?.stance];
                            requireContract(relations.every((value) => value && ["PRESERVED", "CONFLICT", "NOT_APPLICABLE", "UNCERTAIN"].includes(value)));
                            const conflict = relations.includes("CONFLICT");
                            const uncertain = relations.includes("UNCERTAIN");
                            requireContract(row.status !== "MET" || (!conflict && !uncertain));
                            requireContract(!conflict || row.status === "UNMET");
                            requireContract(conflict || !uncertain || row.status === "UNCERTAIN");
                            if (row.evidenceKind === "MISSING_REQUIREMENT") requireContract(relations.every((value) => value === "NOT_APPLICABLE"));
                        }
                        if (prescribed) row.requirementParts?.forEach((part) => part.taskConditionIds?.forEach((id) => referencedConditions.add(id)));
                    }
                    if (prescribed) requireContract(referencedConditions.size === conditionIds.size && [...conditionIds].every((id) => referencedConditions.has(id)));
                    for (const row of [...result.necessaryCorrections, ...result.optionalAlternatives]) {
                        requireContract(attempt.answer.includes(row.original) && typeof row.replacement === "string" && row.replacement.length > 0);
                        if (structured) validatePatch(row);
                    }
                    if (grounded) {
                        for (const row of result.necessaryCorrections) {
                            const observation = result.observations.find((entry) => entry.requirementId === row.requirementId);
                            requireContract(observation?.evidenceKind === "LEARNER_TEXT" && observation.segmentIds.includes(row.segmentId));
                            if (structured) {
                                const index = observation.segmentIds.indexOf(row.segmentId);
                                requireContract(observation.answerQuotes[index] === row.original);
                                // 사실 교정은 충돌한 사실의 인용에만 적용하고 같은 문장의 정상 사실을 보존한다.
                                requireContract(observation.requirementParts?.some((part) =>
                                    (row.issueType !== "TASK_FACT_CONFLICT" || (part.status === "CONFLICT" && part.taskFactIds.includes(row.sourceFactId ?? "")))
                                    && (row.issueType !== "TASK_CONDITION_CONFLICT" || (part.status === "CONFLICT" && part.taskConditionIds?.includes(row.sourceAuthorityId ?? "")))
                                    && part.evidence.some((evidence) => evidence.segmentId === row.segmentId && evidence.quote.includes(row.patch?.original ?? ""))));
                            }
                            if (typed) {
                                // 개인 의견 보충을 사실 교정으로 바꾸지 않도록 교정 권한을 유형별로 확인한다.
                                requireContract(typeof row.sourceFactId === "string");
                                if (prescribed) requireContract(typeof row.sourceAuthorityId === "string"
                                    && (row.issueType === "TASK_CONDITION_CONFLICT" ? conditionIds.has(row.sourceAuthorityId) : row.sourceAuthorityId === ""));
                                if (row.issueType === "LANGUAGE_FORM") {
                                    requireContract(row.sourceFactId === "" && ["SPELLING", "INFLECTION", "SYNTAX"].includes(row.formReason ?? ""));
                                    const letters = (text: string) => text.normalize("NFKC").replace(/[^\p{L}\p{N}]/gu, "");
                                    requireContract(letters(row.original) !== letters(row.replacement));
                                } else if (prescribed && row.issueType === "TASK_CONDITION_CONFLICT") {
                                    requireContract(row.sourceFactId === "" && row.formReason === "NONE");
                                    requireContract(observation.status === "UNMET" && Object.values(observation.relationChecks ?? {}).includes("CONFLICT"));
                                } else {
                                    requireContract(row.issueType === "TASK_FACT_CONFLICT" && /^T[1-9]\d*$/.test(row.sourceFactId ?? "") && row.formReason === "NONE");
                                    requireContract(observation?.status === "UNMET" && Object.values(observation.relationChecks ?? {}).includes("CONFLICT"));
                                }
                            }
                        }
                        for (const row of result.optionalAlternatives) {
                            requireContract(row.suggestionKind === "EXPRESSION_ONLY" || row.suggestionKind === "HYPOTHETICAL_EXAMPLE");
                            if (result.policyVersion === "curated-writing-feedback-v5" || structured) {
                                // 표현 제안의 사실·순서·입장 보존을 확인하며, 가상 예시는 기존 별도 표시를 유지한다.
                                const checks = row.relationChecks;
                                const relations = [checks?.causality, checks?.chronology, checks?.specificity, checks?.stance];
                                requireContract(relations.every((value) => value && ["PRESERVED", "CONFLICT", "NOT_APPLICABLE", "UNCERTAIN"].includes(value)));
                                if (row.suggestionKind === "EXPRESSION_ONLY") requireContract(!relations.includes("CONFLICT") && !relations.includes("UNCERTAIN"));
                            }
                            if (structured) {
                                const observation = result.observations.find((entry) => entry.requirementId === row.requirementId);
                                requireContract(observation && /^S[1-9]\d*$/.test(row.segmentId));
                                if (row.suggestionKind === "EXPRESSION_ONLY") {
                                    requireContract(observation.status === "MET" && observation.segmentIds.includes(row.segmentId));
                                    requireContract(observation.answerQuotes[observation.segmentIds.indexOf(row.segmentId)] === row.original);
                                    requireContract(!result.necessaryCorrections.some((correction) => correction.segmentId === row.segmentId));
                                }
                            }
                        }
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
