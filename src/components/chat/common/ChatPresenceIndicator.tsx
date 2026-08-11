"use client";

import clsx from "clsx";
import { useTranslations } from "next-intl";

interface ChatPresenceIndicatorProps {
    online?: boolean | null;
    className?: string;
    testId?: string;
}

type ChatPresenceState = "online" | "offline" | "unknown";

function resolvePresenceState(
    online: boolean | null | undefined,
): ChatPresenceState {
    if (online === true) {
        return "online";
    }
    if (online === false) {
        return "offline";
    }
    return "unknown";
}

export function ChatPresenceIndicator({
    online,
    className,
    testId,
}: ChatPresenceIndicatorProps) {
    const t = useTranslations("ChatRoom.presence");
    const state = resolvePresenceState(online);

    return (
        <span
            role="status"
            aria-label={t(state)}
            title={t(state)}
            data-testid={testId}
            data-presence-state={state}
            className={clsx(
                "inline-flex h-3 w-3 shrink-0 items-center justify-center rounded-full ring-2 ring-white dark:ring-slate-900",
                state === "online" && "bg-emerald-500",
                state === "offline" && "bg-slate-400 dark:bg-slate-500",
                state === "unknown" &&
                    "border border-slate-400 bg-white text-[8px] font-black leading-none text-slate-500 dark:border-slate-500 dark:bg-slate-900 dark:text-slate-300",
                className,
            )}
        >
            {state === "unknown" ? "?" : null}
        </span>
    );
}
