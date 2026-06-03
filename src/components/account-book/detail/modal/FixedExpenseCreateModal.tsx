import { SyntheticEvent, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import {
    CreateFixedExpenseFormValues,
    CurrencyCode,
} from "@/types/accountBook";
import { formatAmount } from "@/utils/account-book/formatAmount";

type FixedExpenseCreateModalProps = {
    isOpen: boolean;
    currencyCode: CurrencyCode;
    onClose: () => void;
    onSubmit: (values: CreateFixedExpenseFormValues) => void;
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
    "없음",
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

export default function FixedExpenseCreateModal({
    isOpen,
    currencyCode,
    onClose,
    onSubmit,
}: FixedExpenseCreateModalProps) {
    const [title, setTitle] = useState("");
    const [storeName, setStoreName] = useState("없음");
    const [directStoreName, setDirectStoreName] = useState("");
    const [categoryName, setCategoryName] = useState("주거");
    const [directCategoryName, setDirectCategoryName] = useState("");
    const [amount, setAmount] = useState("");
    const [paymentDay, setPaymentDay] = useState("1");
    const [memo, setMemo] = useState("");

    const isDirectStoreInput = storeName === DIRECT_INPUT_VALUE;
    const isDirectCategoryInput = categoryName === DIRECT_INPUT_VALUE;

    const finalStoreName = isDirectStoreInput
        ? directStoreName.trim()
        : storeName.trim();

    const finalCategoryName = isDirectCategoryInput
        ? directCategoryName.trim()
        : categoryName.trim();

    const canSubmit = useMemo(() => {
        return (
            title.trim().length > 0 &&
            finalCategoryName.length > 0 &&
            Number(amount) > 0 &&
            Number(paymentDay) >= 1 &&
            Number(paymentDay) <= 31
        );
    }, [title, finalCategoryName, amount, paymentDay]);

    if (!isOpen || typeof document === "undefined") {
        return null;
    }

    const resetForm = () => {
        setTitle("");
        setStoreName("없음");
        setDirectStoreName("");
        setCategoryName("주거");
        setDirectCategoryName("");
        setAmount("");
        setPaymentDay("1");
        setMemo("");
    };

    const handleClose = () => {
        resetForm();
        onClose();
    };

    const handleSubmit = (event: SyntheticEvent<HTMLFormElement>) => {
        event.preventDefault();

        if (!canSubmit) {
            return;
        }

        onSubmit({
            title: title.trim(),
            storeName:
                finalStoreName && finalStoreName !== "없음"
                    ? finalStoreName
                    : undefined,
            categoryName: finalCategoryName,
            amount: Number(amount),
            paymentDay: Number(paymentDay),
            memo: memo.trim() || undefined,
        });

        resetForm();
        onClose();
    };

    return createPortal(
        <div className="fixed inset-0 z-9999 overflow-y-auto px-4 py-16 sm:py-20">
            <button
                type="button"
                aria-label="모달 닫기"
                onClick={handleClose}
                className="fixed inset-0 bg-black/50 backdrop-blur-sm"
            />

            <div className="relative z-10 mx-auto w-full max-w-2xl rounded-2xl border border-slate-200 bg-white/95 p-6 shadow-[0_20px_60px_rgba(15,23,42,0.25)] backdrop-blur-md dark:border-white/10 dark:bg-zinc-900/95">
                <div className="mb-6 flex items-start justify-between gap-4">
                    <div>
                        <p className="mb-1 text-sm font-medium text-orange-500">
                            Fixed Expense
                        </p>
                        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                            고정비용 등록
                        </h2>
                        <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
                            매월 반복적으로 발생하는 지출을 등록합니다.
                        </p>
                    </div>

                    <button
                        type="button"
                        onClick={handleClose}
                        className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-white/10 dark:hover:text-white"
                    >
                        <X size={20} />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="space-y-5">
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                        <div>
                            <label className="mb-2 block text-sm font-semibold text-slate-700 dark:text-slate-200">
                                고정비용명 <span className="text-orange-500">*</span>
                            </label>
                            <input
                                value={title}
                                onChange={(event) => setTitle(event.target.value)}
                                placeholder="예: 월세, 휴대폰 요금"
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
                                className="w-full rounded-xl border border-slate-300 bg-slate-50 px-4 py-3 text-sm text-gray-800 outline-none transition focus:border-orange-400 focus:bg-white focus:ring-2 focus:ring-orange-200 dark:border-white/10 dark:bg-black/30 dark:text-white dark:focus:bg-black/40 dark:focus:ring-orange-500/20 [&>option]:bg-white [&>option]:text-gray-800 dark:[&>option]:bg-zinc-900 dark:[&>option]:text-white"
                            >
                                {transactionStores.map((store) => (
                                    <option key={store} value={store}>
                                        {store}
                                    </option>
                                ))}
                                <option value={DIRECT_INPUT_VALUE}>
                                    직접 입력
                                </option>
                            </select>

                            {isDirectStoreInput && (
                                <input
                                    value={directStoreName}
                                    onChange={(event) =>
                                        setDirectStoreName(event.target.value)
                                    }
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
                                onChange={(event) =>
                                    setCategoryName(event.target.value)
                                }
                                className="w-full rounded-xl border border-slate-300 bg-slate-50 px-4 py-3 text-sm text-gray-800 outline-none transition focus:border-orange-400 focus:bg-white focus:ring-2 focus:ring-orange-200 dark:border-white/10 dark:bg-black/30 dark:text-white dark:focus:bg-black/40 dark:focus:ring-orange-500/20 [&>option]:bg-white [&>option]:text-gray-800 dark:[&>option]:bg-zinc-900 dark:[&>option]:text-white"
                            >
                                {transactionCategories.map((category) => (
                                    <option key={category} value={category}>
                                        {category}
                                    </option>
                                ))}
                                <option value={DIRECT_INPUT_VALUE}>
                                    직접 입력
                                </option>
                            </select>

                            {isDirectCategoryInput && (
                                <input
                                    value={directCategoryName}
                                    onChange={(event) =>
                                        setDirectCategoryName(event.target.value)
                                    }
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
                                    표시 금액:{" "}
                                    {formatAmount(Number(amount), currencyCode)}
                                </p>
                            )}
                        </div>
                    </div>

                    <div>
                        <label className="mb-2 block text-sm font-semibold text-slate-700 dark:text-slate-200">
                            매월 결제일 <span className="text-orange-500">*</span>
                        </label>
                        <input
                            value={paymentDay}
                            onChange={(event) => setPaymentDay(event.target.value)}
                            type="number"
                            min="1"
                            max="31"
                            inputMode="numeric"
                            placeholder="예: 25"
                            className="w-full rounded-xl border border-slate-300 bg-slate-50 px-4 py-3 text-sm text-gray-800 outline-none transition placeholder:text-slate-400 focus:border-orange-400 focus:bg-white focus:ring-2 focus:ring-orange-200 dark:border-white/10 dark:bg-black/30 dark:text-white dark:placeholder:text-gray-500 dark:focus:bg-black/40 dark:focus:ring-orange-500/20"
                        />
                        <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
                            1일부터 31일 사이로 입력해 주세요.
                        </p>
                    </div>

                    <div>
                        <label className="mb-2 block text-sm font-semibold text-slate-700 dark:text-slate-200">
                            메모
                        </label>
                        <textarea
                            value={memo}
                            onChange={(event) => setMemo(event.target.value)}
                            placeholder="예: 매월 자동이체"
                            rows={3}
                            className="w-full resize-none rounded-xl border border-slate-300 bg-slate-50 px-4 py-3 text-sm text-gray-800 outline-none transition placeholder:text-slate-400 focus:border-orange-400 focus:bg-white focus:ring-2 focus:ring-orange-200 dark:border-white/10 dark:bg-black/30 dark:text-white dark:placeholder:text-gray-500 dark:focus:bg-black/40 dark:focus:ring-orange-500/20"
                        />
                    </div>

                    <div className="flex justify-end gap-3 pt-2">
                        <button
                            type="button"
                            onClick={handleClose}
                            className="rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm font-semibold text-slate-600 transition hover:bg-slate-50 dark:border-white/10 dark:bg-white/5 dark:text-slate-300 dark:hover:bg-white/10"
                        >
                            취소
                        </button>

                        <button
                            type="submit"
                            disabled={!canSubmit}
                            className="rounded-xl bg-orange-500 px-5 py-3 text-sm font-semibold text-white shadow-[0_10px_20px_rgba(249,115,22,0.28)] transition hover:bg-orange-600 disabled:cursor-not-allowed disabled:bg-slate-300 disabled:shadow-none dark:disabled:bg-slate-700"
                        >
                            등록
                        </button>
                    </div>
                </form>
            </div>
        </div>,
        document.body
    );
}