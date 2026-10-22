import type { ChatNotificationActivityItem } from "@/types/chatNotification";

export const OPEN_CHAT_INVITATION_CHANGED = "open-chat-invitation-changed";

export function hasOpenLinkInvitationMarker(
    item: ChatNotificationActivityItem,
): boolean {
    const payload = item.payload;
    return (
        item.notificationType === "CHAT_INVITATION" &&
        payload !== null &&
        typeof payload === "object" &&
        payload.invitationKind === "OPEN_LINK"
    );
}

export function isOpenLinkInvitation(
    item: ChatNotificationActivityItem,
): boolean {
    const payload = item.payload;

    return (
        hasOpenLinkInvitationMarker(item) &&
        payload !== null &&
        typeof payload === "object" &&
        payload.schemaVersion === 1 &&
        payload.roomType === "OPEN"
    );
}

export function getOpenInvitationRoomId(
    item: ChatNotificationActivityItem,
): number | null {
    if (
        !isOpenLinkInvitation(item) ||
        !Number.isSafeInteger(item.roomId) ||
        item.roomId === null ||
        item.roomId <= 0
    ) {
        return null;
    }

    return item.roomId;
}

export function getOpenInvitationPayloadText(
    item: ChatNotificationActivityItem,
    key: "roomName" | "inviterOpenNickname" | "inviterMemberCode",
): string | null {
    if (!isOpenLinkInvitation(item)) {
        return null;
    }

    const value = item.payload[key];
    return typeof value === "string" && value.trim() ? value.trim() : null;
}

export function announceOpenInvitationChanged(): void {
    if (typeof window !== "undefined") {
        window.dispatchEvent(new Event(OPEN_CHAT_INVITATION_CHANGED));
    }
}
