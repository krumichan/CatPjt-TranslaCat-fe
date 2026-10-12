import { useCallback, useId, useLayoutEffect, useRef, useState, type RefObject } from "react";
import { createPortal } from "react-dom";
import { MoreHorizontal, Pencil } from "lucide-react";
import { useTranslations } from "next-intl";
import { positionReceiptActionMenu } from "@/utils/account-book/receiptActionMenu";

type Props = { index: number; disabled: boolean; onEdit: (trigger: HTMLButtonElement) => void };

export default function ReceiptRowActionMenu({ index, disabled, onEdit }: Props) {
    const t = useTranslations("AccountBook.detail.transactionModal.receipt.review");
    const [open, setOpen] = useState(false);
    const trigger = useRef<HTMLButtonElement>(null);
    const id = useId();
    const expanded = open && !disabled;
    const close = useCallback((restoreFocus: boolean) => {
        setOpen(false);
        if (restoreFocus) trigger.current?.focus();
    }, []);
    return (
        <>
            <button ref={trigger} type="button" disabled={disabled}
                data-testid="receipt-row-menu-trigger"
                aria-label={t("rowMenu", { index: index + 1 })}
                aria-haspopup="menu" aria-expanded={expanded} aria-controls={expanded ? id : undefined}
                onClick={() => setOpen(!open)}
                onKeyDown={(event) => {
                    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
                        event.preventDefault();
                        setOpen(true);
                    }
                }}
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-slate-500 hover:bg-white/70 focus-visible:outline-2 focus-visible:outline-orange-500 dark:text-slate-300 dark:hover:bg-black/30">
                <MoreHorizontal size={18} />
            </button>
            {expanded && createPortal(
                <ReceiptRowMenuPanel id={id} trigger={trigger} close={close}
                    label={t("rowMenu", { index: index + 1 })} editLabel={t("reviewEdit")}
                    onEdit={onEdit} />, document.body)}
        </>
    );
}

function ReceiptRowMenuPanel({ id, trigger, close, label, editLabel, onEdit }: {
    id: string; trigger: RefObject<HTMLButtonElement | null>;
    close: (restoreFocus: boolean) => void; label: string; editLabel: string;
    onEdit: (trigger: HTMLButtonElement) => void;
}) {
    const panel = useRef<HTMLDivElement>(null);
    const action = useRef<HTMLButtonElement>(null);
    useLayoutEffect(() => {
        // 표의 overflow 밖에 띄우되 스크롤 본문과 화면의 교집합 안에 배치한다.
        const updatePosition = () => {
            if (!trigger.current || !panel.current) return;
            const viewport = window.visualViewport;
            const left = (viewport?.offsetLeft ?? 0) + 8;
            const top = (viewport?.offsetTop ?? 0) + 8;
            const right = left + (viewport?.width ?? window.innerWidth) - 16;
            const bottom = top + (viewport?.height ?? window.innerHeight) - 16;
            const body = trigger.current.closest('[data-testid="receipt-review-scroll-body"]')?.getBoundingClientRect();
            const bounds = { left, right, top: Math.max(top, body?.top ?? top), bottom: Math.min(bottom, body?.bottom ?? bottom) };
            const anchor = trigger.current.getBoundingClientRect();
            const menu = panel.current.getBoundingClientRect();
            const position = positionReceiptActionMenu(anchor, menu, bounds);
            panel.current.style.top = `${position.top}px`;
            panel.current.style.left = `${position.left}px`;
            panel.current.style.maxHeight = `${Math.max(0, bounds.bottom - bounds.top)}px`;
            panel.current.style.visibility = "visible";
            panel.current.dataset.placement = position.placement;
        };
        updatePosition();
        action.current?.focus({ preventScroll: true });
        const onPointerDown = (event: PointerEvent) => {
            if (!panel.current?.contains(event.target as Node) && !trigger.current?.contains(event.target as Node)) close(false);
        };
        const onFocus = (event: FocusEvent) => {
            if (!panel.current?.contains(event.target as Node) && !trigger.current?.contains(event.target as Node)) close(false);
        };
        document.addEventListener("pointerdown", onPointerDown);
        document.addEventListener("focusin", onFocus);
        window.addEventListener("scroll", updatePosition, true);
        window.addEventListener("resize", updatePosition);
        window.visualViewport?.addEventListener("resize", updatePosition);
        window.visualViewport?.addEventListener("scroll", updatePosition);
        return () => {
            document.removeEventListener("pointerdown", onPointerDown);
            document.removeEventListener("focusin", onFocus);
            window.removeEventListener("scroll", updatePosition, true);
            window.removeEventListener("resize", updatePosition);
            window.visualViewport?.removeEventListener("resize", updatePosition);
            window.visualViewport?.removeEventListener("scroll", updatePosition);
        };
    }, [trigger, close]);

    return (
        <div ref={panel} id={id} role="menu" aria-label={label} data-testid="receipt-row-menu"
            style={{ visibility: "hidden" }}
            className="fixed z-10020 w-40 max-w-[calc(100vw-1rem)] overflow-y-auto rounded-xl border border-slate-200 bg-white p-1 shadow-xl dark:border-white/15 dark:bg-zinc-800"
            onKeyDown={(event) => {
                if (event.key === "Escape" || event.key === "Tab") {
                    if (event.key === "Escape") { event.preventDefault(); event.stopPropagation(); }
                    close(true);
                } else if (["ArrowDown", "ArrowUp", "Home", "End"].includes(event.key)) {
                    event.preventDefault();
                    action.current?.focus();
                }
            }}>
            <button ref={action} role="menuitem" type="button"
                onClick={() => {
                    // 메뉴 자체는 사라지므로, 모달 닫기 후 포커스는 행의 점 메뉴로 돌린다.
                    const target = trigger.current;
                    close(false);
                    if (target) onEdit(target);
                }}
                className="flex min-h-10 w-full items-center gap-2 rounded-lg px-3 text-left text-sm font-semibold text-orange-700 hover:bg-orange-50 focus:bg-orange-50 focus:outline-none dark:text-orange-300 dark:hover:bg-white/10 dark:focus:bg-white/10">
                <Pencil size={15} />{editLabel}
            </button>
        </div>
    );
}
