import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { useTranslations } from "next-intl";

type MemoPopoverPosition = {
    top: number;
    left: number;
};

type TransactionTableMemoCellProps = {
    memo?: string | null;
    t: ReturnType<typeof useTranslations>;
};

export default function TransactionTableMemoCell({
    memo,
    t,
}: TransactionTableMemoCellProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [position, setPosition] = useState<MemoPopoverPosition | null>(null);

    const buttonRef = useRef<HTMLButtonElement | null>(null);
    const popoverRef = useRef<HTMLDivElement | null>(null);

    const handleOpen = () => {
        const button = buttonRef.current;

        if (!button) {
            return;
        }

        const rect = button.getBoundingClientRect();

        const gap = 8;
        const margin = 12;
        const popoverWidth = Math.min(320, window.innerWidth - margin * 2);

        const rawLeft = rect.left;
        const maxLeft = window.innerWidth - popoverWidth - margin;

        setPosition({
            top: rect.bottom + gap,
            left: Math.max(margin, Math.min(rawLeft, maxLeft)),
        });

        setIsOpen(true);
    };

    const handleToggle = () => {
        if (isOpen) {
            setIsOpen(false);
            return;
        }

        handleOpen();
    };

    useEffect(() => {
        if (!isOpen) {
            return;
        }

        const handleClickOutside = (event: MouseEvent) => {
            const target = event.target as Node;

            if (
                buttonRef.current?.contains(target) ||
                popoverRef.current?.contains(target)
            ) {
                return;
            }

            setIsOpen(false);
        };

        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.key === "Escape") {
                setIsOpen(false);
            }
        };

        const handleResize = () => {
            setIsOpen(false);
        };

        document.addEventListener("mousedown", handleClickOutside);
        document.addEventListener("keydown", handleKeyDown);
        window.addEventListener("resize", handleResize);
        window.addEventListener("scroll", handleResize, true);

        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
            document.removeEventListener("keydown", handleKeyDown);
            window.removeEventListener("resize", handleResize);
            window.removeEventListener("scroll", handleResize, true);
        };
    }, [isOpen]);

    if (!memo) {
        return (
            <td className="px-4 py-3 text-slate-400 dark:text-slate-500">
                -
            </td>
        );
    }

    return (
        <td className="max-w-55 px-4 py-3 text-slate-400 dark:text-slate-500">
            <button
                ref={buttonRef}
                type="button"
                onClick={handleToggle}
                className="block max-w-full truncate text-left transition hover:text-orange-500 dark:hover:text-orange-400"
            >
                {memo}
            </button>

            {isOpen &&
                position &&
                createPortal(
                    <div
                        ref={popoverRef}
                        style={{
                            top: position.top,
                            left: position.left,
                            width: "min(20rem, calc(100vw - 24px))",
                        }}
                        className="fixed z-9999 rounded-xl border border-slate-200 bg-white text-xs leading-relaxed text-slate-700 shadow-2xl dark:border-white/10 dark:bg-zinc-950 dark:text-slate-200"
                    >
                        <div className="flex items-start justify-between gap-3 border-b border-slate-200 px-3 py-2 dark:border-white/10">
                            <p className="min-w-0 truncate font-semibold text-slate-900 dark:text-white">
                                {t("table.memo")}
                            </p>

                            <button
                                type="button"
                                onClick={() => setIsOpen(false)}
                                className="shrink-0 rounded-full p-1 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-white/10 dark:hover:text-white"
                                aria-label={t("actions.close")}
                            >
                                <X size={14} />
                            </button>
                        </div>

                        <div className="max-h-56 overflow-y-auto px-3 py-3">
                            <p className="whitespace-pre-wrap wrap-break-word">
                                {memo}
                            </p>
                        </div>
                    </div>,
                    document.body
                )}
        </td>
    );
}