import { ImagePlus, Sparkles } from "lucide-react";
import { useTranslations } from "next-intl";

import { ReceiptAnalysisMode } from "@/types/accountBook";
import {selectClassName} from "@/components/account-book/detail/modal/transaction-form/constants";

type ReceiptAnalysisPanelProps = {
    receiptFile: File | null;
    receiptAnalysisMode: ReceiptAnalysisMode;
    receiptAnalysisMessage: string | null;
    isAnalyzingReceipt: boolean;
    disabled: boolean;
    canAnalyzeReceipt: boolean;
    onAnalysisModeChange: (mode: ReceiptAnalysisMode) => void;
    onFileChange: (file: File | null) => void;
    onAnalyzeReceipt: () => void;
};

export default function ReceiptAnalysisPanel({
    receiptFile,
    receiptAnalysisMode,
    receiptAnalysisMessage,
    isAnalyzingReceipt,
    disabled,
    canAnalyzeReceipt,
    onAnalysisModeChange,
    onFileChange,
    onAnalyzeReceipt,
}: ReceiptAnalysisPanelProps) {
    const t = useTranslations("AccountBook.detail.transactionModal");

    return (
        <div className="mb-5 min-w-0 rounded-2xl border border-slate-200 bg-slate-50/90 p-3 sm:p-4 dark:border-white/10 dark:bg-black/25">
            <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-700 dark:text-slate-200">
                <ImagePlus size={18} />
                {t("receipt.title")}
            </div>

            <p className="rounded-xl bg-orange-50 px-3 py-2 text-xs text-orange-700 dark:bg-orange-500/10 dark:text-orange-300">
                {t("receipt.description")}
            </p>

            <label className="mt-4 block">
                <span className="mb-2 block text-sm font-semibold text-slate-700 dark:text-slate-200">
                    {t("receipt.analysisMode")}
                </span>

                <select
                    value={receiptAnalysisMode}
                    disabled={disabled}
                    onChange={(event) =>
                        onAnalysisModeChange(
                            event.target.value as ReceiptAnalysisMode,
                        )
                    }
                    className={selectClassName}
                >
                    <option value="VISION_ONLY">
                        {t("receipt.analysisModes.visionOnly")}
                    </option>
                    <option value="OCR_WITH_AI">
                        {t("receipt.analysisModes.ocrWithAi")}
                    </option>
                    <option value="VISION_FIRST">
                        {t("receipt.analysisModes.visionFirst")}
                    </option>
                    <option value="OCR_ONLY">
                        {t("receipt.analysisModes.ocrOnly")}
                    </option>
                </select>
            </label>

            <label className="mt-4 block">
                <span className="mb-2 block text-sm font-semibold text-slate-700 dark:text-slate-200">
                    {t("receipt.file")}
                </span>

                <input
                    type="file"
                    disabled={disabled}
                    accept="image/jpeg,image/png,image/webp"
                    onChange={(event) =>
                        onFileChange(event.target.files?.[0] ?? null)
                    }
                    className="block w-full min-w-0 max-w-full cursor-pointer rounded-xl border border-slate-300 bg-white px-2 py-3 text-xs text-slate-600 file:mr-2 file:rounded-lg file:border-0 file:bg-orange-50 file:px-2 file:py-2 file:text-xs file:font-semibold file:text-orange-600 hover:file:bg-orange-100 dark:border-white/10 dark:bg-black/30 dark:text-slate-300 dark:file:bg-orange-500/10 dark:file:text-orange-300"
                />
            </label>

            {receiptFile && (
                <p className="mt-2 break-all text-xs text-slate-500 dark:text-slate-400">
                    {t("receipt.selectedFile", {
                        filename: `${receiptFile.name} (${(
                            receiptFile.size /
                            1024 /
                            1024
                        ).toFixed(2)} MB)`,
                    })}
                </p>
            )}

            {receiptAnalysisMessage && (
                <p role="status" className="mt-3 rounded-xl bg-slate-100 px-3 py-2 text-xs text-slate-600 dark:bg-white/10 dark:text-slate-300">
                    {receiptAnalysisMessage}
                </p>
            )}

            <button
                type="button"
                onClick={onAnalyzeReceipt}
                disabled={!canAnalyzeReceipt || isAnalyzingReceipt}
                className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-orange-500 px-4 py-3 text-sm font-semibold text-white shadow-[0_10px_20px_rgba(249,115,22,0.25)] transition hover:bg-orange-600 disabled:cursor-not-allowed disabled:bg-slate-300 disabled:shadow-none dark:disabled:bg-slate-700"
            >
                <Sparkles size={18} />
                {isAnalyzingReceipt
                    ? t("receipt.analyzing")
                    : t("receipt.action")}
            </button>
        </div>
    );
}
