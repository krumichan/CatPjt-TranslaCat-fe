"use client";

import {NovelDetail} from "@/services/novelService";
import NovelBilingualField from "@/components/novel/NovelBilingualField";

interface Props {
    novelInfo: NovelDetail;
    locale: string;
}

export const NovelHeroCard = ({ novelInfo, locale }: Props) => (
    <article className="overflow-hidden rounded-3xl border border-slate-200 bg-white text-slate-900 shadow-sm dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100">
        {/* 상세 응답에 없는 단편·연재 값은 추측하지 않고 제목과 작가를 분리한다. */}
        <header className="border-b border-slate-200 bg-slate-50 px-6 py-7 dark:border-zinc-700 dark:bg-zinc-800/60 md:px-8">
            <p className="mb-3 text-xs font-bold tracking-widest text-slate-500 dark:text-zinc-400">{locale === "ja" ? "作品名" : "작품 제목"}</p>
            <h1 className="text-2xl font-black leading-relaxed md:text-4xl"><NovelBilingualField value={novelInfo.title} locale={locale} /></h1>
        </header>
        <section aria-label={locale === "ja" ? "作者" : "작가"} className="border-b border-slate-200 px-6 py-5 dark:border-zinc-700 md:px-8">
            <h2 className="mb-2 text-xs font-bold tracking-widest text-slate-500 dark:text-zinc-400">{locale === "ja" ? "作者" : "작가"}</h2>
            <div className="font-semibold"><NovelBilingualField value={novelInfo.author} locale={locale} /></div>
        </section>
        <section aria-label={locale === "ja" ? "あらすじ" : "줄거리"} className="px-6 py-6 md:px-8">
            <h2 className="mb-3 text-sm font-black text-slate-700 dark:text-zinc-200">{locale === "ja" ? "あらすじ" : "줄거리"}</h2>
            <div className="min-w-0 leading-relaxed text-slate-700 dark:text-zinc-200"><NovelBilingualField value={novelInfo.synopsis} locale={locale} showPendingTranslation /></div>
        </section>
    </article>
);
