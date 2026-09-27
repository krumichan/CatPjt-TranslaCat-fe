import { useReceiptAnalysisPanel } from "@/hooks/account-book/detail/receipt/useReceiptAnalysisPanel";
import type { ReceiptQueueItem } from "@/types/accountBookReceiptReview";
import { ChevronDown, ChevronUp, ImagePlus, Sparkles } from "lucide-react";
import { useTranslations } from "next-intl";
import ReceiptFileQueueItem from "./ReceiptFileQueueItem";
import type { ReceiptAnalysisMode } from "@/types/accountBook";
import { selectClassName } from "./constants";
import ReceiptSourceRegionPicker from "./ReceiptSourceRegionPicker";

type Props = {
    receiptQueue: ReceiptQueueItem[];
    receiptAnalysisMode: ReceiptAnalysisMode;
    receiptAnalysisMessage: string | null;
    isAnalyzingReceipt: boolean;
    disabled: boolean;
    canAnalyzeReceipt: boolean;
    onAnalysisModeChange: (mode: ReceiptAnalysisMode) => void;
    onFilesChange: (files: File[]) => void;
    onAnalyzeReceipt: () => void;
    onRemove: (sourceImageId: string) => void;
    onCancel: (sourceImageId: string) => void;
    onRetry: (sourceImageId: string) => void;
    reviewAssisted: boolean;
    onAddMissingReceipt: (
        sourceImageId: string,
        revision: number,
        fileName: string,
        region: number[]
    ) => void;
};

export default function ReceiptAnalysisPanel({
    receiptQueue,
    receiptAnalysisMode,
    receiptAnalysisMessage,
    isAnalyzingReceipt,
    disabled,
    canAnalyzeReceipt,
    onAnalysisModeChange,
    onFilesChange,
    onAnalyzeReceipt,
    onRemove,
    onCancel,
    onRetry,
    reviewAssisted,
    onAddMissingReceipt,
}: Props) {
    const t = useTranslations("AccountBook.detail.transactionModal");
    const {
        expanded,
        receiptCount,
        progressCount,
        failureCount,
        toggle,
        regionSource,
        setRegionSourceId,
        closeRegionPicker,
    } = useReceiptAnalysisPanel(receiptQueue);
    return (
        <div className="mb-3 min-w-0 shrink-0 rounded-2xl border border-slate-200 bg-slate-50/90 p-3 sm:p-4 dark:border-white/10 dark:bg-black/25">
            <button
                type="button"
                onClick={toggle}
                aria-expanded={expanded}
                aria-controls="receipt-analysis-content"
                className="flex w-full items-center justify-between gap-3 rounded-lg text-left focus:outline-none focus:ring-2 focus:ring-orange-500/30"
            >
                <span className="flex min-w-0 items-center gap-2 text-sm font-semibold text-slate-700 dark:text-slate-200">
                    <ImagePlus
                        size={18}
                        className="shrink-0"
                    />
                    <span className="truncate">
                        {t("receipt.title")}
                    </span>
                </span>
                <span className="flex shrink-0 items-center gap-2 text-[11px] text-slate-500 dark:text-slate-300">
                    {t(
                        "receipt.summary",
                        {
                            photos: receiptQueue.length,
                            receipts: receiptCount,
                            progress: progressCount,
                            failures: failureCount
                        }
                    )}
                    {expanded ? <ChevronUp size={17} /> : <ChevronDown size={17} />}
                </span>
            </button>
            <div
                id="receipt-analysis-content"
                hidden={!expanded}
                className="max-h-[min(48dvh,32rem)] overflow-y-auto overscroll-contain pr-1"
            >
                <p className="rounded-xl bg-orange-50 px-3 py-2 text-xs text-orange-700 dark:bg-orange-500/10 dark:text-orange-300">
                    {t("receipt.description")}
                </p>
                <label className="mt-4 block">
                    <span className="mb-2 block text-sm font-semibold text-slate-700 dark:text-slate-200">
                        {t("receipt.analysisMode")}
                    </span>
                    <select
                        value={receiptAnalysisMode}
                        disabled={disabled || isAnalyzingReceipt}
                        onChange={(event) => onAnalysisModeChange(event.target.value as ReceiptAnalysisMode)}
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
                        multiple
                        disabled={disabled || receiptQueue.length >= 10}
                        accept="image/jpeg,image/png,image/webp"
                        onChange={(event) => {
                            onFilesChange(Array.from(event.target.files ?? []));
                            event.target.value = "";
                        }}
                        className="block w-full min-w-0 max-w-full cursor-pointer rounded-xl border border-slate-300 bg-white px-2 py-3 text-xs text-slate-600 file:mr-2 file:rounded-lg file:border-0 file:bg-orange-50 file:px-2 file:py-2 file:text-xs file:font-semibold file:text-orange-600 dark:border-white/10 dark:bg-black/30 dark:text-slate-300"
                    />
                </label>
                {receiptQueue.length > 0 && (
                    <ul
                        className="mt-3 grid min-w-0 grid-cols-1 gap-2 sm:grid-cols-2"
                        data-testid="receipt-file-queue"
                    >
                        {receiptQueue.map((item) => (
                            <ReceiptFileQueueItem
                                key={item.sourceImageId}
                                item={item}
                                reviewAssisted={reviewAssisted}
                                onCancel={onCancel}
                                onRetry={onRetry}
                                onRemove={onRemove}
                                onSelectRegion={setRegionSourceId}
                            />
                        ))}
                    </ul>
                )}
                {receiptAnalysisMessage && (
                    <p
                        role="status"
                        className="mt-3 rounded-xl bg-slate-100 px-3 py-2 text-xs text-slate-600 dark:bg-white/10 dark:text-slate-300"
                    >
                        {receiptAnalysisMessage}
                    </p>
                )}
                <button
                    type="button"
                    onClick={onAnalyzeReceipt}
                    disabled={!canAnalyzeReceipt || isAnalyzingReceipt}
                    className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-orange-500 px-4 py-3 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:bg-slate-300 dark:disabled:bg-slate-700"
                >
                    <Sparkles size={18} />
                    {isAnalyzingReceipt ? t("receipt.analyzing") : t("receipt.action")}
                </button>
            </div>
            {reviewAssisted && regionSource && (
                <ReceiptSourceRegionPicker
                    source={{
                        sourceImageId: regionSource.sourceImageId,
                        previewUrl: regionSource.previewUrl,
                        fileName: regionSource.file.name,
                        revision: regionSource.revision,
                    }}
                    onClose={closeRegionPicker}
                    onAdd={(region) => {
                        onAddMissingReceipt(
                            regionSource.sourceImageId,
                            regionSource.revision,
                            regionSource.file.name,
                            region,
                        );
                        closeRegionPicker();
                    }}
                />
            )}
        </div>
    );
}
