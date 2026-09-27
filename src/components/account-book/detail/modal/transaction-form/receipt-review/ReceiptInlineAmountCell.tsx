import { Pencil, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { classifyReceiptInlineAmountEdit, type ReceiptReviewItem } from "@/utils/account-book/receiptReview";
import type { ReceiptReviewContentProps } from "./types";

type Props = ReceiptReviewContentProps & {
    item: ReceiptReviewItem;
    index: number;
};

export default function ReceiptInlineAmountCell({ item, index, review, controller }: Props) {
    const t = useTranslations("AccountBook.detail.transactionModal");
    const {
        amountEdit,
        amountKeyDown,
        applyAmountEdit,
        cancelAmountEdit,
        beginAmountEdit
    } = controller;
    return (
        <td className="min-w-48 px-3 py-3 text-right">
            {amountEdit?.clientId === item.clientId ? (
                <div
                    className="space-y-1"
                    data-testid={`receipt-inline-amount-${item.receiptId}`}
                >
                    <div className="flex items-center justify-end gap-1">
                        <input
                            data-receipt-initial-focus
                            value={amountEdit.value}
                            inputMode="decimal"
                            aria-label={t("receipt.review.inlineAmountInput", { index: index + 1 })}
                            aria-invalid={Boolean(amountEdit.error)}
                            onKeyDown={amountKeyDown}
                            onChange={(event) => controller.changeAmountEdit(event.target.value)}
                            className="w-28 rounded-lg border border-amber-300 bg-white px-2 py-1.5 text-right text-xs dark:bg-zinc-900"
                        />
                        <span className="text-xs">
                            {item.originalCurrencyCode}
                        </span>
                        <button
                            type="button"
                            onClick={() => void applyAmountEdit()}
                            disabled={review.isBusy}
                            className="rounded bg-orange-500 px-2 py-1.5 text-[11px] font-semibold text-white"
                        >
                            {t("receipt.review.inlineApply")}
                        </button>
                        <button
                            type="button"
                            onClick={cancelAmountEdit}
                            aria-label={t("receipt.review.inlineCancel")}
                            className="rounded p-1 text-slate-500"
                        >
                            <X size={15} />
                        </button>
                    </div>
                    <p className="text-[10px] text-amber-700 dark:text-amber-300">
                        {t(classifyReceiptInlineAmountEdit(item).mode === "SINGLE_PAYMENT" ? "receipt.review.inlineAmountSinglePaymentScope" : "receipt.review.inlineAmountSimpleScope")}
                    </p>
                    {amountEdit.error && (
                        <p
                            role="alert"
                            className="text-[11px] font-semibold text-red-600"
                        >
                            {amountEdit.error}
                        </p>
                    )}
                </div>
            ) : (
                <button
                    type="button"
                    onClick={(event) => beginAmountEdit(item, event)}
                    disabled={review.isBusy}
                    className="group inline-flex items-center gap-1 rounded-lg px-2 py-1.5 font-semibold hover:bg-white/60 focus:outline-none focus:ring-2 focus:ring-orange-500/30 dark:hover:bg-black/20"
                >
                    <span>
                        <span className="block">{item.originalAmount || "—"} {item.originalCurrencyCode}</span>
                        <span className="block text-[10px] font-normal text-slate-500">{item.conversion.convertedAmount ?? "—"} {item.conversion.accountBookCurrencyCode}</span>
                        {item.amountCorrection && (
                            <span className="block max-w-44 text-[10px] font-normal text-slate-500">
                                {t(
                                    "receipt.review.inlineAmountCorrectionSummary",
                                    {
                                        observed: item.amountCorrection.observedOriginalAmount,
                                        corrected: item.amountCorrection.correctedAmount
                                    }
                                )}
                            </span>
                        )}
                        {classifyReceiptInlineAmountEdit(item).mode === "DETAILS_REQUIRED" && (
                            <span className="block max-w-40 text-[10px] font-normal text-amber-700 dark:text-amber-300">
                                {t(`receipt.review.inlineAmountDetails.${classifyReceiptInlineAmountEdit(item).reason!.toLowerCase()}`)}
                            </span>
                        )}
                    </span>
                    <Pencil
                        size={13}
                        className="opacity-60 group-hover:opacity-100"
                    />
                </button>
            )}
        </td>
    );
}
