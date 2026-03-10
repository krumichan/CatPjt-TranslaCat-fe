"use client";

import SpinLoader from "@/components/common/SpinLoader";
import {useTranslations} from "next-intl";
import RubyText from "@/components/common/RubyText";

interface GridItem {
    id: number | string;
    code: string;
    name: string;
}

interface SelectionGridProps<T extends GridItem> {
    items: T[],
    selectedId?: number | string;
    onSelect: (item: T) => void;
    isLoading: boolean;
}

export default function SelectionGrid<T extends GridItem>({
    items,
    selectedId,
    onSelect,
    isLoading
}: SelectionGridProps<T>) {
    const t = useTranslations('Common');

    const isEmpty = !isLoading && items.length === 0;

    return (
        <div className="relative w-full max-w-4xl px-4 min-h-[200px] flex items-center justify-center">
            <SpinLoader isLoading={isLoading} size="lg"/>

            {isEmpty ? (
                <div className="flex flex-col items-center justify-center py-12 animate-in fade-in duration-700">
                    <div
                        className="w-20 h-20 mb-4 bg-black/5 dark:bg-white/5 rounded-full flex items-center justify-center border border-black/10 dark:border-white/10"
                    >
                        <span className="text-4xl">📭</span>
                    </div>
                    <p className="text-gray-600 dark:text-gray-400 text-lg font-medium">
                        {t('noData')}
                    </p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full px-2">
                    {items.map((item) => (
                        <button
                            key={item.id}
                            onClick={() => onSelect(item)}
                            className={`group relative p-8 rounded-2xl border transition-all duration-300 transform hover:-translate-y-2 text-center shadow-lg hover:shadow-2xl ${
                                selectedId === item.id
                                    ? "bg-blue-600/10 dark:bg-blue-600/20 border-blue-500 dark:border-blue-400 shadow-[0_0_20px_rgba(59,130,246,0.15)]"
                                    : "bg-white/70 dark:bg-white/10 border-black/5 dark:border-white/10 hover:border-blue-300 dark:hover:border-white/30 backdrop-blur-sm"
                            }`}
                        >
                            <h2 className={`text-2xl font-bold mb-2 transition-colors ${
                                selectedId === item.id
                                    ? "text-blue-600 dark:text-blue-400"
                                    : "text-[#2D2D2D] dark:text-white"
                            }`}>
                                <RubyText content={item.name} />
                            </h2>
                            <p className={`font-mono text-sm transition-all duration-300 ${
                                selectedId === item.id
                                    ? "text-blue-500 opacity-100"
                                    : "text-blue-400 opacity-0 group-hover:opacity-100"
                            }`}>
                                {item.code.toUpperCase()}
                            </p>
                            {selectedId === item.id && (
                                <div className="absolute inset-0 rounded-2xl ring-2 ring-blue-500/50 dark:ring-blue-400/50 animate-pulse pointer-events-none" />
                            )}
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
};