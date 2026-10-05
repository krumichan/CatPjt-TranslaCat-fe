import assert from "node:assert/strict";
import test from "node:test";
import { verifyExecutionContract } from "../../e2e/support/novel-execution-contract.ts";

test("actual start and terminal execution must match every explicitly bound policy field", () => {
    // 준비: 모델명만 같은 잘못된 정책/청크 계획도 통과시키지 않는다.
    const expected = { profileIdentity: "sol-low", requestedN: 5, requestedC: 2, planner: "SEMANTIC", segmentationVersion: "v1", policyFingerprint: "abc" };
    const body = { segmentationVersion: "v1", execution: { ...expected } };

    // 실행 / 검증: 타입 차이, 누락, 다른 정책을 전부 실패 처리한다.
    assert.equal(verifyExecutionContract(expected, body).verified, true);
    for (const changed of [{ requestedN: 4 }, { requestedC: "2" }, { profileIdentity: undefined }, { policyFingerprint: "def" }]) {
        assert.throws(() => verifyExecutionContract(expected, { ...body, execution: { ...body.execution, ...changed } }), /EXECUTION_CONTRACT_MISMATCH/);
    }
    assert.throws(() => verifyExecutionContract(expected, { ...body, segmentationVersion: "v2" }), /EXECUTION_CONTRACT_MISMATCH/);
    assert.equal(verifyExecutionContract(undefined, body).verified, false);
});

test("fixed N1 C1 policy accepts fresh-source plans and rejects a stale length-based N8 policy", () => {
    // 준비: 원문 길이나 campaign 이름으로 분할값을 다시 계산하지 않는다.
    const expected = { requestedN: 1, actualN: 1, requestedC: 1, effectiveC: 1,
        planner: "SEMANTIC", contextPolicy: "CONTIGUOUS_WIDE_V2", profileIdentity: "sol-low",
        policyFingerprint: "fresh-fixed-n1", sourceCodePoints: 10_003, segmentationVersion: "ja-boundaries-v1" };
    const actual = { execution: { ...expected }, segmentationVersion: expected.segmentationVersion };

    // 실행 / 검증: 길이가 큰 원문도 N1을 유지하고, 이전 N8 응답은 실제 POST 후 guard 대상으로 실패한다.
    assert.equal(verifyExecutionContract(expected, actual).verified, true);
    assert.throws(() => verifyExecutionContract(expected, { ...actual, execution: {
        ...actual.execution, requestedN: 8, actualN: 8, requestedC: 8, effectiveC: 8,
    } }), /EXECUTION_CONTRACT_MISMATCH/);
});
