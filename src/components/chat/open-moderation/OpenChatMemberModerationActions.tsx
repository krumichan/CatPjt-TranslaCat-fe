"use client";

import { Ban, MoreHorizontal, ShieldCheck, ShieldOff } from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect, useRef, useState } from "react";

import type { OpenChatMemberProfile } from "@/types/chat";
import type { OpenChatModerationAction } from "@/utils/chat/openChatModeration";

interface OpenChatMemberModerationActionsProps {
    target: OpenChatMemberProfile;
    actions: OpenChatModerationAction[];
    variant?: "menu" | "panel";
    onAction: (
        action: OpenChatModerationAction,
        target: OpenChatMemberProfile,
    ) => void;
}

const ACTION_ICONS = {
    ASSIGN_ADMIN: ShieldCheck,
    REVOKE_ADMIN: ShieldOff,
    BAN: Ban,
} satisfies Record<OpenChatModerationAction, typeof Ban>;

export function OpenChatMemberModerationActions({
    target,
    actions,
    variant = "menu",
    onAction,
}: OpenChatMemberModerationActionsProps) {
    const t = useTranslations("ChatRoom.openModeration.actions");
    const [isOpen, setIsOpen] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!isOpen) {
            return;
        }

        const closeOnOutsideClick = (event: MouseEvent) => {
            if (
                event.target instanceof Node &&
                !containerRef.current?.contains(event.target)
            ) {
                setIsOpen(false);
            }
        };
        document.addEventListener("mousedown", closeOnOutsideClick);
        return () => document.removeEventListener("mousedown", closeOnOutsideClick);
    }, [isOpen]);

    if (actions.length === 0) {
        return null;
    }

    const buttons = actions.map((action) => {
        const Icon = ACTION_ICONS[action];
        const isDanger = action === "BAN";
        return (
            <button
                key={action}
                type="button"
                data-testid={`open-chat-action-${action}-${target.openChatMemberId}`}
                onClick={(event) => {
                    event.stopPropagation();
                    setIsOpen(false);
                    onAction(action, target);
                }}
                className={
                    variant === "panel"
                        ? `inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-2xl px-4 py-3 text-sm font-black transition focus-visible:outline-none focus-visible:ring-2 ${
                              isDanger
                                  ? "border border-rose-200 text-rose-600 hover:bg-rose-50 focus-visible:ring-rose-500 dark:border-rose-400/30 dark:text-rose-200 dark:hover:bg-rose-500/10"
                                  : "border border-slate-200 text-slate-700 hover:border-orange-300 hover:text-orange-600 focus-visible:ring-orange-500 dark:border-white/10 dark:text-slate-100"
                          }`
                        : `flex min-h-11 w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-sm font-black transition ${
                              isDanger
                                  ? "text-rose-600 hover:bg-rose-50 dark:text-rose-200 dark:hover:bg-rose-500/10"
                                  : "text-slate-700 hover:bg-slate-100 dark:text-slate-100 dark:hover:bg-white/10"
                          }`
                }
            >
                <Icon className="h-4 w-4" aria-hidden="true" />
                {t(action)}
            </button>
        );
    });

    if (variant === "panel") {
        return <div className="space-y-2">{buttons}</div>;
    }

    return (
        <div ref={containerRef} className="relative shrink-0">
            <button
                type="button"
                data-testid={`open-chat-action-menu-${target.openChatMemberId}`}
                aria-label={t("OPEN_MENU", { nickname: target.nickname })}
                aria-expanded={isOpen}
                onClick={(event) => {
                    event.stopPropagation();
                    setIsOpen((current) => !current);
                }}
                className="inline-flex h-11 w-11 items-center justify-center rounded-xl text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 dark:hover:bg-white/10 dark:hover:text-white"
            >
                <MoreHorizontal className="h-5 w-5" aria-hidden="true" />
            </button>
            {isOpen && (
                <div className="absolute right-0 top-12 z-20 w-52 rounded-2xl border border-slate-200 bg-white p-2 shadow-xl dark:border-white/10 dark:bg-slate-900">
                    {buttons}
                </div>
            )}
        </div>
    );
}
