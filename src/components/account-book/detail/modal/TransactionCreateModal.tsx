import { ChangeEvent, SyntheticEvent, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { Camera, ImagePlus, Loader2, Sparkles, X } from "lucide-react";
import {
    CreateTransactionFormValues,
    CurrencyCode,
    TransactionType,
} from "@/types/accountBook";
import { formatAmount } from "@/utils/account-book/formatAmount";

type TransactionCreateModalProps = {
    isOpen: boolean;
    currencyCode: CurrencyCode;
    onClose: () => void;
    onSubmit: (values: CreateTransactionFormValues) => void;
};

type InputMode = "MANUAL" | "RECEIPT";

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

const mockReceiptAnalysisResult = {
    title: "간식거리 삼",
    amount: 850,
    transactionDate: "2026-06-02",
    storeName: "세븐일레븐",
    categoryName: "식비",
    memo: "영수증 분석 결과",
    confidence: 0.87,
};

const DIRECT_INPUT_VALUE = "__DIRECT_INPUT__";

function getTodayText() {
    return new Date().toISOString().slice(0, 10);
}

export default function TransactionCreateModal({
   isOpen,
   currencyCode,
   onClose,
   onSubmit,
}: TransactionCreateModalProps) {
    const [inputMode, setInputMode] = useState<InputMode>("MANUAL");

    const [type, setType] = useState<TransactionType>("EXPENSE");
    const [title, setTitle] = useState("");
    const [storeName, setStoreName] = useState("");
    const [directStoreName, setDirectStoreName] = useState("");
    const [categoryName, setCategoryName] = useState("식비");
    const [directCategoryName, setDirectCategoryName] = useState("");
    const [amount, setAmount] = useState("");
    const [transactionDate, setTransactionDate] = useState(getTodayText());
    const [memo, setMemo] = useState("");

    const isDirectStoreInput = storeName === DIRECT_INPUT_VALUE;
    const isDirectCategoryInput = categoryName === DIRECT_INPUT_VALUE;

    const [receiptFileName, setReceiptFileName] = useState("");
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [analysisMessage, setAnalysisMessage] = useState("");

    const canSubmit = useMemo(() => {
        const isDirectCategoryInput = categoryName === DIRECT_INPUT_VALUE;

        const finalCategoryName = isDirectCategoryInput
            ? directCategoryName.trim()
            : categoryName.trim();

        return (
            title.trim().length > 0 &&
            finalCategoryName.length > 0 &&
            Number(amount) > 0 &&
            transactionDate.trim().length > 0
        );
    }, [title, categoryName, directCategoryName, amount, transactionDate]);

    if (!isOpen || typeof document === "undefined") {
        return null;
    }

    const resetForm = () => {
        setInputMode("MANUAL");
        setType("EXPENSE");
        setTitle("");
        setStoreName("");
        setDirectStoreName("");
        setCategoryName("식비");
        setDirectCategoryName("");
        setAmount("");
        setTransactionDate(getTodayText());
        setMemo("");
        setReceiptFileName("");
        setIsAnalyzing(false);
        setAnalysisMessage("");
    };

    const handleClose = () => {
        resetForm();
        onClose();
    };

    const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];

        if (!file) {
            return;
        }

        setReceiptFileName(file.name);
        setAnalysisMessage("영수증 사진이 선택되었습니다. 분석하기 버튼을 눌러 주세요.");
    };

    const handleAnalyzeReceipt = async () => {
        if (!receiptFileName) {
            setAnalysisMessage("먼저 영수증 사진을 선택해 주세요.");
            return;
        }

        setIsAnalyzing(true);
        setAnalysisMessage("");

        await new Promise((resolve) => setTimeout(resolve, 900));

        setType("EXPENSE");
        setTitle(mockReceiptAnalysisResult.title);
        if (transactionStores.includes(mockReceiptAnalysisResult.storeName)) {
            setStoreName(mockReceiptAnalysisResult.storeName);
            setDirectStoreName("");
        } else {
            setStoreName(DIRECT_INPUT_VALUE);
            setDirectStoreName(mockReceiptAnalysisResult.storeName);
        }
        if (transactionCategories.includes(mockReceiptAnalysisResult.categoryName)) {
            setCategoryName(mockReceiptAnalysisResult.categoryName);
            setDirectCategoryName("");
        } else {
            setCategoryName(DIRECT_INPUT_VALUE);
            setDirectCategoryName(mockReceiptAnalysisResult.categoryName);
        }
        setAmount(String(mockReceiptAnalysisResult.amount));
        setTransactionDate(mockReceiptAnalysisResult.transactionDate);
        setMemo(mockReceiptAnalysisResult.memo);

        setIsAnalyzing(false);
        setAnalysisMessage(
            `분석 결과를 입력 폼에 반영했습니다. 신뢰도 ${Math.round(
                mockReceiptAnalysisResult.confidence * 100
            )}%`
        );
    };

    const handleSubmit = (event: SyntheticEvent<HTMLFormElement>) => {
        event.preventDefault();

        if (!canSubmit) {
            return;
        }

        const finalStoreName = storeName === DIRECT_INPUT_VALUE
            ? directStoreName.trim()
            : storeName.trim();

        const finalCategoryName = categoryName === DIRECT_INPUT_VALUE
            ? directCategoryName.trim()
            : categoryName.trim();

        onSubmit({
            type,
            title: title.trim(),
            storeName: finalStoreName || undefined,
            categoryName: finalCategoryName,
            amount: Number(amount),
            transactionDate,
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
                            New Transaction
                        </p>
                        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                            거래 등록
                        </h2>
                        <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
                            직접 입력하거나 영수증 사진 분석 결과를 이용해 거래를 등록합니다.
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
                        직접 입력
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
                        영수증 분석
                    </button>
                </div>

                {inputMode === "RECEIPT" && (
                    <div className="mb-5 rounded-2xl border border-slate-200 bg-slate-50/90 p-4 dark:border-white/10 dark:bg-black/25">
                        <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-700 dark:text-slate-200">
                            <Camera size={18} />
                            영수증 사진
                        </div>

                        <label className="flex cursor-pointer flex-col items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-white/80 px-4 py-6 text-center transition hover:border-orange-300 hover:bg-orange-50/60 dark:border-white/10 dark:bg-white/5 dark:hover:border-orange-400/60 dark:hover:bg-orange-500/10">
                            <ImagePlus className="mb-2 text-slate-400" size={28} />
                            <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">
                        사진 선택 / 촬영
                    </span>
                            <span className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                        JPG, PNG 등의 이미지 파일을 선택해 주세요.
                    </span>

                            <input
                                type="file"
                                accept="image/*"
                                capture="environment"
                                onChange={handleFileChange}
                                className="hidden"
                            />
                        </label>

                        {receiptFileName && (
                            <p className="mt-3 truncate text-xs text-slate-500 dark:text-slate-400">
                                선택된 파일: {receiptFileName}
                            </p>
                        )}

                        <button
                            type="button"
                            onClick={handleAnalyzeReceipt}
                            disabled={isAnalyzing}
                            className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-orange-500 px-4 py-3 text-sm font-semibold text-white shadow-[0_10px_20px_rgba(249,115,22,0.25)] transition hover:bg-orange-600 disabled:cursor-not-allowed disabled:bg-slate-300 disabled:shadow-none dark:disabled:bg-slate-700"
                        >
                            {isAnalyzing ? (
                                <>
                                    <Loader2 size={18} className="animate-spin" />
                                    분석 중...
                                </>
                            ) : (
                                <>
                                    <Sparkles size={18} />
                                    분석하기
                                </>
                            )}
                        </button>

                        {analysisMessage && (
                            <p className="mt-3 rounded-xl bg-orange-50 px-3 py-2 text-xs text-orange-700 dark:bg-orange-500/10 dark:text-orange-300">
                                {analysisMessage}
                            </p>
                        )}
                    </div>
                )}

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
                                점포명 <span className="text-orange-500">*</span>
                            </label>
                            <select
                                value={storeName}
                                onChange={(event) => setStoreName(event.target.value)}
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
                                    dark:border-white/10 dark:dark:bg-black/30 dark:text-white
                                    dark:focus:dark:bg-black/30 dark:focus:ring-orange-500/20
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
                                <option value={DIRECT_INPUT_VALUE}>
                                    직접 입력
                                </option>
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