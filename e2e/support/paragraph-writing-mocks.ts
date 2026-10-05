import type { Page } from "@playwright/test";
import type { DailyWritingType } from "@/types/language-learning/common";
import type { ParagraphWritingPlan, ParagraphWritingPreview } from "@/types/language-learning/paragraphWriting";
import { fulfillApiJson } from "./api-mocks";
import { mockLanguageLearningBase } from "./language-learning-mocks";
import { responseDto } from "./mock-data";

export function paragraphPlan(target = 5, acquired = target, writingType: DailyWritingType = "TRANSLATION"): ParagraphWritingPlan {
    return {
        policyVersion: "curated-writing-variable-n-v1", resultPolicy: "REFERENCE_ONLY", writingType, baseBand: 3,
        dailySetId: 910, learningDate: "2026-10-04", releaseId: "synthetic-browser-fixture", originLanguage: "ko", learningLanguage: "en",
        targetItemCount: target, acquiredItemCount: acquired, remainingItemCount: target - acquired,
        desiredDistribution: { REVIEW: 0, NORMAL: target, CHALLENGE: 0 }, actualDistribution: { REVIEW: 0, NORMAL: acquired, CHALLENGE: 0 },
        distributionDeviation: { REVIEW: 0, NORMAL: acquired - target, CHALLENGE: 0 },
        shortages: target === acquired ? [] : [{ difficulty: "NORMAL", targetBand: 3, missingCount: target - acquired }],
        status: acquired < target ? "PARTIAL" : "READY", sentenceCount: target, generatedItemCount: acquired,
        submittedItemCount: 0, feedbackCompletedItemCount: 0, planRevision: 1, replacementCount: 0, rePractice: false, reviewAvailable: true,
        personalizedFeedbackStatus: "DISABLED_PENDING_QUALITY_GATE", supplyStopReason: null,
        items: Array.from({ length: acquired }, (_, index) => {
            const originText = `연습 과제 ${index + 1}\n\n이 안내문은 여러 문장으로 구성된 첫 문단입니다. 내용을 그대로 전달해 주세요.\n\n두 번째 문단의 조건도 확인해 주세요.`;
            return {
            itemId: 1000 + index, order: index + 1, difficulty: "NORMAL", targetBand: 3,
            catalogId: `fixture-${index}`, catalogVersion: 1, contentRevision: `revision-${index}`,
            originText,
            providedFacts: writingType === "GUIDED" ? ["오전 10시\n회의실 예약"] : [],
            requiredIntents: ["상황 설명"], responseConstraints: ["두 문단으로 작성"], topicKey: "synthetic",
            answered: false, canSubmit: true, attempts: [],
            workload: { sourceCharacterCount: originText.length, estimatedAnswerCharacters: null, estimateStatus: "NOT_SPECIFIED" },
            };
        }),
    };
}

function previewOf(plan: ParagraphWritingPlan): ParagraphWritingPreview {
    const { policyVersion, resultPolicy, writingType, baseBand, targetItemCount, acquiredItemCount, remainingItemCount, desiredDistribution, actualDistribution, distributionDeviation, shortages, rePractice } = plan;
    return { policyVersion, resultPolicy, writingType, baseBand, targetItemCount, acquiredItemCount, remainingItemCount, desiredDistribution, actualDistribution, distributionDeviation, shortages, rePractice,
        qaOnly: true, canStart: remainingItemCount === 0, requiresPartialConsent: remainingItemCount > 0 };
}

export async function mockParagraphWriting(page: Page, options: { available?: number; submitFailure?: number; leak?: boolean } = {}) {
    await mockLanguageLearningBase(page);
    const state = { stored: null as ParagraphWritingPlan | null, starts: 0, answers: 0, legacy: 0, restores: 0, readStatus: 200, writes: [] as { path: string; body: Record<string, unknown> }[] };
    let failure = options.submitFailure ?? 0;

    // 모의 계약만 사용한다. 구 정책이나 생성 API로의 우회 요청도 수집한다.
    await page.route("**/api/v1/language-learning/writing/daily**", async (route) => {
        state.legacy += 1;
        await route.fulfill({ status: 500 });
    });
    await page.route("**/api/v1/language-learning/writing/curated/plans**", async (route) => {
        const path = new URL(route.request().url()).pathname.split("/plans")[1];
        const method = route.request().method();
        const body = method === "POST" ? route.request().postDataJSON() as Record<string, unknown> : {};
        if (method === "POST") state.writes.push({ path, body });
        if (path === "/config") {
            await fulfillApiJson(route, responseDto({ policyVersion: "curated-writing-variable-n-v1", defaultTargetItemCount: 5, minTargetItemCount: 1, maxTargetItemCount: 100,
                workerBatchSize: 20, pageSize: 10, answerMaxLength: 10000, qaOnly: true, personalizedFeedbackEnabled: false, distribution: { REVIEW: 20, NORMAL: 60, CHALLENGE: 20 } }));
        } else if (path === "/preview") {
            const target = body.targetItemCount as number;
            await fulfillApiJson(route, responseDto(previewOf(paragraphPlan(target, Math.min(target, options.available ?? target), body.writingType as DailyWritingType))));
        } else if (path === "" && method === "POST") {
            state.starts += 1;
            const target = body.targetItemCount as number;
            state.stored = paragraphPlan(target, Math.min(target, options.available ?? target), body.writingType as DailyWritingType);
            if (options.leak) state.stored.items[0].reference = { checklist: ["HIDDEN-CHECK"], referenceAnswers: ["HIDDEN-ANSWER"], alternativeNote: "hidden", isOnlyCorrectAnswer: false };
            await fulfillApiJson(route, responseDto(state.stored));
        } else if (path.endsWith("/answers")) {
            state.answers += 1;
            if (failure) {
                const status = failure;
                failure = 0;
                await fulfillApiJson(route, { body: { errorCode: status === 409 ? "WRITING_ITEM_STALE" : "FAILURE" } }, status);
                return;
            }
            const item = state.stored!.items.find((value) => value.itemId === Number(path.split("/")[2]))!;
            item.answered = true;
            item.canSubmit = false;
            item.attempts = [{ answerId: item.itemId + 9000, attemptDate: "2026-10-04", answer: body.answer as string, submittedAt: "2026-10-04T00:00:00Z", resultPolicy: "REFERENCE_ONLY", evaluation: null }];
            item.reference = { checklist: ["문단 조건 전달"], referenceAnswers: ["First reference paragraph.\n\nSecond reference paragraph."], alternativeNote: "다른 답안도 가능합니다.", isOnlyCorrectAnswer: false };
            state.stored!.submittedItemCount += 1;
            if (state.stored!.submittedItemCount === state.stored!.targetItemCount) state.stored!.status = "COMPLETED";
            await fulfillApiJson(route, responseDto(state.stored));
        } else if (path.endsWith("/target") || path.endsWith("/restore")) {
            const old = state.stored!;
            const target = path.endsWith("/target") ? body.targetItemCount as number : old.targetItemCount;
            const next = paragraphPlan(target, target, old.writingType);
            next.items.splice(0, old.items.length, ...old.items);
            next.submittedItemCount = old.submittedItemCount;
            next.planRevision = old.planRevision + (path.endsWith("/target") ? 1 : 0);
            state.stored = next;
            if (path.endsWith("/restore")) state.restores += 1;
            await fulfillApiJson(route, responseDto(next));
        } else if (method === "GET" && state.stored) {
            await fulfillApiJson(route, state.readStatus === 200 ? responseDto(state.stored) : { body: { errorCode: "NOT_FOUND" } }, state.readStatus);
        } else {
            await fulfillApiJson(route, { body: { errorCode: "NOT_FOUND" } }, 404);
        }
    });
    return state;
}
