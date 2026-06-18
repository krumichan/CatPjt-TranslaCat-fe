import { useState } from "react";
import { useTranslations } from "next-intl";

import { useQuery } from "@/hooks/useQuery";
import { adminReceiptAiSettingService } from "@/services/admin/adminReceiptAiSettingService";
import { ReceiptOcrSetting } from "@/types/receiptSetting";

export function useReceiptOcrSettings() {
    const t = useTranslations("Settings.receiptAiPage.ocr");

    const [savingId, setSavingId] = useState<number | null>(null);

    const {
        data: settings = [],
        isLoading,
        isError,
        mutate,
    } = useQuery({
        keys: ["admin-receipt-ocr-settings"] as const,
        fetcher: () => adminReceiptAiSettingService.listOcrSettings(),
        config: {
            revalidateOnMount: true,
            revalidateIfStale: true,
        },
    });

    const handleChange = async (
        setting: ReceiptOcrSetting,
        nextValue: Partial<ReceiptOcrSetting>,
    ) => {
        if (savingId !== null) {
            return;
        }

        const nextSetting = {
            ...setting,
            ...nextValue,
        };

        try {
            setSavingId(setting.id);

            const updated = await adminReceiptAiSettingService.updateOcrSetting(
                setting.id,
                {
                    ocrLanguage: nextSetting.ocrLanguage,
                    enabled: nextSetting.enabled,
                },
            );

            await mutate((currentData) => {
                if (!currentData) {
                    return currentData;
                }

                return currentData.map((item: ReceiptOcrSetting) =>
                    item.id === updated.id ? updated : item,
                );
            }, false);
        } catch (error) {
            console.error(error);
            window.alert(t("messages.updateFailed"));
        } finally {
            setSavingId(null);
        }
    };

    return {
        settings,
        isLoading,
        isError,
        savingId,
        handleChange,
    };
}