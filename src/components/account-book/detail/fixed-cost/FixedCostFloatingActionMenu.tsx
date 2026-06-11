import { useEffect, useRef, useState } from "react";
import {
    Eye,
    MoreHorizontal,
    Pencil,
    Power,
    PowerOff,
    Trash2,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { AccountBookFixedCost } from "@/types/accountBook";
import FloatingActionButton from "@/components/account-book/detail/fixed-cost/FloatingActionButton";

type FixedCostFloatingActionMenuProps = {
    fixedCost: AccountBookFixedCost;
    onClickDetail: () => void;
    onClickEdit: () => void;
    onClickDelete: () => void;
    onChangeActive: () => void | Promise<void>;
};

export default function FixedCostFloatingActionMenu({
    fixedCost,
    onClickDetail,
    onClickEdit,
    onClickDelete,
    onChangeActive,
}: FixedCostFloatingActionMenuProps) {
    const t = useTranslations("AccountBook.detail.fixedCost");
    const [isOpen, setIsOpen] = useState(false);
    const menuRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!isOpen) {
            return;
        }

        const handlePointerDown = (event: MouseEvent | TouchEvent) => {
            if (
                menuRef.current &&
                !menuRef.current.contains(event.target as Node)
            ) {
                setIsOpen(false);
            }
        };

        const handleEscape = (event: KeyboardEvent) => {
            if (event.key === "Escape") {
                setIsOpen(false);
            }
        };

        document.addEventListener("mousedown", handlePointerDown);
        document.addEventListener("touchstart", handlePointerDown);
        document.addEventListener("keydown", handleEscape);

        return () => {
            document.removeEventListener("mousedown", handlePointerDown);
            document.removeEventListener("touchstart", handlePointerDown);
            document.removeEventListener("keydown", handleEscape);
        };
    }, [isOpen]);

    const handleClickAction = async (action: () => void | Promise<void>) => {
        setIsOpen(false);
        await action();
    };

    return (
        <div ref={menuRef} className="relative">
            <div
                className={`absolute bottom-full right-0 z-30 mb-2 flex flex-col items-center gap-2 transition ${
                    isOpen ? "pointer-events-auto" : "pointer-events-none"
                }`}
            >
                <FloatingActionButton
                    icon={<Eye size={16} />}
                    label={t("actions.detail")}
                    isOpen={isOpen}
                    delay={0}
                    onClick={() => handleClickAction(onClickDetail)}
                />

                <FloatingActionButton
                    icon={<Pencil size={16} />}
                    label={t("actions.edit")}
                    isOpen={isOpen}
                    delay={40}
                    onClick={() => handleClickAction(onClickEdit)}
                />

                <FloatingActionButton
                    icon={
                        fixedCost.active ? (
                            <PowerOff size={16} />
                        ) : (
                            <Power size={16} />
                        )
                    }
                    label={
                        fixedCost.active
                            ? t("actions.deactivate")
                            : t("actions.activate")
                    }
                    isOpen={isOpen}
                    delay={80}
                    onClick={() => handleClickAction(onChangeActive)}
                />

                <FloatingActionButton
                    icon={<Trash2 size={16} />}
                    label={t("actions.delete")}
                    isOpen={isOpen}
                    delay={120}
                    variant="danger"
                    onClick={() => handleClickAction(onClickDelete)}
                />
            </div>

            <button
                type="button"
                onClick={() => setIsOpen((prev) => !prev)}
                aria-label={t("actions.menu")}
                aria-expanded={isOpen}
                className={`inline-flex h-9 w-9 items-center justify-center rounded-full border text-slate-500 shadow-sm transition dark:text-slate-300 ${
                    isOpen
                        ? "border-orange-300 bg-orange-50 text-orange-500 dark:border-orange-400/60 dark:bg-orange-500/10 dark:text-orange-300"
                        : "border-slate-200 bg-white hover:border-orange-300 hover:bg-orange-50 hover:text-orange-500 dark:border-white/10 dark:bg-black/20 dark:hover:border-orange-400/60 dark:hover:bg-orange-500/10 dark:hover:text-orange-300"
                }`}
            >
                <MoreHorizontal
                    size={18}
                    className={`transition ${isOpen ? "rotate-90" : ""}`}
                />
            </button>
        </div>
    );
}