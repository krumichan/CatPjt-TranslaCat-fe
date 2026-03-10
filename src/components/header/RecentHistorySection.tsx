"use client"

import SpinLoader from "@/components/common/SpinLoader";
import {Book, FileText, History} from "lucide-react";
import RubyText from "@/components/common/RubyText";
import {RecentView} from "@/services/recentViewService";
import {TranslationUnit} from "@/types/common";

interface RecentHistorySectionProps {
    status: string; // "authenticated" | "loading" | "unauthenticated"
    isLoadingRecent: boolean;
    recentViews: RecentView[];
    // ln은 TranslationUnit을 받아서 string을 뱉는 함수 타입이죠?
    ln: (content: TranslationUnit) => string;
    onLinkClick: (item: RecentView) => void;
}

export default function RecentHistorySection({
    status, isLoadingRecent, recentViews, ln, onLinkClick
}: RecentHistorySectionProps) {
    if (status !== "authenticated") return null;

    return (
        <>
            <div className="px-4 py-2 flex items-center gap-2 text-[10px] font-bold text-gray-400 dark:text-zinc-500 uppercase tracking-widest">
                <History size={12} strokeWidth={3} className="shrink-0" />
                <span>Recent History</span>
            </div>
            <div className="relative max-h-60 overflow-y-auto px-2 space-y-0.5 min-h-12.5">
                <SpinLoader isLoading={isLoadingRecent} size="sm" />
                {recentViews.map((item: RecentView) => (
                    <button
                        key={item.id}
                        onClick={() => onLinkClick(item)}
                        className="w-full text-left px-3 py-1.5 rounded-md hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-all group flex items-center gap-2"
                    >
                        <span className="shrink-0">
                            {item.type === 'EPISODE' ? <FileText size={12} /> : <Book size={12} />}
                        </span>
                        <div className="text-[11px] font-medium text-gray-600 dark:text-gray-300 truncate leading-tight">
                            <RubyText content={ln(item.title)}/>
                        </div>
                    </button>
                ))}
                {!isLoadingRecent && recentViews.length === 0 && (
                    <div className="text-[10px] text-center py-4 text-gray-400">No history yet</div>
                )}
            </div>
            <div className="border-t border-gray-100 dark:border-zinc-800 my-2" />
        </>
    );
};