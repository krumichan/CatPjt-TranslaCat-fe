import Image from "next/image";
import { ImagePlus, RotateCcw, ScanLine, Square, Trash2 } from "lucide-react";
import { useTranslations } from "next-intl";
import type { ReceiptQueueItem } from "@/types/accountBookReceiptReview";

type Props = {
    item: ReceiptQueueItem;
    reviewAssisted: boolean;
    onCancel: (sourceImageId: string) => void;
    onRetry: (sourceImageId: string) => void;
    onRemove: (sourceImageId: string) => void;
    onSelectRegion: (sourceImageId: string) => void;
};

export default function ReceiptFileQueueItem({
    item,
    reviewAssisted,
    onCancel,
    onRetry,
    onRemove,
    onSelectRegion,
}: Props) {
    const t = useTranslations("AccountBook.detail.transactionModal");
    return (
        <li className="flex min-w-0 items-center gap-2 rounded-xl border border-slate-200 bg-white p-2 dark:border-white/10 dark:bg-zinc-900">
            {item.previewUrl ? (
                <Image
                    src={item.previewUrl}
                    alt=""
                    width={56}
                    height={56}
                    unoptimized
                    className="h-14 w-14 shrink-0 rounded-lg object-cover"
                />
            )
                : (
                    <ImagePlus className="h-14 w-14 shrink-0 rounded-lg bg-slate-100 p-4" />
                )}
            <div className="min-w-0 flex-1">
                <p
                    className="truncate text-xs font-semibold"
                    title={item.file.name}
                >
                    {item.file.name}
                </p>
                <p className="text-[11px] text-slate-500">{t(`receipt.queueStatuses.${item.status}`)} · r{item.revision}{item.receiptCount ? ` · ${item.receiptCount}` : ""}</p>
                {item.error && (
                    <p className="line-clamp-2 text-[11px] text-red-600">
                        {item.error}
                    </p>
                )}
            </div>
            <div className="flex shrink-0 flex-col gap-1">
                {item.status === "analyzing" && (
                    <button
                        type="button"
                        onClick={() => onCancel(item.sourceImageId)}
                        aria-label={t("receipt.cancelAnalysis")}
                        className="rounded p-1 text-amber-600"
                    >
                        <Square size={16} />
                    </button>
                )}
                {item.status === "failure" && (
                    <button
                        type="button"
                        onClick={() => onRetry(item.sourceImageId)}
                        aria-label={t("receipt.retryAnalysis")}
                        className="rounded p-1 text-orange-600"
                    >
                        <RotateCcw size={16} />
                    </button>
                )}
                {reviewAssisted && item.previewUrl && item.status !== "analyzing" && (
                    <button
                        type="button"
                        onClick={() => onSelectRegion(item.sourceImageId)}
                        aria-label={t("receipt.review.addMissingReceipt")}
                        className="rounded p-1 text-blue-600"
                    >
                        <ScanLine size={16} />
                    </button>
                )}
                <button
                    type="button"
                    disabled={item.status === "analyzing"}
                    onClick={() => onRemove(item.sourceImageId)}
                    aria-label={t("receipt.removeFile")}
                    className="rounded p-1 text-slate-500 disabled:opacity-30"
                >
                    <Trash2 size={16} />
                </button>
            </div>
        </li>
    );
}
