"use client";

import type { ChatNotificationChatItem as ChatNotificationChatItemType } from "@/types/chatNotification";
import { Globe2, MessageCircle, Users } from "lucide-react";

export const ChatNotificationRoomIcon = ({
    roomType,
}: {
    roomType: ChatNotificationChatItemType["roomType"];
}) => {
    const className = "h-5 w-5";

    if (roomType === "OPEN") {
        return <Globe2 className={className} aria-hidden="true" />;
    }

    if (roomType === "GROUP") {
        return <Users className={className} aria-hidden="true" />;
    }

    return <MessageCircle className={className} aria-hidden="true" />;
};
