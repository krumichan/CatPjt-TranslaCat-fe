"use client";

import clsx from "clsx";
import { useTranslations } from "next-intl";

interface ChatPresenceIndicatorProps {
    online?: boolean | null;
    className?: string;
    testId?: string;
}

export function ChatPresenceIndicator({
    online,
    className,
    testId,
}: ChatPresenceIndicatorProps) {
    const t = useTranslations("ChatRoom.presence");

    if (online !== true) {
        return null;
    }

    return (
        <span
            role="status"
            aria-label={t("online")}
            title={t("online")}
            data-testid={testId}
            className={clsx(
                "inline-block h-2.5 w-2.5 shrink-0 rounded-full bg-emerald-500 ring-2 ring-white dark:ring-slate-900",
                className,
            )}
        />
    );
}
