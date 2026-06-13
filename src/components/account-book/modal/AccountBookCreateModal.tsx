import {useMemo, useRef, useState} from "react";
import type { SyntheticEvent } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { useTranslations } from "next-intl";
import {
    CreateAccountBookFormValues,
    Currency,
} from "@/types/accountBook";
import {formatNumberWithComma, onlyDigits} from "@/utils/number/formatNumberInput";
import AccountBookBasicFields, {DIRECT_INPUT_VALUE} from "@/components/account-book/modal/AccountBookBasicFields";

type AccountBookCreateModalProps = {
    isOpen: boolean;
    categoryOptions: string[];
    currencies: Currency[];
    isCurrencyLoading: boolean;
    onClose: () => void;
    onSubmit: (values: CreateAccountBookFormValues) => void | Promise<void>;
};

export default function AccountBookCreateModal({
   isOpen,
   categoryOptions,
   currencies,
   isCurrencyLoading,
   onClose,
   onSubmit,
}: AccountBookCreateModalProps) {
    const t = useTranslations("AccountBook.createModal");

    const firstCategoryName = categoryOptions[0] ?? "";

    const [selectedCategoryName, setSelectedCategoryName] = useState("");
    const [newCategoryName, setNewCategoryName] = useState("");

    const effectiveSelectedCategoryName =
        selectedCategoryName || firstCategoryName || DIRECT_INPUT_VALUE;

    const isDirectInput = effectiveSelectedCategoryName === DIRECT_INPUT_VALUE;
    const defaultCurrencyCode =
        currencies.find((currency) => currency.baseCurrency)?.code ??
        currencies[0]?.code ??
        "";

    const [name, setName] = useState("");
    const [description, setDescription] = useState("");
    const [currencyCode, setCurrencyCode] = useState(defaultCurrencyCode);
    const [expenseGoalAmount, setExpenseGoalAmount] = useState("");

    const [isSubmitting, setIsSubmitting] = useState(false);
    const isSubmittingRef = useRef(false);

    const effectiveCurrencyCode = currencyCode || defaultCurrencyCode;

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

        return !!effectiveSelectedCategoryName;
    }, [
        name,
        effectiveCurrencyCode,
        isDirectInput,
        newCategoryName,
        effectiveSelectedCategoryName,
    ]);

    const isSubmitDisabled = !canSubmit || isSubmitting;

    if (!isOpen || typeof document === "undefined") {
        return null;
    }

    const resetForm = () => {
        setName("");
        setDescription("");
        setCurrencyCode("");
        setSelectedCategoryName("");
        setNewCategoryName("");
        setExpenseGoalAmount("");
    };

    const handleClose = () => {
        if (isSubmitting) {
            return;
        }

        resetForm();
        onClose();
    };

    const handleSubmit = async (event: SyntheticEvent) => {
        event.preventDefault();

        if (!canSubmit || isSubmittingRef.current) {
            return;
        }

        isSubmittingRef.current = true;
        setIsSubmitting(true);

        try {
            await onSubmit({
                name: name.trim(),
                description: description.trim() || undefined,
                currencyCode: effectiveCurrencyCode,
                expenseGoalAmount: expenseGoalAmount.trim()
                    ? Number(expenseGoalAmount)
                    : null,
                categoryMode: isDirectInput ? "NEW" : "EXISTING",
                categoryId: undefined,
                categoryName: isDirectInput ? undefined : effectiveSelectedCategoryName,
                newCategoryName: isDirectInput
                    ? newCategoryName.trim()
                    : undefined,
            });

            resetForm();
            onClose();
        } catch (error) {
            console.error(error);
        } finally {
            isSubmittingRef.current = false;
            setIsSubmitting(false);
        }
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
                        disabled={isSubmitting}
                        className="inline-flex h-10 w-10 items-center justify-center rounded-xl text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 disabled:cursor-not-allowed disabled:opacity-50 dark:hover:bg-white/10 dark:hover:text-white"
                        aria-label={t("actions.close")}
                    >
                        <X className="h-5 w-5" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="flex flex-col gap-5">
                    <AccountBookBasicFields
                        translationKey="AccountBook.createModal"
                        name={name}
                        description={description}
                        categoryOptions={categoryOptions}
                        categorySelectValue={effectiveSelectedCategoryName}
                        isDirectInput={isDirectInput}
                        newCategoryName={newCategoryName}
                        onChangeName={setName}
                        onChangeDescription={setDescription}
                        onChangeCategorySelectValue={setSelectedCategoryName}
                        onChangeNewCategoryName={setNewCategoryName}
                    />

                    <label className="block">
                        <span className="mb-2 block text-sm font-bold text-slate-700 dark:text-slate-200">
                            {t("fields.currency")}
                            <span className="text-orange-500">*</span>
                        </span>
                        <select
                            value={effectiveCurrencyCode}
                            onChange={(event) =>
                                setCurrencyCode(event.target.value)
                            }
                            disabled={isCurrencyLoading || currencies.length === 0 || isSubmitting}
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
                                value={formatNumberWithComma(expenseGoalAmount)}
                                onChange={(event) => {
                                    setExpenseGoalAmount(onlyDigits(event.target.value));
                                }}
                                disabled={isSubmitting}
                                type="text"
                                inputMode="numeric"
                                placeholder={t("placeholders.goalAmount")}
                                className="w-full bg-transparent px-4 py-3 text-sm text-gray-800 outline-none placeholder:text-slate-400 disabled:cursor-not-allowed disabled:opacity-60 dark:text-white dark:placeholder:text-gray-500"
                            />
                        </div>
                        <p className="mt-2 text-xs text-slate-400 dark:text-slate-500">
                            {t("helps.goalAmount")}
                        </p>
                    </label>

                    <div className="flex justify-end gap-3 pt-2">
                        <button
                            type="button"
                            onClick={handleClose}
                            disabled={isSubmitting}
                            className="rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm font-semibold text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-white/10 dark:bg-white/5 dark:text-slate-300 dark:hover:bg-white/10"
                        >
                            {t("actions.cancel")}
                        </button>

                        <button
                            type="submit"
                            disabled={isSubmitDisabled}
                            aria-busy={isSubmitting}
                            className="rounded-xl bg-orange-500 px-5 py-3 text-sm font-semibold text-white shadow-[0_10px_20px_rgba(249,115,22,0.28)] transition hover:bg-orange-600 disabled:cursor-not-allowed disabled:bg-slate-300 disabled:shadow-none dark:disabled:bg-slate-700"
                        >
                            {isSubmitting ? t("actions.submitting") : t("actions.submit")}
                        </button>
                    </div>
                </form>
            </div>
        </div>,
        document.body
    );
}