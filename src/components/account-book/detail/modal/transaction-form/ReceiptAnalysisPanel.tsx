import { ImagePlus, RotateCcw, Sparkles, Square, Trash2 } from "lucide-react";
import { useTranslations } from "next-intl";
import Image from "next/image";
import type { ReceiptAnalysisMode } from "@/types/accountBook";
import { selectClassName } from "./constants";

type QueueItem = {
    sourceImageId: string; file: File; previewUrl: string; revision: number;
    status: "queued" | "analyzing" | "success" | "partial" | "failure" | "canceled";
    receiptCount: number; error: string | null;
};

type Props = {
    receiptQueue: QueueItem[]; receiptAnalysisMode: ReceiptAnalysisMode;
    receiptAnalysisMessage: string | null; isAnalyzingReceipt: boolean;
    disabled: boolean; canAnalyzeReceipt: boolean;
    onAnalysisModeChange: (mode: ReceiptAnalysisMode) => void;
    onFilesChange: (files: File[]) => void; onAnalyzeReceipt: () => void;
    onRemove: (sourceImageId: string) => void; onCancel: (sourceImageId: string) => void;
    onRetry: (sourceImageId: string) => void;
};

export default function ReceiptAnalysisPanel({
    receiptQueue, receiptAnalysisMode, receiptAnalysisMessage, isAnalyzingReceipt,
    disabled, canAnalyzeReceipt, onAnalysisModeChange, onFilesChange, onAnalyzeReceipt,
    onRemove, onCancel, onRetry,
}: Props) {
    const t = useTranslations("AccountBook.detail.transactionModal");
    return (
        <div className="mb-5 min-w-0 rounded-2xl border border-slate-200 bg-slate-50/90 p-3 sm:p-4 dark:border-white/10 dark:bg-black/25">
            <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-700 dark:text-slate-200">
                <ImagePlus size={18} />{t("receipt.title")}
            </div>
            <p className="rounded-xl bg-orange-50 px-3 py-2 text-xs text-orange-700 dark:bg-orange-500/10 dark:text-orange-300">{t("receipt.description")}</p>
            <label className="mt-4 block">
                <span className="mb-2 block text-sm font-semibold text-slate-700 dark:text-slate-200">{t("receipt.analysisMode")}</span>
                <select value={receiptAnalysisMode} disabled={disabled || isAnalyzingReceipt}
                    onChange={(event) => onAnalysisModeChange(event.target.value as ReceiptAnalysisMode)} className={selectClassName}>
                    <option value="VISION_ONLY">{t("receipt.analysisModes.visionOnly")}</option>
                    <option value="OCR_WITH_AI">{t("receipt.analysisModes.ocrWithAi")}</option>
                    <option value="VISION_FIRST">{t("receipt.analysisModes.visionFirst")}</option>
                    <option value="OCR_ONLY">{t("receipt.analysisModes.ocrOnly")}</option>
                </select>
            </label>
            <label className="mt-4 block">
                <span className="mb-2 block text-sm font-semibold text-slate-700 dark:text-slate-200">{t("receipt.file")}</span>
                <input type="file" multiple disabled={disabled || receiptQueue.length >= 10}
                    accept="image/jpeg,image/png,image/webp"
                    onChange={(event) => {
                        onFilesChange(Array.from(event.target.files ?? []));
                        event.target.value = "";
                    }}
                    className="block w-full min-w-0 max-w-full cursor-pointer rounded-xl border border-slate-300 bg-white px-2 py-3 text-xs text-slate-600 file:mr-2 file:rounded-lg file:border-0 file:bg-orange-50 file:px-2 file:py-2 file:text-xs file:font-semibold file:text-orange-600 dark:border-white/10 dark:bg-black/30 dark:text-slate-300" />
            </label>
            {receiptQueue.length > 0 && <ul className="mt-3 grid min-w-0 grid-cols-1 gap-2 sm:grid-cols-2" data-testid="receipt-file-queue">
                {receiptQueue.map((item) => <li key={item.sourceImageId} className="flex min-w-0 items-center gap-2 rounded-xl border border-slate-200 bg-white p-2 dark:border-white/10 dark:bg-zinc-900">
                    {item.previewUrl ? <Image src={item.previewUrl} alt="" width={56} height={56} unoptimized className="h-14 w-14 shrink-0 rounded-lg object-cover" />
                        : <ImagePlus className="h-14 w-14 shrink-0 rounded-lg bg-slate-100 p-4" />}
                    <div className="min-w-0 flex-1">
                        <p className="truncate text-xs font-semibold" title={item.file.name}>{item.file.name}</p>
                        <p className="text-[11px] text-slate-500">{t(`receipt.queueStatuses.${item.status}`)} · r{item.revision}{item.receiptCount ? ` · ${item.receiptCount}` : ""}</p>
                        {item.error && <p className="line-clamp-2 text-[11px] text-red-600">{item.error}</p>}
                    </div>
                    <div className="flex shrink-0 flex-col gap-1">
                        {item.status === "analyzing" && <button type="button" onClick={() => onCancel(item.sourceImageId)} aria-label={t("receipt.cancelAnalysis")} className="rounded p-1 text-amber-600"><Square size={16} /></button>}
                        {item.status === "failure" && <button type="button" onClick={() => onRetry(item.sourceImageId)} aria-label={t("receipt.retryAnalysis")} className="rounded p-1 text-orange-600"><RotateCcw size={16} /></button>}
                        <button type="button" disabled={item.status === "analyzing"} onClick={() => onRemove(item.sourceImageId)} aria-label={t("receipt.removeFile")} className="rounded p-1 text-slate-500 disabled:opacity-30"><Trash2 size={16} /></button>
                    </div>
                </li>)}
            </ul>}
            {receiptAnalysisMessage && <p role="status" className="mt-3 rounded-xl bg-slate-100 px-3 py-2 text-xs text-slate-600 dark:bg-white/10 dark:text-slate-300">{receiptAnalysisMessage}</p>}
            <button type="button" onClick={onAnalyzeReceipt} disabled={!canAnalyzeReceipt || isAnalyzingReceipt}
                className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-orange-500 px-4 py-3 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:bg-slate-300 dark:disabled:bg-slate-700">
                <Sparkles size={18} />{isAnalyzingReceipt ? t("receipt.analyzing") : t("receipt.action")}
            </button>
        </div>
    );
}
