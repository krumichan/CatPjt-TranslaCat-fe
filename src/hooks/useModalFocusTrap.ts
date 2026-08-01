"use client";

import { useEffect, type RefObject } from "react";

const FOCUSABLE_SELECTOR = [
    "button:not([disabled])",
    "[href]",
    "input:not([disabled])",
    "select:not([disabled])",
    "textarea:not([disabled])",
    '[tabindex]:not([tabindex="-1"])',
].join(",");

export function useModalFocusTrap(
    isOpen: boolean,
    containerRef: RefObject<HTMLElement | null>,
    onClose: () => void,
) {
    useEffect(() => {
        if (!isOpen) {
            return;
        }

        const previousActiveElement =
            document.activeElement instanceof HTMLElement
                ? document.activeElement
                : null;
        const previousOverflow = document.body.style.overflow;
        document.body.style.overflow = "hidden";

        const focusTimer = window.setTimeout(() => {
            const firstFocusable =
                containerRef.current?.querySelector<HTMLElement>(
                    FOCUSABLE_SELECTOR,
                );
            firstFocusable?.focus();
        }, 0);

        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.key === "Escape") {
                event.preventDefault();
                onClose();
                return;
            }

            if (event.key !== "Tab") {
                return;
            }

            const focusable = Array.from(
                containerRef.current?.querySelectorAll<HTMLElement>(
                    FOCUSABLE_SELECTOR,
                ) ?? [],
            ).filter(
                (element) =>
                    element.offsetParent !== null ||
                    element === document.activeElement,
            );

            if (focusable.length === 0) {
                event.preventDefault();
                return;
            }

            const first = focusable[0];
            const last = focusable[focusable.length - 1];

            if (event.shiftKey && document.activeElement === first) {
                event.preventDefault();
                last.focus();
            } else if (
                !event.shiftKey &&
                document.activeElement === last
            ) {
                event.preventDefault();
                first.focus();
            }
        };

        document.addEventListener("keydown", handleKeyDown);

        return () => {
            window.clearTimeout(focusTimer);
            document.body.style.overflow = previousOverflow;
            document.removeEventListener("keydown", handleKeyDown);
            previousActiveElement?.focus();
        };
    }, [containerRef, isOpen, onClose]);
}
