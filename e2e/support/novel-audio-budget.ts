import { createHash } from "node:crypto";

/** NovelAudioService.speechParts의 UTF-8 경계를 무과금으로 확인한다. */
export function speechPartCount(text: string) {
    if (!text.trim() || text.length > 12_000) throw new Error("AUDIO_PREFLIGHT_TEXT_INVALID");
    let parts = 1;
    let bytes = 0;
    for (const codePoint of text) {
        const size = Buffer.byteLength(codePoint, "utf8");
        if (bytes + size > 1200) {
            parts++;
            bytes = 0;
        }
        bytes += size;
    }
    return parts;
}

export function audioBudgetPlan(value: unknown) {
    const body = value as { state?: string; revision?: string; audioPolicyVersion?: string;
        segments?: { id: string; plainJa: string; ko: string | null }[] };
    if (body?.state !== "SUCCEEDED" || !body.revision || !Array.isArray(body.segments)) throw new Error("AUDIO_COMPLETED_SNAPSHOT_REQUIRED");
    if (typeof body.audioPolicyVersion !== "string" || !body.audioPolicyVersion.trim()) throw new Error("AUDIO_POLICY_BINDING_REQUIRED");
    const playable = body.segments.filter(item => typeof item.plainJa === "string" && item.plainJa.trim());
    if (playable.length <= 10) throw new Error("LONG_AUDIO_FIXTURE_REQUIRED");

    // 첫4문장을 듣고 중지한다. 재생 위치상 다음1개가 시작될 경우까지 두 언어 합계10개만 예약한다.
    const entries = playable.slice(0, 5).flatMap(segment => (["ja", "ko"] as const).map(language => {
        const text = language === "ja" ? segment.plainJa : segment.ko;
        if (typeof text !== "string" || speechPartCount(text) !== 1) throw new Error("AUDIO_SINGLE_PART_BUDGET_REQUIRED");
        return { segmentId: segment.id, language, partIndex: 0, partCount: 1, utf8Bytes: Buffer.byteLength(text, "utf8"),
            textSha256: createHash("sha256").update(text, "utf8").digest("hex") };
    }));
    return { revision: body.revision, audioPolicyVersion: body.audioPolicyVersion ?? null,
        expectedUniqueColdCalls: 8, maximumUniqueColdCalls: entries.length, playedSentenceCount: 4,
        selectedSegmentId: playable[1].id, unrequestedTailUnits: playable.length - 5,
        orderedSegmentIds: playable.map(item => item.id), entries };
}
