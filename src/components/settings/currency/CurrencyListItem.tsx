import { CheckCircle2, XCircle } from "lucide-react";
import { useTranslations } from "next-intl";
import { AdminCurrency } from "@/types/currency";

type CurrencyListItemProps = {
    currency: AdminCurrency;
    onSetBaseCurrency: (currency: AdminCurrency) => void;
    onToggleEnabled: (currency: AdminCurrency) => void;
};

export default function CurrencyListItem({
    currency,
    onSetBaseCurrency,
    onToggleEnabled,
}: CurrencyListItemProps) {
    const t = useTranslations("Settings.currencyPage");

    return (
        <div className="grid gap-3 bg-white px-4 py-4 text-sm dark:bg-black/10 md:grid-cols-[120px_1fr_90px_120px_130px] md:items-center">
            <div>
                <p className="font-black text-slate-900 dark:text-white">
                    {currency.code}
                </p>
                <p className="text-xs text-slate-400 md:hidden">
                    {t("list.headers.code")}
                </p>
            </div>

            <div>
                <p className="font-semibold text-slate-700 dark:text-slate-200">
                    {currency.name}
                </p>
                <p className="text-xs text-slate-400">
                    {t("list.decimalPlaces", {
                        count: currency.decimalPlaces,
                    })}
                </p>
            </div>

            <div>
                <p className="font-bold text-slate-700 dark:text-slate-200">
                    {currency.symbol || "-"}
                </p>
            </div>

            <div>
                <button
                    type="button"
                    onClick={() => onSetBaseCurrency(currency)}
                    disabled={currency.baseCurrency || !currency.enabled}
                    className={`rounded-full px-3 py-1 text-xs font-bold transition disabled:cursor-not-allowed ${
                        currency.baseCurrency
                            ? "bg-orange-100 text-orange-600 dark:bg-orange-500/10 dark:text-orange-300"
                            : currency.enabled
                                ? "bg-slate-100 text-slate-500 hover:bg-orange-50 hover:text-orange-500 dark:bg-white/5 dark:text-slate-400 dark:hover:bg-orange-500/10 dark:hover:text-orange-300"
                                : "bg-slate-100 text-slate-300 dark:bg-white/5 dark:text-slate-600"
                    }`}
                >
                    {currency.baseCurrency
                        ? t("list.base")
                        : t("list.setBase")}
                </button>
            </div>

            <div>
                <button
                    type="button"
                    onClick={() => onToggleEnabled(currency)}
                    className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-bold transition ${
                        currency.enabled
                            ? "bg-emerald-50 text-emerald-600 hover:bg-emerald-100 dark:bg-emerald-500/10 dark:text-emerald-300 dark:hover:bg-emerald-500/20"
                            : "bg-slate-100 text-slate-500 hover:bg-slate-200 dark:bg-white/5 dark:text-slate-400 dark:hover:bg-white/10"
                    }`}
                >
                    {currency.enabled ? (
                        <CheckCircle2 className="h-3.5 w-3.5" />
                    ) : (
                        <XCircle className="h-3.5 w-3.5" />
                    )}
                    {currency.enabled ? t("list.enabled") : t("list.disabled")}
                </button>
            </div>
        </div>
    );
}