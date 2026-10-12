import { useEffect, useRef } from "react";
import { Check, Pencil, X } from "lucide-react";
import { useTranslations } from "next-intl";
import type { ReceiptReviewItem } from "@/utils/account-book/receiptReview";
import type { ReceiptReviewContentProps } from "./types";

type Props = ReceiptReviewContentProps & { item: ReceiptReviewItem; index: number };

export default function ReceiptInlineTitle({ item, index, review, controller }: Props) {
    const t = useTranslations("AccountBook.detail.transactionModal");
    const { titleEdit, hasInlineEdit, beginTitleEdit, changeTitleEdit, applyTitleEdit, cancelTitleEdit, titleKeyDown } = controller;
    const active = titleEdit?.clientId === item.clientId;
    const inputRef = useRef<HTMLInputElement>(null);
    useEffect(() => {
        if (active)
            inputRef.current?.focus();
    }, [active]);

    // 표와 목록 모두 동일 높이를 사용하며, 오류 안내만 필요한 경우 아래에 펼친다.
    return active ? (
        <div className="min-w-0" data-testid={`receipt-inline-title-${item.receiptId}`}>
            <div className="flex h-8 min-w-0 items-center rounded-md border border-orange-400 bg-white dark:bg-zinc-900">
                <input
                    ref={inputRef}
                    value={titleEdit.value}
                    aria-label={t("receipt.review.inlineTitleInput", { index: index + 1 })}
                    aria-invalid={Boolean(titleEdit.error)}
                    aria-describedby={titleEdit.error ? `title-error-${item.clientId}` : undefined}
                    disabled={review.isBusy}
                    onChange={(event) => changeTitleEdit(event.target.value)}
                    onKeyDown={titleKeyDown}
                    className="h-full min-w-0 flex-1 bg-transparent px-1 text-base font-semibold outline-none sm:text-sm"
                />
                <button type="button" onClick={applyTitleEdit} disabled={review.isBusy}
                    aria-label={t("receipt.review.inlineApply")} className="flex h-8 w-8 shrink-0 items-center justify-center text-orange-600">
                    <Check size={16} />
                </button>
                <button type="button" onClick={cancelTitleEdit} aria-label={t("receipt.review.inlineCancel")}
                    className="flex h-8 w-8 shrink-0 items-center justify-center text-slate-500">
                    <X size={16} />
                </button>
            </div>
            {titleEdit.error && <p id={`title-error-${item.clientId}`} role="alert" className="mt-1 text-xs text-red-600 dark:text-red-400">{titleEdit.error}</p>}
        </div>
    ) : (
        <button type="button" onClick={() => beginTitleEdit(item)} disabled={review.isBusy || hasInlineEdit}
            aria-label={t("receipt.review.inlineTitle", { index: index + 1 })} title={item.title || undefined}
            className="group flex h-8 w-full min-w-0 items-center gap-1 rounded-md text-left text-sm font-semibold hover:bg-white/60 focus-visible:outline-2 focus-visible:outline-orange-500 dark:hover:bg-black/20">
            <span className="min-w-0 truncate">{item.title || "—"}</span>
            <Pencil size={12} className="shrink-0 text-slate-500 opacity-60 group-hover:opacity-100" />
        </button>
    );
}
