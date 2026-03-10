"use client";

import {NovelDetail} from "@/services/novelService";
import {TranslationUnit} from "@/types/common";
import RubyText from "@/components/common/RubyText";

interface Props {
    novelInfo: NovelDetail;
    ln: (val: TranslationUnit) => string;
}

export const NovelHeroCard = ({ novelInfo, ln }: Props) => (
    <div className="p-8 md:p-10 bg-white/70 dark:bg-zinc-900/40 border border-black/5 dark:border-white/5 rounded-[2.5rem] shadow-2xl backdrop-blur-xl animate-in fade-in duration-700">
        <div className="flex flex-col gap-6">
            <div className="space-y-3">
                <h1 className="text-3xl md:text-4xl font-black text-[#2D2D2D] dark:text-white leading-tight">
                    <RubyText content={ln(novelInfo.title)} />
                </h1>
                <div className="flex items-center gap-2 text-blue-600 dark:text-blue-400 font-bold">
                    <span className="text-sm uppercase tracking-tighter opacity-60">Author</span>
                    <div className="text-lg">
                        <RubyText content={ln(novelInfo.author)} />
                    </div>
                </div>
            </div>
            <div className="p-6 bg-black/[0.03] dark:bg-white/[0.03] rounded-3xl border border-black/5 dark:border-white/5">
                <h3 className="text-xs font-black uppercase tracking-[0.2em] text-gray-400 mb-3">Synopsis</h3>
                <div className="text-gray-700 dark:text-zinc-300 leading-relaxed whitespace-pre-wrap">
                    <RubyText content={ln(novelInfo.synopsis)} />
                </div>
            </div>
        </div>
    </div>
);