import { createHash } from "node:crypto";

export interface CompletedAudioCase {
    stack?: string;
    actorId?: string;
    novel: string;
    episode: string;
    sourceFileSha256?: string;
    sourceRevision?: string;
    expectedTranslationPairsSha256?: string;
    completedCandidatePairFileSha256?: string;
}

export function verifyCompletedCandidatePair(scenario: CompletedAudioCase, value: unknown) {
    const actor = Number(scenario.actorId);
    const hash = (text: unknown): text is string => typeof text === "string" && /^[a-f0-9]{64}$/i.test(text);
    const pair = value as { stack?: string; actorId?: string; novel?: string; episode?: string;
        sourceFileSha256?: string; outcome?: string; evidence?: { orderedTranslationsSha256?: string;
            snapshot?: { state?: string; revision?: string } } } | null;

    // 번호 자체를 완료 증거로 취급하지 않는다. 새 campaign도 실제 성공 결과의 모든 식별자가 맞아야 한다.
    if (scenario.stack !== "candidate" || !/^\d{7}$/.test(scenario.actorId ?? "")
        || !Number.isSafeInteger(actor) || actor < 9000101 || actor > 9001100
        || !hash(scenario.sourceFileSha256) || !hash(scenario.sourceRevision) || !hash(scenario.expectedTranslationPairsSha256)
        || !pair || pair.outcome !== "SUCCEEDED" || pair.evidence?.snapshot?.state !== "SUCCEEDED"
        || ["stack", "actorId", "novel", "episode"].some(key => pair[key as keyof typeof pair] !== scenario[key as keyof CompletedAudioCase])
        || pair.sourceFileSha256?.toLowerCase() !== scenario.sourceFileSha256.toLowerCase()
        || pair.evidence.snapshot.revision !== scenario.sourceRevision
        || pair.evidence.orderedTranslationsSha256?.toLowerCase() !== scenario.expectedTranslationPairsSha256.toLowerCase()) {
        throw new Error("COMPLETED_AUDIO_BINDING_MISMATCH");
    }
    return { verified: true, actorId: scenario.actorId, novel: scenario.novel, episode: scenario.episode,
        sourceRevision: scenario.sourceRevision, orderedTranslationsSha256: pair.evidence.orderedTranslationsSha256 };
}

export function verifyCompletedCandidatePairBytes(scenario: CompletedAudioCase, bytes: Uint8Array) {
    // 이전 실험 결과를 몰래 교체하지 못하게 파일 바이트와 내부 identity를 모두 검증한다.
    const digest = createHash("sha256").update(bytes).digest("hex");
    if (!/^[a-f0-9]{64}$/i.test(scenario.completedCandidatePairFileSha256 ?? "")
        || digest !== scenario.completedCandidatePairFileSha256!.toLowerCase()) throw new Error("COMPLETED_AUDIO_FILE_MISMATCH");
    const proof = verifyCompletedCandidatePair(scenario, JSON.parse(Buffer.from(bytes).toString("utf8")));
    return { ...proof, completedCandidatePairFileSha256: digest };
}
