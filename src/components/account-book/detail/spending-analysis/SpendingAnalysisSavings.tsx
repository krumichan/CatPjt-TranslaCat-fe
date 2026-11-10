import { useTranslations } from "next-intl";
import { useAmountFormatter } from "@/components/account-book/AccountBookCurrencyProvider";
import type { CurrencyCode } from "@/types/accountBook";
import type { SpendingSavingsScenario } from "@/types/accountBookAnalysis";

export default function SpendingAnalysisSavings({ savings, currencyCode, total = false, showEstimate = true }: {
    savings: SpendingSavingsScenario; currencyCode: CurrencyCode; total?: boolean; showEstimate?: boolean;
}) {
    const t = useTranslations("AccountBook.detail.spendingAnalysis");
    const formatAmount = useAmountFormatter();
    const amount = (value: string) => formatAmount(value, currencyCode);
    return <div className="min-w-0 rounded-2xl bg-violet-50 p-4 dark:bg-violet-500/10" data-testid={total ? "spending-savings-total" : "spending-savings"}>
        {showEstimate && <>
            <p className="text-xs font-medium text-violet-700 dark:text-violet-200">{t(total ? "savingsTotalTitle" : "savingsTitle")}</p>
            <p className="mt-1 break-words text-xl font-bold text-violet-900 dark:text-violet-100">{t("savingsEstimate", { amount: amount(savings.estimate) })}</p>
        </>}
        {savings.lower !== savings.upper && <p className="mt-1 text-sm text-violet-700 dark:text-violet-200">{t("savingsRange", { lower: amount(savings.lower), upper: amount(savings.upper) })}</p>}
        <p className="mt-2 text-xs leading-relaxed text-slate-600 dark:text-slate-300">{t("savingsNotice")}</p>
        <details className="mt-2 text-xs text-slate-600 dark:text-slate-300">
            <summary className="cursor-pointer py-1">{t("savingsAssumptions")}</summary>
            {savings.basisAmount && <p className="mt-1">{t("savingsBasis", { amount: amount(savings.basisAmount) })}</p>}
            {savings.kind !== "COMBINED" && <p className="mt-1">{t("savingsRates", { lower: savings.reductionLowBps / 100, upper: savings.reductionHighBps / 100 })}</p>}
            {savings.kind !== "COMBINED" && <p className="mt-1">{t("replacementRates", { lower: savings.replacementLowBps / 100, upper: savings.replacementHighBps / 100 })}</p>}
            <p className="mt-1">{t("savingsCalculation", { gross: amount(savings.grossReduction), replacement: amount(savings.replacementCost) })}</p>
            {savings.kind !== "COMBINED" && <p className="mt-1 whitespace-pre-wrap">{savings.assumption}</p>}
        </details>
    </div>;
}
