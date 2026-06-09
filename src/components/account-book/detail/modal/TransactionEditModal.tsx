import { SyntheticEvent, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import {
    AccountBookTransaction,
    CreateTransactionFormValues,
    CurrencyCode,
    TransactionType,
} from "@/types/accountBook";
import { formatAmount } from "@/utils/account-book/formatAmount";

type TransactionEditModalProps = {
    isOpen: boolean;
    transaction: AccountBookTransaction | null;
    currencyCode: CurrencyCode;
    onClose: () => void;
    onSubmit: (
        transactionId: number,
        values: CreateTransactionFormValues
    ) => void;
};

type TransactionEditFormProps = {
    transaction: AccountBookTransaction;
    currencyCode: CurrencyCode;
    onClose: () => void;
    onSubmit: (
        transactionId: number,
        values: CreateTransactionFormValues
    ) => void;
};

const transactionCategories = [
    "식비",
    "교통비",
    "주거",
    "통신비",
    "쇼핑",
    "월급",
    "기타",
];

const transactionStores = [
    "세븐일레븐",
    "GS25",
    "CU",
    "미니스톱",
    "이마트",
    "롯데마트",
    "홈플러스",
    "편의점",
];

const DIRECT_INPUT_VALUE = "__DIRECT_INPUT__";

function getInitialStoreValue(transaction: AccountBookTransaction) {
    if (!transaction.storeName) {
        return "";
    }

    if (transactionStores.includes(transaction.storeName)) {
        return transaction.storeName;
    }

    return DIRECT_INPUT_VALUE;
}

function getInitialDirectStoreName(transaction: AccountBookTransaction) {
    if (!transaction.storeName) {
        return "";
    }

    if (transactionStores.includes(transaction.storeName)) {
        return "";
    }

    return transaction.storeName;
}

function getInitialCategoryValue(transaction: AccountBookTransaction) {
    if (transactionCategories.includes(transaction.category)) {
        return transaction.category;
    }

    return DIRECT_INPUT_VALUE;
}

function getInitialDirectCategory(transaction: AccountBookTransaction) {
    if (transactionCategories.includes(transaction.category)) {
        return "";
    }

    return transaction.category;
}

function TransactionEditForm({
    transaction,
    currencyCode,
    onClose,
    onSubmit,
}: TransactionEditFormProps) {
    const [type, setType] = useState<TransactionType>(transaction.type);
    const [title, setTitle] = useState(transaction.title);
    const [storeName, setStoreName] = useState(() =>
        getInitialStoreValue(transaction)
    );
    const [directStoreName, setDirectStoreName] = useState(() =>
        getInitialDirectStoreName(transaction)
    );
    const [categoryName, setCategoryName] = useState(() =>
        getInitialCategoryValue(transaction)
    );
    const [directCategoryName, setDirectCategoryName] = useState(() =>
        getInitialDirectCategory(transaction)
    );
    const [amount, setAmount] = useState(String(transaction.amount));
    const [transactionDate, setTransactionDate] = useState(
        transaction.transactionDate
    );
    const [memo, setMemo] = useState(transaction.memo ?? "");

    const isDirectStoreInput = storeName === DIRECT_INPUT_VALUE;
    const isDirectCategoryInput = categoryName === DIRECT_INPUT_VALUE;

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

    const handleSubmit = (event: SyntheticEvent<HTMLFormElement>) => {
        event.preventDefault();

        if (!canSubmit) {
            return;
        }

        const finalStoreName = isDirectStoreInput
            ? directStoreName.trim()
            : storeName.trim();

        const finalCategoryName = isDirectCategoryInput
            ? directCategoryName.trim()
            : categoryName.trim();

        onSubmit(transaction.id, {
            type,
            title: title.trim(),
            storeName: finalStoreName || undefined,
            categoryName: finalCategoryName,
            amount: Number(amount),
            transactionDate,
            memo: memo.trim() || undefined,
        });
    };

    return (
        <div className="relative z-10 mx-auto w-full max-w-2xl rounded-2xl border border-slate-200 bg-white/95 p-6 shadow-[0_20px_60px_rgba(15,23,42,0.25)] backdrop-blur-md dark:border-white/10 dark:bg-zinc-900/95">
            <div className="mb-6 flex items-start justify-between gap-4">
                <div>
                    <p className="mb-1 text-sm font-medium text-orange-500">
                        Edit Transaction
                    </p>
                    <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                        거래 수정
                    </h2>
                    <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
                        기존 거래 정보를 수정합니다.
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
                <div>
                    <label className="mb-2 block text-sm font-semibold text-slate-700 dark:text-slate-200">
                        거래 유형 <span className="text-orange-500">*</span>
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
                            지출
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
                            수입
                        </button>
                    </div>
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div>
                        <label className="mb-2 block text-sm font-semibold text-slate-700 dark:text-slate-200">
                            거래명 <span className="text-orange-500">*</span>
                        </label>
                        <input
                            value={title}
                            onChange={(event) => setTitle(event.target.value)}
                            placeholder="예: 편의점"
                            className="w-full rounded-xl border border-slate-300 bg-slate-50 px-4 py-3 text-sm text-gray-800 outline-none transition placeholder:text-slate-400 focus:border-orange-400 focus:bg-white focus:ring-2 focus:ring-orange-200 dark:border-white/10 dark:bg-black/30 dark:text-white dark:placeholder:text-gray-500 dark:focus:bg-black/40 dark:focus:ring-orange-500/20"
                        />
                    </div>

                    <div>
                        <label className="mb-2 block text-sm font-semibold text-slate-700 dark:text-slate-200">
                            점포명
                        </label>
                        <select
                            value={storeName}
                            onChange={(event) => setStoreName(event.target.value)}
                            className="
                            w-full rounded-xl border border-slate-300 bg-slate-50 px-4 py-3 text-sm text-gray-800
                            outline-none transition
                            focus:border-orange-400 focus:bg-white focus:ring-2 focus:ring-orange-200
                            dark:border-white/10 dark:bg-black/30 dark:text-white
                            dark:focus:bg-black/40 dark:focus:ring-orange-500/20
                            dark:scheme-dark
                            [&>option]:bg-white [&>option]:text-gray-800
                            dark:[&>option]:bg-zinc-900 dark:[&>option]:text-white
                        "
                        >
                            <option value="">미설정</option>
                            {transactionStores.map((store) => (
                                <option key={store} value={store}>
                                    {store}
                                </option>
                            ))}
                            <option value={DIRECT_INPUT_VALUE}>직접 입력</option>
                        </select>

                        {isDirectStoreInput && (
                            <input
                                value={directStoreName}
                                onChange={(event) => setDirectStoreName(event.target.value)}
                                placeholder="새 점포명 입력"
                                className="mt-3 w-full rounded-xl border border-slate-300 bg-slate-50 px-4 py-3 text-sm text-gray-800 outline-none transition placeholder:text-slate-400 focus:border-orange-400 focus:bg-white focus:ring-2 focus:ring-orange-200 dark:border-white/10 dark:bg-black/30 dark:text-white dark:placeholder:text-gray-500 dark:focus:bg-black/40 dark:focus:ring-orange-500/20"
                            />
                        )}
                    </div>
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div>
                        <label className="mb-2 block text-sm font-semibold text-slate-700 dark:text-slate-200">
                            카테고리 <span className="text-orange-500">*</span>
                        </label>
                        <select
                            value={categoryName}
                            onChange={(event) => setCategoryName(event.target.value)}
                            className="
                            w-full rounded-xl border border-slate-300 bg-slate-50 px-4 py-3 text-sm text-gray-800
                            outline-none transition
                            focus:border-orange-400 focus:bg-white focus:ring-2 focus:ring-orange-200
                            dark:border-white/10 dark:bg-black/30 dark:text-white
                            dark:focus:bg-black/40 dark:focus:ring-orange-500/20
                            dark:scheme-dark
                            [&>option]:bg-white [&>option]:text-gray-800
                            dark:[&>option]:bg-zinc-900 dark:[&>option]:text-white
                        "
                        >
                            {transactionCategories.map((category) => (
                                <option key={category} value={category}>
                                    {category}
                                </option>
                            ))}
                            <option value={DIRECT_INPUT_VALUE}>직접 입력</option>
                        </select>

                        {isDirectCategoryInput && (
                            <input
                                value={directCategoryName}
                                onChange={(event) => setDirectCategoryName(event.target.value)}
                                placeholder="새 카테고리명 입력"
                                className="mt-3 w-full rounded-xl border border-slate-300 bg-slate-50 px-4 py-3 text-sm text-gray-800 outline-none transition placeholder:text-slate-400 focus:border-orange-400 focus:bg-white focus:ring-2 focus:ring-orange-200 dark:border-white/10 dark:bg-black/30 dark:text-white dark:placeholder:text-gray-500 dark:focus:bg-black/40 dark:focus:ring-orange-500/20"
                            />
                        )}
                    </div>

                    <div>
                        <label className="mb-2 block text-sm font-semibold text-slate-700 dark:text-slate-200">
                            금액 <span className="text-orange-500">*</span>
                        </label>
                        <input
                            value={amount}
                            onChange={(event) => setAmount(event.target.value)}
                            type="number"
                            min="0"
                            inputMode="numeric"
                            placeholder="0"
                            className="w-full rounded-xl border border-slate-300 bg-slate-50 px-4 py-3 text-sm text-gray-800 outline-none transition placeholder:text-slate-400 focus:border-orange-400 focus:bg-white focus:ring-2 focus:ring-orange-200 dark:border-white/10 dark:bg-black/30 dark:text-white dark:placeholder:text-gray-500 dark:focus:bg-black/40 dark:focus:ring-orange-500/20"
                        />

                        {Number(amount) > 0 && (
                            <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
                                표시 금액: {formatAmount(Number(amount), currencyCode)}
                            </p>
                        )}
                    </div>
                </div>

                <div>
                    <label className="mb-2 block text-sm font-semibold text-slate-700 dark:text-slate-200">
                        거래일 <span className="text-orange-500">*</span>
                    </label>
                    <input
                        value={transactionDate}
                        onChange={(event) => setTransactionDate(event.target.value)}
                        type="date"
                        className="w-full rounded-xl border border-slate-300 bg-slate-50 px-4 py-3 text-sm text-gray-800 outline-none transition focus:border-orange-400 focus:bg-white focus:ring-2 focus:ring-orange-200 dark:border-white/10 dark:bg-black/30 dark:text-white dark:focus:bg-black/40 dark:focus:ring-orange-500/20"
                    />
                </div>

                <div>
                    <label className="mb-2 block text-sm font-semibold text-slate-700 dark:text-slate-200">
                        메모
                    </label>
                    <textarea
                        value={memo}
                        onChange={(event) => setMemo(event.target.value)}
                        placeholder="예: 점심 도시락"
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
                        취소
                    </button>

                    <button
                        type="submit"
                        disabled={!canSubmit}
                        className="rounded-xl bg-orange-500 px-5 py-3 text-sm font-semibold text-white shadow-[0_10px_20px_rgba(249,115,22,0.28)] transition hover:bg-orange-600 disabled:cursor-not-allowed disabled:bg-slate-300 disabled:shadow-none dark:disabled:bg-slate-700"
                    >
                        저장
                    </button>
                </div>
            </form>
        </div>
    );
}

export default function TransactionEditModal({
    isOpen,
    transaction,
    currencyCode,
    onClose,
    onSubmit,
}: TransactionEditModalProps) {
    if (!isOpen || !transaction || typeof document === "undefined") {
        return null;
    }

    return createPortal(
        <div className="fixed inset-0 z-9999 overflow-y-auto px-4 py-16 sm:py-20">
            <button
                type="button"
                aria-label="모달 닫기"
                onClick={onClose}
                className="fixed inset-0 bg-black/50 backdrop-blur-sm"
            />

            <TransactionEditForm
                key={transaction.id}
                transaction={transaction}
                currencyCode={currencyCode}
                onClose={onClose}
                onSubmit={onSubmit}
            />
        </div>,
        document.body
    );
}