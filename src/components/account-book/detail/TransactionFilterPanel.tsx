import { Search } from "lucide-react";
import { useTranslations } from "next-intl";
import {TransactionFilterType} from "@/types/accountBook";

type MonthOption = {
    value: string;
    label: string;
};

type TransactionFilterPanelProps = {
    keyword: string;
    filterType: TransactionFilterType;
    selectedMonth: string;
    monthOptions: MonthOption[];
    onChangeKeyword: (value: string) => void;
    onChangeFilterType: (value: TransactionFilterType) => void;
    onChangeSelectedMonth: (value: string) => void;
};

export default function TransactionFilterPanel({
    keyword,
    filterType,
    selectedMonth,
    monthOptions,
    onChangeKeyword,
    onChangeFilterType,
    onChangeSelectedMonth,
}: TransactionFilterPanelProps) {
    const t = useTranslations("AccountBook.detail.transactionFilter");

    const filterItems: {
        label: string;
        value: TransactionFilterType;
    }[] = [
        { label: t("type.all"), value: "ALL" },
        { label: t("type.income"), value: "INCOME" },
        { label: t("type.expense"), value: "EXPENSE" },
    ];

    return (
        <div className="mb-6 rounded-2xl border border-slate-200 bg-white/95 p-4 shadow-[0_12px_30px_rgba(15,23,42,0.12)] backdrop-blur-md dark:border-white/10 dark:bg-zinc-800/80 dark:shadow-xl">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
                <div className="relative flex-1">
                    <Search
                        size={18}
                        className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                    />

                    <input
                        value={keyword}
                        onChange={(event) => onChangeKeyword(event.target.value)}
                        placeholder={t("keywordPlaceholder")}
                        className="w-full rounded-xl border border-slate-300 bg-slate-50 py-3 pl-10 pr-4 text-sm text-gray-800 outline-none transition placeholder:text-slate-400 focus:border-orange-400 focus:bg-white focus:ring-2 focus:ring-orange-200 dark:border-white/10 dark:bg-black/30 dark:text-white dark:placeholder:text-gray-400 dark:focus:bg-black/40 dark:focus:ring-orange-500/20"
                    />
                </div>

                <div className="grid grid-cols-3 gap-2 lg:w-64">
                    {filterItems.map((item) => (
                        <button
                            key={item.value}
                            type="button"
                            onClick={() => onChangeFilterType(item.value)}
                            className={`rounded-xl px-3 py-3 text-sm font-semibold transition ${
                                filterType === item.value
                                    ? "bg-orange-500 text-white shadow-[0_10px_20px_rgba(249,115,22,0.25)]"
                                    : "border border-slate-200 bg-slate-50 text-slate-500 hover:border-orange-300 hover:bg-orange-50 dark:border-white/10 dark:bg-black/30 dark:text-slate-300 dark:hover:border-orange-400/60 dark:hover:bg-orange-500/10"
                            }`}
                        >
                            {item.label}
                        </button>
                    ))}
                </div>

                <select
                    value={selectedMonth}
                    onChange={(event) => onChangeSelectedMonth(event.target.value)}
                    className="rounded-xl border border-slate-300 bg-slate-50 px-4 py-3 text-sm text-gray-800 outline-none transition focus:border-orange-400 focus:bg-white focus:ring-2 focus:ring-orange-200 dark:border-white/10 dark:bg-black/30 dark:text-white dark:focus:bg-black/40 dark:focus:ring-orange-500/20 [&>option]:bg-white [&>option]:text-gray-800 dark:[&>option]:bg-zinc-900 dark:[&>option]:text-white"
                >
                    <option value="ALL">{t("period.all")}</option>

                    {monthOptions.map((option) => (
                        <option key={option.value} value={option.value}>
                            {option.label}
                        </option>
                    ))}
                </select>
            </div>
        </div>
    );
}