import {Loader2, Repeat} from "lucide-react";
import { useTranslations } from "next-intl";
import {
    AccountBookFixedCostGenerationTargetsResponse,
    CurrencyCode,
} from "@/types/accountBook";
import { formatAmount } from "@/utils/account-book/formatAmount";

type FixedCostGenerationBannerProps = {
    generationTargets?: AccountBookFixedCostGenerationTargetsResponse;
    currencyCode: CurrencyCode;
    isLoading?: boolean;
    onClickGenerate: () => void | Promise<void>;
};

export default function FixedCostGenerationBanner({
    generationTargets,
    currencyCode,
    isLoading = false,
    onClickGenerate,
}: FixedCostGenerationBannerProps) {
    const t = useTranslations("AccountBook.detail.fixedCost.generation");

    if (!generationTargets || generationTargets.count === 0) {
        return null;
    }

    const totalAmount = generationTargets.targets.reduce(
        (sum, target) => sum + target.amount,
        0
    );

    return (
        <section
            className={`mb-6 rounded-2xl border border-orange-200 bg-orange-50/90 p-5 shadow-[0_12px_30px_rgba(249,115,22,0.12)] transition dark:border-orange-500/20 dark:bg-orange-500/10 ${
                isLoading ? "opacity-80" : ""
            }`}
        >
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-orange-500 text-white shadow-[0_8px_18px_rgba(249,115,22,0.28)]">
                        <Repeat size={18} />
                    </div>

                    <div>
                        <p className="text-sm font-bold text-orange-700 dark:text-orange-300">
                            {t("title", {
                                year: generationTargets.year,
                                month: generationTargets.month,
                                count: generationTargets.count,
                            })}
                        </p>

                        <p className="mt-1 text-sm text-orange-700/80 dark:text-orange-200/80">
                            {t("description", {
                                amount: formatAmount(totalAmount, currencyCode),
                            })}
                        </p>

                        {isLoading && (
                            <p className="mt-2 text-xs font-semibold text-orange-600 dark:text-orange-300">
                                {t("messages.generating")}
                            </p>
                        )}
                    </div>
                </div>

                <button
                    type="button"
                    onClick={onClickGenerate}
                    disabled={isLoading}
                    className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-orange-500 px-4 py-3 text-sm font-bold text-white shadow-[0_10px_20px_rgba(249,115,22,0.28)] transition hover:bg-orange-600 disabled:cursor-not-allowed disabled:bg-slate-300 disabled:shadow-none dark:disabled:bg-slate-700"
                >
                    {isLoading && <Loader2 size={16} className="animate-spin" />}
                    {isLoading ? t("actions.generating") : t("actions.generate")}
                </button>
            </div>
        </section>
    );
}