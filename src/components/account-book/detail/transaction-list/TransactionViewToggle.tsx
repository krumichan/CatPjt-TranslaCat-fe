import { LayoutGrid, Table2 } from "lucide-react";
import { useTranslations } from "next-intl";

export type TransactionViewMode = "CARD" | "TABLE";

type TransactionViewToggleProps = {
    viewMode: TransactionViewMode;
    onChangeViewMode: (viewMode: TransactionViewMode) => void;
    t: ReturnType<typeof useTranslations>;
};

export default function TransactionViewToggle({
    viewMode,
    onChangeViewMode,
    t,
}: TransactionViewToggleProps) {
    return (
        <div className="inline-flex rounded-2xl border border-slate-200 bg-white/90 p-1 shadow-sm dark:border-white/10 dark:bg-zinc-900/80">
            <button
                type="button"
                onClick={() => onChangeViewMode("CARD")}
                className={`flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-semibold transition ${
                    viewMode === "CARD"
                        ? "bg-orange-500 text-white shadow-sm"
                        : "text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-white/10"
                }`}
            >
                <LayoutGrid size={15} />
                {t("view.card")}
            </button>

            <button
                type="button"
                onClick={() => onChangeViewMode("TABLE")}
                className={`flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-semibold transition ${
                    viewMode === "TABLE"
                        ? "bg-orange-500 text-white shadow-sm"
                        : "text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-white/10"
                }`}
            >
                <Table2 size={15} />
                {t("view.table")}
            </button>
        </div>
    );
}