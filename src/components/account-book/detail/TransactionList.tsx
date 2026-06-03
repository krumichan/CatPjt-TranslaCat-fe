import {
    AccountBookTransaction,
    CurrencyCode,
} from "@/types/accountBook";
import TransactionListItem from "@/components/account-book/detail/TransactionListItem";

type TransactionListProps = {
    transactions: AccountBookTransaction[];
    currencyCode: CurrencyCode;
};

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

export default function TransactionList({
    transactions,
    currencyCode,
}: TransactionListProps) {
    const groupedTransactions = groupTransactionsByDate(transactions);
    const dates = Object.keys(groupedTransactions).sort((a, b) =>
        b.localeCompare(a)
    );

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
                            />
                        ))}
                    </div>
                </div>
            ))}
        </div>
    );
}