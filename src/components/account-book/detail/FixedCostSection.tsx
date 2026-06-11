import { useState } from "react";
import { useTranslations } from "next-intl";
import {
    AccountBookFixedCost,
    CurrencyCode,
} from "@/types/accountBook";
import FixedCostListItem from "@/components/account-book/detail/fixed-cost/FixedCostListItem";
import FixedCostDetailModal from "@/components/account-book/detail/fixed-cost/FixedCostDetailModal";

type FixedCostSectionProps = {
    fixedCosts: AccountBookFixedCost[];
    currencyCode: CurrencyCode;
    isLoading?: boolean;
    errorMessage?: string | null;
    onClickCreateFixedCost: () => void;
    onClickEditFixedCost: (fixedCost: AccountBookFixedCost) => void;
    onClickDeleteFixedCost: (fixedCost: AccountBookFixedCost) => void;
    onChangeActive: (fixedCostId: number, active: boolean) => void | Promise<void>;
};

export default function FixedCostSection({
    fixedCosts,
    currencyCode,
    isLoading = false,
    errorMessage = null,
    onClickCreateFixedCost,
    onClickEditFixedCost,
    onClickDeleteFixedCost,
    onChangeActive,
}: FixedCostSectionProps) {
    const t = useTranslations("AccountBook.detail.fixedCost");
    const [detailFixedCost, setDetailFixedCost] =
        useState<AccountBookFixedCost | null>(null);

    return (
        <section className="mb-6 rounded-2xl border border-slate-200 bg-white/95 p-5 shadow-[0_12px_30px_rgba(15,23,42,0.12)] backdrop-blur-md dark:border-white/10 dark:bg-zinc-800/80 dark:shadow-xl">
            <div className="flex items-start justify-between gap-4">
                <div>
                    <p className="text-sm font-semibold text-slate-500 dark:text-slate-400">
                        {t("eyebrow")}
                    </p>

                    <p className="mt-1 text-lg font-bold text-slate-900 dark:text-white">
                        {t("title")}
                    </p>

                    <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                        {t("count", { count: fixedCosts.length })}
                    </p>
                </div>

                <button
                    type="button"
                    onClick={onClickCreateFixedCost}
                    className="shrink-0 rounded-xl bg-orange-500 px-4 py-3 text-sm font-bold text-white shadow-[0_10px_20px_rgba(249,115,22,0.28)] transition hover:bg-orange-600"
                >
                    {t("actions.create")}
                </button>
            </div>

            {isLoading && (
                <div className="mt-4 rounded-xl bg-slate-50 px-4 py-5 text-sm font-semibold text-slate-500 dark:bg-black/20 dark:text-slate-400">
                    {t("messages.loading")}
                </div>
            )}

            {!isLoading && errorMessage && (
                <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-5 text-sm font-semibold text-red-500 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-300">
                    {errorMessage}
                </div>
            )}

            {!isLoading && !errorMessage && fixedCosts.length === 0 && (
                <div className="mt-4 rounded-xl bg-slate-50 px-4 py-5 dark:bg-black/20">
                    <p className="text-sm font-bold text-slate-700 dark:text-slate-200">
                        {t("empty.title")}
                    </p>
                    <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                        {t("empty.description")}
                    </p>
                </div>
            )}

            {!isLoading && !errorMessage && fixedCosts.length > 0 && (
                <div className="mt-4 space-y-2">
                    {fixedCosts.map((fixedCost) => (
                        <FixedCostListItem
                            key={fixedCost.id}
                            fixedCost={fixedCost}
                            currencyCode={currencyCode}
                            onClickDetail={() => setDetailFixedCost(fixedCost)}
                            onClickEdit={() => onClickEditFixedCost(fixedCost)}
                            onClickDelete={() => onClickDeleteFixedCost(fixedCost)}
                            onChangeActive={() =>
                                onChangeActive(fixedCost.id, !fixedCost.active)
                            }
                        />
                    ))}
                </div>
            )}

            <FixedCostDetailModal
                fixedCost={detailFixedCost}
                currencyCode={currencyCode}
                onClose={() => setDetailFixedCost(null)}
            />
        </section>
    );
}