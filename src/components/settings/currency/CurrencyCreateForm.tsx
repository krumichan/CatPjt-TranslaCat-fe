import type { SyntheticEvent } from "react";
import { Plus } from "lucide-react";
import { useTranslations } from "next-intl";

type CurrencyCreateFormProps = {
    code: string;
    name: string;
    symbol: string;
    decimalPlaces: string;
    baseCurrency: boolean;
    canSubmit: boolean;
    isSubmitting: boolean;
    onChangeCode: (value: string) => void;
    onChangeName: (value: string) => void;
    onChangeSymbol: (value: string) => void;
    onChangeDecimalPlaces: (value: string) => void;
    onChangeBaseCurrency: (value: boolean) => void;
    onSubmit: (event: SyntheticEvent<HTMLFormElement>) => void;
};

export default function CurrencyCreateForm({
   code,
   name,
   symbol,
   decimalPlaces,
   baseCurrency,
   canSubmit,
   isSubmitting,
   onChangeCode,
   onChangeName,
   onChangeSymbol,
   onChangeDecimalPlaces,
   onChangeBaseCurrency,
   onSubmit,
}: CurrencyCreateFormProps) {
    const t = useTranslations("Settings.currencyPage");

    return (
        <form
            onSubmit={onSubmit}
            className="rounded-3xl border border-white/70 bg-white/85 p-5 shadow-lg shadow-orange-100/50 backdrop-blur dark:border-white/10 dark:bg-slate-950/60 dark:shadow-black/30"
        >
            <div className="mb-5 flex items-center gap-3">
                <span className="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-orange-100 text-orange-500 dark:bg-orange-500/10 dark:text-orange-300">
                    <Plus className="h-5 w-5" />
                </span>
                <div>
                    <h2 className="text-lg font-black text-slate-900 dark:text-white">
                        {t("form.title")}
                    </h2>
                    <p className="text-xs font-semibold text-slate-400 dark:text-slate-500">
                        {t("form.description")}
                    </p>
                </div>
            </div>

            <div className="flex flex-col gap-4">
                <label className="block">
                    <span className="mb-2 block text-sm font-bold text-slate-700 dark:text-slate-200">
                        {t("form.fields.code")}{" "}
                        <span className="text-orange-500">*</span>
                    </span>
                    <input
                        value={code}
                        onChange={(event) =>
                            onChangeCode(event.target.value.toUpperCase())
                        }
                        maxLength={10}
                        placeholder={t("form.placeholders.code")}
                        className="w-full rounded-xl border border-slate-300 bg-slate-50 px-4 py-3 text-sm text-gray-800 outline-none transition placeholder:text-slate-400 focus:border-orange-400 focus:bg-white focus:ring-2 focus:ring-orange-200 dark:border-white/10 dark:bg-black/30 dark:text-white dark:placeholder:text-gray-500 dark:focus:bg-black/40 dark:focus:ring-orange-500/20"
                    />
                </label>

                <label className="block">
                    <span className="mb-2 block text-sm font-bold text-slate-700 dark:text-slate-200">
                        {t("form.fields.name")}{" "}
                        <span className="text-orange-500">*</span>
                    </span>
                    <input
                        value={name}
                        onChange={(event) => onChangeName(event.target.value)}
                        placeholder={t("form.placeholders.name")}
                        className="w-full rounded-xl border border-slate-300 bg-slate-50 px-4 py-3 text-sm text-gray-800 outline-none transition placeholder:text-slate-400 focus:border-orange-400 focus:bg-white focus:ring-2 focus:ring-orange-200 dark:border-white/10 dark:bg-black/30 dark:text-white dark:placeholder:text-gray-500 dark:focus:bg-black/40 dark:focus:ring-orange-500/20"
                    />
                </label>

                <div className="grid grid-cols-2 gap-3">
                    <label className="block">
                        <span className="mb-2 block text-sm font-bold text-slate-700 dark:text-slate-200">
                            {t("form.fields.symbol")}
                        </span>
                        <input
                            value={symbol}
                            onChange={(event) =>
                                onChangeSymbol(event.target.value)
                            }
                            placeholder={t("form.placeholders.symbol")}
                            className="w-full rounded-xl border border-slate-300 bg-slate-50 px-4 py-3 text-sm text-gray-800 outline-none transition placeholder:text-slate-400 focus:border-orange-400 focus:bg-white focus:ring-2 focus:ring-orange-200 dark:border-white/10 dark:bg-black/30 dark:text-white dark:placeholder:text-gray-500 dark:focus:bg-black/40 dark:focus:ring-orange-500/20"
                        />
                    </label>

                    <label className="block">
                        <span className="mb-2 block text-sm font-bold text-slate-700 dark:text-slate-200">
                            {t("form.fields.decimalPlaces")}
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
                </div>

                <label className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 dark:border-white/10 dark:bg-black/20">
                    <input
                        checked={baseCurrency}
                        onChange={(event) =>
                            onChangeBaseCurrency(event.target.checked)
                        }
                        type="checkbox"
                        className="h-4 w-4 rounded border-slate-300 text-orange-500 focus:ring-orange-400"
                    />
                    <span className="text-sm font-semibold text-slate-600 dark:text-slate-300">
                        {t("form.fields.baseCurrency")}
                    </span>
                </label>

                <button
                    type="submit"
                    disabled={!canSubmit}
                    className="rounded-xl bg-orange-500 px-5 py-3 text-sm font-semibold text-white shadow-[0_10px_20px_rgba(249,115,22,0.28)] transition hover:bg-orange-600 disabled:cursor-not-allowed disabled:bg-slate-300 disabled:shadow-none dark:disabled:bg-slate-700"
                >
                    {isSubmitting
                        ? t("form.actions.submitting")
                        : t("form.actions.submit")}
                </button>
            </div>
        </form>
    );
}