import { apiClient } from "@/lib/apiClient";
import { ResponseDto } from "@/types/common";
import { AdminCurrency, CurrencyCreateRequest } from "@/types/currency";

export const adminCurrencyService = {
    async list(): Promise<AdminCurrency[]> {
        const response = await apiClient("/admin/currencies", {
            method: "GET",
        });

        if (!response.ok) {
            throw new Error("Failed to load admin currencies.");
        }

        const data = (await response.json()) as ResponseDto<AdminCurrency[]>;
        return data.body ?? [];
    },

    async create(request: CurrencyCreateRequest): Promise<AdminCurrency> {
        const response = await apiClient("/admin/currencies", {
            method: "POST",
            body: JSON.stringify(request),
        });

        if (!response.ok) {
            throw new Error("Failed to create currency.");
        }

        const data = (await response.json()) as ResponseDto<AdminCurrency>;
        return data.body;
    },

    async updateEnabled(
        currencyId: number,
        enabled: boolean
    ): Promise<AdminCurrency> {
        const response = await apiClient(
            `/admin/currencies/${currencyId}/enabled`,
            {
                method: "PATCH",
                body: JSON.stringify({ enabled }),
            }
        );

        if (!response.ok) {
            throw new Error("Failed to update currency enabled status.");
        }

        const data = (await response.json()) as ResponseDto<AdminCurrency>;
        return data.body;
    },

    async setBaseCurrency(currencyId: number): Promise<AdminCurrency> {
        const response = await apiClient(
            `/admin/currencies/${currencyId}/base`,
            {
                method: "PATCH",
            }
        );

        if (!response.ok) {
            throw new Error("Failed to set base currency.");
        }

        const data = (await response.json()) as ResponseDto<AdminCurrency>;
        return data.body;
    },
};