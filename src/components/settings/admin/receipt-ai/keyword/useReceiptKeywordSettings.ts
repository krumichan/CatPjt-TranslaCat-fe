import { SyntheticEvent, useMemo, useState } from "react";
import { useTranslations } from "next-intl";

import { useQuery } from "@/hooks/useQuery";
import { adminReceiptAiSettingService } from "@/services/admin/adminReceiptAiSettingService";
import {
    ReceiptKeyword,
    ReceiptKeywordType,
} from "@/types/receiptSetting";

export function useReceiptKeywordSettings() {
    const t = useTranslations("Settings.receiptAiPage.keyword");

    const [activeType, setActiveType] =
        useState<ReceiptKeywordType>("STOP_AFTER");
    const [keyword, setKeyword] = useState("");
    const [currencyCode, setCurrencyCode] = useState("");
    const [ocrLanguage, setOcrLanguage] = useState("japan");

    const [isCreating, setIsCreating] = useState(false);
    const [processingId, setProcessingId] = useState<number | null>(null);

    const [deleteTargetKeyword, setDeleteTargetKeyword] =
        useState<ReceiptKeyword | null>(null);

    const {
        data: keywords = [],
        isLoading,
        isError,
        mutate,
    } = useQuery({
        keys: ["admin-receipt-keywords"] as const,
        fetcher: () => adminReceiptAiSettingService.listKeywords(),
        config: {
            revalidateOnMount: true,
            revalidateIfStale: true,
        },
    });

    const filteredKeywords = useMemo(
        () =>
            keywords.filter(
                (item: ReceiptKeyword) => item.keywordType === activeType,
            ),
        [activeType, keywords],
    );

    const handleCreate = async (event: SyntheticEvent) => {
        event.preventDefault();

        const trimmedKeyword = keyword.trim();
        const trimmedCurrencyCode = currencyCode.trim().toUpperCase();

        if (!trimmedKeyword || isCreating) {
            return;
        }

        try {
            setIsCreating(true);

            const created = await adminReceiptAiSettingService.createKeyword({
                keywordType: activeType,
                keyword: trimmedKeyword,
                currencyCode: trimmedCurrencyCode || null,
                ocrLanguage,
                enabled: true,
                displayOrder: 0,
            });

            await mutate((currentData) => {
                if (!currentData) {
                    return [created];
                }

                return [created, ...currentData];
            }, false);

            setKeyword("");
            setCurrencyCode("");
        } catch (error) {
            console.error(error);
            window.alert(t("messages.createFailed"));
        } finally {
            setIsCreating(false);
        }
    };

    const handleToggleEnabled = async (target: ReceiptKeyword) => {
        if (processingId !== null) {
            return;
        }

        try {
            setProcessingId(target.id);

            const updated = await adminReceiptAiSettingService.updateKeyword(
                target.id,
                {
                    keywordType: target.keywordType,
                    keyword: target.keyword,
                    currencyCode: target.currencyCode,
                    ocrLanguage: target.ocrLanguage,
                    enabled: !target.enabled,
                    displayOrder: target.displayOrder,
                },
            );

            await mutate((currentData) => {
                if (!currentData) {
                    return currentData;
                }

                return currentData.map((item: ReceiptKeyword) =>
                    item.id === updated.id ? updated : item,
                );
            }, false);
        } catch (error) {
            console.error(error);
            window.alert(t("messages.updateFailed"));
        } finally {
            setProcessingId(null);
        }
    };

    const openDeleteConfirm = (target: ReceiptKeyword) => {
        if (processingId !== null) {
            return;
        }

        setDeleteTargetKeyword(target);
    };

    const closeDeleteConfirm = () => {
        if (processingId !== null) {
            return;
        }

        setDeleteTargetKeyword(null);
    };

    const confirmDelete = async () => {
        if (!deleteTargetKeyword || processingId !== null) {
            return;
        }

        try {
            setProcessingId(deleteTargetKeyword.id);

            await adminReceiptAiSettingService.deleteKeyword(
                deleteTargetKeyword.id,
            );

            await mutate((currentData) => {
                if (!currentData) {
                    return currentData;
                }

                return currentData.filter(
                    (item: ReceiptKeyword) =>
                        item.id !== deleteTargetKeyword.id,
                );
            }, false);

            setDeleteTargetKeyword(null);
        } catch (error) {
            console.error(error);
            window.alert(t("messages.deleteFailed"));
        } finally {
            setProcessingId(null);
        }
    };

    return {
        activeType,
        setActiveType,

        keyword,
        setKeyword,

        currencyCode,
        setCurrencyCode,

        ocrLanguage,
        setOcrLanguage,

        filteredKeywords,

        isLoading,
        isError,
        isCreating,
        processingId,

        deleteTargetKeyword,
        isDeleteConfirmOpen: deleteTargetKeyword !== null,
        isDeleting:
            deleteTargetKeyword !== null &&
            processingId === deleteTargetKeyword.id,

        handleCreate,
        handleToggleEnabled,
        openDeleteConfirm,
        closeDeleteConfirm,
        confirmDelete,
    };
}