"use client";

import Link from "next/link";
import { ArrowDownWideNarrow, ChevronDown } from "lucide-react";
import NovelCatalogRetryButton from "@/components/novel/NovelCatalogRetryButton";
import NovelBilingualField from "@/components/novel/NovelBilingualField";
import { catalogWorkPath, orderedCatalogItems } from "@/features/novel/catalog";
import type { CatalogSnapshot } from "@/types/novel/catalog";
import { withNovelTarget, type NovelTargetLanguage } from "@/features/novel/translationLanguage";
import { novelUiText } from "@/features/novel/uiText";

interface Props {
    snapshot: CatalogSnapshot | null;
    platform: string;
    locale: string;
    targetLanguage?: NovelTargetLanguage;
    loading: boolean;
    error: string | null;
    sort: "arrival" | "source";
    setSort: (value: "arrival" | "source") => void;
    retrying: string[];
    retry: (identifier: string) => void;
    reconnect: () => void;
}
export default function NovelCatalogView({ snapshot, platform, locale, targetLanguage = "ko", loading, error, sort, setSort, retrying, retry, reconnect }: Props) {
    const ja = locale === "ja";
    const labels = novelUiText(locale);
    return <section aria-label={labels.workList} className="space-y-5">
        {loading && <p role="status">{labels.loadingList}</p>}
        {error && <div role="alert">{labels.listError} ({error}) <button onClick={reconnect}>{labels.reloadList}</button></div>}
        {snapshot && <>
            {/* 진행 수치는 검증용 속성에만 남기고 목록 조작은 정렬 선택 하나로 모은다. */}
            <span hidden data-testid="novel-catalog-state" data-snapshot-id={snapshot.snapshotId} data-event-sequence={snapshot.eventSequence}
                data-ready={snapshot.ready} data-failed={snapshot.failed} data-total={snapshot.total} />
            <div className="flex justify-end">
                <label data-testid="novel-catalog-sort" className="flex min-h-12 w-full items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 shadow-sm transition focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-500/20 dark:border-slate-700 dark:bg-slate-800/70 dark:focus-within:border-blue-400 sm:w-auto">
                    <ArrowDownWideNarrow size={16} aria-hidden="true" className="shrink-0 text-slate-500 dark:text-slate-400" />
                    <span className="shrink-0 text-xs font-semibold text-slate-500 dark:text-slate-400">{labels.order}</span>
                    <span className="relative ml-auto min-w-0">
                        <select aria-label={labels.order} value={sort}
                            onChange={event => setSort(event.target.value as "arrival" | "source")}
                            className="min-h-12 max-w-full cursor-pointer appearance-none bg-transparent py-2 pl-1 pr-7 text-sm font-semibold text-slate-900 focus-visible:outline-none dark:text-slate-100 dark:[color-scheme:dark]">
                            <option value="arrival">{labels.arrivalOrder}</option>
                            <option value="source">{labels.sourceOrder}</option>
                        </select>
                        <ChevronDown size={16} aria-hidden="true" className="pointer-events-none absolute right-0 top-1/2 -translate-y-1/2 text-slate-500 dark:text-slate-400" />
                    </span>
                </label>
            </div>
            <div className="grid gap-6">
                {orderedCatalogItems(snapshot, sort).map(item => <article key={`${snapshot.snapshotId}:${item.itemId}`} data-testid="novel-catalog-card" data-item-id={item.itemId} data-identifier={item.identifier}
                    data-rank={item.rank ?? undefined} data-source-position={item.sourcePosition} data-arrival-sequence={item.arrivalSequence} data-status={item.status} data-cached={item.cached}
                    className="min-w-0 overflow-hidden rounded-3xl border border-slate-200 bg-white text-slate-900 shadow-sm dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100">
                    {/* 제목과 순위는 카드의 첫 구획에 둔다. */}
                    <header data-testid="novel-card-title" className="space-y-3 border-b border-slate-200 bg-slate-50 px-5 py-5 dark:border-zinc-700 dark:bg-zinc-800/60 sm:px-6">
                        {snapshot.selector.kind === "RANKING" && item.rank !== null &&
                            <span className="inline-flex rounded-lg bg-blue-600 px-3 py-1 text-xs font-black text-white">{item.rank}{labels.rank}</span>}
                        <h2 className="text-xl font-bold leading-relaxed sm:text-2xl">
                            <Link className="block rounded-md hover:text-blue-700 focus-visible:outline-2 focus-visible:outline-blue-600 dark:hover:text-blue-300" href={withNovelTarget(`/${locale}${catalogWorkPath(platform, item.identifier, item.isShortStory)}`, targetLanguage)}>
                                <NovelBilingualField value={item.title} locale={locale} targetLanguage={targetLanguage} />
                            </Link>
                        </h2>
                    </header>

                    {/* 작품 형식, 작가와 연재 상태를 줄거리와 분리한다. */}
                    <section data-testid="novel-card-metadata" aria-label={labels.workInfo} className="grid gap-4 border-b border-slate-200 px-5 py-4 text-sm dark:border-zinc-700 sm:grid-cols-2 sm:px-6">
                        <div className="sm:col-span-2">
                            <span className="mr-2 text-xs font-semibold text-slate-500 dark:text-zinc-400">{labels.form}</span>
                            <span className="inline-flex rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-xs font-bold text-blue-800 dark:border-blue-800 dark:bg-blue-950/40 dark:text-blue-200">
                                {item.isShortStory ? labels.shortStory : labels.serial}
                            </span>
                        </div>
                        <div className="min-w-0">
                            <p className="mb-1 text-xs font-semibold text-slate-500 dark:text-zinc-400">{labels.author}</p>
                            <NovelBilingualField value={item.author} locale={locale} targetLanguage={targetLanguage} />
                        </div>
                        <div className="min-w-0">
                            <p className="mb-1 text-xs font-semibold text-slate-500 dark:text-zinc-400">{labels.publicationStatus}</p>
                            <NovelBilingualField value={item.statusText} locale={locale} targetLanguage={targetLanguage} />
                        </div>
                    </section>

                    {/* 원문과 번역 줄거리를 모두 읽을 수 있게 별도의 본문 구획에 표시한다. */}
                    <section data-testid="novel-card-synopsis" aria-label={labels.synopsis} className="space-y-3 px-5 py-5 dark:bg-zinc-900 sm:px-6">
                        <h3 className="text-sm font-black text-slate-700 dark:text-zinc-200">{labels.synopsis}</h3>
                        <div className="min-w-0 leading-relaxed text-slate-700 dark:text-zinc-200"><NovelBilingualField value={item.synopsis} locale={locale} targetLanguage={targetLanguage} showPendingTranslation /></div>
                    </section>
                    <div className="empty:hidden border-t border-slate-200 px-5 py-4 dark:border-zinc-700 sm:px-6">
                        {item.status !== "READY" && <p role="status" className="mb-2 text-sm text-amber-700 dark:text-amber-300">{item.status === "FAILED" ? labels.translationFailed : labels.translating}{item.errorCode ? ` (${item.errorCode})` : ""}</p>}
                        {/* 실패 카드가 준비 완료로 바뀌어도 같은 버튼을 유지해 클릭 후 focus를 보존한다. */}
                        <NovelCatalogRetryButton status={item.status} refused={!!item.errorCode?.includes("REFUSAL")} busy={retrying.includes(item.identifier)} retry={() => retry(item.identifier)} ja={ja} locale={locale} />
                    </div>
                </article>)}
            </div>
        </>}
    </section>;
}
