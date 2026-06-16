import { X } from "lucide-react";
import { useTranslations } from "next-intl";

import { NotificationTab } from "@/components/notification/useNotificationCenter";
import NotificationCenterTabs from "@/components/notification/NotificationCenterTabs";

type NotificationCenterHeaderProps = {
    activeTab: NotificationTab;
    onTabChange: (tab: NotificationTab) => void;
    onClose: () => void;
};

export default function NotificationCenterHeader({
    activeTab,
    onTabChange,
    onClose,
}: NotificationCenterHeaderProps) {
    const t = useTranslations("Notifications");

    return (
        <header className="shrink-0 border-b border-slate-100 p-5 dark:border-white/10 sm:p-6">
            <div className="flex items-start justify-between gap-4">
                <div>
                    <p className="text-xs font-bold uppercase tracking-[0.25em] text-orange-500">
                        {t("eyebrow")}
                    </p>

                    <h2 className="mt-2 text-2xl font-black text-slate-900 dark:text-white">
                        {t("title")}
                    </h2>

                    <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
                        {t("description")}
                    </p>
                </div>

                <button
                    type="button"
                    onClick={(event) => {
                        event.preventDefault();
                        event.stopPropagation();
                        onClose();
                    }}
                    className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-white/10 dark:hover:text-white"
                    aria-label={t("close")}
                >
                    <X size={20} />
                </button>
            </div>

            <NotificationCenterTabs
                activeTab={activeTab}
                onTabChange={onTabChange}
            />
        </header>
    );
}