"use client";

import { UrgentNoticeModal } from "@/components/support/UrgentNoticeModal";
import { useUrgentNotices } from "@/hooks/support/useUrgentNotices";

export function UrgentNoticeSmartModal({ owner, loginSessionId }: { owner: string; loginSessionId: string }) {
    const controller = useUrgentNotices(owner, loginSessionId);

    if (!controller.notice) {
        return null;
    }

    return <UrgentNoticeModal key={controller.notice.id} controller={controller} notice={controller.notice} />;
}
