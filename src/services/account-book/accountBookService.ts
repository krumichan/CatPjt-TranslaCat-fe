import { apiClient } from "@/lib/apiClient";
import {
    AccountBook,
    AccountBookSearchCondition, AccountBookStoreSuggestion, AccountBookSummaryResponse, AccountBookTransaction,
    AccountBookTransactionCreateRequest,
    AccountBookTransactionListRequest,
    AccountBookTransactionListResponse, AccountBookTransactionMonthOption, AccountBookTransactionUpdateRequest,
    AccountBookUpdateRequest,
    CreateAccountBookRequest,
} from "@/types/accountBook";
import { ResponseDto } from "@/types/common";

function buildSearchParams(condition?: AccountBookSearchCondition) {
    const params = new URLSearchParams();

    if (condition?.keyword?.trim()) {
        params.set("keyword", condition.keyword.trim());
    }

    if (condition?.category?.trim()) {
        params.set("category", condition.category.trim());
    }

    const queryString = params.toString();
    return queryString ? `?${queryString}` : "";
}

export const accountBookService = {
    async get(accountBookId: number): Promise<AccountBook> {
        const response = await apiClient(`/account-books/${accountBookId}`, {
            method: "GET",
        });

        if (!response.ok) {
            throw new Error("Failed to get account book.");
        }

        const data = (await response.json()) as ResponseDto<AccountBook>;
        return data.body;
    },

    async getSummary(
        accountBookId: number,
        condition?: {
            year: number;
            month: number;
        }
    ): Promise<AccountBookSummaryResponse> {
        const searchParams = new URLSearchParams();

        if (condition) {
            searchParams.set("year", String(condition.year));
            searchParams.set("month", String(condition.month));
        }

        const queryString = searchParams.toString();

        const response = await apiClient(
            `/account-books/${accountBookId}/summary${
                queryString ? `?${queryString}` : ""
            }`,
            {
                method: "GET",
            }
        );

        if (!response.ok) {
            throw new Error("Failed to get account book summary.");
        }

        const data = (await response.json()) as ResponseDto<AccountBookSummaryResponse>;

        return data.body;
    },

    async list(condition?: AccountBookSearchCondition): Promise<AccountBook[]> {
        const response = await apiClient(
            `/account-books${buildSearchParams(condition)}`,
            {
                method: "GET",
            }
        );

        if (!response.ok) {
            throw new Error("Failed to load account books.");
        }

        const data = (await response.json()) as ResponseDto<AccountBook[]>;
        return data.body ?? [];
    },

    async register(request: CreateAccountBookRequest): Promise<AccountBook> {
        const response = await apiClient("/account-books", {
            method: "POST",
            body: JSON.stringify(request),
        });

        if (!response.ok) {
            throw new Error("Failed to create account book.");
        }

        const data = (await response.json()) as ResponseDto<AccountBook>;
        return data.body;
    },

    async update(
        accountBookId: number,
        request: AccountBookUpdateRequest
    ): Promise<AccountBook> {
        const response = await apiClient(`/account-books/${accountBookId}`, {
            method: "PUT",
            body: JSON.stringify(request),
        });

        if (!response.ok) {
            throw new Error("Failed to update account book.");
        }

        const data = (await response.json()) as ResponseDto<AccountBook>;
        return data.body;
    },

    async remove(accountBookId: number): Promise<boolean> {
        const response = await apiClient(`/account-books/${accountBookId}`, {
            method: "DELETE",
        });

        if (!response.ok) {
            throw new Error("Failed to delete account book.");
        }

        const data = (await response.json()) as ResponseDto<boolean>;
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
            `/account-books/${accountBookId}/transactions/stores/suggestions${queryString ? `?${queryString}` : ""}`,
            { method: "GET" }
        );

        if (!response.ok) {
            throw new Error("Failed to get store suggestions.");
        }

        const data = await response.json() as ResponseDto<AccountBookStoreSuggestion[]>;
        return data.body;
    },

    async listTransactions(
        accountBookId: number,
        request: AccountBookTransactionListRequest
    ): Promise<AccountBookTransactionListResponse> {
        const response = await apiClient(`/account-books/${accountBookId}/transactions`, {
            method: "POST",
            body: JSON.stringify(request),
        });

        if (!response.ok) {
            throw new Error("Failed to create account book.");
        }

        const data = (await response.json()) as ResponseDto<AccountBookTransactionListResponse>;
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

        const data = await response.json() as ResponseDto<AccountBookTransactionMonthOption[]>;
        return data.body;
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