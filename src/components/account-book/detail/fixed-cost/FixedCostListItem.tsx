import { useTranslations } from "next-intl";
import {
    AccountBookFixedCost,
    CurrencyCode,
} from "@/types/accountBook";
import { formatAmount } from "@/utils/account-book/formatAmount";
import FixedCostFloatingActionMenu from "@/components/account-book/detail/fixed-cost/FixedCostFloatingActionMenu";
import { formatYearMonth } from "@/components/account-book/detail/fixed-cost/formatYearMonth";

type FixedCostListItemProps = {
    fixedCost: AccountBookFixedCost;
    currencyCode: CurrencyCode;
    onClickDetail: () => void;
    onClickEdit: () => void;
    onClickDelete: () => void;
    onChangeActive: () => void | Promise<void>;
};

export default function FixedCostListItem({
    fixedCost,
    currencyCode,
    onClickDetail,
    onClickEdit,
    onClickDelete,
    onChangeActive,
}: FixedCostListItemProps) {
    const t = useTranslations("AccountBook.detail.fixedCost");

    const periodText = t("period", {
        start: formatYearMonth(fixedCost.startYear, fixedCost.startMonth),
        end:
            fixedCost.endYear && fixedCost.endMonth
                ? formatYearMonth(fixedCost.endYear, fixedCost.endMonth)
                : t("ongoing"),
    });

    return (
        <div
            className={`flex items-center justify-between gap-3 rounded-xl bg-slate-50 px-4 py-3 transition dark:bg-black/20 ${
                fixedCost.active ? "" : "opacity-55"
            }`}
        >
            <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                    <p className="truncate text-sm font-bold text-slate-900 dark:text-white">
                        {fixedCost.title}
                    </p>

                    <span className="shrink-0 rounded-full bg-slate-200 px-2 py-0.5 text-[11px] font-medium text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                        {fixedCost.category}
                    </span>

                    <span
                        className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                            fixedCost.active
                                ? "bg-emerald-100 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-300"
                                : "bg-slate-200 text-slate-500 dark:bg-slate-800 dark:text-slate-400"
                        }`}
                    >
                        {fixedCost.active
                            ? t("status.active")
                            : t("status.inactive")}
                    </span>

                    {fixedCost.memo && (
                        <span className="shrink-0 rounded-full bg-orange-100 px-2 py-0.5 text-[11px] font-semibold text-orange-600 dark:bg-orange-500/10 dark:text-orange-300">
                            {t("memoBadge")}
                        </span>
                    )}
                </div>

                <p className="mt-1 truncate text-xs text-slate-500 dark:text-slate-400">
                    {t("paymentDay", { day: fixedCost.paymentDay })}
                    {fixedCost.storeName ? ` · ${fixedCost.storeName}` : ""}
                    {" · "}
                    {periodText}
                </p>
            </div>

            <div className="flex shrink-0 items-center gap-2">
                <p className="text-sm font-bold text-red-500 dark:text-red-400">
                    -{formatAmount(fixedCost.amount, currencyCode)}
                </p>

                <FixedCostFloatingActionMenu
                    fixedCost={fixedCost}
                    onClickDetail={onClickDetail}
                    onClickEdit={onClickEdit}
                    onClickDelete={onClickDelete}
                    onChangeActive={onChangeActive}
                />
            </div>
        </div>
    );
}