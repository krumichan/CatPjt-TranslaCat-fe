"use client";

import { useTranslations } from "next-intl";

import ConfirmModal from "@/components/common/ConfirmModal";
import CurrencyCreateForm from "@/components/settings/admin/currency/CurrencyCreateForm";
import CurrencyEditModal from "@/components/settings/admin/currency/modal/CurrencyEditModal";
import CurrencyListSection from "@/components/settings/admin/currency/CurrencyListSection";
import CurrencySettingsHeader from "@/components/settings/admin/currency/CurrencySettingsHeader";
import { useCurrencySettings } from "@/components/settings/admin/currency/useCurrencySettings";

export default function CurrencySettingsSmartPage() {
    const t = useTranslations("Settings.currencyPage");
    const currencySettings = useCurrencySettings();

    if (currencySettings.status === "loading") {
        return (
            <div className="mx-auto w-full max-w-6xl px-4 py-10 pt-24 text-sm text-slate-500 dark:text-slate-400 sm:px-6 lg:px-8">
                {t("messages.loading")}
            </div>
        );
    }

    if (!currencySettings.isAdmin) {
        return (
            <div className="mx-auto w-full max-w-6xl px-4 py-10 pt-24 text-sm text-red-500 dark:text-red-300 sm:px-6 lg:px-8">
                {t("messages.forbidden")}
            </div>
        );
    }

    return (
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-4 py-10 pt-24 sm:px-6 lg:px-8">
            <div className="flex flex-col gap-4">
                <CurrencySettingsHeader />
            </div>

            {currencySettings.errorMessage && (
                <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-500 dark:border-red-500/20 dark:bg-red-500/10 dark:text-red-300">
                    {currencySettings.errorMessage}
                </div>
            )}

            <CurrencyCreateForm
                code={currencySettings.code}
                name={currencySettings.name}
                symbol={currencySettings.symbol}
                decimalPlaces={currencySettings.decimalPlaces}
                baseCurrency={currencySettings.baseCurrency}
                canSubmit={currencySettings.canSubmit}
                isSubmitting={currencySettings.isSubmitting}
                onChangeCode={currencySettings.setCode}
                onChangeName={currencySettings.setName}
                onChangeSymbol={currencySettings.setSymbol}
                onChangeDecimalPlaces={currencySettings.setDecimalPlaces}
                onChangeBaseCurrency={currencySettings.setBaseCurrency}
                onSubmit={currencySettings.handleSubmit}
            />

            <CurrencyListSection
                currencies={currencySettings.filteredCurrencies}
                keyword={currencySettings.keyword}
                isLoading={currencySettings.isLoading}
                onChangeKeyword={currencySettings.setKeyword}
                onSetBaseCurrency={currencySettings.handleSetBaseCurrency}
                onToggleEnabled={currencySettings.handleToggleEnabled}
                onEdit={currencySettings.openEditModal}
                onDelete={currencySettings.openDeleteConfirm}
            />

            <CurrencyEditModal
                isOpen={currencySettings.isEditModalOpen}
                currency={currencySettings.editingCurrency}
                isUpdating={currencySettings.isUpdating}
                onClose={currencySettings.closeEditModal}
                onSubmit={currencySettings.handleUpdateCurrency}
            />

            <ConfirmModal
                isOpen={currencySettings.isDeleteConfirmOpen}
                title={t("deleteModal.title")}
                description={
                    currencySettings.deleteTargetCurrency
                        ? t("deleteModal.description", {
                            code: currencySettings.deleteTargetCurrency.code,
                        })
                        : undefined
                }
                confirmLabel={t("deleteModal.confirm")}
                variant="danger"
                isLoading={currencySettings.isDeleting}
                closeOnBackdrop={!currencySettings.isDeleting}
                onClose={currencySettings.closeDeleteConfirm}
                onConfirm={currencySettings.handleDeleteCurrency}
            />
        </div>
    );
}