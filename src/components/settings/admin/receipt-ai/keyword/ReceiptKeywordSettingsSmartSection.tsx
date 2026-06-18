"use client";

import { useTranslations } from "next-intl";

import ConfirmModal from "@/components/common/ConfirmModal";
import ReceiptKeywordSettingsSection from "@/components/settings/admin/receipt-ai/keyword/ReceiptKeywordSettingsSection";
import { useReceiptKeywordSettings } from "@/components/settings/admin/receipt-ai/keyword/useReceiptKeywordSettings";

export default function ReceiptKeywordSettingsSmartSection() {
    const t = useTranslations("Settings.receiptAiPage.keyword");
    const keywordSettings = useReceiptKeywordSettings();

    return (
        <>
            <ReceiptKeywordSettingsSection
                activeType={keywordSettings.activeType}
                keyword={keywordSettings.keyword}
                currencyCode={keywordSettings.currencyCode}
                ocrLanguage={keywordSettings.ocrLanguage}
                filteredKeywords={keywordSettings.filteredKeywords}
                isLoading={keywordSettings.isLoading}
                isError={keywordSettings.isError}
                isCreating={keywordSettings.isCreating}
                processingId={keywordSettings.processingId}
                onActiveTypeChange={keywordSettings.setActiveType}
                onKeywordChange={keywordSettings.setKeyword}
                onCurrencyCodeChange={keywordSettings.setCurrencyCode}
                onOcrLanguageChange={keywordSettings.setOcrLanguage}
                onCreate={keywordSettings.handleCreate}
                onToggleEnabled={keywordSettings.handleToggleEnabled}
                onDeleteClick={keywordSettings.openDeleteConfirm}
            />

            <ConfirmModal
                isOpen={keywordSettings.isDeleteConfirmOpen}
                title={t("deleteModal.title")}
                description={
                    keywordSettings.deleteTargetKeyword
                        ? t("deleteModal.description", {
                            keyword:
                            keywordSettings.deleteTargetKeyword.keyword,
                        })
                        : undefined
                }
                confirmLabel={t("deleteModal.confirm")}
                variant="danger"
                isLoading={keywordSettings.isDeleting}
                closeOnBackdrop={!keywordSettings.isDeleting}
                onClose={keywordSettings.closeDeleteConfirm}
                onConfirm={keywordSettings.confirmDelete}
            />
        </>
    );
}