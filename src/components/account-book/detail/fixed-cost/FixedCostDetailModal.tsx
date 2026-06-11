import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { useTranslations } from "next-intl";
import {
    AccountBookFixedCost,
    CurrencyCode,
} from "@/types/accountBook";
import { formatAmount } from "@/utils/account-book/formatAmount";
import DetailRow from "@/components/account-book/detail/fixed-cost/DetailRow";
import { formatYearMonth } from "@/components/account-book/detail/fixed-cost/formatYearMonth";

type FixedCostDetailModalProps = {
    fixedCost: AccountBookFixedCost | null;
    currencyCode: CurrencyCode;
    onClose: () => void;
};

export default function FixedCostDetailModal({
    fixedCost,
    currencyCode,
    onClose,
}: FixedCostDetailModalProps) {
    const t = useTranslations("AccountBook.detail.fixedCost");

    if (!fixedCost || typeof document === "undefined") {
        return null;
    }

    const startMonth = formatYearMonth(
        fixedCost.startYear,
        fixedCost.startMonth
    );

    const endMonth =
        fixedCost.endYear && fixedCost.endMonth
            ? formatYearMonth(fixedCost.endYear, fixedCost.endMonth)
            : t("ongoing");

    return createPortal(
        <div className="fixed inset-0 z-9999 overflow-y-auto px-4 py-16 sm:py-20">
            <button
                type="button"
                aria-label={t("detail.actions.close")}
                onClick={onClose}
                className="fixed inset-0 bg-black/50 backdrop-blur-sm"
            />

            <div className="relative z-10 mx-auto w-full max-w-lg rounded-2xl border border-slate-200 bg-white/95 p-6 shadow-[0_20px_60px_rgba(15,23,42,0.25)] backdrop-blur-md dark:border-white/10 dark:bg-zinc-900/95">
                <div className="mb-5 flex items-start justify-between gap-4">
                    <div>
                        <p className="mb-1 text-sm font-medium text-orange-500">
                            Fixed Cost Detail
                        </p>
                        <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                            {fixedCost.title}
                        </h2>
                    </div>

                    <button
                        type="button"
                        onClick={onClose}
                        className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-white/10 dark:hover:text-white"
                    >
                        <X size={20} />
                    </button>
                </div>

                <div className="space-y-3 rounded-2xl bg-slate-50 p-4 dark:bg-black/20">
                    <DetailRow
                        label={t("detail.fields.amount")}
                        value={`-${formatAmount(fixedCost.amount, currencyCode)}`}
                        valueClassName="text-red-500 dark:text-red-400"
                    />

                    <DetailRow
                        label={t("detail.fields.category")}
                        value={fixedCost.category}
                    />

                    <DetailRow
                        label={t("detail.fields.storeName")}
                        value={fixedCost.storeName || t("detail.empty.storeName")}
                    />

                    <DetailRow
                        label={t("detail.fields.paymentDay")}
                        value={t("paymentDay", { day: fixedCost.paymentDay })}
                    />

                    <DetailRow
                        label={t("detail.fields.period")}
                        value={t("period", {
                            start: startMonth,
                            end: endMonth,
                        })}
                    />

                    <DetailRow
                        label={t("detail.fields.status")}
                        value={
                            fixedCost.active
                                ? t("status.active")
                                : t("status.inactive")
                        }
                    />

                    <div className="border-t border-slate-200 pt-3 dark:border-white/10">
                        <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                            {t("detail.fields.memo")}
                        </p>
                        <p className="mt-1 whitespace-pre-wrap break-words text-sm text-slate-800 dark:text-slate-100">
                            {fixedCost.memo || t("detail.empty.memo")}
                        </p>
                    </div>
                </div>

                <div className="mt-5 flex justify-end">
                    <button
                        type="button"
                        onClick={onClose}
                        className="rounded-xl bg-orange-500 px-5 py-3 text-sm font-semibold text-white shadow-[0_10px_20px_rgba(249,115,22,0.28)] transition hover:bg-orange-600"
                    >
                        {t("detail.actions.closeButton")}
                    </button>
                </div>
            </div>
        </div>,
        document.body
    );
}