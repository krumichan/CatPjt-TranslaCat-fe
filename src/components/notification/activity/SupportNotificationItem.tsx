import { ChevronRight, Headset, Mail, Megaphone } from "lucide-react";
import { useTranslations } from "next-intl";

import { supportNotificationHref } from "@/features/support/supportNotification";
import { useRouter } from "@/navigation";
import type { SupportNotification } from "@/types/supportNotification";
import { formatActivityDateTime } from "@/utils/time/formatActivityDateTime";

interface SupportNotificationItemProps {
    item: SupportNotification;
    onNavigate: () => void;
}

export default function SupportNotificationItem({
    item,
    onNavigate,
}: SupportNotificationItemProps) {
    const t = useTranslations("Notifications.support");
    const router = useRouter();
    const Icon = item.targetType === "MESSAGE"
        ? Mail
        : item.targetType === "NOTICE"
          ? Megaphone
          : Headset;

    const handleOpen = () => {
        // 상세 내용을 실제로 불러온 뒤 서버가 읽음 처리한다.
        // 이동 실패만으로 새 알림이 사라지지 않도록 클릭 시점에는 읽지 않는다.
        router.push(supportNotificationHref(item));
        onNavigate();
    };

    return (
        <button
            type="button"
            data-testid={`support-notification-${item.id}`}
            onClick={handleOpen}
            className={`w-full rounded-3xl border p-4 text-left shadow-sm transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-400/70 ${
                item.isRead
                    ? "border-slate-200 bg-white dark:border-white/10 dark:bg-white/5"
                    : "border-orange-200 bg-orange-50/60 hover:bg-orange-50 dark:border-orange-900/60 dark:bg-orange-950/20 dark:hover:bg-orange-950/30"
            }`}
        >
            <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-slate-100 text-slate-600 dark:bg-white/10 dark:text-slate-200">
                    <Icon className="h-5 w-5" aria-hidden="true" />
                </div>
                <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-3">
                        <p className="text-sm font-bold leading-5 text-slate-800 dark:text-slate-100">
                            {t(item.type)}
                        </p>
                        {!item.isRead && (
                            <span className="shrink-0 rounded-full bg-orange-100 px-2 py-0.5 text-[10px] font-black text-orange-700 dark:bg-orange-950/60 dark:text-orange-300">
                                {t("new")}
                            </span>
                        )}
                        <ChevronRight className="h-4 w-4 shrink-0 text-slate-400" aria-hidden="true" />
                    </div>
                    <p className="mt-1 truncate text-sm text-slate-600 dark:text-slate-300">{item.title}</p>
                    <p className="mt-2 text-xs text-slate-400 dark:text-slate-500">
                        {formatActivityDateTime(item.createdAt)}
                    </p>
                </div>
            </div>
        </button>
    );
}
