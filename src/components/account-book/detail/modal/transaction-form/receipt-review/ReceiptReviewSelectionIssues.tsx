import { useTranslations } from "next-intl";
import type { ReceiptReviewContentProps } from "./types";

export default function ReceiptReviewSelectionIssues({ review, controller }: ReceiptReviewContentProps) {
    const t = useTranslations("AccountBook.detail.transactionModal");
    const { validations, openEditor } = controller;
    if (review.selectionSummary.blockedCount === 0)
        return null;
    return (
        <div className="rounded-xl border border-red-200 bg-red-50 p-3 dark:border-red-500/30 dark:bg-red-500/10">
            <p className="text-sm font-semibold text-red-700 dark:text-red-300">
                {t("receipt.review.selectedHasIssues")}
            </p>
            <ul className="mt-2 space-y-1">
                {review.items.filter((item) => item.selected && !validations.get(item.clientId)?.registrable).map((item) => {
                    const first = validations.get(item.clientId)!.blockingIssues[0];
                    return (
                        <li key={item.clientId}>
                            <button
                                type="button"
                                onClick={(event) => openEditor(
                                    item,
                                    event.currentTarget,
                                    first.field
                                )}
                                className="text-left text-xs font-semibold text-red-700 underline underline-offset-2 dark:text-red-300"
                            >{item.title || item.sourceFileName}: {t(`receipt.review.blockingIssues.${first.code}`)}</button>
                        </li>
                    );
                })}
            </ul>
            <button
                type="button"
                onClick={review.selectRegisterable}
                className="mt-3 rounded-lg border border-red-300 px-3 py-2 text-xs font-semibold text-red-700 dark:text-red-300"
            >
                {t("receipt.review.selectRegisterableOnly")}
            </button>
        </div>
    );
}
