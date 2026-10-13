import { useTranslations } from "next-intl";
import { InputMode } from "@/types/accountBookTransactionForm";

type TransactionInputModeTabsProps = {
    inputMode: InputMode;
    compact?: boolean;
    onChange: (mode: InputMode) => void;
};

export default function TransactionInputModeTabs({
    inputMode,
    compact = false,
    onChange,
}: TransactionInputModeTabsProps) {
    const t = useTranslations("AccountBook.detail.transactionModal");

    return (
        <div className={`grid shrink-0 grid-cols-2 gap-2 rounded-2xl bg-slate-100 p-1 dark:bg-black/30 ${compact ? "mb-2 sm:mb-5" : "mb-5"}`}>
            <button
                type="button"
                onClick={() => onChange("MANUAL")}
                className={`rounded-xl px-4 text-sm font-semibold transition ${compact ? "py-2 sm:py-3" : "py-3"} ${inputMode === "MANUAL"
                    ? "bg-white text-orange-500 shadow-sm dark:bg-zinc-800"
                    : "text-slate-500 hover:text-orange-500 dark:text-slate-400"
                    }`}
            >
                {t("inputMode.manual")}
            </button>

            <button
                type="button"
                onClick={() => onChange("RECEIPT")}
                className={`rounded-xl px-4 text-sm font-semibold transition ${compact ? "py-2 sm:py-3" : "py-3"} ${inputMode === "RECEIPT"
                    ? "bg-white text-orange-500 shadow-sm dark:bg-zinc-800"
                    : "text-slate-500 hover:text-orange-500 dark:text-slate-400"
                    }`}
            >
                {t("inputMode.receipt")}
            </button>
        </div>
    );
}
