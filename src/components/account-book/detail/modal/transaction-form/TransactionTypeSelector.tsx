import { useTranslations } from "next-intl";
import { TransactionType } from "@/types/accountBook";

type TransactionTypeSelectorProps = {
    type: TransactionType;
    onChange: (type: TransactionType) => void;
};

export default function TransactionTypeSelector({
    type,
    onChange,
}: TransactionTypeSelectorProps) {
    const t = useTranslations("AccountBook.detail.transactionModal");

    return (
        <div>
            <label className="mb-2 block text-sm font-semibold text-slate-700 dark:text-slate-200">
                {t("fields.type")} <span className="text-orange-500">*</span>
            </label>

            <div className="grid grid-cols-2 gap-2">
                <button
                    type="button"
                    onClick={() => onChange("EXPENSE")}
                    className={`rounded-xl px-4 py-3 text-sm font-semibold transition ${
                        type === "EXPENSE"
                            ? "bg-red-500 text-white shadow-[0_10px_20px_rgba(239,68,68,0.25)]"
                            : "border border-slate-200 bg-slate-50 text-slate-500 hover:border-red-300 hover:bg-red-50 dark:border-white/10 dark:bg-black/30 dark:text-slate-300"
                    }`}
                >
                    {t("type.expense")}
                </button>

                <button
                    type="button"
                    onClick={() => onChange("INCOME")}
                    className={`rounded-xl px-4 py-3 text-sm font-semibold transition ${
                        type === "INCOME"
                            ? "bg-blue-500 text-white shadow-[0_10px_20px_rgba(59,130,246,0.25)]"
                            : "border border-slate-200 bg-slate-50 text-slate-500 hover:border-blue-300 hover:bg-blue-50 dark:border-white/10 dark:bg-black/30 dark:text-slate-300"
                    }`}
                >
                    {t("type.income")}
                </button>
            </div>
        </div>
    );
}