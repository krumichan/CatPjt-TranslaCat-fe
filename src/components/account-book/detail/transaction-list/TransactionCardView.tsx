import {
    AccountBookTransaction,
    CurrencyCode,
} from "@/types/accountBook";
import TransactionListItem from "@/components/account-book/detail/TransactionListItem";
import {
    formatDateLabel,
    groupTransactionsByDate,
} from "@/components/account-book/detail/transaction-list/transactionListUtils";

type TransactionCardViewProps = {
    transactions: AccountBookTransaction[];
    currencyCode: CurrencyCode;
    onClickEditTransaction: (transaction: AccountBookTransaction) => void;
};

export default function TransactionCardView({
    transactions,
    currencyCode,
    onClickEditTransaction,
}: TransactionCardViewProps) {
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