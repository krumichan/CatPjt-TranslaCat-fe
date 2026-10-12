import type { SupportNotification } from "@/types/supportNotification";

export function supportNotificationHref(item: SupportNotification): string {
    const tabs = {
        INQUIRY: "inquiries",
        NOTICE: "notices",
        MESSAGE: "messages",
    } as const;
    // 알림 식별자는 같은 내용을 보고 있어도 새 알림마다 상세를 다시 조회하게 한다.
    const params = new URLSearchParams({
        tab: tabs[item.targetType],
        id: String(item.targetId),
        notificationId: String(item.id),
    });

    // 답변 알림은 해당 문의 안에서도 새 답변 위치까지 연결한다.
    if (item.targetType === "INQUIRY" && item.replyId !== null) {
        params.set("replyId", String(item.replyId));
    }

    return `/support?${params.toString()}`;
}
