"use client";

import SpinLoader from "@/components/common/SpinLoader";
import {useTranslations} from "next-intl";
import RubyText from "@/components/common/RubyText";

interface TagItem {
    id: number | string;
    name: string;
    identifier: string;
}

interface TagCloudProps<T extends TagItem> {
    title: string;
    items: T[];
    isLoading: boolean;
    onItemClick: (item: T) => void;
}

export default function TagCloud<T extends TagItem>({
    title,
    items,
    isLoading,
    onItemClick
}: TagCloudProps<T>) {
    const t = useTranslations('Common');
    const isEmpty = !isLoading && items.length === 0;

    return (
        <div className="relative min-h-[150px] flex flex-col items-center w-full">
            <h3 className="text-lg font-bold text-gray-600 dark:text-zinc-400 mb-6 transition-colors">
                {title}
            </h3>

            <SpinLoader isLoading={isLoading} size="md"/>

            {isEmpty ? (
                <div className="flex flex-col items-center py-6 opacity-60">
                    <span className="text-3xl mb-2">🍃</span>
                    <p className="text-sm text-gray-500 dark:text-zinc-400">
                        {t('noData')}
                    </p>
                </div>
            ) : (
                <div className="flex flex-wrap justify-center gap-3 px-4 max-w-3xl">
                    {items.map((item) => (
                        <button
                            key={item.id}
                            onClick={() => onItemClick(item)}
                            className="px-5 py-2 rounded-full text-sm font-medium transition-all transform active:scale-95
                                bg-black/5 dark:bg-white/5
                                border border-black/10 dark:border-white/10
                                text-gray-700 dark:text-zinc-300
                                hover:bg-blue-500 dark:hover:bg-blue-600
                                hover:border-blue-500 dark:hover:border-blue-600
                                hover:text-white
                                hover:shadow-lg hover:shadow-blue-500/20"
                        >
                            <RubyText content={"# " + item.name}/>
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
}