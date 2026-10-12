import { useEffect, useRef, useState } from "react";
import { ChevronDown } from "lucide-react";
import { useTranslations } from "next-intl";
import type { ReceiptReviewItem } from "@/utils/account-book/receiptReview";
import type { ReceiptReviewContentProps } from "./types";

type Props = ReceiptReviewContentProps & { item: ReceiptReviewItem; index: number; compact?: boolean };

export default function ReceiptInlineCategory({ item, index, review, controller, compact = false }: Props) {
    const t = useTranslations("AccountBook.detail.transactionModal");
    const [editing, setEditing] = useState(false);
    const selectRef = useRef<HTMLSelectElement>(null);
    const label = t("receipt.review.inlineCategory", { index: index + 1 });
    const disabled = review.isBusy || controller.amountEdit?.clientId === item.clientId;
    useEffect(() => {
        if (editing)
            selectRef.current?.focus();
    }, [editing]);

    // 모바일은 텍스트를 누른 필드만 select로 바꾸며, 후보/저장은 표와 같은 경로를 쓴다.
    if (compact && !editing)
        return (
            <button type="button" onClick={() => setEditing(true)} disabled={disabled} aria-label={label}
                className="flex h-8 max-w-full min-w-0 items-center gap-1 rounded-md text-xs text-slate-600 hover:bg-white/60 focus-visible:outline-2 focus-visible:outline-orange-500 dark:text-slate-300 dark:hover:bg-black/20">
                <span className="truncate">{item.categoryName || t("receipt.review.unselected")}</span>
                <ChevronDown size={12} className="shrink-0" />
            </button>
        );

    return (
        <select ref={selectRef} value={item.categoryName} disabled={disabled} aria-label={label}
            onBlur={() => setEditing(false)}
            onKeyDown={(event) => {
                if (event.key === "Escape") {
                    event.stopPropagation();
                    setEditing(false);
                }
            }}
            onChange={(event) => {
                const option = controller.categoryOptions.find((candidate) => candidate.name === event.target.value);
                if (option)
                    review.updateCategory(item.clientId, option.name, option.source);
                setEditing(false);
            }}
            className={compact
                ? "h-8 w-full min-w-0 rounded-md border border-orange-400 bg-white text-base dark:bg-zinc-900"
                : "w-36 max-w-full rounded-lg border border-slate-300 bg-white px-2 py-2 text-xs focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-500/20 dark:border-white/10 dark:bg-zinc-900"}>
            {!item.categoryName && <option value="">{t("receipt.review.blockingIssues.CATEGORY_REQUIRED")}</option>}
            {controller.categoryOptions.map((option) => (
                <option key={`${option.source}-${option.name}`} value={option.name}>
                    {option.name} · {t(`receipt.review.categorySources.${option.source.toLowerCase()}`)}
                </option>
            ))}
        </select>
    );
}
