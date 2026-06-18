"use client";

import { useTranslations } from "next-intl";

import SettingsSubPageHeader from "@/components/settings/SettingsSubPageHeader";
import ReceiptOcrSettingsSmartSection from "@/components/settings/admin/receipt-ai/ocr/ReceiptOcrSettingsSmartSection";
import ReceiptKeywordSettingsSmartSection from "@/components/settings/admin/receipt-ai/keyword/ReceiptKeywordSettingsSmartSection";

export default function AdminReceiptAiSettingsPage() {
    const t = useTranslations("Settings.receiptAiPage");

    return (
        <div className="mx-auto pt-24 flex w-full max-w-6xl flex-col gap-8 px-4 py-10 sm:px-6 lg:px-8">
            <SettingsSubPageHeader
                eyebrow={t("eyebrow")}
                title={t("title")}
                description={t("description")}
            />

            <ReceiptOcrSettingsSmartSection />
            <ReceiptKeywordSettingsSmartSection />
        </div>
    );
}