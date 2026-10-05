"use client";

import { createPortal } from "react-dom";
import ReaderPager from "@/components/reader/ReaderPager";
import NovelSentence from "@/components/novel/NovelSentence";
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
    return <>
        <div {...c.menu.menuHandlers} style={c.menu.containerStyle} className="min-h-screen bg-white dark:bg-zinc-950 text-zinc-800 dark:text-zinc-100">
            <main className={`${c.menu.mainClassName} mx-auto w-full max-w-4xl px-4 pb-40`}>
                {c.loading && <p role="status">{labels.loading}</p>}
                {c.error && <div role="alert" className="rounded border p-4">
                    {snapshot ? labels.translationError : labels.loadError}
                    <button type="button" onClick={c.retryLoad} className="ml-3">{labels.retry}</button>
                </div>}
                {snapshot && <>
                    <header className="py-8"><p>EPISODE {c.episode}</p><h1 className="text-3xl font-bold">{c.locale === "ja" ? snapshot.title.rawJa : snapshot.title.ko ?? snapshot.title.rawJa}</h1></header>
                    <section className="space-y-3 mb-6" aria-label={labels.progress}>
                        <p role="status" data-testid="novel-translation-state" data-state={snapshot.state}
                            data-first-source-ms={c.timings.firstSource} data-first-translation-ms={c.timings.firstTranslation}
                            data-translations-50-ms={c.timings.translations50} data-translations-90-ms={c.timings.translations90}
                            data-all-translations-ms={c.timings.allTranslations} data-durable-complete-ms={c.timings.durableComplete}
                            data-durable-observed-ms={c.timings.durableObserved} data-run-trace-id={c.timings.traceId}
                            data-reader-metrics={JSON.stringify(c.timings)}>
                            {snapshot.state === "SUCCEEDED" ? labels.complete : c.busy ? labels.translating : labels.progress}: {snapshot.completedSegments}/{snapshot.totalSegments}
                        </p>
                        {snapshot.state !== "SUCCEEDED" && !snapshot.jobId && <button type="button" disabled={c.busy || onlyRefusals} onClick={() => void c.translate()} className="border rounded px-3 py-2">
                            {labels.translate}
                        </button>}
                        {failed && !onlyRefusals && <button type="button" disabled={c.repairTimings?.state === "RUNNING"} onClick={event => void c.repair(undefined, event.timeStamp)} className="border rounded px-3 py-2">{labels.repairRemaining}</button>}
                        {c.repairTimings && <p role="status" data-testid="novel-repair-state" data-repair-metrics={JSON.stringify(c.repairTimings)}>
                            {c.repairTimings.state === "SUCCEEDED" ? labels.repairDone : c.repairTimings.state === "RUNNING" ? labels.repairing : labels.repairError}
                            {c.repairTimings.errorCode && <span> ({c.repairTimings.errorCode})</span>}
                        </p>}
                        {c.repairTimings?.delayed && c.repairTimings.state === "RUNNING" && <p role="status">{labels.repairDelayed}</p>}
                        {c.busy && <button type="button" onClick={() => void c.cancel()} className="border rounded px-3 py-2">{labels.cancelJob}</button>}
                        {refused && <p role="alert">{labels.refused}</p>}
                        {progressivePartial && <p role="alert">{labels.progressivePartial}</p>}
                        {snapshot.durableComplete && ["FAILED", "PARTIAL"].includes(snapshot.initialAttemptState ?? "") && <p>{labels.recoveredEpisode}</p>}
                        <label className="block">{labels.view} <select value={c.view} onChange={event => c.setView(event.target.value as "ja" | "ko" | "parallel")}>
                            <option value="ja">{labels.source}</option><option value="ko">{labels.translation}</option><option value="parallel">{labels.parallel}</option>
                        </select></label>
                        <NovelPlaybackControls audio={c.audio} locale={c.locale}
                            translated={snapshot.segments.some(item => item.status === "SUCCEEDED" && !!item.ko?.trim())} />
                    </section>
                    <article className="space-y-4 leading-[2.3] font-serif break-words" style={{ fontSize: `${c.fontSize}px` }}>
                        {snapshot.segments.map(segment => <NovelSentence key={`${snapshot.revision}:${segment.id}`} segment={segment} locale={c.locale} view={c.view}
                            active={c.audio.status === "playing" && c.audio.segmentId === segment.id} read={c.audio.read}
                            repair={(id, clickedAt) => void c.repair(id, clickedAt)} repairing={c.repairTimings?.state === "RUNNING"} repairRequested={c.repairTimings?.targetIds.includes(segment.id)} />)}
                    </article>
                </>}
            </main>
        </div>
        {/* AppShell 포탈의 pointer-events-none에서 소설 하단 조작 영역만 입력을 복원한다. */}
        {snapshot && c.menu.portalElement && createPortal(<div className="pointer-events-auto"><ReaderPager prevIdentifier={snapshot.pagerInfo?.prevIdentifier ?? null} nextIdentifier={snapshot.pagerInfo?.nextIdentifier ?? null}
            isVisible={c.menu.isMenuVisible} onPrev={c.onPrev} onNext={c.onNext} onList={c.onList} onRegisterSuccess={c.onRegisterSuccess} fontSize={c.fontSize} setFontSize={c.changeFont} /></div>, c.menu.portalElement)}
    </>;
}
