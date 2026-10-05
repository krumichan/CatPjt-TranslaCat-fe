import assert from "node:assert/strict";
import test from "node:test";
import { qualityPairSnapshot } from "../../e2e/support/novel-quality-pairs.ts";

test("quality evidence preserves failed and pending units alongside exact successful translation", () => {
    // 준비: partial 결과의 미완료 문장도 품질/실패 분모에서 제외하지 않는다.
    const body = { traceId: "trace", runTraceId: "run", revision: "r", state: "PARTIAL", eventSequence: 3,
        accessToken: "never-persist", evaluatorMemo: "never-persist", segments: [
            { id: "a", order: 0, plainJa: " 猫。\n", rawJa: " 猫。\n", ko: " 고양이.\n", status: "SUCCEEDED", accessToken: "never-persist" },
            { id: "b", order: 1, plainJa: "犬。", rawJa: "犬。", ko: null, status: "FAILED", errorCode: "PROVIDER_TIMEOUT" },
            { id: "c", order: 2, plainJa: "", rawJa: "", ko: null, status: "PENDING" },
        ] };

    // 실행 / 검증: 공백/null/오류 상태를 그대로 보존하고 인증·평가 필드는 제거한다.
    const evidence = qualityPairSnapshot(body);
    assert.equal(evidence.snapshot.segments.length, 3);
    assert.equal(evidence.orderedSegments[0].ko, " 고양이.\n");
    assert.equal(evidence.orderedSegments[1].ko, null);
    assert.equal(evidence.orderedSegments[1].errorCode, "PROVIDER_TIMEOUT");
    assert.equal(evidence.orderedSegments[2].status, "PENDING");
    assert.equal(JSON.stringify(evidence).includes("never-persist"), false);
    assert.equal(evidence.idsUnique, true);
    assert.equal(evidence.receivedOrderValid, true);
});

test("quality source hash is independent of translation while exact snapshot hash changes", () => {
    // 준비
    const body = { revision: "r", state: "RUNNING", segments: [{ id: "a", order: 0, plainJa: "猫。", rawJa: "猫。", ko: null }] };

    // 실행 / 검증: 원문 정렬과 수정 여부를 독립적으로 추적한다.
    const partial = qualityPairSnapshot(body);
    const complete = qualityPairSnapshot({ ...body, state: "SUCCEEDED", segments: [{ ...body.segments[0], ko: "고양이." }] });
    assert.equal(partial.orderedSourceSha256, complete.orderedSourceSha256);
    assert.notEqual(partial.snapshotSha256, complete.snapshotSha256);
    assert.notEqual(partial.orderedTranslationsSha256, complete.orderedTranslationsSha256);
    assert.equal(qualityPairSnapshot({ code: "UPSTREAM_TIMEOUT" }), null);
    assert.equal(qualityPairSnapshot({ segments: [null] }), null);
});
