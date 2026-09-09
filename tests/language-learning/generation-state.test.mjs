import assert from "node:assert/strict";
import test from "node:test";

import {
    hasCompleteItemCoverage,
    hasCompleteListeningCoverage,
    hasCompleteSlotCoverage,
    isGenerationPending,
    listeningPreparationRetryTargets,
    selectListeningAttempt,
    shouldPollListeningSession,
} from "../../src/features/language-learning/generationState.ts";

const attempt = (index, overrides = {}) => ({
    attemptId: index + 100,
    itemId: index + 1000,
    itemIndex: index,
    evaluationPurpose: "OFFICIAL",
    status: "READY",
    ...overrides,
});
const session = (overrides = {}) => ({
    status: "IN_PROGRESS",
    dailySetStatus: "PARTIAL",
    targetItemCount: 5,
    attachedItemCount: 1,
    generationFailureMessage: null,
    pendingItemCount: 0,
    generationInProgress: true,
    attempts: [attempt(1)],
    ...overrides,
});

test("one completed item cannot satisfy a five-item target", () => {
    assert.equal(hasCompleteItemCoverage([1], 5), false);
    assert.equal(hasCompleteListeningCoverage(session({ attempts: [attempt(1, { status: "EVALUATED" })] })), false);
});

test("empty and invalid targets never imply completion", () => {
    for (const target of [0, -1, NaN, 1.5]) assert.equal(hasCompleteItemCoverage([], target), false);
    assert.equal(hasCompleteListeningCoverage(undefined), false);
});

test("duplicate items cannot satisfy the target", () => {
    assert.equal(hasCompleteItemCoverage([1, 1, 2, 3, 4], 5), false);
});

test("only real logical slots 1 through target satisfy listening coverage", () => {
    assert.equal(hasCompleteSlotCoverage([1, 2, 3, 4, 6], 5), false);
    assert.equal(hasCompleteSlotCoverage([5, 3, 4, 1, 2], 5), true);
});

test("replacement physical rows cannot count twice for one listening slot", () => {
    const duplicateSlot = [attempt(1), attempt(2), attempt(3), attempt(4), attempt(4, { itemId: 9999, attemptId: 999 })];
    assert.equal(hasCompleteListeningCoverage(session({ attempts: duplicateSlot, attachedItemCount: 5 })), false);
});

test("practice attempts cannot satisfy missing official listening slots", () => {
    const attempts = Array.from({ length: 4 }, (_, index) => attempt(index + 1));
    attempts.push(attempt(5, { evaluationPurpose: "PRACTICE" }));
    assert.equal(hasCompleteListeningCoverage(session({ attempts })), false);
});

test("all five distinct official slots permit completion", () => {
    assert.equal(hasCompleteListeningCoverage(session({ attempts: Array.from({ length: 5 }, (_, index) => attempt(index + 1)) })), true);
});

test("older cached responses without logical coverage fail closed", () => {
    assert.equal(hasCompleteListeningCoverage(session({ targetItemCount: 1, attachedItemCount: undefined, attempts: [attempt(1, { itemIndex: undefined })] })), false);
});

test("Practice pending and generating states poll; partial failures stop", () => {
    for (const state of ["PENDING", "GENERATING"]) assert.equal(isGenerationPending(state), true);
    for (const state of ["READY", "PARTIAL", "FAILED", undefined]) assert.equal(isGenerationPending(state), false);
});

test("session polls while later AI items are generating", () => {
    assert.equal(shouldPollListeningSession(session()), true);
});

test("session continues polling pending TTS after later AI generation failure", () => {
    assert.equal(shouldPollListeningSession(session({ generationInProgress: false, generationFailureMessage: "slot 3 failed", pendingItemCount: 1 })), true);
});

test("session polls an active replacement even if an earlier failure remains", () => {
    assert.equal(shouldPollListeningSession(session({ generationFailureMessage: "TTS failed", generationInProgress: true })), true);
});

test("terminal partial failure with no outstanding work stops polling", () => {
    assert.equal(shouldPollListeningSession(session({ generationInProgress: false, generationFailureMessage: "slot 3 failed", pendingItemCount: 0 })), false);
});

test("a READY set with missing attachment triggers a self-healing poll", () => {
    assert.equal(shouldPollListeningSession(session({ dailySetStatus: "READY", generationInProgress: false })), true);
});

test("generation polling stops after all target slots attach", () => {
    assert.equal(shouldPollListeningSession(session({ attempts: Array.from({ length: 5 }, (_, index) => attempt(index + 1)) })), false);
});

test("abandoned and completed sessions do not generation-poll", () => {
    for (const status of ["ABANDONED", "COMPLETED", "EVALUATING"]) {
        assert.equal(shouldPollListeningSession(session({ status })), false);
    }
});

test("out-of-order TTS readiness does not switch the learner's active item", () => {
    const second = attempt(2, { status: "IN_PROGRESS" });
    assert.equal(selectListeningAttempt([attempt(1), second], second.attemptId), second);
});

test("answer reveal remains visible until the learner continues", () => {
    const revealed = attempt(1, { status: "NOT_EVALUABLE" });
    assert.equal(selectListeningAttempt([revealed, attempt(2)], revealed.attemptId, revealed.attemptId), revealed);
    assert.equal(selectListeningAttempt([revealed, attempt(2)], revealed.attemptId)?.itemIndex, 2);
});

test("generation gaps are detected by logical index, not physical count", () => {
    const items = [
        { itemId: 1, itemIndex: 1, status: "REPLACED", replacementSequence: 0 },
        { itemId: 2, itemIndex: 1, status: "READY", replacementSequence: 1 },
        { itemId: 3, itemIndex: 2, status: "TTS_PENDING", replacementSequence: 0 },
        { itemId: 4, itemIndex: 3, status: "NOT_EVALUABLE", replacementSequence: 0 },
        { itemId: 5, itemIndex: 4, status: "READY", replacementSequence: 0 },
    ];
    assert.deepEqual(listeningPreparationRetryTargets({ targetItemCount: 5, items }), { missingItems: true, ttsItemIds: [4] });
});

test("fully generated sets retry failed TTS only, preserving existing ready items", () => {
    const items = Array.from({ length: 5 }, (_, index) => ({ itemId: index + 1, itemIndex: index + 1, replacementSequence: 0, status: index === 3 ? "NOT_EVALUABLE" : "READY" }));
    assert.deepEqual(listeningPreparationRetryTargets({ targetItemCount: 5, items }), { missingItems: false, ttsItemIds: [4] });
});

test("only the latest replacement in a slot is eligible for TTS retry", () => {
    const items = [
        { itemId: 1, itemIndex: 1, replacementSequence: 0, status: "NOT_EVALUABLE" },
        { itemId: 2, itemIndex: 1, replacementSequence: 1, status: "READY" },
    ];
    assert.deepEqual(listeningPreparationRetryTargets({ targetItemCount: 1, items }), { missingItems: false, ttsItemIds: [] });
});
