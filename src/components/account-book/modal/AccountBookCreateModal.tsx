import { useEffect, useMemo, useState } from "react";
import type { SyntheticEvent } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { useTranslations } from "next-intl";
import {
    AccountBookCategory,
    CreateAccountBookFormValues,
    Currency,
} from "@/types/accountBook";
import {formatNumberWithCommas, onlyDigits} from "@/utils/number/formatNumberInput";

type AccountBookCreateModalProps = {
    isOpen: boolean;
    categories: AccountBookCategory[];
    currencies: Currency[];
    isCurrencyLoading: boolean;
    onClose: () => void;
    onSubmit: (values: CreateAccountBookFormValues) => void | Promise<void>;
};

const DIRECT_INPUT_VALUE = "__DIRECT_INPUT__";

export default function AccountBookCreateModal({
    isOpen,
    categories,
    currencies,
    isCurrencyLoading,
    onClose,
    onSubmit,
}: AccountBookCreateModalProps) {
    const t = useTranslations("AccountBook.createModal");

    const firstCategoryId = categories[0]?.id ?? "";
    const defaultCurrencyCode =
        currencies.find((currency) => currency.baseCurrency)?.code ??
        currencies[0]?.code ??
        "";

    const [name, setName] = useState("");
    const [description, setDescription] = useState("");
    const [currencyCode, setCurrencyCode] = useState(defaultCurrencyCode);
    const [expenseGoalAmount, setExpenseGoalAmount] = useState("");
    const [selectedCategoryId, setSelectedCategoryId] = useState(
        firstCategoryId || DIRECT_INPUT_VALUE
    );
    const [newCategoryName, setNewCategoryName] = useState("");

    const effectiveCurrencyCode = currencyCode || defaultCurrencyCode;

    const effectiveSelectedCategoryId =
        selectedCategoryId || firstCategoryId || DIRECT_INPUT_VALUE;

    const isDirectInput = selectedCategoryId === DIRECT_INPUT_VALUE;

    const canSubmit = useMemo(() => {
        if (!name.trim()) {
            return false;
        }

        if (!effectiveCurrencyCode) {
            return false;
        }

        if (isDirectInput) {
            return !!newCategoryName.trim();
        }

        return !!effectiveSelectedCategoryId;
    }, [
        name,
        effectiveCurrencyCode,
        isDirectInput,
        newCategoryName,
        effectiveSelectedCategoryId,
    ]);

    if (!isOpen || typeof document === "undefined") {
        return null;
    }

    const resetForm = () => {
        setName("");
        setDescription("");
        setCurrencyCode("");
        setSelectedCategoryId("");
        setNewCategoryName("");
        setExpenseGoalAmount("");
    };

    const handleClose = () => {
        resetForm();
        onClose();
    };

    const handleSubmit = async (event: SyntheticEvent) => {
        event.preventDefault();

        if (!canSubmit) {
            return;
        }

        const selectedCategory = categories.find(
            (category) => category.id === effectiveSelectedCategoryId
        );

        await onSubmit({
            name: name.trim(),
            description: description.trim() || undefined,
            currencyCode: effectiveCurrencyCode,
            expenseGoalAmount: expenseGoalAmount.trim()
                ? Number(expenseGoalAmount)
                : null,
            categoryMode: isDirectInput ? "NEW" : "EXISTING",
            categoryId: isDirectInput ? undefined : effectiveSelectedCategoryId,
            categoryName: isDirectInput ? undefined : selectedCategory?.name,
            newCategoryName: isDirectInput
                ? newCategoryName.trim()
                : undefined,
        });

        resetForm();
        onClose();
    };

    const selectedCurrency = currencies.find(
        (currency) => currency.code === effectiveCurrencyCode
    );

    return createPortal(
        <div className="fixed inset-0 z-9999 flex items-start justify-center overflow-y-auto bg-black/40 px-4 py-8 backdrop-blur-sm">
            <div className="w-full max-w-xl rounded-3xl border border-white/70 bg-white p-6 shadow-2xl dark:border-white/10 dark:bg-slate-950 sm:p-8">
                <div className="mb-6 flex items-start justify-between gap-4">
                    <div>
                        <p className="mb-2 text-sm font-semibold uppercase tracking-[0.2em] text-orange-500">
                            {t("eyebrow")}
                        </p>
                        <h2 className="text-2xl font-black text-slate-900 dark:text-white">
                            {t("title")}
                        </h2>
                        <p className="mt-2 text-sm leading-6 text-slate-500 dark:text-slate-400">
                            {t("description")}
                        </p>
                    </div>

                    <button
                        type="button"
                        onClick={handleClose}
                        className="inline-flex h-10 w-10 items-center justify-center rounded-xl text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-white/10 dark:hover:text-white"
                        aria-label={t("actions.close")}
                    >
                        <X className="h-5 w-5" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="flex flex-col gap-5">
                    <label className="block">
                        <span className="mb-2 block text-sm font-bold text-slate-700 dark:text-slate-200">
                            {t("fields.name")} *
                        </span>
                        <input
                            value={name}
                            onChange={(event) => setName(event.target.value)}
                            placeholder={t("placeholders.name")}
                            className="w-full rounded-xl border border-slate-300 bg-slate-50 px-4 py-3 text-sm text-gray-800 outline-none transition placeholder:text-slate-400 focus:border-orange-400 focus:bg-white focus:ring-2 focus:ring-orange-200 dark:border-white/10 dark:bg-black/30 dark:text-white dark:placeholder:text-gray-500 dark:focus:bg-black/40 dark:focus:ring-orange-500/20"
                        />
                    </label>

                    <label className="block">
                        <span className="mb-2 block text-sm font-bold text-slate-700 dark:text-slate-200">
                            {t("fields.category")} *
                        </span>
                        <select
                            value={effectiveSelectedCategoryId}
                            onChange={(event) =>
                                setSelectedCategoryId(event.target.value)
                            }
                            className="w-full rounded-xl border border-slate-300 bg-slate-50 px-4 py-3 text-sm text-gray-800 outline-none transition focus:border-orange-400 focus:bg-white focus:ring-2 focus:ring-orange-200 dark:border-white/10 dark:bg-black/30 dark:text-white dark:focus:bg-black/40 dark:focus:ring-orange-500/20 dark:scheme-dark [&>option]:bg-white [&>option]:text-gray-800 dark:[&>option]:bg-zinc-900 dark:[&>option]:text-white"
                        >
                            {categories.map((category) => (
                                <option key={category.id} value={category.id}>
                                    {category.name}
                                </option>
                            ))}
                            <option value={DIRECT_INPUT_VALUE}>
                                {t("fields.directInput")}
                            </option>
                        </select>

                        {isDirectInput && (
                            <input
                                value={newCategoryName}
                                onChange={(event) =>
                                    setNewCategoryName(event.target.value)
                                }
                                placeholder={t("placeholders.category")}
                                className="mt-3 w-full rounded-xl border border-slate-300 bg-slate-50 px-4 py-3 text-sm text-gray-800 outline-none transition placeholder:text-slate-400 focus:border-orange-400 focus:bg-white focus:ring-2 focus:ring-orange-200 dark:border-white/10 dark:bg-black/30 dark:text-white dark:placeholder:text-gray-500 dark:focus:bg-black/40 dark:focus:ring-orange-500/20"
                            />
                        )}
                    </label>

                    <label className="block">
                        <span className="mb-2 block text-sm font-bold text-slate-700 dark:text-slate-200">
                            {t("fields.currency")} *
                        </span>
                        <select
                            value={effectiveCurrencyCode}
                            onChange={(event) =>
                                setCurrencyCode(event.target.value)
                            }
                            disabled={isCurrencyLoading || currencies.length === 0}
                            className="
                                w-full rounded-xl border border-slate-300 bg-slate-50 px-4 py-3 text-sm text-gray-800
                                outline-none transition
                                focus:border-orange-400 focus:bg-white focus:ring-2 focus:ring-orange-200
                                dark:border-white/10 dark:dark:bg-black/30 dark:text-white
                                dark:focus:dark:bg-black/30 dark:focus:ring-orange-500/20
                                dark:scheme-dark
                                [&>option]:bg-white [&>option]:text-gray-800
                                dark:[&>option]:bg-zinc-900 dark:[&>option]:text-white
                            "
                        >
                            {currencies.map((currency) => (
                                <option key={currency.code} value={currency.code}>
                                    {currency.code} - {currency.name}
                                    {currency.symbol ? ` (${currency.symbol})` : ""}
                                </option>
                            ))}
                        </select>
                    </label>

                    <label className="block">
                        <span className="mb-2 block text-sm font-bold text-slate-700 dark:text-slate-200">
                            {t("fields.goalAmount")}
                        </span>
                        <div className="flex overflow-hidden rounded-xl border border-slate-300 bg-slate-50 focus-within:border-orange-400 focus-within:bg-white focus-within:ring-2 focus-within:ring-orange-200 dark:border-white/10 dark:bg-black/30 dark:focus-within:bg-black/40 dark:focus-within:ring-orange-500/20">
                            <span className="inline-flex items-center border-r border-slate-200 px-4 text-sm font-bold text-slate-500 dark:border-white/10 dark:text-slate-300">
                                {selectedCurrency?.symbol ?? effectiveCurrencyCode}
                            </span>
                            <input
                                value={formatNumberWithCommas(expenseGoalAmount)}
                                onChange={(event) => {
                                    setExpenseGoalAmount(onlyDigits(event.target.value));
                                }}
                                type="text"
                                inputMode="numeric"
                                placeholder={t("placeholders.goalAmount")}
                                className="w-full bg-transparent px-4 py-3 text-sm text-gray-800 outline-none placeholder:text-slate-400 dark:text-white dark:placeholder:text-gray-500"
                            />
                        </div>
                        <p className="mt-2 text-xs text-slate-400 dark:text-slate-500">
                            {t("helps.goalAmount")}
                        </p>
                    </label>

                    <label className="block">
                        <span className="mb-2 block text-sm font-bold text-slate-700 dark:text-slate-200">
                            {t("fields.description")}
                        </span>
                        <textarea
                            value={description}
                            onChange={(event) =>
                                setDescription(event.target.value)
                            }
                            placeholder={t("placeholders.description")}
                            rows={3}
                            className="w-full resize-none rounded-xl border border-slate-300 bg-slate-50 px-4 py-3 text-sm text-gray-800 outline-none transition placeholder:text-slate-400 focus:border-orange-400 focus:bg-white focus:ring-2 focus:ring-orange-200 dark:border-white/10 dark:bg-black/30 dark:text-white dark:placeholder:text-gray-500 dark:focus:bg-black/40 dark:focus:ring-orange-500/20"
                        />
                    </label>

                    <div className="flex justify-end gap-3 pt-2">
                        <button
                            type="button"
                            onClick={handleClose}
                            className="rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm font-semibold text-slate-600 transition hover:bg-slate-50 dark:border-white/10 dark:bg-white/5 dark:text-slate-300 dark:hover:bg-white/10"
                        >
                            {t("actions.cancel")}
                        </button>
                        <button
                            type="submit"
                            disabled={!canSubmit}
                            className="rounded-xl bg-orange-500 px-5 py-3 text-sm font-semibold text-white shadow-[0_10px_20px_rgba(249,115,22,0.28)] transition hover:bg-orange-600 disabled:cursor-not-allowed disabled:bg-slate-300 disabled:shadow-none dark:disabled:bg-slate-700"
                        >
                            {t("actions.submit")}
                        </button>
                    </div>
                </form>
            </div>
        </div>,
        document.body
    );
}