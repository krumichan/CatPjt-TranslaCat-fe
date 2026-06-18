import { SyntheticEvent } from "react";
import { Plus, Trash2 } from "lucide-react";
import { useTranslations } from "next-intl";

import {
    ReceiptKeyword,
    ReceiptKeywordType,
} from "@/types/receiptSetting";

type ReceiptKeywordSettingsSectionProps = {
    activeType: ReceiptKeywordType;
    keyword: string;
    currencyCode: string;
    ocrLanguage: string;
    filteredKeywords: ReceiptKeyword[];
    isLoading: boolean;
    isError: unknown;
    isCreating: boolean;
    processingId: number | null;
    onActiveTypeChange: (type: ReceiptKeywordType) => void;
    onKeywordChange: (keyword: string) => void;
    onCurrencyCodeChange: (currencyCode: string) => void;
    onOcrLanguageChange: (ocrLanguage: string) => void;
    onCreate: (event: SyntheticEvent) => void;
    onToggleEnabled: (keyword: ReceiptKeyword) => void;
    onDeleteClick: (keyword: ReceiptKeyword) => void;
};

const keywordTypes: ReceiptKeywordType[] = [
    "STOP_AFTER",
    "IMPORTANT",
    "EXCLUDE_ITEM",
];

const ocrLanguages = ["japan", "korean", "en"];

export default function ReceiptKeywordSettingsSection({
    activeType,
    keyword,
    currencyCode,
    ocrLanguage,
    filteredKeywords,
    isLoading,
    isError,
    isCreating,
    processingId,
    onActiveTypeChange,
    onKeywordChange,
    onCurrencyCodeChange,
    onOcrLanguageChange,
    onCreate,
    onToggleEnabled,
    onDeleteClick,
}: ReceiptKeywordSettingsSectionProps) {
    const t = useTranslations("Settings.receiptAiPage.keyword");

    return (
        <section className="rounded-3xl border border-slate-200 bg-white/90 p-5 shadow-sm dark:border-white/10 dark:bg-zinc-900/80">
            <div className="mb-5">
                <h2 className="text-xl font-black text-slate-900 dark:text-white">
                    {t("title")}
                </h2>

                <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
                    {t("description")}
                </p>
            </div>

            <div className="mb-4 grid grid-cols-3 gap-2">
                {keywordTypes.map((type) => {
                    const isActive = activeType === type;

                    return (
                        <button
                            key={type}
                            type="button"
                            onClick={() => onActiveTypeChange(type)}
                            className={`rounded-xl px-3 py-2 text-sm font-bold transition ${
                                isActive
                                    ? "bg-orange-500 text-white"
                                    : "bg-slate-100 text-slate-500 hover:bg-slate-200 dark:bg-white/10 dark:text-slate-300 dark:hover:bg-white/15"
                            }`}
                        >
                            {t(`types.${type}`)}
                        </button>
                    );
                })}
            </div>

            <form
                onSubmit={onCreate}
                className="mb-5 grid gap-2 rounded-2xl bg-slate-50 p-4 dark:bg-black/25 sm:grid-cols-[1fr_160px_160px_auto]"
            >
                <input
                    value={keyword}
                    onChange={(event) => onKeywordChange(event.target.value)}
                    placeholder={t("placeholders.keyword")}
                    className="rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-800 outline-none transition focus:border-orange-400 focus:ring-2 focus:ring-orange-200 dark:border-white/10 dark:bg-black/30 dark:text-white dark:focus:ring-orange-500/20"
                />

                <input
                    value={currencyCode}
                    onChange={(event) =>
                        onCurrencyCodeChange(event.target.value)
                    }
                    placeholder={t("placeholders.currencyCode")}
                    className="rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm uppercase text-slate-800 outline-none transition focus:border-orange-400 focus:ring-2 focus:ring-orange-200 dark:border-white/10 dark:bg-black/30 dark:text-white dark:focus:ring-orange-500/20"
                />

                <select
                    value={ocrLanguage}
                    onChange={(event) =>
                        onOcrLanguageChange(event.target.value)
                    }
                    className="rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-800 outline-none transition focus:border-orange-400 focus:ring-2 focus:ring-orange-200 dark:border-white/10 dark:bg-black/30 dark:text-white dark:focus:ring-orange-500/20"
                >
                    {ocrLanguages.map((language) => (
                        <option key={language} value={language}>
                            {t(`ocrLanguages.${language}`)}
                        </option>
                    ))}
                </select>

                <button
                    type="submit"
                    disabled={!keyword.trim() || isCreating}
                    className="inline-flex items-center justify-center gap-2 rounded-xl bg-orange-500 px-5 py-3 text-sm font-bold text-white transition hover:bg-orange-600 disabled:cursor-not-allowed disabled:bg-slate-300 dark:disabled:bg-slate-700"
                >
                    <Plus size={17} />
                    {isCreating ? t("creating") : t("add")}
                </button>
            </form>

            {isLoading ? (
                <p className="rounded-2xl bg-slate-50 px-4 py-5 text-sm text-slate-500 dark:bg-black/25 dark:text-slate-400">
                    {t("messages.loading")}
                </p>
            ) : isError ? (
                <p className="rounded-2xl bg-red-50 px-4 py-5 text-sm text-red-500 dark:bg-red-500/10 dark:text-red-300">
                    {t("messages.loadFailed")}
                </p>
            ) : filteredKeywords.length === 0 ? (
                <p className="rounded-2xl bg-slate-50 px-4 py-5 text-sm text-slate-500 dark:bg-black/25 dark:text-slate-400">
                    {t("empty")}
                </p>
            ) : (
                <div className="space-y-2">
                    {filteredKeywords.map((item) => (
                        <div
                            key={item.id}
                            className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-slate-50/80 px-4 py-3 dark:border-white/10 dark:bg-black/25 sm:flex-row sm:items-center sm:justify-between"
                        >
                            <div className="min-w-0">
                                <p className="truncate text-sm font-bold text-slate-900 dark:text-white">
                                    {item.keyword}
                                </p>

                                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                                    {item.currencyCode || t("allCurrencies")} ·{" "}
                                    {t(`ocrLanguages.${item.ocrLanguage}`)}
                                </p>
                            </div>

                            <div className="flex items-center gap-2">
                                <button
                                    type="button"
                                    onClick={() => onToggleEnabled(item)}
                                    disabled={processingId !== null}
                                    className={`rounded-xl px-3 py-2 text-xs font-bold transition disabled:cursor-not-allowed disabled:opacity-60 ${
                                        item.enabled
                                            ? "bg-orange-100 text-orange-600 dark:bg-orange-500/20 dark:text-orange-300"
                                            : "bg-slate-200 text-slate-500 dark:bg-white/10 dark:text-slate-300"
                                    }`}
                                >
                                    {item.enabled
                                        ? t("enabled")
                                        : t("disabled")}
                                </button>

                                <button
                                    type="button"
                                    onClick={() => onDeleteClick(item)}
                                    disabled={processingId !== null}
                                    className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-red-50 text-red-500 transition hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-red-500/10 dark:text-red-300 dark:hover:bg-red-500/20"
                                    aria-label={t("delete")}
                                >
                                    <Trash2 size={16} />
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </section>
    );
}