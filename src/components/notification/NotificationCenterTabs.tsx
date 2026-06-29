import { Bell, Inbox, Mail } from "lucide-react";
import { useTranslations } from "next-intl";

import type { NotificationTab } from "@/components/notification/useNotificationCenter";

type NotificationCenterTabsProps = {
    activeTab: NotificationTab;
    onTabChange: (tab: NotificationTab) => void;
};

const TABS: {
    key: NotificationTab;
    labelKey: string;
    icon: typeof Bell;
}[] = [
    {
        key: "NOTICE",
        labelKey: "tabs.notice",
        icon: Bell,
    },
    {
        key: "INVITATION",
        labelKey: "tabs.invitation",
        icon: Inbox,
    },
    {
        key: "PERSONAL",
        labelKey: "tabs.personal",
        icon: Mail,
    },
];

export default function NotificationCenterTabs({
    activeTab,
    onTabChange,
}: NotificationCenterTabsProps) {
    const t = useTranslations("Notifications");

    return (
        <div className="grid grid-cols-3 gap-2">
            {TABS.map((tab) => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.key;

                return (
                    <button
                        key={tab.key}
                        type="button"
                        onClick={() => onTabChange(tab.key)}
                        className={`inline-flex items-center justify-center gap-2 rounded-xl px-3 py-3 text-xs font-black transition ${
                            isActive
                                ? "bg-orange-500 text-white shadow-lg shadow-orange-500/20"
                                : "bg-slate-100 text-slate-500 hover:bg-slate-200 hover:text-slate-900 dark:bg-white/10 dark:text-slate-300 dark:hover:bg-white/15 dark:hover:text-white"
                        }`}
                    >
                        <Icon className="h-4 w-4" aria-hidden="true" />
                        <span className="truncate">{t(tab.labelKey)}</span>
                    </button>
                );
            })}
        </div>
    );
}
