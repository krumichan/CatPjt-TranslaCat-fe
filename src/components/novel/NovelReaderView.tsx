"use client";

import { createPortal } from "react-dom";
import { Headphones } from "lucide-react";
import ReaderPager from "@/components/reader/ReaderPager";
import NovelSentence from "@/components/novel/NovelSentence";
import NovelLocalizedText from "@/components/novel/NovelLocalizedText";
import NovelPlaybackControls from "@/components/novel/NovelPlaybackControls";
import { readerLabels } from "@/features/novel/readerLabels";
import type { NovelReaderController } from "@/hooks/novel/useNovelReaderController";

export default function NovelReaderView({ controller: c }: { controller: NovelReaderController }) {
    const labels = readerLabels(c.locale);
    const snapshot = c.snapshot;
    const refused = snapshot?.segments.some(item => item.errorCode?.includes("REFUSAL"));
    const failed = snapshot?.segments.some(item => item.status === "FAILED");
    const onlyRefusals = refused && !snapshot?.segments.some(item => item.status === "FAILED" && !item.errorCode?.includes("REFUSAL"));
    const progressivePartial = snapshot?.state === "PARTIAL";
    const activeReading = ["loading", "playing", "paused", "waiting"].includes(c.audio.status);
    const canStartTranslation = snapshot?.state !== "SUCCEEDED" && !snapshot?.jobId;
    const canRepair = failed && !onlyRefusals;
    const showTranslationActions = canStartTranslation || canRepair || c.busy || refused || progressivePartial;
    return <>
        <div {...c.menu.menuHandlers} style={c.menu.containerStyle} className="min-h-screen bg-white dark:bg-zinc-950 text-zinc-800 dark:text-zinc-100">
            <main className={`${c.menu.mainClassName} mx-auto w-full max-w-4xl px-4 pb-40`}>
                {c.loading && <p role="status">{labels.loading}</p>}
                {c.error && <div role="alert" className="rounded border p-4">
                    {snapshot ? labels.translationError : labels.loadError}
                    <button type="button" onClick={c.retryLoad} className="ml-3">{labels.retry}</button>
                </div>}
                {snapshot && <>
                    <header className="py-8"><p>EPISODE {c.episode}</p><h1 className="text-3xl font-bold"><NovelLocalizedText value={snapshot.title} locale={c.locale} /></h1></header>
                    {/* 계측 데이터는 유지하되 본문 위에 완료 수치나 내부 이력을 노출하지 않는다. */}
                    <span hidden data-testid="novel-translation-state" data-state={snapshot.state}
                        data-completed-segments={snapshot.completedSegments} data-total-segments={snapshot.totalSegments}
                        data-first-source-ms={c.timings.firstSource} data-first-translation-ms={c.timings.firstTranslation}
                        data-translations-50-ms={c.timings.translations50} data-translations-90-ms={c.timings.translations90}
                        data-all-translations-ms={c.timings.allTranslations} data-durable-complete-ms={c.timings.durableComplete}
                        data-durable-observed-ms={c.timings.durableObserved} data-run-trace-id={c.timings.traceId}
                        data-reader-metrics={JSON.stringify(c.timings)} />
                    {c.repairTimings && <span hidden={c.repairTimings.state === "SUCCEEDED"} role={c.repairTimings.state === "SUCCEEDED" ? undefined : "status"}
                        className={c.repairTimings.state === "SUCCEEDED" ? "hidden" : "mb-3 block"}
                        data-testid="novel-repair-state" data-state={c.repairTimings.state} data-repair-metrics={JSON.stringify(c.repairTimings)}>
                        {c.repairTimings.state !== "SUCCEEDED" && (c.repairTimings.state === "RUNNING" ? labels.repairing : labels.repairError)}
                        {c.repairTimings.state !== "SUCCEEDED" && c.repairTimings.errorCode && <span> ({c.repairTimings.errorCode})</span>}
                    </span>}
                    {showTranslationActions && <section className="mb-6 space-y-3" aria-label={labels.translation}>
                        {c.busy && c.repairTimings?.state !== "RUNNING" && <p role="status">{labels.translating}</p>}
                        {canStartTranslation && <button type="button" disabled={c.busy || onlyRefusals} onClick={() => void c.translate()} className="border rounded px-3 py-2">
                            {labels.translate}
                        </button>}
                        {canRepair && <button type="button" disabled={c.repairTimings?.state === "RUNNING"} onClick={event => void c.repair(undefined, event.timeStamp)} className="border rounded px-3 py-2">{labels.repairRemaining}</button>}
                        {c.repairTimings?.delayed && c.repairTimings.state === "RUNNING" && <p role="status">{labels.repairDelayed}</p>}
                        {c.busy && <button type="button" onClick={() => void c.cancel()} className="border rounded px-3 py-2">{labels.cancelJob}</button>}
                        {refused && <p role="alert">{labels.refused}</p>}
                        {progressivePartial && <p role="alert">{labels.progressivePartial}</p>}
                    </section>}
                    <article className="space-y-4 leading-[2.3] break-words" style={{ fontSize: `${c.fontSize}px` }}>
                        {snapshot.segments.map(segment => <NovelSentence key={`${snapshot.revision}:${segment.id}`} segment={segment} locale={c.locale} view={c.view}
                            active={c.audio.status === "playing" && c.audio.segmentId === segment.id}
                            repair={(id, clickedAt) => void c.repair(id, clickedAt)} repairing={c.repairTimings?.state === "RUNNING"} repairRequested={c.repairTimings?.targetIds.includes(segment.id)} />)}
                    </article>
                </>}
            </main>
        </div>
        {/* AppShell 포탈의 pointer-events-none에서 소설 하단 조작 영역만 입력을 복원한다. */}
        {snapshot && c.menu.portalElement && createPortal(<div className="pointer-events-auto">
            {/* 재생 의사가 살아 있는 동안은 스크롤로 바를 숨기지 않아 일시정지·정지를 계속 누를 수 있다. */}
            <ReaderPager prevIdentifier={snapshot.pagerInfo?.prevIdentifier ?? null} nextIdentifier={snapshot.pagerInfo?.nextIdentifier ?? null}
                isVisible={c.menu.isMenuVisible || activeReading} onPrev={c.onPrev} onNext={c.onNext} onList={c.onList} onRegisterSuccess={c.onRegisterSuccess} fontSize={c.fontSize} setFontSize={c.changeFont}
                openMenuIndicator={activeReading
                    ? <Headphones size={14} aria-hidden="true" className={c.audio.status === "paused" ? "mr-1 text-amber-500" : "mr-1 text-indigo-500 dark:text-indigo-300"} />
                    : null}
                openMenuContent={<NovelPlaybackControls audio={c.audio} locale={c.locale}
                    translated={snapshot.segments.some(item => item.status === "SUCCEEDED" && !!item.ko?.trim())} />} />
        </div>, c.menu.portalElement)}
    </>;
}
