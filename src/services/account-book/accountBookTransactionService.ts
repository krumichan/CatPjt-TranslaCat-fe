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
} from "@/types/accountBook";
import { ResponseDto } from "@/types/common";
import {resizeReceiptImage} from "@/utils/account-book/resizeReceiptImage";

export const accountBookTransactionService = {
    async analyzeReceipt(
        accountBookId: number,
        file: File
    ): Promise<AccountBookReceiptAnalysisResponse> {
        const resizedFile = await resizeReceiptImage(file);

        if (resizedFile.size > 5 * 1024 * 1024) {
            throw new Error("Receipt image is too large.");
        }

        const formData = new FormData();
        formData.append("file", resizedFile);

        const response = await apiClient(
            `/account-books/${accountBookId}/transactions/receipt-analysis`,
            {
                method: "POST",
                body: formData,
            }
        );

        if (!response.ok) {
            throw new Error("Failed to analyze receipt.");
        }

        const data =
            (await response.json()) as ResponseDto<AccountBookReceiptAnalysisResponse>;

        return data.body;
    },

    async listStoreSuggestions(
        accountBookId: number,
        keyword?: string
    ): Promise<AccountBookStoreSuggestion[]> {
        const searchParams = new URLSearchParams();

        if (keyword?.trim()) {
            searchParams.set("keyword", keyword.trim());
        }

        const queryString = searchParams.toString();

        const response = await apiClient(
            `/account-books/${accountBookId}/transactions/stores/suggestions${
                queryString ? `?${queryString}` : ""
            }`,
            { method: "GET" }
        );

        if (!response.ok) {
            throw new Error("Failed to get store suggestions.");
        }

        const data =
            (await response.json()) as ResponseDto<AccountBookStoreSuggestion[]>;
        return data.body ?? [];
    },

    async listTransactions(
        accountBookId: number,
        request: AccountBookTransactionListRequest
    ): Promise<AccountBookTransactionListResponse> {
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

        const data =
            (await response.json()) as ResponseDto<AccountBookTransactionListResponse>;
        return data.body;
    },

    async listTransactionMonths(
        accountBookId: number
    ): Promise<AccountBookTransactionMonthOption[]> {
        const response = await apiClient(
            `/account-books/${accountBookId}/transactions/months`,
            {
                method: "GET",
            }
        );

        if (!response.ok) {
            throw new Error("Failed to get transaction months.");
        }

        const data =
            (await response.json()) as ResponseDto<AccountBookTransactionMonthOption[]>;
        return data.body ?? [];
    },

    async createTransaction(
        accountBookId: number,
        request: AccountBookTransactionCreateRequest
    ): Promise<AccountBookTransaction> {
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

    async updateTransaction(
        accountBookId: number,
        transactionId: number,
        request: AccountBookTransactionUpdateRequest
    ): Promise<AccountBookTransaction> {
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

    async deleteTransaction(
        accountBookId: number,
        transactionId: number
    ): Promise<boolean> {
        const response = await apiClient(
            `/account-books/${accountBookId}/transactions/${transactionId}`,
            {
                method: "DELETE",
            }
        );

        if (!response.ok) {
            throw new Error("Failed to delete transaction.");
        }

        const data = (await response.json()) as ResponseDto<boolean>;
        return data.body;
    },
};
