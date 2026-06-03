import { useMemo, useState } from "react";
import type { SyntheticEvent } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import {
    AccountBookCategory,
    CreateAccountBookFormValues,
    CurrencyCode,
} from "@/types/accountBook";

type AccountBookCreateModalProps = {
    isOpen: boolean;
    categories: AccountBookCategory[];
    onClose: () => void;
    onSubmit: (values: CreateAccountBookFormValues) => void;
};

const DIRECT_INPUT_VALUE = "__DIRECT_INPUT__";

export default function AccountBookCreateModal({
   isOpen,
   categories,
   onClose,
   onSubmit,
}: AccountBookCreateModalProps) {
    const firstCategoryId = categories[0]?.id ?? "";

    const [name, setName] = useState("");
    const [description, setDescription] = useState("");
    const [currencyCode, setCurrencyCode] = useState<CurrencyCode>("JPY");
    const [expenseGoalAmount, setExpenseGoalAmount] = useState("");
    const [selectedCategoryId, setSelectedCategoryId] = useState(
        firstCategoryId || DIRECT_INPUT_VALUE
    );
    const [newCategoryName, setNewCategoryName] = useState("");

    const isDirectInput = selectedCategoryId === DIRECT_INPUT_VALUE;

    const canSubmit = useMemo(() => {
        if (!name.trim()) {
            return false;
        }

        if (isDirectInput) {
            return !!newCategoryName.trim();
        }

        return !!selectedCategoryId;
    }, [name, isDirectInput, newCategoryName, selectedCategoryId]);

    if (!isOpen || typeof document === "undefined") {
        return null;
    }

    const resetForm = () => {
        setName("");
        setDescription("");
        setCurrencyCode("JPY");
        setSelectedCategoryId(firstCategoryId || DIRECT_INPUT_VALUE);
        setNewCategoryName("");
        setExpenseGoalAmount("");
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
            name: name.trim(),
            description: description.trim() || undefined,
            currencyCode,
            expenseGoalAmount: expenseGoalAmount.trim()
                ? Number(expenseGoalAmount)
                : null,
            categoryMode: isDirectInput ? "NEW" : "EXISTING",
            categoryId: isDirectInput ? undefined : selectedCategoryId,
            newCategoryName: isDirectInput
                ? newCategoryName.trim()
                : undefined,
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

            <div className="relative z-10 mx-auto w-full max-w-lg rounded-2xl border border-slate-200 bg-white/95 p-6 shadow-[0_20px_60px_rgba(15,23,42,0.25)] backdrop-blur-md dark:border-white/10 dark:bg-zinc-900/95">
                <div className="mb-6 flex items-start justify-between gap-4">
                    <div>
                        <p className="mb-1 text-sm font-medium text-orange-500">
                            New Account Book
                        </p>
                        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                            신규 가계부 작성
                        </h2>
                        <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
                            기존 카테고리에 추가하거나, 새 카테고리를 직접 입력할 수 있습니다.
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
                    <div>
                        <label className="mb-2 block text-sm font-semibold text-slate-700 dark:text-slate-200">
                            가계부명 <span className="text-orange-500">*</span>
                        </label>
                        <input
                            value={name}
                            onChange={(event) => setName(event.target.value)}
                            placeholder="예: 일본 생활비"
                            className="w-full rounded-xl border border-slate-300 bg-slate-50 px-4 py-3 text-sm text-gray-800 outline-none transition placeholder:text-slate-400 focus:border-orange-400 focus:bg-white focus:ring-2 focus:ring-orange-200 dark:border-white/10 dark:bg-black/30 dark:text-white dark:placeholder:text-gray-500 dark:focus:bg-black/40 dark:focus:ring-orange-500/20"
                        />
                    </div>

                    <div>
                        <label className="mb-2 block text-sm font-semibold text-slate-700 dark:text-slate-200">
                            카테고리 <span className="text-orange-500">*</span>
                        </label>
                        <select
                            value={selectedCategoryId}
                            onChange={(event) =>
                                setSelectedCategoryId(event.target.value)
                            }
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
                            {categories.map((category) => (
                                <option key={category.id} value={category.id}>
                                    {category.name}
                                </option>
                            ))}
                            <option value={DIRECT_INPUT_VALUE}>
                                직접 입력
                            </option>
                        </select>

                        {isDirectInput && (
                            <input
                                value={newCategoryName}
                                onChange={(event) =>
                                    setNewCategoryName(event.target.value)
                                }
                                placeholder="새 카테고리명 입력"
                                className="mt-3 w-full rounded-xl border border-slate-300 bg-slate-50 px-4 py-3 text-sm text-gray-800 outline-none transition placeholder:text-slate-400 focus:border-orange-400 focus:bg-white focus:ring-2 focus:ring-orange-200 dark:border-white/10 dark:bg-black/30 dark:text-white dark:placeholder:text-gray-500 dark:focus:bg-black/40 dark:focus:ring-orange-500/20"
                            />
                        )}
                    </div>

                    <div>
                        <label className="mb-2 block text-sm font-semibold text-slate-700 dark:text-slate-200">
                            기준 통화 <span className="text-orange-500">*</span>
                        </label>
                        <select
                            value={currencyCode}
                            onChange={(event) =>
                                setCurrencyCode(event.target.value as CurrencyCode)
                            }
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
                            <option value="JPY">JPY - 일본 엔</option>
                            <option value="KRW">KRW - 한국 원</option>
                        </select>
                    </div>

                    <div>
                        <label className="mb-2 block text-sm font-semibold text-slate-700 dark:text-slate-200">
                            월 지출 목표금액
                        </label>

                        <div className="flex overflow-hidden rounded-xl border border-slate-300 bg-slate-50 focus-within:border-orange-400 focus-within:ring-2 focus-within:ring-orange-200 dark:border-white/10 dark:bg-black/30 dark:focus-within:ring-orange-500/20">
                            <div className="flex items-center border-r border-slate-300 px-4 text-sm font-bold text-slate-500 dark:border-white/10 dark:text-slate-300">
                                {currencyCode}
                            </div>

                            <input
                                value={expenseGoalAmount}
                                onChange={(event) => setExpenseGoalAmount(event.target.value)}
                                type="number"
                                min="0"
                                inputMode="numeric"
                                placeholder="예: 100000"
                                className="w-full bg-transparent px-4 py-3 text-sm text-gray-800 outline-none placeholder:text-slate-400 dark:text-white dark:placeholder:text-gray-500"
                            />
                        </div>

                        <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
                            선택 입력입니다. 설정하지 않으면 나중에 상세 화면에서 등록할 수 있습니다.
                        </p>
                    </div>

                    <div>
                        <label className="mb-2 block text-sm font-semibold text-slate-700 dark:text-slate-200">
                            설명
                        </label>
                        <textarea
                            value={description}
                            onChange={(event) =>
                                setDescription(event.target.value)
                            }
                            placeholder="예: 월세, 식비, 교통비 관리"
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