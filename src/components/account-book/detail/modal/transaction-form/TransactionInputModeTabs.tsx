import { useTranslations } from "next-intl";
import { InputMode } from "./types";

type TransactionInputModeTabsProps = {
    inputMode: InputMode;
    onChange: (mode: InputMode) => void;
};

export default function TransactionInputModeTabs({
    inputMode,
    onChange,
}: TransactionInputModeTabsProps) {
    const t = useTranslations("AccountBook.detail.transactionModal");

    return (
        <div className="mb-5 grid grid-cols-2 gap-2 rounded-2xl bg-slate-100 p-1 dark:bg-black/30">
            <button
                type="button"
                onClick={() => onChange("MANUAL")}
                className={`rounded-xl px-4 py-3 text-sm font-semibold transition ${
                    inputMode === "MANUAL"
                        ? "bg-white text-orange-500 shadow-sm dark:bg-zinc-800"
                        : "text-slate-500 hover:text-orange-500 dark:text-slate-400"
                }`}
            >
                {t("inputMode.manual")}
            </button>

            <button
                type="button"
                onClick={() => onChange("RECEIPT")}
                className={`rounded-xl px-4 py-3 text-sm font-semibold transition ${
                    inputMode === "RECEIPT"
                        ? "bg-white text-orange-500 shadow-sm dark:bg-zinc-800"
                        : "text-slate-500 hover:text-orange-500 dark:text-slate-400"
                }`}
            >
                {t("inputMode.receipt")}
            </button>
        </div>
    );
}