"use client";

import { useTranslations } from "next-intl";
import type { CurrencyCode } from "@/types/accountBook";
import { useAccountBookFixedCostController } from "@/hooks/account-book/detail/useAccountBookFixedCostController";
import FixedCostSection from "@/components/account-book/detail/FixedCostSection";
import FixedCostFormModal from "@/components/account-book/detail/modal/FixedCostFormModal";
import FixedCostGenerationBanner from "@/components/account-book/detail/fixed-cost/FixedCostGenerationBanner";
import ConfirmModal from "@/components/common/ConfirmModal";

type AccountBookFixedCostSmartSectionProps = {
    accountBookId: number;
    selectedMonth: string;
    currencyCode: CurrencyCode;
};

export default function AccountBookFixedCostSmartSection({
    accountBookId,
    selectedMonth,
    currencyCode,
}: AccountBookFixedCostSmartSectionProps) {
    const t = useTranslations("AccountBook.detail");
    const {
        fixedCostGenerationTargets,
        isGeneratingFixedCostTransactions,
        handleGenerateFixedCostTransactions,
        fixedCosts,
        isFixedCostsLoading,
        fixedCostsError,
        setIsCreateFixedCostModalOpen,
        setEditingFixedCost,
        setDeletingFixedCost,
        handleChangeFixedCostActive,
        isCreateFixedCostModalOpen,
        editingFixedCost,
        categoryOptions,
        storeOptions,
        handleCloseFixedCostModal,
        handleSubmitFixedCost,
        deletingFixedCost,
        handleDeleteFixedCost
    } = useAccountBookFixedCostController({
        accountBookId, selectedMonth,
    });

    return (
        <>
            <FixedCostGenerationBanner
                generationTargets={fixedCostGenerationTargets}
                currencyCode={currencyCode}
                isLoading={isGeneratingFixedCostTransactions}
                onClickGenerate={handleGenerateFixedCostTransactions}
            />

            <FixedCostSection
                fixedCosts={fixedCosts}
                currencyCode={currencyCode}
                isLoading={isFixedCostsLoading}
                errorMessage={fixedCostsError}
                onClickCreateFixedCost={() => setIsCreateFixedCostModalOpen(true)}
                onClickEditFixedCost={setEditingFixedCost}
                onClickDeleteFixedCost={setDeletingFixedCost}
                onChangeActive={handleChangeFixedCostActive}
            />

            <FixedCostFormModal
                isOpen={isCreateFixedCostModalOpen || editingFixedCost !== null}
                fixedCost={editingFixedCost}
                currencyCode={currencyCode}
                categoryOptions={categoryOptions}
                storeOptions={storeOptions}
                onClose={handleCloseFixedCostModal}
                onSubmit={handleSubmitFixedCost}
            />

            <ConfirmModal
                isOpen={deletingFixedCost !== null}
                title={t("fixedCost.deleteConfirm.title")}
                description={t(
                    "fixedCost.deleteConfirm.description",
                    {
                        title: deletingFixedCost?.title ?? "",
                    }
                )}
                confirmLabel={t("fixedCost.deleteConfirm.confirm")}
                variant="danger"
                onClose={() => setDeletingFixedCost(null)}
                onConfirm={handleDeleteFixedCost}
            />
        </>
    );
}
