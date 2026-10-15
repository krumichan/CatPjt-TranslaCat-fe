"use client";

import Link from "next/link";
import NovelCatalogRetryButton from "@/components/novel/NovelCatalogRetryButton";
import NovelBilingualField from "@/components/novel/NovelBilingualField";
import { ROUTES, to } from "@/constants/routes";
import { orderedCatalogItems } from "@/features/novel/catalog";
import type { CatalogSnapshot } from "@/types/novel/catalog";

interface Props {
    snapshot: CatalogSnapshot | null;
    platform: string;
    locale: string;
    loading: boolean;
    error: string | null;
    sort: "arrival" | "source";
    setSort: (value: "arrival" | "source") => void;
    retrying: string[];
    retry: (identifier: string) => void;
    reconnect: () => void;
}
export default function NovelCatalogView({ snapshot, platform, locale, loading, error, sort, setSort, retrying, retry, reconnect }: Props) {
    const ja = locale === "ja";
    return <section aria-label={ja ? "作品の準備状況" : "작품 준비 상태"} className="space-y-5">
        {loading && <p role="status">{ja ? "元の一覧を取得中" : "원본 목록을 가져오는 중"}</p>}
        {error && <div role="alert">{ja ? "一覧を取得できませんでした" : "목록 상태를 확인하지 못했습니다"} ({error}) <button onClick={reconnect}>{ja ? "状態を再取得" : "상태 다시 확인"}</button></div>}
        {snapshot && <>
            <p role="status" data-testid="novel-catalog-state" data-snapshot-id={snapshot.snapshotId} data-event-sequence={snapshot.eventSequence}>
                {ja ? "準備済み" : "준비"} {snapshot.ready} · {ja ? "失敗" : "실패"} {snapshot.failed} · {ja ? "取得済み" : "확보한 전체"} {snapshot.total}
            </p>
            <label>{ja ? "表示順" : "표시 순서"} <select value={sort} onChange={event => setSort(event.target.value as "arrival" | "source")}>
                <option value="arrival">{ja ? "準備できた順" : "준비된 순서"}</option><option value="source">{ja ? "元の順位・関連度" : "원래 순위·관련도"}</option>
            </select></label>
            <div className="grid gap-6">
                {orderedCatalogItems(snapshot, sort).map(item => <article key={`${snapshot.snapshotId}:${item.itemId}`} data-testid="novel-catalog-card" data-item-id={item.itemId} data-identifier={item.identifier}
                    data-rank={item.rank ?? undefined} data-source-position={item.sourcePosition} data-arrival-sequence={item.arrivalSequence} data-status={item.status} data-cached={item.cached}
                    className="min-w-0 overflow-hidden rounded-3xl border border-slate-200 bg-white text-slate-900 shadow-sm dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100">
                    {/* 제목과 순위는 카드의 첫 구획에 둔다. */}
                    <header data-testid="novel-card-title" className="space-y-3 border-b border-slate-200 bg-slate-50 px-5 py-5 dark:border-zinc-700 dark:bg-zinc-800/60 sm:px-6">
                        {snapshot.selector.kind === "RANKING" && item.rank !== null &&
                            <span className="inline-flex rounded-lg bg-blue-600 px-3 py-1 text-xs font-black text-white">{item.rank}{ja ? "位" : "위"}</span>}
                        <h2 className="text-xl font-bold leading-relaxed sm:text-2xl">
                            <Link className="block rounded-md hover:text-blue-700 focus-visible:outline-2 focus-visible:outline-blue-600 dark:hover:text-blue-300" href={`/${locale}${item.isShortStory ? to(ROUTES.EPISODE_VIEWER, platform, item.identifier, "0") : to(ROUTES.NOVEL_DETAIL, platform, item.identifier)}`}>
                                <NovelBilingualField value={item.title} locale={locale} />
                            </Link>
                        </h2>
                    </header>

                    {/* 작품 형식, 작가와 연재 상태를 줄거리와 분리한다. */}
                    <section data-testid="novel-card-metadata" aria-label={ja ? "作品情報" : "작품 정보"} className="grid gap-4 border-b border-slate-200 px-5 py-4 text-sm dark:border-zinc-700 sm:grid-cols-2 sm:px-6">
                        <div className="sm:col-span-2">
                            <span className="mr-2 text-xs font-semibold text-slate-500 dark:text-zinc-400">{ja ? "作品形式" : "작품 형식"}</span>
                            <span className="inline-flex rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-xs font-bold text-blue-800 dark:border-blue-800 dark:bg-blue-950/40 dark:text-blue-200">
                                {item.isShortStory ? (ja ? "短編" : "단편") : (ja ? "連載" : "연재")}
                            </span>
                        </div>
                        <div className="min-w-0">
                            <p className="mb-1 text-xs font-semibold text-slate-500 dark:text-zinc-400">{ja ? "作者" : "작가"}</p>
                            <NovelBilingualField value={item.author} locale={locale} />
                        </div>
                        <div className="min-w-0">
                            <p className="mb-1 text-xs font-semibold text-slate-500 dark:text-zinc-400">{ja ? "掲載状況" : "연재 상태"}</p>
                            <NovelBilingualField value={item.statusText} locale={locale} />
                        </div>
                    </section>

                    {/* 원문과 번역 줄거리를 모두 읽을 수 있게 별도의 본문 구획에 표시한다. */}
                    <section data-testid="novel-card-synopsis" aria-label={ja ? "あらすじ" : "줄거리"} className="space-y-3 px-5 py-5 dark:bg-zinc-900 sm:px-6">
                        <h3 className="text-sm font-black text-slate-700 dark:text-zinc-200">{ja ? "あらすじ" : "줄거리"}</h3>
                        <div className="min-w-0 leading-relaxed text-slate-700 dark:text-zinc-200"><NovelBilingualField value={item.synopsis} locale={locale} showPendingTranslation /></div>
                    </section>
                    <div className="empty:hidden border-t border-slate-200 px-5 py-4 dark:border-zinc-700 sm:px-6">
                        {item.status !== "READY" && <p role="status" className="mb-2 text-sm text-amber-700 dark:text-amber-300">{item.status === "FAILED" ? (ja ? "翻訳失敗・原文表示" : "번역 실패 · 원문 표시") : (ja ? "再翻訳中" : "다시 번역 중")}{item.errorCode ? ` (${item.errorCode})` : ""}</p>}
                        {/* 실패 카드가 준비 완료로 바뀌어도 같은 버튼을 유지해 클릭 후 focus를 보존한다. */}
                        <NovelCatalogRetryButton status={item.status} refused={!!item.errorCode?.includes("REFUSAL")} busy={retrying.includes(item.identifier)} retry={() => retry(item.identifier)} ja={ja} />
                    </div>
                </article>)}
            </div>
        </>}
    </section>;
}
