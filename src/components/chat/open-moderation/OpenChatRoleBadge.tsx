import clsx from "clsx";
import { useTranslations } from "next-intl";

import type { ChatRoomMemberRole } from "@/types/chat";

interface OpenChatRoleBadgeProps {
    role: ChatRoomMemberRole;
    className?: string;
}

export function OpenChatRoleBadge({
    role,
    className,
}: OpenChatRoleBadgeProps) {
    const t = useTranslations("ChatRoom.openModeration.roles");

    return (
        <span
            data-testid={`open-chat-role-badge-${role}`}
            className={clsx(
                "inline-flex min-h-6 items-center rounded-full px-2.5 py-1 text-[11px] font-black",
                role === "OWNER" &&
                    "bg-amber-100 text-amber-800 dark:bg-amber-400/15 dark:text-amber-200",
                role === "ADMIN" &&
                    "bg-violet-100 text-violet-700 dark:bg-violet-400/15 dark:text-violet-200",
                role === "MEMBER" &&
                    "bg-slate-100 text-slate-600 dark:bg-white/10 dark:text-slate-300",
                className,
            )}
        >
            {t(role)}
        </span>
    );
}
