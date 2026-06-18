import { Save } from "lucide-react";
import { useTranslations } from "next-intl";
import {SyntheticEvent} from "react";

type CurrencyEditFormProps = {
    name: string;
    symbol: string;
    decimalPlaces: string;
    isUpdating: boolean;
    canSubmit: boolean;
    onChangeName: (name: string) => void;
    onChangeSymbol: (symbol: string) => void;
    onChangeDecimalPlaces: (decimalPlaces: string) => void;
    onClose: () => void;
    onSubmit: (event: SyntheticEvent<HTMLFormElement>) => void;
};

export default function CurrencyEditForm({
    name,
    symbol,
    decimalPlaces,
    isUpdating,
    canSubmit,
    onChangeName,
    onChangeSymbol,
    onChangeDecimalPlaces,
    onClose,
    onSubmit,
}: CurrencyEditFormProps) {
    const t = useTranslations("Settings.currencyPage.editModal");

    return (
        <form onSubmit={onSubmit} className="space-y-4">
            <label className="block">
                <span className="mb-2 block text-sm font-bold text-slate-700 dark:text-slate-200">
                    {t("fields.name")}
                </span>

                <input
                    value={name}
                    onChange={(event) => onChangeName(event.target.value)}
                    className="w-full rounded-xl border border-slate-300 bg-slate-50 px-4 py-3 text-sm text-gray-800 outline-none transition focus:border-orange-400 focus:bg-white focus:ring-2 focus:ring-orange-200 dark:border-white/10 dark:bg-black/30 dark:text-white dark:focus:bg-black/40 dark:focus:ring-orange-500/20"
                />
            </label>

            <label className="block">
                <span className="mb-2 block text-sm font-bold text-slate-700 dark:text-slate-200">
                    {t("fields.symbol")}
                </span>

                <input
                    value={symbol}
                    onChange={(event) => onChangeSymbol(event.target.value)}
                    maxLength={10}
                    className="w-full rounded-xl border border-slate-300 bg-slate-50 px-4 py-3 text-sm text-gray-800 outline-none transition focus:border-orange-400 focus:bg-white focus:ring-2 focus:ring-orange-200 dark:border-white/10 dark:bg-black/30 dark:text-white dark:focus:bg-black/40 dark:focus:ring-orange-500/20"
                />
            </label>

            <label className="block">
                <span className="mb-2 block text-sm font-bold text-slate-700 dark:text-slate-200">
                    {t("fields.decimalPlaces")}
                </span>

                <input
                    value={decimalPlaces}
                    onChange={(event) =>
                        onChangeDecimalPlaces(event.target.value)
                    }
                    type="number"
                    min="0"
                    max="8"
                    inputMode="numeric"
                    className="w-full rounded-xl border border-slate-300 bg-slate-50 px-4 py-3 text-sm text-gray-800 outline-none transition focus:border-orange-400 focus:bg-white focus:ring-2 focus:ring-orange-200 dark:border-white/10 dark:bg-black/30 dark:text-white dark:focus:bg-black/40 dark:focus:ring-orange-500/20"
                />
            </label>

            <div className="flex justify-end gap-2 pt-2">
                <button
                    type="button"
                    onClick={onClose}
                    disabled={isUpdating}
                    className="rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm font-semibold text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-white/10 dark:bg-white/5 dark:text-slate-300 dark:hover:bg-white/10"
                >
                    {t("cancel")}
                </button>

                <button
                    type="submit"
                    disabled={!canSubmit}
                    className="inline-flex items-center gap-2 rounded-xl bg-orange-500 px-5 py-3 text-sm font-semibold text-white transition hover:bg-orange-600 disabled:cursor-not-allowed disabled:bg-slate-300 dark:disabled:bg-slate-700"
                >
                    <Save size={17} />
                    {isUpdating ? t("saving") : t("save")}
                </button>
            </div>
        </form>
    );
}