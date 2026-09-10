import type { ChatRoomSourceType, ChatRoomType } from "@/types/chat";

export function getRoomTypeTranslationKey(roomType: ChatRoomType) {
    switch (roomType) {
        case "DIRECT": return "roomType.direct";
        case "GROUP": return "roomType.group";
        case "OPEN": return "roomType.open";
        default: return "roomType.unknown";
    }
}

export function getSourceTypeTranslationKey(sourceType: ChatRoomSourceType) {
    switch (sourceType) {
        case "FRIEND": return "sourceType.friend";
        case "MANUAL": return "sourceType.manual";
        case "OPEN": return "sourceType.open";
        case "AI": return "sourceType.ai";
        default: return "sourceType.unknown";
    }
}
