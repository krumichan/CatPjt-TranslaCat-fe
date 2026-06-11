import { apiClient } from "@/lib/apiClient";
import {
    AccountBook,
    AccountBookSearchCondition, AccountBookStoreSuggestion, AccountBookSummaryResponse,
    AccountBookTransactionListRequest,
    AccountBookTransactionListResponse, AccountBookTransactionMonthOption,
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

    async listStoreSuggestions(
        accountBookId: number | string,
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
        accountBookId: number | string,
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
        accountBookId: number | string
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

    async getSummary(
        accountBookId: number | string,
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
    }
};