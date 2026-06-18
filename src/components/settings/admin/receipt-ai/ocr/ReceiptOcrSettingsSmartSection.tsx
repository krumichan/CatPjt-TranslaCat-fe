"use client";

import ReceiptOcrSettingsSection from "@/components/settings/admin/receipt-ai/ocr/ReceiptOcrSettingsSection";
import { useReceiptOcrSettings } from "@/components/settings/admin/receipt-ai/ocr/useReceiptOcrSettings";

export default function ReceiptOcrSettingsSmartSection() {
    const ocrSettings = useReceiptOcrSettings();

    return (
        <ReceiptOcrSettingsSection
            settings={ocrSettings.settings}
            isLoading={ocrSettings.isLoading}
            isError={ocrSettings.isError}
            savingId={ocrSettings.savingId}
            onChange={ocrSettings.handleChange}
        />
    );
}