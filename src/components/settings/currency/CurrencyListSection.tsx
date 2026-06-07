import { Languages, Search } from "lucide-react";
import { useTranslations } from "next-intl";
import { AdminCurrency } from "@/types/currency";
import CurrencyListItem from "@/components/settings/currency/CurrencyListItem";

type CurrencyListSectionProps = {
    currencies: AdminCurrency[];
    keyword: string;
    isLoading: boolean;
    onChangeKeyword: (value: string) => void;
    onSetBaseCurrency: (currency: AdminCurrency) => void;
    onToggleEnabled: (currency: AdminCurrency) => void;
};

export default function CurrencyListSection({
    currencies,
    keyword,
    isLoading,
    onChangeKeyword,
    onSetBaseCurrency,
    onToggleEnabled,
}: CurrencyListSectionProps) {
    const t = useTranslations("Settings.currencyPage");

    return (
        <section className="rounded-3xl border border-white/70 bg-white/85 p-5 shadow-lg shadow-orange-100/50 backdrop-blur dark:border-white/10 dark:bg-slate-950/60 dark:shadow-black/30">
            <div className="mb-5 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div className="flex items-center gap-3">
                    <span className="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-orange-100 text-orange-500 dark:bg-orange-500/10 dark:text-orange-300">
                        <Languages className="h-5 w-5" />
                    </span>
                    <div>
                        <h2 className="text-lg font-black text-slate-900 dark:text-white">
                            {t("list.title")}
                        </h2>
                        <p className="text-xs font-semibold text-slate-400 dark:text-slate-500">
                            {t("list.count", {
                                count: currencies.length,
                            })}
                        </p>
                    </div>
                </div>

                <div className="relative w-full md:w-72">
                    <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    <input
                        value={keyword}
                        onChange={(event) =>
                            onChangeKeyword(event.target.value)
                        }
                        placeholder={t("list.searchPlaceholder")}
                        className="w-full rounded-xl border border-slate-300 bg-slate-50 py-3 pl-10 pr-4 text-sm text-gray-800 outline-none transition placeholder:text-slate-400 focus:border-orange-400 focus:bg-white focus:ring-2 focus:ring-orange-200 dark:border-white/10 dark:bg-black/30 dark:text-white dark:placeholder:text-gray-500 dark:focus:bg-black/40 dark:focus:ring-orange-500/20"
                    />
                </div>
            </div>

            <div className="overflow-hidden rounded-2xl border border-slate-200 dark:border-white/10">
                <div className="hidden grid-cols-[120px_1fr_90px_120px_130px] bg-slate-100 px-4 py-3 text-xs font-black uppercase tracking-wide text-slate-500 dark:bg-white/5 dark:text-slate-400 md:grid">
                    <span>{t("list.headers.code")}</span>
                    <span>{t("list.headers.name")}</span>
                    <span>{t("list.headers.symbol")}</span>
                    <span>{t("list.headers.base")}</span>
                    <span>{t("list.headers.status")}</span>
                </div>

                <div className="divide-y divide-slate-200 dark:divide-white/10">
                    {isLoading ? (
                        <div className="bg-white px-4 py-12 text-center text-sm font-semibold text-slate-400 dark:bg-black/10 dark:text-slate-500">
                            {t("messages.loading")}
                        </div>
                    ) : currencies.length === 0 ? (
                        <div className="bg-white px-4 py-12 text-center text-sm font-semibold text-slate-400 dark:bg-black/10 dark:text-slate-500">
                            {t("list.empty")}
                        </div>
                    ) : (
                        currencies.map((currency) => (
                            <CurrencyListItem
                                key={currency.id}
                                currency={currency}
                                onSetBaseCurrency={onSetBaseCurrency}
                                onToggleEnabled={onToggleEnabled}
                            />
                        ))
                    )}
                </div>
            </div>
        </section>
    );
}