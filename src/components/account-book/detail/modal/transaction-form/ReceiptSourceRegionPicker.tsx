import { useReceiptSourceRegionPicker } from "@/hooks/account-book/detail/receipt/useReceiptSourceRegionPicker";
import { useTranslations } from "next-intl";

type Source = {
    sourceImageId: string;
    previewUrl: string;
    fileName: string;
    revision: number;
};

type Props = {
    source: Source;
    onAdd: (region: number[]) => void;
    onClose: () => void;
};

export default function ReceiptSourceRegionPicker({ source, onAdd, onClose }: Props) {
    const t = useTranslations("AccountBook.detail.transactionModal.receipt.review");
    const { imageBox, region, valid, begin, move, selectFullImage } = useReceiptSourceRegionPicker();

    return (
        <div
            className="fixed inset-0 z-[10020] flex items-end justify-center bg-black/65 p-0 sm:items-center sm:p-6"
            role="dialog"
            aria-modal="true"
            aria-label={t("addMissingReceipt")}
        >
            <div className="flex max-h-[100dvh] w-full max-w-3xl flex-col overflow-hidden rounded-t-2xl bg-white p-4 sm:max-h-[calc(100dvh-3rem)] sm:rounded-2xl dark:bg-zinc-900">
                <h3 className="text-lg font-bold">
                    {t("regionPickerTitle")}
                </h3>
                <p className="mt-1 text-xs text-slate-500 dark:text-slate-300">
                    {t("regionPickerDescription")}
                </p>
                <div className="mt-3 min-h-0 flex-1 overflow-auto rounded-xl bg-slate-950 p-2">
                    <div
                        ref={imageBox}
                        className="relative mx-auto w-fit max-w-full touch-none cursor-crosshair"
                        onPointerDown={begin}
                        onPointerMove={move}
                        onPointerUp={move}
                    >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                            src={source.previewUrl}
                            alt={source.fileName}
                            draggable={false}
                            className="max-h-[65dvh] max-w-full select-none object-contain"
                        />
                        {region && (
                            <span
                                aria-hidden="true"
                                className="pointer-events-none absolute border-2 border-amber-400 bg-amber-300/20"
                                style={{
                                    left: `${region[0] * 100}%`,
                                    top: `${region[1] * 100}%`,
                                    width: `${(region[2] - region[0]) * 100}%`,
                                    height: `${(region[3] - region[1]) * 100}%`
                                }}
                            />
                        )}
                    </div>
                </div>
                <div className="mt-3 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                    <button
                        type="button"
                        onClick={onClose}
                        className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold"
                    >
                        {t("regionPickerCancel")}
                    </button>
                    <button
                        type="button"
                        onClick={selectFullImage}
                        className="rounded-xl border border-blue-300 px-4 py-2 text-sm font-semibold text-blue-700 dark:text-blue-300"
                    >
                        {t("selectFullImage")}
                    </button>
                    <button
                        type="button"
                        disabled={!valid}
                        onClick={() => {
                            if (region && valid)
                                onAdd(region);
                        }}
                        className="rounded-xl bg-orange-500 px-4 py-2 text-sm font-semibold text-white disabled:bg-slate-300 dark:disabled:bg-slate-700"
                    >
                        {t("addSelectedRegion")}
                    </button>
                </div>
            </div>
        </div>
    );
}
