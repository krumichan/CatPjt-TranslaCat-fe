import {
    ArrowDownCircle,
    ArrowUpCircle,
    ReceiptText,
    Wallet,
} from "lucide-react";
import { AccountBook } from "@/types/accountBook";
import { formatAmount } from "@/utils/account-book/formatAmount";

type AccountBookSummaryCardsProps = {
    accountBook: AccountBook;
};

export default function AccountBookSummaryCards({
    accountBook,
}: AccountBookSummaryCardsProps) {
    const items = [
        {
            label: "수입",
            value: formatAmount(accountBook.incomeAmount, accountBook.currencyCode),
            icon: <ArrowUpCircle size={20} />,
            valueClassName: "text-blue-600 dark:text-blue-400",
        },
        {
            label: "지출",
            value: formatAmount(accountBook.expenseAmount, accountBook.currencyCode),
            icon: <ArrowDownCircle size={20} />,
            valueClassName: "text-red-500 dark:text-red-400",
        },
        {
            label: "잔액",
            value: formatAmount(accountBook.balance, accountBook.currencyCode),
            icon: <Wallet size={20} />,
            valueClassName: "text-slate-900 dark:text-white",
        },
        {
            label: "거래",
            value: `${accountBook.transactionCount}건`,
            icon: <ReceiptText size={20} />,
            valueClassName: "text-slate-900 dark:text-white",
        },
    ];

    return (
        <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
            {items.map((item) => (
                <div
                    key={item.label}
                    className="rounded-2xl border border-slate-200 bg-white/95 p-4 shadow-[0_12px_30px_rgba(15,23,42,0.12)] backdrop-blur-md dark:border-white/10 dark:bg-zinc-800/80 dark:shadow-xl"
                >
                    <div className="mb-3 flex items-center justify-between text-slate-400">
                        <span className="text-sm font-semibold text-slate-500 dark:text-slate-400">
                            {item.label}
                        </span>
                        {item.icon}
                    </div>

                    <p className={`truncate text-lg font-bold ${item.valueClassName}`}>
                        {item.value}
                    </p>
                </div>
            ))}
        </div>
    );
}