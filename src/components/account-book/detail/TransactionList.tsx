import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { LayoutGrid, Table2, X } from "lucide-react";
import {
    AccountBookTransaction,
    CurrencyCode,
} from "@/types/accountBook";
import TransactionListItem from "@/components/account-book/detail/TransactionListItem";
import { formatAmount } from "@/utils/account-book/formatAmount";

type MemoPopoverPosition = {
    top: number;
    left: number;
};

type TransactionListProps = {
    transactions: AccountBookTransaction[];
    currencyCode: CurrencyCode;
    onClickEditTransaction: (transaction: AccountBookTransaction) => void;
};

type TransactionViewMode = "CARD" | "TABLE";

function groupTransactionsByDate(transactions: AccountBookTransaction[]) {
    return transactions.reduce<Record<string, AccountBookTransaction[]>>(
        (groups, transaction) => {
            const date = transaction.transactionDate;

            if (!groups[date]) {
                groups[date] = [];
            }

            groups[date].push(transaction);

            return groups;
        },
        {}
    );
}

function formatDateLabel(date: string) {
    return date.replaceAll("-", ".");
}

function formatTransactionType(type: AccountBookTransaction["type"]) {
    return type === "INCOME" ? "수입" : "지출";
}

function TransactionViewToggle({
   viewMode,
   onChangeViewMode,
}: {
    viewMode: TransactionViewMode;
    onChangeViewMode: (viewMode: TransactionViewMode) => void;
}) {
    return (
        <div className="inline-flex rounded-2xl border border-slate-200 bg-white/90 p-1 shadow-sm dark:border-white/10 dark:bg-zinc-900/80">
            <button
                type="button"
                onClick={() => onChangeViewMode("CARD")}
                className={`flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-semibold transition ${
                    viewMode === "CARD"
                        ? "bg-orange-500 text-white shadow-sm"
                        : "text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-white/10"
                }`}
            >
                <LayoutGrid size={15} />
                카드
            </button>

            <button
                type="button"
                onClick={() => onChangeViewMode("TABLE")}
                className={`flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-semibold transition ${
                    viewMode === "TABLE"
                        ? "bg-orange-500 text-white shadow-sm"
                        : "text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-white/10"
                }`}
            >
                <Table2 size={15} />
                표
            </button>
        </div>
    );
}

function TransactionCardView({
    transactions,
    currencyCode,
    onClickEditTransaction,
}: TransactionListProps) {
    const groupedTransactions = groupTransactionsByDate(transactions);
    const dates = Object.keys(groupedTransactions).sort((a, b) =>
        b.localeCompare(a)
    );

    return (
        <div className="space-y-5">
            {dates.map((date) => (
                <div
                    key={date}
                    className="rounded-2xl border border-slate-200 bg-white/95 p-5 shadow-[0_14px_34px_rgba(15,23,42,0.14)] backdrop-blur-md dark:border-white/10 dark:bg-zinc-800/80 dark:shadow-xl"
                >
                    <h2 className="mb-4 text-sm font-bold text-slate-500 dark:text-slate-400">
                        {formatDateLabel(date)}
                    </h2>

                    <div className="space-y-3">
                        {groupedTransactions[date].map((transaction) => (
                            <TransactionListItem
                                key={transaction.id}
                                transaction={transaction}
                                currencyCode={currencyCode}
                                onClickEdit={onClickEditTransaction}
                            />
                        ))}
                    </div>
                </div>
            ))}
        </div>
    );
}

function TransactionTableMemoCell({ memo }: { memo?: string }) {
    const [isOpen, setIsOpen] = useState(false);
    const [position, setPosition] = useState<MemoPopoverPosition | null>(null);

    const buttonRef = useRef<HTMLButtonElement | null>(null);
    const popoverRef = useRef<HTMLDivElement | null>(null);

    const handleOpen = () => {
        const button = buttonRef.current;

        if (!button) {
            return;
        }

        const rect = button.getBoundingClientRect();

        const gap = 8;
        const margin = 12;
        const popoverWidth = Math.min(320, window.innerWidth - margin * 2);

        const rawLeft = rect.left;
        const maxLeft = window.innerWidth - popoverWidth - margin;

        setPosition({
            top: rect.bottom + gap,
            left: Math.max(margin, Math.min(rawLeft, maxLeft)),
        });

        setIsOpen(true);
    };

    const handleToggle = () => {
        if (isOpen) {
            setIsOpen(false);
            return;
        }

        handleOpen();
    };

    useEffect(() => {
        if (!isOpen) {
            return;
        }

        const handleClickOutside = (event: MouseEvent) => {
            const target = event.target as Node;

            if (
                buttonRef.current?.contains(target) ||
                popoverRef.current?.contains(target)
            ) {
                return;
            }

            setIsOpen(false);
        };

        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.key === "Escape") {
                setIsOpen(false);
            }
        };

        const handleResize = () => {
            setIsOpen(false);
        };

        document.addEventListener("mousedown", handleClickOutside);
        document.addEventListener("keydown", handleKeyDown);
        window.addEventListener("resize", handleResize);
        window.addEventListener("scroll", handleResize, true);

        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
            document.removeEventListener("keydown", handleKeyDown);
            window.removeEventListener("resize", handleResize);
            window.removeEventListener("scroll", handleResize, true);
        };
    }, [isOpen]);

    if (!memo) {
        return (
            <td className="px-4 py-3 text-slate-400 dark:text-slate-500">
                -
            </td>
        );
    }

    return (
        <td className="max-w-55 px-4 py-3 text-slate-400 dark:text-slate-500">
            <button
                ref={buttonRef}
                type="button"
                onClick={handleToggle}
                className="block max-w-full truncate text-left transition hover:text-orange-500 dark:hover:text-orange-400"
            >
                {memo}
            </button>

            {isOpen && position &&
                createPortal(
                    <div
                        ref={popoverRef}
                        style={{
                            top: position.top,
                            left: position.left,
                            width: "min(20rem, calc(100vw - 24px))",
                        }}
                        className="fixed z-9999 rounded-xl border border-slate-200 bg-white text-xs leading-relaxed text-slate-700 shadow-2xl dark:border-white/10 dark:bg-zinc-950 dark:text-slate-200"
                    >
                        <div className="flex items-start justify-between gap-3 border-b border-slate-200 px-3 py-2 dark:border-white/10">
                            <p className="min-w-0 truncate font-semibold text-slate-900 dark:text-white">
                                메모
                            </p>

                            <button
                                type="button"
                                onClick={() => setIsOpen(false)}
                                className="shrink-0 rounded-full p-1 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-white/10 dark:hover:text-white"
                                aria-label="닫기"
                            >
                                <X size={14} />
                            </button>
                        </div>

                        <div className="max-h-56 overflow-y-auto px-3 py-3">
                            <p className="whitespace-pre-wrap wrap-break-word">
                                {memo}
                            </p>
                        </div>
                    </div>,
                    document.body
                )}
        </td>
    );
}

function TransactionTableView({
    transactions,
    currencyCode,
    onClickEditTransaction,
}: TransactionListProps) {
    const sortedTransactions = [...transactions].sort((a, b) =>
        b.transactionDate.localeCompare(a.transactionDate)
    );

    return (
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white/95 shadow-[0_14px_34px_rgba(15,23,42,0.14)] backdrop-blur-md dark:border-white/10 dark:bg-zinc-800/80 dark:shadow-xl">
            <div className="overflow-x-auto">
                <table className="min-w-240 w-full border-collapse text-sm">
                    <thead className="bg-slate-100 text-xs text-slate-500 dark:bg-white/5 dark:text-slate-400">
                        <tr>
                            <th className="px-4 py-3 text-left font-semibold">
                                날짜
                            </th>
                            <th className="px-4 py-3 text-left font-semibold">
                                구분
                            </th>
                            <th className="px-4 py-3 text-left font-semibold">
                                거래명
                            </th>
                            <th className="px-4 py-3 text-left font-semibold">
                                카테고리
                            </th>
                            <th className="px-4 py-3 text-left font-semibold">
                                점포
                            </th>
                            <th className="px-4 py-3 text-left font-semibold">
                                메모
                            </th>
                            <th className="px-4 py-3 text-right font-semibold">
                                금액
                            </th>
                            <th className="px-4 py-3 text-right font-semibold">
                                관리
                            </th>
                        </tr>
                    </thead>

                    <tbody className="divide-y divide-slate-200 dark:divide-white/10">
                    {sortedTransactions.map((transaction) => {
                        const isIncome = transaction.type === "INCOME";

                        return (
                            <tr
                                key={transaction.id}
                                className="transition hover:bg-orange-50/70 dark:hover:bg-white/5"
                            >
                                <td className="whitespace-nowrap px-4 py-3 text-slate-600 dark:text-slate-300">
                                    {formatDateLabel(transaction.transactionDate)}
                                </td>

                                <td className="whitespace-nowrap px-4 py-3">
                                        <span
                                            className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                                                isIncome
                                                    ? "bg-blue-100 text-blue-600 dark:bg-blue-500/10 dark:text-blue-400"
                                                    : "bg-red-100 text-red-500 dark:bg-red-500/10 dark:text-red-400"
                                            }`}
                                        >
                                            {formatTransactionType(transaction.type)}
                                        </span>
                                </td>

                                <td className="max-w-45 truncate px-4 py-3 font-semibold text-slate-900 dark:text-white">
                                    {transaction.title}
                                </td>

                                <td className="whitespace-nowrap px-4 py-3 text-slate-600 dark:text-slate-300">
                                    {transaction.categoryName}
                                </td>

                                <td className="max-w-40 truncate px-4 py-3 text-slate-500 dark:text-slate-400">
                                    {transaction.storeName || "-"}
                                </td>

                                <TransactionTableMemoCell memo={transaction.memo} />

                                <td
                                    className={`whitespace-nowrap px-4 py-3 text-right font-bold ${
                                        isIncome
                                            ? "text-blue-600 dark:text-blue-400"
                                            : "text-red-500 dark:text-red-400"
                                    }`}
                                >
                                    {isIncome ? "+" : "-"}
                                    {formatAmount(
                                        transaction.amount,
                                        currencyCode
                                    )}
                                </td>

                                <td className="whitespace-nowrap px-4 py-3 text-right">
                                    <button
                                        type="button"
                                        onClick={() => onClickEditTransaction(transaction)}
                                        className="inline-flex items-center justify-center rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-semibold text-slate-500 transition hover:border-orange-300 hover:bg-orange-50 hover:text-orange-500 dark:border-white/10 dark:text-slate-400 dark:hover:border-orange-400/60 dark:hover:bg-orange-500/10 dark:hover:text-orange-400"
                                    >
                                        수정
                                    </button>
                                </td>
                            </tr>
                        );
                    })}
                    </tbody>
                </table>
            </div>
        </div>
    );
}

export default function TransactionList({
    transactions,
    currencyCode,
    onClickEditTransaction
}: TransactionListProps) {
    const [viewMode, setViewMode] =
        useState<TransactionViewMode>("TABLE");

    if (transactions.length === 0) {
        return (
            <div className="rounded-2xl border border-dashed border-slate-300 bg-white/95 p-10 text-center shadow-[0_12px_30px_rgba(15,23,42,0.10)] backdrop-blur-md dark:border-slate-700 dark:bg-slate-900/80">
                <p className="text-base font-semibold">거래 내역이 없습니다.</p>
                <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
                    다른 조건으로 검색하거나 새 거래를 등록해 주세요.
                </p>
            </div>
        );
    }

    return (
        <section className="space-y-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
                        거래 내역
                    </h2>
                    <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                        총 {transactions.length}건의 거래가 있습니다.
                    </p>
                </div>

                <TransactionViewToggle
                    viewMode={viewMode}
                    onChangeViewMode={setViewMode}
                />
            </div>

            {viewMode === "CARD" ? (
                <TransactionCardView
                    transactions={transactions}
                    currencyCode={currencyCode}
                    onClickEditTransaction={onClickEditTransaction}
                />
            ) : (
                <TransactionTableView
                    transactions={transactions}
                    currencyCode={currencyCode}
                    onClickEditTransaction={onClickEditTransaction}
                />
            )}
        </section>
    );
}