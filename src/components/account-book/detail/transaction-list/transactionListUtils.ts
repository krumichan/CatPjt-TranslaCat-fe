import { AccountBookTransaction } from "@/types/accountBook";

export function groupTransactionsByDate(transactions: AccountBookTransaction[]) {
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

export function formatDateLabel(date: string) {
    return date.replaceAll("-", ".");
}