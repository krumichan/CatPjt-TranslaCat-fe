export type SupportNotificationType =
    | "SUPPORT_REPLY"
    | "SUPPORT_INQUIRY"
    | "SUPPORT_NOTICE"
    | "SUPPORT_MESSAGE";

export interface SupportNotification {
    id: number;
    type: SupportNotificationType;
    title: string;
    targetType: "INQUIRY" | "NOTICE" | "MESSAGE";
    targetId: number;
    replyId: number | null;
    isRead: boolean;
    readAt: string | null;
    createdAt: string;
}

export interface SupportNotificationList {
    items: SupportNotification[];
    page: number;
    size: number;
    totalElements: number;
    totalPages: number;
}

export interface SupportNotificationSummary {
    count: number;
}
