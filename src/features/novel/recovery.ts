import type { ReaderSnapshot, NovelLanguage, ReadingMode } from "@/types/novel/reader";

export function recoveryTargets(snapshot: ReaderSnapshot, selectedId?: string) {
    // 실제 대상의 최종 판정은 서버가 한다. FE는 아직 생성 중인 문장과 거절을 선발사하지 않는다.
    return snapshot.segments.filter(item => item.status === "FAILED" && !item.errorCode?.includes("REFUSAL")
        && (!selectedId || item.id === selectedId)).map(item => item.id);
}

export function completedRepair(snapshot: ReaderSnapshot, traceId: string, ids: string[]) {
    const repair = snapshot.recovery;
    return !!repair && repair.traceId === traceId && ids.length > 0 && ids.every(id => repair.committedIds.includes(id)
        && snapshot.segments.some(item => item.id === id && item.status === "SUCCEEDED" && !!item.ko?.trim()));
}

export function continuousReadingPlan(snapshot: ReaderSnapshot, mode: ReadingMode, language: NovelLanguage, selectedId?: string) {
    const index = mode === "all" ? 0 : snapshot.segments.findIndex(item => item.id === selectedId);
    if (index < 0) throw new Error("SEGMENT_NOT_FOUND");
    const selected = (mode === "single" ? snapshot.segments.slice(index, index + 1) : snapshot.segments.slice(index)).filter(item => item.plainJa.trim());
    if (!selected.length) throw new Error("EMPTY_READING");
    // 회차의 terminal 실패도 읽기 의사를 끝내지 않는다. KO의 첫 gap에서만 기다리며 건너뛰지 않는다.
    const gap = language === "ko" ? selected.findIndex(item => item.status !== "SUCCEEDED" || !item.ko?.trim()) : -1;
    if (gap >= 0 && mode === "single") throw new Error("TRANSLATION_NOT_READY");
    return { queue: gap < 0 ? selected : selected.slice(0, gap), awaitingMore: gap >= 0 };
}
