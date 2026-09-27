import { apiClient } from "@/lib/apiClient";
import {
    AccountBookReceiptAnalysisResponse,
    AccountBookStoreSuggestion,
    AccountBookTransaction,
    AccountBookTransactionCreateRequest,
    AccountBookTransactionListRequest,
    AccountBookTransactionListResponse,
    AccountBookTransactionMonthOption,
    AccountBookTransactionUpdateRequest,
    ReceiptAnalysisMode,
    ReceiptBatchRegistrationRequest,
    ReceiptRegistrationCandidate,
    ReceiptConversion,
    TransactionType,
    ReceiptRuntimeIdentity,
} from "@/types/accountBook";
import { ResponseDto } from "@/types/common";
import { resizeReceiptImage } from "@/utils/account-book/resizeReceiptImage";

export const accountBookTransactionService = {
    async receiptRuntimePreflight(accountBookId: number): Promise<ReceiptRuntimeIdentity> {
        const response = await apiClient(`/account-books/${accountBookId}/transactions/receipt-runtime-preflight`);
        if (!response.ok)
            throw new Error("Receipt runtime preflight failed.");
        return ((await response.json()) as ResponseDto<ReceiptRuntimeIdentity>).body;
    },
    async analyzeReceipt(
        accountBookId: number,
        file: File,
        analysisMode: ReceiptAnalysisMode = "VISION_ONLY",
        signal?: AbortSignal
    ): Promise<AccountBookReceiptAnalysisResponse> {
        if (signal?.aborted)
            throw new DOMException("Receipt analysis canceled", "AbortError");
        const resizedFile = await resizeReceiptImage(file);
        if (signal?.aborted)
            throw new DOMException("Receipt analysis canceled", "AbortError");
        if (resizedFile.size > 5 * 1024 * 1024) {
            throw new Error("Receipt image is too large.");
        }
        const formData = new FormData();
        formData.append("file", resizedFile);
        formData.append("analysisMode", analysisMode);
        const requestController = new AbortController();
        const cancel = () => requestController.abort(signal?.reason);
        signal?.addEventListener("abort", cancel, { once: true });
        const timeoutId = window.setTimeout(() => requestController.abort(new DOMException("Receipt analysis timed out", "TimeoutError")), 35000);
        let response: Response;
        try {
            response = await apiClient(
                `/account-books/${accountBookId}/transactions/receipt-analysis`,
                {
                    method: "POST",
                    body: formData,
                    signal: requestController.signal,
                }
            );
        } finally {
            window.clearTimeout(timeoutId);
            signal?.removeEventListener("abort", cancel);
        }
        if (!response.ok) {
            throw new Error("Failed to analyze receipt.");
        }
        const data = (await response.json()) as ResponseDto<AccountBookReceiptAnalysisResponse>;
        return data.body;
    },
    async previewReceiptConversion(accountBookId: number, request: ReceiptRegistrationCandidate): Promise<ReceiptConversion> {
        const response = await apiClient(
            `/account-books/${accountBookId}/transactions/receipt-conversion`,
            {
                method: "POST",
                body: JSON.stringify(request),
            }
        );
        if (!response.ok)
            throw new Error("Failed to preview receipt conversion.");
        return ((await response.json()) as ResponseDto<ReceiptConversion>).body;
    },
    async registerReceiptBatch(accountBookId: number, request: ReceiptBatchRegistrationRequest, idempotencyKey: string): Promise<AccountBookTransaction[]> {
        const response = await apiClient(
            `/account-books/${accountBookId}/transactions/receipt-batch`,
            {
                method: "POST",
                body: JSON.stringify(request),
                headers: { "Idempotency-Key": idempotencyKey },
            }
        );
        if (!response.ok)
            throw new Error("Failed to register receipt batch.");
        return ((await response.json()) as ResponseDto<AccountBookTransaction[]>).body;
    },
    async listStoreSuggestions(accountBookId: number, type: TransactionType, keyword?: string): Promise<AccountBookStoreSuggestion[]> {
        const searchParams = new URLSearchParams();
        searchParams.set("type", type);
        if (keyword?.trim()) {
            searchParams.set("keyword", keyword.trim());
        }
        const queryString = searchParams.toString();
        const response = await apiClient(
            `/account-books/${accountBookId}/transactions/stores/suggestions${queryString ? `?${queryString}` : ""}`,
            { method: "GET" }
        );
        if (!response.ok) {
            throw new Error("Failed to get store suggestions.");
        }
        const data = (await response.json()) as ResponseDto<AccountBookStoreSuggestion[]>;
        return data.body ?? [];
    },
    async listTransactions(accountBookId: number, request: AccountBookTransactionListRequest): Promise<AccountBookTransactionListResponse> {
        const response = await apiClient(
            `/account-books/${accountBookId}/transactions`,
            {
                method: "POST",
                body: JSON.stringify(request),
            }
        );
        if (!response.ok) {
            throw new Error("Failed to load account book transactions.");
        }
        const data = (await response.json()) as ResponseDto<AccountBookTransactionListResponse>;
        return data.body;
    },
    async listTransactionMonths(accountBookId: number): Promise<AccountBookTransactionMonthOption[]> {
        const response = await apiClient(`/account-books/${accountBookId}/transactions/months`, {
            method: "GET",
        });
        if (!response.ok) {
            throw new Error("Failed to get transaction months.");
        }
        const data = (await response.json()) as ResponseDto<AccountBookTransactionMonthOption[]>;
        return data.body ?? [];
    },
    async createTransaction(accountBookId: number, request: AccountBookTransactionCreateRequest): Promise<AccountBookTransaction> {
        const response = await apiClient(
            `/account-books/${accountBookId}/transactions/register`,
            {
                method: "POST",
                body: JSON.stringify(request),
            }
        );
        if (!response.ok) {
            throw new Error("Failed to create transaction.");
        }
        const data = (await response.json()) as ResponseDto<AccountBookTransaction>;
        return data.body;
    },
    async updateTransaction(accountBookId: number, transactionId: number, request: AccountBookTransactionUpdateRequest): Promise<AccountBookTransaction> {
        const response = await apiClient(
            `/account-books/${accountBookId}/transactions/${transactionId}`,
            {
                method: "PUT",
                body: JSON.stringify(request),
            }
        );
        if (!response.ok) {
            throw new Error("Failed to update transaction.");
        }
        const data = (await response.json()) as ResponseDto<AccountBookTransaction>;
        return data.body;
    },
    async deleteTransaction(accountBookId: number, transactionId: number): Promise<boolean> {
        const response = await apiClient(`/account-books/${accountBookId}/transactions/${transactionId}`, {
            method: "DELETE",
        });
        if (!response.ok) {
            throw new Error("Failed to delete transaction.");
        }
        const data = (await response.json()) as ResponseDto<boolean>;
        return data.body;
    },
};
