import { apiClient } from "@/lib/apiClient";
import { parseResponseBody } from "@/services/common/responseParser";
import type { ChatNotificationActivityItem } from "@/types/chatNotification";
import type {
    OpenChatInvitationListResponse,
    OpenChatInvitationSendResponse,
    OpenChatInvitationSummary,
} from "@/types/openChatInvitation";
import {
    getOpenInvitationRoomId,
    isOpenLinkInvitation,
} from "@/utils/chat/openChatInvitation";

const DOMAIN_NAME = "OpenChatInvitation";
const READ_REQUEST_TIMEOUT_MS = 15_000;
const isPositiveId = (value: unknown): value is number =>
    typeof value === "number" && Number.isSafeInteger(value) && value > 0;

async function requestWithDeadline<T>(
    endpoint: string,
    method: "GET" | "PATCH",
    expectedLoginSessionId: string,
): Promise<T> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), READ_REQUEST_TIMEOUT_MS);

    try {
        // 세션 조회·HTTP·본문 파싱 전체에 같은 기한과 로그인 세션을 적용한다.
        const response = await apiClient(
            endpoint,
            { method, signal: controller.signal },
            expectedLoginSessionId,
        );
        return await parseResponseBody<T>(response, DOMAIN_NAME);
    } finally {
        clearTimeout(timer);
    }
}

function requireInvitationItem(value: unknown): ChatNotificationActivityItem {
    const item = value as ChatNotificationActivityItem | null;
    if (
        item === null ||
        typeof item !== "object" ||
        !isPositiveId(item.id) ||
        !isOpenLinkInvitation(item) ||
        getOpenInvitationRoomId(item) === null ||
        typeof item.isRead !== "boolean" ||
        (item.readAt !== null &&
            (typeof item.readAt !== "string" ||
                !Number.isFinite(Date.parse(item.readAt)))) ||
        typeof item.createdAt !== "string" ||
        !Number.isFinite(Date.parse(item.createdAt))
    ) {
        throw new Error("Invalid OPEN invitation item response.");
    }

    return item;
}

function requireInvitationList(value: OpenChatInvitationListResponse): OpenChatInvitationListResponse {
    if (
        !value ||
        !Array.isArray(value.items) ||
        typeof value.hasNext !== "boolean" ||
        (value.nextCursorId !== null && !isPositiveId(value.nextCursorId))
    ) {
        throw new Error("Invalid OPEN invitation list response.");
    }

    // 페이지는 ID 내림차순이고 다음 cursor는 마지막 항목을 지나갈 수 없다.
    let previousId = Number.POSITIVE_INFINITY;
    for (const rawItem of value.items) {
        const item = requireInvitationItem(rawItem);
        if (item.id >= previousId) {
            throw new Error("Invalid OPEN invitation list ordering.");
        }
        previousId = item.id;
    }
    if (
        value.hasNext &&
        (value.items.length === 0 ||
            value.nextCursorId === null ||
            value.nextCursorId > previousId)
    ) {
        throw new Error("Invalid OPEN invitation pagination cursor.");
    }

    return value;
}

export const openChatInvitationService = {
    send: async (
        roomId: number,
        targetPublicId: string,
        requestId: string,
        expectedLoginSessionId: string,
        signal: AbortSignal,
    ): Promise<OpenChatInvitationSendResponse> => {
        const response = await apiClient(
            `/chat/open-rooms/${roomId}/invitations`,
            {
                method: "POST",
                body: JSON.stringify({ targetPublicId, requestId }),
                signal,
            },
            expectedLoginSessionId,
        );

        const result = await parseResponseBody<OpenChatInvitationSendResponse>(
            response,
            DOMAIN_NAME,
        );
        if (
            !result ||
            !isPositiveId(result.invitationId) ||
            result.roomId !== roomId ||
            typeof result.duplicate !== "boolean" ||
            typeof result.createdAt !== "string" ||
            !Number.isFinite(Date.parse(result.createdAt))
        ) {
            throw new Error("Invalid OPEN invitation send response.");
        }

        return result;
    },

    list: async (
        expectedLoginSessionId: string,
        cursorId: number | null = null,
        size = 20,
    ): Promise<OpenChatInvitationListResponse> => {
        const query = new URLSearchParams({ size: String(size) });
        if (cursorId !== null) {
            query.set("cursorId", String(cursorId));
        }

        const result = await requestWithDeadline<OpenChatInvitationListResponse>(
            `/chat/open-invitations?${query.toString()}`,
            "GET",
            expectedLoginSessionId,
        );
        const list = requireInvitationList(result);
        if (cursorId !== null && list.items.some((item) => item.id >= cursorId)) {
            throw new Error("Invalid OPEN invitation page boundary.");
        }
        return list;
    },

    summary: async (expectedLoginSessionId: string): Promise<OpenChatInvitationSummary> => {
        const result = await requestWithDeadline<OpenChatInvitationSummary>(
            "/chat/open-invitations/summary",
            "GET",
            expectedLoginSessionId,
        );
        if (
            !result ||
            !Number.isSafeInteger(result.unreadCount) ||
            result.unreadCount < 0
        ) {
            throw new Error("Invalid OPEN invitation summary response.");
        }
        if (result.latestInvitation !== null) {
            requireInvitationItem(result.latestInvitation);
        }
        return result;
    },

    detail: async (
        invitationId: number,
        expectedLoginSessionId: string,
    ): Promise<ChatNotificationActivityItem> => {
        const result = await requestWithDeadline<ChatNotificationActivityItem>(
            `/chat/open-invitations/${invitationId}`,
            "GET",
            expectedLoginSessionId,
        );
        const item = requireInvitationItem(result);
        if (item.id !== invitationId) {
            throw new Error("Invalid OPEN invitation detail ID.");
        }
        return item;
    },

    markRead: async (
        invitationId: number,
        expectedLoginSessionId: string,
    ): Promise<ChatNotificationActivityItem> => {
        const result = await requestWithDeadline<ChatNotificationActivityItem>(
            `/chat/open-invitations/${invitationId}/read`,
            "PATCH",
            expectedLoginSessionId,
        );
        const item = requireInvitationItem(result);
        if (item.id !== invitationId || !item.isRead) {
            throw new Error("Invalid OPEN invitation read response.");
        }
        return item;
    },
};
