import { useTranslations } from "next-intl";

type Props = {
    previewUrl: string;
    sourceRegion: number[] | null;
    fileName: string;
};

function validRegion(region: number[] | null): region is [number, number, number, number] {
    return Boolean(region && region.length === 4
        && region.every((value) => Number.isFinite(value) && value >= 0 && value <= 1)
        && region[0] < region[2] && region[1] < region[3]);
}

export default function ReceiptSourcePreview({ previewUrl, sourceRegion, fileName }: Props) {
    const t = useTranslations("AccountBook.detail.transactionModal.receipt.review");
    return <section className="mb-4 rounded-xl border border-blue-200 bg-blue-50/60 p-3 dark:border-blue-500/30 dark:bg-blue-500/10"
        aria-label={t("sourcePreview")} data-testid="receipt-source-preview">
        <div className="mb-2 flex items-center justify-between gap-2">
            <p className="text-xs font-semibold text-blue-800 dark:text-blue-200">{t("sourcePreview")}</p>
            <p className="max-w-48 truncate text-[11px] text-blue-700/80 dark:text-blue-300/80" title={fileName}>{fileName}</p>
        </div>
        {previewUrl ? <div className="overflow-auto rounded-lg bg-slate-950/90 p-2">
            <div className="relative mx-auto w-fit max-w-full">
                {/* Blob URLs point to the user-selected local file and are never persisted. */}
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={previewUrl} alt={t("sourcePreviewAlt", { fileName })}
                    className="max-h-80 max-w-full object-contain" />
                {validRegion(sourceRegion) && <span aria-hidden="true" className="pointer-events-none absolute border-2 border-amber-400 bg-amber-300/15 shadow-[0_0_0_9999px_rgba(0,0,0,0.18)]"
                    style={{
                        left: `${sourceRegion[0] * 100}%`, top: `${sourceRegion[1] * 100}%`,
                        width: `${(sourceRegion[2] - sourceRegion[0]) * 100}%`,
                        height: `${(sourceRegion[3] - sourceRegion[1]) * 100}%`,
                    }} />}
            </div>
        </div> : <p className="text-xs text-blue-700 dark:text-blue-300">{t("sourcePreviewUnavailable")}</p>}
    </section>;
}
