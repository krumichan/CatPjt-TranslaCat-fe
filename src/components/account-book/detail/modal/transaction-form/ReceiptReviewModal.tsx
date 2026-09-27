import { createPortal } from "react-dom";
import type { ReactNode, RefObject } from "react";
import { useReceiptReviewModal } from "@/hooks/account-book/detail/receipt/useReceiptReviewModal";

type Props = {
    title: string;
    children: ReactNode;
    returnFocusRef: RefObject<HTMLElement | null>;
    onClose: () => void;
};

export default function ReceiptReviewModal({ title, children, returnFocusRef, onClose }: Props) {
    const dialogRef = useReceiptReviewModal({ returnFocusRef, onClose });

    return createPortal(
        <div className="fixed inset-0 z-[10000] flex items-end justify-center p-0 sm:items-center sm:p-6">
            <button
                type="button"
                aria-label={title}
                onClick={onClose}
                className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />
            <div
                ref={dialogRef}
                role="dialog"
                aria-modal="true"
                aria-labelledby="receipt-review-modal-title"
                tabIndex={-1}
                className="relative z-10 flex max-h-[100dvh] min-h-0 w-full max-w-3xl flex-col overflow-hidden rounded-t-2xl border border-slate-200 bg-white p-3 shadow-2xl sm:max-h-[calc(100dvh-3rem)] sm:rounded-2xl sm:p-5 dark:border-white/10 dark:bg-zinc-900"
            >
                <h3
                    id="receipt-review-modal-title"
                    className="sr-only"
                >
                    {title}
                </h3>
                <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain pb-[max(0.5rem,env(safe-area-inset-bottom))]">
                    {children}
                </div>
            </div>
        </div>,
        document.body,
    );
}
