import type {
    AccountBookCategory,
    AccountBookStoreSuggestion,
    AccountBookTransaction,
    TransactionType,
} from "@/types/accountBook";

export const DIRECT_INPUT_VALUE = "__DIRECT_INPUT__";

import type { TransactionFormMode } from "@/types/accountBookTransactionForm";

export function getTodayText(now = new Date()) {
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
}

export function toCategoryNames(categoryOptions: AccountBookCategory[]) {
    return categoryOptions
        .filter((category) => category.active)
        .map((category) => category.name)
        .filter((name) => name.trim().length > 0);
}

export function toStoreNames(storeOptions: AccountBookStoreSuggestion[]) {
    return storeOptions
        .map((store) => store.storeName)
        .filter((name) => name.trim().length > 0);
}

export function getInitialCategoryValue(
    mode: TransactionFormMode,
    transaction: AccountBookTransaction | null | undefined,
    categoryNames: string[]
) {
    if (mode === "EDIT" && transaction) {
        return categoryNames.includes(transaction.category)
            ? transaction.category
            : DIRECT_INPUT_VALUE;
    }
    return "";
}

export function getInitialDirectCategoryName(
    mode: TransactionFormMode,
    transaction: AccountBookTransaction | null | undefined,
    categoryNames: string[]
) {
    if (mode !== "EDIT" || !transaction) {
        return "";
    }
    return categoryNames.includes(transaction.category)
        ? ""
        : transaction.category;
}

export function getInitialStoreValue(transaction: AccountBookTransaction | null | undefined, storeNames: string[]) {
    if (!transaction?.storeName) {
        return "";
    }
    return storeNames.includes(transaction.storeName)
        ? transaction.storeName
        : DIRECT_INPUT_VALUE;
}

export function getInitialDirectStoreName(transaction: AccountBookTransaction | null | undefined, storeNames: string[]) {
    if (!transaction?.storeName) {
        return "";
    }
    return storeNames.includes(transaction.storeName)
        ? ""
        : transaction.storeName;
}

export function getInitialTitle(mode: TransactionFormMode, transaction: AccountBookTransaction | null | undefined) {
    return mode === "EDIT" && transaction ? transaction.title : "";
}

export function getInitialType(mode: TransactionFormMode, transaction: AccountBookTransaction | null | undefined): TransactionType {
    return mode === "EDIT" && transaction ? transaction.type : "EXPENSE";
}

export function getInitialAmount(mode: TransactionFormMode, transaction: AccountBookTransaction | null | undefined) {
    return mode === "EDIT" && transaction ? String(transaction.amount) : "";
}

export function getInitialTransactionDate(mode: TransactionFormMode, transaction: AccountBookTransaction | null | undefined) {
    return mode === "EDIT" && transaction
        ? transaction.transactionDate
        : getTodayText();
}

export function getInitialMemo(mode: TransactionFormMode, transaction: AccountBookTransaction | null | undefined) {
    return mode === "EDIT" && transaction ? transaction.memo ?? "" : "";
}
