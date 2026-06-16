import { Inbox, Mail, Megaphone } from "lucide-react";
import { useTranslations } from "next-intl";

import { NotificationTab } from "@/components/notification/useNotificationCenter";

type NotificationCenterTabsProps = {
    activeTab: NotificationTab;
    onTabChange: (tab: NotificationTab) => void;
};

const tabs: {
    key: NotificationTab;
    icon: typeof Megaphone;
    labelKey: string;
}[] = [
    {
        key: "NOTICE",
        icon: Megaphone,
        labelKey: "tabs.notice",
    },
    {
        key: "INVITATION",
        icon: Inbox,
        labelKey: "tabs.invitation",
    },
    {
        key: "PERSONAL",
        icon: Mail,
        labelKey: "tabs.personal",
    },
];

export default function NotificationCenterTabs({
    activeTab,
    onTabChange,
}: NotificationCenterTabsProps) {
    const t = useTranslations("Notifications");

    return (
        <div className="mt-5 grid grid-cols-3 gap-2">
            {tabs.map((tab) => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.key;

                return (
                    <button
                        key={tab.key}
                        type="button"
                        onClick={() => onTabChange(tab.key)}
                        className={`inline-flex items-center justify-center gap-2 rounded-xl px-3 py-3 text-sm font-bold transition ${
                            isActive
                                ? "bg-orange-500 text-white shadow-sm"
                                : "bg-slate-100 text-slate-500 hover:bg-slate-200 dark:bg-white/10 dark:text-slate-300 dark:hover:bg-white/15"
                        }`}
                    >
                        <Icon size={16} />
                        {t(tab.labelKey)}
                    </button>
                );
            })}
        </div>
    );
}