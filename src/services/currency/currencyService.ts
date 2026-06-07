import { apiClient } from "@/lib/apiClient";
import { Currency } from "@/types/accountBook";
import { ResponseDto } from "@/types/common";

export const currencyService = {
    async list(): Promise<Currency[]> {
        const response = await apiClient("/currencies", {
            method: "GET",
        });

        if (!response.ok) {
            throw new Error("Failed to load currencies.");
        }

        const data = (await response.json()) as ResponseDto<Currency[]>;
        return data.body ?? [];
    },
};