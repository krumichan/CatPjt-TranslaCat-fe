import type {
    AccountBookCategory,
    AccountBookReceiptAnalysisResponse,
    AccountBookStoreSuggestion,
    AccountBookTransaction,
    CreateTransactionFormValues,
    CurrencyCode,
    ReceiptAnalysisMode,
    ReceiptRegistrationCandidate,
    ReceiptBatchRegistrationRequest,
    ReceiptConversion,
} from "@/types/accountBook";
import type { CategoryOptionsStatus } from "@/types/accountBookReceiptReview";

export type TransactionFormMode = "CREATE" | "EDIT";

export type InputMode = "MANUAL" | "RECEIPT";

export type TransactionFormModalProps = {
    isOpen: boolean;
    mode: TransactionFormMode;
    transaction?: AccountBookTransaction | null;
    currencyCode: CurrencyCode;
    categoryOptions: AccountBookCategory[];
    categoryOptionsStatus?: CategoryOptionsStatus;
    onRetryCategories?: () => void;
    storeOptions: AccountBookStoreSuggestion[];
    incomeSourceOptions?: AccountBookStoreSuggestion[];
    onClose: () => void;
    onSubmit: (values: CreateTransactionFormValues, transactionId?: number) => void | Promise<void>;
    onAnalyzeReceipt?: (file: File, analysisMode: ReceiptAnalysisMode, signal?: AbortSignal) => Promise<AccountBookReceiptAnalysisResponse>;
    onPreviewReceiptConversion?: (candidate: ReceiptRegistrationCandidate) => Promise<ReceiptConversion>;
    onSubmitReceiptBatch?: (request: ReceiptBatchRegistrationRequest, idempotencyKey: string) => Promise<void>;
};
