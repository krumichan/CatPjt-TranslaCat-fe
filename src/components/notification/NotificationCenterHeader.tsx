import { X } from "lucide-react";
import { useTranslations } from "next-intl";

import NotificationCenterTabs from "@/components/notification/NotificationCenterTabs";
import type { NotificationTab } from "@/components/notification/useNotificationCenter";

type NotificationCenterHeaderProps = {
    activeTab: NotificationTab;
    tabCounts: Record<NotificationTab, number>;
    onTabChange: (tab: NotificationTab) => void;
    onClose: () => void;
};

export default function NotificationCenterHeader({
    activeTab,
    tabCounts,
    onTabChange,
    onClose,
}: NotificationCenterHeaderProps) {
    const t = useTranslations("Notifications");

    return (
        <header className="p-5">
            <div className="flex items-start justify-between gap-4">
                <div>
                    <p className="text-xs font-black uppercase tracking-[0.3em] text-orange-500">
                        {t("eyebrow")}
                    </p>
                    <h2 className="mt-2 text-xl font-black text-slate-950 dark:text-white">
                        {t("title")}
                    </h2>
                    <p className="mt-2 text-xs leading-5 text-slate-500 dark:text-slate-400">
                        {t("description")}
                    </p>
                </div>

                <button
                    type="button"
                    onClick={onClose}
                    aria-label={t("close")}
                    className="rounded-full p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-900 dark:text-slate-500 dark:hover:bg-white/10 dark:hover:text-white"
                >
                    <X className="h-5 w-5" aria-hidden="true" />
                </button>
            </div>

            <div className="mt-5">
                <NotificationCenterTabs
                    activeTab={activeTab}
                    tabCounts={tabCounts}
                    onTabChange={onTabChange}
                />
            </div>
        </header>
    );
}
