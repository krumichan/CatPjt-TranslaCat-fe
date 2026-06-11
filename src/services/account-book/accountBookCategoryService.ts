import {AccountBookCategory} from "@/types/accountBook";
import {apiClient} from "@/lib/apiClient";
import {ResponseDto} from "@/types/common";

export const accountBookCategoryService = {
    async listCategories(accountBookId: number | string): Promise<AccountBookCategory[]> {
        const response = await apiClient(`/account-books/${accountBookId}/categories`, {
            method: "GET",
        });

        if (!response.ok) {
            throw new Error("Failed to get categories.");
        }

        const data = await response.json() as ResponseDto<AccountBookCategory[]>;
        return data.body;
    },
};