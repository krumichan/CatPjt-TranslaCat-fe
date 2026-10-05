"use client";

import Link from "next/link";
import NovelCatalogRetryButton from "@/components/novel/NovelCatalogRetryButton";
import { ROUTES, to } from "@/constants/routes";
import { orderedCatalogItems } from "@/features/novel/catalog";
import type { CatalogSnapshot, CatalogText } from "@/types/novel/catalog";

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
    const text = (value: CatalogText) => ja ? value.rawJa : value.ko ?? value.rawJa;
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
                    className="rounded-2xl border p-6 space-y-3 bg-white dark:bg-zinc-900">
                    {snapshot.selector.kind === "RANKING" && item.rank !== null && <p className="font-bold">{item.rank}{ja ? "位" : "위"}</p>}
                    <h2 className="text-xl font-bold"><Link href={`/${locale}${item.isShortStory ? to(ROUTES.EPISODE_VIEWER, platform, item.identifier, "0") : to(ROUTES.NOVEL_DETAIL, platform, item.identifier)}`}>{text(item.title)}</Link></h2>
                    <p>{text(item.author)} · {text(item.statusText)}</p><p className="whitespace-pre-wrap">{text(item.synopsis)}</p>
                    {item.status !== "READY" && <p role="status">{item.status === "FAILED" ? (ja ? "翻訳失敗・原文表示" : "번역 실패 · 원문 표시") : (ja ? "再翻訳中" : "다시 번역 중")}{item.errorCode ? ` (${item.errorCode})` : ""}</p>}
                    <NovelCatalogRetryButton status={item.status} refused={!!item.errorCode?.includes("REFUSAL")} busy={retrying.includes(item.identifier)} retry={() => retry(item.identifier)} ja={ja} />
                </article>)}
            </div>
        </>}
    </section>;
}
