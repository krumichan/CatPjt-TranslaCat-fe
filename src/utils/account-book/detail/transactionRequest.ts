import type {
    AccountBookTransactionCreateRequest,
    AccountBookTransactionUpdateRequest,
    CreateTransactionFormValues,
} from "@/types/accountBook";
import { toNullableText } from "@/utils/text/normalizeText";

export const toTransactionCreateRequest = (values: CreateTransactionFormValues): AccountBookTransactionCreateRequest => ({
    type: values.type,
    title: values.title.trim(),
    storeName: toNullableText(values.storeName),
    category: values.categoryName.trim(),
    amount: values.amount,
    transactionDate: values.transactionDate,
    memo: toNullableText(values.memo),
});

export const toTransactionUpdateRequest = (values: CreateTransactionFormValues): AccountBookTransactionUpdateRequest => ({
    type: values.type,
    title: values.title.trim(),
    storeName: toNullableText(values.storeName),
    category: values.categoryName.trim(),
    amount: values.amount,
    transactionDate: values.transactionDate,
    memo: toNullableText(values.memo),
});
