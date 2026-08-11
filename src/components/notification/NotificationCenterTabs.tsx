import { BellRing, Inbox, MessageCircle } from "lucide-react";
import { useTranslations } from "next-intl";

import type { NotificationTab } from "@/components/notification/useNotificationCenter";

type NotificationCenterTabsProps = {
    activeTab: NotificationTab;
    tabCounts: Record<NotificationTab, number>;
    onTabChange: (tab: NotificationTab) => void;
};

const TABS: {
    key: NotificationTab;
    labelKey: string;
    icon: typeof MessageCircle;
}[] = [
    {
        key: "CHAT",
        labelKey: "tabs.chat",
        icon: MessageCircle,
    },
    {
        key: "ACTIVITY",
        labelKey: "tabs.activity",
        icon: BellRing,
    },
    {
        key: "INVITATION",
        labelKey: "tabs.invitation",
        icon: Inbox,
    },
];

export default function NotificationCenterTabs({
    activeTab,
    tabCounts,
    onTabChange,
}: NotificationCenterTabsProps) {
    const t = useTranslations("Notifications");

    return (
        <div className="grid grid-cols-3 gap-2">
            {TABS.map((tab) => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.key;
                const count = tabCounts[tab.key];

                return (
                    <button
                        key={tab.key}
                        type="button"
                        onClick={() => onTabChange(tab.key)}
                        aria-pressed={isActive}
                        className={`inline-flex min-w-0 items-center justify-center gap-2 rounded-xl px-2 py-3 text-xs font-black transition sm:px-3 ${
                            isActive
                                ? "bg-orange-500 text-white shadow-lg shadow-orange-500/20"
                                : "bg-slate-100 text-slate-500 hover:bg-slate-200 hover:text-slate-900 dark:bg-white/10 dark:text-slate-300 dark:hover:bg-white/15 dark:hover:text-white"
                        }`}
                    >
                        <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
                        <span className="truncate">{t(tab.labelKey)}</span>
                        {count > 0 && (
                            <span
                                className={`inline-flex min-w-5 shrink-0 items-center justify-center rounded-full px-1.5 py-0.5 text-[10px] font-black ${
                                    isActive
                                        ? "bg-white/20 text-white"
                                        : "bg-orange-500 text-white"
                                }`}
                            >
                                {count > 99 ? "99+" : count}
                            </span>
                        )}
                    </button>
                );
            })}
        </div>
    );
}
