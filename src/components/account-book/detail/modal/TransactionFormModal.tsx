import { SyntheticEvent, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { ImagePlus, Sparkles, X } from "lucide-react";
import { useTranslations } from "next-intl";
import {
    AccountBookCategory,
    AccountBookStoreSuggestion,
    AccountBookTransaction,
    CreateTransactionFormValues,
    CurrencyCode,
    TransactionType,
} from "@/types/accountBook";
import { formatAmount } from "@/utils/account-book/formatAmount";

type TransactionFormMode = "CREATE" | "EDIT";
type InputMode = "MANUAL" | "RECEIPT";

type TransactionFormModalProps = {
    isOpen: boolean;
    mode: TransactionFormMode;
    transaction?: AccountBookTransaction | null;
    currencyCode: CurrencyCode;
    categoryOptions: AccountBookCategory[];
    storeOptions: AccountBookStoreSuggestion[];
    onClose: () => void;
    onSubmit: (
        values: CreateTransactionFormValues,
        transactionId?: number
    ) => void | Promise<void>;
};

const DIRECT_INPUT_VALUE = "__DIRECT_INPUT__";

const inputClassName =
    "w-full rounded-xl border border-slate-300 bg-slate-50 px-4 py-3 text-sm text-gray-800 outline-none transition placeholder:text-slate-400 focus:border-orange-400 focus:bg-white focus:ring-2 focus:ring-orange-200 dark:border-white/10 dark:bg-black/30 dark:text-white dark:placeholder:text-gray-500 dark:focus:bg-black/40 dark:focus:ring-orange-500/20";

const selectClassName =
    "w-full rounded-xl border border-slate-300 bg-slate-50 px-4 py-3 text-sm text-gray-800 outline-none transition focus:border-orange-400 focus:bg-white focus:ring-2 focus:ring-orange-200 dark:border-white/10 dark:bg-black/30 dark:text-white dark:focus:bg-black/40 dark:focus:ring-orange-500/20 dark:scheme-dark [&>option]:bg-white [&>option]:text-gray-800 dark:[&>option]:bg-zinc-900 dark:[&>option]:text-white";

function getTodayText() {
    return new Date().toISOString().slice(0, 10);
}

function toCategoryNames(categoryOptions: AccountBookCategory[]) {
    return categoryOptions
        .map((category) => category.name)
        .filter((name) => name.trim().length > 0);
}

function toStoreNames(storeOptions: AccountBookStoreSuggestion[]) {
    return storeOptions
        .map((store) => store.storeName)
        .filter((name) => name.trim().length > 0);
}

function getInitialCategoryValue(
    mode: TransactionFormMode,
    transaction: AccountBookTransaction | null | undefined,
    categoryNames: string[]
) {
    if (mode === "EDIT" && transaction) {
        if (categoryNames.includes(transaction.category)) {
            return transaction.category;
        }

        return DIRECT_INPUT_VALUE;
    }

    return categoryNames[0] ?? DIRECT_INPUT_VALUE;
}

function getInitialDirectCategoryName(
    mode: TransactionFormMode,
    transaction: AccountBookTransaction | null | undefined,
    categoryNames: string[]
) {
    if (mode !== "EDIT" || !transaction) {
        return "";
    }

    if (categoryNames.includes(transaction.category)) {
        return "";
    }

    return transaction.category;
}

function getInitialStoreValue(
    transaction: AccountBookTransaction | null | undefined,
    storeNames: string[]
) {
    if (!transaction?.storeName) {
        return "";
    }

    if (storeNames.includes(transaction.storeName)) {
        return transaction.storeName;
    }

    return DIRECT_INPUT_VALUE;
}

function getInitialDirectStoreName(
    transaction: AccountBookTransaction | null | undefined,
    storeNames: string[]
) {
    if (!transaction?.storeName) {
        return "";
    }

    if (storeNames.includes(transaction.storeName)) {
        return "";
    }

    return transaction.storeName;
}

function getInitialTitle(
    mode: TransactionFormMode,
    transaction: AccountBookTransaction | null | undefined
) {
    return mode === "EDIT" && transaction ? transaction.title : "";
}

function getInitialType(
    mode: TransactionFormMode,
    transaction: AccountBookTransaction | null | undefined
): TransactionType {
    return mode === "EDIT" && transaction ? transaction.type : "EXPENSE";
}

function getInitialAmount(
    mode: TransactionFormMode,
    transaction: AccountBookTransaction | null | undefined
) {
    return mode === "EDIT" && transaction ? String(transaction.amount) : "";
}

function getInitialTransactionDate(
    mode: TransactionFormMode,
    transaction: AccountBookTransaction | null | undefined
) {
    return mode === "EDIT" && transaction
        ? transaction.transactionDate
        : getTodayText();
}

function getInitialMemo(
    mode: TransactionFormMode,
    transaction: AccountBookTransaction | null | undefined
) {
    return mode === "EDIT" && transaction ? transaction.memo ?? "" : "";
}

export default function TransactionFormModal({
    isOpen,
    mode,
    transaction,
    currencyCode,
    categoryOptions,
    storeOptions,
    onClose,
    onSubmit,
}: TransactionFormModalProps) {
    const t = useTranslations("AccountBook.detail.transactionModal");

    const categoryNames = useMemo(
        () => toCategoryNames(categoryOptions),
        [categoryOptions]
    );

    const storeNames = useMemo(
        () => toStoreNames(storeOptions),
        [storeOptions]
    );

    const [inputMode, setInputMode] = useState<InputMode>("MANUAL");
    const [type, setType] = useState<TransactionType>(() =>
        getInitialType(mode, transaction)
    );
    const [title, setTitle] = useState(() =>
        getInitialTitle(mode, transaction)
    );
    const [storeName, setStoreName] = useState(() =>
        getInitialStoreValue(transaction, storeNames)
    );
    const [directStoreName, setDirectStoreName] = useState(() =>
        getInitialDirectStoreName(transaction, storeNames)
    );
    const [categoryName, setCategoryName] = useState(() =>
        getInitialCategoryValue(mode, transaction, categoryNames)
    );
    const [directCategoryName, setDirectCategoryName] = useState(() =>
        getInitialDirectCategoryName(mode, transaction, categoryNames)
    );
    const [amount, setAmount] = useState(() =>
        getInitialAmount(mode, transaction)
    );
    const [transactionDate, setTransactionDate] = useState(() =>
        getInitialTransactionDate(mode, transaction)
    );
    const [memo, setMemo] = useState(() =>
        getInitialMemo(mode, transaction)
    );
    const [isSubmitting, setIsSubmitting] = useState(false);

    const isCreateMode = mode === "CREATE";
    const isEditMode = mode === "EDIT";

    const isDirectStoreInput = storeName === DIRECT_INPUT_VALUE;
    const isDirectCategoryInput = categoryName === DIRECT_INPUT_VALUE;

    const badge = isCreateMode ? t("badge.create") : t("badge.edit");
    const modalTitle = isCreateMode ? t("title.create") : t("title.edit");
    const description = isCreateMode
        ? t("description.create")
        : t("description.edit");
    const submitLabel = isCreateMode
        ? t("actions.create")
        : t("actions.save");

    const canSubmit = useMemo(() => {
        const finalCategoryName = isDirectCategoryInput
            ? directCategoryName.trim()
            : categoryName.trim();

        return (
            title.trim().length > 0 &&
            finalCategoryName.length > 0 &&
            Number(amount) > 0 &&
            transactionDate.trim().length > 0
        );
    }, [
        title,
        categoryName,
        directCategoryName,
        amount,
        transactionDate,
        isDirectCategoryInput,
    ]);

    if (!isOpen || typeof document === "undefined") {
        return null;
    }

    if (isEditMode && !transaction) {
        return null;
    }

    const handleSubmit = async (event: SyntheticEvent<HTMLFormElement>) => {
        event.preventDefault();

        if (!canSubmit || isSubmitting) {
            return;
        }

        const finalStoreName = isDirectStoreInput
            ? directStoreName.trim()
            : storeName.trim();

        const finalCategoryName = isDirectCategoryInput
            ? directCategoryName.trim()
            : categoryName.trim();

        try {
            setIsSubmitting(true);

            await onSubmit(
                {
                    type,
                    title: title.trim(),
                    storeName: finalStoreName || undefined,
                    categoryName: finalCategoryName,
                    amount: Number(amount),
                    transactionDate,
                    memo: memo.trim() || undefined,
                },
                transaction?.id
            );

            onClose();
        } finally {
            setIsSubmitting(false);
        }
    };

    return createPortal(
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
                            {badge}
                        </p>
                        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                            {modalTitle}
                        </h2>
                        <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
                            {description}
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

                {isCreateMode && (
                    <div className="mb-5 grid grid-cols-2 gap-2 rounded-2xl bg-slate-100 p-1 dark:bg-black/30">
                        <button
                            type="button"
                            onClick={() => setInputMode("MANUAL")}
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
                            onClick={() => setInputMode("RECEIPT")}
                            className={`rounded-xl px-4 py-3 text-sm font-semibold transition ${
                                inputMode === "RECEIPT"
                                    ? "bg-white text-orange-500 shadow-sm dark:bg-zinc-800"
                                    : "text-slate-500 hover:text-orange-500 dark:text-slate-400"
                            }`}
                        >
                            {t("inputMode.receipt")}
                        </button>
                    </div>
                )}

                {isCreateMode && inputMode === "RECEIPT" && (
                    <div className="mb-5 rounded-2xl border border-slate-200 bg-slate-50/90 p-4 dark:border-white/10 dark:bg-black/25">
                        <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-700 dark:text-slate-200">
                            <ImagePlus size={18} />
                            {t("receipt.title")}
                        </div>

                        <p className="rounded-xl bg-orange-50 px-3 py-2 text-xs text-orange-700 dark:bg-orange-500/10 dark:text-orange-300">
                            {t("receipt.description")}
                        </p>

                        <button
                            type="button"
                            disabled
                            className="mt-4 inline-flex w-full cursor-not-allowed items-center justify-center gap-2 rounded-xl bg-slate-300 px-4 py-3 text-sm font-semibold text-white shadow-none dark:bg-slate-700"
                        >
                            <Sparkles size={18} />
                            {t("receipt.action")}
                        </button>
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-5">
                    <div>
                        <label className="mb-2 block text-sm font-semibold text-slate-700 dark:text-slate-200">
                            {t("fields.type")}{" "}
                            <span className="text-orange-500">*</span>
                        </label>

                        <div className="grid grid-cols-2 gap-2">
                            <button
                                type="button"
                                onClick={() => setType("EXPENSE")}
                                className={`rounded-xl px-4 py-3 text-sm font-semibold transition ${
                                    type === "EXPENSE"
                                        ? "bg-red-500 text-white shadow-[0_10px_20px_rgba(239,68,68,0.25)]"
                                        : "border border-slate-200 bg-slate-50 text-slate-500 hover:border-red-300 hover:bg-red-50 dark:border-white/10 dark:bg-black/30 dark:text-slate-300"
                                }`}
                            >
                                {t("type.expense")}
                            </button>

                            <button
                                type="button"
                                onClick={() => setType("INCOME")}
                                className={`rounded-xl px-4 py-3 text-sm font-semibold transition ${
                                    type === "INCOME"
                                        ? "bg-blue-500 text-white shadow-[0_10px_20px_rgba(59,130,246,0.25)]"
                                        : "border border-slate-200 bg-slate-50 text-slate-500 hover:border-blue-300 hover:bg-blue-50 dark:border-white/10 dark:bg-black/30 dark:text-slate-300"
                                }`}
                            >
                                {t("type.income")}
                            </button>
                        </div>
                    </div>

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
                                className={inputClassName}
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
                                className={selectClassName}
                            >
                                <option value="">
                                    {t("options.storeNotSet")}
                                </option>

                                {storeNames.map((store) => (
                                    <option key={store} value={store}>
                                        {store}
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
                                    placeholder={t(
                                        "placeholders.directStoreName"
                                    )}
                                    className={`${inputClassName} mt-3`}
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
                                value={categoryName}
                                onChange={(event) =>
                                    setCategoryName(event.target.value)
                                }
                                className={selectClassName}
                            >
                                {categoryNames.map((category) => (
                                    <option key={category} value={category}>
                                        {category}
                                    </option>
                                ))}

                                <option value={DIRECT_INPUT_VALUE}>
                                    {t("options.directInput")}
                                </option>
                            </select>

                            {isDirectCategoryInput && (
                                <input
                                    value={directCategoryName}
                                    onChange={(event) =>
                                        setDirectCategoryName(
                                            event.target.value
                                        )
                                    }
                                    placeholder={t(
                                        "placeholders.directCategoryName"
                                    )}
                                    className={`${inputClassName} mt-3`}
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
                                className={inputClassName}
                            />

                            {Number(amount) > 0 && (
                                <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
                                    {t("fields.displayAmount", {
                                        amount: formatAmount(
                                            Number(amount),
                                            currencyCode
                                        ),
                                    })}
                                </p>
                            )}
                        </div>
                    </div>

                    <div>
                        <label className="mb-2 block text-sm font-semibold text-slate-700 dark:text-slate-200">
                            {t("fields.transactionDate")}{" "}
                            <span className="text-orange-500">*</span>
                        </label>
                        <input
                            value={transactionDate}
                            onChange={(event) =>
                                setTransactionDate(event.target.value)
                            }
                            type="date"
                            className={inputClassName}
                        />
                    </div>

                    <div>
                        <label className="mb-2 block text-sm font-semibold text-slate-700 dark:text-slate-200">
                            {t("fields.memo")}
                        </label>
                        <textarea
                            value={memo}
                            onChange={(event) => setMemo(event.target.value)}
                            placeholder={t("placeholders.memo")}
                            rows={3}
                            className={`${inputClassName} resize-none`}
                        />
                    </div>

                    <div className="flex justify-end gap-3 pt-2">
                        <button
                            type="button"
                            onClick={onClose}
                            disabled={isSubmitting}
                            className="rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm font-semibold text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-white/10 dark:bg-white/5 dark:text-slate-300 dark:hover:bg-white/10"
                        >
                            {t("actions.cancel")}
                        </button>

                        <button
                            type="submit"
                            disabled={!canSubmit || isSubmitting}
                            className="rounded-xl bg-orange-500 px-5 py-3 text-sm font-semibold text-white shadow-[0_10px_20px_rgba(249,115,22,0.28)] transition hover:bg-orange-600 disabled:cursor-not-allowed disabled:bg-slate-300 disabled:shadow-none dark:disabled:bg-slate-700"
                        >
                            {isSubmitting
                                ? t("actions.submitting")
                                : submitLabel}
                        </button>
                    </div>
                </form>
            </div>
        </div>,
        document.body
    );
}