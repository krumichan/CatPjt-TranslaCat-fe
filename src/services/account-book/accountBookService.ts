import { apiClient } from "@/lib/apiClient";
import {
    AccountBook,
    AccountBookSearchCondition,
    AccountBookTransactionListRequest,
    AccountBookTransactionListResponse,
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
    }
};