import assert from "node:assert/strict";
import test from "node:test";
import { createHash } from "node:crypto";
import { verifyCompletedCandidatePair, verifyCompletedCandidatePairBytes } from "../../e2e/support/novel-audio-case-contract.ts";

const scenario = { stack: "candidate", actorId: "9000451", novel: "n2604fresh", episode: "3",
    sourceFileSha256: "a".repeat(64), sourceRevision: "b".repeat(64), expectedTranslationPairsSha256: "c".repeat(64) };
const completed = { stack: scenario.stack, actorId: scenario.actorId, novel: scenario.novel, episode: scenario.episode,
    sourceFileSha256: scenario.sourceFileSha256, outcome: "SUCCEEDED", evidence: {
        orderedTranslationsSha256: scenario.expectedTranslationPairsSha256,
        snapshot: { state: "SUCCEEDED", revision: scenario.sourceRevision },
    } };

test("fresh campaign audio accepts its completed candidate without hardcoded old actor allocation", () => {
    // 준비 / 실행 / 검증: 새 namespace/계정도 동일한 완료 근거가 필요하다.
    assert.equal(verifyCompletedCandidatePair(scenario, completed).verified, true);
});

test("an old allowed actor cannot use a failed or differently bound translation as audio proof", () => {
    // 준비: 이전 번호 범위 안에서도 실제 완료 결과가 없으면 유료 낭독 준비를 거부한다.
    const old = { ...scenario, actorId: "9000335" };
    const oldPair = { ...completed, actorId: old.actorId };

    // 실행 / 검증: actor, 원문, 번역 또는 완료 상태 하나라도 다르면 실패한다.
    for (const changed of [{ outcome: "FAILED" }, { actorId: "9000336" }, { novel: "other" },
        { episode: "4" }, { stack: "baseline" }, { sourceFileSha256: "d".repeat(64) }, { evidence: null }]) {
        assert.throws(() => verifyCompletedCandidatePair(old, { ...oldPair, ...changed }), /COMPLETED_AUDIO_BINDING_MISMATCH/);
    }
    for (const changed of [{ orderedTranslationsSha256: "d".repeat(64) },
        { snapshot: { state: "PARTIAL", revision: old.sourceRevision } },
        { snapshot: { state: "SUCCEEDED", revision: "e".repeat(64) } }]) {
        assert.throws(() => verifyCompletedCandidatePair(old, { ...oldPair, evidence: { ...completed.evidence, ...changed } }), /COMPLETED_AUDIO_BINDING_MISMATCH/);
    }
});

test("only a bounded synthetic candidate actor and explicit source and translation hashes are accepted", () => {
    // 준비 / 실행 / 검증: 빈 번호나 임의 계정, 누락된 binding은 통과시키지 않는다.
    for (const changed of [{ actorId: "9000100" }, { actorId: "9001101" }, { actorId: "" }, { actorId: "9000451.0" },
        { stack: "baseline" }, { sourceFileSha256: undefined }, { sourceRevision: undefined }, { expectedTranslationPairsSha256: undefined }]) {
        assert.throws(() => verifyCompletedCandidatePair({ ...scenario, ...changed }, completed), /COMPLETED_AUDIO_BINDING_MISMATCH/);
    }
});

test("completed evidence bytes are immutable even when identity fields still look correct", () => {
    // 준비
    const bytes = Buffer.from(JSON.stringify(completed));
    const bound = { ...scenario, completedCandidatePairFileSha256: createHash("sha256").update(bytes).digest("hex") };

    // 실행 / 검증: source·번역 identity와 별도로 증거 파일의 교체도 실패시킨다.
    assert.equal(verifyCompletedCandidatePairBytes(bound, bytes).verified, true);
    assert.throws(() => verifyCompletedCandidatePairBytes(bound, Buffer.concat([bytes, Buffer.from(" ")])), /COMPLETED_AUDIO_FILE_MISMATCH/);
    assert.throws(() => verifyCompletedCandidatePairBytes(scenario, bytes), /COMPLETED_AUDIO_FILE_MISMATCH/);
});
