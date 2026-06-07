import { Search, WalletCards } from "lucide-react";
import { useTranslations } from "next-intl";

type AccountBookSearchPanelProps = {
    searchKeyword: string;
    selectedCategory: string;
    categoryOptions: string[];
    totalAccountBookCount: number;
    onChangeSearchKeyword: (value: string) => void;
    onChangeCategory: (value: string) => void;
};

export default function AccountBookSearchPanel({
    searchKeyword,
    selectedCategory,
    categoryOptions,
    totalAccountBookCount,
    onChangeSearchKeyword,
    onChangeCategory,
}: AccountBookSearchPanelProps) {
    const t = useTranslations("AccountBook.search");

    return (
        <div className="grid gap-3 md:grid-cols-[1fr_220px_auto] md:items-center">
            <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                    value={searchKeyword}
                    onChange={(event) =>
                        onChangeSearchKeyword(event.target.value)
                    }
                    placeholder={t("placeholder")}
                    className="w-full rounded-xl border border-slate-300 bg-slate-50 py-3 pl-10 pr-4 text-sm text-gray-800 outline-none transition placeholder:text-slate-400 focus:border-orange-400 focus:bg-white focus:ring-2 focus:ring-orange-200 dark:border-white/10 dark:bg-black/30 dark:text-white dark:placeholder:text-gray-400 dark:focus:bg-black/40 dark:focus:ring-orange-500/20"
                />
            </div>

            <select
                value={selectedCategory}
                onChange={(event) => onChangeCategory(event.target.value)}
                className="
                    w-full rounded-xl border border-slate-300 bg-slate-50 px-4 py-3 text-sm text-gray-800
                    outline-none transition
                    focus:border-orange-400 focus:bg-white focus:ring-2 focus:ring-orange-200
                    dark:border-white/10 dark:dark:bg-black/30 dark:text-white
                    dark:focus:dark:bg-black/30 dark:focus:ring-orange-500/20
                    dark:scheme-dark
                    [&>option]:bg-white [&>option]:text-gray-800
                    dark:[&>option]:bg-zinc-900 dark:[&>option]:text-white
                "
            >
                <option value="">{t("allCategories")}</option>
                {categoryOptions.map((category) => (
                    <option key={category} value={category}>
                        {category}
                    </option>
                ))}
            </select>

            <div className="inline-flex items-center justify-center gap-2 rounded-xl bg-orange-50 px-4 py-3 text-sm font-semibold text-orange-600 dark:bg-orange-500/10 dark:text-orange-300">
                <WalletCards className="h-4 w-4" />
                {t("total", { count: totalAccountBookCount })}
            </div>
        </div>
    );
}