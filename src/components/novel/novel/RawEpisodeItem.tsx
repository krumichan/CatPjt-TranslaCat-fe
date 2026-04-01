"use client";

import {RawEpisode} from "@/services/novelService";
import RubyText from "@/components/common/RubyText";
import {TranslationUnit} from "@/types/common";

interface ItemProps {
    episode: RawEpisode;
    onClick: () => void;
    ln: (val: TranslationUnit) => string;
}

export const EpisodeItem = ({ episode, onClick, ln }: ItemProps) => (
    <div
        onClick={onClick}
        className="cursor-pointer group flex items-center gap-6 p-5 bg-white/50 dark:bg-zinc-900/20 border border-black/5 dark:border-white/5 rounded-[2rem] hover:border-blue-500/50 hover:bg-white dark:hover:bg-zinc-900 transition-all hover:shadow-xl hover:-translate-x-1"
    >
        <div className="flex-shrink-0 w-12 h-12 flex items-center justify-center rounded-2xl bg-black/[0.05] dark:bg-white/[0.05] text-gray-400 dark:text-zinc-500 font-mono font-bold group-hover:bg-blue-600 group-hover:text-white transition-all">
            {episode.sequence}
        </div>
        <div className="flex-1 min-w-0">
            <div className="text-lg font-bold text-[#2D2D2D] dark:text-zinc-200 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                <RubyText content={ln(episode.title)} />
            </div>
        </div>
        <div className="hidden md:block opacity-0 group-hover:opacity-100 transition-opacity translate-x-2 group-hover:translate-x-0 duration-300">
            <svg className="w-6 h-6 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M13 7l5 5-5 5M6 7l5 5-5 5" />
            </svg>
        </div>
    </div>
);