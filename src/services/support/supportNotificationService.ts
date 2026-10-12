import { apiClient } from "@/lib/apiClient";
import { parseResponseBody } from "@/services/common/responseParser";
import type {
    SupportNotificationList,
    SupportNotificationSummary,
} from "@/types/supportNotification";

const DOMAIN_NAME = "SupportNotification";

export const supportNotificationService = {
    async getSummary(): Promise<SupportNotificationSummary> {
        const response = await apiClient("/support/notifications/unread-count");

        return parseResponseBody<SupportNotificationSummary>(response, DOMAIN_NAME);
    },

    async getList(): Promise<SupportNotificationList> {
        const response = await apiClient("/support/notifications?page=0&size=20");

        return parseResponseBody<SupportNotificationList>(response, DOMAIN_NAME);
    },

    async markAsRead(id: number): Promise<boolean> {
        const response = await apiClient(`/support/notifications/${id}/read`, {
            method: "PATCH",
        });

        return parseResponseBody<boolean>(response, DOMAIN_NAME);
    },

    async markAllAsRead(): Promise<boolean> {
        const response = await apiClient("/support/notifications/read-all", {
            method: "PATCH",
        });

        return parseResponseBody<boolean>(response, DOMAIN_NAME);
    },
};
