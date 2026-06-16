"use client";

import { Bell } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";

import NotificationCenterModal from "@/components/notification/NotificationCenterModal";
import { useNotificationCenter } from "@/components/notification/useNotificationCenter";

export default function NotificationBell() {
    const t = useTranslations("Notifications");
    const [isOpen, setIsOpen] = useState(false);

    const notification = useNotificationCenter();

    const handleOpen = async () => {
        setIsOpen(true);
        await notification.refreshNotifications();
    };

    return (
        <>
            <button
                type="button"
                onClick={handleOpen}
                className="relative rounded-xl border border-black/5 bg-black/5 p-2.5 transition-all hover:bg-black/10 active:scale-95 dark:border-white/10 dark:bg-white/10 dark:hover:bg-white/20"
                aria-label={t("button")}
            >
                <Bell
                    size={20}
                    className="text-slate-700 dark:text-slate-100"
                />

                {notification.unreadCount > 0 && (
                    <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-orange-500 px-1.5 text-[11px] font-bold text-white shadow-sm">
                        {notification.unreadCount > 99
                            ? "99+"
                            : notification.unreadCount}
                    </span>
                )}
            </button>

            <NotificationCenterModal
                isOpen={isOpen}
                notification={notification}
                onClose={() => setIsOpen(false)}
            />
        </>
    );
}
