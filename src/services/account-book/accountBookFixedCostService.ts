import { apiClient } from "@/lib/apiClient";
import {
    AccountBookFixedCost,
    AccountBookFixedCostActiveRequest,
    AccountBookFixedCostRequest,
} from "@/types/accountBook";
import {ResponseDto} from "@/types/common";

export const accountBookFixedCostService = {
    async listFixedCosts(
        accountBookId: number | string
    ): Promise<AccountBookFixedCost[]> {
        const response = await apiClient(
            `/account-books/${accountBookId}/fixed-costs`,
            {
                method: "GET",
            }
        );

        if (!response.ok) {
            throw new Error("Failed to get fixed costs.");
        }

        const data =
            (await response.json()) as ResponseDto<AccountBookFixedCost[]>;

        return data.body;
    },

    async createFixedCost(
        accountBookId: number | string,
        request: AccountBookFixedCostRequest
    ): Promise<AccountBookFixedCost> {
        const response = await apiClient(
            `/account-books/${accountBookId}/fixed-costs`,
            {
                method: "POST",
                body: JSON.stringify(request),
            }
        );

        if (!response.ok) {
            throw new Error("Failed to create fixed cost.");
        }

        const data =
            (await response.json()) as ResponseDto<AccountBookFixedCost>;

        return data.body;
    },

    async updateFixedCost(
        accountBookId: number | string,
        fixedCostId: number | string,
        request: AccountBookFixedCostRequest
    ): Promise<AccountBookFixedCost> {
        const response = await apiClient(
            `/account-books/${accountBookId}/fixed-costs/${fixedCostId}`,
            {
                method: "PUT",
                body: JSON.stringify(request),
            }
        );

        if (!response.ok) {
            throw new Error("Failed to update fixed cost.");
        }

        const data =
            (await response.json()) as ResponseDto<AccountBookFixedCost>;

        return data.body;
    },

    async updateActive(
        accountBookId: number | string,
        fixedCostId: number | string,
        request: AccountBookFixedCostActiveRequest
    ): Promise<AccountBookFixedCost> {
        const response = await apiClient(
            `/account-books/${accountBookId}/fixed-costs/${fixedCostId}/active`,
            {
                method: "PATCH",
                body: JSON.stringify(request),
            }
        );

        if (!response.ok) {
            throw new Error("Failed to update fixed cost active status.");
        }

        const data =
            (await response.json()) as ResponseDto<AccountBookFixedCost>;

        return data.body;
    },
    async deleteFixedCost(
        accountBookId: number | string,
        fixedCostId: number | string
    ): Promise<void> {
        const response = await apiClient(
            `/account-books/${accountBookId}/fixed-costs/${fixedCostId}`,
            {
                method: "DELETE",
            }
        );

        if (!response.ok) {
            throw new Error("Failed to delete fixed cost.");
        }
    },

};