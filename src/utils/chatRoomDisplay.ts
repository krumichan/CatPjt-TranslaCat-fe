import type { ChatRoomListItem } from "@/types/chat";

type DisplayableChatRoom = Pick<
    ChatRoomListItem,
    "roomType" | "sourceType" | "name" | "directPartner"
>;

interface ChatRoomDisplayFallbacks {
    friendDirectTitle: string;
    untitledTitle: string;
}

export interface ChatRoomDisplay {
    isFriendDirectRoom: boolean;
    title: string;
    profileImageUrl: string | null;
}

const normalizeText = (value: string | null | undefined): string | null => {
    const normalizedValue = value?.trim();
    return normalizedValue ? normalizedValue : null;
};

export const isFriendDirectChatRoom = (room: DisplayableChatRoom): boolean =>
    room.sourceType === "FRIEND" && room.roomType === "DIRECT";

export const resolveChatRoomDisplay = (
    room: DisplayableChatRoom,
    fallbacks: ChatRoomDisplayFallbacks,
): ChatRoomDisplay => {
    const isFriendDirectRoom = isFriendDirectChatRoom(room);

    if (isFriendDirectRoom) {
        return {
            isFriendDirectRoom: true,
            title:
                normalizeText(room.directPartner?.displayName) ??
                fallbacks.friendDirectTitle,
            profileImageUrl: normalizeText(
                room.directPartner?.profileImageUrl,
            ),
        };
    }

    return {
        isFriendDirectRoom: false,
        title: normalizeText(room.name) ?? fallbacks.untitledTitle,
        profileImageUrl: null,
    };
};
