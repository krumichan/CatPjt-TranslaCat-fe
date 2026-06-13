import {
    AccountBookMonthlyGoal,
    AccountBookMonthlyGoalListResponse,
    AccountBookMonthlyGoalRequest
} from "@/types/accountBook";
import {apiClient} from "@/lib/apiClient";
import {ResponseDto} from "@/types/common";

export const accountBookMonthlyGoalService = {
    async getMonthlyGoal(
        accountBookId: number,
        year: number,
        month: number
    ): Promise<AccountBookMonthlyGoal> {
        const response = await apiClient(
            `/account-books/${accountBookId}/monthly-goals?year=${year}&month=${month}`,
            {
                method: "GET",
            }
        );

        if (!response.ok) {
            throw new Error("Failed to get monthly goal.");
        }

        const data = (await response.json()) as ResponseDto<AccountBookMonthlyGoal>;
        return data.body;
    },

    async listMonthlyGoals(
        accountBookId: number
    ): Promise<AccountBookMonthlyGoalListResponse> {
        const response = await apiClient(
            `/account-books/${accountBookId}/monthly-goals/list`,
            {
                method: "GET",
            }
        );

        if (!response.ok) {
            throw new Error("Failed to get monthly goal list.");
        }

        const data =
            (await response.json()) as ResponseDto<AccountBookMonthlyGoalListResponse>;

        return data.body;
    },

    async saveMonthlyGoal(
        accountBookId: number,
        request: AccountBookMonthlyGoalRequest
    ): Promise<AccountBookMonthlyGoal> {
        const response = await apiClient(
            `/account-books/${accountBookId}/monthly-goals`,
            {
                method: "PUT",
                body: JSON.stringify(request),
            }
        );

        if (!response.ok) {
            throw new Error("Failed to save monthly goal.");
        }

        const data = (await response.json()) as ResponseDto<AccountBookMonthlyGoal>;
        return data.body;
    },

    async deleteMonthlyGoal(
        accountBookId: number,
        year: number,
        month: number
    ): Promise<void> {
        const response = await apiClient(
            `/account-books/${accountBookId}/monthly-goals?year=${year}&month=${month}`,
            {
                method: "DELETE",
            }
        );

        if (!response.ok) {
            throw new Error("Failed to delete monthly goal.");
        }
    },
}