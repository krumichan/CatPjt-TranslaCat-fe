import { apiClient } from "@/lib/apiClient";
import { ResponseDto } from "@/types/common";
import {
    ReceiptKeyword,
    ReceiptKeywordCreateRequest,
    ReceiptKeywordUpdateRequest,
    ReceiptOcrSetting,
    ReceiptOcrSettingUpdateRequest,
} from "@/types/receiptSetting";

export const adminReceiptAiSettingService = {
    async listOcrSettings(): Promise<ReceiptOcrSetting[]> {
        const response = await apiClient("/admin/receipt-ocr-settings", {
            method: "GET",
        });

        if (!response.ok) {
            throw new Error("Failed to load receipt OCR settings.");
        }

        const data = (await response.json()) as ResponseDto<
            ReceiptOcrSetting[]
        >;

        return data.body ?? [];
    },

    async updateOcrSetting(
        settingId: number,
        request: ReceiptOcrSettingUpdateRequest,
    ): Promise<ReceiptOcrSetting> {
        const response = await apiClient(
            `/admin/receipt-ocr-settings/${settingId}`,
            {
                method: "PUT",
                body: JSON.stringify(request),
            },
        );

        if (!response.ok) {
            throw new Error("Failed to update receipt OCR setting.");
        }

        const data = (await response.json()) as ResponseDto<ReceiptOcrSetting>;
        return data.body;
    },

    async listKeywords(): Promise<ReceiptKeyword[]> {
        const response = await apiClient("/admin/receipt-keywords", {
            method: "GET",
        });

        if (!response.ok) {
            throw new Error("Failed to load receipt keywords.");
        }

        const data = (await response.json()) as ResponseDto<ReceiptKeyword[]>;
        return data.body ?? [];
    },

    async createKeyword(
        request: ReceiptKeywordCreateRequest,
    ): Promise<ReceiptKeyword> {
        const response = await apiClient("/admin/receipt-keywords", {
            method: "POST",
            body: JSON.stringify(request),
        });

        if (!response.ok) {
            throw new Error("Failed to create receipt keyword.");
        }

        const data = (await response.json()) as ResponseDto<ReceiptKeyword>;
        return data.body;
    },

    async updateKeyword(
        keywordId: number,
        request: ReceiptKeywordUpdateRequest,
    ): Promise<ReceiptKeyword> {
        const response = await apiClient(
            `/admin/receipt-keywords/${keywordId}`,
            {
                method: "PUT",
                body: JSON.stringify(request),
            },
        );

        if (!response.ok) {
            throw new Error("Failed to update receipt keyword.");
        }

        const data = (await response.json()) as ResponseDto<ReceiptKeyword>;
        return data.body;
    },

    async deleteKeyword(keywordId: number): Promise<boolean> {
        const response = await apiClient(
            `/admin/receipt-keywords/${keywordId}`,
            {
                method: "DELETE",
            },
        );

        if (!response.ok) {
            throw new Error("Failed to delete receipt keyword.");
        }

        const data = (await response.json()) as ResponseDto<boolean>;
        return data.body;
    },
};