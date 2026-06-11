import { SyntheticEvent, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { useTranslations } from "next-intl";
import {
    AccountBookCategory,
    AccountBookFixedCost,
    AccountBookFixedCostRequest,
    AccountBookStoreSuggestion,
    CurrencyCode,
} from "@/types/accountBook";
import { formatAmount } from "@/utils/account-book/formatAmount";

type FixedCostFormModalProps = {
    isOpen: boolean;
    fixedCost?: AccountBookFixedCost | null;
    currencyCode: CurrencyCode;
    categoryOptions: AccountBookCategory[];
    storeOptions: AccountBookStoreSuggestion[];
    onClose: () => void;
    onSubmit: (values: AccountBookFixedCostRequest) => void | Promise<void>;
};

const DIRECT_INPUT_VALUE = "__DIRECT_INPUT__";
const STORE_NONE_VALUE = "__NONE__";

function getCurrentYearMonth() {
    const now = new Date();

    return {
        year: String(now.getFullYear()),
        month: String(now.getMonth() + 1),
    };
}

function isValidYearMonth(year: string, month: string) {
    return (
        Number(year) >= 2000 &&
        Number(year) <= 9999 &&
        Number(month) >= 1 &&
        Number(month) <= 12
    );
}

function isEndMonthBeforeStartMonth(
    startYear: string,
    startMonth: string,
    endYear: string,
    endMonth: string
) {
    if (
        !isValidYearMonth(startYear, startMonth) ||
        !isValidYearMonth(endYear, endMonth)
    ) {
        return false;
    }

    const startValue = Number(startYear) * 100 + Number(startMonth);
    const endValue = Number(endYear) * 100 + Number(endMonth);

    return endValue < startValue;
}

function getInitialValues(
    fixedCost: AccountBookFixedCost | null | undefined,
    categoryOptions: AccountBookCategory[],
    storeOptions: AccountBookStoreSuggestion[]
) {
    const currentYearMonth = getCurrentYearMonth();

    if (!fixedCost) {
        return {
            title: "",
            storeName: STORE_NONE_VALUE,
            directStoreName: "",
            category: "",
            directCategory: "",
            amount: "",
            paymentDay: "1",
            startYear: currentYearMonth.year,
            startMonth: currentYearMonth.month,
            endYear: "",
            endMonth: "",
            memo: "",
        };
    }

    const hasStore =
        !!fixedCost.storeName &&
        storeOptions.some((store) => store.storeName === fixedCost.storeName);

    const hasCategory = categoryOptions.some(
        (category) => category.name === fixedCost.category
    );

    return {
        title: fixedCost.title,
        storeName: !fixedCost.storeName
            ? STORE_NONE_VALUE
            : hasStore
                ? fixedCost.storeName
                : DIRECT_INPUT_VALUE,
        directStoreName:
            fixedCost.storeName && !hasStore ? fixedCost.storeName : "",
        category: hasCategory ? fixedCost.category : DIRECT_INPUT_VALUE,
        directCategory: hasCategory ? "" : fixedCost.category,
        amount: String(fixedCost.amount),
        paymentDay: String(fixedCost.paymentDay),
        startYear: String(fixedCost.startYear),
        startMonth: String(fixedCost.startMonth),
        endYear: fixedCost.endYear ? String(fixedCost.endYear) : "",
        endMonth: fixedCost.endMonth ? String(fixedCost.endMonth) : "",
        memo: fixedCost.memo ?? "",
    };
}

export default function FixedCostFormModal(props: FixedCostFormModalProps) {
    const { isOpen, fixedCost } = props;

    if (!isOpen || typeof document === "undefined") {
        return null;
    }

    const formKey = fixedCost ? `edit-${fixedCost.id}` : "create";

    return createPortal(
        <FixedCostFormModalContent key={formKey} {...props} />,
        document.body
    );
}

function FixedCostFormModalContent({
   fixedCost,
   currencyCode,
   categoryOptions,
   storeOptions,
   onClose,
   onSubmit,
}: FixedCostFormModalProps) {
    const t = useTranslations("AccountBook.detail.fixedCost.modal");
    const isEditMode = !!fixedCost;

    const initialValues = getInitialValues(
        fixedCost,
        categoryOptions,
        storeOptions
    );

    const [title, setTitle] = useState(initialValues.title);
    const [storeName, setStoreName] = useState(initialValues.storeName);
    const [directStoreName, setDirectStoreName] = useState(
        initialValues.directStoreName
    );
    const [category, setCategory] = useState(initialValues.category);
    const [directCategory, setDirectCategory] = useState(
        initialValues.directCategory
    );
    const [amount, setAmount] = useState(initialValues.amount);
    const [paymentDay, setPaymentDay] = useState(initialValues.paymentDay);
    const [startYear, setStartYear] = useState(initialValues.startYear);
    const [startMonth, setStartMonth] = useState(initialValues.startMonth);
    const [endYear, setEndYear] = useState(initialValues.endYear);
    const [endMonth, setEndMonth] = useState(initialValues.endMonth);
    const [memo, setMemo] = useState(initialValues.memo);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const selectedCategory =
        category || categoryOptions[0]?.name || DIRECT_INPUT_VALUE;

    const isDirectStoreInput = storeName === DIRECT_INPUT_VALUE;
    const isDirectCategoryInput = selectedCategory === DIRECT_INPUT_VALUE;

    const finalStoreName = isDirectStoreInput
        ? directStoreName.trim()
        : storeName === STORE_NONE_VALUE
            ? ""
            : storeName.trim();

    const finalCategory = isDirectCategoryInput
        ? directCategory.trim()
        : selectedCategory.trim();

    const hasEndMonth =
        endYear.trim().length > 0 || endMonth.trim().length > 0;

    const isValidEndMonth =
        !hasEndMonth || isValidYearMonth(endYear, endMonth);

    const isEndBeforeStart =
        hasEndMonth &&
        isEndMonthBeforeStartMonth(
            startYear,
            startMonth,
            endYear,
            endMonth
        );

    const canSubmit = useMemo(() => {
        return (
            title.trim().length > 0 &&
            finalCategory.length > 0 &&
            Number(amount) > 0 &&
            Number(paymentDay) >= 1 &&
            Number(paymentDay) <= 31 &&
            isValidYearMonth(startYear, startMonth) &&
            isValidEndMonth &&
            !isEndBeforeStart &&
            !isSubmitting
        );
    }, [
        title,
        finalCategory,
        amount,
        paymentDay,
        startYear,
        startMonth,
        isValidEndMonth,
        isEndBeforeStart,
        isSubmitting,
    ]);

    const handleSubmit = async (event: SyntheticEvent<HTMLFormElement>) => {
        event.preventDefault();

        if (!canSubmit) {
            return;
        }

        try {
            setIsSubmitting(true);

            await onSubmit({
                title: title.trim(),
                storeName: finalStoreName || null,
                category: finalCategory,
                amount: Number(amount),
                paymentDay: Number(paymentDay),
                startYear: Number(startYear),
                startMonth: Number(startMonth),
                endYear: hasEndMonth ? Number(endYear) : null,
                endMonth: hasEndMonth ? Number(endMonth) : null,
                memo: memo.trim() || null,
            });

            onClose();
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="fixed inset-0 z-9999 overflow-y-auto px-4 py-16 sm:py-20">
            <button
                type="button"
                aria-label={t("actions.close")}
                onClick={onClose}
                className="fixed inset-0 bg-black/50 backdrop-blur-sm"
            />

            <div className="relative z-10 mx-auto w-full max-w-2xl rounded-2xl border border-slate-200 bg-white/95 p-6 shadow-[0_20px_60px_rgba(15,23,42,0.25)] backdrop-blur-md dark:border-white/10 dark:bg-zinc-900/95">
                <div className="mb-6 flex items-start justify-between gap-4">
                    <div>
                        <p className="mb-1 text-sm font-medium text-orange-500">
                            Fixed Cost
                        </p>

                        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                            {isEditMode ? t("editTitle") : t("title")}
                        </h2>

                        <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
                            {isEditMode
                                ? t("editDescription")
                                : t("description")}
                        </p>
                    </div>

                    <button
                        type="button"
                        onClick={onClose}
                        className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-white/10 dark:hover:text-white"
                    >
                        <X size={20} />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="space-y-5">
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                        <div>
                            <label className="mb-2 block text-sm font-semibold text-slate-700 dark:text-slate-200">
                                {t("fields.title")}{" "}
                                <span className="text-orange-500">*</span>
                            </label>

                            <input
                                value={title}
                                onChange={(event) =>
                                    setTitle(event.target.value)
                                }
                                placeholder={t("placeholders.title")}
                                className="w-full rounded-xl border border-slate-300 bg-slate-50 px-4 py-3 text-sm text-gray-800 outline-none transition placeholder:text-slate-400 focus:border-orange-400 focus:bg-white focus:ring-2 focus:ring-orange-200 dark:border-white/10 dark:bg-black/30 dark:text-white dark:placeholder:text-gray-500 dark:focus:bg-black/40 dark:focus:ring-orange-500/20"
                            />
                        </div>

                        <div>
                            <label className="mb-2 block text-sm font-semibold text-slate-700 dark:text-slate-200">
                                {t("fields.storeName")}
                            </label>

                            <select
                                value={storeName}
                                onChange={(event) =>
                                    setStoreName(event.target.value)
                                }
                                className="w-full rounded-xl border border-slate-300 bg-slate-50 px-4 py-3 text-sm text-gray-800 outline-none transition focus:border-orange-400 focus:bg-white focus:ring-2 focus:ring-orange-200 dark:border-white/10 dark:bg-black/30 dark:text-white dark:focus:bg-black/40 dark:focus:ring-orange-500/20 [&>option]:bg-white [&>option]:text-gray-800 dark:[&>option]:bg-zinc-900 dark:[&>option]:text-white"
                            >
                                <option value={STORE_NONE_VALUE}>
                                    {t("options.none")}
                                </option>

                                {storeOptions.map((store) => (
                                    <option
                                        key={store.storeName}
                                        value={store.storeName}
                                    >
                                        {store.storeName}
                                    </option>
                                ))}

                                <option value={DIRECT_INPUT_VALUE}>
                                    {t("options.directInput")}
                                </option>
                            </select>

                            {isDirectStoreInput && (
                                <input
                                    value={directStoreName}
                                    onChange={(event) =>
                                        setDirectStoreName(event.target.value)
                                    }
                                    placeholder={t("placeholders.storeName")}
                                    className="mt-3 w-full rounded-xl border border-slate-300 bg-slate-50 px-4 py-3 text-sm text-gray-800 outline-none transition placeholder:text-slate-400 focus:border-orange-400 focus:bg-white focus:ring-2 focus:ring-orange-200 dark:border-white/10 dark:bg-black/30 dark:text-white dark:placeholder:text-gray-500 dark:focus:bg-black/40 dark:focus:ring-orange-500/20"
                                />
                            )}
                        </div>
                    </div>

                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                        <div>
                            <label className="mb-2 block text-sm font-semibold text-slate-700 dark:text-slate-200">
                                {t("fields.category")}{" "}
                                <span className="text-orange-500">*</span>
                            </label>

                            <select
                                value={selectedCategory}
                                onChange={(event) =>
                                    setCategory(event.target.value)
                                }
                                className="w-full rounded-xl border border-slate-300 bg-slate-50 px-4 py-3 text-sm text-gray-800 outline-none transition focus:border-orange-400 focus:bg-white focus:ring-2 focus:ring-orange-200 dark:border-white/10 dark:bg-black/30 dark:text-white dark:focus:bg-black/40 dark:focus:ring-orange-500/20 [&>option]:bg-white [&>option]:text-gray-800 dark:[&>option]:bg-zinc-900 dark:[&>option]:text-white"
                            >
                                {categoryOptions.map((category) => (
                                    <option
                                        key={category.id}
                                        value={category.name}
                                    >
                                        {category.name}
                                    </option>
                                ))}

                                <option value={DIRECT_INPUT_VALUE}>
                                    {t("options.directInput")}
                                </option>
                            </select>

                            {isDirectCategoryInput && (
                                <input
                                    value={directCategory}
                                    onChange={(event) =>
                                        setDirectCategory(event.target.value)
                                    }
                                    placeholder={t("placeholders.category")}
                                    className="mt-3 w-full rounded-xl border border-slate-300 bg-slate-50 px-4 py-3 text-sm text-gray-800 outline-none transition placeholder:text-slate-400 focus:border-orange-400 focus:bg-white focus:ring-2 focus:ring-orange-200 dark:border-white/10 dark:bg-black/30 dark:text-white dark:placeholder:text-gray-500 dark:focus:bg-black/40 dark:focus:ring-orange-500/20"
                                />
                            )}
                        </div>

                        <div>
                            <label className="mb-2 block text-sm font-semibold text-slate-700 dark:text-slate-200">
                                {t("fields.amount")}{" "}
                                <span className="text-orange-500">*</span>
                            </label>

                            <input
                                value={amount}
                                onChange={(event) =>
                                    setAmount(event.target.value)
                                }
                                type="number"
                                min="0"
                                inputMode="numeric"
                                placeholder="0"
                                className="w-full rounded-xl border border-slate-300 bg-slate-50 px-4 py-3 text-sm text-gray-800 outline-none transition placeholder:text-slate-400 focus:border-orange-400 focus:bg-white focus:ring-2 focus:ring-orange-200 dark:border-white/10 dark:bg-black/30 dark:text-white dark:placeholder:text-gray-500 dark:focus:bg-black/40 dark:focus:ring-orange-500/20"
                            />

                            {Number(amount) > 0 && (
                                <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
                                    {t("displayAmount")}{" "}
                                    {formatAmount(Number(amount), currencyCode)}
                                </p>
                            )}
                        </div>
                    </div>

                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                        <div>
                            <label className="mb-2 block text-sm font-semibold text-slate-700 dark:text-slate-200">
                                {t("fields.paymentDay")}{" "}
                                <span className="text-orange-500">*</span>
                            </label>

                            <input
                                value={paymentDay}
                                onChange={(event) =>
                                    setPaymentDay(event.target.value)
                                }
                                type="number"
                                min="1"
                                max="31"
                                inputMode="numeric"
                                placeholder="25"
                                className="w-full rounded-xl border border-slate-300 bg-slate-50 px-4 py-3 text-sm text-gray-800 outline-none transition placeholder:text-slate-400 focus:border-orange-400 focus:bg-white focus:ring-2 focus:ring-orange-200 dark:border-white/10 dark:bg-black/30 dark:text-white dark:placeholder:text-gray-500 dark:focus:bg-black/40 dark:focus:ring-orange-500/20"
                            />
                        </div>

                        <div>
                            <label className="mb-2 block text-sm font-semibold text-slate-700 dark:text-slate-200">
                                {t("fields.startYear")}{" "}
                                <span className="text-orange-500">*</span>
                            </label>

                            <input
                                value={startYear}
                                onChange={(event) =>
                                    setStartYear(event.target.value)
                                }
                                type="number"
                                min="2000"
                                max="9999"
                                inputMode="numeric"
                                placeholder="2026"
                                className="w-full rounded-xl border border-slate-300 bg-slate-50 px-4 py-3 text-sm text-gray-800 outline-none transition placeholder:text-slate-400 focus:border-orange-400 focus:bg-white focus:ring-2 focus:ring-orange-200 dark:border-white/10 dark:bg-black/30 dark:text-white dark:placeholder:text-gray-500 dark:focus:bg-black/40 dark:focus:ring-orange-500/20"
                            />
                        </div>

                        <div>
                            <label className="mb-2 block text-sm font-semibold text-slate-700 dark:text-slate-200">
                                {t("fields.startMonth")}{" "}
                                <span className="text-orange-500">*</span>
                            </label>

                            <input
                                value={startMonth}
                                onChange={(event) =>
                                    setStartMonth(event.target.value)
                                }
                                type="number"
                                min="1"
                                max="12"
                                inputMode="numeric"
                                placeholder="6"
                                className="w-full rounded-xl border border-slate-300 bg-slate-50 px-4 py-3 text-sm text-gray-800 outline-none transition placeholder:text-slate-400 focus:border-orange-400 focus:bg-white focus:ring-2 focus:ring-orange-200 dark:border-white/10 dark:bg-black/30 dark:text-white dark:placeholder:text-gray-500 dark:focus:bg-black/40 dark:focus:ring-orange-500/20"
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                        <div>
                            <label className="mb-2 block text-sm font-semibold text-slate-700 dark:text-slate-200">
                                {t("fields.endYear")}
                            </label>

                            <input
                                value={endYear}
                                onChange={(event) =>
                                    setEndYear(event.target.value)
                                }
                                type="number"
                                min="2000"
                                max="9999"
                                inputMode="numeric"
                                placeholder={t("placeholders.optional")}
                                className="w-full rounded-xl border border-slate-300 bg-slate-50 px-4 py-3 text-sm text-gray-800 outline-none transition placeholder:text-slate-400 focus:border-orange-400 focus:bg-white focus:ring-2 focus:ring-orange-200 dark:border-white/10 dark:bg-black/30 dark:text-white dark:placeholder:text-gray-500 dark:focus:bg-black/40 dark:focus:ring-orange-500/20"
                            />
                        </div>

                        <div>
                            <label className="mb-2 block text-sm font-semibold text-slate-700 dark:text-slate-200">
                                {t("fields.endMonth")}
                            </label>

                            <input
                                value={endMonth}
                                onChange={(event) =>
                                    setEndMonth(event.target.value)
                                }
                                type="number"
                                min="1"
                                max="12"
                                inputMode="numeric"
                                placeholder={t("placeholders.optional")}
                                className="w-full rounded-xl border border-slate-300 bg-slate-50 px-4 py-3 text-sm text-gray-800 outline-none transition placeholder:text-slate-400 focus:border-orange-400 focus:bg-white focus:ring-2 focus:ring-orange-200 dark:border-white/10 dark:bg-black/30 dark:text-white dark:placeholder:text-gray-500 dark:focus:bg-black/40 dark:focus:ring-orange-500/20"
                            />
                        </div>
                    </div>

                    <p className="text-xs text-slate-500 dark:text-slate-400">
                        {t("helps.endMonth")}
                    </p>

                    {isEndBeforeStart && (
                        <p className="text-xs font-semibold text-red-500 dark:text-red-400">
                            {t("validation.endBeforeStart")}
                        </p>
                    )}

                    <div>
                        <label className="mb-2 block text-sm font-semibold text-slate-700 dark:text-slate-200">
                            {t("fields.memo")}
                        </label>

                        <textarea
                            value={memo}
                            onChange={(event) => setMemo(event.target.value)}
                            placeholder={t("placeholders.memo")}
                            rows={3}
                            className="w-full resize-none rounded-xl border border-slate-300 bg-slate-50 px-4 py-3 text-sm text-gray-800 outline-none transition placeholder:text-slate-400 focus:border-orange-400 focus:bg-white focus:ring-2 focus:ring-orange-200 dark:border-white/10 dark:bg-black/30 dark:text-white dark:placeholder:text-gray-500 dark:focus:bg-black/40 dark:focus:ring-orange-500/20"
                        />
                    </div>

                    <div className="flex justify-end gap-3 pt-2">
                        <button
                            type="button"
                            onClick={onClose}
                            className="rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm font-semibold text-slate-600 transition hover:bg-slate-50 dark:border-white/10 dark:bg-white/5 dark:text-slate-300 dark:hover:bg-white/10"
                        >
                            {t("actions.cancel")}
                        </button>

                        <button
                            type="submit"
                            disabled={!canSubmit}
                            className="rounded-xl bg-orange-500 px-5 py-3 text-sm font-semibold text-white shadow-[0_10px_20px_rgba(249,115,22,0.28)] transition hover:bg-orange-600 disabled:cursor-not-allowed disabled:bg-slate-300 disabled:shadow-none dark:disabled:bg-slate-700"
                        >
                            {isSubmitting
                                ? isEditMode
                                    ? t("actions.updating")
                                    : t("actions.submitting")
                                : isEditMode
                                    ? t("actions.update")
                                    : t("actions.submit")}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}