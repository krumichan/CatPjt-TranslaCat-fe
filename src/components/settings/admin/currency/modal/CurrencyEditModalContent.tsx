import { X } from "lucide-react";
import { useTranslations } from "next-intl";

import CurrencyEditForm from "@/components/settings/admin/currency/modal/CurrencyEditForm";
import { useCurrencyEditForm } from "@/components/settings/admin/currency/modal/useCurrencyEditForm";
import { AdminCurrency, CurrencyUpdateRequest } from "@/types/currency";

type CurrencyEditModalContentProps = {
    currency: AdminCurrency;
    isUpdating: boolean;
    onClose: () => void;
    onSubmit: (request: CurrencyUpdateRequest) => void;
};

export default function CurrencyEditModalContent({
    currency,
    isUpdating,
    onClose,
    onSubmit,
}: CurrencyEditModalContentProps) {
    const t = useTranslations("Settings.currencyPage.editModal");

    const form = useCurrencyEditForm({
        currency,
        isUpdating,
        onSubmit,
    });

    return (
        <div className="fixed inset-0 z-120 flex items-center justify-center bg-black/50 px-4 py-6 backdrop-blur-sm">
            <section className="w-full max-w-lg rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl dark:border-white/10 dark:bg-zinc-900">
                <div className="mb-5 flex items-start justify-between gap-4">
                    <div>
                        <p className="text-xs font-bold uppercase tracking-[0.25em] text-orange-500">
                            {currency.code}
                        </p>

                        <h2 className="mt-2 text-2xl font-black text-slate-900 dark:text-white">
                            {t("title")}
                        </h2>

                        <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
                            {t("description")}
                        </p>
                    </div>

                    <button
                        type="button"
                        onClick={onClose}
                        disabled={isUpdating}
                        className="rounded-xl p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600 disabled:cursor-not-allowed disabled:opacity-60 dark:hover:bg-white/10 dark:hover:text-white"
                        aria-label={t("close")}
                    >
                        <X size={20} />
                    </button>
                </div>

                <CurrencyEditForm
                    name={form.name}
                    symbol={form.symbol}
                    decimalPlaces={form.decimalPlaces}
                    isUpdating={isUpdating}
                    canSubmit={form.canSubmit}
                    onChangeName={form.setName}
                    onChangeSymbol={form.setSymbol}
                    onChangeDecimalPlaces={form.setDecimalPlaces}
                    onClose={onClose}
                    onSubmit={form.handleSubmit}
                />
            </section>
        </div>
    );
}