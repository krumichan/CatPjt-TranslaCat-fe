import {X} from "lucide-react";
import AccountBookBasicFields, {DIRECT_INPUT_VALUE} from "@/components/account-book/modal/AccountBookBasicFields";
import { SyntheticEvent, useRef, useState } from "react";
import {useTranslations} from "next-intl";
import {
    AccountBook,
    AccountBookEditFormValues
} from "@/types/accountBook";
import {formatNumberWithComma, onlyDigits} from "@/utils/number/formatNumberInput";

type AccountBookEditModalContentProps = {
    accountBook: AccountBook;
    categoryOptions: string[];
    isMonthlyGoalLoading: boolean;
    onClose: () => void;
    onSubmit: (
        accountBookId: number,
        values: AccountBookEditFormValues
    ) => void | Promise<void>;
};

export function AccountBookEditModalContent({
    accountBook,
    categoryOptions,
    isMonthlyGoalLoading,
    onClose,
    onSubmit,
}: AccountBookEditModalContentProps) {
    const t = useTranslations("AccountBook.editModal");

    const [name, setName] = useState(accountBook.name);
    const [description, setDescription] = useState(
        accountBook.description ?? ""
    );
    const [selectedCategoryName, setSelectedCategoryName] = useState(
        accountBook.category
    );
    const [newCategoryName, setNewCategoryName] = useState("");

    const [expenseGoalAmount, setExpenseGoalAmount] = useState(
        accountBook.expenseGoalAmount
            ? String(accountBook.expenseGoalAmount)
            : ""
    );

    const [isSubmitting, setIsSubmitting] = useState(false);
    const isSubmittingRef = useRef(false);

    const goalAmountDigits = onlyDigits(expenseGoalAmount);
    const hasGoalAmountInput = goalAmountDigits.length > 0;
    const parsedGoalAmount = hasGoalAmountInput ? Number(goalAmountDigits) : null;

    const hasValidGoalAmount =
        !hasGoalAmountInput ||
        (parsedGoalAmount !== null && parsedGoalAmount > 0);

    const shouldDeleteMonthlyGoal =
        !hasGoalAmountInput && accountBook.expenseGoalAmount != null;


    const isDirectInput = selectedCategoryName === DIRECT_INPUT_VALUE;

    const accountBookCategory = accountBook.category;

    const mergedCategoryOptions =
        accountBookCategory && !categoryOptions.includes(accountBookCategory)
            ? [accountBookCategory, ...categoryOptions]
            : categoryOptions;

    const canSubmit =
        !!name.trim() &&
        hasValidGoalAmount &&
        (isDirectInput
            ? !!newCategoryName.trim()
            : !!selectedCategoryName.trim());

    const isSubmitDisabled = !canSubmit || isSubmitting;

    const handleSubmit = async (event: SyntheticEvent) => {
        event.preventDefault();

        if (!canSubmit || isSubmittingRef.current) {
            return;
        }

        isSubmittingRef.current = true;
        setIsSubmitting(true);

        try {
            const category = isDirectInput
                ? newCategoryName.trim()
                : selectedCategoryName.trim();

            await onSubmit(accountBook.id, {
                name: name.trim(),
                description: description.trim() || undefined,
                category,
                expenseGoalAmount: parsedGoalAmount,
                shouldDeleteMonthlyGoal,
            });
        } catch (error) {
            console.error(error);
        } finally {
            isSubmittingRef.current = false;
            setIsSubmitting(false);
        }
    };

    return (
        <div className="fixed inset-0 z-9999 flex items-start justify-center overflow-y-auto bg-black/40 px-4 py-10 backdrop-blur-sm">
            <div className="w-full max-w-xl rounded-3xl border border-white/70 bg-white p-6 shadow-2xl dark:border-white/10 dark:bg-slate-950">
                <div className="mb-5 flex items-start justify-between gap-4">
                    <div>
                        <p className="text-xs font-black uppercase tracking-[0.3em] text-orange-400">
                            {t("eyebrow")}
                        </p>
                        <h2 className="mt-2 text-2xl font-black text-slate-900 dark:text-white">
                            {t("title")}
                        </h2>
                        <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
                            {t("description")}
                        </p>
                    </div>

                    <button
                        type="button"
                        onClick={onClose}
                        disabled={isSubmitting}
                        className="rounded-2xl p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 disabled:cursor-not-allowed disabled:opacity-50 dark:hover:bg-white/10 dark:hover:text-white"
                        aria-label={t("actions.close")}
                    >
                        <X className="h-5 w-5" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <AccountBookBasicFields
                        translationKey="AccountBook.editModal"
                        name={name}
                        description={description}
                        categoryOptions={mergedCategoryOptions}
                        categorySelectValue={selectedCategoryName}
                        isDirectInput={isDirectInput}
                        newCategoryName={newCategoryName}
                        onChangeName={setName}
                        onChangeDescription={setDescription}
                        onChangeCategorySelectValue={setSelectedCategoryName}
                        onChangeNewCategoryName={setNewCategoryName}
                    />

                    <label className="block">
                        <span className="mb-2 block text-sm font-bold text-slate-700 dark:text-slate-200">
                            {t("fields.goalAmount")}
                        </span>

                        <div className="flex overflow-hidden rounded-xl border border-slate-300 bg-slate-50 focus-within:border-orange-400 focus-within:bg-white focus-within:ring-2 focus-within:ring-orange-200 dark:border-white/10 dark:bg-black/30 dark:focus-within:bg-black/40 dark:focus-within:ring-orange-500/20">
                            <span className="inline-flex items-center border-r border-slate-200 px-4 text-sm font-bold text-slate-500 dark:border-white/10 dark:text-slate-300">
                                {accountBook.currencySymbol ?? accountBook.currencyCode}
                            </span>

                            <input
                                value={formatNumberWithComma(expenseGoalAmount)}
                                onChange={(event) =>
                                    setExpenseGoalAmount(onlyDigits(event.target.value))
                                }
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
                            onClick={onClose}
                            disabled={isSubmitting}
                            className="rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm font-semibold text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-white/10 dark:bg-white/5 dark:text-slate-300 dark:hover:bg-white/10"
                        >
                            {t("actions.cancel")}
                        </button>

                        <button
                            type="submit"
                            disabled={isSubmitDisabled || isMonthlyGoalLoading}
                            aria-busy={isSubmitting}
                            className="rounded-xl bg-orange-500 px-5 py-3 text-sm font-semibold text-white shadow-[0_10px_20px_rgba(249,115,22,0.28)] transition hover:bg-orange-600 disabled:cursor-not-allowed disabled:bg-slate-300 disabled:shadow-none dark:disabled:bg-slate-700"
                        >
                            {isSubmitting ? t("actions.submitting") : t("actions.submit")}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}