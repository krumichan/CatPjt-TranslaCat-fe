import { useTranslations } from "next-intl";
import type { ReceiptReviewItem } from "@/utils/account-book/receiptReview";
import { receiptRowClassName } from "@/utils/account-book/receiptReviewPresentation";
import ReceiptInlineAmountCell from "./ReceiptInlineAmountCell";
import ReceiptReviewStatusIcon from "./ReceiptReviewStatusIcon";
import type { ReceiptReviewContentProps } from "./types";

type Props = ReceiptReviewContentProps & {
    item: ReceiptReviewItem;
    index: number;
};

export default function ReceiptReviewTableRow({ item, index, review, controller }: Props) {
    const t = useTranslations("AccountBook.detail.transactionModal");
    const { hasAmountEdit, amountEdit, categoryOptions, openEditor } = controller;
    const categoryLabel = (source: string) => t(`receipt.review.categorySources.${source.toLowerCase()}`);
    return (
        <tr
            data-testid="receipt-review-card"
            className={`${receiptRowClassName(controller.getRowState(item))} transition hover:brightness-[0.98] dark:hover:brightness-110`}
        >
            <td className="px-3 py-3">
                <input
                    type="checkbox"
                    checked={item.selected}
                    disabled={review.isBusy || hasAmountEdit}
                    aria-label={t("receipt.review.selectReceipt", { index: index + 1 })}
                    onChange={(event) => review.select(item.clientId, event.target.checked)}
                    className="h-5 w-5 accent-orange-500"
                />
            </td>
            <td className="whitespace-nowrap px-3 py-3">
                {item.transactionDate || "—"}
            </td>
            <td className="max-w-55 px-3 py-3">
                <span className="block truncate font-semibold">
                    {item.title || "—"}
                </span>
                <span className="block truncate text-[11px] text-slate-500">{item.sourceFileName} · r{item.analysisRevision}</span>
            </td>
            <td className="px-3 py-3">
                <select
                    value={item.categoryName}
                    disabled={review.isBusy || amountEdit?.clientId === item.clientId}
                    aria-label={t("receipt.review.inlineCategory", { index: index + 1 })}
                    onClick={(event) => event.stopPropagation()}
                    onChange={(event) => {
                        const option = categoryOptions.find((candidate) => candidate.name === event.target.value);
                        if (option)
                            review.updateCategory(
                                item.clientId,
                                option.name,
                                option.source
                            );
                    }}
                    className="w-44 rounded-lg border border-slate-300 bg-white px-2 py-2 text-xs focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-500/20 dark:border-white/10 dark:bg-zinc-900"
                >
                    {!item.categoryName && (
                        <option value="">
                            {t("receipt.review.blockingIssues.CATEGORY_REQUIRED")}
                        </option>
                    )}
                    {categoryOptions.map((option) => (
                        <option
                            key={`${option.source}-${option.name}`}
                            value={option.name}
                        >{option.name} · {categoryLabel(option.source)}</option>
                    ))}
                </select>
            </td>
            <ReceiptInlineAmountCell
                item={item}
                index={index}
                review={review}
                controller={controller}
            />
            <td className="px-3 py-3 text-xs font-semibold text-slate-700 dark:text-slate-200">
                <span className="flex items-center gap-1.5">
                    <ReceiptReviewStatusIcon state={controller.getRowState(item)} />
                </span>
            </td>
            <td className="px-3 py-3 text-right">
                <button
                    type="button"
                    onClick={(event) => openEditor(item, event.currentTarget)}
                    className="rounded-lg border border-orange-300 px-2.5 py-1.5 text-xs font-semibold text-orange-700 dark:text-orange-300"
                >
                    {t("receipt.review.reviewEdit")}
                </button>
            </td>
        </tr>
    );
}
