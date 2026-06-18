import { CheckCircle2, Pencil, Star, Trash2, XCircle } from "lucide-react";
import { useTranslations } from "next-intl";

import { AdminCurrency } from "@/types/currency";

type CurrencyListItemProps = {
    currency: AdminCurrency;
    onSetBaseCurrency: (currency: AdminCurrency) => void;
    onToggleEnabled: (currency: AdminCurrency) => void;
    onEdit: (currency: AdminCurrency) => void;
    onDelete: (currency: AdminCurrency) => void;
};

export default function CurrencyListItem({
    currency,
    onSetBaseCurrency,
    onToggleEnabled,
    onEdit,
    onDelete,
}: CurrencyListItemProps) {
    const t = useTranslations("Settings.currencyPage");

    return (
        <article className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4 dark:border-white/10 dark:bg-black/25">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                        <p className="text-lg font-black text-slate-900 dark:text-white">
                            {currency.code}
                        </p>

                        {currency.baseCurrency && (
                            <span className="inline-flex items-center gap-1 rounded-full bg-orange-100 px-2.5 py-1 text-xs font-bold text-orange-600 dark:bg-orange-500/20 dark:text-orange-300">
                                <Star size={13} />
                                {t("list.baseCurrency")}
                            </span>
                        )}

                        <span
                            className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-bold ${
                                currency.enabled
                                    ? "bg-emerald-100 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-300"
                                    : "bg-slate-200 text-slate-500 dark:bg-white/10 dark:text-slate-300"
                            }`}
                        >
                            {currency.enabled ? (
                                <CheckCircle2 size={13} />
                            ) : (
                                <XCircle size={13} />
                            )}
                            {currency.enabled
                                ? t("list.enabled")
                                : t("list.disabled")}
                        </span>
                    </div>

                    <p className="mt-2 text-sm font-semibold text-slate-700 dark:text-slate-200">
                        {currency.name}
                    </p>

                    <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                        {t("list.symbol")}: {currency.symbol || "-"} /{" "}
                        {t("list.decimalPlaces", {
                            count: currency.decimalPlaces,
                        })}
                    </p>
                </div>

                <div className="flex flex-wrap gap-2">
                    <button
                        type="button"
                        onClick={() => onSetBaseCurrency(currency)}
                        disabled={currency.baseCurrency || !currency.enabled}
                        className="inline-flex items-center gap-2 rounded-full bg-orange-50 px-3 py-2 text-xs font-bold text-orange-600 transition hover:bg-orange-100 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-orange-500/10 dark:text-orange-300 dark:hover:bg-orange-500/20"
                    >
                        <Star size={14} />
                        {t("list.setBaseCurrency")}
                    </button>

                    <button
                        type="button"
                        onClick={() => onToggleEnabled(currency)}
                        className={`inline-flex items-center gap-2 rounded-full px-3 py-2 text-xs font-bold transition ${
                            currency.enabled
                                ? "bg-slate-100 text-slate-500 hover:bg-slate-200 dark:bg-white/5 dark:text-slate-300 dark:hover:bg-white/10"
                                : "bg-emerald-50 text-emerald-600 hover:bg-emerald-100 dark:bg-emerald-500/10 dark:text-emerald-300 dark:hover:bg-emerald-500/20"
                        }`}
                    >
                        {currency.enabled ? (
                            <XCircle size={14} />
                        ) : (
                            <CheckCircle2 size={14} />
                        )}
                        {currency.enabled
                            ? t("list.disable")
                            : t("list.enable")}
                    </button>

                    <button
                        type="button"
                        onClick={() => onEdit(currency)}
                        className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-2 text-xs font-bold text-slate-500 transition hover:bg-orange-50 hover:text-orange-500 dark:bg-white/5 dark:text-slate-300 dark:hover:bg-orange-500/10 dark:hover:text-orange-300"
                    >
                        <Pencil size={14} />
                        {t("list.edit")}
                    </button>

                    <button
                        type="button"
                        onClick={() => onDelete(currency)}
                        disabled={currency.baseCurrency}
                        className="inline-flex items-center gap-2 rounded-full bg-red-50 px-3 py-2 text-xs font-bold text-red-500 transition hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-red-500/10 dark:text-red-300 dark:hover:bg-red-500/20"
                    >
                        <Trash2 size={14} />
                        {t("list.delete")}
                    </button>
                </div>
            </div>
        </article>
    );
}