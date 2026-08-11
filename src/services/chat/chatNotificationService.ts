import { apiClient } from "@/lib/apiClient";
import { parseResponseBody } from "@/services/common/responseParser";
import type {
    ChatNotificationActivityItem,
    ChatNotificationActivityListResponse,
    ChatNotificationActivityReadAllResponse,
    ChatNotificationChatListResponse,
    ChatNotificationSummary,
} from "@/types/chatNotification";

const DOMAIN_NAME = "ChatNotification";

const toQuery = (params: Record<string, string | number | boolean | null | undefined>) => {
    const searchParams = new URLSearchParams();

    Object.entries(params).forEach(([key, value]) => {
        if (value !== null && value !== undefined) {
            searchParams.set(key, String(value));
        }
    });

    const query = searchParams.toString();
    return query ? `?${query}` : "";
};

export const chatNotificationService = {
    getSummary: async (): Promise<ChatNotificationSummary> => {
        const response = await apiClient("/chat/notifications/summary", {
            method: "GET",
        });
        return parseResponseBody<ChatNotificationSummary>(response, DOMAIN_NAME);
    },

    getChats: async ({
        cursorMessageId = null,
        size = 20,
    }: {
        cursorMessageId?: number | null;
        size?: number;
    } = {}): Promise<ChatNotificationChatListResponse> => {
        const query = toQuery({ cursorMessageId, size });
        const response = await apiClient(`/chat/notifications/chats${query}`, {
            method: "GET",
        });
        return parseResponseBody<ChatNotificationChatListResponse>(
            response,
            DOMAIN_NAME,
        );
    },

    getActivities: async ({
        onlyUnread = false,
        cursorId = null,
        size = 20,
    }: {
        onlyUnread?: boolean;
        cursorId?: number | null;
        size?: number;
    } = {}): Promise<ChatNotificationActivityListResponse> => {
        const query = toQuery({ onlyUnread, cursorId, size });
        const response = await apiClient(
            `/chat/notifications/activities${query}`,
            { method: "GET" },
        );
        return parseResponseBody<ChatNotificationActivityListResponse>(
            response,
            DOMAIN_NAME,
        );
    },

    markActivityAsRead: async (
        notificationId: number,
    ): Promise<ChatNotificationActivityItem> => {
        const response = await apiClient(
            `/chat/notifications/activities/${notificationId}/read`,
            { method: "PATCH" },
        );
        return parseResponseBody<ChatNotificationActivityItem>(
            response,
            DOMAIN_NAME,
        );
    },

    markAllActivitiesAsRead:
        async (): Promise<ChatNotificationActivityReadAllResponse> => {
            const response = await apiClient(
                "/chat/notifications/activities/read-all",
                { method: "PATCH" },
            );
            return parseResponseBody<ChatNotificationActivityReadAllResponse>(
                response,
                DOMAIN_NAME,
            );
        },
};
