import { useEffect, useRef, type RefObject } from "react";

type Params = {
    returnFocusRef: RefObject<HTMLElement | null>;
    onClose: () => void;
};

export function useReceiptReviewModal({ returnFocusRef, onClose }: Params) {
    const dialogRef = useRef<HTMLDivElement>(null);
    useEffect(
        () => {
            const parent = document.getElementById("transaction-form-dialog");
            const returnFocusTarget = returnFocusRef.current;
            const previousAriaHidden = parent?.getAttribute("aria-hidden");
            if (parent) {
                parent.inert = true;
                parent.setAttribute("aria-hidden", "true");
            }
            const focusables = () => Array.from(dialogRef.current?.querySelectorAll<HTMLElement>('button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])') ?? []);
            window.setTimeout(
                () => (dialogRef.current?.querySelector<HTMLElement>("[data-receipt-initial-focus]")
                    ?? focusables()[0] ?? dialogRef.current)?.focus(),
                0
            );

            const onKeyDown = (event: KeyboardEvent) => {
                if (event.key === "Escape") {
                    event.preventDefault();
                    event.stopPropagation();
                    onClose();
                    return;
                }
                if (event.key !== "Tab")
                    return;
                const available = focusables();
                if (!available.length) {
                    event.preventDefault();
                    return;
                }
                const first = available[0];
                const last = available.at(-1)!;
                if (event.shiftKey && document.activeElement === first) {
                    event.preventDefault();
                    last.focus();
                } else if (!event.shiftKey && document.activeElement === last) {
                    event.preventDefault();
                    first.focus();
                }
            };

            document.addEventListener("keydown", onKeyDown, true);
            return () => {
                document.removeEventListener("keydown", onKeyDown, true);
                if (parent) {
                    parent.inert = false;
                    if (previousAriaHidden == null)
                        parent.removeAttribute("aria-hidden");
                    else
                        parent.setAttribute("aria-hidden", previousAriaHidden);
                }
                window.setTimeout(
                    () => {
                        if (returnFocusTarget?.isConnected)
                            returnFocusTarget.focus();
                        else
                            document.getElementById("receipt-review-list")?.focus();
                    },
                    0
                );
            };
        },
        [onClose, returnFocusRef]
    );
    return dialogRef;
}
