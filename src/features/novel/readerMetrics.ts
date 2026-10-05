import type { NovelSegment, ReaderSnapshot, ReaderTimings } from "@/types/novel/reader";

export function sameReaderPresentation(current: ReaderSnapshot, next: ReaderSnapshot) {
    // 원문/ID의 acceptSnapshot 검증 뒤에만 사용한다. 변경 없는 진단값 polling으로 본문을 재적용하지 않는다.
    return current.revision === next.revision && current.jobId === next.jobId && current.eventSequence === next.eventSequence
        && current.state === next.state && current.durableComplete === next.durableComplete
        && current.completedSegments === next.completedSegments && current.totalSegments === next.totalSegments
        && current.audioPolicyVersion === next.audioPolicyVersion && current.policyVersion === next.policyVersion && current.glossaryVersion === next.glossaryVersion
        && JSON.stringify(current.recovery) === JSON.stringify(next.recovery) && current.initialAttemptState === next.initialAttemptState
        && JSON.stringify(current.pagerInfo) === JSON.stringify(next.pagerInfo) && JSON.stringify(current.title) === JSON.stringify(next.title)
        && current.segments.length === next.segments.length && current.segments.every((segment, index) => {
            const candidate = next.segments[index];
            return segment.id === candidate.id && segment.ko === candidate.ko && segment.status === candidate.status
                && segment.errorCode === candidate.errorCode && JSON.stringify(segment.rubyTokens) === JSON.stringify(candidate.rubyTokens);
        });
}

export function readerPollingBudget(snapshot: ReaderSnapshot, resumeExisting = false) {
    const deadline = snapshot.execution?.executionDeadlineMs;
    const elapsed = snapshot.execution?.jobElapsedMs;
    // 서비스가 선언한 안전 deadline만 허용한다. 도전 목표5초나 무한 연장을 timeout으로 쓰지 않는다.
    const budget = typeof deadline === "number" && Number.isFinite(deadline) && deadline >= 100 && deadline <= 600_000 ? deadline + 10_000 : 120_000;
    return resumeExisting && typeof elapsed === "number" && Number.isFinite(elapsed) && elapsed >= 0 ? Math.max(1000, budget - elapsed) : budget;
}

export function translationProgress(segments: NovelSegment[]) {
    let total = 0;
    let completed = 0;
    let prefix = 0;
    let translatedPrefixChars = 0;
    let prefixOpen = true;
    for (const segment of segments) {
        // 문장 수나 청크 수가 바뀌어도 같은 원문 기준으로 비교한다. 빈 문단은 대상량0이다.
        const weight = segment.plainJa.trim() ? Array.from(segment.plainJa).length : 0;
        total += weight;
        const ready = segment.status === "SUCCEEDED" && (weight === 0 || !!segment.ko?.trim());
        if (ready) completed += weight;
        if (prefixOpen && ready) {
            prefix += weight;
            if (weight > 0) translatedPrefixChars += Array.from(segment.ko ?? "").length;
        }
        if (weight > 0 && !ready) prefixOpen = false;
    }
    return { total, completed, prefix, translatedPrefixChars, ratio: total ? completed / total : 0, prefixRatio: total ? prefix / total : 0 };
}

export function paintedReaderTimings(previous: ReaderTimings, snapshot: ReaderSnapshot, elapsed: number, applyToPaintMs: number): ReaderTimings {
    const progress = translationProgress(snapshot.segments);
    const next = { ...previous, progress };
    if (progress.total > 0) next.firstSource ??= elapsed;
    // document clock는 auth/hydration 전의 navigation도 포함한다. SPA 이동에서는 회차 진입 지연이 아니다.
    if (previous.origin === "reader-entry" && next.firstSource !== undefined && previous.originDocumentTimeMs !== undefined) {
        next.documentTimeAtFirstSourceMs ??= previous.originDocumentTimeMs + next.firstSource;
    }
    if (progress.completed > 0) next.firstTranslation ??= elapsed;
    if (progress.translatedPrefixChars >= 200) next.readReady200 ??= elapsed;
    if (progress.ratio >= 0.5) next.translations50 ??= elapsed;
    if (progress.ratio >= 0.9) next.translations90 ??= elapsed;
    if (progress.total > 0 && progress.completed === progress.total) next.allTranslations ??= elapsed;
    // prefix의 증가 시각과 각 적용→paint 구간은 같은 브라우저 monotonic clock으로만 계산한다.
    const history = previous.prefixHistory ?? [];
    if (!history.length || history.at(-1)?.sourceCodePoints !== progress.prefix) {
        next.prefixHistory = [...history, { elapsedMs: elapsed, sourceCodePoints: progress.prefix, ratio: progress.prefixRatio }];
    }
    const translatedHistory = previous.translatedPrefixHistory ?? [];
    if (!translatedHistory.length || translatedHistory.at(-1)?.translatedCodePoints !== progress.translatedPrefixChars) {
        next.translatedPrefixHistory = [...translatedHistory, { elapsedMs: elapsed, translatedCodePoints: progress.translatedPrefixChars }];
    }
    next.renderSpans = [...(previous.renderSpans ?? []), { eventSequence: snapshot.eventSequence, elapsedMs: elapsed, applyToPaintMs }];
    return next;
}
