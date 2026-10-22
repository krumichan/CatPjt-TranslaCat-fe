import type { ChatNotificationActivityItem } from "@/types/chatNotification";

export interface OpenChatInvitationSendResponse {
    invitationId: number;
    roomId: number;
    createdAt: string;
    duplicate: boolean;
}

export interface OpenChatInvitationListResponse {
    items: ChatNotificationActivityItem[];
    nextCursorId: number | null;
    hasNext: boolean;
}

export interface OpenChatInvitationSummary {
    unreadCount: number;
    latestInvitation: ChatNotificationActivityItem | null;
}
