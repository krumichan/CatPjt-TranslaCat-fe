import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import {
    isSpeakingEvaluationPending, shouldPollSpeakingSession, shouldPollSpeakingEvaluation,
    canRetryReadAloudEvaluation, readAloudEvaluationStatusKey,
} from "../../src/features/language-learning/speaking/evaluationState.ts";

const detail = (status, problemStatuses = []) => ({
    session: { evaluationStatus: status },
    readAloudProblemEvaluations: problemStatuses.map((status, index) => ({ problemIndex: index + 1, status })),
});
for (const status of ["PENDING", "EVALUATING"]) {
    test(`aggregate ${status} continues polling`, () => {
        assert.equal(isSpeakingEvaluationPending(status), true);
        assert.equal(shouldPollSpeakingSession(detail(status)), true);
        assert.equal(shouldPollSpeakingEvaluation(null, detail(status)), true);
    });
    test(`individual ${status} continues polling after aggregate completion`, () => {
        assert.equal(shouldPollSpeakingSession(detail("EVALUATED", ["EVALUATED", status])), true);
        assert.equal(shouldPollSpeakingEvaluation({ status: "EVALUATED" }, detail("EVALUATED", [status])), false);
    });
}
for (const status of ["FAILED", "NOT_REQUESTED", "EVALUATED", "INSUFFICIENT_EVIDENCE"]) {
    test(`${status} is terminal when no individual evaluation remains pending`, () => {
        assert.equal(shouldPollSpeakingSession(detail(status, ["EVALUATED", "INSUFFICIENT_EVIDENCE"])), false);
        assert.equal(isSpeakingEvaluationPending(status), false);
    });
}
test("newly materialized result is fetched even when the detail response arrives first", () => {
    assert.equal(shouldPollSpeakingEvaluation(null, detail("EVALUATED")), true);
    assert.equal(shouldPollSpeakingEvaluation(null, detail("INSUFFICIENT_EVIDENCE")), true);
    assert.equal(shouldPollSpeakingEvaluation(null, detail("NOT_REQUESTED")), false);
    assert.equal(shouldPollSpeakingEvaluation(null, detail("FAILED")), false);
});
test("initial data absence retains polling without inventing success", () => {
    assert.equal(shouldPollSpeakingSession(null), true);
    assert.equal(shouldPollSpeakingEvaluation(null, null), true);
});
test("only a failed problem with remaining manual attempts is retryable", () => {
    assert.equal(canRetryReadAloudEvaluation({ status: "FAILED", manualRetryCount: 0, manualRetryLimit: 1 }), true);
    assert.equal(canRetryReadAloudEvaluation({ status: "FAILED", manualRetryCount: 1, manualRetryLimit: 1 }), false);
    assert.equal(canRetryReadAloudEvaluation({ status: "FAILED", manualRetryCount: 0, manualRetryLimit: 0 }), false);
    for (const status of ["PENDING", "EVALUATING", "EVALUATED", "NOT_REQUESTED", "INSUFFICIENT_EVIDENCE"]) {
        assert.equal(canRetryReadAloudEvaluation({ status, manualRetryCount: 0, manualRetryLimit: 1 }), false);
    }
    assert.equal(canRetryReadAloudEvaluation({ status: "FAILED" }), true);
});
test("future statuses use an explicit translation fallback", () => {
    assert.equal(readAloudEvaluationStatusKey("FUTURE_STATUS"), "UNKNOWN");
    assert.equal(readAloudEvaluationStatusKey("FAILED"), "FAILED");
});
for (const locale of ["ko", "ja", "learning"]) {
    test(`retry and terminal labels exist in ${locale}`, () => {
        const root = JSON.parse(readFileSync(new URL(`../../messages/${locale}/languageLearning.json`, import.meta.url), "utf8"));
        const evaluation = root.LanguageLearning.speaking.evaluation;
        assert.ok(evaluation.notRequestedTitle);
        assert.ok(evaluation.notRequestedDescription);
        for (const status of ["PENDING", "EVALUATING", "EVALUATED", "INSUFFICIENT_EVIDENCE", "FAILED", "NOT_REQUESTED", "UNKNOWN"]) {
            assert.ok(evaluation.problemResults.status[status]);
        }
        for (const key of ["title", "description", "problem", "retry", "retrying", "retryFailed", "limitReached"]) {
            assert.ok(evaluation.problemResults[key]);
        }
    });
}
