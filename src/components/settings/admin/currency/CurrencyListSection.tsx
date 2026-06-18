import { useTranslations } from "next-intl";

import CurrencyListItem from "@/components/settings/admin/currency/CurrencyListItem";
import { AdminCurrency } from "@/types/currency";

type CurrencyListSectionProps = {
    currencies: AdminCurrency[];
    keyword: string;
    isLoading: boolean;
    onChangeKeyword: (keyword: string) => void;
    onSetBaseCurrency: (currency: AdminCurrency) => void;
    onToggleEnabled: (currency: AdminCurrency) => void;
    onEdit: (currency: AdminCurrency) => void;
    onDelete: (currency: AdminCurrency) => void;
};

export default function CurrencyListSection({
    currencies,
    keyword,
    isLoading,
    onChangeKeyword,
    onSetBaseCurrency,
    onToggleEnabled,
    onEdit,
    onDelete,
}: CurrencyListSectionProps) {
    const t = useTranslations("Settings.currencyPage");

    return (
        <section className="rounded-3xl border border-slate-200 bg-white/90 p-5 shadow-sm dark:border-white/10 dark:bg-zinc-900/80 sm:p-6">
            <div className="mb-5 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                <div>
                    <h2 className="text-xl font-black text-slate-900 dark:text-white">
                        {t("list.title")}
                    </h2>

                    <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
                        {t("list.description")}
                    </p>
                </div>

                <input
                    value={keyword}
                    onChange={(event) => onChangeKeyword(event.target.value)}
                    placeholder={t("list.searchPlaceholder")}
                    className="w-full rounded-xl border border-slate-300 bg-slate-50 px-4 py-3 text-sm text-gray-800 outline-none transition focus:border-orange-400 focus:bg-white focus:ring-2 focus:ring-orange-200 dark:border-white/10 dark:bg-black/30 dark:text-white dark:focus:bg-black/40 dark:focus:ring-orange-500/20 sm:max-w-xs"
                />
            </div>

            {isLoading ? (
                <p className="rounded-2xl bg-slate-50 px-4 py-5 text-sm text-slate-500 dark:bg-black/25 dark:text-slate-400">
                    {t("messages.loading")}
                </p>
            ) : currencies.length === 0 ? (
                <p className="rounded-2xl bg-slate-50 px-4 py-5 text-sm text-slate-500 dark:bg-black/25 dark:text-slate-400">
                    {t("list.empty")}
                </p>
            ) : (
                <div className="space-y-3">
                    {currencies.map((currency) => (
                        <CurrencyListItem
                            key={currency.id}
                            currency={currency}
                            onSetBaseCurrency={onSetBaseCurrency}
                            onToggleEnabled={onToggleEnabled}
                            onEdit={onEdit}
                            onDelete={onDelete}
                        />
                    ))}
                </div>
            )}
        </section>
    );
}