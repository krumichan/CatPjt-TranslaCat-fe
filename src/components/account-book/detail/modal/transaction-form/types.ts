import {
    AccountBookCategory,
    AccountBookReceiptAnalysisResponse,
    AccountBookStoreSuggestion,
    AccountBookTransaction,
    CreateTransactionFormValues,
    CurrencyCode,
    ReceiptAnalysisMode,
} from "@/types/accountBook";

export type TransactionFormMode = "CREATE" | "EDIT";
export type InputMode = "MANUAL" | "RECEIPT";

export type TransactionFormModalProps = {
    isOpen: boolean;
    mode: TransactionFormMode;
    transaction?: AccountBookTransaction | null;
    currencyCode: CurrencyCode;
    categoryOptions: AccountBookCategory[];
    storeOptions: AccountBookStoreSuggestion[];
    onClose: () => void;
    onSubmit: (
        values: CreateTransactionFormValues,
        transactionId?: number
    ) => void | Promise<void>;
    onAnalyzeReceipt?: (
        file: File,
        analysisMode: ReceiptAnalysisMode,
    ) => Promise<AccountBookReceiptAnalysisResponse>;
};